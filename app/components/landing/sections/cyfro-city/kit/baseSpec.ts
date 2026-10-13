/**
 * ChunkBase spec: the one square platform every CyfroSec feature chunk (and Code hosting) stands on.
 * Pure numbers (no value imports) so Node tests can check it against the grid and the ports.
 *
 * It reproduces the CyfroAI Engine's approved deck — a FOOT-square slab, 0.16 thick, 0.1 bevel, top at DECK_TOP,
 * the panel surface and a blue kerb on the front edge — and adds a thin illuminated blue band around all four
 * sides. The Engine keeps its own (identical-core) deck untouched; the environment pads (Your infrastructure,
 * AI provider, Your team) keep theirs.
 */
export const BASE = {
  size: 5.4,        // = FOOT (registry/grid.ts); a test keeps them equal
  thickness: 0.16,
  bevel: 0.1,
  centerY: 0.15,    // slab centre; top = centerY + thickness / 2 = DECK_TOP
  top: 0.23,        // = DECK_TOP (kit/machines.ts)
  kerb: { inset: 0.27, h: 0.06, d: 0.08, y: 0.27, fromEdge: 0.2 },
  glow: { h: 0.035, d: 0.03, y: 0.19, protrude: 0.012, cornerGap: 0.22 },
} as const;

export type BaseSide = 'n' | 'e' | 's' | 'w';
/**
 * Connection anchor on the base edge, in chunk-local coordinates, at deck height. Same convention as
 * registry/grid.ts portWorld (offset −0.5…0.5 along the edge), so docks and cables meet the lit edge.
 */
export function baseAnchor(side: BaseSide, offset = 0): [number, number, number] {
  const h = BASE.size / 2, o = offset * BASE.size;
  switch (side) {
    case 'e': return [h, BASE.top, o];
    case 'w': return [-h, BASE.top, o];
    case 'n': return [o, BASE.top, -h];
    case 's': return [o, BASE.top, h];
  }
}
