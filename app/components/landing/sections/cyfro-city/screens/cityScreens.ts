import { CanvasTexture, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace, type Group, type WebGLRenderer } from 'three';
import type { ChunkSignal } from '../chunks/types';
import { ASSET_SAMPLES, ASSET_TYPES, assetLoop, assetRuns, assetTime } from '../chunks/assetLoop';
import { localLoop } from '../chunks/process';
import { FRAMEWORKS, OUTCOMES, STATUS_COLOR, EVIDENCE, FEATURED, score as complianceScore, CW, evalAt, complianceK } from '../chunks/complianceEval';
import { FAMILIES, SHARDS, STAGE_LABEL, agentState, type AgentStage } from '../chunks/agentFlow';
import { PROVIDERS, REPO, gitState } from '../chunks/gitFlow';
import { STAGES, STAGE_LABEL as PROVIDER_LABEL, PX, providerState } from '../chunks/providerFlow';
import { TARGETS, IDENTIFIED, HIGHLIGHT, FINDINGS, SHARDS as FP_SHARDS, FW, idAt, matchAt, labK, targetOf } from '../chunks/fingerprintLab';
import { TOPO_NODES, TOPO_EDGES, SELECTED, RISK, LINKED, nodeAt, edgeAt, STAGE, topoK } from '../chunks/topologyGraph';
/** working progress shown on a screen: the story's, or the focused chunk's local loop (same period as its machine) */
const workK = (sg: ChunkSignal): number | null => { const lp = localLoop(sg); return lp ? lp.k : sg.phase === 'working' ? sg.progress : null; };

/**
 * Story-driven canvas screens for the new city chunks, in the same style as the original monitors
 * (platform-architecture-3d/screens.ts: palettes, header bar, rounded panels). All content is
 * illustrative sample UI — never data from a real environment — and every screen says so.
 * Repainted at most 30×/s while focused; the engine throttles overview repaints further.
 */

export type CityScreenId = 'schedule' | 'registry' | 'portscan' | 'assetInventory' | 'assetSteps' | 'topoInspect' | 'complianceAudit' | 'agentStatus' | 'providerPanel' | 'aiGateway' | 'repoConsole' | 'prStatus' | 'fpResults' | 'fpControl' | 'ingest' | 'reports' | 'askApproval' | 'prReview' | 'teamDashboard' | 'socMain' | 'approvalConsole';
type Slot = { id: CityScreenId; center: [number, number, number]; w: number; h: number; group: Group; rotY?: number; tilt?: number };
type Pal = Record<'bg' | 'panel' | 'line' | 'text' | 'muted' | 'blue' | 'blueSoft' | 'orange' | 'orangeSoft' | 'green' | 'greenSoft', string>;

const DARK: Pal = { bg: '#0b1826', panel: '#14283a', line: '#2a4157', text: '#e9f1f8', muted: '#8ea4b7', blue: '#039be0', blueSoft: '#123a52', orange: '#fe904d', orangeSoft: '#3b2a20', green: '#4fbf8b', greenSoft: '#173a2d' };
const LIGHT: Pal = { bg: '#ffffff', panel: '#eef4f9', line: '#d3e0ec', text: '#0f1f2f', muted: '#566b80', blue: '#0278ae', blueSoft: '#dcf0fb', orange: '#fe701a', orangeSoft: '#fff1e6', green: '#2f9e6b', greenSoft: '#e3f5ec' };
const SANS = 'Inter, "Segoe UI", system-ui, sans-serif';
const MONO = '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace';
type Ctx = CanvasRenderingContext2D;

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (t: number) => { const x = clamp(t); return x * x * (3 - 2 * x); };
function rr(c: Ctx, x: number, y: number, w: number, h: number, r: number, fill?: string, stroke?: string, lw = 2) {
  c.beginPath(); c.roundRect(x, y, Math.max(0, w), h, r);
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.stroke(); }
}
function txt(c: Ctx, s: string, x: number, y: number, size: number, color: string, weight = 600, font = SANS, align: CanvasTextAlign = 'left') {
  c.font = `${weight} ${size}px ${font}`; c.fillStyle = color; c.textAlign = align; c.textBaseline = 'middle'; c.fillText(s, x, y);
}
function header(c: Ctx, P: Pal, W: number, title: string, s: number, scan?: number) {
  rr(c, 0, 0, W, 44 * s, 0, P.panel);
  for (let i = 0; i < 3; i++) { c.beginPath(); c.arc((18 + i * 16) * s, 22 * s, 5 * s, 0, Math.PI * 2); c.fillStyle = i === 0 ? P.orange : P.line; c.fill(); }
  txt(c, title, 72 * s, 22 * s, 18 * s, P.text, 700);
  if (scan !== undefined) rr(c, scan * (W - 90 * s), 41 * s, 90 * s, 3 * s, 1.5 * s, P.blue);
}
function check(c: Ctx, x: number, y: number, r: number, color: string) {
  c.strokeStyle = color; c.lineWidth = r * 0.28; c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(x - r * 0.42, y + r * 0.02); c.lineTo(x - r * 0.1, y + r * 0.34); c.lineTo(x + r * 0.45, y - r * 0.3); c.stroke();
}
function cross(c: Ctx, x: number, y: number, r: number, color: string) {
  c.strokeStyle = color; c.lineWidth = r * 0.28; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x - r * 0.35, y - r * 0.35); c.lineTo(x + r * 0.35, y + r * 0.35); c.moveTo(x + r * 0.35, y - r * 0.35); c.lineTo(x - r * 0.35, y + r * 0.35); c.stroke();
}
const foot = (c: Ctx, P: Pal, W: number, H: number, s: number) => txt(c, 'Illustrative sample', W - 14 * s, H - 14 * s, 12 * s, P.muted, 600, SANS, 'right');
const active = (sg: ChunkSignal) => sg.phase !== 'idle';

