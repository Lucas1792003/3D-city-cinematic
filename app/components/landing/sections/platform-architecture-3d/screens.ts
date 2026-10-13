import { CanvasTexture, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace, type Group, type WebGLRenderer } from 'three';
import type { ScreenId } from './geometry';
import { CODE_FINDING_AT, CODE_LOOP } from './sourcesMotion';
import { PROC, PROC_CYCLE } from './processingMotion';

/**
 * Live content for the five Outputs monitors.
 *
 * Each screen is a thin plane in the monitor's own local space, just in front of its glass, so it
 * follows the camera and keeps perspective. Its texture is one reused canvas, repainted at most
 * 30 times a second and only while the section is visible. All sample content is illustrative UI,
 * not data from a real environment.
 */

type Slot = { id: ScreenId; center: [number, number, number]; w: number; h: number; group: Group };
type Pal = Record<'bg' | 'panel' | 'line' | 'text' | 'muted' | 'blue' | 'blueSoft' | 'orange' | 'orangeSoft' | 'green' | 'greenSoft', string>;

const DARK: Pal = { bg: '#0b1826', panel: '#14283a', line: '#2a4157', text: '#e9f1f8', muted: '#8ea4b7', blue: '#039be0', blueSoft: '#123a52', orange: '#fe904d', orangeSoft: '#3b2a20', green: '#4fbf8b', greenSoft: '#173a2d' };
const LIGHT: Pal = { bg: '#ffffff', panel: '#eef4f9', line: '#d3e0ec', text: '#0f1f2f', muted: '#566b80', blue: '#0278ae', blueSoft: '#dcf0fb', orange: '#fe701a', orangeSoft: '#fff1e6', green: '#2f9e6b', greenSoft: '#e3f5ec' };
const SANS = 'Inter, "Segoe UI", system-ui, sans-serif';
const MONO = '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace';

/** Each monitor has its own loop length (so they never restart together) and an activation stagger. */
const LOOP: Record<ScreenId, number> = { insights: 11, compliance: 10, topology: 13.5, assistant: 13, code: 12, srcCode: CODE_LOOP, agentScr: 6, engIn: PROC_CYCLE, engOut: PROC_CYCLE };
const STAGGER: Record<ScreenId, number> = { insights: 0, compliance: 0.35, topology: 0.7, assistant: 1.05, code: 1.4, srcCode: 0, agentScr: 0, engIn: 0, engOut: 0 };
/** A representative finished frame for reduced motion. */
const STILL: Record<ScreenId, number> = { insights: 9, compliance: 8, topology: 4.5, assistant: 10, code: 10, srcCode: 9, agentScr: 1, engIn: 6.2, engOut: 9.5 };
/** Screens in Data Sources run from the start (they are where data originates). */
const ALWAYS = new Set<ScreenId>(['srcCode', 'agentScr', 'engIn', 'engOut']);

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (t: number) => { const x = clamp(t); return x * x * (3 - 2 * x); };
const win = (t: number, a: number, b: number) => ease((t - a) / (b - a));
const typed = (s: string, t: number, start: number, cps: number) => s.slice(0, Math.max(0, Math.floor((t - start) * cps)));

type Ctx = CanvasRenderingContext2D;
function rr(c: Ctx, x: number, y: number, w: number, h: number, r: number, fill?: string, stroke?: string, lw = 2) {
  c.beginPath(); c.roundRect(x, y, Math.max(0, w), h, r);
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.stroke(); }
}
function txt(c: Ctx, s: string, x: number, y: number, size: number, color: string, weight = 600, font = SANS, align: CanvasTextAlign = 'left') {
  c.font = `${weight} ${size}px ${font}`; c.fillStyle = color; c.textAlign = align; c.textBaseline = 'middle'; c.fillText(s, x, y);
}
function wrap(c: Ctx, s: string, maxW: number, size: number, weight = 600, font = SANS) {
  c.font = `${weight} ${size}px ${font}`;
  const out: string[] = [];
  for (const word of s.split(' ')) {
    const last = out[out.length - 1];
    if (last !== undefined && c.measureText(`${last} ${word}`).width <= maxW) out[out.length - 1] = `${last} ${word}`;
    else out.push(word);
  }
  return out;
}
function header(c: Ctx, P: Pal, W: number, title: string, scale: number, scan?: number) {
  rr(c, 0, 0, W, 44 * scale, 0, P.panel);
  for (let i = 0; i < 3; i++) { c.beginPath(); c.arc((18 + i * 16) * scale, 22 * scale, 5 * scale, 0, Math.PI * 2); c.fillStyle = i === 0 ? P.orange : P.line; c.fill(); }
  txt(c, title, 72 * scale, 22 * scale, 18 * scale, P.text, 700);
  if (scan !== undefined) rr(c, scan * (W - 90 * scale), 41 * scale, 90 * scale, 3 * scale, 1.5 * scale, P.blue); // subtle scanning indicator
}
function check(c: Ctx, x: number, y: number, r: number, color: string) {
  c.strokeStyle = color; c.lineWidth = r * 0.28; c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(x - r * 0.42, y + r * 0.02); c.lineTo(x - r * 0.1, y + r * 0.34); c.lineTo(x + r * 0.45, y - r * 0.3); c.stroke();
}
function standby(c: Ctx, P: Pal, W: number, H: number, title: string, s: number) {
  rr(c, 0, 0, W, H, 0, P.bg); header(c, P, W, title, s);
  c.beginPath(); c.arc(W / 2, H / 2 + 14 * s, 9 * s, 0, Math.PI * 2); c.fillStyle = P.line; c.fill();
  txt(c, 'Standby', W / 2, H / 2 + 44 * s, 15 * s, P.muted, 600, SANS, 'center');
}

