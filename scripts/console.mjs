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
 * Honest about state, the way a good operator shell should be: panels that need
 * a backend say so on the panel rather than pretending. A UI that lies about
 * what is wired is worse than one that admits it.
 *
 * One deliberate substitution: the reference shell has an "AI Spend" view with
 * dollar ROI. That slot holds CALIBRATION here — taste prediction accuracy and
 * decision accuracy. The metric a system displays becomes the thing it
 * optimises for, and hours-saved rewards volume over judgment.
 *
 * Usage: node scripts/console.mjs > interface/console.html
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { ROOT, load } from './lib/graph.mjs';

const today = new Date().toISOString().slice(0, 10);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
const J = o => JSON.stringify(o).replace(/</g, '\\u003c');

/* ═══════════════════════════════════════════════ gather */

const { nodes, byId } = load();

const adj = new Map(nodes.map(n => [n.id, new Set()]));
const edgeList = [];
for (const n of nodes) for (const e of n.edges) {
  if (!byId.has(e.to)) continue;
  adj.get(n.id).add(e.to); adj.get(e.to).add(n.id);
  edgeList.push({ from: n.id, to: e.to, rel: e.rel });
}
const orphans = nodes.filter(n => (adj.get(n.id)?.size ?? 0) === 0);
const stale = nodes.filter(n => typeof n.review === 'string' && n.review < today);
const contra = [...new Map(edgeList.filter(e => e.rel === 'contradicts')
  .map(e => [[e.from, e.to].sort().join('|'), e])).values()];

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
const firstPara = text => {
  const b = text.replace(/^---[\s\S]*?---/, '').replace(/^#.*$/m, '').trim();
  const p = b.split(/\n\n/).find(x => x.trim() && !x.startsWith('#') && !x.startsWith('|'));
  return (p ?? '').replace(/\*\*/g, '').replace(/\n/g, ' ').slice(0, 175);
};

const FIRES = { reflection:'end of real work', taste:'craft work · corrections', decision:'strategic choices',
  idea:'daily · on new nodes', opportunity:'daily', curiosity:'continuous', evolution:'weekly' };
const engines = readdirSync(join(ROOT,'engines')).sort().map(name => ({
  name, fires: FIRES[name] ?? '—',
  blurb: firstPara(readFileSync(join(ROOT,'engines',name,'ENGINE.md'),'utf8')) }));

const commands = readdirSync(join(ROOT,'.claude/commands')).filter(f=>f.endsWith('.md')).sort().map(f => {
  const t = readFileSync(join(ROOT,'.claude/commands',f),'utf8');
  return { name: f.replace('.md',''), desc: fm(t).description ?? '' }; });

const modules = readdirSync(join(ROOT,'modules'))
  .filter(n => n!=='_template' && existsSync(join(ROOT,'modules',n,'MODULE.md')))
  .map(n => ({ name:n, ...fm(readFileSync(join(ROOT,'modules',n,'MODULE.md'),'utf8')) }));

const reg = readFileSync(join(ROOT,'adapters/registry.yaml'),'utf8');
const caps = [];
const capBlock = (reg.split(/^capabilities:\s*$/m)[1] ?? '').split(/^unbound:\s*$/m)[0];
for (const m of capBlock.matchAll(/^ {2}([a-z][a-z_]*\.[a-z][a-z_]*):\s*\n([\s\S]*?)(?=^ {2}[a-z]|\Z)/gm)) {
  caps.push({ cap:m[1],
    primary:(m[2].match(/primary:\s*(\S+)/)??[])[1] ?? '—',
    env:(m[2].match(/requires_env:\s*(\S+)/)??[])[1] ?? null,
    metered: /metered:/.test(m[2]) });
}
const unbound = [...((reg.split(/^unbound:\s*$/m)[1]) ?? '').matchAll(/^\s*-\s*([a-z][a-z_]*\.[a-z][a-z_]*)/gm)].map(x=>x[1]);

const dreamDir = join(ROOT,'memory/episodes/observations/dream');
const dreams = existsSync(dreamDir) ? readdirSync(dreamDir).filter(f=>f.endsWith('.md')).sort().reverse().map(f => {
  const raw = readFileSync(join(dreamDir,f),'utf8');
  return { date:f.replace('.md',''),
    findings:[...raw.matchAll(/^## (?:Finding \d+ — )?(.+)$/gm)].map(x=>x[1]).filter(t=>!/^(Not surfaced|Second opinion|What|Lesson|Fixes|Also|Why|Root|The)/.test(t)),
    body: raw.replace(/^---[\s\S]*?---/,'').trim() }; }) : [];

// episodes = the session log
const epRoot = join(ROOT,'memory/episodes');
function walkMd(d, out=[]) {
  if (!existsSync(d)) return out;
  for (const f of readdirSync(d)) {
    const p = join(d,f);
    if (statSync(p).isDirectory()) walkMd(p,out);
    else if (f.endsWith('.md')) out.push(p);
  } return out;
}
const episodes = walkMd(epRoot).map(p => {
  const t = readFileSync(p,'utf8'); const f = fm(t);
  return { id:f.id??'', title:f.title??p.split('/').pop(), date:f.created??'',
    kind:(f.subtype??f.type??'episode'), path:p.replace(ROOT+'/',''),
    body:t.replace(/^---[\s\S]*?---/,'').trim() };
}).sort((a,b)=>String(b.date).localeCompare(String(a.date)));

// documents = every memory node, searchable, with preview
const docs = nodes.map(n => ({
  id:n.id, title:n.title??n.id, type:n.type??'', sub:n.subtype??'',
  conf:n.confidence??'', review:n.review??'',
  path:n.file.replace(ROOT+'/',''), deg:adj.get(n.id)?.size??0,
  body:n.body.slice(0,2200) }));

let activity = [];
try { activity = execSync('git log -60 --format=%h%x1f%cI%x1f%s',{cwd:ROOT}).toString()
  .trim().split('\n').map(l=>{const[h,d,s]=l.split('\x1f');return{h,d,s};}); } catch {}

const ROUTINES = [
  { name:'Evening capture', ist:'21:30', cron:'0 16 * * *', id:'trig_016kaRd3FPjdF9gQUqdLk4UW',
    cmd:'/capture', note:'Reconstructs the day from git and changed files, then asks what artifacts cannot answer.', notif:false },
  { name:'Dream', ist:'02:00', cron:'30 20 * * *', id:'trig_01StL9APttrjhA5At6TCdzc6',
    cmd:'/dream', note:'Deep unprompted work on the graph. Nothing is a valid output.', notif:false },
  { name:'Morning brief', ist:'07:00', cron:'30 1 * * *', id:'trig_013ubk7b2643oUPPEKxAouDx',
    cmd:'/brief', note:'State, one opportunity, one thing worth thinking about. At most three items.', notif:true },
  { name:'Weekly evolution', ist:'Sun 10:00', cron:'30 4 * * 0', id:'trig_01WjrbRGxvNamJSErzsHwqKc',
    cmd:'/evolve', note:'Seven questions, each ending in a file edit. May patch modules, never the constitution.', notif:true },
];

const tasteProfile = nodes.find(n => n.id === 'n-taste-profile');
const tasteDims = [];
if (tasteProfile) for (const m of tasteProfile.body.matchAll(/^\|\s*([a-z]+)\s*\|\s*(\d+)\s*\|/gm)) tasteDims.push({name:m[1],n:+m[2]});
const tasteN = tasteDims.reduce((s,d)=>s+d.n,0);
const CRAFT = ['typography','motion','colour','layout','density','pacing','interaction'];
const craftDims = tasteDims.filter(d=>CRAFT.includes(d.name));
const decisions = nodes.filter(n=>n.type==='decision');
const predictions = nodes.filter(n=>n.subtype==='prediction');

// memory "gauge" — real bytes on disk
let memBytes = 0;
for (const p of walkMd(join(ROOT,'memory'))) memBytes += statSync(p).size;
const memPct = Math.min(100, memBytes / 2_000_000 * 100);

// week strip — commits per day, last 7
const week = [];
for (let i=6;i>=0;i--){
  const d = new Date(Date.now()-i*864e5).toISOString().slice(0,10);
  let c = 0;
  try { c = +execSync(`git log --since=${d}T00:00 --until=${d}T23:59 --oneline | wc -l`,{cwd:ROOT}).toString().trim(); } catch {}
  week.push({ d, c, l:'SMTWTFS'[new Date(d).getUTCDay()] });
}
const weekMax = Math.max(1, ...week.map(w=>w.c));

let doctorOk = true;
try { execSync('node scripts/doctor.mjs --quiet',{cwd:ROOT,stdio:'pipe'}); } catch { doctorOk = false; }

let auditSilent = [];
try {
  const a = JSON.parse(execSync('node scripts/run-audit.mjs --json',{cwd:ROOT}).toString());
  auditSilent = a.silent ?? [];
} catch {}

const graphData = {
  nodes: nodes.map(n=>({id:n.id,t:n.title??n.id,ty:n.type??'entity',c:n.confidence??'',d:adj.get(n.id)?.size??0})),
  links: edgeList.map(e=>({s:e.from,t:e.to,r:e.rel})),
};

/* ═══════════════════════════════════════════════ render */

const NAV = [
  ['home','Home','◈'],
  ['commands','Commands','⌘'],
  ['memory','Memory','◉'],
  ['graph','Knowledge Graph','◊'],
  ['activity','Activity','∿'],
  ['dreams','Dreams','☾'],
  ['documents','Documents','▤'],
  ['episodes','Episodes','▭'],
  ['routines','Automations','↻'],
  ['calibration','Calibration','⊹'],
  ['adapters','Integrations','⌗'],
];
const NAV2 = [['council','Council','⌬'], ['settings','Settings','⚙']];

const view = (id, inner) => `<section class="view" id="v-${id}">${inner}</section>`;
const head = (t,s) => `<div class="vh"><h1>${esc(t)}</h1><p>${esc(s)}</p></div>`;

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
.os{display:grid;grid-template-columns:230px 1fr;min-height:100vh;background:var(--bg);
  color:var(--tx);font:400 15px/1.6 var(--sans);
  background-image:radial-gradient(1100px 620px at 78% -8%,rgba(69,224,216,.055),transparent 62%),
                   radial-gradient(780px 540px at 3% 106%,rgba(255,77,157,.045),transparent 60%)}
@media(max-width:900px){.os{grid-template-columns:1fr}.side{display:none}}

.side{border-right:1px solid var(--rule);display:flex;flex-direction:column;
  background:linear-gradient(180deg,rgba(11,15,22,.95),rgba(6,8,12,.95));position:sticky;top:0;height:100vh}
.brand{display:flex;gap:11px;align-items:center;padding:17px 15px;border-bottom:1px solid var(--rule)}
.mark{width:29px;height:29px;border-radius:7px;display:grid;place-items:center;flex:none;
  background:linear-gradient(140deg,var(--cy),#1C8F92);color:#04222A;font-weight:800;font-size:14px;
  box-shadow:0 0 18px rgba(69,224,216,.42)}
.brand b{font:600 14px/1.1 var(--sans);display:block}
.brand span{font:500 9px/1 var(--mono);letter-spacing:.19em;color:var(--dim2);text-transform:uppercase}
nav{padding:10px 9px;display:flex;flex-direction:column;gap:1px;overflow-y:auto;flex:1}
.nl{display:flex;gap:10px;align-items:center;padding:7px 11px;border-radius:6px;cursor:pointer;
  color:var(--dim);font-size:13px;border:1px solid transparent;transition:.13s;
  background:none;width:100%;text-align:left;font-family:inherit}
.nl i{font-style:normal;width:13px;text-align:center;font-size:11px;color:var(--dim2)}
.nl:hover{color:var(--tx);background:rgba(69,224,216,.05)}
.nl.on{color:var(--cy);background:rgba(69,224,216,.09);border-color:rgba(69,224,216,.26);
  box-shadow:inset 0 0 22px rgba(69,224,216,.07)}
.nl.on i{color:var(--cy)}
.ngrp{font:500 9px/1 var(--mono);letter-spacing:.19em;color:var(--dim2);
  text-transform:uppercase;padding:15px 12px 6px}
.agt{margin:3px 9px;padding:9px 11px;border-radius:7px;border:1px solid rgba(69,224,216,.28);
  background:rgba(69,224,216,.07);color:var(--cy);font:600 11px/1 var(--mono);letter-spacing:.13em;
  text-align:center;cursor:pointer}
.agt.alt{border-color:rgba(255,77,157,.26);background:rgba(255,77,157,.06);color:var(--mg)}
.who{border-top:1px solid var(--rule);padding:12px 15px;display:flex;gap:10px;align-items:center}
.av{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;flex:none;
  background:rgba(255,77,157,.14);border:1px solid rgba(255,77,157,.34);color:var(--mg);font:600 9.5px var(--mono)}
.who b{font-size:12.5px;font-weight:600;display:block;line-height:1.25}
.who span{font:500 8.5px/1 var(--mono);letter-spacing:.16em;color:var(--dim2)}

.main{display:flex;flex-direction:column;min-width:0}
.top{display:flex;align-items:center;gap:11px;padding:0 24px;min-height:52px;
  border-bottom:1px solid var(--rule);background:rgba(6,8,12,.82);backdrop-filter:blur(11px);
  position:sticky;top:0;z-index:30;flex-wrap:wrap}
.crumb{font:500 12.5px var(--mono);color:var(--dim)}
.crumb b{color:var(--tx);font-weight:600}
.tag{font:500 9.5px/1 var(--mono);letter-spacing:.1em;padding:5px 8px;border-radius:4px;
  border:1px solid var(--rule2);color:var(--dim);text-transform:uppercase;white-space:nowrap}
.tag.cy{color:var(--cy);border-color:rgba(69,224,216,.34);background:rgba(69,224,216,.07)}
.tag.mg{color:var(--mg);border-color:rgba(255,77,157,.32);background:rgba(255,77,157,.06)}
.tag.vi{color:var(--vi);border-color:rgba(157,123,255,.3);background:rgba(157,123,255,.06)}
.tag.gr{color:var(--gr);border-color:rgba(61,220,151,.3);background:rgba(61,220,151,.06)}
.tag.am{color:var(--am);border-color:rgba(232,163,61,.3);background:rgba(232,163,61,.06)}
.tag.rd{color:var(--rd);border-color:rgba(255,95,109,.32);background:rgba(255,95,109,.07)}
.dot{width:6px;height:6px;border-radius:50%;background:var(--gr);display:inline-block;
  box-shadow:0 0 9px var(--gr);margin-right:5px;vertical-align:middle}
.spacer{flex:1}

.wrap{padding:24px;max-width:1220px;width:100%}
.view{display:none;flex-direction:column;gap:20px}
.view.on{display:flex;animation:in .2s ease}
@keyframes in{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
.vh h1{margin:0;font:400 29px/1.15 var(--sans);letter-spacing:-.022em}
.vh p{margin:5px 0 0;color:var(--dim);font-size:13.5px;max-width:76ch}

.card{border:1px solid var(--rule);border-radius:9px;background:var(--panel);overflow:hidden}
.card>h3{margin:0;padding:11px 15px;border-bottom:1px solid var(--rule);
  font:500 10px/1 var(--mono);letter-spacing:.17em;text-transform:uppercase;color:var(--dim);
  display:flex;justify-content:space-between;align-items:center;gap:10px}
.pad{padding:15px}
.grid{display:grid;gap:13px}
.g2{grid-template-columns:repeat(auto-fit,minmax(300px,1fr))}
.g3{grid-template-columns:repeat(auto-fit,minmax(215px,1fr))}
.g4{grid-template-columns:repeat(auto-fit,minmax(160px,1fr))}

.tile{border:1px solid var(--rule);border-radius:9px;background:var(--panel);padding:14px 15px;
  display:flex;flex-direction:column;gap:3px;position:relative;overflow:hidden}
.tile::after{content:'';position:absolute;left:0;top:0;bottom:0;width:2px;background:var(--rule2)}
.tile.cy::after{background:var(--cy);box-shadow:0 0 13px var(--cy)}
.tile.mg::after{background:var(--mg);box-shadow:0 0 13px var(--mg)}
.tile.am::after{background:var(--am);box-shadow:0 0 13px var(--am)}
.tile.gr::after{background:var(--gr);box-shadow:0 0 13px var(--gr)}
.tile.vi::after{background:var(--vi);box-shadow:0 0 13px var(--vi)}
.tile .k{font:500 9px/1 var(--mono);letter-spacing:.17em;text-transform:uppercase;color:var(--dim2)}
.tile .v{font:600 26px/1.1 var(--mono);letter-spacing:-.025em;font-variant-numeric:tabular-nums}
.tile .v small{font-size:13px;color:var(--dim2);font-weight:400}
.tile .n{font-size:11.5px;color:var(--dim);line-height:1.45}
.tile.cy .v{color:var(--cy)} .tile.mg .v{color:var(--mg)} .tile.am .v{color:var(--am)}
.tile.gr .v{color:var(--gr)} .tile.vi .v{color:var(--vi)}

.bar{height:5px;border-radius:3px;background:var(--rule);overflow:hidden;margin-top:7px}
.bar i{display:block;height:100%;border-radius:3px;background:linear-gradient(90deg,var(--cy),var(--mg))}

.row{display:flex;gap:12px;padding:10px 15px;border-bottom:1px solid var(--rule);align-items:baseline}
.row:last-child{border-bottom:none}
.row .lb{font:500 9px/1.55 var(--mono);letter-spacing:.13em;text-transform:uppercase;
  color:var(--dim2);width:94px;flex:none}
.row .bd{flex:1;min-width:0}
.row .bd b{font-weight:600;font-size:13.5px}
.row .bd p{margin:2px 0 0;font-size:12px;color:var(--dim);line-height:1.5}
.row .rt{font:500 10px var(--mono);color:var(--dim2);white-space:nowrap}
.row:hover{background:rgba(69,224,216,.03)}
.row.sel{background:rgba(69,224,216,.07)}
.row.clk{cursor:pointer}

code{font-family:var(--mono);font-size:.87em;background:rgba(69,224,216,.08);
  color:var(--cy);padding:2px 5px;border-radius:3px}

/* chat */
.chat{display:grid;grid-template-columns:54px 1fr;min-height:390px;border:1px solid var(--rule);
  border-radius:10px;background:var(--panel);overflow:hidden}
@media(max-width:640px){.chat{grid-template-columns:1fr}.rail{display:none}}
.rail{border-right:1px solid var(--rule);padding:9px 0;display:flex;flex-direction:column;
  gap:6px;align-items:center;background:rgba(6,8,12,.5);overflow-y:auto;max-height:430px}
.rail .nb{width:34px;height:34px;border-radius:7px;border:1px dashed var(--rule2);color:var(--dim2);
  background:none;cursor:pointer;font-size:16px;line-height:1}
.rail .th{width:34px;height:26px;border-radius:5px;border:1px solid var(--rule);
  background:linear-gradient(140deg,rgba(69,224,216,.09),rgba(255,77,157,.05));cursor:pointer;flex:none}
.rail .th:hover{border-color:var(--cy)}
.stage{display:flex;flex-direction:column;position:relative}
.stage>.hd{display:flex;align-items:center;gap:9px;padding:11px 15px;border-bottom:1px solid var(--rule)}
.stage>.hd b{font:500 12px var(--mono);color:var(--dim);letter-spacing:.09em}
.canvasarea{flex:1;display:grid;place-items:center;padding:34px 20px;position:relative;overflow:hidden}
.glyph{position:absolute;inset:0;display:grid;place-items:center;opacity:.13;pointer-events:none}
.glyph svg{width:min(360px,62%);height:auto}
.bigname{font:600 clamp(26px,4.6vw,44px)/1 var(--mono);letter-spacing:.19em;
  background:linear-gradient(100deg,var(--cy),var(--vi) 55%,var(--mg));
  -webkit-background-clip:text;background-clip:text;color:transparent;text-align:center;position:relative}
.sub{margin-top:11px;font:500 11px var(--mono);letter-spacing:.15em;color:var(--dim2);
  text-align:center;position:relative;text-transform:uppercase}
.composer{border-top:1px solid var(--rule);padding:11px 13px;display:flex;flex-direction:column;gap:9px}
.crow{display:flex;gap:7px;flex-wrap:wrap;align-items:center}
.inp{flex:1;min-width:180px;background:var(--panel2);border:1px solid var(--rule2);border-radius:7px;
  padding:10px 13px;color:var(--tx);font:400 13.5px var(--sans);outline:none}
.inp:focus{border-color:rgba(69,224,216,.5);box-shadow:0 0 0 3px rgba(69,224,216,.08)}
.inp::placeholder{color:var(--dim2)}
.send{padding:10px 17px;border-radius:7px;border:1px solid rgba(69,224,216,.4);
  background:rgba(69,224,216,.13);color:var(--cy);font:600 11px var(--mono);letter-spacing:.14em;
  cursor:pointer;text-transform:uppercase}
.send:hover{background:rgba(69,224,216,.2)}
select.sel2{background:var(--panel2);border:1px solid var(--rule2);border-radius:6px;padding:6px 9px;
  color:var(--tx);font:500 11px var(--mono);outline:none;cursor:pointer}

.btn{font:500 10px var(--mono);letter-spacing:.11em;text-transform:uppercase;padding:6px 11px;
  border-radius:5px;border:1px solid var(--rule2);background:var(--panel2);color:var(--dim);
  cursor:pointer;transition:.13s}
.btn:hover{color:var(--tx);border-color:var(--cy)}
.btn.on{color:var(--cy);border-color:rgba(69,224,216,.5);background:rgba(69,224,216,.1)}
.btn.mg{color:var(--mg);border-color:rgba(255,77,157,.4);background:rgba(255,77,157,.08)}

#gc{display:block;width:100%;height:430px;touch-action:none;cursor:grab}
.legend{display:flex;gap:14px;flex-wrap:wrap;padding:10px 15px;border-top:1px solid var(--rule);
  font:500 10px var(--mono);color:var(--dim2);letter-spacing:.06em}
.legend s{width:8px;height:8px;border-radius:50%;display:inline-block;margin-right:6px;text-decoration:none}
.ctl{display:flex;gap:7px;flex-wrap:wrap;align-items:center;padding:10px 15px;border-top:1px solid var(--rule)}
input[type=range]{accent-color:var(--cy);width:110px}

.note{border:1px solid var(--rule);border-left:2px solid var(--am);border-radius:7px;
  background:rgba(232,163,61,.045);padding:13px 15px;font-size:13px;color:var(--dim);max-width:80ch}
.note.rd{border-left-color:var(--rd);background:rgba(255,95,109,.05)}
.note.cy{border-left-color:var(--cy);background:rgba(69,224,216,.045)}
.note b{color:var(--tx)}

pre{margin:0;padding:14px 16px;overflow-x:auto;font:400 12px/1.7 var(--mono);
  color:var(--dim);white-space:pre-wrap;word-break:break-word;max-height:460px}
.mut{color:var(--dim2)}
.split{display:grid;grid-template-columns:minmax(0,300px) minmax(0,1fr);gap:13px;align-items:start}
@media(max-width:800px){.split{grid-template-columns:1fr}}
.scrolly{max-height:520px;overflow-y:auto}
.wk{display:flex;gap:5px;align-items:flex-end;height:44px;margin-top:8px}
.wk div{flex:1;display:flex;flex-direction:column;align-items:center;gap:5px}
.wk i{display:block;width:100%;border-radius:2px;background:linear-gradient(180deg,var(--cy),rgba(69,224,216,.24))}
.wk span{font:500 8.5px var(--mono);color:var(--dim2)}
@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
</style>

<div class="os">
<aside class="side">
  <div class="brand"><div class="mark">J</div><div><b>JARVIS</b><span>cognitive os</span></div></div>
  <nav>
    ${NAV.map(([id,l,ic])=>`<button class="nl" data-v="${id}"><i>${ic}</i>${l}</button>`).join('')}
    <div class="ngrp">Reasoning</div>
    ${NAV2.map(([id,l,ic])=>`<button class="nl" data-v="${id}"><i>${ic}</i>${l}</button>`).join('')}
    <div class="ngrp">Modules</div>
    ${modules.map((m,i)=>`<div class="agt${i?' alt':''}" data-v="modules">${esc((m.module??m.name).toUpperCase())}</div>`).join('')}
  </nav>
  <div class="who"><div class="av">AA</div><div><b>Aaryaman</b><span>operator</span></div></div>
</aside>

<div class="main">
  <div class="top">
    <span class="crumb"><b>Operator</b> / jarvis</span>
    <span class="tag">${today}</span>
    <span class="spacer"></span>
    ${auditSilent.length?`<span class="tag rd">${auditSilent.length} silent</span>`:''}
    <span class="tag ${doctorOk?'gr':'rd'}"><span class="dot" style="background:var(--${doctorOk?'gr':'rd'})"></span>${doctorOk?'doctor pass':'doctor fail'}</span>
    <span class="tag cy">opus 5</span>
  </div>
  <div class="wrap">`);

/* ── HOME ── */
out.push(view('home', `
<div class="note cy"><b>The chat below is a shell.</b> It needs a local runner to actually send —
<code>claude -p</code> against this repo. Everything else on this page is read from the live graph.
Saying so on the panel beats a UI that pretends to be wired.</div>

<div class="grid g2">
  <div class="card"><h3>Memory <span class="tag">on disk</span></h3><div class="pad">
    <div style="font:600 27px/1 var(--mono);color:var(--cy)">${(memBytes/1024).toFixed(1)}K<small style="font-size:13px;color:var(--dim2)"> / 2.0M budget</small></div>
    <div class="bar"><i style="width:${memPct.toFixed(1)}%"></i></div>
    <p style="margin:9px 0 0;font:500 10px var(--mono);letter-spacing:.11em;color:var(--dim2)">${memPct.toFixed(0)}% · ${nodes.length} NODES · MEMORY/</p>
  </div></div>
  <div class="card"><h3>This week <span class="tag">commits</span></h3><div class="pad">
    <div class="wk">${week.map(w=>`<div><i style="height:${Math.max(3,w.c/weekMax*34)}px;opacity:${w.c?1:.22}"></i><span>${w.l}</span></div>`).join('')}</div>
  </div></div>
</div>

<div class="chat">
  <div class="rail">
    <button class="nb" title="new">+</button>
    ${episodes.slice(0,11).map(()=>`<div class="th"></div>`).join('')}
  </div>
  <div class="stage">
    <div class="hd"><b>❯ NEW SESSION</b><span class="spacer"></span>
      <button class="btn">◨ speak</button><button class="btn">◉ voice</button></div>
    <div class="canvasarea">
      <div class="glyph"><svg viewBox="0 0 400 300" fill="none" stroke="#45E0D8" stroke-width="1">
        <circle cx="200" cy="150" r="118"/><circle cx="200" cy="150" r="86"/><circle cx="200" cy="150" r="52"/>
        <path d="M200 32v236M82 150h236"/><path d="M118 68l164 164M282 68L118 232"/>
        <rect x="176" y="126" width="48" height="48" transform="rotate(45 200 150)"/>
      </svg></div>
      <div><div class="bigname">JARVIS</div><div class="sub">❯ start a new conversation</div></div>
    </div>
    <div class="composer">
      <div class="crow">
        <select class="sel2"><option>claude-opus-5</option></select>
        <select class="sel2"><option>medium</option><option>low</option><option>high</option><option>max</option></select>
        <button class="btn">❯ command</button>
        <button class="btn mg">⌬ council</button>
        <span class="spacer"></span><span class="tag">shell only</span>
      </div>
      <div class="crow">
        <input class="inp" placeholder="Ask JARVIS anything…">
        <button class="send">send</button>
      </div>
    </div>
  </div>
</div>

<div class="grid g4">
  <div class="tile cy"><span class="k">Graph nodes</span><span class="v">${nodes.length}</span><span class="n">${edgeList.length} typed edges</span></div>
  <div class="tile ${clusters===1?'gr':'am'}"><span class="k">Clusters</span><span class="v">${clusters}</span><span class="n">${clusters===1?'fully connected':'disconnected regions'}</span></div>
  <div class="tile ${contra.length?'mg':''}"><span class="k">Contradictions</span><span class="v">${contra.length}</span><span class="n">sharpest signal in the graph</span></div>
  <div class="tile ${orphans.length?'am':'gr'}"><span class="k">Orphans</span><span class="v">${orphans.length}</span><span class="n">${orphans.length?'cannot compound':'everything connects'}</span></div>
</div>

${dreams.length?`<div class="card"><h3>Last dream <span class="tag vi">${esc(dreams[0].date)}</span></h3>
${dreams[0].findings.map(f=>`<div class="row"><span class="lb" style="color:var(--vi)">finding</span><div class="bd"><b>${esc(f)}</b></div></div>`).join('')||'<div class="pad mut">No findings — a valid output.</div>'}</div>`:''}

<div class="note"><b>What this shell will never show.</b> Streaks, message counts, hours or money saved.
The metric a system displays becomes the thing it is optimised for — and the binding constraint here is
learning rate, not throughput.</div>
`));

/* ── COMMANDS ── */
out.push(view('commands', `
${head('Commands','Thin entry points. The intelligence lives in the engines and modules, not here.')}
<div class="grid g2">
${commands.map(c=>`<div class="card"><div class="pad" style="display:flex;flex-direction:column;gap:6px">
  <b style="font:600 14px var(--mono);color:var(--mg)">/${esc(c.name)}</b>
  <p style="margin:0;font-size:13px;color:var(--dim)">${esc(c.desc)}</p></div></div>`).join('')}
</div>
<div class="note"><b>The daily habit is two commands.</b> <code>/think</code> before something that matters,
<code>/capture</code> after. A system used twice a day beats an elaborate one used never.</div>

${head('Engines','Always on. Not invoked — they are how the system thinks.')}
<div class="card">
${engines.map(e=>`<div class="row"><span class="lb" style="color:var(--cy)">${esc(e.name)}</span>
  <div class="bd"><p style="color:var(--tx);font-size:13px">${esc(e.blurb)}</p></div>
  <span class="rt">${esc(e.fires)}</span></div>`).join('')}
</div>
`));

/* ── MEMORY ── */
const byType = {};
for (const n of nodes) (byType[n.type ?? 'other'] ??= []).push(n);
out.push(view('memory', `
${head('Memory','Three systems: episodic (immutable), semantic (revisable, decays), procedural (executes).')}
<div class="grid g4">
  <div class="tile cy"><span class="k">Total</span><span class="v">${nodes.length}</span><span class="n">${(memBytes/1024).toFixed(0)}K on disk</span></div>
  ${Object.entries(byType).sort((a,b)=>b[1].length-a[1].length).slice(0,3).map(([t,ns])=>
    `<div class="tile"><span class="k">${esc(t)}</span><span class="v">${ns.length}</span><span class="n">&nbsp;</span></div>`).join('')}
</div>
${Object.entries(byType).sort((a,b)=>b[1].length-a[1].length).map(([t,ns])=>`
<div class="card"><h3>${esc(t)} <span class="tag">${ns.length}</span></h3>
${ns.map(n=>`<div class="row"><span class="lb" style="color:var(--${({entity:'cy',insight:'vi',decision:'am',taste:'mg',episode:'dim2',question:'gr'})[t]??'dim2'})">${esc((n.subtype??t).slice(0,11))}</span>
  <div class="bd"><b>${esc(n.title??n.id)}</b><p>${esc((n.body.replace(/^#.*$/m,'').trim().split('\n').find(l=>l.trim()&&!l.startsWith('#'))??'').slice(0,140))}</p></div>
  <span class="rt">${esc(n.confidence??'')}</span></div>`).join('')}
</div>`).join('')}
`));

/* ── GRAPH ── */
out.push(view('graph', `
${head('Knowledge Graph','Colour is type, size is degree, opacity is confidence — unverified knowledge literally looks faint. Contradiction edges glow magenta.')}
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
    <span class="tag">layout</span>
    <button class="btn lay on" data-l="macro">macro</button>
    <button class="btn lay" data-l="mid">mid</button>
    <button class="btn lay" data-l="micro">micro</button>
    <button class="btn lay" data-l="full">full</button>
    <span class="spacer"></span>
    <button class="btn on" id="bFlow">▸ flow</button>
    <button class="btn" id="bLabels">labels</button>
    <span class="tag">links</span><input type="range" id="rLinks" min="0" max="100" value="100">
  </div>
  <div class="ctl" style="border-top:1px solid var(--rule)">
    <span class="tag">nodes ${nodes.length}</span><span class="tag">edges ${edgeList.length}</span>
    <span class="tag">clusters ${clusters}</span>
    <span class="spacer"></span><span class="tag mut">drag a node to explore</span>
  </div>
</div>
<div class="grid g3">
  <div class="card"><h3>Contradictions</h3>
    ${contra.length?contra.map(e=>`<div class="row"><span class="lb" style="color:var(--mg)">tension</span>
      <div class="bd"><b>${esc(byId.get(e.from)?.title??e.from)}</b><p>vs ${esc(byId.get(e.to)?.title??e.to)}</p></div></div>`).join('')
      :'<div class="pad mut">None found.</div>'}</div>
  <div class="card"><h3>Stale</h3>
    ${stale.length?stale.map(n=>`<div class="row"><span class="lb" style="color:var(--am)">due</span>
      <div class="bd"><b>${esc(n.title)}</b></div><span class="rt">${esc(n.review)}</span></div>`).join('')
      :'<div class="pad mut">Nothing past review.</div>'}</div>
  <div class="card"><h3>Orphans</h3>
    ${orphans.length?orphans.map(n=>`<div class="row"><span class="lb" style="color:var(--rd)">orphan</span>
      <div class="bd"><b>${esc(n.title)}</b><p>connected to nothing — cannot compound</p></div></div>`).join('')
      :'<div class="pad mut">Everything connects.</div>'}</div>
</div>
`));

/* ── ACTIVITY ── */
out.push(view('activity', `
${head('Activity','Everything the system has touched, newest first. Git is the ledger — nothing is claimed that is not committed.')}
<div class="card scrolly">
${activity.map(a=>`<div class="row"><span class="lb" style="color:var(--vi)">${esc(a.h)}</span>
  <div class="bd"><b style="font-weight:500;font-size:13px">${esc(a.s)}</b></div>
  <span class="rt">${esc(a.d.slice(0,10))}</span></div>`).join('')}
</div>
`));

/* ── DREAMS ── */
out.push(view('dreams', `
${head('Dreams','While you sleep the system works the graph — contradictions, distant pairs, orphans, absence. Nothing is a valid output.')}
<div class="note rd"><b>The first two unattended runs produced nothing.</b> Fresh sessions clone the default
branch, where JARVIS does not exist. Every routine now checks out the branch first, stops loudly if the
system is absent, and must leave a committed trace even when the answer is "nothing found".</div>
${dreams.length?dreams.map(d=>`<div class="card"><h3>☾ ${esc(d.date)} <span class="tag vi">${d.findings.length} finding${d.findings.length===1?'':'s'}</span></h3>
  <pre>${esc(d.body.slice(0,3000))}${d.body.length>3000?'\n\n…':''}</pre></div>`).join('')
 :'<div class="note">No dreams recorded yet.</div>'}
`));

/* ── DOCUMENTS ── */
out.push(view('documents', `
${head('Documents','Every memory node, searchable. Plain Markdown with typed frontmatter — portable to any tool in any decade.')}
<input class="inp" id="dq" placeholder="Search ${docs.length} documents…" style="max-width:100%">
<div class="split">
  <div class="card scrolly" id="dlist"></div>
  <div class="card"><h3 id="dtitle">Select a document</h3><pre id="dbody" class="mut">Nothing selected.</pre></div>
</div>
`));

/* ── EPISODES ── */
out.push(view('episodes', `
${head('Episodes','What happened. Append-only and immutable — a correction is a new node that supersedes, never an edit.')}
<input class="inp" id="eq" placeholder="Search ${episodes.length} episodes…" style="max-width:100%">
<div class="card scrolly" id="elist"></div>
`));

/* ── ROUTINES ── */
out.push(view('routines', `
${head('Automations','Four scheduled runs, IST. Capture writes what happened, the dream works on it, the brief surfaces what is worth waking up to.')}
<div class="card"><h3>New automation <span class="tag">shell only</span></h3><div class="pad">
  <div class="crow" style="margin-bottom:9px">
    <input class="inp" placeholder="Name — e.g. Weekly portfolio read">
    <select class="sel2">${['02:00','07:00','09:00','12:00','18:00','21:30'].map(t=>`<option>${t}</option>`).join('')}</select>
  </div>
  <input class="inp" placeholder="What should run? Written as a complete standalone instruction — a fresh session has no context." style="max-width:100%">
  <div style="margin-top:10px"><button class="send">+ schedule</button></div>
</div></div>

${ROUTINES.map(r=>`<div class="card"><div class="pad" style="display:flex;gap:13px;align-items:flex-start;flex-wrap:wrap">
  <div style="flex:1;min-width:220px">
    <div style="display:flex;gap:8px;align-items:center;margin-bottom:4px">
      <b style="font-size:14px">${esc(r.name)}</b>
      <span class="tag cy">${esc(r.cmd)}</span>
      ${r.notif?'<span class="tag gr">push</span>':''}
    </div>
    <p style="margin:0;font-size:12.5px;color:var(--dim)">${esc(r.note)}</p>
    <p style="margin:5px 0 0;font:500 10px var(--mono);color:var(--dim2)">${esc(r.id)}</p>
  </div>
  <div style="display:flex;gap:7px;align-items:center">
    <span class="tag am">${esc(r.ist)} IST</span>
    <span class="tag">${esc(r.cron)}</span>
    <button class="btn">▸ run now</button>
  </div></div></div>`).join('')}

<div class="note"><b>Autonomy is decided in advance, not at 2am.</b>
<span style="color:var(--gr)">PROCEED</span> — write memory, commit, push, run scripts. Reversible; git is the undo.
<span style="color:var(--am)">QUEUE</span> — anything needing your judgment waits for the next brief.
<span style="color:var(--rd)">NEVER</span> — send to a person, publish, spend credits, force-push.
Drafting proceeds; sending never. A model deciding at 2am whether something is risky will occasionally
decide wrong, and the failure is unwitnessed.</div>
`));

/* ── CALIBRATION ── */
out.push(view('calibration', `
${head('Calibration','Whether the system is getting better at knowing you — not whether it has been busy.')}
<div class="note cy"><b>This slot holds calibration rather than spend.</b> The shell this is modelled on puts
an AI-spend ledger here — dollars, tokens, hours saved, ROI. That was deliberately not built: the metric a
system displays becomes the thing it optimises for, and hours-saved rewards volume of automation over
quality of judgment. These two numbers measure whether you are getting <b>better</b>.</div>
<div class="grid g2">
  <div class="tile mg"><span class="k">Taste prediction accuracy</span><span class="v">—<small> / ${predictions.length} sealed</small></span>
    <span class="n">Before showing you work the system commits to predicting your reaction. A wrong prediction
    is the highest-value signal available — it locates a specific wrong belief instead of vaguely adjusting a
    profile. Rising means it knows you; flat means it is collecting without learning.</span></div>
  <div class="tile cy"><span class="k">Decision accuracy</span><span class="v">—<small> / ${decisions.length} logged</small></span>
    <span class="n">Every decision carries a falsifiable expectation written before the outcome. At roughly
    ten resolved entries this produces real calibration — confidence bands, accuracy by domain, recurring
    failure shapes. Below that any pattern is noise read as signal.</span></div>
</div>
<div class="card"><h3>Taste dimensions <span class="tag ${craftDims.some(d=>d.n)?'gr':'am'}">${craftDims.filter(d=>d.n>0).length}/${craftDims.length} craft read</span></h3>
${tasteDims.map(d=>`<div class="row"><span class="lb" style="color:var(--${d.n?'mg':'dim2'})">${esc(d.name)}</span>
  <div class="bd"><div class="bar" style="margin:0"><i style="width:${Math.min(100,d.n*20)}%"></i></div></div>
  <span class="rt">${d.n}</span></div>`).join('')}
</div>
<div class="card"><h3>Decision journal</h3>
${decisions.map(d=>`<div class="row"><span class="lb" style="color:var(--am)">${esc(d.status??'open')}</span>
  <div class="bd"><b>${esc(d.title)}</b><p>confidence ${esc(d.confidence??'—')} · review ${esc(d.review??'—')}</p></div></div>`).join('')||'<div class="pad mut">None logged.</div>'}
</div>
`));

/* ── ADAPTERS ── */
out.push(view('adapters', `
${head('Integrations','The only layer that names a vendor. Everything above speaks in capabilities — swap a tool here and every module keeps working.')}
<div class="note"><b>Tool identifiers changed four times in thirty hours</b> during this build. That is why
nothing above this layer knows a vendor name. A coupled system would not have crashed — it would have
produced confident calls to tools that no longer exist, surfacing as strange output rather than an error.</div>
<div class="grid g2">
${caps.map(c=>`<div class="card"><div class="pad" style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start">
  <div><b style="font-size:13.5px;font-family:var(--mono);color:var(--cy)">${esc(c.cap)}</b>
    <p style="margin:4px 0 0;font-size:12px;color:var(--dim)">via ${esc(c.primary)}${c.metered?' · metered':''}</p></div>
  <span class="tag ${c.env?'am':'gr'}">${c.env?'needs key':'bound'}</span></div></div>`).join('')}
${unbound.map(u=>`<div class="card"><div class="pad" style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start">
  <div><b style="font-size:13.5px;font-family:var(--mono);color:var(--dim2)">${esc(u)}</b>
    <p style="margin:4px 0 0;font-size:12px;color:var(--dim)">no adapter — fails cleanly and names the gap</p></div>
  <span class="tag rd">unbound</span></div></div>`).join('')}
</div>
`));

/* ── COUNCIL ── */
const BENCH = [
  {n:'Claude Opus 5',    r:'orchestrator', on:true,  note:'the model this system runs on'},
  {n:'ChatGPT',          r:'expert 1',     on:true,  note:'paste lane — uses your subscription'},
  {n:'Gemini',           r:'expert 2',     on:true,  note:'paste lane — uses your subscription'},
  {n:'openai-api',       r:'unbound',      on:false, note:'needs OPENAI_API_KEY · billed separately from Plus'},
  {n:'gemini-api',       r:'unbound',      on:false, note:'needs GEMINI_API_KEY · free tier is rate-limited'},
];
out.push(view('council', `
${head('Council','Convene other models and treat where they disagree as the output.')}
<div class="note cy"><b>Agreement between models is weak evidence; disagreement is strong.</b> A model
critiquing its own answer shares its own priors — self-critique catches sloppiness, not systematic error,
and systematic error is the expensive kind. When they converge you have learned the question was easy.
When they split you have found the real uncertainty.</div>
<div class="split">
  <div class="card"><h3>The bench</h3>
  ${BENCH.map(b=>`<div class="row"><span class="lb" style="color:var(--${b.on?'cy':'dim2'})">${esc(b.r)}</span>
    <div class="bd"><b>${esc(b.n)}</b><p>${esc(b.note)}</p></div>
    <span class="tag ${b.on?'gr':'am'}">${b.on?'live':'no key'}</span></div>`).join('')}
  </div>
  <div class="card"><h3>Panel</h3><div class="pad" style="text-align:center;padding:26px 15px">
    <div style="display:inline-flex;flex-direction:column;align-items:center;gap:9px">
      <div style="width:78px;height:78px;border-radius:50%;display:grid;place-items:center;
        border:1px solid rgba(69,224,216,.45);background:rgba(69,224,216,.08);
        box-shadow:0 0 34px rgba(69,224,216,.2);font:600 11px var(--mono);color:var(--cy)">CORE</div>
      <span class="tag cy">orchestrator · opus 5</span>
    </div>
    <div style="height:24px;width:1px;background:var(--rule2);margin:11px auto"></div>
    <div style="display:flex;gap:11px;justify-content:center;flex-wrap:wrap">
      ${['ChatGPT','Gemini'].map(x=>`<div style="display:flex;flex-direction:column;align-items:center;gap:7px">
        <div style="width:56px;height:56px;border-radius:50%;display:grid;place-items:center;
          border:1px solid rgba(255,77,157,.35);background:rgba(255,77,157,.06);
          font:600 9.5px var(--mono);color:var(--mg)">${esc(x.slice(0,7).toUpperCase())}</div>
        <span class="tag">independent</span></div>`).join('')}
    </div>
    <p style="margin:17px auto 0;font-size:12.5px;color:var(--dim);max-width:38ch">
      Second opinions run <b style="color:var(--tx)">cold</b> — the panel never sees the primary answer.
      A second opinion that has seen the first is not independent; it produces agreement shaped like
      corroboration, which is worse than none.</p>
  </div></div>
</div>
<div class="card"><h3>Run a panel</h3><div class="pad">
<pre>node scripts/council.mjs "should I productise the motion work?"
node scripts/council.mjs "&lt;claim&gt;" --adversary
node scripts/council.mjs "&lt;q&gt;" --critique --answer answer.md</pre>
<p style="margin:11px 0 0;font-size:12.5px;color:var(--dim)">Compiles the question plus the relevant graph
region into a block for any chat interface. Zero setup, zero marginal cost. Paste the responses back and
run <code>/ingest</code> — <b style="color:var(--tx)">the disagreement is the payload</b>.</p>
</div></div>
`));

/* ── SETTINGS ── */
out.push(view('settings', `
${head('Settings','Local configuration and the checks that keep the architecture honest.')}
<div class="card"><h3>Configuration</h3>
  <div class="row"><span class="lb">chat</span><div class="bd"><b>Shell only</b><p>Needs a local runner — <code>claude -p</code> against this repo</p></div><span class="tag am">not wired</span></div>
  <div class="row"><span class="lb">source</span><div class="bd"><b>Live graph</b><p>Generated by scripts/console.mjs from memory/</p></div><span class="tag gr">live</span></div>
  <div class="row"><span class="lb">branch</span><div class="bd"><b>claude/personal-agentic-os-memory-3nsi26</b><p>JARVIS does not exist on main — 19 commits ahead</p></div><span class="tag am">not default</span></div>
  <div class="row"><span class="lb">model</span><div class="bd"><b>claude-opus-5</b><p>No routing to other Claude models</p></div><span class="tag cy">opus 5</span></div>
  <div class="row"><span class="lb">deps</span><div class="bd"><b>Zero</b><p>No npm install. Node 18+ only.</p></div><span class="tag gr">none</span></div>
  <div class="row"><span class="lb">theme</span><div class="bd"><b>Neo-noir</b><p>Single-theme by choice — one committed visual world</p></div><span class="tag mg">fixed</span></div>
</div>
<div class="grid g3">
  <div class="tile ${doctorOk?'gr':'am'}"><span class="k">Layer purity</span><span class="v">${doctorOk?'PASS':'FAIL'}</span><span class="n">No vendor name in core, engines, or modules.</span></div>
  <div class="tile cy"><span class="k">Capabilities</span><span class="v">${caps.length}</span><span class="n">${unbound.length} unbound — fails by name, never substitutes.</span></div>
  <div class="tile ${auditSilent.length?'rd':'gr'}"><span class="k">Silent runs</span><span class="v">${auditSilent.length}</span><span class="n">Scheduled but produced nothing.</span></div>
</div>
<div class="card"><h3>Diagnostics</h3><pre>node scripts/doctor.mjs        # layer purity, capability coverage, graph integrity
node scripts/graph-report.mjs  # contradictions, orphans, bridges, stale
node scripts/run-audit.mjs     # what failed, went silent, was never used
node scripts/console.mjs > interface/console.html   # regenerate this shell</pre></div>
<div class="note rd"><b>A safeguard that has never fired is a hypothesis.</b> <code>run-audit</code> was
written to catch silent failures, then missed a real one — twice, on two independent bugs of its own.
Monitoring is code, and code written to check something else is never tested by the thing it monitors.</div>
`));

/* ── MODULES ── */
out.push(view('modules', `
${head('Modules','Capabilities. Contract-bound and hot-swappable — each declares what it needs as a capability, never as a tool.')}
<div class="grid g2">
${modules.map(m=>`<div class="card"><h3>${esc(m.module??m.name)} <span class="tag ${m.schedule?'cy':''}">${esc(m.schedule??m.depth??'')}</span></h3>
  <div class="pad" style="display:flex;flex-direction:column;gap:9px">
    <p style="margin:0;font-size:13px">${esc(m.purpose??'')}</p>
    <div style="display:flex;gap:6px;flex-wrap:wrap">${(m.requires??'').replace(/[\[\]]/g,'').split(',').filter(x=>x.trim()).map(r=>`<span class="tag">${esc(r.trim())}</span>`).join('')}</div>
    <p style="margin:0;font-size:12px;color:var(--dim)"><b style="color:var(--dim2)">VERIFY</b> ${esc(m['verify.evidence']??'—')}</p>
    <p style="margin:0;font-size:12px;color:var(--dim)"><b style="color:var(--dim2)">REVIEW</b> ${esc(m['review.target']??'—')}</p>
  </div></div>`).join('')}
</div>
<div class="note"><b>Modules come from observed repetition, not anticipation.</b> Two of these have never
run — built speculatively, in violation of this system's own install rule within a day of writing it.
Recorded rather than quietly retired.</div>
`));

/* ═══════════════════════════════════════════════ script */

out.push(`  </div></div></div>

<script>
(() => {
  const views=[...document.querySelectorAll('.view')], links=[...document.querySelectorAll('[data-v]')];
  function go(id){
    views.forEach(v=>v.classList.toggle('on', v.id==='v-'+id));
    links.forEach(l=>l.classList.toggle('on', l.dataset.v===id && l.classList.contains('nl')));
    if(id==='graph') setTimeout(size,0);
    window.scrollTo(0,0);
  }
  links.forEach(l=>l.onclick=()=>go(l.dataset.v));
  go('home');

  /* ── documents ── */
  const DOCS=${J(docs)};
  const dl=document.getElementById('dlist'), dq=document.getElementById('dq');
  const dt=document.getElementById('dtitle'), db=document.getElementById('dbody');
  const TC={entity:'cy',insight:'vi',decision:'am',taste:'mg',episode:'dim2',question:'gr'};
  function renderDocs(q=''){
    const t=q.toLowerCase();
    const hits=DOCS.filter(d=>!t||d.title.toLowerCase().includes(t)||d.body.toLowerCase().includes(t)||d.type.includes(t));
    dl.innerHTML=hits.length?hits.map((d,i)=>
      '<div class="row clk" data-i="'+DOCS.indexOf(d)+'"><span class="lb" style="color:var(--'+(TC[d.type]||'dim2')+')">'+
      (d.sub||d.type).slice(0,11)+'</span><div class="bd"><b>'+d.title+'</b><p>'+d.path+'</p></div>'+
      '<span class="rt">'+(d.conf||'')+'</span></div>').join('')
      :'<div class="pad mut">No match.</div>';
    dl.querySelectorAll('.row').forEach(r=>r.onclick=()=>{
      dl.querySelectorAll('.row').forEach(x=>x.classList.remove('sel'));
      r.classList.add('sel');
      const d=DOCS[+r.dataset.i];
      dt.textContent=d.title;
      db.textContent=d.body; db.classList.remove('mut');
    });
  }
  dq.oninput=e=>renderDocs(e.target.value); renderDocs();

  /* ── episodes ── */
  const EPS=${J(episodes.map(e=>({...e,body:e.body.slice(0,700)})))};
  const el=document.getElementById('elist'), eq=document.getElementById('eq');
  function renderEps(q=''){
    const t=q.toLowerCase();
    const hits=EPS.filter(x=>!t||x.title.toLowerCase().includes(t)||x.body.toLowerCase().includes(t));
    el.innerHTML=hits.length?hits.map(x=>
      '<div class="row"><span class="lb" style="color:var(--vi)">'+x.kind.slice(0,11)+'</span>'+
      '<div class="bd"><b>'+x.title+'</b><p>'+x.path+'</p></div>'+
      '<span class="rt">'+(x.date||'')+'</span></div>').join('')
      :'<div class="pad mut">No match.</div>';
  }
  eq.oninput=e=>renderEps(e.target.value); renderEps();

  /* ── graph ── */
  const D=${J(graphData)};
  const cv=document.getElementById('gc'), cx=cv.getContext('2d');
  const css=getComputedStyle(document.documentElement);
  const col=t=>({entity:'--cy',insight:'--vi',decision:'--am',taste:'--mg',episode:'--dim2',question:'--gr'}[t]||'--dim2');
  const alpha=c=>({high:1,mixed:.9,medium:.72,low:.5,unverified:.38}[c]??.82);
  let W,H,flow=true,allLabels=false,drag=null,hover=null,linkPct=1,minDeg=0;

  const N=D.nodes.map((n,i)=>({...n,
    x:Math.cos(i/D.nodes.length*6.283)*160+320, y:Math.sin(i/D.nodes.length*6.283)*160+215, vx:0,vy:0}));
  const idx=new Map(N.map((n,i)=>[n.id,i]));
  const L=D.links.map(l=>({s:idx.get(l.s),t:idx.get(l.t),r:l.r})).filter(l=>l.s!=null&&l.t!=null);

  function size(){
    const d=Math.min(devicePixelRatio||1,2);
    W=cv.clientWidth||900; H=cv.clientHeight||430;
    cv.width=W*d; cv.height=H*d; cx.setTransform(d,0,0,d,0,0);
  }
  function step(){
    for(let i=0;i<N.length;i++){
      const a=N[i];
      for(let j=i+1;j<N.length;j++){
        const b=N[j]; let dx=b.x-a.x,dy=b.y-a.y,d2=dx*dx+dy*dy||1,d=Math.sqrt(d2);
        const f=2300/d2; dx/=d;dy/=d;
        a.vx-=dx*f;a.vy-=dy*f;b.vx+=dx*f;b.vy+=dy*f;
      }
      a.vx+=(W/2-a.x)*.0014; a.vy+=(H/2-a.y)*.0014;
    }
    for(const l of L){
      const a=N[l.s],b=N[l.t]; let dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1;
      const f=(d-98)*.011; dx/=d;dy/=d;
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
    const keep=Math.round(L.length*linkPct);
    for(let i=0;i<keep;i++){
      const l=L[i], a=N[l.s], b=N[l.t], bad=l.r==='contradicts';
      if(a.d<minDeg&&b.d<minDeg)continue;
      cx.strokeStyle=bad?'rgba(255,77,157,.55)':'rgba(69,224,216,.13)';
      cx.lineWidth=bad?1.6:1;
      cx.beginPath();cx.moveTo(a.x,a.y);cx.lineTo(b.x,b.y);cx.stroke();
    }
    for(const n of N){
      if(n.d<minDeg)continue;
      const r=4.5+Math.min(n.d,7)*1.4, c=css.getPropertyValue(col(n.ty)).trim();
      cx.globalAlpha=alpha(n.c)*.26; cx.fillStyle=c;
      cx.beginPath();cx.arc(n.x,n.y,r*2.5,0,6.283);cx.fill();
      cx.globalAlpha=alpha(n.c); cx.fillStyle=c;
      cx.beginPath();cx.arc(n.x,n.y,r,0,6.283);cx.fill();
      cx.globalAlpha=1;
      if(allLabels||n.d>=4||n===hover){
        cx.fillStyle=n===hover?css.getPropertyValue('--tx').trim():css.getPropertyValue('--dim').trim();
        cx.font='11px ui-monospace,Menlo,monospace';
        const t=n.t.length>32?n.t.slice(0,31)+'…':n.t;
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
  document.getElementById('rLinks').oninput=e=>{linkPct=e.target.value/100;};
  // layout = degree threshold. macro shows only hubs, full shows everything.
  const LAY={macro:4,mid:2,micro:1,full:0};
  document.querySelectorAll('.lay').forEach(b=>b.onclick=()=>{
    document.querySelectorAll('.lay').forEach(x=>x.classList.remove('on'));
    b.classList.add('on'); minDeg=LAY[b.dataset.l];
  });
  minDeg=LAY.macro;
  addEventListener('resize',size); size();
  (function loop(){ if(flow)step(); draw(); requestAnimationFrame(loop); })();
})();
</script>`);

console.log(out.join('\n'));