/* ── Scan Control: Scan Setup + scheduler ── */
function drawSchedule(c: Ctx, P: Pal, W: number, H: number, t: number, sg: ChunkSignal) {
  const s = W / 512;
  rr(c, 0, 0, W, H, 0, P.bg); header(c, P, W, 'Scan Setup · Scheduler', s, active(sg) ? (t * 0.4) % 1 : undefined);
  const rows: [string, string, string][] = [['Network Discovery', '192.0.2.0/24', 'every 6 h'], ['Asset Discovery', 'local subnet', 'daily'], ['Service Fingerprinting', 'host filesystem', 'daily']];
  rows.forEach(([name, target, every], i) => {
    const y = (70 + i * 54) * s, hot = sg.phase === 'emitting' && i === 0;
    rr(c, 16 * s, y, W - 32 * s, 44 * s, 10 * s, hot ? P.blueSoft : P.panel, hot ? P.blue : undefined, 2 * s);
    txt(c, name, 30 * s, y + 15 * s, 16 * s, P.text, 700); txt(c, `${target} · ${every}`, 30 * s, y + 32 * s, 13 * s, P.muted, 600);
    const due = hot ? 1 : ((t / 9 + i * 0.31) % 1);
    rr(c, W - 130 * s, y + 18 * s, 96 * s, 8 * s, 4 * s, P.line); rr(c, W - 130 * s, y + 18 * s, 96 * s * due, 8 * s, 4 * s, hot ? P.orange : P.blue);
  });
  const y = H - 46 * s;
  if (sg.phase === 'emitting') { rr(c, 16 * s, y, W - 32 * s, 32 * s, 9 * s, P.blueSoft, P.blue, 2 * s); txt(c, 'Due now → assignment on the agent’s own connection', 28 * s, y + 16 * s, 14 * s, P.blue, 800); }
  else if (sg.phase === 'receiving' && sg.decision === 'approved') { rr(c, 16 * s, y, W - 32 * s, 32 * s, 9 * s, P.greenSoft, P.green, 2 * s); txt(c, 'Scan job from CyfroAssistant · approved by a person', 28 * s, y + 16 * s, 14 * s, P.green, 800); }
  else txt(c, 'Checks for due scans every 30 s', 18 * s, y + 16 * s, 14 * s, P.muted, 600);
}
/* ── Scan Control: agent registry board ── */
function drawRegistry(c: Ctx, P: Pal, W: number, H: number, t: number, sg: ChunkSignal) {
  const s = W / 512;
  rr(c, 0, 0, W, H, 0, P.bg); header(c, P, W, 'CyfroAgent fleet', s);
  [['agent-01', 'online'], ['agent-02', 'online'], ['agent-03', 'idle']].forEach(([n, st], i) => {
    const y = (64 + i * 46) * s, beat = sg.phase === 'receiving' && i === 0 ? 1 : 0.5;
    rr(c, 16 * s, y, W - 32 * s, 38 * s, 9 * s, P.panel);
    c.beginPath(); c.arc(36 * s, y + 19 * s, (6 + 3 * beat) * s, 0, Math.PI * 2); c.fillStyle = st === 'online' ? P.green : P.muted; c.fill();
    txt(c, n, 54 * s, y + 19 * s, 16 * s, P.text, 700, MONO); txt(c, st === 'online' ? 'heartbeat · outbound' : 'idle', W - 28 * s, y + 19 * s, 13 * s, P.muted, 600, SANS, 'right');
  });
  txt(c, 'Enrolled with single-use tokens', 18 * s, H - 26 * s, 13 * s, P.muted, 600); foot(c, P, W, H, s);
}
/* ── Network Discovery: port table ── */
function drawPortscan(c: Ctx, P: Pal, W: number, H: number, t: number, sg: ChunkSignal) {
  const s = W / 512, w = workK(sg), k = w ?? 0.999;
  rr(c, 0, 0, W, H, 0, P.bg); header(c, P, W, 'Network Discovery · 192.0.2.0/24', s, w !== null ? (t * 0.7) % 1 : undefined);
  const rows: [string, string, string][] = [['192.0.2.12', '22/tcp', 'OpenSSH 8.9'], ['192.0.2.12', '443/tcp', 'nginx 1.24'], ['192.0.2.31', '5432/tcp', 'PostgreSQL 15'], ['192.0.2.40', '8080/tcp', 'Jetty 9.4']];
  rows.forEach(([h, p, svc], i) => {
    const a = ease((k - i * 0.18) / 0.2); if (a <= 0) return; c.globalAlpha = a;
    const y = (62 + i * 40) * s; rr(c, 14 * s, y, W - 28 * s, 34 * s, 8 * s, P.panel);
    txt(c, h, 26 * s, y + 17 * s, 14 * s, P.text, 600, MONO); txt(c, p, 190 * s, y + 17 * s, 14 * s, P.blue, 700, MONO); txt(c, svc, 290 * s, y + 17 * s, 14 * s, P.text, 600);
  });
  c.globalAlpha = 1; foot(c, P, W, H, s);
}
/* ── Asset Discovery: the inventory board — counts by device type, total, the newest asset ── */
function drawAssetInventory(c: Ctx, P: Pal, W: number, H: number, t: number, sg: ChunkSignal) {
  const s = W / 512, run = assetRuns(sg), L = assetLoop(assetTime(t, sg)), ty = ASSET_TYPES[L.type];
  rr(c, 0, 0, W, H, 0, P.bg); header(c, P, W, 'Asset inventory · local subnet', s, run && (L.stage === 'scan' || L.stage === 'detect') ? L.u / 2.2 : undefined);
  ASSET_TYPES.forEach((it, i) => {
    const x = (12 + (i % 3) * 108) * s, y = (54 + Math.floor(i / 3) * 82) * s, w = 100 * s, h = 74 * s;
    const hot = i === L.type && L.stage === 'inventory';
    rr(c, x, y, w, h, 10 * s, hot ? P.blueSoft : P.panel, hot ? P.blue : undefined, 2 * s);
    c.beginPath(); c.arc(x + 15 * s, y + 16 * s, 5.5 * s, 0, Math.PI * 2); c.fillStyle = it.color; c.fill(); c.strokeStyle = P.line; c.lineWidth = 1.5 * s; c.stroke();
    txt(c, it.label, x + 26 * s, y + 16 * s, 11 * s, P.muted, 700);
    txt(c, String(L.counts[i]), x + 12 * s, y + 50 * s, 30 * s, P.text, 800);
    if (hot) { c.globalAlpha = 1 - 0.6 * L.k.inventory; txt(c, '+1', x + w - 10 * s, y + 50 * s, 18 * s, P.green, 800, SANS, 'right'); c.globalAlpha = 1; }
  });
  // right: total and the newest asset as it moves through the steps
  const rx = 344 * s, rw = W - rx - 12 * s;
  rr(c, rx, 54 * s, rw, 56 * s, 10 * s, P.panel); txt(c, 'Total assets', rx + 12 * s, 70 * s, 11 * s, P.muted, 700); txt(c, String(L.total), rx + 12 * s, 94 * s, 24 * s, P.text, 800);
  const ny = 118 * s, nh = 92 * s, fresh = L.stage === 'inventory';
  rr(c, rx, ny, rw, nh, 10 * s, fresh ? P.greenSoft : P.panel, fresh ? P.green : L.stage === 'scan' ? undefined : P.blue, 2 * s);
  txt(c, L.stage === 'scan' ? 'Sweeping…' : 'New asset detected', rx + 12 * s, ny + 16 * s, 11 * s, fresh ? P.green : P.blue, 800);
  if (L.stage !== 'scan') {
    const [name, ip] = ASSET_SAMPLES[L.type].split(' · ');
    txt(c, L.stage === 'detect' ? 'device answered' : name, rx + 12 * s, ny + 38 * s, 15 * s, P.text, 800, MONO);
    txt(c, ip, rx + 12 * s, ny + 57 * s, 12 * s, P.muted, 600, MONO);
    const role = L.stage === 'classify' || fresh ? ty.label : L.stage === 'identify' ? 'identifying…' : '';
    if (role) txt(c, fresh ? `${role} · added` : role, rx + 12 * s, ny + 77 * s, 12 * s, fresh ? P.green : P.blue, 800);
  }
  // inventory map: one square per asset, grouped by type
  let k = 0; const per = Math.floor((W - 24 * s) / (8 * s));
  L.counts.forEach((n, i) => { for (let j = 0; j < n; j++, k++) { const col = k % per, row = Math.floor(k / per); c.fillStyle = ASSET_TYPES[i].color; c.globalAlpha = i === L.type && j === n - 1 && L.stage === 'inventory' ? 1 : 0.75; c.fillRect(12 * s + col * 8 * s, (222 + row * 8) * s, 6 * s, 6 * s); } });
  c.globalAlpha = 1;
  txt(c, 'Device roles assigned by CyfroSec', 14 * s, H - 14 * s, 11 * s, P.muted, 700); foot(c, P, W, H, s);
}
/* ── Asset Discovery: identify console — the four steps for the asset in hand ── */
function drawAssetSteps(c: Ctx, P: Pal, W: number, H: number, t: number, sg: ChunkSignal) {
  const s = W / 512, run = assetRuns(sg), L = assetLoop(assetTime(t, sg)), ty = ASSET_TYPES[L.type];
  const cur = L.stage === 'scan' || L.stage === 'detect' ? 0 : L.stage === 'identify' ? 1 : L.stage === 'classify' ? 2 : 3;
  const [name, ip] = ASSET_SAMPLES[L.type].split(' · ');
  const rows: [string, string][] = [
    ['Scanning', L.stage === 'detect' ? `device answered · ${ip}` : cur > 0 ? 'local subnet' : 'sweeping local subnet…'],
    ['Identifying', cur >= 1 ? `${name} · ${ip}` : ''],
    ['Classifying', cur >= 2 ? `→ ${ty.label}` : ''],
    ['Inventory updated', cur >= 3 ? `+1 ${ty.label}` : ''],
  ];
  rr(c, 0, 0, W, H, 0, P.bg); header(c, P, W, 'Asset Discovery · steps', s);
  rows.forEach(([label, detail], i) => {
    const y = (56 + i * 52) * s, h = 44 * s, done = i < cur, now = i === cur;
    const col = i === 3 && now ? P.green : P.blue;
    rr(c, 14 * s, y, W - 28 * s, h, 10 * s, now ? (i === 3 ? P.greenSoft : P.blueSoft) : P.panel, now ? col : undefined, 2.5 * s);
    const cx = 38 * s, cy = y + h / 2;
    if (done) check(c, cx, cy, 12 * s, P.blue);
    else { c.beginPath(); c.arc(cx, cy, (now && run ? 7 + 2 * Math.sin(t * 8) : 7) * s, 0, Math.PI * 2); if (now) { c.fillStyle = col; c.fill(); } else { c.strokeStyle = P.line; c.lineWidth = 2 * s; c.stroke(); } }
    txt(c, label, 60 * s, cy, 17 * s, now || done ? P.text : P.muted, 800);
    if (detail) txt(c, detail, W - 26 * s, cy, 13 * s, now ? col : P.muted, 700, MONO, 'right');
  });
  foot(c, P, W, H, s);
}
/* ── CyfroTopology: node details beside the table — build stages, then the inspected asset ── */
function drawTopoInspect(c: Ctx, P: Pal, W: number, H: number, t: number, sg: ChunkSignal) {
  const s = W / 512, k = topoK(sg), b = k < 0 ? 1 : k, run = k >= 0 && !sg.still;
  rr(c, 0, 0, W, H, 0, P.bg); header(c, P, W, 'Node details · CyfroTopology', s, run && b < STAGE.settled ? (t * 0.6) % 1 : undefined);
  const stages: [string, number][] = [['Records', STAGE.records], ['Relationships', STAGE.relations], ['Graph', STAGE.settled], ['Inspect', 1.01]];
  stages.forEach(([label, at], i) => {
    const prev = i === 0 ? 0 : stages[i - 1][1], done = b >= at || (k < 0 && i < 3), now = !done && b >= prev && k >= 0;
    const x = (14 + i * 122) * s;
    rr(c, x, 54 * s, 114 * s, 28 * s, 14 * s, done ? P.blueSoft : now ? P.orangeSoft : P.panel, done ? P.blue : now ? P.orange : undefined, 1.5 * s);
    txt(c, label, x + 57 * s, 68 * s, 12 * s, done ? P.blue : now ? P.orange : P.muted, 800, SANS, 'center');
  });
  const nodes = TOPO_NODES.filter((_, i) => b >= nodeAt(i) + 0.03).length, edges = TOPO_EDGES.filter((_, i) => b >= edgeAt(i)).length;
  if (k < 0 || b < STAGE.select) {
    [['Nodes', nodes, TOPO_NODES.length], ['Links', edges, TOPO_EDGES.length]].forEach(([label, n, of], i) => {
      const x = (14 + i * 246) * s; rr(c, x, 96 * s, 238 * s, 96 * s, 12 * s, P.panel);
      txt(c, String(label), x + 16 * s, 116 * s, 13 * s, P.muted, 700);
      txt(c, `${n}`, x + 16 * s, 156 * s, 38 * s, P.text, 800); txt(c, `/ ${of}`, x + 16 * s + c.measureText(`${n}`).width + 8 * s, 162 * s, 16 * s, P.muted, 700);
    });
    txt(c, k < 0 ? 'Graph ready. Select a node to inspect it.' : 'Building the graph from the latest snapshot…', 16 * s, 214 * s, 13 * s, k < 0 ? P.muted : P.blue, 700);
  } else {
    const nd = TOPO_NODES[SELECTED], sub = TOPO_NODES[nd.parent];
    rr(c, 14 * s, 96 * s, W - 28 * s, 64 * s, 12 * s, P.blueSoft, P.blue, 2 * s);
    txt(c, nd.name, 30 * s, 118 * s, 22 * s, P.text, 800, MONO);
    txt(c, `Asset · subnet ${sub.name} · via ${TOPO_NODES[0].name}`, 30 * s, 145 * s, 12 * s, P.muted, 700);
    txt(c, `${LINKED.length} links`, W - 28 * s, 118 * s, 16 * s, P.blue, 800, SANS, 'right');
    txt(c, 'Linked', 16 * s, 180 * s, 12 * s, P.muted, 800);
    LINKED.forEach((li, i) => { const x = (70 + i * 112) * s; rr(c, x, 168 * s, 104 * s, 24 * s, 12 * s, P.panel, P.line, 1.5 * s); txt(c, TOPO_NODES[li].kind === 'subnet' ? 'subnet' : TOPO_NODES[li].name, x + 52 * s, 180 * s, 12 * s, P.text, 700, MONO, 'center'); });
    if (b >= STAGE.overlay) { rr(c, 14 * s, 204 * s, W - 28 * s, 30 * s, 9 * s, P.orangeSoft, P.orange, 1.5 * s); txt(c, `Risk overlay from CyfroAI Insights · ${RISK.length} assets`, 28 * s, 219 * s, 13 * s, P.orange, 800); }
  }
  foot(c, P, W, H, s);
}
/* ── CyfroCompliance: audit workstation — evidence in, controls evaluated, results, what needs attention ── */
function drawComplianceAudit(c: Ctx, P: Pal, W: number, H: number, t: number, sg: ChunkSignal) {
  const s = W / 512, k = complianceK(sg), b = k < 0 ? 1 : k, run = k >= 0 && !sg.still, F = FEATURED;
  const evaluating = run && b >= CW.evaluate[0] && b < CW.score[0];
  rr(c, 0, 0, W, H, 0, P.bg); header(c, P, W, `Compliance evaluation · ${FRAMEWORKS[F]}`, s, evaluating ? (t * 0.5) % 1 : undefined);
  txt(c, 'Evidence received', 14 * s, 58 * s, 11 * s, P.muted, 800);
  EVIDENCE.forEach((name, i) => {
    const got = b >= CW.records[0] + 0.11 + i * 0.035, x = (14 + i * 122) * s;
    rr(c, x, 68 * s, 114 * s, 24 * s, 12 * s, got ? P.blueSoft : P.panel, got ? P.blue : undefined, 1.5 * s);
    txt(c, name, x + 57 * s, 80 * s, 10.5 * s, got ? P.blue : P.muted, 700, SANS, 'center');
  });
  const done = OUTCOMES[F].map((_, i) => b >= evalAt(F, i));
  const n = done.filter(Boolean).length, cnt = { passing: 0, partial: 0, failing: 0, not_evaluable: 0, review: 0 };
  OUTCOMES[F].forEach((st, i) => { if (done[i]) cnt[st]++; });
  const scored = b >= CW.score[1] || !run;
  [['Controls evaluated', `${n} / ${OUTCOMES[F].length}`, P.text], ['Score · technical controls', scored ? String(complianceScore(F)) : '—', P.text], ['Run', !run ? 'Last run' : b < CW.evaluate[0] ? 'Evidence in…' : b < CW.score[1] ? 'Evaluating…' : 'Complete', run && b < CW.score[1] ? P.blue : P.green]].forEach(([label, v, col], i) => {
    const x = (14 + i * 162) * s; rr(c, x, 102 * s, 154 * s, 70 * s, 10 * s, P.panel);
    txt(c, label, x + 12 * s, 118 * s, 10.5 * s, P.muted, 700); txt(c, v, x + 12 * s, 149 * s, i === 2 ? 17 * s : 26 * s, col, 800);
  });
  ([['Passing', cnt.passing, STATUS_COLOR.passing], ['Partial', cnt.partial, STATUS_COLOR.partial], ['Failing', cnt.failing, STATUS_COLOR.failing]] as const).forEach(([label, v, col], i) => {
    const x = (14 + i * 162) * s; c.beginPath(); c.arc(x + 9 * s, 192 * s, 6 * s, 0, Math.PI * 2); c.fillStyle = col; c.fill();
    txt(c, `${label} ${v}`, x + 22 * s, 192 * s, 13 * s, P.text, 700);
  });
  ([['Missing evidence · not evaluable', cnt.not_evaluable, STATUS_COLOR.not_evaluable], ['Needs review · attestation', cnt.review, STATUS_COLOR.review]] as const).forEach(([label, v, col], i) => {
    const x = (14 + i * 246) * s; rr(c, x, 210 * s, 238 * s, 30 * s, 9 * s, P.panel, v ? col : undefined, 1.5 * s);
    txt(c, `${label}  ${v}`, x + 12 * s, 225 * s, 11.5 * s, v ? P.text : P.muted, 700);
  });
  txt(c, 'Deterministic checks. No AI decides a control.', 14 * s, H - 16 * s, 10.5 * s, P.muted, 700); foot(c, P, W, H, s);
}
/* ── CyfroAgent: status — its own outbound stream, the run state, and each scan family ── */
function drawAgentStatus(c: Ctx, P: Pal, W: number, H: number, t: number, sg: ChunkSignal) {
  const s = W / 512, A = agentState(sg), live = !sg.still && A.stage !== 'waiting';
  rr(c, 0, 0, W, H, 0, P.bg); header(c, P, W, 'CyfroAgent · agent-01', s, live && A.stage !== 'complete' ? (t * 0.5) % 1 : undefined);
  c.beginPath(); c.arc(22 * s, 60 * s, 5 * s, 0, Math.PI * 2); c.fillStyle = P.green; c.fill();
  txt(c, 'Outbound control stream · connected', 34 * s, 60 * s, 12 * s, P.text, 700);
  txt(c, 'heartbeat', W - 16 * s, 60 * s, 11 * s, A.stage === 'connected' || ((t % 6) < 0.6 && !sg.still) ? P.green : P.muted, 800, SANS, 'right');
  const ORDER: AgentStage[] = ['waiting', 'command', 'scan', 'collect', 'upload', 'complete'];
  const cur = A.stage === 'connected' ? 0 : ORDER.indexOf(A.stage);
  ORDER.forEach((st, i) => {
    const y = (80 + i * 34) * s, now = i === cur, past = i < cur && cur > 0;
    rr(c, 12 * s, y, 236 * s, 28 * s, 8 * s, now ? (st === 'complete' ? P.greenSoft : P.blueSoft) : P.panel, now ? (st === 'complete' ? P.green : P.blue) : undefined, 1.5 * s);
    if (past) check(c, 28 * s, y + 14 * s, 9 * s, P.blue); else { c.beginPath(); c.arc(28 * s, y + 14 * s, 5 * s, 0, Math.PI * 2); c.fillStyle = now ? P.blue : P.line; c.fill(); }
    txt(c, STAGE_LABEL[st], 42 * s, y + 14 * s, 12 * s, now || past ? P.text : P.muted, 700);
  });
  FAMILIES.forEach((f, i) => {
    const y = (80 + i * 68) * s, running = A.fam === i && A.stage === 'scan' && !sg.still, collected = i < A.done || (A.fam === i && A.stage === 'collect');
    rr(c, 260 * s, y, W - 272 * s, 60 * s, 10 * s, running ? P.blueSoft : P.panel, running ? P.blue : undefined, 1.5 * s);
    txt(c, f.label, 274 * s, y + 18 * s, 13 * s, P.text, 800); txt(c, f.tool, W - 22 * s, y + 18 * s, 11 * s, P.muted, 700, SANS, 'right');
    const detail = running ? (f.key === 'fp' ? `scanning · shard ${Math.min(SHARDS, A.shards + 1)} / ${SHARDS}` : 'scanning…') : collected ? (f.key === 'fp' ? `collected · ${SHARDS} shards` : 'results collected') : A.stage === 'upload' || A.stage === 'complete' ? 'uploaded' : '—';
    txt(c, detail, 274 * s, y + 42 * s, 12 * s, running ? P.blue : collected ? P.green : P.muted, 700);
  });
  txt(c, `Uploads over HTTPS · retry queue 0${A.stage === 'upload' ? ` · ${Math.round(A.upload * 100)}%` : ''}`, 14 * s, H - 16 * s, 10.5 * s, P.muted, 700); foot(c, P, W, H, s);
}
/* ── Your code hosting: provider marks, repository console, pull-request status ── */
const marks = new Map<string, Path2D>();
function mark(c: Ctx, i: number, x: number, y: number, size: number, dark: boolean) {
  const p = PROVIDERS[i]; let path = marks.get(p.key); if (!path) { path = new Path2D(p.path); marks.set(p.key, path); }
  c.save(); c.translate(x, y); c.scale(size / 24, size / 24); c.fillStyle = dark ? p.color.dark : p.color.light; c.fill(path); c.restore();
}
const isDark = (P: Pal) => P === DARK;
function drawProviderPanel(c: Ctx, P: Pal, W: number, H: number, t: number, sg: ChunkSignal) {
  // a compact strip on the hosting display: both supported providers, the active repository's one lit
  const s = W / 512, G = gitState(t, sg);
  rr(c, 0, 0, W, H, 0, P.bg);
  PROVIDERS.forEach((pv, i) => {
    const x = (8 + i * 252) * s, w = 244 * s, on = i === G.provider;
    c.globalAlpha = on ? 1 : 0.6;
    rr(c, x, 10 * s, w, H - 20 * s, 14 * s, on ? P.blueSoft : P.panel, on ? P.blue : P.line, (on ? 3 : 1.5) * s);
    mark(c, i, x + 18 * s, H / 2 - 32 * s, 64 * s, isDark(P));
    txt(c, pv.name, x + 96 * s, H / 2 - 12 * s, 30 * s, P.text, 800);
    txt(c, on ? 'active' : 'supported', x + 96 * s, H / 2 + 24 * s, 17 * s, on ? P.blue : P.muted, 700);
    c.globalAlpha = 1;
  });
}
/* ── External AI provider: a generic gateway status panel (neutral — no CyfroSec blue, no provider identity) ── */
function drawAiGateway(c: Ctx, P: Pal, W: number, H: number, t: number, sg: ChunkSignal) {
  const s = W / 512, A = providerState(sg), cur = A.stage === 'idle' ? -1 : STAGES.indexOf(A.stage), live = !sg.still && cur >= 0;
  rr(c, 0, 0, W, H, 0, P.bg); header(c, P, W, 'AI provider · request gateway', s);
  if (live && A.stage !== 'sent') rr(c, ((t * 0.6) % 1) * (W - 90 * s), 41 * s, 90 * s, 3 * s, 1.5 * s, P.text); // neutral: not CyfroSec blue
  STAGES.forEach((st, i) => {
    const y = (54 + i * 40) * s, now = i === cur, past = i < cur;
    rr(c, 12 * s, y, 256 * s, 34 * s, 8 * s, now ? (st === 'sent' ? P.greenSoft : P.panel) : P.bg, now ? (st === 'sent' ? P.green : P.text) : P.line, (now ? 2 : 1) * s);
    if (past) check(c, 30 * s, y + 17 * s, 10 * s, P.green);
    else { c.beginPath(); c.arc(30 * s, y + 17 * s, 5 * s, 0, Math.PI * 2); c.fillStyle = now ? (st === 'sent' ? P.green : P.text) : P.line; c.fill(); }
    txt(c, PROVIDER_LABEL[st], 46 * s, y + 17 * s, 14 * s, now || past ? P.text : P.muted, 700);
  });
  // the current state, large, with this stage's progress
  const X = 284 * s, CW = W - X - 12 * s;
  rr(c, X, 54 * s, CW, 194 * s, 12 * s, P.panel);
  txt(c, cur < 0 ? 'Status' : 'Now', X + 16 * s, 76 * s, 12 * s, P.muted, 700);
  txt(c, PROVIDER_LABEL[A.stage], X + 16 * s, 104 * s, 19 * s, A.stage === 'sent' ? P.green : P.text, 800);
  const k = cur < 0 ? 0 : clamp((A.x - PX[STAGES[cur]][0]) / (PX[STAGES[cur]][1] - PX[STAGES[cur]][0]));
  rr(c, X + 16 * s, 126 * s, CW - 32 * s, 8 * s, 4 * s, P.line);
  if (cur >= 0) rr(c, X + 16 * s, 126 * s, (CW - 32 * s) * (sg.still ? 0.6 : k), 8 * s, 4 * s, A.stage === 'sent' ? P.green : P.text);
  const inOn = A.inbound || A.stage === 'queued' || A.stage === 'ready', outOn = A.stage === 'prepared' || A.stage === 'sent';
  rr(c, X + 16 * s, 154 * s, CW - 32 * s, 36 * s, 8 * s, inOn ? P.bg : undefined, inOn ? P.text : P.line, 1.5 * s);
  txt(c, 'Request in', X + 28 * s, 172 * s, 13 * s, inOn ? P.text : P.muted, 700);
  rr(c, X + 16 * s, 198 * s, CW - 32 * s, 36 * s, 8 * s, outOn ? P.greenSoft : undefined, outOn ? P.green : P.line, 1.5 * s);
  txt(c, 'Response out', X + 28 * s, 216 * s, 13 * s, outOn ? P.green : P.muted, 700);
  txt(c, 'External service · outside the CyfroSec platform', 14 * s, H - 16 * s, 11 * s, P.muted, 700); foot(c, P, W, H, s);
}
function drawRepoConsole(c: Ctx, P: Pal, W: number, H: number, t: number, sg: ChunkSignal) {
  const s = W / 512, G = gitState(t, sg), pv = PROVIDERS[G.provider];
  rr(c, 0, 0, W, H, 0, P.bg); header(c, P, W, 'Repository', s, G.stage === 'clone' ? (t * 0.7) % 1 : undefined);
  mark(c, G.provider, 16 * s, 58 * s, 26 * s, isDark(P)); txt(c, `${pv.name} · via ${pv.via}`, 52 * s, 71 * s, 14 * s, P.text, 700);
  rr(c, 14 * s, 96 * s, W - 28 * s, 44 * s, 10 * s, P.panel); txt(c, REPO.name, 28 * s, 118 * s, 19 * s, P.text, 800, MONO);
  const newCommit = G.stage === 'activity' && G.k > 0.62;
  [['Branch', REPO.branch], ['Latest commit', newCommit ? 'b41d0c5 · feature' : REPO.head]].forEach(([label, v], i) => {
    const x = (14 + i * 246) * s; rr(c, x, 150 * s, 238 * s, 52 * s, 10 * s, P.panel);
    txt(c, label, x + 12 * s, 166 * s, 11 * s, P.muted, 700); txt(c, v, x + 12 * s, 187 * s, 15 * s, newCommit && i === 1 ? P.green : P.text, 800, MONO);
  });
  const line: Record<string, [string, string]> = {
    ready: ['Available to CyfroCode for scanning', P.muted], activity: ['Available to CyfroCode for scanning', P.muted],
    clone: ['Clone requested by CyfroCode. Sending…', P.blue], scanning: ['Cloned · scanning runs in CyfroCode', P.text], proposed: ['Cloned · scanning runs in CyfroCode', P.text],
    waiting: ['Cloned · scanning runs in CyfroCode', P.text], pr: ['Pull request opened by CyfroCode', P.orange], rejected: ['No changes pushed', P.muted],
  };
  const [msg, col] = line[G.stage];
  rr(c, 14 * s, 214 * s, W - 28 * s, 34 * s, 9 * s, G.stage === 'clone' ? P.blueSoft : P.panel, G.stage === 'clone' ? P.blue : undefined, 1.5 * s);
  txt(c, msg, 28 * s, 231 * s, 13.5 * s, col, 800);
  if (G.stage === 'clone') rr(c, 14 * s, 254 * s, (W - 28 * s) * Math.min(1, G.k * 1.2), 6 * s, 3 * s, P.blue);
  foot(c, P, W, H, s);
}
function drawPrStatus(c: Ctx, P: Pal, W: number, H: number, t: number, sg: ChunkSignal) {
  const s = W / 512, G = gitState(t, sg);
  rr(c, 0, 0, W, H, 0, P.bg); header(c, P, W, 'Pull request status', s);
  const idx = G.stage === 'clone' || G.stage === 'scanning' ? 1 : G.stage === 'proposed' ? 2 : G.stage === 'waiting' ? 3 : G.stage === 'pr' ? (G.prOpen ? 4 : 3.5) : G.stage === 'rejected' ? 3 : 0;
  const rows: [string, string][] = [['Repository ready', ''], ['Scan requested', 'by CyfroCode'], ['Patch proposed', 'in CyfroCode'], ['Awaiting approval', 'a person decides'], G.stage === 'rejected' ? ['Rejected', 'no pull request'] : ['PR created', 'open · not merged']];
  rows.forEach(([label, sub], i) => {
    const y = (52 + i * 42) * s, now = Math.floor(idx) === i && !(G.stage === 'rejected' && i === 3), done = i < idx || (G.stage === 'rejected' && i === 3);
    const rejectedRow = G.stage === 'rejected' && i === 4, col = rejectedRow ? P.muted : i === 3 && now ? P.orange : i === 4 && now ? P.green : P.blue;
    rr(c, 12 * s, y, W - 24 * s, 36 * s, 9 * s, now || rejectedRow ? (rejectedRow ? P.panel : i === 3 ? P.orangeSoft : i === 4 ? P.greenSoft : P.blueSoft) : P.panel, now || rejectedRow ? col : undefined, 1.5 * s);
    if (rejectedRow) cross(c, 30 * s, y + 18 * s, 11 * s, P.muted); else if (done) check(c, 30 * s, y + 18 * s, 11 * s, P.blue); else { c.beginPath(); c.arc(30 * s, y + 18 * s, 5 * s, 0, Math.PI * 2); c.fillStyle = now ? col : P.line; c.fill(); }
    txt(c, label, 48 * s, y + 18 * s, 14 * s, now || done || rejectedRow ? P.text : P.muted, 800);
    if (sub) txt(c, sub, W - 24 * s, y + 18 * s, 12 * s, now ? col : P.muted, 700, SANS, 'right');
  });
  txt(c, 'Nothing is pushed until a person approves', 14 * s, H - 14 * s, 10.5 * s, P.muted, 700);
}
/* ── Service Fingerprinting lab: identified software, matches, classification ── */
function drawFpResults(c: Ctx, P: Pal, W: number, H: number, t: number, sg: ChunkSignal) {
  const s = W / 512, k = labK(sg), L = k < 0 ? 1 : k, run = k >= 0 && !sg.still;
  rr(c, 0, 0, W, H, 0, P.bg); header(c, P, W, 'Fingerprint results', s, run && L < FW.match[1] ? (t * 0.6) % 1 : undefined);
  txt(c, 'Identified software', 14 * s, 58 * s, 11 * s, P.muted, 800);
  IDENTIFIED.forEach((pkg, i) => {
    if (L < idAt(i)) return;
    const x = (12 + (i % 2) * 248) * s, y = (68 + Math.floor(i / 2) * 40) * s, matched = L >= matchAt(i), hot = pkg.hit && matched, star = i === HIGHLIGHT && L >= FW.classify[0];
    rr(c, x, y, 240 * s, 34 * s, 8 * s, star ? P.orangeSoft : P.panel, star ? P.orange : hot ? P.orange : undefined, (star ? 2.5 : 1.5) * s);
    txt(c, pkg.role, x + 10 * s, y + 11 * s, 9.5 * s, P.muted, 700);
    txt(c, `${pkg.name} ${pkg.ver}`, x + 10 * s, y + 25 * s, 12.5 * s, P.text, 800, MONO);
    txt(c, !matched ? 'matching…' : hot ? 'advisory match' : 'no match', x + 232 * s, y + 18 * s, 10 * s, !matched ? P.blue : hot ? P.orange : P.green, 800, SANS, 'right');
  });
  const cls = L >= FW.classify[0];
  FINDINGS.forEach((f, i) => {
    const x = (12 + i * 164) * s, v = cls ? Math.round(f.n * Math.min(1, (L - FW.classify[0]) / (FW.classify[1] - FW.classify[0]))) : 0;
    rr(c, x, 196 * s, 156 * s, 48 * s, 10 * s, P.panel);
    txt(c, String(cls ? v : '—'), x + 12 * s, 222 * s, 22 * s, i === 1 ? P.blue : P.orange, 800); txt(c, f.label, x + 148 * s, 222 * s, 10.5 * s, P.muted, 700, SANS, 'right');
  });
  txt(c, L >= FW.pack[0] ? `Packed for CyfroAgent · ${FP_SHARDS} shards` : 'Trivy · installed packages vs. advisories', 14 * s, H - 14 * s, 10.5 * s, L >= FW.pack[0] ? P.green : P.muted, 700); foot(c, P, W, H, s);
}
function drawFpControl(c: Ctx, P: Pal, W: number, H: number, t: number, sg: ChunkSignal) {
  const s = W / 512, k = labK(sg), L = k < 0 ? 1 : k, run = k >= 0 && !sg.still, tg = TARGETS[targetOf(sg)];
  rr(c, 0, 0, W, H, 0, P.bg); header(c, P, W, 'Inspection control', s);
  rr(c, 14 * s, 56 * s, W - 28 * s, 50 * s, 10 * s, P.blueSoft, P.blue, 2 * s);
  txt(c, 'Target', 28 * s, 72 * s, 11 * s, P.muted, 700); txt(c, `${tg.label} · ${tg.note}`, 28 * s, 92 * s, 16 * s, P.text, 800);
  const steps: [string, number][] = [['Load target', FW.load[1]], ['Inspect', FW.scan[1]], ['Match advisories', FW.match[1]], ['Classify', FW.classify[1]], ['Pack shards', FW.pack[1]]];
  steps.forEach(([label, end], i) => {
    const y = (118 + i * 26) * s, start = i === 0 ? 0 : steps[i - 1][1], done = !run || L >= end, now = run && L >= start && L < end;
    if (done) check(c, 26 * s, y + 10 * s, 9 * s, P.blue); else { c.beginPath(); c.arc(26 * s, y + 10 * s, (now ? 6 + Math.sin(t * 8) : 5) * s, 0, Math.PI * 2); c.fillStyle = now ? P.blue : P.line; c.fill(); }
    txt(c, label, 42 * s, y + 10 * s, 13 * s, done || now ? P.text : P.muted, 700);
  });
  txt(c, run ? (L < FW.pack[1] ? 'Running' : 'Complete') : 'Idle · last run complete', W - 18 * s, H - 16 * s, 12 * s, run && L < FW.pack[1] ? P.blue : P.green, 800, SANS, 'right');
}
/* ── Data Ingestion & Correlation ── */
function drawIngest(c: Ctx, P: Pal, W: number, H: number, t: number, sg: ChunkSignal) {
  const lp = localLoop(sg);
  const s = W / 512, w = lp ? (lp.k < 0.3 ? 0 : Math.min(1, (lp.k - 0.3) / 0.48)) : sg.phase === 'working' ? sg.progress : sg.phase === 'emitting' || sg.still ? 1 : sg.phase === 'receiving' ? 0 : 1;
  rr(c, 0, 0, W, H, 0, P.bg); header(c, P, W, 'Ingestion · Correlation', s, sg.phase === 'working' ? (t * 0.6) % 1 : undefined);
  ['Duplicate check', 'Normalise', 'Correlate'].forEach((step, i) => {
    const x = (16 + i * 162) * s, done = w > (i + 1) / 3.2;
    rr(c, x, 60 * s, 150 * s, 40 * s, 10 * s, done ? P.blueSoft : P.panel, done ? P.blue : undefined, 2 * s);
    if (done) check(c, x + 20 * s, 80 * s, 11 * s, P.blue);
    txt(c, step, x + 36 * s, 80 * s, 14 * s, done ? P.blue : P.muted, 700);
  });
  const ranks: [string, string][] = [['P1', 'Exposed SSH on db-02'], ['P1', 'Exploitable OpenSSL on web-01'], ['P2', 'Weak TLS on api-gateway']];
  ranks.forEach(([p, label], i) => {
    const a = ease((w - 0.7 - i * 0.08) / 0.12); if (a <= 0) return; c.globalAlpha = a;
    const y = (116 + i * 38) * s; rr(c, 16 * s, y, W - 32 * s, 32 * s, 8 * s, P.panel);
    rr(c, 26 * s, y + 5 * s, 44 * s, 22 * s, 11 * s, p === 'P1' ? P.orange : P.blue); txt(c, p, 48 * s, y + 16 * s, 13 * s, '#fff', 800, SANS, 'center');
    txt(c, label, 84 * s, y + 16 * s, 14 * s, P.text, 600);
  });
  c.globalAlpha = 1; txt(c, 'Ranked by fixed rules, not AI', 18 * s, H - 20 * s, 12 * s, P.muted, 700); foot(c, P, W, H, s);
}
/* ── Reporting & Dashboard ── */
function drawReports(c: Ctx, P: Pal, W: number, H: number, t: number, sg: ChunkSignal) {
  const s = W / 512;
  rr(c, 0, 0, W, H, 0, P.bg); header(c, P, W, 'Security reporting workspace', s);
  ['Vulns', 'Misconfig', 'Secrets', 'Network', 'Assets'].forEach((tab, i) => { const x = (14 + i * 96) * s; rr(c, x, 54 * s, 88 * s, 26 * s, 13 * s, i === 0 ? P.blue : P.panel); txt(c, tab, x + 44 * s, 67 * s, 12 * s, i === 0 ? '#fff' : P.muted, 700, SANS, 'center'); });
  for (let i = 0; i < 4; i++) { const y = (92 + i * 30) * s; rr(c, 14 * s, y, W - 28 * s, 24 * s, 6 * s, P.panel); rr(c, 24 * s, y + 8 * s, (120 + ((i * 53) % 90)) * s, 8 * s, 4 * s, P.line); rr(c, W - 90 * s, y + 6 * s, 60 * s, 12 * s, 6 * s, i < 2 ? P.orange : P.blue); }
  const wk = workK(sg), ex = wk === null ? 0 : ease((wk - 0.7) / 0.25); // same timing as the printer
  rr(c, 14 * s, H - 46 * s, 150 * s, 32 * s, 9 * s, ex > 0.5 ? P.greenSoft : P.panel, ex > 0.5 ? P.green : P.line, 2 * s); txt(c, ex > 0.5 ? 'report.xlsx ✓' : 'Export .xlsx', 30 * s, H - 30 * s, 14 * s, ex > 0.5 ? P.green : P.text, 800);
  if (sg.phase === 'receiving') { rr(c, 180 * s, H - 46 * s, W - 194 * s, 32 * s, 9 * s, P.blueSoft, P.blue, 2 * s); txt(c, '🔔 Scan completed', 196 * s, H - 30 * s, 14 * s, P.blue, 800); }
  void t;
}
/* ── CyfroAssistant: approval card ── */
function drawAskApproval(c: Ctx, P: Pal, W: number, H: number, t: number, sg: ChunkSignal) {
  const s = W / 512, st = sg.phase === 'waiting_approval' ? 'pending' : sg.phase === 'approved' ? 'approved' : sg.phase === 'rejected' ? 'rejected' : 'idle';
  rr(c, 0, 0, W, H, 0, P.bg); header(c, P, W, 'Approval required', s);
  if (st === 'idle') { txt(c, 'No pending actions', W / 2, H / 2 + 6 * s, 16 * s, P.muted, 700, SANS, 'center'); foot(c, P, W, H, s); return; }
  rr(c, 16 * s, 60 * s, W - 32 * s, 74 * s, 12 * s, P.panel);
  txt(c, 'CyfroAssistant wants to:', 30 * s, 80 * s, 14 * s, P.muted, 700); txt(c, 'Start an agent scan · 192.0.2.0/24', 30 * s, 110 * s, 17 * s, P.text, 800);
  const by = 150 * s;
  if (st === 'pending') {
    const pulse = 0.5 + 0.5 * Math.sin(t * 5);
    rr(c, 16 * s, by, 220 * s, 40 * s, 12 * s, P.green, undefined); txt(c, 'Approve', 126 * s, by + 20 * s, 16 * s, '#fff', 800, SANS, 'center');
    rr(c, 250 * s, by, W - 266 * s, 40 * s, 12 * s, P.panel, P.line, 2 * s); txt(c, 'Reject', 250 * s + (W - 266 * s) / 2, by + 20 * s, 16 * s, P.text, 800, SANS, 'center');
    c.globalAlpha = 0.6 + 0.4 * pulse; txt(c, 'Waiting for a person…', 18 * s, H - 24 * s, 14 * s, P.orange, 800); c.globalAlpha = 1;
  } else if (st === 'approved') {
    rr(c, 16 * s, by, W - 32 * s, 40 * s, 12 * s, P.greenSoft, P.green, 2 * s); check(c, 40 * s, by + 20 * s, 12 * s, P.green); txt(c, 'Approved by a person: sent to Scan Control', 60 * s, by + 20 * s, 15 * s, P.green, 800);
  } else {
    rr(c, 16 * s, by, W - 32 * s, 40 * s, 12 * s, P.orangeSoft, P.orange, 2 * s); cross(c, 40 * s, by + 20 * s, 12 * s, P.orange); txt(c, 'Rejected: the action did not run', 60 * s, by + 20 * s, 15 * s, P.orange, 800);
  }
}
/* ── CyfroCode: patch review / publish gate ── */
function drawPrReview(c: Ctx, P: Pal, W: number, H: number, t: number, sg: ChunkSignal) {
  const s = W / 512;
  rr(c, 0, 0, W, H, 0, P.bg); header(c, P, W, 'Patch review', s);
  const ph = sg.phase;
  const steps: [string, boolean][] = [['Draft patch (AI-assisted)', ph !== 'receiving'], ['Applies cleanly (validated)', ['waiting_approval', 'approved', 'rejected'].includes(ph) || (ph === 'working' && sg.progress > 0.85)]];
  steps.forEach(([label, done], i) => { const y = (60 + i * 40) * s; rr(c, 16 * s, y, W - 32 * s, 32 * s, 8 * s, P.panel); if (done) check(c, 36 * s, y + 16 * s, 10 * s, P.blue); txt(c, label, 56 * s, y + 16 * s, 14 * s, done ? P.text : P.muted, 700); });
  const y = 150 * s;
  if (ph === 'waiting_approval') { const pulse = 0.5 + 0.5 * Math.sin(t * 5); rr(c, 16 * s, y, W - 32 * s, 44 * s, 12 * s, P.orangeSoft, P.orange, 2 * s); c.globalAlpha = 0.6 + 0.4 * pulse; txt(c, 'Waiting for human approval', 34 * s, y + 22 * s, 16 * s, P.orange, 800); c.globalAlpha = 1; }
  else if (ph === 'approved') { rr(c, 16 * s, y, W - 32 * s, 44 * s, 12 * s, P.greenSoft, P.green, 2 * s); check(c, 38 * s, y + 22 * s, 12 * s, P.green); txt(c, 'Approved → branch pushed, pull request opened', 58 * s, y + 22 * s, 14 * s, P.green, 800); }
  else if (ph === 'rejected') { rr(c, 16 * s, y, W - 32 * s, 44 * s, 12 * s, P.panel, P.line, 2 * s); cross(c, 38 * s, y + 22 * s, 12 * s, P.muted); txt(c, 'Rejected → draft discarded, nothing pushed', 58 * s, y + 22 * s, 14 * s, P.muted, 800); }
  else txt(c, 'Nothing is published without approval', 18 * s, y + 22 * s, 14 * s, P.muted, 700);
  foot(c, P, W, H, s);
}
/* ── Your team: lane helpers shared by the dashboard and the approval console ── */
type Lane = ChunkSignal['approvals']['assistant'];
const LANES: { key: 'assistant' | 'code'; title: string; action: string; done: string; undone: string }[] = [
  { key: 'assistant', title: 'CyfroAssistant', action: 'Start an agent scan · 192.0.2.0/24', done: 'Approved: sent to Scan Control', undone: 'Rejected: the action did not run' },
  { key: 'code', title: 'CyfroCode', action: 'Publish patch as a pull request', done: 'Approved: pull request opened', undone: 'Rejected: draft discarded, nothing pushed' },
];
const laneColor = (P: Pal, l: Lane) => (l.state === 'pending' ? P.orange : l.state === 'approved' ? P.green : l.state === 'rejected' ? P.muted : P.line);
const laneWord = (l: Lane) => (l.state === 'pending' ? 'Pending' : l.state === 'approved' ? 'Approved' : l.state === 'rejected' ? 'Rejected' : 'No request');

