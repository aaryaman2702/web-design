# Opportunity Engine

Asks daily: **what is possible right now that wasn't yesterday, and what is
leaking value while nobody looks?**

Distinct from the idea engine. Ideas are inventions — new combinations.
Opportunities are *already true* and merely unnoticed: an inefficiency, an
opening, a capability gone unused, a window about to close.

**Fires:** daily during `/brief`; on significant world or capability changes.

---

## The four scans

### 1. Leverage
Where would small effort produce disproportionate return?

- Something done manually more than three times → automate it
- A capability he has that is going unused
- Work already done that could be reused, repackaged, or resold
- A relationship or asset sitting idle

The test: *effort-to-outcome ratio far from 1:1.*

### 2. Leak
Where is value draining unnoticed? Leaks are worth more than gains because they
compound negatively and hide well.

- Time going somewhere that does not serve the mission
- Repeated work that should have become a module
- Subscriptions and commitments paid for and unused
- Decisions being remade because the first was never recorded

### 3. Opening
What became possible recently?

- A new capability he acquired — what does it unlock that was blocked?
- A change in the world: technology, market, timing
- A door someone opened: an introduction, an invitation, a request
- A window with an expiry — these get priority, because they close

### 4. Asymmetry
Where is the downside bounded and the upside not?

The highest-value scan, and the one most people never run. Cheap experiments
with unbounded upside should be taken almost automatically; expensive bets with
capped upside should be refused almost automatically. Most people do neither
because they never classify.

---

## Opportunity node

```yaml
---
id: o-2026-0730-01
type: entity
subtype: opportunity
title: Motion work is repeatable enough to productise
created: 2026-07-30
kind: leverage                   # leverage | leak | opening | asymmetry
effort: medium                   # low | medium | high
window: open                     # open | closing:<date> | permanent
asymmetry: favourable
mission_fit: craft, business
status: surfaced                 # surfaced | pursuing | declined | expired
edges:
  - {rel: enables, to: n-goal-business}
---

## What's true
The observation, with evidence.

## Why now
What changed. If nothing changed, this is not an opportunity — it is a
standing option, and standing options are not urgent.

## Smallest move
The cheapest action that converts this from possible to real.

## Cost of ignoring
What happens if this is skipped. Often nothing — say so when true.
```

---

## Mission filter

Every opportunity passes `core/mission.md` before surfacing. Named explicitly:

- Which mastery does it build?
- Does it compound?
- Reversible or not?
- What does it cost that cannot be bought back?

An opportunity that fails the filter is still surfaced — **with the failure
named.** *"This would make money and teach you nothing"* is a legitimate thing to
say, and lets him choose with open eyes instead of drifting into it.

Suppressing off-mission opportunities would make this engine a yes-man for the
mission file, which is its own kind of echo chamber.

---

## Discipline

- **Opportunities are not tasks.** "Reply to that email" is a task. "This client
  keeps asking for the same thing — that's a product" is an opportunity. Never
  let this engine degrade into a to-do list; that is the failure mode that turns
  a thinking partner into a productivity dashboard.
- **Most days have none.** Say so. Manufacturing a daily opportunity to appear
  useful destroys the signal and trains him to skim.
- **Closing windows get priority.** A medium opportunity expiring this week
  outranks a large permanent one.
- **Track declines.** An opportunity declined three times is not an opportunity —
  it is a mismatch with what he actually wants, and *that* is the insight worth
  recording.
