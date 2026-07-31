---
id: i-2026-0730-validate-generated
type: insight
title: Generated artifacts need mechanical validation because the author's eye reads intent, not syntax
created: 2026-07-30
confidence: medium
source: observed
review: 2027-01-30
tags: [engineering, quality, generative]
edges:
  - {rel: learned_from, to: e-2026-0730-03}
  - {rel: informs, to: n-goal-ai-engineering}
---

# Validate generated output mechanically; the author's eye reads intent

A stray bracket in a CSS declaration survived both writing and re-reading, then
was caught immediately by a short script checking brace balance and stray
characters.

## Why re-reading fails

Reading back something you just produced does not check it — it *recognises*
it. The eye supplies the intended token where the actual one is malformed, and
the failure is silent: browsers discard invalid declarations without complaint,
so a broken border colour looks like a design decision.

This is sharper for generated output than for hand-written code, because more of
it is produced at once and less of it is read with fresh attention.

## The rule

Every generated artifact gets a mechanical check before it ships. It does not
need to be sophisticated — brace balance, tag balance, no external references,
required ids present. A twenty-line script catches the entire class of error
that careful reading structurally cannot.

## Where it generalises

Any pipeline where a model produces a structured artifact — markup, config,
schemas, data files. The check is cheap and the failure mode is silent, which is
the combination that most justifies automation.

Related and stronger for metered pipelines: validate structure cheaply before
paying for fidelity (`i-ext-draft-tier-validation`).
