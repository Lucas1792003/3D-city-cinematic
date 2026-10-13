import { BoxGeometry, Color, Euler, InstancedMesh, Matrix4, MeshBasicMaterial, Quaternion, SphereGeometry, Vector3, type BufferGeometry, type Group } from 'three';

/**
 * Many small lights / markers in ONE draw call. Each instance has a base colour, a position and a size;
 * brightness is the instance colour (unlit glass, so it reads as a glowing indicator in both themes) and
 * scale can grow/shrink an instance (markers that "appear"). Replaces per-LED materials, which cost one
 * draw call each.
 */
export type BankItem = { p: [number, number, number]; s: [number, number, number]; color: string; rotX?: number; rotY?: number; rotZ?: number };

const shared: { box?: BoxGeometry; sphere?: SphereGeometry } = {};
const unitBox = () => (shared.box ??= new BoxGeometry(1, 1, 1));
const unitSphere = () => (shared.sphere ??= new SphereGeometry(0.5, 14, 10));

export function ledBank(parent: Group, items: BankItem[], shape: 'box' | 'sphere' = 'box', geometry?: BufferGeometry) {
  const geo = geometry ?? (shape === 'sphere' ? unitSphere() : unitBox());
  const mat = new MeshBasicMaterial({ toneMapped: false });
  const mesh = new InstancedMesh(geo, mat, items.length);
  mesh.userData.dynamic = true; mesh.castShadow = false; mesh.frustumCulled = false; parent.add(mesh);
  const base = items.map((it) => new Color(it.color));
  const m = new Matrix4(), q = new Quaternion(), v = new Vector3(), sc = new Vector3(), c = new Color(), eu = new Euler();
  const scale = items.map(() => 1);
  const compose = (i: number) => {
    const it = items[i]; q.setFromEuler(eu.set(it.rotX ?? 0, it.rotY ?? 0, it.rotZ ?? 0));
    sc.set(it.s[0] * scale[i], it.s[1] * scale[i], it.s[2] * scale[i]);
    mesh.setMatrixAt(i, m.compose(v.set(...it.p), q, sc));
  };
  items.forEach((_, i) => { compose(i); mesh.setColorAt(i, c.copy(base[i]).multiplyScalar(0.2)); });
  let dirtyM = true, dirtyC = true;
  return {
    mesh,
    /** brightness 0..1+ (0.15–0.2 reads as "off") */
    set(i: number, k: number) { mesh.setColorAt(i, c.copy(base[i]).multiplyScalar(k)); dirtyC = true; },
    /** change an instance's base colour (e.g. a port that turns orange) */
    tint(i: number, hex: string) { base[i].set(hex); dirtyC = true; },
    /** grow / hide an instance (0 = hidden) */
    scale(i: number, s: number) { if (scale[i] !== s) { scale[i] = Math.max(0.0001, s); compose(i); dirtyM = true; } },
    move(i: number, x: number, y: number, z: number) { items[i].p = [x, y, z]; compose(i); dirtyM = true; },
    /** set an instance's size (e.g. a bar that grows only in height) */
    size(i: number, sx: number, sy: number, sz: number) { items[i].s = [sx, sy, sz]; compose(i); dirtyM = true; },
    flush() {
      if (dirtyM) { mesh.instanceMatrix.needsUpdate = true; dirtyM = false; }
      if (dirtyC && mesh.instanceColor) { mesh.instanceColor.needsUpdate = true; dirtyC = false; }
    },
    dispose() { mat.dispose(); mesh.dispose(); },
  };
}
export type LedBank = ReturnType<typeof ledBank>;
