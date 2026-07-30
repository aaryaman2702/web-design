#!/usr/bin/env node
/**
 * council — compile a question into a self-contained block for another model.
 *
 * The zero-setup lane for reason.second_opinion and reason.adversary. Uses
 * chat subscriptions rather than API credit, and works with any model that
 * exists now or later, including ones with no API.
 *
 * The methodological point this script exists to enforce:
 *
 *   A second opinion is only independent if it is UNCONTAMINATED. Showing the
 *   other model what Claude already concluded anchors it — you get agreement
 *   shaped like independent confirmation, which is worse than no second
 *   opinion because it feels like corroboration.
 *
 * So the default mode deliberately omits any prior answer. --critique is the
 * only mode that includes one, and there the anchoring is the point.
 *
 * Usage:
 *   node scripts/council.mjs "should I productise the motion work?"
 *   node scripts/council.mjs "<claim>" --adversary
 *   node scripts/council.mjs "<claim>" --critique --answer answer.md
 *   node scripts/council.mjs "<q>" --hops 3 --no-context
 */

import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, load, traverse, search, summarise } from './lib/graph.mjs';

const argv = process.argv.slice(2);
const has = (f) => argv.includes(`--${f}`);
const val = (f, d) => { const i = argv.indexOf(`--${f}`); return i === -1 ? d : argv[i + 1]; };

const question = argv.find(a => !a.startsWith('--') && argv[argv.indexOf(a) - 1]?.startsWith('--') !== true);
const HOPS = Number(val('hops', 2));
const MODE = has('adversary') ? 'adversary' : has('critique') ? 'critique' : 'second_opinion';
const NO_CTX = has('no-context');
const ANSWER = val('answer', null);

if (!question) {
  console.error(`usage: council.mjs "<question>" [--adversary|--critique] [--answer FILE]
                    [--hops N] [--no-context]`);
  process.exit(1);
}

/* --------------------------------------------------------------- context */

let contextBlock = '';
if (!NO_CTX) {
  const { nodes, byId } = load();
  const seeds = search(nodes, question);
  if (seeds.length) {
    const region = traverse(nodes, byId, seeds, HOPS);
    contextBlock = [
      '## Background',
      '',
      'Extracted from my personal knowledge graph. Confidence levels are stated',
      'per item and should be respected — anything marked `unverified` or `low`',
      'is a hypothesis, and `?` marks an open question rather than an answer.',
      '',
      ...region.slice(0, 12).flatMap(({ node: n }) => [
        `**${n.title ?? n.id}**${n.confidence ? ` *(confidence: ${n.confidence})*` : ''}`,
        summarise(n.body, 300),
        '',
      ]),
    ].join('\n');
  }
}

/* ----------------------------------------------------------------- modes */

const HEADERS = {
  second_opinion: `# Independent second opinion

I am going to ask you a question that I am also asking another AI model.

**Answer it cold.** Do not ask what the other model said, and do not hedge
toward what you imagine a consensus answer would be. The entire value of asking
you is that you might disagree — an answer engineered to be agreeable is worth
nothing here.

If you think the question itself is wrong or badly framed, say that first. That
is often the most useful possible response.`,

  adversary: `# Adversarial review

Below is a position I am considering. **Your job is to attack it.**

Give me the strongest case against it — the version its smartest opponent would
actually argue, not a strawman erected to be knocked down. Specifically:

1. What would have to be true for this to fail?
2. Is any of that already true?
3. What am I assuming without evidence?
4. What fails late and expensively rather than early and cheaply?

If after honest effort you cannot break it, say so plainly and tell me where you
attacked. "I tried to break this and couldn't, here's where I pushed" is far
more useful than manufactured objections.`,

  critique: `# Critique of an existing answer

Below is a question, my current answer, and the background it was drawn from.

**Find what is wrong with the answer.** I am specifically looking for blind
spots — things a different model would catch that the originating one would not,
because it does not share the same priors.

Be concrete. "This seems reasonable" is useless. Name the specific claim you
doubt and say why.`,
};

/* ----------------------------------------------------------------- emit */

const out = [HEADERS[MODE], ''];

if (contextBlock) out.push(contextBlock, '');

out.push(MODE === 'adversary' ? '## The position' : '## The question', '', question, '');

if (MODE === 'critique') {
  if (!ANSWER || !existsSync(ANSWER)) {
    console.error('--critique requires --answer <file> containing the answer to attack.');
    process.exit(1);
  }
  out.push('## Current answer', '', readFileSync(ANSWER, 'utf8').trim(), '');
}

out.push(
  '---',
  '',
  '## Response format',
  '',
  'Lead with your actual position in one or two sentences, then the reasoning.',
  'State your confidence, and be explicit about what you are uncertain about —',
  'uniform confidence across a whole answer is almost never honest.',
  '',
  'If you need information you do not have, say what it is rather than assuming.',
);

const text = out.join('\n');

const dir = join(ROOT, 'memory/episodes/observations/council');
mkdirSync(dir, { recursive: true });
const slug = question.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40).replace(/-$/, '');
const stamp = new Date().toISOString().slice(0, 10);
const file = join(dir, `${stamp}-${MODE}-${slug}.md`);
writeFileSync(file, text);

console.log(text);
console.error(`
─────────────────────────────────────────────────
Paste the block above into ChatGPT, Gemini, or any
other model. Saved to:
  ${file.replace(ROOT + '/', '')}

When you get responses back, append them to that
file under "## Responses" with the model name, then
run /capture. Disagreement between models is the
signal worth recording — where they agree tells you
much less than where they split.
─────────────────────────────────────────────────`);
