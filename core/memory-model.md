# Memory model — the knowledge graph

Memory is a graph, not a filing cabinet. Folders answer "where did I put it";
graphs answer "what does this have to do with that" — and the second question is
where the value is.

The chain that makes this concrete:

```
idea → website → animation choice → client → conversion lift → marketing lesson
     → informs the next idea
```

No folder structure can express that. Typed edges can, and can be walked
backwards from the lesson to find every decision that produced it.

---

## Node schema

Every file in `memory/` is a node. Markdown body, YAML frontmatter.

```yaml
---
id: n-2026-0730-a1              # stable, never reused, never renamed
type: entity                     # see node types below
title: Human-readable name
created: 2026-07-30
updated: 2026-07-30
confidence: high                 # high | medium | low | unverified
source: observed                 # observed | stated | inferred | external
review: 2027-01-30               # when to re-examine; omit for immutable facts
tags: [motion, craft]
edges:
  - {rel: evidence_for, to: n-2026-0712-c3, note: why this supports it}
  - {rel: contradicts,  to: n-2026-0601-b7}
---
```

`id` is permanent. Titles change, files move, ids do not — otherwise every edge
in the graph rots the first time something gets renamed.

Bodies also use `[[wikilinks]]` for soft association, which any graph-rendering
Markdown editor will visualise natively. Typed `edges` carry meaning and are what
the engines traverse; wikilinks are for humans browsing.

---

## Node types

| Type | Holds | Lives in |
|---|---|---|
| `entity` | Person, organisation, project, product, concept, technology | `graph/entities/` |
| `episode` | Something that happened — session, run, event, conversation | `episodes/` |
| `decision` | A choice: reasoning, alternatives, expectation, outcome | `decisions/` |
| `insight` | A distilled belief about the world or about Aaryaman | `semantic/` |
| `taste` | An aesthetic judgment with its reasoning | `taste/` |
| `artifact` | Something produced — a site, video, doc, system | `graph/entities/` |
| `question` | An open loop worth returning to | `semantic/questions/` |

Distinguishing `episode` from `insight` matters. Episodes are raw and immutable —
they record what happened. Insights are distilled, revisable, and carry
confidence. Collapsing the two produces a system that either forgets what
actually happened or treats every passing observation as a permanent belief.

---

## Edge types

Relations are typed because untyped links cannot be reasoned over. "These two
notes are related" supports no inference; "this caused that" supports a great
deal.

| Relation | Meaning | Used by |
|---|---|---|
| `caused` | Direct causation, evidenced | decision, idea |
| `led_to` | Sequence with plausible influence | idea, reflection |
| `evidence_for` | Supports a belief | reflection, curiosity |
| `evidence_against` | Undermines a belief | curiosity |
| `contradicts` | Direct tension between two nodes | **curiosity** |
| `supersedes` | Replaces an earlier belief | evolution |
| `instance_of` | Specific → general | reflection, taste |
| `part_of` | Composition | all |
| `learned_from` | Provenance | reflection |
| `informs` | Soft influence | idea |
| `blocks` / `enables` | Dependency | opportunity |

`contradicts` earns its keep. Two nodes in tension is the single highest-value
signal in the graph — it is where a belief is wrong, or where something genuinely
interesting is happening. The curiosity engine watches for it specifically.

`supersedes` is how beliefs change without history being destroyed. The old node
stays, marked superseded. Reasoning from a belief that turned out to be wrong is
recoverable only if the wrong belief is still there.

---

## The three memory systems

**Episodic** (`episodes/`) — what happened. Append-only, immutable, timestamped.
Never edited after the fact. This is the ground truth everything else is derived
from, and its value depends entirely on it being trustworthy.

**Semantic** (`semantic/`) — what is true. Distilled, revisable, confidence-rated,
with review dates. Derived from episodes, always with `learned_from` edges back
to the evidence. A semantic node with no provenance is a rumour.

**Procedural** (`modules/`, `engines/`) — how to do things. Improved by the
evolution engine. Skills and workflows are memory too — the kind that executes.

Most systems that call themselves "memory" implement only the middle one, which
is why they cannot explain *why* they believe something and cannot notice when a
belief has gone stale.

---

## Confidence and decay

Every semantic node carries `confidence` and, unless permanently true, a `review`
date.

- `high` — directly observed, repeatedly
- `medium` — observed once, or strongly inferred
- `low` — inferred from indirect signal
- `unverified` — assumed, flagged, not yet reasoned from

**Beliefs decay.** Something true about Aaryaman in 2026 may be false by 2028 —
and a system that cannot forget is as broken as one that cannot remember. Past
its review date, a node is stale: the evolution engine surfaces it, and it is
either re-confirmed, revised, or superseded. Reasoning from stale beliefs is how
a system that "remembers everything" gets steadily worse at understanding the
person it is modelling.

---

## Writing rules

1. **Ids are permanent.** Rename titles freely, never ids.
2. **Episodes are immutable.** Wrong episode → new episode correcting it, edged
   `supersedes`. Never edit the original.
3. **Every insight has provenance.** `learned_from` back to an episode, or it is
   a guess wearing the clothes of knowledge.
4. **Edges go both ways when they matter.** Writing `contradicts` on one node
   means adding the reciprocal, otherwise traversal misses it half the time.
5. **Generalise before storing.** "He wanted the nav smaller" is an episode.
   "He reduces chrome when the content is the point" is an insight. The second
   applies to work not yet imagined; the first applies to one nav.
6. **Never store secrets.** No credentials, tokens, keys, account numbers, or
   sensitive personal data about third parties. The graph is meant to be
   inspectable and shareable across tools — that only stays safe if it is clean
   by construction.

---

## Portability

Nodes are plain Markdown with YAML frontmatter — readable by any tool, any
model, any editor, in any decade. No database, no proprietary format, no vendor.

This is deliberate. A second brain locked inside one product is a second brain
with an expiry date. `scripts/context-pack.mjs` compiles graph neighbourhoods
into a pasteable block for any other model, so memory travels wherever the work
is happening.
