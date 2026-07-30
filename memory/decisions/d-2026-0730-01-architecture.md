---
id: d-2026-0730-01
type: decision
title: Build JARVIS as a cognitive architecture, not a workflow OS
created: 2026-07-30
status: open
reversibility: medium
confidence: 0.75
review: 2026-10-30
tags: [architecture, foundational]
edges:
  - {rel: caused, to: n-jarvis-core}
  - {rel: evidence_for, to: n-self-aaryaman}
---

# Build JARVIS as a cognitive architecture, not a workflow OS

The first entry in the journal, and deliberately so — the system should be able
to explain its own origin, and this is the decision everything else inherits
from.

## Chose

A five-layer architecture ordered by rate of change: identity → cognition →
engines → modules → adapters. The inner three layers may not name any tool,
vendor, or project. Capability is what modules require; adapters bind capability
to whatever tool currently provides it.

## Because

A first design was produced that fitted his present situation precisely — his
video generator, his hosting, his client, his credit balance. It was good, and
it was wrong, for a reason he identified before the system did:

> "Don't optimise this around my current tools or projects. Optimise it around
> the person I'm trying to become."

Three things made the argument decisive:

1. **Tool identifiers proved unstable inside a single session.** Every connected
   server disconnected and reappeared under different names mid-build. Not a
   hypothetical churn risk — observed, within hours.
2. **The stated horizon is ten years.** Nothing in the current stack is likely
   to survive that. Anything named in the core becomes a liability the moment it
   is replaced.
3. **The coupling failure is silent.** A module hard-wired to a dead tool does
   not error usefully — it produces confident instructions to call something
   that no longer exists.

## Alternatives considered

**Workflow OS around the current stack.** Faster to value, immediately concrete,
and genuinely what was asked for at first. Rejected: obsolescence is scheduled
rather than risked, and a rebuild costs more than the indirection.

**Off-the-shelf second brain.** Cheapest path. Rejected: no self-improvement, no
adversary, no decision calibration, and memory locked inside a vendor — which
contradicts the core requirement that memory outlive any tool.

**Multi-agent system with specialist agents.** The obvious pattern, and the one
most references reach for. Rejected on his explicit objection: a collection of
disconnected agents does not share memory, taste, or judgment. Specialist
behaviour was implemented instead as *passes over one intelligence* — same
context, same memory, different job per pass.

## Expected

Falsifiable, and to be graded honestly in October:

- Adding a capability touches only `modules/` and `adapters/registry.yaml`
- Replacing a vendor is a single-line registry edit with no module changes
- `core/` and `engines/` need no edits for a year for reasons of tool churn
- `doctor.mjs` keeps returning zero tool-name leaks into the inner layers

## Risks accepted

- **Indirection cost.** Every capability call passes through a registry lookup.
  Justified only if tools actually churn — they already have.
- **Abstraction before use.** The contract was designed before real modules
  exist, so some of it is guesswork and will need revision on contact.
- **The genuine risk: architecture as procrastination.** A beautifully layered
  system that never gets used is worth less than a crude one that runs daily.
  **This is the one to watch.** The mitigation is that the next work is
  deliberately not more architecture — it is feeding the engines real data.

## Actual

`null` — review 2026-10-30.

## Lessons

`null` — pending outcome.
