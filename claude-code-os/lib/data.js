/*
 * Data layer for Claude Code OS.
 * Reads real Claude Code data from ~/.claude (sessions, skills, memory) and
 * falls back to a JARVIS-themed demo dataset when nothing is on disk.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const DATA_DIR = process.env.CLAUDE_HOME || path.join(os.homedir(), '.claude');
const MAX_SESSION_FILES = 200;
const MAX_FILE_BYTES = 15 * 1024 * 1024;
const MEMORY_QUOTA_BYTES = 512 * 1024 * 1024;
const CACHE_TTL_MS = 15 * 1000;

let cache = null;
let cacheAt = 0;

function safeReadDir(dir) {
  try { return fs.readdirSync(dir, { withFileTypes: true }); } catch { return []; }
}

function safeStat(p) {
  try { return fs.statSync(p); } catch { return null; }
}

function dirSize(dir, depth = 0) {
  if (depth > 6) return 0;
  let total = 0;
  for (const ent of safeReadDir(dir)) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) total += dirSize(p, depth + 1);
    else {
      const st = safeStat(p);
      if (st) total += st.size;
    }
  }
  return total;
}

function projectLabel(encoded) {
  // project dirs are cwd paths with / replaced by -
  const parts = encoded.replace(/^-/, '').split('-').filter(Boolean);
  return parts[parts.length - 1] || encoded;
}

function extractText(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    for (const block of content) {
      if (block && block.type === 'text' && block.text) return block.text;
    }
  }
  return '';
}

function extractFiles(content, out) {
  if (!Array.isArray(content)) return;
  for (const block of content) {
    if (block && block.type === 'tool_use' && block.input) {
      const fp = block.input.file_path || block.input.path || block.input.notebook_path;
      if (typeof fp === 'string' && fp.startsWith('/')) out.add(fp);
    }
  }
}

function parseSessionFile(filePath, project) {
  const st = safeStat(filePath);
  if (!st || st.size > MAX_FILE_BYTES) return null;
  let raw;
  try { raw = fs.readFileSync(filePath, 'utf8'); } catch { return null; }

  const session = {
    id: path.basename(filePath, '.jsonl'),
    project,
    title: '',
    messages: 0,
    userMessages: 0,
    models: new Set(),
    files: new Set(),
    firstTs: null,
    lastTs: null,
    dayCounts: {},
  };

  for (const line of raw.split('\n')) {
    if (!line) continue;
    let entry;
    try { entry = JSON.parse(line); } catch { continue; }

    if (entry.type === 'summary' && entry.summary && !session.title) {
      session.title = entry.summary;
    }
    if (entry.type !== 'user' && entry.type !== 'assistant') continue;
    if (entry.isSidechain) continue;
    const msg = entry.message;
    if (!msg || !msg.role) continue;

    session.messages++;
    const ts = entry.timestamp ? Date.parse(entry.timestamp) : NaN;
    if (!Number.isNaN(ts)) {
      if (session.firstTs === null || ts < session.firstTs) session.firstTs = ts;
      if (session.lastTs === null || ts > session.lastTs) session.lastTs = ts;
      const day = new Date(ts).toISOString().slice(0, 10);
      session.dayCounts[day] = (session.dayCounts[day] || 0) + 1;
    }
    if (msg.role === 'user') {
      session.userMessages++;
      if (!session.title) {
        const text = extractText(msg.content).replace(/\s+/g, ' ').trim();
        if (text) session.title = text.slice(0, 80);
      }
    }
    if (msg.role === 'assistant') {
      if (msg.model) session.models.add(msg.model);
      extractFiles(msg.content, session.files);
    }
  }
  if (session.messages === 0) return null;
  if (!session.title) session.title = 'Untitled session';
  return session;
}

function readSkills() {
  const skillsDir = path.join(DATA_DIR, 'skills');
  const skills = [];
  for (const ent of safeReadDir(skillsDir)) {
    if (!ent.isDirectory()) continue;
    const skillMd = path.join(skillsDir, ent.name, 'SKILL.md');
    let description = '';
    try {
      const raw = fs.readFileSync(skillMd, 'utf8');
      const descMatch = raw.match(/^description:\s*(.+)$/m);
      if (descMatch) description = descMatch[1].trim().slice(0, 200);
      else {
        const body = raw.replace(/^---[\s\S]*?---/, '').trim();
        description = body.split('\n').find((l) => l.trim() && !l.startsWith('#')) || '';
        description = description.trim().slice(0, 200);
      }
    } catch { continue; }
    const st = safeStat(skillMd);
    skills.push({ name: ent.name, description, updatedAt: st ? st.mtimeMs : null });
  }
  return skills;
}

function readMemoryEntries() {
  // Bullet lines from CLAUDE.md files become "decision" nodes in the graph.
  const entries = [];
  const candidates = [path.join(DATA_DIR, 'CLAUDE.md')];
  for (const ent of safeReadDir(path.join(DATA_DIR, 'projects'))) {
    if (ent.isDirectory()) candidates.push(path.join(DATA_DIR, 'projects', ent.name, 'CLAUDE.md'));
  }
  for (const file of candidates) {
    let raw;
    try { raw = fs.readFileSync(file, 'utf8'); } catch { continue; }
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*[-*]\s+(.{4,120})/);
      if (m) entries.push(m[1].trim());
      if (entries.length >= 40) return entries;
    }
  }
  return entries;
}

function scanReal() {
  const projectsDir = path.join(DATA_DIR, 'projects');
  const sessions = [];
  let fileCount = 0;

  for (const projEnt of safeReadDir(projectsDir)) {
    if (!projEnt.isDirectory()) continue;
    const project = projectLabel(projEnt.name);
    const projPath = path.join(projectsDir, projEnt.name);
    for (const ent of safeReadDir(projPath)) {
      if (!ent.name.endsWith('.jsonl')) continue;
      if (fileCount >= MAX_SESSION_FILES) break;
      fileCount++;
      const session = parseSessionFile(path.join(projPath, ent.name), project);
      if (session) sessions.push(session);
    }
  }
  if (sessions.length === 0) return null;

  sessions.sort((a, b) => (b.lastTs || 0) - (a.lastTs || 0));
  return {
    demo: false,
    sessions,
    skills: readSkills(),
    memoryEntries: readMemoryEntries(),
    memoryBytes: dirSize(DATA_DIR),
    dataDir: DATA_DIR,
  };
}

/* ------------------------------ demo dataset ------------------------------ */

