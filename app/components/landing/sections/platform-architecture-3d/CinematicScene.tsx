'use client';
import { useEffect, useRef, useState } from 'react';
import { AmbientLight, Box3, BoxGeometry, DirectionalLight, EdgesGeometry, Group, HemisphereLight, type Object3D, LineBasicMaterial, LineSegments, Mesh, MeshBasicMaterial, PerspectiveCamera, PlaneGeometry, Raycaster, Scene, ShadowMaterial, SRGBColorSpace, TextureLoader, Vector2, Vector3, WebGLRenderer, NeutralToneMapping, PCFSoftShadowMap } from 'three';
import { buildWorld } from './geometry';
import { createMaterials, themeWorld } from './materials';
import { createArchitectureMotion } from './motion';
import { createScreens } from './screens';
import { createSourcesMotion } from './sourcesMotion';
import { createProcessingMotion } from './processingMotion';
import { CYCLE, OUTPUTS_AT, TAB_FOCUS, TAB_POSES, sampleTour, smooth, type Pose, type TabView } from './cinematic';
import { ENGINE_DECK, HOME_ENGINE_CHUNK_ORIGIN, homeHandoffOrbit } from '../cityHandoff';
import { createOrbit, fromPose } from './orbit';
import styles from './Cinematic.module.css';

export type Hotspot = { id: string; label: string; desc: string; at: [number, number, number] };
/** `view === null` → camera follows the intro (or rests on the overview once it is done). */
export type CameraMode = { view: TabView | null; replay: number; skip: number; reset: number; zoom: number; outro?: number; outroCancel?: number; returnGo?: number };

/**
 * Invisible interaction volumes per component (world coordinates). Desks and cabinets use two
 * tight parts (body + monitor) so empty air never catches the pointer for the wrong machine.
 * They wrap the visible geometry without changing it, and don't overlap.
 */
type Part = { c: [number, number, number]; s: [number, number, number] };
const desk = (x: number, z: number): Part[] => [{ c: [x, 0.72, z], s: [2.2, 1.0, 1.3] }, { c: [x, 2.1, z - 0.12], s: [1.8, 1.35, 0.32] }];
const cabinet = (x: number, z: number): Part[] => [{ c: [x, 0.55, z], s: [1.6, 0.6, 0.7] }, { c: [x, 1.75, z - 0.08], s: [1.5, 1.1, 0.3] }];
const HITBOXES: Record<string, Part[]> = {
  'ai-infra': [{ c: [-5.95, 1.75, -1.75], s: [4.4, 3.1, 1.5] }],
  network: [{ c: [-4.65, 0.95, 1.5], s: [1.7, 1.3, 1.3] }],
  'code-src': desk(-7.15, 1.75),
  agent: [{ c: [-1.46, 0.8, 1.9], s: [1.3, 1.1, 1.3] }],
  ingestion: [{ c: [1.16, 0.8, 1.9], s: [1.7, 1.1, 1.3] }],
  engine: [{ c: [0.3, 1.22, -0.9], s: [2.95, 1.95, 2.9] }, { c: [0.3, 3.0, -0.9], s: [1.25, 1.25, 1.25] }], // device + its energy orb
  insights: [{ c: [6, 2.65, -1.9], s: [4.1, 2.25, 0.35] }, { c: [6, 0.45, -1.8], s: [4.5, 0.4, 0.9] }],
  compliance: cabinet(4.4, -0.72),
  dashboards: cabinet(7.6, -0.72),
  assistant: desk(4.81, 1.25),
  'code-out': desk(7.19, 1.6),
  // Zones: the deck of each zone (machines sit above it and are nearer the camera, so they still win)
  sources: [{ c: [-6, 0.3, 0], s: [5.45, 0.4, 7.5] }],
  processing: [{ c: [0, 0.3, 0], s: [5.45, 0.4, 7.5] }],
  outputs: [{ c: [6, 0.3, 0], s: [5.45, 0.4, 7.5] }],
};
const ZONES = new Set(['sources', 'processing', 'outputs']);
/** One outline per component: the bounds of its parts. */
const bounds = (parts: Part[]): Part => {
  const lo = [0, 1, 2].map((i) => Math.min(...parts.map((p) => p.c[i] - p.s[i] / 2)));
  const hi = [0, 1, 2].map((i) => Math.max(...parts.map((p) => p.c[i] + p.s[i] / 2)));
  return { c: [0, 1, 2].map((i) => (lo[i] + hi[i]) / 2) as Part['c'], s: [0, 1, 2].map((i) => hi[i] - lo[i]) as Part['s'] };
};

/**
 * Four independent controllers:
 *  · intro (cinematic): the camera tour, played once per mount; never loops by itself
 *  · operations: machines, screens and packets on their own elapsed-time clock, always on while visible
 *  · camera: intro path, tab views, the resting overview; never resets the machines
 *  · interaction: raycast hover / tap / keyboard focus → highlight + tooltip; never moves the camera
 * Only visibility (section on screen, tab shown) pauses the clocks; scroll never sets a frame.
 */
