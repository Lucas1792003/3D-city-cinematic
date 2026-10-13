import { Group, MeshStandardMaterial } from 'three';
import { createScreens } from '../../platform-architecture-3d/screens';
import { createCityScreens } from '../screens/cityScreens';
import { chunkBase } from '../kit/chunkBase';
import { ledBank } from '../kit/ledBank';
import { person } from '../kit/people';
import { monitor, cabinetMonitor, approvalBarrier, deckCable, DECK_TOP, type OrigSlot, type CitySlot } from '../kit/machines';
import type { ChunkBuilder, ChunkCtx } from './types';
import { localLoop, seg, arc } from './process';

/** Scan control, data ingestion & correlation, and the separate CyfroCode pipeline. */

const ease = (x: number) => { const v = Math.min(1, Math.max(0, x)); return v * v * (3 - 2 * v); };
const cyc = (t: number, n: number) => ((t % n) + n) % n;
const clock = () => { let prev = -1; return (t: number) => { const dt = prev < 0 || t < prev ? 0 : Math.min(0.1, t - prev); prev = t; return dt; }; };
const mat = (ctx: ChunkCtx, color: string, e = 0) => { const x = new MeshStandardMaterial({ color, roughness: 0.45, emissive: color, emissiveIntensity: e }); ctx.owned.push(x); return x; };

