# Phase 2: Blind-Spots Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Blind-Spots Hub — a screen that maps the learner's weak points by domain (Sure-and-wrong flagged first), opens a short authored lesson for each, then drills it — steering the existing spaced-repetition engine with Phase 1's confidence signal.

**Architecture:** New pure, unit-tested `review.js` module (ranking/scoring/boost, IIFE dual-export mirroring `calibration.js`). New `lessons.js` data module (also dual-export, so its shape test runs under Node) holding authored Core 1 + Core 2 domain lessons. `index.html` gains a `review` view (the hub), applies a Sure-and-wrong selection boost inside the existing `buildSprint`, and runs a lesson→drill loop that returns hub-launched drills to the hub. The existing Leitner engine (`weightFor`/`buildSprint`/`INTERVAL`) is reused as-is.

**Tech Stack:** Vanilla HTML/CSS/JS, no build step. Node's built-in test runner (`node --test tests/*.test.js`). Playwright (pre-installed) for behavior verification of `index.html` integration, matching how Phase 1 was verified.

**Spec:** `docs/superpowers/specs/2026-11-12-phase2-blind-spots-design.md`

## Global Constraints

- No build step; no new runtime deps; everything offline (no network/Claude at runtime).
- New state keys additive and optional; old saves at `c1b.state` load and behave correctly. Existing per-question stat shape `{s,c,w,b,l}`, the question schema, and the Phase 1 keys `cal`/`sw` are unchanged.
- Testable logic lives in dual-export IIFE modules (`window.X` in browser, `module.exports` under Node), matching `sprint.js`/`calibration.js`. `index.html` wiring is verified by Playwright behavior checks, not unit tests.
- Whole-suite test command is `node --test tests/*.test.js` (the bare `tests/` form fails on Node ≥ 22).
- Lessons are static, authored, **Wikipedia-sourced** content, cross-checked against the app's own question explanations; any Wikipedia-vs-CompTIA divergence is flagged inline for owner fact-check. Lesson coverage: Core 1 (5 domains) + Core 2 (4 domains) = 9 lessons. Linux+ gets no lessons this phase.
- Scope: Sure-and-wrong boost constant and the shakiness-score weights are single named constants in `review.js`.

## Review Focus

1. A domain with **no authored lesson** (all of Linux+, or any gap) opens in the hub → shows a "lesson coming soon" state and stays drillable; never a crash or blank panel — Task 5 (lesson-missing test).
2. **Old / zero-data save:** a pre-Phase-2 save with no `lr` loads clean, and the hub with no stats shows every domain as "not started," not "weakest" — Task 3 (load test) + Task 4 (`rankDomains` not-started test).
3. **Sure-wrong ids that resolve to null** (other course, hidden, deleted) are skipped in ranking and in the boost, never throwing — Task 1 (`swCounts` null-skip test) + Task 3 (boost over a stale id).
4. **Unseen vs. mastered ranking:** an unseen domain must not sort above a genuinely weak one, and a fully-mastered domain must not show as weak — Task 1 (`blindSpotScore`/`rankDomains` ordering tests).
5. **Origin isolation:** returning to the hub applies only to hub-launched drills; ordinary sprint / weak / lightning summaries still return to real home — Task 5 (origin behavior check, both directions).

---

### Task 1: `review.js` — ranking, scoring, Sure-wrong boost (pure, unit-tested)

**Files:**
- Create: `review.js`
- Test: `tests/review.test.js`

**Interfaces:**
- Produces (on `Review` / `module.exports`):
  - `SW_BOOST` (number, = 3) — selection-weight multiplier for Sure-and-wrong items.
  - `SOLID` (number, = 80) — accuracy % at or above which a seen domain is "ok".
  - `swCounts(sw, idToDomain) -> {domainId: count}` — buckets Sure-wrong ids by domain; `idToDomain(id)` returns a domain id or null/undefined; ids resolving to null are skipped.
  - `blindSpotScore(mastery, sureWrongCount) -> number` — higher = more urgent. `mastery` is `{acc, pct, seen, total}` as returned by `masteryOf`.
  - `domainStatus(mastery, sureWrongCount) -> "not-started" | "weak" | "ok"`.
  - `rankDomains(entries) -> array` — `entries` is `[{d, mastery, sureWrong}]`; returns a new array sorted worst-first, each item extended with `{score, status}`.

