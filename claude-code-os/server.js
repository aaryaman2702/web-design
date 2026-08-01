/*
 * J.A.R.V.I.S Operating System — local operator server.
 *   npm install && npm start   →   http://localhost:8083
 *
 * Env:
 *   ANTHROPIC_API_KEY   enables real chat (otherwise chat runs in simulated mode)
 *   OPENROUTER_API_KEY  routes GPT / GLM / DeepSeek seats through OpenRouter
 *   OBSIDIAN_VAULT      markdown vault indexed into the Documents page
 *   CLAUDE_HOME         override the data dir (default ~/.claude)
 *   PORT                override port (default 8083)
 */
const express = require('express');
const fs = require('fs');
const path = require('path');
const data = require('./lib/data');

const PORT = process.env.PORT || 8083;
const API_KEY = process.env.ANTHROPIC_API_KEY || '';
const OR_KEY = process.env.OPENROUTER_API_KEY || '';
const VAULT = process.env.OBSIDIAN_VAULT || '';
const GOALS_FILE = path.join(data.DATA_DIR, 'claude-code-os-goals.json');
const MINISTRY_FILE = path.join(data.DATA_DIR, 'claude-code-os-ministry.json');
const DREAMS_FILE = path.join(data.DATA_DIR, 'claude-code-os-dreams.json');
const SPEND_FILE = path.join(data.DATA_DIR, 'claude-code-os-spend.json');
const AUTOMATIONS_FILE = path.join(data.DATA_DIR, 'claude-code-os-automations.json');
const PROFILE_FILE = path.join(data.DATA_DIR, 'claude-code-os-profile.json');

const readJSON = (file, fallback) => {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
};
const writeJSON = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
};

const DEFAULT_MINISTRY = {
  core: { name: 'Claude Opus 4.8', provider: 'claude', api: 'claude-opus-4-8', or: 'anthropic/claude-opus-4-8' },
  experts: [
    { name: 'GPT-5.5', provider: 'openai', api: null, or: 'openai/gpt-5.5' },
    { name: 'GLM-5.2', provider: 'glm', api: null, or: 'z-ai/glm-5.2' },
    { name: 'DeepSeek V4 Pro', provider: 'deepseek', api: null, or: 'deepseek/deepseek-v4-pro' },
  ],
  maxTokens: 4096,
};

/* ------------------------------ spend ledger ------------------------------ */

// Rough $/M token prices [input, output] for spend estimates.
const PRICES = {
  'claude-fable-5': [15, 75],
  'claude-opus-4-8': [15, 75],
  'claude-sonnet-5': [3, 15],
  'claude-haiku-4-5-20251001': [1, 5],
  'openai/gpt-5.5': [1.75, 14],
  'z-ai/glm-5.2': [0.6, 3],
  'deepseek/deepseek-v4-pro': [0.3, 1.8],
};
const priceOf = (model) => PRICES[model] || PRICES[Object.keys(PRICES).find((k) => model.includes(k))] || [3, 15];

function logSpend(model, inTok, outTok, kind) {
  const [pin, pout] = priceOf(model);
  const cost = (inTok * pin + outTok * pout) / 1e6;
  const ledger = readJSON(SPEND_FILE, []);
  ledger.push({ ts: Date.now(), model, in: Math.round(inTok), out: Math.round(outTok), cost: +cost.toFixed(6), kind });
  writeJSON(SPEND_FILE, ledger.slice(-2000));
}

const estTokens = (text) => Math.ceil(String(text || '').length / 4);

/* ------------------------------ model callers ------------------------------ */

async function callAnthropic(model, system, userText, maxTokens) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      // Prompt caching: the system prompt is stable across calls, so cache it.
      system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: userText }],
    }),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  const text = (json.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  const usage = json.usage || {};
  logSpend(model, usage.input_tokens || estTokens(system + userText), usage.output_tokens || estTokens(text), 'call');
  return text;
}

