---
id: n-taste-calibration
type: taste
subtype: calibration
title: Taste prediction accuracy
created: 2026-07-30
updated: 2026-07-30
edges:
  - {rel: part_of, to: n-taste-profile}
  - {rel: evidence_for, to: n-jarvis-core}
---

# Taste prediction accuracy

The number that says whether the system actually knows him, rather than merely
holding opinions about him.

## Protocol

Before showing Aaryaman any craft work, **predict his reaction and commit to
it.** Then log what happened.

- **Correct** → the model held. Small confidence increase on the judgments used.
- **Wrong** → high-value signal. Do not quietly patch the profile. Find which
  specific belief failed and correct *that*.

## Log

| Date | Predicted | Actual | Hit | Belief involved |
|---|---|---|---|---|
| — | — | — | — | *no predictions logged yet* |

## Reading this

**Rate rising** → the system is genuinely learning him.

**Rate flat** → it is collecting judgments without learning from them. This
looks identical to working from the inside, which is exactly why the number is
kept.

**Rate high but sample tiny** → not yet meaningful. Ten predictions before
drawing any conclusion.
