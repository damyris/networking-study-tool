const test = require("node:test");
const assert = require("node:assert/strict");
const C = require("../calibration.js");

test("xpGain: sure+correct gets full combo bonus", () => {
  assert.equal(C.xpGain({ok:true, mode:"sprint", conf:"sure", comeback:false, combo:1}), 10);
  assert.equal(C.xpGain({ok:true, mode:"sprint", conf:"sure", comeback:false, combo:6}), 20);
  assert.equal(C.xpGain({ok:true, mode:"sprint", conf:"sure", comeback:false, combo:50}), 30);
});
test("xpGain: likely flat 8, guess flat 5, regardless of combo", () => {
  assert.equal(C.xpGain({ok:true, mode:"sprint", conf:"likely", comeback:false, combo:9}), 8);
  assert.equal(C.xpGain({ok:true, mode:"sprint", conf:"guess", comeback:false, combo:9}), 5);
});
test("xpGain: any wrong is 0", () => {
  assert.equal(C.xpGain({ok:false, mode:"sprint", conf:"sure", comeback:false, combo:9}), 0);
});
test("xpGain: comeback+correct is 8 and beats sure", () => {
  assert.equal(C.xpGain({ok:true, mode:"sprint", conf:"sure", comeback:true, combo:9}), 8);
});
test("xpGain: undefined conf correct falls back to 5, wrong to 0", () => {
  assert.equal(C.xpGain({ok:false, mode:"sprint", conf:undefined, comeback:false, combo:3}), 0);
  assert.equal(C.xpGain({ok:true, mode:"sprint", conf:undefined, comeback:false, combo:3}), 5);
});
test("xpGain: lightning uses its own formula", () => {
  assert.equal(C.xpGain({ok:true, mode:"lightning", conf:undefined, comeback:false, combo:3}), 8);
  assert.equal(C.xpGain({ok:false, mode:"lightning", conf:undefined, comeback:false, combo:3}), 0);
});
test("applyConfidence: increments the right bucket; ignores unknown conf", () => {
  const cal = C.emptyCal();
  C.applyConfidence(cal, "sure", true); C.applyConfidence(cal, "sure", false);
  assert.deepEqual(cal.sure, {c:1, w:1});
  C.applyConfidence(cal, "nonsense", true);
  assert.deepEqual(cal.likely, {c:0, w:0});
});
test("sureWrongUpdate: adds on sure+wrong, dedupes, removes on sure+correct, ignores others", () => {
  let sw = C.sureWrongUpdate([], "q1", "sure", false);
  assert.deepEqual(sw, ["q1"]);
  sw = C.sureWrongUpdate(sw, "q1", "sure", false);
  assert.deepEqual(sw, ["q1"]);
  sw = C.sureWrongUpdate(sw, "q1", "sure", true);
  assert.deepEqual(sw, []);
  sw = C.sureWrongUpdate(["q2"], "q2", "likely", false);
  assert.deepEqual(sw, ["q2"]);
});
test("calStat: hides pct below threshold, shows at/above", () => {
  const cal = C.emptyCal();
  for (let i=0;i<4;i++) C.applyConfidence(cal, "sure", true);
  assert.deepEqual(C.calStat(cal, "sure"), {n:4, correct:4, pct:null});
  C.applyConfidence(cal, "sure", false);
  assert.deepEqual(C.calStat(cal, "sure"), {n:5, correct:4, pct:80});
});
test("normalizeState: adds cal/sw to an old save without touching existing fields", () => {
  const s = C.normalizeState({v:1, stats:{a:{s:2,c:1,w:1,b:0,l:9}}, xp:40});
  assert.deepEqual(s.cal, C.emptyCal());
  assert.deepEqual(s.sw, []);
  assert.equal(s.xp, 40);
  assert.deepEqual(s.stats.a, {s:2,c:1,w:1,b:0,l:9});
});
test("normalizeState: keeps existing cal/sw intact", () => {
  const s = C.normalizeState({cal:{sure:{c:3,w:1},likely:{c:0,w:0},guess:{c:0,w:0}}, sw:["x"]});
  assert.equal(s.cal.sure.c, 3);
  assert.deepEqual(s.sw, ["x"]);
});
