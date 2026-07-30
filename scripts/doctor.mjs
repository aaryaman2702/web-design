#!/usr/bin/env node
/**
 * JARVIS doctor — verifies the architecture still holds.
 *
 * Four checks, in order of how quietly they fail:
 *
 *   1. Layer purity     no capability-provider names in core/ or engines/
 *   2. Capabilities     every module `requires` resolves in the registry
 *   3. Graph integrity  unique ids, no dangling edges, valid frontmatter
 *   4. Freshness        nodes past their review date
 *
 * Check 1 is the one that matters most. It is the rule that erodes first and
 * takes the whole architecture with it — one "just this once" reference to a
 * vendor in an engine, and the tool-agnostic core quietly stops being one.
 *
 * Exit 1 on error, 0 on pass. Warnings never fail the build; they are things
 * to look at, not things that are broken.
 *
 * Usage: node scripts/doctor.mjs [--quiet]
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const QUIET = process.argv.includes('--quiet');

const errors = [];
const warnings = [];
const notes = [];

/* ------------------------------------------------------------------ utils */

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.git')) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const rel = (p) => relative(ROOT, p);

/**
 * Minimal YAML frontmatter parser.
 *
 * Deliberately not a dependency. The schema is ours and small, and a system
 * meant to run for a decade should not break because a parser package was
 * unpublished. Handles exactly what core/memory-model.md specifies.
 */
function frontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const out = {};
  const edges = [];
  let inEdges = false;

  for (const raw of m[1].split(/\r?\n/)) {
    const line = raw.replace(/\s+$/, '');
    if (!line.trim() || line.trim().startsWith('#')) continue;

    if (/^edges:\s*$/.test(line)) { inEdges = true; continue; }

    if (inEdges) {
      if (/^\s*-\s*\{/.test(line)) {
        const rl = line.match(/rel:\s*([\w-]+)/);
        const to = line.match(/to:\s*([^,}\s]+)/);
        if (rl && to) edges.push({ rel: rl[1], to: to[1] });
        continue;
      }
      if (/^\S/.test(line)) inEdges = false;
      else continue;
    }

    const kv = line.match(/^([\w-]+):\s*(.*)$/);
    if (kv) {
      let v = kv[2].trim();
      if (v === '>' || v === '|' || v === '') v = '';
      v = v.replace(/^["']|["']$/g, '');
      if (/^\[.*\]$/.test(v)) {
        v = v.slice(1, -1).split(',').map((s) => s.trim()).filter(Boolean);
      }
      out[kv[1]] = v;
    }
  }
  out.edges = edges;
  return out;
}

/* ------------------------------------------- 1. layer purity (the big one) */

/**
 * Capability providers that must never be named above the adapter layer.
 *
 * Note "claude" is absent: the harness requires a CLAUDE.md boot file, and the
 * runtime is not a swappable capability provider in the way a video generator
 * is. Everything that *is* swappable belongs here.
 *
 * Names that are also ordinary English are deliberately excluded — "linear"
 * (an easing curve), "slack" (schedule margin), "notion" (an idea). Banning
 * them produces false positives that train everyone to ignore this check,
 * which costs more than the coverage gains.
 */
const VENDORS = [
  'higgsfield', 'vercel', 'gmail', 'firecrawl', 'obsidian', 'openai',
  'chatgpt', 'gemini', 'todoist', 'groww', 'meshy', 'runway', 'midjourney',
  'figma', 'airtable', 'supabase', 'zapier', 'hubspot',
];

function checkLayerPurity() {
  // modules/ is scanned too: the contract binds modules to capabilities, so a
  // module naming a vendor is the same violation one layer down.
  const inner = ['core', 'engines', 'modules'];
  const re = new RegExp(`\\b(${VENDORS.join('|')})\\b`, 'i');

  for (const layer of inner) {
    for (const file of walk(join(ROOT, layer))) {
      if (!['.md', '.yaml', '.yml'].includes(extname(file))) continue;
      const lines = readFileSync(file, 'utf8').split(/\r?\n/);
      lines.forEach((line, i) => {
        const hit = line.match(re);
        if (hit) {
          errors.push(
            `LAYER PURITY  ${rel(file)}:${i + 1} names "${hit[1]}".\n` +
            `              The inner layers must speak only in capabilities.\n` +
            `              Move this to adapters/registry.yaml.`
          );
        }
      });
    }
  }
  notes.push(`layer purity: scanned ${inner.join(', ')} against ${VENDORS.length} vendor names`);
}

/* ------------------------------------------------- 2. capability coverage */

function loadRegistry() {
  const p = join(ROOT, 'adapters/registry.yaml');
  if (!existsSync(p)) {
    errors.push('REGISTRY  adapters/registry.yaml is missing.');
    return { bound: new Set(), unbound: new Set() };
  }
  const text = readFileSync(p, 'utf8');
  const bound = new Set();
  const unbound = new Set();

  // Capability keys are two-space-indented under `capabilities:`.
  const capBlock = text.split(/^capabilities:\s*$/m)[1] ?? '';
  const stop = capBlock.split(/^unbound:\s*$/m)[0];
  for (const m of stop.matchAll(/^ {2}([a-z]+\.[a-z]+):\s*$/gm)) bound.add(m[1]);

  const unboundBlock = text.split(/^unbound:\s*$/m)[1] ?? '';
  for (const m of unboundBlock.matchAll(/^\s*-\s*([a-z]+\.[a-z]+)\s*$/gm)) unbound.add(m[1]);

  return { bound, unbound };
}

function checkCapabilities() {
  const { bound, unbound } = loadRegistry();
  const modDir = join(ROOT, 'modules');
  if (!existsSync(modDir)) return;

  let count = 0;
  for (const name of readdirSync(modDir)) {
    const f = join(modDir, name, 'MODULE.md');
    if (!existsSync(f)) continue;
    count++;
    const fm = frontmatter(readFileSync(f, 'utf8'));
    if (!fm) { errors.push(`MODULE  ${rel(f)} has no frontmatter.`); continue; }

    for (const field of ['module', 'purpose', 'review']) {
      if (!fm[field] && name !== '_template') {
        warnings.push(`MODULE  ${rel(f)} is missing "${field}".`);
      }
    }

    const requires = Array.isArray(fm.requires) ? fm.requires : [];
    for (const cap of requires) {
      if (bound.has(cap)) continue;
      if (unbound.has(cap)) {
        warnings.push(
          `CAPABILITY  ${name} requires "${cap}", which is declared unbound.\n` +
          `            The module will fail cleanly and name the gap. That is correct,\n` +
          `            but it cannot run until an adapter exists.`
        );
      } else {
        errors.push(
          `CAPABILITY  ${name} requires "${cap}" — not in the registry at all.\n` +
          `            Add an adapter, or list it under "unbound:".`
        );
      }
    }
  }
  notes.push(`capabilities: ${bound.size} bound, ${unbound.size} unbound, ${count} module(s)`);
}

/* --------------------------------------------------- 3. graph integrity */

function checkGraph() {
  const memDir = join(ROOT, 'memory');
  const files = walk(memDir).filter((f) => extname(f) === '.md');
  const ids = new Map();
  const targets = [];
  let typed = 0;

  for (const f of files) {
    const fm = frontmatter(readFileSync(f, 'utf8'));
    if (!fm || !fm.id) continue;
    typed++;

    if (ids.has(fm.id)) {
      errors.push(
        `GRAPH  duplicate id "${fm.id}"\n` +
        `       ${rel(ids.get(fm.id))}\n       ${rel(f)}\n` +
        `       Ids are permanent and unique — edges resolve through them.`
      );
    }
    ids.set(fm.id, f);

    if (!fm.type) warnings.push(`GRAPH  ${rel(f)} has an id but no type.`);
    for (const e of fm.edges ?? []) targets.push({ from: fm.id, ...e, file: f });
  }

  for (const e of targets) {
    if (!ids.has(e.to)) {
      warnings.push(
        `GRAPH  dangling edge: ${e.from} --${e.rel}--> ${e.to} (target not found)\n` +
        `       ${rel(e.file)}\n` +
        `       Not auto-removed. Deleting history to make a report clean is how\n` +
        `       a system loses its memory.`
      );
    }
  }
  notes.push(`graph: ${typed} node(s), ${targets.length} edge(s)`);
}

/* ------------------------------------------------------- 4. freshness */

function checkFreshness() {
  const today = new Date().toISOString().slice(0, 10);
  let stale = 0;

  for (const f of walk(join(ROOT, 'memory')).filter((f) => extname(f) === '.md')) {
    const fm = frontmatter(readFileSync(f, 'utf8'));
    if (!fm?.review || typeof fm.review !== 'string') continue;
    if (fm.review < today) {
      stale++;
      warnings.push(
        `STALE  ${rel(f)} was due for review ${fm.review}.\n` +
        `       Re-confirm, revise, or supersede. Reasoning from stale beliefs is\n` +
        `       how a system that remembers everything gets worse over time.`
      );
    }
  }
  notes.push(`freshness: ${stale} node(s) past review`);
}

/* ------------------------------------------------------------- report */

checkLayerPurity();
checkCapabilities();
checkGraph();
checkFreshness();

const B = '\x1b[1m', R = '\x1b[31m', Y = '\x1b[33m', G = '\x1b[32m', D = '\x1b[2m', X = '\x1b[0m';

if (!QUIET) {
  console.log(`\n${B}JARVIS doctor${X}\n`);
  for (const n of notes) console.log(`  ${D}${n}${X}`);
  console.log('');
}

if (warnings.length) {
  console.log(`${Y}${B}${warnings.length} warning(s)${X}\n`);
  for (const w of warnings) console.log(`${Y}!${X} ${w}\n`);
}

if (errors.length) {
  console.log(`${R}${B}${errors.length} error(s)${X}\n`);
  for (const e of errors) console.log(`${R}✗${X} ${e}\n`);
  console.log(`${R}${B}FAIL${X} — the architecture has drifted. Fix before building on it.\n`);
  process.exit(1);
}

console.log(`${G}${B}PASS${X}${warnings.length ? `${D} (with warnings)${X}` : ''}\n`);