export default function CinematicScene({
  dark, reduced, mode, frozen, hotspots, onAct, onIntroDone, onReady, onError, onOutroDone, entry = 'tour', onReturnDone,
}: {
  dark: boolean; reduced: boolean; mode: CameraMode; frozen: boolean; hotspots: Hotspot[];
  onAct: (actId: number) => void; onIntroDone: (done: boolean) => void; onReady: () => void; onError: () => void;
  /** the 3D City outro reached its final, Engine-only frame (a JPEG of that frame, or null) */
  onOutroDone?: (frame: string | null) => void;
  /** how the scene starts (read once, at mount): the intro tour; the finished overview; or, coming back from the
   *  3D City, the outro's Engine-only end state, held until `mode.returnGo`, then played backwards */
  entry?: 'tour' | 'overview' | 'return';
  /** the return reassembly finished: the architecture is complete and interactive */
  onReturnDone?: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const labels = useRef<Record<string, HTMLButtonElement | null>>({});
  const tip = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<string | null>(null); // React only hears about hover changes
  const live = useRef({ dark, reduced, mode, frozen, hovered: null as string | null, viaLabel: null as string | null }); // viaLabel: hovered through its label
  const hooks = useRef<{ theme: (d: boolean) => void; mode: () => void; wake: () => void } | null>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let renderer: WebGLRenderer;
    try { renderer = new WebGLRenderer({ antialias: true, powerPreference: 'low-power' }); } catch { onError(); return; }
    renderer.toneMapping = NeutralToneMapping;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true;
    el.prepend(renderer.domElement); renderer.domElement.setAttribute('aria-hidden', 'true');

    const scene = new Scene();
    const camera = new PerspectiveCamera(34, 1, 0.1, 100);
    const materials = createMaterials();
    const sun = new DirectionalLight('#ffffff', 3); sun.position.set(-4, 13, 10); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 12, bottom: -12, near: 1, far: 40 }); sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.04;
    const fill = new HemisphereLight('#d2e7fc', '#203448', 2.1);
    const rim = new DirectionalLight('#8dc3e6', 1.4); rim.position.set(8, 7, -9);
    scene.add(sun, fill, rim, new AmbientLight('#ffffff', 0.25));
    const logo = new TextureLoader().load(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/circle_logo.png`, () => wake()); logo.colorSpace = SRGBColorSpace;
    const model = buildWorld(materials, logo); scene.add(model.world);
    const motion = createArchitectureMotion(model.world, model.rig);
    const screens = createScreens(model.screens, renderer);
    const sources = createSourcesMotion(model.world, model.rig, materials);
    const processing = createProcessingMotion(model.world, model.rig, materials, model.logoMat, `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/circle_logo.png`, { lite: el.clientWidth < 700 }); // fewer reactor particles on small screens
    const groundGeo = new PlaneGeometry(40, 28); const groundMat = new ShadowMaterial({ opacity: 0.22 });
    const ground = new Mesh(groundGeo, groundMat); ground.rotation.x = -Math.PI / 2; ground.position.y = -0.55; ground.receiveShadow = true; scene.add(ground);

    /* ── interaction: invisible hitboxes + a subtle outline for the hovered one ── */
    const hitGeo = new BoxGeometry(1, 1, 1), edgeGeo = new EdgesGeometry(hitGeo);
    const hitMat = new MeshBasicMaterial({ visible: false });
    const outlineMat = new LineBasicMaterial({ color: '#039be0', transparent: true, opacity: 0.85 });
    const hits: Mesh[] = [], outlines: Record<string, LineSegments> = {};
    for (const [id, parts] of Object.entries(HITBOXES)) {
      for (const p of parts) { const h = new Mesh(hitGeo, hitMat); h.position.set(...p.c); h.scale.set(...p.s); h.userData.component = id; scene.add(h); hits.push(h); }
      const { c, s } = bounds(parts);
      const o = new LineSegments(edgeGeo, outlineMat); o.position.set(...c); o.scale.set(s[0] + 0.06, s[1] + 0.06, s[2] + 0.06); o.visible = false; scene.add(o); outlines[id] = o;
    }
    const raycaster = new Raycaster(), ndc = new Vector2(), faceAt = new Vector3();
    let pointer: { x: number; y: number } | null = null, hoverDirty = false;
    let width = 1, height = 1, frame = 0, visible = false;
    const pick = (x: number, y: number) => {
      ndc.set((x / width) * 2 - 1, -(y / height) * 2 + 1); raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.intersectObjects(hits, false)[0]; // nearest volume wins
      return hit ? (hit.object.userData.component as string) : null;
    };
    const setHover = (id: string | null) => {
      if (live.current.hovered === id) return;
      const prev = live.current.hovered; if (prev && outlines[prev]) outlines[prev].visible = false;
      live.current.hovered = id; if (id && outlines[id]) outlines[id].visible = true;
      setHovered(id); setCursor(); wake();
    };
    const local = (e: PointerEvent) => { const r = renderer.domElement.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    const canvas = renderer.domElement;
    const setCursor = () => { canvas.style.cursor = drag?.moved ? 'grabbing' : live.current.hovered ? 'pointer' : 'grab'; };
    // Drag to orbit (mouse: any direction; touch: horizontal — vertical swipes keep scrolling the page), pinch to zoom
    const touches = new Map<number, { x: number; y: number }>();
    let drag: { id: number; x: number; y: number; sx: number; sy: number; moved: boolean; t: number; vt: number; ve: number } | null = null;
    let pinch: number | null = null;
    const onDown = (e: PointerEvent) => {
      if (outro) return; // the outro owns the camera
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const p = local(e);
      if (e.pointerType !== 'mouse') { touches.set(e.pointerId, p); if (touches.size === 2) { const [a, b] = [...touches.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); drag = null; return; } }
      if (e.pointerType === 'mouse') e.preventDefault(); // no text selection while dragging
      drag = { id: e.pointerId, x: p.x, y: p.y, sx: p.x, sy: p.y, moved: false, t: performance.now(), vt: 0, ve: 0 };
      canvas.setPointerCapture?.(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      const p = local(e);
      if (e.pointerType !== 'mouse' && touches.has(e.pointerId)) {
        touches.set(e.pointerId, p);
        if (touches.size === 2 && pinch) { const [a, b] = [...touches.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (d > 0) { orbit.zoom(pinch / d); pinch = d; takeControl(); wake(); } return; }
      }
      if (drag && drag.id === e.pointerId) {
        const dx = p.x - drag.x, dy = p.y - drag.y, now = performance.now(), dtm = Math.max(1, now - drag.t);
        if (!drag.moved && Math.hypot(p.x - drag.sx, p.y - drag.sy) > 6) { drag.moved = true; takeControl(); setHover(null); }
        if (drag.moved) {
          const vert = e.pointerType === 'mouse' ? dy : 0; // touch: vertical movement belongs to page scroll
          const dT = -dx * 0.0062, dE = vert * 0.0045;
          orbit.rotate(dT, dE); drag.vt = (dT / dtm) * 1000; drag.ve = (dE / dtm) * 1000;
          setCursor(); wake();
        }
        drag.x = p.x; drag.y = p.y; drag.t = now;
        return;
      }
      if (e.pointerType === 'mouse') { pointer = p; hoverDirty = true; wake(); }
    };
    const onUp = (e: PointerEvent) => {
      const p = local(e);
      touches.delete(e.pointerId); if (touches.size < 2) pinch = null;
      if (!drag || drag.id !== e.pointerId) return;
      const was = drag; drag = null; canvas.releasePointerCapture?.(e.pointerId);
      if (was.moved) { if (performance.now() - was.t < 80) orbit.fling(was.vt * 0.9, was.ve * 0.9); setCursor(); wake(); return; } // a rotation never selects
      const id = pick(p.x, p.y);
      if (e.pointerType !== 'mouse') setHover(id && live.current.hovered !== id ? id : null); // touch: tap shows / hides the explanation (mouse: hover already shows it)
      setCursor();
    };
    const onCancel = (e: PointerEvent) => { touches.delete(e.pointerId); pinch = null; if (drag?.id === e.pointerId) drag = null; }; // the page took over (scroll)
    const onLeave = () => { pointer = null; if (!drag) setHover(null); };
    // Zoom: trackpad pinch / Ctrl+wheel only — a plain wheel keeps scrolling the page
    const onWheel = (e: WheelEvent) => { if (!e.ctrlKey && !e.metaKey) return; e.preventDefault(); orbit.zoom(Math.exp(e.deltaY * 0.01)); takeControl(); wake(); };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onCancel);
    canvas.addEventListener('pointerleave', onLeave);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.style.cursor = 'grab';

    /* ── clocks: intro (once) and operations (always) ── */
    const startEntry = entry;
    let opClock = 0, introClock = 0, introDone = live.current.reduced || startEntry !== 'tour', last: number | null = null, outputsOn = introDone, codeNear = 0;
    // One camera controller. First visit eases in from a higher reveal; with the intro skipped it starts on the overview.
    /**
     * The overview, framed for this screen: perspective makes the near end of the deck look larger, so
     * aiming at the geometric middle reads as off-centre. Shift the aim point (along the view's right/up)
     * until the deck's on-screen outline is centred. Same angle and distance; only the aim moves.
     */
    const probe = new PerspectiveCamera();
    const DECK = [-9.6, 9.6].flatMap((x) => [-0.5, 0.3].flatMap((y) => [-4.65, 4.65].map((z) => new Vector3(x, y, z))));
    const right = new Vector3(), up = new Vector3(), q = new Vector3();
    const frameTarget = new Vector3(), frameOffset = new Vector3();
    /** Aim point that centres the deck's on-screen outline for a given orbit angle and distance. */
    function framedTarget(theta: number, elev: number, dist: number): [number, number, number] {
      const target = frameTarget.set(0, 0.5, 0);
      const narrow = camera.aspect < 1 ? 1 + (1 - camera.aspect) * 1.15 : 1, d = dist * narrow, h = Math.cos(elev) * d;
      const offset = frameOffset.set(Math.sin(theta) * h, Math.sin(elev) * d, Math.cos(theta) * h);
      probe.fov = camera.fov; probe.aspect = camera.aspect; probe.updateProjectionMatrix();
      for (let i = 0; i < 5; i++) {
        probe.position.copy(target).add(offset); probe.lookAt(target); probe.updateMatrixWorld();
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const c of DECK) { q.copy(c).project(probe); minX = Math.min(minX, q.x); maxX = Math.max(maxX, q.x); minY = Math.min(minY, q.y); maxY = Math.max(maxY, q.y); }
        const halfH = Math.tan((probe.fov * Math.PI) / 360) * d, halfW = halfH * probe.aspect;
        right.setFromMatrixColumn(probe.matrixWorld, 0); up.setFromMatrixColumn(probe.matrixWorld, 1);
        target.addScaledVector(right, ((minX + maxX) / 2) * halfW).addScaledVector(up, ((minY + maxY) / 2) * halfH * 0.6); // vertical: gentler, the HUD sits below
      }
      return [target.x, target.y, target.z];
    }
    function framedOverview(): Pose {
      const o = TAB_POSES.overview, dx = o.pos[0] - o.target[0], dy = o.pos[1] - o.target[1], dz = o.pos[2] - o.target[2], dist = Math.hypot(dx, dy, dz);
      const tg = framedTarget(Math.atan2(dx, dz), Math.asin(dy / dist), dist);
      return { pos: [tg[0] + dx, tg[1] + dy, tg[2] + dz], target: tg };
    }
    const overviewPose = () => framedOverview();
    const orbit = createOrbit(introDone ? TAB_POSES.overview : { pos: [13.4, 17.5, 23.5], target: [0, 0.3, 0] });
    let lastOutro = live.current.mode.outro ?? 0, lastOutroCancel = live.current.mode.outroCancel ?? 0, lastReturnGo = live.current.mode.returnGo ?? 0;
    let lastActId = -1, lastReplay = live.current.mode.replay, lastSkip = live.current.mode.skip, lastReset = live.current.mode.reset, lastZoom = live.current.mode.zoom, lastView = live.current.mode.view;
    /** The visitor rotated / zoomed: the intro stops driving the camera (it never restarts by itself). */
    function takeControl() { finishIntro(); }
    const v = new Vector3();

    /* ── the outro to the 3D City (homepage CTA) ──
       The architecture separates around the CyfroAI Engine: Data Sources (with the CyfroAgent station) slides out
       to the left, Outputs (with Data Ingestion) to the right, both settling below the deck; the shared deck
       contracts to the Engine's own square. Meanwhile the camera glides to the exact first shot of /platform-city
       (cityHandoff.ts). Engine meshes and animation are never touched. Every change is a transform on existing
       objects and is recorded, so a cancel restores the original world exactly. */
    const OUTRO = 3.4, CAM_END = 3.0, TILE = ENGINE_DECK + 0.6;
    type Saved = { o: Object3D; parent: Object3D; pos: Vector3; scale: Vector3; visible: boolean; size: Vector3 };
    type Outro = { t: number; dir: 1 | 0 | -1; from: { target: [number, number, number]; theta: number; elev: number; dist: number }; saved: Map<Object3D, Saved>; agent: Group; ingest: Group; done: boolean };
    let outro: Outro | null = null;
    const proc = model.zones.get('processing')!, srcZone = model.zones.get('sources')!, outZone = model.zones.get('outputs')!;
    const srcActivity = model.world.children.find((c) => c.name === 'Data Sources activity');
    const isMesh = (o: Object3D): o is Mesh => (o as Mesh).isMesh === true;
    const near = (o: Object3D, x: number, y: number, z: number) => Math.abs(o.position.x - x) + Math.abs(o.position.y - y) + Math.abs(o.position.z - z) < 1e-3;
    const panel = proc.children.find((o) => isMesh(o) && near(o, 0, 0.15, 0)), kerb = proc.children.find((o) => isMesh(o) && near(o, 0, 0.27, 3.55));
    const seg = (t: number, a: number, b: number) => smooth((t - a) / (b - a));
    const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
    const box3 = new Box3();
    /** forward (the CTA), or `hold` = start at the end state (coming back from the city) and wait for `returnGo` */
    function startOutro(opts: { hold?: boolean; from?: { target: [number, number, number]; theta: number; elev: number; dist: number } } = {}) {
      if (outro) return;
      finishIntro(); setHover(null);
      const saved = new Map<Object3D, Saved>();
      const keep = (o: Object3D) => { const size = isMesh(o) ? (o.geometry.computeBoundingBox(), box3.copy(o.geometry.boundingBox!).getSize(new Vector3())) : new Vector3(); saved.set(o, { o, parent: o.parent!, pos: o.position.clone(), scale: o.scale.clone(), visible: o.visible, size }); };
      // the CyfroAgent and Data Ingestion stations, their channels and live panel: everything in front of the Engine
      const agent = new Group(), ingest = new Group(); agent.name = 'outro:agent'; ingest.name = 'outro:ingest';
      for (const o of [...proc.children]) if (isMesh(o) && o !== panel && o !== kerb && o.position.z > 0.6) { keep(o); (o.position.x < 0 ? agent : ingest).add(o); }
      proc.add(agent, ingest);
      for (const o of [srcZone, outZone, ...(srcActivity ? [srcActivity] : []), ...model.world.children.filter(isMesh), ...(panel ? [panel] : []), ...(kerb ? [kerb] : [])]) keep(o);
      const c = orbit.cur;
      outro = { t: opts.hold ? OUTRO : 0, dir: opts.hold ? 0 : 1, from: opts.from ?? { target: [...c.target], theta: c.theta, elev: c.elev, dist: c.dist }, saved, agent, ingest, done: false };
      el!.dataset.outro = opts.hold ? 'held' : 'running'; wake();
    }
    /** put every recorded object back exactly as it was (the original architecture) */
    function restoreWorld() {
      if (!outro) return;
      for (const sv of outro.saved.values()) { if (sv.o.parent !== sv.parent) sv.parent.add(sv.o); sv.o.position.copy(sv.pos); sv.o.scale.copy(sv.scale); sv.o.visible = sv.visible; }
      proc.remove(outro.agent, outro.ingest);
      for (const c of processing.nonEngine.cable) c.visible = true;
      outro = null; delete el!.dataset.outro; renderer.shadowMap.needsUpdate = true;
    }
    function cancelOutro() { // also "skip" for the return: the complete architecture at once
      if (!outro) return;
      const returning = outro.dir !== 1;
      restoreWorld(); orbit.aim(overviewPose()); wake();
      if (returning) onReturnDone?.();
    }
    function updateOutro(dt: number) {
      const o = outro!; o.t = Math.min(OUTRO, Math.max(0, o.t + dt * o.dir)); const t = o.t;
      // camera: one smooth glide, the shortest way round, to the city's first shot of the Engine
      const end = homeHandoffOrbit(), u = seg(t, 0, CAM_END), c = orbit.cur;
      let dTheta = end.theta - o.from.theta; dTheta -= Math.round(dTheta / (Math.PI * 2)) * Math.PI * 2;
      c.theta = o.from.theta + dTheta * u; c.elev = lerp(o.from.elev, end.elev, u); c.dist = lerp(o.from.dist, end.dist, u);
      for (let i = 0; i < 3; i++) c.target[i] = lerp(o.from.target[i], end.target[i], u);
      orbit.goal.theta = c.theta; orbit.goal.elev = c.elev; orbit.goal.dist = c.dist; orbit.goal.target = [...c.target];
      // coordinated separation: sources left, outputs right (each with its station), then the deck contracts
      const sL = seg(t, 0.35, 2.35), sR = seg(t, 0.5, 2.5), st = seg(t, 0.6, 2.3), dk = seg(t, 1.1, 2.8);
      const [ox, , oz] = HOME_ENGINE_CHUNK_ORIGIN;
      for (const sv of o.saved.values()) {
        const ob = sv.o, b = sv.pos;
        if (ob === srcZone || ob === srcActivity) { ob.position.set(b.x - 9 * sL, b.y - 1.0 * sL, b.z); ob.visible = sL < 1; continue; }
        if (ob === outZone) { ob.position.set(b.x + 9 * sR, b.y - 1.0 * sR, b.z); ob.visible = sR < 1; continue; }
        if (ob === panel) { ob.position.set(lerp(b.x, ox, dk), b.y, lerp(b.z, oz, dk)); ob.scale.set(lerp(1, ENGINE_DECK / sv.size.x, dk), 1, lerp(1, ENGINE_DECK / sv.size.z, dk)); continue; }
        if (ob === kerb) { ob.position.set(lerp(b.x, ox, dk), b.y, lerp(b.z, oz + ENGINE_DECK / 2 - 0.2, dk)); ob.scale.x = lerp(1, (ENGINE_DECK - 0.27) / sv.size.x, dk); continue; }
        if (sv.parent !== model.world) continue; // station parts ride their group
        if (sv.size.x > 10) { // the shared base slab and its front strip contract to the Engine's tile
          ob.scale.x = lerp(1, TILE / sv.size.x, dk); ob.position.x = lerp(b.x, ox, dk);
          if (sv.size.z > 5) { ob.scale.z = lerp(1, TILE / sv.size.z, dk); ob.position.z = lerp(b.z, oz, dk); } else ob.position.z = lerp(b.z, oz + TILE / 2 - 0.1, dk);
        } else if (Math.abs(b.x) > 2 && Math.abs(b.x) < 4) { const sg = Math.sign(b.x), k = sg < 0 ? sL : sR; ob.position.set(b.x + sg * 6 * k, b.y - 0.6 * k, b.z); ob.visible = k < 1; } // deck bridges leave with their side
        else ob.visible = dk === 0; // corner feet of the shared deck
      }
      o.agent.position.set(-4.5 * st, -0.8 * st, 0.6 * st); o.agent.visible = st < 1;
      o.ingest.position.set(4.5 * st, -0.8 * st, 0.6 * st); o.ingest.visible = st < 1;
      renderer.shadowMap.needsUpdate = true;
      if (o.dir === -1 && t <= 0) { restoreWorld(); onReturnDone?.(); } // reassembled: the architecture is back, exactly as designed
    }
    const running = () => visible && !document.hidden;
    const finishIntro = (settle = false) => { if (!introDone) { introDone = true; outputsOn = true; onIntroDone(true); if (settle) orbit.aim(overviewPose()); } };

    function tick(now: number) {
      frame = 0;
      if (!running()) { last = null; return; }
      const dt = last === null ? 0 : Math.min(0.1, (now - last) / 1000);
      last = now;
      const { reduced: r, frozen: f, mode: m } = live.current;
      if (!f && !r) opClock += dt;
      if (!introDone && !m.view && !r && !f) { introClock += dt; if (introClock >= CYCLE) finishIntro(true); }

      // camera: the intro (while it runs) aims the orbit along its path; afterwards only presets, Reset and the visitor do
      let actId = 0;
      if (outro) updateOutro(dt);
      else if (!introDone && !m.view) { const s = sampleTour(introClock); orbit.aim(s, 30); actId = s.act.id; }
      const view = live.current.mode.view;
      if (!outro && introDone && (!view || view === 'overview') && orbit.goal.dist > 16) orbit.goal.target = framedTarget(orbit.goal.theta, orbit.goal.elev, orbit.goal.dist); // wide shots stay centred from any angle
      const camMoving = outro ? !outro.done : orbit.update(dt, r);
      orbit.apply(camera, camera.aspect < 1 ? 1 + (1 - camera.aspect) * 1.15 : 1);
      processing.faceCamera(camera.position); // the reactor's logo sphere always faces the viewer
      // The front face follows the pointer gently when it is near the machine (desktop; never while dragging)
      if (pointer && !drag && !r && !f) {
        faceAt.set(0.3, 1.4, 0.11).project(camera);
        const fx = ((faceAt.x + 1) / 2) * width, fy = ((1 - faceAt.y) / 2) * height;
        const dx = pointer.x - fx, dy = pointer.y - fy, reach = Math.min(width, height) * 0.45;
        processing.setFacePointer(Math.hypot(dx, dy) < reach ? { x: dx / (reach * 0.6), y: dy / (reach * 0.6) } : null, live.current.hovered === 'engine');
      } else processing.setFacePointer(null, false);
      if (actId !== lastActId) { lastActId = actId; onAct(actId); }
      const tgt = orbit.cur.target;

      // operations: independent of the camera (only the small Data Sources code screen repaints less often when far)
      if (!outputsOn && introClock >= OUTPUTS_AT) outputsOn = true;
      codeNear += ((Math.hypot(tgt[0] + 6, tgt[2]) < 3.5 ? 1 : 0) - codeNear) * Math.min(1, dt * 4);
      motion.update(opClock + 9, r || f);
      sources.update(opClock, r || f);
      processing.setHover(live.current.hovered === 'engine'); // hovering the engine raises the reactor's activity a little
      processing.update(opClock, r || f);
      if (outro) { for (const x of processing.nonEngine.packets) x.visible = false; for (const x of processing.nonEngine.cable) x.visible = outro.t < 0.5; } // nothing travels to stations that are leaving
      screens.update(opClock, outputsOn, r, live.current.dark, codeNear);

      // interaction: raycast when the pointer moved, or while the camera moves under a still pointer
      if (!outro && pointer && !drag && (hoverDirty || camMoving)) { hoverDirty = false; setHover(pick(pointer.x, pointer.y)); } // tooltips follow while the camera moves

      renderer.render(scene, camera);
      if (outro && outro.dir === 1 && !outro.done && outro.t >= OUTRO) { // the final, Engine-only frame: hand it to the city page
        outro.done = true; el!.dataset.outro = 'done';
        let shot: string | null = null; try { shot = canvas.toDataURL('image/jpeg', 0.85); } catch { shot = null; }
        onOutroDone?.(shot);
      }
      placeOverlays(m.view);
      el!.dataset.intro = introDone ? 'done' : introClock.toFixed(2); el!.dataset.ops = opClock.toFixed(2);
      el!.dataset.cam = `${((orbit.cur.theta * 180) / Math.PI).toFixed(1)},${((orbit.cur.elev * 180) / Math.PI).toFixed(1)},${orbit.cur.dist.toFixed(2)}`; // azimuth°, elevation°, distance
      if ((!r && !f) || camMoving || drag || (outro && !outro.done)) frame = requestAnimationFrame(tick); // reduced/paused: still render while the visitor moves the camera
    }

    function placeOverlays(view: TabView | null) {
      const focus = outro ? [] : view ? TAB_FOCUS[view] : introDone ? TAB_FOCUS.overview : sampleTour(introClock).act.focus;
      const { hovered: hov } = live.current;
      const placed: { l: number; r: number; t: number; b: number }[] = []; // shown labels, to avoid overlaps
      for (const h of hotspots) {
        const b = labels.current[h.id]; if (!b) continue;
        v.set(...h.at).project(camera);
        const x = (v.x + 1) / 2 * width, y = (1 - v.y) / 2 * height;
        const viaLabel = live.current.viaLabel === h.id;
        const show = (focus.includes(h.id) && hov !== h.id) || viaLabel; // a label being hovered stays put (its tooltip opens below it)
        const inside = v.z < 1 && x > 40 && x < width - 40 && y > 30 && y < height - 30 && !occluded(h.id, h.at);
        let ly = y;
        if (show && inside) { // stack a label below any shown label it would overlap
          const w = b.offsetWidth, ht = b.offsetHeight;
          for (let guard = 0; guard < 6; guard++) {
            const box = { l: x - w / 2, r: x + w / 2, t: ly - ht, b: ly };
            const clash = placed.find((q) => box.l < q.r && box.r > q.l && box.t < q.b && box.b > q.t);
            if (!clash) { placed.push(box); break; }
            ly = clash.b + ht + 4;
          }
        }
        b.style.transform = `translate(${x.toFixed(1)}px, ${ly.toFixed(1)}px) translate(-50%, -100%)`;
        b.style.opacity = show && inside ? '1' : '0';
        b.style.pointerEvents = show && inside ? 'auto' : 'none';
      }
      // tooltip: anchored above the hovered machine, clamped inside the stage, never scaled with the world
      const t = tip.current;
      if (t && hov && HITBOXES[hov]) {
        const { c, s } = bounds(HITBOXES[hov]);
        v.set(c[0], c[1] + s[1] / 2, c[2]).project(camera);
        let x = (v.x + 1) / 2 * width, y = (1 - v.y) / 2 * height - 12;
        const tw = t.offsetWidth, th = t.offsetHeight;
        if (y - th < 8) { v.set(c[0], c[1] - s[1] / 2, c[2]).project(camera); y = (1 - v.y) / 2 * height + th + 12; } // no room above → below
        const lb = live.current.viaLabel === hov ? labels.current[hov] : null;
        if (lb) { // opened from its label: sit just below the label instead of over it
          const r = lb.getBoundingClientRect(), host0 = lb.offsetParent?.getBoundingClientRect();
          if (host0) { x = r.left - host0.left + r.width / 2; y = r.bottom - host0.top + th + 8; }
        }
        x = Math.min(Math.max(x, tw / 2 + 12), width - tw / 2 - 12);
        y = Math.min(Math.max(y, th + 8), height - 8);
        t.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
      }
    }
    // A label hides when another machine stands between it and the camera (seen from behind or the side)
    const dir = new Vector3(), from = new Vector3();
    function occluded(id: string, at: [number, number, number]) {
      if (!HITBOXES[id] || ZONES.has(id)) return false; // zone labels sit on the deck edge
      from.copy(camera.position); dir.set(...at).sub(from); const dist = dir.length(); dir.normalize();
      raycaster.set(from, dir); raycaster.far = dist - 0.05;
      const hit = raycaster.intersectObjects(hits, false).find((x) => x.object.userData.component !== id);
      raycaster.far = Infinity;
      return !!hit;
    }
    function wake() { if (!frame && running()) frame = requestAnimationFrame(tick); }
    function resize() {
      width = el!.clientWidth; height = el!.clientHeight; camera.aspect = width / height; camera.fov = width < 600 ? 50 : 34; camera.updateProjectionMatrix(); renderer.setSize(width, height, false); processing.resize(width, height);
      // resizing clears the canvas; draw this frame now so a blank canvas is never painted (e.g. while the outro's stage changes size)
      orbit.apply(camera, camera.aspect < 1 ? 1 + (1 - camera.aspect) * 1.15 : 1); renderer.render(scene, camera);
      wake();
    }

    hooks.current = {
      theme: (d) => { themeWorld(d, scene, materials, sun, fill); processing.setTheme(d); groundMat.opacity = d ? 0.2 : 0.3; outlineMat.color.set(d ? '#33afdf' : '#0278ae'); renderer.shadowMap.needsUpdate = true; wake(); },
      mode: () => {
        const m = live.current.mode;
        if ((m.outro ?? 0) !== lastOutro) { lastOutro = m.outro ?? 0; startOutro(); return; }
        if ((m.outroCancel ?? 0) !== lastOutroCancel) { lastOutroCancel = m.outroCancel ?? 0; cancelOutro(); return; }
        if ((m.returnGo ?? 0) !== lastReturnGo) { lastReturnGo = m.returnGo ?? 0; if (outro && outro.dir === 0) { outro.dir = -1; el!.dataset.outro = 'returning'; wake(); } return; }
        if (outro) return; // the outro owns the camera until it finishes or is cancelled
        if (m.view) finishIntro(); // the visitor took the camera: the intro is over (it never restarts by itself)
        if (m.skip !== lastSkip) { lastSkip = m.skip; finishIntro(true); }
        if (m.replay !== lastReplay) { lastReplay = m.replay; if (!live.current.reduced) { introDone = false; introClock = 0; onIntroDone(false); } } // explicit replay only
        if (live.current.reduced) finishIntro();
        if (m.reset !== lastReset) { lastReset = m.reset; orbit.aim(overviewPose()); } // Reset View
        else if (m.zoom !== lastZoom) { orbit.zoom(Math.pow(0.82, m.zoom - lastZoom)); lastZoom = m.zoom; }
        else if (m.view) orbit.aim(m.view === 'overview' ? overviewPose() : TAB_POSES[m.view]); // a preset: smooth move; free rotation continues from there
        else if (lastView && !m.view) orbit.aim(overviewPose());
        lastView = m.view;
        wake();
      },
      wake,
    };
    hooks.current.theme(live.current.dark);
    if (introDone) onIntroDone(true);

    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) wake(); else { cancelAnimationFrame(frame); frame = 0; last = null; } }, { threshold: 0.05 });
    io.observe(el);
    const ro = new ResizeObserver(resize); ro.observe(el);
    const onVis = () => { if (document.hidden) { cancelAnimationFrame(frame); frame = 0; last = null; } else wake(); };
    document.addEventListener('visibilitychange', onVis);
    const lost = (e: Event) => { e.preventDefault(); onError(); }; renderer.domElement.addEventListener('webglcontextlost', lost);
    resize(); if (introDone) orbit.aim(overviewPose());
    if (startEntry === 'return' && !live.current.reduced) startOutro({ hold: true, from: fromPose(overviewPose()) }); // the Engine-only shot the city ended on
    onReady();
    return () => {
      hooks.current = null; cancelAnimationFrame(frame); io.disconnect(); ro.disconnect(); document.removeEventListener('visibilitychange', onVis);
      renderer.domElement.removeEventListener('webglcontextlost', lost);
      canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointermove', onMove); canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onCancel); canvas.removeEventListener('pointerleave', onLeave); canvas.removeEventListener('wheel', onWheel);
      motion.dispose(); sources.dispose(); processing.dispose(); screens.dispose(); model.dispose(); Object.values(materials).forEach((x) => x.dispose());
      hitGeo.dispose(); edgeGeo.dispose(); hitMat.dispose(); outlineMat.dispose();
      logo.dispose(); groundGeo.dispose(); groundMat.dispose(); sun.shadow.dispose(); renderer.dispose(); renderer.domElement.remove();
    };
    // the world is built once; live values are read through `live`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { live.current.dark = dark; hooks.current?.theme(dark); }, [dark]);
  useEffect(() => { live.current.reduced = reduced; hooks.current?.mode(); }, [reduced]);
  useEffect(() => { live.current.mode = mode; hooks.current?.mode(); }, [mode]);
  useEffect(() => { live.current.frozen = frozen; hooks.current?.wake(); }, [frozen]);

  // Keyboard: every component has a focusable label; focusing it shows the same explanation as hover
  const focusTip = (id: string | null) => { live.current.hovered = id; setHovered(id); hooks.current?.wake(); };
  const tipData = hovered ? hotspots.find((h) => h.id === hovered) : null;

  return (
    <div ref={host} className={styles.scene}>
      {hotspots.map((h) => (
        <button
          key={h.id}
          ref={(b) => { labels.current[h.id] = b; }}
          type="button"
          className={styles.hotspot}
          aria-describedby={hovered === h.id ? 'arch-tip' : undefined}
          onClick={() => focusTip(live.current.hovered === h.id ? null : h.id)}
          onMouseEnter={() => { live.current.viaLabel = h.id; focusTip(h.id); }}
          onMouseLeave={() => { live.current.viaLabel = null; focusTip(null); }}
          onFocus={() => focusTip(h.id)}
          onBlur={() => focusTip(null)}
          style={{ opacity: 0 }}
        >
          {h.label}
        </button>
      ))}
      <div ref={tip} id="arch-tip" role="tooltip" className={styles.tip} data-open={tipData ? 'true' : 'false'}>
        {tipData && (
          <>
            <strong>{tipData.label}</strong>
            <span>{tipData.desc}</span>
          </>
        )}
      </div>
    </div>
  );
}
