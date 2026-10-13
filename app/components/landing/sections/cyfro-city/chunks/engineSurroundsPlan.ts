import type { ChunkSignal } from './types';
import type { FlowDefinition, StoryBeat } from '../registry/types';

/**
 * CyfroAI Engine platform surrounds — the plan (layout numbers, conduit timing, terminal states).
 * Import-free (type-only imports) so Node tests can check it; the 3D layer is engineSurrounds.ts.
 *
 * The Engine itself (chunks/cyfroAiEngine.ts) is a protected asset and is not touched: the surrounds are a
 * separate layer added to the Engine chunk's group, on the free floor around the device, all lower than it.
 * Conduits run only to the Engine's four verified AI ports (Insights, Assistant, Code, AI provider) — the
 * Engine is a shared AI component, not a hub that all platform data passes through.
 */
export const ENGINE_ID = 'cyfro-ai-engine';
export const HALF = 2.7;     // half the chunk footprint (FOOT / 2)
export const TOP = 0.23;     // deck top (DECK_TOP)
/** the Engine device's footprint on the deck (its mounting base, chunk-local) — nothing new may enter it */
export const DEVICE = { x0: -1.45, x1: 1.45, z0: -1.73, z1: 1.13 };
/** the front kerb (shared deck treatment) */
export const KERB_Z = 2.5;

export type Side = 'n' | 'e' | 's' | 'w';
/** floor conduits: from the device edge to the port it serves (chunk-local x/z), one per verified AI port */
export const CONDUITS: Record<Side, { from: [number, number]; to: [number, number] }> = {
  n: { from: [0, DEVICE.z0 - 0.02], to: [0, -HALF + 0.12] },          // AI provider (F12)
  s: { from: [0, DEVICE.z1 + 0.05], to: [0, KERB_Z - 0.1] },          // CyfroAI Insights (F09)
  e: { from: [0.95, 1.62], to: [HALF - 0.12, 1.62] },                 // CyfroAssistant (F10)
  w: { from: [-0.95, 1.62], to: [-HALF + 0.12, 1.62] },               // CyfroCode (F11)
};
/** low-profile equipment (centre x/z, size w/h/d); all far lower than the Engine (its top module is at ~2.1) */
export const AUX = [
  { id: 'cooling-w', x: -2.05, z: -2.05, w: 0.8, h: 0.34, d: 0.7 },
  { id: 'cooling-e', x: 2.05, z: -2.05, w: 0.8, h: 0.34, d: 0.7 },
];
export const TERMINAL = { x: -2.0, z: 2.08, w: 0.62, h: 0.4, base: 0.42, tilt: -0.55, rotY: 0.45 };
export const HATCHES = [{ x: 2.05, z: -0.45, s: 0.62 }, { x: -2.05, z: -0.45, s: 0.62 }];
/** thin floor traces (polylines, chunk-local x/z) from the device's edges toward the conduits — engineered, not decorative */
export const TRACES: [number, number][][] = [
  [[1.5, 0.2], [1.9, 0.2], [1.9, 1.42]], [[1.5, 0.6], [2.35, 0.6], [2.35, 1.42]], [[1.5, -1.25], [1.72, -1.25], [1.72, -1.55]],
  [[-1.5, 0.2], [-1.9, 0.2], [-1.9, 1.42]], [[-1.5, 0.6], [-2.35, 0.6], [-2.35, 1.42]], [[-1.5, -1.25], [-1.72, -1.25], [-1.72, -1.55]],
  [[0.5, -1.78], [0.5, -2.2], [1.4, -2.2]], [[-0.5, -1.78], [-0.5, -2.2], [-1.4, -2.2]],
  [[0.45, 1.18], [0.45, 1.48]], [[-0.45, 1.18], [-0.45, 1.48]],
];
export const MAX_HEIGHT = 1.0; // nothing new reaches above this (the Engine housing tops out above 2)

