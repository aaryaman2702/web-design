---
module: ingest
version: 1
purpose: Bring context from other agents, models, and tools into the graph so memory is genuinely unified rather than merely exportable.

provides: [memory.ingest]
requires: [doc.read, doc.store]

engines: [reflection, curiosity, taste]
depth: craft

memory:
  reads:  [inbox/**, self/profile.md, semantic/**]
  writes: [episodes/**, semantic/**, taste/**]

review:
  metric: Share of ingested items that became a node still referenced a month later
  target: Above 25% — below that, it is importing noise
  cadence: monthly

verify:
  evidence: Every new node carries source, confidence, and at least one
    edge. An orphan with no provenance means the run failed even if it
    wrote files.
  bounds: Never writes credentials. Never marks external testimony as
    observed.

---

# Ingest

Closes the loop on unified memory. Everything else in this system moves context
**out** — `context-pack` and `council` export the graph to other models.
Nothing brought anything back.

That is half a brain. Work done in another tool stayed there, and the graph
slowly became a record of only what happened inside one harness.

## Why this is harder than it looks

The naive version — import everything, let search sort it out — produces a graph
that is technically complete and practically useless. Raw transcripts are almost
entirely filler: restated context, abandoned threads, things that turned out to
be wrong.

**Importing raw history is the failure mode, not the goal.** A graph diluted
with transcript sediment makes every future traversal worse, and the damage is
permanent because nobody goes back and prunes.

The job is **distillation**, and distillation requires judgment about what
mattered — which is why this is a module with engines attached rather than a
script.

## The capture queue

`memory/inbox/` is where raw captures land, written by
`node scripts/capture.mjs <url|text>` in about a second.

That script is deliberately dumb — it applies no judgment at all. **Friction is
the only thing that actually kills a memory system**, and every capture path
requiring a folder choice and frontmatter died at the moment attention was
elsewhere. So capture is free and thoughtless; this module is where the thinking
happens, and where most of the queue is discarded.

Drain it with `/ingest` and no argument. Delete each file once processed — a
queue that never empties stops being read, and then capture stops happening.

## Sources

Anything holding context this system lacks:

- Conversations with other models — where a real decision or insight happened
- Notes and documents from other tools
- Council responses pasted back after an external panel
- Exports from other agent harnesses
- His own writing anywhere else

Deliberately not restricted to a named tool. Whatever he uses in 2031 fits the
same procedure, which is the point of specifying sources by *kind*.

## Procedure

**1. Read the source through `doc.read`.** Whole thing.

**2. Extract only what survives the test:** would this still be worth knowing in
six months?

Almost nothing in a transcript passes. That is the expected ratio, not a sign
the source was bad.

**3. Classify what remains:**

| Found | Becomes |
|---|---|
| Something that happened | `episode` — immutable, timestamped |
| A durable belief | `insight` — with confidence and review date |
| An aesthetic judgment | `taste` — with the *reason*, never the instance |
| A choice with reasoning | `decision` — expectation reconstructed if stated |
| An unresolved thread | `question` in `semantic/questions/` |

**4. Attribute honestly.** Set `source: external` and name where it came from.
Context from another model is not observation — it is testimony, and it carries
that model's errors. A belief that entered the graph because something *said* it
must be distinguishable from one observed directly, forever.

**5. Set confidence low by default.** `medium` at best for anything not directly
observed. It rises when corroborated.

**6. Connect it.** An imported node with no edges is an orphan, and orphans do
not compound. Find what it relates to and edge it — `graph-report.mjs` lists
orphans specifically so this failure is visible.

**7. Check for contradictions.** New external context disagreeing with an
existing belief is the most valuable possible import. Write the `contradicts`
edge and let the curiosity engine surface it.

**8. Never import secrets.** Credentials, keys, account numbers, sensitive data
about third parties. External sources are where these leak in, because nobody
wrote them intending them to be filed.

## Anti-patterns

**Bulk transcript import.** The whole reason this is a module and not a
one-liner. Volume is the enemy.

**Laundering.** Something a model asserted becoming an unmarked fact in the
graph. Provenance is not optional — this is how a system that "remembers
everything" ends up confidently wrong about things nobody ever verified.

**Duplicate beliefs.** Check whether it is already known before writing. Two
nodes saying the same thing differently is worse than one, because traversal
finds one and misses the other.

## Review

Track how many ingested nodes are still referenced a month later. Below 25% and
the extraction filter is too permissive — tighten step 2. The instinct will be
to import more; that is exactly backwards.
