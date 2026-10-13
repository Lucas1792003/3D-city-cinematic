import { CanvasTexture, Group, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace, type BufferGeometry } from 'three';
import { ledBank, type BankItem } from '../kit/ledBank';
import { mergeStaticMeshes } from '../kit/merge';
import { STORY } from '../registry/story';
import { FLOWS } from '../registry/flows';
import { AUX, CONDUITS, DIAG_LABEL, HATCHES, TERMINAL, TOP, TRACES, engineWindows, revealAt, surroundState, type DiagState, type Side } from './engineSurroundsPlan';
import type { ChunkBuilder, ChunkCtx, ChunkSignal } from './types';

/**
 * CyfroAI Engine platform surrounds: embedded floor circuitry, conduits to the four AI ports, two low cooling
 * modules, access hatches with fasteners, panel seams, port sockets and a small angled diagnostic terminal.
 *
 * P0: the Engine (chunks/cyfroAiEngine.ts) is NOT modified. `withEngineSurrounds` wraps its builder: it builds the
 * Engine exactly as before, then adds this separate layer to the same chunk group (so it appears, rises and is
 * selected together with the Engine) and forwards every Engine hook untouched. The Engine harness still renders
 * the bare builder, which is how its pixel identity stays verifiable.
 *
 * Motion is driven only by the story steps that touch the Engine (its four verified AI flows): a soft pulse along
 * the conduit a request travels on, the terminal's state, and the cooling modules' lights. No independent loop.
 */
const CYAN = '#33afdf', OKC = '#4fbf8b';
const SIDES: readonly Side[] = ['n', 'e', 's', 'w'];

