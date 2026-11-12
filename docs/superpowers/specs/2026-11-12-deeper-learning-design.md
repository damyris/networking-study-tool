# Cert Bench — "Deeper Learning" Design

**Date:** 2026-11-12
**Status:** Design accepted; Phase 1 in progress (this PR implements Phase 1 only)

## Intent

Cert Bench is a vanilla HTML/CSS/JS CompTIA study app (A+ Core 1/2, Linux+),
built by a first-year IT student as a portfolio piece and as a personal study
tool for an ADHD learner. The goal of this upgrade is to make Cert Bench
**defensibly better than Udemy-style practice tests** — not just more
questions, but a study loop that teaches metacognition, targets weak spots,
and rewards honest self-assessment instead of lucky guessing.

Everything stays offline: no build step, no runtime network calls, no Claude
at runtime. Existing `localStorage` saves (`c1b.state`) and the existing
question schema must keep working.

## Goals

- Help the learner know **what they actually know** vs. what they only think
  they know (calibration).
- Reward honesty: admitting a guess should never be punished relative to
  pretending certainty.
- Surface "confidently wrong" items — the most dangerous gap for an exam.
- Keep the app fast, offline, and dependency-free.
- Preserve all existing data and behavior for returning users.

## Non-Goals

- No account system, no cloud sync, no telemetry.
- No change to the question schema or the existing per-question stat shape.
- No runtime LLM calls of any kind.
- No build tooling or framework migration.

## Three-Phase Approach

1. **Phase 1 — Confidence Calibration (this PR).** Capture pre-feedback
   confidence (Sure / Likely / Guess) on every graded answer. Reward honesty
   through XP (sure+correct earns the combo bonus; likely/guess earn flat,
   smaller amounts; any wrong earns zero). Track a calibration tally and a
   "Sure-and-Wrong" set, and show a plain-language readout ("When you said
   Sure, you were right 73% of the time"). The S/L/G keys replace the old
   single "Check" button and the binary "I'm guessing" toggle.

2. **Phase 2 — Spaced repetition / targeted review.** Use the calibration and
   stat data to schedule weak and "confidently wrong" items back sooner, so
   study time concentrates where it pays off.

3. **Phase 3 — Explanation recall / active production.** Move beyond
   recognition toward recall and self-explanation, deepening retention.

## Architecture Note

App logic is inline in `index.html`. Testable logic is extracted into small
IIFE modules with a dual `window` / `module.exports` export (mirroring
`sprint.js` and `labs.js`), unit-tested with Node's built-in test runner
(`node --test tests/`). Phase 1 adds `calibration.js` following this pattern.

This PR is **Phase 1 only.**
