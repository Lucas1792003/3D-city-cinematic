import { Group, MeshStandardMaterial } from 'three';
import { createScreens } from '../../platform-architecture-3d/screens';
import { createCityScreens } from '../screens/cityScreens';
import { chunkDeck, rack, monitor, deckCable, DECK_TOP, type OrigSlot, type CitySlot } from '../kit/machines';
import { chunkBase } from '../kit/chunkBase';
import { ledBank, type BankItem, type LedBank } from '../kit/ledBank';
import { person } from '../kit/people';
import type { ChunkBuilder, ChunkCtx } from './types';
import { ASSET_TYPES, assetLoop, assetRuns, assetTime } from './assetLoop';
import { localLoop, seg, arc } from './process';
import { FAMILIES, SHARDS, agentState, type AgentStage } from './agentFlow';
import { IDENTIFIED, HIGHLIGHT, FINDINGS, SHARDS as FP_SHARDS, FW, idAt, matchAt, labK, targetOf } from './fingerprintLab';

/**
 * Customer environment: your infrastructure, CyfroAgent and the three discovery scans the agent runs.
 * Animations show the agent's documented behaviour only when the story activates a scan.
 */

const hash = (a: number, b: number) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
const ease = (x: number) => { const v = Math.min(1, Math.max(0, x)); return v * v * (3 - 2 * v); };
const cyc = (t: number, n: number) => ((t % n) + n) % n;
const clock = () => { let prev = -1; return (t: number) => { const dt = prev < 0 || t < prev ? 0 : Math.min(0.1, t - prev); prev = t; return dt; }; };
const mat = (ctx: ChunkCtx, color: string, e = 0) => { const x = new MeshStandardMaterial({ color, roughness: 0.45, emissive: color, emissiveIntensity: e }); ctx.owned.push(x); return x; };
/**
 * Calm independent status blink for LED bank instances: mostly steady, a short flash every few seconds,
 * never in step with its neighbours. `busy` (0..1) shortens the period while the machine is actually working.
 */
function blink(bank: LedBank, idx: number, t: number, i: number, still: boolean, boost = 0, busy = 0) {
  if (still) { bank.set(idx, 0.6); return; }
  const period = (2.6 + hash(i, 1) * 3.4) * (1 - 0.7 * busy), ph = cyc(t + hash(i, 2) * period, period) / period;
  bank.set(idx, 0.42 + 0.45 * ease(ph / 0.04) * (1 - ease((ph - 0.14) / 0.04)) + boost);
}

export const buildCustomerInfra: ChunkBuilder = (ctx) => {
  const { kit, m } = ctx; const g = new Group();
  chunkDeck(kit, g, m, m.customerPanel, m.edge);
  const items: BankItem[] = [];
  rack(kit, g, m, -1.6, -1.4, 2.65, items); rack(kit, g, m, -0.25, -1.6, 2.4, items);
  const nRack = items.length;
  // container stack (the original Data Sources stack)
  for (let r = 0; r < 3; r++) kit.box(g, 1.25, 0.44, 1.0, 1.4, 0.55 + r * 0.5, -1.45, r === 1 ? m.blue : m.panel, 0.055);
  // router with ports and antenna (original Network device)
  kit.box(g, 1.5, 0.5, 1.1, 1.1, 0.6, 1.25, m.screen, 0.06);
  for (let p = 0; p < 5; p++) items.push({ p: [0.66 + p * 0.22, 0.63, 1.82], s: [0.16, 0.11, 0.035], color: p === 3 ? '#fe904d' : '#039be0' });
  // core switch where the rack and router cables meet, and a firewall at the edge of the network
  kit.box(g, 0.95, 0.2, 0.55, 0.35, DECK_TOP + 0.12, 0.3, m.screen, 0.04);
  for (let p = 0; p < 8; p++) items.push({ p: [0.0 + p * 0.1, DECK_TOP + 0.14, 0.58], s: [0.06, 0.05, 0.02], color: '#039be0' });
  kit.box(g, 0.6, 0.55, 0.95, 1.95, DECK_TOP + 0.28, 0.05, m.panel, 0.05);
  kit.box(g, 0.62, 0.08, 0.97, 1.95, DECK_TOP + 0.45, 0.05, m.orange, 0.01);
  items.push({ p: [1.64, DECK_TOP + 0.28, 0.05], s: [0.02, 0.08, 0.3], color: '#4fbf8b' });
  // a laptop on a small table (one more host the scans can see)
  kit.box(g, 0.75, 0.06, 0.5, -0.15, DECK_TOP + 0.55, 1.95, m.white, 0.02); kit.box(g, 0.08, 0.5, 0.08, -0.15, DECK_TOP + 0.27, 1.95, m.edge, 0);
  kit.box(g, 0.42, 0.02, 0.28, -0.15, DECK_TOP + 0.6, 1.98, m.edge, 0); const lid = kit.box(g, 0.42, 0.28, 0.02, -0.15, DECK_TOP + 0.74, 1.84, m.screen, 0); lid.rotation.x = -0.25;
  const bank = ledBank(g, items); // rack LEDs + router ports + switch ports + firewall: one draw call
  kit.cylinder(g, 0.08, 0.9, 1.65, 1.32, 0.9, m.edge);
  // workstation
  kit.box(g, 1.4, 0.16, 0.8, -1.2, 0.98, 1.2, m.white, 0.06); kit.box(g, 1.1, 0.72, 0.6, -1.2, 0.58, 1.12, m.panel, 0.05);
  kit.box(g, 0.95, 0.62, 0.08, -1.2, 1.45, 0.95, m.edge, 0.04); kit.box(g, 0.85, 0.52, 0.03, -1.2, 1.45, 1.0, m.screen, 0.02);
  deckCable(kit, g, m, [-1.6, -0.6], [-1.6, 0.3]); deckCable(kit, g, m, [-1.6, 0.3], [0.35, 0.3]); deckCable(kit, g, m, [0.35, 0.3], [0.35, 1.25]);
  const scanMt = mat(ctx, '#33afdf', 0.9);
  const scan = kit.dyn(kit.box(g, 1.16, 0.035, 0.02, -1.6, 0.5, -0.735, scanMt, 0)); scan.visible = false;
  const tick = clock();
  return {
    group: g,
    update(t, s) {
      tick(t);
      for (let i = 0; i < nRack; i++) blink(bank, i, t, i, s.still);
      const probed = s.phase === 'receiving' ? 1 : 0;
      for (let i = 0; i < 5; i++) blink(bank, nRack + i, t, i + 20, s.still, probed && i === 1 ? 0.5 : 0, probed);
      for (let i = 0; i < 8; i++) blink(bank, nRack + 5 + i, t, i + 40, s.still, 0, probed);
      bank.set(nRack + 13, 0.6);
      bank.flush();
      scan.visible = !s.still && s.phase === 'receiving';
      if (scan.visible) scan.position.y = 0.42 + cyc(t * 0.8, 1) * 2.5;
    },
    dispose() { bank.dispose(); },
  };
};

