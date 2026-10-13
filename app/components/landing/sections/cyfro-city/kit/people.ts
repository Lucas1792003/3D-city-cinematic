import { Group, type Material } from 'three';
import type { Kit } from './parts';
import type { CityMaterials } from './materials';
import { DECK_TOP } from './machines';

/** Low-poly people and chairs shared by several chunks (no skeletal animation: heads and arms are pivots). */
type V3 = [number, number, number];

/** A stylized low-poly person: legs, torso, head (with a visor so its facing reads), arms on shoulder pivots. */
export function person(kit: Kit, m: CityMaterials, g: Group, at: V3, rotY: number, pose: 'stand' | 'sit', shirt: Material, trousers: Material, skin: Material, visor: Material, armPose: [number | null, number | null] = [null, null]) {
  const root = new Group(); root.position.set(...at); root.rotation.y = rotY; g.add(root);
  const seat = pose === 'sit';
  if (seat) {
    for (const sx of [-0.065, 0.065]) {
      kit.box(root, 0.11, 0.11, 0.38, sx, 0.62, 0.15, trousers, 0.03); // thigh
      kit.box(root, 0.1, 0.42, 0.12, sx, 0.4, 0.32, trousers, 0.03); // shin
      kit.box(root, 0.11, 0.05, 0.17, sx, 0.2, 0.36, m.edge, 0.02); // shoe
    }
  } else {
    for (const sx of [-0.065, 0.065]) {
      kit.box(root, 0.11, 0.5, 0.13, sx, 0.25, 0, trousers, 0.03);
      kit.box(root, 0.12, 0.05, 0.18, sx, 0.025, 0.03, m.edge, 0.02);
    }
  }
  const hip = seat ? 0.68 : 0.5;
  kit.box(root, 0.3, 0.4, 0.18, 0, hip + 0.2, 0, shirt, 0.06); // torso
  kit.box(root, 0.08, 0.06, 0.08, 0, hip + 0.43, 0, skin, 0.02); // neck
  const head = kit.dyn(new Group()); head.position.set(0, hip + 0.46, 0); root.add(head);
  kit.sphere(head, 0.11, 0, 0.11, 0, skin, 14);
  kit.box(head, 0.15, 0.04, 0.05, 0, 0.12, 0.09, visor, 0.015); // visor: shows where the person is looking
  // an arm with a fixed pose (number) is static and merges with the body; null = animated pivot
  const arms = [-1, 1].map((side, i) => {
    const fixed = armPose[i];
    const p = fixed === null ? kit.dyn(new Group()) : new Group(); p.position.set(side * 0.19, hip + 0.37, 0); if (fixed !== null) p.rotation.x = fixed; root.add(p);
    kit.box(p, 0.08, 0.4, 0.09, 0, -0.2, 0, shirt, 0.03);
    if (fixed === null) kit.box(p, 0.07, 0.08, 0.08, 0, -0.43, 0, skin, 0.02); // a hand on arms that move
    return p;
  });
  return { root, head, armL: arms[0], armR: arms[1] };
}

export function chair(kit: Kit, m: CityMaterials, g: Group, x: number, z: number, rotY: number) {
  const c = new Group(); c.position.set(x, DECK_TOP, z); c.rotation.y = rotY; g.add(c);
  kit.cylinder(c, 0.22, 0.04, 0, 0.03, 0, m.edge, 16);
  kit.cylinder(c, 0.035, 0.34, 0, 0.21, 0, m.edge, 8);
  kit.box(c, 0.44, 0.07, 0.42, 0, 0.42, 0.02, m.panel, 0.03);
  kit.box(c, 0.42, 0.46, 0.06, 0, 0.68, -0.2, m.panel, 0.03);
}

