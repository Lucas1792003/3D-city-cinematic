import { CanvasTexture, EdgesGeometry, BoxGeometry, Group, LineSegments, MeshStandardMaterial, SRGBColorSpace, Sprite, SpriteMaterial, AdditiveBlending, NormalBlending } from 'three';
import { DECK_TOP, monitor, deckCable, type CitySlot } from '../kit/machines';
import { createCityScreens } from '../screens/cityScreens';
import { seg, ease, arc } from './process';
import { gitState } from './gitFlow';
import { providerState, PX, TRIP, NODE } from './providerFlow';
import { chunkBase } from '../kit/chunkBase';
import { ledBank, type BankItem } from '../kit/ledBank';
import { FOOT } from '../registry/grid';
import type { ChunkBuilder, ChunkCtx } from './types';

/** The external pads and the reserved (mystery) platform. ("Your team" lives in team.ts.) */


/** External pad: neutral, no brand accent — it is not part of CyfroSec. */
function padDeck(ctx: ChunkCtx, g: Group) {
  const { kit, m } = ctx;
  kit.box(g, FOOT, 0.16, FOOT, 0, 0.15, 0, m.padPanel, 0.1);
}

type V3 = [number, number, number];
const NEUTRAL = '#d3dde6', OK = '#4fbf8b';

/**
 * External AI provider — a generic request gateway and compute station, deliberately neutral (no CyfroSec blue,
 * no provider name, logo, region or topology). An AI request from the shared AI layer (F12) docks at the
 * gateway on the south side, queues, passes the gateway ring, travels the rail to a compute node, and the
 * response returns through the same gateway. The racks, cooling and power are illustrative; nothing here implies
 * models run inside CyfroSec. Timing comes from chunks/providerFlow.ts (also used by the status screen).
 */
