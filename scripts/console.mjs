#!/usr/bin/env node
/**
 * console — the JARVIS operator shell.
 *
 * Generated from the live graph, not hand-authored. Self-contained: no external
 * requests, styles and script inline. Renders locally and publishes unchanged.
 *
 * Deliberately single-theme. Neo-noir is one committed visual world; giving it
 * a light mode would mean designing a second, worse thing.
 *
 * One substitution worth stating: the reference shell this is modelled on has
 * an "AI Spend" view with dollar ROI and session counters. That slot holds
 * CALIBRATION here instead — taste prediction accuracy and decision accuracy.
 * The metric a system displays becomes the thing it optimises for, and
 * hours-saved rewards volume of automation over quality of judgment.
 *
 * Usage: node scripts/console.mjs > interface/console.html
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { execSync } from 'node:child_process';
import { ROOT, load } from './lib/graph.mjs';

const today = new Date().toISOString().slice(0, 10);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));

/* ─────────────────────────────────────────────────────── gather */

const { nodes, byId } = load();

const adj = new Map(nodes.map(n => [n.id, new Set()]));
const edgeList = [];
for (const n of nodes) {
  for (const e of n.edges) {
    if (!byId.has(e.to)) continue;
    adj.get(n.id).add(e.to); adj.get(e.to).add(n.id);
    edgeList.push({ source: n.id, target: n.to ?? e.to, rel: e.rel, from: n.id, to: e.to });
  }
}
const orphans = nodes.filter(n => (adj.get(n.id)?.size ?? 0) === 0);
const stale = nodes.filter(n => typeof n.review === 'string' && n.review < today);
const contradictions = edgeList.filter(e => e.rel === 'contradicts');

let clusters = 0; const seenC = new Set();
for (const n of nodes) {
  if (seenC.has(n.id)) continue;
  clusters++; const q = [n.id]; seenC.add(n.id);
  while (q.length) for (const nb of adj.get(q.shift()) ?? []) if (!seenC.has(nb)) { seenC.add(nb); q.push(nb); }
}

