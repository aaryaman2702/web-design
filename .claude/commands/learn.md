---
description: Turn work that just happened into a module — but only if it has actually repeated
---

# /learn $ARGUMENTS

Closes the loop between *doing something* and *never having to figure it out
again*. With no argument, works on what just happened in this session. With one,
works on a named past workflow.

`/install` assumes you already know you want a module. **`/learn` decides
whether you should.**

## The gate comes first, and it usually says no

Before extracting anything, establish how many times this has actually been
done:

```bash
git log --oneline --all | head -40          # has this shape recurred?
node scripts/run-audit.mjs                  # what already runs
ls memory/episodes/sessions/                # what was captured
```

**Fewer than three times → stop and say so.** Suggest doing it by hand once
more. That is not obstruction: the friction of doing it manually is what teaches
the module what it should actually be. A module built after one instance
encodes the accidents of that instance as if they were the rule.

This system already has two modules that were built speculatively and have never
run. Do not add a third.

## The extraction, and the one hard part

If it has genuinely repeated, the craft is separating two things that look
identical in any single instance:

| | |
|---|---|
| **Invariant** — the same every time | becomes the module's procedure |
| **Variable** — different every time | becomes the module's input |

Getting this wrong is the only way to build a bad module, and it fails in both
directions. Too much treated as invariant produces a module that only works on
the case it was born from. Too much treated as variable produces a module that
asks you everything and decides nothing — a form with extra steps.

The test: **describe the work to someone who was not there.** The parts you find
yourself explaining are invariant. The parts you find yourself asking about are
variable.

## Procedure

1. **Reconstruct what actually happened** — from the session, from git, from
   episodes. Not what you meant to do; what you did, including the wrong turns.
2. **Count the repetitions.** Gate above.
3. **Separate invariant from variable.**
4. **Name the capability, not the task.** "Build the Break of Dawn hero" is a
   task. `web.build` composed with `media.video` is a capability. Modules
   declare effects; tasks are instances of effects.
5. **Include the wrong turns as failure modes.** The mistakes made while doing
   it by hand are the most valuable content in the module — they are the only
   part that cannot be reconstructed from the happy path, and they are what
   makes a module better than instructions.
6. **Scaffold it** — `cp -r modules/_template modules/<name>`, fill the
   contract, run `node scripts/doctor.mjs`.
7. **Write `verify` honestly.** What evidence proves a run finished? A module
   that cannot state that is trusted rather than checked.

## What this is not

**Not a transcript-to-instructions converter.** A module that replays what
happened once is worse than no module, because it will be trusted and it will be
wrong on the second case.

**Not a way to feel productive.** Extracting a module feels like progress in a
way that doing the work does not. That feeling is why unused modules accumulate,
and why this command's most common correct output is *"not yet — do it by hand
once more."*

## After

If a module was created, log a decision — it is a consequential, uncertain
choice, and its `review` metric is the falsifiable expectation. If it was not,
record the observation anyway: *"this has now been done twice"* is exactly the
kind of thing the evolution engine wants at its weekly pass, and it is how the
third instance gets noticed rather than missed.
