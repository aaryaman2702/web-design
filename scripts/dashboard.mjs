#!/usr/bin/env node
/**
 * dashboard — render the graph as an instrument panel.
 *
 * The design thesis, and the reason this is not a productivity dashboard:
 * most instruments here read zero, and the panel says so rather than hiding
 * it. A dashboard that fills empty space with activity metrics teaches you to
 * value activity. One that foregrounds what it does not yet know teaches you
 * where the gaps are.
 *
 * Output is a self-contained fragment — no external requests, styles and
 * script inline. Renders locally in a browser and publishes as an Artifact
 * unchanged.
 *
 * Usage: node scripts/dashboard.mjs > interface/panel.html
 */

import { load } from './lib/graph.mjs';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib/graph.mjs';

const { nodes, byId } = load();
const today = new Date().toISOString().slice(0, 10);

/* ------------------------------------------------------------- measurements */

const adj = new Map(nodes.map(n => [n.id, new Set()]));
for (const n of nodes) {
  for (const e of n.edges) {
    if (!byId.has(e.to)) continue;
    adj.get(n.id).add(e.to);
    adj.get(e.to).add(n.id);
  }
}

const edgeList = [];
for (const n of nodes) {
  for (const e of n.edges) {
    if (byId.has(e.to)) edgeList.push({ source: n.id, target: e.to, rel: e.rel });
  }
}

const orphans = nodes.filter(n => (adj.get(n.id)?.size ?? 0) === 0);
const stale = nodes.filter(n => typeof n.review === 'string' && n.review < today);
const contradictions = edgeList.filter(e => e.rel === 'contradicts').length / 2;

// Connected components
const seenC = new Set();
let clusters = 0;
for (const n of nodes) {
  if (seenC.has(n.id)) continue;
  clusters++;
  const q = [n.id]; seenC.add(n.id);
  while (q.length) for (const nb of adj.get(q.shift()) ?? []) if (!seenC.has(nb)) { seenC.add(nb); q.push(nb); }
}

const count = (t) => nodes.filter(n => n.type === t).length;

// Taste dimensions declared in the profile, with judgment counts
const tasteProfile = nodes.find(n => n.id === 'n-taste-profile');
const tasteDims = [];
if (tasteProfile) {
  for (const m of tasteProfile.body.matchAll(/^\|\s*([a-z]+)\s*\|\s*(\d+)\s*\|/gm)) {
    tasteDims.push({ name: m[1], n: Number(m[2]) });
  }
}

const decisions = nodes.filter(n => n.type === 'decision');
const resolved = decisions.filter(n => n.status === 'resolved').length;