/* ── Your team: wall dashboard — findings under review + the approval queue ── */
function drawTeamDashboard(c: Ctx, P: Pal, W: number, H: number, t: number, sg: ChunkSignal) {
  const s = W / 512;
  rr(c, 0, 0, W, H, 0, P.bg); header(c, P, W, 'Security review · Your team', s, LANES.some((ln) => sg.approvals[ln.key].state === 'pending') ? (t * 0.3) % 1 : undefined);
  // left: findings — most are for review only; approval applies to proposed actions
  const rows: [string, string, boolean][] = [['P1', 'Exposed SSH on db-02', false], ['P1', 'Exploitable OpenSSL on web-01', false], ['P2', 'Secret in config repo · patch proposed', true], ['P2', 'Weak TLS on api-gateway', false]];
  txt(c, 'Findings', 14 * s, 60 * s, 12 * s, P.muted, 800);
  rows.forEach(([p, label, action], i) => {
    const y = (70 + i * 30) * s, hot = Math.floor(t / 6) % rows.length === i && !sg.still;
    rr(c, 10 * s, y, 300 * s, 25 * s, 6 * s, hot ? P.blueSoft : P.panel);
    rr(c, 16 * s, y + 5 * s, 26 * s, 15 * s, 7 * s, p === 'P1' ? P.orange : P.blue); txt(c, p, 29 * s, y + 12.5 * s, 9.5 * s, '#fff', 800, SANS, 'center');
    txt(c, label, 50 * s, y + 12.5 * s, 10.5 * s, P.text, 600);
    txt(c, action ? 'Approval needed' : 'Review', 304 * s, y + 12.5 * s, 9 * s, action ? P.orange : P.muted, 700, SANS, 'right');
  });
  // right: the approval queue (the two verified checkpoints)
  txt(c, 'Approvals', 324 * s, 60 * s, 12 * s, P.muted, 800);
  LANES.forEach((ln, i) => {
    const l = sg.approvals[ln.key], y = (70 + i * 60) * s;
    rr(c, 320 * s, y, 182 * s, 52 * s, 8 * s, P.panel, laneColor(P, l), 2 * s);
    txt(c, ln.title, 330 * s, y + 15 * s, 11 * s, P.text, 800);
    c.beginPath(); c.arc(334 * s, y + 36 * s, 5 * s, 0, Math.PI * 2); c.fillStyle = laneColor(P, l); c.fill();
    txt(c, laneWord(l), 344 * s, y + 36 * s, 11 * s, l.state === 'idle' ? P.muted : laneColor(P, l), 800);
  });
  txt(c, 'Only protected actions need a person’s approval', 14 * s, H - 14 * s, 10 * s, P.muted, 700);
}
/* ── Your team: analyst triage monitor ── */
function drawSocMain(c: Ctx, P: Pal, W: number, H: number, t: number, sg: ChunkSignal) {
  const s = W / 512;
  rr(c, 0, 0, W, H, 0, P.bg); header(c, P, W, 'Triage · findings', s);
  const sel = sg.still ? 0 : Math.floor(t / 6) % 4;
  ['Exposed SSH · db-02', 'OpenSSL · web-01', 'Weak TLS · api-gw', 'Open port · dev-03'].forEach((r, i) => {
    const y = (58 + i * 38) * s;
    rr(c, 14 * s, y, W - 28 * s, 30 * s, 7 * s, i === sel ? P.blueSoft : P.panel, i === sel ? P.blue : undefined, 2 * s);
    txt(c, r, 28 * s, y + 15 * s, 16 * s, P.text, 600); txt(c, i < 2 ? 'P1' : i < 3 ? 'P2' : 'P3', W - 28 * s, y + 15 * s, 15 * s, i < 2 ? P.orange : P.blue, 800, SANS, 'right');
  });
  // a review request arrives: the triage screen points to the approval console
  const pend = LANES.find((ln) => sg.approvals[ln.key].state === 'pending');
  if (pend) { c.globalAlpha = sg.still ? 1 : 0.65 + 0.35 * Math.sin(t * 5); rr(c, 14 * s, H - 44 * s, W - 28 * s, 32 * s, 8 * s, P.orangeSoft, P.orange, 2 * s); txt(c, `Review requested · ${pend.title} → approval console`, 26 * s, H - 28 * s, 13 * s, P.orange, 800); c.globalAlpha = 1; }
  else foot(c, P, W, H, s);
}
/* ── Your team: the approval console — Pending / Approved / Rejected per checkpoint ── */
function drawApprovalConsole(c: Ctx, P: Pal, W: number, H: number, t: number, sg: ChunkSignal) {
  const s = W / 512;
  rr(c, 0, 0, W, H, 0, P.bg); header(c, P, W, 'Approval console', s);
  LANES.forEach((ln, i) => {
    const l = sg.approvals[ln.key], y = (54 + i * (H / s - 70) / 2) * s, h = ((H / s - 70) / 2 - 8) * s;
    const col = laneColor(P, l);
    rr(c, 12 * s, y, W - 24 * s, h, 10 * s, P.panel, col, 2.5 * s);
    txt(c, ln.title, 26 * s, y + 20 * s, 17 * s, P.text, 800);
    const pulse = l.state === 'pending' && !sg.still ? 0.55 + 0.45 * Math.sin(t * 5) : 1;
    c.globalAlpha = pulse; rr(c, W - 132 * s, y + 8 * s, 112 * s, 24 * s, 12 * s, l.state === 'idle' ? P.line : col); c.globalAlpha = 1;
    txt(c, laneWord(l), W - 76 * s, y + 20 * s, 13 * s, '#fff', 800, SANS, 'center');
    const line = l.state === 'approved' ? ln.done : l.state === 'rejected' ? ln.undone : l.state === 'pending' ? `Wants to: ${ln.action}` : 'Waiting for a request';
    txt(c, line, 26 * s, y + h - 18 * s, 14 * s, l.state === 'idle' ? P.muted : l.state === 'rejected' ? P.muted : P.text, 700);
  });
}

