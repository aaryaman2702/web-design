---
id: i-2026-0801-repetition-gate
type: insight
title: Extracting a module feels like progress in a way that doing the work does not
created: 2026-08-01
confidence: medium
source: observed
review: 2027-02-01
tags: [method, tooling, systems]
edges:
  - {rel: informs, to: n-goal-ai-engineering}
  - {rel: evidence_for, to: n-jarvis-core}
---

# Extraction feels like progress; that is the trap

Three files in this system talk about building modules from repeated work, and
none of them detects repetition. `/learn` fills that gap — but the more useful
part of writing it was noticing why the gap persisted.

## The asymmetry

Doing a task produces a result. Extracting a module from that task produces a
*capability*, which feels strictly better — more leverage, more permanence, more
architecture.

That feeling is unreliable, and it is unreliable in a specific direction:
**extraction is rewarding regardless of whether the module will ever be used.**
Doing the work has an obvious failure condition; building a module for it does
not fail visibly until months later, when nobody runs it.

This system already carries two modules built speculatively and never run — in
violation of its own rule, written by the same author within a day.

## The gate

Three instances before extraction. Not because three is magic, but because the
friction of doing something by hand is what reveals which parts are invariant.
A module built after one instance encodes the accidents of that instance as
though they were the rule, and is then trusted.

## The separation that is the actual craft

| Invariant — same every time | → the procedure |
| Variable — different every time | → the input |

Both failure directions are real. Too much invariant produces a module that
works only on the case it was born from. Too much variable produces a form with
extra steps that decides nothing.

The test that works: **describe the work to someone who was not there.** What
you explain is invariant. What you ask about is variable.

## Generalises to

Any abstraction decision — functions, services, interfaces, roles on a team.
The instinct to abstract early is the same instinct, and it fails the same way:
an abstraction drawn from one instance encodes coincidence as structure.