const dreamDir = join(ROOT, 'memory/episodes/observations/dream');
const dreams = existsSync(dreamDir) ? readdirSync(dreamDir).filter(f => f.endsWith('.md')) : [];
let latestDream = null;
if (dreams.length) {
  const f = join(dreamDir, dreams.sort().at(-1));
  const txt = readFileSync(f, 'utf8');
  latestDream = {
    date: dreams.at(-1).replace('.md', ''),
    findings: [...txt.matchAll(/^## Finding \d+ — (.+)$/gm)].map(m => m[1]),
  };
}

/* ------------------------------------------------------------- instruments */

const instruments = [
  { label: 'Graph nodes', value: nodes.length, of: null, note: 'plain markdown, portable' },
  { label: 'Typed edges', value: edgeList.length, of: null, note: 'relations, not folders' },
  { label: 'Clusters', value: clusters, of: null, note: clusters === 1 ? 'fully connected' : 'disconnected regions' },
  { label: 'Orphans', value: orphans.length, of: null, note: 'knowledge that cannot compound', warn: orphans.length > 0 },
  { label: 'Contradictions', value: contradictions, of: null, note: 'sharpest signal in the graph' },
  { label: 'Stale beliefs', value: stale.length, of: null, note: 'past review, still reasoned from', warn: stale.length > 0 },
  { label: 'Taste judgments', value: count('taste') - 1, of: 50, note: 'ten useful, fifty predictive' },
  { label: 'Taste predictions', value: 0, of: 10, note: 'the number that says it knows you' },
  { label: 'Decisions logged', value: decisions.length, of: 10, note: 'judgment unmeasurable below ten' },
  { label: 'Decisions resolved', value: resolved, of: null, note: 'calibration needs outcomes' },
];

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const graphData = {
  nodes: nodes.map(n => ({
    id: n.id,
    t: n.title ?? n.id,
    ty: n.type ?? 'entity',
    c: n.confidence ?? '',
    d: adj.get(n.id)?.size ?? 0,
  })),
  links: edgeList,
};

/* ------------------------------------------------------------------ render */

const empty = instruments.filter(i => i.value === 0).length;

console.log(`<title>JARVIS — instrument panel</title>
<style>
  :root{
    --paper:#F7F8FA; --ink:#141A22; --ink-2:#3D4854; --ink-3:#6B7683;
    --rule:#DDE1E7; --panel:#FFFFFF;
    --copper:#9A6B4F; --amber:#B58033; --rust:#A4483C; --sage:#5E7D6A;
    --shadow:0 1px 2px rgba(20,26,34,.05),0 8px 24px -12px rgba(20,26,34,.12);
  }
  @media (prefers-color-scheme:dark){
    :root{
      --paper:#0F141A; --ink:#E4E8ED; --ink-2:#A8B2BD; --ink-3:#727D89;
      --rule:#242C35; --panel:#161C24;
      --copper:#C08D6C; --amber:#D0A055; --rust:#C96B5E; --sage:#7FA48B;
      --shadow:0 1px 2px rgba(0,0,0,.3),0 8px 24px -12px rgba(0,0,0,.6);
    }
  }
  :root[data-theme="light"]{
    --paper:#F7F8FA; --ink:#141A22; --ink-2:#3D4854; --ink-3:#6B7683;
    --rule:#DDE1E7; --panel:#FFFFFF;
    --copper:#9A6B4F; --amber:#B58033; --rust:#A4483C; --sage:#5E7D6A;
    --shadow:0 1px 2px rgba(20,26,34,.05),0 8px 24px -12px rgba(20,26,34,.12);
  }
  :root[data-theme="dark"]{
    --paper:#0F141A; --ink:#E4E8ED; --ink-2:#A8B2BD; --ink-3:#727D89;
    --rule:#242C35; --panel:#161C24;
    --copper:#C08D6C; --amber:#D0A055; --rust:#C96B5E; --sage:#7FA48B;
    --shadow:0 1px 2px rgba(0,0,0,.3),0 8px 24px -12px rgba(0,0,0,.6);
  }

  *{box-sizing:border-box}
  body{margin:0}
  .wrap{
    background:var(--paper); color:var(--ink); min-height:100vh;
    font:400 16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
    padding:clamp(24px,5vw,64px);
  }
  .inner{max-width:1080px;margin:0 auto;display:flex;flex-direction:column;gap:48px}

  .serif{font-family:'Iowan Old Style','Palatino Linotype',Palatino,Georgia,serif}
  .mono{font-family:ui-monospace,'SF Mono',SFMono-Regular,Menlo,Consolas,monospace}
  .eyebrow{
    font:500 11px/1 ui-monospace,SF Mono,Menlo,monospace;
    letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3);
  }

  header{display:flex;flex-direction:column;gap:14px;
    border-bottom:1px solid var(--rule);padding-bottom:28px}
  h1{font-family:'Iowan Old Style','Palatino Linotype',Palatino,Georgia,serif;
    font-size:clamp(30px,4.5vw,46px);font-weight:400;letter-spacing:-.015em;
    margin:0;text-wrap:balance;line-height:1.12}
  .lede{max-width:62ch;color:var(--ink-2);font-size:17px;margin:0}
  .lede b{color:var(--ink);font-weight:600}

  .cols{display:grid;grid-template-columns:minmax(0,300px) minmax(0,1fr);
    gap:40px;align-items:start}
  @media (max-width:820px){.cols{grid-template-columns:1fr}}

  .readings{display:flex;flex-direction:column;gap:0;
    border:1px solid var(--rule);border-radius:3px;background:var(--panel);
    box-shadow:var(--shadow);overflow:hidden}
  .reading{display:grid;grid-template-columns:1fr auto;gap:4px 12px;
    padding:13px 16px;border-bottom:1px solid var(--rule);align-items:baseline}
  .reading:last-child{border-bottom:none}
  .reading.zero{background:linear-gradient(90deg,color-mix(in srgb,var(--amber) 7%,transparent),transparent 60%)}
  .reading .lab{font-size:14px;font-weight:500}
  .reading .val{font-family:ui-monospace,SF Mono,Menlo,monospace;
    font-size:19px;font-variant-numeric:tabular-nums;letter-spacing:-.02em}
  .reading.zero .val{color:var(--amber)}
  .reading.warn .val{color:var(--rust)}
  .reading .of{color:var(--ink-3);font-size:13px}
  .reading .note{grid-column:1/-1;font-size:12.5px;color:var(--ink-3);line-height:1.45}

  .panel{border:1px solid var(--rule);border-radius:3px;background:var(--panel);
    box-shadow:var(--shadow);overflow:hidden}
  .panel-h{display:flex;justify-content:space-between;align-items:baseline;
    gap:12px;padding:14px 18px;border-bottom:1px solid var(--rule);flex-wrap:wrap}
  .panel-h h2{margin:0;font-size:15px;font-weight:600;letter-spacing:-.01em}
  #g{display:block;width:100%;height:420px;touch-action:none}
  .legend{display:flex;gap:16px;flex-wrap:wrap;padding:12px 18px;
    border-top:1px solid var(--rule);font-size:12.5px;color:var(--ink-3)}
  .legend span{display:inline-flex;align-items:center;gap:6px}
  .dot{width:9px;height:9px;border-radius:50%;display:inline-block}

  .finding{border-left:2px solid var(--copper);padding:2px 0 2px 18px;
    display:flex;flex-direction:column;gap:6px}
  .finding h3{margin:0;font-size:17px;font-weight:600;letter-spacing:-.01em;
    text-wrap:balance;font-family:'Iowan Old Style',Palatino,Georgia,serif}
  .stack{display:flex;flex-direction:column;gap:22px}
  section{display:flex;flex-direction:column;gap:16px}
  h2.sec{margin:0;font-size:13px;font-weight:600;letter-spacing:.08em;
    text-transform:uppercase;color:var(--ink-3)}

  .callout{border:1px solid var(--rule);border-left:2px solid var(--amber);
    background:color-mix(in srgb,var(--amber) 5%,var(--panel));
    padding:16px 18px;border-radius:3px;font-size:14.5px;color:var(--ink-2);
    max-width:70ch}
  .callout b{color:var(--ink)}

  footer{border-top:1px solid var(--rule);padding-top:20px;
    font-size:13px;color:var(--ink-3);display:flex;flex-direction:column;gap:6px}
  code{font-family:ui-monospace,SF Mono,Menlo,monospace;font-size:.9em;
    background:color-mix(in srgb,var(--ink) 6%,transparent);
    padding:2px 5px;border-radius:3px}
  @media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
</style>

<div class="wrap"><div class="inner">

<header>
  <div class="eyebrow">JARVIS · instrument panel · ${today}</div>
  <h1>Most of these read zero.</h1>
  <p class="lede">That is the honest state, and the reason this panel exists.
  The architecture is complete; the graph holds <b>${nodes.length} nodes</b> and
  <b>${edgeList.length} edges</b>, nearly all of them about the system itself.
  <b>${empty} of ${instruments.length} instruments</b> have no reading yet — not
  because they are broken, but because the readings come from use.</p>
</header>

<div class="cols">
  <div class="readings">
    ${instruments.map(i => `<div class="reading${i.value === 0 ? ' zero' : ''}${i.warn ? ' warn' : ''}">
      <span class="lab">${esc(i.label)}</span>
      <span class="val">${i.value}${i.of ? `<span class="of"> / ${i.of}</span>` : ''}</span>
      <span class="note">${esc(i.note)}</span>
    </div>`).join('\n    ')}
  </div>

  <div class="stack">
    <div class="panel">
      <div class="panel-h">
        <h2>The graph</h2>
        <span class="eyebrow">drag to explore</span>
      </div>
      <canvas id="g"></canvas>
      <div class="legend">
        <span><i class="dot" style="background:var(--copper)"></i>entity</span>
        <span><i class="dot" style="background:var(--sage)"></i>insight</span>
        <span><i class="dot" style="background:var(--amber)"></i>decision</span>
        <span><i class="dot" style="background:var(--rust)"></i>taste</span>
        <span><i class="dot" style="background:var(--ink-3)"></i>episode</span>
        <span>faded = lower confidence</span>
      </div>
    </div>

    <div class="callout">
      <b>Taste is the binding constraint.</b> ${tasteDims.filter(d => d.n === 0).length}
      of ${tasteDims.length} dimensions have no judgments — every craft dimension
      (typography, motion, colour, layout) is empty, while craft is the first
      mastery domain. Ten judgments make the engine useful; fifty make it
      predictive.
    </div>
  </div>
</div>

${latestDream ? `<section>
  <h2 class="sec">Last dream · ${esc(latestDream.date)}</h2>
  ${latestDream.findings.map(f => `<div class="finding"><h3>${esc(f)}</h3></div>`).join('\n  ')}
</section>` : ''}

<footer>
  <div>Regenerate: <code>node scripts/dashboard.mjs &gt; interface/panel.html</code></div>
  <div>No activity counts, streaks, or hours-saved by design — the metric a system
  displays becomes the thing it optimises for.</div>
</footer>

</div></div>

<script>
(() => {
  const D = ${JSON.stringify(graphData)};
  const cv = document.getElementById('g');
  const cx = cv.getContext('2d');
  const css = getComputedStyle(document.documentElement);
  const col = t => ({entity:'--copper',insight:'--sage',decision:'--amber',taste:'--rust',episode:'--ink-3'}[t] || '--ink-3');
  const alpha = c => ({high:1,mixed:.85,medium:.7,low:.5,unverified:.4}[c] ?? .8);

  let W, H, dpr;
  const N = D.nodes.map((n,i) => ({...n,
    x: Math.cos(i/D.nodes.length*6.283)*120 + 200,
    y: Math.sin(i/D.nodes.length*6.283)*120 + 200, vx:0, vy:0}));
  const idx = new Map(N.map((n,i) => [n.id,i]));
  const L = D.links.map(l => ({s:idx.get(l.source), t:idx.get(l.target)})).filter(l => l.s!=null && l.t!=null);

  function size(){
    dpr = Math.min(devicePixelRatio||1, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W*dpr; cv.height = H*dpr;
    cx.setTransform(dpr,0,0,dpr,0,0);
  }

  function step(){
    for (let i=0;i<N.length;i++){
      const a=N[i];
      for (let j=i+1;j<N.length;j++){
        const b=N[j];
        let dx=b.x-a.x, dy=b.y-a.y, d2=dx*dx+dy*dy||1, d=Math.sqrt(d2);
        const f = 1400/d2;
        dx/=d; dy/=d; a.vx-=dx*f; a.vy-=dy*f; b.vx+=dx*f; b.vy+=dy*f;
      }
      a.vx += (W/2-a.x)*0.0016; a.vy += (H/2-a.y)*0.0016;
    }
    for (const l of L){
      const a=N[l.s], b=N[l.t];
      let dx=b.x-a.x, dy=b.y-a.y, d=Math.hypot(dx,dy)||1;
      const f=(d-88)*0.012; dx/=d; dy/=d;
      a.vx+=dx*f; a.vy+=dy*f; b.vx-=dx*f; b.vy-=dy*f;
    }
    for (const n of N){
      if (n===drag) continue;
      n.vx*=0.86; n.vy*=0.86; n.x+=n.vx; n.y+=n.vy;
      n.x=Math.max(24,Math.min(W-24,n.x)); n.y=Math.max(24,Math.min(H-24,n.y));
    }
  }

  function draw(){
    cx.clearRect(0,0,W,H);
    cx.strokeStyle = css.getPropertyValue('--rule').trim(); cx.lineWidth=1;
    for (const l of L){
      cx.beginPath(); cx.moveTo(N[l.s].x,N[l.s].y); cx.lineTo(N[l.t].x,N[l.t].y); cx.stroke();
    }
    for (const n of N){
      const r = 4 + Math.min(n.d,6)*1.5;
      cx.globalAlpha = alpha(n.c);
      cx.fillStyle = css.getPropertyValue(col(n.ty)).trim();
      cx.beginPath(); cx.arc(n.x,n.y,r,0,6.283); cx.fill();
      cx.globalAlpha = 1;
      if (n.d >= 3 || n===hover){
        cx.fillStyle = css.getPropertyValue('--ink-2').trim();
        cx.font = '11px ui-monospace,Menlo,monospace';
        const t = n.t.length>26 ? n.t.slice(0,25)+'…' : n.t;
        cx.fillText(t, n.x+r+5, n.y+4);
      }
    }
  }

  let drag=null, hover=null;
  const at = (e) => {
    const r=cv.getBoundingClientRect();
    const p = e.touches?.[0] ?? e;
    const x=p.clientX-r.left, y=p.clientY-r.top;
    return N.find(n => Math.hypot(n.x-x,n.y-y) < 14) || null;
  };
  cv.addEventListener('pointerdown', e => { drag=at(e); if(drag) cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', e => {
    const r=cv.getBoundingClientRect();
    if (drag){ drag.x=e.clientX-r.left; drag.y=e.clientY-r.top; drag.vx=drag.vy=0; }
    else { const h=at(e); if(h!==hover){hover=h; cv.style.cursor=h?'grab':'default';} }
  });
  addEventListener('pointerup', () => drag=null);

  const loop = () => { step(); draw(); requestAnimationFrame(loop); };
  size(); addEventListener('resize', size); loop();
})();
</script>`);
