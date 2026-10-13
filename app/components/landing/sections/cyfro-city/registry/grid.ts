import type { ChunkDefinition, PortDef, Side } from './types';

/**
 * Pure grid ↔ world maths for the city (docs/design/3d-city/04 §1). No three.js, no runtime imports:
 * the engine and the Node tests use the same functions, so a chunk is positioned in exactly one way.
 *   +X east (left → right in the default overview), +Z south (toward the default camera).
 */

export const PITCH = 6; // world units per grid cell (the original zone spacing)
export const FOOT = 5.4; // chunk footprint (the original zone width was 5.45)
export const STREET = PITCH - FOOT;

type XZ = [number, number];
export interface Bounds { minX: number; maxX: number; minZ: number; maxZ: number; cx: number; cz: number }

/** Grid bounds of all chunks; (cx, cz) is the grid point placed at the world origin. */
export function cityBounds(chunks: Pick<ChunkDefinition, 'grid' | 'footprint'>[]): Bounds {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const c of chunks) {
    minX = Math.min(minX, c.grid.x); maxX = Math.max(maxX, c.grid.x + c.footprint.w - 1);
    minZ = Math.min(minZ, c.grid.z); maxZ = Math.max(maxZ, c.grid.z + c.footprint.d - 1);
  }
  return { minX, maxX, minZ, maxZ, cx: (minX + maxX) / 2, cz: (minZ + maxZ) / 2 };
}

/** World centre (x, z) of a chunk. */
export function chunkCenter(c: Pick<ChunkDefinition, 'grid' | 'footprint'>, b: Bounds): XZ {
  return [(c.grid.x + (c.footprint.w - 1) / 2 - b.cx) * PITCH, (c.grid.z + (c.footprint.d - 1) / 2 - b.cz) * PITCH];
}

/** Half extents of a chunk's deck. */
export function chunkHalf(c: Pick<ChunkDefinition, 'footprint'>): XZ {
  return [((c.footprint.w - 1) * PITCH + FOOT) / 2, ((c.footprint.d - 1) * PITCH + FOOT) / 2];
}

/** World position of a port on the chunk's deck edge. */
export function portWorld(c: Pick<ChunkDefinition, 'grid' | 'footprint'>, p: Pick<PortDef, 'side' | 'offset'>, b: Bounds): XZ {
  const [x, z] = chunkCenter(c, b), [hx, hz] = chunkHalf(c), o = p.offset ?? 0;
  switch (p.side) {
    case 'e': return [x + hx, z + o * hz * 2];
    case 'w': return [x - hx, z + o * hz * 2];
    case 'n': return [x + o * hx * 2, z - hz];
    case 's': return [x + o * hx * 2, z + hz];
  }
}

const vertical = (s: Side) => s === 'e' || s === 'w';
/** The street centre line just outside a port. */
function streetPoint(p: XZ, side: Side): XZ {
  const d = STREET / 2;
  switch (side) {
    case 'e': return [p[0] + d, p[1]];
    case 'w': return [p[0] - d, p[1]];
    case 'n': return [p[0], p[1] - d];
    case 's': return [p[0], p[1] + d];
  }
}
/** Nearest street line (cell boundary) to a world coordinate on one axis. */
function nearestStreet(v: number, centre: number): number {
  const g = v / PITCH + centre; // back to grid units
  return (Math.round(g - 0.5) + 0.5 - centre) * PITCH;
}

/**
 * Orthogonal route from one port to another along the streets (cell boundaries).
 * `lane` shifts the street part sideways so parallel connections never overlap.
 */
export function routeBetween(a: XZ, sa: Side, b: XZ, sb: Side, bounds: Bounds, lane = 0): XZ[] {
  const s0 = streetPoint(a, sa), s1 = streetPoint(b, sb);
  const v0 = vertical(sa), v1 = vertical(sb);
  const shift = (p: XZ, onVertical: boolean | 'corner'): XZ => onVertical === 'corner' ? [p[0] + lane, p[1] + lane] : onVertical ? [p[0] + lane, p[1]] : [p[0], p[1] + lane];
  const pts: XZ[] = [a, shift(s0, v0)];
  if (v0 && v1) {
    if (Math.abs(s0[0] - s1[0]) > 1e-6) {
      const zH = nearestStreet((s0[1] + s1[1]) / 2, bounds.cz);
      pts.push(shift([s0[0], zH], 'corner'), shift([s1[0], zH], 'corner'));
    }
  } else if (!v0 && !v1) {
    if (Math.abs(s0[1] - s1[1]) > 1e-6) {
      const xV = nearestStreet((s0[0] + s1[0]) / 2, bounds.cx);
      pts.push(shift([xV, s0[1]], 'corner'), shift([xV, s1[1]], 'corner'));
    }
  } else if (v0) pts.push(shift([s0[0], s1[1]], 'corner'));
  else pts.push(shift([s1[0], s0[1]], 'corner'));
  pts.push(shift(s1, v1), b);
  // make every segment orthogonal again after lane shifts (insert elbows), then drop duplicates
  const out: XZ[] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const p = out[out.length - 1], q = pts[i];
    if (Math.abs(p[0] - q[0]) > 1e-6 && Math.abs(p[1] - q[1]) > 1e-6) out.push(i === 1 || i === pts.length - 1 ? [q[0], p[1]] : [p[0], q[1]]);
    out.push(q);
  }
  return out.filter((p, i) => i === 0 || Math.abs(p[0] - out[i - 1][0]) + Math.abs(p[1] - out[i - 1][1]) > 1e-6);
}