export const buildCyfroAgent: ChunkBuilder = (ctx) => {
  const { kit, m } = ctx; const g = new Group(); const T = DECK_TOP;
  chunkBase(kit, g, m);
  /*
   * CyfroAgent as a working collection station (facts and sources: agentFlow.ts):
   *   connected over its own outbound stream → a signed command arrives over that stream → the port-scan,
   *   asset-discovery and fingerprint modules run → their results are collected into the buffer and packed →
   *   the packs leave as the upload convoy (shared transport) → run complete → waiting for work.
   */
  // ── the original agent appliance, now on a plinth with vents, a side equipment panel and a result buffer ──
  kit.box(g, 2.2, 0.1, 1.8, -0.2, T + 0.05, 0.1, m.edge, 0.03);
  kit.box(g, 1.9, 1.15, 1.5, -0.2, 0.86, 0.1, m.panel, 0.1);
  kit.box(g, 1.94, 0.08, 1.54, -0.2, 1.47, 0.1, m.edge, 0.02);
  kit.box(g, 1.3, 0.5, 0.045, -0.2, 0.98, 0.87, m.screen, 0.025);
  const slots: OrigSlot[] = [{ id: 'agentScr', center: [-0.2, 0.98, 0.8935], w: 1.3, h: 0.5, group: g }];
  for (let i = 0; i < 5; i++) kit.box(g, 0.03, 0.72, 0.09, -1.165, 0.86, -0.42 + i * 0.25, m.edge, 0); // west cooling fins
  for (let i = 0; i < 4; i++) kit.box(g, 1.4, 0.04, 0.03, -0.2, 0.55 + i * 0.17, -0.665, m.edge, 0); // north vent slats
  kit.box(g, 0.04, 0.55, 1.0, 0.77, 0.86, 0.1, m.screen, 0.01); // east equipment panel with network connectors
  for (const [y, z] of [[0.72, -0.2], [0.72, 0.3], [1.0, -0.2], [1.0, 0.3]] as const) kit.cylinder(g, 0.045, 0.07, 0.8, y, z, m.edge, 10).rotation.z = Math.PI / 2;
  kit.box(g, 1.34, 0.28, 0.04, -0.2, 0.52, 0.875, m.glass, 0.01); // result buffer window (below the screen)
  const lights = ledBank(g, [0, 1, 2].map((r) => ({ p: [-0.5 + r * 0.3, 1.33, 0.88] as [number, number, number], s: [0.1, 0.1, 0.035] as [number, number, number], color: r === 2 ? '#fe904d' : '#039be0' })));
  // container badge on top: the agent is a Docker container on your host
  kit.box(g, 0.7, 0.32, 0.5, -0.55, 1.67, 0.05, m.blue, 0.05); for (let i = 0; i < 3; i++) kit.box(g, 0.14, 0.12, 0.52, -0.77 + i * 0.22, 1.67, 0.05, m.white, 0.02);
  // outbound uplink: conduit to the east edge, toward the one gate in the wall
  kit.box(g, 1.7, 0.18, 0.34, 1.6, 0.42, -0.97, m.edge, 0.05); kit.box(g, 1.7, 0.18, 0.34, 1.6, 0.42, 0.97, m.edge, 0.05);
  kit.box(g, 0.34, 0.9, 0.34, 0.85, 0.72, -0.97, m.screen, 0.05);
  const upMt = mat(ctx, '#33afdf', 0.2), outMt = mat(ctx, '#33afdf', 0.2);
  const ring = kit.dyn(kit.torus(g, 0.22, 0.035, 0.85, 1.22, -0.97, upMt)); ring.rotation.x = Math.PI / 2;
  // outbound chevron on the deck: CyfroSec never connects in
  const chev = new Group(); chev.position.set(2.1, T + 0.03, 0.42); g.add(chev);
  for (const sgn of [-1, 1]) { const b2 = kit.box(chev, 0.6, 0.04, 0.12, 0, 0, sgn * 0.17, outMt, 0); b2.rotation.y = sgn * -0.7; }
  const scanMt = mat(ctx, '#33afdf', 0.9);
  const scan = kit.dyn(kit.box(g, 0.03, 0.44, 0.01, -0.85, 0.98, 0.9, scanMt, 0)); scan.visible = false;
  for (let i = 0; i < 3; i++) kit.box(g, 0.2, 0.14, 0.5, 0.15 + i * 0.25, 1.58, 0.15, m.screen, 0.02); // the three scan modules' slots
  // ── collection modules, each with its own equipment ──
  // port scan (Nmap), east between the conduits: a probe mast and a socket panel — probed ports light in turn,
  // open ones stay lit
  kit.box(g, 0.62, 0.45, 0.45, 1.5, T + 0.225, -0.35, m.panel, 0.04);
  kit.box(g, 0.56, 0.3, 0.03, 1.5, T + 0.24, -0.12, m.screen, 0.01);
  kit.cylinder(g, 0.025, 0.5, 1.72, T + 0.7, -0.45, m.edge, 8); kit.sphere(g, 0.05, 1.72, T + 0.97, -0.45, m.blue, 10);
  // fingerprinting (Trivy), west: host-filesystem platters with a read arm, a container image, and shard lamps
  kit.box(g, 0.6, 0.15, 0.5, -1.8, T + 0.075, 0.95, m.panel, 0.03);
  kit.cylinder(g, 0.03, 0.3, -1.95, T + 0.3, 0.95, m.edge, 8);
  for (const y of [0.2, 0.27]) kit.cylinder(g, 0.2, 0.025, -1.95, T + y, 0.95, m.white, 24);
  const platter = kit.dyn(new Group()); platter.position.set(-1.95, T + 0.34, 0.95); g.add(platter);
  kit.cylinder(platter, 0.2, 0.025, 0, 0, 0, m.white, 24); kit.box(platter, 0.16, 0.02, 0.03, 0.1, 0.02, 0, m.blue, 0);
  kit.box(g, 0.3, 0.28, 0.3, -1.48, T + 0.29, 0.92, m.blue, 0.04); for (let i = 0; i < 2; i++) kit.box(g, 0.32, 0.05, 0.32, -1.48, T + 0.24 + i * 0.1, 0.92, m.white, 0.01);
  // asset discovery, west: a listener with a small dish (passive ARP / LLDP / DHCP observations, active probes)
  kit.box(g, 0.5, 0.4, 0.55, -1.8, T + 0.2, 0.1, m.panel, 0.04);
  kit.cylinder(g, 0.03, 0.3, -1.8, T + 0.55, 0.1, m.edge, 8);
  const dish = kit.dyn(new Group()); dish.position.set(-1.8, T + 0.72, 0.1); g.add(dish);
  const dsh = kit.cylinder(dish, 0.18, 0.04, 0, 0, 0, m.panel, 20, 0.22); dsh.rotation.x = 0.9;
  kit.cylinder(dish, 0.015, 0.18, 0, 0.06, 0.08, m.edge, 6).rotation.x = 0.9; kit.sphere(dish, 0.03, 0, 0.12, 0.15, m.blue, 8);
  deckCable(kit, g, m, [1.19, -0.35], [0.85, -0.35]); deckCable(kit, g, m, [-1.55, 0.1], [-1.25, 0.1]); deckCable(kit, g, m, [-1.5, 0.95], [-1.3, 0.95]);
  // ── packaging (south): the press packs each scan's results; packs leave through the upload port ──
  kit.box(g, 0.75, 0.75, 0.6, -0.35, T + 0.375, 1.75, m.panel, 0.06);
  kit.box(g, 0.08, 0.5, 0.08, -0.62, T + 1.0, 1.75, m.edge, 0); kit.box(g, 0.08, 0.5, 0.08, -0.08, T + 1.0, 1.75, m.edge, 0);
  kit.box(g, 0.66, 0.08, 0.3, -0.35, T + 1.25, 1.75, m.edge, 0.02);
  const press = kit.dyn(kit.box(g, 0.42, 0.1, 0.36, -0.35, T + 1.0, 1.75, m.blue, 0.02));
  kit.box(g, 2.0, 0.14, 0.42, 1.0, T + 0.07, 1.75, m.edge, 0.03);
  deckCable(kit, g, m, [-0.35, 0.95], [-0.35, 1.45]);
  // ── agent status screen (south-west) ──
  kit.box(g, 0.5, 0.55, 0.4, -1.9, T + 0.275, 1.55, m.panel, 0.04);
  const stat = monitor(kit, g, m, -1.9, 1.55, 1.48, 0.95, 0.6);
  // ── every lamp and moving block: one instanced bank ──
  const items: BankItem[] = []; const add = (it: BankItem) => items.push(it) - 1;
  const crate = FAMILIES.map((f) => add({ p: [0, -5, 0], s: [0.3, 0.24, 0.3], color: f.color }));
  const recBlk = FAMILIES.map((f) => add({ p: [0, -5, 0], s: [0.16, 0.1, 0.2], color: f.color }));
  const sock = Array.from({ length: 8 }, (_, i) => add({ p: [1.305 + (i % 4) * 0.13, T + (i < 4 ? 0.3 : 0.18), -0.1], s: [0.09, 0.08, 0.02], color: '#039be0' }));
  const OPEN = [1, 4, 6];
  const shard = Array.from({ length: SHARDS }, (_, i) => add({ p: [-1.98 + i * 0.14, T + 0.08, 1.205], s: [0.1, 0.06, 0.02], color: '#5caa83' }));
  const obs = [0, 1, 2].map((i) => add({ p: [-1.95 + i * 0.15, T + 0.28, 0.38], s: [0.1, 0.06, 0.02], color: '#bfefff' })); // ARP · LLDP · DHCP
  const buf = FAMILIES.map((f, i) => add({ p: [-0.62 + i * 0.42, 0.52, 0.86], s: [0.34, 0.16, 0.02], color: f.color }));
  const STAGES: AgentStage[] = ['waiting', 'connected', 'command', 'scan', 'collect', 'upload', 'complete'];
  const stg = STAGES.map((_, i) => add({ p: [-0.95 + i * 0.2, 1.52, 0.78], s: [0.12, 0.05, 0.1], color: i === 6 ? '#4fbf8b' : i === 2 ? '#bfefff' : '#33afdf' }));
  const iSigned = add({ p: [0.85, 1.4, -0.97], s: [0.12, 0.12, 0.12], color: '#bfefff' }); // signed command received (over the agent's own stream)
  const iBeat = add({ p: [1.3, 0.53, -0.97], s: [0.12, 0.03, 0.12], color: '#4fbf8b' }); // heartbeat on the uplink
  const link = [0, 1, 2, 3].map((i) => add({ p: [0.79, i < 2 ? 0.82 : 1.1, i % 2 ? 0.3 : -0.2], s: [0.02, 0.05, 0.05], color: '#4fbf8b' }));
  const mods = FAMILIES.map((_, i) => add({ p: [0.15 + i * 0.25, 1.58, 0.41], s: [0.14, 0.06, 0.02], color: '#33afdf' }));
  const bank = ledBank(g, items);
  const SLOT = (i: number): [number, number, number] => [0.45 + i * 0.42, T + 0.26, 1.75];
  const FROM: [number, number, number][] = [[1.5, T + 0.5, -0.1], [-1.55, T + 0.45, 0.1], [-1.48, T + 0.5, 1.05]];
  const PRESS: [number, number, number] = [-0.35, T + 0.87, 1.75], OUT: [number, number, number] = [2.45, T + 0.5, 0.97];
  const cp: [number, number, number] = [0, 0, 0];
  const screens = createScreens(slots, ctx.renderer);
  const statScreens = createCityScreens([{ id: 'agentStatus', ...stat, group: g }] as CitySlot[], ctx.renderer);
  let dishA = 0, platA = 0; const tick = clock();
  return {
    group: g,
    update(t, s) {
      const dt = tick(t), A = agentState(s), run = !s.still && A.stage !== 'waiting';
      lights.set(0, 0.85); lights.set(1, run && (A.stage === 'scan' || A.stage === 'collect' || A.stage === 'upload') ? 0.5 + 0.45 * Math.sin(t * 6) : 0.35); lights.set(2, 0.12); lights.flush(); // orange = retry queue: empty
      const emit = s.phase === 'emitting' || s.phase === 'receiving';
      upMt.emissiveIntensity = s.still ? 0.4 : 0.3 + (emit ? 0.9 * (0.5 + 0.5 * Math.sin(t * 9)) : 0);
      outMt.emissiveIntensity = s.still ? 0.5 : 0.35 + (A.stage === 'upload' ? 0.7 * (0.5 + 0.5 * Math.sin(t * 4)) : 0);
      scan.visible = run && A.stage === 'scan'; if (scan.visible) scan.position.x = -0.85 + cyc(t * 0.9, 1) * 1.3;
      // modules: only the one whose scan is running works, each in its own way
      FAMILIES.forEach((_, i) => bank.set(mods[i], run && A.fam === i && A.stage === 'scan' ? 0.75 + 0.25 * Math.sin(t * 9) : 0.22));
      const portRun = A.fam === 0 && A.stage === 'scan' && run;
      sock.forEach((idx, i) => { const probed = portRun ? A.k * 9 > i : A.done > 0 || s.still; bank.set(idx, portRun && Math.floor(A.k * 9) === i ? 1.3 : probed ? (OPEN.includes(i) ? 0.95 : 0.14) : 0.1); });
      const assetRun = A.fam === 1 && A.stage === 'scan' && run;
      dishA += dt * (assetRun ? 1.6 : 0.05); dish.rotation.y = s.still ? 0.4 : dishA;
      obs.forEach((idx, i) => bank.set(idx, assetRun ? (Math.floor(t * 3) % 3 === i ? 1.1 : 0.3) : A.done > 1 || s.still ? 0.55 : 0.12));
      const fpRun = A.fam === 2 && A.stage === 'scan' && run;
      platA += dt * (fpRun ? 9 : 0); platter.rotation.y = platA;
      shard.forEach((idx, i) => bank.set(idx, i < A.shards ? 0.95 : fpRun ? 0.2 : 0.1));
      // results: a record block travels from its module to the press, which packs it; packs wait, then leave
      const collecting = A.stage === 'collect' && run, forming = collecting ? A.fam : -1, form = collecting ? A.k : 0;
      // after the upload the packs are gone (complete); reduced motion shows them packed, ready to leave
      const done = A.stage === 'collect' ? A.fam : A.stage === 'complete' && !s.still ? 0 : A.done, leaving = A.stage === 'upload' && run ? A.upload : -1;
      press.position.y = T + 1.0 - (forming >= 0 ? 0.32 * Math.sin(Math.PI * seg(form, 0.35, 0.75)) : 0);
      FAMILIES.forEach((_, i) => {
        const r = recBlk[i];
        if (i === forming && form < 0.45) { arc(cp, FROM[i], PRESS, form / 0.45, 0.4); bank.move(r, cp[0], cp[1], cp[2]); bank.scale(r, 1); } else bank.scale(r, 0.0001);
        bank.set(r, 1.1);
        let sc = 0;
        if (i < done) { sc = 1; [cp[0], cp[1], cp[2]] = SLOT(i); }
        if (i === forming && form >= 0.45) { sc = 1; arc(cp, PRESS, SLOT(i), seg(form, 0.45, 1), 0.15); }
        if (leaving >= 0 && i < done) { const k = seg(leaving, 0.06 + i * 0.18, 0.2 + i * 0.18); if (k > 0) { arc(cp, SLOT(i), OUT, k, 0.25); sc = 1 - seg(k, 0.75, 1); } }
        bank.move(crate[i], cp[0], cp[1], cp[2]); bank.scale(crate[i], Math.max(0.0001, sc)); bank.set(crate[i], 0.75);
        // result buffer behind the window: filled when collected, drained as it uploads
        const inBuf = i < done || (i === forming && form > 0.5);
        bank.set(buf[i], inBuf ? (leaving >= 0 && seg(leaving, 0.06 + i * 0.18, 0.2 + i * 0.18) > 0.5 ? 0.15 : 0.85) : 0.08);
      });
      // run-state lamps, signed-command lamp, heartbeat, link lamps
      const si = STAGES.indexOf(A.stage);
      stg.forEach((idx, i) => bank.set(idx, i === si ? (run && i !== 6 ? 0.8 + 0.3 * Math.sin(t * 6) : 1) : 0.1));
      bank.set(iSigned, A.stage === 'command' && run ? 0.5 + 0.7 * Math.max(s.arrive, 0.5 + 0.5 * Math.sin(t * 7)) : 0.12);
      bank.set(iBeat, s.still ? 0.6 : Math.max(s.depart > 0 && A.stage === 'connected' ? 1 : 0, cyc(t, 6) < 0.2 ? 0.9 : 0.25)); // heartbeat (illustrative cadence)
      link.forEach((idx, i) => bank.set(idx, 0.35 + (A.stage === 'upload' && run && Math.floor(t * 6 + i) % 2 ? 0.6 : 0)));
      bank.flush();
    },
    paint(cl, act, red, dark, s) { screens.update(cl, true, red, dark, 1); statScreens.update(cl, red, dark, s); void act; },
    dispose() { screens.dispose(); statScreens.dispose(); lights.dispose(); bank.dispose(); },
  };
};

