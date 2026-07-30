---
id: n-self-mastery
type: entity
subtype: mastery-record
title: Mastery record
created: 2026-07-30
updated: 2026-07-30
review: 2026-10-30
---

# Mastery record

Tracks the four domains from `core/mission.md`. Levels move **only on evidence**
— an artifact, an outcome, or a demonstrated judgment call. Never on
self-assessment, and never on time spent.

This distinction is the whole point. Hours studied measures effort; a shipped
thing that works measures capability. Systems that track the first make people
feel productive while getting no better.

**Levels:** `aware` → `functional` → `competent` → `strong` → `exceptional`

---

## 1. Craft — web experiences, motion, storytelling

**Level:** functional → competent `?`
**Evidence:** Owns a cinematic scroll-film practice with a codified process.
Ships real work with collaborators.
**Unverified:** No work has been reviewed by this system yet. Level is inferred
from the existence of the practice, not from its output.

**Next gap:** A defensible aesthetic point of view, stated and consistent. The
jump from competent to strong is not more technique — it is having a position
and holding it across projects. The taste engine is the instrument for this;
right now it has no data.

---

## 2. Engineering — systems, AI engineering

**Level:** functional `?`
**Evidence:** Builds with AI tooling across several platforms. Reasons about
architecture at the level of coupling and rate-of-change — demonstrated when he
rejected a tool-coupled design in favour of a layered one.

**Next gap:** Move from *using* agentic systems to *building* them. This OS is
the first real instrument for that: maintaining it, extending it under contract,
and diagnosing it when it misbehaves teaches memory architecture, evaluation, and
agent design more directly than any course would.

Concretely: writing a module that survives its own review cycle is the first
real milestone.

---

## 3. Business — products, growth, marketing, sales, operations

**Level:** aware → functional `?`
**Evidence:** Client work exists. Economics, pricing, and positioning are
unobserved.

**Next gap:** One complete loop — positioning through pricing through delivery
through retrospective — with the reasoning recorded. One documented loop teaches
more than a year of unexamined delivery, because only the recorded version can
be reasoned about later.

**Weakest domain, and the one with the most headroom.** Craft plus engineering
without business produces an excellent contractor. The combination is the point.

---

## 4. Judgment — decisions, leadership, thinking

**Level:** unmeasured
**Evidence:** None yet — the decision journal is empty.

**Next gap:** Ten logged decisions with written expectations. Until then this
domain cannot be scored, and any claim about it would be flattery.

Early signal is genuinely promising: rejecting a good design for being
short-horizon, and asking to be challenged rather than agreed with, are both
judgment behaviours. But signal is not evidence, and the difference matters.

---

## Reading this record

Every level currently carries a `?`. That is correct and expected — the system
has one session of data. **Confidence here should rise slowly.** A mastery record
that reaches high confidence in a month is measuring enthusiasm, not skill.

The most useful column is **Next gap**, not Level. Levels are for tracking;
gaps are for acting.

## Update protocol

1. Evidence appears — something shipped, an outcome landed, a call proved right
2. Record it as an episode with a `evidence_for` edge to this node
3. Level moves only if the evidence is *independent* of prior evidence
4. Reassess quarterly via the evolution engine

Never move a level because time passed.
