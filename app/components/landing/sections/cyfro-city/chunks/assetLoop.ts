/**
 * Asset Discovery's illustrative working loop, shared by the 3D chunk and its two screens so they never drift.
 *
 *   scan (pulse) → detect (a device answers) → identify (address, name, how it answered)
 *   → classify (sorted by device type) → inventory (count updated)
 *
 * Accuracy: CyfroAgent detects and records devices and how they relate (documented agent behaviour); the
 * device ROLE is assigned on CyfroSec's side from those observations (CyfroTopology's classifier). The types
 * below are roles that classifier uses (server, workstation, router, printer, IoT/camera, virtual) — not
 * "containers", which are not a device role there. All names and addresses are illustrative documentation
 * addresses.
 */
import type { ChunkSignal } from './types';

export const ASSET_TYPES = [
  { key: 'server', label: 'Servers', color: '#039be0' },
  { key: 'workstation', label: 'Workstations', color: '#bfefff' },
  { key: 'router', label: 'Routers', color: '#fe904d' },
  { key: 'printer', label: 'Printers', color: '#9fb2c3' },
  { key: 'iot', label: 'IoT & cameras', color: '#5caa83' },
  { key: 'virtual', label: 'Virtual', color: '#7fd6f5' },
] as const;
export const ASSET_SAMPLES = ['db-03 · 192.0.2.31', 'ws-22 · 192.0.2.57', 'gw-02 · 192.0.2.1', 'print-4 · 192.0.2.90', 'cam-7 · 192.0.2.120', 'vm-app-5 · 192.0.2.140'];
const BASE = [12, 18, 3, 4, 6, 9];
export const ASSET_LOOP = 6;
export const STAGES = ['scan', 'detect', 'identify', 'classify', 'inventory'] as const;
export type AssetStage = (typeof STAGES)[number];
const EDGES = [1.2, 2.2, 3.2, 4.6]; // stage boundaries (s) within one 6 s loop

export function assetLoop(t: number) {
  const n = Math.floor(t / ASSET_LOOP), u = t - n * ASSET_LOOP;
  const type = ((n % 6) + 6) % 6;
  const stage: AssetStage = u < EDGES[0] ? 'scan' : u < EDGES[1] ? 'detect' : u < EDGES[2] ? 'identify' : u < EDGES[3] ? 'classify' : 'inventory';
  // counts restart every 36 loops so they never run away; each completed loop adds one asset of its type
  const done = (((n % 36) + 36) % 36) + (u >= EDGES[3] ? 1 : 0);
  const counts = BASE.map((b, c) => b + Math.floor((done + 5 - c) / 6));
  const at = (a: number, b: number) => Math.min(1, Math.max(0, (u - a) / (b - a)));
  return {
    n, u, type, stage, counts, total: counts.reduce((s, x) => s + x, 0),
    /** progress inside each stage, 0..1 */
    k: { scan: at(0, EDGES[0]), detect: at(EDGES[0], EDGES[1]), identify: at(EDGES[1], EDGES[2]), classify: at(EDGES[2], EDGES[3]), inventory: at(EDGES[3], ASSET_LOOP) },
  };
}
/** The frame shown when motion is reduced or paused: an asset has just been added. */
export const STILL_T = ASSET_LOOP * 1 + 5;
/** The loop runs while the director gives Asset Discovery its working pass, or during the story's asset step. */
export const assetRuns = (s: ChunkSignal) => !s.still && (!!s.loop || s.beats.includes('i-assets'));
/**
 * The loop time to show. Working pass: two assets, start to finish. Story step (2 s): the sweep and the
 * first device answering. Otherwise the fixed "just added" frame.
 */
export const assetTime = (t: number, s: ChunkSignal) =>
  s.still ? STILL_T : s.loop ? (s.loop.n * 2 + s.loop.k * 2) * ASSET_LOOP : s.beats.includes('i-assets') ? Math.floor(t / 36) * ASSET_LOOP + s.progress * 2.2 : STILL_T;
