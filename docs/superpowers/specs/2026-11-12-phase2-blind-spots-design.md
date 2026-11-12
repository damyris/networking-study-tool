# Phase 2: Blind-Spots Hub — Design

**Date:** 2026-11-12
**Status:** Draft for approval. Phase 2 of the "deeper learning" upgrade (see `2026-11-12-deeper-learning-design.md`). Phase 1 (confidence calibration) is merged.

## Intent and the why

A first-year IT student (ADHD learner) uses Cert Bench to study for CompTIA A+. Sprints already resurface weak and due questions, but re-asking a question the learner keeps missing doesn't *fix* it — a confidently-wrong answer is a broken mental model, not a memory slip. Phase 2 gives the learner a **foundational understanding of their own weak points**: a place that (1) shows them *where* they're weak, with confidently-wrong areas flagged as the priority, and (2) when they go to shore one up, *teaches the concept* with a short written lesson before re-drilling it. The confidence data captured in Phase 1 (`S.cal`, `S.sw`, per-answer `conf`) is the steering wheel.

The chosen shape is a **Blind-Spots Hub** (Approach C below): a dedicated screen that maps weak points by domain, flags Sure-and-wrong areas, and lets the learner open each one's lesson and then drill it.

## Goals

- A map of the learner's weak points, ranked worst-first, within the current course, with a clear ⚠ marker on domains that hold Sure-and-wrong items.
- Short, written, **authored** lessons that rebuild the foundation of a weak domain — not auto-generated, not a wall of text.
- A tight learn → drill loop: read the lesson, drill that domain (reusing the existing weighted/weak selection, biased toward the learner's Sure-and-wrong and low-box items), return to an updated map.
- Lessons for **A+ Core 1 (5 domains) and A+ Core 2 (4 domains)** — 9 lessons, drafted by Claude for the owner to fact-check.
- Fully offline; preserve existing saves (`c1b.state`), the per-question stat shape `{s,c,w,b,l}`, the question schema, and the Phase 1 `cal`/`sw` keys.

## Non-goals

- No runtime generation of lesson content (no Claude at runtime). Lessons are static, authored data.
- No Linux+ lesson content in this phase. The hub still works for Linux+; domains without a lesson show a "lesson coming soon" state and remain drillable.
- No new question types and no Phase 3 active-recall/explanation-production (that's a later phase). Re-testing uses the existing four question types.
- No rebuild of the spaced-repetition engine. The existing Leitner box (`b`, `INTERVAL`, `weightFor`, `buildSprint`) is reused as-is; Phase 2 only *steers* selection with the confidence signal and adds the lesson layer on top.
- No account system, no telemetry.

## Anti-goals (would make this a failure even if it "works")

- A lesson that is long, dense, or reads like a textbook dump — it must be skimmable on one screen.
- Anything that punishes the learner for having weak spots; the tone is "here's how to shore this up," not a scorecard of failure.
- Breaking the existing sprint flow or any existing save.
- A hub that is useless without lessons (it must degrade gracefully for Linux+ and any un-authored domain).

## Constraints

- Vanilla HTML/CSS/JS, no build step, no new runtime dependencies, everything offline.
- App logic is inline in `index.html`; question banks and course defs live in `bank.js`/`core2.js`/`linux.js`; facts in `window.FACTS`. Testable modules are IIFEs with a dual `window` / `module.exports` export (`sprint.js`, `labs.js`, `calibration.js`), unit-tested with Node's built-in runner, run as `node --test tests/*.test.js` (the bare `tests/` form fails on Node ≥ 22).
- New state must be additive and optional; old saves must load unchanged.
- "Topic" is thin as a formal category (only 2 named topics exist across courses). Weak points are ranked at the **domain** level (Core 1: 5, Core 2: 4), which is also the lesson unit. The per-question free-text `t` label is available for future fine-grained lessons but is out of scope here.

## Approaches considered

- **A — Lesson-first review mode (teach → drill).** A single "Review" flow auto-picks the weakest cluster, shows its lesson, then drills it. Trades away the at-a-glance map; the learner doesn't see the whole picture or choose.
- **B — Just-in-time teaching (drill → miss → teach inline).** Lesson content expands inside question feedback when a weak/Sure-wrong item is missed. Lightest build, but there's no distinct "understand my weak points" experience and no map — weaker against the stated goal.
- **C — Blind-spots hub (map-first; lessons as a library). CHOSEN.** A dedicated screen maps weak points, flags Sure-wrong, and each entry opens a lesson then a drill. Delivers both the map and the teaching in one visible feature, and is the strongest portfolio artifact. B can later be folded in as an enhancement once lessons exist.

**Owner's decisions in the conversation:** Approach C; teaching is genuinely *authored short lessons* (not assembled from existing fields); scope is Core 1 + Core 2 domain-level lessons; the map and the teaching are both wanted, with the teaching as the core.

## The how — decided (Claude's calls unless marked as the owner's)

**Owner's calls:** Approach C; authored lessons; Core 1 + Core 2 coverage.

**Claude's calls (vetoable):**

1. **Where it lives.** A new home command **"Blind spots"** that opens the hub. It **replaces the current "Weak spots" command** (same intent, more depth) and keeps the **`W`** keyboard shortcut. The old global weak-drill behavior is preserved as a "Drill my weakest" action inside the hub, so nothing is lost.

2. **Blind-spot ranking.** For each domain in the current course, compute a shakiness score from data that already exists: Sure-and-wrong count in the domain (from `S.sw` mapped to domains via `resolve(id).d`) is the dominant factor, then accuracy (reuse `mastery(d)`), then low Leitner boxes / least-seen. Domains are listed worst-first. A domain holding any Sure-and-wrong item gets a ⚠ marker. Domains with no data show a neutral "not started yet" state, not a weak score.

3. **Lesson content model.** A new data file `lessons.js` registering `LESSONS = { core1: { <domainId>: lesson, … }, core2: { … } }`. **Resolved by the builder check (Claude's call):** unlike the window-only data files (`bank.js`/`core2.js`/`linux.js`, which throw under Node and are never required by a test), `lessons.js` uses the **dual `window` / `module.exports` export** pattern of the IIFE modules, so the shape test can `require()` it directly under `node --test` with no `global.window` shim. It is still loaded in the page via a `<script>` tag like the other data files. Each lesson is a small object:
   - `title` — short heading
   - `intro` — 2–3 plain sentences: what this domain is really about
   - `points` — 4–6 foundational bullets (the load-bearing facts)
   - `traps` — 2–3 "common confidently-wrong" bullets (the tempting mistakes)
   Lessons are short enough to skim on one screen. Missing lessons (Linux+, any un-authored domain) are handled by a graceful "lesson coming soon — drill to practice" state.

4. **Testable logic module.** The ranking/selection logic (blind-spot scoring, `sw`→domain mapping, worst-first ordering, "not started" detection) goes in a new `review.js` IIFE with dual export, unit-tested, mirroring `calibration.js`. The hub rendering and the lesson data stay in `index.html`/`lessons.js` (untested view code + static content), with a lightweight test asserting every authored lesson matches the expected shape.

5. **The learn → drill loop.** From the hub, selecting a domain opens its lesson panel with a **"Drill this"** button that starts a round scoped to that domain, reusing `buildSprint`/`weightFor` with a bias toward the learner's Sure-and-wrong and low-box items in that domain. **Resolved by the builder check (Claude's call):** only drills *launched from the hub* return to the hub afterward (tracked via the round's launch origin); ordinary sprint / weak / lightning summaries keep returning to the real home exactly as today, so the existing flow is untouched. The hub recomputes its ranking on each visit. (Confidence capture during the drill is unchanged from Phase 1.)

6. **Light new state (optional, additive).** `S.lr` — a map of `"<course>:<domain>" → timestamp` recording when a lesson was last read, used only to show a subtle "reviewed" marker in the hub. Defaulted empty via the existing normalize path; absence is harmless. If this proves to be scope creep during planning, it can be dropped without affecting the core loop.

## Lesson sourcing and verification (owner decisions + Claude's method)

- **Source (owner's call): Wikipedia.** Each lesson's foundational facts are drafted from Wikipedia.
- **Method (Claude's call, vetoable):** every lesson is cross-checked against the app's own question explanations (`x`) so the teaching targets exactly what Cert Bench tests and the learner's actual weak spots. Where Wikipedia's framing and CompTIA's expected exam answer diverge (common on specifics like RAID drive minimums, port numbers, or version-specific objectives for 220-1201 / 220-1202), that line is flagged inline for the owner rather than resolved by guess.
- **Merge gate (owner's call; defaulted to Claude's recommendation): hold the PR for owner sign-off.** Because merging auto-deploys to the live study tool via GitHub Pages, the PR does **not** merge until the owner has fact-checked the lessons. The PR description lays out all 9 lesson drafts (with any flagged divergences) for that review. Lesson content is a reviewable deliverable distinct from code: the code path (hub, `review.js`, loop) can be reviewed and is mergeable on its own merits, but the combined PR holds for the owner's content sign-off before merge. (Owner may instead choose "ship flagged," where lessons go live behind a visible "draft — verify before relying on this" marker.)

## What's left to the builder (the plan)

- Exact shakiness-score formula and tie-breaks (within the constraints above), to be pinned down with tests in the plan.
- Precise hub layout/markup and CSS, reusing existing panel/`.cmd`/`.chip`/`.silk` styles and theming.
- How the domain-scoped drill biases toward Sure-wrong/low-box items (extend the existing weighting vs. a dedicated selector), decided in the plan with tests.
- The 9 lesson drafts (Core 1 ×5, Core 2 ×4), authored by Claude for owner fact-check; the plan treats lesson *content* as a reviewable deliverable separate from code.
- Task breakdown and TDD ordering, via the writing-plans skill.

## This PR / phase

Phase 2 ships the Blind-Spots Hub, the `review.js` ranking module, `lessons.js` with Core 1 + Core 2 domain lessons, and the learn → drill loop. Linux+ gets the hub but no authored lessons yet. Phases 1 and 2 are independent, additive, and preserve all existing data.