/* ─────────────── 1. CyfroAI Insights (main monitor) ─────────────── */
const INSIGHTS = [
  { rows: [['P1', 'Exposed SSH service on db-02', 0.92], ['P1', 'Exploitable OpenSSL on web-01', 0.84], ['P2', 'Secret committed in config repo', 0.61], ['P3', 'Unused open port on dev-03', 0.32]] as const,
    why: 'db-02 is internet-facing and its vulnerability is exploitable, so it is prioritized first.' },
  { rows: [['P1', 'Weak TLS on api-gateway', 0.88], ['P2', 'Unpatched kernel on node-4', 0.66], ['P2', 'Public storage bucket policy', 0.58], ['P3', 'Default password on cam-2', 0.29]] as const,
    why: 'api-gateway carries customer traffic, so weak TLS raises its exposure. It is next in the queue.' },
];
function drawInsights(c: Ctx, P: Pal, W: number, H: number, t: number) {
  // The monitor's own status lights sit on its right edge, so content keeps a right gutter (R)
  const R = 120 * (W / 1024);
  const s = W / 1024, n = Math.floor(t / LOOP.insights), lt = t % LOOP.insights, ex = INSIGHTS[n % INSIGHTS.length];
  rr(c, 0, 0, W, H, 0, P.bg);
  header(c, P, W, 'CyfroAI Insights · Prioritized findings', s * 1.35, (t * 0.32) % 1);
  ex.rows.forEach(([prio, label, score], i) => {
    const y = (78 + i * 56) * s, a = win(lt, 0.4 + i * 0.2, 0.7 + i * 0.2);
    if (a <= 0) return;
    c.globalAlpha = a;
    const dy = (1 - a) * 12 * s;
    rr(c, 24 * s, y + dy, W - 48 * s - R, 46 * s, 12 * s, P.panel);
    const pa = win(lt, 2.0 + i * 0.15, 2.3 + i * 0.15), risk = prio === 'P1';
    if (pa > 0) { c.globalAlpha = a * pa; rr(c, 38 * s, y + 8 * s + dy, 64 * s, 30 * s, 15 * s, risk ? P.orange : P.blue); txt(c, prio, 70 * s, y + 23 * s + dy, 18 * s, '#fff', 800, SANS, 'center'); c.globalAlpha = a; }
    txt(c, label, 120 * s, y + 23 * s + dy, 22 * s, P.text, 600);
    const bx = 560 * s, bw = 300 * s, g = win(lt, 1.2 + i * 0.12, 2.1 + i * 0.12);
    rr(c, bx, y + 17 * s + dy, bw, 12 * s, 6 * s, P.line);
    rr(c, bx, y + 17 * s + dy, bw * score * g, 12 * s, 6 * s, risk ? P.orange : P.blue);
  });
  c.globalAlpha = 1;
  const ya = 312 * s, ea = win(lt, 2.6, 2.9);
  if (ea > 0) {
    c.globalAlpha = ea;
    rr(c, 24 * s, ya, W - 48 * s - R, 128 * s, 14 * s, P.blueSoft);
    txt(c, 'AI explanation', 44 * s, ya + 26 * s, 17 * s, P.blue, 800);
    const shown = typed(ex.why, lt, 2.9, 34);
    wrap(c, shown, W - 100 * s - R, 22 * s).forEach((line, k) => txt(c, line, 44 * s, ya + 64 * s + k * 32 * s, 22 * s, P.text, 600));
    c.globalAlpha = 1;
  }
}