function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function demoData() {
  const rand = seededRandom(0x4845524d); // "HERM"
  const now = Date.now();
  const projects = ['youtube', 'dubai', 'stream', 'skool', 'finance', 'general', 'watchlist', 'ads', 'competitors', 'trends'];
  const titles = [
    'Analyze thumbnail CTR for latest upload', 'Draft Dubai content calendar',
    'Summarize stream chat highlights', 'Skool community weekly digest',
    'Portfolio rebalance research', 'Inbox triage and reply drafts',
    'Watchlist price alerts review', 'Ad creative A/B analysis',
    'Competitor upload cadence report', 'Trend scan: agentic workflows',
    'Script outline: memory systems', 'Refactor jarvis memory compactor',
  ];
  const models = ['claude-fable-5', 'claude-opus-4-8', 'gpt-5.5'];
  const fileNames = [
    'watchlist.md', 'trends.json', 'calendar.md', 'scripts/outline.md', 'memory/core.md',
    'ads/creative-a.md', 'ads/creative-b.md', 'digest.md', 'ctr-report.csv', 'alerts.yaml',
    'notes/dubai.md', 'notes/stream.md', 'goals.md', 'hooks/compact.js', 'skills/research.md',
  ];

  const sessions = titles.map((title, i) => {
    // Keep the first half of sessions inside the current week so the
    // "THIS WEEK" chart has something to show in demo mode.
    const daysAgo = i === 0 ? 0 : i < 6 ? rand() * 6 : 6 + rand() * 14;
    const lastTs = now - daysAgo * 86400000 - rand() * 3600000;
    const messages = 12 + Math.floor(rand() * 70);
    const files = new Set();
    const nFiles = 2 + Math.floor(rand() * 5);
    for (let f = 0; f < nFiles; f++) {
      files.add('~/.jarvis/' + fileNames[Math.floor(rand() * fileNames.length)]);
    }
    const dayCounts = {};
    for (let d = 0; d < 5; d++) {
      const day = new Date(lastTs - d * 86400000).toISOString().slice(0, 10);
      dayCounts[day] = Math.floor(rand() * (messages / 3));
    }
    return {
      id: 'demo-' + i,
      project: projects[i % projects.length],
      title,
      messages,
      userMessages: Math.floor(messages / 2),
      models: new Set([models[0], ...(rand() > 0.5 ? [models[1]] : []), ...(rand() > 0.7 ? [models[2]] : [])]),
      files,
      firstTs: lastTs - 3600000 * (1 + rand() * 4),
      lastTs,
      dayCounts,
    };
  });
  // Screenshot shows "LAST ACTIVE 2m ago"
  sessions[0].lastTs = now - 2 * 60000;

  const skills = [
    { name: 'research', description: 'Deep research runs across the web with source-ranked citations.' },
    { name: 'thumbnail-analysis', description: 'Scores thumbnails for CTR signals: contrast, faces, text weight.' },
    { name: 'trend-scan', description: 'Scans niches for velocity spikes and emerging topics.' },
    { name: 'script-writer', description: 'Long-form video scripts in the operator voice profile.' },
    { name: 'memory-compactor', description: 'Nightly compaction of session memories into the core graph.' },
    { name: 'outreach', description: 'Drafts sponsor and collab outreach from the contact ledger.' },
  ].map((s) => ({ ...s, updatedAt: now - rand() * 20 * 86400000 }));

  const memoryEntries = [
    'Operator prefers dark retro terminal aesthetics', 'Publish schedule: Tue + Fri, 4pm Dubai time',
    'Never auto-post without operator approval', 'Thumbnail rule: max 3 words of text',
    'Finance: DCA only, no leverage', 'Skool digest goes out Sunday night',
    'Voice profile: direct, a little dry, no hype words', 'Competitor set: 6 channels tracked weekly',
    'Ad spend cap: $150/day until ROAS > 2.1', 'Stream clips pipeline runs after each stream',
    'Core goal: 1M subs by December', 'Memory compaction every night at 03:00',
  ];

  return {
    demo: true,
    sessions,
    skills,
    memoryEntries,
    memoryBytes: Math.floor(MEMORY_QUOTA_BYTES * 0.22),
    dataDir: '~/.jarvis/memories',
  };
}