- [ ] **Step 1: Write the failing tests** in `tests/review.test.js`:

```js
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
```

- [ ] **Step 2: Run to verify failure** — `node --test tests/review.test.js` → FAIL (module not found).

- [ ] **Step 3: Implement `review.js`** as an IIFE ending with the dual-export tail (`if (typeof module!=="undefined"&&module.exports) module.exports=API;` and `if (typeof window!=="undefined") window.Review=API;`). Pin the scoring so unseen → 0, else `sureWrong*1000 + accGap*10 + boxGap` where `accGap = 100 - (acc==null?100:acc)` and `boxGap = 100 - pct`. `domainStatus`: `seen===0`→`"not-started"`; `sureWrong>0`→`"weak"`; `acc!=null && acc>=SOLID`→`"ok"`; else `"weak"`. `rankDomains` computes `score`+`status` per entry and sorts by `score` desc, tie-break `d` asc. `SW_BOOST=3`, `SOLID=80`. (No `sureWrongBoost` function is needed — the boost is the constant `SW_BOOST`, applied in Task 3.)

- [ ] **Step 4: Run to verify pass** — `node --test tests/review.test.js` → PASS.

- [ ] **Step 5: Commit** — `feat(review): add blind-spot ranking and sure-wrong scoring module`.

---

### Task 2: `lessons.js` — authored Core 1 + Core 2 domain lessons (data + shape test)

**Files:**
- Create: `lessons.js`
- Test: `tests/lessons.test.js`

**Interfaces:**
- Produces (on `Lessons` / `module.exports`): `LESSONS` = `{ core1: {1:lesson,2,3,4,5}, core2: {1,2,3,4} }`. Each `lesson` = `{title: string, intro: string, points: string[], traps: string[]}`.

- [ ] **Step 1: Write the failing shape test** in `tests/lessons.test.js`:

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const {LESSONS} = require("../lessons.js");

const expected = {core1:[1,2,3,4,5], core2:[1,2,3,4]};