export const buildNetworkDiscovery: ChunkBuilder = (ctx) => {
  const { kit, m } = ctx; const g = new Group();
  chunkBase(kit, g, m);
  // antenna mast with a sweeping head
  kit.cylinder(g, 0.45, 0.3, -0.6, DECK_TOP + 0.15, -0.4, m.edge, 24);
  kit.cylinder(g, 0.09, 2.5, -0.6, DECK_TOP + 1.55, -0.4, m.panel, 16);
  const head = kit.dyn(new Group()); head.position.set(-0.6, DECK_TOP + 2.85, -0.4); g.add(head);
  kit.box(head, 1.1, 0.12, 0.12, 0.3, 0, 0, m.edge, 0.03);
  const tipMt = mat(ctx, '#33afdf', 0.3); kit.sphere(head, 0.1, 0.85, 0, 0, tipMt, 12);
  const sweepMt = mat(ctx, '#33afdf', 0.6); sweepMt.transparent = true; sweepMt.opacity = 0.25; sweepMt.depthWrite = false;
  const arc = kit.dyn(kit.torus(g, 1.05, 0.02, -0.6, DECK_TOP + 0.06, -0.4, sweepMt, Math.PI * 0.5)); arc.rotation.x = -Math.PI / 2;
  // port board
  kit.box(g, 1.6, 1.1, 0.3, 1.0, 0.85, -1.4, m.screen, 0.06);
  const ports = ledBank(g, Array.from({ length: 8 }, (_, i) => ({ p: [0.55 + (i % 4) * 0.3, 1.05 - Math.floor(i / 4) * 0.36, -1.23] as [number, number, number], s: [0.2, 0.16, 0.04] as [number, number, number], color: i === 5 ? '#fe904d' : '#039be0' })));
  const mon = monitor(kit, g, m, 0.95, 1.55, 1.2, 1.45, 0.9);
  const screens = createCityScreens([{ id: 'portscan', ...mon, group: g }] as CitySlot[], ctx.renderer);
  // probe range rings around the mast
  for (const r of [1.45, 1.9]) kit.torus(g, r, 0.015, -0.6, DECK_TOP + 0.02, -0.4, m.edge).rotation.x = Math.PI / 2;
  // scanner unit (the port scan the agent runs) with a status row, cabled to the mast
  kit.box(g, 1.15, 0.6, 0.75, -1.65, DECK_TOP + 0.3, 1.45, m.panel, 0.06);
  kit.box(g, 0.95, 0.12, 0.04, -1.65, DECK_TOP + 0.42, 1.84, m.screen, 0.01);
  deckCable(kit, g, m, [-0.6, 0.15], [-0.6, 1.5]); deckCable(kit, g, m, [-0.6, 1.5], [0.4, 1.5]); deckCable(kit, g, m, [-1.1, 1.5], [-0.6, 1.5]);
  // "services found" card rack: a card slides in for each service the scan reports
  kit.box(g, 0.7, 1.3, 0.55, 2.05, DECK_TOP + 0.65, 0.05, m.screen, 0.05);
  const svc = ledBank(g, [
    ...Array.from({ length: 6 }, (_, i) => ({ p: [-1.95 + i * 0.16, DECK_TOP + 0.42, 1.865] as [number, number, number], s: [0.1, 0.06, 0.02] as [number, number, number], color: '#33afdf' })),
    ...Array.from({ length: 6 }, (_, i) => ({ p: [2.05, DECK_TOP + 0.2 + i * 0.19, 0.34] as [number, number, number], s: [0.55, 0.12, 0.03] as [number, number, number], color: i === 2 ? '#fe904d' : '#039be0' })),
  ]);
  // network map table: hosts appear as the sweep reaches them, then the links between them light
  kit.box(g, 1.25, 0.55, 1.05, -1.85, DECK_TOP + 0.275, -1.85, m.panel, 0.06);
  kit.box(g, 1.1, 0.03, 0.9, -1.85, DECK_TOP + 0.56, -1.85, m.screen, 0);
  const NODES: [number, number][] = [[-2.25, -2.15], [-1.85, -2.2], [-1.45, -2.05], [-2.15, -1.6], [-1.6, -1.55], [-1.85, -1.85]];
  const LINKS: [number, number][] = [[5, 0], [5, 1], [5, 2], [5, 3], [5, 4], [1, 2], [3, 4]];
  const map = ledBank(g, [
    ...NODES.map(([x, z], i) => ({ p: [x, DECK_TOP + 0.64, z] as [number, number, number], s: [0.1, 0.1, 0.1] as [number, number, number], color: i === 5 ? '#fe904d' : '#33afdf' })),
    ...LINKS.map(([a, b]) => { const [x1, z1] = NODES[a], [x2, z2] = NODES[b]; return { p: [(x1 + x2) / 2, DECK_TOP + 0.6, (z1 + z2) / 2] as [number, number, number], s: [Math.hypot(x2 - x1, z2 - z1), 0.015, 0.025] as [number, number, number], color: '#bfefff', rotY: -Math.atan2(z2 - z1, x2 - x1) }; }),
    { p: [2.45, DECK_TOP + 0.45, 0.05], s: [0.05, 0.3, 0.5], color: '#4fbf8b' }, // results ready (toward the agent, east)
  ]);
  deckCable(kit, g, m, [-1.85, -1.3], [-1.85, -0.4]); deckCable(kit, g, m, [-1.85, -0.4], [-1.05, -0.4]);
  let ang = 0; const tick = clock();
  return {
    group: g,
    update(t, s) {
      const dt = tick(t), lp = localLoop(s), working = s.phase === 'working' || !!lp, prog = lp ? lp.k : s.progress;
      ang += dt * (working ? 2.6 : 0.1); head.rotation.y = s.still ? 0.6 : ang; arc.rotation.z = s.still ? 0 : ang;
      // scan → hosts appear → connections light → findings ready for the agent
      for (let i = 0; i < 6; i++) { const k = s.still || !working ? 1 : seg(prog, 0.1 + i * 0.08, 0.16 + i * 0.08); map.scale(i, Math.max(0.0001, k)); map.set(i, k >= 1 && working && Math.floor(prog * 50) % 6 === i ? 1.2 : 0.75); }
      for (let i = 0; i < LINKS.length; i++) map.set(6 + i, s.still || !working ? 0.45 : seg(prog, 0.55 + i * 0.04, 0.6 + i * 0.04) > 0 ? 0.9 : 0.06);
      map.set(6 + LINKS.length, s.still ? 0.6 : working && prog > 0.85 ? 0.6 + 0.4 * Math.sin(t * 10) : 0.15 + 0.85 * s.depart);
      map.flush();
      sweepMt.opacity = s.still ? 0.2 : working ? 0.45 : 0.15;
      tipMt.emissiveIntensity = working ? 0.6 + 0.4 * Math.sin(t * 10) : 0.25;
      for (let i = 0; i < 8; i++) ports.set(i, s.still ? 0.6 : working ? (i < Math.floor(prog * 9) ? 1 : 0.18) : 0.32);
      ports.flush();
      for (let i = 0; i < 6; i++) svc.set(i, s.still ? 0.5 : working ? (Math.floor(t * 12) % 6 === i ? 1 : 0.2) : 0.2);
      for (let i = 0; i < 6; i++) { const on = s.still || !working ? 1 : ease((prog - i * 0.13) / 0.12); svc.scale(6 + i, on); svc.set(6 + i, 0.75); }
      svc.flush();
    },
    paint(cl, _a, red, dark, s) { screens.update(cl, red, dark, s); },
    dispose() { screens.dispose(); ports.dispose(); svc.dispose(); map.dispose(); },
  };
};