/* ------------------------------- aggregation ------------------------------- */

function getData() {
  const now = Date.now();
  if (cache && now - cacheAt < CACHE_TTL_MS) return cache;
  cache = scanReal() || demoData();
  cacheAt = now;
  return cache;
}

function summarize() {
  const data = getData();
  const { sessions } = data;
  const now = Date.now();

  const models = new Set();
  let totalMessages = 0;
  let totalChars = 0;
  let lastActive = 0;
  let lastModel = '';
  for (const s of sessions) {
    totalMessages += s.messages;
    totalChars += s.messages * 350; // rough chars-per-message estimate
    for (const m of s.models) models.add(m);
    if ((s.lastTs || 0) > lastActive) {
      lastActive = s.lastTs;
      lastModel = [...s.models][s.models.size - 1] || '';
    }
  }

  // Messages per day for the current week (Sunday..Saturday)
  const week = [0, 0, 0, 0, 0, 0, 0];
  const startOfWeek = new Date();
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  for (const s of sessions) {
    for (const [day, count] of Object.entries(s.dayCounts)) {
      const d = new Date(day + 'T12:00:00Z');
      const diff = Math.floor((d - startOfWeek) / 86400000);
      if (diff >= 0 && diff < 7) week[diff] += count;
    }
  }

  return {
    demo: data.demo,
    dataDir: data.dataDir,
    agent: { name: 'JARVIS', display: 'J.A.R.V.I.S', status: 'ONLINE' },
    version: 'v2.10.1',
    build: '3bd8e1',
    stats: {
      sessions: sessions.length,
      sessionsOnDisk: Math.min(sessions.length, 20),
      messages: totalMessages,
      models: models.size,
      modelList: [...models],
      lastActiveTs: lastActive,
      lastModel,
    },
    memory: {
      usedBytes: data.memoryBytes,
      quotaBytes: MEMORY_QUOTA_BYTES,
      usedChars: totalChars,
      quotaChars: 10 * 1024 * 1024 * 1024,
      percentFull: Math.max(1, Math.round((data.memoryBytes / MEMORY_QUOTA_BYTES) * 100)),
    },
    week,
    today: new Date().getDay(),
  };
}

