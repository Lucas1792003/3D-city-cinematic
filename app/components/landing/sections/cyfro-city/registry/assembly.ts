import type { DemoSpec } from './director';
import type { ChunkDefinition } from './types';

/**
 * The /platform-city opening: the city ASSEMBLES around the CyfroAI Engine, one platform at a time.
 *
 * This is a PRESENTATION order, chosen to keep the camera travelling smoothly across the grid
 * (centre → west → south → east). It is not the order the software runs in, and the UI says so.
 * Connections appear only once both of their platforms exist; demonstrations use verified story steps
 * (between platforms already present) or the platform's own working sequence.
 */
export const ENGINE_ID = 'cyfro-ai-engine';
export const OPENING = 4;     // the Engine alone
export const RISE = 1.0;      // a platform rising into place
export const DEMO_DELAY = 0.6; // its demonstration starts as it settles
export const FINALE = 4;      // pull back to the full-city overview, then rest
export const REVEAL_GLOW = 1.4; // a newly established connection glows briefly

export type Slot = { id: string; dur: number; demo: DemoSpec };
const loop = (a: number, b: number): DemoSpec => ({ kind: 'loop', k: [a, b] });
const story = (track: 'infra' | 'code', a: number, b: number): DemoSpec => ({ kind: 'story', track, t: [a, b] });
const none: DemoSpec = { kind: 'none' };

export const SLOTS: Slot[] = [
  { id: 'ai-providers', dur: 3.2, demo: story('infra', 22.1, 25.9) },     // the shared AI layer → external provider and back (north, behind the Engine)
  { id: 'cyfro-ai-insights', dur: 3.4, demo: loop(0.3, 0.9) },            // ranked risks → AI explanation
  { id: 'data-ingestion', dur: 3.8, demo: loop(0.15, 0.9) },              // records normalised and correlated
  { id: 'scan-control', dur: 3.2, demo: loop(0.3, 0.95) },                // a job queued for an agent
  { id: 'cyfro-agent', dur: 4.0, demo: story('infra', 0.6, 5.6) },        // heartbeat OUT, signed command back over the agent's own connection
  { id: 'customer-infra', dur: 2.0, demo: none },
  { id: 'network-discovery', dur: 2.6, demo: story('infra', 6.0, 8.0) },  // the agent runs a port scan
  { id: 'service-fingerprinting', dur: 2.6, demo: story('infra', 10.0, 12.0) },
  { id: 'asset-discovery', dur: 3.2, demo: loop(0, 0.5) },                // one asset detected → sorted into inventory
  { id: 'git-hosting', dur: 2.4, demo: loop(0.2, 0.75) },                 // repository activity
  { id: 'cyfro-code', dur: 4.0, demo: story('code', 0.2, 5.2) },          // clone from code hosting → scanners run
  { id: 'cyfro-compliance', dur: 3.8, demo: story('infra', 20.4, 26.0) }, // evaluation job → controls evaluated
  { id: 'reporting', dur: 3.0, demo: story('infra', 26.0, 28.5) },        // reports read the snapshot
  { id: 'cyfro-topology', dur: 3.8, demo: story('infra', 26.0, 29.4) },   // graph built, then inspected
  { id: 'cyfro-assistant', dur: 3.8, demo: story('infra', 28.6, 32.4) },  // read tool → shared AI layer → a proposal waits for a person
  { id: 'access-plaza', dur: 4.2, demo: story('code', 12.6, 18.4) },      // approval checkpoint: pending → approved (illustrative)
];
/** a released platform without its own choreography yet: it still arrives (and just settles) */
export const DEFAULT_SLOT = { dur: 2.6, demo: none };
/** an approved teaser: arrives last, black, no activity */
export const TEASER_SLOT = { dur: 1.4, demo: none };

/**
 * The slots for the platforms actually shown: choreographed ones in order, then any other released platform,
 * then approved teasers (0…n). Nothing is hard-coded to a platform count.
 */
export function slotsFor(chunks: Pick<ChunkDefinition, 'id' | 'publicVisibility'>[], choreography: Slot[] = SLOTS): Slot[] {
  const ids = new Set(chunks.map((c) => c.id));
  const known = new Set(choreography.map((sl) => sl.id));
  const planned = choreography.filter((sl) => ids.has(sl.id));
  const others = chunks.filter((c) => c.id !== ENGINE_ID && !known.has(c.id) && c.publicVisibility !== 'mystery').map((c) => ({ id: c.id, ...DEFAULT_SLOT }));
  const teasers = chunks.filter((c) => c.publicVisibility === 'mystery' && !known.has(c.id)).map((c) => ({ id: c.id, ...TEASER_SLOT }));
  return [...planned, ...others, ...teasers];
}

export function timeline(slots: Slot[]) {
  const start: number[] = []; let t = OPENING;
  for (const s of slots) { start.push(t); t += s.dur; }
  const finaleAt = t, total = t + FINALE;
  const index = new Map(slots.map((s, i) => [s.id, i]));
  /** when a platform has finished rising (the Engine is there from the start) */
  const arrivedAt = (id: string) => { const i = index.get(id); return i === undefined ? 0 : start[i] + RISE; };
  /** 0 (absent) … 1 (in place) */
  const presence = (id: string, T: number) => { const i = index.get(id); if (i === undefined) return 1; if (T >= start[i] + RISE) return 1; return Math.min(1, Math.max(0, (T - start[i]) / RISE)); }; // exactly 1 from arrivedAt on (no float residue)
  /** the slot playing at T: -1 = the Engine alone, slots.length = the finale */
  const slotAt = (T: number) => { if (T < OPENING) return -1; for (let i = slots.length - 1; i >= 0; i--) if (T >= start[i]) return T >= finaleAt ? slots.length : i; return -1; };
  /** demonstration progress of slot i at T (null outside its window) */
  const demoAt = (i: number, T: number) => { const a = start[i] + DEMO_DELAY, b = start[i] + slots[i].dur; return T >= a && T < b ? (T - a) / (b - a) : null; };
  return { slots, start, finaleAt, total, arrivedAt, presence, slotAt, demoAt };
}
