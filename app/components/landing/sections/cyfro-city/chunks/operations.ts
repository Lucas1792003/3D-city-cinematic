import { Euler, Group, MeshStandardMaterial, Quaternion, Vector3 } from 'three';
import { createScreens } from '../../platform-architecture-3d/screens';
import { createCityScreens } from '../screens/cityScreens';
import { chunkBase } from '../kit/chunkBase';
import { ledBank, type BankItem } from '../kit/ledBank';
import { person } from '../kit/people';
import { monitor, desk, cabinetMonitor, approvalBarrier, beacon, deckCable, DECK_TOP, type OrigSlot, type CitySlot } from '../kit/machines';
import type { ChunkBuilder, ChunkCtx } from './types';
import { localLoop, seg, arc } from './process';
import { OUTCOMES, STATUS_COLOR, EVIDENCE, EVIDENCE_COLOR, FEATURED, score, CW, evalAt, complianceK } from './complianceEval';
import { TOPO_NODES, TOPO_EDGES, SELECTED, RISK, PATH_EDGES, LINKED, nodeAt, edgeAt, STAGE, topoK } from './topologyGraph';

/** CyfroAI Insights and the security-operations views. The original output monitors live on here. */

const ease = (x: number) => { const v = Math.min(1, Math.max(0, x)); return v * v * (3 - 2 * v); };
const smooth = (a: number, b: number, t: number) => ease((t - a) / (b - a));
const clock = () => { let prev = -1; return (t: number) => { const dt = prev < 0 || t < prev ? 0 : Math.min(0.1, t - prev); prev = t; return dt; }; };
const mat = (ctx: ChunkCtx, color: string, e = 0) => { const x = new MeshStandardMaterial({ color, roughness: 0.45, emissive: color, emissiveIntensity: e }); ctx.owned.push(x); return x; };

export const buildCyfroAiInsights: ChunkBuilder = (ctx) => {
  const { kit, m } = ctx; const g = new Group();
  chunkBase(kit, g, m);
  // the original Outputs insights wall (geometry.ts: base, 3.9 × 2 display, status lights), standing on the
  // east edge and facing west — toward Data Ingestion, where its input arrives. Facing west also keeps the
  // CyfroAI Engine's original close-up camera angle (from the south) clear of this tall display.
  const wallG = new Group(); wallG.position.set(1.55, 0, 0); wallG.rotation.y = -Math.PI / 2; g.add(wallG);
  kit.box(wallG, 4.5, 0.22, 0.9, 0, 0.35, 0.15, m.edge, 0.055);
  const wall = monitor(kit, wallG, m, 0, 2.65, 0, 3.9, 2);
  const status = ledBank(wallG, [0, 1, 2].map((r) => ({ p: [1.88, 3.1 - r * 0.28, 0.17] as [number, number, number], s: [0.36, 0.12, 0.04] as [number, number, number], color: r === 2 ? '#fe904d' : '#5caa83' })));
  // advisory-commands kiosk: commands are shown for review, never executed by the platform
  kit.box(g, 1.1, 0.95, 0.7, -1.2, 0.7, 1.55, m.panel, 0.07);
  kit.box(g, 0.9, 0.42, 0.04, -1.2, 0.98, 1.91, m.screen, 0.02);
  const cmdMt = mat(ctx, '#fe904d', 0.2); for (let i = 0; i < 3; i++) kit.dyn(kit.box(g, 0.6 - i * 0.12, 0.05, 0.02, -1.28 - i * 0.06, 1.1 - i * 0.1, 1.935, i === 0 ? cmdMt : m.white, 0));
  // analysts' bench facing the wall
  kit.box(g, 0.8, 0.16, 1.7, -0.9, 0.95, -0.6, m.white, 0.06); kit.box(g, 0.6, 0.7, 1.3, -0.95, 0.58, -0.6, m.panel, 0.05);
  // ranked-risk board: up to 15 top-ranked risks (the order comes from Data Ingestion's fixed rules; AI explains them)
  kit.box(g, 1.75, 1.05, 0.12, 0.25, DECK_TOP + 1.05, -2.15, m.edge, 0.03);
  for (const x of [-0.5, 1.0]) kit.box(g, 0.08, 0.55, 0.08, x, DECK_TOP + 0.27, -2.15, m.edge, 0);
  const rankItems = Array.from({ length: 15 }, (_, i) => ({ p: [-0.35 + (i % 5) * 0.3, DECK_TOP + 1.38 - Math.floor(i / 5) * 0.3, -2.08] as [number, number, number], s: [0.24, 0.2, 0.02] as [number, number, number], color: i < 3 ? '#fe904d' : '#039be0' }));
  // evidence cabinet: every explained risk links back to its evidence
  kit.box(g, 0.75, 1.1, 0.6, -2.0, DECK_TOP + 0.55, -1.45, m.panel, 0.05);
  for (let r = 0; r < 3; r++) kit.box(g, 0.62, 0.28, 0.04, -2.0, DECK_TOP + 0.25 + r * 0.33, -1.13, m.white, 0.02);
  const evidence = [0, 1, 2].map((r) => ({ p: [-1.8, DECK_TOP + 0.25 + r * 0.33, -1.1] as [number, number, number], s: [0.1, 0.06, 0.02] as [number, number, number], color: '#33afdf' }));
  // "explained" marks: one per ranked risk, set once the AI explanation for it has come back
  const explained = rankItems.map((r) => ({ p: [r.p[0] + 0.08, r.p[1] + 0.06, -2.065] as [number, number, number], s: [0.06, 0.06, 0.01] as [number, number, number], color: '#e8f9ff' }));
  // AI request lamp on the bench: lit while the request is out to the shared AI layer (and the provider)
  const aiLamp = { p: [-0.9, 1.08, -1.2] as [number, number, number], s: [0.16, 0.06, 0.16] as [number, number, number], color: '#e8f9ff' };
  const board = ledBank(g, [...rankItems, ...evidence, ...explained, aiLamp]);
  const analyst = person(kit, m, g, [-1.8, DECK_TOP, -0.35], Math.PI / 2, 'stand', m.blue, m.screen, m.skin, m.visor, [null, -0.25]);
  deckCable(kit, g, m, [-0.9, -1.45], [-0.9, -1.9]); deckCable(kit, g, m, [-0.9, -1.9], [0.25, -1.9]);
  const orig = createScreens([{ id: 'insights', ...wall, group: wallG }] as OrigSlot[], ctx.renderer);
  return {
    group: g,
    update(t, s) {
      for (let i = 0; i < 3; i++) { const on = s.still ? 1 : smooth(0.5, 1, t / 4); const scan = s.still ? 0 : Math.pow(Math.max(0, Math.sin(t * 0.45 - i * 0.7)), 16); status.set(i, 0.2 + on * scan * 0.8 + (s.phase === 'working' ? 0.3 : 0)); }
      status.flush();
      cmdMt.emissiveIntensity = s.phase === 'working' ? 0.5 + 0.3 * Math.sin(t * 4) : 0.2;
      // correlated findings arrive → the top-ranked risks are taken IN RANK ORDER (fixed rules, from Data Ingestion)
      // → the AI request goes out and comes back → each risk gets its explanation → the analyst reviews the wall
      const lp = localLoop(s);
      let sel = 1, ai = false, expl = 1;
      if (s.still) { /* everything shown */ }
      else if (s.beats.includes('i-fanout')) { sel = s.progress; expl = 0; }
      else if (s.beats.includes('i-insights')) { ai = s.progress < 0.78; expl = seg(s.progress, 0.8, 1); }
      else if (lp) { sel = seg(lp.k, 0, 0.35); ai = lp.k > 0.35 && lp.k < 0.65; expl = seg(lp.k, 0.65, 0.95); }
      const w = sel < 1 || ai || expl < 1;
      for (let i = 0; i < 15; i++) board.set(i, sel * 15.5 > i ? (w && Math.floor(sel * 15.5) === i ? 1.3 : 0.85) : 0.15);
      for (let r = 0; r < 3; r++) board.set(15 + r, s.still ? 0.5 : w && Math.floor(t * 4 + r) % 3 === 0 ? 1 : 0.25);
      for (let i = 0; i < 15; i++) board.set(18 + i, expl * 15.5 > i ? 1 : 0.05);
      board.set(33, ai ? 0.6 + 0.6 * Math.sin(t * 9) : 0.12);
      board.flush();
      if (!s.still && s.level === 1) { analyst.head.rotation.x = -0.15; analyst.head.rotation.y = 0.15 * Math.sin(t * 0.7); analyst.armL.rotation.x = expl > 0 && expl < 1 ? -1.1 + 0.1 * Math.sin(t * 5) : -0.1; }
    },
    paint(cl, act, red, dark) { orig.update(cl, act, red, dark, 1); },
    dispose() { orig.dispose(); status.dispose(); board.dispose(); },
  };
};

