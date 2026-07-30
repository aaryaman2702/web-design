# Interface — the instrument panel

```bash
node scripts/dashboard.mjs > interface/panel.html
```

Self-contained: no external requests, styles and script inline, renders locally
in a browser and publishes as an Artifact unchanged. Generated output, so it is
git-ignored — the graph is the source of truth, never the render.

## The design thesis

**Most instruments read zero, and the panel says so.**

That is the whole idea, and it is a deliberate inversion. A dashboard built over
a sparse graph does not stay honest by accident — it gets filled with whatever is
*easy* to display: counts, streaks, activity, hours saved. Those metrics then
quietly become what the system optimises for, and measuring activity is exactly
how a thinking partner degrades into a productivity tracker.

So the empty gauges are foregrounded rather than hidden. Zero taste predictions
is the most important number on the page, because it is the one that says whether
the system actually knows him yet.

## What it shows

Three things a panel does better than a terminal, and nothing else:

1. **The graph, rendered.** Force-directed, no libraries. Node colour is type,
   size is degree, **opacity is confidence** — so unverified knowledge literally
   looks faint. Seeing a domain sitting isolated with no edges into the rest is
   genuinely hard to notice from inside files.
2. **Readings against targets.** Ten decisions before judgment is measurable.
   Fifty taste judgments before the engine is predictive. The denominator is the
   point.
3. **Structural faults.** Orphans, stale beliefs, contradictions — surfaced,
   not buried in a traversal.

## What it will never show

Streaks. Activity counts. Token spend. Task lists. Hours or money saved.

Anything that rewards motion over judgment. The metric a system displays becomes
the thing it is optimised for, whether or not anyone intended that — and at this
stage the binding constraint is learning rate, not throughput.

## Also worth doing

Point any wikilink-aware Markdown editor at `memory/`. Graph view renders the
same structure natively, live, with no build step. The schema uses `[[wikilinks]]`
specifically so that works for free.
