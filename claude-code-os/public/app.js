/* Claude Code OS — SPA router + page renderers. */
(function () {
  const view = document.getElementById('view');
  let summary = null;
  let graphInstance = null;
  let profile = { name: '', hourlyRate: 50, focus: '' };
  const AGENTS = {
    jarvis: { key: 'jarvis', chip: 'JARVIS', name: 'J.A.R.V.I.S', title: 'J.A.R.V.I.S' },
    openclaw: { key: 'openclaw', chip: 'OPENCLAW', name: 'OpenClaw', title: 'OPENCLAW' },
  };
  let agent = AGENTS.jarvis;

  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function timeAgo(ts) {
    if (!ts) return '—';
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return s + 's ago';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    return Math.floor(s / 86400) + 'd ago';
  }
  function fmtChars(n) {
    if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return String(n);
  }
  const art = (id) => document.getElementById(id).innerHTML;
  const fetchJSON = (url) => fetch(url).then((r) => r.json());

  /* Procedural constellation glyphs for the session strip */
  function stripThumbSVG(seed) {
    let s = 0;
    for (const ch of seed) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
    const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    const n = 4 + Math.floor(rnd() * 3);
    const pts = [];
    for (let i = 0; i < n; i++) pts.push([4 + rnd() * 16, 4 + rnd() * 16]);
    const cx = 12, cy = 12;
    let links = '', dots = '';
    for (const [x, y] of pts) {
      links += `<path d="M${cx} ${cy}L${x.toFixed(1)} ${y.toFixed(1)}" stroke="#4d8dff" stroke-width=".8" opacity=".55"/>`;
      dots += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.5" fill="#22d3ee" opacity=".9"/>`;
    }
    return `<svg viewBox="0 0 24 24">${links}${dots}<circle cx="12" cy="12" r="2.6" fill="#ff2e88"/></svg>`;
  }

  /* Neon sparkline for the SESSIONS tile */
  function sparkSVG(values) {
    const max = Math.max(1, ...values), min = Math.min(...values);
    const span = Math.max(1, max - min);
    const pts = values.map((v, i) => [(i / Math.max(1, values.length - 1)) * 92 + 2, 30 - ((v - min) / span) * 24]);
    const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('');
    return `<svg class="stat-spark" viewBox="0 0 96 34" fill="none">
      <path d="${d}" stroke="var(--accent)" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"
            style="filter:drop-shadow(0 0 6px var(--glow))"/>
    </svg>`;
  }

  /* Radar pulse for the LAST ACTIVE tile */
  function radarSVG() {
    return `<svg class="stat-radar" viewBox="0 0 52 52" fill="none">
      <circle cx="26" cy="26" r="24" stroke="var(--line-2)" stroke-width="1"/>
      <circle cx="26" cy="26" r="16" stroke="color-mix(in srgb, var(--accent) 45%, transparent)" stroke-width="1" stroke-dasharray="3 4"/>
      <circle cx="26" cy="26" r="9" stroke="color-mix(in srgb, var(--accent) 70%, transparent)" stroke-width="1"/>
      <circle cx="26" cy="26" r="3.4" fill="var(--accent)" style="filter:drop-shadow(0 0 7px var(--glow))"/>
    </svg>`;
  }

  /* ================================= HOME ================================= */
  async function renderHome() {
    const [sessions] = await Promise.all([fetchJSON('/api/sessions')]);
    const s = summary;
    const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const maxWeek = Math.max(1, ...s.week);
    const memPath = s.demo ? '~/.JARVIS/MEMORIES' : s.dataDir.toUpperCase();

    view.innerHTML = `
    <div class="page">
      ${s.demo ? `<div class="demo-note">◈ <b>DEMO DATA</b> — no sessions found on disk yet. Everything goes live once <code>${esc(s.dataDir)}</code> has history.</div>` : ''}
      <div class="row top-row">
        <div class="card">
          <div class="card-label">MEMORY</div>
          <div class="mem-gauge-nums"><strong>${fmtChars(s.memory.usedChars)}</strong> <span style="color:var(--dim)">/ ${fmtChars(s.memory.quotaChars)} CHARS</span></div>
          <div class="mem-bar"><div style="width:${s.memory.percentFull}%"></div></div>
          <div class="mem-path">${s.memory.percentFull}% FULL · ${esc(memPath)}</div>
        </div>
        <div class="card week-card">
          <div class="week-head"><div class="card-label" style="margin:0">THIS WEEK</div><div class="stat-foot">ON DISK</div></div>
          <div class="week-bars">
            ${s.week.map((v, i) => `
              <div class="week-day ${i === s.today ? 'today' : ''}">
                <div class="bar" style="height:${(3 + (v / maxWeek) * 9).toFixed(1)}px"></div><span>${days[i]}</span>
              </div>`).join('')}
          </div>
        </div>
      </div>

      <div class="chat-bezel" id="chat-root">
        <div class="chat-strip">
          <button class="strip-collapse" title="Collapse">&raquo;</button>
          <button class="strip-new js-new-chat" title="New chat">+</button>
          ${sessions.slice(0, 12).map((sess) => `
            <div class="strip-thumb" title="${esc(sess.title)}" data-sid="${esc(sess.id)}">${stripThumbSVG(sess.id)}<span class="go">›</span></div>
          `).join('')}
        </div>
        <div class="chat-main">
          <div class="chat-art">${art('art-arch')}</div>
          <div class="chat-head">
            <button class="nc js-new-chat" style="background:none;border:none;color:#fff;letter-spacing:3px;font-size:11.5px;font-weight:600">NEW CHAT</button>
            <span style="display:flex;gap:9px">
              <button class="voice-btn tts-btn" title="Speak replies aloud">📶 SPEAK</button>
              <button class="voice-btn">🎙 VOICE</button>
            </span>
          </div>
          <div class="chat-center">
            <div class="hero-title">${agent.title}</div>
            <div class="hero-cta">START A NEW CONVERSATION</div>
          </div>
          <div class="chat-log"></div>
          <div class="chat-controls">
            <div class="pill"><span class="pdot"></span>
              <select class="model-select">
                <optgroup label="Anthropic">
                  <option value="claude-fable-5">claude-fable-5</option>
                  <option value="claude-opus-4-8">claude-opus-4-8</option>
                  <option value="claude-sonnet-5">claude-sonnet-5</option>
                  <option value="claude-haiku-4-5-20251001">claude-haiku-4-5</option>
                </optgroup>
                <optgroup label="via OpenRouter">
                  <option value="or:openai/gpt-5.5">gpt-5.5</option>
                  <option value="or:z-ai/glm-5.2">glm-5.2</option>
                  <option value="or:deepseek/deepseek-v4-pro">deepseek-v4-pro</option>
                </optgroup>
                <optgroup label="Ensemble">
                  <option value="ministry">⚖ ministry of agents</option>
                </optgroup>
              </select>
            </div>
            <div class="pill"><span class="bars"><i></i><i></i><i></i></span>
              <select class="effort-select">
                <option value="low">low</option>
                <option value="medium" selected>medium</option>
                <option value="high">high</option>
              </select>
            </div>
            <div class="pill">❯_ COMMAND</div>
            <button class="pill toggle" id="council-pill" title="Route through the Ministry of Experts council">⚖ MINISTRY</button>
            <div class="ctx-meter">
              <span class="ctx-cells">${'<i></i>'.repeat(14)}</span>
              <span class="ctx-pct">0%</span>
            </div>
          </div>
          <div class="chat-input-row">
            <button class="attach-btn" title="Attach">🖇</button>
            <input class="chat-input" placeholder="Ask ${agent.name} anything… (drop or paste an image)">
            <button class="send-btn">✈ SEND</button>
          </div>
        </div>
      </div>

      <div class="row stats-row">
        <div class="stat-tile">
          <div class="card-label">SESSIONS</div>
          <div class="stat-big">${s.stats.sessions}${sparkSVG(sessions.slice(0, 12).map((x) => x.messages).reverse())}</div>
          <div class="stat-foot">LAST ${s.stats.sessionsOnDisk} ON DISK</div>
        </div>
        <div class="stat-tile">
          <div class="card-label">MESSAGES</div>
          <div class="stat-big">${s.stats.messages}<span class="ico">🗨</span></div>
          <div class="stat-foot">ACROSS ALL SESSIONS</div>
        </div>
        <div class="stat-tile">
          <div class="card-label">MODELS</div>
          <div class="stat-big">${s.stats.models}<span class="model-chips">${'<i>◈</i>'.repeat(Math.min(3, Math.max(1, s.stats.models)))}</span></div>
          <div class="stat-foot">DISTINCT MODELS USED</div>
        </div>
        <div class="stat-tile">
          <div class="card-label">LAST ACTIVE</div>
          <div class="stat-big" style="font-size:27px">${timeAgo(s.stats.lastActiveTs)}${radarSVG()}</div>
          <div class="stat-foot">${esc((s.stats.lastModel || '').toUpperCase())}</div>
        </div>
      </div>

      <div class="mc-head"><span class="dot"></span><h2>Mission Control</h2></div>
      <div class="card mc-card">
        <div class="mc-art">${art('art-athena')}</div>
        <div class="mc-body">
          <h3>Every operator needs<br>a <em>great objective.</em></h3>
          <p>Give ${agent.name} a mission. Goals persist locally and steer what the agent optimizes for across sessions.</p>
          <div class="goal-row">
            <input class="goal-input" placeholder="e.g. Ship the agentic OS video by Friday">
            <button class="goal-add">＋ SET GOAL</button>
          </div>
          <div class="goal-list" id="goal-list"></div>
        </div>
      </div>
    </div>`;

    window.ChatConsole(view, { agentName: agent.chip });
    initGoals();
    initSessionThumbs();

    // Voice widget fall-through: a spoken question lands in the chat input
    const pending = sessionStorage.getItem('pendingAsk');
    if (pending) {
      sessionStorage.removeItem('pendingAsk');
      const input = $('.chat-input', view);
      input.value = pending;
      $('.send-btn', view).click();
    }
  }

  async function initGoals() {
    const list = $('#goal-list');
    let goals = await fetchJSON('/api/goals').catch(() => []);
    const save = () => fetch('/api/goals', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(goals) });
    const draw = () => {
      list.innerHTML = goals.map((g, i) => `
        <div class="goal-item ${g.done ? 'done' : ''}">
          <input type="checkbox" data-i="${i}" ${g.done ? 'checked' : ''}>
          <span>${esc(g.text)}</span>
          <button class="rm" data-i="${i}">✕</button>
        </div>`).join('') || '<div class="gp-empty">No missions yet, operator.</div>';
    };
    draw();
    list.addEventListener('change', (ev) => {
      const i = ev.target.dataset.i;
      if (i !== undefined) { goals[i].done = ev.target.checked; save(); draw(); }
    });
    list.addEventListener('click', (ev) => {
      if (ev.target.classList.contains('rm')) { goals.splice(ev.target.dataset.i, 1); save(); draw(); }
    });
    $('.goal-add').addEventListener('click', () => {
      const input = $('.goal-input');
      const text = input.value.trim();
      if (!text) return;
      goals.push({ text, done: false, ts: Date.now() });
      input.value = '';
      save(); draw();
    });
  }

  function initSessionThumbs() {
    view.querySelectorAll('.strip-thumb').forEach((thumb) => {
      thumb.addEventListener('click', async () => {
        const transcript = await fetch('/api/session/' + thumb.dataset.sid).then((r) => (r.ok ? r.json() : null)).catch(() => null);
        const bezel = $('#chat-root');
        const log = $('.chat-log', bezel);
        bezel.classList.add('chatting');
        log.innerHTML = '';
        if (!transcript) {
          log.innerHTML = '<div class="msg msg-assistant"><div class="who">ARCHIVE</div>Transcript preview not available for this session.</div>';
          return;
        }
        for (const m of transcript) {
          const div = document.createElement('div');
          div.className = 'msg msg-' + (m.role === 'user' ? 'user' : 'assistant');
          div.textContent = m.text;
          log.appendChild(div);
        }
        log.scrollTop = log.scrollHeight;
      });
    });
  }

  /* ========================== MEMORY / KNOWLEDGE ========================== */
  const modeIcon = {
    macro: '<svg viewBox="0 0 26 18"><path d="M13 9L4 4M13 9l9-4M13 9l-7 6M13 9l8 5" stroke="#4d8dff" stroke-width=".7"/><circle cx="13" cy="9" r="3" fill="#22d3ee"/><circle cx="4" cy="4" r="1.5" fill="#8493ba"/><circle cx="22" cy="5" r="1.5" fill="#8493ba"/><circle cx="6" cy="15" r="1.5" fill="#8493ba"/><circle cx="21" cy="14" r="1.5" fill="#8493ba"/></svg>',
    mid: '<svg viewBox="0 0 26 18">' + [...Array(9)].map((_, i) => `<circle cx="${3 + (i % 3) * 10}" cy="${3 + Math.floor(i / 3) * 6}" r="1.3" fill="${i === 4 ? '#ff2e88' : '#8493ba'}"/>`).join('') + '</svg>',
    micro: '<svg viewBox="0 0 26 18">' + [...Array(15)].map((_, i) => `<circle cx="${2 + (i % 5) * 5.5}" cy="${3 + Math.floor(i / 5) * 6}" r="1" fill="${i === 7 ? '#ff2e88' : '#8493ba'}"/>`).join('') + '</svg>',
    full: '<svg viewBox="0 0 26 18">' + [...Array(24)].map((_, i) => `<circle cx="${2 + (i % 6) * 4.4}" cy="${2 + Math.floor(i / 6) * 4.6}" r=".8" fill="${i === 14 ? '#ff2e88' : '#8493ba'}"/>`).join('') + '</svg>',
  };

  async function renderGraphPage(defaultMode) {
    const data = await fetchJSON('/api/graph');
    view.innerHTML = `
    <div class="page" style="max-width:1200px">
      <div class="graph-wrap">
        <canvas id="graph-canvas"></canvas>
        <div class="graph-legend">
          <span><b style="background:#22d3ee"></b>MEMORY CORE</span>
          <span><b style="background:#e9edfa"></b>WORKSPACE</span>
          <span><b style="background:#ffb020"></b>FILE</span>
          <span><b style="background:#a855f7"></b>DECISION</span>
          <span><b style="background:#4d8dff"></b>SESSION</span>
          <span><b style="background:#ff2e88"></b>SKILL</span>
        </div>
        <div class="graph-tip" id="graph-tip"></div>
      </div>

      <div class="graph-bar">
        <span class="layout-label">LAYOUT</span>
        <div class="layout-modes">
          <span class="layout-note">Structured</span>
          ${['macro', 'mid', 'micro', 'full'].map((m) => `
            <button class="mode-btn ${m === defaultMode ? 'active' : ''}" data-mode="${m}">${modeIcon[m]}${m.toUpperCase()}</button>
          `).join('')}
        </div>
        <span class="sep"></span>
        <button class="gb-btn" id="gb-pause">⏸ Pause</button>
        <button class="gb-btn active" id="gb-flow">≋ Flow</button>
        <div class="gb-toggle">
          <button id="gb-lite">LITE</button>
          <button class="active" id="gb-full">⚡ FULL</button>
        </div>
        <label class="links-slider">LINKS <input type="range" id="gb-links" min="5" max="100" value="55"></label>
        <div class="graph-counts">
          <span>Nodes <b id="gc-nodes">${data.stats.nodes}</b></span>
          <span>Edges <b id="gc-edges">${data.stats.edges}</b></span>
          <span>Recall 7d <b>${data.stats.recall7d}</b></span>
        </div>
      </div>

      <div class="row graph-panels">
        <div class="card">
          <div class="gp-head">⟳ Recent activity <span class="f"><input placeholder="Filter activity" id="gp-filter"></span></div>
          <div class="gp-list" id="gp-recent"></div>
        </div>
        <div class="card">
          <div class="gp-head warn">⚠ Stale</div>
          <div class="gp-list" id="gp-stale"></div>
        </div>
        <div class="card">
          <div class="gp-head bad">▤ Missing</div>
          <div class="gp-list" id="gp-missing"></div>
        </div>
      </div>
    </div>`;

    const typeColor = { core: '#22d3ee', workspace: '#e9edfa', file: '#ffb020', decision: '#a855f7', session: '#4d8dff', skill: '#ff2e88' };
    const drawPanel = (id, items) => {
      $(id).innerHTML = items.length
        ? items.map((it) => `<div class="gp-item"><b style="background:${typeColor[it.type] || '#7d8c81'}"></b><span class="lbl">${esc(it.label)}</span><span class="when">${timeAgo(it.ts)}</span></div>`).join('')
        : '<div class="gp-empty">Nothing here. Clean core, operator.</div>';
    };
    drawPanel('#gp-recent', data.panels.recent);
    drawPanel('#gp-stale', data.panels.stale);
    drawPanel('#gp-missing', data.panels.missing);
    $('#gp-filter').addEventListener('input', (ev) => {
      const q = ev.target.value.toLowerCase();
      drawPanel('#gp-recent', data.panels.recent.filter((it) => it.label.toLowerCase().includes(q)));
    });

    const canvas = $('#graph-canvas');
    const tip = $('#graph-tip');
    if (graphInstance) graphInstance.destroy();
    graphInstance = window.MemoryGraph(canvas, data, {
      mode: defaultMode,
      onHover(node, ev) {
        if (!node) { tip.style.display = 'none'; return; }
        const rect = canvas.parentElement.getBoundingClientRect();
        tip.style.display = 'block';
        tip.style.left = Math.min(rect.width - 240, ev.clientX - rect.left + 14) + 'px';
        tip.style.top = (ev.clientY - rect.top + 14) + 'px';
        tip.innerHTML = `<div class="t">${node.type.toUpperCase()}</div>${esc(node.label)}`;
      },
    });

    const updateCounts = () => {
      const c = graphInstance.counts();
      $('#gc-nodes').textContent = c.nodes;
      $('#gc-edges').textContent = c.edges;
    };
    updateCounts();

    view.querySelectorAll('.mode-btn').forEach((btn) => btn.addEventListener('click', () => {
      view.querySelectorAll('.mode-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      graphInstance.setMode(btn.dataset.mode);
      updateCounts();
    }));
    $('#gb-pause').addEventListener('click', (ev) => {
      const on = !ev.currentTarget.classList.toggle('active');
      graphInstance.setPaused(!on);
    });
    $('#gb-flow').addEventListener('click', (ev) => {
      graphInstance.setFlow(ev.currentTarget.classList.toggle('active'));
    });
    $('#gb-lite').addEventListener('click', () => {
      $('#gb-lite').classList.add('active'); $('#gb-full').classList.remove('active');
      graphInstance.setQuality('lite');
    });
    $('#gb-full').addEventListener('click', () => {
      $('#gb-full').classList.add('active'); $('#gb-lite').classList.remove('active');
      graphInstance.setQuality('full');
    });
    $('#gb-links').addEventListener('input', (ev) => {
      graphInstance.setLinkFraction(ev.target.value / 100);
      updateCounts();
    });
  }

  /* ============================ MINISTRY (MoE) ============================ */
  const PROVIDERS = {
    claude: { glyph: '⁜', color: '#e8703a' },
    openai: { glyph: '✳', color: '#10a37f' },
    gemini: { glyph: '✦', color: '#4e8cff' },
    glm: { glyph: '❆', color: '#6f86ff' },
    grok: { glyph: '∅', color: '#9aa0a6' },
    qwen: { glyph: '◈', color: '#8a5cf6' },
    deepseek: { glyph: '🐳', color: '#3f6fff' },
    xiaomi: { glyph: 'Mi', color: '#ff6900' },
    kimi: { glyph: 'K', color: '#cfd3d8' },
    minimax: { glyph: '▚', color: '#ff4d94' },
    tencent: { glyph: 'T', color: '#2f6bff' },
    nvidia: { glyph: '▣', color: '#76b900' },
  };
  // arena = leaderboard rank (null = unranked), cost = $/M output tokens, speed = tokens/sec
  const MODELS = [
    { name: 'Claude Opus 4.8', provider: 'claude', arena: 1, cost: 25, speed: 67, ctx: '1M', api: 'claude-opus-4-8' },
    { name: 'GPT-5.5', provider: 'openai', arena: 2, cost: 14, speed: 92, ctx: '400K', api: null },
    { name: 'GLM-5.2', provider: 'glm', arena: 4, cost: 3, speed: 105, ctx: '256K', api: null },
    { name: 'Claude Sonnet 4.6', provider: 'claude', arena: 5, cost: 9, speed: 88, ctx: '1M', api: 'claude-sonnet-5' },
    { name: 'Gemini 3.1 Pro Preview', provider: 'gemini', arena: 7, cost: 11, speed: 74, ctx: '2M', api: null },
    { name: 'Gemini 3.5 Flash', provider: 'gemini', arena: 8, cost: 1.5, speed: 160, ctx: '1M', api: null },
    { name: 'Grok 4.20', provider: 'grok', arena: 9, cost: 8, speed: 71, ctx: '256K', api: null },
    { name: 'Qwen3.7 Max', provider: 'qwen', arena: 10, cost: 2.4, speed: 96, ctx: '256K', api: null },
    { name: 'DeepSeek V4 Pro', provider: 'deepseek', arena: 11, cost: 1.8, speed: 84, ctx: '164K', api: null },
    { name: 'Xiaomi MiMo-V2.5', provider: 'xiaomi', arena: 12, cost: 0.9, speed: 118, ctx: '128K', api: null },
    { name: 'Kimi K2.6', provider: 'kimi', arena: 13, cost: 1.2, speed: 90, ctx: '256K', api: null },
    { name: 'MiniMax M3', provider: 'minimax', arena: 14, cost: 1.1, speed: 95, ctx: '245K', api: null },
    { name: 'Grok 4.3', provider: 'grok', arena: 15, cost: 4, speed: 80, ctx: '256K', api: null },
    { name: 'GPT-5.3 Codex', provider: 'openai', arena: null, cost: 12, speed: 85, ctx: '400K', api: null },
    { name: 'Claude Haiku 4.5', provider: 'claude', arena: null, cost: 5, speed: 140, ctx: '200K', api: 'claude-haiku-4-5-20251001' },
    { name: 'GPT-5.5 Pro', provider: 'openai', arena: null, cost: 60, speed: 40, ctx: '400K', api: null },
    { name: 'GPT-5.4 Nano', provider: 'openai', arena: null, cost: 0.4, speed: 190, ctx: '128K', api: null },
    { name: 'Gemini 3.1 Flash Lite', provider: 'gemini', arena: null, cost: 0.3, speed: 210, ctx: '1M', api: null },
    { name: 'Tencent Hy3 Preview', provider: 'tencent', arena: null, cost: 1, speed: 100, ctx: '128K', api: null },
    { name: 'Nemotron 3 Ultra 550B', provider: 'nvidia', arena: null, cost: 2.2, speed: 60, ctx: '128K', api: null },
  ];
  const modelByName = (n) => MODELS.find((m) => m.name === n);
  const provIcon = (provider, size = '') =>
    `<span class="prov-ico ${size}" style="--pc:${(PROVIDERS[provider] || {}).color || '#888'}">${(PROVIDERS[provider] || {}).glyph || '?'}</span>`;

  const COPY_PROVIDER = {
    claude: (m) => `provider: openrouter, model: anthropic/${(m.api || m.name.toLowerCase().replace(/[ .]/g, '-'))}`,
    openai: (m) => `provider: openai-codex, model: ${m.name.toLowerCase().replace(/[ ]/g, '-')}`,
    deepseek: () => 'provider: deepseek, model: deepseek-v4-pro',
    glm: () => 'provider: zhipu, model: glm-5.2',
    gemini: (m) => `provider: google, model: ${m.name.toLowerCase().replace(/[ ]/g, '-')}`,
  };
  const copyLine = (m) => (COPY_PROVIDER[m.provider] ? COPY_PROVIDER[m.provider](m) : `provider: openrouter, model: ${m.name.toLowerCase().replace(/[ ]/g, '-')}`);

  async function renderMinistry() {
    let preset = await fetchJSON('/api/ministry');
    let selected = null;      // model name picked from the bench
    let tab = 'arena';

    view.innerHTML = `
    <div class="page" style="max-width:1200px">
      <div class="min-head">
        <div class="min-art">
          <svg viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="6" r="3" stroke="#ff2e88" stroke-width="1.5"/>
            <circle cx="5" cy="17" r="2.6" stroke="#4d8dff" stroke-width="1.4"/>
            <circle cx="12" cy="18" r="2.6" stroke="#a855f7" stroke-width="1.4"/>
            <circle cx="19" cy="17" r="2.6" stroke="#22d3ee" stroke-width="1.4"/>
            <path d="M12 9v4M12 13H5.6M12 13h6.4M12 13v2.4" stroke="#5a6a95" stroke-width="1.1" stroke-dasharray="2 2"/>
          </svg>
        </div>
        <div>
          <div class="min-kicker">◈ PANTHEON · THE ENSEMBLE</div>
          <h1 class="min-title">MINISTRY OF EXPERTS</h1>
        </div>
        <span class="sep" style="flex:1"></span>
        <button class="gb-btn" id="min-default">↺ USE DEFAULT</button>
        <button class="gb-btn" id="min-close">CLOSE</button>
      </div>

      <div class="min-grid">
        <div>
          <div class="bench-head">
            <span class="card-label" style="margin:0">THE BENCH</span>
            <span class="bench-hint">click a model, then a seat</span>
            <span style="flex:1"></span>
            <div class="gb-toggle">
              <button data-tab="arena" class="active">ARENA</button>
              <button data-tab="cost">COST</button>
              <button data-tab="speed">SPEED</button>
            </div>
          </div>
          <div class="bench" id="bench"></div>
          <div class="card model-detail" id="model-detail"></div>
        </div>

        <div>
          <div class="card council-card">
            <div class="seat-zone">
              <div class="seat-label">CORE · ORCHESTRATOR</div>
              <div class="seat seat-core" data-seat="core"></div>
              <svg class="seat-links" viewBox="0 0 300 40" preserveAspectRatio="none">
                <path d="M150 0 V14 M150 14 H50 V40 M150 14 V40 M150 14 H250 V40" stroke="#3a5545" stroke-width="1.5" stroke-dasharray="4 4" fill="none"/>
              </svg>
              <div class="expert-row">
                ${[0, 1, 2].map((i) => `
                  <div class="expert-slot">
                    <div class="seat-label">EXPERT ${i + 1}</div>
                    <div class="seat seat-expert" data-seat="${i}"></div>
                  </div>`).join('')}
              </div>
            </div>
          </div>

          <div class="card" style="margin-top:14px">
            <div class="bench-head" style="margin-bottom:8px">
              <span class="card-label" style="margin:0">MAX TOKENS / CALL</span>
              <span style="flex:1"></span>
              <b id="tok-val" style="font-family:var(--serif);font-size:16px">${preset.maxTokens.toLocaleString()}</b>
            </div>
            <input type="range" id="tok-slider" min="256" max="16384" step="256" value="${preset.maxTokens}" style="width:100%;accent-color:var(--gold)">
            <div class="mem-path" style="margin-top:6px;color:var(--green)">Sweet spot — references stay short &amp; sharp, so the core gets clean signal (the ArenaBench default).</div>
            <div class="mem-path" style="margin-top:4px">CHANGE IT ANYTIME · SMALLER USUALLY = SHARPER MOA</div>
          </div>

          <button class="save-btn" id="min-save">↓ SAVE TO THIS COMPUTER</button>
          <div class="mem-path" style="margin:8px 2px 0" id="save-note">writes the preset into the agent's config — no copy-paste, backed up first</div>

          <div class="card copy-card">
            <div class="bench-head" style="margin-bottom:10px">
              <span class="card-label" style="margin:0">◈ COPY FOR ${esc(agent.name.toUpperCase())}</span>
              <span style="flex:1"></span>
              <button class="gb-btn" id="min-copy">COPY</button>
            </div>
            <pre id="copy-text"></pre>
          </div>
        </div>
      </div>
    </div>`;

    const bench = $('#bench');

    function sortedModels() {
      const list = [...MODELS];
      if (tab === 'cost') list.sort((a, b) => a.cost - b.cost);
      else if (tab === 'speed') list.sort((a, b) => b.speed - a.speed);
      else list.sort((a, b) => (a.arena || 99) - (b.arena || 99));
      return list;
    }

    function seatBadge(name) {
      if (preset.core.name === name) return '<span class="seat-badge crown">👑</span>';
      const i = preset.experts.findIndex((e) => e && e.name === name);
      return i >= 0 ? `<span class="seat-badge num">${i + 1}</span>` : '';
    }

    function drawBench() {
      bench.innerHTML = sortedModels().map((m) => {
        const sub = tab === 'cost' ? `$${m.cost}/M out` : tab === 'speed' ? `${m.speed} t/s` : m.arena ? `Arena #${m.arena}` : 'unranked';
        return `
        <button class="bench-card ${selected === m.name ? 'selected' : ''}" data-model="${esc(m.name)}">
          ${provIcon(m.provider)}
          <span class="bc-text"><span class="bc-name">${esc(m.name)}</span><span class="bc-sub ${m.arena ? '' : 'unranked'}">${sub}</span></span>
          ${seatBadge(m.name)}
        </button>`;
      }).join('');
    }

    function drawSeat(el, entry, removable) {
      if (!entry) { el.innerHTML = '<span class="seat-empty">＋</span>'; el.classList.add('empty'); return; }
      el.classList.remove('empty');
      el.innerHTML = `${provIcon(entry.provider, 'big')}<span class="seat-name">${esc(entry.name)}</span>${removable ? '<button class="seat-x" title="Remove">✕</button>' : ''}`;
    }

    function drawSeats() {
      drawSeat($('.seat-core'), preset.core, false);
      view.querySelectorAll('.seat-expert').forEach((el, i) => drawSeat(el, preset.experts[i], true));
      $('.seat-core').insertAdjacentHTML('beforeend', '<span class="seat-crown">👑</span>');
    }

    function drawDetail() {
      const m = modelByName(selected || preset.core.name);
      if (!m) { $('#model-detail').innerHTML = ''; return; }
      const quality = m.arena ? Math.max(20, 100 - (m.arena - 1) * 5) : 45;
      const costPct = Math.min(100, (m.cost / 60) * 100);
      const speedPct = Math.min(100, (m.speed / 210) * 100);
      $('#model-detail').innerHTML = `
        <div class="md-head">${provIcon(m.provider, 'big')}
          <div><b>${esc(m.name)}</b> ${m.arena ? `<span class="tag ok" style="margin-left:6px">Arena #${m.arena}</span>` : '<span class="tag off" style="margin-left:6px">unranked</span>'}
          <div class="mem-path" style="margin-top:4px">${m.ctx} CONTEXT · ${m.api ? 'CONNECTABLE (ANTHROPIC)' : 'VIA OPENROUTER'}</div></div>
        </div>
        <div class="md-bar"><span>QUALITY</span><div><i style="width:${quality}%;background:var(--green)"></i></div><b>${m.arena ? '#' + m.arena : '—'}</b></div>
        <div class="md-bar"><span>COST</span><div><i style="width:${costPct}%;background:var(--red)"></i></div><b>$${m.cost}</b></div>
        <div class="md-bar"><span>SPEED</span><div><i style="width:${speedPct}%;background:var(--gold)"></i></div><b>${m.speed} t/s</b></div>`;
    }

    function copyText() {
      return [
        `Hey ${agent.name} — set up a Mixture of Agents preset for me (your \`moa\` feature). Call it "ministry".`,
        '',
        "CORE MODEL — the aggregator. Reads every expert's proposal, writes the final answer, runs the tools:",
        `  • ${preset.core.name} — ${copyLine(modelByName(preset.core.name) || preset.core)}`,
        '',
        'EXPERTS — the reference models. Each proposes in parallel (no tools); the core then decides:',
        ...preset.experts.filter(Boolean).map((e) => `  • ${e.name} — ${copyLine(modelByName(e.name) || e)}`),
        '',
        `MAX TOKENS per expert call: ${preset.maxTokens}.`,
      ].join('\n');
    }

    function drawAll() { drawBench(); drawSeats(); drawDetail(); $('#copy-text').textContent = copyText(); }
    drawAll();

    view.querySelector('.bench-head .gb-toggle').addEventListener('click', (ev) => {
      const btn = ev.target.closest('[data-tab]');
      if (!btn) return;
      tab = btn.dataset.tab;
      view.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('active', b === btn));
      drawBench();
    });

    bench.addEventListener('click', (ev) => {
      const card = ev.target.closest('.bench-card');
      if (!card) return;
      selected = selected === card.dataset.model ? null : card.dataset.model;
      drawBench(); drawDetail();
    });

    view.querySelectorAll('.seat').forEach((seat) => seat.addEventListener('click', (ev) => {
      if (ev.target.classList.contains('seat-x')) {
        preset.experts[seat.dataset.seat] = null;
        drawAll();
        return;
      }
      if (!selected) return;
      const m = modelByName(selected);
      const entry = { name: m.name, provider: m.provider, api: m.api };
      if (seat.dataset.seat === 'core') preset.core = entry;
      else preset.experts[seat.dataset.seat] = entry;
      selected = null;
      drawAll();
    }));

    $('#tok-slider').addEventListener('input', (ev) => {
      preset.maxTokens = +ev.target.value;
      $('#tok-val').textContent = preset.maxTokens.toLocaleString();
      $('#copy-text').textContent = copyText();
    });

    $('#min-default').addEventListener('click', async () => {
      preset = {
        core: { name: 'Claude Opus 4.8', provider: 'claude', api: 'claude-opus-4-8' },
        experts: [
          { name: 'GPT-5.5', provider: 'openai', api: null },
          { name: 'GLM-5.2', provider: 'glm', api: null },
          { name: 'DeepSeek V4 Pro', provider: 'deepseek', api: null },
        ],
        maxTokens: 4096,
      };
      $('#tok-slider').value = 4096;
      $('#tok-val').textContent = '4,096';
      drawAll();
    });

    $('#min-save').addEventListener('click', async () => {
      const body = { ...preset, experts: preset.experts.filter(Boolean) };
      const out = await fetch('/api/ministry', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json());
      $('#save-note').textContent = out.ok ? `✓ saved — ${out.file}` : '⚠ ' + (out.error || 'save failed');
      $('#save-note').style.color = out.ok ? 'var(--green)' : 'var(--red)';
    });

    $('#min-copy').addEventListener('click', async (ev) => {
      await navigator.clipboard.writeText($('#copy-text').textContent).catch(() => {});
      ev.target.textContent = 'COPIED ✓';
      setTimeout(() => { ev.target.textContent = 'COPY'; }, 1500);
    });

    $('#min-close').addEventListener('click', () => { location.hash = '#/home'; });
  }

  /* ================================ DREAMS ================================ */
  async function renderDreams() {
    const dreams = await fetchJSON('/api/dreams');
    view.innerHTML = `
    <div class="page">
      <div class="min-head" style="margin-bottom:6px">
        <div>
          <div class="min-kicker">☾ LEVEL 4 · OVERNIGHT AGENTS</div>
          <h1 class="min-title">Dreams</h1>
        </div>
        <span style="flex:1"></span>
        <button class="save-btn" id="dream-run" style="margin:0;width:auto;padding:0 22px">☾ RUN DREAM NOW</button>
      </div>
      <div class="page-sub">While you sleep, ${agent.name} reviews your goals, sessions and memory, then leaves a report here. Scheduled nightly at 03:00 while the server runs.</div>
      <div id="dream-list" class="row" style="grid-template-columns:1fr">
        ${dreams.map(dreamCard).join('') || '<div class="card gp-empty">No dreams yet. Run one now, or leave the server running overnight.</div>'}
      </div>
    </div>`;

    function dreamCard(d) {
      return `<div class="card dream-card">
        <div class="bench-head" style="margin-bottom:10px">
          <span class="card-label" style="margin:0">☾ DREAM · ${new Date(d.ts).toLocaleString().toUpperCase()}</span>
          <span style="flex:1"></span>
          <span class="tag ${d.model === 'simulated' ? 'off' : 'ok'}">${esc(d.model.toUpperCase())}</span>
          <span class="tag" style="color:var(--muted)">${esc(d.trigger.toUpperCase())}</span>
        </div>
        <pre class="dream-body">${esc(d.body)}</pre>
      </div>`;
    }

    $('#dream-run').addEventListener('click', async (ev) => {
      ev.target.disabled = true;
      ev.target.textContent = '☾ DREAMING…';
      const dream = await fetch('/api/dreams/run', { method: 'POST' }).then((r) => r.json());
      ev.target.disabled = false;
      ev.target.textContent = '☾ RUN DREAM NOW';
      if (dream.error) { alert(dream.error); return; }
      $('#dream-list').insertAdjacentHTML('afterbegin', dreamCard(dream));
      $('#dream-list .gp-empty')?.remove();
    });
  }

  /* ================================ SKILLS ================================ */
  function skillHash(name) {
    let h = 0;
    for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return h;
  }

  async function renderSkills() {
    const skills = await fetchJSON('/api/skills');
    const rate = profile.hourlyRate || 50;
    let totalSaved = 0;
    const rows = skills.map((sk) => {
      const uses = 3 + (skillHash(sk.name) % 18);           // estimated runs
      const minutes = uses * 14;                             // ~14 min saved per run
      const roi = (minutes / 60) * rate;
      totalSaved += roi;
      return { ...sk, uses, minutes, roi };
    });
    view.innerHTML = `
    <div class="page">
      <div class="page-title">Skills</div>
      <div class="page-sub">Capabilities installed for ${agent.name} · ${skills.length} on disk · est. value returned <b style="color:var(--green)">$${totalSaved.toFixed(0)}</b> at $${rate}/hr</div>
      <div class="row skills-grid">
        ${rows.map((sk) => `
          <div class="card skill-card">
            <h4>${esc(sk.name)}</h4>
            <p>${esc(sk.description || 'No description.')}</p>
            <div class="skill-roi">
              <span>${sk.uses} RUNS</span><span>~${(sk.minutes / 60).toFixed(1)}H SAVED</span><span class="roi-val">≈ $${sk.roi.toFixed(0)} ROI</span>
            </div>
            <div class="when">UPDATED ${sk.updatedAt ? timeAgo(sk.updatedAt).toUpperCase() : '—'} · ROI ESTIMATED</div>
          </div>`).join('') || '<div class="gp-empty">No skills found in the skills directory.</div>'}
      </div>
    </div>`;
  }

  /* =============================== AI SPEND =============================== */
  async function renderSpend() {
    const spend = await fetchJSON('/api/spend');
    const maxDay = Math.max(0.0001, ...spend.days.map((d) => d.cost));
    const sessionsCount = summary.stats.sessions;
    const hoursSaved = (sessionsCount * 12) / 60; // ~12 min saved per session
    const roi = hoursSaved * (profile.hourlyRate || 50);
    view.innerHTML = `
    <div class="page">
      <div class="page-title">AI Spend</div>
      <div class="page-sub">${spend.simulated ? 'Simulated ledger — real API calls will replace this automatically.' : 'Real usage from this OS\'s API calls.'}</div>
      <div class="row stats-row" style="margin:0 0 14px">
        <div class="stat-tile"><div class="card-label">TODAY</div><div class="stat-big">$${spend.today.toFixed(2)}</div><div class="stat-foot">SINCE MIDNIGHT</div></div>
        <div class="stat-tile"><div class="card-label">LAST 7 DAYS</div><div class="stat-big">$${spend.week.toFixed(2)}</div><div class="stat-foot">ROLLING WEEK</div></div>
        <div class="stat-tile"><div class="card-label">ALL TIME</div><div class="stat-big">$${spend.total.toFixed(2)}</div><div class="stat-foot">${spend.calls} CALLS LOGGED</div></div>
        <div class="stat-tile"><div class="card-label">TOKENS</div>
          <div class="stat-big" style="font-size:23px;gap:7px;flex-wrap:wrap">${fmtChars(spend.totalIn)}<span style="color:var(--dim);font-size:12px">IN</span><span style="color:var(--line-2)">/</span>${fmtChars(spend.totalOut)}<span style="color:var(--dim);font-size:12px">OUT</span></div>
          <div class="stat-foot">PROMPT · COMPLETION</div></div>
      </div>
      <div class="card" style="margin-bottom:14px">
        <div class="card-label">DAILY SPEND · 14 DAYS</div>
        <div class="spend-chart">
          ${spend.days.map((d) => `<div class="spend-col" title="${d.day} — $${d.cost.toFixed(3)}"><div class="spend-bar" style="height:${Math.max(2, (d.cost / maxDay) * 100)}%"></div><span>${d.day.slice(3)}</span></div>`).join('')}
        </div>
      </div>
      <div class="row" style="grid-template-columns:1.4fr 1fr">
        <div class="card">
          <div class="card-label">BY MODEL</div>
          <table class="spend-table">
            <tr><th>MODEL</th><th>CALLS</th><th>IN</th><th>OUT</th><th>COST</th></tr>
            ${Object.entries(spend.byModel).sort((a, b) => b[1].cost - a[1].cost).map(([m, v]) => `
              <tr><td>${esc(m)}</td><td>${v.calls}</td><td>${fmtChars(v.in)}</td><td>${fmtChars(v.out)}</td><td>$${v.cost.toFixed(3)}</td></tr>`).join('')}
          </table>
        </div>
        <div class="card">
          <div class="card-label">RETURN ON SPEND</div>
          <div class="stat-big" style="color:var(--green)">≈ $${roi.toFixed(0)}</div>
          <div class="stat-foot" style="letter-spacing:1px;line-height:1.8">EST. TIME VALUE RETURNED — ${sessionsCount} SESSIONS × ~12 MIN SAVED AT $${profile.hourlyRate || 50}/HR${profile.name ? ' · OPERATOR: ' + esc(profile.name.toUpperCase()) : ''}</div>
        </div>
      </div>
    </div>`;
  }

  /* =============================== DOCUMENTS =============================== */
  async function renderDocuments() {
    const { vault, docs } = await fetchJSON('/api/docs');
    view.innerHTML = `
    <div class="page">
      <div class="page-title">Documents</div>
      <div class="page-sub">${vault ? `Obsidian vault: ${esc(vault)} + Claude memory files` : 'Claude memory files — set OBSIDIAN_VAULT=/path/to/vault to index your Obsidian notes too'} · ${docs.length} markdown files</div>
      <input class="goal-input" id="doc-search" placeholder="Search documents…" style="width:100%;margin-bottom:14px">
      <div class="row" style="grid-template-columns:340px 1fr;align-items:start">
        <div class="card doc-list" id="doc-list"></div>
        <div class="card"><pre class="doc-view" id="doc-view">Select a document.</pre></div>
      </div>
    </div>`;
    const list = $('#doc-list');
    const draw = (q = '') => {
      const filtered = docs.filter((d) => (d.name + d.rel).toLowerCase().includes(q.toLowerCase())).slice(0, 100);
      list.innerHTML = filtered.map((d) => `
        <button class="doc-item" data-p="${esc(d.path)}">
          <span class="doc-src ${d.source}">${d.source === 'obsidian' ? '◆' : '⁜'}</span>
          <span class="bc-text"><span class="bc-name">${esc(d.name)}</span><span class="bc-sub unranked">${esc(d.rel)}</span></span>
          <span class="when" style="color:var(--dim);font-size:9px">${timeAgo(d.mtime)}</span>
        </button>`).join('') || '<div class="gp-empty">No matches.</div>';
    };
    draw();
    $('#doc-search').addEventListener('input', (ev) => draw(ev.target.value));
    list.addEventListener('click', async (ev) => {
      const item = ev.target.closest('.doc-item');
      if (!item) return;
      list.querySelectorAll('.doc-item').forEach((b) => b.classList.toggle('selected', b === item));
      const out = await fetchJSON('/api/doc?p=' + encodeURIComponent(item.dataset.p));
      $('#doc-view').textContent = out.content || out.error || '';
    });
  }

  /* =============================== CHAT LOGS =============================== */
  async function renderChatLogs() {
    const sessions = await fetchJSON('/api/sessions');
    view.innerHTML = `
    <div class="page">
      <div class="page-title">Chat Logs</div>
      <div class="page-sub">Local conversation history — imported into the shared memory · ${sessions.length} sessions</div>
      <input class="goal-input" id="log-search" placeholder="Search sessions…" style="width:100%;margin-bottom:14px">
      <div id="log-list" class="row" style="grid-template-columns:1fr"></div>
    </div>`;
    const listEl = $('#log-list');
    const draw = (q = '') => {
      const filtered = sessions.filter((s) => (s.title + s.project).toLowerCase().includes(q.toLowerCase()));
      listEl.innerHTML = filtered.map((s) => `
        <div class="card log-card" data-sid="${esc(s.id)}">
          <div class="bench-head" style="margin:0;cursor:pointer">
            <span class="feed-type session">${esc(s.project.toUpperCase())}</span>
            <b style="font-size:12.5px">${esc(s.title)}</b>
            <span style="flex:1"></span>
            <span class="when" style="color:var(--dim);font-size:10px">${s.messages} msgs · ${timeAgo(s.lastTs)}</span>
          </div>
          <div class="log-transcript" style="display:none"></div>
        </div>`).join('') || '<div class="card gp-empty">No sessions match.</div>';
    };
    draw();
    $('#log-search').addEventListener('input', (ev) => draw(ev.target.value));
    listEl.addEventListener('click', async (ev) => {
      const card = ev.target.closest('.log-card');
      if (!card) return;
      const box = card.querySelector('.log-transcript');
      if (box.style.display === 'none') {
        box.style.display = 'block';
        if (!box.dataset.loaded) {
          box.innerHTML = '<div class="gp-empty">Loading…</div>';
          const transcript = await fetch('/api/session/' + card.dataset.sid).then((r) => (r.ok ? r.json() : null)).catch(() => null);
          box.dataset.loaded = '1';
          box.innerHTML = transcript
            ? transcript.map((m) => `<div class="log-msg ${m.role}"><span>${m.role === 'user' ? 'OP' : 'AI'}</span>${esc(m.text)}</div>`).join('')
            : '<div class="gp-empty">Transcript preview unavailable (demo session).</div>';
        }
      } else box.style.display = 'none';
    });
  }

  /* ============================== AUTOMATIONS ============================== */
  async function renderAutomations() {
    let autos = await fetchJSON('/api/automations');
    view.innerHTML = `
    <div class="page">
      <div class="page-title">Automations</div>
      <div class="page-sub">Scheduled workflows ${agent.name} runs while the server is up. Dreams (03:00) is built in — add your own below.</div>
      <div class="card" style="margin-bottom:14px">
        <div class="card-label">NEW AUTOMATION</div>
        <div class="row" style="grid-template-columns:1fr 120px;margin-bottom:10px">
          <input class="goal-input" id="auto-name" placeholder="Name — e.g. Morning briefing">
          <select class="goal-input" id="auto-hour">${[...Array(24)].map((_, h) => `<option value="${h}" ${h === 7 ? 'selected' : ''}>${String(h).padStart(2, '0')}:00</option>`).join('')}</select>
        </div>
        <textarea class="goal-input" id="auto-prompt" rows="3" style="width:100%;height:auto;padding:10px 12px;resize:vertical" placeholder="What should run? e.g. Review my open goals and draft a prioritized plan for today."></textarea>
        <button class="goal-add" id="auto-add" style="margin-top:10px">＋ SCHEDULE</button>
      </div>
      <div id="auto-list" class="row" style="grid-template-columns:1fr"></div>
    </div>`;

    const listEl = $('#auto-list');
    const draw = () => {
      listEl.innerHTML = [
        `<div class="card auto-card">
          <div class="bench-head" style="margin:0">
            <span class="feed-type memory">BUILT-IN</span><b style="font-size:12.5px">☾ Dreams — nightly review</b>
            <span style="flex:1"></span><span class="tag ok">03:00 DAILY</span>
          </div>
        </div>`,
        ...autos.map((a) => `
        <div class="card auto-card">
          <div class="bench-head" style="margin:0">
            <span class="feed-type skill">CUSTOM</span><b style="font-size:12.5px">${esc(a.name)}</b>
            <span style="flex:1"></span>
            <span class="tag ok">${String(a.hour).padStart(2, '0')}:00 DAILY</span>
            <button class="gb-btn" data-run="${a.id}">▶ RUN NOW</button>
            <button class="gb-btn" data-del="${a.id}" style="color:var(--red)">✕</button>
          </div>
          <div class="mem-path" style="margin-top:8px">${esc(a.prompt)}</div>
          ${a.lastResult ? `<pre class="dream-body" style="margin-top:10px;border-top:1px solid var(--line);padding-top:10px">LAST RUN ${timeAgo(a.lastRun).toUpperCase()} · ${esc((a.lastModel || '').toUpperCase())}\n\n${esc(a.lastResult)}</pre>` : ''}
        </div>`),
      ].join('');
    };
    draw();

    $('#auto-add').addEventListener('click', async () => {
      const name = $('#auto-name').value.trim(), prompt = $('#auto-prompt').value.trim();
      if (!name || !prompt) return;
      autos = await fetch('/api/automations', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, prompt, hour: +$('#auto-hour').value }) }).then((r) => r.json());
      $('#auto-name').value = ''; $('#auto-prompt').value = '';
      draw();
    });
    listEl.addEventListener('click', async (ev) => {
      const run = ev.target.closest('[data-run]'), del = ev.target.closest('[data-del]');
      if (run) {
        run.textContent = '⏳ RUNNING…';
        await fetch('/api/automations/' + run.dataset.run + '/run', { method: 'POST' });
        autos = await fetchJSON('/api/automations');
        draw();
      } else if (del) {
        autos = await fetch('/api/automations/' + del.dataset.del + '/delete', { method: 'POST' }).then((r) => r.json());
        draw();
      }
    });
  }

  /* ============================== INTEGRATIONS ============================== */
  function renderIntegrations() {
    const s = summary;
    const tiles = [
      { name: 'Anthropic API', desc: 'Direct Claude access for chat, council, dreams', on: s.chatLive, how: 'ANTHROPIC_API_KEY' },
      { name: 'OpenRouter', desc: 'One endpoint for GPT, GLM, DeepSeek and 200+ models', on: s.orLive, how: 'OPENROUTER_API_KEY' },
      { name: 'Obsidian Vault', desc: 'Markdown knowledge base indexed into Documents', on: Boolean(s.vault), how: 'OBSIDIAN_VAULT=/path/to/vault' },
      { name: 'Claude Code Data', desc: 'Sessions, skills and memory from ' + s.dataDir, on: !s.demo, how: 'CLAUDE_HOME' },
      { name: 'Gmail', desc: 'Inbox triage and drafts', on: false, how: 'coming soon' },
      { name: 'Calendar', desc: 'Meeting summaries into memory', on: false, how: 'coming soon' },
      { name: 'Browser', desc: 'Web research with citations', on: false, how: 'coming soon' },
      { name: 'CRM (Zoho)', desc: 'Deals and contacts in the knowledge graph', on: false, how: 'coming soon' },
    ];
    view.innerHTML = `
    <div class="page">
      <div class="page-title">Integrations</div>
      <div class="page-sub">Connections available to ${agent.name}</div>
      <div class="row" style="grid-template-columns:repeat(2,1fr)">
        ${tiles.map((t) => `
          <div class="card setting-row">
            <div><div class="k">${t.name}</div><div class="d">${t.desc}</div></div>
            <div style="text-align:right">
              <span class="tag ${t.on ? 'ok' : 'off'}">${t.on ? 'CONNECTED' : 'NOT CONNECTED'}</span>
              <div class="d" style="margin-top:6px">${t.on ? '' : t.how}</div>
            </div>
          </div>`).join('')}
      </div>
    </div>`;
  }

  /* =============================== ACTIVITY =============================== */
  async function renderActivity() {
    const events = await fetchJSON('/api/activity');
    view.innerHTML = `
    <div class="page">
      <div class="page-title">Activity</div>
      <div class="page-sub">Everything ${agent.name} has touched, newest first</div>
      <div class="card feed">
        ${events.map((e) => `
          <div class="feed-item">
            <span class="feed-type ${e.type}">${e.type.toUpperCase()}</span>
            <div><div class="feed-label">${esc(e.label)}</div><div class="feed-detail">${esc(e.detail)}</div></div>
            <span class="feed-when">${timeAgo(e.ts)}</span>
          </div>`).join('')}
      </div>
    </div>`;
  }

  /* =============================== SETTINGS =============================== */
  function renderSettings() {
    const s = summary;
    view.innerHTML = `
    <div class="page">
      <div class="page-title">Settings</div>
      <div class="page-sub">Local operator configuration</div>
      <div class="card settings-list">
        <div class="setting-row">
          <div><div class="k">Chat mode</div><div class="d">Set ANTHROPIC_API_KEY before npm start to go live</div></div>
          <span class="tag ${s.chatLive ? 'ok' : 'off'}">${s.chatLive ? 'LIVE · API KEY SET' : 'SIMULATED · NO API KEY'}</span>
        </div>
        <div class="setting-row">
          <div><div class="k">Data directory</div><div class="d">Sessions, skills and memory are read from here</div></div>
          <span class="v">${esc(s.dataDir)}</span>
        </div>
        <div class="setting-row">
          <div><div class="k">Data source</div><div class="d">Falls back to demo data when no sessions exist</div></div>
          <span class="tag ${s.demo ? 'off' : 'ok'}">${s.demo ? 'DEMO DATA' : 'REAL DATA'}</span>
        </div>
        <div class="setting-row">
          <div><div class="k">Active agent</div><div class="d">Switch agents in the sidebar</div></div>
          <span class="v">${agent.chip}</span>
        </div>
        <div class="setting-row">
          <div><div class="k">Build</div><div class="d">Claude Code OS operator shell</div></div>
          <span class="v">${s.version} · ${s.build}</span>
        </div>
      </div>
    </div>`;
  }

  /* ================================ ROUTER ================================ */
  const routes = {
    home: renderHome,
    skills: renderSkills,
    memory: () => renderGraphPage('macro'),
    graph: () => renderGraphPage('full'),
    activity: renderActivity,
    dreams: renderDreams,
    ministry: renderMinistry,
    documents: renderDocuments,
    chatlogs: renderChatLogs,
    automations: renderAutomations,
    spend: renderSpend,
    integrations: renderIntegrations,
    settings: renderSettings,
  };

  async function doNavigate() {
    const route = (location.hash.replace('#/', '') || 'home').split('?')[0];
    const render = routes[route] || renderHome;
    document.querySelectorAll('[data-route]').forEach((a) => a.classList.toggle('active', a.dataset.route === route));
    if (graphInstance) { graphInstance.destroy(); graphInstance = null; }
    view.innerHTML = '<div class="page" style="color:var(--dim);padding:40px 0">LOADING…</div>';
    await render();
  }

  // Serialize navigations: two overlapping renders would wire listeners to a
  // DOM the other one has already replaced.
  let navChain = Promise.resolve();
  function navigate() {
    navChain = navChain.then(doNavigate, doNavigate);
    return navChain;
  }

  function setAgent(key) {
    agent = AGENTS[key];
    document.documentElement.dataset.agent = key;
    document.getElementById('agent-jarvis').classList.toggle('active', key === 'jarvis');
    document.getElementById('agent-openclaw').classList.toggle('active', key === 'openclaw');
    document.getElementById('topbar-agent').textContent = agent.chip;
    // Setting the hash fires hashchange → navigate(); only navigate directly
    // when we're already on the target route.
    if (location.hash === '#/ministry') navigate();
    else location.hash = '#/ministry';
  }
  // Clicking an agent selects it and opens its Ministry of Experts config
  document.getElementById('agent-jarvis').addEventListener('click', () => setAgent('jarvis'));
  document.getElementById('agent-openclaw').addEventListener('click', () => setAgent('openclaw'));

  window.addEventListener('hashchange', navigate);

  /* ============================ ONBOARDING (L?) ============================ */
  function applyProfile() {
    if (!profile.name) return;
    document.querySelector('.op-name').textContent = profile.name;
    document.querySelector('.op-avatar').textContent = profile.name.trim().slice(0, 2).toUpperCase();
  }

  function showOnboarding() {
    const overlay = document.createElement('div');
    overlay.id = 'onboard';
    overlay.innerHTML = `
      <div class="ob-card">
        <div class="min-kicker">⁜ FIRST BOOT · OPERATOR SETUP</div>
        <h2 style="font-family:var(--serif);font-size:26px;margin:8px 0 4px">Welcome, operator.</h2>
        <p style="color:var(--muted);font-size:12px;line-height:1.6;margin-bottom:18px">Three questions. ${agent.name} uses these to personalize the OS and estimate the value of time it saves you.</p>
        <label class="ob-label">YOUR NAME</label>
        <input class="goal-input ob-in" id="ob-name" placeholder="e.g. Aaryaman">
        <label class="ob-label">YOUR HOURLY RATE (USD) — FOR ROI TRACKING</label>
        <input class="goal-input ob-in" id="ob-rate" type="number" value="50" min="0">
        <label class="ob-label">WHAT ARE YOU BUILDING? (STEERS DREAMS &amp; MEMORY)</label>
        <input class="goal-input ob-in" id="ob-focus" placeholder="e.g. Hikaré luxury diamond brand, Zoho consulting">
        <button class="save-btn" id="ob-go">ENTER THE OS →</button>
        <button class="ob-skip" id="ob-skip">skip for now</button>
      </div>`;
    document.body.appendChild(overlay);
    const finish = async (save) => {
      if (save) {
        profile = {
          name: overlay.querySelector('#ob-name').value.trim(),
          hourlyRate: +overlay.querySelector('#ob-rate').value || 50,
          focus: overlay.querySelector('#ob-focus').value.trim(),
        };
        await fetch('/api/profile', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(profile) });
        applyProfile();
      } else {
        profile.name = profile.name || ' ';
      }
      overlay.remove();
    };
    overlay.querySelector('#ob-go').addEventListener('click', () => finish(true));
    overlay.querySelector('#ob-skip').addEventListener('click', () => finish(false));
  }

  /* ========================= FLOATING VOICE WIDGET ========================= */
  function initVoiceWidget() {
    const btn = document.getElementById('voice-widget');
    const panel = document.getElementById('voice-panel');
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const say = (text) => { if (window.speechSynthesis) { speechSynthesis.cancel(); speechSynthesis.speak(new SpeechSynthesisUtterance(text)); } };
    if (!SR) {
      btn.addEventListener('click', () => alert('Voice control needs a browser with the Web Speech API (Chrome/Edge).'));
      return;
    }
    const NAV = [
      [/memory|graph/, '#/memory', 'Opening the memory graph.'],
      [/skill/, '#/skills', 'Opening skills.'],
      [/dream/, '#/dreams', 'Opening dreams.'],
      [/document|note|obsidian/, '#/documents', 'Opening documents.'],
      [/chat log|history|conversation/, '#/chatlogs', 'Opening chat logs.'],
      [/automation/, '#/automations', 'Opening automations.'],
      [/spend|cost|money|budget/, '#/spend', 'Opening AI spend.'],
      [/integration/, '#/integrations', 'Opening integrations.'],
      [/ministry|council|expert/, '#/ministry', 'Convening the ministry.'],
      [/activity/, '#/activity', 'Opening activity.'],
      [/setting/, '#/settings', 'Opening settings.'],
      [/home|dashboard/, '#/home', 'Going home.'],
    ];
    const rec = new SR();
    rec.lang = 'en-US';
    let listening = false;
    rec.onresult = async (ev) => {
      const text = ev.results[0][0].transcript;
      panel.querySelector('.vp-text').textContent = '“' + text + '”';
      const lower = text.toLowerCase();
      if (/run (a )?dream/.test(lower)) {
        say('Dreaming now, operator.');
        await fetch('/api/dreams/run', { method: 'POST' });
        location.hash = '#/dreams';
        if (location.hash === '#/dreams') navigate();
        return;
      }
      for (const [re, hash, reply] of NAV) {
        if (re.test(lower) && /open|show|go|take|view|navigate/.test(lower)) {
          say(reply);
          location.hash = hash;
          return;
        }
      }
      // Fall through: ask the agent in the home chat
      say('Asking Jarvis.');
      sessionStorage.setItem('pendingAsk', text);
      if (location.hash === '#/home' || location.hash === '') navigate();
      else location.hash = '#/home';
    };
    rec.onend = () => { listening = false; btn.classList.remove('live'); setTimeout(() => panel.classList.remove('show'), 1600); };
    btn.addEventListener('click', () => {
      if (listening) { rec.stop(); return; }
      listening = true;
      btn.classList.add('live');
      panel.classList.add('show');
      panel.querySelector('.vp-text').textContent = '';
      rec.start();
    });
  }

  (async function boot() {
    [summary, profile] = await Promise.all([fetchJSON('/api/summary'), fetchJSON('/api/profile')]);
    $('#version-chip').textContent = `${summary.version} · ${summary.build}`;
    applyProfile();
    navigate();
    initVoiceWidget();
    if (!profile.name) showOnboarding();
    setInterval(async () => { summary = await fetchJSON('/api/summary'); }, 30000);
  })();
})();
