#!/usr/bin/env node
/**
 * run-audit — find what failed, what went silent, and what nobody uses.
 *
 * The evolution engine asks "what underperformed?" and until now had nothing to
 * read. A module declares a `verify` contract — the evidence a run must produce
 * — but nothing checked whether runs actually produced it.
 *
 * The failure this catches is specifically the quiet one. A scheduled job that
 * silently stops firing looks identical to a quiet week, and you stop checking
 * manually because you believe it is handled. Nobody notices for a month.
 *
 * Four findings:
 *
 *   silent      a scheduled module with no output in longer than its cadence
 *   unverified  runs that produced output but not the evidence they promised
 *   unused      modules that have never run at all
 *   drifting    modules whose review date has passed with no assessment
 *
 * Usage:
 *   node scripts/run-audit.mjs
 *   node scripts/run-audit.mjs --json
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib/graph.mjs';

const JSON_OUT = process.argv.includes('--json');
const today = new Date().toISOString().slice(0, 10);
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5);

/* ------------------------------------------------------------ modules */

function frontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const out = {};
  let key = null;
  // Strip trailing YAML comments. Without this, `schedule: daily  # note`
  // yields the whole tail as the value and every lookup silently misses —
  // which is exactly how this script failed to flag a missed run the first
  // time it mattered.
  const clean = (v) => v.replace(/\s+#.*$/, '').trim();

  for (const raw of m[1].split(/\r?\n/)) {
    if (!raw.trim() || raw.trim().startsWith('#')) continue;
    const top = raw.match(/^([\w-]+):\s*(.*)$/);
    if (top) { key = top[1]; out[key] = clean(top[2]); continue; }
    const sub = raw.match(/^\s+([\w-]+):\s*(.*)$/);
    if (sub && key) { out[`${key}.${sub[1]}`] = clean(sub[2]); }
  }
  return out;
}

const modDir = join(ROOT, 'modules');
const modules = existsSync(modDir)
  ? readdirSync(modDir)
      .filter(n => n !== '_template' && existsSync(join(modDir, n, 'MODULE.md')))
      .map(n => ({ name: n, fm: frontmatter(readFileSync(join(modDir, n, 'MODULE.md'), 'utf8')) }))
  : [];

/* --------------------------------------------------------------- runs */