export const buildScanControl: ChunkBuilder = (ctx) => {
  const { kit, m } = ctx; const g = new Group();
  chunkBase(kit, g, m);
  // control tower with a glass cab and beacon
  kit.box(g, 1.3, 2.6, 1.3, 0.75, DECK_TOP + 1.3, -1.1, m.panel, 0.1);
  for (let i = 0; i < 4; i++) kit.box(g, 1.34, 0.05, 1.34, 0.75, DECK_TOP + 0.5 + i * 0.55, -1.1, m.edge, 0.01);
  kit.box(g, 1.6, 0.7, 1.6, 0.75, DECK_TOP + 2.95, -1.1, m.glass, 0.08);
  kit.box(g, 1.7, 0.1, 1.7, 0.75, DECK_TOP + 3.35, -1.1, m.edge, 0.03);
  const beaconMt = mat(ctx, '#039be0', 0.2); kit.dyn(kit.cylinder(g, 0.14, 0.24, 0.75, DECK_TOP + 3.52, -1.1, beaconMt, 16));
  // schedule dial on the tower face (the 30-second scheduler)
  kit.cylinder(g, 0.42, 0.06, 0.75, DECK_TOP + 1.9, -0.42, m.screen, 32).rotation.x = Math.PI / 2;
  const hand = kit.dyn(new Group()); hand.position.set(0.75, DECK_TOP + 1.9, -0.37); g.add(hand);
  const handMt = mat(ctx, '#33afdf', 0.6); kit.box(hand, 0.04, 0.34, 0.02, 0, 0.15, 0, handMt, 0);
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; kit.box(g, 0.03, 0.06, 0.02, 0.75 + Math.sin(a) * 0.34, DECK_TOP + 1.9 + Math.cos(a) * 0.34, -0.38, m.white, 0); }
  // Scan Setup console
  kit.box(g, 2.0, 0.85, 0.9, -1.15, 0.65, 0.95, m.panel, 0.08); kit.box(g, 2.1, 0.1, 1.0, -1.15, 1.12, 0.95, m.white, 0.04);
  const mon = monitor(kit, g, m, -1.15, 1.85, 0.75, 1.75, 1.05);
  // agent registry board
  const reg = cabinetMonitor(kit, g, m, -1.25, -1.35);
  // endpoint patch approval terminal (static: execution on the agent is not verified, so it never animates)
  kit.box(g, 0.7, 0.9, 0.55, 1.6, 0.68, 1.35, m.panel, 0.06);
  kit.box(g, 0.56, 0.36, 0.04, 1.6, 0.95, 1.64, m.screen, 0.02);
  kit.box(g, 0.14, 0.14, 0.05, 1.6, 0.95, 1.66, m.orange, 0.02);
  // due-scan queue in front of the tower: the 30-second scheduler claims due scans one slot at a time
  kit.box(g, 1.35, 0.32, 0.5, 0.75, DECK_TOP + 0.16, -0.05, m.panel, 0.05);
  kit.box(g, 1.25, 0.04, 0.4, 0.75, DECK_TOP + 0.34, -0.05, m.screen, 0.01);
  // single-use registration token dispenser (agent enrollment)
  kit.box(g, 0.5, 0.95, 0.45, 1.85, DECK_TOP + 0.48, -0.15, m.panel, 0.05);
  kit.box(g, 0.32, 0.04, 0.05, 1.85, DECK_TOP + 0.62, 0.08, m.screen, 0);
  kit.box(g, 0.24, 0.02, 0.16, 1.85, DECK_TOP + 0.6, 0.15, m.white, 0); // a token card
  // dispatch tray by the agent port: a prepared job waits here for the agent's own connection to collect it
  kit.box(g, 0.6, 0.36, 0.5, -2.2, DECK_TOP + 0.18, 2.1, m.panel, 0.04);
  kit.box(g, 0.5, 0.03, 0.4, -2.2, DECK_TOP + 0.37, 2.1, m.screen, 0);
  // Scan Setup controls on the console: three scan-type keys and the target strip
  for (let i = 0; i < 3; i++) kit.box(g, 0.24, 0.05, 0.18, -1.95 + i * 0.28, 1.19, 1.28, m.edge, 0.01);
  kit.box(g, 0.66, 0.04, 0.16, -0.65, 1.19, 1.28, m.edge, 0.01);
  const q = ledBank(g, [
    ...Array.from({ length: 8 }, (_, i) => ({ p: [0.25 + i * 0.143, DECK_TOP + 0.38, -0.05] as [number, number, number], s: [0.11, 0.03, 0.3] as [number, number, number], color: i === 7 ? '#fe904d' : '#33afdf' })),
    { p: [1.85, DECK_TOP + 0.8, 0.08], s: [0.08, 0.06, 0.02], color: '#4fbf8b' },
    ...[0, 1, 2].map((i) => ({ p: [-1.95 + i * 0.28, 1.225, 1.28] as [number, number, number], s: [0.18, 0.03, 0.12] as [number, number, number], color: '#33afdf' })), // 9–11 scan types
    { p: [-0.65, 1.22, 1.28], s: [0.58, 0.03, 0.1], color: '#bfefff' }, // 12 target
    { p: [0, 0, 0], s: [0.36, 0.07, 0.26], color: '#bfefff' }, // 13 the job card
    { p: [-2.2, DECK_TOP + 0.4, 2.1], s: [0.44, 0.02, 0.34], color: '#33afdf' }, // 14 dispatch tray light
  ]);
  const J = { types: 9, target: 12, card: 13, tray: 14 };
  const pt: [number, number, number] = [0, 0, 0];
  const CONSOLE: [number, number, number] = [-0.45, 1.25, 1.05], QIN: [number, number, number] = [1.25, DECK_TOP + 0.47, -0.05], QOUT: [number, number, number] = [0.25, DECK_TOP + 0.47, -0.05], TRAY: [number, number, number] = [-2.2, DECK_TOP + 0.46, 2.1], EAST: [number, number, number] = [2.6, DECK_TOP + 0.42, 0.3];
  // the person configuring scans at Scan Setup
  const op = person(kit, m, g, [-1.15, DECK_TOP, 1.7], Math.PI, 'stand', m.blue, m.screen, m.skin, m.visor, [-0.9, null]);
  const screens = createCityScreens([{ id: 'schedule', ...mon, group: g }, { id: 'registry', ...reg, group: g }] as CitySlot[], ctx.renderer);
  deckCable(kit, g, m, [-2.6, 1.73], [-1.15, 1.73]); deckCable(kit, g, m, [-1.15, 1.73], [-1.15, 1.45]);
  let a = 0; const tick = clock();
  return {
    group: g,
    update(t, s) {
      const dt = tick(t), busy = s.phase !== 'idle';
      a += dt * (busy ? 4 : 0.2); hand.rotation.z = s.still ? -0.8 : -a;
      beaconMt.emissiveIntensity = s.still ? 0.5 : busy ? 0.6 + 0.6 * (0.5 + 0.5 * Math.sin(t * 8)) : 0.3;
      if (!s.still) beaconMt.emissiveIntensity += 0.9 * s.arrive; // a heartbeat / request arrives over the agent's connection
      handMt.emissiveIntensity = busy ? 1 : 0.5;
      // queue: slots fill through each (compressed) 30-second tick; when a scan is due they all flash and it leaves
      const fill = s.still || s.phase === 'idle' ? 3 : s.phase === 'emitting' ? 8 : 3 + Math.floor(s.progress * 4); // queue only changes when the scheduler does
      for (let i = 0; i < 8; i++) q.set(i, s.phase === 'emitting' && !s.still ? 0.6 + 0.4 * Math.sin(t * 10) : i < fill ? 0.9 : 0.2);
      q.set(8, 0.5);
      // the job's journey: choose a scan type → set the target → job card → queue → dispatch tray → loaded onto
      // the carrier that leaves over the agent's own connection (i-assign). An approved CyfroAssistant action
      // enters the queue from the east instead (i-approved).
      const lp = localLoop(s);
      const beat = s.beats.includes('i-assign') ? 'assign' : s.beats.includes('i-connect') ? 'connect' : s.beats.includes('i-approved') ? 'approved' : null;
      let k = -1, type = Math.floor(t / 36) % 3, fromEast = false;
      if (s.still) k = 0.9;
      else if (beat === 'connect') k = s.progress * 0.86;
      else if (beat === 'assign') k = 0.86 + s.progress * 0.14;
      else if (beat === 'approved') { k = 0.32 + s.progress * 0.54; fromEast = true; type = 0; }
      else if (lp) { k = lp.k; type = lp.n % 3; }
      for (let i = 0; i < 3; i++) q.set(J.types + i, k < 0 ? 0.15 : i === type && !fromEast ? (k < 0.18 ? (Math.floor(t * 6) % 2 ? 1 : 0.3) : 0.9) : 0.15);
      q.set(J.target, k < 0 || fromEast ? 0.15 : seg(k, 0.18, 0.3) > 0 ? 0.25 + 0.7 * seg(k, 0.18, 0.3) : 0.15);
      let cardOn = k >= 0.32, cs = 1;
      if (cardOn) {
        if (k < 0.48) { const e = seg(k, 0.32, 0.48); if (fromEast) arc(pt, EAST, QIN, e, 0.2); else { arc(pt, CONSOLE, QIN, e, 0.7); cs = Math.min(1, e * 4); } }
        else if (k < 0.72) arc(pt, QIN, QOUT, seg(k, 0.48, 0.72), 0);
        else if (k < 0.86) arc(pt, QOUT, TRAY, seg(k, 0.72, 0.86), 2.1); // lifted over the Scan Setup console
        else { pt[0] = TRAY[0]; pt[1] = TRAY[1]; pt[2] = TRAY[2]; if (beat === 'assign') cs = 1 - seg(s.progress, 0.05, 0.25); if (fromEast) cardOn = false; }
      }
      q.tint(J.card, fromEast ? '#4fbf8b' : '#bfefff');
      q.move(J.card, pt[0], pt[1], pt[2]); q.scale(J.card, cardOn ? Math.max(0.0001, cs) : 0); q.set(J.card, 1.1);
      q.set(J.tray, k >= 0.86 && !fromEast ? (s.still ? 0.8 : 0.55 + 0.45 * Math.sin(t * 6)) : 0.15);
      q.flush();
      if (!s.still && s.level === 1) { op.head.rotation.y = 0.25 * Math.sin(t * 0.5); op.armR.rotation.x = -0.9 + 0.08 * Math.sin(t * 6); }
    },
    paint(cl, _a, red, dark, s) { screens.update(cl, red, dark, s); },
    dispose() { screens.dispose(); q.dispose(); },
  };
};

