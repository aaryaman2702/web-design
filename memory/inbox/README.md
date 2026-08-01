# Inbox — raw, untrusted, not memory yet

Captures land here in about a second via:

```bash
node scripts/capture.mjs https://example.com/thing
node scripts/capture.mjs "a thought worth keeping"
node scripts/capture.mjs --list
```

Nothing here is memory. These files carry no `id`, so the graph does not see
them and the doctor does not count them.

**They become memory only through `/ingest`**, which applies the six-month test,
classifies, attributes, and connects — and throws most of it away. That ratio is
correct, not a sign the captures were bad.

The split exists because the two jobs have opposite requirements:

| | capture | ingest |
|---|---|---|
| friction | zero | high, deliberately |
| judgment | none | all of it |
| output | raw | connected nodes |

Collapse them and you get the failure `modules/ingest` exists to prevent: a graph
diluted with sediment that degrades every future traversal and that nobody ever
goes back to prune.
