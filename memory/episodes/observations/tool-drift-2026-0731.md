---
id: o-drift-2026-0731
type: episode
subtype: observation
title: Fourth drift event, caught mid-call — and the connector gap it exposed
created: 2026-07-31
confidence: high
source: observed
tags: [architecture, adapters, automation]
edges:
  - {rel: evidence_for, to: d-2026-0730-01}
  - {rel: supersedes, to: o-drift-2026-0730}
  - {rel: informs, to: n-jarvis-core}
---

# Fourth drift event, and the connector gap it exposed

## The drift

Arming the routines failed on the first attempt: the scheduling tool's
identifier had changed again. Fourth rename in two days.

The registry's resolution protocol handled it exactly as written — try the
recorded identifier, search the live tool list for one providing the same
capability, use it, record the drift. Elapsed cost: one failed call.

Worth noting the protocol was followed *because it was written down*. Without
it the reasonable-looking move is to report the capability as unavailable, which
would have been wrong and would have left the routines unarmed indefinitely.

## The more interesting finding

Creating the triggers surfaced a limitation that had not been anticipated:

> **The scheduled sessions run with no MCP connectors.**

No mail, no calendar, no file storage, no media generation, no web retrieval.
Only the base toolset — filesystem, shell, git.

## Why this did not break anything

All four routines were designed around **the graph and git**, not around tools:

| Routine | Needs | Survives? |
|---|---|---|
| dream | graph report, memory, git | yes |
| capture | git log, git diff, memory | yes |
| brief | graph, engines, memory | yes |
| evolution | doctor, run-audit, graph, memory | yes |

That is not luck, though it looked like it at first. It follows from the
architecture: the engines reason over memory, and memory is plain files in the
repository. A system whose thinking depended on live tool calls would have been
crippled by this; one whose thinking depends on its own graph is not.

**A design choice made for portability turned out to buy resilience.** The
reasoning at the time was that memory should outlive any vendor. The unforeseen
payoff is that memory also works when no vendor is reachable.

## What is genuinely lost

The brief cannot read his calendar or inbox. It reasons over the graph only.

This is a real reduction and should not be smoothed over — an intelligence
brief that cannot see today's meetings is doing less than one that can. If that
turns out to matter, the routine can be recreated from the account's own
routines interface, where connector grants are available.

For now it is the correct trade: a brief grounded in the graph is the one that
was actually designed, and the calendar version was never built.

## Cumulative

Four identifier changes in roughly thirty hours. The decision that chose a
tool-agnostic core estimated this risk as *annual*. Observed rate is closer to
*twice daily*.

The estimate was wrong by two orders of magnitude, and wrong in the direction
that made the architecture more valuable rather than less. Recording it because
a prediction that was wrong-but-favourable is still a wrong prediction, and the
calibration record should show that.
