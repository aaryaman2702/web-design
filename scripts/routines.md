# Scheduled routines

Three automations, IST-timed. **Specified but not yet armed** — creating them
requires an approval that has not been granted.

Cron is evaluated in **UTC**. IST is UTC+5:30, so every time below is the IST
target minus 5:30. None of the three cross midnight, so no day-field shifting is
needed — but check that if you change the times.

| Routine | IST | UTC cron | Session |
|---|---|---|---|
| Evening capture | 21:30 daily | `0 16 * * *` | fresh |
| **Dream** | 02:00 daily | `30 20 * * *` | fresh |
| Morning brief | 07:00 daily | `30 1 * * *` | fresh |
| Weekly evolution | Sun 10:00 | `30 4 * * 0` | fresh |

The daily three form a cycle: capture at night writes what happened, the dream
works on it while he sleeps, the brief surfaces anything worth waking up to.
Each depends on the one before, so the ordering matters more than the exact
times.

**Note the dream's cron crosses midnight.** 02:00 IST is 20:30 UTC the
*previous* day — the one case here where the UTC date shifts. Getting this
wrong schedules it 24 hours off in a way that looks correct.

Each fires into a **fresh session**, so every prompt is written as a complete
standalone instruction. `CLAUDE.md` loads at session start and supplies the rest
of the context.

---

## Before arming: check the runtime

Scheduled runs execute unattended and need an active plan on whatever runtime
they fire into. Verify that before relying on them — an automation that silently
stops running is worse than one that was never created, because you stop
checking manually while believing it is handled.

---

## 1. Morning brief — 07:00 IST

Runs `.claude/commands/brief.md`. Opportunity engine plus curiosity engine over
the graph, filtered through the mission.

**The discipline that must survive into the prompt:** at most three items,
usually fewer, and "nothing today" is a valid and expected output. The failure
mode is padding — a brief that is the same length every day is a brief nobody
reads by week three.

Push notification on, since a brief nobody sees at 7am is pointless.

## 2. Evening capture — 21:30 IST

Runs `.claude/commands/capture.md` via the reflection engine.

**Design note worth keeping:** a fresh session was not present for the day's
work. The prompt explicitly forbids inventing what happened — fabricating an
episode corrupts the ground truth every downstream belief derives from. It
reconstructs from artifacts (`git log --since=midnight`, changed files under
`memory/`) and then *asks* the questions artifacts cannot answer.

Your answers are the real input. The reconstruction is scaffolding for asking
better questions.

No notification — this one is a prompt to reflect, not a report to read.

## 3. Weekly evolution — Sunday 10:00 IST

Runs `.claude/commands/evolve.md`. The seven questions, each ending in a file
edit. Runs `doctor.mjs`. Checks whether the curiosity hit rate is holding and
whether taste prediction accuracy is rising.

**Bounds enforced in the prompt:** may edit engines and modules; may **not**
autonomously edit `core/constitution.md` or `core/mission.md`. It proposes
identity changes with evidence and you decide. A system able to rewrite its own
values will eventually rewrite them toward whatever is easiest to satisfy.

The prompt also instructs it to state plainly when the system saw little use
that week. Low usage is the most important failure signal this architecture has
and it should never be softened.

Push notification on.

---

## Arming them

Ask for the routines to be created and approve the permission prompt. The full
prompt text for each is in the session that built this; regenerating it from the
descriptions above produces an equivalent result.

To adjust later: change the cron, keep the prompt. A bad schedule does not need
the routine deleted and recreated — updating in place preserves its run history.

---

## 4. Dream — 02:00 IST

Runs `.claude/commands/dream.md` via `modules/dream/`. The only process that
does deep work nobody asked for.

Starts from `node scripts/graph-report.mjs --json` — contradictions, bridge
candidates, orphans, stale beliefs — because an unanchored dream produces vague
output reliably.

**The discipline that must survive into the prompt:** one or two findings,
each non-obvious, evidenced by node id, actionable, and mission-relevant.
**Nothing is a valid output.** The pull toward summarising is strong precisely
because summarising always produces something — and a dream that files filler
nightly gets skimmed within a month, taking the real findings with it.

Skip entirely if the graph has not changed since the last run.

No notification — findings are picked up by the 07:00 brief. Waking someone at
2am to read an insight would defeat the point.