const PAINT: Record<CityScreenId, (c: Ctx, P: Pal, W: number, H: number, t: number, sg: ChunkSignal) => void> = {
  schedule: drawSchedule, registry: drawRegistry, portscan: drawPortscan, assetInventory: drawAssetInventory, assetSteps: drawAssetSteps, topoInspect: drawTopoInspect, complianceAudit: drawComplianceAudit, agentStatus: drawAgentStatus, providerPanel: drawProviderPanel, aiGateway: drawAiGateway, repoConsole: drawRepoConsole, prStatus: drawPrStatus, fpResults: drawFpResults, fpControl: drawFpControl, ingest: drawIngest, reports: drawReports, askApproval: drawAskApproval, prReview: drawPrReview,
  teamDashboard: drawTeamDashboard, socMain: drawSocMain, approvalConsole: drawApprovalConsole,
};

export function createCityScreens(slots: Slot[], renderer: WebGLRenderer) {
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const items = slots.map((slot) => {
    const W = 512, H = Math.round((W * slot.h * 0.94) / (slot.w * 0.95));
    const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    const tex = new CanvasTexture(canvas); tex.colorSpace = SRGBColorSpace; tex.anisotropy = aniso;
    const geo = new PlaneGeometry(slot.w * 0.95, slot.h * 0.94);
    const mat = new MeshBasicMaterial({ map: tex, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const mesh = new Mesh(geo, mat); mesh.position.set(...slot.center); mesh.rotation.y = slot.rotY ?? 0; mesh.rotation.x = slot.tilt ?? 0; mesh.name = `screen:${slot.id}`;
    mesh.userData.dynamic = true; slot.group.add(mesh);
    return { slot, W, H, ctx, tex, geo, mat, mesh, key: '' };
  });
  let last = -1, lastDark: boolean | null = null;
  return {
    update(clock: number, reduced: boolean, dark: boolean, sg: ChunkSignal) {
      // throttle live repaints to 30/s — but a frozen clock (paused) or a theme switch must still repaint
      if (!reduced && !sg.still && dark === lastDark && clock - last < 1 / 30 && clock >= last) return;
      last = clock; lastDark = dark;
      const P = dark ? DARK : LIGHT;
      for (const it of items) {
        // static states are painted once; animated ones every call
        const key = reduced || sg.still ? `still/${dark}/${sg.phase}/${sg.decision}/${sg.approvals.assistant.state}/${sg.approvals.code.state}` : '';
        if (key && key === it.key) continue;
        it.key = key;
        PAINT[it.slot.id](it.ctx, P, it.W, it.H, clock, sg);
        it.tex.needsUpdate = true;
      }
    },
    dispose() { for (const it of items) { it.slot.group.remove(it.mesh); it.geo.dispose(); it.mat.dispose(); it.tex.dispose(); } },
  };
}
