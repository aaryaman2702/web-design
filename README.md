# JARVIS

A cognitive architecture for Aaryaman. Not an assistant that answers prompts —
a system that remembers, reflects, connects, challenges, and gets better at
being useful every week it runs.

**The standing objective:** increase the quality of his thinking, decisions, and
output over years. Finishing the task is the floor, not the goal.

---

## The design principle

Five layers, ordered by how fast they change. **The inner three may not name a
tool, vendor, or project.**

```
core/          identity + cognition     changes yearly
engines/       always-on thinking       changes rarely
modules/       capabilities             install and remove freely
adapters/      tool bindings            swap freely  ← only layer naming vendors
memory/        the graph                grows forever
```

Everything follows from that ordering. A module declares `requires:
[media.video]` — never a vendor name. `adapters/registry.yaml` maps the
capability to whatever tool provides it today. When the tool changes, one line
changes and every module keeps working.

This is not theoretical. Every connected service in this repository disconnected
and reappeared under different identifiers **during the session that built it**.
Tool names are unstable on a timescale of hours; this system is meant to last a
decade.

---

## Start here

```
core/constitution.md    the invariants — 14 principles, each with a test
core/mission.md         who he's becoming — the filter everything passes
core/cognition.md       how it thinks — depth, passes, creativity, adversary
core/contracts.md       how to extend it without breaking it
core/memory-model.md    the knowledge graph schema
```

`CLAUDE.md` is the boot loader and reads these in order.

---

## The engines

Always on. Not invoked — they are how the system thinks.

| Engine | Function |
|---|---|
| **reflection** | Turns what happened into what is known |
| **taste** | Learns his aesthetic from choices, not from asking |
| **decision** | Journals choices with expectations, then grades them |
| **idea** | Forces connections between distant parts of the graph |
| **opportunity** | Scans for leverage, leaks, openings, asymmetry |
| **curiosity** | Speaks unprompted when there is real signal |
| **evolution** | Improves the system itself, weekly |

Two are worth singling out because almost nobody builds them.

**Taste** stores the *reason*, never the instance. "He liked that serif" is
worthless; "he reaches for editorial serifs when the subject is a person" is
predictive. It also **predicts his reaction before showing him work** — a wrong
prediction is the highest-value signal available, because it locates a specific
wrong belief.

**Decision** requires a falsifiable expectation written *before* the outcome is
known. Memory of one's own past decisions is systematically flattering; this is
the correction. After ~10 entries it starts producing calibration — "your
timeline estimates run 2.3× optimistic when you're excited" — which is not
available any other way.

---

## Commands

| Command | Does |
|---|---|
| `/think <x>` | Full cognition pass — diverge, critique, adversary, synthesise |
| `/brief` | Morning: state, one opportunity, one thing worth thinking about |
| `/capture` | Close the loop — reflect and write to the graph |
| `/decide <x>` | Journal a decision with a falsifiable expectation |
| `/challenge <x>` | Adversary protocol against a claim |
| `/connect` | Force connections between distant graph regions |
| `/recall <x>` | Traverse the graph, not just search it |
| `/evolve` | Weekly — what should change about this system |
| `/install <x>` | Scaffold a contract-compliant module |

---

## Scripts

```bash
node scripts/doctor.mjs              # verify the architecture still holds
node scripts/context-pack.mjs "x"    # export a graph region for any other model
node scripts/context-pack.mjs --self # the standing profile pack
```

**doctor** enforces layer purity — it fails the build if a vendor name appears
above the adapter layer. It caught three violations in the files that *define*
the rule, on its first run. That is the point of having it.

**context-pack** is the anti-lock-in mechanism. Memory only one vendor can read
is memory with an expiry date.

---

## Extending it

```bash
cp -r modules/_template modules/<name>
# fill frontmatter: provides, requires (capabilities only), engines, review
node scripts/doctor.mjs
```

If adding a capability requires editing `core/` or `engines/`, **stop** — either
the module is wrong or the contract is. Working around the contract once is how
layered architectures quietly become monoliths.

Build modules from **observed repetition**, not anticipation. Anything done by
hand three times is a module; anything done zero times is a guess.

---

## Current state

Architecture complete, graph nearly empty. That is the expected starting
position and the honest one.

The engines are instruments, and instruments need readings. Taste has three
judgments. Decisions has one. Mastery levels all carry `?`. **The bottleneck is
data about him, not capability** — and no amount of further architecture fixes
that.

Highest-value next actions, in order:

1. Answer the open questions in `memory/self/profile.md` — they are the
   highest-value gaps in the graph
2. Feed the taste engine ten real judgments — work he loves, work he can't
   stand, and *why*
3. Log decisions as they happen — judgment is unmeasurable until ~10 exist
4. Run it on real work; reflection and evolution learn only from friction

---

## The failure mode to watch

A system this elaborate that goes unused is worth less than a crude one that
runs daily — and the elaborateness makes that failure harder to admit.

`memory/graph/entities/n-jarvis-core.md` records what would prove this worked
and what would prove it failed, written *before* the outcome was known, so it
can be graded honestly rather than rationalised later.
