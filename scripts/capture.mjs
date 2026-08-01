#!/usr/bin/env node
/**
 * capture — drop something into the inbox in one second.
 *
 * The problem this solves is friction, and friction is the only thing that
 * actually kills a memory system. Every capture path that required opening an
 * editor, choosing a folder, writing frontmatter, and deciding what kind of
 * node it was — died. Not because it was wrong, because it was slow at the
 * exact moment attention was elsewhere.
 *
 * So this does the minimum: stamp it, queue it, get out of the way. It writes
 * to memory/inbox/ as RAW, deliberately unstructured, explicitly untrusted.
 *
 * It does NOT fetch URLs and does NOT distil. Both happen later, in /ingest,
 * through the proper capability layer and with judgment applied. That
 * separation is the point:
 *
 *   capture  = zero friction, zero judgment, raw
 *   ingest   = full judgment, heavy filter, most of it discarded
 *
 * Collapsing them produces the failure the ingest module warns about — a graph
 * diluted with transcript sediment that degrades every future traversal, and
 * that nobody ever goes back to prune.
 *
 * Usage:
 *   node scripts/capture.mjs https://example.com/article
 *   node scripts/capture.mjs "the 3D bottle felt gimmicky"
 *   pbpaste | node scripts/capture.mjs --stdin
 *   node scripts/capture.mjs "..." --tag taste --note "reacting to the BOD hero"
 *   node scripts/capture.mjs --list          # what is queued
 */

import { writeFileSync, mkdirSync, readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib/graph.mjs';

const INBOX = join(ROOT, 'memory/inbox');
const argv = process.argv.slice(2);
const has = f => argv.includes(`--${f}`);
const val = (f, d) => { const i = argv.indexOf(`--${f}`); return i === -1 ? d : argv[i + 1]; };

/* ---------------------------------------------------------------- list */

if (has('list')) {
  mkdirSync(INBOX, { recursive: true });
  const items = readdirSync(INBOX).filter(f => f.endsWith('.md')).sort();
  const B='\x1b[1m', D='\x1b[2m', C='\x1b[36m', X='\x1b[0m';
  console.log(`\n${B}Inbox${X} ${D}${items.length} item(s) awaiting /ingest${X}\n`);
  if (!items.length) console.log(`  ${D}empty${X}\n`);
  for (const f of items) {
    const t = readFileSync(join(INBOX, f), 'utf8');
    const kind = (t.match(/^kind:\s*(\S+)/m) ?? [])[1] ?? '—';
    const first = t.replace(/^---[\s\S]*?---/, '').trim().split('\n')[0].slice(0, 68);
    console.log(`  ${C}${kind.padEnd(6)}${X} ${first}\n         ${D}${f}${X}`);
  }
  console.log(`\n  ${D}Run /ingest to distil. Expect most of this to be discarded —${X}`);
  console.log(`  ${D}that ratio is correct, not a sign the captures were bad.${X}\n`);
  process.exit(0);
}

/* -------------------------------------------------------------- capture */

// Collect the body from positional args only. Flag VALUES must be skipped too,
// or `--tag taste` silently appends "taste" to the captured text — which then
// breaks URL detection and quietly corrupts the capture.
const VALUE_FLAGS = new Set(['tag', 'note']);
const positional = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a.startsWith('--')) {
    if (VALUE_FLAGS.has(a.slice(2))) i++;   // skip its value
    continue;
  }
  positional.push(a);
}
let body = positional.join(' ').trim();

if (has('stdin') || !body) {
  try { body = readFileSync(0, 'utf8').trim(); } catch { /* no pipe */ }
}

if (!body) {
  console.error(`usage: capture.mjs <url | text> [--tag t] [--note n]
       pbpaste | capture.mjs --stdin
       capture.mjs --list`);
  process.exit(1);
}

const isUrl = /^https?:\/\/\S+$/i.test(body);
const kind = isUrl ? 'link' : 'note';
const now = new Date();
const stamp = now.toISOString();
const day = stamp.slice(0, 10);
const time = stamp.slice(11, 19).replace(/:/g, '');

const slug = (isUrl
  ? (body.replace(/^https?:\/\//, '').replace(/[^a-z0-9]+/gi, '-'))
  : body.toLowerCase().replace(/[^a-z0-9]+/g, '-')
).slice(0, 44).replace(/^-|-$/g, '') || 'item';

const tag = val('tag', null);
const note = val('note', null);

const doc = `---
captured: ${stamp}
kind: ${kind}
status: raw
${tag ? `tag: ${tag}\n` : ''}---

${body}
${note ? `\n> ${note}\n` : ''}
<!-- RAW CAPTURE. Not memory yet.

     /ingest decides whether any of this survives. The test is: would this
     still be worth knowing in six months? Almost nothing passes, and that
     ratio is correct.

     ${isUrl ? 'This is a link — ingest fetches it through web.fetch, reads the whole\n     thing, and extracts only what generalises.' : 'This is a note — ingest classifies it as episode, insight, taste,\n     decision, or open question, and attributes it honestly.'}
-->
`;

mkdirSync(INBOX, { recursive: true });
const file = join(INBOX, `${day}-${time}-${slug}.md`);
writeFileSync(file, doc);

const queued = readdirSync(INBOX).filter(f => f.endsWith('.md')).length;
const G='\x1b[32m', D='\x1b[2m', X='\x1b[0m';
console.log(`${G}✓${X} captured as ${kind} ${D}→ ${file.replace(ROOT + '/', '')}${X}`);
console.log(`  ${D}${queued} item(s) queued · run /ingest to distil${X}`);