/* ─────────────── 2. CyfroCompliance (upper-left) ─────────────── */
const COMPLIANCE = [
  { rows: [['Encryption at rest', 1], ['Access logging enabled', 1], ['Password policy', 0], ['Backup retention', 1]] as const, summary: ['3 passed', '1 needs attention'] },
  { rows: [['MFA enforced for admins', 0], ['Patch cadence', 1], ['Data retention rules', 1], ['Firewall rule review', 0]] as const, summary: ['2 passed', '2 need attention'] },
];
function drawCompliance(c: Ctx, P: Pal, W: number, H: number, t: number) {
  const s = W / 512, n = Math.floor(t / LOOP.compliance), lt = t % LOOP.compliance, ex = COMPLIANCE[n % COMPLIANCE.length];
  rr(c, 0, 0, W, H, 0, P.bg); header(c, P, W, 'Compliance check', s);
  const prog = win(lt, 0.4, 4.6);
  rr(c, 20 * s, 58 * s, W - 40 * s, 8 * s, 4 * s, P.line); rr(c, 20 * s, 58 * s, (W - 40 * s) * prog, 8 * s, 4 * s, P.blue);
  ex.rows.forEach(([label, pass], i) => {
    const y = (96 + i * 46) * s, done = win(lt, 1.2 + i * 0.9, 1.45 + i * 0.9), cx = 38 * s, r = 13 * s;
    rr(c, 14 * s, y - 19 * s, W - 28 * s, 38 * s, 10 * s, P.panel);
    c.beginPath(); c.arc(cx, y, r, 0, Math.PI * 2); c.strokeStyle = P.line; c.lineWidth = 3 * s; c.stroke(); // pending
    if (done > 0) {
      c.globalAlpha = done;
      c.beginPath(); c.arc(cx, y, r * (0.7 + 0.3 * done), 0, Math.PI * 2); c.fillStyle = pass ? P.green : P.orange; c.fill();
      if (pass) check(c, cx, y, r, '#fff'); else txt(c, '!', cx, y + 1 * s, 18 * s, '#fff', 900, SANS, 'center');
      c.globalAlpha = 1;
    }
    txt(c, label, 62 * s, y, 18 * s, P.text, 600);
    const state = done > 0.5 ? (pass ? 'Passed' : 'Attention') : 'Pending';
    txt(c, state, W - 26 * s, y, 15 * s, done > 0.5 ? (pass ? P.green : P.orange) : P.muted, 700, SANS, 'right');
  });
  const sa = win(lt, 4.9, 5.3);
  if (sa > 0) {
    c.globalAlpha = sa;
    txt(c, ex.summary[0], 20 * s, H - 26 * s, 17 * s, P.green, 800);
    c.font = `800 ${17 * s}px ${SANS}`; const w0 = c.measureText(`${ex.summary[0]}  ·  `).width;
    txt(c, '·', 20 * s + c.measureText(`${ex.summary[0]} `).width, H - 26 * s, 17 * s, P.muted, 800);
    txt(c, ex.summary[1], 20 * s + w0, H - 26 * s, 17 * s, P.orange, 800);
    c.globalAlpha = 1;
  }
}

