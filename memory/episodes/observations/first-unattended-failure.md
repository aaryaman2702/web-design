---
id: o-2026-0801-silent-failure
type: episode
subtype: observation
title: Both routines fired, both did nothing, and the tool built to catch that missed it
created: 2026-08-01
confidence: high
source: observed
tags: [automation, failure, tooling]
edges:
  - {rel: evidence_for, to: n-jarvis-core}
  - {rel: learned_from, to: i-2026-0731-flagged-not-fenced}
---

# Both routines fired, both did nothing, and the audit missed it

The first unattended runs. Dream at 20:32 UTC, brief at 01:30 UTC. Both show
`last_fired_at`. **Neither produced a file, a commit, or any trace.**

## Root cause

JARVIS lives on a working branch. `main` contains only a README and an old
archive. A fresh session clones the default branch, so both runs landed in a
repository with no `CLAUDE.md`, no `core/`, no `memory/`, and no scripts.

They had nothing to read and nothing to do. So they did nothing — and reported
nothing, because there was no instruction telling them that "cannot find the
system" is a *failure* rather than an empty day.

## The second, worse failure

`run-audit.mjs` was built one day earlier specifically to catch silent
failures. It reported **"Silent: none"**.

Two independent bugs, both mine:

1. **Conflated fields.** The silence window was derived from `review.cadence`.
   The dream *runs* daily and is *reviewed* monthly — different things. The
   window came out at 62 days, so a missed daily run was invisible.
2. **Comment-swallowing parser.** Fixing the first, `schedule: daily  # note`
   parsed the comment into the value, so the lookup missed and it silently fell
   back to the monthly default. The fix for the bug reintroduced the bug.

The tool built to detect silent failure failed silently. That is not irony, it
is the thing itself: **monitoring is code, and code written to check something
else is never tested by the thing it monitors.**

## Why this was catchable and wasn't

`i-2026-0731-flagged-not-fenced` — written the day before — says a mechanism
that labels a problem without changing behaviour is decoration.

Same shape here. A `verify` contract existed. `run-audit` existed. Neither was
ever *run against a real failure*, so both were untested assumptions wearing the
appearance of safeguards.

**A safeguard that has never fired is a hypothesis.**

## Fixes

- All four routine prompts now begin with an explicit fetch + checkout, and
  **stop and report** if `CLAUDE.md` is absent rather than proceeding quietly
- Every routine's verify contract now requires a committed trace *even when the
  answer is "nothing happened"* — the distinction between a quiet night and a
  crashed run must be visible in the repository
- `schedule:` separated from `review.cadence`
- Silence window tightened to 1.5× cadence, so one missed daily run flags
- Frontmatter parser strips YAML comments
- The weekly evolution prompt now explicitly checks whether each daily routine
  left a trace yesterday

## The lesson worth keeping

Test a monitor by breaking the thing it monitors. Until then it is decoration
with a plausible interface — and the more elaborate it looks, the more
confidently it will be trusted.
