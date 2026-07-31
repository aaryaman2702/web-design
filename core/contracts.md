# Contracts — the extensibility keystone

This file is why new capability feels like installing a module instead of
building another system. It defines the only two interfaces that matter:
**modules** (what JARVIS can do) and **adapters** (what it does it with).

The load-bearing rule:

> **Modules declare capabilities. Adapters bind capabilities to tools.
> The core never learns a tool's name.**

Tools churn on a timescale of months — vendors get acquired, APIs get renamed,
subscriptions lapse, better options appear. This system is meant to outlive all
of that. Indirection here is not architectural ornament; it is the difference
between swapping a line and rewriting a system.

---

## Capability namespace

A capability is a verb the system can perform, named for the *effect* rather than
the provider. Modules require these. Adapters provide them.

```
web.search          web.fetch           web.deploy
media.image         media.video         media.audio         media.3d
doc.read            doc.write           doc.convert
mail.read           mail.draft          mail.send
calendar.read       calendar.write
repo.read           repo.write          repo.review
data.query          data.visualise
schedule.create     schedule.list
```

Extend the namespace when a genuinely new *kind* of effect appears — not when a
new vendor appears. `media.video` covers every video generator that will ever
exist. A new vendor is an adapter, never a capability.

Nothing outside `adapters/` may name a concrete tool. `scripts/doctor.mjs`
enforces this and fails loudly, because this is the rule that quietly erodes
first and takes the architecture with it.

---

## Module contract

A module is a directory under `modules/` containing `MODULE.md` with this
frontmatter, followed by instructions in Markdown.

```yaml
---
module: <kebab-case-name>
version: 1
purpose: One sentence. What effect does this have on the world?

provides: [<capability.verb>]        # what this module can do
requires: [<capability.verb>]        # capabilities needed — NEVER tool names

engines: [taste, reflection]         # engines that MUST be consulted
depth: craft                         # reflex | craft | strategic | generative

memory:
  reads:  [semantic/**, taste/profile.md]
  writes: [episodes/runs/<module>/**]

review:
  metric: <what "working" means, measurably>
  target: <the threshold>
  cadence: monthly

verify:                                # how a single run proves it finished
  evidence: <what the run must produce to count as done>
  bounds: <what it must not touch>
---
```

### Why each field exists

**`requires`** is the whole point. A module that says `requires: [media.video]`
keeps working when the video vendor changes. A module that names a specific
vendor becomes dead weight the day that subscription lapses — and worse, it
fails *silently*, producing plausible instructions to call a tool that no longer
exists.

**`engines`** is what prevents modules from becoming isolated systems. A design
module that does not consult the taste engine produces generic work and learns
nothing. Declaring the dependency makes the integration structural rather than
aspirational.

**`memory`** makes the data flow inspectable. When something goes wrong six
months from now, `reads`/`writes` is how you find which module corrupted a
belief.

**`review`** is the anti-rot mechanism. Every module must be falsifiable. A
module that cannot state what "working" means cannot be evaluated, and the
evolution engine will flag it rather than let it accumulate quietly.

**`verify`** answers a different question from `review`, and the distinction
matters. `review` asks *is this module worth keeping* over months. `verify` asks
*did this particular run actually finish* — right now, checkably.

Without it, "done" is self-reported. A run that produced nothing, or produced
something plausible-looking and wrong, reports success identically to one that
worked. `evidence` names the artifact that settles it — a file that exists, a
check that passes, a number that moved. `bounds` names what the run must not
touch, which is what makes an unattended run safe to leave alone.

This is cheap to write and disproportionately valuable for anything scheduled.
A module that runs at 2am with no verifiable completion criterion is a module
whose failures nobody will notice for weeks.

### Installing

1. Drop the directory into `modules/`
2. Ensure every `requires` capability exists in `adapters/registry.yaml`
3. Run `node scripts/doctor.mjs`

Nothing else. If a module needs core changes to work, the module is wrong —
or the contract is, and the *contract* gets fixed rather than bypassed.

### Removing

Delete the directory. Memory written by it stays; it is history and remains
valid. Dangling graph edges are reported by the doctor, never auto-deleted —
deleting history to make a report clean is how systems lose their memory.

---

## Adapter contract

An adapter binds a capability to a concrete tool. This is the *only* layer that
knows vendors exist.

```yaml
# adapters/registry.yaml   — shape only; real vendor names live in that file
capabilities:
  media.video:
    primary: vendor-a
    fallback: vendor-b
    adapters:
      vendor-a:
        tool: <concrete tool identifier>
        alias: <alternate identifier seen in the wild>
        metered: credits
        notes: Check balance before batch work.
```

### Resolution

1. Module requires `media.video`
2. Registry resolves to the `primary` adapter
3. Primary unavailable → try `fallback`
4. Neither available → **report the missing capability by name**, do not
   improvise

Step 4 matters more than it looks. "I can't do this because `media.video` has no
working adapter" is actionable. Silently substituting something else, or
hallucinating a tool call, corrupts both the output and the memory of what
happened.

### Tool identifiers are unstable

Concrete tool names change without warning — this has already been observed
mid-session, where every connected server reappeared under different
identifiers. Adapters must therefore be treated as *hints that require
verification*, not guarantees.

Before a batch of tool work, confirm the tool resolves. If it does not, search
the live tool list for one providing the same capability, use it, and record the
drift in `memory/episodes/observations/` so the registry gets corrected rather
than the failure repeating.

This is exactly the failure the indirection was built for. One file to fix, and
every module that depends on the capability keeps working.

---

## Engines are not modules

Engines under `engines/` are part of the core intelligence. They are always on,
they may be consulted by any module, and they do not declare `requires` because
they operate on memory rather than on the world.

Modules *do* things. Engines *notice, judge, connect, and learn*. Adding a
capability means writing a module. Adding a new way of thinking means writing an
engine — which is rare, and should stay rare.
