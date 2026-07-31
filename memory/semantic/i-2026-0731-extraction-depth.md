---
id: i-2026-0731-extraction-depth
type: insight
title: Extraction defaults to features and skips loops, because features leave artifacts
created: 2026-07-31
confidence: medium
source: observed
review: 2027-01-31
tags: [method, learning]
edges:
  - {rel: learned_from, to: e-2026-0731-02}
  - {rel: informs, to: n-goal-judgment}
---

# Features get taken; loops get skipped

Reading three transcripts about self-improving systems, extraction picked out two
discrete features and passed over three loops — despite the loops being the
explicit thesis of all three.

## The mechanism

A feature is a thing you can add and then point at. It produces an artifact the
same day, and adding it feels like progress because it *is* visible progress.

A loop produces nothing on the day it is built. Its entire value is that
something gets better later. There is no artifact to point at, so it registers
as lower-value during extraction even when the source explicitly says otherwise.

**The bias is toward what can be finished, not toward what compounds.**

## Why this matters beyond one reading

It is the same failure the mission file names in a different context —
optimising for output over leverage. Applied to learning rather than to work, it
means the most valuable ideas in any source are systematically the ones least
likely to survive summarisation.

Compounding mechanisms are the hardest thing to notice you have skipped, because
skipping them produces no error. Everything still works. It just never gets
better.

## The correction

When extracting from any source, ask explicitly: **what here is a loop rather
than a feature?** Then check whether it was taken.

A useful tell: if every item extracted could be built and finished in one
session, the loops were probably missed. Loops rarely feel finished.