function listSessions(limit = 20) {
  const { sessions } = getData();
  return sessions.slice(0, limit).map((s) => ({
    id: s.id,
    project: s.project,
    title: s.title,
    messages: s.messages,
    models: [...s.models],
    lastTs: s.lastTs,
  }));
}

function listSkills() {
  return getData().skills;
}

function activityFeed() {
  const { sessions, skills, demo } = getData();
  const events = [];
  for (const s of sessions.slice(0, 30)) {
    events.push({ type: 'session', label: s.title, detail: `${s.messages} messages · ${s.project}`, ts: s.lastTs });
    let i = 0;
    for (const f of s.files) {
      if (i++ >= 2) break;
      events.push({ type: 'file', label: f.split('/').slice(-2).join('/'), detail: `touched in "${s.title.slice(0, 40)}"`, ts: s.lastTs - i * 60000 });
    }
  }
  for (const sk of skills) {
    if (sk.updatedAt) events.push({ type: 'skill', label: sk.name, detail: 'skill updated', ts: sk.updatedAt });
  }
  if (demo) {
    events.push({ type: 'memory', label: 'memory compaction', detail: '353 nodes · 1279 edges reconciled', ts: Date.now() - 3 * 3600000 });
  }
  events.sort((a, b) => (b.ts || 0) - (a.ts || 0));
  return events.slice(0, 50);
}