/* ─────────────── 3. Dashboards, CyfroTopology diagram & Reports (upper-right) ─────────────── */
const NODES: [number, number][] = [[-0.55, -0.25], [0, -0.45], [0.55, -0.2], [-0.25, 0.4], [0.35, 0.38]];
const EDGES: [number, number][] = [[0, 1], [1, 2], [0, 3], [1, 4], [3, 4], [2, 4]];
function drawTopology(c: Ctx, P: Pal, W: number, H: number, t: number) {
  const s = W / 512, lt = t % LOOP.topology;
  rr(c, 0, 0, W, H, 0, P.bg); header(c, P, W, 'CyfroTopology', s);
  // Tabs show the three views this monitor cycles through
  const view = lt < 6.6 ? 0 : lt < 10.2 ? 1 : 2;
  ['Topology', 'Dashboard', 'Report'].forEach((tab, i) => {
    const x = (20 + i * 110) * s;
    rr(c, x, 54 * s, 100 * s, 28 * s, 14 * s, i === view ? P.blue : P.panel);
    txt(c, tab, x + 50 * s, 68 * s, 14 * s, i === view ? '#fff' : P.muted, 700, SANS, 'center');
  });
  const area = { x: 20 * s, y: 94 * s, w: W - 40 * s, h: H - 112 * s };
  const fade = (a: number, b: number) => Math.min(win(lt, a, a + 0.5), 1 - win(lt, b - 0.5, b));
  // Topology: nodes appear, links draw, packets travel, a node is selected, the graph tilts and returns
  const ta = fade(0, 6.6);
  if (ta > 0) {
    c.save(); c.globalAlpha = ta;
    const cx = area.x + area.w / 2, cy = area.y + area.h / 2;
    const tilt = Math.sin(Math.PI * win(lt, 3.6, 5.4)) * (10 * Math.PI) / 180;
    const pt = (i: number): [number, number] => {
      const [nx, ny] = NODES[i]; const x = nx * area.w * 0.42, y = ny * area.h * 0.62;
      return [cx + x * Math.cos(tilt) - y * Math.sin(tilt), cy + (x * Math.sin(tilt) + y * Math.cos(tilt)) * (1 - 0.18 * Math.abs(Math.sin(tilt)) * 5)];
    };
    EDGES.forEach(([a, b], k) => {
      const d = win(lt, 1.0 + k * 0.12, 1.7 + k * 0.12); if (d <= 0) return;
      const [x1, y1] = pt(a), [x2, y2] = pt(b);
      c.strokeStyle = P.line; c.lineWidth = 4 * s; c.lineCap = 'round';
      c.beginPath(); c.moveTo(x1, y1); c.lineTo(x1 + (x2 - x1) * d, y1 + (y2 - y1) * d); c.stroke();
      if (lt > 1.9) { // a small directional packet on each link
        const u = ((lt - 1.9) * 0.55 + k * 0.17) % 1;
        c.beginPath(); c.arc(x1 + (x2 - x1) * u, y1 + (y2 - y1) * u, 4.5 * s, 0, Math.PI * 2); c.fillStyle = P.blue; c.fill();
      }
    });
    NODES.forEach((_, i) => {
      const a = win(lt, 0.3 + i * 0.15, 0.55 + i * 0.15); if (a <= 0) return;
      const [x, y] = pt(i), r = (i === 1 ? 17 : 13) * s * a;
      c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = P.panel; c.fill(); c.strokeStyle = i === 2 ? P.orange : P.blue; c.lineWidth = 4 * s; c.stroke();
      c.beginPath(); c.arc(x, y, r * 0.4, 0, Math.PI * 2); c.fillStyle = i === 2 ? P.orange : P.blue; c.fill();
    });
    const sel = win(lt, 3.0, 3.3);
    if (sel > 0) { const [x, y] = pt(2); c.globalAlpha = ta * sel; c.beginPath(); c.arc(x, y, 26 * s, 0, Math.PI * 2); c.strokeStyle = P.orange; c.lineWidth = 3 * s; c.setLineDash([6 * s, 5 * s]); c.stroke(); c.setLineDash([]); rr(c, x - 64 * s, y + 30 * s, 128 * s, 26 * s, 13 * s, P.orangeSoft); txt(c, 'web-01 · 2 findings', x, y + 43 * s, 13 * s, P.orange, 800, SANS, 'center'); }
    c.restore();
  }
  // Dashboard: a line chart draws left to right, bars grow upward
  const da = fade(6.6, 10.2);
  if (da > 0) {
    c.save(); c.globalAlpha = da;
    const lx = area.x, ly = area.y + 6 * s, lw = area.w * 0.55, lh = area.h - 20 * s;
    rr(c, lx, ly, lw, lh, 10 * s, P.panel);
    const pts = [0.3, 0.55, 0.42, 0.7, 0.6, 0.82, 0.74], d = win(lt, 7.0, 8.0);
    c.strokeStyle = P.blue; c.lineWidth = 4 * s; c.lineJoin = 'round'; c.beginPath();
    const steps = (pts.length - 1) * d;
    for (let i = 0; i <= Math.ceil(steps); i++) {
      const k = Math.min(i, steps), i0 = Math.floor(k), f = k - i0, v = pts[i0] + ((pts[Math.min(i0 + 1, pts.length - 1)] - pts[i0]) * f);
      const x = lx + 16 * s + (k / (pts.length - 1)) * (lw - 32 * s), y = ly + lh - 14 * s - v * (lh - 34 * s);
      if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
    }
    c.stroke();
    const bx = lx + lw + 14 * s, bw = area.w - lw - 14 * s;
    rr(c, bx, ly, bw, lh, 10 * s, P.panel);
    [0.45, 0.8, 0.6, 0.35].forEach((v, i) => {
      const g = win(lt, 7.6 + i * 0.12, 8.6 + i * 0.12), h = (lh - 30 * s) * v * g, w = (bw - 50 * s) / 4;
      rr(c, bx + 14 * s + i * (w + 7 * s), ly + lh - 12 * s - h, w, h, 4 * s, i === 1 ? P.orange : P.blue);
    });
    c.restore();
  }
  // Report: a compact summary
  const ra = fade(10.2, 13.5);
  if (ra > 0) {
    c.save(); c.globalAlpha = ra;
    rr(c, area.x, area.y + 6 * s, area.w, area.h - 14 * s, 12 * s, P.panel);
    txt(c, 'Posture report', area.x + 18 * s, area.y + 32 * s, 18 * s, P.text, 800);
    [['Assets scanned', '128', P.text], ['Findings', '14', P.text], ['Prioritized P1', '3', P.orange]].forEach(([k, v, col], i) => {
      const y = area.y + (68 + i * 34) * s, a = win(lt, 10.6 + i * 0.25, 10.9 + i * 0.25);
      c.globalAlpha = ra * a; txt(c, k, area.x + 18 * s, y, 16 * s, P.muted, 600); txt(c, v, area.x + area.w - 18 * s, y, 18 * s, col, 800, SANS, 'right');
    });
    c.restore();
  }
}

/* ─────────────── 4. CyfroAssistant (bottom-left) ─────────────── */
const CHATS = [
  ['Which risks need attention?', 'Prioritize exposed assets with exploitable vulnerabilities.'],
  ['Why is db-02 a P1?', 'It is internet-facing and its vulnerability is exploitable.'],
];
function drawAssistant(c: Ctx, P: Pal, W: number, H: number, t: number) {
  const s = W / 512, n = Math.floor(t / LOOP.assistant), lt = t % LOOP.assistant, [q, a] = CHATS[n % CHATS.length];
  const out = 1 - win(lt, 12.6, 13);
  rr(c, 0, 0, W, H, 0, P.bg); header(c, P, W, 'CyfroAssistant', s);
  c.globalAlpha = out;
  const ua = win(lt, 0.3, 0.5);
  if (ua > 0) {
    c.globalAlpha = out * ua;
    const lines = wrap(c, q, 300 * s, 19 * s); const bw = Math.max(...lines.map((l) => c.measureText(l).width)) + 32 * s, bh = lines.length * 26 * s + 22 * s;
    rr(c, W - 20 * s - bw, 62 * s, bw, bh, 16 * s, P.blue);
    lines.forEach((l, k) => txt(c, l, W - 4 * s - bw, 62 * s + 24 * s + k * 26 * s, 19 * s, '#fff', 600));
  }
  const ay = 132 * s;
  if (lt > 0.9 && lt < 2.0) { // typing dots
    c.globalAlpha = out;
    rr(c, 20 * s, ay, 86 * s, 40 * s, 20 * s, P.panel);
    for (let i = 0; i < 3; i++) { const b = 0.5 + 0.5 * Math.sin(lt * 8 - i * 0.9); c.beginPath(); c.arc((44 + i * 19) * s, ay + 20 * s, 5 * s, 0, Math.PI * 2); c.fillStyle = b > 0.5 ? P.blue : P.line; c.fill(); }
  }
  if (lt >= 2.0) {
    c.globalAlpha = out * win(lt, 2.0, 2.2);
    const all = wrap(c, a, 380 * s, 20 * s), shown = typed(a, lt, 2.0, 30);
    let left = shown.length; const lines = all.map((l) => { const part = l.slice(0, Math.max(0, left)); left -= l.length + 1; return part; });
    const bh = all.length * 28 * s + 24 * s;
    rr(c, 20 * s, ay, 420 * s, bh, 16 * s, P.panel);
    lines.forEach((l, k) => txt(c, l, 38 * s, ay + 26 * s + k * 28 * s, 20 * s, P.text, 600));
    const done = win(lt, 2.0 + a.length / 30 + 0.3, 2.0 + a.length / 30 + 0.6);
    if (done > 0) { c.globalAlpha = out * done; c.beginPath(); c.arc(36 * s, ay + bh + 24 * s, 11 * s, 0, Math.PI * 2); c.fillStyle = P.blue; c.fill(); check(c, 36 * s, ay + bh + 24 * s, 11 * s, '#fff'); txt(c, 'Answered', 54 * s, ay + bh + 24 * s, 15 * s, P.muted, 700); }
  }
  c.globalAlpha = 1;
}

