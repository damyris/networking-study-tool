const test = require("node:test");
const assert = require("node:assert/strict");
const R = require("../review.js");

test("swCounts buckets by domain and skips ids that resolve to null", () => {
  const idToDomain = id => ({a:1, b:1, c:2}[id] ?? null); // 'd' -> null
  assert.deepEqual(R.swCounts(["a","b","c","d"], idToDomain), {1:2, 2:1});
  assert.deepEqual(R.swCounts([], idToDomain), {});
});

test("blindSpotScore: unseen domain scores 0", () => {
  assert.equal(R.blindSpotScore({acc:null, pct:0, seen:0, total:10}, 0), 0);
});

test("blindSpotScore: sure-wrong dominates accuracy gap", () => {
  const weakNoSW = R.blindSpotScore({acc:40, pct:50, seen:5, total:10}, 0);
  const okWithSW = R.blindSpotScore({acc:90, pct:90, seen:5, total:10}, 1);
  assert.ok(okWithSW > weakNoSW, `sure-wrong (${okWithSW}) should outrank accuracy gap (${weakNoSW})`);
});

test("blindSpotScore: mastered domain scores 0 like unseen", () => {
  assert.equal(R.blindSpotScore({acc:100, pct:100, seen:8, total:8}, 0), 0);
});

test("domainStatus reflects seen / accuracy / sure-wrong", () => {
  assert.equal(R.domainStatus({acc:null, pct:0, seen:0, total:5}, 0), "not-started");
  assert.equal(R.domainStatus({acc:95, pct:95, seen:5, total:5}, 0), "ok");
  assert.equal(R.domainStatus({acc:95, pct:95, seen:5, total:5}, 2), "weak"); // sure-wrong overrides "ok"
  assert.equal(R.domainStatus({acc:40, pct:40, seen:5, total:5}, 0), "weak");
});

test("rankDomains sorts worst-first; unseen sinks below a weak domain", () => {
  const entries = [
    {d:1, mastery:{acc:100,pct:100,seen:4,total:4}, sureWrong:0}, // mastered
    {d:2, mastery:{acc:40,pct:50,seen:5,total:10}, sureWrong:0},  // weak
    {d:3, mastery:{acc:null,pct:0,seen:0,total:6}, sureWrong:0},  // not started
    {d:4, mastery:{acc:70,pct:60,seen:5,total:8}, sureWrong:2},   // sure-wrong (worst)
  ];
  const order = R.rankDomains(entries).map(e => e.d);
  assert.equal(order[0], 4, "sure-wrong domain first");
  assert.equal(order[1], 2, "then the weak domain");
  assert.equal(R.rankDomains(entries).find(e=>e.d===3).status, "not-started");
  assert.ok(order.indexOf(2) < order.indexOf(3), "weak outranks not-started");
});

test("SW_BOOST is the single tunable selection multiplier", () => {
  assert.equal(typeof R.SW_BOOST, "number");
  assert.ok(R.SW_BOOST > 1);
});
