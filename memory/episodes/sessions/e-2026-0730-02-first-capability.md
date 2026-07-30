---
id: e-2026-0730-02
type: episode
title: First capability added after the architecture froze
created: 2026-07-30
edges:
  - {rel: evidence_for, to: d-2026-0730-01}
  - {rel: led_to, to: n-jarvis-core}
---

# First capability added after the architecture froze

Aaryaman asked to connect ChatGPT, Gemini, Vercel, Firecrawl, and Google apps.
First real test of decision `d-2026-0730-01`, which predicted that adding a
capability would touch only `modules/` and `adapters/registry.yaml`.

## What happened

Three of the five were already wired — Vercel as `web.deploy`, Firecrawl as
`web.search`/`web.fetch`/`web.research`, Google as `mail.*`/`calendar.*`/
`doc.store`. The adapter layer had absorbed them at build time without anything
above it knowing their names.

ChatGPT and Gemini were genuinely absent, and genuinely different in kind: not
tools that perform work, but independent minds that can disagree. Added as a new
`reason.*` capability class rather than as plumbing.

## The prediction, graded

**Held.** `core/` and `engines/` were not touched — verified with git rather
than asserted.

**But not exactly as written.** The change also added a script, a shared
library, and a command. The prediction said "only modules and registry", which
was too strong. The honest version: *binding a new vendor to an existing
capability* is a one-line registry edit. *Introducing a capability class that
did not exist* legitimately needs new mechanism.

Two different operations were collapsed into one claim. That is a flaw in the
prediction, not in the architecture — and it is only visible because the
prediction was written down beforehand.

## Also found

The doctor had two bugs, both surfaced by being used on something it had not
seen at authoring time:

- Capability regex `[a-z]+\.[a-z]+` rejected underscores, so
  `reason.second_opinion` read as unregistered
- `review:` heads a nested YAML block, so a truthiness check reported a present
  field as missing

Both fixed. Neither would have been found without a second module existing —
a tool validated only against the case it was written for is not validated.

## Lesson

Predictions should distinguish *extending* an existing abstraction from
*introducing* a new one. They have different costs, and collapsing them makes a
prediction that cannot be honestly graded.