export const buildDataIngestion: ChunkBuilder = (ctx) => {
  const { kit, m } = ctx; const g = new Group();
  chunkBase(kit, g, m);
  // conveyor running west → east through three stations
  kit.box(g, 4.6, 0.12, 0.6, 0, 0.42, 0.85, m.edge, 0.04); kit.box(g, 4.6, 0.04, 0.48, 0, 0.5, 0.85, m.screen, 0.01);
  // 1 intake hopper (duplicate check + encrypted storage)
  kit.box(g, 1.0, 0.7, 0.9, -1.55, 0.72, 0.0, m.panel, 0.08);
  const hop = kit.cone(g, 0.5, 0.6, -1.55, 1.38, 0.0, m.edge, 4); hop.rotation.y = Math.PI / 4; hop.rotation.x = Math.PI;
  const lockMt = mat(ctx, '#039be0', 0.3); kit.dyn(kit.box(g, 0.24, 0.18, 0.05, -1.55, 0.85, 0.47, lockMt, 0.02));
  // 2 normaliser — the original Data Ingestion station with its four paddles (motion.ts)
  kit.box(g, 1.55, 0.7, 1.3, 0.0, 0.68, -0.1, m.edge, 0.1);
  const paddles = Array.from({ length: 4 }, (_, i) => kit.dyn(kit.box(g, 0.21, 0.16, 0.75, -0.49 + i * 0.33, 1.12, -0.1, i === 1 ? m.blue : m.white, 0.025)));
  const restY = paddles.map((p) => p.position.y);
  // 3 correlator drum + snapshot shelf (ranked blocks)
  kit.box(g, 1.0, 0.4, 1.0, 1.55, 0.43, -0.6, m.panel, 0.08);
  const drum = kit.dyn(kit.cylinder(g, 0.42, 0.9, 1.55, 1.08, -0.6, m.blue, 24)); drum.rotation.z = Math.PI / 2;
  kit.box(g, 1.2, 0.08, 0.5, 1.55, 1.65, -1.5, m.edge, 0.02); kit.box(g, 1.2, 0.08, 0.5, 1.55, 1.15, -1.5, m.edge, 0.02);
  for (const x of [0.98, 2.12]) kit.box(g, 0.06, 1.3, 0.5, x, 1.0, -1.5, m.edge, 0.01);
  // ranking-rule plaque on the correlator: same-run evidence, exposure, severity, CVSS, recency (fixed order)
  kit.box(g, 0.75, 0.42, 0.04, 1.55, 0.95, -0.08, m.screen, 0.01);
  for (let r = 0; r < 5; r++) kit.box(g, 0.55 - r * 0.08, 0.04, 0.01, 1.5 - r * 0.04, 1.1 - r * 0.07, -0.055, r === 0 ? m.orange : m.white, 0);
  // encrypted storage: raw uploads are kept encrypted
  kit.cylinder(g, 0.34, 0.95, 0.2, DECK_TOP + 0.48, -1.55, m.panel, 24);
  for (const y of [0.25, 0.55, 0.85]) kit.cylinder(g, 0.355, 0.04, 0.2, DECK_TOP + y, -1.55, m.edge, 24);
  kit.box(g, 0.2, 0.24, 0.04, 0.2, DECK_TOP + 0.55, -1.2, m.orange, 0.02); // lock plate
  // duplicate chute beside the intake: re-sent payloads (same hash) are set aside, not stored twice
  kit.box(g, 0.5, 0.35, 0.5, -2.2, DECK_TOP + 0.18, 0.75, m.edge, 0.04);
  const chute = kit.box(g, 0.18, 0.06, 0.7, -1.95, DECK_TOP + 0.55, 0.45, m.panel, 0.01); chute.rotation.x = 0.5;
  // records on the line and snapshot blocks on the shelf: glowing data, one draw call
  // routing lamps by the output ports: insight job (east), compliance job and on-demand reads (south)
  for (const [x, z] of [[2.3, 0.0], [1.62, 2.2], [-0.54, 2.2]] as const) kit.box(g, 0.34, 0.32, 0.34, x, DECK_TOP + 0.16, z, m.panel, 0.04);
  const REC_COL = ['#039be0', '#bfefff', '#5caa83']; // the agent's three result crates: network, assets, fingerprinting
  const recs = ledBank(g, [
    ...REC_COL.map((color) => ({ p: [0, 0.58, 0.85] as [number, number, number], s: [0.22, 0.12, 0.28] as [number, number, number], color })),
    ...[0, 1, 2].map((i) => ({ p: [1.2 + i * 0.35, 1.36, -1.5] as [number, number, number], s: [0.3, 0.3, 0.36] as [number, number, number], color: i === 0 ? '#fe904d' : '#039be0' })),
    { p: [-2.2, DECK_TOP + 0.4, 0.75], s: [0.3, 0.03, 0.3], color: '#fe904d' }, // duplicate light
    ...[[2.3, 0.0], [1.62, 2.2], [-0.54, 2.2]].map(([x, z]) => ({ p: [x, DECK_TOP + 0.34, z] as [number, number, number], s: [0.26, 0.03, 0.26] as [number, number, number], color: '#33afdf' })), // 7–9 routing
  ]);
  const rp: [number, number, number] = [0, 0, 0];
  const mon = monitor(kit, g, m, -1.25, 1.75, -1.35, 1.5, 0.95);
  const screens = createCityScreens([{ id: 'ingest', ...mon, group: g }] as CitySlot[], ctx.renderer);
  let drumA = 0; const dtick = clock();
  return {
    group: g,
    update(t, s) {
      const w = s.phase === 'working' || !!s.loop, rec = s.phase === 'receiving';
      paddles.forEach((p, i) => { p.position.y = restY[i] + (s.still || !w ? 0 : 0.1 * Math.pow(Math.max(0, Math.sin(t * 1.8 - i * 0.8)), 4)); });
      drumA += dtick(t) * (w ? 2.2 : 0.05); drum.rotation.x = s.still ? 0 : drumA; // spins up while correlating, then coasts
      lockMt.emissiveIntensity = (rec ? 0.9 : 0.25) + (s.still ? 0 : s.arrive);
      // receive (one record per uploaded crate, as each carrier unloads) → normalise (one format) → correlate
      // into a snapshot → route the jobs and reads downstream. Story-driven; a local 10 s loop when focused.
      const lp = localLoop(s);
      let arr = -1, cor = -1, out = -1;
      if (s.still) out = 1;
      else if (s.beats.includes('i-upload')) arr = s.progress;
      else if (s.beats.includes('i-correlate')) cor = s.progress;
      else if (s.beats.includes('i-fanout')) out = s.progress;
      else if (lp) { if (lp.k < 0.3) arr = lp.k / 0.3; else if (lp.k < 0.78) cor = (lp.k - 0.3) / 0.48; else out = (lp.k - 0.78) / 0.22; }
      for (let i = 0; i < 3; i++) {
        let sc = 0; const restX = -0.95 - 0.32 * i;
        if (arr >= 0) { const at = lp ? 0.15 + 0.25 * i : 0.6 + 0.18 * i, d = seg(arr, at, at + 0.12); if (d > 0) { sc = 1; arc(rp, [-1.55, 1.25, 0.0], [restX, 0.58, 0.85], d, 0.05); } }
        else if (cor >= 0) { const d = seg(cor, 0.05 + 0.12 * i, 0.45 + 0.12 * i); rp[0] = restX + (1.25 - restX) * ease(d); rp[1] = 0.58; rp[2] = 0.85; sc = rp[0] > 1.0 ? 1 - seg(rp[0], 1.0, 1.25) : 1; }
        recs.tint(i, rp[0] > 0 && cor >= 0 ? '#33afdf' : REC_COL[i]); // past the normaliser every record has the same format
        recs.move(i, rp[0], rp[1], rp[2]); recs.scale(i, Math.max(0.0001, sc)); recs.set(i, 0.9);
      }
      for (let i = 0; i < 3; i++) { recs.scale(3 + i, cor >= 0 ? ease((cor - 0.55 - i * 0.12) / 0.15) : 1); recs.set(3 + i, out >= 0 ? 1 : 0.7); }
      recs.set(6, (rec || arr >= 0) && !s.still && Math.floor(t * 3) % 4 === 0 ? 1 : 0.2);
      for (let i = 0; i < 3; i++) recs.set(7 + i, s.still ? 0.6 : out >= 0 && seg(out, i * 0.15, 0.2 + i * 0.15) > 0 ? 0.6 + 0.5 * Math.sin(t * 8) : i === 2 ? 0.15 + s.depart : 0.15);
      recs.flush();
    },
    paint(cl, _a, red, dark, s) { screens.update(cl, red, dark, s); },
    dispose() { screens.dispose(); recs.dispose(); },
  };
};