export const buildAiProviders: ChunkBuilder = (ctx) => {
  const { kit, m } = ctx; const g = new Group(); const T = DECK_TOP;
  padDeck(ctx, g);
  const items: BankItem[] = []; const add = (it: BankItem) => items.push(it) - 1;
  const REQ = '#f1e3c2', RES = OK, RZ = -1.45, FZ = RZ + 0.5;
  // ── compute racks (north): modules with a status light and illuminated ports, rails, top vents ──
  const RACKS = [-1.55, 0, 1.55];
  const modStat: number[][] = [], modPort: number[][] = [];
  RACKS.forEach((x, ri) => {
    kit.box(g, 1.15, 2.0, 0.95, x, T + 1.0, RZ, m.screen, 0.07);
    kit.box(g, 1.2, 0.1, 1.0, x, T + 2.05, RZ, m.edge, 0.03);
    for (let v = 0; v < 3; v++) kit.box(g, 0.8, 0.03, 0.06, x, T + 2.11, RZ - 0.3 + v * 0.3, m.padPanel, 0); // top vents
    for (const sx of [-0.6, 0.6]) kit.box(g, 0.05, 1.9, 0.05, x + sx, T + 1.0, FZ + 0.02, m.edge, 0); // rails
    const st: number[] = [], pt: number[] = [];
    for (let r = 0; r < 5; r++) {
      const y = T + 0.32 + r * 0.34;
      kit.box(g, 0.98, 0.28, 0.05, x, y, FZ + 0.02, m.padPanel, 0.02); // compute module
      st.push(add({ p: [x - 0.38, y, FZ + 0.06], s: [0.07, 0.07, 0.02], color: OK }));
      for (let q = 0; q < 3; q++) pt.push(add({ p: [x + 0.12 + q * 0.12, y, FZ + 0.06], s: [0.07, 0.04, 0.02], color: ri === NODE ? REQ : NEUTRAL }));
    }
    modStat.push(st); modPort.push(pt);
  });
  const beacon = add({ p: [RACKS[NODE], T + 1.93, FZ + 0.05], s: [0.9, 0.05, 0.02], color: RES }); // the answering node
  // overhead cable trays between the racks and down the east side
  kit.box(g, 4.3, 0.06, 0.32, 0, T + 2.3, RZ, m.edge, 0.02);
  kit.box(g, 0.32, 0.06, 2.6, 2.05, T + 2.3, -0.05, m.edge, 0.02);
  kit.box(g, 0.16, 2.25, 0.16, 2.05, T + 1.13, 1.25, m.edge, 0.02);
  // ── cooling unit (east) with a fan and coolant lines to the racks ──
  kit.box(g, 1.1, 1.0, 0.9, 1.55, T + 0.5, 0.35, m.panel, 0.07);
  kit.torus(g, 0.32, 0.04, 1.55, T + 1.02, 0.35, m.edge).rotation.x = Math.PI / 2;
  const fan = kit.dyn(new Group()); fan.position.set(1.55, T + 1.03, 0.35); g.add(fan);
  for (const r of [0, Math.PI / 2]) kit.box(fan, 0.58, 0.02, 0.09, 0, 0, 0, m.white, 0).rotation.y = r;
  for (const x of [1.3, 1.8]) kit.box(g, 0.07, 0.07, 1.0, x, T + 0.1, -0.45, m.edge, 0);
  const coolLed = add({ p: [1.55, T + 0.78, 0.81], s: [0.4, 0.05, 0.02], color: '#9fd4e6' });
  const coolant = [1.3, 1.8].map((x) => add({ p: [x, T + 0.15, 0], s: [0.09, 0.05, 0.12], color: '#9fd4e6' }));
  // ── power unit (west) with a load meter ──
  kit.box(g, 0.8, 1.0, 0.7, -1.75, T + 0.5, 0.0, m.panel, 0.06);
  kit.box(g, 0.86, 0.06, 0.76, -1.75, T + 1.03, 0.0, m.edge, 0.02);
  const meter = [0, 1, 2, 3].map((i) => add({ p: [-1.75, T + 0.3 + i * 0.15, 0.36], s: [0.42, 0.08, 0.02], color: i === 3 ? REQ : OK }));
  // ── request gateway (south, facing the shared AI layer): plinth, pillars, lintel lamps, an illuminated ring ──
  const GZ = 1.75, GY = T + 0.84;
  kit.box(g, 1.6, 0.14, 0.8, 0, T + 0.07, GZ, m.padBase, 0.04);
  for (const x of [-0.64, 0.64]) kit.box(g, 0.2, 1.36, 0.46, x, T + 0.82, GZ, m.panel, 0.05);
  kit.box(g, 1.52, 0.18, 0.52, 0, T + 1.58, GZ, m.edge, 0.04);
  const gateMt = new MeshStandardMaterial({ color: '#dfe7ee', emissive: '#dfe7ee', emissiveIntensity: 0.15, roughness: 0.35 }); ctx.owned.push(gateMt);
  kit.dyn(kit.torus(g, 0.42, 0.045, 0, GY, GZ, gateMt));
  const RING = 10;
  const ring = Array.from({ length: RING }, (_, i) => { const a = (i / RING) * Math.PI * 2; return add({ p: [Math.cos(a) * 0.42, GY + Math.sin(a) * 0.42, GZ + 0.06], s: [0.13, 0.05, 0.03], color: NEUTRAL, rotZ: a + Math.PI / 2 }); });
  const scanBar = add({ p: [0, GY, GZ], s: [0.66, 0.025, 0.02], color: REQ });
  const lampIn = add({ p: [-0.36, T + 1.58, GZ + 0.27], s: [0.34, 0.07, 0.02], color: REQ });
  const lampOut = add({ p: [0.36, T + 1.58, GZ + 0.27], s: [0.34, 0.07, 0.02], color: RES });
  const queue = [-0.3, 0, 0.3].map((x) => add({ p: [x, T + 0.16, GZ + 0.3], s: [0.18, 0.04, 0.12], color: REQ }));
  // the rail between the gateway and the compute node, with direction chevrons
  kit.box(g, 0.24, 0.03, 2.25, 0, T + 0.02, 0.2, m.edge, 0);
  const CH = 7, chev = Array.from({ length: CH }, (_, i) => add({ p: [0, T + 0.045, 1.2 - i * 0.33], s: [0.16, 0.02, 0.07], color: NEUTRAL }));
  // network switch beside the gateway
  kit.box(g, 0.75, 0.22, 0.45, 1.35, T + 0.11, 1.95, m.screen, 0.03);
  const swp = Array.from({ length: 6 }, (_, i) => add({ p: [1.1 + i * 0.1, T + 0.14, 2.18], s: [0.06, 0.05, 0.02], color: OK }));
  // request and response tokens (hidden until an exchange runs)
  const reqTok = add({ p: [0, -5, 0], s: [0.22, 0.13, 0.22], color: REQ }), resTok = add({ p: [0, -5, 0], s: [0.22, 0.13, 0.22], color: RES });
  // status panel (west)
  kit.box(g, 1.25, 0.7, 0.5, -1.6, T + 0.35, 1.75, m.padPanel, 0.05); kit.box(g, 1.31, 0.06, 0.56, -1.6, T + 0.73, 1.75, m.white, 0.02);
  const mon = monitor(kit, g, m, -1.6, 1.82, 1.62, 1.15, 0.72);
  const bank = ledBank(g, items);
  const screens = createCityScreens([{ id: 'aiGateway', ...mon, group: g }] as CitySlot[], ctx.renderer);
  const OUTSIDE: V3 = [0, GY, 2.45], FRONT: V3 = [0, GY, GZ + 0.45], GATE: V3 = [0, GY, GZ], NODEP: V3 = [RACKS[NODE], T + 0.95, FZ + 0.2];
  const cp: V3 = [0, 0, 0];
  const path = (idx: number, a: V3, b: V3, k: number, lift: number) => { arc(cp, a, b, k, lift); bank.move(idx, cp[0], cp[1], cp[2]); };
  let spin = 0, prev = -1;
  return {
    group: g,
    update(t, s) {
      const dt = prev < 0 || t < prev ? 0 : Math.min(0.1, t - prev); prev = t;
      const P = providerState(s), x = P.x, st = P.stage, live = !s.still, calm = s.low || !live;
      const busy = st === 'active', open = st === 'ready' || st === 'sent' || st === 'queued';
      // racks: a quiet idle glow; the whole hall lights up while the model runs, the answering node strongest
      const wave = busy ? seg(x, PX.active[0], PX.active[0] + 0.08) : st === 'prepared' ? 1 : 0;
      modStat.forEach((row, ri) => row.forEach((idx, r) => bank.set(idx, s.still ? 0.8 : wave > (r + ri * 0.3) / 6 ? 0.95 : 0.4)));
      modPort.forEach((row, ri) => row.forEach((idx, i) => {
        const hot = busy || (st === 'prepared' && ri === NODE);
        bank.set(idx, s.still ? (ri === NODE ? 0.9 : 0.5) : hot ? (calm ? 0.85 : (Math.floor(t * 9) + i * 2 + ri) % 5 < 2 ? 1.1 : 0.35) : ((t + i * 1.9 + ri * 3.1) % 8 < 0.25 ? 0.7 : 0.3));
      }));
      bank.set(beacon, s.still ? 0.9 : st === 'prepared' ? 1.1 : busy ? 0.55 + 0.45 * (calm ? 1 : 0.5 + 0.5 * Math.sin(t * 6)) : 0.25);
      // cooling and power follow the load
      const load = busy || st === 'prepared' ? 1 : x >= 0 ? 0.5 : 0.15;
      spin += dt * (calm ? 0.4 : 0.6 + 8.5 * load); fan.rotation.y = s.still ? 0.4 : spin;
      bank.set(coolLed, 0.4 + 0.6 * load);
      coolant.forEach((idx, i) => { const u = calm ? 0.5 : (t * (0.25 + 0.5 * load) + i * 0.5) % 1; bank.move(idx, i ? 1.8 : 1.3, T + 0.15, 0.05 - u * 1.0); bank.set(idx, 0.4 + 0.6 * load); });
      meter.forEach((idx, i) => bank.set(idx, s.still ? (i < 3 ? 0.9 : 0.2) : load * 4 > i + 0.2 ? 0.95 : 0.15));
      // gateway: warms as a request approaches, opens for the request and the response, holds while the model runs
      const glow = s.still ? 0.45 : P.inbound ? 0.2 + 0.4 * s.arrive : open ? 0.7 + 0.3 * (calm ? 1 : Math.sin(t * 7)) : busy || st === 'prepared' ? 0.4 : 0.15;
      gateMt.emissiveIntensity = glow;
      const chase = !calm && (st === 'ready' || st === 'sent' || st === 'prepared');
      ring.forEach((idx, i) => bank.set(idx, s.still ? 0.6 : chase ? ((Math.floor(t * 14) - i + RING * 4) % RING < 3 ? 1.2 : 0.3) : x >= 0 ? 0.6 : 0.3));
      const scan = st === 'ready' ? seg(x, PX.ready[0], TRIP.in[0] + 0.05) : -1;
      if (scan >= 0 && scan < 1) { bank.scale(scanBar, 1); bank.move(scanBar, 0, GY + 0.34 - scan * 0.68, GZ); bank.set(scanBar, 1.1); } else bank.scale(scanBar, 0.0001);
      bank.set(lampIn, s.still ? 0.4 : P.inbound ? 0.3 + 0.7 * s.arrive : st === 'queued' || st === 'ready' ? 1.1 : 0.2);
      bank.set(lampOut, s.still ? 0.4 : st === 'prepared' || st === 'sent' ? (st === 'sent' ? 0.7 + 0.4 * Math.max(s.depart, 1 - seg(x, PX.sent[0], 1)) : 0.6) : 0.2);
      const qn = st === 'queued' ? 1 + Math.floor(seg(x, 0, PX.queued[1]) * 2.99) : 0;
      queue.forEach((idx, i) => bank.set(idx, s.still ? 0.3 : i < qn ? 1 : 0.15));
      // rail chevrons: northward with the request, southward with the response
      const dir = x >= TRIP.in[0] && x < TRIP.in[1] ? 1 : x >= TRIP.out[0] && x < TRIP.out[1] ? -1 : 0;
      chev.forEach((idx, i) => { bank.tint(idx, dir < 0 ? RES : dir > 0 ? REQ : NEUTRAL); bank.set(idx, s.still ? 0.3 : dir === 0 ? 0.25 : calm ? 0.8 : ((Math.floor(t * 10) - dir * i + CH * 9) % 4 === 0 ? 1.2 : 0.3)); });
      swp.forEach((idx, i) => bank.set(idx, x >= 0 && !calm && (st !== 'active') ? (Math.floor(t * 8 + i * 1.3) % 2 ? 0.9 : 0.3) : 0.45));
      // the request token: docks in front of the gateway, passes the ring, rides the rail into the node
      if (live && x >= 0 && x < TRIP.in[1]) {
        bank.scale(reqTok, 1); bank.set(reqTok, 1.1);
        if (x < PX.queued[1]) path(reqTok, OUTSIDE, FRONT, seg(x, 0, 0.06), 0);
        else if (x < TRIP.in[0]) bank.move(reqTok, FRONT[0], FRONT[1] + 0.03 * Math.sin(t * 6), FRONT[2]);
        else if (x < TRIP.in[0] + 0.04) path(reqTok, FRONT, GATE, seg(x, TRIP.in[0], TRIP.in[0] + 0.04), 0);
        else { path(reqTok, GATE, NODEP, seg(x, TRIP.in[0] + 0.04, TRIP.in[1]), 0.35); bank.scale(reqTok, 1 - 0.6 * seg(x, TRIP.in[1] - 0.03, TRIP.in[1])); }
      } else bank.scale(reqTok, 0.0001);
      // the response token: prepared at the node, back along the rail, out through the gateway
      if (live && x >= TRIP.out[0] - 0.02 && x < 0.93) {
        bank.scale(resTok, x < TRIP.out[0] ? 0.5 : x > 0.86 ? 1 - seg(x, 0.86, 0.93) : 1); bank.set(resTok, 1.1);
        if (x < TRIP.out[1]) path(resTok, NODEP, GATE, seg(x, TRIP.out[0], TRIP.out[1]), 0.35);
        else path(resTok, GATE, OUTSIDE, seg(x, TRIP.out[1], 0.93), 0);
      } else bank.scale(resTok, 0.0001);
      bank.flush();
    },
    paint(cl, _a, red, dark, s) { screens.update(cl, red, dark, s); },
    dispose() { screens.dispose(); bank.dispose(); },
  };
};

