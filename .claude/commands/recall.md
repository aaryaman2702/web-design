---
description: Traverse the memory graph — not just search it
---

# /recall $ARGUMENTS

Search finds files. Traversal finds understanding. Do the second.

## Procedure

1. **Find entry points.** Match the query against titles, tags, and content.

2. **Traverse edges from there.** This is the part that matters. Follow
   `caused`, `led_to`, `evidence_for`, `contradicts`, `supersedes`,
   `learned_from`. Two or three hops.

   The answer is frequently not in the matching node but adjacent to it — the
   decision that caused the thing, the outcome that contradicted the belief.

3. **Check freshness.** Anything past its `review` date is stale. Say so rather
   than presenting it as current. Stale confidence is worse than acknowledged
   ignorance because nothing flags it.

4. **Surface contradictions.** If nodes in the neighbourhood disagree, lead with
   that — it is more interesting than either alone and usually the real answer.

## Output

- What is known, with confidence levels attached
- **Why** it is believed — cite the provenance
- What contradicts it
- What is stale
- What is *not* known, marked `?`

That last line matters. A recall that quietly omits the gaps produces false
confidence, which is the failure mode that corrupts every downstream decision.

## Portability

For handing memory to another model:

```bash
node scripts/context-pack.mjs "$ARGUMENTS"
```

Compiles the neighbourhood into a pasteable block. Memory only one vendor can
read is memory with an expiry date.
