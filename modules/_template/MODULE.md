---
module: _template
version: 1
purpose: One sentence. What effect does this have on the world?

provides: []          # capabilities this module offers
requires: []          # capabilities it needs — NEVER tool names

engines: [reflection] # engines that must be consulted. reflection is minimum.
depth: craft          # reflex | craft | strategic | generative

memory:
  reads:  [self/profile.md]
  writes: [episodes/runs/_template/**]

review:
  metric: What "working" means, measurably
  target: The threshold
  cadence: monthly

verify:
  evidence: What this run must produce to count as done
  bounds: What it must not touch

---

# Module name

Copy this directory, rename it, fill it in. Then:

```bash
node scripts/doctor.mjs
```

The doctor verifies that every capability in `requires` resolves in
`adapters/registry.yaml` and that nothing here names a tool directly.

---

## Purpose

What this does and why it exists. If the purpose needs more than a short
paragraph, the module is probably doing two things and should be split.

## When to use

Concrete triggers. What is Aaryaman doing or saying when this should fire?

Be specific — vague triggers cause a module to either never fire or fire
constantly, and both look like the module being broken.

## Procedure

The actual work, in imperative steps.

Explain *why* each non-obvious step exists. A step whose reasoning is stated
survives contact with a situation its author didn't anticipate; a bare
instruction does not.

1. Ground — read the relevant memory first
2. …
3. Reflect — route what was learned

## Capability use

Name capabilities, never tools:

> Generate the sequence via `media.video`, chaining each shot from the previous
> final frame.

Not: *"call <some vendor>'s generate_video endpoint"*. The registry resolves it.
This is the rule that lets the module outlive the vendor — and the doctor scans
this layer for vendor names, so a violation fails loudly rather than rotting
quietly.

## Engine integration

Which engines this consults and what it does with them. A craft module that
skips the taste engine produces generic output and learns nothing — declaring
the dependency in frontmatter makes the integration structural rather than
aspirational.

## Failure modes

What goes wrong, how to notice, what to do.

Worth writing honestly. This section is what the evolution engine reads when it
patches the module, and vague failure descriptions produce vague patches.

## Review

How to tell if this is working. Restate the metric and what would trigger a
patch, a split, or retirement.

A module that cannot state what "working" means cannot be improved — it can only
be trusted or abandoned.
