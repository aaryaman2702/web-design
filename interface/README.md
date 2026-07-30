# Interface — deliberately empty

A visual layer was scoped for this build and is **intentionally not built yet.**
This file records the reasoning so the decision can be revisited rather than
forgotten.

## Why deferred

A dashboard renders state. The graph currently holds ten nodes, three taste
judgments, and one decision — there is no state worth rendering. Building the UI
now would produce a screen of empty panels and placeholder metrics, which is
precisely the outcome ruled out:

> "I don't want this to become a productivity dashboard."

The failure is subtle and worth naming: a dashboard built over an empty graph
does not stay empty. It gets filled with the things that are *easy* to
display — counts, streaks, activity — and those metrics then quietly become what
the system optimises for. Measuring activity is how a thinking partner degrades
into a productivity tracker.

## What would change this

Build it when the engines have output worth looking at:

- Taste has ~20 judgments and a prediction accuracy worth plotting over time
- Decisions has ~10 entries with resolved outcomes and real calibration data
- The curiosity engine has a hit-rate history
- The graph is large enough that traversal beats reading files directly

That is a matter of weeks of real use, not months of building.

## What it should be when built

Not a metrics wall. Three things a dashboard does better than a terminal:

1. **The graph, rendered.** Seeing the shape of what he knows, where the dense
   regions are, and where a domain sits isolated with no edges into the rest —
   that last one is genuinely hard to notice from inside files.
2. **Calibration over time.** Decision accuracy and taste prediction accuracy as
   curves. These are the two numbers that say whether the system is actually
   learning, and both are much clearer as trends than as figures.
3. **Contradictions, surfaced.** The `contradicts` edges, visible. The highest-
   value signal in the graph, currently only findable by traversal.

Any wikilink-aware Markdown editor pointed at `memory/` gives roughly the first
one for free, today, with no code.

## What it should never be

Streaks. Activity counts. Token spend. Task lists. Anything that rewards motion
over judgment — because the metric a system displays is the thing it will
eventually be optimised for, whether or not anyone intended that.
