# Reflection Engine

Turns what happened into what is known. Without this, the system accumulates
transcripts and calls it memory — activity logged, nothing learned.

**Fires:** at the end of any craft, strategic, or generative work; on every
correction; when something surprises.

**The discipline:** generalise before storing. An episode that stays specific
teaches nothing beyond itself.

---

## The questions

Asked honestly. Performing reflection is worse than skipping it, because it fills
the graph with noise that later reasoning has to wade through.

1. **What worked?** — specifically enough to repeat deliberately. "It went well"
   is not an answer.
2. **What didn't?** — and was it the approach, the execution, or the framing?
   These have different fixes and confusing them means fixing the wrong thing.
3. **What surprised?** — the highest-value question. Surprise means a model was
   wrong. Route to the curiosity engine.
4. **What should become permanent?** — what will still be true and useful in a
   year?
5. **Did a new principle emerge?** — a rule that generalises past this instance.
6. **Should something change?** — a module, a belief, a playbook, this system.
7. **Is he more capable than before?** — Constitution XIV. When the answer is no,
   record why. The pattern across those answers is where the next upgrade hides.

---

## Generalisation ladder

The single most important operation in this engine. Climb until the statement
would be useful for work not yet imagined — then stop, because one rung too far
produces platitudes that apply everywhere and guide nothing.

```
Observation   "He made the nav smaller on the kp studios site"
     ↓        ...true, but only about one nav
Pattern       "He reduces navigation weight when imagery carries the page"
     ↓        ...now it predicts
Principle     "He treats chrome as debt — every element earns its presence
               or gets cut"
     ↓        ...applies to work that doesn't exist yet
Over-general  "He likes clean design"          ← too far. Predicts nothing.
```

Stop at the highest rung that still *constrains a decision*. If the statement
would not let you rule anything out, you have climbed one rung too many.

---

## Output

Write an episode node, then any insights it produced, edged back to it.

```yaml
---
id: e-2026-0730-04
type: episode
title: Built scroll-film hero, three iterations
created: 2026-07-30
worked: [Chaining shots from a single start-frame kept continuity]
failed: [First concept was the obvious one; wasted a pass before diverging]
surprised: [He rejected the slower pacing he'd previously asked for]
edges:
  - {rel: led_to, to: i-2026-0730-01}
---
```

```yaml
---
id: i-2026-0730-01
type: insight
title: Stated pacing preference is unreliable; observed pacing is not
confidence: medium
source: observed
review: 2026-10-30
edges:
  - {rel: learned_from, to: e-2026-0730-04}
  - {rel: contradicts,  to: t-2026-0715-02}
---
```

That `contradicts` edge is doing real work — it is how the curiosity engine
later notices a stated preference diverging from a revealed one, which is
exactly the kind of thing a person cannot see about themselves.

---

## Routing

| Found | Goes to |
|---|---|
| Aesthetic judgment or correction | taste engine |
| Surprise, or a contradiction | curiosity engine |
| Repeated workflow | evolution engine — candidate module |
| Outcome of a prior decision | decision engine — calibration |
| Durable belief | `memory/semantic/` |

---

## Cost discipline

Reflection scales with what happened. A one-line fix gets one line, or nothing.
A three-hour build gets a real record.

The failure mode to avoid is ritual: reflecting on everything equally produces a
graph where genuine insight is buried under dutiful notes about nothing. Fidelity
to what actually mattered is what keeps this valuable.
