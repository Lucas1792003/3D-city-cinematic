import { Group, MeshStandardMaterial, type Material, type Mesh } from 'three';
import type { ScreenId } from '../../platform-architecture-3d/geometry';
import type { CityScreenId } from '../screens/cityScreens';
import type { Kit } from './parts';
import type { BankItem } from './ledBank';
import type { CityMaterials } from './materials';
import { FOOT } from '../registry/grid';

/**
 * Machines shared by several chunks. `rack`, `desk`/`monitor` and `cabinetMonitor` follow the original
 * scene's forms (platform-architecture-3d/geometry.ts) so the city reads as the same world.
 * Chunk-local coordinates: the deck top is at y = 0.23 (the original zone panel top).
 */

export const DECK_TOP = 0.23;
export type OrigSlot = { id: ScreenId; center: [number, number, number]; w: number; h: number; group: Group };
export type CitySlot = { id: CityScreenId; center: [number, number, number]; w: number; h: number; group: Group; rotY?: number; tilt?: number };

/** The standard chunk deck: one panel the size of the footprint and a front kerb strip (the district accent). */
export function chunkDeck(kit: Kit, g: Group, m: CityMaterials, panel: Material = m.panel, strip: Material = m.edge) {
  kit.box(g, FOOT, 0.16, FOOT, 0, 0.15, 0, panel, 0.1);
  kit.box(g, FOOT - 0.27, 0.06, 0.08, 0, 0.27, FOOT / 2 - 0.2, strip, 0.01);
}

/** Original server rack (geometry.ts rack()). Its slot LEDs are appended to `leds` for the chunk's LED bank (one draw call). */
export function rack(kit: Kit, g: Group, m: CityMaterials, x: number, z: number, height: number, leds: BankItem[], ledColor = '#039be0') {
  kit.box(g, 1.2, height, 1.2, x, height / 2 + 0.3, z, m.screen, 0.08);
  kit.box(g, 1.24, 0.15, 1.24, x, height + 0.32, z, m.panel, 0.03);
  const rows = Math.max(3, Math.floor((height - 0.4) / 0.42));
  for (let row = 0; row < rows; row++) {
    const y = 0.6 + row * 0.42; kit.box(g, 1.01, 0.32, 0.09, x, y, z + 0.63, m.panel, 0.025);
    for (let v = 0; v < 4; v++) kit.box(g, 0.11, 0.04, 0.035, x - 0.3 + v * 0.16, y + 0.02, z + 0.69, m.edge, 0.008);
    leds.push({ p: [x + 0.4, y, z + 0.69], s: [0.05, 0.07, 0.04], color: row === 2 ? '#fe904d' : ledColor });
  }
  kit.box(g, 0.72, 0.1, 0.045, x, height + 0.32, z + 0.65, m.blue, 0.015);
}

/** A framed monitor on a stand with a live screen slot (original display() without placeholder art). */
export function monitor(kit: Kit, g: Group, m: CityMaterials, x: number, y: number, z: number, w: number, h: number, stand = true) {
  kit.box(g, w + 0.15, h + 0.16, 0.16, x, y, z, m.edge, 0.055); kit.box(g, w, h, 0.045, x, y, z + 0.105, m.screen, 0.025);
  if (stand) { kit.box(g, 0.12, 0.45, 0.13, x, y - h / 2 - 0.22, z, m.edge, 0.025); kit.box(g, 0.65, 0.065, 0.4, x, y - h / 2 - 0.46, z + 0.03, m.edge, 0.025); }
  return { center: [x, y, z + 0.1315] as [number, number, number], w, h };
}

/** Original operator desk (geometry.ts desk()) with its monitor. */
export function desk(kit: Kit, g: Group, m: CityMaterials, x: number, z: number) {
  kit.box(g, 2.1, 0.18, 1.2, x, 1.13, z, m.white, 0.08); kit.box(g, 1.6, 0.95, 0.8, x, 0.61, z - 0.08, m.panel, 0.06);
  const mon = monitor(kit, g, m, x, 2.1, z - 0.12, 1.55, 1.1);
  kit.box(g, 0.83, 0.06, 0.34, x, 1.25, z + 0.33, m.screen, 0.025);
  for (let r = 0; r < 3; r++) kit.box(g, 0.66, 0.012, 0.016, x, 1.284, z + 0.21 + r * 0.075, m.edge, 0.003);
  kit.box(g, 0.2, 0.05, 0.29, x + 0.7, 1.25, z + 0.3, m.edge, 0.03);
  return mon;
}