/* ─────────────── 5. CyfroCode (bottom-right) ─────────────── */
const CODE = [
  { file: 'api/users.js', lines: ['const q = `SELECT * FROM users', '  WHERE id = ${req.query.id}`;', 'db.run(q);'], bad: 1,
    finding: 'SQL injection · user input in query', patch: [['-', '  WHERE id = ${req.query.id}`;'], ['+', '  WHERE id = ?`;'], ['+', 'db.run(q, [req.query.id]);']] },
  { file: 'api/files.js', lines: ['const name = req.query.name;', 'res.sendFile(`/data/${name}`);'], bad: 1,
    finding: 'Path traversal · unvalidated file name', patch: [['-', 'res.sendFile(`/data/${name}`);'], ['+', 'const safe = path.basename(name);'], ['+', 'res.sendFile(path.join(DATA, safe));']] },
];
const KEYWORDS = /\b(const|SELECT|FROM|WHERE|return)\b/;
function codeLine(c: Ctx, P: Pal, s: string, x: number, y: number, size: number) {
  c.font = `500 ${size}px ${MONO}`; c.textBaseline = 'middle'; c.textAlign = 'left';
  let cx = x;
  for (const part of s.split(/(\s+)/)) { c.fillStyle = KEYWORDS.test(part) ? P.blue : part.includes('`') || part.includes('${') ? P.green : P.text; c.fillText(part, cx, y); cx += c.measureText(part).width; }
}
function drawCode(c: Ctx, P: Pal, W: number, H: number, t: number) {
  const s = W / 512, n = Math.floor(t / LOOP.code), lt = t % LOOP.code, ex = CODE[n % CODE.length];
  const out = 1 - win(lt, 11.6, 12);
  rr(c, 0, 0, W, H, 0, P.bg); header(c, P, W, `CyfroCode · ${ex.file}`, s);
  c.globalAlpha = out;
  // 1. code types in (≈45 chars/s)
  const cps = 45; let start = 0.3;
  const fs = 16 * s, lh = 25 * s, top = 70 * s;
  const typedEnd = ex.lines.reduce((acc, l) => acc + l.length / cps, 0.3);
  const hl = win(lt, typedEnd + 0.3, typedEnd + 0.6);
  ex.lines.forEach((l, i) => {
    const y = top + i * lh;
    if (i === ex.bad && hl > 0) { c.globalAlpha = out * hl; rr(c, 10 * s, y - 12 * s, W - 20 * s, 24 * s, 5 * s, P.orangeSoft); rr(c, 10 * s, y - 12 * s, 4 * s, 24 * s, 2 * s, P.orange); c.globalAlpha = out; }
    txt(c, String(i + 1), 26 * s, y, 13 * s, P.muted, 500, MONO, 'right');
    codeLine(c, P, typed(l, lt, start, cps), 38 * s, y, fs);
    start += l.length / cps;
  });
  // 2. explanation panel
  const ey = top + ex.lines.length * lh + 8 * s, ea = win(lt, typedEnd + 0.7, typedEnd + 1.1);
  if (ea > 0) { c.globalAlpha = out * ea; rr(c, 10 * s, ey, W - 20 * s, 34 * s, 9 * s, P.orangeSoft, P.orange, 2 * s); txt(c, ex.finding, 24 * s, ey + 17 * s, 15 * s, P.orange, 800); }
  // 3. suggested patch preview, line by line — the original code is not replaced
  const py = ey + 46 * s;
  if (lt > typedEnd + 1.3) { c.globalAlpha = out * win(lt, typedEnd + 1.3, typedEnd + 1.5); txt(c, 'Suggested patch', 12 * s, py, 13 * s, P.muted, 800); }
  ex.patch.forEach(([sign, l], i) => {
    const a = win(lt, typedEnd + 1.5 + i * 0.25, typedEnd + 1.8 + i * 0.25); if (a <= 0) return;
    c.globalAlpha = out * a; const y = py + (20 + i * 22) * s;
    rr(c, 10 * s, y - 10 * s, W - 20 * s, 20 * s, 4 * s, sign === '-' ? P.orangeSoft : P.blueSoft);
    txt(c, sign, 20 * s, y, 14 * s, sign === '-' ? P.orange : P.blue, 800, MONO);
    c.font = `500 ${13.5 * s}px ${MONO}`; c.fillStyle = P.text; c.fillText(l, 36 * s, y);
  });
  // 4. approval gate
  const ga = win(lt, typedEnd + 2.5, typedEnd + 2.8);
  if (ga > 0) { c.globalAlpha = out * ga; const y = H - 30 * s; rr(c, 10 * s, y - 15 * s, 210 * s, 30 * s, 15 * s, undefined, P.blue, 2.5 * s); c.beginPath(); c.arc(30 * s, y, 6 * s, 0, Math.PI * 2); c.fillStyle = P.orange; c.fill(); txt(c, 'Awaiting approval', 44 * s, y, 15 * s, P.blue, 800); }
  c.globalAlpha = 1;
}