export const buildCyfroCode: ChunkBuilder = (ctx) => {
  const { kit, m } = ctx; const g = new Group();
  chunkBase(kit, g, m);
  // Your code hosting is the neighbouring pad to the west: clones arrive and approved pull requests leave
  // through the west port (z = +1.35), along one short lane.
  kit.box(g, 1.3, 0.04, 0.5, -2.0, DECK_TOP + 0.02, 1.35, m.edge, 0); // the outbound / inbound lane
  // repository shelf (clones from your code hosting), just south of the lane
  kit.box(g, 1.3, 0.1, 0.6, -1.85, 1.25, 2.1, m.edge, 0.02); kit.box(g, 1.3, 0.1, 0.6, -1.85, 0.65, 2.1, m.edge, 0.02);
  const repoCols = [m.blue, m.white, m.panel, m.blue, m.white];
  repoCols.forEach((mt, i) => kit.box(g, 0.18, 0.5, 0.48, -2.35 + i * 0.25, 0.95, 2.1, mt, 0.03));
  // scanner row: code, secrets, dependencies, IaC
  for (let i = 0; i < 4; i++) {
    kit.box(g, 0.62, 0.9, 0.7, -1.6 + i * 0.75, 0.68, -1.25, m.panel, 0.06);
    kit.box(g, 0.5, 0.28, 0.04, -1.6 + i * 0.75, 0.88, -0.88, m.screen, 0.02);
  }
  const scanLeds = ledBank(g, [
    ...[0, 1, 2, 3].map((i) => ({ p: [-1.6 + i * 0.75, 0.88, -0.85] as [number, number, number], s: [0.32, 0.06, 0.04] as [number, number, number], color: '#33afdf' })),
    // 4–11 findings popping out of the four scanners (code, secrets, dependencies, IaC)
    ...Array.from({ length: 8 }, (_, j) => ({ p: [-1.75 + Math.floor(j / 2) * 0.75 + (j % 2) * 0.3, 1.2, -1.25] as [number, number, number], s: [0.18, 0.08, 0.24] as [number, number, number], color: j % 3 === 0 ? '#fe904d' : '#33afdf' })),
    // 12–16 repository lights: the clone arriving from your code hosting
    ...[0, 1, 2, 3, 4].map((i) => ({ p: [-2.35 + i * 0.25, 1.1, 2.35] as [number, number, number], s: [0.1, 0.06, 0.02] as [number, number, number], color: '#bfefff' })),
    { p: [1.55, 1.19, 0.45], s: [0.16, 0.06, 0.16], color: '#e8f9ff' }, // 17 AI request lamp (explain + draft)
    { p: [0.25, 1.12, 1.1], s: [0.13, 0.13, 0.13], color: '#4fbf8b' }, // 18 validation lamp: the patch applies cleanly
  ]);
  kit.box(g, 0.06, 0.45, 0.06, 0.25, DECK_TOP + 0.6, 1.1, m.edge, 0); // validation post beside the printer
  // operator desk with the original CyfroCode monitor (findings + suggested patch)
  kit.box(g, 1.8, 0.16, 1.0, 0.85, 1.05, 0.15, m.white, 0.07); kit.box(g, 1.4, 0.85, 0.7, 0.85, 0.6, 0.08, m.panel, 0.06);
  const mon = monitor(kit, g, m, 0.85, 1.95, 0.0, 1.45, 1.0);
  // patch printer
  kit.box(g, 0.75, 0.55, 0.6, -0.3, 0.51, 0.75, m.panel, 0.06);
  const sheetMt = mat(ctx, '#e9f1f8', 0.05);
  const sheet = kit.dyn(kit.box(g, 0.42, 0.02, 0.5, -0.3, 0.8, 0.75, sheetMt, 0));
  // shredder bin (rejected drafts are discarded)
  kit.cylinder(g, 0.22, 0.5, -0.3, DECK_TOP + 0.25, 1.75, m.edge, 16, 0.26);
  // approval checkpoint: the barrier arm lies across the pull-request lane, next to the west port
  const bg = new Group(); bg.position.set(-1.45, 0, 0.5); bg.rotation.y = -Math.PI / 2; g.add(bg);
  const barrier = approvalBarrier(kit, bg, m, 0, 0, ctx.owned, 1.25);
  const pr = monitor(kit, g, m, 1.85, 1.55, 1.35, 0.95, 0.66);
  const orig = createScreens([{ id: 'code', ...mon, group: g }] as OrigSlot[], ctx.renderer);
  const screens = createCityScreens([{ id: 'prReview', ...pr, group: g }] as CitySlot[], ctx.renderer);
  const tick = clock();
  return {
    group: g,
    update(t, s) {
      const dt = tick(t), ph = s.phase;
      // repository arrives (clone convoy) → scanners run → findings appear → AI explains and drafts (shared AI
      // layer) → the patch is checked to apply cleanly → waits for a person → published only if approved
      const clone = s.beats.includes('c-clone'), scan = s.beats.includes('c-scan'), draft = s.beats.includes('c-draft');
      for (let i = 0; i < 4; i++) scanLeds.set(i, s.still ? 0.6 : scan ? (cyc(t * 3 - i * 0.5, 2) < 0.6 ? 1.1 : 0.2) : 0.22);
      for (let j = 0; j < 8; j++) { const on = s.still || clone ? (clone ? 0 : 1) : scan ? seg(s.progress, 0.35 + j * 0.07, 0.42 + j * 0.07) : 1; scanLeds.scale(4 + j, Math.max(0.0001, on)); scanLeds.set(4 + j, 0.85); }
      for (let i = 0; i < 5; i++) scanLeds.set(12 + i, s.still ? 0.5 : clone ? (s.progress > 0.5 + i * 0.1 ? 1 : 0.12) + 0.3 * s.arrive : 0.45);
      scanLeds.set(17, draft && s.progress < 0.75 && !s.still ? 0.6 + 0.6 * Math.sin(t * 9) : 0.12);
      const valid = draft ? (s.progress > 0.9 ? 1 : s.progress > 0.78 ? 0.5 : 0) : ph === 'waiting_approval' || ph === 'approved' || ph === 'rejected' ? 1 : 0;
      scanLeds.tint(18, valid === 1 ? '#4fbf8b' : '#33afdf'); scanLeds.set(18, s.still ? 0.8 : valid === 0.5 ? 0.5 + 0.5 * Math.sin(t * 12) : valid ? 1 : 0.1);
      scanLeds.flush();
      // the draft sheet: prints, waits, then leaves west through the barrier (approved) or drops into the shredder (rejected)
      let sx = -0.3, sy = 0.8, sz = 0.75, vis = true;
      if (draft && s.progress > 0.6) sz = 0.75 + 0.35 * ease((s.progress - 0.6) / 0.4);
      else if (ph === 'waiting_approval') sz = 1.1;
      else if (ph === 'approved') { const k = ease(s.progress * 2); sz = 1.1 + 0.25 * k; sx = -0.3 - 2.1 * k; vis = s.progress < 0.5; }
      else if (ph === 'rejected') { const k = ease(s.progress * 2); sz = 1.1 + 0.65 * k; sy = 0.8 - 0.45 * ease(s.progress * 2 - 0.5); vis = s.progress < 0.7; }
      else vis = false;
      sheet.visible = !s.still && vis; sheet.position.set(sx, sy, sz);
      barrier.update(t, ph, s.still, dt);
    },
    paint(cl, act, red, dark, s) { orig.update(cl, act, red, dark, 1); screens.update(cl, red, dark, s); },
    dispose() { orig.dispose(); screens.dispose(); scanLeds.dispose(); },
  };
};
