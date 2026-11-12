# Phase 1: Confidence Calibration — Implementation Plan

**Goal:** Capture honest, pre-feedback confidence (Sure/Likely/Guess) on every answer, reward it without punishing honesty, flag "Sure-and-Wrong" items, and show a calibration readout — all offline, without breaking existing saves.

**Architecture:** Extract the new, testable logic (XP, calibration tally, sure-wrong tracking, readout math) into a standalone `calibration.js` module that mirrors `sprint.js` (IIFE with dual `window`/`module.exports` export). `index.html` requires it via `<script>` and calls it from `grade()` and the renderers. Confidence is captured as the submit action for all four question types, replacing the old single "Check" button and the binary "I'm guessing" toggle.

## Global Constraints
- No build step; no new runtime deps; everything offline (no network/Claude at runtime).
- New state keys must be optional and additive; old saves at `c1b.state` must load and behave correctly. Existing per-question stat shape `{s,c,w,b,l}` is unchanged. Existing question schema keys (`id,d,t,type,q,o,a,w,x,h,ticket,ans`) are untouched.
- Confidence is captured BEFORE feedback; NO Enter-at-default that silently logs a confidence.
- `calibration.js` exports dually: `window.Calib` in browser, `module.exports` under Node (match `sprint.js`).
- XP values are exact: Sure+correct = `10 + Math.min(combo-1,10)*2`; Likely+correct = `8`; Guess+correct = `5`; any wrong = `0`; comeback+correct = `8` regardless of confidence; Lightning = `ok ? 5 + Math.min(combo,10) : 0`. Combo increments on every correct answer and resets only on a wrong one.
- Calibration percentage is hidden until >=5 answers at that confidence level; the threshold is one named constant (`CAL_MIN = 5`).
- Lightning mode has NO confidence capture; confidence logic is skipped when `conf` is unset.

## Review Focus (each pinned to a task)
1. Old save with no `cal`/`sw` keys loads without error and both initialize empty — Task 1 (migration test) + Task 2 (normalize-on-load).
2. Timer timeout calls `grade()` with `conf` unset → counts as a miss, excluded from the calibration tally and sure-wrong set, awards 0 XP — Task 1 (`xpGain` undefined-conf) + Task 4 (`if(conf)` guards).
3. Multiple-choice no longer grades on first tap; a pick must be revisable before confidence — Task 3 + Task 4 (`onPick`).
4. Type-in confidence via keyboard is blocked while the text field is focused; input questions commit via the on-screen buttons, and bare Enter must not submit — Task 4.
5. Sure-and-Wrong re-flagging/clearing: same id flagged Sure+wrong, later answered Sure+correct, is removed (never duplicated) — Task 1 (`sureWrongUpdate`).

### Task 1: `calibration.js` module (pure logic, fully unit-tested)
Files: Create `calibration.js`; Test `tests/calibration.test.js`.
Produces (on `Calib` / `module.exports`):
- `xpGain({ok, mode, conf, comeback, combo}) -> number`
- `applyConfidence(cal, conf, ok) -> object` (mutates+returns cal; no-op if conf not in sure|likely|guess)
- `sureWrongUpdate(sw, id, conf, ok) -> string[]` (new array; add on Sure+wrong deduped, remove on Sure+correct, else copy unchanged)
- `calStat(cal, level, minN=5) -> {n, correct, pct}` (pct null when n<minN)
- `CAL_MIN` (= 5)
- `emptyCal() -> {sure:{c:0,w:0}, likely:{c:0,w:0}, guess:{c:0,w:0}}`
- `normalizeState(state) -> object` (defaults `cal` via emptyCal() when absent and `sw` to [] when not an array; leaves other fields untouched)

Step 1 — write failing tests in `tests/calibration.test.js`:
```js
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
```
Step 2 — run `node --test tests/calibration.test.js` → FAIL (module not found).
Step 3 — implement `calibration.js` as an IIFE; end with `if (typeof module!=="undefined" && module.exports) module.exports = API;` and `if (typeof window!=="undefined") window.Calib = API;`. `calStat` rounds with `Math.round(100*correct/n)`.
Step 4 — run tests → PASS. Step 5 — commit `feat(calibration): add confidence XP/tally/sure-wrong logic module`.

### Task 2: Load the module and migrate state
Files: Modify `index.html` — add `<script src="calibration.js"></script>` among the module script tags (around lines 501–506) and BEFORE the inline application `<script>` (around line 507), because `normalizeState` is called at eval time (~line 621). Extend `defState()` (~line 616). Add a normalize line after the settings normalize (~line 621).
- In `defState()` add to the returned object: `cal:{sure:{c:0,w:0},likely:{c:0,w:0},guess:{c:0,w:0}}` and `sw:[]`.
- After `S.settings = Object.assign(defState().settings, S.settings||{})` add `S = Calib.normalizeState(S);`.
(The migration logic is already tested in Task 1 via `normalizeState`.) Smoke-test: open index.html, no console error, `window.Calib` defined. Commit `feat(state): load calibration module and migrate saves (cal, sw)`.

