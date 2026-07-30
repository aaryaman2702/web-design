#!/usr/bin/env node
/**
 * graph-report — structural analysis of the knowledge graph.
 *
 * Feeds the dream module. A dream that starts from "think about everything"
 * produces vague output; a dream that starts from "these two clusters have no
 * edges between them, and these three nodes contradict each other" produces
 * something specific.
 *
 * Five findings, roughly in order of value:
 *
 *   contradictions   nodes in explicit tension — the sharpest signal available
 *   bridges          distant cluster pairs — where the idea engine should look
 *   orphans          nodes nothing connects to — knowledge that isn't compounding
 *   stale            beliefs past review still being reasoned from
 *   clusters         topical structure, derived rather than declared
 *
 * Usage:
 *   node scripts/graph-report.mjs
 *   node scripts/graph-report.mjs --json      # for programmatic use
 */

import { load } from './lib/graph.mjs';

const JSON_OUT = process.argv.includes('--json');
const { nodes, byId } = load();
const today = new Date().toISOString().slice(0, 10);

/* --------------------------------------------------- adjacency (undirected) */

const adj = new Map(nodes.map(n => [n.id, new Set()]));
for (const n of nodes) {
  for (const e of n.edges) {
    if (!byId.has(e.to)) continue;
    adj.get(n.id).add(e.to);
    adj.get(e.to).add(n.id);
  }
}

/* ------------------------------------------------------------ 1. contradictions */

const contradictions = [];
for (const n of nodes) {
  for (const e of n.edges) {
    if (e.rel !== 'contradicts' || !byId.has(e.to)) continue;
    const key = [n.id, e.to].sort().join('|');
    if (!contradictions.some(c => c.key === key)) {
      contradictions.push({
        key,
        a: { id: n.id, title: n.title },
        b: { id: e.to, title: byId.get(e.to).title },
      });
    }
  }
}

/* ----------------------------------------------------------------- 2. clusters */

// Connected components. Topical structure derived from actual edges rather
// than from tags someone remembered to add — declared taxonomy drifts from
// reality, link structure cannot.
const seen = new Set();
const clusters = [];
for (const n of nodes) {
  if (seen.has(n.id)) continue;
  const members = [];
  const queue = [n.id];
  seen.add(n.id);
  while (queue.length) {
    const id = queue.shift();
    members.push(id);
    for (const nb of adj.get(id) ?? []) {
      if (seen.has(nb)) continue;
      seen.add(nb);
      queue.push(nb);
    }
  }
  clusters.push(members);
}
clusters.sort((a, b) => b.length - a.length);

/* ------------------------------------------------------------------ 3. orphans */

const orphans = nodes
  .filter(n => (adj.get(n.id)?.size ?? 0) === 0)
  .map(n => ({ id: n.id, title: n.title, type: n.type }));

/* -------------------------------------------------------------------- 4. stale */

const stale = nodes
  .filter(n => typeof n.review === 'string' && n.review < today)
  .map(n => ({ id: n.id, title: n.title, review: n.review, confidence: n.confidence }));

/* ------------------------------------------------------------------ 5. bridges */

// Shortest-path distance between every pair, then the FAR ones.
//
// This inverts normal graph analysis. Close pairs are already connected in the
// obvious way — proposing a link between them produces ideas he has had. The
// value is in pairs that are far apart or in separate components entirely:
// that is where a connection would be genuinely new.
function bfs(start) {
  const dist = new Map([[start, 0]]);
  const queue = [start];
  while (queue.length) {
    const id = queue.shift();
    for (const nb of adj.get(id) ?? []) {
      if (dist.has(nb)) continue;
      dist.set(nb, dist.get(id) + 1);
      queue.push(nb);
    }
  }
  return dist;
}

const SUBSTANTIVE = new Set(['entity', 'insight', 'decision', 'taste']);
const candidates = nodes.filter(n => SUBSTANTIVE.has(n.type));
const bridges = [];

for (let i = 0; i < candidates.length; i++) {
  const dist = bfs(candidates[i].id);
  for (let j = i + 1; j < candidates.length; j++) {
    const d = dist.get(candidates[j].id);
    bridges.push({
      a: { id: candidates[i].id, title: candidates[i].title },
      b: { id: candidates[j].id, title: candidates[j].title },
      distance: d === undefined ? Infinity : d,
      disconnected: d === undefined,
    });
  }
}

bridges.sort((x, y) => (y.distance === Infinity ? 1e9 : y.distance) - (x.distance === Infinity ? 1e9 : x.distance));
const topBridges = bridges.filter(b => b.distance >= 3 || b.disconnected).slice(0, 10);

/* ------------------------------------------------------------------- output */

const report = {
  generated: today,
  totals: {
    nodes: nodes.length,
    edges: nodes.reduce((s, n) => s + n.edges.filter(e => byId.has(e.to)).length, 0),
    clusters: clusters.length,
  },
  contradictions,
  clusters: clusters.map(m => m.map(id => ({ id, title: byId.get(id).title }))),
  orphans,
  stale,
  bridges: topBridges,
};

if (JSON_OUT) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

const B = '\x1b[1m', D = '\x1b[2m', Y = '\x1b[33m', C = '\x1b[36m', X = '\x1b[0m';
const p = console.log;

p(`\n${B}Graph report${X} ${D}${today}${X}`);
p(`${D}${report.totals.nodes} nodes · ${report.totals.edges} edges · ${report.totals.clusters} cluster(s)${X}\n`);

p(`${B}Contradictions${X} ${D}(sharpest signal — a belief is wrong, or something interesting is happening)${X}`);
if (!contradictions.length) p(`  ${D}none${X}`);
for (const c of contradictions) p(`  ${Y}⚡${X} ${c.a.title}\n     ${D}vs${X} ${c.b.title}`);

p(`\n${B}Bridge candidates${X} ${D}(far apart — where a new connection would be genuinely new)${X}`);
if (!topBridges.length) p(`  ${D}graph too small or too densely connected${X}`);
for (const b of topBridges.slice(0, 6)) {
  p(`  ${C}↔${X} ${b.a.title}\n     ${b.b.title}  ${D}${b.disconnected ? 'separate components' : `${b.distance} hops`}${X}`);
}

p(`\n${B}Orphans${X} ${D}(connected to nothing — knowledge that isn't compounding)${X}`);
if (!orphans.length) p(`  ${D}none${X}`);
for (const o of orphans) p(`  ${Y}○${X} ${o.title} ${D}(${o.type})${X}`);

p(`\n${B}Stale${X} ${D}(past review, still being reasoned from)${X}`);
if (!stale.length) p(`  ${D}none${X}`);
for (const s of stale) p(`  ${Y}◷${X} ${s.title} ${D}due ${s.review}${X}`);

if (clusters.length > 1) {
  p(`\n${B}Clusters${X} ${D}(derived from links, not declared tags)${X}`);
  clusters.forEach((m, i) => {
    p(`  ${i + 1}. ${D}${m.length} node(s)${X} — ${m.slice(0, 3).map(id => byId.get(id).title).join(', ')}${m.length > 3 ? '…' : ''}`);
  });
  p(`\n  ${D}More than one cluster means regions of knowledge with no path between${X}`);
  p(`  ${D}them. That is either a genuine gap or an unmade connection.${X}`);
}

p('');