function buildSurrounds(ctx: ChunkCtx) {
  const { kit, m } = ctx;
  const g = new Group(); g.name = 'engine-surrounds';
  // four reveal stages (merged per material within each, so they can rise in one after another)
  const floor = new Group(), panels = new Group(), terminal = new Group(), modules = new Group();
  floor.name = 'surrounds:floor'; panels.name = 'surrounds:panels'; terminal.name = 'surrounds:terminal'; modules.name = 'surrounds:modules';
  const items: BankItem[] = []; const add = (it: BankItem) => items.push(it) - 1;
  const T = TOP;

  // ── panel seams on the open floor (thin recessed lines) ──
  for (const x of [-1.58, 1.58]) kit.box(floor, 0.014, 0.006, 4.0, x, T + 0.003, -0.55, m.screen, 0);
  for (const sx of [-1, 1]) kit.box(floor, 1.0, 0.006, 0.014, sx * 2.1, T + 0.003, 0.15, m.screen, 0);

  // ── floor circuitry: thin traces from the device edge toward the conduits, with solder pads ──
  for (const path of TRACES) {
    for (let i = 1; i < path.length; i++) {
      const [x0, z0] = path[i - 1], [x1, z1] = path[i];
      kit.box(floor, Math.abs(x1 - x0) + 0.024, 0.008, Math.abs(z1 - z0) + 0.024, (x0 + x1) / 2, T + 0.004, (z0 + z1) / 2, m.edge, 0);
    }
    const [ex, ez] = path[path.length - 1]; kit.box(floor, 0.07, 0.01, 0.07, ex, T + 0.005, ez, m.edge, 0);
  }

  // ── conduits: a recessed channel with lips, a lit core (segments), and a socket at the port ──
  const core: Record<Side, { idx: number; u: number }[]> = { n: [], e: [], s: [], w: [] };
  const sockets = {} as Record<Side, number>;
  for (const side of SIDES) {
    const { from: [x0, z0], to: [x1, z1] } = CONDUITS[side];
    const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0), len = Math.hypot(x1 - x0, z1 - z0), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const [w, d] = alongX ? [len, 0.15] : [0.15, len];
    kit.box(floor, w, 0.012, d, cx, T + 0.006, cz, m.screen, 0);
    for (const o of [-0.09, 0.09]) kit.box(floor, alongX ? len : 0.025, 0.016, alongX ? 0.025 : len, alongX ? cx : cx + o, T + 0.008, alongX ? cz + o : cz, m.edge, 0);
    const n = Math.max(3, Math.round(len / 0.3));
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n, x = x0 + (x1 - x0) * u, z = z0 + (z1 - z0) * u;
      core[side].push({ idx: add({ p: [x, T + 0.016, z], s: alongX ? [0.2, 0.012, 0.04] : [0.04, 0.012, 0.2], color: CYAN }), u });
    }
    // port socket: a small block with a dark slot and an indicator
    const [sw, sd] = alongX ? [0.16, 0.34] : [0.34, 0.16];
    kit.box(panels, sw, 0.07, sd, x1, T + 0.035, z1, m.edge, 0.015);
    kit.box(panels, alongX ? 0.04 : 0.2, 0.012, alongX ? 0.2 : 0.04, x1, T + 0.072, z1, m.screen, 0);
    sockets[side] = add({ p: alongX ? [x1, T + 0.075, z1 + 0.12] : [x1 + 0.12, T + 0.075, z1], s: [0.05, 0.02, 0.05], color: CYAN });
  }

  // ── access hatches with fasteners and a handle slot ──
  for (const h of HATCHES) {
    kit.box(panels, h.s, 0.01, h.s, h.x, T + 0.005, h.z, m.edge, 0);
    kit.box(panels, h.s - 0.08, 0.014, h.s - 0.08, h.x, T + 0.007, h.z, m.panel, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) kit.box(panels, 0.035, 0.018, 0.035, h.x + sx * (h.s / 2 - 0.07), T + 0.01, h.z + sz * (h.s / 2 - 0.07), m.white, 0);
    kit.box(panels, 0.2, 0.016, 0.04, h.x, T + 0.009, h.z + h.s / 2 - 0.13, m.screen, 0);
  }

  // ── two low cooling / auxiliary modules at the back corners (behind the Engine, never in front of it) ──
  const auxLed: number[] = [], auxGlow: number[] = [];
  for (const a of AUX) {
    const y0 = T;
    kit.box(modules, a.w, a.h, a.d, a.x, y0 + a.h / 2, a.z, m.panel, 0.04);
    kit.box(modules, a.w + 0.04, 0.04, a.d + 0.04, a.x, y0 + a.h + 0.02, a.z, m.edge, 0.015);
    for (let v = 0; v < 4; v++) kit.box(modules, a.w - 0.2, 0.012, 0.05, a.x, y0 + a.h + 0.046, a.z - 0.22 + v * 0.145, m.screen, 0); // top vents
    for (let v = 0; v < 3; v++) kit.box(modules, a.w - 0.3, 0.025, 0.012, a.x - 0.05, y0 + 0.09 + v * 0.07, a.z + a.d / 2 + 0.004, m.screen, 0); // front grille
    kit.box(modules, 0.16, 0.05, 0.01, a.x + a.w / 2 - 0.14, y0 + a.h - 0.07, a.z + a.d / 2 + 0.006, m.white, 0); // equipment marking plate
    auxLed.push(add({ p: [a.x + a.w / 2 - 0.14, y0 + 0.12, a.z + a.d / 2 + 0.01], s: [0.05, 0.05, 0.015], color: OKC }));
    auxGlow.push(add({ p: [a.x, y0 + a.h + 0.044, a.z + a.d / 2 - 0.04], s: [a.w - 0.24, 0.012, 0.025], color: CYAN }));
  }

  // ── diagnostic terminal at the front-left corner: pedestal + angled display (repainted only on a state change) ──
  const term = new Group(); term.position.set(TERMINAL.x, T, TERMINAL.z); term.rotation.y = TERMINAL.rotY; terminal.add(term);
  kit.box(term, 0.36, 0.05, 0.28, 0, 0.025, 0, m.edge, 0.015);
  kit.box(term, 0.09, TERMINAL.base, 0.09, 0, TERMINAL.base / 2, 0, m.edge, 0.01);
  const head = new Group(); head.position.set(0, TERMINAL.base + 0.08, 0); head.rotation.x = TERMINAL.tilt; term.add(head);
  kit.box(head, TERMINAL.w + 0.08, TERMINAL.h + 0.08, 0.06, 0, 0, 0, m.edge, 0.02);
  const W = 256, H = Math.round((W * TERMINAL.h) / TERMINAL.w);
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  const c2 = canvas.getContext('2d')!;
  const tex = new CanvasTexture(canvas); tex.colorSpace = SRGBColorSpace;
  const scrGeo = new PlaneGeometry(TERMINAL.w, TERMINAL.h), scrMat = new MeshBasicMaterial({ map: tex, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const scr = new Mesh(scrGeo, scrMat); scr.position.z = 0.032; scr.name = 'screen:engineDiag'; scr.userData.dynamic = true; head.add(scr);

  // merge each stage's static details per material (the Engine chunk itself is never merged; this layer is ours)
  const merged: BufferGeometry[] = [];
  function mergeStage(stage: Group) {
    merged.push(...mergeStaticMeshes(stage, { skip: (mesh) => mesh === scr, minMeshes: 1, castShadow: false, name: `${stage.name}:merged` }));
    g.add(stage);
  }

  for (const st of [floor, panels, terminal, modules]) mergeStage(st); // the terminal keeps its screen (inside its rotated groups)
  const leds = ledBank(g, items);

  // ── activity ──
  const sideOf: Record<string, Side> = {};
  for (const p of ctx.def.ports) sideOf[p.id] = p.side as Side; // the Engine's own ports
  const windows = engineWindows(STORY, FLOWS, sideOf);
  let busy = 0, prev = -1, painted = '';
  const ORDER: DiagState[] = ['ready', 'received', 'processing', 'response'];
  function paint(state: DiagState, dark: boolean) {
    const key = `${state}/${dark}`; if (key === painted) return; painted = key;
    const bg = dark ? '#0b1826' : '#ffffff', panel = dark ? '#14283a' : '#eef4f9', text = dark ? '#e9f1f8' : '#0f1f2f', muted = dark ? '#8ea4b7' : '#566b80', blue = dark ? '#039be0' : '#0278ae', green = dark ? '#4fbf8b' : '#2f9e6b';
    const c = c2, s = W / 256;
    c.fillStyle = bg; c.fillRect(0, 0, W, H);
    c.fillStyle = panel; c.fillRect(0, 0, W, 30 * s);
    c.font = `700 ${12 * s}px Inter, system-ui, sans-serif`; c.textBaseline = 'middle'; c.textAlign = 'left'; c.fillStyle = text; c.fillText('CyfroAI Engine · diagnostics', 10 * s, 15 * s);
    const col = state === 'response' ? green : state === 'ready' ? muted : blue;
    c.beginPath(); c.arc(16 * s, 54 * s, 6 * s, 0, Math.PI * 2); c.fillStyle = col; c.fill();
    c.font = `800 ${17 * s}px Inter, system-ui, sans-serif`; c.fillStyle = state === 'ready' ? text : col; c.fillText(DIAG_LABEL[state], 30 * s, 54 * s);
    ORDER.forEach((st, i) => {
      const x = (10 + i * 60) * s, on = st === state, past = ORDER.indexOf(state) > i && state !== 'ready';
      c.fillStyle = on ? col : past ? (dark ? '#2a4157' : '#d3e0ec') : panel; c.fillRect(x, 78 * s, 54 * s, 6 * s);
    });
    c.font = `600 ${9 * s}px Inter, system-ui, sans-serif`; c.fillStyle = muted; c.textAlign = 'right'; c.fillText('Illustrative', W - 8 * s, H - 9 * s);
    tex.needsUpdate = true;
  }
  let last: DiagState = 'ready';

  /* staged reveal (the city's opening): driven only by the intro clock, so pause / skip / replay just follow it */
  let rv = revealAt(null); // fully built unless an intro drives it
  const PZ = -0.3; // the Engine device's centre (z): the floor details spread outward from it
  function applyReveal() {
    const f = rv.floor, sc = 0.9 + 0.1 * f;
    floor.visible = f > 0; floor.scale.set(sc, 1, sc); floor.position.set(0, -0.035 * (1 - f), PZ * (1 - sc));
    panels.visible = rv.panels > 0; panels.position.y = -0.03 * (1 - rv.panels);
    terminal.visible = rv.terminal > 0; terminal.position.y = -1.1 * (1 - rv.terminal); // rises out of the deck
    modules.visible = rv.modules > 0; modules.position.y = -0.45 * (1 - rv.modules);
  }
  function paintBoot(k: number, dark: boolean) {
    const step = Math.min(4, Math.floor(k * 5)); const key = `boot${step}/${dark}`; if (key === painted) return; painted = key;
    const bg = dark ? '#0b1826' : '#ffffff', panel = dark ? '#14283a' : '#eef4f9', text = dark ? '#e9f1f8' : '#0f1f2f', muted = dark ? '#8ea4b7' : '#566b80';
    const c = c2, s = W / 256;
    c.fillStyle = step === 0 ? '#05090e' : bg; c.fillRect(0, 0, W, H); // off → powered
    if (step >= 1) { c.fillStyle = panel; c.fillRect(0, 0, W, 30 * s); }
    if (step >= 2) { c.font = `700 ${12 * s}px Inter, system-ui, sans-serif`; c.textBaseline = 'middle'; c.textAlign = 'left'; c.fillStyle = text; c.fillText('CyfroAI Engine · diagnostics', 10 * s, 15 * s); }
    if (step >= 3) { c.font = `600 ${11 * s}px Inter, system-ui, sans-serif`; c.fillStyle = muted; c.fillText('Starting…', 30 * s, 54 * s); c.fillStyle = panel; c.fillRect(10 * s, 78 * s, 234 * s, 6 * s); c.fillStyle = muted; c.fillRect(10 * s, 78 * s, 234 * s * (step - 2) / 3, 6 * s); }
    tex.needsUpdate = true;
  }
  return {
    group: g,
    update(t: number, s: ChunkSignal) {
      const dt = prev < 0 || t < prev ? 0 : Math.min(0.1, t - prev); prev = t;
      const st = surroundState({ still: s.still || s.phase === 'idle', beats: s.beats, progress: s.progress }, windows);
      last = st.diag;
      const quiet = s.level === 2 ? 0.6 : 1; // calmer in the overview
      for (const side of SIDES) {
        const pl = st.pulse[side];
        for (const { idx, u } of core[side]) {
          let k = 0.16;
          if (pl) { const q = pl.dir === 'out' ? pl.k : 1 - pl.k; k = s.low ? 0.7 : 0.16 + quiet * 1.05 * Math.exp(-(((u - q) / 0.14) ** 2)); }
          leds.set(idx, k);
        }
        leds.set(sockets[side], pl ? 0.5 + 0.5 * quiet : 0.2);
      }
      busy += (st.busy - busy) * Math.min(1, dt * 2.5); // modules ease in and out gently
      if (s.still) busy = 0;
      const L = rv.lights;
      auxLed.forEach((i) => { leds.scale(i, rv.modules >= 0.98 ? 1 : 0.0001); leds.set(i, (0.45 + 0.4 * busy) * L); });
      auxGlow.forEach((i) => { leds.scale(i, rv.modules >= 0.98 ? 1 : 0.0001); leds.set(i, (0.12 + 0.55 * busy * quiet) * L); });
      for (const side of SIDES) {
        leds.scale(sockets[side], rv.panels > 0.6 ? 1 : 0.0001);
        if (L < 1) leds.set(sockets[side], 0.2 * (0.25 + 0.75 * L));
        // the conduit cores trace outward from the Engine, a soft glow at the trace head
        if (rv.trace < 1) for (const { idx, u } of core[side]) { const on = rv.floor >= 0.98 && u <= rv.trace; leds.scale(idx, on ? 1 : 0.0001); leds.set(idx, 0.16 + 0.9 * Math.exp(-(((u - rv.trace) / 0.12) ** 2))); }
        else for (const { idx } of core[side]) leds.scale(idx, 1);
      }
      leds.flush();
    },
    paint(dark: boolean) { if (rv.boot < 1) paintBoot(rv.boot, dark); else paint(last, dark); },
    /** the city's intro clock (null: no intro) */
    intro(T: number | null) { rv = revealAt(T); applyReveal(); },
    dispose() { leds.dispose(); merged.forEach((x) => x.dispose()); scrGeo.dispose(); scrMat.dispose(); tex.dispose(); },
  };
}

/** The Engine builder, unchanged, plus its platform surrounds as a separate layer in the same chunk group. */
export function withEngineSurrounds(build: ChunkBuilder): ChunkBuilder {
  return (ctx) => {
    const inst = build(ctx);
    const sur = buildSurrounds(ctx);
    inst.group.add(sur.group);
    return {
      ...inst,
      update(t, s) { inst.update(t, s); sur.update(t, s); },
      intro(T) { inst.intro?.(T); sur.intro(T); },
      paint(cl, act, red, dark, s) { inst.paint?.(cl, act, red, dark, s); sur.paint(dark); },
      dispose() { inst.dispose(); inst.group.remove(sur.group); sur.dispose(); },
    };
  };
}