/* ── activity: which conduit carries what, derived from the story (never hard-coded timings) ── */
export type Window = { side: Side; a: number; b: number; dir: 'in' | 'out' };
/** For every story step that touches the Engine: the conduit windows, in step progress (0..1). */
export function engineWindows(story: Pick<StoryBeat, 'id' | 'flows'>[], flows: Pick<FlowDefinition, 'id' | 'from' | 'to'>[], portSide: Record<string, Side>): Record<string, Window[]> {
  const out: Record<string, Window[]> = {};
  for (const step of story) {
    const ws: Window[] = [];
    for (const r of step.flows) {
      const f = flows.find((x) => x.id === r.id); if (!f) continue;
      const atEngine = f.to.chunk === ENGINE_ID ? 'to' : f.from.chunk === ENGINE_ID ? 'from' : null;
      if (!atEngine) continue;
      const port = atEngine === 'to' ? f.to.port : f.from.port;
      const toward = (atEngine === 'to') !== Boolean(r.reverse); // travelling toward the Engine?
      if (r.hold) continue;
      ws.push({ side: portSide[port], a: r.a ?? 0, b: r.b ?? 1, dir: toward ? 'in' : 'out' });
    }
    if (ws.length) out[step.id] = ws.sort((p, q) => p.a - q.a);
  }
  return out;
}

export type DiagState = 'ready' | 'received' | 'processing' | 'response';
export const DIAG_LABEL: Record<DiagState, string> = { ready: 'Ready', received: 'Request received', processing: 'Processing', response: 'Response available' };

/** terminal state within one Engine step: received as the first request lands, processing until the last reply leaves */
export function diagAt(ws: Window[], p: number): DiagState {
  const first = ws.find((w) => w.dir === 'in'), last = [...ws].reverse().find((w) => w.dir === 'out');
  if (!first || !last) return 'ready';
  if (p < first.a + 0.6 * (first.b - first.a)) return 'ready';
  if (p < first.b) return 'received';
  if (p < last.a) return 'processing';
  return 'response';
}

export type SurroundState = { diag: DiagState; /** 0..1 light along each conduit's travelling pulse, by side */ pulse: Record<Side, { k: number; dir: 'in' | 'out' } | null>; busy: number };
/** what the surrounds show this frame (only while an Engine step runs; a paused city holds Ready) */
export function surroundState(s: Pick<ChunkSignal, 'still' | 'beats' | 'progress'>, windows: Record<string, Window[]>): SurroundState {
  const st: SurroundState = { diag: 'ready', pulse: { n: null, e: null, s: null, w: null }, busy: 0 };
  if (s.still) return st;
  const id = s.beats.find((b) => windows[b]); if (!id) return st;
  const ws = windows[id], p = s.progress;
  st.diag = diagAt(ws, p);
  for (const w of ws) if (p >= w.a && p < w.b) st.pulse[w.side] = { k: (p - w.a) / (w.b - w.a), dir: w.dir };
  st.busy = st.diag === 'ready' ? 0 : st.diag === 'processing' ? 1 : 0.6;
  return st;
}

/* ── staged reveal: the Engine is the seed; its support details arrive one after another while it stands alone ── */
/** stage windows in seconds of the city's intro clock (the Engine-alone opening lasts 4 s, see registry/assembly.ts) */
export const REVEAL = {
  floor: [0.5, 1.5],     // floor circuitry, seams and conduit channels rise and spread outward from the Engine
  trace: [0.9, 2.0],     // the conduit light cores trace outward to the ports
  panels: [1.3, 2.1],    // access hatches, fasteners and port sockets settle in
  terminal: [1.7, 2.6],  // the diagnostic monitor rises from the deck…
  boot: [2.2, 2.9],      // …and its screen boots
  modules: [2.1, 3.0],   // the cooling / support modules rise at the back corners
  lights: [2.8, 3.5],    // finally the support lights come on
} as const;
export type RevealStage = keyof typeof REVEAL;
export type Reveal = Record<RevealStage, number>;
const smooth = (x: number) => { const v = Math.min(1, Math.max(0, x)); return v * v * (3 - 2 * v); };
/** progress (0..1, eased) of every stage at intro time T; null = no intro running → everything in place */
export function revealAt(T: number | null): Reveal {
  const out = {} as Reveal;
  for (const k of Object.keys(REVEAL) as RevealStage[]) { const [a, b] = REVEAL[k]; out[k] = T === null ? 1 : smooth((T - a) / (b - a)); }
  return out;
}
