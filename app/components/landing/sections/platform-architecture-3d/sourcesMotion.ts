import { BoxGeometry, Group, Mesh, MeshStandardMaterial, type Material } from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { AnimationRig } from './motion';
import type { Materials } from './materials';

/**
 * Data Sources: AI Infrastructure (racks), CyfroCode (workstation) and Network (router) as one
 * continuously operating discovery process. Equipment never moves; only lights, a scan line,
 * floor-cable packets and small indicators animate. Everything is a pure function of the shared
 * environment clock `t` (seconds), so it is deterministic, pauses with the scene and resumes in place.
 *
 * World coordinates (the Sources zone group sits at x = −6).
 */

type P = [number, number, number];
const Y = 0.255; // cables lie on the zone panel
const cycle = (t: number, len: number) => ((t % len) + len) % len;
const ease = (x: number) => { const v = Math.min(1, Math.max(0, x)); return v * v * (3 - 2 * v); };
const bell = (t: number, a: number, b: number, c: number, d: number) => ease((t - a) / (b - a)) * (1 - ease((t - c) / (d - c)));
const hash = (a: number, b: number) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };

/* ── Visible floor cables: every packet travels along one of these ── */
const SPINE_OUT: P[] = [[-3.4, Y, 0.2], [-2.3, Y, 0.2], [-2.3, Y, 1.6], [-2.07, Y, 1.6]]; // over the bridge into CyfroAgent
const PATHS = {
  rack1: [[-7.38, Y, -1.02], [-7.38, Y, -0.5], [-3.4, Y, -0.5], ...SPINE_OUT] as P[],
  rack2: [[-5.9, Y, -1.28], [-5.9, Y, -0.5], [-3.4, Y, -0.5], ...SPINE_OUT] as P[],
  code: [[-6.1, Y, 2.3], [-3.4, Y, 2.3], ...SPINE_OUT] as P[],
  router: [[-3.9, Y, 1.52], [-3.4, Y, 1.52], ...SPINE_OUT] as P[],
  net: [[-4.2, Y, 0.97], [-4.2, Y, -1.12]] as P[], // router ↔ container/workstation stack
};
const CABLES: [P, P][] = [
  [[-7.38, Y, -1.02], [-7.38, Y, -0.5]], [[-7.38, Y, -0.5], [-3.4, Y, -0.5]], [[-5.9, Y, -1.28], [-5.9, Y, -0.5]],
  [[-3.4, Y, -0.5], [-3.4, Y, 2.3]], [[-6.1, Y, 2.3], [-3.4, Y, 2.3]], [[-3.9, Y, 1.52], [-3.4, Y, 1.52]],
  [[-3.4, Y, 0.2], [-2.3, Y, 0.2]], [[-2.3, Y, 0.2], [-2.3, Y, 1.6]], [[-2.3, Y, 1.6], [-2.07, Y, 1.6]],
  [[-4.2, Y, 0.97], [-4.2, Y, -1.12]],
];

/** Point and heading along an orthogonal polyline at fraction u. */
function along(path: P[], u: number): { p: P; dir: number } {
  const segs = path.slice(1).map((b, i) => { const a = path[i]; return { a, b, len: Math.abs(b[0] - a[0]) + Math.abs(b[2] - a[2]) }; });
  let d = Math.min(1, Math.max(0, u)) * segs.reduce((s, x) => s + x.len, 0);
  for (const s of segs) {
    if (d <= s.len || s === segs[segs.length - 1]) {
      const k = s.len ? Math.min(1, d / s.len) : 0;
      return { p: [s.a[0] + (s.b[0] - s.a[0]) * k, s.a[1], s.a[2] + (s.b[2] - s.a[2]) * k], dir: s.b[0] !== s.a[0] ? 0 : Math.PI / 2 };
    }
    d -= s.len;
  }
  return { p: path[path.length - 1], dir: 0 };
}

/* ── Schedules (seconds) ── */
const SRC_CYCLE = 16; // racks: wave → scan → packet, rack 1 then rack 2
const RACKS = [
  { x: -7.38, z: -1.65, h: 2.65, wave: 0, scan: [1.8, 3.6], send: [3.6, 5.4], path: 'rack1' as const },
  { x: -5.9, z: -1.9, h: 2.5, wave: 8, scan: [9.8, 11.4], send: [11.4, 13.2], path: 'rack2' as const },
];
const NET_CYCLE = 16, NET_OFFSET = 4.5; // discovery: ping → device responds → reply → result to CyfroSec
export const CODE_LOOP = 12, CODE_FINDING_AT = 4.6; // must match the srcCode screen (screens.ts)

