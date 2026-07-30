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

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const MEM = join(ROOT, 'memory');

const argv = process.argv.slice(2);
const flag = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i === -1 ? d : (argv[i + 1] ?? true);
};
const HOPS = Number(flag('hops', 2));
const FULL = argv.includes('--full');
const SELF = argv.includes('--self');
const query = argv.filter((a) => !a.startsWith('--') && a !== String(HOPS))[0] ?? '';

if (!query && !SELF) {
  console.error('usage: context-pack.mjs "<query>" [--hops N] [--full] [--self]');
  process.exit(1);
}

/* ------------------------------------------------------------------ load */

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.')) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (extname(p) === '.md') out.push(p);
  }
  return out;
}

function parse(file) {
  const text = readFileSync(file, 'utf8');
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return null;

  const fm = {};
  const edges = [];
  let inEdges = false;

  for (const raw of m[1].split(/\r?\n/)) {
    const line = raw.replace(/\s+$/, '');
    if (!line.trim()) continue;
    if (/^edges:\s*$/.test(line)) { inEdges = true; continue; }
    if (inEdges) {
      if (/^\s*-\s*\{/.test(line)) {
        const r = line.match(/rel:\s*([\w-]+)/);
        const t = line.match(/to:\s*([^,}\s]+)/);
        if (r && t) edges.push({ rel: r[1], to: t[1] });
        continue;
      }
      if (/^\S/.test(line)) inEdges = false; else continue;
    }
    const kv = line.match(/^([\w-]+):\s*(.*)$/);
    if (kv) fm[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, '');
  }

  if (!fm.id) return null;
  return { ...fm, edges, body: m[2].trim(), file };
}

const nodes = walk(MEM).map(parse).filter(Boolean);
const byId = new Map(nodes.map((n) => [n.id, n]));

/* -------------------------------------------------------------- traverse */

function seed() {
  if (SELF) {
    return nodes.filter((n) =>
      ['n-self-aaryaman', 'n-self-mastery', 'n-self-state', 'n-taste-profile'].includes(n.id));
  }
  const q = query.toLowerCase();
  return nodes.filter((n) =>
    (n.title ?? '').toLowerCase().includes(q) ||
    (n.tags ?? '').toLowerCase().includes(q) ||
    n.body.toLowerCase().includes(q));
}

const start = seed();
if (!start.length) {
  console.error(`No nodes match "${query}". The graph has ${nodes.length} node(s).`);
  process.exit(1);
}

// Breadth-first over typed edges, both directions — an edge pointing *at* a
// node is as informative as one pointing away from it.
const inbound = new Map();
for (const n of nodes) {
  for (const e of n.edges) {
    if (!inbound.has(e.to)) inbound.set(e.to, []);
    inbound.get(e.to).push({ rel: e.rel, from: n.id });
  }
}

const depth = new Map(start.map((n) => [n.id, 0]));
let frontier = start.map((n) => n.id);

for (let hop = 1; hop <= HOPS; hop++) {
  const next = [];
  for (const id of frontier) {
    const node = byId.get(id);
    const neighbours = [
      ...(node?.edges ?? []).map((e) => e.to),
      ...(inbound.get(id) ?? []).map((e) => e.from),
    ];
    for (const nb of neighbours) {
      if (!byId.has(nb) || depth.has(nb)) continue;
      depth.set(nb, hop);
      next.push(nb);
    }
  }
  frontier = next;
  if (!frontier.length) break;
}

const included = [...depth.keys()].map((id) => byId.get(id))
  .sort((a, b) => depth.get(a.id) - depth.get(b.id));

/* ----------------------------------------------------------------- emit */

const summarise = (body) => {
  const prose = body.split(/\r?\n/)
    .filter((l) => l.trim() && !l.startsWith('#') && !l.startsWith('|') && !l.startsWith('---'))
    .join(' ');
  return prose.length > 400 ? prose.slice(0, 400).trim() + '…' : prose;
};

const out = [];
out.push(`# Context pack — ${SELF ? 'profile' : query}`);
out.push('');
out.push(`Compiled from a personal knowledge graph on ${new Date().toISOString().slice(0, 10)}.`);
out.push(`${included.length} node(s), ${HOPS} hop(s) from ${start.length} match(es).`);
out.push('');
out.push('Confidence levels are stated per node and should be respected — items');
out.push('marked `unverified` or `low` are hypotheses, not facts. Anything marked');
out.push('`?` is an open question, not an answer.');
out.push('');
out.push('---');

for (const n of included) {
  out.push('');
  out.push(`## ${n.title ?? n.id}`);
  const meta = [
    n.type && `type: ${n.type}${n.subtype ? `/${n.subtype}` : ''}`,
    n.confidence && `confidence: ${n.confidence}`,
    n.review && `review: ${n.review}`,
    `distance: ${depth.get(n.id)}`,
  ].filter(Boolean);
  out.push(`*${meta.join(' · ')}*`);
  out.push('');
  out.push(FULL ? n.body : summarise(n.body));

  if (n.edges.length) {
    const known = n.edges.filter((e) => byId.has(e.to));
    if (known.length) {
      out.push('');
      out.push('Connected to: ' +
        known.map((e) => `${e.rel} → *${byId.get(e.to).title ?? e.to}*`).join(' · '));
    }
  }
}

out.push('');
out.push('---');
out.push('');
out.push('_Portable export. Source of truth is the graph, not this snapshot._');

console.log(out.join('\n'));
console.error(`\n[${included.length} nodes, ${relative(process.cwd(), MEM)}]`);
