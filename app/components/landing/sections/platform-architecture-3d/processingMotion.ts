import { BoxGeometry, Group, Mesh, MeshStandardMaterial, type Material } from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { AnimationRig } from './motion';
import type { Materials } from './materials';
import { createReactor } from './reactor';
import { createFace } from './face';

/**
 * Processing: CyfroAgent → Data Ingestion → CyfroAI Engine → Outputs, coordinated on the shared
 * environment clock. Equipment never moves. Packets travel only along physical channels that exist
 * in the model (the agent→ingestion and ingestion→engine channels, and the deck bridge to Outputs).
 * The engine analyses, correlates and prioritises; nothing here implies automatic fixes.
 * The Data Ingestion paddles keep their existing animation (motion.ts).
 */

export const PROC_CYCLE = 12;
/** Main events in one processing cycle (seconds). */
export const PROC = {
  agentScan: [[0, 2], [6, 8]] as const, // CyfroAgent scans its sources twice per cycle…
  agentSend: [[2, 3.2], [8, 9.2]] as const, // …and forwards each batch to Data Ingestion
  ingestOut: [4.8, 6.0] as const, // normalized records leave Ingestion for the engine
  engineIn: 6.0,
  tokens: 6.3, group: 7.3, prioritize: 8.0, // engine: findings appear, correlate into groups, are prioritized
  engineOut: [9.0, 10.8] as const, // prioritized results leave for Outputs
};
const AGENT_CYCLE = 6;

type P = [number, number, number];
const cyc = (t: number, n: number) => ((t % n) + n) % n;
const ease = (x: number) => { const v = Math.min(1, Math.max(0, x)); return v * v * (3 - 2 * v); };
const bell = (t: number, a: number, b: number, c: number, d: number) => ease((t - a) / (b - a)) * (1 - ease((t - c) / (d - c)));
const hash = (a: number, b: number) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };

const AGENT_TO_INGEST: P[] = [[-0.885, 0.62, 1.95], [0.385, 0.62, 1.95]];
const INGEST_TO_ENGINE: P[] = [[1.16, 0.62, 1.25], [1.16, 0.62, 0.56]];
const Y = 0.255;
const ENGINE_TO_OUTPUTS: P[] = [[1.75, Y, -0.3], [3.6, Y, -0.3], [3.6, Y, -1.3], [3.75, Y, -1.3]]; // across the existing deck bridge

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

