---
id: n-self-state
type: entity
subtype: state
title: Current state
created: 2026-07-30
updated: 2026-07-30
edges:
  - {rel: part_of, to: n-self-aaryaman}
  - {rel: informs, to: n-jarvis-core}
---

# Current state

What is live right now. Read at boot, rewritten freely — this is the one file in
memory that is *meant* to be overwritten rather than appended to. History lives
in `episodes/`; this is a snapshot.

Keep it short. A state file that grows into a project archive stops being read.

---

## Active

- **JARVIS.** Core, engines, memory, four modules, instrument panel. Exercised
  against real work once — three scroll-film treatments built for taste
  elicitation.
- **Awaiting a taste reaction.** Prediction sealed at `ae88ca6`. This is the
  single highest-value pending item in the system; the taste engine cannot
  calibrate without it.

## Day-two check

The first dream found that the graph was entirely about itself, and recorded
its own counter-argument: *day one is exactly when a graph should be empty of
real work — it stops being fair on day two.*

It is now day two. Honest assessment: **partially resolved.** Roughly eight
nodes are now about craft and process rather than about this system — three
external insights, two observed insights, one artifact entity, one taste
signal, one work episode.

But every one of them was produced *in the course of building JARVIS*. Nothing
in the graph yet comes from work he was doing anyway. That is the distinction
the finding was actually pointing at, and it is not closed.

## Immediate next

1. **The taste reaction.** Answer the three questions on the treatments page.
   Ten minutes, unblocks the whole taste engine.
2. **Confirm the profile.** `memory/self/profile.md` is mostly inference. The
   open questions at the bottom remain the highest-value gaps in the graph.
3. **Point it at real work.** Something he was doing regardless of this system.
   That is what closes the day-two finding properly.
4. **Log decisions as they happen.** Judgment is unmeasurable below ~10 entries.

## Blocked / needs Aaryaman

- **Four routines need approval to arm** — attempted three times, blocked at the
  permission layer. Specs in `scripts/routines.md`.
- `?` Board-exam year and realistic weekly build window — changes all
  prioritisation
- `?` Which mastery domain to push this year
- Scheduled automations need an active plan on whichever runtime executes them;
  verify before relying on unattended runs

## Not doing

Recorded so it stops being reconsidered. Deliberate non-goals are as useful as
goals, and cheaper to forget.

- No dashboard until the engines have data worth displaying. A dashboard over an
  empty graph is decoration, and Aaryaman explicitly ruled out becoming a
  productivity dashboard.
- No modules built speculatively. Modules come from observed repetition — that
  is what the evolution engine is for.
- No coupling to the current toolset beyond `adapters/registry.yaml`.
- **No time-saved or money-saved metrics.** Tempting and common — assign an
  hourly rate, multiply by automated hours, display the number. Rejected
  because the metric a system displays becomes the thing it optimises for,
  and hours-saved rewards *volume of automation* rather than *quality of
  judgment*. At his stage the binding constraint is learning rate, not
  throughput; a system optimising his throughput would quietly work against
  the mission. Measure calibration and taste accuracy instead — those track
  whether he is getting better, which is the actual objective.