/**
 * Your code hosting — the external repository provider (GitHub, or Bitbucket where enabled), on its own neutral
 * pad beside CyfroCode, outside both the customer wall and the CyfroSec platform (facts: gitFlow.ts).
 *   repository servers + switch → a Git graph wall (main, a merged branch, a feature branch) → a repository
 *   console and a provider panel → a transfer gateway facing CyfroCode (clones leave here, F16) → a pull-request
 *   inbox and PR status display (a branch + PR arrive ONLY after a person approves, F17; never merged here).
 */
export const buildGitHosting: ChunkBuilder = (ctx) => {
  const { kit, m } = ctx; const g = new Group(); const T = DECK_TOP;
  chunkBase(kit, g, m); // the shared feature base (it stays on its external pad)
  const items: BankItem[] = []; const add = (it: BankItem) => items.push(it) - 1;
  // ── repository servers (north-west): vents, drive bays with activity lights, and a network switch ──
  const repo: number[] = [];
  for (const [x, z] of [[-1.75, -1.35], [-0.6, -1.45]] as const) {
    kit.box(g, 0.95, 1.55, 0.9, x, T + 0.78, z, m.screen, 0.07);
    kit.box(g, 1.0, 0.08, 0.95, x, T + 1.6, z, m.edge, 0.02);
    for (let v = 0; v < 3; v++) kit.box(g, 0.7, 0.025, 0.06, x, T + 1.66, z - 0.25 + v * 0.25, m.padPanel, 0); // top vents
    for (let r = 0; r < 4; r++) {
      kit.box(g, 0.78, 0.22, 0.04, x, T + 0.35 + r * 0.32, z + 0.46, m.padPanel, 0.02);
      repo.push(add({ p: [x + 0.3, T + 0.35 + r * 0.32, z + 0.49], s: [0.08, 0.05, 0.02], color: r === 0 ? OK : NEUTRAL }));
      for (let d = 0; d < 2; d++) repo.push(add({ p: [x - 0.3 + d * 0.1, T + 0.35 + r * 0.32, z + 0.49], s: [0.05, 0.03, 0.02], color: '#33afdf' })); // drive bays
    }
  }
  kit.box(g, 0.85, 0.22, 0.5, 0.55, T + 0.11, -1.55, m.screen, 0.03); // network switch
  const swp = Array.from({ length: 8 }, (_, i) => add({ p: [0.24 + i * 0.09, T + 0.14, -1.29], s: [0.05, 0.05, 0.02], color: OK }));
  deckCable(kit, g, m, [-1.75, -0.88], [-1.75, -0.7]); deckCable(kit, g, m, [-1.75, -0.7], [0.55, -0.7]); deckCable(kit, g, m, [0.55, -1.3], [0.55, -0.7]); deckCable(kit, g, m, [0.55, -0.7], [2.3, -0.7]); deckCable(kit, g, m, [2.3, -0.7], [2.3, 1.0]);
  // ── Git graph wall (centre): main, a merged branch below, a feature branch above, a PR branch on approval ──
  const BX = -0.65, BZ = 0.3, Ym = T + 0.95, Yb = T + 0.58, Yf = T + 1.32, Zf = BZ + 0.05;
  kit.box(g, 2.9, 0.12, 0.8, BX, T + 0.06, 0.55, m.padBase, 0.04);
  kit.box(g, 3.05, 1.25, 0.06, BX, T + 0.95, BZ, m.screen, 0.02);
  kit.box(g, 3.15, 0.07, 0.1, BX, T + 1.6, BZ, m.edge, 0.01);
  for (const x of [-2.1, 0.8]) kit.box(g, 0.08, 1.3, 0.08, x, T + 0.7, BZ - 0.05, m.edge, 0);
  const MAIN = [-1.9, -1.45, -1.0, -0.55, -0.1, 0.35];
  const seg2 = (x1: number, y1: number, x2: number, y2: number, color: string) => { const len = Math.hypot(x2 - x1, y2 - y1); return add({ p: [(x1 + x2) / 2, (y1 + y2) / 2, Zf], s: [len, 0.035, 0.03], color, rotZ: Math.atan2(y2 - y1, x2 - x1) }); };
  seg2(MAIN[0], Ym, MAIN[5], Ym, '#33afdf'); // main
  seg2(MAIN[0], Ym, -1.65, Yb, '#bfefff'); seg2(-1.65, Yb, -1.25, Yb, '#bfefff'); seg2(-1.25, Yb, MAIN[2], Ym, '#bfefff'); // merged branch
  seg2(MAIN[2], Ym, -0.75, Yf, '#5caa83'); seg2(-0.75, Yf, -0.35, Yf, '#5caa83');
  const featExt = seg2(-0.35, Yf, 0.05, Yf, '#5caa83'); // grows when a new commit lands (illustrative activity)
  const prSegs = [seg2(MAIN[5], Ym, 0.6, Yf, '#fe904d')]; // approved fix branch → pull request
  const nodeItems: BankItem[] = []; // commits are round: their own (sphere) bank
  const node = (x: number, y: number, color: string, d = 0.13) => nodeItems.push({ p: [x, y, Zf + 0.01], s: [d, d, d], color }) - 1;
  // provider badges on the hosting display itself (top-left corner): GitHub and Bitbucket, the active one lit
  const prov = { center: [-1.62, T + 1.36, BZ + 0.045] as V3, w: 0.86, h: 0.3 };
  const mainN = MAIN.map((x, i) => node(x, Ym, '#33afdf', i === 5 ? 0.16 : 0.13));
  const others = [...[-1.65, -1.25].map((x) => node(x, Yb, '#bfefff')), ...[-0.75, -0.35].map((x) => node(x, Yf, '#5caa83'))];
  const newC = node(0.05, Yf, '#5caa83', 0.14);
  const prN = node(0.6, Yf, '#fe904d', 0.15);
  const tags = [add({ p: [0.62, Ym, Zf], s: [0.16, 0.08, 0.02], color: '#33afdf' }), add({ p: [0.32, Yf, Zf], s: [0.14, 0.07, 0.02], color: '#5caa83' })]; // branch tips
  const stat = [OK, '#33afdf', '#fe904d'].map((color, i) => add({ p: [0.5 + i * 0.12, T + 1.48, Zf], s: [0.08, 0.06, 0.02], color })); // ready · cloning · PR open
  // ── repository console (south-west) and PR status display (south-centre) ──
  kit.box(g, 1.1, 0.7, 0.5, -1.55, T + 0.35, 1.75, m.padPanel, 0.05); kit.box(g, 1.16, 0.06, 0.56, -1.55, T + 0.73, 1.75, m.white, 0.02);
  const con = monitor(kit, g, m, -1.55, 1.75, 1.62, 1.0, 0.62);
  kit.box(g, 0.45, 0.55, 0.38, 0.3, T + 0.275, 1.9, m.padPanel, 0.04);
  const prd = monitor(kit, g, m, 0.3, 1.5, 1.85, 0.9, 0.56);
  // ── pull-request inbox (east) and the transfer gateway facing CyfroCode ──
  kit.box(g, 0.85, 0.3, 1.4, 1.75, T + 0.15, 1.35, m.edge, 0.05);
  kit.box(g, 0.7, 0.05, 1.25, 1.75, T + 0.32, 1.35, m.screen, 0.02);
  const prCard = [0, 1, 2].map((k) => add({ p: [1.75, T + 0.38 + k * 0.05, 1.0 + k * 0.35], s: [0.5, 0.03, 0.3], color: k === 2 ? '#fe904d' : NEUTRAL }));
  kit.box(g, 0.5, 0.62, 0.75, 2.35, T + 0.31, 1.35, m.panel, 0.04); // transfer terminal
  kit.box(g, 0.04, 0.3, 0.3, 2.61, T + 0.36, 1.35, m.screen, 0.01);
  const gateMt = new MeshStandardMaterial({ color: '#33afdf', emissive: '#33afdf', emissiveIntensity: 0.15, roughness: 0.4 }); ctx.owned.push(gateMt);
  const gate = kit.dyn(kit.torus(g, 0.13, 0.025, 2.63, T + 0.36, 1.35, gateMt)); gate.rotation.y = Math.PI / 2; // illuminated port
  const pkg = add({ p: [0, -5, 0], s: [0.24, 0.16, 0.24], color: '#33afdf' }); // the repository package
  const bank = ledBank(g, items), nodes = ledBank(g, nodeItems, 'sphere');
  const screens = createCityScreens([{ id: 'providerPanel', ...prov, group: g }, { id: 'repoConsole', ...con, group: g }, { id: 'prStatus', ...prd, group: g }] as CitySlot[], ctx.renderer);
  const PK: V3[] = [[-0.6, T + 0.9, -0.95], [MAIN[5], Ym + 0.25, BZ + 0.3], [2.35, T + 0.75, 1.35], [2.6, T + 0.36, 1.35]];
  const cp: V3 = [0, 0, 0];
  return {
    group: g,
    update(t, s) {
      const G = gitState(t, s), live = !s.still && G.stage !== 'ready';
      // servers: occasional disk activity at rest; busy while the repository is read for the clone
      repo.forEach((idx, i) => bank.set(idx, s.still ? 0.5 : G.stage === 'clone' ? (Math.floor(t * 8 + i * 1.7) % 3 === 0 ? 1 : 0.3) : 0.35 + 0.35 * (((t + i * 2.3) % 9) < 0.3 ? 1 : 0)));
      swp.forEach((idx, i) => bank.set(idx, G.stage === 'clone' || (G.stage === 'pr' && G.k > 0.6) ? (Math.floor(t * 7 + i) % 2 ? 0.9 : 0.3) : 0.4));
      // graph: illustrative commit activity (selected pass), the head selected during a clone, the PR branch on approval
      const act = G.stage === 'activity' ? G.k : -1;
      const grow = act < 0 ? 1 : seg(act, 0.25, 0.55), commit = act < 0 ? 1 : seg(act, 0.5, 0.62);
      bank.size(featExt, Math.max(0.0001, 0.4 * grow), 0.035, 0.03); bank.move(featExt, -0.35 + 0.2 * grow, Yf, Zf);
      nodes.scale(newC, Math.max(0.0001, ease(commit))); nodes.set(newC, act >= 0.5 && act < 0.75 ? 1.3 : 0.8);
      bank.move(tags[1], -0.05 + 0.37 * grow, Yf, Zf);
      const selHead = G.stage === 'clone';
      mainN.forEach((idx, i) => { nodes.set(idx, i === 5 && selHead ? 0.9 + 0.4 * Math.sin(t * 7) : 0.75); nodes.scale(idx, i === 5 && selHead ? 1.35 : 1); });
      const pr = G.stage === 'pr' && G.prOpen;
      prSegs.forEach((idx) => { bank.scale(idx, pr ? 1 : 0.0001); bank.set(idx, 0.9); });
      nodes.scale(prN, pr ? 1 : 0.0001); nodes.set(prN, pr && live ? 0.9 + 0.3 * Math.sin(t * 5) : 0.9);
      bank.set(tags[0], 0.75); bank.set(tags[1], 0.75);
      for (const i of others) nodes.set(i, 0.75);
      bank.set(stat[0], G.stage === 'ready' || G.stage === 'activity' ? 0.9 : 0.35);
      bank.set(stat[1], G.stage === 'clone' ? 0.6 + 0.5 * Math.sin(t * 8) : 0.12);
      bank.set(stat[2], pr ? 0.95 : G.stage === 'waiting' ? 0.35 : 0.12);
      // transfer gateway: the package moves from the servers to the gateway as the clone convoy leaves
      const cl = G.stage === 'clone' ? G.k : -1;
      if (cl >= 0 && cl < 0.85) { const u = seg(cl, 0, 0.45), n = PK.length - 1, si = Math.min(n - 1, Math.floor(u * n)); arc(cp, PK[si], PK[si + 1], u * n - si, si === 0 ? 0.3 : 0.1); bank.move(pkg, cp[0], cp[1], cp[2]); bank.scale(pkg, cl > 0.45 ? 1 - seg(cl, 0.45, 0.85) : 1); }
      else bank.scale(pkg, 0.0001);
      bank.set(pkg, 1.1);
      gateMt.emissiveIntensity = s.still ? 0.4 : G.stage === 'clone' || (G.stage === 'pr' && !G.prOpen) ? 0.5 + 0.6 * Math.max(s.depart, s.arrive, 0.5 + 0.5 * Math.sin(t * 6)) : 0.15;
      // PR inbox: the third card only for an approved, published patch; a rejection never produces one
      bank.scale(prCard[2], pr ? 1 : 0.0001); bank.set(prCard[2], pr && live && G.k < 1 ? 0.7 + 0.3 * Math.sin(t * 6) : 0.6);
      bank.set(prCard[0], 0.4); bank.set(prCard[1], 0.4);
      bank.flush(); nodes.flush();
    },
    paint(cl, _a, red, dark, s) { screens.update(cl, red, dark, s); },
    dispose() { screens.dispose(); bank.dispose(); nodes.dispose(); },
  };
};