export function createProcessingMotion(world: Group, rig: AnimationRig, m: Materials, logoMat: MeshStandardMaterial, logoUrl: string, opts: { lite: boolean } = { lite: false }) {
  const owned: Material[] = [];
  const geos: (BoxGeometry | RoundedBoxGeometry)[] = [];
  const group = new Group(); group.name = 'Processing activity'; world.add(group);
  const mat = (color: string, e = 0) => { const x = new MeshStandardMaterial({ color, roughness: 0.45, emissive: color, emissiveIntensity: e }); owned.push(x); return x; };
  const unit = new BoxGeometry(1, 1, 1); geos.push(unit);
  const add = (g: BoxGeometry | RoundedBoxGeometry, mt: Material, p: P, s?: P) => { const x = new Mesh(g, mt); x.position.set(...p); if (s) x.scale.set(...s); group.add(x); return x; };

  // Agent indicators: own materials so they blink independently
  const agentLights = rig.agent.lights.map((mesh, i) => {
    const c = (mesh.material as MeshStandardMaterial).color.clone();
    const mt = new MeshStandardMaterial({ color: c, roughness: 0.4, emissive: c, emissiveIntensity: 0.1 }); owned.push(mt); mesh.material = mt; return { mt, i };
  });
  // Engine front grille slots: sequential illumination
  const vents = rig.core.lights.map((mesh) => { const mt = new MeshStandardMaterial({ color: '#102131', roughness: 0.5, emissive: '#039be0', emissiveIntensity: 0 }); owned.push(mt); mesh.material = mt; return mt; });

  // Small functional details on the engine (new, attached to existing surfaces)
  const ledGeo = new RoundedBoxGeometry(0.09, 0.05, 0.02, 1, 0.01); geos.push(ledGeo);
  const leds = Array.from({ length: 6 }, (_, i) => { const mt = mat('#039be0', 0.05); add(ledGeo, mt, [-0.3 + i * 0.24, 2.02, -0.01]); return mt; }); // status row along the front of the upper module
  const intake = mat('#33afdf', 0.05); add(ledGeo, intake, [1.16, 0.53, 0.535], [1.6, 1.2, 1]); // input indicator where the channel meets the base
  const runner = add(new RoundedBoxGeometry(0.12, 0.04, 0.02, 1, 0.008), mat('#33afdf', 0.6), [-1, 0.42, 0.535]); geos.push(runner.geometry as RoundedBoxGeometry); // tiny status indicator along the base

  // Engine → Outputs floor cable across the existing deck bridge
  const cable: Mesh[] = [];
  for (let i = 1; i < ENGINE_TO_OUTPUTS.length; i++) {
    const a = ENGINE_TO_OUTPUTS[i - 1], b = ENGINE_TO_OUTPUTS[i], len = Math.abs(b[0] - a[0]) + Math.abs(b[2] - a[2]);
    const c = add(unit, m.edge, [(a[0] + b[0]) / 2, Y - 0.005, (a[2] + b[2]) / 2], [a[0] !== b[0] ? len + 0.08 : 0.08, 0.035, a[0] !== b[0] ? 0.08 : len + 0.08]); c.receiveShadow = true; cable.push(c);
  }

  // Agent front-panel scan bar
  const scan = add(unit, mat('#33afdf', 0.9), [-1.46, 1, 2.56], [0.03, 0.34, 0.01]); scan.visible = false;

  // Packets: loose fragments from the agent; one neat record from Ingestion; prioritized results from the engine
  const fragGeo = new RoundedBoxGeometry(0.09, 0.07, 0.1, 1, 0.02); geos.push(fragGeo);
  const neatGeo = new RoundedBoxGeometry(0.22, 0.1, 0.26, 1, 0.04); geos.push(neatGeo);
  const blue = mat('#039be0', 0.35), bright = mat('#33afdf', 0.4), orangeM = mat('#fe904d', 0.3);
  const frags = [0, 1, 2].map((i) => add(fragGeo, i === 1 ? orangeM : blue, [0, -5, 0]));
  const neat = add(neatGeo, bright, [0, -5, 0]);
  const result = add(neatGeo, blue, [0, -5, 0]);
  const resultTag = add(new RoundedBoxGeometry(0.1, 0.03, 0.1, 1, 0.01), orangeM, [0, -5, 0]); geos.push(resultTag.geometry as RoundedBoxGeometry); // its top priority marker

  const face = createFace(logoMat); // the front display shows the bot face (the CyfroSec logo lives in the orb above)
  const reactor = createReactor(group, { logoUrl, lite: opts.lite }); // floating logo core that powers the engine

  function place(mesh: Mesh, path: P[], u: number, offset: P = [0, 0, 0]) {
    if (u <= 0 || u >= 1) { mesh.visible = false; return; }
    const { p, dir } = along(path, u); mesh.visible = true;
    mesh.position.set(p[0] + offset[0], p[1] + offset[1], p[2] + offset[2]); mesh.rotation.y = dir;
    mesh.scale.setScalar(Math.min(1, u * 12, (1 - u) * 12));
  }

  /** Returns the engine "activity" level (0..1) so screens can react. */
  function update(t: number, still: boolean) {
    const pc = cyc(t, PROC_CYCLE), ac = cyc(t, AGENT_CYCLE);
    const processing = still ? 0 : bell(pc, PROC.engineIn - 0.2, PROC.engineIn + 0.3, PROC.engineOut[0], PROC.engineOut[0] + 0.8);

    /* CyfroAgent: status on, independent blinks, front-panel scan, then it forwards a batch */
    agentLights.forEach(({ mt, i }) => {
      if (still) { mt.emissiveIntensity = 0.35; return; }
      if (i === 0) { mt.emissiveIntensity = 0.45; return; } // status: on
      const period = 0.8 + hash(i, 7) * 0.9, ph = cyc(t + hash(i, 3) * period, period) / period;
      mt.emissiveIntensity = 0.06 + 0.45 * ease(ph / 0.1) * (1 - ease((ph - 0.5) / 0.1));
    });
    const su = still ? -1 : ac / 2; // scan 0–2 s of each 6 s agent cycle
    scan.visible = su > 0 && su < 1; if (scan.visible) scan.position.x = -1.86 + su * 0.8;
    const send = still ? 0 : (ac - 2) / 1.2;
    frags.forEach((f, i) => place(f, AGENT_TO_INGEST, send, [0, (i - 1) * 0.02 + hash(i, 1) * 0.03, (i - 1) * 0.11 + (hash(i, 2) - 0.5) * 0.06])); // loose, unordered

    /* Data Ingestion → engine: one tidy, normalized record */
    place(neat, INGEST_TO_ENGINE, still ? 0 : (pc - PROC.ingestOut[0]) / (PROC.ingestOut[1] - PROC.ingestOut[0]));
    intake.emissiveIntensity = still ? 0.3 : 0.05 + 0.9 * bell(pc, PROC.engineIn - 0.15, PROC.engineIn, PROC.engineIn + 0.6, PROC.engineIn + 1.2);

    /* The reactor above the engine powers it: its discharges and packets drive the device's lights */
    const rs = reactor.update(t, still, processing);

    /* CyfroAI Engine: activity strip, status row, base indicator, face display */
    vents.forEach((mt, i) => {
      const speed = 1 + processing * 2.5, wave = cyc(t * speed * 0.9 - i * 0.22, 1.6);
      const own = 0.04 + (0.15 + processing * 0.5) * Math.max(0, 1 - Math.abs(wave - 0.4) * 2.5);
      // energy travels along the strip after a discharge (strong) and after each packet (soft)
      const surge = 1.4 * Math.exp(-(((rs.sinceDischarge * 7 - i) / 0.8) ** 2)) + 0.45 * Math.exp(-(((rs.sincePacket * 9 - i) / 0.7) ** 2));
      mt.emissiveIntensity = still ? 0.15 : own + rs.energy * 0.12 + surge;
    });
    leds.forEach((mt, i) => {
      if (!still && rs.sinceDischarge < 1.2) { // sequential activation across the row on discharge
        const front = rs.sinceDischarge * 9;
        mt.emissiveIntensity = front >= i && front < i + 3 ? 1.3 : 0.08 + 0.3 * rs.energy;
        return;
      }
      const lit = still ? i < 3 : processing > 0.5 ? cyc(Math.floor(t * 8) - i, 6) < 3 : cyc(Math.floor(t * 1.5) + i * 2, 7) < 2;
      mt.emissiveIntensity = lit ? 0.5 + 0.45 * rs.energy : 0.04 + 0.12 * rs.energy;
    });
    runner.position.x = still ? 0.3 : -1 + cyc(t * (0.25 + processing * 0.5), 1) * 2.6;

    face.update(t, still, rs); // blinks, looks around and reacts to the reactor

    /* Prioritized results leave for Outputs along the bridge cable */
    const ou = still ? 0 : (pc - PROC.engineOut[0]) / (PROC.engineOut[1] - PROC.engineOut[0]);
    place(result, ENGINE_TO_OUTPUTS, ou, [0, 0.07, 0]);
    place(resultTag, ENGINE_TO_OUTPUTS, ou, [0, 0.15, 0]);
    return processing;
  }

  return {
    update,
    setTheme: reactor.setTheme,
    setHover: reactor.setHover,
    resize: reactor.resize,
    faceCamera: reactor.faceCamera,
    setFacePointer: face.setPointer,
    /** parts of this activity group that are NOT the CyfroAI Engine (the homepage → 3D City outro clears them away) */
    nonEngine: { packets: [scan, ...frags, neat, result, resultTag], cable },
    dispose() { face.dispose(); reactor.dispose(); world.remove(group); owned.forEach((x) => x.dispose()); geos.forEach((g) => g.dispose()); },
  };
}
