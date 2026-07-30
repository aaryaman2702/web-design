/**
 * Shared graph access. Used by doctor, context-pack, and council.
 *
 * No dependencies by design. A system meant to run for a decade should not
 * break because a parser package was unpublished, and the schema is small
 * enough that owning it costs less than depending on someone else's.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

export const ROOT = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
export const MEM = join(ROOT, 'memory');

export function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.') || name === 'node_modules') continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (extname(p) === '.md') out.push(p);
  }
  return out;
}

/** Parse YAML frontmatter for exactly the schema in core/memory-model.md. */
export function parse(file) {
  const text = readFileSync(file, 'utf8');
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return null;

  const fm = {};
  const edges = [];
  let inEdges = false;

  for (const raw of m[1].split(/\r?\n/)) {
    const line = raw.replace(/\s+$/, '');
    if (!line.trim() || line.trim().startsWith('#')) continue;

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
    if (kv) {
      let v = kv[2].trim();
      if (v === '>' || v === '|') v = '';
      v = v.replace(/^["']|["']$/g, '');
      if (/^\[.*\]$/.test(v)) v = v.slice(1, -1).split(',').map(s => s.trim()).filter(Boolean);
      fm[kv[1]] = v;
    }
  }

  return { ...fm, edges, body: (m[2] ?? '').trim(), file };
}

export function load() {
  const nodes = walk(MEM).map(parse).filter(n => n && n.id);
  return { nodes, byId: new Map(nodes.map(n => [n.id, n])) };
}

/**
 * Breadth-first over typed edges in BOTH directions.
 *
 * Direction matters less than people expect: an edge pointing *at* a node is
 * as informative as one pointing away. A decision that caused a thing is found
 * by walking backwards from the thing.
 */
export function traverse(nodes, byId, seeds, hops = 2) {
  const inbound = new Map();
  for (const n of nodes) {
    for (const e of n.edges) {
      if (!inbound.has(e.to)) inbound.set(e.to, []);
      inbound.get(e.to).push(n.id);
    }
  }

  const depth = new Map(seeds.map(n => [n.id, 0]));
  let frontier = seeds.map(n => n.id);

  for (let hop = 1; hop <= hops && frontier.length; hop++) {
    const next = [];
    for (const id of frontier) {
      const neighbours = [
        ...(byId.get(id)?.edges ?? []).map(e => e.to),
        ...(inbound.get(id) ?? []),
      ];
      for (const nb of neighbours) {
        if (!byId.has(nb) || depth.has(nb)) continue;
        depth.set(nb, hop);
        next.push(nb);
      }
    }
    frontier = next;
  }

  return [...depth.keys()]
    .map(id => ({ node: byId.get(id), distance: depth.get(id) }))
    .sort((a, b) => a.distance - b.distance);
}

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'if', 'then', 'is', 'are', 'was', 'be',
  'to', 'of', 'in', 'on', 'for', 'with', 'as', 'at', 'by', 'from', 'into',
  'i', 'my', 'me', 'it', 'this', 'that', 'these', 'those', 'should', 'would',
  'could', 'do', 'does', 'did', 'can', 'will', 'what', 'how', 'why', 'when',
]);

/**
 * Token-based search, ranked by match count.
 *
 * A whole-string match fails on anything phrased as a natural question — the
 * common case when a question is being compiled for another model. Tokenising
 * and ranking finds the genuinely relevant region instead of returning nothing
 * and silently sending an unanchored question.
 *
 * Title and tag hits are weighted above body hits: a node *about* a term is
 * more relevant than one that merely mentions it in passing.
 */
export function search(nodes, query, limit = 8) {
  const terms = query.toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(t => t.length > 2 && !STOPWORDS.has(t));

  if (!terms.length) return [];

  const scored = nodes.map(n => {
    const title = String(n.title ?? '').toLowerCase();
    const tags = String(n.tags ?? '').toLowerCase();
    const body = n.body.toLowerCase();
    let score = 0;
    for (const t of terms) {
      if (title.includes(t)) score += 5;
      if (tags.includes(t)) score += 3;
      if (body.includes(t)) score += 1;
    }
    return { n, score };
  }).filter(x => x.score > 0);

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(x => x.n);
}

export function summarise(body, max = 400) {
  const prose = body.split(/\r?\n/)
    .filter(l => l.trim() && !l.startsWith('#') && !l.startsWith('|') && !l.startsWith('---'))
    .join(' ');
  return prose.length > max ? prose.slice(0, max).trim() + '…' : prose;
}
