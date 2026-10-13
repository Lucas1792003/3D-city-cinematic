import type { Group } from 'three';
import type { Kit } from './parts';
import type { CityMaterials } from './materials';
import { BASE } from './baseSpec';

export { BASE, baseAnchor, type BaseSide } from './baseSpec';

/**
 * The shared ChunkBase (see baseSpec.ts): slab, front kerb and the illuminated edge band. All static boxes in
 * three shared materials, so the engine's static merge folds every base in the city into the same few draw
 * calls. Part of the chunk group, so it rises with its platform during the assembly cinematic.
 */
export function chunkBase(kit: Kit, g: Group, m: CityMaterials) {
  const S = BASE.size, h = S / 2, { kerb, glow } = BASE;
  kit.box(g, S, BASE.thickness, S, 0, BASE.centerY, 0, m.panel, BASE.bevel);
  kit.box(g, S - kerb.inset, kerb.h, kerb.d, 0, kerb.y, h - kerb.fromEdge, m.blue, 0.01);
  const L = S - glow.cornerGap, off = h - glow.d / 2 + glow.protrude;
  kit.box(g, L, glow.h, glow.d, 0, glow.y, off, m.baseGlow, 0);
  kit.box(g, L, glow.h, glow.d, 0, glow.y, -off, m.baseGlow, 0);
  kit.box(g, glow.d, glow.h, L, off, glow.y, 0, m.baseGlow, 0);
  kit.box(g, glow.d, glow.h, L, -off, glow.y, 0, m.baseGlow, 0);
}
