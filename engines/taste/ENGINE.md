# Taste Engine

Learns what Aaryaman finds beautiful, and — harder and more useful — *why*.

Almost nobody builds this, which is why almost every AI design output is
competent and forgettable. "Modern, clean, minimal" is what a system produces
when it has no model of anyone's taste. The goal is that a proposal can be
recognised as *his* before his name is on it.

**Fires:** on every craft task before proposing; on every correction; whenever he
reacts to work, his own or anyone's.

---

## Core rule: store the reason, not the instance

An instance expires the moment the project ends. A reason compounds forever.

- ✗ `He liked the serif headline on the kp studios site`
- ✓ `He reaches for editorial serifs when the subject is a person; geometric
  sans when it's a system. The typeface is doing characterisation.`

The second predicts his choice on a project that does not exist yet. That is the
only test that matters.

---

## Dimensions

Taste is not one axis. Record which one a judgment belongs to — he may have
strong, stable taste in motion and none at all in data density, and averaging
those into "his taste" destroys both.

`typography` · `motion` · `colour` · `layout` · `density` · `pacing` ·
`copy` · `concept` · `interaction` · `sound` · `restraint`

---

## Judgment node

```yaml
---
id: t-2026-0730-03
type: taste
dimension: motion
verdict: love                    # love | like | neutral | dislike | reject
subject: Easing on the hero reveal
reason: >
  Motion that decelerates into stillness reads as intentional. He rejects
  linear and bounce — both announce themselves. He wants motion you feel
  and don't notice.
generalises_to: >
  Craft should be invisible. Anything that draws attention to technique
  is a failure of technique.
confidence: medium
source: observed
review: 2027-01-30
edges:
  - {rel: learned_from, to: e-2026-0730-04}
  - {rel: instance_of,  to: t-principle-restraint}
---
```

`generalises_to` is the field that makes this an engine rather than a scrapbook.

---

## The predictive test

What turns taste from a vibes file into a falsifiable model, and the mechanism
that makes it improve rather than drift.

**Before showing him work, predict his reaction.** Commit to it — silently is
fine, but commit.

- **Prediction correct** → the model held. Small confidence bump.
- **Prediction wrong** → *high-value signal.* Something in the model is wrong.
  Do not quietly patch it. Write it up, find which belief failed, and correct
  that belief specifically.

Track the hit rate in `memory/taste/calibration.md`. A rising hit rate means the
system genuinely knows him. A flat one means it is collecting judgments without
learning from them — which looks identical from the inside, and is why the
number is kept.

---

## Stated vs revealed

People are unreliable narrators of their own taste. This is not a flaw in
Aaryaman; it is true of everyone, and it is why asking is a weak method.

Weight evidence accordingly:

| Signal | Weight | Why |
|---|---|---|
| Rejected after initially accepting | **Highest** | He lived with it and it grated. Nearly always the real preference. |
| Chose unprompted between options | High | Revealed, uncontaminated by wanting to be agreeable |
| Corrected specifically | High | Specific corrections carry specific information |
| Praised spontaneously | Medium | Real, but politeness contaminates |
| Stated as a preference | **Low** | Aspirational, or describing last month's taste |

When stated and revealed conflict, trust revealed and write a `contradicts` edge.
The curiosity engine will eventually surface it — *"you say you want slower
pacing, you've chosen faster four times"* — and that observation is worth more
than either data point alone.

---

## Anti-drift

Taste evolves. A profile that never changes is not modelling a person who is
growing.

- Judgments carry `review` dates. Stale ones get re-tested rather than trusted.
- When new evidence contradicts an old judgment, `supersedes` it — never delete.
  The trajectory of his taste is itself informative.
- Watch for taste *maturing* in a direction: rejecting things he used to love is
  a strong signal about where he is headed, and worth telling him about.

---

## Using it

Any module doing craft work must read `memory/taste/profile.md` before
proposing, and should be able to name which judgment justifies a choice.

The bar: **a proposal that cannot cite why it matches his taste is a guess in
confident clothing.** Generic output is not a neutral default — it is evidence
this engine was skipped.