/* ─────────────── Data Sources: CyfroCode developer workstation ─────────────── */
const SRC = [
  { file: 'auth/token.js', lines: ["import jwt from 'jsonwebtoken';", "const SECRET = 'DEMO_ONLY_NOT_A_SECRET';", 'export const sign = (user) =>', '  jwt.sign(user, SECRET);'], bad: 1,
    finding: 'Hardcoded secret in source', fix: ['-', "const SECRET = 'DEMO_ONLY_NOT_A_SECRET';", '+', 'const SECRET = process.env.JWT_SECRET;'] },
  { file: 'tools/ping.js', lines: ["app.get('/ping', (req, res) => {", '  exec(`ping ${req.query.host}`);', '  res.send(200);', '});'], bad: 1,
    finding: 'Command injection · unsanitized input', fix: ['-', '  exec(`ping ${req.query.host}`);', '+', "  execFile('ping', [host]);"] },
];
function drawSourceCode(c: Ctx, P: Pal, W: number, H: number, t: number) {
  const s = W / 512, n = Math.floor(t / LOOP.srcCode), lt = t % LOOP.srcCode, ex = SRC[n % SRC.length];
  const out = 1 - win(lt, LOOP.srcCode - 0.6, LOOP.srcCode); // soft hand-over to the next example
  rr(c, 0, 0, W, H, 0, P.bg); header(c, P, W, `CyfroCode · ${ex.file}`, s);
  // 1. typing (spans 0.3–4.3 s whatever the example length), with a cursor
  const total = ex.lines.reduce((a, l) => a + l.length, 0), cps = total / 4, fs = 16 * s, lh = 26 * s, top = 66 * s;
  const typedChars = Math.max(0, Math.floor((lt - 0.3) * cps));
  const scanning = lt > 0.3 && lt < CODE_FINDING_AT;
  c.globalAlpha = out;
  rr(c, 0, 44 * s, W, 4 * s, 0, P.line);
  if (scanning) rr(c, 0, 44 * s, W * win(lt, 0.3, CODE_FINDING_AT), 4 * s, 0, P.blue); // scan progress
  const hl = win(lt, CODE_FINDING_AT, CODE_FINDING_AT + 0.3);
  let left = typedChars;
  let cursor: [number, number] | null = null;
  ex.lines.forEach((l, i) => {
    const y = top + i * lh, shown = l.slice(0, Math.max(0, left)); left -= l.length;
    if (i === ex.bad && hl > 0) { c.globalAlpha = out * hl; rr(c, 8 * s, y - 12 * s, W - 16 * s, 24 * s, 5 * s, P.orangeSoft); rr(c, 8 * s, y - 12 * s, 4 * s, 24 * s, 2 * s, P.orange); c.globalAlpha = out; }
    txt(c, String(i + 1), 26 * s, y, 13 * s, P.muted, 500, MONO, 'right');
    codeLine(c, P, shown, 38 * s, y, fs);
    if (shown.length < l.length && !cursor) { c.font = `500 ${fs}px ${MONO}`; cursor = [38 * s + c.measureText(shown).width, y]; }
    if (i === ex.bad && hl > 0) { // security indicator beside the line
      c.globalAlpha = out * hl; c.beginPath(); c.arc(W - 22 * s, y, 9 * s, 0, Math.PI * 2); c.fillStyle = P.orange; c.fill();
      txt(c, '!', W - 22 * s, y + 1 * s, 13 * s, '#fff', 900, SANS, 'center'); c.globalAlpha = out;
    }
  });
  if (!cursor && lt < CODE_FINDING_AT) { const last = ex.lines.length - 1; c.font = `500 ${fs}px ${MONO}`; cursor = [38 * s + c.measureText(ex.lines[last]).width, top + last * lh]; }
  const cur = cursor as [number, number] | null;
  if (cur && (lt < 4.3 || Math.floor(lt * 2.4) % 2 === 0)) rr(c, cur[0] + 1 * s, cur[1] - 9 * s, 2.5 * s, 18 * s, 1, P.blue); // blinks when typing pauses
  // 2. explanation panel
  const ey = top + ex.lines.length * lh + 2 * s, ea = win(lt, CODE_FINDING_AT + 0.4, CODE_FINDING_AT + 0.8);
  if (ea > 0) { c.globalAlpha = out * ea; rr(c, 8 * s, ey, W - 16 * s, 30 * s, 8 * s, P.orangeSoft, P.orange, 2 * s); txt(c, ex.finding, 20 * s, ey + 15 * s, 14 * s, P.orange, 800); }
  // 3. remediation preview: guidance only, the code above is not changed
  const py = ey + 42 * s;
  [[ex.fix[0], ex.fix[1]], [ex.fix[2], ex.fix[3]]].forEach(([sign, l], i) => {
    const a = win(lt, CODE_FINDING_AT + 1.0 + i * 0.3, CODE_FINDING_AT + 1.3 + i * 0.3); if (a <= 0) return;
    c.globalAlpha = out * a; const y = py + i * 22 * s;
    rr(c, 8 * s, y - 10 * s, W - 16 * s, 20 * s, 4 * s, sign === '-' ? P.orangeSoft : P.blueSoft);
    txt(c, sign, 18 * s, y, 13 * s, sign === '-' ? P.orange : P.blue, 800, MONO);
    c.font = `500 ${12.5 * s}px ${MONO}`; c.fillStyle = P.text; c.fillText(l, 32 * s, y);
  });
  const ga = win(lt, CODE_FINDING_AT + 1.9, CODE_FINDING_AT + 2.2);
  if (ga > 0) { c.globalAlpha = out * ga; txt(c, 'Suggested fix · not applied', 10 * s, H - 18 * s, 13 * s, P.blue, 800); }
  c.globalAlpha = 1;
}