async function callOpenRouter(model, system, userText, maxTokens) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + OR_KEY },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [{ role: 'system', content: system }, { role: 'user', content: userText }],
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  const text = json.choices?.[0]?.message?.content || '';
  const usage = json.usage || {};
  logSpend(model, usage.prompt_tokens || estTokens(system + userText), usage.completion_tokens || estTokens(text), 'call');
  return text;
}

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/summary', (req, res) => {
  const summary = data.summarize();
  summary.chatLive = Boolean(API_KEY);
  summary.orLive = Boolean(OR_KEY);
  summary.vault = VAULT || null;
  res.json(summary);
});

app.get('/api/sessions', (req, res) => res.json(data.listSessions(20)));
app.get('/api/skills', (req, res) => res.json(data.listSkills()));
app.get('/api/activity', (req, res) => res.json(data.activityFeed()));
app.get('/api/graph', (req, res) => res.json(data.buildGraph()));

app.get('/api/session/:id', (req, res) => {
  const transcript = data.getSessionTranscript(req.params.id);
  if (!transcript) return res.status(404).json({ error: 'not found' });
  res.json(transcript);
});

app.get('/api/goals', (req, res) => {
  try { res.json(JSON.parse(fs.readFileSync(GOALS_FILE, 'utf8'))); }
  catch { res.json([]); }
});

