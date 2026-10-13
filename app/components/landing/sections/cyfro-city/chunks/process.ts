import type { ChunkSignal } from './types';

/**
 * Shared timing for a chunk's own working sequence.
 *
 * Every feature chunk shows its process in one of three ways:
 *  - story: the activity director is running this chunk's step → the sequence follows the story beat
 *    (and stays in sync with the carriers that arrive or leave);
 *  - loop: the chunk is SELECTED and the director gives it one pass of its own working sequence (between its
 *    story steps and a rest). Loops never show transport or an approval outcome;
 *  - rest: everything else → a calm idle state (or a fixed representative frame).
 */
export function localLoop(s: ChunkSignal): { k: number; n: number } | null {
  return s.still ? null : s.loop; // scheduled by the activity director (registry/director.ts), never free-running
}

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const ease = (x: number) => { const v = clamp01(x); return v * v * (3 - 2 * v); };
/** progress of a sub-step [a, b] inside a 0..1 sequence */
export const seg = (k: number, a: number, b: number) => clamp01((k - a) / (b - a));
/** point on a raised arc between two points (for small things lifted from one machine to another) */
export function arc(out: [number, number, number], a: [number, number, number], b: [number, number, number], k: number, lift: number) {
  const e = ease(k);
  out[0] = a[0] + (b[0] - a[0]) * e; out[1] = a[1] + (b[1] - a[1]) * e + Math.sin(Math.PI * e) * lift; out[2] = a[2] + (b[2] - a[2]) * e;
  return out;
}
