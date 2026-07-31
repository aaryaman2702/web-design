---
id: e-2026-0731-01
type: episode
title: The profile was wrong at its centre, and he had to say so twice
created: 2026-07-31
confidence: high
source: observed
edges:
  - {rel: led_to, to: i-2026-0731-look-before-asking}
  - {rel: led_to, to: i-2026-0731-flagged-not-fenced}
  - {rel: evidence_for, to: n-self-aaryaman}
  - {rel: contradicts, to: n-jarvis-core}
---

# The profile was wrong at its centre

## What happened

The system believed Aaryaman was a student in a board-exam year. He is a
**working professional** — *Trainee, Sales Operation* at Reckon Diagnostics
since 1 July 2026, in an office five days a week, producing business
deliverables and building HTML presentations for real stakeholders.

Alongside that he runs a creative practice: a brand website iterated across
months, a site in progress this week using generated video, a steady exchange of
builds with a peer.

None of this was in the graph. The graph had a guess in its place.

## Where the error came from

A `Tenth grade A` Google Classroom calendar in his account, seen during the
first session. From that single artifact the system inferred: student → tenth
grade in India → board-exam year → weekday time committed to exams → prioritise
accordingly.

Four inferential steps from one ambiguous signal.

## The part that actually matters

**The claim was correctly marked `?` and `medium` confidence — and then reasoned
from as though it were established.** It went into `core/mission.md` as standing
context. It shaped prioritisation advice. It became one of the five questions
put to him.

Constitution VI says unknowns become questions and get marked `?`. That was
done. It was not enough, because **nothing enforced the marking.** A flag that
does not fence off the flagged claim is decoration.

## The second failure

Having built the wrong model, the system then **asked him to correct it** —
nine questions, several answerable from artifacts it already had access to.

His response: *"use your memory and see what I do."*

He was right. Fifteen minutes of reading Drive and sent mail produced a truer
picture than every inference before it. The evidence was always reachable. It
was never read, because asking was easier.

Two corrections were required. The first — *don't couple this to my current
tools* — was accepted and acted on. This one had to be given twice, because the
first framing of it was heard as a fact to fix rather than a method to change.

## What was found once it looked

| Assumed | Actual |
|---|---|
| Student, board-exam year | Employed since 1 July, in-office |
| Client work hypothetical | Named brand site, live project this week, collaborators |
| Business = weakest domain, no access | Inside a commercial org five days a week |
| Time abundant, capital scarce | Time is the scarce resource |
| Craft evidence unavailable | Months of versioned design decisions in Drive |

The business-domain inversion is the sharpest one. `n-goal-business` recorded
business as his weakest domain with the largest headroom and no obvious route
in. He has been inside the loop the whole time — sales operations, partnerships,
stakeholder deliverables. It is simply not being **captured**, so the learning
happens and evaporates.

## Also resolved

The first dream found the graph was entirely about itself and gave itself until
day two. This closes it — for the first time the graph holds an employer, live
projects, and collaborators that exist independently of this system.

It took him telling the system to go look. That is not the system working.
