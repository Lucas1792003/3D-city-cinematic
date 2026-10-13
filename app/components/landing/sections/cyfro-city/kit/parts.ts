import { BoxGeometry, ConeGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial, SphereGeometry, TorusGeometry, type BufferGeometry, type Material } from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/**
 * Reusable miniature-machinery kit, in the same visual language as the original scene
 * (platform-architecture-3d/geometry.ts): rounded boxes, cylinders, shared materials.
 * Geometry is cached by size so identical parts share one BufferGeometry.
 * Meshes created with `dyn()` are animated and are excluded from per-chunk static merging.
 */

export type V3 = [number, number, number];

export function createKit() {
  const cache = new Map<string, BufferGeometry>();
  const geo = <T extends BufferGeometry>(key: string, make: () => T): T => { if (!cache.has(key)) cache.set(key, make()); return cache.get(key) as T; };

  /** Rounded box, positioned at its centre — identical rules to the original `box()` helper. */
  function box(parent: Group, w: number, h: number, d: number, x: number, y: number, z: number, mat: Material, round = 0.06) {
    if (Math.min(w, h, d) <= 0.06) round = 0;
    const key = `b/${w}/${h}/${d}/${round}`;
    const g = geo(key, () => (round ? new RoundedBoxGeometry(w, h, d, 1, round) : new BoxGeometry(w, h, d)));
    const m = new Mesh(g, mat); m.position.set(x, y, z);
    m.castShadow = h > 0.2 && w > 0.2 && d > 0.14; m.receiveShadow = true; parent.add(m); return m;
  }
  function cylinder(parent: Group, r: number, h: number, x: number, y: number, z: number, mat: Material, seg = 24, r2 = r) {
    const g = geo(`c/${r}/${r2}/${h}/${seg}`, () => new CylinderGeometry(r2, r, h, seg));
    const m = new Mesh(g, mat); m.position.set(x, y, z); m.castShadow = h > 0.15; m.receiveShadow = true; parent.add(m); return m;
  }
  function cone(parent: Group, r: number, h: number, x: number, y: number, z: number, mat: Material, seg = 24) {
    const g = geo(`k/${r}/${h}/${seg}`, () => new ConeGeometry(r, h, seg));
    const m = new Mesh(g, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  }
  function sphere(parent: Group, r: number, x: number, y: number, z: number, mat: Material, seg = 20) {
    const g = geo(`s/${r}/${seg}`, () => new SphereGeometry(r, seg, Math.max(8, seg * 0.6)));
    const m = new Mesh(g, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  }
  function torus(parent: Group, r: number, tube: number, x: number, y: number, z: number, mat: Material, arc = Math.PI * 2) {
    const g = geo(`t/${r}/${tube}/${arc}`, () => new TorusGeometry(r, tube, 8, 48, arc));
    const m = new Mesh(g, mat); m.position.set(x, y, z); parent.add(m); return m;
  }
  /** Mark a mesh (or group) as animated: never merged, never casts a stale baked shadow. */
  function dyn<T extends Mesh | Group>(o: T): T { o.userData.dynamic = true; o.traverse((x) => { if ((x as Mesh).isMesh) (x as Mesh).castShadow = false; }); return o; }
  /** A light that blinks on its own: a private emissive material (kept small: only status LEDs). */
  function led(parent: Group, w: number, h: number, d: number, x: number, y: number, z: number, color: string, owned: Material[]) {
    const mt = new MeshStandardMaterial({ color, roughness: 0.4, emissive: color, emissiveIntensity: 0.1 }); owned.push(mt);
    return { mesh: dyn(box(parent, w, h, d, x, y, z, mt, Math.min(w, h, d) > 0.06 ? 0.01 : 0)), mt };
  }
  return { box, cylinder, cone, sphere, torus, dyn, led, dispose() { cache.forEach((g) => g.dispose()); cache.clear(); } };
}
export type Kit = ReturnType<typeof createKit>;
