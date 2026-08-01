---
description: Pull context from other models, agents, and tools into the graph
---

# /ingest $ARGUMENTS

Brings outside context in. Read `modules/ingest/MODULE.md` before running.

`context-pack` and `council` move memory **out**. This is the only thing that
brings anything **back** — without it the graph is a record of one harness, not
a unified memory.

## Usage

```bash
node scripts/capture.mjs --list    # what is queued
```

With no argument, **drain the inbox** — `memory/inbox/` holds raw captures
waiting for judgment. Otherwise point it at a file, paste content directly, or
name a conversation.

## The two-stage split, and why it exists

```
capture   zero friction, zero judgment, raw     → memory/inbox/
ingest    full judgment, heavy filter           → the graph
```

Capture is deliberately dumb: stamp it, queue it, get out of the way. Friction
is the only thing that actually kills a memory system — every capture path that
required choosing a folder and writing frontmatter died, not because it was
wrong but because it was slow at the moment attention was elsewhere.

Ingest is where judgment happens, and it is where **most of the queue gets
thrown away.** Collapsing the two stages produces exactly the failure this
module exists to prevent: a graph diluted with sediment that degrades every
future traversal and that nobody goes back to prune.

## Draining the inbox

For each item in `memory/inbox/`:

1. **Links** — fetch through `web.fetch` and read the whole thing. The captured
   URL is a pointer, not the content.
2. **Notes** — read as-is. A one-line note is often a taste judgment or an open
   question in disguise; classify it properly rather than filing it as an
   episode by default.
3. Apply the six-month test, classify, attribute, connect.
4. **Delete the inbox file once processed.** A queue that never empties stops
   being read, and then capture stops happening.

If an item does not survive the test, delete it and say so. Discarding is the
common case and should feel unremarkable.

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