export function createSourcesMotion(world: Group, rig: AnimationRig, m: Materials) {
  const owned: Material[] = [];
  const geos: (BoxGeometry | RoundedBoxGeometry)[] = [];
  const group = new Group(); group.name = 'Data Sources activity'; world.add(group);
  const mat = (color: string, emissive = 0) => { const x = new MeshStandardMaterial({ color, roughness: 0.45, emissive: color, emissiveIntensity: emissive }); owned.push(x); return x; };

  // Indicator lights: own material per light so each blinks independently (racks: 0–9, router ports: 10–14)
  const lights = rig.sources.lights.map((mesh, i) => {
    const base = (mesh.material as MeshStandardMaterial).color.clone();
    const mt = new MeshStandardMaterial({ color: base, roughness: 0.4, emissive: base, emissiveIntensity: 0.1 }); owned.push(mt); mesh.material = mt;
    return { mesh, mt, orange: base.r > base.b, i };
  });
  const rackLights = lights.slice(0, 10), ports = lights.slice(10, 15);
  ports[3].mt.color.set('#fe904d'); ports[3].mt.emissive.set('#fe904d'); ports[3].orange = true; // the port with a finding

  // Floor cables
  const unit = new BoxGeometry(1, 1, 1); geos.push(unit);
  for (const [a, b] of CABLES) {
    const c = new Mesh(unit, m.edge); const len = Math.abs(b[0] - a[0]) + Math.abs(b[2] - a[2]);
    c.position.set((a[0] + b[0]) / 2, Y - 0.005, (a[2] + b[2]) / 2);
    c.scale.set(a[0] !== b[0] ? len + 0.08 : 0.08, 0.035, a[0] !== b[0] ? 0.08 : len + 0.08);
    c.receiveShadow = true; group.add(c);
  }

  // Scan lines (one per rack, on its front face)
  const scanMat = mat('#33afdf', 0.9);
  const scans = RACKS.map((r) => { const s = new Mesh(unit, scanMat); s.scale.set(1.16, 0.035, 0.02); s.position.set(r.x, 0.5, r.z + 0.665); s.visible = false; group.add(s); return s; });

  // Packets
  const pGeo = new RoundedBoxGeometry(0.2, 0.1, 0.27, 1, 0.04); geos.push(pGeo);
  const tGeo = new RoundedBoxGeometry(0.1, 0.06, 0.13, 1, 0.025); geos.push(tGeo);
  const blue = mat('#039be0', 0.35), orange = mat('#fe904d', 0.3), dim = mat('#33afdf', 0.2);
  const packet = (g: RoundedBoxGeometry, mt: MeshStandardMaterial) => { const x = new Mesh(g, mt); x.visible = false; group.add(x); return x; };
  const rackPackets = RACKS.map(() => packet(pGeo, blue));
  const codePacket = packet(pGeo, orange); // carries a code-security finding
  const pingPacket = packet(tGeo, blue), replyPacket = packet(tGeo, blue), discoveryPacket = packet(pGeo, blue);
  const traffic = [packet(tGeo, dim), packet(tGeo, dim)];

  // Discovery indicator on the container/workstation stack, and small workstation LEDs
  const found = new Mesh(new RoundedBoxGeometry(0.5, 0.06, 0.5, 1, 0.02), mat('#039be0', 0.4)); geos.push(found.geometry as RoundedBoxGeometry);
  found.position.set(-4.46, 1.87, -1.65); found.visible = false; group.add(found);
  const power = new Mesh(new RoundedBoxGeometry(0.07, 0.04, 0.02, 1, 0.008), mat('#4fbf8b', 0.6)); geos.push(power.geometry as RoundedBoxGeometry);
  power.position.set(-6.47, 1.52, 1.72); group.add(power);
  const keyLed = new Mesh(new RoundedBoxGeometry(0.06, 0.02, 0.04, 1, 0.006), mat('#039be0', 0.1)); geos.push(keyLed.geometry as RoundedBoxGeometry);
  keyLed.position.set(-6.79, 1.29, 1.95); group.add(keyLed);

  const place = (mesh: Mesh, path: P[], u: number, lift = 0.07) => {
    if (u <= 0 || u >= 1) { mesh.visible = false; return; }
    const { p, dir } = along(path, u); mesh.visible = true; mesh.position.set(p[0], p[1] + lift, p[2]); mesh.rotation.y = dir;
    mesh.scale.setScalar(Math.min(1, u * 14, (1 - u) * 14));
  };

  /**
   * @param t      shared environment clock (s)
   * @param still  reduced motion / paused: a stable, readable state
   */
  function update(t: number, still: boolean) { // independent of camera distance: activity is always visible
    const sc = cycle(t, SRC_CYCLE);

    /* AI Infrastructure: independent blinking + an upward activity wave per rack */
    for (const L of rackLights) {
      const rack = Math.floor(L.i / 5), row = L.i % 5;
      const inactive = rack === 1 && row === 4; // one dark slot
      if (still) { L.mt.emissiveIntensity = inactive ? 0.02 : L.orange ? 0.5 : 0.35; continue; }
      const period = 0.7 + hash(L.i, 1) * 1.6, phase = hash(L.i, 2) * period;
      const ph = cycle(t + phase, period) / period;
      const blink = ease(ph / 0.08) * (1 - ease((ph - 0.55) / 0.08)); // soft on/off, no hard flashes
      const steady = L.orange ? 0.25 + 0.25 * (0.5 + 0.5 * Math.sin((t * Math.PI * 2) / 2.6)) : 0.2;
      const w0 = RACKS[rack].wave + row * 0.3;
      const wave = bell(sc, w0, w0 + 0.12, w0 + 0.32, w0 + 0.6);
      const base = L.orange ? Math.max(steady * 0.6, 0.06 + blink * 0.45) : 0.06 + blink * 0.4;
      L.mt.emissiveIntensity = inactive ? 0.02 : base + wave * 0.65;
    }
    RACKS.forEach((r, k) => {
      const u = (sc - r.scan[0]) / (r.scan[1] - r.scan[0]);
      const s = scans[k]; s.visible = !still && u > 0 && u < 1;
      if (s.visible) s.position.y = 0.42 + u * (r.h - 0.15);
      place(rackPackets[k], PATHS[r.path], still ? 0 : (sc - r.send[0]) / (r.send[1] - r.send[0])); // inspection result → CyfroSec
    });

    /* CyfroCode: workstation LEDs follow the editor (typing, then the finding is sent) */
    const cc = cycle(t, CODE_LOOP);
    (keyLed.material as MeshStandardMaterial).emissiveIntensity = still ? 0.1 : cc > 0.3 && cc < CODE_FINDING_AT - 0.3 ? 0.25 + 0.5 * (Math.floor(t * 9) % 2) : 0.08;
    (power.material as MeshStandardMaterial).emissiveIntensity = 0.6;
    place(codePacket, PATHS.code, still ? 0 : (cc - (CODE_FINDING_AT + 0.4)) / 1.8);

    /* Network: port activity, continuous traffic to the stack, and a periodic discovery exchange */
    const nc = cycle(t - NET_OFFSET, NET_CYCLE);
    ports.forEach((L, j) => {
      if (still) { L.mt.emissiveIntensity = j === 4 ? 0.03 : 0.35; return; }
      const slot = Math.floor(t * 6);
      const active = j === 4 ? hash(j, slot) > 0.85 : hash(j, slot) > (L.orange ? 0.55 : 0.35);
      const discovering = j === 1 ? bell(nc, 0, 0.15, 0.9, 1.1) : 0;
      L.mt.emissiveIntensity = (active ? (L.orange ? 0.45 : 0.4) : 0.05) + discovering * 0.7;
    });
    traffic.forEach((pk, k) => place(pk, k ? PATHS.net : [...PATHS.net].reverse(), still ? 0 : cycle(t * 0.32 + k * 0.5, 1), 0.05));
    place(pingPacket, PATHS.net, still ? 0 : (nc - 0.2) / 0.8, 0.05); // 1. router pings the device
    const resp = still ? 1 : bell(nc, 1.0, 1.2, 3.4, 3.8); // 2. the device responds: discovery indicator
    found.visible = resp > 0.01; found.scale.setScalar(0.6 + 0.4 * resp);
    place(replyPacket, [...PATHS.net].reverse(), still ? 0 : (nc - 1.2) / 0.8, 0.05); // 3. reply returns to the router
    place(discoveryPacket, PATHS.router, still ? 0 : (nc - 2.1) / 1.8); // 4. discovered asset info → CyfroSec
  }

  return {
    update,
    dispose() { world.remove(group); owned.forEach((x) => x.dispose()); geos.forEach((g) => g.dispose()); },
  };
}