/** Original cabinet with a tall monitor (geometry.ts cabinetMonitor()). */
export function cabinetMonitor(kit: Kit, g: Group, m: CityMaterials, x: number, z: number) {
  kit.box(g, 1.5, 0.5, 0.62, x, 0.55, z, m.panel, 0.06); kit.box(g, 0.1, 0.5, 0.1, x, 1.05, z - 0.1, m.edge, 0.02);
  kit.box(g, 1.42, 1, 0.12, x, 1.75, z - 0.1, m.edge, 0.05); kit.box(g, 1.28, 0.86, 0.04, x, 1.75, z - 0.02, m.screen, 0.02);
  return { center: [x, 1.75, z + 0.0045] as [number, number, number], w: 1.28, h: 0.86 };
}

/**
 * Approval checkpoint: a post with an orange lamp and a barrier arm across an outbound lane.
 * waiting → lamp pulses orange, arm down; approved → lamp green, arm lifts; rejected → lamp dims, arm stays down.
 */
export function approvalBarrier(kit: Kit, g: Group, m: CityMaterials, x: number, z: number, owned: Material[], armLength = 1.3) {
  kit.box(g, 0.34, 0.9, 0.34, x, 0.68, z, m.panel, 0.06);
  kit.box(g, 0.44, 0.08, 0.44, x, 1.16, z, m.edge, 0.02);
  const lampMt = new MeshStandardMaterial({ color: '#fe904d', emissive: '#fe904d', emissiveIntensity: 0.15, roughness: 0.4 }); owned.push(lampMt);
  const lamp = kit.dyn(kit.sphere(g, 0.13, x, 1.32, z, lampMt, 16));
  const pivot = kit.dyn(new Group()); pivot.position.set(x + 0.1, 0.95, z); g.add(pivot);
  const stripeA = new MeshStandardMaterial({ color: '#fe904d', roughness: 0.5 }); owned.push(stripeA);
  for (let i = 0; i < 4; i++) kit.box(pivot, armLength / 4 - 0.02, 0.08, 0.08, 0.1 + (i + 0.5) * (armLength / 4), 0, 0, i % 2 ? m.white : stripeA, 0);
  pivot.traverse((o) => { if ((o as Mesh).isMesh) (o as Mesh).castShadow = false; });
  let lift = 0;
  return {
    update(t: number, phase: string, still: boolean, dt: number) {
      const target = phase === 'approved' ? 1 : 0;
      lift += (target - lift) * (still ? 1 : Math.min(1, dt * 4));
      pivot.rotation.z = lift * 1.25;
      if (phase === 'waiting_approval') { lampMt.color.set('#fe904d'); lampMt.emissive.set('#fe904d'); lampMt.emissiveIntensity = still ? 0.9 : 0.35 + 0.75 * (0.5 + 0.5 * Math.sin(t * 5)); }
      else if (phase === 'approved') { lampMt.color.set('#4fbf8b'); lampMt.emissive.set('#4fbf8b'); lampMt.emissiveIntensity = 0.9; }
      else if (phase === 'rejected') { lampMt.color.set('#8a97a3'); lampMt.emissive.set('#8a97a3'); lampMt.emissiveIntensity = 0.15; }
      else { lampMt.color.set('#fe904d'); lampMt.emissive.set('#fe904d'); lampMt.emissiveIntensity = 0.12; }
    },
    lamp,
  };
}

/** Status beacon (cylinder lamp) that flashes on demand. */
export function beacon(kit: Kit, g: Group, m: CityMaterials, x: number, z: number, owned: Material[], color = '#039be0', h = 0.9) {
  kit.cylinder(g, 0.16, h, x, DECK_TOP + h / 2, z, m.edge, 16);
  const mt = new MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.1, roughness: 0.3 }); owned.push(mt);
  kit.dyn(kit.cylinder(g, 0.13, 0.22, x, DECK_TOP + h + 0.11, z, mt, 16));
  return mt;
}

/** A row of chunk-local floor tracks (decorative cable on the deck between two machines). */
export function deckCable(kit: Kit, g: Group, m: CityMaterials, a: [number, number], b: [number, number], y = DECK_TOP + 0.02) {
  const len = Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]);
  kit.box(g, a[0] !== b[0] ? len + 0.08 : 0.08, 0.035, a[0] !== b[0] ? 0.08 : len + 0.08, (a[0] + b[0]) / 2, y, (a[1] + b[1]) / 2, m.edge, 0);
}