export const buildCyfroCompliance: ChunkBuilder = (ctx) => {
  const { kit, m } = ctx; const g = new Group(); const T = DECK_TOP;
  chunkBase(kit, g, m);
  /*
   * A miniature compliance evaluation facility (see complianceEval.ts for the product facts behind it):
   *   evidence job arrives (north port) → records travel to the evidence station and are sorted by type →
   *   the check runner evaluates each framework's controls → statuses appear (passing / partial / failing /
   *   not evaluable / needs review) → the technical-controls score settles → results on the audit workstation
   *   and an evaluation report in the output tray → calm.
   * Receiving evidence never passes a control: tiles stay pending until the runner has evaluated them.
   */
  // ── framework cabinets (GDPR, SOC 2, NIST CSF, CCPA/CPRA): three control groups each ──
  const CX = (i: number) => -1.95 + i * 0.8, FY = (r: number) => 0.6 + r * 0.42;
  for (let i = 0; i < 4; i++) {
    kit.box(g, 0.75, 1.5, 0.7, CX(i), 0.98, -1.55, m.panel, 0.06);
    for (let r = 0; r < 3; r++) kit.box(g, 0.6, 0.32, 0.05, CX(i), FY(r), -1.18, m.white, 0.03);
  }
  ([m.blue, m.green, m.white, m.orange] as const).forEach((mt, i) => kit.box(g, 0.6, 0.06, 0.3, CX(i), 1.76, -1.55, mt, 0.01));
  // check runner on its gantry over the control folders
  for (const x of [-2.45, 0.95]) kit.box(g, 0.1, 1.85, 0.1, x, T + 0.92, -1.0, m.edge, 0.02);
  kit.box(g, 3.5, 0.08, 0.12, -0.75, T + 1.88, -1.0, m.edge, 0.02);
  const runnerMt = mat(ctx, '#33afdf', 0.3);
  const runner = kit.dyn(kit.box(g, 0.32, 0.14, 0.3, CX(0), T + 1.78, -1.0, runnerMt, 0.03));
  // ── evidence path: north intake → tube down the west edge → evidence station (south-west) ──
  kit.box(g, 0.55, 0.22, 0.3, -1.6, T + 0.11, -2.2, m.panel, 0.03);
  kit.box(g, 1.0, 0.1, 0.14, -2.09, T + 0.05, -2.2, m.edge, 0.02);
  kit.box(g, 0.14, 0.1, 3.9, -2.58, T + 0.05, -0.32, m.edge, 0.02);
  kit.box(g, 1.75, 0.08, 1.0, -1.65, T + 0.04, 1.85, m.edge, 0.03); // station plate
  kit.box(g, 0.42, 0.3, 0.42, -2.2, T + 0.23, 1.62, m.panel, 0.04); // intake hopper
  kit.box(g, 0.34, 0.03, 0.34, -2.2, T + 0.39, 1.62, m.screen, 0);
  kit.box(g, 0.2, 0.5, 0.2, -1.62, T + 0.33, 1.55, m.panel, 0.03); // sorter column
  const arm = kit.dyn(new Group()); arm.position.set(-1.62, T + 0.6, 1.55); g.add(arm);
  kit.box(arm, 0.55, 0.04, 0.08, 0.22, 0, 0, m.blue, 0.01);
  const BIN_X = [-2.25, -1.88, -1.51, -1.14];
  for (const x of BIN_X) { kit.box(g, 0.32, 0.2, 0.32, x, T + 0.18, 2.15, m.screen, 0.03); kit.box(g, 0.26, 0.02, 0.26, x, T + 0.285, 2.15, m.edge, 0); }
  // ── audit workstation (south-centre) and its operator ──
  kit.box(g, 1.0, 0.75, 0.5, 0.15, T + 0.375, 1.5, m.panel, 0.06); kit.box(g, 1.06, 0.06, 0.56, 0.15, T + 0.78, 1.5, m.white, 0.03);
  kit.box(g, 0.5, 0.03, 0.16, 0.15, T + 0.825, 1.66, m.screen, 0);
  const audit = monitor(kit, g, m, 0.15, 1.82, 1.38, 1.05, 0.66);
  const op = person(kit, m, g, [0.15, T, 2.2], Math.PI, 'stand', m.white, m.screen, m.skin, m.visor, [-0.35, null]);
  // ── the original compliance check monitor ──
  const mon = cabinetMonitor(kit, g, m, -1.0, 0.7);
  // ── score gauge: technical-controls score (mean of scored technical controls), with coloured bands and ticks ──
  kit.box(g, 1.3, 0.75, 0.5, 1.3, 0.6, 0.6, m.panel, 0.08);
  kit.cylinder(g, 0.55, 0.08, 1.3, 1.25, 0.6, m.screen, 32, 0.55).rotation.x = Math.PI / 2;
  const band = (color: string, from: number, to: number) => { const t0 = kit.torus(g, 0.42, 0.04, 1.3, 1.25, 0.66, mat(ctx, color, 0.45), Math.PI * (to - from)); t0.rotation.z = Math.PI * (1 - to); };
  band('#ff6a4d', 0, 0.5); band('#f2b24d', 0.5, 0.8); band('#4fbf8b', 0.8, 1);
  for (let i = 0; i <= 5; i++) { const th = (Math.PI * i) / 5, tk = kit.box(g, 0.025, 0.09, 0.02, 1.3 + Math.cos(th) * 0.52, 1.25 + Math.sin(th) * 0.52, 0.66, m.white, 0); tk.rotation.z = th - Math.PI / 2; }
  const needle = kit.dyn(new Group()); needle.position.set(1.3, 1.25, 0.68); g.add(needle);
  kit.box(needle, 0.04, 0.4, 0.02, 0, 0.18, 0, m.orange, 0);
  // ── evaluation report output tray (beside the gauge) ──
  kit.box(g, 0.8, 0.5, 0.5, 1.3, T + 0.25, 1.55, m.panel, 0.05);
  kit.box(g, 0.6, 0.04, 0.12, 1.3, T + 0.38, 1.82, m.screen, 0);
  // ── every lamp, tile and moving record: one instanced bank ──
  const items: BankItem[] = []; const add = (it: BankItem) => items.push(it) - 1;
  const tile = OUTCOMES.map((_, f) => Array.from({ length: 12 }, (_, i) => add({ p: [CX(f) - 0.21 + (i % 4) * 0.14, FY(Math.floor(i / 4)), -1.145], s: [0.1, 0.16, 0.02], color: '#33afdf' })));
  const strip = OUTCOMES.map((_, f) => [0, 1, 2].map((r) => add({ p: [CX(f), FY(r) - 0.2, -1.15], s: [0.5, 0.03, 0.02], color: '#33afdf' })));
  const card = OUTCOMES.map((_, f) => ['#4fbf8b', '#f2b24d', '#ff6a4d'].map((color, k) => add({ p: [CX(f) - 0.2 + k * 0.2, 1.62, -1.17], s: [0.11, 0.11, 0.04], color })));
  const iIntake = add({ p: [-1.6, T + 0.235, -2.2], s: [0.45, 0.02, 0.2], color: '#33afdf' });
  const rec = EVIDENCE.map((_, i) => add({ p: [0, -5, 0], s: [0.16, 0.08, 0.2], color: EVIDENCE_COLOR[i] }));
  const binFill = EVIDENCE.map((_, i) => add({ p: [BIN_X[i], T + 0.31, 2.15], s: [0.22, 0.04, 0.22], color: EVIDENCE_COLOR[i] }));
  const binLamp = EVIDENCE.map((_, i) => add({ p: [BIN_X[i], T + 0.18, 2.315], s: [0.2, 0.05, 0.02], color: EVIDENCE_COLOR[i] }));
  const iReport = add({ p: [1.3, T + 0.36, 1.85], s: [0.5, 0.015, 0.5], color: '#e9f1f8' });
  const bank = ledBank(g, items);
  const PATH: [number, number, number][] = [[-1.6, T + 0.3, -2.2], [-2.58, T + 0.16, -2.2], [-2.58, T + 0.16, 1.4], [-2.2, T + 0.45, 1.62], [-1.62, T + 0.7, 1.55]];
  const rp: [number, number, number] = [0, 0, 0];
  const orig = createScreens([{ id: 'compliance', ...mon, group: g }] as OrigSlot[], ctx.renderer);
  const screens = createCityScreens([{ id: 'complianceAudit', ...audit, group: g }] as CitySlot[], ctx.renderer);
  const target = score(FEATURED) / 100;
  let needleV = target; const tick = clock();
  return {
    group: g,
    update(t, s) {
      const dt = tick(t), k = complianceK(s), run = k >= 0 && !s.still, live = k < 0 ? 1 : k;
      // control tiles: pending (dim) for this run until the runner has evaluated them, then their status
      OUTCOMES.forEach((row, f) => row.forEach((st, i) => {
        const done = live >= evalAt(f, i), idx = tile[f][i];
        bank.tint(idx, done ? STATUS_COLOR[st] : '#33afdf');
        bank.set(idx, !done ? (run && live >= CW.evaluate[0] && Math.abs(live - evalAt(f, i)) < 0.02 ? 1 : 0.1) : st === 'review' && run ? 0.65 + 0.3 * Math.sin(t * 4) : 0.85);
      }));
      // evidence strips: evidence available for evaluation (grey where a group has a control without evidence)
      OUTCOMES.forEach((row, f) => [0, 1, 2].forEach((r) => {
        const missing = row.slice(r * 4, r * 4 + 4).includes('not_evaluable'), on = live >= CW.records[1];
        bank.tint(strip[f][r], missing && live >= evalAt(f, r * 4 + 3) ? '#8a97a3' : '#33afdf'); bank.set(strip[f][r], on ? 0.7 : 0.1);
      }));
      // framework scorecards: which outcomes occurred once the framework is evaluated
      OUTCOMES.forEach((row, f) => { const done = live >= evalAt(f, 11); ['passing', 'partial', 'failing'].forEach((st, j) => bank.set(card[f][j], done && row.includes(st as never) ? 1 : 0.14)); });
      // the runner sweeps framework by framework during the evaluation window
      const ev = seg(live, CW.evaluate[0], CW.evaluate[1]);
      runner.position.x = run && ev > 0 && ev < 1 ? CX(0) + (CX(3) - CX(0)) * ev : CX(0);
      runnerMt.emissiveIntensity = run && ev > 0 && ev < 1 ? 0.9 : 0.25;
      // evidence in: the job arrives, records go down the tube, the sorter sends each into its bin
      bank.set(iIntake, run && live < CW.arrive[1] + 0.02 ? 0.5 + 0.6 * Math.max(s.arrive, 0.5 + 0.5 * Math.sin(t * 8)) : 0.15 + 0.8 * s.arrive);
      let armTo = 0;
      EVIDENCE.forEach((_, i) => {
        const u = run ? seg(live, CW.records[0] + i * 0.035, CW.records[0] + 0.11 + i * 0.035) : 0;
        if (u > 0 && u < 1) {
          const pts = [...PATH, [BIN_X[i], T + 0.4, 2.15] as [number, number, number]], n = pts.length - 1, sgi = Math.min(n - 1, Math.floor(u * n)), f = u * n - sgi;
          arc(rp, pts[sgi], pts[sgi + 1], f, sgi === n - 1 ? 0.25 : 0.05); bank.move(rec[i], rp[0], rp[1], rp[2]); bank.scale(rec[i], 1);
          if (sgi >= n - 2) armTo = Math.atan2(-(2.15 - 1.55), BIN_X[i] + 1.62);
        } else bank.scale(rec[i], 0.0001);
        bank.set(rec[i], 1.1);
        const landed = live >= CW.records[0] + 0.11 + i * 0.035;
        bank.scale(binFill[i], landed ? 1 : 0.0001); bank.set(binFill[i], 0.7);
        bank.set(binLamp[i], landed ? (run && ev > 0 && ev < 1 ? 0.55 + 0.4 * Math.sin(t * 6 + i) : 0.75) : 0.12); // read while the checks run
      });
      if (run) arm.rotation.y += (armTo - arm.rotation.y) * Math.min(1, dt * 8);
      // the gauge drops while the run evaluates, then settles on the technical-controls score
      const want = !run ? target : live < CW.evaluate[0] ? needleV : live < CW.score[0] ? 0.05 : target;
      needleV += (want - needleV) * Math.min(1, s.still ? 1 : dt * (live >= CW.score[0] ? 2.5 : 3));
      needle.rotation.z = (0.5 - needleV) * Math.PI;
      // results: the evaluation report slides into the output tray
      const rep = !run ? 1 : seg(live, CW.results[0], CW.results[0] + 0.08);
      bank.move(iReport, 1.3, T + 0.36, 1.55 + 0.32 * ease(rep)); bank.scale(iReport, rep > 0.02 ? 1 : 0.0001); bank.set(iReport, 0.8);
      bank.flush();
      if (!s.still && s.level === 1) { op.head.rotation.y = run && ev > 0 && ev < 1 ? -0.6 : 0; op.head.rotation.x = run && live >= CW.results[0] ? 0.25 : 0.05; op.armR.rotation.x = run && live >= CW.results[0] && live < CW.results[0] + 0.06 ? -1.0 : -0.3; }
    },
    paint(cl, act, red, dark, s) { orig.update(cl, act, red, dark, 1); screens.update(cl, red, dark, s); },
    dispose() { orig.dispose(); screens.dispose(); bank.dispose(); },
  };
};

