import { BoxGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial, Vector3, type BufferGeometry, type Material } from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
// The approved CyfroAI Engine modules are imported UNCHANGED from the original scene.
import { createReactor } from '../../platform-architecture-3d/reactor';
import { createFace } from '../../platform-architecture-3d/face';
import { createScreens } from '../../platform-architecture-3d/screens';
import { PROC, PROC_CYCLE } from '../../platform-architecture-3d/processingMotion';
import type { ScreenId } from '../../platform-architecture-3d/geometry';
import { FOOT } from '../registry/grid';
import type { ChunkBuilder } from './types';

/**
 * CyfroAI Engine chunk — P0 PRESERVATION (docs/design/3d-city/engine-preservation.md).
 *
 * The engine is the approved design. Its geometry below is copied VERBATIM from
 * platform-architecture-3d/geometry.ts (lines 81–105 and 116) and its animation VERBATIM from the
 * engine parts of processingMotion.ts (vents, status LEDs, intake, runner, face, reactor). The reactor,
 * bot face and engine screens are the original modules, imported unchanged. The only additions are
 * integration: the outer `processing` frame (a parent transform that centres the device on a city
 * chunk), the chunk deck it sits on, and the hooks the city uses to drive it. Every coordinate inside
 * the frame is the original Processing-zone coordinate, so close-ups are identical.
 *
 * Not copied (they belong to other chunks in the city): the CyfroAgent and Data Ingestion stations,
 * their packets, and the old engine → outputs bridge cable.
 */

/** Parent transform: original engine centre (0.3, −0.9) → chunk-local (0, −0.3). */
export const ENGINE_FRAME_OFFSET: [number, number, number] = [-0.3, 0, 0.6];

const cyc = (t: number, n: number) => ((t % n) + n) % n;
const ease = (x: number) => { const v = Math.min(1, Math.max(0, x)); return v * v * (3 - 2 * v); };
const bell = (t: number, a: number, b: number, c: number, d: number) => ease((t - a) / (b - a)) * (1 - ease((t - c) / (d - c)));
type P = [number, number, number];