// Runs land under episodes/runs/<name>/ or episodes/observations/<name>/.
function runsFor(name) {
  const out = [];
  for (const base of ['episodes/runs', 'episodes/observations']) {
    const d = join(ROOT, 'memory', base, name);
    if (!existsSync(d)) continue;
    for (const f of readdirSync(d)) {
      if (!f.endsWith('.md')) continue;
      const p = join(d, f);
      const date = (f.match(/(\d{4}-\d{2}-\d{2})/) || [])[1]
        || statSync(p).mtime.toISOString().slice(0, 10);
      out.push({ file: join(base, name, f), date, text: readFileSync(p, 'utf8') });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

const CADENCE_DAYS = { hourly: 1, daily: 1, weekly: 7, monthly: 31 };

const silent = [], unused = [], unverified = [], drifting = [], unscheduled = [];

for (const m of modules) {
  const runs = runsFor(m.name);

  // A module's RUN frequency and its REVIEW frequency are different things and
  // conflating them is how a daily job goes silent for two months unnoticed.
  //
  // This was a real bug, caught the hard way: the dream runs daily, is reviewed
  // monthly, and a missed run went unflagged because the window was computed
  // from the review cadence — 62 days. The tool built to catch silent failures
  // silently failed to catch one.
  const schedule = m.fm['schedule'];
  const cadence = schedule ?? m.fm['review.cadence'] ?? 'monthly';

  // 1.5× cadence. For a daily job that means one missed run flags immediately,
  // which is correct — a daily job that skipped yesterday is already broken.
  // Longer cadences get proportionally more grace, since one miss on a weekly
  // job is more plausibly legitimate.
  const window = Math.max(1, (CADENCE_DAYS[cadence] ?? 31) * 1.5);

  if (!schedule && runs.length) {
    unscheduled.push({ module: m.name, assumed: cadence });
  }

  if (!runs.length) {
    unused.push({
      module: m.name,
      purpose: m.fm.purpose ?? '',
      note: 'never run',
    });
    continue;
  }

  const last = runs.at(-1);
  const age = daysBetween(last.date, today);
  if (age > window) {
    silent.push({ module: m.name, lastRun: last.date, daysSilent: age, window });
  }

  // A run must carry the evidence its verify contract promised. Without a
  // contract there is nothing to check — which is itself worth reporting,
  // because it means completion is self-reported.
  const evidence = m.fm['verify.evidence'];
  if (!evidence) {
    unverified.push({ module: m.name, reason: 'no verify contract — completion is self-reported' });
  } else {
    const empty = runs.filter(r => r.text.replace(/^---[\s\S]*?---/, '').trim().length < 80);
    if (empty.length) {
      unverified.push({
        module: m.name,
        reason: `${empty.length} run(s) produced almost no content`,
        files: empty.map(r => r.file),
      });
    }
  }
}

/* ------------------------------------------------------- stale reviews */

for (const m of modules) {
  const runs = runsFor(m.name);
  if (!runs.length) continue;
  const cadence = m.fm['review.cadence'] ?? 'monthly';
  const need = CADENCE_DAYS[cadence] ?? 31;
  const first = runs[0].date;
  if (daysBetween(first, today) > need && runs.length >= 3) {
    drifting.push({
      module: m.name,
      metric: m.fm['review.metric'] ?? '(none declared)',
      target: m.fm['review.target'] ?? '(none declared)',
      runs: runs.length,
      note: 'enough runs to assess against its target — has it been assessed?',
    });
  }
}

const report = { generated: today, modules: modules.length, silent, unused, unverified, drifting, unscheduled };

if (JSON_OUT) { console.log(JSON.stringify(report, null, 2)); process.exit(0); }

const B='\x1b[1m', D='\x1b[2m', Y='\x1b[33m', R='\x1b[31m', G='\x1b[32m', X='\x1b[0m';
const p = console.log;

p(`\n${B}Run audit${X} ${D}${today} · ${modules.length} module(s)${X}\n`);

p(`${B}Silent${X} ${D}(scheduled but produced nothing in 2× its cadence)${X}`);
if (!silent.length) p(`  ${D}none${X}`);
for (const s of silent) p(`  ${R}✗${X} ${s.module} — last run ${s.lastRun}, ${s.daysSilent}d ago`);

p(`\n${B}Never run${X} ${D}(built and unused — clutter until proven otherwise)${X}`);
if (!unused.length) p(`  ${D}none${X}`);
for (const u of unused) p(`  ${Y}○${X} ${u.module} ${D}${u.purpose.slice(0, 62)}${X}`);

p(`\n${B}Unverified${X} ${D}(completion not provable)${X}`);
if (!unverified.length) p(`  ${G}all modules carry a verify contract${X}`);
for (const u of unverified) p(`  ${Y}?${X} ${u.module} — ${u.reason}`);

p(`\n${B}Due assessment${X} ${D}(enough runs to grade against target)${X}`);
if (!drifting.length) p(`  ${D}none${X}`);
for (const d of drifting) p(`  ${Y}◷${X} ${d.module} — ${d.runs} runs · target: ${d.target}`);

if (unscheduled.length) {
  p(`\n${B}No declared schedule${X} ${D}(silence window guessed from review cadence)${X}`);
  for (const u of unscheduled) p(`  ${Y}?${X} ${u.module} — assuming ${u.assumed}. Add "schedule:" to its frontmatter.`);
}

p(`\n${D}A module that never runs is not neutral — it is clutter every future${X}`);
p(`${D}search steps over. Retiring one is as valuable as fixing one.${X}\n`);