export const buildCyfroTopology: ChunkBuilder = (ctx) => {
  const { kit, m } = ctx; const g = new Group(); const T = DECK_TOP;
  chunkBase(kit, g, m);
  /*
   * CyfroTopology reads the latest correlated snapshot when someone opens it and turns it into a graph:
   *   records arrive (feed racks) → relationships are built (processor) → nodes and links appear on the table
   *   → the graph settles → an asset is inspected (terminal), with CyfroAI Insights overlays (pedestal).
   * Graph and timing are shared with the node-details screen (topologyGraph.ts).
   */
  // ── the topology table: base, rim, guide rings, rim lights ──
  const TX = -0.3, TZ = 0.1;
  kit.cylinder(g, 1.35, 0.55, TX, T + 0.28, TZ, m.panel, 40, 1.2);
  kit.cylinder(g, 1.2, 0.05, TX, T + 0.58, TZ, m.screen, 40);
  kit.torus(g, 1.22, 0.025, TX, T + 0.6, TZ, m.edge).rotation.x = Math.PI / 2;
  for (const r of [0.45, 0.85]) kit.torus(g, r, 0.008, TX, T + 0.61, TZ, m.holo).rotation.x = Math.PI / 2;
  const RIM = 24;
  const rim = ledBank(g, Array.from({ length: RIM }, (_, i) => { const a = (i / RIM) * Math.PI * 2; return { p: [TX + Math.cos(a) * 1.31, T + 0.5, TZ + Math.sin(a) * 1.31] as [number, number, number], s: [0.12, 0.05, 0.04] as [number, number, number], color: '#33afdf', rotY: -a + Math.PI / 2 }; }));
  const beamMt = mat(ctx, '#33afdf', 0.5); beamMt.transparent = true; beamMt.opacity = 0.14; beamMt.depthWrite = false;
  kit.dyn(kit.cylinder(g, 1.05, 0.9, TX, T + 1.05, TZ, beamMt, 32, 0.6));
  // ── the graph (rotates with the hologram) ──
  const holo = kit.dyn(new Group()); holo.position.set(TX, T + 1.25, TZ); g.add(holo);
  const NODE_COL = (i: number) => (TOPO_NODES[i].kind === 'agent' ? '#33afdf' : TOPO_NODES[i].kind === 'subnet' ? '#bfefff' : '#39a9d8');
  const nodeBank = ledBank(holo, TOPO_NODES.map((nd, i) => ({ p: nd.p, s: [nd.r * 2, nd.r * 2, nd.r * 2] as [number, number, number], color: NODE_COL(i) })), 'sphere');
  const Y = new Vector3(0, 1, 0), eq = new Quaternion(), ee = new Euler(), dir = new Vector3();
  const EDGE = TOPO_EDGES.map(([a, b]) => {
    const A = TOPO_NODES[a].p, B = TOPO_NODES[b].p; dir.set(B[0] - A[0], B[1] - A[1], B[2] - A[2]);
    const len = dir.length(); ee.setFromQuaternion(eq.setFromUnitVectors(Y, dir.normalize()));
    return { A, B, len, item: { p: [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2, (A[2] + B[2]) / 2] as [number, number, number], s: [0.028, len, 0.028] as [number, number, number], color: '#bfefff', rotX: ee.x, rotY: ee.y, rotZ: ee.z } };
  });
  const SEL = TOPO_NODES[SELECTED].p;
  const links = ledBank(holo, [...EDGE.map((e) => e.item), { p: [SEL[0] + 0.32, SEL[1] + 0.3, SEL[2]], s: [0.42, 0.26, 0.02], color: '#33afdf' }]);
  const CARD = EDGE.length;
  const fxMt = mat(ctx, '#33afdf', 0.9); fxMt.transparent = true; fxMt.depthWrite = false; fxMt.opacity = 0;
  const reveal = kit.dyn(kit.torus(holo, 1.05, 0.012, 0, 0, 0, fxMt)); reveal.rotation.x = Math.PI / 2; reveal.visible = false; // reveal ring
  const selMt = mat(ctx, '#fe904d', 0.9); selMt.transparent = true; selMt.depthWrite = false;
  const selRing = kit.dyn(kit.torus(holo, 0.12, 0.012, SEL[0], SEL[1], SEL[2], selMt)); selRing.visible = false; // selection ring

  // ── data feeds (south, by the input port): records from the latest snapshot → relationship processor ──
  for (const x of [-1.6, -1.1]) {
    kit.box(g, 0.42, 0.78, 0.42, x, T + 0.39, 2.05, m.screen, 0.05);
    kit.box(g, 0.46, 0.06, 0.46, x, T + 0.8, 2.05, m.panel, 0.02);
  }
  kit.box(g, 0.6, 0.5, 0.48, -0.3, T + 0.25, 2.0, m.panel, 0.05); // relationship processor
  kit.box(g, 0.5, 0.04, 0.04, -0.3, T + 0.4, 2.25, m.edge, 0);
  deckCable(kit, g, m, [-1.6, 1.78], [-0.3, 1.78]); deckCable(kit, g, m, [-0.3, 1.78], [-0.3, 1.45]);
  // ── inspection terminal (west) with the node-details screen and its operator ──
  kit.box(g, 0.95, 0.75, 0.55, -2.15, T + 0.375, 0.5, m.panel, 0.06); kit.box(g, 1.0, 0.06, 0.6, -2.15, T + 0.78, 0.5, m.white, 0.03);
  kit.box(g, 0.5, 0.03, 0.18, -2.15, T + 0.825, 0.65, m.screen, 0);
  const term = monitor(kit, g, m, -2.15, 1.72, 0.38, 0.95, 0.62);
  const op = person(kit, m, g, [-2.15, T, 1.2], Math.PI, 'stand', m.blue, m.screen, m.skin, m.visor, [-0.4, null]);
  // ── overlay pedestal (east): CyfroAI Insights risk and agent-coverage overlays ──
  kit.box(g, 0.32, 0.75, 0.32, 1.75, T + 0.375, 0.25, m.panel, 0.04);
  const ped = new Group(); ped.position.set(1.75, T + 0.8, 0.32); ped.rotation.x = -0.5; g.add(ped); kit.box(ped, 0.5, 0.05, 0.36, 0, 0, 0, m.edge, 0.01);
  // ── graph status (north): records · relationships · graph ready ──
  kit.box(g, 0.95, 0.36, 0.28, 0.25, T + 0.18, -2.15, m.panel, 0.04);
  // ── the original topology monitor, filter console and export station ──
  const mon = cabinetMonitor(kit, g, m, 1.45, -1.5);
  kit.box(g, 0.9, 0.75, 0.6, -1.95, T + 0.38, -1.45, m.panel, 0.05);
  const fp = new Group(); fp.position.set(-1.95, T + 0.8, -1.35); fp.rotation.x = -0.6; g.add(fp);
  kit.box(fp, 0.9, 0.06, 0.5, 0, 0, 0, m.screen, 0.02);
  kit.box(g, 0.95, 0.55, 0.7, 1.55, T + 0.28, 1.35, m.panel, 0.05);
  for (let k = 0; k < 3; k++) kit.box(g, 0.24, 0.05, 0.4, 1.27 + k * 0.28, T + 0.6, 1.4, m.edge, 0.01);
  const PROC = 8;
  const ctl = ledBank(g, [
    ...[0, 1, 2, 3].map((i) => ({ p: [-2.25 + i * 0.2, T + 0.86, -1.29] as [number, number, number], s: [0.1, 0.05, 0.1] as [number, number, number], color: i === 2 ? '#fe904d' : '#33afdf' })), // 0–3 filters
    ...[0, 1, 2].map((k) => ({ p: [1.27 + k * 0.28, T + 0.64, 1.4] as [number, number, number], s: [0.18, 0.02, 0.3] as [number, number, number], color: '#bfefff' })), // 4–6 export trays
    ...[-1.6, -1.1].flatMap((x) => [0, 1, 2].map((r) => ({ p: [x, T + 0.2 + r * 0.2, 2.265] as [number, number, number], s: [0.28, 0.05, 0.02] as [number, number, number], color: '#33afdf' }))), // 7–12 feed racks
    ...Array.from({ length: PROC }, (_, i) => ({ p: [-0.51 + i * 0.06, T + 0.4, 2.265] as [number, number, number], s: [0.045, 0.06, 0.02] as [number, number, number], color: '#bfefff' })), // 13–20 relationships built
    ...[0, 1, 2].map((i) => ({ p: [-0.05 + i * 0.3, T + 0.2, -2.0] as [number, number, number], s: [0.2, 0.14, 0.02] as [number, number, number], color: i === 2 ? '#4fbf8b' : '#33afdf' })), // 21–23 status
    { p: [1.62, T + 0.86, 0.36], s: [0.12, 0.05, 0.12], color: '#fe904d' }, { p: [1.88, T + 0.86, 0.36], s: [0.12, 0.05, 0.12], color: '#4fbf8b' }, // 24–25 overlays
    ...[0, 1, 2].map(() => ({ p: [0, -5, 0] as [number, number, number], s: [0.14, 0.08, 0.18] as [number, number, number], color: '#33afdf' })), // 26–28 records in transit
  ]);
  const I = { feed: 7, proc: 13, status: 21, ovl: 24, rec: 26 };
  const RP: [number, number, number][] = [[-1.6, T + 0.86, 2.05], [-0.3, T + 0.6, 2.0], [-0.3, T + 0.7, 1.35], [TX, T + 1.0, TZ]];
  const rp: [number, number, number] = [0, 0, 0];
  const orig = createScreens([{ id: 'topology', ...mon, group: g }] as OrigSlot[], ctx.renderer);
  const screens = createCityScreens([{ id: 'topoInspect', ...term, group: g }] as CitySlot[], ctx.renderer);
  let rot = 0.5; const tick = clock();
  return {
    group: g,
    update(t, s) {
      const dt = tick(t), k = topoK(s), run = k >= 0 && !s.still, built = k < 0 ? 1 : k;
      // the hologram spins while the graph is being built, then settles so it can be inspected; at rest it drifts
      if (k >= 0) { holo.rotation.y = 0.5 + (1 - ease(seg(k, 0, STAGE.settled))) * 3.2; rot = holo.rotation.y; }
      else { rot += dt * 0.05; holo.rotation.y = rot; }
      // at rest the graph is complete but nothing is selected (selection belongs to someone using the map)
      const selOn = k >= 0 && built >= STAGE.select, ovl = k >= 0 && built >= STAGE.overlay;
      // nodes appear tier by tier (agent → subnets → assets)
      TOPO_NODES.forEach((nd, i) => {
        const on = ease(seg(built, nodeAt(i), nodeAt(i) + 0.05)), sel = i === SELECTED && selOn;
        nodeBank.scale(i, Math.max(0.0001, on * (sel ? 1.45 + (run ? 0.12 * Math.sin(t * 6) : 0) : 1)));
        nodeBank.tint(i, ovl && RISK.includes(i) ? '#fe904d' : NODE_COL(i));
        nodeBank.set(i, sel ? 1.3 : selOn && LINKED.includes(i) ? 1.05 : 0.75);
      });
      nodeBank.flush();
      // relationships draw in from their first node; selected node's links pulse, its path to the agent glows orange
      EDGE.forEach((e, i) => {
        const d = ease(seg(built, edgeAt(i) - 0.04, edgeAt(i)));
        links.size(i, 0.028, Math.max(0.0001, e.len * d), 0.028);
        links.move(i, e.A[0] + (e.B[0] - e.A[0]) * d / 2, e.A[1] + (e.B[1] - e.A[1]) * d / 2, e.A[2] + (e.B[2] - e.A[2]) * d / 2);
        const [a, b] = TOPO_EDGES[i], mine = selOn && (a === SELECTED || b === SELECTED), path = selOn && PATH_EDGES.includes(i);
        links.tint(i, path ? '#fe904d' : '#bfefff');
        links.set(i, d <= 0 ? 0.0 : d < 1 && run ? 1.2 : path || mine ? (run ? 0.75 + 0.35 * Math.sin(t * 5 - i) : 0.95) : selOn ? 0.28 : 0.45);
      });
      links.scale(CARD, selOn ? Math.max(0.0001, ease(seg(built, STAGE.select, STAGE.select + 0.05))) : 0.0001); links.set(CARD, 0.55);
      links.flush();
      // reveal ring rises through the hologram while nodes appear; selection ring pulses on the inspected asset
      const rv = run ? seg(k, 0.1, 0.48) : 0;
      reveal.visible = rv > 0 && rv < 1; reveal.position.y = -0.45 + rv * 0.95; fxMt.opacity = 0.55 * Math.sin(Math.PI * rv);
      selRing.visible = selOn; selRing.rotation.y = t * 0.8; selRing.scale.setScalar(run ? 1 + 0.18 * Math.sin(t * 5) : 1); selMt.opacity = 0.85;
      beamMt.opacity = run ? 0.24 : 0.14;
      // table rim: a chasing light while the graph builds, steady when settled
      for (let i = 0; i < RIM; i++) rim.set(i, run && k < STAGE.settled ? (Math.abs(((t * 6 - i) % RIM + RIM) % RIM) < 3 ? 1.1 : 0.25) : 0.4);
      rim.flush();
      // records leave the feed racks, pass the processor and enter the table
      for (let i = 0; i < 3; i++) {
        const u = run ? seg(k, 0.02 + i * 0.04, 0.14 + i * 0.04) : 0;
        if (u > 0 && u < 1) { const seg3 = Math.min(2, Math.floor(u * 3)), f = u * 3 - seg3; arc(rp, RP[seg3], RP[seg3 + 1], f, seg3 === 2 ? 0.4 : 0.15); ctl.move(I.rec + i, rp[0], rp[1], rp[2]); ctl.scale(I.rec + i, 1); }
        else ctl.scale(I.rec + i, 0.0001);
        ctl.set(I.rec + i, 1.1);
      }
      for (let i = 0; i < 6; i++) ctl.set(I.feed + i, run && k < STAGE.records + 0.05 ? (Math.floor(t * 8 + i) % 3 === 0 ? 1.1 : 0.35) : 0.35 + 0.6 * s.arrive);
      const relProg = seg(built, edgeAt(0) - 0.04, edgeAt(EDGE.length - 1));
      for (let i = 0; i < PROC; i++) ctl.set(I.proc + i, relProg * PROC > i + 0.5 ? 0.9 : 0.12);
      [STAGE.records, STAGE.relations, STAGE.settled].forEach((at, i) => ctl.set(I.status + i, built >= at ? 0.95 : run && built >= (i === 0 ? 0 : [STAGE.records, STAGE.relations][i - 1]) ? 0.45 + 0.4 * Math.sin(t * 8) : 0.12));
      ctl.set(I.ovl, ovl ? 0.95 : 0.15); ctl.set(I.ovl + 1, ovl ? 0.95 : 0.15);
      const fk = k < 0 ? 0 : k, w = run;
      for (let i = 0; i < 4; i++) ctl.set(i, s.still ? 0.6 : w ? (fk * 5 > i ? 1 : 0.25) : 0.35);
      for (let j = 0; j < 3; j++) ctl.set(4 + j, s.still ? 0.4 : w && fk > 0.9 && j === Math.floor(t) % 3 ? 1 : 0.25);
      ctl.flush();
      // the operator watches the table, then inspects the selected asset on the terminal
      if (!s.still && s.level === 1) {
        op.head.rotation.y = selOn ? 0 : 0.5; op.head.rotation.x = selOn ? 0.2 : 0;
        op.armR.rotation.x = run && built >= STAGE.select && built < STAGE.select + 0.08 ? -1.0 : -0.3;
      }
    },
    paint(cl, act, red, dark, s) { orig.update(cl, act, red, dark, 1); screens.update(cl, red, dark, s); },
    dispose() { orig.dispose(); screens.dispose(); nodeBank.dispose(); links.dispose(); ctl.dispose(); rim.dispose(); },
  };
};