export const buildCyfroAiEngine: ChunkBuilder = (ctx) => {
  const { kit, logo, renderer } = ctx;
  const m = ctx.m;
  const group = new Group(); group.name = 'chunk:cyfro-ai-engine';

  /* Chunk deck: the original Processing zone panel and its blue front strip (geometry.ts:29-30), sized to a city chunk */
  kit.box(group, FOOT, 0.16, FOOT, 0, 0.15, 0, m.panel, 0.1);
  kit.box(group, FOOT - 0.27, 0.06, 0.08, 0, 0.27, FOOT / 2 - 0.2, m.blue, 0.01);

  const processing = new Group(); processing.name = 'CyfroAI Engine (original frame)';
  processing.position.set(...ENGINE_FRAME_OFFSET); group.add(processing);

  /* ── original box()/cylinder() helpers (geometry.ts:14-23), unchanged ── */
  const geometry = new Map<string, BufferGeometry>();
  function box(parent: Group, w: number, h: number, d: number, x: number, y: number, z: number, mat: Material, round = .06) {
    if (Math.min(w, h, d) <= .06) round = 0;
    const key = `${w}/${h}/${d}/${round}`;
    if (!geometry.has(key)) geometry.set(key, round ? new RoundedBoxGeometry(w, h, d, 1, round) : new BoxGeometry(w, h, d));
    const mesh = new Mesh(geometry.get(key), mat); mesh.position.set(x, y, z); mesh.castShadow = h > .2 && w > .2 && d > .14; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  void CylinderGeometry; // (the engine itself uses no cylinders)
  const rig = { core: { lights: [] as Mesh[] } };
  const screens: { id: ScreenId; center: [number, number, number]; w: number; h: number; group: Group }[] = [];

  /* ── VERBATIM: platform-architecture-3d/geometry.ts lines 77–105 ── */
  // CyfroAI Engine: a wide, low security appliance in three layers on the existing mounting base
  // (base, channels and bridge cable unchanged). Lower: dark rails, ports, a segmented activity strip.
  // Middle: satin-blue chassis with a recessed glass bay holding the emblem core and the two live
  // analysis displays. Upper: a slim light-metal processing module carrying the status row.
  box(processing,2.9,.32,2.85,.3,.46,-.9,m.edge,.11);
  {
    const cx=.3,cz=-.9;
    // Lower layer: compact infrastructure base (recessed, dark), mounting rails, ports
    box(processing,2.6,.3,1.75,cx,.77,cz,m.screen,.06);
    for(const z of [cz+.8,cz-.8])box(processing,2.78,.06,.1,cx,.655,z,m.edge,.02);
    for(let i=0;i<3;i++)box(processing,.1,.07,.03,cx+.92+i*.15,.8,cz+.885,m.white,.01);
    // Slim cooling / activity channels: a four-segment strip lit in sequence by processingMotion
    for(let i=0;i<4;i++)rig.core.lights.push(box(processing,.34,.04,.03,cx-.75+i*.38,.8,cz+.885,m.screen,.008));
    // Middle layer: the processing chassis
    box(processing,2.75,.95,1.9,cx,1.395,cz,m.blue,.12);
    for(const x of [cx-1.28,cx+1.28])box(processing,.025,.78,.03,x,1.395,cz+.955,m.white,.006); // panel seams inside the rounded corners
    // Recessed core bay: machined bezel + dark glass
    box(processing,2.47,.8,.03,cx,1.4,cz+.96,m.edge,.03);
    box(processing,2.35,.68,.04,cx,1.4,cz+.975,m.screen,.025);
  }
  // Front display in a precision frame with four connection points (face.ts draws the bot face on it; the CyfroSec logo lives in the orb)
  const logoMat=m.white.clone();logoMat.map=logo;logoMat.transparent=true;logoMat.depthWrite=false;
  box(processing,.6,.6,.03,.3,1.4,.09,logoMat,.005);
  for(const [w,h,x,y] of [[.74,.025,.3,1.73],[.74,.025,.3,1.07],[.025,.68,-.07,1.4],[.025,.68,.67,1.4]] as const)box(processing,w,h,.02,x,y,.1,m.white,.004);
  for(const x of [-.07,.67])for(const y of [1.07,1.73])box(processing,.06,.06,.025,x,y,.105,m.blue,.008);
  // Upper layer: slim processing module, seam line and a top inset panel
  box(processing,2.62,.03,1.82,.3,1.885,-.9,m.white,.01);
  box(processing,2.55,.24,1.76,.3,2.02,-.9,m.panel,.08);
  box(processing,1.9,.03,1.15,.3,2.15,-.9,m.edge,.012);
  /* ── VERBATIM: geometry.ts line 116 (the engine's two live analysis displays) ── */
  // The engine's two live analysis displays (Incoming / Findings) sit inside the glass bay either side of the core
  for(const [x,id] of [[-.5,'engIn'],[1.1,'engOut']] as const){box(processing,.56,.4,.02,x,1.4,.1,m.edge,.015);box(processing,.52,.36,.02,x,1.4,.11,m.screen,.012);screens.push({id,center:[x,1.4,.1245],w:.52,h:.36,group:processing});}

  /* ── VERBATIM: processingMotion.ts — the engine's own motion (lines 53–58, 65–72, 92–93) ── */
  const owned: Material[] = [];
  const geos: (BoxGeometry | RoundedBoxGeometry)[] = [];
  const activity = new Group(); activity.name = 'Processing activity'; processing.add(activity);
  const mat = (color: string, e = 0) => { const x = new MeshStandardMaterial({ color, roughness: 0.45, emissive: color, emissiveIntensity: e }); owned.push(x); return x; };
  const unit = new BoxGeometry(1, 1, 1); geos.push(unit); void unit;
  const add = (g: BoxGeometry | RoundedBoxGeometry, mt: Material, p: P, s?: P) => { const x = new Mesh(g, mt); x.position.set(...p); if (s) x.scale.set(...s); activity.add(x); return x; };
  // Engine front grille slots: sequential illumination
  const vents = rig.core.lights.map((mesh) => { const mt = new MeshStandardMaterial({ color: '#102131', roughness: 0.5, emissive: '#039be0', emissiveIntensity: 0 }); owned.push(mt); mesh.material = mt; return mt; });
  // Small functional details on the engine (new, attached to existing surfaces)
  const ledGeo = new RoundedBoxGeometry(0.09, 0.05, 0.02, 1, 0.01); geos.push(ledGeo);
  const leds = Array.from({ length: 6 }, (_, i) => { const mt = mat('#039be0', 0.05); add(ledGeo, mt, [-0.3 + i * 0.24, 2.02, -0.01]); return mt; }); // status row along the front of the upper module
  const intake = mat('#33afdf', 0.05); add(ledGeo, intake, [1.16, 0.53, 0.535], [1.6, 1.2, 1]); // input indicator where the channel meets the base
  const runner = add(new RoundedBoxGeometry(0.12, 0.04, 0.02, 1, 0.008), mat('#33afdf', 0.6), [-1, 0.42, 0.535]); geos.push(runner.geometry as RoundedBoxGeometry); // tiny status indicator along the base
  const face = createFace(logoMat); // the front display shows the bot face (the CyfroSec logo lives in the orb above)
  const reactor = createReactor(activity, { logoUrl: ctx.logoUrl, lite: ctx.lite }); // floating logo core that powers the engine
  const engineScreens = createScreens(screens, renderer);

  /* Mark animated parts so the city never merges or re-shadows them (the engine chunk is never merged anyway) */
  for (const g of [activity]) g.userData.dynamic = true;

  const faceLocal = new Vector3();

  return {
    group,
    noMerge: true,
    update(t, s) {
      const still = s.still;
      /* ── VERBATIM: processingMotion.ts update(), engine parts (lines 104–105, 121, 124–145) ── */
      const pc = cyc(t, PROC_CYCLE);
      const processing = still ? 0 : bell(pc, PROC.engineIn - 0.2, PROC.engineIn + 0.3, PROC.engineOut[0], PROC.engineOut[0] + 0.8);
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
    },
    paint(clock, _activate, reduced, dark) { engineScreens.update(clock, true, reduced, dark, 1); },
    engine: {
      setTheme: reactor.setTheme,
      setHover: reactor.setHover,
      resize: reactor.resize,
      faceCamera: reactor.faceCamera,
      setFacePointer: face.setPointer,
      faceWorld: (out) => processing.localToWorld(out.copy(faceLocal.set(0.3, 1.4, 0.11))),
    },
    dispose() {
      engineScreens.dispose(); face.dispose(); reactor.dispose();
      owned.forEach((x) => x.dispose()); geos.forEach((g) => g.dispose()); geometry.forEach((g) => g.dispose()); logoMat.dispose();
      processing.remove(activity);
    },
  };
};