### Task 3: Confidence capture UI (replace Check + guess toggle)
Files: Modify `index.html` `bodyHTML()` (~lines 1166–1190); add `answerReady(c)` and `confBar(c)` helpers; minimal CSS for the three-button bar and a "you were sure" chip reusing existing button/theme styles.
- `answerReady(c)`: mc → `c.picked.length===1`; multi → `c.picked.length>=1`; order → `c.picked.length===c.q.o.length`; input → `!!(c.input||"").trim()`.
- `confBar(c)`: a `<div class="qactions confbar">` with three buttons, shown only when `!c.answered && R.mode!=="lightning"`: `<button class="btn primary" data-act="commit" data-conf="sure" ${ready?"":"disabled"}>Sure <kbd>S</kbd></button>`, Likely (`L`), Guess (`G`, `class="btn"`).
- Rewire `bodyHTML()`: for `input`, keep the `<input id="typein">` in the form but REMOVE its "Check" submit button and render `confBar(c)` after it; for `mc/multi/order`, remove the old `data-act="check"` and `data-act="guess"` buttons and the `needCheck` branch, render options then `confBar(c)` (keep the order "Start over" button). No grading wired here yet.
- Manual check: three confidence buttons appear and are disabled until a valid answer is assembled; old Check / I'm guessing controls gone. Commit `feat(ui): three-way confidence submit replaces Check and guess toggle`.

### Task 4: Wire grading, handlers, and keyboard to confidence
Files: Modify `index.html` `grade()` (~855–895), `onPick()` (~1684), click handler cases `check`/`guess` (~1626–1628), submit handler typein branch (~1658), keydown (~1704–1709).
- `onPick()`: mc branch selects only → `if(q.type==="mc"){c.picked=[i];SFX.play("tick");render();return}`.
- Click handler: remove `case "guess"`; replace `case "check"` with `case "commit": {if(R&&R.cur&&!R.cur.answered){R.cur.conf=el.dataset.conf; if(R.cur.q.type==="input"){const i=$("#typein"); if(i)R.cur.input=i.value;} if(answerReady(R.cur)) grade();} break;}`.
- Submit handler typein branch: keep `e.preventDefault()` and do NOTHING else (no grade on Enter).
- Keydown `!c.answered` block: remove the `g`-toggle line and the `Enter`-grades-multi/order line; after option-index handling add `const cf={s:"sure",l:"likely",g:"guess"}[k]; if(cf && R.mode!=="lightning" && c.q.type!=="input" && answerReady(c)){e.preventDefault(); c.conf=cf; grade(); return;}`.
- `grade()`: after `c.answered=true;c.ok=ok;` add `const conf=c.conf; c.guess = conf==="guess";` (keeps the box rule at ~line 868 and the lucky-guess feedback working). Replace the combo/XP block (~873–876) so combo updates first, then `gain = Calib.xpGain({ok, mode:R.mode, conf, comeback:c.comeback, combo:R.combo});` (delete the separate lightning gain line). After the stats update add `if(conf){ Calib.applyConfidence(S.cal, conf, ok); S.sw = Calib.sureWrongUpdate(S.sw, q.id, conf, ok); }`. Add `conf` to the object pushed into `R.results` (~line 877).
- Manual check (all four types + lightning + timeout) as in Review Focus. Commit `feat(grade): record confidence, apply XP/calibration/sure-wrong`.

### Task 5: Calibration readout + Sure-and-Wrong surfacing
Files: Modify `index.html` — add `calReadoutHTML()`; insert into `summaryHTML()` (after the tiles block, ~line 1271) and `homeHTML()` (near the Weak spots command / streak readout, ~line 1113); add a "you were sure" chip to Sure+wrong items in the summary Review list (~line 1280).
- `calReadoutHTML()`: for each level in ["sure","likely","guess"] call `Calib.calStat(S.cal, level)`; render `When you said <b>Sure</b>, you were right <b>73%</b> of the time.` when `pct!=null`, else `When you said <b>Sure</b> — building your read… (<n>/<CAL_MIN>)`. Include a headline line when `S.sw.length>0`: `You were sure but wrong on <b>${S.sw.length}</b>.`
- Insert at the noted anchors wrapped in existing panel/`.silk` classes.
- In the summary `missed.map(...)` block, when that result's `conf==="sure"`, prepend `<span class="chip hot">YOU WERE SURE</span>`.
- Manual check: after >=5 Sure answers a real percentage shows; before that the "building your read…" line shows; a Sure+wrong item shows the chip and is counted. Commit `feat(ui): calibration readout and Sure-and-Wrong surfacing`.