/**
 * Asset Discovery reads left → right, back → front as one pipeline:
 *   radar (scan pulse) → a device answers → identify console + ID arch → sorter belt and diverter
 *   → six inventory bins by device type → inventory board and catalog drawers (counts).
 * The loop is shared with both screens (assetLoop.ts). It runs in full when focused or during the story's
 * asset step; otherwise the chunk shows a still "just added" frame.
 */
const BIN_X = [-1.45, -0.72, 0.01, 0.74, 1.47, 2.2];
const BLIPS: [number, number][] = [[0.05, -0.5], [-2.2, -0.85], [-0.15, -2.2], [0.5, 0.3], [-0.45, 0.35], [0.95, -1.05], /* already known */ [1.55, -0.55], [1.85, 0.3], [1.2, 0.1], [0.35, -1.2]];
function deviceIcon(kit: ChunkCtx['kit'], g: Group, m: ChunkCtx['m'], type: number, x: number, y: number, z: number) {
  if (type === 0) { // server
    kit.box(g, 0.2, 0.32, 0.18, x, y + 0.16, z, m.screen, 0.02);
    for (let r = 0; r < 3; r++) kit.box(g, 0.15, 0.03, 0.01, x, y + 0.07 + r * 0.09, z + 0.095, m.blue, 0);
  } else if (type === 1) { // workstation
    kit.box(g, 0.34, 0.22, 0.04, x, y + 0.24, z, m.edge, 0.015); kit.box(g, 0.29, 0.17, 0.01, x, y + 0.24, z + 0.025, m.blue, 0);
    kit.box(g, 0.04, 0.12, 0.04, x, y + 0.07, z - 0.01, m.edge, 0); kit.box(g, 0.18, 0.02, 0.11, x, y + 0.01, z, m.edge, 0);
  } else if (type === 2) { // router
    kit.box(g, 0.34, 0.08, 0.2, x, y + 0.04, z, m.panel, 0.02);
    for (const dx of [-0.12, 0.12]) kit.cylinder(g, 0.015, 0.22, x + dx, y + 0.19, z - 0.06, m.edge, 6);
    kit.box(g, 0.2, 0.025, 0.01, x, y + 0.04, z + 0.103, m.orange, 0);
  } else if (type === 3) { // printer
    kit.box(g, 0.32, 0.16, 0.24, x, y + 0.08, z, m.white, 0.03);
    kit.box(g, 0.2, 0.1, 0.015, x, y + 0.2, z - 0.08, m.white, 0); kit.box(g, 0.24, 0.02, 0.04, x, y + 0.165, z + 0.05, m.edge, 0);
  } else if (type === 4) { // IoT / camera
    kit.cylinder(g, 0.03, 0.12, x, y + 0.06, z, m.edge, 8); kit.sphere(g, 0.1, x, y + 0.17, z, m.panel, 14);
    kit.sphere(g, 0.04, x, y + 0.16, z + 0.08, m.blue, 10);
  } else { // virtual machine: a glass shell with a workload inside
    kit.box(g, 0.26, 0.26, 0.26, x, y + 0.13, z, m.glass, 0.03); kit.box(g, 0.12, 0.12, 0.12, x, y + 0.13, z, m.blue, 0.02);
  }
}

