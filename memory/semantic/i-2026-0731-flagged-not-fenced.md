---
id: i-2026-0731-flagged-not-fenced
type: insight
title: A flag that does not fence off the claim is decoration
created: 2026-07-31
confidence: high
source: observed
tags: [epistemics, architecture]
edges:
  - {rel: learned_from, to: e-2026-0731-01}
  - {rel: informs, to: n-jarvis-core}
  - {rel: evidence_for, to: n-goal-judgment}
---

# Flagged is not fenced

The board-exam claim was marked `?` and `medium` confidence. That was correct.
It was then written into `core/mission.md` as standing context and used to shape
prioritisation advice.

**The marking changed nothing about how the claim was used.**

## Why this is worse than not marking it

An unmarked guess is at least honestly dangerous — anyone reading it might
challenge it. A marked guess that is reasoned from anyway creates *false
assurance*: the system appears to be handling uncertainty properly, so nobody
looks again. The label becomes a substitute for the discipline it was supposed
to signal.

Constitution VI was satisfied to the letter and defeated in practice.

## The rule

**A claim marked `?` or below `high` confidence may not be used as a premise for
a recommendation or written into a durable file as context.** It may be held, it
may be tested, it may generate a question. It may not silently become a
foundation.

When something uncertain is genuinely needed to proceed, state the dependency
out loud: *"this plan assumes X, which is unverified — if X is wrong the plan
changes."* That keeps the uncertainty attached to the conclusion, where it can
still do its job.

## Where it generalises

Any system carrying confidence metadata — RAG pipelines, research summaries,
forecasts, medical or legal drafting. Confidence scores are worthless unless
something downstream **behaves differently** because of them. If low-confidence
and high-confidence items flow into the same conclusions identically, the
scoring is theatre.

The test is simple and should be run on any such system: *find a low-confidence
item and check whether anything actually treated it differently.*
