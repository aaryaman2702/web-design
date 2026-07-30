---
description: Pull context from other models, agents, and tools into the graph
---

# /ingest $ARGUMENTS

Brings outside context in. Read `modules/ingest/MODULE.md` before running.

`context-pack` and `council` move memory **out**. This is the only thing that
brings anything **back** — without it the graph is a record of one harness, not
a unified memory.

## Usage

Point it at a file, paste content directly, or name a conversation to distill.

## The rule that matters

**Do not import raw history.** Transcripts are almost entirely filler —
restated context, abandoned threads, things that turned out wrong. A graph
diluted with transcript sediment makes every future traversal worse, and the
damage is permanent because nobody goes back and prunes.

The test for each candidate: **would this still be worth knowing in six
months?**

Almost nothing passes. That ratio is correct, not a sign the source was bad.

## Procedure

1. Read the whole source
2. Extract only what survives the six-month test
3. Classify — episode, insight, taste, decision, or open question
4. **Attribute honestly** — `source: external`, named. Context from another
   model is testimony, not observation, and carries that model's errors
5. **Confidence low by default** — `medium` at best for anything not directly
   observed
6. **Connect it** — an imported node with no edges is an orphan and orphans do
   not compound. Check `graph-report.mjs` afterwards
7. **Look for contradictions** — external context disagreeing with an existing
   belief is the most valuable possible import. Write the edge
8. **Never import secrets** — external sources are where they leak in, because
   nobody wrote them intending them to be filed

## After a council

The main use. When you paste ChatGPT and Gemini responses back into the saved
council file, `/ingest` distills them.

**The disagreement is the payload.** Where the models split is the finding worth
keeping — where they agree, you have mostly learned the question was easy.
