# Decision Engine

Records choices with their reasoning, then goes back and checks. This is how
judgment becomes measurable instead of remembered — and memory of one's own
past decisions is systematically flattering, which is precisely the problem.

Six months from now this engine should be able to say things like *"every
project that went well started with real user research"* or *"your timeline
estimates run 2.3× optimistic when you're excited about the work."* Neither of
those is available from memory. Both change behaviour permanently.

**Fires:** on any strategic-class choice; on anything expensive or irreversible;
on any disagreement between Aaryaman and the system; on scheduled review sweeps.

---

## What counts

Not every choice. A decision is worth journaling when it is **consequential**
(the outcome matters in months, not hours) and **uncertain** (a reasonable person
could have chosen otherwise).

Journaling trivia buries the signal. If the answer was obvious, skip it.

---

## Decision node

```yaml
---
id: d-2026-0730-01
type: decision
title: Build the OS as a cognitive architecture rather than a workflow system
created: 2026-07-30
status: open                     # open | resolved | abandoned
reversibility: medium            # high | medium | low — drives how much rigour
confidence: 0.7                  # honest probability the expectation holds
review: 2026-10-30

chose: >
  Layered architecture with tool-agnostic core and contract-bound modules.

because: >
  Tool churn is fast and already observed mid-session. Coupling to vendors
  guarantees obsolescence. Indirection costs a day now and saves rewrites later.

alternatives:
  - option: Workflow OS built around today's tools
    why_not: Faster to value, dies when the stack changes
  - option: Off-the-shelf second-brain product
    why_not: No self-improvement, no adversary, memory locked to a vendor

expected: >
  Adding capability touches only modules/ and adapters/. Swapping a vendor is
  a one-line change. Core untouched for a year.

actual: null                     # filled at review — this is the whole point
lessons: null
edges:
  - {rel: caused, to: n-arch-2026}
---
```

**`expected` is the field that makes this work.** A decision without a written
expectation cannot be graded later, because hindsight will quietly rewrite what
you thought would happen. Write the prediction down, in falsifiable terms, before
knowing the answer.

**`confidence` as a number, not a word.** Numbers can be calibrated; "fairly
confident" cannot.

---

## Review sweep

Scheduled — weekly for anything due, and always before a similar decision.

1. Find decisions past `review` with `actual: null`
2. Fill in what actually happened, honestly, including when it is embarrassing
3. Compare against `expected` — right, wrong, or right-for-the-wrong-reasons
4. Extract the lesson if there is one; most individual decisions have none
5. Update `memory/decisions/calibration.md`

Step 4 is a real filter. Reading a lesson into every outcome manufactures
superstition — noise interpreted as signal. **Patterns across many decisions are
trustworthy; single outcomes usually are not.** Say "no lesson, small sample"
when that is the truth.

---

## Calibration record

`memory/decisions/calibration.md` accumulates the patterns worth knowing:

- **Confidence calibration** — of decisions rated 0.7, roughly 70% should have
  worked out. Systematic overconfidence is the most common and most correctable
  bias, and it is invisible without this record.
- **Domain accuracy** — good judgment in craft, weaker in timelines? Different
  domains deserve different levels of self-trust.
- **Recurring failure shapes** — rushing discovery, under-scoping, over-building
  before validating.
- **What good decisions had in common** — usually more diagnostic than what bad
  ones had in common.
- **System vs Aaryaman** — when they disagreed, who was right? This tells him
  how much to weight the system's objections, which he cannot know otherwise.

---

## Reversibility gate

Consulted before committing, cheap to run, prevents the most expensive category
of mistake.

**Reversible and cheap** → act now, observe, learn from reality. Deliberation
here is waste; the experiment is faster than the analysis.

**Irreversible or expensive** → full cognition pass, adversary protocol, decision
record, and a deliberate pause. The asymmetry is the point: the cost of slowness
is bounded, the cost of an unrecoverable mistake is not.

The common error is treating these identically — agonising over reversible
choices while making irreversible ones on instinct.

---

## Disagreement log

Whenever Aaryaman and the system disagree, record the position each took and
resolve it later. This produces something rare and genuinely useful: an honest
record of when the system was worth listening to and when it was wrong.

Without it, both parties remember selectively — he remembers the times it was
wrong, it has no memory at all — and the objections either get over-weighted or
ignored entirely. Neither is useful.
