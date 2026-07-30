---
description: Journal a decision with reasoning, alternatives, and a falsifiable expectation
---

# /decide $ARGUMENTS

Records a choice so it can be graded later. Memory of one's own past decisions is
systematically flattering — this is the correction.

## First: is it worth journaling?

Two tests. Both must pass.

- **Consequential** — the outcome matters in months, not hours
- **Uncertain** — a reasonable person could have chosen otherwise

If the answer was obvious, skip it. Journaling trivia buries the signal.

## Procedure

1. **Check reversibility.** Reversible and cheap → act, observe, learn; the
   experiment beats the analysis. Irreversible or expensive → full cognition
   pass and adversary protocol before committing.

2. **Ground.** Any prior decisions like this? Check
   `memory/decisions/calibration.md` — is this a domain where his judgment has
   been reliable?

3. **Capture the reasoning**, per the schema in `engines/decision/ENGINE.md`:
   what was chosen, *because*, alternatives with why-not, expectation,
   confidence as a number, review date.

4. **The expectation is the point.** Write it falsifiably, before the outcome is
   known. Without it, hindsight quietly rewrites what you thought would happen
   and the entry becomes worthless.

5. **Confidence as a number.** 0.7, not "fairly confident." Numbers calibrate;
   words do not.

6. **Set the review date.** Weeks for fast-feedback decisions, months for slow
   ones. It goes on the calendar via `schedule.create` if it matters.

7. **Write** to `memory/decisions/`, edged to what it affects.

## If Aaryaman and the system disagree

Record both positions before the outcome is known. Resolve at review.

This builds the only honest record of when the system was worth listening to.
Without it, he remembers the times it was wrong and it remembers nothing — so
its objections get either over-weighted or ignored, and neither is useful.