/**
 * Reserved platform: predominantly black, outlined edges, a prominent "?". No machinery, no
 * silhouette, no ports and nothing that looks operational. Idle: a slow bob and edge "breath".
 */
export const buildMystery: ChunkBuilder = (ctx) => {
  const { kit, m } = ctx; const g = new Group();
  kit.box(g, FOOT, 0.16, FOOT, 0, 0.15, 0, m.mysteryDeck, 0.1);
  // illuminated outer edges
  const rim = new MeshStandardMaterial({ color: '#039be0', emissive: '#039be0', emissiveIntensity: 0.55, roughness: 0.4 }); ctx.owned.push(rim);
  const e = FOOT / 2 - 0.03;
  for (const [w, d, x, z] of [[FOOT, 0.06, 0, e], [FOOT, 0.06, 0, -e], [0.06, FOOT, e, 0], [0.06, FOOT, -e, 0]] as const) kit.box(g, w, 0.05, d, x, DECK_TOP + 0.02, z, rim, 0); // material-only animation: merged into one draw call
  // reserved build area: a low inner frame
  const inner = FOOT - 1.2;
  for (const [w, d, x, z] of [[inner, 0.05, 0, inner / 2], [inner, 0.05, 0, -inner / 2], [0.05, inner, inner / 2, 0], [0.05, inner, -inner / 2, 0]] as const) kit.box(g, w, 0.05, d, x, DECK_TOP + 0.03, z, m.edge, 0);
  const edgeGeo = new EdgesGeometry(new BoxGeometry(FOOT, 0.16, FOOT)); const lines = new LineSegments(edgeGeo, m.rimLine); lines.position.y = 0.15; g.add(lines);
  // the "?"
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const cx = c.getContext('2d')!;
  const draw = (dark: boolean) => {
    cx.clearRect(0, 0, 256, 256);
    cx.font = '800 210px Inter, "Segoe UI", system-ui, sans-serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
    cx.shadowColor = dark ? 'rgba(51,175,223,0.9)' : 'rgba(2,120,174,0.6)'; cx.shadowBlur = 24;
    cx.fillStyle = dark ? '#5cc6ee' : '#0278ae'; cx.fillText('?', 128, 138);
  };
  draw(true);
  const tex = new CanvasTexture(c); tex.colorSpace = SRGBColorSpace;
  const qMat = new SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: AdditiveBlending }); ctx.owned.push(qMat);
  const q = kit.dyn(new Group()); g.add(q);
  const sprite = new Sprite(qMat); sprite.scale.setScalar(1.9); sprite.position.set(0, DECK_TOP + 1.45, 0); q.add(sprite);
  return {
    group: g,
    update(t, s) {
      q.position.y = s.still ? 0 : Math.sin((t / 6) * Math.PI * 2) * 0.04;
      rim.emissiveIntensity = s.still ? 0.55 : 0.55 * (1 + 0.1 * Math.sin((t / 8) * Math.PI * 2));
    },
    theme(dark) { draw(dark); tex.needsUpdate = true; qMat.blending = dark ? AdditiveBlending : NormalBlending; qMat.needsUpdate = true; },
    dispose() { tex.dispose(); edgeGeo.dispose(); },
  };
};