function fm(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const o = {}; let k = null;
  const clean = v => v.replace(/\s+#.*$/, '').trim();
  for (const raw of m[1].split(/\r?\n/)) {
    if (!raw.trim() || raw.trim().startsWith('#')) continue;
    const t = raw.match(/^([\w-]+):\s*(.*)$/);
    if (t) { k = t[1]; o[k] = clean(t[2]); continue; }
    const s = raw.match(/^\s+([\w-]+):\s*(.*)$/);
    if (s && k) o[`${k}.${s[1]}`] = clean(s[2]);
  }
  return o;
}
const firstPara = (text) => {
  const body = text.replace(/^---[\s\S]*?---/, '').replace(/^#.*$/m, '').trim();
  const p = body.split(/\n\n/).find(x => x.trim() && !x.startsWith('#') && !x.startsWith('|'));
  return (p ?? '').replace(/\*\*/g, '').replace(/\n/g, ' ').slice(0, 170);
};

const ENGINE_FIRES = {
  reflection: 'end of real work', taste: 'any craft work · every correction',
  decision: 'strategic choices', idea: 'daily · on new nodes',
  opportunity: 'daily', curiosity: 'continuous', evolution: 'weekly',
};
const engines = readdirSync(join(ROOT, 'engines')).sort().map(name => ({
  name, fires: ENGINE_FIRES[name] ?? '—',
  blurb: firstPara(readFileSync(join(ROOT, 'engines', name, 'ENGINE.md'), 'utf8')),
}));

const commands = readdirSync(join(ROOT, '.claude/commands')).filter(f => f.endsWith('.md')).sort().map(f => {
  const t = readFileSync(join(ROOT, '.claude/commands', f), 'utf8');
  return { name: f.replace('.md', ''), desc: (fm(t).description ?? '') };
});

const modules = readdirSync(join(ROOT, 'modules'))
  .filter(n => n !== '_template' && existsSync(join(ROOT, 'modules', n, 'MODULE.md')))
  .map(n => ({ name: n, ...fm(readFileSync(join(ROOT, 'modules', n, 'MODULE.md'), 'utf8')) }));

// capabilities
const reg = readFileSync(join(ROOT, 'adapters/registry.yaml'), 'utf8');
const caps = [];
const capBlock = (reg.split(/^capabilities:\s*$/m)[1] ?? '').split(/^unbound:\s*$/m)[0];
for (const m of capBlock.matchAll(/^ {2}([a-z][a-z_]*\.[a-z][a-z_]*):\s*\n([\s\S]*?)(?=^ {2}[a-z]|\Z)/gm)) {
  const primary = (m[2].match(/primary:\s*(\S+)/) ?? [])[1] ?? '—';
  const env = (m[2].match(/requires_env:\s*(\S+)/) ?? [])[1] ?? null;
  caps.push({ cap: m[1], primary, env });
}
const unbound = [...(reg.split(/^unbound:\s*$/m)[1] ?? '').matchAll(/^\s*-\s*([a-z][a-z_]*\.[a-z][a-z_]*)/gm)].map(x => x[1]);

// dreams
const dreamDir = join(ROOT, 'memory/episodes/observations/dream');
const dreams = existsSync(dreamDir) ? readdirSync(dreamDir).filter(f => f.endsWith('.md')).sort().reverse().map(f => {
  const raw = readFileSync(join(dreamDir, f), 'utf8');
  const findings = [...raw.matchAll(/^## (?:Finding \d+ — )?(.+)$/gm)].map(x => x[1]).filter(t => !/^(Not surfaced|Second opinion|What)/.test(t));
  return { date: f.replace('.md', ''), findings, body: raw.replace(/^---[\s\S]*?---/, '').trim() };
}) : [];

// activity — git log
let activity = [];
try {
  activity = execSync('git log -40 --format=%h%x1f%cI%x1f%s', { cwd: ROOT }).toString()
    .trim().split('\n').map(l => { const [h, d, s] = l.split('\x1f'); return { h, d, s }; });
} catch { /* fine */ }

const ROUTINES = [
  { name: 'Evening capture', ist: '21:30', cron: '0 16 * * *', id: 'trig_016kaRd3', note: 'reflect on the day from artifacts, then ask' },
  { name: 'Dream',           ist: '02:00', cron: '30 20 * * *', id: 'trig_01StL9AP', note: 'deep unprompted work on the graph' },
  { name: 'Morning brief',   ist: '07:00', cron: '30 1 * * *',  id: 'trig_013ubk7b', note: 'state, one opportunity, one thing worth thinking about' },
  { name: 'Weekly evolution',ist: 'Sun 10:00', cron: '30 4 * * 0', id: 'trig_01WjrbRG', note: 'what should change about this system' },
];

// taste
const tasteProfile = nodes.find(n => n.id === 'n-taste-profile');
const tasteDims = [];
if (tasteProfile) for (const m of tasteProfile.body.matchAll(/^\|\s*([a-z]+)\s*\|\s*(\d+)\s*\|/gm)) tasteDims.push({ name: m[1], n: +m[2] });
const tasteJudgments = tasteDims.reduce((s, d) => s + d.n, 0);
const craftDims = tasteDims.filter(d => !['concept','copy','restraint'].includes(d.name));
const decisions = nodes.filter(n => n.type === 'decision');
const predictions = nodes.filter(n => n.subtype === 'prediction');

let doctorOk = true;
try { execSync('node scripts/doctor.mjs --quiet', { cwd: ROOT, stdio: 'pipe' }); } catch { doctorOk = false; }

const TYPE_COLOR = { entity:'--cy', insight:'--vi', decision:'--am', taste:'--mg', episode:'--dim2', question:'--gr' };
const graphData = {
  nodes: nodes.map(n => ({ id:n.id, t:n.title ?? n.id, ty:n.type ?? 'entity', c:n.confidence ?? '', d:adj.get(n.id)?.size ?? 0 })),
  links: edgeList.map(e => ({ s:e.from, t:e.to, r:e.rel })),
};

/* ─────────────────────────────────────────────────────── render */

const NAV = [
  ['home','Home','◈'], ['graph','Knowledge Graph','◊'], ['memory','Memory','◉'],
  ['mind','Engines','∴'], ['commands','Commands','⌘'], ['modules','Modules','▣'],
  ['dreams','Dreams','☾'], ['routines','Automations','↻'], ['calibration','Calibration','⊹'],
  ['adapters','Integrations','⌗'], ['activity','Activity','∿'], ['doctor','Diagnostics','⚙'],
];

const view = (id, inner) => `<section class="view" id="v-${id}">${inner}</section>`;
const head = (t, s) => `<div class="vh"><h1>${esc(t)}</h1><p>${esc(s)}</p></div>`;

const out = [];
out.push(`<title>JARVIS — operator</title>
<style>
:root{
  --bg:#06080C; --panel:#0B0F16; --panel2:#10151F; --rule:#1A2231; --rule2:#232D3F;
  --tx:#C5CFDD; --dim:#6E7C90; --dim2:#4A5568;
  --cy:#45E0D8; --mg:#FF4D9D; --vi:#9D7BFF; --am:#E8A33D; --rd:#FF5F6D; --gr:#3DDC97;
  --mono:ui-monospace,'SF Mono',SFMono-Regular,Menlo,Consolas,monospace;
  --sans:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
}
*{box-sizing:border-box}
body{margin:0}
.os{display:grid;grid-template-columns:236px 1fr;min-height:100vh;background:var(--bg);
  color:var(--tx);font:400 15px/1.6 var(--sans);
  background-image:radial-gradient(1100px 600px at 78% -8%,rgba(69,224,216,.055),transparent 62%),
                   radial-gradient(760px 520px at 4% 106%,rgba(255,77,157,.045),transparent 60%)}
@media(max-width:860px){.os{grid-template-columns:1fr}.side{display:none}}

/* ── sidebar ── */
.side{border-right:1px solid var(--rule);display:flex;flex-direction:column;
  background:linear-gradient(180deg,rgba(11,15,22,.94),rgba(6,8,12,.94));position:sticky;top:0;height:100vh}
.brand{display:flex;gap:11px;align-items:center;padding:18px 16px;border-bottom:1px solid var(--rule)}
.mark{width:30px;height:30px;border-radius:7px;display:grid;place-items:center;flex:none;
  background:linear-gradient(140deg,var(--cy),#1C8F92);color:#04222A;font-weight:800;font-size:15px;
  box-shadow:0 0 18px rgba(69,224,216,.4)}
.brand b{font:600 14.5px/1.1 var(--sans);letter-spacing:.02em;display:block}
.brand span{font:500 9.5px/1 var(--mono);letter-spacing:.19em;color:var(--dim2);text-transform:uppercase}
nav{padding:12px 10px;display:flex;flex-direction:column;gap:1px;overflow-y:auto;flex:1}
.nl{display:flex;gap:10px;align-items:center;padding:8px 11px;border-radius:6px;cursor:pointer;
  color:var(--dim);font-size:13.5px;border:1px solid transparent;transition:.13s;
  background:none;width:100%;text-align:left;font-family:inherit}
.nl i{font-style:normal;width:14px;text-align:center;font-size:12px;color:var(--dim2)}
.nl:hover{color:var(--tx);background:rgba(69,224,216,.05)}
.nl.on{color:var(--cy);background:rgba(69,224,216,.09);border-color:rgba(69,224,216,.26);
  box-shadow:inset 0 0 22px rgba(69,224,216,.07)}
.nl.on i{color:var(--cy)}
.ngrp{font:500 9.5px/1 var(--mono);letter-spacing:.19em;color:var(--dim2);
  text-transform:uppercase;padding:16px 12px 7px}
.who{border-top:1px solid var(--rule);padding:13px 16px;display:flex;gap:10px;align-items:center}
.av{width:27px;height:27px;border-radius:50%;display:grid;place-items:center;flex:none;
  background:rgba(255,77,157,.14);border:1px solid rgba(255,77,157,.34);color:var(--mg);
  font:600 10px var(--mono)}
.who b{font-size:13px;font-weight:600;display:block;line-height:1.25}
.who span{font:500 9px/1 var(--mono);letter-spacing:.16em;color:var(--dim2)}

/* ── topbar ── */
.main{display:flex;flex-direction:column;min-width:0}
.top{display:flex;align-items:center;gap:12px;padding:0 26px;height:54px;
  border-bottom:1px solid var(--rule);background:rgba(6,8,12,.8);backdrop-filter:blur(11px);
  position:sticky;top:0;z-index:20;flex-wrap:wrap}
.crumb{font:500 13px var(--mono);color:var(--dim)}
.crumb b{color:var(--tx);font-weight:600}
.tag{font:500 10px/1 var(--mono);letter-spacing:.1em;padding:5px 8px;border-radius:4px;
  border:1px solid var(--rule2);color:var(--dim);text-transform:uppercase;white-space:nowrap}
.tag.cy{color:var(--cy);border-color:rgba(69,224,216,.34);background:rgba(69,224,216,.07)}
.tag.mg{color:var(--mg);border-color:rgba(255,77,157,.32);background:rgba(255,77,157,.06)}
.tag.gr{color:var(--gr);border-color:rgba(61,220,151,.3);background:rgba(61,220,151,.06)}
.tag.am{color:var(--am);border-color:rgba(232,163,61,.3);background:rgba(232,163,61,.06)}
.tag.rd{color:var(--rd);border-color:rgba(255,95,109,.32);background:rgba(255,95,109,.07)}
.dot{width:6px;height:6px;border-radius:50%;background:var(--gr);display:inline-block;
  box-shadow:0 0 9px var(--gr);margin-right:5px;vertical-align:middle}
.spacer{flex:1}

/* ── views ── */
.wrap{padding:26px;max-width:1180px;width:100%}
.view{display:none;flex-direction:column;gap:22px}
.view.on{display:flex;animation:in .22s ease}
@keyframes in{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
.vh h1{margin:0;font:400 30px/1.15 var(--sans);letter-spacing:-.022em}
.vh p{margin:5px 0 0;color:var(--dim);font-size:14px;max-width:74ch}

.card{border:1px solid var(--rule);border-radius:9px;background:var(--panel);overflow:hidden}
.card>h3{margin:0;padding:12px 16px;border-bottom:1px solid var(--rule);
  font:500 10.5px/1 var(--mono);letter-spacing:.17em;text-transform:uppercase;color:var(--dim);
  display:flex;justify-content:space-between;align-items:center;gap:10px}
.pad{padding:16px}
.grid{display:grid;gap:14px}
.g2{grid-template-columns:repeat(auto-fit,minmax(290px,1fr))}
.g3{grid-template-columns:repeat(auto-fit,minmax(215px,1fr))}
.g4{grid-template-columns:repeat(auto-fit,minmax(165px,1fr))}

.tile{border:1px solid var(--rule);border-radius:9px;background:var(--panel);padding:15px 16px;
  display:flex;flex-direction:column;gap:3px;position:relative;overflow:hidden}
.tile::after{content:'';position:absolute;left:0;top:0;bottom:0;width:2px;background:var(--rule2)}
.tile.cy::after{background:var(--cy);box-shadow:0 0 13px var(--cy)}
.tile.mg::after{background:var(--mg);box-shadow:0 0 13px var(--mg)}
.tile.am::after{background:var(--am);box-shadow:0 0 13px var(--am)}
.tile.gr::after{background:var(--gr);box-shadow:0 0 13px var(--gr)}
.tile .k{font:500 9.5px/1 var(--mono);letter-spacing:.17em;text-transform:uppercase;color:var(--dim2)}
.tile .v{font:600 27px/1.1 var(--mono);letter-spacing:-.025em;font-variant-numeric:tabular-nums}
.tile .v small{font-size:14px;color:var(--dim2);font-weight:400}
.tile .n{font-size:12px;color:var(--dim);line-height:1.45}
.tile.cy .v{color:var(--cy)} .tile.mg .v{color:var(--mg)}
.tile.am .v{color:var(--am)} .tile.gr .v{color:var(--gr)}

.bar{height:5px;border-radius:3px;background:var(--rule);overflow:hidden;margin-top:7px}
.bar i{display:block;height:100%;border-radius:3px;background:linear-gradient(90deg,var(--cy),var(--mg))}

.row{display:flex;gap:13px;padding:11px 16px;border-bottom:1px solid var(--rule);align-items:baseline}
.row:last-child{border-bottom:none}
.row .lb{font:500 9.5px/1.5 var(--mono);letter-spacing:.13em;text-transform:uppercase;
  color:var(--dim2);width:96px;flex:none}
.row .bd{flex:1;min-width:0}
.row .bd b{font-weight:600;font-size:14px}
.row .bd p{margin:2px 0 0;font-size:12.5px;color:var(--dim);line-height:1.5}
.row .rt{font:500 10.5px var(--mono);color:var(--dim2);white-space:nowrap}
.row:hover{background:rgba(69,224,216,.028)}

code{font-family:var(--mono);font-size:.87em;background:rgba(69,224,216,.08);
  color:var(--cy);padding:2px 5px;border-radius:3px}
a{color:var(--cy)}

#gc{display:block;width:100%;height:440px;touch-action:none;cursor:grab}
.legend{display:flex;gap:15px;flex-wrap:wrap;padding:11px 16px;border-top:1px solid var(--rule);
  font:500 10.5px var(--mono);color:var(--dim2);letter-spacing:.06em}
.legend s{width:8px;height:8px;border-radius:50%;display:inline-block;margin-right:6px;text-decoration:none}
.ctl{display:flex;gap:8px;flex-wrap:wrap;align-items:center;padding:11px 16px;border-top:1px solid var(--rule)}
.btn{font:500 10.5px var(--mono);letter-spacing:.11em;text-transform:uppercase;padding:6px 11px;
  border-radius:5px;border:1px solid var(--rule2);background:var(--panel2);color:var(--dim);
  cursor:pointer;transition:.13s}
.btn:hover{color:var(--tx);border-color:var(--cy)}
.btn.on{color:var(--cy);border-color:rgba(69,224,216,.5);background:rgba(69,224,216,.1)}

.note{border:1px solid var(--rule);border-left:2px solid var(--am);border-radius:7px;
  background:rgba(232,163,61,.045);padding:14px 16px;font-size:13.5px;color:var(--dim);max-width:78ch}
.note.rd{border-left-color:var(--rd);background:rgba(255,95,109,.05)}
.note.cy{border-left-color:var(--cy);background:rgba(69,224,216,.045)}
.note b{color:var(--tx)}

pre{margin:0;padding:15px 17px;overflow-x:auto;font:400 12.5px/1.7 var(--mono);
  color:var(--dim);white-space:pre-wrap;word-break:break-word}
.mut{color:var(--dim2)}
@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
</style>

<div class="os">
<aside class="side">
  <div class="brand"><div class="mark">J</div>
    <div><b>JARVIS</b><span>cognitive os</span></div></div>
  <nav>
    ${NAV.slice(0,3).map(([id,l,ic])=>`<button class="nl" data-v="${id}"><i>${ic}</i>${l}</button>`).join('')}
    <div class="ngrp">Cognition</div>
    ${NAV.slice(3,7).map(([id,l,ic])=>`<button class="nl" data-v="${id}"><i>${ic}</i>${l}</button>`).join('')}
    <div class="ngrp">System</div>
    ${NAV.slice(7).map(([id,l,ic])=>`<button class="nl" data-v="${id}"><i>${ic}</i>${l}</button>`).join('')}
  </nav>
  <div class="who"><div class="av">AA</div>
    <div><b>Aaryaman</b><span>operator</span></div></div>
</aside>

<div class="main">
  <div class="top">
    <span class="crumb"><b>Operator</b> / jarvis</span>
    <span class="tag">${today}</span>
    <span class="spacer"></span>
    <span class="tag ${doctorOk?'gr':'rd'}"><span class="dot" style="background:var(--${doctorOk?'gr':'rd'})"></span>${doctorOk?'doctor pass':'doctor fail'}</span>
    <span class="tag cy">opus 5</span>
  </div>
  <div class="wrap">`);

/* ── HOME ── */
out.push(view('home', `
${head('Operator', 'Everything the system knows, and everything it does not yet.')}
<div class="grid g4">
  <div class="tile cy"><span class="k">Graph nodes</span><span class="v">${nodes.length}</span><span class="n">${edgeList.length} typed edges</span></div>
  <div class="tile ${clusters===1?'gr':'am'}"><span class="k">Clusters</span><span class="v">${clusters}</span><span class="n">${clusters===1?'fully connected':'disconnected regions'}</span></div>
  <div class="tile ${contradictions.length?'mg':''}"><span class="k">Contradictions</span><span class="v">${contradictions.length/2}</span><span class="n">sharpest signal in the graph</span></div>
  <div class="tile ${orphans.length?'am':'gr'}"><span class="k">Orphans</span><span class="v">${orphans.length}</span><span class="n">${orphans.length?'cannot compound':'everything connects'}</span></div>
</div>

<div class="grid g2">
  <div class="card"><h3>Taste engine <span class="tag ${craftDims.every(d=>!d.n)?'am':'gr'}">${craftDims.filter(d=>d.n>0).length}/${craftDims.length} craft dims</span></h3>
    <div class="pad">
      <div style="font:600 32px/1 var(--mono);color:var(--mg)">${tasteJudgments}<small style="font-size:15px;color:var(--dim2)"> / 50</small></div>
      <div class="bar"><i style="width:${Math.min(100,tasteJudgments/50*100)}%"></i></div>
      <p style="margin:11px 0 0;font-size:13px;color:var(--dim)">Ten judgments make it useful, fifty make it predictive.
      ${craftDims.filter(d=>d.n>0).length===0?'<b style="color:var(--am)">Every craft dimension still reads zero</b> — typography, motion, colour, layout, pacing.':''}</p>
    </div></div>

  <div class="card"><h3>Decision journal</h3>
    <div class="pad">
      <div style="font:600 32px/1 var(--mono);color:var(--cy)">${decisions.length}<small style="font-size:15px;color:var(--dim2)"> / 10</small></div>
      <div class="bar"><i style="width:${Math.min(100,decisions.length/10*100)}%"></i></div>
      <p style="margin:11px 0 0;font-size:13px;color:var(--dim)">Judgment is unmeasurable below ten entries with written expectations. Calibration needs resolved outcomes.</p>
    </div></div>
</div>

${dreams.length ? `<div class="card"><h3>Last dream <span class="tag">${esc(dreams[0].date)}</span></h3>
  ${dreams[0].findings.map(f=>`<div class="row"><span class="lb" style="color:var(--vi)">Finding</span><div class="bd"><b>${esc(f)}</b></div></div>`).join('')}
</div>` : ''}

<div class="note cy"><b>What this panel will never show.</b> Streaks, message counts, hours or money saved.
The metric a system displays becomes the thing it is optimised for — and at this stage the binding
constraint is learning rate, not throughput.</div>
`));

/* ── GRAPH ── */
out.push(view('graph', `
${head('Knowledge Graph', 'Colour is type, size is degree, opacity is confidence — unverified knowledge literally looks faint.')}
<div class="card">
  <canvas id="gc"></canvas>
  <div class="legend">
    <span><s style="background:var(--cy)"></s>entity</span>
    <span><s style="background:var(--vi)"></s>insight</span>
    <span><s style="background:var(--am)"></s>decision</span>
    <span><s style="background:var(--mg)"></s>taste</span>
    <span><s style="background:var(--dim2)"></s>episode</span>
    <span class="mut">faded = lower confidence</span>
  </div>
  <div class="ctl">
    <span class="tag">nodes ${nodes.length}</span>
    <span class="tag">edges ${edgeList.length}</span>
    <button class="btn on" id="bFlow">flow</button>
    <button class="btn" id="bLabels">all labels</button>
    <span class="spacer"></span><span class="tag">drag to explore</span>
  </div>
</div>
<div class="grid g2">
  <div class="card"><h3>Contradictions</h3>
    ${contradictions.length ? [...new Map(contradictions.map(e=>[[e.from,e.to].sort().join('|'),e])).values()].map(e=>
      `<div class="row"><span class="lb" style="color:var(--mg)">tension</span><div class="bd"><b>${esc(byId.get(e.from)?.title??e.from)}</b><p>vs ${esc(byId.get(e.to)?.title??e.to)}</p></div></div>`).join('')
      : '<div class="pad mut">None. In a young graph that means little.</div>'}
  </div>
  <div class="card"><h3>Health</h3>
    <div class="row"><span class="lb">orphans</span><div class="bd"><b style="color:var(--${orphans.length?'am':'gr'})">${orphans.length}</b><p>nodes connected to nothing cannot compound</p></div></div>
    <div class="row"><span class="lb">stale</span><div class="bd"><b style="color:var(--${stale.length?'am':'gr'})">${stale.length}</b><p>past review date, still reasoned from</p></div></div>
    <div class="row"><span class="lb">clusters</span><div class="bd"><b style="color:var(--${clusters===1?'gr':'am'})">${clusters}</b><p>more than one means regions with no path between them</p></div></div>
  </div>
</div>
`));

/* ── MEMORY ── */
const byType = {};
for (const n of nodes) (byType[n.type ?? 'other'] ??= []).push(n);
out.push(view('memory', `
${head('Memory', 'Plain Markdown, typed frontmatter, typed edges. Portable to any tool in any decade.')}
${Object.entries(byType).sort((a,b)=>b[1].length-a[1].length).map(([t, ns]) => `
<div class="card"><h3>${esc(t)} <span class="tag">${ns.length}</span></h3>
  ${ns.slice(0,14).map(n=>`<div class="row">
    <span class="lb" style="color:var(--${(TYPE_COLOR[t]??'--dim2').slice(2)})">${esc((n.subtype??t).slice(0,11))}</span>
    <div class="bd"><b>${esc(n.title??n.id)}</b><p>${esc((n.body.replace(/^#.*$/m,'').trim().split('\n').find(l=>l.trim()&&!l.startsWith('#'))??'').slice(0,130))}</p></div>
    <span class="rt">${n.confidence?esc(n.confidence):''}</span></div>`).join('')}
</div>`).join('')}
`));

/* ── MIND (engines) ── */
out.push(view('mind', `
${head('Engines', 'Always on. Not invoked — they are how the system thinks.')}
<div class="card">
${engines.map(e=>`<div class="row"><span class="lb" style="color:var(--cy)">${esc(e.name)}</span>
  <div class="bd"><p style="color:var(--tx);font-size:13.5px">${esc(e.blurb)}</p></div>
  <span class="rt">${esc(e.fires)}</span></div>`).join('')}
</div>
<div class="note cy"><b>Two are worth singling out.</b> <b>Taste</b> stores the reason, never the instance — and
predicts your reaction before showing you work, so a wrong prediction locates a specific wrong belief.
<b>Decision</b> demands a falsifiable expectation written before the outcome, because memory of your own
past decisions is systematically flattering.</div>
`));

/* ── COMMANDS ── */
out.push(view('commands', `
${head('Commands', 'Thin entry points. The intelligence lives in the engines and modules, not here.')}
<div class="card">
${commands.map(c=>`<div class="row"><span class="lb" style="color:var(--mg)">/${esc(c.name)}</span>
  <div class="bd"><p style="color:var(--tx);font-size:13.5px">${esc(c.desc)}</p></div></div>`).join('')}
</div>
<div class="note"><b>The daily habit is two commands.</b> <code>/think</code> before something that matters,
<code>/capture</code> after. Everything else is optional or scheduled. A system used twice a day beats an
elaborate one used never.</div>
`));

/* ── MODULES ── */
out.push(view('modules', `
${head('Modules', 'Capabilities. Contract-bound and hot-swappable — each declares what it needs as a capability, never as a tool.')}
<div class="grid g2">
${modules.map(m=>`<div class="card"><h3>${esc(m.module??m.name)} <span class="tag ${m.schedule?'cy':''}">${esc(m.schedule??m.depth??'')}</span></h3>
  <div class="pad" style="display:flex;flex-direction:column;gap:9px">
    <p style="margin:0;font-size:13.5px">${esc(m.purpose??'')}</p>
    <div style="display:flex;gap:6px;flex-wrap:wrap">${(m.requires??'').replace(/[\[\]]/g,'').split(',').filter(x=>x.trim()).map(r=>`<span class="tag">${esc(r.trim())}</span>`).join('')}</div>
    <p style="margin:0;font-size:12.5px;color:var(--dim)"><b style="color:var(--dim2)">VERIFY</b> ${esc(m['verify.evidence']??'—')}</p>
    <p style="margin:0;font-size:12.5px;color:var(--dim)"><b style="color:var(--dim2)">REVIEW</b> ${esc(m['review.target']??'—')}</p>
  </div></div>`).join('')}
</div>
`));

/* ── DREAMS ── */
out.push(view('dreams', `
${head('Dreams', 'While you sleep, the system works the graph — contradictions, distant pairs, orphans, absence. Nothing is a valid output.')}
${dreams.length ? dreams.map(d=>`<div class="card"><h3>☾ ${esc(d.date)} <span class="tag vi">${d.findings.length} finding${d.findings.length===1?'':'s'}</span></h3>
  <pre>${esc(d.body.slice(0,2600))}${d.body.length>2600?'\n\n…':''}</pre></div>`).join('')
 : '<div class="note">No dreams recorded yet.</div>'}
`));

/* ── ROUTINES ── */
out.push(view('routines', `
${head('Automations', 'Four scheduled runs, IST. Capture writes what happened, the dream works on it, the brief surfaces what is worth waking up to.')}
<div class="note rd"><b>The first unattended runs failed silently.</b> Both fired on schedule and produced
nothing — fresh sessions clone the default branch, where JARVIS does not exist. Every prompt now checks out
the branch first and <b>stops loudly</b> if the system is not there. Every routine must now leave a committed
trace even when the answer is "nothing happened", so a quiet night is visibly different from a crashed run.</div>
<div class="card"><h3>Schedule</h3>
${ROUTINES.map(r=>`<div class="row"><span class="lb" style="color:var(--cy)">${esc(r.ist)}</span>
  <div class="bd"><b>${esc(r.name)}</b><p>${esc(r.note)}</p></div>
  <span class="rt">${esc(r.cron)}</span></div>`).join('')}
</div>
<div class="note"><b>Autonomy is decided in advance, not at 2am.</b>
<span style="color:var(--gr)">PROCEED</span> — write memory, commit, push, run scripts: reversible, git is the undo.
<span style="color:var(--am)">QUEUE</span> — anything needing your judgment waits for the next brief.
<span style="color:var(--rd)">NEVER</span> — send to a person, publish, spend credits, force-push. Drafting proceeds; sending never.</div>
`));

/* ── CALIBRATION ── */
out.push(view('calibration', `
${head('Calibration', 'Whether the system is getting better at knowing you — not whether it has been busy.')}
<div class="note cy"><b>This slot holds calibration rather than spend.</b> The shell this is modelled on puts
an AI-spend ledger here — dollars, tokens, hours saved. That was deliberately not built: the metric a system
displays becomes the thing it optimises for, and hours-saved rewards volume of automation over quality of
judgment. These two numbers measure whether you are getting <b>better</b>.</div>
<div class="grid g2">
  <div class="tile mg"><span class="k">Taste prediction accuracy</span><span class="v">—<small> / ${predictions.length} sealed</small></span>
    <span class="n">Before showing you work, the system commits to predicting your reaction. A wrong
    prediction is the highest-value signal available — it locates a specific wrong belief instead of
    vaguely adjusting a profile. Rising accuracy means it genuinely knows you; flat means it is
    collecting judgments without learning.</span></div>
  <div class="tile cy"><span class="k">Decision accuracy</span><span class="v">—<small> / ${decisions.length} logged</small></span>
    <span class="n">Every decision carries a falsifiable expectation written before the outcome. At about
    ten resolved entries this starts producing real calibration — confidence bands, accuracy by domain,
    recurring failure shapes. Below that, any pattern is noise read as signal.</span></div>
</div>
<div class="card"><h3>Taste dimensions</h3>
${tasteDims.map(d=>`<div class="row"><span class="lb" style="color:var(--${d.n?'mg':'dim2'})">${esc(d.name)}</span>
  <div class="bd"><div class="bar" style="margin:0"><i style="width:${Math.min(100,d.n*20)}%"></i></div></div>
  <span class="rt">${d.n}</span></div>`).join('')}
</div>
`));

/* ── ADAPTERS ── */
out.push(view('adapters', `
${head('Integrations', 'The only layer that names a vendor. Everything above speaks in capabilities — swap a tool here and every module keeps working.')}
<div class="note"><b>Tool identifiers changed four times in thirty hours</b> during this build. That is why
nothing above this layer knows a vendor name. A coupled system would not have crashed — it would have
produced confident calls to tools that no longer exist, surfacing as strange output rather than an error.</div>
<div class="grid g2">
${caps.map(c=>`<div class="card"><div class="pad" style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start">
  <div><b style="font-size:14px;font-family:var(--mono);color:var(--cy)">${esc(c.cap)}</b>
    <p style="margin:4px 0 0;font-size:12.5px;color:var(--dim)">via ${esc(c.primary)}</p></div>
  <span class="tag ${c.env?'am':'gr'}">${c.env?'needs key':'bound'}</span></div></div>`).join('')}
${unbound.map(u=>`<div class="card"><div class="pad" style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start">
  <div><b style="font-size:14px;font-family:var(--mono);color:var(--dim2)">${esc(u)}</b>
    <p style="margin:4px 0 0;font-size:12.5px;color:var(--dim)">no adapter — fails cleanly and names the gap</p></div>
  <span class="tag rd">unbound</span></div></div>`).join('')}
</div>
`));

/* ── ACTIVITY ── */
out.push(view('activity', `
${head('Activity', 'Everything the system has touched, newest first. Git is the ledger.')}
<div class="card">
${activity.map(a=>`<div class="row"><span class="lb" style="color:var(--vi)">${esc(a.h)}</span>
  <div class="bd"><b style="font-weight:500;font-size:13.5px">${esc(a.s)}</b></div>
  <span class="rt">${esc(a.d.slice(0,10))}</span></div>`).join('')}
</div>
`));

/* ── DOCTOR ── */
out.push(view('doctor', `
${head('Diagnostics', 'The checks that keep the architecture honest.')}
<div class="grid g3">
  <div class="tile ${doctorOk?'gr':'am'}"><span class="k">Layer purity</span><span class="v">${doctorOk?'PASS':'FAIL'}</span>
    <span class="n">No vendor name appears in core, engines, or modules.</span></div>
  <div class="tile cy"><span class="k">Capabilities</span><span class="v">${caps.length}</span>
    <span class="n">${unbound.length} declared unbound — fails by name, never substitutes silently.</span></div>
  <div class="tile ${stale.length?'am':'gr'}"><span class="k">Stale beliefs</span><span class="v">${stale.length}</span>
    <span class="n">Past review and still being reasoned from.</span></div>
</div>
<div class="card"><h3>Run the checks</h3>
<pre>node scripts/doctor.mjs        # layer purity, capability coverage, graph integrity
node scripts/graph-report.mjs  # contradictions, orphans, bridges, stale
node scripts/run-audit.mjs     # what failed, went silent, was never used
node scripts/console.mjs > interface/console.html   # regenerate this shell</pre></div>
<div class="note rd"><b>A safeguard that has never fired is a hypothesis.</b> <code>run-audit</code> was
written to catch silent failures and then missed a real one — twice, on two independent bugs of its own.
Monitoring is code, and code written to check something else is never tested by the thing it monitors.
Treat every check here as unproven until you have watched it catch something real.</div>
`));

/* ─────────────────────────────────────────────────────── script */

out.push(`  </div></div></div>

<script>
(() => {
  const views=[...document.querySelectorAll('.view')], links=[...document.querySelectorAll('.nl')];
  function go(id){
    views.forEach(v=>v.classList.toggle('on', v.id==='v-'+id));
    links.forEach(l=>l.classList.toggle('on', l.dataset.v===id));
    if(id==='graph') size();
    document.querySelector('.wrap').scrollTo?.(0,0); window.scrollTo(0,0);
  }
  links.forEach(l=>l.onclick=()=>go(l.dataset.v));
  go('home');

  /* ── force-directed graph ── */
  const D=${JSON.stringify(graphData)};
  const cv=document.getElementById('gc'), cx=cv.getContext('2d');
  const css=getComputedStyle(document.documentElement);
  const col=t=>({entity:'--cy',insight:'--vi',decision:'--am',taste:'--mg',episode:'--dim2',question:'--gr'}[t]||'--dim2');
  const alpha=c=>({high:1,mixed:.9,medium:.72,low:.5,unverified:.38}[c]??.82);
  let W,H,flow=true,allLabels=false,drag=null,hover=null;

  const N=D.nodes.map((n,i)=>({...n,
    x:Math.cos(i/D.nodes.length*6.283)*150+300, y:Math.sin(i/D.nodes.length*6.283)*150+220, vx:0,vy:0}));
  const idx=new Map(N.map((n,i)=>[n.id,i]));
  const L=D.links.map(l=>({s:idx.get(l.s),t:idx.get(l.t),r:l.r})).filter(l=>l.s!=null&&l.t!=null);

  function size(){
    const d=Math.min(devicePixelRatio||1,2);
    W=cv.clientWidth; H=cv.clientHeight||440;
    cv.width=W*d; cv.height=H*d; cx.setTransform(d,0,0,d,0,0);
  }
  function step(){
    for(let i=0;i<N.length;i++){
      const a=N[i];
      for(let j=i+1;j<N.length;j++){
        const b=N[j]; let dx=b.x-a.x,dy=b.y-a.y,d2=dx*dx+dy*dy||1,d=Math.sqrt(d2);
        const f=2200/d2; dx/=d;dy/=d;
        a.vx-=dx*f;a.vy-=dy*f;b.vx+=dx*f;b.vy+=dy*f;
      }
      a.vx+=(W/2-a.x)*.0014; a.vy+=(H/2-a.y)*.0014;
    }
    for(const l of L){
      const a=N[l.s],b=N[l.t]; let dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1;
      const f=(d-96)*.011; dx/=d;dy/=d;
      a.vx+=dx*f;a.vy+=dy*f;b.vx-=dx*f;b.vy-=dy*f;
    }
    for(const n of N){
      if(n===drag)continue;
      n.vx*=.87;n.vy*=.87;n.x+=n.vx;n.y+=n.vy;
      n.x=Math.max(26,Math.min(W-26,n.x)); n.y=Math.max(26,Math.min(H-26,n.y));
    }
  }
  function draw(){
    cx.clearRect(0,0,W,H);
    for(const l of L){
      const a=N[l.s],b=N[l.t], bad=l.r==='contradicts';
      cx.strokeStyle=bad?'rgba(255,77,157,.5)':'rgba(69,224,216,.13)';
      cx.lineWidth=bad?1.5:1;
      cx.beginPath();cx.moveTo(a.x,a.y);cx.lineTo(b.x,b.y);cx.stroke();
    }
    for(const n of N){
      const r=4.5+Math.min(n.d,7)*1.4, c=css.getPropertyValue(col(n.ty)).trim();
      cx.globalAlpha=alpha(n.c)*.28; cx.fillStyle=c;
      cx.beginPath();cx.arc(n.x,n.y,r*2.4,0,6.283);cx.fill();
      cx.globalAlpha=alpha(n.c); cx.fillStyle=c;
      cx.beginPath();cx.arc(n.x,n.y,r,0,6.283);cx.fill();
      cx.globalAlpha=1;
      if(allLabels||n.d>=4||n===hover){
        cx.fillStyle=n===hover?css.getPropertyValue('--tx').trim():css.getPropertyValue('--dim').trim();
        cx.font='11px ui-monospace,Menlo,monospace';
        const t=n.t.length>30?n.t.slice(0,29)+'…':n.t;
        cx.fillText(t,n.x+r+6,n.y+4);
      }
    }
  }
  const at=e=>{const r=cv.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
    return N.find(n=>Math.hypot(n.x-x,n.y-y)<15)||null;};
  cv.addEventListener('pointerdown',e=>{drag=at(e); if(drag)cv.setPointerCapture(e.pointerId);});
  cv.addEventListener('pointermove',e=>{
    const r=cv.getBoundingClientRect();
    if(drag){drag.x=e.clientX-r.left;drag.y=e.clientY-r.top;drag.vx=drag.vy=0;}
    else{const h=at(e); if(h!==hover){hover=h;cv.style.cursor=h?'grab':'default';}}
  });
  addEventListener('pointerup',()=>drag=null);
  document.getElementById('bFlow').onclick=e=>{flow=!flow;e.target.classList.toggle('on',flow);};
  document.getElementById('bLabels').onclick=e=>{allLabels=!allLabels;e.target.classList.toggle('on',allLabels);};
  addEventListener('resize',size);
  size();
  (function loop(){ if(flow)step(); draw(); requestAnimationFrame(loop); })();
})();
</script>`);

console.log(out.join('\n'));
