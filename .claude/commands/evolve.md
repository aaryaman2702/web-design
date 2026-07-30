---
description: Weekly — what should change about this system
---

# /evolve

The command that makes JARVIS better rather than merely busy.

Not "what happened this week" — **what should change.** Every finding ends in an
edit. A finding that changes no file did not happen.

## Procedure

Run the seven questions from `engines/evolution/ENGINE.md`, in order:

1. **What repeated?** → scaffold a module. Anything done by hand three times.
2. **What underperformed?** → patch or retire against declared review metrics.
3. **What should split?** → a module doing three things does all three
   adequately.
4. **Which beliefs went stale?** → nodes past `review`. Re-confirm, revise, or
   supersede. Never silently keep.
5. **What patterns emerged?** → promote to principle if it holds.
6. **What should stop?** → the hardest question and the highest return.
   Subtraction is where systems stay usable.
7. **Did it make him more capable?** → when no, that outranks everything above.

## Health checks

```bash
node scripts/doctor.mjs
```

Verifies layer purity — no tool names leaking into `core/` or `engines/` — plus
capability resolution and graph integrity.

Also check: curiosity engine hit rate holding? Taste prediction accuracy rising?
A flat prediction rate means taste is collecting judgments without learning from
them, which looks identical to working from the inside.

## Self-patching bounds

The evolution engine may edit engines and modules directly. It may **not**
autonomously edit `core/constitution.md` or `core/mission.md` — it proposes with
evidence, Aaryaman decides.

A system that can rewrite its own values will eventually rewrite them toward
whatever is easiest to satisfy. That is the one door kept locked.

Commit before self-editing. Git is the safety net.

## Patch discipline

**Patch from patterns, never single incidents.** One bad run is noise; editing
on noise makes the system worse while feeling productive. Three runs failing the
same way is signal.

Every edit gets a written prediction of what improves, checked at the next
review. Unevaluated edits accumulate into drift.

## Output

Write to `memory/episodes/evolution/<date>.md`: what changed, why, what was
predicted.

Over years this becomes the changelog of a mind — not what the system did, but
how it got better at doing it.
