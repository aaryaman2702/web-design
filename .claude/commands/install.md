---
description: Scaffold a new contract-compliant module
---

# /install $ARGUMENTS

Adds a capability. Should feel like installing a module, never like building
another system.

## Before scaffolding — the honest question

**Has this work actually repeated?**

Modules should come from observed repetition, not anticipation. A speculatively
built module is usually wrong about what it needs to do, and it is clutter every
future search steps over.

If it has been done fewer than three times by hand, say so and suggest doing it
by hand once more. That is not obstruction — the friction is what teaches the
module what it should be.

## Procedure

1. `cp -r modules/_template modules/<name>`

2. **Fill the frontmatter.** The load-bearing fields:
   - `provides` / `requires` — **capabilities only, never tool names.** A module
     naming a vendor dies with that vendor, silently.
   - `engines` — which must be consulted. Craft work without the taste engine
     produces generic output and learns nothing.
   - `review` — the metric and target. A module that cannot state what "working"
     means cannot be improved, only trusted or abandoned.

3. **Check capability coverage.** Every `requires` entry must resolve in
   `adapters/registry.yaml`. Missing one? Either add an adapter, or leave it
   `unbound` so the module fails cleanly and names the gap.

4. **Write the procedure**, explaining *why* each non-obvious step exists. A step
   with stated reasoning survives situations its author did not anticipate.

5. **Verify:**
   ```bash
   node scripts/doctor.mjs
   ```

6. **Log** a decision node if this was a real architectural choice.

## Scaffolding from a source

`/install <name> --from <url | path | repo>`

When a capability is defined by someone else's work — an API, a tool, a
protocol, a repository — read the source first and generate the module from it
rather than from memory of how such things usually work.

**From a repo**, read in this order: the README for intent, the entry point for
the real interface, and the tests for the behaviour that is actually guaranteed.
Tests are the most honest documentation a repository has — a README describes
what the author hoped, tests describe what they were willing to defend.

1. Fetch the source through `web.fetch`, or read the local file.
2. **Extract the capability, not the API.** Documentation describes endpoints;
   a module declares an *effect*. `POST /v1/images/generations` is an endpoint;
   `media.image` is the capability. Getting this backwards is how a module ends
   up welded to one vendor's URL shape.
3. Check whether the capability already exists in `adapters/registry.yaml`.
   Usually it does, and the work is adding an adapter rather than a module.
4. Write the procedure from what the docs actually say — auth, rate limits,
   pagination, error shapes, cost. These are the parts that get guessed wrong
   from memory and cause failures weeks later.
5. **Record what the docs did not answer** as `?` in the module. Undocumented
   behaviour is normal, and a module that pretends certainty about it will fail
   confusingly rather than cleanly.

The repetition rule still applies. Reading docs is not evidence of need — if
the work has not been done by hand three times, the module is still
speculative, and speculative modules are the two currently sitting unused.

## When the source is your own past work

Use `/learn` instead. It applies the repetition gate first, and separates what
was invariant across attempts from what changed — a distinction `--from` cannot
make, because a single source shows only one instance.

## The rule

If installing this requires editing `core/` or `engines/`, stop. Either the
module is wrong, or the contract is — and if it is the contract, fix the
contract rather than working around it. Working around it once is how layered
architectures quietly become monoliths.

## Removing

Delete the directory. Memory it wrote stays — that is history and remains valid.
The doctor reports dangling edges; it never auto-deletes them, because deleting
history to make a report clean is how systems lose their memory.