app.post('/api/goals', (req, res) => {
  const goals = Array.isArray(req.body) ? req.body.slice(0, 50) : [];
  try {
    fs.mkdirSync(path.dirname(GOALS_FILE), { recursive: true });
    fs.writeFileSync(GOALS_FILE, JSON.stringify(goals, null, 2));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/* ----------------------------- ministry (MoE) ----------------------------- */

app.get('/api/ministry', (req, res) => res.json(readJSON(MINISTRY_FILE, DEFAULT_MINISTRY)));

app.post('/api/ministry', (req, res) => {
  const { core, experts, maxTokens } = req.body || {};
  if (!core || !Array.isArray(experts)) return res.status(400).json({ error: 'bad preset' });
  const preset = { core, experts: experts.slice(0, 3), maxTokens: Math.min(16384, Math.max(256, maxTokens | 0 || 4096)) };
  try { writeJSON(MINISTRY_FILE, preset); res.json({ ok: true, file: MINISTRY_FILE }); }
  catch (err) { res.status(500).json({ error: String(err) }); }
});

/*
 * Council run: each expert proposes in parallel, then the core aggregates.
 * Only Anthropic-backed seats can answer for real; other providers are
 * reported as unconnected rather than fabricating their output.
 */
app.post('/api/council', async (req, res) => {
  const { question = '' } = req.body || {};
  const preset = readJSON(MINISTRY_FILE, DEFAULT_MINISTRY);
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  const send = (event, payload) => res.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);

  const answers = [];
  const expertSystem = (name) => `You are ${name}, one expert seat on a council. Give your single best answer, concisely. No preamble.`;
  const askExpert = async (expert) => {
    try {
      if (API_KEY && expert.api) {
        return { name: expert.name, text: await callAnthropic(expert.api, expertSystem(expert.name), question, Math.min(preset.maxTokens, 1024)), real: true };
      }
      if (OR_KEY && expert.or) {
        return { name: expert.name, text: await callOpenRouter(expert.or, expertSystem(expert.name), question, Math.min(preset.maxTokens, 1024)), real: true };
      }
    } catch (err) {
      return { name: expert.name, text: '⚠ ' + err.message, real: false };
    }
    if (!API_KEY && !OR_KEY) {
      return { name: expert.name, text: `[simulated] ${expert.name} would propose an answer here. Set ANTHROPIC_API_KEY or OPENROUTER_API_KEY to make this seat real.`, real: false };
    }
    return { name: expert.name, text: `⚠ No connected provider for ${expert.name} — set OPENROUTER_API_KEY to route this seat through OpenRouter. The core will decide from the seats that answered.`, real: false };
  };

  const results = await Promise.all(preset.experts.map(askExpert));
  for (const r of results) { answers.push(r); send('expert', r); }

  const usable = answers.filter((a) => a.real);
  const coreSystem = 'You are the CORE ORCHESTRATOR of a council of expert models. Compare the expert proposals, weigh them, and write the single best final answer. Briefly note where experts agreed or diverged.';
  const corePrompt = `QUESTION:\n${question}\n\nEXPERT PROPOSALS:\n${(usable.length ? usable : answers).map((a) => `--- ${a.name} proposed ---\n${a.text}`).join('\n\n')}`;
  try {
    if (API_KEY && preset.core.api) {
      send('verdict', { name: preset.core.name, text: await callAnthropic(preset.core.api, coreSystem, corePrompt, preset.maxTokens) });
    } else if (OR_KEY && preset.core.or) {
      send('verdict', { name: preset.core.name, text: await callOpenRouter(preset.core.or, coreSystem, corePrompt, preset.maxTokens) });
    } else {
      send('verdict', {
        name: preset.core.name,
        text: `[simulated verdict] With an API key set, ${preset.core.name} reads every expert proposal above and writes the final, consensus-weighted answer here.`,
      });
    }
  } catch (err) {
    send('error', { message: err.message });
  }
  send('done', {});
  res.end();
});

/* ----------------------------- spend tracking ----------------------------- */

app.get('/api/spend', (req, res) => {
  let ledger = readJSON(SPEND_FILE, []);
  let simulated = false;
  if (ledger.length === 0) {
    // No real calls yet — synthesize a plausible 14-day history so the page reads.
    simulated = true;
    const models = ['claude-fable-5', 'openai/gpt-5.5', 'deepseek/deepseek-v4-pro'];
    let seed = 0xBEEF;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    for (let d = 13; d >= 0; d--) {
      const calls = 2 + Math.floor(rnd() * 9);
      for (let c = 0; c < calls; c++) {
        const model = models[Math.floor(rnd() * models.length)];
        const inTok = 800 + rnd() * 9000, outTok = 300 + rnd() * 3000;
        const [pin, pout] = priceOf(model);
        ledger.push({ ts: Date.now() - d * 86400000 - rnd() * 8 * 3600000, model, in: Math.round(inTok), out: Math.round(outTok), cost: (inTok * pin + outTok * pout) / 1e6, kind: 'demo' });
      }
    }
  }
  const now = Date.now();
  const dayKey = (ts) => new Date(ts).toISOString().slice(0, 10);
  const today = dayKey(now);
  const byModel = {}, byDay = {};
  let total = 0, totalIn = 0, totalOut = 0, todayCost = 0, weekCost = 0;
  for (const e of ledger) {
    total += e.cost; totalIn += e.in; totalOut += e.out;
    if (dayKey(e.ts) === today) todayCost += e.cost;
    if (now - e.ts < 7 * 86400000) weekCost += e.cost;
    byModel[e.model] = byModel[e.model] || { calls: 0, in: 0, out: 0, cost: 0 };
    byModel[e.model].calls++; byModel[e.model].in += e.in; byModel[e.model].out += e.out; byModel[e.model].cost += e.cost;
    const dk = dayKey(e.ts);
    byDay[dk] = (byDay[dk] || 0) + e.cost;
  }
  const days = [];
  for (let d = 13; d >= 0; d--) {
    const dk = dayKey(now - d * 86400000);
    days.push({ day: dk.slice(5), cost: +(byDay[dk] || 0).toFixed(4) });
  }
  res.json({ simulated, total: +total.toFixed(4), today: +todayCost.toFixed(4), week: +weekCost.toFixed(4), calls: ledger.length, totalIn, totalOut, byModel, days });
});

/* --------------------------- documents (Obsidian) --------------------------- */

const DOC_ROOTS = [VAULT, data.DATA_DIR].filter(Boolean);

function listDocs() {
  const docs = [];
  const walk = (dir, root, depth) => {
    if (depth > 4 || docs.length >= 400) return;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const ent of entries) {
      if (ent.name.startsWith('.')) continue;
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(p, root, depth + 1);
      else if (ent.name.endsWith('.md')) {
        try {
          const st = fs.statSync(p);
          docs.push({ path: p, name: ent.name.replace(/\.md$/, ''), rel: path.relative(root, p), source: root === VAULT ? 'obsidian' : 'claude', size: st.size, mtime: st.mtimeMs });
        } catch { /* skip */ }
      }
    }
  };
  for (const root of DOC_ROOTS) walk(root, root, 0);
  docs.sort((a, b) => b.mtime - a.mtime);
  return docs;
}

app.get('/api/docs', (req, res) => res.json({ vault: VAULT || null, docs: listDocs() }));

app.get('/api/doc', (req, res) => {
  const p = path.resolve(String(req.query.p || ''));
  if (!DOC_ROOTS.some((root) => p.startsWith(path.resolve(root) + path.sep))) {
    return res.status(403).json({ error: 'outside allowed roots' });
  }
  try { res.json({ content: fs.readFileSync(p, 'utf8').slice(0, 100000) }); }
  catch { res.status(404).json({ error: 'not found' }); }
});

/* ------------------------------- automations ------------------------------- */

async function runAutomation(auto) {
  let result, model;
  if (API_KEY) {
    model = 'claude-fable-5';
    result = await callAnthropic(model,
      'You are J.A.R.V.I.S running a scheduled automation for the operator. Do the task and report the outcome concisely in plain text.',
      auto.prompt, 2048);
  } else if (OR_KEY) {
    model = 'openai/gpt-5.5';
    result = await callOpenRouter(model, 'You are J.A.R.V.I.S running a scheduled automation for the operator. Do the task and report the outcome concisely.', auto.prompt, 2048);
  } else {
    model = 'simulated';
    result = `[simulated] Automation "${auto.name}" would run now:\n${auto.prompt}\n\nSet ANTHROPIC_API_KEY or OPENROUTER_API_KEY to execute for real.`;
  }
  auto.lastRun = Date.now();
  auto.lastModel = model;
  auto.lastResult = result.slice(0, 4000);
  return auto;
}

app.get('/api/automations', (req, res) => res.json(readJSON(AUTOMATIONS_FILE, [])));

app.post('/api/automations', (req, res) => {
  const { name, prompt, hour } = req.body || {};
  if (!name || !prompt) return res.status(400).json({ error: 'name and prompt required' });
  const autos = readJSON(AUTOMATIONS_FILE, []);
  autos.push({ id: Date.now().toString(36), name: String(name).slice(0, 60), prompt: String(prompt).slice(0, 2000), hour: Math.min(23, Math.max(0, hour | 0)), enabled: true });
  writeJSON(AUTOMATIONS_FILE, autos.slice(0, 30));
  res.json(autos);
});

app.post('/api/automations/:id/run', async (req, res) => {
  const autos = readJSON(AUTOMATIONS_FILE, []);
  const auto = autos.find((a) => a.id === req.params.id);
  if (!auto) return res.status(404).json({ error: 'not found' });
  try {
    await runAutomation(auto);
    writeJSON(AUTOMATIONS_FILE, autos);
    res.json(auto);
  } catch (err) { res.status(500).json({ error: String(err.message || err) }); }
});

app.post('/api/automations/:id/delete', (req, res) => {
  const autos = readJSON(AUTOMATIONS_FILE, []).filter((a) => a.id !== req.params.id);
  writeJSON(AUTOMATIONS_FILE, autos);
  res.json(autos);
});

// Hourly automation scheduler (same cadence as dreams)
setInterval(() => {
  const hour = new Date().getHours();
  const autos = readJSON(AUTOMATIONS_FILE, []);
  let changed = false;
  for (const auto of autos) {
    if (!auto.enabled || auto.hour !== hour) continue;
    if (auto.lastRun && Date.now() - auto.lastRun < 20 * 3600 * 1000) continue;
    runAutomation(auto).then(() => writeJSON(AUTOMATIONS_FILE, autos)).catch((err) => console.error('automation failed:', err.message));
    changed = true;
  }
  if (changed) writeJSON(AUTOMATIONS_FILE, autos);
}, 30 * 60 * 1000);

/* ------------------------------ operator profile ------------------------------ */

app.get('/api/profile', (req, res) => res.json(readJSON(PROFILE_FILE, { name: '', hourlyRate: 50, focus: '' })));
app.post('/api/profile', (req, res) => {
  const { name = '', hourlyRate = 50, focus = '' } = req.body || {};
  const profile = { name: String(name).slice(0, 40), hourlyRate: Math.max(0, +hourlyRate || 0), focus: String(focus).slice(0, 200) };
  writeJSON(PROFILE_FILE, profile);
  res.json(profile);
});

/* ------------------------------ dreams (L4) ------------------------------ */

async function runDream(trigger) {
  const summary = data.summarize();
  const goals = readJSON(GOALS_FILE, []);
  const activity = data.activityFeed().slice(0, 15);
  const openGoals = goals.filter((g) => !g.done).map((g) => '- ' + g.text).join('\n') || '- (no goals set)';
  const recentWork = activity.map((a) => `- [${a.type}] ${a.label} (${a.detail})`).join('\n');
  let body, model;

  if (API_KEY) {
    model = 'claude-fable-5';
    body = await callAnthropic(model,
      'You are J.A.R.V.I.S, the operator\'s agent, running your nightly "dream" — an overnight review while the operator sleeps. Write a concise report in plain text with exactly these sections: WHAT I NOTICED, OPPORTUNITIES, TOMORROW\'S PLAN. Be specific and actionable, no fluff.',
      `Operator stats: ${summary.stats.sessions} sessions, ${summary.stats.messages} messages, last active ${new Date(summary.stats.lastActiveTs).toISOString()}.\n\nOpen goals:\n${openGoals}\n\nRecent activity:\n${recentWork}`,
      2048);
  } else {
    model = 'simulated';
    body = [
      'WHAT I NOTICED',
      `- ${summary.stats.sessions} sessions on disk, ${summary.stats.messages} messages total. Memory at ${summary.memory.percentFull}% of quota.`,
      `- Most recent work: ${activity[0] ? activity[0].label : '(none)'}.`,
      '',
      'OPPORTUNITIES',
      '- Set ANTHROPIC_API_KEY and this dream becomes a real overnight analysis of your goals, sessions and memory.',
      openGoals !== '- (no goals set)' ? '- Open goals detected — I would break these into next actions here.' : '- No goals set in Mission Control yet. Give me a mission, operator.',
      '',
      "TOMORROW'S PLAN",
      '- Review the knowledge graph Stale panel and refresh anything older than 30 days.',
      '- One focused session on the top open goal.',
    ].join('\n');
  }

  const dreams = readJSON(DREAMS_FILE, []);
  const dream = { ts: Date.now(), trigger, model, body };
  dreams.unshift(dream);
  writeJSON(DREAMS_FILE, dreams.slice(0, 30));
  return dream;
}

app.get('/api/dreams', (req, res) => res.json(readJSON(DREAMS_FILE, [])));

app.post('/api/dreams/run', async (req, res) => {
  try { res.json(await runDream('manual')); }
  catch (err) { res.status(500).json({ error: String(err && err.message || err) }); }
});

// Nightly scheduler: dream at ~03:00 local, at most once per 20h.
setInterval(() => {
  const hour = new Date().getHours();
  if (hour !== 3) return;
  const dreams = readJSON(DREAMS_FILE, []);
  if (dreams[0] && Date.now() - dreams[0].ts < 20 * 3600 * 1000) return;
  runDream('scheduled').catch((err) => console.error('dream failed:', err.message));
}, 30 * 60 * 1000);

/* ------------------------------- chat (SSE) ------------------------------- */

const EFFORT_TOKENS = { low: 1024, medium: 4096, high: 16384 };

const SYSTEM_PROMPT = [
  'You are J.A.R.V.I.S, the operator\'s personal agent inside the J.A.R.V.I.S Operating System — a local',
  'dashboard styled like a retro Greek terminal. Be direct, capable, and brief.',
  'You help the operator run their missions: research, content, finance, memory.',
].join(' ');

app.post('/api/chat', async (req, res) => {
  const { messages = [], model = 'claude-fable-5', effort = 'medium' } = req.body || {};
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  const send = (event, payload) => res.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);

  const isOpenRouter = model.startsWith('or:');
  const canServe = isOpenRouter ? Boolean(OR_KEY) : Boolean(API_KEY);

  if (!canServe) {
    // Simulated mode — stream a canned J.A.R.V.I.S response word by word.
    const last = messages.length ? String(messages[messages.length - 1].content || '') : '';
    const needed = isOpenRouter ? 'OPENROUTER_API_KEY' : 'ANTHROPIC_API_KEY';
    const reply = [
      `Simulated mode — set ${needed} to bring me fully online, operator.`,
      ``,
      `You said: "${last.slice(0, 140)}"`,
      ``,
      `When live, I answer with ${model.replace(/^or:/, '')} at ${effort} effort, with your memory core in context.`,
    ].join('\n');
    for (const word of reply.split(/(?<=\s)/)) {
      send('delta', { text: word });
      await new Promise((r) => setTimeout(r, 24));
    }
    send('done', { model: model + ' (simulated)' });
    return res.end();
  }

  if (isOpenRouter) {
    // Stream via OpenRouter's OpenAI-compatible endpoint.
    const orModel = model.slice(3);
    try {
      const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: 'Bearer ' + OR_KEY },
        body: JSON.stringify({
          model: orModel,
          max_tokens: EFFORT_TOKENS[effort] || 4096,
          stream: true,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...messages.map((m) => ({ role: m.role, content: String(m.content || '') })).slice(-40),
          ],
        }),
      });
      if (!upstream.ok) {
        send('error', { message: `OpenRouter ${upstream.status}: ${(await upstream.text()).slice(0, 300)}` });
        return res.end();
      }
      const reader = upstream.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '', outChars = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.startsWith('data: ') || line.includes('[DONE]')) continue;
          let event;
          try { event = JSON.parse(line.slice(6)); } catch { continue; }
          const delta = event.choices?.[0]?.delta?.content;
          if (delta) { outChars += delta.length; send('delta', { text: delta }); }
        }
      }
      logSpend(orModel, estTokens(JSON.stringify(messages)), Math.ceil(outChars / 4), 'chat');
      send('done', { model: orModel });
    } catch (err) {
      send('error', { message: String(err && err.message || err) });
    }
    return res.end();
  }

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: EFFORT_TOKENS[effort] || 4096,
        stream: true,
        // Prompt caching on the stable system prompt
        system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
        messages: messages.map((m) => ({ role: m.role, content: String(m.content || '') })).slice(-40),
      }),
    });

    if (!upstream.ok) {
      const detail = await upstream.text();
      send('error', { message: `API ${upstream.status}: ${detail.slice(0, 300)}` });
      return res.end();
    }

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let inTok = 0, outTok = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split('\n\n');
      buffer = chunks.pop();
      for (const chunk of chunks) {
        const dataLine = chunk.split('\n').find((l) => l.startsWith('data: '));
        if (!dataLine) continue;
        let event;
        try { event = JSON.parse(dataLine.slice(6)); } catch { continue; }
        if (event.type === 'content_block_delta' && event.delta && event.delta.text) {
          outTok += Math.ceil(event.delta.text.length / 4);
          send('delta', { text: event.delta.text });
        } else if (event.type === 'message_start' && event.message?.usage) {
          inTok = event.message.usage.input_tokens || 0;
        } else if (event.type === 'message_delta' && event.usage?.output_tokens) {
          outTok = event.usage.output_tokens;
        } else if (event.type === 'error') {
          send('error', { message: event.error ? event.error.message : 'stream error' });
        }
      }
    }
    logSpend(model, inTok || estTokens(JSON.stringify(messages)), outTok, 'chat');
    send('done', { model });
  } catch (err) {
    send('error', { message: String(err && err.message || err) });
  }
  res.end();
});

app.get(/.*/, (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => {
  const mode = API_KEY ? 'LIVE (ANTHROPIC_API_KEY set)' : 'SIMULATED (no ANTHROPIC_API_KEY)';
  console.log(`\n  ◈ J.A.R.V.I.S · OPERATING SYSTEM`);
  console.log(`  ▸ http://localhost:${PORT}`);
  console.log(`  ▸ data dir: ${data.DATA_DIR}`);
  console.log(`  ▸ chat: ${mode}`);
  console.log(`  ▸ openrouter: ${OR_KEY ? 'CONNECTED' : 'not set (OPENROUTER_API_KEY)'}`);
  console.log(`  ▸ obsidian vault: ${VAULT || 'not set (OBSIDIAN_VAULT)'}\n`);
});