export const buildCyfroAssistant: ChunkBuilder = (ctx) => {
  const { kit, m } = ctx; const g = new Group();
  chunkBase(kit, g, m);
  // the original CyfroAssistant desk
  const mon = desk(kit, g, m, -0.6, -0.55);
  // assistant pod
  kit.cylinder(g, 0.32, 0.9, -2.0, DECK_TOP + 0.45, -0.9, m.panel, 24, 0.26);
  const podMt = mat(ctx, '#33afdf', 0.4);
  kit.sphere(g, 0.3, -2.0, DECK_TOP + 1.15, -0.9, m.white, 20);
  const ring = kit.dyn(kit.torus(g, 0.34, 0.03, -2.0, DECK_TOP + 1.15, -0.9, podMt)); ring.rotation.x = Math.PI / 2;
  // approval checkpoint on the outbound action lane (north-east → Scan Control)
  const barrier = approvalBarrier(kit, g, m, 0.75, 1.55, ctx.owned, 1.2);
  const card = monitor(kit, g, m, 1.75, 1.6, 0.35, 1.05, 0.72);
  deckCable(kit, g, m, [0.6, 1.55], [2.6, 1.55]);
  // tool rack: read tools over findings & reports, topology, compliance, insights and code security
  kit.box(g, 1.25, 1.2, 0.45, 1.85, DECK_TOP + 0.6, -1.6, m.panel, 0.05);
  for (let r = 0; r < 2; r++) kit.box(g, 1.2, 0.04, 0.44, 1.85, DECK_TOP + 0.55 + r * 0.42, -1.58, m.edge, 0);
  const TOOLS = ['reports', 'topology', 'compliance', 'insights', 'code'];
  const tools = ledBank(g, [
    ...TOOLS.map((_, i) => ({ p: [1.45 + (i % 3) * 0.4, DECK_TOP + 0.75 + Math.floor(i / 3) * 0.42, -1.36] as [number, number, number], s: [0.3, 0.22, 0.06] as [number, number, number], color: i === 4 ? '#5caa83' : '#33afdf' })),
    { p: [0, -5, 0], s: [0.2, 0.14, 0.06], color: '#bfefff' }, // 5 the message: question in, answer out
    { p: [1.05, 1.15, 1.55], s: [0.34, 0.22, 0.03], color: '#fe904d' }, // 6 proposed changing action, held at the checkpoint
  ]);
  const bp: [number, number, number] = [0, 0, 0];
  const ASK: [number, number, number] = [-0.6, 1.55, 0.35], POD: [number, number, number] = [-2.0, 1.15, -0.75], SCREEN: [number, number, number] = [-0.6, 2.0, -0.55], TOOLRACK: [number, number, number] = [1.85, 1.2, -1.3];
  // document library: uploaded and public documents the assistant can search
  kit.box(g, 0.5, 1.1, 1.3, -2.25, DECK_TOP + 0.55, 0.95, m.panel, 0.04);
  for (let r = 0; r < 3; r++) for (let k = 0; k < 6; k++) kit.box(g, 0.28, 0.26, 0.12, -2.15, DECK_TOP + 0.25 + r * 0.33, 0.45 + k * 0.2, (k + r) % 3 === 0 ? m.blue : (k + r) % 3 === 1 ? m.white : m.edge, 0.01);
  // the person asking the question
  const asker = person(kit, m, g, [-0.6, DECK_TOP, 0.45], Math.PI, 'stand', m.white, m.screen, m.skin, m.visor, [-0.5, -0.5]);
  const orig = createScreens([{ id: 'assistant', ...mon, group: g }] as OrigSlot[], ctx.renderer);
  const screens = createCityScreens([{ id: 'askApproval', ...card, group: g }] as CitySlot[], ctx.renderer);
  let ringA = 0;
  const tick = clock();
  return {
    group: g,
    update(t, s) {
      const dt = tick(t);
      podMt.emissiveIntensity = s.still ? 0.5 : s.phase === 'working' ? 0.7 + 0.5 * Math.sin(t * 6) : 0.35;
      ringA += dt * (s.phase === 'working' ? 2 : 0.08); ring.rotation.z = s.still ? 0 : ringA;
      barrier.update(t, s.phase, s.still, dt);
      // question in → read tool (topology in this story, F14a) → reasoning via the shared AI layer → answer.
      // A changing action is proposed and WAITS at the barrier; only a person's approval sends it on.
      const lp = localLoop(s), ask = s.beats.includes('i-ask');
      const k = ask ? s.progress : lp ? lp.k : -1;
      const reading = k >= 0 && k > 0.25 && k < 0.55;
      TOOLS.forEach((name, i) => tools.set(i, s.still ? 0.45 : reading && name === (ask ? 'topology' : TOOLS[(lp?.n ?? 0) % 4]) ? 0.7 + 0.3 * Math.sin(t * 8) : 0.3));
      let msg = 0;
      if (k >= 0 && k < 0.25) { arc(bp, ASK, POD, seg(k, 0, 0.25), 0.5); msg = 1; tools.tint(5, '#bfefff'); }
      else if (k >= 0.25 && k < 0.55) { arc(bp, POD, TOOLRACK, seg(k, 0.25, 0.4), 0.9); if (k > 0.4) arc(bp, TOOLRACK, POD, seg(k, 0.4, 0.55), 0.9); msg = 1; tools.tint(5, '#33afdf'); }
      else if (k >= 0.75) { arc(bp, POD, SCREEN, seg(k, 0.75, 0.95), 0.4); msg = 1 - seg(k, 0.95, 1); tools.tint(5, '#4fbf8b'); }
      tools.move(5, bp[0], bp[1], bp[2]); tools.scale(5, Math.max(0.0001, msg)); tools.set(5, 1.1);
      const prop = s.phase === 'waiting_approval' ? 1 : s.phase === 'approved' ? 1 - seg(s.progress, 0, 0.2) : s.phase === 'rejected' ? 1 - seg(s.progress, 0.1, 0.5) : 0;
      tools.tint(6, s.phase === 'rejected' ? '#8a97a3' : '#fe904d');
      tools.scale(6, Math.max(0.0001, prop)); tools.set(6, s.phase === 'waiting_approval' && !s.still ? 0.6 + 0.4 * Math.sin(t * 5) : 0.8);
      tools.flush();
      if (!s.still && s.level === 1) { asker.head.rotation.x = s.phase === 'working' ? 0.12 * Math.sin(t * 3) : 0; asker.head.rotation.y = s.phase === 'waiting_approval' ? 0.5 : 0; }
    },
    paint(cl, act, red, dark, s) { orig.update(cl, act, red, dark, 1); screens.update(cl, red, dark, s); },
    dispose() { orig.dispose(); screens.dispose(); tools.dispose(); },
  };
};

