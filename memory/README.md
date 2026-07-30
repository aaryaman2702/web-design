# Memory

The second brain. Plain Markdown, typed frontmatter, typed edges — readable by
any tool, any model, any decade. Schema lives in `core/memory-model.md`.

This file is the map. Read it before traversing; it exists so the graph can be
navigated without scanning it.

---

## Layout

```
memory/
├── self/            The model of Aaryaman
│   ├── profile.md       Who he is. Confidence-rated. Correct it aggressively.
│   ├── mastery.md       Four domains, evidence-gated levels
│   └── state.md         What's live right now (overwritten, not appended)
│
├── graph/           Entities and their relations
│   ├── entities/        People, projects, concepts, artifacts, ideas
│   └── relations/       Cross-cutting edge collections
│
├── episodes/        What happened. Append-only, immutable.
│   ├── sessions/        Working sessions
│   ├── runs/            Module executions
│   ├── observations/    Curiosity engine output + tool drift
│   └── evolution/       Weekly system-change log
│
├── semantic/        What is true. Distilled, revisable, decays.
│   └── questions/       Open loops worth returning to
│
├── decisions/       The journal + calibration record
│
└── taste/           Aesthetic judgments and their reasoning
    ├── profile.md       Distilled taste model
    └── calibration.md   Prediction accuracy over time
```

---

## The three systems

**Episodic** (`episodes/`) — what happened. Immutable. Never edited after the
fact; a correction is a new node that `supersedes` the old one. This is the
ground truth everything else derives from, and its value depends entirely on
being trustworthy.

**Semantic** (`semantic/`, `self/`, `taste/`) — what is true. Distilled from
episodes, always with `learned_from` edges back to the evidence. Carries
confidence and review dates. A semantic node without provenance is a rumour.

**Procedural** (`engines/`, `modules/`) — how to do things. Lives outside this
directory but is memory too — the kind that executes.

---

## Traversal

Start from the question, not the folder.

| Question | Entry point |
|---|---|
| What do I know about X? | `graph/entities/` → follow edges |
| Why did I do X? | `decisions/` → the reasoning is in `because` |
| Was I right? | `decisions/calibration.md` |
| What does he like? | `taste/profile.md` → individual judgments |
| What happened on X? | `episodes/` by date |
| What's contradictory? | `contradicts` edges — highest-value signal in the graph |
| What's stale? | Any node past its `review` date |

---

## Rules

1. Ids permanent, titles free
2. Episodes immutable — correct with `supersedes`, never edit
3. Every insight carries `learned_from` provenance
4. Reciprocal edges when the relation matters in both directions
5. Generalise before storing — the instance expires, the reason compounds
6. **No secrets.** No credentials, tokens, keys, account numbers, or sensitive
   personal data about third parties. The graph is meant to travel between
   tools; that is only safe if it is clean by construction.

---

## Portability

`node scripts/context-pack.mjs <query>` compiles a graph neighbourhood into a
pasteable block for any other model — ChatGPT, Gemini, a local model, whatever
exists in 2031.

Memory that only one vendor can read is memory with an expiry date. This is the
mechanism that prevents that.
