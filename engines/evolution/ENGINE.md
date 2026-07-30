# Evolution Engine

The engine that improves the system itself. Everything else makes JARVIS useful;
this one makes it *better than it was last week*.

The question is not "what happened?" — that is a summary, and summaries change
nothing. The question is **"what should change?"**

**Fires:** weekly via `/evolve`; quarterly for a deeper pass on identity.

Without this, the system is exactly as capable in year three as on day one. With
it, capability compounds — which is the entire premise.

---

## Weekly pass

Seven questions, in order. Each ends in an **edit**, not a note. A finding that
does not change a file did not happen.

### 1. What repeated?
Work done more than twice by hand is a module waiting to be written. Repetition
is the clearest signal in the system and the easiest to miss from inside it.

→ Scaffold the module.

### 2. What underperformed?
Every module declares a `review` metric. Which missed?

→ Patch the module, or retire it. A module nobody uses is not neutral — it is
clutter that every future search has to step over.

### 3. What should split?
A module doing three things does all three adequately. Overloading shows up as
vague instructions and inconsistent output.

→ Split along the seam where the purposes diverge.

### 4. Which beliefs went stale?
Semantic nodes past `review`. Re-confirm, revise, or supersede.

→ Never silently keep. Stale confidence is worse than acknowledged ignorance
because nothing flags it.

### 5. What patterns emerged?
Across decisions, corrections, taste judgments, observations — what is true this
week that was not visible last week?

→ Promote to a principle if it holds. This is how the constitution grows.

### 6. What should stop?
The hardest question, and the one with the highest return. Additions are easy;
subtraction is where systems stay usable.

→ Delete it. A module, a habit, a metric nobody reads, a report nobody opens.

### 7. Did the system make him more capable?
Constitution XIV, asked of the whole week rather than one interaction.

→ When the answer is no, that is the most important finding available and
outranks everything above it.

---

## Self-patching

This engine may **edit engines and modules directly.** That is the point — a
system that can only report on itself does not evolve.

Bounded by three rules that keep self-modification safe:

1. **Never edits `core/constitution.md` or `core/mission.md` autonomously.** It
   may *propose* changes with evidence; Aaryaman decides. Identity is not
   self-modifiable, because a system that can rewrite its own values will
   eventually rewrite them toward whatever is easiest to satisfy.
2. **Every self-edit is logged** as an episode with the evidence that motivated
   it. Unexplained drift is indistinguishable from decay.
3. **Every self-edit is reversible.** Git is the safety net. Commit before
   editing.

### The patch loop

```
read run history for the module
        ↓
find the pattern across runs — not a single bad run
        ↓
form a hypothesis about which instruction caused it
        ↓
edit that instruction specifically
        ↓
log the change + prediction of what improves
        ↓
check at the next review whether it did
```

**Patch from patterns, never from single incidents.** One bad run is noise;
editing on noise makes the system worse while feeling productive. Three runs
failing the same way is signal.

The prediction step matters — an edit whose expected effect was never written
down cannot be evaluated, and unevaluated edits accumulate into drift.

---

## Quarterly pass

Deeper, slower, and aimed at the layers the weekly pass may not touch.

- **Mission** — still accurate? People change faster than their stated goals.
  Drift between mission and behaviour means one of them is wrong; decide which.
- **Constitution** — any principle repeatedly overridden? A principle overridden
  five times is either wrong or badly written. Raise it explicitly.
- **Architecture** — has anything violated the layering? Is a tool name leaking
  into the core? Run `node scripts/doctor.mjs`.
- **Graph health** — orphan nodes, dangling edges, regions never traversed. A
  region of memory never read is either badly indexed or genuinely dead.
- **Engine calibration** — is curiosity's hit rate holding? Is taste's prediction
  accuracy rising? A flat prediction rate means taste is collecting without
  learning.

---

## Evolution log

`memory/episodes/evolution/<date>.md` — every pass, what changed, why, and what
was predicted to improve.

Over time this becomes the changelog of a mind: not what the system did, but how
it got better at doing it. When something breaks in year three, this is the file
that explains how it got that way.