function buildGraph() {
  const data = getData();
  const { sessions, skills, memoryEntries } = data;
  const nodes = [];
  const edges = [];
  const now = Date.now();
  const seen = new Set();

  const add = (node) => {
    if (seen.has(node.id)) return false;
    seen.add(node.id);
    nodes.push(node);
    return true;
  };
  const link = (a, b) => edges.push({ source: a, target: b });

  add({ id: 'core', type: 'core', label: 'MEMORY CORE', ts: now });

  const workspaces = [...new Set(sessions.map((s) => s.project))];
  for (const w of workspaces) {
    add({ id: 'ws:' + w, type: 'workspace', label: w, ts: now });
    link('core', 'ws:' + w);
  }

  for (const sk of skills) {
    add({ id: 'skill:' + sk.name, type: 'skill', label: sk.name, ts: sk.updatedAt || now });
    link('core', 'skill:' + sk.name);
  }

  memoryEntries.forEach((entry, i) => {
    const id = 'dec:' + i;
    add({ id, type: 'decision', label: entry.slice(0, 48), ts: now - i * 86400000 });
    link(workspaces.length ? 'ws:' + workspaces[i % workspaces.length] : 'core', id);
  });

  let fileBudget = 220;
  for (const s of sessions.slice(0, 60)) {
    const sid = 'sess:' + s.id;
    add({ id: sid, type: 'session', label: s.title.slice(0, 44), ts: s.lastTs });
    link('ws:' + s.project, sid);
    for (const f of s.files) {
      if (fileBudget <= 0) break;
      const fid = 'file:' + f;
      if (add({ id: fid, type: 'file', label: f.split('/').slice(-2).join('/'), path: f, ts: s.lastTs })) {
        fileBudget--;
      }
      link(sid, fid);
    }
  }

  // Demo mode: pad the graph out to screenshot scale (353 nodes / 1279 edges feel)
  if (data.demo) {
    const rand = seededRandom(0xC0DE05);
    const fileIds = nodes.filter((n) => n.type === 'file').map((n) => n.id);
    let i = nodes.length;
    while (nodes.length < 353) {
      const id = 'frag:' + i++;
      const anchor = fileIds[Math.floor(rand() * fileIds.length)] || 'core';
      add({ id, type: rand() > 0.35 ? 'file' : 'decision', label: 'fragment-' + i, ts: now - rand() * 45 * 86400000 });
      link(anchor, id);
      if (rand() > 0.5) link(id, nodes[Math.floor(rand() * nodes.length)].id);
    }
    while (edges.length < 1279) {
      const a = nodes[Math.floor(rand() * nodes.length)].id;
      const b = nodes[Math.floor(rand() * nodes.length)].id;
      if (a !== b) link(a, b);
    }
  }

  const weekAgo = now - 7 * 86400000;
  const monthAgo = now - 30 * 86400000;
  const recall7d = sessions.filter((s) => (s.lastTs || 0) > weekAgo).length;

  const recent = nodes
    .filter((n) => n.ts && n.ts > weekAgo && n.type !== 'core')
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 12)
    .map((n) => ({ label: n.label, type: n.type, ts: n.ts }));

  const stale = nodes
    .filter((n) => n.ts && n.ts < monthAgo)
    .slice(0, 12)
    .map((n) => ({ label: n.label, type: n.type, ts: n.ts }));

  const missing = [];
  for (const n of nodes) {
    if (n.type === 'file' && n.path && n.path.startsWith('/') && !data.demo) {
      if (!fs.existsSync(n.path)) missing.push({ label: n.label, type: 'file', ts: n.ts });
      if (missing.length >= 12) break;
    }
  }
  if (data.demo) {
    missing.push(
      { label: 'ads/creative-c.md', type: 'file', ts: now - 12 * 86400000 },
      { label: 'notes/legacy-plan.md', type: 'file', ts: now - 33 * 86400000 },
    );
  }

  return {
    nodes,
    edges,
    stats: { nodes: nodes.length, edges: edges.length, recall7d },
    panels: { recent, stale, missing },
  };
}

function getSessionTranscript(sessionId) {
  const data = getData();
  if (data.demo) return null;
  if (!/^[\w-]+$/.test(sessionId)) return null;
  const projectsDir = path.join(DATA_DIR, 'projects');
  for (const projEnt of safeReadDir(projectsDir)) {
    if (!projEnt.isDirectory()) continue;
    const file = path.join(projectsDir, projEnt.name, sessionId + '.jsonl');
    if (!fs.existsSync(file)) continue;
    let raw;
    try { raw = fs.readFileSync(file, 'utf8'); } catch { return null; }
    const messages = [];
    for (const line of raw.split('\n')) {
      if (!line) continue;
      let entry;
      try { entry = JSON.parse(line); } catch { continue; }
      if ((entry.type === 'user' || entry.type === 'assistant') && !entry.isSidechain && entry.message) {
        const text = extractText(entry.message.content);
        if (text) messages.push({ role: entry.message.role, text: text.slice(0, 2000) });
      }
    }
    return messages.slice(-40);
  }
  return null;
}

module.exports = { summarize, listSessions, listSkills, activityFeed, buildGraph, getSessionTranscript, DATA_DIR };
