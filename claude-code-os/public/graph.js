/* Force-directed memory graph renderer for Claude Code OS. */
(function () {
  const COLORS = {
    core: '#22d3ee',
    workspace: '#e9edfa',
    file: '#ffb020',
    decision: '#a855f7',
    session: '#4d8dff',
    skill: '#ff2e88',
  };
  const RADII = { core: 16, workspace: 7, file: 3.2, decision: 4.2, session: 5, skill: 5.5 };
  // Which node types each layout mode shows
  const MODES = {
    macro: ['core', 'workspace', 'skill'],
    mid: ['core', 'workspace', 'skill', 'session'],
    micro: ['core', 'workspace', 'skill', 'session', 'decision'],
    full: ['core', 'workspace', 'skill', 'session', 'decision', 'file'],
  };

  function MemoryGraph(canvas, data, opts = {}) {
    const ctx = canvas.getContext('2d');
    const nodes = data.nodes.map((n) => ({ ...n }));
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const edges = data.edges
      .map((e) => ({ source: byId.get(e.source), target: byId.get(e.target) }))
      .filter((e) => e.source && e.target);

    for (const n of nodes) n.degree = 0;
    for (const e of edges) { e.source.degree++; e.target.degree++; }

    const state = {
      mode: opts.mode || 'macro',
      paused: false,
      flow: true,
      quality: 'full',      // 'lite' | 'full'
      linkFraction: 0.55,
      zoom: 1,
      panX: 0,
      panY: 0,
      hover: null,
      time: 0,
    };

    // Seed positions: core center, others in type-clustered rings
    const angleOf = { workspace: 0, session: 1.3, decision: 2.7, skill: 4.1, file: 5.2 };
    let i = 0;
    for (const n of nodes) {
      if (n.type === 'core') { n.x = 0; n.y = 0; n.pinned = true; continue; }
      const base = (angleOf[n.type] || 0) + (i * 2.399963); // golden angle scatter
      const dist = 120 + (i % 17) * 22 + Math.random() * 60;
      n.x = Math.cos(base) * dist;
      n.y = Math.sin(base) * dist;
      n.vx = 0; n.vy = 0;
      i++;
    }

    function visibleNodes() {
      const types = MODES[state.mode];
      return nodes.filter((n) => types.includes(n.type));
    }
    function visibleEdges(visSet) {
      const keep = Math.floor(edges.length * state.linkFraction);
      const out = [];
      for (let k = 0; k < edges.length && out.length < keep; k++) {
        const e = edges[k];
        if (visSet.has(e.source) && visSet.has(e.target)) out.push(e);
      }
      return out;
    }

    function tick() {
      if (state.paused) return;
      const vis = visibleNodes();
      const visSet = new Set(vis);
      const vEdges = visibleEdges(visSet);

      // repulsion (O(n²), fine at ≤~450 nodes)
      for (let a = 0; a < vis.length; a++) {
        const na = vis[a];
        for (let b = a + 1; b < vis.length; b++) {
          const nb = vis[b];
          let dx = na.x - nb.x, dy = na.y - nb.y;
          let d2 = dx * dx + dy * dy;
          if (d2 < 1) { d2 = 1; dx = Math.random() - 0.5; dy = Math.random() - 0.5; }
          if (d2 > 90000) continue;
          const f = 320 / d2;
          const fx = dx * f, fy = dy * f;
          if (!na.pinned) { na.vx += fx; na.vy += fy; }
          if (!nb.pinned) { nb.vx -= fx; nb.vy -= fy; }
        }
      }
      // springs
      for (const e of vEdges) {
        const rest = e.source.type === 'core' || e.target.type === 'core' ? 170 : 62;
        const dx = e.target.x - e.source.x, dy = e.target.y - e.source.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const f = (d - rest) * 0.012;
        const fx = (dx / d) * f, fy = (dy / d) * f;
        if (!e.source.pinned) { e.source.vx += fx; e.source.vy += fy; }
        if (!e.target.pinned) { e.target.vx -= fx; e.target.vy -= fy; }
      }
      // center gravity + integrate
      for (const n of vis) {
        if (n.pinned) continue;
        n.vx -= n.x * 0.0016;
        n.vy -= n.y * 0.0016;
        n.vx *= 0.82; n.vy *= 0.82;
        n.x += n.vx; n.y += n.vy;
      }
    }

    function render() {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (canvas.width !== w * devicePixelRatio) { canvas.width = w * devicePixelRatio; canvas.height = h * devicePixelRatio; }
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.save();
      ctx.translate(w / 2 + state.panX, h / 2 + state.panY);
      ctx.scale(state.zoom, state.zoom);

      const vis = visibleNodes();
      const visSet = new Set(vis);
      const vEdges = visibleEdges(visSet);

      // edges
      ctx.lineWidth = 0.7 / state.zoom;
      for (const e of vEdges) {
        const c = COLORS[e.source.type === 'core' ? 'core' : e.target.type] || '#3a5545';
        ctx.strokeStyle = c + '22';
        ctx.beginPath();
        ctx.moveTo(e.source.x, e.source.y);
        ctx.lineTo(e.target.x, e.target.y);
        ctx.stroke();
      }
      // flow pulses
      if (state.flow && !state.paused) {
        const t = state.time;
        for (let k = 0; k < vEdges.length; k += 3) {
          const e = vEdges[k];
          const p = (t * 0.35 + k * 0.13) % 1;
          const x = e.source.x + (e.target.x - e.source.x) * p;
          const y = e.source.y + (e.target.y - e.source.y) * p;
          ctx.fillStyle = (COLORS[e.target.type] || '#3fd67f') + 'aa';
          ctx.beginPath();
          ctx.arc(x, y, 1.1 / state.zoom + 0.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // nodes
      for (const n of vis) {
        const color = COLORS[n.type];
        const r = RADII[n.type] * (n.type === 'file' ? 1 : 1 + Math.min(n.degree, 30) * 0.03);
        if (state.quality === 'full') {
          ctx.shadowColor = color;
          ctx.shadowBlur = n.type === 'core' ? 55 : r * 4;
        }
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        if (n === state.hover || n.type === 'core' || (n.type === 'workspace' && state.zoom > 0.8)) {
          ctx.fillStyle = 'rgba(230, 228, 218, .85)';
          ctx.font = `${10 / state.zoom}px monospace`;
          ctx.fillText(n.label, n.x + r + 5 / state.zoom, n.y + 3 / state.zoom);
        }
      }
      ctx.restore();
    }

    let raf;
    function loop() {
      state.time += 0.016;
      tick();
      render();
      raf = requestAnimationFrame(loop);
    }
    loop();

    /* ------------------------------ interaction ------------------------------ */
    let dragging = false, lastX = 0, lastY = 0;
    canvas.addEventListener('mousedown', (ev) => { dragging = true; lastX = ev.clientX; lastY = ev.clientY; canvas.classList.add('dragging'); });
    window.addEventListener('mouseup', () => { dragging = false; canvas.classList.remove('dragging'); });
    window.addEventListener('mousemove', (ev) => {
      if (dragging) {
        state.panX += ev.clientX - lastX;
        state.panY += ev.clientY - lastY;
        lastX = ev.clientX; lastY = ev.clientY;
      }
    });
    canvas.addEventListener('mousemove', (ev) => {
      const rect = canvas.getBoundingClientRect();
      const mx = (ev.clientX - rect.left - rect.width / 2 - state.panX) / state.zoom;
      const my = (ev.clientY - rect.top - rect.height / 2 - state.panY) / state.zoom;
      let best = null, bestD = 14 / state.zoom;
      for (const n of visibleNodes()) {
        const d = Math.hypot(n.x - mx, n.y - my);
        if (d < bestD) { best = n; bestD = d; }
      }
      state.hover = best;
      if (opts.onHover) opts.onHover(best, ev);
    });
    canvas.addEventListener('wheel', (ev) => {
      ev.preventDefault();
      const factor = ev.deltaY < 0 ? 1.1 : 0.9;
      state.zoom = Math.min(4, Math.max(0.25, state.zoom * factor));
    }, { passive: false });

    return {
      state,
      setMode(m) { state.mode = m; },
      setPaused(p) { state.paused = p; },
      setFlow(f) { state.flow = f; },
      setQuality(q) { state.quality = q; },
      setLinkFraction(f) { state.linkFraction = f; },
      counts() {
        const vis = visibleNodes();
        return { nodes: vis.length, edges: visibleEdges(new Set(vis)).length };
      },
      destroy() { cancelAnimationFrame(raf); },
    };
  }

  window.MemoryGraph = MemoryGraph;
})();
