---
description: Deep unprompted work on the graph — run it overnight
---

# /dream

Thinks about your problems when you are not in the room. Read
`modules/dream/MODULE.md` before running.

Every other part of JARVIS is reactive. This is the only thing that does deep
work nobody asked for.

## Procedure

```bash
node scripts/graph-report.mjs --json
```

Start from structure — contradictions, bridge candidates, orphans, stale
beliefs, clusters. A dream that starts from "think about everything" reliably
produces vague output; one that starts from "these two clusters have no path
between them" produces something specific.

Then:

1. **Contradictions first** — not that two nodes disagree, but which is wrong
   and what follows
2. **Bridges** — force connections between the most distant pairs
3. **Parked ideas** — re-run against current capability; ideas that died on
   timing come back when the mastery record changes
4. **Orphans** — usually an unmade connection, not isolated knowledge
5. **Absence** — what has gone quiet? Which stated priority has no
   corresponding work? Drift is invisible from inside
6. **Second opinion** on the single strongest finding — a dream inherits the
   blind spots of the mind that built the graph

## The gate

One or two findings. Each **non-obvious, evidenced by node id, actionable, and
mission-relevant.** Fail one and it does not ship.

**Nothing is a valid output.** A quiet night should produce silence. The
gravitational pull is toward summarising — summarising always produces
something, which is exactly why it is the wrong instinct. A dream that files
filler nightly gets skimmed within a month, and then the real findings get
skimmed too.

## Scheduling

Designed for ~02:00 IST, after the day's work is captured and before the
morning brief. Findings land in `episodes/observations/dream/` and `/brief`
picks them up at 07:00.

Skip entirely if the graph has not changed since the last dream. Nothing new
went in, so nothing new will come out.
