#!/usr/bin/env node
/**
 * context-pack — compile a graph neighbourhood into a pasteable block.
 *
 * A second brain locked inside one vendor is a second brain with an expiry
 * date. This is the escape hatch: it turns any region of memory into plain
 * text that any model — today's, or one that doesn't exist yet — can read.
 *
 * Traversal rather than search. The answer is frequently not in the node that
 * matched but adjacent to it: the decision that caused the thing, the outcome
 * that contradicted the belief. Matching alone misses that; following edges
 * does not.
 *
 * Usage:
 *   node scripts/context-pack.mjs "taste"
 *   node scripts/context-pack.mjs "architecture" --hops 3
 *   node scripts/context-pack.mjs --self          # the standing profile pack
 *   node scripts/context-pack.mjs "x" --full      # full bodies, not summaries
 */

import { load, traverse, search, summarise, MEM } from './lib/graph.mjs';
import { relative } from 'node:path';

const argv = process.argv.slice(2);
const has = (f) => argv.includes(`--${f}`);
const val = (f, d) => { const i = argv.indexOf(`--${f}`); return i === -1 ? d : argv[i + 1]; };

const HOPS = Number(val('hops', 2));
const FULL = has('full');
const SELF = has('self');
const query = argv.filter(a => !a.startsWith('--') && a !== String(HOPS))[0] ?? '';

if (!query && !SELF) {
  console.error('usage: context-pack.mjs "<query>" [--hops N] [--full] [--self]');
  process.exit(1);
}

const { nodes, byId } = load();

const PROFILE = ['n-self-aaryaman', 'n-self-mastery', 'n-self-state', 'n-taste-profile'];
const seeds = SELF
  ? nodes.filter(n => PROFILE.includes(n.id))
  : search(nodes, query);

if (!seeds.length) {
  console.error(`No nodes match "${query}". The graph has ${nodes.length} node(s).`);
  process.exit(1);
}

const region = traverse(nodes, byId, seeds, HOPS);

const out = [];
out.push(`# Context pack — ${SELF ? 'profile' : query}`);
out.push('');
out.push(`Compiled from a personal knowledge graph on ${new Date().toISOString().slice(0, 10)}.`);
out.push(`${region.length} node(s), ${HOPS} hop(s) from ${seeds.length} match(es).`);
out.push('');
out.push('Confidence levels are stated per node and should be respected — items');
out.push('marked `unverified` or `low` are hypotheses, not facts. Anything marked');
out.push('`?` is an open question, not an answer.');
out.push('');
out.push('---');

for (const { node: n, distance } of region) {
  out.push('');
  out.push(`## ${n.title ?? n.id}`);
  const meta = [
    n.type && `type: ${n.type}${n.subtype ? `/${n.subtype}` : ''}`,
    n.confidence && `confidence: ${n.confidence}`,
    n.review && `review: ${n.review}`,
    `distance: ${distance}`,
  ].filter(Boolean);
  out.push(`*${meta.join(' · ')}*`);
  out.push('');
  out.push(FULL ? n.body : summarise(n.body));

  const known = n.edges.filter(e => byId.has(e.to));
  if (known.length) {
    out.push('');
    out.push('Connected to: ' +
      known.map(e => `${e.rel} → *${byId.get(e.to).title ?? e.to}*`).join(' · '));
  }
}

out.push('');
out.push('---');
out.push('');
out.push('_Portable export. Source of truth is the graph, not this snapshot._');

console.log(out.join('\n'));
console.error(`\n[${region.length} nodes, ${relative(process.cwd(), MEM)}]`);