export const buildReporting: ChunkBuilder = (ctx) => {
  const { kit, m } = ctx; const g = new Group();
  chunkBase(kit, g, m);
  // dashboard wall (the reporting workspace)
  kit.box(g, 3.2, 0.2, 0.8, -0.6, 0.34, -1.4, m.edge, 0.05);
  const wall = monitor(kit, g, m, -0.6, 2.15, -1.5, 2.9, 1.65);
  // dashboard bar-chart sculpture (glowing columns, one draw call)
  const BARS: [number, string][] = [[0.6, '#039be0'], [1.1, '#fe904d'], [0.8, '#039be0'], [0.45, '#4fbf8b']];
  kit.box(g, 1.85, 0.08, 0.5, 1.6, DECK_TOP + 0.04, -1.15, m.edge, 0.02);
  const bars = ledBank(g, BARS.map(([h, c], i) => ({ p: [1.0 + i * 0.4, DECK_TOP + 0.08 + h / 2, -1.15] as [number, number, number], s: [0.28, h, 0.28] as [number, number, number], color: c })));
  BARS.forEach((_, i) => bars.set(i, 0.75));
  // report sections on the archive shelf (vulnerabilities, misconfigurations, secrets, network, assets): they
  // light as the findings are organised into the report
  const tabs = ledBank(g, [0, 1, 2, 3, 4].map((k) => ({ p: [-1.78, DECK_TOP + 1.47, -0.8 + k * 0.27] as [number, number, number], s: [0.02, 0.08, 0.2] as [number, number, number], color: k < 3 ? '#fe904d' : '#33afdf' })));
  // KPI totem: three ring gauges (posture at a glance)
  kit.cylinder(g, 0.07, 1.25, 0.75, DECK_TOP + 0.62, 0.2, m.edge, 10);
  kit.cylinder(g, 0.28, 0.06, 0.75, DECK_TOP + 0.03, 0.2, m.edge, 20);
  ([[m.blue, 1.5, 1.35], [m.orange, 1.15, 0.9], [m.green, 0.8, 1.7]] as const).forEach(([mt, y, arc]) => { const r = kit.torus(g, 0.26, 0.045, 0.75, DECK_TOP + y, 0.2, mt, arc * Math.PI); r.rotation.y = Math.PI / 2; });
  // report printer producing the Excel export, with a tray of finished sheets
  kit.box(g, 1.0, 0.6, 0.75, 1.3, 0.53, 1.1, m.panel, 0.06);
  kit.box(g, 0.6, 0.08, 0.5, 1.3, 0.87, 1.55, m.edge, 0.02);
  for (let k = 0; k < 3; k++) kit.box(g, 0.5, 0.015, 0.42, 1.3, 0.92 + k * 0.02, 1.55, m.green, 0);
  const sheetMt = mat(ctx, '#4fbf8b', 0.15);
  const sheet = kit.dyn(kit.box(g, 0.55, 0.02, 0.6, 1.3, 0.85, 1.1, sheetMt, 0));
  // export archive shelf: spreadsheets by tab (vulnerabilities, misconfigurations, secrets, network, assets)
  kit.box(g, 0.6, 1.5, 1.5, -2.1, DECK_TOP + 0.75, -0.25, m.panel, 0.05);
  for (let r = 0; r < 3; r++) {
    kit.box(g, 0.62, 0.05, 1.45, -2.05, DECK_TOP + 0.35 + r * 0.45, -0.25, m.edge, 0);
    for (let k = 0; k < 5; k++) kit.box(g, 0.32, 0.32, 0.18, -1.95, DECK_TOP + 0.55 + r * 0.45, -0.8 + k * 0.27, (k + r) % 3 === 0 ? m.green : (k + r) % 3 === 1 ? m.white : m.blue, 0.02);
  }
  // notifications: in-app beacon, and a mailbox for the email that goes out only for critical events
  const bell = beacon(kit, g, m, -1.95, 1.45, ctx.owned, '#039be0', 1.1);
  kit.box(g, 0.08, 0.75, 0.08, -1.1, DECK_TOP + 0.38, 1.85, m.edge, 0);
  kit.box(g, 0.42, 0.3, 0.3, -1.1, DECK_TOP + 0.88, 1.85, m.white, 0.06);
  kit.box(g, 0.04, 0.22, 0.04, -0.87, DECK_TOP + 0.98, 1.85, m.orange, 0); // flag (critical only)
  // analyst bench
  kit.box(g, 1.4, 0.16, 0.8, -0.35, 0.95, 1.1, m.white, 0.06); kit.box(g, 1.1, 0.7, 0.6, -0.35, 0.58, 1.05, m.panel, 0.05);
  const screens = createCityScreens([{ id: 'reports', ...wall, group: g }] as CitySlot[], ctx.renderer);
  return {
    group: g,
    update(t, s) {
      // report data arrives (reads of the snapshot) → findings organised by section → charts rebuild → report
      // assembled → export ready. Story-driven (i-views), or a local 9 s loop when focused.
      const lp = localLoop(s), k = s.still ? 1 : lp ? lp.k : s.phase === 'working' ? s.progress : -1;
      for (let i = 0; i < 5; i++) tabs.set(i, k < 0 ? 0.35 : seg(k, 0.1 + i * 0.06, 0.16 + i * 0.06) > 0 ? 0.95 : 0.1);
      tabs.flush();
      BARS.forEach(([h], i) => { const g2 = k < 0 ? 1 : 0.08 + 0.92 * ease(seg(k, 0.4 + i * 0.05, 0.6 + i * 0.05)); const v = h * (s.still ? 1 : g2); bars.size(i, 0.28, v, 0.28); bars.move(i, 1.0 + i * 0.4, DECK_TOP + 0.08 + v / 2, -1.15); });
      bars.flush();
      bell.emissiveIntensity = s.still ? 0.3 : s.phase === 'receiving' ? 0.4 + 1.2 * Math.max(s.arrive, 0.5 + 0.5 * Math.sin(t * 12)) * (s.arrive > 0 ? 1 : 0.6) : 0.15;
      const ex = k < 0 ? 0 : ease(seg(k, 0.7, 0.95));
      sheet.visible = !s.still && ex > 0.01; sheet.position.z = 1.1 + ex * 0.45;
    },
    paint(cl, _a, red, dark, s) { screens.update(cl, red, dark, s); },
    dispose() { screens.dispose(); bars.dispose(); tabs.dispose(); },
  };
};