test("every expected course+domain lesson exists and matches the shape", () => {
  for (const [course, domains] of Object.entries(expected)) {
    for (const d of domains) {
      const l = LESSONS[course] && LESSONS[course][d];
      assert.ok(l, `${course} D${d} lesson missing`);
      assert.equal(typeof l.title, "string"); assert.ok(l.title.trim());
      assert.equal(typeof l.intro, "string"); assert.ok(l.intro.trim());
      assert.ok(Array.isArray(l.points) && l.points.length >= 4 && l.points.length <= 6, `${course} D${d} needs 4-6 points`);
      assert.ok(Array.isArray(l.traps) && l.traps.length >= 2 && l.traps.length <= 3, `${course} D${d} needs 2-3 traps`);
      [...l.points, ...l.traps].forEach(s => { assert.equal(typeof s, "string"); assert.ok(s.trim()); });
    }
  }
});
```

- [ ] **Step 2: Run to verify failure** — `node --test tests/lessons.test.js` → FAIL (module not found).

- [ ] **Step 3: Author `lessons.js`.** IIFE with the dual-export tail (`window.Lessons` / `module.exports`, exporting `{LESSONS}`). Write all 9 lessons: Core 1 D1–D5 (Mobile Devices, Networking, Hardware, Virtualization & Cloud, Hardware & Network Troubleshooting) and Core 2 D1–D4 (Operating Systems, Security, Software Troubleshooting, Operational Procedures). Per the spec: draft each lesson's foundational facts **from Wikipedia**, then open the matching domain's questions in `bank.js`/`core2.js` and their `x` explanations and make the lesson's `points`/`traps` target exactly what those questions test. Where Wikipedia's framing and CompTIA's expected answer diverge (RAID minimums, port numbers, 220-1201/1202 specifics), append `[VERIFY: …]` to that bullet so it surfaces in the PR for owner fact-check. Keep each lesson skimmable: `intro` 2–3 sentences, 4–6 `points`, 2–3 `traps`.

- [ ] **Step 4: Run to verify pass** — `node --test tests/lessons.test.js` → PASS.

- [ ] **Step 5: Commit** — `feat(lessons): add Wikipedia-sourced Core 1 + Core 2 domain lessons`.

---

### Task 3: Load modules, apply Sure-wrong selection boost, add `lr` state

**Files:**
- Modify: `index.html` — script tags (near `<script src="calibration.js"></script>`, ~line 507); `defState()` (~line 616); `buildSprint` `scored` map (the line `const scored=pool.map(q=>({q,w:weightFor(q.id,now)*factor(q.d)*(recent.has(q.id)?0.12:1)}));`, ~line 794).
- Verify: Playwright (no new unit test; `review.js` unit tests cover the boost value).

**Interfaces:**
- Consumes: `Review.SW_BOOST` (Task 1).
- Produces: `S.lr` (object, lesson-read timestamps keyed `"<course>:<domain>"`), consumed by Task 5.

- [ ] **Step 1: Add script tags** for `review.js` and `lessons.js` among the data/module `<script>` tags, before the inline application `<script>`.

- [ ] **Step 2: Add `lr:{}`** to the object returned by `defState()` (alongside `cal`/`sw`). (No `normalizeState` change: `defState()` is the merge base for `LS.get`, so an old save with no `lr` keeps the `{}` default.)

- [ ] **Step 3: Apply the boost** in `buildSprint`: change the `scored` map so each weight is multiplied by `(S.sw.includes(q.id)?Review.SW_BOOST:1)`. Leave the rest of `buildSprint` unchanged.

- [ ] **Step 4: Behavior check (Playwright).** Script, in `index.html`:
  - Load with an **old save** (`c1b.state` = `{v:1,settings:{course:"core1"}}`, no `lr`/`cal`/`sw`): page loads, no console error, `window.Review` and `window.Lessons.LESSONS` defined. (Review Focus 2)
  - Seed `S.sw` with one real question id and one **stale** id (`"g:bogus:x"` / an id from another course): start a sprint repeatedly and confirm no console error and the seeded real id appears at a higher rate than an unboosted peer across N sprints. (Review Focus 3)
  Expected: both pass, zero console errors.

- [ ] **Step 5: Commit** — `feat(state): load review/lessons modules, boost sure-wrong selection, add lr`.

---

### Task 4: Blind-Spots Hub — the map view

**Files:**
- Modify: `index.html` — render dispatch (`v.innerHTML=…`, ~line 1055) to add `view==="review"?reviewHTML():`; add `reviewHTML()` and a `reviewEntries()` helper; home command (`<button class="cmd" data-act="weak">…`, ~line 1118); click handler (add `case "review"`, keep behavior of old `case "weak"` reachable; ~line 1630+); `W`-key handler (`if(view==="home"&&e.key.toLowerCase()==="w"){startRound("weak")…}`, ~line 1730); minimal CSS reusing `.cmd`/`.chip`/`.panel`/`.silk`.
- Verify: Playwright.

**Interfaces:**
- Consumes: `Review.rankDomains`, `Review.swCounts`, `Review.domainStatus` (Task 1); `mastery(d)`, `resolve(id)`, `DOMAIN_IDS`, `DOMAINS`, `S.sw` (existing).
- Produces: `view==="review"` (the hub) and `reviewEntries() -> ranked [{d, mastery, sureWrong, score, status}]`, consumed by Task 5.

- [ ] **Step 1: Add `reviewEntries()`** — builds `[{d, mastery:mastery(d), sureWrong:(Review.swCounts(S.sw, id=>{const q=resolve(id);return q?q.d:null})[d]||0)}]` for each `d` in `DOMAIN_IDS`, returns `Review.rankDomains(...)`.

- [ ] **Step 2: Add `reviewHTML()`** — a panel titled "Blind spots" over the ranked list; each domain is a `<button class="cmd" data-act="review-domain" data-d="${d}">` showing `DOMAINS[d].name`, its accuracy (or "not started"), and a `<span class="chip hot">⚠ sure &amp; wrong</span>` when `sureWrong>0`. Include a "Drill my weakest" button (`data-act="review-weak"`). Register `reviewHTML` in the render dispatch.

- [ ] **Step 3: Rewire entry points** — replace the home "Weak spots" command button with `data-act="review"` labelled "Blind spots" (keep the `W` kbd hint); change the `W`-key handler to `{view="review";reviewSel=null;render();return}` (declare `let reviewSel=null` beside `let view`); add click-handler `case "review":reviewSel=null;view="review";render();break;` and `case "review-weak":startRound("weak",{origin:"review"});break;`. (The old global weak-drill is preserved via `review-weak`.)

- [ ] **Step 4: Behavior check (Playwright).**
  - From home, click Blind spots (and separately press `W`) → the hub renders, listing all 5 Core 1 domains. (both open it)
  - With a seeded save where one domain has Sure-wrong items and another is weak-but-no-SW: the Sure-wrong domain is listed first and shows the ⚠ chip. (Review Focus — ranking)
  - A fresh/zero-data save: every domain shows "not started", none flagged weak, no crash. (Review Focus 2)
  Expected: all hold, zero console errors.

- [ ] **Step 5: Commit** — `feat(ui): blind-spots hub map view (ranked domains, sure-wrong flagged)`.

---

### Task 5: Lesson panel, learn→drill loop, return-to-hub, reviewed marker

**Files:**
- Modify: `index.html` — `reviewHTML()` (branch on `reviewSel`); add `lessonHTML(d)`; `startRound` R-object (`…label:opts.label||""}`, ~line 845) to store `origin`; `summaryHTML()` row (~line 1307–1311) and the summary `Enter` handler (~line 1735) for `origin==="review"`; click handler (`review-domain`, `review-drill`); CSS for the lesson panel reusing `.panel`/`.blk`/`.silk`.
- Verify: Playwright.

**Interfaces:**
- Consumes: `Lessons.LESSONS` (Task 2); `reviewSel`, `reviewEntries()` (Task 4); `S.lr` (Task 3); `startRound` (existing).
- Produces: the complete hub→lesson→drill→hub loop.

- [ ] **Step 1: Add `lessonHTML(d)`** — reads `Lessons.LESSONS[COURSE.id]?.[d]`. If present, render title, intro, a "Key points" list, and a "Common traps" list (reuse `.blk`/`.silk`), plus a **"Drill this"** button (`data-act="review-drill" data-d`) and a **"Back"** button (`data-act="review"`). If absent, render a "Lesson coming soon" note with the same Drill this + Back buttons (graceful). Make `reviewHTML()` render `lessonHTML(reviewSel)` when `reviewSel!=null`, else the map.

- [ ] **Step 2: Wire selection, origin, and return.**
  - Click handler: `case "review-domain":reviewSel=+el.dataset.d;S.lr[COURSE.id+":"+reviewSel]=Date.now();save("state");render();break;` and `case "review-drill":startRound("sprint",{domain:+el.dataset.d,origin:"review"});break;`.
  - In `startRound`, add `origin:opts.origin||""` to the `R={…}` object.
  - In `summaryHTML`, when `R.origin==="review"`, make the primary button `<button class="btn primary go" data-act="review">Back to blind spots <kbd>Enter</kbd></button>` (in place of "Another sprint"), keeping the `Home` button.
  - In the summary `Enter` handler, branch first: `if(R.origin==="review"){e.preventDefault();reviewSel=null;view="review";render();return}`.
  - In `reviewHTML`'s map branch, show a small "✓ reviewed" marker on a domain whose `S.lr[COURSE.id+":"+d]` is set.

- [ ] **Step 3: Behavior check (Playwright).**
  - Open the hub, click a Core 1 domain with a lesson → lesson panel shows title/points/traps; the domain now shows "✓ reviewed" back in the map. (lr marker)
  - Switch to Linux+ (or a domain with no lesson) and open it → "Lesson coming soon" + a working Drill this; no crash. (Review Focus 1)
  - "Drill this" → a domain-scoped round starts; finish it → the summary shows "Back to blind spots"; clicking it (and pressing Enter) returns to the hub. (loop + Review Focus 5 forward)
  - Start an ordinary **sprint** from home, finish it → summary shows the normal "Another sprint", and Home/Enter go to real home, **not** the hub. (Review Focus 5 isolation)
  Expected: all hold, zero console errors.

- [ ] **Step 4: Run the whole unit suite** — `node --test tests/*.test.js` → all pass (Phase 1 + `review` + `lessons`).

- [ ] **Step 5: Commit** — `feat(ui): lesson panel, learn→drill loop, and return-to-hub`.

---

## Notes for execution

- Lesson **content accuracy** is the owner's fact-check gate: the PR holds for sign-off (merge auto-deploys via GitHub Pages). The PR description must list all 9 lessons and surface every `[VERIFY: …]` flag. The automated `lessons.test.js` only checks shape, not facts.
- Integration tasks (3–5) are verified by Playwright behavior checks, consistent with Phase 1; keep those scripts in the scratchpad, not the repo.