/* ─────────────── Processing: CyfroAgent panel and the engine's two side monitors ─────────────── */
const pcyc = (t: number) => ((t % PROC_CYCLE) + PROC_CYCLE) % PROC_CYCLE;
/** CyfroAgent front panel. Its three indicator lights sit across the middle, so content uses the top and bottom rows. */
function drawAgent(c: Ctx, P: Pal, W: number, H: number, t: number) {
  const s = W / 512, ac = ((t % 6) + 6) % 6;
  rr(c, 0, 0, W, H, 0, P.bg);
  txt(c, 'CyfroAgent', 16 * s, 30 * s, 26 * s, P.text, 800);
  const collecting = ac < 2;
  rr(c, W - 170 * s, 14 * s, 154 * s, 32 * s, 16 * s, collecting ? P.blue : P.panel);
  txt(c, collecting ? 'Collecting' : 'Monitoring', W - 93 * s, 30 * s, 18 * s, collecting ? '#fff' : P.muted, 700, SANS, 'center');
  for (let i = 0; i < 12; i++) { // activity bars along the bottom
    const v = 0.25 + 0.75 * Math.abs(Math.sin(t * (1.3 + (i % 4) * 0.4) + i));
    const h = (collecting ? v : v * 0.45) * 40 * s;
    rr(c, (16 + i * 40) * s, H - 14 * s - h, 26 * s, h, 4 * s, i % 5 === 2 && collecting ? P.orange : P.blue);
  }
}
/** Left monitor: incoming data from Data Ingestion. */
function drawEngIn(c: Ctx, P: Pal, W: number, H: number, t: number) {
  const s = W / 512, pc = pcyc(t);
  rr(c, 0, 0, W, H, 0, P.bg);
  txt(c, 'Incoming', 20 * s, 38 * s, 38 * s, P.text, 800);
  const arriving = Math.max(...[PROC.agentSend[0][1], PROC.agentSend[1][1], PROC.engineIn].map((a) => Math.max(0, 1 - Math.abs(pc - a) / 0.8)));
  c.beginPath(); c.arc(W - 36 * s, 38 * s, 14 * s, 0, Math.PI * 2); c.fillStyle = arriving > 0.2 ? P.blue : P.line; c.fill(); // intake status
  for (let i = 0; i < 4; i++) {
    const y = (92 + i * 52) * s, base = 0.3 + 0.5 * Math.abs(Math.sin(t * 0.8 + i * 1.3));
    rr(c, 20 * s, y, W - 40 * s, 30 * s, 8 * s, P.panel);
    rr(c, 20 * s, y, (W - 40 * s) * Math.min(1, base + arriving * 0.5), 30 * s, 8 * s, i === 0 && arriving > 0.2 ? P.blue : P.blueSoft);
  }
  const batches = Math.floor((t - PROC.agentSend[0][1]) / 6) + 1;
  txt(c, `Records +${Math.max(0, batches) * 4}`, 20 * s, H - 30 * s, 30 * s, P.muted, 700);
}
/** Right monitor: findings appear, correlate into groups, then are prioritized. */
function drawEngOut(c: Ctx, P: Pal, W: number, H: number, t: number) {
  const s = W / 512, pc = pcyc(t);
  const fade = Math.min(win(pc, PROC.tokens - 0.3, PROC.tokens), 1 - win(pc, PROC_CYCLE - 0.6, PROC_CYCLE));
  rr(c, 0, 0, W, H, 0, P.bg);
  txt(c, 'Findings', 20 * s, 38 * s, 38 * s, P.text, 800);
  c.globalAlpha = fade;
  // six finding tokens: scattered → two correlated groups → a ranked column
  const groupK = win(pc, PROC.group, PROC.group + 0.7), rankK = win(pc, PROC.prioritize, PROC.prioritize + 0.6);
  for (let i = 0; i < 6; i++) {
    const a = win(pc, PROC.tokens + i * 0.12, PROC.tokens + 0.3 + i * 0.12); if (a <= 0) continue;
    const scattered: [number, number] = [70 + hash2(i, 1) * 360, 100 + hash2(i, 2) * 190];
    const g = i < 3 ? 0 : 1, k = i % 3;
    const grouped: [number, number] = [g === 0 ? 120 + k * 46 : 300 + k * 46, 150 + (k === 1 ? 40 : 0)];
    const rank = [0, 3, 1, 4, 2, 5].indexOf(i), ranked: [number, number] = [260 + (rank % 2) * 0, 92 + rank * 38];
    const x = scattered[0] + (grouped[0] - scattered[0]) * groupK + (ranked[0] - grouped[0]) * rankK;
    const y = scattered[1] + (grouped[1] - scattered[1]) * groupK + (ranked[1] - grouped[1]) * rankK;
    const top = rank < 2 && rankK > 0.5;
    c.globalAlpha = fade * a;
    rr(c, (x - 16) * s, (y - 14) * s, (32 + rankK * 160) * s, 28 * s, 8 * s, top ? P.orange : P.blue);
    if (rankK > 0.6) txt(c, `P${rank < 2 ? 1 : rank < 4 ? 2 : 3}`, (x - 6) * s, y * s, 20 * s, '#fff', 800);
  }
  c.globalAlpha = fade * win(pc, PROC.prioritize + 0.6, PROC.prioritize + 1);
  txt(c, 'Prioritized', 20 * s, H - 30 * s, 30 * s, P.muted, 700);
  c.globalAlpha = 1;
}
const hash2 = (a: number, b: number) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };

const PAINT: Record<ScreenId, (c: Ctx, P: Pal, W: number, H: number, t: number) => void> = {
  insights: drawInsights, compliance: drawCompliance, topology: drawTopology, assistant: drawAssistant, code: drawCode, srcCode: drawSourceCode, agentScr: drawAgent, engIn: drawEngIn, engOut: drawEngOut,
};
const TITLE: Record<ScreenId, string> = { insights: 'CyfroAI Insights', compliance: 'Compliance check', topology: 'CyfroTopology', assistant: 'CyfroAssistant', code: 'CyfroCode', srcCode: 'CyfroCode', agentScr: 'CyfroAgent', engIn: 'Incoming', engOut: 'Findings' };

export function createScreens(slots: Slot[], renderer: WebGLRenderer) {
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const items = slots.map((slot) => {
    const W = slot.id === 'insights' ? 1024 : 512, H = Math.round((W * slot.h * 0.94) / (slot.w * 0.95));
    const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    const tex = new CanvasTexture(canvas); tex.colorSpace = SRGBColorSpace; tex.anisotropy = aniso;
    const geo = new PlaneGeometry(slot.w * 0.95, slot.h * 0.94);
    const mat = new MeshBasicMaterial({ map: tex, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const mesh = new Mesh(geo, mat); mesh.position.set(...slot.center); mesh.name = `screen:${slot.id}`; slot.group.add(mesh);
    return { slot, W, H, ctx, tex, geo, mat, mesh, last: '', painted: -1 };
  });
  let activeSince: number | null = null, lastPaint = -1, dark = true;

  /**
   * `clock` is the scene's environment clock (seconds, advances only while visible). Screens stay
   * on standby until the data first reaches Outputs (`activate`), then run on their own staggered
   * loops for good: they never restart when the camera tour loops. Returns true when a texture changed.
   */
  function update(clock: number, activate: boolean, reduced: boolean, isDark: boolean, srcDetail = 1) {
    const themeChanged = isDark !== dark; dark = isDark;
    if (activate && activeSince === null) activeSince = clock;
    if (!reduced && !themeChanged && clock - lastPaint < 1 / 30 && clock >= lastPaint) return false; // ≤30 repaints/s
    lastPaint = clock;
    const P = dark ? DARK : LIGHT;
    let changed = false;
    for (const it of items) {
      const id = it.slot.id;
      // Data Sources' screen repaints less often while the camera is elsewhere
      if (!reduced && !themeChanged && ALWAYS.has(id) && srcDetail < 0.5 && clock - it.painted < 1 / 8 && clock >= it.painted) continue;
      it.painted = clock;
      const t = reduced ? STILL[id] : ALWAYS.has(id) ? clock - STAGGER[id] : activeSince === null ? -1 : clock - activeSince - STAGGER[id];
      const key = t < 0 ? `standby/${dark}` : reduced ? `still/${dark}` : '';
      if (key && key === it.last) continue; // static frames are painted once
      it.last = key;
      if (t < 0) standby(it.ctx, P, it.W, it.H, TITLE[id], it.W / 512 / (id === 'insights' ? 1.5 : 1));
      else PAINT[id](it.ctx, P, it.W, it.H, t);
      it.tex.needsUpdate = true; changed = true;
    }
    return changed;
  }
  return {
    update,
    dispose() { for (const it of items) { it.slot.group.remove(it.mesh); it.geo.dispose(); it.mat.dispose(); it.tex.dispose(); } },
  };
}
