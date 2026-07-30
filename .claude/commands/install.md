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

## The rule

If installing this requires editing `core/` or `engines/`, stop. Either the
module is wrong, or the contract is — and if it is the contract, fix the
contract rather than working around it. Working around it once is how layered
architectures quietly become monoliths.

## Removing

Delete the directory. Memory it wrote stays — that is history and remains valid.
The doctor reports dangling edges; it never auto-deletes them, because deleting
history to make a report clean is how systems lose their memory.