export const buildAssetDiscovery: ChunkBuilder = (ctx) => {
  const { kit, m } = ctx; const g = new Group(); const T = DECK_TOP;
  chunkBase(kit, g, m);
  const items: BankItem[] = []; const add = (it: BankItem) => items.push(it) - 1;

  // ── 1 · scan: radar unit — housing, turntable, mast and the rotating dish ──
  const RX = -0.75, RZ = -1.35;
  kit.box(g, 1.0, 0.5, 1.0, RX, T + 0.25, RZ, m.panel, 0.08);
  kit.box(g, 1.06, 0.07, 1.06, RX, T + 0.53, RZ, m.edge, 0.02);
  for (const dx of [-0.3, -0.1, 0.1, 0.3]) kit.box(g, 0.12, 0.2, 0.02, RX + dx, T + 0.24, RZ + 0.51, m.edge, 0);
  const iRadar = add({ p: [RX, T + 0.41, RZ + 0.515], s: [0.72, 0.05, 0.02], color: '#33afdf' });
  kit.cylinder(g, 0.32, 0.16, RX, T + 0.64, RZ, m.edge, 24);
  kit.cylinder(g, 0.1, 0.75, RX, T + 1.08, RZ, m.panel, 16);
  const dish = kit.dyn(new Group()); dish.position.set(RX, T + 1.55, RZ); g.add(dish);
  const d = kit.cylinder(dish, 0.55, 0.07, 0, 0, 0, m.panel, 32, 0.62); d.rotation.x = 0.9;
  const dr = kit.torus(dish, 0.6, 0.03, 0, 0, 0, m.blue); dr.rotation.x = 0.9 + Math.PI / 2;
  kit.cylinder(dish, 0.04, 0.55, 0, 0.18, 0.2, m.edge, 8).rotation.x = 0.9;
  // scan pulses: rings that expand across the deck from the radar
  const pulses = [0, 1].map(() => {
    const mt = mat(ctx, '#33afdf', 0.9); mt.transparent = true; mt.depthWrite = false; mt.opacity = 0;
    const r = kit.dyn(kit.torus(g, 1, 0.02, RX, T + 0.04, RZ, mt)); r.rotation.x = Math.PI / 2; r.visible = false;
    return { r, mt };
  });
  // the local subnet: a gridded floor field with device pucks whose lights answer when the pulse reaches them
  kit.box(g, 2.6, 0.01, 1.8, 1.15, T + 0.005, -0.4, m.screen, 0);
  for (let i = 0; i <= 4; i++) kit.box(g, 0.015, 0.012, 1.8, -0.15 + i * 0.65, T + 0.012, -0.4, m.edge, 0);
  for (let i = 0; i <= 3; i++) kit.box(g, 2.6, 0.012, 0.015, 1.15, T + 0.012, -1.3 + i * 0.6, m.edge, 0);
  for (const [x, z] of BLIPS) kit.cylinder(g, 0.11, 0.06, x, T + 0.03, z, m.edge, 14);
  const blips = ledBank(g, [
    ...BLIPS.map(([x, z]) => ({ p: [x, T + 0.12, z] as [number, number, number], s: [0.11, 0.11, 0.11] as [number, number, number], color: '#33afdf' })),
    { p: [0, -5, 0], s: [0.15, 0.15, 0.15], color: '#bfefff' }, // the "device answered" packet
  ], 'sphere');
  const iPacket = BLIPS.length; // after the device lights
  // DHCP / neighbour listener in the corner, cabled to the radar
  kit.box(g, 0.55, 0.36, 0.42, -2.1, T + 0.18, -2.1, m.panel, 0.04);
  kit.cylinder(g, 0.03, 0.6, -1.92, T + 0.66, -2.1, m.edge, 8);
  const iListen = add({ p: [-2.1, T + 0.22, -1.885], s: [0.3, 0.05, 0.02], color: '#33afdf' });
  deckCable(kit, g, m, [-2.1, -1.85], [-2.1, -1.35]); deckCable(kit, g, m, [-2.1, -1.35], [-1.25, -1.35]);

  // ── 2 · identify: console with the steps screen, and an ID arch over the intake pad ──
  const CX = -1.7, CZ = 0.12;
  kit.box(g, 1.3, 0.72, 0.62, CX, T + 0.36, CZ, m.panel, 0.07);
  kit.box(g, 1.36, 0.07, 0.68, CX, T + 0.755, CZ, m.white, 0.03);
  kit.box(g, 0.6, 0.04, 0.2, CX + 0.2, T + 0.81, CZ + 0.2, m.screen, 0);
  const steps = [0, 1, 2, 3].map((i) => add({ p: [CX - 0.45 + i * 0.3, T + 0.5, CZ + 0.315], s: [0.22, 0.06, 0.02], color: i === 3 ? '#4fbf8b' : '#33afdf' }));
  const side = monitor(kit, g, m, CX, 1.86, CZ - 0.15, 1.15, 0.72);
  deckCable(kit, g, m, [RX, -0.85], [RX, -0.32]); deckCable(kit, g, m, [RX, -0.32], [-1.05, -0.32]);
  const BZ = 1.02, BIN_Z = 1.85;
  kit.box(g, 0.5, 0.02, 0.4, -2.2, T + 0.265, BZ, m.blue, 0);
  for (const dz of [-0.32, 0.32]) kit.box(g, 0.08, 0.75, 0.08, -2.2, T + 0.6, BZ + dz, m.edge, 0.02);
  kit.box(g, 0.16, 0.1, 0.78, -2.2, T + 0.98, BZ, m.panel, 0.03);
  const iBeam = add({ p: [-2.2, T + 0.36, BZ], s: [0.025, 0.025, 0.56], color: '#33afdf' }); // a read line that sweeps across the card

  // ── 3 · classify: sorter belt, and a diverter that rides a rail and pushes the card into its bin ──
  kit.box(g, 5.05, 0.22, 0.46, 0.025, T + 0.11, BZ, m.edge, 0.05);
  kit.box(g, 4.95, 0.04, 0.38, 0.025, T + 0.24, BZ, m.screen, 0);
  const marks = Array.from({ length: 10 }, () => add({ p: [0, T + 0.265, BZ], s: [0.04, 0.01, 0.3], color: '#9fb2c3' }));
  for (const x of [-1.65, 2.55]) kit.box(g, 0.1, 1.0, 0.1, x, T + 0.5, 0.6, m.edge, 0.02);
  kit.box(g, 4.3, 0.08, 0.12, 0.45, T + 1.02, 0.6, m.panel, 0.02);
  const carriage = kit.dyn(new Group()); carriage.position.set(BIN_X[0], T + 1.02, 0.6); g.add(carriage);
  kit.box(carriage, 0.3, 0.2, 0.26, 0, 0, 0, m.blue, 0.04);
  const pusher = new Group(); carriage.add(pusher);
  kit.box(pusher, 0.05, 0.62, 0.05, 0, -0.33, 0.15, m.edge, 0);
  kit.box(pusher, 0.44, 0.2, 0.04, 0, -0.62, 0.17, m.white, 0.01);
  kit.dyn(carriage);
  // six inventory bins (one per device type), each with a stack that grows with its count
  const bins = ASSET_TYPES.map((ty, i) => {
    const x = BIN_X[i];
    kit.box(g, 0.62, 0.24, 0.56, x, T + 0.12, BIN_Z, m.edge, 0.04);
    kit.box(g, 0.5, 0.02, 0.44, x, T + 0.245, BIN_Z, m.screen, 0);
    kit.box(g, 0.56, 0.05, 0.22, x, T + 0.025, 2.3, m.panel, 0.01);
    deviceIcon(kit, g, m, i, x, T + 0.05, 2.3);
    return {
      stripe: add({ p: [x, T + 0.12, BIN_Z + 0.285], s: [0.5, 0.05, 0.02], color: ty.color }),
      stack: add({ p: [x, T + 0.3, BIN_Z], s: [0.36, 0.05, 0.28], color: ty.color }),
    };
  });
  const iCard = add({ p: [-2.2, T + 0.3, BZ], s: [0.36, 0.035, 0.26], color: '#bfefff' });

  // ── 4 · inventory: catalog drawers under the inventory board ──
  const MX = 1.4, MZ = -1.95;
  kit.box(g, 2.3, 0.55, 0.5, MX, T + 0.275, MZ, m.panel, 0.06);
  const drawers = ASSET_TYPES.map((ty, i) => {
    const x = MX - 0.95 + i * 0.38;
    kit.box(g, 0.34, 0.36, 0.03, x, T + 0.27, MZ + 0.26, m.edge, 0.01);
    return add({ p: [x, T + 0.4, MZ + 0.28], s: [0.2, 0.04, 0.02], color: ty.color });
  });
  const main = monitor(kit, g, m, MX, 1.55, MZ, 2.25, 1.3, false);
  deckCable(kit, g, m, [2.2, -1.7], [2.2, 0.55]);
  const bank = ledBank(g, items);
  const screens = createCityScreens([{ id: 'assetInventory', ...main, group: g }, { id: 'assetSteps', ...side, group: g }] as CitySlot[], ctx.renderer);

  const stackH = (n: number) => 0.007 * n;
  let ang = 0; const tick = clock();
  return {
    group: g,
    update(t, s) {
      const dt = tick(t), run = assetRuns(s), L = assetLoop(assetTime(t, s)), K = L.k, ty = L.type;
      ang += dt * (run ? 1.6 : 0.1); dish.rotation.y = s.still ? 0.4 : ang;
      // 1 · scan pulse; device lights answer as the ring passes, the newly found one keeps glowing
      const front = 0.3 + K.scan * 1.8;
      pulses.forEach((p, i) => {
        const k = K.scan * 1.25 - i * 0.25;
        p.r.visible = run && L.stage === 'scan' && k > 0 && k < 1;
        if (p.r.visible) { const r = 0.3 + k * 1.8; p.r.scale.set(r, r, 1); p.mt.opacity = 0.7 * (1 - k); }
      });
      BLIPS.forEach(([x, z], j) => {
        const dist = Math.hypot(x - RX, z - RZ);
        const hit = run && L.stage === 'scan' && Math.abs(front - dist) < 0.25;
        const fresh = j === ty && (L.stage === 'detect' || (L.stage === 'scan' && front > dist));
        blips.set(j, hit ? 1.1 : fresh && run ? 0.8 + 0.4 * Math.sin(t * 14) : 0.3);
      });
      if (run && L.stage === 'detect') {
        const [bx, bz] = BLIPS[ty], k = ease(K.detect);
        blips.move(iPacket, bx + (-2.2 - bx) * k, T + 0.12 + 0.43 * k + Math.sin(Math.PI * k) * 0.9, bz + (BZ - bz) * k); blips.scale(iPacket, 1); blips.set(iPacket, 1.2);
      } else blips.scale(iPacket, 0);
      blips.flush();
      bank.set(iRadar, s.still ? 0.6 : Math.max(run && L.stage === 'scan' ? 0.6 + 0.5 * Math.sin(t * 12) : 0.45, 0.45 + s.arrive));
      bank.set(iListen, s.still ? 0.5 : run && L.stage === 'scan' && Math.floor(t * 5) % 3 === 0 ? 1 : 0.3);
      // 2 · identify: the card appears on the intake pad while the arch beam reads it
      const stageIdx = L.stage === 'scan' || L.stage === 'detect' ? 0 : L.stage === 'identify' ? 1 : L.stage === 'classify' ? 2 : 3;
      steps.forEach((idx, i) => bank.set(idx, i === stageIdx ? (run ? 0.85 + 0.25 * Math.sin(t * 8) : 1) : i < stageIdx ? 0.5 : 0.14));
      if (run && L.stage === 'identify') { bank.move(iBeam, -2.2 - 0.22 * Math.cos(K.identify * Math.PI * 4), T + 0.36, BZ); bank.scale(iBeam, 1); bank.set(iBeam, 1.1); }
      else bank.scale(iBeam, 0);
      // 3 · classify: the card takes its type colour, rides the belt to its bin and is pushed in
      const bx = BIN_X[ty], prev = BIN_X[(ty + 5) % 6], count = L.counts[ty];
      let push = 0;
      carriage.position.x = L.stage === 'identify' ? prev + (bx - prev) * ease(K.identify) : L.stage === 'scan' || L.stage === 'detect' ? prev : bx;
      if (run && (L.stage === 'identify' || L.stage === 'classify')) {
        bank.tint(iCard, L.stage === 'identify' ? '#bfefff' : ASSET_TYPES[ty].color);
        if (L.stage === 'identify') { bank.move(iCard, -2.2, T + 0.3, BZ); bank.scale(iCard, ease(K.identify / 0.3)); }
        else {
          const ride = ease(K.classify / 0.6), drop = ease((K.classify - 0.62) / 0.38);
          push = drop * 0.83;
          bank.move(iCard, -2.2 + (bx + 2.2) * ride, T + 0.3 + (0.255 + stackH(count) - 0.28) * drop, BZ + (BIN_Z - BZ) * drop); bank.scale(iCard, 1);
        }
        bank.set(iCard, 1);
      } else bank.scale(iCard, 0);
      if (run && L.stage === 'inventory') push = 0.83 * (1 - ease(K.inventory / 0.5));
      pusher.position.z = push;
      if (run) for (let i = 0; i < marks.length; i++) bank.move(marks[i], -1.85 + ((i * 0.44 + t * (L.stage === 'classify' ? 2.2 : 0.5)) % 4.4), T + 0.265, BZ);
      else marks.forEach((idx, i) => bank.move(idx, -1.85 + i * 0.44, T + 0.265, BZ));
      marks.forEach((idx) => bank.set(idx, 0.35));
      // 4 · inventory: each stack is that type's count; the updated bin and drawer flash
      bins.forEach((b, i) => {
        const h = stackH(L.counts[i]); bank.size(b.stack, 0.36, h, 0.28); bank.move(b.stack, BIN_X[i], T + 0.255 + h / 2, BIN_Z); bank.set(b.stack, 0.42);
        const hot = i === ty && L.stage === 'inventory' ? 1 - K.inventory : 0;
        bank.set(b.stripe, 0.5 + 0.8 * hot); bank.set(drawers[i], 0.35 + 0.9 * hot);
      });
      bank.flush();
    },
    paint(cl, _a, red, dark, s) { screens.update(cl, red, dark, s); },
    dispose() { screens.dispose(); bank.dispose(); blips.dispose(); },
  };
};

