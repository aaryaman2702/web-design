# Idea Engine

Generates rather than waits. The default posture of an assistant is
`user → idea`; this engine inverts it to `system → idea → user`.

The mechanism is combinatorial, not mystical. Most ideas are existing things
connected for the first time, and a typed graph is unusually good at finding
connections a person would not — because people think within domains and the
graph does not care about domain boundaries.

**Fires:** daily; whenever significant nodes are added; on `/connect`.

---

## The core operation: forced distant connection

1. Select two or three nodes from **distant regions** of the graph
2. Force a connection — assume one exists and find it
3. Evaluate honestly; discard most

Distance is the entire trick. Nodes that are already adjacent produce ideas he
has had — "you like motion, make more motion." Nodes four or five hops apart
produce ideas nobody has had, most of which are nonsense, and a few of which are
excellent. The ratio is fine. Nonsense is cheap to discard; the alternative is
generating only the obvious.

**Bias selection toward:**
- Nodes from different mastery domains (craft × business, engineering × judgment)
- Something recent × something old and dormant
- A capability × an unrelated observed frustration
- A taste principle × a domain it has never been applied to

### Worked example

```
[learning AI engineering]  ×  [built immersive web experiences]
                           ×  [noticed food brands buy cinematic storytelling]
                           ↓
"A studio doing AI-generated product storytelling for categories that
 sell on desire rather than spec — where the film IS the product page."
```

None of the three inputs suggests it alone. The connection is the idea. This is
the shape to aim for.

---

## Quality gate

Most generated ideas are bad, which is correct — a generator that only produces
good ideas is not generating, it is retrieving. But bad ideas must not reach him,
or he learns to skim.

Surface an idea only if:

1. **Non-obvious** — he would not have arrived at it in a shower
2. **Specific** — "an AI startup" is not an idea, it is a category
3. **Connected to him** — builds on something he actually has: a capability, a
   position, an unfair advantage. Generic good ideas belong to everyone and
   therefore to no one.
4. **Passes the mission filter** — moves him toward the person he is becoming,
   or is explicitly flagged as a detour so the trade is visible

**Three excellent ideas a month beat thirty adequate ones.** Volume is the enemy
here; it converts a genuine capability into a feed he ignores.

---

## Idea node

```yaml
---
id: x-2026-0730-02
type: entity
subtype: idea
title: AI product storytelling studio for desire-led categories
created: 2026-07-30
status: raw                      # raw | explored | pursuing | parked | killed
novelty: high
edges:
  - {rel: informs, to: n-skill-motion}
  - {rel: informs, to: n-obs-food-brands}
  - {rel: informs, to: n-goal-ai-engineering}
---

## The connection
What was combined, and why the combination is not obvious.

## Why him specifically
The unfair advantage that makes this his rather than anyone's.

## The strongest objection
Adversary pass. If it dies here, it dies — and `status: killed` with the
reason is a genuinely valuable node. Killed ideas stop the same dead end
being re-proposed in six months.

## Smallest test
The cheapest experiment that would produce real information.
```

Killed ideas stay in the graph. The reason they died is knowledge, and it
prevents the engine from rediscovering the same dead end quarterly.

---

## Recombination over time

Ideas that failed on timing rather than merit are worth revisiting — the world
changes, and so do his capabilities. An idea parked in 2026 because he lacked a
skill becomes live the moment the mastery record says he has it.

Periodically re-run parked ideas against current capability. *"This died last
year because you couldn't build the backend. You can now."*

---

## Anti-patterns

- **Trend-chasing.** Ideas derived from what is popular rather than from his
  graph. Those belong to everyone; his advantage is in the intersection nobody
  else occupies.
- **Idea hoarding.** A hundred raw ideas nobody tests is procrastination with
  good branding. Push toward the smallest test.
- **Averaging.** Blending three concepts produces something worse than any of
  them. Commit and let it be fully itself.
