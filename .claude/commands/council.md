---
description: Convene other models on a question and mine where they disagree
---

# /council $ARGUMENTS

Gets genuinely independent reasoning from models that were built differently,
then treats **disagreement as the output**.

Read `modules/council/MODULE.md` before running.

## Why bother

A model critiquing itself shares its own blind spots. Self-critique catches
sloppiness; it does not catch systematic error, and systematic error is the
expensive kind.

**Agreement between models is weak evidence. Disagreement is strong evidence.**
Convergence tells you the question was easy. A split tells you where the real
uncertainty is — which is the thing worth your attention.

## Procedure

1. **Frame precisely.** Vague questions produce vague answers from every model
   simultaneously, which reads misleadingly like consensus.

2. **Compile the pack:**
   ```bash
   node scripts/council.mjs "<question>"              # cold second opinion
   node scripts/council.mjs "<claim>" --adversary     # attack a position
   node scripts/council.mjs "<q>" --critique --answer answer.md
   ```
   Relevant graph context is attached automatically. `--no-context` to omit it.

3. **Do not contaminate.** The default mode deliberately withholds any existing
   answer. Showing the other model what was already concluded produces agreement
   shaped like corroboration — worse than no second opinion, because it feels
   like confirmation.

4. **Ask at least two.** One is an anecdote. Two that disagree with each other
   means the question is genuinely open. Two that agree *against* the original
   answer is a strong signal the original was wrong.

5. **Paste responses back** into the saved file under `## Responses`, labelled
   by model.

6. **Mine the splits.** For each disagreement: values, assumed facts, or
   reasoning? A values split is yours to settle. A facts split is checkable. A
   reasoning split means someone erred and it is worth finding out who.

7. **Synthesise without averaging.** The mean of three positions is often worse
   than any of them. Take the strongest spine, state what was rejected and why.

8. `/capture` to write it into the graph. If it resolved a decision, note
   whether the panel changed the conclusion — that is this module's review
   metric.

## When to reach for it

Irreversible decisions. Conclusions that feel too clean. Anything where being
wrong surfaces late.

And most reliably: **when you notice you want agreement rather than accuracy.**
That impulse is the strongest possible signal to convene the panel.

## When not to

Reflex work. Reversible, cheap decisions where acting produces better
information than deliberating. The overhead is real; most questions do not
warrant it.
