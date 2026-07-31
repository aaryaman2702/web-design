---
id: o-drift-2026-0730
type: episode
subtype: observation
title: Tool identifiers drifted three times in one session
created: 2026-07-30
confidence: high
source: observed
tags: [architecture, adapters]
edges:
  - {rel: evidence_for, to: d-2026-0730-01}
  - {rel: informs, to: n-jarvis-core}
---

# Tool identifiers drifted three times in one session

## What happened

Every connected capability provider changed identity, twice, within hours.

1. **Initial state** — servers exposed under readable names
   (`<provider>__generate_video`, `<provider>__search_threads`).
2. **First drift** — all six disconnected and reappeared under opaque UUID
   identifiers. Same accounts, same capabilities, different names, no warning.
3. **Second drift** — the UUID identifiers disconnected and the readable names
   returned.

Roughly 170 tool identifiers changed each time.

## Why this is recorded

`d-2026-0730-01` chose a tool-agnostic architecture and predicted the payoff
would be that vendor churn costs a one-line registry edit rather than a rewrite.
The reasoning cited drift as an observed risk.

Three events in a single working session is stronger evidence than the decision
assumed. The risk is not annual, it is intra-session.

## What it cost

Nothing. `core/`, `engines/`, and `modules/` name no tools, so nothing above the
adapter layer noticed. The registry already carried both forms — the readable
name as `tool` and the UUID form as `alias` — because the first drift was
recorded when it happened.

Worth being precise about the counterfactual rather than claiming a
larger win than earned: a system with tool names embedded in its modules would
not have *crashed*. It would have produced confident instructions to call tools
that no longer existed, and the failure would have surfaced as strange output
rather than as an error. That is the expensive kind — it wastes debugging time
in the wrong place.

## Implication

The resolution protocol in `adapters/registry.yaml` should be treated as
routine rather than exceptional: **verify a tool resolves before batch work, do
not assume the recorded identifier is current.** Written as an occasional
safeguard; the evidence says it is the normal case.

No change needed to the registry itself — both identifier forms are already
recorded for every drifted capability.