export const buildServiceFingerprinting: ChunkBuilder = (ctx) => {
  const { kit, m } = ctx; const g = new Group(); const T = DECK_TOP;
  chunkBase(kit, g, m);
  /*
   * An inspection lab (facts: fingerprintLab.ts). One target at a time:
   *   target loaded onto the inspection bed → chamber powers up → the sensor head sweeps it, reading installed
   *   software layer by layer → each identified package is matched against the advisory database → results are
   *   classified (vulnerabilities / misconfigurations / secrets) → packed as shards for the agent → idle.
   * No network probing: this is a filesystem / image inspection.
   */
  // ── inspection chamber (centre-north): bed, glass hood frame, side sensor towers, sensor head on a rail ──
  const CX = -0.45, CZ = -0.35;
  kit.box(g, 2.3, 0.3, 1.5, CX, T + 0.15, CZ, m.panel, 0.08); // base
  kit.box(g, 1.7, 0.06, 1.0, CX, T + 0.33, CZ, m.screen, 0.02); // inspection bed
  for (const dx of [-1.05, 1.05]) {
    kit.box(g, 0.24, 1.55, 0.36, CX + dx, T + 1.07, CZ, m.edge, 0.04); // sensor towers
    for (let r = 0; r < 4; r++) kit.box(g, 0.04, 0.12, 0.26, CX + dx * 0.89, T + 0.6 + r * 0.25, CZ, m.screen, 0);
  }
  kit.box(g, 2.34, 0.12, 0.3, CX, T + 1.88, CZ, m.edge, 0.03); // rail
  kit.box(g, 1.9, 1.45, 0.02, CX, T + 1.08, CZ - 0.5, m.glass, 0); // back glass
  kit.box(g, 2.3, 0.04, 0.04, CX, T + 0.36, CZ + 0.74, m.blue, 0); // front lip
  const head = kit.dyn(new Group()); head.position.set(CX, T + 1.62, CZ); g.add(head);
  kit.box(head, 0.36, 0.26, 0.9, 0, 0, 0, m.blue, 0.05);
  kit.box(head, 0.12, 0.3, 0.12, 0, -0.26, 0, m.edge, 0.02);
  const beamMt = mat(ctx, '#33afdf', 0.9); beamMt.transparent = true; beamMt.opacity = 0; beamMt.depthWrite = false;
  const beam = kit.dyn(kit.box(head, 0.05, 1.0, 0.85, 0, -0.85, 0, beamMt, 0)); // a reading plane
  // ── the target on the bed: a host module (filesystem layers) or a container image (stacked layers) ──
  const hostT = kit.dyn(new Group()); hostT.position.set(CX, T + 0.36, CZ); g.add(hostT);
  kit.box(hostT, 0.9, 0.36, 0.6, 0, 0.18, 0, m.screen, 0.05);
  for (let r = 0; r < 3; r++) kit.box(hostT, 0.8, 0.06, 0.02, 0, 0.08 + r * 0.1, 0.31, m.edge, 0);
  kit.box(hostT, 0.22, 0.14, 0.04, 0.3, 0.42, 0, m.white, 0.02); kit.torus(hostT, 0.06, 0.016, 0.3, 0.52, 0, m.edge, Math.PI); // read-only lock
  const imgT = kit.dyn(new Group()); imgT.position.set(CX, T + 0.36, CZ); g.add(imgT);
  for (let r = 0; r < 4; r++) kit.box(imgT, 0.78 - r * 0.08, 0.1, 0.55 - r * 0.05, 0, 0.06 + r * 0.12, 0, r % 2 ? m.white : m.blue, 0.02);
  // ── loading dock (west): targets arrive from the agent side ──
  kit.box(g, 0.75, 0.22, 0.75, -2.15, T + 0.11, CZ - 1.25, m.edge, 0.04);
  kit.box(g, 0.6, 0.03, 0.6, -2.15, T + 0.235, CZ - 1.25, m.screen, 0);
  deckCable(kit, g, m, [-2.15, CZ - 0.85], [-2.15, CZ]); deckCable(kit, g, m, [-2.15, CZ], [-1.6, CZ]);
  // ── signature database (east): advisory cartridges the identified packages are matched against ──
  kit.box(g, 0.75, 1.35, 0.7, 1.95, T + 0.675, -1.55, m.screen, 0.06);
  kit.box(g, 0.8, 0.08, 0.75, 1.95, T + 1.39, -1.55, m.panel, 0.02);
  for (let r = 0; r < 5; r++) kit.box(g, 0.6, 0.18, 0.04, 1.95, T + 0.25 + r * 0.24, -1.18, m.panel, 0.02);
  deckCable(kit, g, m, [0.9, -0.55], [1.95, -0.55]); deckCable(kit, g, m, [1.95, -0.55], [1.95, -1.15]);
  // ── analyzer & classifier (east-centre): three output bins by finding type ──
  const BZ = 1.85;
  kit.box(g, 1.5, 0.35, 0.65, 1.55, T + 0.175, BZ, m.panel, 0.05);
  const BIN_X = [1.05, 1.55, 2.05];
  for (const x of BIN_X) { kit.box(g, 0.4, 0.14, 0.45, x, T + 0.42, BZ, m.edge, 0.03); kit.box(g, 0.34, 0.02, 0.39, x, T + 0.5, BZ, m.screen, 0); }
  deckCable(kit, g, m, [0.75, CZ + 0.3], [0.75, BZ]);
  // ── probe control console (south-west) with operator, results screen (south-centre), shard output slot (south) ──
  kit.box(g, 1.0, 0.75, 0.5, -2.0, T + 0.375, 1.6, m.panel, 0.06); kit.box(g, 1.06, 0.06, 0.56, -2.0, T + 0.78, 1.6, m.white, 0.03);
  const ctlG = new Group(); ctlG.position.set(-2.0, 0, 1.6); ctlG.rotation.y = 0.45; g.add(ctlG);
  const ctl = monitor(kit, ctlG, m, 0, 1.78, -0.13, 0.95, 0.6);
  const op = person(kit, m, g, [-1.75, T, 2.3], Math.PI - 0.45, 'stand', m.blue, m.screen, m.skin, m.visor, [-0.35, null]);
  const resG = new Group(); resG.position.set(1.65, 0, 0.35); resG.rotation.y = -0.55; g.add(resG);
  kit.box(resG, 0.5, 0.6, 0.4, 0, T + 0.3, -0.05, m.panel, 0.04);
  const res = monitor(kit, resG, m, 0, 1.6, 0, 1.3, 0.82, false);
  kit.box(resG, 0.12, 0.5, 0.12, 0, T + 0.85, -0.05, m.edge, 0.02);
  kit.box(g, 0.7, 0.3, 0.45, 0.0, T + 0.15, 2.2, m.panel, 0.04); kit.box(g, 0.5, 0.03, 0.06, 0.0, T + 0.31, 2.43, m.screen, 0); // output slot (→ agent, south port)
  // ── lamps and moving blocks: one instanced bank ──
  const items: BankItem[] = []; const add = (it: BankItem) => items.push(it) - 1;
  const tower = [-1.05, 1.05].flatMap((dx) => Array.from({ length: 6 }, (_, r) => add({ p: [CX + dx * 0.86, T + 0.45 + r * 0.22, CZ + 0.19], s: [0.06, 0.07, 0.02], color: '#33afdf' })));
  const layer = Array.from({ length: IDENTIFIED.length }, (_, i) => add({ p: [CX - 0.62, T + 0.42 + i * 0.07, CZ + 0.32], s: [0.08, 0.04, 0.02], color: '#bfefff' })); // packages identified on the target
  const cart = Array.from({ length: 5 }, (_, r) => add({ p: [1.68, T + 0.25 + r * 0.24, -1.15], s: [0.1, 0.08, 0.02], color: '#33afdf' }));
  const binFill = FINDINGS.map((_, i) => add({ p: [BIN_X[i], T + 0.53, BZ], s: [0.3, 0.05, 0.34], color: i === 1 ? '#33afdf' : '#fe904d' }));
  const shard = Array.from({ length: FP_SHARDS }, (_, i) => add({ p: [-0.18 + i * 0.18, T + 0.33, 2.44], s: [0.12, 0.05, 0.02], color: '#5caa83' }));
  const iDock = add({ p: [-2.15, T + 0.25, CZ - 1.25], s: [0.55, 0.02, 0.55], color: '#33afdf' });
  const iMatch = add({ p: [0, -5, 0], s: [0.14, 0.08, 0.14], color: '#bfefff' }); // a package record travelling to the database
  const iBed = add({ p: [CX, T + 0.365, CZ], s: [1.6, 0.01, 0.9], color: '#33afdf' });
  const bank = ledBank(g, items);
  const screens = createCityScreens([{ id: 'fpResults', ...res, group: resG }, { id: 'fpControl', ...ctl, group: ctlG }] as CitySlot[], ctx.renderer);
  const DB: [number, number, number] = [1.95, T + 1.5, -1.3], BED: [number, number, number] = [CX + 0.3, T + 0.9, CZ];
  const cp: [number, number, number] = [0, 0, 0];
  return {
    group: g,
    update(t, s) {
      const k = labK(s), run = k >= 0 && !s.still, L = k < 0 ? 1 : k, tg = targetOf(s);
      // target: slides from the dock onto the bed at the start of a run; the run's target type is shown
      const slide = run ? ease(seg(L, FW.load[0], FW.load[1])) : 1;
      for (const [o, show] of [[hostT, tg === 0], [imgT, tg === 1]] as const) { o.visible = show; o.position.x = CX - 1.6 * (1 - slide); o.position.z = CZ - 0.9 * Math.max(0, 1 - slide * 2); }
      bank.set(iDock, run && L < FW.load[1] ? 0.5 + 0.5 * Math.sin(t * 8) : 0.15);
      // power-up: towers fill bottom→top; bed glows
      const pw = run ? seg(L, FW.power[0], FW.power[1]) : 0;
      tower.forEach((idx, i) => bank.set(idx, run ? ((i % 6) < pw * 6.5 ? (L < FW.match[1] ? 0.6 + 0.35 * Math.sin(t * 6 + i) : 0.6) : 0.1) : 0.3));
      bank.set(iBed, run && L >= FW.power[0] && L < FW.classify[1] ? 0.35 + 0.25 * Math.sin(t * 4) : 0.12);
      // sensor head sweeps the target along the rail while reading; a reading plane drops onto it
      const sc = run ? seg(L, FW.scan[0], FW.scan[1]) : 0, scanning = run && sc > 0 && sc < 1;
      head.position.x = CX + (scanning ? -0.75 + 1.5 * (0.5 - 0.5 * Math.cos(sc * Math.PI * 3)) : 0);
      beamMt.opacity = scanning ? 0.35 + 0.15 * Math.sin(t * 12) : 0; beam.visible = scanning;
      // packages identified (target side lamps), then matched against the database (record hops to the cartridges)
      IDENTIFIED.forEach((pkg, i) => {
        const found = L >= idAt(i), matched = L >= matchAt(i);
        bank.tint(layer[i], matched && pkg.hit ? '#fe904d' : '#bfefff');
        bank.set(layer[i], found ? (run && i === HIGHLIGHT && L >= FW.classify[0] ? 1.2 + 0.3 * Math.sin(t * 6) : 0.85) : 0.06);
      });
      const mi = IDENTIFIED.findIndex((_, i) => run && L >= matchAt(i) - 0.035 && L < matchAt(i));
      if (mi >= 0) { arc(cp, BED, DB, seg(L, matchAt(mi) - 0.035, matchAt(mi)), 0.5); bank.move(iMatch, cp[0], cp[1], cp[2]); bank.scale(iMatch, 1); bank.tint(iMatch, IDENTIFIED[mi].hit ? '#fe904d' : '#bfefff'); }
      else bank.scale(iMatch, 0.0001);
      bank.set(iMatch, 1.1);
      cart.forEach((idx, r) => bank.set(idx, run && L >= FW.match[0] && L < FW.match[1] ? (Math.floor(t * 9 + r * 2) % 5 === 0 ? 1.1 : 0.3) : 0.3));
      // classification: the bins fill by finding type
      FINDINGS.forEach((f, i) => { const v = run ? ease(seg(L, FW.classify[0] + i * 0.03, FW.classify[1])) : 1; bank.size(binFill[i], 0.3, Math.max(0.0001, 0.02 + 0.12 * v * Math.min(1, f.n / 8)), 0.34); bank.move(binFill[i], BIN_X[i], T + 0.52 + 0.06 * v * Math.min(1, f.n / 8), BZ); bank.set(binFill[i], 0.8); });
      // output: shards fill at the slot, then leave with the agent's carrier (departure pulse) → idle
      const pk = run ? seg(L, FW.pack[0], FW.pack[1]) : 1;
      shard.forEach((idx, i) => bank.set(idx, pk * FP_SHARDS > i + 0.3 ? Math.max(0.85 - 0.7 * s.depart, 0.15) : 0.08));
      bank.flush();
      if (!s.still && s.level === 1) { op.head.rotation.y = scanning ? 0.7 : 0.15; op.armR.rotation.x = run && L < FW.power[1] && L > FW.load[1] ? -1.0 : -0.3; }
    },
    paint(cl, _a, red, dark, s) { screens.update(cl, red, dark, s); },
    dispose() { screens.dispose(); bank.dispose(); },
  };
};
