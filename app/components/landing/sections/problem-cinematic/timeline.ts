/** Pure helpers for the scroll-driven timeline. Everything is a function of p (0..1). */

export const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => t * t * (3 - 2 * t);

/** Eased 0→1 progress of p through the window [a, b]. */
export const seg = (p: number, a: number, b: number) => smooth(clamp((p - a) / (b - a)));

/** 0→1→0: rises over [a, b], falls over [c, d]. */
export const bell = (p: number, a: number, b: number, c: number, d: number) => seg(p, a, b) * (1 - seg(p, c, d));

export type Key = { p: number; v: number[] };

/** Interpolates a list of keyframes (sorted by p), eased between each pair. */
export function track(keys: Key[], p: number): number[] {
  if (p <= keys[0].p) return keys[0].v;
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1];
    const b = keys[i];
    if (p <= b.p) {
      const t = seg(p, a.p, b.p);
      return a.v.map((x, k) => lerp(x, b.v[k], t));
    }
  }
  return keys[keys.length - 1].v;
}

// Deterministic jitter so server and client render the same world.
export const rand = (i: number, salt: number) => (((Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453) % 1) + 1) % 1;
export const r1 = (n: number) => Math.round(n * 10) / 10;