/** Total length of an orthogonal polyline. */
export const pathLength = (pts: XZ[]) => pts.slice(1).reduce((s, p, i) => s + Math.abs(p[0] - pts[i][0]) + Math.abs(p[1] - pts[i][1]), 0);

/** Point and heading at fraction u along an orthogonal polyline (shared by every packet). */
export function along(pts: XZ[], u: number): { p: XZ; dir: number } {
  const total = pathLength(pts);
  let d = Math.min(1, Math.max(0, u)) * total;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], len = Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]);
    if (d <= len || i === pts.length - 1) {
      const k = len ? Math.min(1, d / len) : 0;
      return { p: [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k], dir: b[0] !== a[0] ? 0 : Math.PI / 2 };
    }
    d -= len;
  }
  return { p: pts[pts.length - 1], dir: 0 };
}

/**
 * Outline of a set of occupied grid cells as one orthogonal polygon (grid units, cell edges at ±0.5),
 * traced clockwise in x-right / z-down. Used so a district's ground plate follows its real cells
 * instead of a bounding rectangle (which would expose unused cells as empty platforms).
 */
export function cellOutline(cells: { x: number; z: number }[]): XZ[] {
  const has = new Set(cells.map((c) => `${c.x},${c.z}`));
  const occ = (x: number, z: number) => has.has(`${x},${z}`);
  const edges = new Map<string, XZ>(); // start "x,z" → end
  const key = (p: XZ) => `${p[0]},${p[1]}`;
  for (const { x, z } of cells) {
    const tl: XZ = [x - 0.5, z - 0.5], tr: XZ = [x + 0.5, z - 0.5], br: XZ = [x + 0.5, z + 0.5], bl: XZ = [x - 0.5, z + 0.5];
    if (!occ(x, z - 1)) edges.set(key(tl), tr);
    if (!occ(x + 1, z)) edges.set(key(tr), br);
    if (!occ(x, z + 1)) edges.set(key(br), bl);
    if (!occ(x - 1, z)) edges.set(key(bl), tl);
  }
  if (!edges.size) return [];
  const startKey = edges.keys().next().value as string;
  const out: XZ[] = [];
  let k = startKey;
  for (let guard = 0; guard <= edges.size; guard++) {
    const [sx, sz] = k.split(',').map(Number); out.push([sx, sz]);
    const next = edges.get(k)!; k = key(next);
    if (k === startKey) break;
  }
  // drop collinear vertices
  return out.filter((p, i) => {
    const a = out[(i - 1 + out.length) % out.length], b = out[(i + 1) % out.length];
    return !((a[0] === p[0] && p[0] === b[0]) || (a[1] === p[1] && p[1] === b[1]));
  });
}

/** Move every edge of a clockwise (x-right, z-down) orthogonal polygon inward by d (negative = outward). */
export function insetPolygon(poly: XZ[], d: number): XZ[] {
  const n = poly.length;
  return poly.map((v, i) => {
    const p = poly[(i - 1 + n) % n], q = poly[(i + 1) % n];
    const d1 = [Math.sign(v[0] - p[0]), Math.sign(v[1] - p[1])], d2 = [Math.sign(q[0] - v[0]), Math.sign(q[1] - v[1])];
    const n1 = [-d1[1], d1[0]], n2 = [-d2[1], d2[0]]; // inward normals (interior on the right)
    return [v[0] + (n1[0] + n2[0]) * d, v[1] + (n1[1] + n2[1]) * d] as XZ;
  });
}

/** Point-in-polygon (even–odd), any simple polygon. */
export function insidePolygon(poly: XZ[], x: number, z: number): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

/** Grid-unit polygon → world coordinates (same transform as chunkCenter). */
export const polygonToWorld = (poly: XZ[], b: Bounds): XZ[] => poly.map(([x, z]) => [(x - b.cx) * PITCH, (z - b.cz) * PITCH]);
