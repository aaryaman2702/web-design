---
module: council
version: 1
purpose: Get genuinely independent reasoning from other models, and mine their disagreement.

provides: [reason.panel]
requires: [reason.second_opinion, reason.adversary, doc.store]

engines: [decision, reflection, curiosity]
depth: strategic

memory:
  reads:  [self/profile.md, decisions/**, semantic/**]
  writes: [episodes/observations/council/**, decisions/**]

review:
  metric: Share of panels that surfaced a consideration the primary model missed
  target: Above 30% — below that, the panel is confirming rather than testing
  cadence: monthly
---

# Council

Convenes other models on a question and treats **where they disagree** as the
output.

## Why this exists

A model critiquing its own answer shares its own blind spots. Same training,
same priors, same failure modes — self-critique catches sloppiness but not
systematic error, and systematic error is the expensive kind.

Constitution II requires this system never become an echo chamber. Internal
adversary passes get partway there. Genuine independence needs a mind that was
built differently, and that is the only thing this module provides.

The corollary is what makes it worth running: **agreement between models is weak
evidence; disagreement is strong evidence.** When they converge, you have
learned that the question is easy. When they split, you have found the actual
uncertainty — and that is the thing worth your attention.

## When to use

- Irreversible or expensive decisions, before committing
- A conclusion that feels *too* clean
- Anything where being wrong is discovered late
- Aesthetic or strategic calls where there is no ground truth to check against
- When you notice you want agreement rather than accuracy — that impulse is the
  strongest possible signal to convene the panel

Not for reflex work. The overhead is real and most questions do not warrant it.

## Procedure

**1. Frame the question precisely.** Half of bad reasoning survives by being
vague. Pin it down first — sometimes the question dissolves here, which is the
answer.

**2. Do not contaminate.** For an independent opinion, the other models must not
see the primary answer. Anchoring produces agreement shaped like corroboration,
which is worse than no second opinion because it feels like confirmation.

Use `reason.second_opinion` cold. Reserve `reason.adversary` for attacking a
stated position, where anchoring is the point.

**3. Convene at least two.** One other model is an anecdote. Two that disagree
with each other tells you the question is genuinely open. Two that agree *against*
the primary answer is a strong signal the primary answer is wrong.

**4. Mine the disagreement.** This is the actual work, and the step most likely
to be skipped because it is harder than reading three answers.

For each split: is it a difference in values, in assumed facts, or in reasoning?
Those have different resolutions — a values split is yours to settle, a facts
split is checkable, a reasoning split means someone made an error worth finding.

**5. Synthesise honestly.** Do not average. The mean of three positions is
frequently worse than any of them. Take the strongest spine and state what was
rejected and why.

**6. Record.** Write the panel to `episodes/observations/council/`. If it
resolved a real decision, write that too, and note in the decision whether the
panel changed the conclusion — that is how this module's review metric gets its
data.

## Capability use

Compile the question via `reason.second_opinion`; the zero-setup adapter emits a
self-contained block for any chat interface. Use `reason.adversary` for attack
framing. Publish exports through `doc.store` when a model should read the graph
natively instead of receiving pasted context.

Never name a specific provider here — `adapters/registry.yaml` resolves it, and
the doctor scans this layer for vendor names.

## Failure modes

**Consensus theatre.** Models trained on overlapping data agree for reasons
unrelated to truth. Convergence is not verification. Treat unanimous agreement as
mildly reassuring, never as proof.

**Anchoring.** The most common and most damaging error — showing the second
model the first answer. Guard the uncontaminated default.

**Panel as procrastination.** Convening a council instead of deciding. If a
decision is reversible and cheap, act; the experiment produces better information
than the panel.

**Cost creep.** The API lanes are metered. The paste lane is not, and is the
correct default for anything not running unattended.

## Review

Track the share of panels that surfaced something the primary model missed.
Below 30% and the panel is confirming rather than testing — either the questions
being brought to it are too easy, or the framing is anchoring the responses.
Either way the module needs patching, not more panels.
