# Scheduled routines

**Four** automations, IST-timed. **All armed and live as of 2026-07-31.**

| Routine | Trigger id | First fire (UTC) |
|---|---|---|
| Dream | `trig_01StL9APttrjhA5At6TCdzc6` | 2026-07-31 20:32 |
| Morning brief | `trig_013ubk7b2643oUPPEKxAouDx` | 2026-08-01 01:30 |
| Evening capture | `trig_016kaRd3FPjdF9gQUqdLk4UW` | 2026-08-01 16:00 |
| Weekly evolution | `trig_01WjrbRGxvNamJSErzsHwqKc` | 2026-08-02 04:31 |

> **The fired sessions carry no MCP connectors.** No mail, calendar, storage,
> media, or web retrieval — only filesystem, shell, and git. All four routines
> were designed around the graph and git, so all four still work. The one real
> loss is that the brief cannot read his calendar or inbox; it reasons over the
> graph alone. To change that, recreate the routine from the account's routines
> interface, where connector grants are available. See
> `memory/episodes/observations/tool-drift-2026-0731.md`.

Cron is evaluated in **UTC**. IST is UTC+5:30, so every time below is the IST
target minus 5:30. Three of the four stay on the same UTC date; the dream does
not — see the note below.

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

## Managing them

All four are live. To change one, **update it in place** — a bad schedule or a
sharpened prompt does not warrant delete-and-recreate, and updating preserves
the run history, which is the only record of whether the routine works.

Watch for the failure that hides: a routine that silently stops firing looks
exactly like a quiet week. `node scripts/run-audit.mjs` catches it — a module
with no output in twice its cadence gets reported as **silent**. The weekly
evolution pass runs this automatically, which is the point of having built it.

If one needs retiring, retire it. A routine producing filler nobody reads is
worse than no routine, because it trains him to skim — and then the real
findings get skimmed too.

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

---

## Autonomy policy

*"An assistant that needs your permission for every step cannot work while you
are asleep."*

That is the whole reason scheduled runs exist, and it creates a real problem: a
2am run that stops to ask a question has wasted the night. But a 2am run that
does whatever it likes is worse. The resolution is deciding **in advance** which
class each action falls into, rather than at 2am when nobody is awake to judge.

Three tiers. Every action a scheduled run might take belongs to exactly one.

### Proceed — do it, log it, do not ask

Reversible, local, additive. Git is the undo.

- Write memory nodes — episodes, insights, observations
- Commit and push to the working branch
- Read anything already authorised
- Run the doctor, graph report, run audit
- Regenerate derived output like the panel

The test: **if it is wrong, can it be undone with `git revert` and nothing
outside the repository noticed?** If yes, proceed. Asking permission for these
is what makes automation useless.

### Queue — write it down, surface at the next brief

Needs his judgment but not his attention right now. The run continues; the item
waits.

- Proposed changes to the constitution or mission
- A decision that needs *his* expectation written before it counts
- A finding that contradicts something he has stated
- Anything the module's `verify.bounds` forbids it from doing alone

Queuing is the default for anything uncertain. A queued item costs one line in
tomorrow's brief; a wrong autonomous action costs trust.

### Never — not unattended, at any hour

Irreversible, outward-facing, or metered. These wait for him regardless of how
convenient it would be.

- **Sending anything to another person** — email, message, comment. Drafting is
  Proceed; sending is Never. This is why `mail.draft` exists as a capability and
  `mail.send` does not.
- **Publishing** anything externally visible
- **Spending credits** or any metered resource
- **Force-pushing**, rewriting history, deleting memory
- **Anything touching someone else's data**

The asymmetry is the point: the cost of a delayed action is bounded and the cost
of an unrecoverable one is not.

### Why this is written down rather than judged at runtime

A model deciding at 2am whether something is risky will occasionally decide
wrong, and the failure is unwitnessed. Deciding the *classes* in advance, while
awake and unhurried, means the run only has to classify — which is a far easier
judgment than evaluating consequences.

Each module's `verify.bounds` names its specific prohibitions. This policy is
the default underneath them.
