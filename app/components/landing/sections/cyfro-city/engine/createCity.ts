import {
  AmbientLight, Box3, BoxGeometry, Color, DirectionalLight, ExtrudeGeometry, Shape, EdgesGeometry, Frustum, Group, HemisphereLight, InstancedMesh, LineSegments, Matrix4, Mesh, MeshBasicMaterial,
  MeshStandardMaterial, NeutralToneMapping, Object3D, PCFShadowMap, PerspectiveCamera, PlaneGeometry, Raycaster, Scene, ShadowMaterial, Sphere, SRGBColorSpace,
  TextureLoader, Vector2, Vector3, WebGLRenderer, type BufferGeometry, type Material,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  CHUNKS, FLOWS, STORY, INFRA_CYCLE, CODE_CYCLE, evaluateStory, validateRegistry, DISTRICTS, MYSTERY_COPY, AMBIENT, createDirector, TEASERS, type Directed,
  cityBounds, chunkCenter, chunkHalf, portWorld, routeBetween, FOOT, PITCH, cellOutline, insetPolygon, insidePolygon, polygonToWorld,
  type ChunkDefinition, type FlowDefinition, type StoryState,
} from '../registry';
import { BUILDERS } from '../chunks';
import type { ChunkInstance, ChunkSignal } from '../chunks/types';
import { createKit } from '../kit/parts';
import { createCityMaterials, themeCity } from '../kit/materials';
import { createOrbit, LIMITS, type OrbitState } from './orbit';
import { mergeStaticMeshes } from '../kit/merge';
import { createTransport } from './transport';
import { timeline, slotsFor, ENGINE_ID, OPENING, REVEAL_GLOW } from '../registry/assembly';
import { REVEAL } from '../chunks/engineSurroundsPlan';

/**
 * CyfroSec 3D City engine: ONE renderer, ONE scene, every chunk placed from the registry.
 *
 * Controllers (same separation as the original scene):
 *  · intro: a camera tour generated from the districts, played once per session, skippable/replayable
 *  · story: the illustrative walkthrough (registry/story.ts) → per-chunk phases and packets
 *  · camera: one damped orbit; intro, chunk focus, workflow steps and the visitor only set its goal
 *  · interaction: raycast against one hit volume per chunk; labels and tooltip are DOM overlays
 * Detail levels per chunk and frame: L1 focused/near (full), L2 visible (lightweight, throttled
 * screens), L3 off-screen (no updates at all). The CyfroAI Engine runs its original animation in
 * L1 and L2 and is never merged or simplified.
 */

type V3 = [number, number, number];
export type CityCallbacks = {
  onReady(): void;
  onError(): void;
  onHover(id: string | null): void;
  onSelect(id: string | null): void;
  onIntro(s: { running: boolean; act: string; index: number; total: number }): void;
  onCaption(lines: string[]): void;
};
export type LabelRefs = { chunks: Record<string, HTMLElement | null>; hotspots: Record<string, HTMLElement | null>; tip: HTMLElement | null };

/** one continuous CyfroSec slab; the 'edge' district (your team, approved teasers) stands on its own pads */
const SAAS_DISTRICTS = new Set(['control', 'code', 'ai', 'operations']);
const DISTRICT_Y: Record<string, number> = { customer: -0.12, external: -0.06 };
const PLATE_MARGIN = 0.15;
const LANE_OVERRIDE: Record<string, number> = { F01: 0.12, F03: 0.24, F02: 0.12, F20: 0.12 };
const smooth = (t: number) => { const x = Math.min(1, Math.max(0, t)); return x * x * (3 - 2 * x); };
const lerpAngle = (a: number, b: number, k: number) => a + (b - a) * k;

export function createCity(el: HTMLDivElement, labels: () => LabelRefs, opts: { dark: boolean; reduced: boolean; skipIntro: boolean; assembly?: boolean }, cb: CityCallbacks) {
  /** /platform-city: the city assembles around the CyfroAI Engine instead of the fly-over intro */
  const A = opts.assembly ? timeline(slotsFor(CHUNKS)) : null;
  /* ── registry check (development safety net; the same rules run in `npm test`) ── */
  if (process.env.NODE_ENV !== 'production') {
    const problems = validateRegistry({ chunks: CHUNKS, flows: FLOWS, districts: DISTRICTS, story: STORY, cycles: { infra: INFRA_CYCLE, code: CODE_CYCLE }, mysteryCopy: MYSTERY_COPY, ambient: AMBIENT, teasers: TEASERS });
    if (problems.length) console.error('[cyfro-city] registry problems:\n' + problems.join('\n'));
  }

  let renderer: WebGLRenderer;
  try { renderer = new WebGLRenderer({ antialias: true }); } catch { cb.onError(); return null; }
  const lite = el.clientWidth < 700; // the original rule for the reactor's particle pools
  const maxDpr = Math.min(window.devicePixelRatio || 1, 1.5);
  let dpr = maxDpr;
  renderer.toneMapping = NeutralToneMapping;
  renderer.setPixelRatio(dpr);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = PCFShadowMap;
  renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true;
  el.prepend(renderer.domElement); renderer.domElement.setAttribute('aria-hidden', 'true');

  const scene = new Scene();
  const camera = new PerspectiveCamera(34, 1, 0.1, 260);
  const m = createCityMaterials();
  const kit = createKit();
  const owned: Material[] = [];

  /* Lights: the original rig, same directions and intensities (the engine is lit exactly as before);
     only the shadow frustum grows to cover the city. */
  const sun = new DirectionalLight('#ffffff', 3); sun.position.set(-4 * 2.4, 13 * 2.4, 10 * 2.4); sun.castShadow = true;
  sun.shadow.mapSize.set(lite ? 1024 : 2048, lite ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 24, bottom: -24, near: 1, far: 110 }); sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.04;
  const fill = new HemisphereLight('#d2e7fc', '#203448', 2.1);
  const rim = new DirectionalLight('#8dc3e6', 1.4); rim.position.set(8, 7, -9);
  scene.add(sun, fill, rim, new AmbientLight('#ffffff', 0.25));
  const logoUrl = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/circle_logo.png`;
  const logo = new TextureLoader().load(logoUrl, () => wake()); logo.colorSpace = SRGBColorSpace;

  /* ── layout from the registry ── */
  const bounds = cityBounds(CHUNKS);
  const byId = new Map(CHUNKS.map((c) => [c.id, c]));
  const world = new Group(); scene.add(world);
  const worldOf = (c: ChunkDefinition): V3 => { const [x, z] = chunkCenter(c, bounds); return [x, DISTRICT_Y[c.district] ?? 0, z]; };

  /* plates: one continuous CyfroSec platform, a separate walled customer plate, detached external pads */
  type Rect = { x0: number; x1: number; z0: number; z1: number };
  const rectOf = (list: ChunkDefinition[], margin: number): Rect => {
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const c of list) { const [x, z] = chunkCenter(c, bounds), [hx, hz] = chunkHalf(c); x0 = Math.min(x0, x - hx - margin); x1 = Math.max(x1, x + hx + margin); z0 = Math.min(z0, z - hz - margin); z1 = Math.max(z1, z + hz + margin); }
    return { x0, x1, z0, z1 };
  };
  const saasRect = rectOf(CHUNKS.filter((c) => SAAS_DISTRICTS.has(c.district)), PLATE_MARGIN + 0.1);
  const custRect = rectOf(CHUNKS.filter((c) => c.district === 'customer'), PLATE_MARGIN); // bounds only (camera framing)
  // the customer plate follows the district's REAL cells (an L-shape today), never a bounding rectangle
  const custOutline = polygonToWorld(cellOutline(CHUNKS.filter((c) => c.district === 'customer').map((c) => c.grid)), bounds);
  const custEdge = PITCH / 2 - FOOT / 2 - PLATE_MARGIN; // street half-width minus the plate margin
  const custPoly = insetPolygon(custOutline, custEdge);
  saasRect.x0 = Math.max(saasRect.x0, custRect.x1 + 0.1); // a visible seam between your environment / code hosting and CyfroSec
  const padRects = CHUNKS.filter((c) => c.district === 'external' || c.district === 'edge').map((c) => ({ c, r: rectOf([c], c.district === 'edge' ? 0.12 : 0.2) }));
  const plates = new Group(); plates.name = 'plates'; world.add(plates);
  // sub-groups so the assembly cinematic can grow / raise them; each merges on its own
  const saasPlateG = new Group(), custG = new Group(), padG = new Map<string, Group>();
  /** assembly: per-platform foundation tiles (owned by their platform; see buildTiles) */
  const tileG = new Map<string, Group>();
  saasPlateG.name = 'cyfrosec-foundation'; custG.name = 'customer-foundation+wall';
  plates.add(saasPlateG, custG);
  function plate(r: Rect, y: number, edge: Material, base: Material, strip?: Material, parent: Group = plates) {
    const w = r.x1 - r.x0, d = r.z1 - r.z0, cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2;
    kit.box(parent, w + 0.2, 0.34, d + 0.2, cx, y - 0.35, cz, edge, 0.12);
    kit.box(parent, w, 0.4, d, cx, y - 0.12, cz, base, 0.14);
    if (strip) kit.box(parent, w - 0.4, 0.08, 0.16, cx, y - 0.28, r.z1 + 0.08, strip, 0.025);
  }
  plate(saasRect, 0, m.edge, m.base, m.blue, saasPlateG);
  /** An extruded plate following an orthogonal outline (clockwise, x-right / z-down), top at `top`. */
  const polyGeos: BufferGeometry[] = [];
  function polyPlate(poly: [number, number][], top: number, depth: number, mat: Material, bevel: number) {
    const sh = new Shape(); const inner = insetPolygon(poly, bevel);
    inner.forEach(([x, z], i) => (i ? sh.lineTo(x, z) : sh.moveTo(x, z)));
    const g = new ExtrudeGeometry(sh, { depth: depth - bevel * 2, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2 });
    g.rotateX(Math.PI / 2); polyGeos.push(g); // shape y → world z; extrusion goes down
    const mesh = new Mesh(g, mat); mesh.position.y = top - bevel; mesh.receiveShadow = true; mesh.castShadow = true; custG.add(mesh); return mesh;
  }
  polyPlate(insetPolygon(custOutline, custEdge - 0.1), DISTRICT_Y.customer - 0.18, 0.34, m.wall, 0.06);
  polyPlate(custPoly, DISTRICT_Y.customer + 0.08, 0.4, m.customerBase, 0.07);
  for (const { c, r } of padRects) { const pg = new Group(); plates.add(pg); padG.set(c.id, pg); if (c.district === 'edge') plate(r, 0, m.edge, m.base, undefined, pg); else plate(r, DISTRICT_Y.external, m.padBase, m.padBase, undefined, pg); }
  const plateTop = (x: number, z: number) => {
    const inR = (r: Rect) => x >= r.x0 - 0.01 && x <= r.x1 + 0.01 && z >= r.z0 - 0.01 && z <= r.z1 + 0.01;
    for (const { c, r } of padRects) if (inR(r)) return 0.08 + (DISTRICT_Y[c.district] ?? 0);
    if (insidePolygon(custPoly, x, z)) return 0.08 + DISTRICT_Y.customer;
    if (inR(saasRect)) return 0.08;
    return 0.06; // bridges
  };

  /* customer perimeter wall with ONE gate, where CyfroAgent's connection leaves */
  const agent = byId.get('cyfro-agent')!;
  const [, gz] = chunkCenter(agent, bounds);
  const gate = { z0: gz - 1.45, z1: gz + 1.45 };
  {
    const y = 0.08 + DISTRICT_Y.customer + 0.2, t = 0.12, h = 0.4;
    const wall = insetPolygon(custPoly, 0.09);
    const [ax] = chunkCenter(agent, bounds), gateX = ax + FOOT / 2;
    const seg = (x0: number, z0: number, x1: number, z1: number) => { if (Math.abs(x1 - x0) + Math.abs(z1 - z0) > 0.05) kit.box(custG, Math.abs(x1 - x0) + t, h, Math.abs(z1 - z0) + t, (x0 + x1) / 2, y, (z0 + z1) / 2, m.wall, 0.03); };
    let gx = 0;
    wall.forEach((a, i) => {
      const b = wall[(i + 1) % wall.length];
      const vertical = Math.abs(a[0] - b[0]) < 1e-6, zlo = Math.min(a[1], b[1]), zhi = Math.max(a[1], b[1]);
      if (vertical && Math.abs(a[0] - gateX) < 0.5 && zlo < gate.z0 && zhi > gate.z1) { // the one gate, where CyfroAgent's connection leaves
        gx = a[0]; seg(a[0], zlo, a[0], gate.z0); seg(a[0], gate.z1, a[0], zhi);
      } else seg(a[0], a[1], b[0], b[1]);
    });
    for (const z of [gate.z0, gate.z1]) kit.box(custG, 0.26, 0.75, 0.26, gx, y + 0.18, z, m.panel, 0.05); // gate posts
    const gateMt = new MeshStandardMaterial({ color: '#039be0', emissive: '#039be0', emissiveIntensity: 0.6, roughness: 0.4 }); owned.push(gateMt);
    kit.box(custG, 0.08, 0.06, gate.z1 - gate.z0 - 0.2, gx, y + 0.56, (gate.z0 + gate.z1) / 2, gateMt, 0); // lintel light
  }
  /*
   * Assembly only: each platform's OWN piece of foundation — the CyfroSec slab or the customer plate cut along
   * cell lines, plus (customer cells) its stretch of the perimeter wall, the one gate on CyfroAgent's side.
   * A tile rises with its platform, so nothing is ever shown for a platform that has not arrived. The tiles
   * together reproduce the district plates; when the city is complete the real (merged) plates take over.
   */
  if (A) {
    const H = PITCH / 2, custIds = new Set(CHUNKS.filter((c) => c.district === 'customer').map((c) => `${c.grid.x},${c.grid.z}`));
    const isCust = (x: number, z: number) => custIds.has(`${x},${z}`);
    const tileMt = new MeshStandardMaterial({ color: '#039be0', emissive: '#039be0', emissiveIntensity: 0.6, roughness: 0.4 }); owned.push(tileMt);
    const slab = (g: Group, r: Rect, top: number, h: number, mat: Material) => { if (r.x1 - r.x0 > 0.01 && r.z1 - r.z0 > 0.01) kit.box(g, r.x1 - r.x0, h, r.z1 - r.z0, (r.x0 + r.x1) / 2, top - h / 2, (r.z0 + r.z1) / 2, mat, 0); };
    for (const c of CHUNKS) {
      const saas = SAAS_DISTRICTS.has(c.district), cust = c.district === 'customer';
      if (!saas && !cust) continue; // pads already rise with their platform
      const tg = new Group(); tg.name = `tile:${c.id}`; world.add(tg); tileG.set(c.id, tg);
      const [x, z] = chunkCenter(c, bounds), cell: Rect = { x0: x - H, x1: x + H, z0: z - H, z1: z + H };
      if (saas) {
        const r = { x0: Math.max(cell.x0, saasRect.x0), x1: Math.min(cell.x1, saasRect.x1), z0: Math.max(cell.z0, saasRect.z0), z1: Math.min(cell.z1, saasRect.z1) };
        const on = (a: number, b: number) => Math.abs(a - b) < 1e-6;
        const e = { x0: r.x0 - (on(r.x0, saasRect.x0) ? 0.1 : 0), x1: r.x1 + (on(r.x1, saasRect.x1) ? 0.1 : 0), z0: r.z0 - (on(r.z0, saasRect.z0) ? 0.1 : 0), z1: r.z1 + (on(r.z1, saasRect.z1) ? 0.1 : 0) };
        slab(tg, e, -0.18, 0.34, m.edge); slab(tg, r, 0.08, 0.4, m.base);
        if (on(r.z1, saasRect.z1)) { const sx0 = Math.max(r.x0, saasRect.x0 + 0.2), sx1 = Math.min(r.x1, saasRect.x1 - 0.2); kit.box(tg, sx1 - sx0, 0.08, 0.16, (sx0 + sx1) / 2, -0.28, saasRect.z1 + 0.08, m.blue, 0); }
      } else {
        const Y = DISTRICT_Y.customer, gx = c.grid.x, gz = c.grid.z;
        const out = { n: !isCust(gx, gz - 1), s: !isCust(gx, gz + 1), w: !isCust(gx - 1, gz), e: !isCust(gx + 1, gz) };
        const inset = (d: number): Rect => ({ x0: cell.x0 + (out.w ? d : 0), x1: cell.x1 - (out.e ? d : 0), z0: cell.z0 + (out.n ? d : 0), z1: cell.z1 - (out.s ? d : 0) });
        slab(tg, inset(custEdge - 0.1), Y - 0.18, 0.34, m.wall);
        slab(tg, inset(custEdge), Y + 0.08, 0.4, m.customerBase);
        // this cell's stretch of the perimeter wall (convex corners stop at the corner, other ends run on)
        const wy = 0.08 + Y + 0.2, t = 0.12, wh = 0.4, d = custEdge + 0.09;
        const seg = (x0: number, z0: number, x1: number, z1: number) => { if (Math.abs(x1 - x0) + Math.abs(z1 - z0) > 0.05) kit.box(tg, Math.abs(x1 - x0) + t, wh, Math.abs(z1 - z0) + t, (x0 + x1) / 2, wy, (z0 + z1) / 2, m.wall, 0.03); };
        const xa = cell.x0 + (out.w ? d : -d), xb = cell.x1 - (out.e ? d : -d), za = cell.z0 + (out.n ? d : -d), zb = cell.z1 - (out.s ? d : -d);
        if (out.n) seg(xa, cell.z0 + d, xb, cell.z0 + d);
        if (out.s) seg(xa, cell.z1 - d, xb, cell.z1 - d);
        if (out.w) seg(cell.x0 + d, za, cell.x0 + d, zb);
        if (out.e) {
          const wx = cell.x1 - d;
          if (c.id === 'cyfro-agent') { // the one gate, where CyfroAgent's connection leaves
            seg(wx, za, wx, gate.z0); seg(wx, gate.z1, wx, zb);
            for (const gzz of [gate.z0, gate.z1]) kit.box(tg, 0.26, 0.75, 0.26, wx, wy + 0.18, gzz, m.panel, 0.05);
            kit.box(tg, 0.08, 0.06, gate.z1 - gate.z0 - 0.2, wx, wy + 0.56, (gate.z0 + gate.z1) / 2, tileMt, 0);
          } else seg(wx, za, wx, zb);
        }
      }
      tg.visible = false;
    }
  }

  /* bridges to the detached external pads (along their port lines) */
  for (const { c, r } of padRects) {
    const p = c.ports[0]; if (!p) continue;
    const [px, pz] = portWorld(c, p, bounds);
    if (p.side === 'n' || p.side === 's') {
      const zA = p.side === 's' ? r.z1 : r.z0, zB = p.side === 's' ? saasRect.z0 : saasRect.z1;
      kit.box(padG.get(c.id)!, 0.9, 0.08, Math.abs(zB - zA) + 0.3, px, 0.02, (zA + zB) / 2, m.edge, 0.02);
    } else {
      const xA = p.side === 'e' ? r.x1 : r.x0, xB = p.side === 'e' ? saasRect.x0 : saasRect.x1;
      kit.box(padG.get(c.id)!, Math.abs(xB - xA) + 0.3, 0.08, 0.9, (xA + xB) / 2, 0.02, pz, m.edge, 0.02);
    }
  }

  /* ── chunks ── */
  type Live = { def: ChunkDefinition; inst: ChunkInstance; pos: V3; sphere: Sphere; level: 0 | 1 | 2 | 3; lastPaint: number; idx: number };
  const live: Live[] = [];
  const merged: BufferGeometry[] = [];
  const isAncestor = (a: Object3D, o: Object3D) => { for (let p: Object3D | null = o; p; p = p.parent) if (p === a) return true; return false; };
  const isDynamic = (o: Object3D) => { for (let p: Object3D | null = o; p; p = p.parent) if (p.userData.dynamic) return true; return false; };
  function mergeStatic(g: Group) {
    merged.push(...mergeStaticMeshes(g, { skip: (mesh) => isDynamic(mesh) || mesh.name.startsWith('screen:') }));
    // animated parts never cast a (baked, therefore stale) shadow
    g.traverse((o) => { if ((o as Mesh).isMesh && isDynamic(o)) (o as Mesh).castShadow = false; });
  }

  /* Construction is sliced (one chunk per step, ~12 ms budget per task) so building the city never
     blocks the main thread in one long task; the scene starts after the last step and an async shader compile. */
  const steps: (() => void)[] = [];
  const cityStatic = new Group(); const mergedOriginals: Mesh[] = [];
  let engineChunk: Live | undefined;
  CHUNKS.forEach((def, idx) => steps.push(() => {
    const build = BUILDERS[def.builder];
    if (!build) { console.error(`[cyfro-city] no builder ${def.builder}`); return; }
    const inst = build({ def, kit, m, owned, renderer, logo, logoUrl, lite });
    if (!inst.noMerge) mergeStatic(inst.group);
    const pos = worldOf(def);
    inst.group.position.set(...pos); inst.group.name = `chunk:${def.id}`; world.add(inst.group);
    const [hx, hz] = chunkHalf(def);
    const entry: Live = { def, inst, pos, sphere: new Sphere(new Vector3(pos[0], pos[1] + 1.6, pos[2]), Math.hypot(hx, hz, 2.2)), level: 0, lastPaint: -1, idx };
    live.push(entry); if (inst.engine) engineChunk = entry;
    // interaction volume + rim outline for this chunk
    const h = new Mesh(hitGeo, hitMat); h.position.set(pos[0], pos[1] + 1.6, pos[2]); h.scale.set(hx * 2, 3.2, hz * 2); h.userData.chunk = def.id; world.add(h); hits.push(h);
    const r = new LineSegments(rimGeo, m.rimLine); r.position.set(pos[0], pos[1] + 0.15, pos[2]); r.visible = false; world.add(r); rims.set(def.id, r);
  }));
  steps.push(() => { for (const pg of [saasPlateG, custG, ...padG.values(), ...tileG.values()]) mergeStatic(pg); });
  /* City-wide static merge: after each chunk merged its own static parts, merge those across the whole city
     by material (one draw call per material instead of one per material per chunk). Never the CyfroAI Engine
     (preserved exactly), never cables (they swap material when highlighted), never animated parts or screens. */
  steps.push(() => {
    world.updateMatrixWorld(true);
    const buckets = new Map<string, { mat: Material; cast: boolean; geos: BufferGeometry[]; meshes: Mesh[] }>();
    const roots: Object3D[] = [plates, ...live.filter((l) => !l.inst.noMerge).map((l) => l.inst.group)];
    for (const root of roots) root.traverse((o) => {
      const mesh = o as Mesh;
      if (!mesh.isMesh || (mesh as unknown as InstancedMesh).isInstancedMesh || isDynamic(mesh) || Array.isArray(mesh.material) || mesh.name.startsWith('screen:')) return;
      const mat = mesh.material as Material; if ((mat as MeshBasicMaterial).transparent) return;
      const key = `${mat.uuid}/${mesh.castShadow}`;
      if (!buckets.has(key)) buckets.set(key, { mat, cast: mesh.castShadow, geos: [], meshes: [] });
      const src = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
      for (const name of Object.keys(src.attributes)) if (!['position', 'normal', 'uv'].includes(name)) src.deleteAttribute(name);
      if (!src.attributes.uv) return; // (every kit geometry has uvs; skip anything unusual)
      src.applyMatrix4(mesh.matrixWorld);
      const b = buckets.get(key)!; b.geos.push(src); b.meshes.push(mesh);
    });
    cityStatic.name = 'city-static'; world.add(cityStatic);
    for (const b of buckets.values()) {
      if (b.meshes.length < 2) { b.geos.forEach((x) => x.dispose()); continue; }
      const geo = mergeGeometries(b.geos, false); b.geos.forEach((x) => x.dispose());
      if (!geo) continue;
      merged.push(geo);
      const mesh = new Mesh(geo, b.mat); mesh.castShadow = b.cast; mesh.receiveShadow = true; mesh.name = 'merged-city'; mesh.matrixAutoUpdate = false;
      b.meshes.forEach((x) => { x.visible = false; mergedOriginals.push(x); }); cityStatic.add(mesh);
    }
  });

  /** the merged city (final, interactive) or the per-chunk meshes it was built from (while assembling) */
  function setCityMerged(on: boolean) { cityStatic.visible = on; for (const x of mergedOriginals) x.visible = !on; }

  /* ── connections: one route per flow (carriers share their pipe), cables + instanced packets ── */
  type Route = { flow: FlowDefinition & { emphasis?: string }; pts: [number, number][]; y: number[]; cable: Group | null; mats: Material[]; lit?: string; mat?: MeshStandardMaterial };
  const routes = new Map<string, Route>();
  const cables = new Group(); cables.name = 'connections'; world.add(cables);
  /*
   * Connection lines: every verified connection is a visible, restrained CyfroSec-blue line once both of its
   * platforms exist. States change only brightness (each cable has its own small material, so nothing is swapped):
   *   base  — the architecture at rest (subtle, readable)       dim — something else is focused (still visible)
   *   rel   — touches the hovered / selected platform          on  — data is moving on it right now (transport)
   *   hl    — chosen in the details panel                       glow — just established during the assembly
   * Kinds keep their meaning: data/control lines in CyfroSec blue, external links lighter, AI calls dotted (an
   * in-process library call, not a network cable), approval routes orange.
   */
  type CableStyle = 'base' | 'dim' | 'rel' | 'on' | 'hl' | 'glow';
  const CABLE_COLOR = (f: FlowDefinition, dark: boolean) =>
    f.kind === 'APPR' ? (dark ? '#fe904d' : '#f0742a') : f.kind === 'AI' ? (dark ? '#8fd8f5' : '#2f9fd3') : f.kind === 'EXT' ? (dark ? '#5fb3dc' : '#3f8fb8') : (dark ? '#039be0' : '#0278ae');
  const CABLE_GLOW: Record<CableStyle, number> = { base: 0.34, dim: 0.07, rel: 0.75, on: 0.95, hl: 1.05, glow: 1.0 };
  const cableTint = new Color(), cableFloor = new Color();
  function styleCable(r: Route, st: CableStyle) {
    const key = `${st}/${state.dark}`; if (r.lit === key || !r.mat) return; r.lit = key;
    cableTint.set(CABLE_COLOR(r.flow, state.dark)); cableFloor.set(state.dark ? '#20384d' : '#d5e1eb');
    r.mat.color.copy(cableTint).lerp(cableFloor, st === 'dim' ? 0.5 : 0);
    r.mat.emissive.copy(st === 'hl' ? cableTint.set('#33afdf') : cableTint);
    r.mat.emissiveIntensity = CABLE_GLOW[st] * (state.dark ? 1 : 0.45);
  }
  FLOWS.forEach((f, i) => {
    if (f.display === 'hidden') return;
    const fc = byId.get(f.from.chunk)!, tc = byId.get(f.to.chunk)!;
    const fp = fc.ports.find((p) => p.id === f.from.port)!, tp = tc.ports.find((p) => p.id === f.to.port)!;
    const lane = LANE_OVERRIDE[f.id] ?? ((i % 5) - 2) * 0.08;
    let pts = routeBetween(portWorld(fc, fp, bounds), fp.side, portWorld(tc, tp, bounds), tp.side, bounds, lane);
    if (f.carrier && routes.has(f.carrier)) pts = [...routes.get(f.carrier)!.pts].reverse();
    const y = pts.map(([x, z]) => plateTop(x, z) + 0.02);
    let cable: Group | null = null;
    if (!f.carrier) {
      cable = new Group(); cable.name = `flow:${f.id}`; cables.add(cable);
      const mat = new MeshStandardMaterial({ roughness: 0.4, metalness: 0.1 }); owned.push(mat); const thick = 0.07; // one width for every line
      for (let k = 1; k < pts.length; k++) {
        const [ax, az] = pts[k - 1], [bx, bz] = pts[k], len = Math.abs(bx - ax) + Math.abs(bz - az), horiz = ax !== bx;
        const yy = plateTop((ax + bx) / 2, (az + bz) / 2) + 0.025;
        if (f.kind === 'AI') { // dotted: an in-process library call, not a network cable
          const n = Math.max(1, Math.floor(len / 0.3));
          for (let d = 0; d < n; d++) { const u = (d + 0.5) / n, x = ax + (bx - ax) * u, z = az + (bz - az) * u; kit.box(cable, horiz ? 0.16 : thick, 0.04, horiz ? thick : 0.16, x, yy, z, mat, 0); }
        } else kit.box(cable, horiz ? len + thick : thick, 0.04, horiz ? thick : len + thick, (ax + bx) / 2, yy, (az + bz) / 2, mat, 0);
      }
      cable.traverse((o) => { if ((o as Mesh).isMesh) { (o as Mesh).castShadow = false; } });
      mergeStatic(cable);
    }
    const r: Route = { flow: f, pts, y, cable, mats: [], mat: cable ? (cable.children.find((o) => (o as Mesh).isMesh) as Mesh | undefined)?.material as MeshStandardMaterial : undefined };
    routes.set(f.id, r); // styled by the frame loop (base / dim / rel / on / hl / glow)
  });
  const transport = createTransport(world, routes, plateTop);

  /* ── interaction volumes + rim outlines (one per chunk) ── */
  const hitGeo = new BoxGeometry(1, 1, 1), hitMat = new MeshBasicMaterial({ visible: false });
  const rimGeo = new EdgesGeometry(new BoxGeometry(FOOT + 0.12, 0.26, FOOT + 0.12));
  const hits: Mesh[] = [], rims = new Map<string, LineSegments>();
  const groundGeo = new PlaneGeometry(140, 120), groundMat = new ShadowMaterial({ opacity: 0.22 });
  const ground = new Mesh(groundGeo, groundMat); ground.rotation.x = -Math.PI / 2; ground.position.y = -0.62; ground.receiveShadow = true; scene.add(ground);

  /* ── camera ── */
  const probe = new PerspectiveCamera();
  const corners: Vector3[] = [];
  // the real silhouette: every plate's own corners (not the empty corners of an overall bounding box)
  for (const r of [saasRect, ...padRects.map((p) => p.r)]) for (const x of [r.x0, r.x1]) for (const z of [r.z0, r.z1]) for (const y of [-0.45, 2.6]) corners.push(new Vector3(x, y, z));
  for (const [x, z] of custPoly) for (const y of [-0.45, 2.6]) corners.push(new Vector3(x, y, z));
  const narrowK = () => (camera.aspect < 1 ? 1 + (1 - camera.aspect) * 1.15 : 1);
  const q = new Vector3(), right = new Vector3(), upv = new Vector3();
  /** Overview framed for this screen: aim and distance so the whole city fits and reads centred. */
  // default angle (owner-approved 2026-10-12): almost straight on from the south, ~34° down; portrait screens keep a rotated fit
  function overviewOrbit(theta = camera.aspect < 0.8 ? 1.2 : 0.08, elev = camera.aspect < 0.8 ? 0.92 : 0.6): OrbitState {
    const target = new Vector3(0, 0.4, 0.4); let dist = 46;
    probe.fov = camera.fov; probe.aspect = camera.aspect; probe.updateProjectionMatrix();
    for (let i = 0; i < 6; i++) {
      const d = dist * narrowK(), h = Math.cos(elev) * d;
      probe.position.set(target.x + Math.sin(theta) * h, target.y + Math.sin(elev) * d, target.z + Math.cos(theta) * h); probe.lookAt(target); probe.updateMatrixWorld();
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const c of corners) { q.copy(c).project(probe); minX = Math.min(minX, q.x); maxX = Math.max(maxX, q.x); minY = Math.min(minY, q.y); maxY = Math.max(maxY, q.y); }
      const halfH = Math.tan((probe.fov * Math.PI) / 360) * d, halfW = halfH * probe.aspect;
      right.setFromMatrixColumn(probe.matrixWorld, 0); upv.setFromMatrixColumn(probe.matrixWorld, 1);
      target.addScaledVector(right, ((minX + maxX) / 2) * halfW).addScaledVector(upv, ((minY + maxY) / 2) * halfH * 0.6);
      const ext = Math.max((maxX - minX) / 2 / 0.985, (maxY - minY) / 2 / 0.9);
      dist *= ext;
    }
    return { target: [target.x, target.y, target.z], theta, elev, dist };
  }
  /*
   * THE overview: the one camera preset every overview entry uses (the end of the assembly cinematic, Skip, the
   * Overview button, leaving a selected platform, resize). Owner-approved framing, calibrated 2026-10-12 against the
   * reference screenshot (1857×753 stage) by fitting the platform labels' screen positions (mean error 5.9 px):
   * straight on from the south, ~26.6° down, slightly closer than the plain fit and aimed a little left / up.
   * The framing is stored relative to the fit-to-screen framing at that angle, so other screen sizes keep the same
   * composition; if the city would clip (narrower screens), the extra zoom eases back until it fits.
   * Portrait screens keep their rotated fit (the whole city stays visible on phones).
   */
  let lastOverviewK = 1; // (debug) how much of the calibrated framing applies on this screen
  const OVERVIEW_ANGLE = { theta: 0.0032, elev: 0.465 };
  const OVERVIEW_FRAME = { dist: 0.9436, right: 0.02908, up: -0.02052, fwd: -0.02809 }; // × the fit distance
  function overviewPreset(): OrbitState {
    if (camera.aspect < 0.8) return overviewOrbit();
    const { theta, elev } = OVERVIEW_ANGLE, fit = overviewOrbit(theta, elev);
    const r = new Vector3(Math.cos(theta), 0, -Math.sin(theta)), u = new Vector3(-Math.sin(elev) * Math.sin(theta), Math.cos(elev), -Math.sin(elev) * Math.cos(theta)), f = new Vector3(-Math.cos(elev) * Math.sin(theta), -Math.sin(elev), -Math.cos(elev) * Math.cos(theta));
    const fits = (o: OrbitState) => {
      const d = o.dist * narrowK(), h = Math.cos(o.elev) * d, tg = new Vector3(...o.target);
      probe.fov = camera.fov; probe.aspect = camera.aspect; probe.updateProjectionMatrix();
      probe.position.set(tg.x + Math.sin(o.theta) * h, tg.y + Math.sin(o.elev) * d, tg.z + Math.cos(o.theta) * h); probe.lookAt(tg); probe.updateMatrixWorld();
      // the bounding box's top corners sit above the real skyline, so the approved framing itself reaches ~±1.1 here
      return corners.every((c) => { q.copy(c).project(probe); return Math.abs(q.x) <= 1.12 && Math.abs(q.y) <= 1.0; });
    };
    for (const k of [1, 0.75, 0.5, 0.25, 0]) { lastOverviewK = k; // full calibrated framing first; ease toward the plain fit only if it would clip
      const tg = new Vector3(...fit.target).addScaledVector(r, OVERVIEW_FRAME.right * fit.dist * k).addScaledVector(u, OVERVIEW_FRAME.up * fit.dist * k).addScaledVector(f, OVERVIEW_FRAME.fwd * fit.dist * k);
      const o: OrbitState = { target: [tg.x, tg.y, tg.z], theta, elev, dist: fit.dist * (1 + (OVERVIEW_FRAME.dist - 1) * k) };
      if (k === 0 || fits(o)) return o;
    }
    return fit;
  }
  let overview = overviewPreset();
  LIMITS.distMax = overview.dist * 1.35;
  const chunkOrbit = (id: string): OrbitState => {
    const l = live.find((x) => x.def.id === id); if (!l) return overview; const c = l.def.camera;
    return { target: [l.pos[0] + c.target[0], l.pos[1] + c.target[1], l.pos[2] + c.target[2]], theta: (c.azimuth * Math.PI) / 180, elev: (c.elevation * Math.PI) / 180, dist: c.distance };
  };
  /** Focus pose: on wide screens the explanation panel covers the right third, so aim a little to its left. */
  const focusOrbit = (id: string): OrbitState => {
    const o = chunkOrbit(id);
    if (width < 900) return o;
    const k = o.dist * Math.tan((camera.fov * Math.PI) / 360) * camera.aspect * 0.3; // shift the subject ~30% of the half-width to the left
    return { ...o, target: [o.target[0] + Math.cos(o.theta) * k, o.target[1], o.target[2] - Math.sin(o.theta) * k] };
  };
  const centroid = (ids: string[]): V3 => { const ps = ids.map((id) => live.find((l) => l.def.id === id)!.pos); return [ps.reduce((s, p) => s + p[0], 0) / ps.length, 0.8, ps.reduce((s, p) => s + p[2], 0) / ps.length]; };
  const districtIds = (d: string) => CHUNKS.filter((c) => c.district === d).map((c) => c.id);

  /* ── intro: generated from the districts (≈29 s), once per session ── */
  type Act = { name: string; dur: number; orbit: () => OrbitState; focus: string | null; labels: string[] };
  const ACTS: Act[] = [
    { name: 'The CyfroSec city', dur: 3, orbit: () => overview, focus: null, labels: [] },
    { name: 'Your environment', dur: 4, orbit: () => ({ target: centroid(districtIds('customer')), theta: 0.55, elev: 0.62, dist: 17 }), focus: 'cyfro-agent', labels: districtIds('customer') },
    { name: 'One outbound gate', dur: 3.5, orbit: () => { const a = live.find((l) => l.def.id === 'cyfro-agent')!.pos; return { target: [a[0] + 3, 0.6, a[2] - 1.2], theta: 0.95, elev: 0.55, dist: 11 }; }, focus: 'cyfro-agent', labels: ['cyfro-agent', 'scan-control', 'data-ingestion'] },
    { name: 'Scan control & data processing', dur: 3.5, orbit: () => ({ target: centroid(['scan-control', 'data-ingestion']), theta: 0.45, elev: 0.6, dist: 14 }), focus: 'data-ingestion', labels: ['scan-control', 'data-ingestion'] },
    { name: 'CyfroAI Engine', dur: 4.5, orbit: () => { const o = chunkOrbit('cyfro-ai-engine'); return { ...o, dist: 9.5 }; }, focus: 'cyfro-ai-engine', labels: ['cyfro-ai-engine', 'cyfro-ai-insights', 'ai-providers'] },
    { name: 'Security operations', dur: 4, orbit: () => ({ target: centroid(districtIds('operations')), theta: 0.4, elev: 0.66, dist: 16 }), focus: 'cyfro-assistant', labels: districtIds('operations') },
    { name: 'Code security', dur: 3.5, orbit: () => ({ target: centroid(['cyfro-code', 'git-hosting']), theta: 0.75, elev: 0.6, dist: 13 }), focus: 'cyfro-code', labels: ['cyfro-code', 'git-hosting'] },
    { name: 'One platform, every layer', dur: 3, orbit: () => overview, focus: null, labels: [] },
  ];
  const INTRO = A ? A.total : ACTS.reduce((s, a) => s + a.dur, 0);

  /* ── assembly cinematic (platform-city): presentation state derived from the assembly clock only ── */
  /*
   * Leaving for the homepage (/platform-city "Back to home"): the city contracts back into the CyfroAI Engine.
   * Platforms sink into their foundations in coordinated groups (presentation order, not software order), their
   * connections and labels go with them, the Engine's support details withdraw in reverse, and the camera settles
   * toward the overview and then into the Engine shot both pages share (sections/cityHandoff.ts).
   */
  const LEAVE_GROUPS: string[][] = [
    ['reporting', 'cyfro-assistant', 'cyfro-topology', 'cyfro-compliance', 'access-plaza'], // outputs and the people who use them
    ['cyfro-code', 'git-hosting'],                                                             // code security and its external host
    ['asset-discovery', 'network-discovery', 'service-fingerprinting', 'customer-infra', 'cyfro-agent'], // your environment
    ['scan-control', 'data-ingestion', 'cyfro-ai-insights'],                                  // control and processing
    ['ai-providers'],                                                                          // the external AI provider
  ];
  const LEAVE_START = [0.5, 1.1, 1.7, 2.3, 2.9], LEAVE_RETRACT = 0.9, LEAVE_STAGGER = 0.12;
  const LEAVE_DETAILS: [number, number] = [3.2, 4.5]; // the Engine's support details withdraw (reverse of their reveal)
  const LEAVE_CAM_MID = 1.2, LEAVE_CAM_END = 4.6, LEAVE_END = 4.8;
  type Leave = { t: number; from: OrbitState; done: boolean; onDone: (frame: string | null) => void };
  let leave: Leave | null = null;
  const leaveStart = new Map<string, number>();
  LEAVE_GROUPS.forEach((g, gi) => g.forEach((id, i) => leaveStart.set(id, LEAVE_START[gi] + i * LEAVE_STAGGER)));
  const leavePresence = (id: string, t: number) => {
    if (id === ENGINE_ID) return 1;
    const a = leaveStart.get(id) ?? LEAVE_START[0]; // anything else (an approved teaser) leaves with the first group
    return 1 - Math.min(1, Math.max(0, (t - a) / LEAVE_RETRACT));
  };
  const presentAt = (id: string, T: number | null) => (leave ? leavePresence(id, leave.t) : !A || T === null ? 1 : A.presence(id, T));
  const isPresentNow = (id: string) => presentAt(id, A && !introDone ? introClock : null) >= 1;
  const DROP = 2.4;
  let presenting = false;
  /** T = assembly clock, or null = the finished city */
  function applyPresentation(T: number | null) {
    presenting = T !== null;
    for (const l of live) l.inst.intro?.(T); // e.g. the Engine's support details reveal during its opening
    for (const l of live) {
      if (l.inst.engine) continue; // the Engine is there from the start, untouched
      const p = presentAt(l.def.id, T), e = smooth(p);
      l.inst.group.visible = p > 0;
      l.inst.group.position.y = l.pos[1] - (1 - e) * DROP; // rises up through its foundation
      const r = rims.get(l.def.id)!;
      if (leave) r.visible = false;
      else if (T !== null) { const glow = p > 0 && T < A!.arrivedAt(l.def.id) + 0.8; r.visible = glow; r.material = m.selectLine; }
    }
    // foundations: during the assembly each platform brings its own tile; the district plates and the wall only
    // appear as a whole once the city is complete
    saasPlateG.visible = T === null; custG.visible = T === null;
    for (const [id, tg] of tileG) { const pt = presentAt(id, T); tg.visible = T !== null && pt > 0; tg.position.y = -(1 - smooth(pt)) * DROP; }
    for (const [id, pg] of padG) { const pp = presentAt(id, T); pg.visible = pp > 0; pg.position.y = -(1 - smooth(pp)) * DROP; }
    transport.setPresent(T === null ? null : (id) => presentAt(id, T) >= 1);
  }
  /** a connection exists once both of its platforms are in place; it glows briefly when it is established */
  const cableState = (f: FlowDefinition): 'hidden' | 'glow' | 'normal' => {
    if (leave) return leavePresence(f.from.chunk, leave.t) < 1 || leavePresence(f.to.chunk, leave.t) < 1 ? 'hidden' : 'normal';
    if (!A || introDone) return 'normal';
    const at = Math.max(A.arrivedAt(f.from.chunk), A.arrivedAt(f.to.chunk));
    return introClock < at ? 'hidden' : introClock < at + REVEAL_GLOW ? 'glow' : 'normal';
  };
  /** one continuous camera path: Engine close-up → pulls back and drifts with the growing city → the overview */
  type Key = { t: number; o: OrbitState };
  let path: Key[] = [];
  function buildPath() {
    if (!A) return;
    const eng = byId.get(ENGINE_ID)!, ep = worldOf(eng), ec = eng.camera, ov = overview;
    const e0: OrbitState = { target: [ep[0] + ec.target[0], ep[1] + ec.target[1], ep[2] + ec.target[2]], theta: (ec.azimuth * Math.PI) / 180, elev: (ec.elevation * Math.PI) / 180, dist: ec.distance };
    const keys: Key[] = [{ t: 0, o: e0 }, { t: OPENING * 0.85, o: { ...e0, dist: e0.dist * 1.15, elev: e0.elev + 0.03 } }];
    const ids = [ENGINE_ID]; let dist = e0.dist * 1.15;
    A.slots.forEach((sl, i) => {
      ids.push(sl.id);
      let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
      for (const id of ids) { const [x, , z] = worldOf(byId.get(id)!); x0 = Math.min(x0, x - FOOT / 2); x1 = Math.max(x1, x + FOOT / 2); z0 = Math.min(z0, z - FOOT / 2); z1 = Math.max(z1, z + FOOT / 2); }
      dist = Math.max(dist, Math.min(ov.dist, 1.45 * Math.hypot(x1 - x0, z1 - z0) / 2 + 5)); // only ever pulls back
      const np = worldOf(byId.get(sl.id)!), f = (i + 1) / A.slots.length;
      keys.push({ t: A.start[i] + sl.dur * 0.6, o: {
        target: [((x0 + x1) / 2) * 0.62 + np[0] * 0.38, 0.6, ((z0 + z1) / 2) * 0.62 + np[2] * 0.38],
        theta: e0.theta + (ov.theta - e0.theta) * smooth(f), elev: e0.elev + 0.03 + (ov.elev - e0.elev - 0.03) * f, dist,
      } });
    });
    keys.push({ t: A.total - 0.4, o: ov });
    path = keys;
  }
  const keyVals = (o: OrbitState) => [o.target[0], o.target[1], o.target[2], o.theta, o.elev, o.dist];
  function samplePath(T: number): OrbitState {
    if (!path.length) return overview;
    if (T <= path[0].t) return path[0].o;
    if (T >= path[path.length - 1].t) return path[path.length - 1].o;
    let i = 0; while (i < path.length - 2 && T >= path[i + 1].t) i++;
    const P = path, h = P[i + 1].t - P[i].t, u = (T - P[i].t) / h;
    const tan = (j: number, c: number) => { // monotone (Fritsch–Carlson style) tangents: no overshoot, no back-and-forth
      if (j <= 0 || j >= P.length - 1) return 0;
      const a = keyVals(P[j - 1].o)[c], b = keyVals(P[j].o)[c], d = keyVals(P[j + 1].o)[c];
      const dl = (b - a) / (P[j].t - P[j - 1].t), dr = (d - b) / (P[j + 1].t - P[j].t);
      if (dl * dr <= 0) return 0;
      const m0 = (d - a) / (P[j + 1].t - P[j - 1].t);
      return Math.sign(m0) * Math.min(Math.abs(m0), 3 * Math.abs(dl), 3 * Math.abs(dr));
    };
    const h00 = 2 * u ** 3 - 3 * u ** 2 + 1, h10 = u ** 3 - 2 * u ** 2 + u, h01 = -2 * u ** 3 + 3 * u ** 2, h11 = u ** 3 - u ** 2;
    const a = keyVals(P[i].o), b = keyVals(P[i + 1].o);
    const v = a.map((av, c) => h00 * av + h10 * h * tan(i, c) + h01 * b[c] + h11 * h * tan(i + 1, c));
    return { target: [v[0], v[1], v[2]], theta: v[3], elev: v[4], dist: v[5] };
  }
  const nameOf = (id: string) => byId.get(id)?.copy?.name ?? MYSTERY_COPY.label;
  const reveal = (): OrbitState => ({ ...overview, elev: Math.min(LIMITS.elevMax, overview.elev + 0.18), dist: overview.dist * 1.12 });
  function sampleIntro(T: number): { o: OrbitState; act: Act; index: number } {
    let c = Math.min(T, INTRO - 1e-6), i = 0;
    while (i < ACTS.length - 1 && c >= ACTS[i].dur) { c -= ACTS[i].dur; i++; }
    const act = ACTS[i], prev = i === 0 ? reveal() : ACTS[i - 1].orbit(), cur = act.orbit();
    const k = smooth(c / (act.dur * 0.65));
    return { o: { target: [0, 1, 2].map((j) => prev.target[j] + (cur.target[j] - prev.target[j]) * k) as V3, theta: lerpAngle(prev.theta, cur.theta, k), elev: prev.elev + (cur.elev - prev.elev) * k, dist: prev.dist + (cur.dist - prev.dist) * k }, act, index: i };
  }

  /* ── state ── */
  const state = {
    dark: opts.dark, reduced: opts.reduced, frozen: false,
    hovered: null as string | null, labelHover: null as string | null, selected: null as string | null, highlight: null as string | null,
    labels: true,
    /** low-power: lead carriers only, no trails, slower overview repaints. Forced with ?cityLowPower, chosen on
     *  small/low-core devices, or switched on when frames stay slow at the lowest pixel ratio. */
    lowPower: typeof window !== 'undefined' && (new URLSearchParams(window.location.search).has('cityLowPower') || ((navigator.hardwareConcurrency ?? 8) <= 4 && el.clientWidth < 700)),
  };
  let frameNo = 0;
  let opClock = 0, introClock = 0, introDone = opts.reduced || opts.skipIntro, last: number | null = null, frame = 0, visible = false;
  let width = 1, height = 1;
  const orbit = createOrbit(introDone || A ? overview : reveal());
  let lift = 0; // smoothed camera clearance over machinery (assembly)
  let lastIntro = '', lastCaption = '', debugClock: number | null = null;
  const raycaster = new Raycaster(), ndc = new Vector2(), frustum = new Frustum(), projView = new Matrix4(), v = new Vector3(), faceAt = new Vector3();
  let pointer: { x: number; y: number } | null = null, hoverDirty = false;

  function finishIntro(settle = false) {
    if (introDone) return;
    introDone = true;
    if (A) { applyPresentation(null); setCityMerged(true); refreshRims(); for (const r of routes.values()) r.lit = undefined; renderer.shadowMap.needsUpdate = true; }
    emitIntro(); if (settle && !state.selected) orbit.aim(overview);
  }
  function leaveCity(onDone: (frame: string | null) => void) {
    if (leave || !A) return false;
    finishIntro(); state.selected = null; state.highlight = null; state.hovered = null; refreshRims();
    setCityMerged(false); // per-platform foundations, so each can sink with its platform
    const c = orbit.cur;
    leave = { t: 0, from: { target: [...c.target], theta: c.theta, elev: c.elev, dist: c.dist }, done: false, onDone };
    el.dataset.leave = 'running'; wake(); return true;
  }
  function cancelLeave() {
    if (!leave) return;
    leave = null; delete el.dataset.leave;
    applyPresentation(null); setCityMerged(true); refreshRims(); for (const r of routes.values()) r.lit = undefined;
    renderer.shadowMap.needsUpdate = true; orbit.aim(overview); wake();
  }
  const lerpOrbit = (a: OrbitState, b: OrbitState, k: number): OrbitState => {
    let dT = b.theta - a.theta; dT -= Math.round(dT / (Math.PI * 2)) * Math.PI * 2;
    return { target: [0, 1, 2].map((i) => a.target[i] + (b.target[i] - a.target[i]) * k) as V3, theta: a.theta + dT * k, elev: a.elev + (b.elev - a.elev) * k, dist: a.dist + (b.dist - a.dist) * k };
  };
  /** the leave camera: from wherever the visitor was → toward the overview → the Engine shot the homepage starts from */
  function leaveOrbit(t: number): OrbitState {
    const engineShot = path.length ? path[0].o : chunkOrbit(ENGINE_ID);
    if (t <= LEAVE_CAM_MID) return lerpOrbit(leave!.from, overview, smooth(t / LEAVE_CAM_MID));
    return lerpOrbit(overview, engineShot, smooth((t - LEAVE_CAM_MID) / (LEAVE_CAM_END - LEAVE_CAM_MID)));
  }
  function emitIntro() {
    if (A) {
      const i = introDone ? A.slots.length : A.slotAt(introClock);
      const key = introDone ? 'done' : `${i}`;
      if (key !== lastIntro) {
        lastIntro = key;
        const act = introDone ? '' : i < 0 ? nameOf(ENGINE_ID) : i >= A.slots.length ? 'The complete city' : nameOf(A.slots[i].id);
        cb.onIntro({ running: !introDone, act, index: introDone ? A.slots.length + 1 : Math.min(A.slots.length + 1, i + 2), total: A.slots.length + 1 });
      }
      return;
    }
    const s = !introDone ? sampleIntro(introClock) : null;
    const key = s ? `${s.index}` : 'done';
    if (key !== lastIntro) { lastIntro = key; cb.onIntro({ running: !introDone, act: s ? s.act.name : '', index: s ? s.index : ACTS.length, total: ACTS.length }); }
  }
  function takeControl() { finishIntro(); }

  /* ── input ── */
  const canvas = renderer.domElement;
  const local = (e: PointerEvent | MouseEvent) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const pick = (x: number, y: number) => { ndc.set((x / width) * 2 - 1, -(y / height) * 2 + 1); raycaster.setFromCamera(ndc, camera); const hit = raycaster.intersectObjects(hits, false).find((x) => isPresentNow(x.object.userData.chunk as string)); return hit ? (hit.object.userData.chunk as string) : null; };
  function setHover(id: string | null) {
    if (state.hovered === id) return;
    state.hovered = id; refreshRims(); cb.onHover(id); setCursor(); wake();
  }
  function refreshRims() {
    for (const [id, r] of rims) { const sel = id === state.selected, hov = id === state.hovered || id === state.labelHover; r.visible = sel || hov; r.material = sel ? m.selectLine : m.rimLine; }
  }
  const touches = new Map<number, { x: number; y: number }>();
  let drag: { id: number; x: number; y: number; sx: number; sy: number; moved: boolean; t: number; vt: number; ve: number; touch: boolean } | null = null;
  let pinch: number | null = null;
  const setCursor = () => { canvas.style.cursor = drag?.moved ? 'grabbing' : state.hovered ? 'pointer' : 'grab'; };
  const onDown = (e: PointerEvent) => {
    if (leave) return; // the leave cinematic owns the camera
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const p = local(e);
    if (e.pointerType !== 'mouse') { touches.set(e.pointerId, p); if (touches.size === 2) { const [a, b] = [...touches.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); drag = null; return; } }
    if (e.pointerType === 'mouse') e.preventDefault();
    drag = { id: e.pointerId, x: p.x, y: p.y, sx: p.x, sy: p.y, moved: false, t: performance.now(), vt: 0, ve: 0, touch: e.pointerType !== 'mouse' };
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
      if (drag.moved) { const dT = -dx * 0.0062, dE = (drag.touch ? 0 : dy) * 0.0045; orbit.rotate(dT, dE); drag.vt = (dT / dtm) * 1000; drag.ve = (dE / dtm) * 1000; setCursor(); wake(); }
      drag.x = p.x; drag.y = p.y; drag.t = now; return;
    }
    if (e.pointerType === 'mouse') { pointer = p; hoverDirty = true; wake(); }
  };
  const onUp = (e: PointerEvent) => {
    const p = local(e);
    touches.delete(e.pointerId); if (touches.size < 2) pinch = null;
    if (!drag || drag.id !== e.pointerId) return;
    const was = drag; drag = null; canvas.releasePointerCapture?.(e.pointerId);
    if (was.moved) { if (performance.now() - was.t < 80) orbit.fling(was.vt * 0.9, was.ve * 0.9); setCursor(); wake(); return; }
    const id = pick(p.x, p.y);
    cb.onSelect(id); // a click on empty ground returns to the overview
    setCursor();
  };
  const onCancel = (e: PointerEvent) => { touches.delete(e.pointerId); pinch = null; if (drag?.id === e.pointerId) drag = null; };
  const onLeave = () => { pointer = null; if (!drag) setHover(null); };
  const onWheel = (e: WheelEvent) => { if (!e.ctrlKey && !e.metaKey) return; e.preventDefault(); orbit.zoom(Math.exp(e.deltaY * 0.01)); takeControl(); wake(); };
  const onKey = (e: KeyboardEvent) => {
    if (leave) return;
    if (e.target !== el) return; // only when the 3D stage itself has focus
    const k = e.key; let used = true;
    if (k === 'ArrowLeft') orbit.rotate(0.12, 0); else if (k === 'ArrowRight') orbit.rotate(-0.12, 0);
    else if (k === 'ArrowUp') orbit.rotate(0, 0.08); else if (k === 'ArrowDown') orbit.rotate(0, -0.08);
    else if (k === '+' || k === '=') orbit.zoom(0.85); else if (k === '-' || k === '_') orbit.zoom(1 / 0.85);
    else if (k === '0' || k === 'Escape') cb.onSelect(null);
    else used = false;
    if (used) { e.preventDefault(); takeControl(); wake(); }
  };
  canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointermove', onMove); canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onCancel); canvas.addEventListener('pointerleave', onLeave); canvas.addEventListener('wheel', onWheel, { passive: false });
  el.addEventListener('keydown', onKey);
  canvas.style.cursor = 'grab';

  /* ── per-frame helpers ── */
  const signal: ChunkSignal = { phase: 'idle', progress: 0, level: 2, still: false, dark: true, decision: 'pending', approvals: { assistant: { state: 'idle', progress: 0 }, code: { state: 'idle', progress: 0 } }, beats: [], arrive: 0, depart: 0, hold: 0, low: false, loop: null };
  const lane = (st: StoryState, id: string, out: ChunkSignal['approvals']['assistant']) => {
    const c = st.chunk[id];
    out.state = !c ? 'idle' : c.phase === 'waiting_approval' ? 'pending' : c.phase === 'approved' ? 'approved' : c.phase === 'rejected' ? 'rejected' : 'idle';
    out.progress = c?.progress ?? 0;
  };
  /* the activity director decides what is happening (selection > one background workflow > ambient) */
  const director = createDirector({ STORY, FLOWS, INFRA_CYCLE, CODE_CYCLE, evaluateStory, AMBIENT });
  const directNow = () => director.direct({ t: debugClock ?? opClock, selected: state.selected });
  let lastDirected: Directed | null = null;
  const NO_BEATS: string[] = [];
  const decisionOf = (id: string, st: StoryState) => {
    for (const cp in st.decisions) if (cp.length > id.length && cp.charCodeAt(id.length) === 58 /* ':' */ && cp.startsWith(id)) return st.decisions[cp]; // (no per-frame allocation)
    return 'pending' as const;
  };

  function tick(now: number) {
    frame = 0;
    if (!(visible && !document.hidden)) { last = null; return; }
    const dt = last === null ? 0 : Math.min(0.1, (now - last) / 1000); last = now;
    const still = state.reduced || state.frozen; frameNo++;
    if (!still && debugClock === null) opClock += dt;
    if (!introDone && !state.selected && !still) { introClock += dt; if (introClock >= INTRO) finishIntro(true); }

    // camera
    let introFocus: string | null = null, introLabels: string[] | null = null;
    let slot = -2;
    if (leave) {
      leave.t = Math.min(LEAVE_END, leave.t + dt);
      orbit.aim(leaveOrbit(leave.t), 1000);
      applyPresentation(0); // presence comes from the leave schedule (presentAt)
      const dk = Math.min(1, Math.max(0, (leave.t - LEAVE_DETAILS[0]) / (LEAVE_DETAILS[1] - LEAVE_DETAILS[0])));
      const detailsT = REVEAL.lights[1] * (1 - dk); // the reveal, played backwards: lights off first … floor last
      for (const l of live) if (l.inst.engine) l.inst.intro?.(detailsT);
      introLabels = live.filter((l) => !l.inst.engine && leavePresence(l.def.id, leave!.t) >= 1).map((l) => l.def.id); // a label leaves as its platform starts to sink
    } else if (!introDone && !state.selected && A) {
      slot = A.slotAt(introClock); orbit.aim(samplePath(introClock), 30);
      introFocus = slot < 0 ? ENGINE_ID : slot < A.slots.length ? A.slots[slot].id : null;
      introLabels = introFocus && presentAt(introFocus, introClock) > 0 ? [introFocus] : []; // a label only once its platform is rising
      applyPresentation(introClock); emitIntro();
    } else if (!introDone && !state.selected) { const s = sampleIntro(introClock); orbit.aim(s.o, 30); introFocus = s.act.focus; introLabels = s.act.labels; emitIntro(); }
    const camMoving = orbit.update(dt, state.reduced);
    orbit.apply(camera, narrowK());
    // never inside machinery: over a chunk the camera stays above its tallest parts
    if (presenting) { // assembly: only platforms that exist, and the clearance eases in (no snap)
      let need = 0;
      for (const l of live) {
        if (!isPresentNow(l.def.id)) continue;
        const [hx, hz] = chunkHalf(l.def);
        if (Math.abs(camera.position.x - l.pos[0]) < hx + 0.3 && Math.abs(camera.position.z - l.pos[2]) < hz + 0.3) need = Math.max(need, l.pos[1] + 4.3 - camera.position.y);
      }
      lift += (need - lift) * Math.min(1, dt * 4);
      if (lift > 0.001) { camera.position.y += lift; camera.lookAt(...orbit.cur.target); }
    } else for (const l of live) {
      const [hx, hz] = chunkHalf(l.def);
      if (Math.abs(camera.position.x - l.pos[0]) < hx + 0.3 && Math.abs(camera.position.z - l.pos[2]) < hz + 0.3 && camera.position.y < l.pos[1] + 4.3) {
        camera.position.y = l.pos[1] + 4.3; camera.lookAt(...orbit.cur.target); break;
      }
    }
    camera.updateMatrixWorld();
    projView.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); frustum.setFromProjectionMatrix(projView);

    // story → chunks
    let dir: Directed;
    if (presenting && A) {
      const present = (id: string) => presentAt(id, introClock) >= 1;
      const u = slot >= 0 && slot < A.slots.length ? A.demoAt(slot, introClock) : null;
      dir = u !== null ? director.assembly(A.slots[slot].id, A.slots[slot].demo, u, present)
        : director.assembly(slot < 0 ? ENGINE_ID : '', { kind: 'none' }, 0, present); // between demonstrations: calm
      renderer.shadowMap.needsUpdate = true; // platforms are moving: keep their shadows current
    } else dir = directNow();
    const st = dir.st; lastDirected = dir;
    const fid = state.selected;
    const caption = [...st.beats].sort((a, b) => Number(!!fid && b.chunks[fid] !== undefined) - Number(!!fid && a.chunks[fid] !== undefined) || Number(b.track === (byId.get(fid ?? '')?.district === 'code' ? 'code' : 'infra')) - Number(a.track === (byId.get(fid ?? '')?.district === 'code' ? 'code' : 'infra'))).map((b) => b.caption).filter(Boolean);
    if (presenting && A && !caption.length) {
      const cid = slot < 0 ? ENGINE_ID : slot < A.slots.length ? A.slots[slot].id : null;
      caption.push(cid ? byId.get(cid)?.copy?.summary ?? MYSTERY_COPY.body : 'One platform, every layer. Select any part to explore it.');
    }
    const capKey = caption.join('|');
    if (capKey !== lastCaption) { lastCaption = capKey; cb.onCaption(caption); }
    const focusId = state.selected ?? introFocus;
    const activate = introDone || introClock > 9;
    signal.dark = state.dark; signal.low = state.lowPower;
    lane(st, 'cyfro-assistant', signal.approvals.assistant); lane(st, 'cyfro-code', signal.approvals.code);
    const beatIds = st.beats.map((b) => b.id);
    // transport first: carriers that arrive or leave this frame drive the chunks' receiving / sending activity.
    // Paused (not reduced motion): carriers stay where they are, because the clock has stopped.
    transport.update(st, opClock, orbit.cur.dist, state.lowPower, state.reduced);
    for (const l of live) {
      const near = camera.position.distanceTo(l.sphere.center) < 10.5;
      const inView = frustum.intersectsSphere(l.sphere);
      l.level = !inView ? 3 : l.def.id === focusId || near ? 1 : 2;
      if (l.level === 3 && !still) continue;
      if (presenting && !l.inst.engine && presentAt(l.def.id, introClock) <= 0) continue; // not built yet
      if (state.lowPower && l.level === 2 && !still && !l.inst.engine && (frameNo + l.idx) % 2) continue; // low-power: overview chunks (never the Engine) animate at half rate
      // chunks outside the director's focus stay in their calm idle state
      const quiet = !!dir.active && !dir.active.has(l.def.id);
      const cs = quiet ? undefined : st.chunk[l.def.id];
      signal.phase = cs?.phase ?? 'idle'; signal.progress = cs?.progress ?? 0; signal.level = l.level === 1 ? 1 : 2;
      signal.beats = quiet ? NO_BEATS : beatIds;
      signal.loop = dir.loop && dir.loop.id === l.def.id ? dir.loop : null;
      // pause freezes the city in place (the clock stops); the Engine keeps its original paused/still frame
      signal.still = l.inst.engine ? still : state.reduced;
      signal.decision = decisionOf(l.def.id, st);
      const pu = transport.pulses[l.def.id]; signal.arrive = pu?.arrive ?? 0; signal.depart = pu?.depart ?? 0; signal.hold = pu?.hold ?? 0;
      l.inst.update(opClock, signal);
      if (l.inst.paint) {
        // screens: the selected chunk (and the Engine, as before) repaint live; others only occasionally
        const livePaint = l.inst.engine ? l.level === 1 : l.def.id === focusId;
        const every = l.level === 1 ? 0.5 : state.lowPower ? 2 : 1;
        const due = livePaint || opClock - l.lastPaint > every + (l.idx % 5) * 0.05 || opClock < l.lastPaint;
        if (due || still) { l.inst.paint(opClock, activate, state.reduced, state.dark, signal); l.lastPaint = opClock; }
      }
    }
    // the CyfroAI Engine's own per-frame hooks (exactly as the original scene calls them)
    if (engineChunk?.inst.engine) {
      const e = engineChunk.inst.engine;
      e.faceCamera(camera.position);
      e.setHover(state.hovered === 'cyfro-ai-engine');
      if (pointer && !drag && !still) {
        e.faceWorld(faceAt).project(camera);
        const fx = ((faceAt.x + 1) / 2) * width, fy = ((1 - faceAt.y) / 2) * height;
        const dx = pointer.x - fx, dy = pointer.y - fy, reach = Math.min(width, height) * 0.45;
        e.setFacePointer(Math.hypot(dx, dy) < reach ? { x: dx / (reach * 0.6), y: dy / (reach * 0.6) } : null, state.hovered === 'cyfro-ai-engine');
      } else e.setFacePointer(null, false);
    }

    const activeFlows = transport.active;
    // connections: always visible once both platforms exist; hover / selection / activity only change emphasis
    const emphasisOn = focusId ?? state.hovered;
    for (const r of routes.values()) {
      if (!r.cable) continue;
      const cs = cableState(r.flow);
      if (cs === 'hidden') { r.cable.visible = false; continue; }
      r.cable.visible = true;
      if (cs === 'glow') { styleCable(r, 'glow'); continue; }
      const touches = !!emphasisOn && (r.flow.from.chunk === focusId || r.flow.to.chunk === focusId || r.flow.from.chunk === state.hovered || r.flow.to.chunk === state.hovered);
      styleCable(r, state.highlight === r.flow.id ? 'hl' : activeFlows.has(r.flow.id) ? 'on' : touches ? 'rel' : emphasisOn ? 'dim' : 'base');
    }

    if (pointer && !drag && (hoverDirty || camMoving)) { hoverDirty = false; setHover(pick(pointer.x, pointer.y)); }
    renderer.render(scene, camera);
    if (leave && !leave.done && leave.t >= LEAVE_END) { // the Engine-only frame the homepage continues from
      leave.done = true; el.dataset.leave = 'done';
      let shot: string | null = null; try { shot = renderer.domElement.toDataURL('image/jpeg', 0.85); } catch { shot = null; }
      leave.onDone(shot);
    }
    placeOverlays(introLabels);
    adapt(dt);
    el.dataset.intro = introDone ? 'done' : introClock.toFixed(2); el.dataset.ops = opClock.toFixed(2);
    el.dataset.cam = `${((orbit.cur.theta * 180) / Math.PI).toFixed(1)},${((orbit.cur.elev * 180) / Math.PI).toFixed(1)},${orbit.cur.dist.toFixed(2)}`;
    el.dataset.levels = live.map((l) => l.level).join(''); el.dataset.power = state.lowPower ? 'low' : 'full';
    if (!still || camMoving || drag || (leave && !leave.done)) frame = requestAnimationFrame(tick);
  }

  /* overlays: chunk labels (overview) or the focused chunk's hotspot labels; one tooltip */
  function placeOverlays(introLabels: string[] | null) {
    const L = labels();
    const placed: { l: number; r: number; t: number; b: number }[] = [];
    const compact = width < 700;
    const place = (b: HTMLElement | null, at: V3, show: boolean) => {
      if (!b) return;
      v.set(...at).project(camera);
      let x = ((v.x + 1) / 2) * width; const y = ((1 - v.y) / 2) * height;
      const inside = v.z < 1 && x > 10 && x < width - 10 && y > 24 && y < height - 24;
      let ly = y, ok = show && inside;
      if (ok) { const hw = b.offsetWidth / 2 + 6; x = Math.min(Math.max(x, hw), width - hw); }
      if (ok) { // try the anchor, then one nudge below; otherwise this label waits (no cascades)
        const w = b.offsetWidth, ht = b.offsetHeight;
        ok = false;
        for (const dy of [0, ht + 3, -(ht + 3)]) {
          const c = b.dataset.anchor === 'center' ? ht / 2 : 0;
          const box = { l: x - w / 2 - 2, r: x + w / 2 + 2, t: y + dy - ht + c, b: y + dy + c };
          if (!placed.some((qq) => box.l < qq.r && box.r > qq.l && box.t < qq.b && box.b > qq.t)) { placed.push(box); ly = y + dy; ok = true; break; }
        }
      }
      b.style.transform = `translate(${x.toFixed(1)}px, ${ly.toFixed(1)}px) translate(-50%, ${b.dataset.anchor === 'center' ? '-50%' : '-100%'})`;
      b.style.opacity = ok ? '1' : '0';
      b.style.pointerEvents = ok ? 'auto' : 'none';
    };
    const focused = state.selected ? live.find((l) => l.def.id === state.selected) : null;
    // hotspot labels of the focused chunk claim space first
    for (const l of live) for (const h of l.def.hotspots) {
      const key = `${l.def.id}:${h.id}`;
      place(L.hotspots[key], [l.pos[0] + h.at[0], l.pos[1] + h.at[1], l.pos[2] + h.at[2]], !!focused && focused.def.id === l.def.id);
    }
    // chunk labels by priority: hovered, features, reserved, environment. Anchored on the deck edge that
    // faces the camera (camera-aware), so a label sits in front of its platform instead of over machinery.
    // While a platform is focused, the others stay visible but secondary (dimmed); on phones they hide.
    const rank = (l: Live) => (l.def.id === state.hovered || l.def.id === state.labelHover ? 0 : l.def.class === 'feature' ? 1 : l.def.class === 'reserved' ? 2 : 3);
    for (const l of [...live].sort((a, b) => rank(a) - rank(b))) {
      const id = l.def.id, b = L.chunks[id];
      const secondary = !!state.selected && id !== state.selected;
      const show = id === state.hovered || id === state.labelHover ? !state.selected
        : !state.labels ? false
        : introLabels ? introLabels.includes(id)
        : state.selected ? secondary && !compact
        : !compact || l.def.class !== 'environment';
      const [hx, hz] = chunkHalf(l.def), dx = camera.position.x - l.pos[0], dz = camera.position.z - l.pos[2];
      // environment pads sit at the city's edges and behind other platforms: label them above their own
      // centre so the label never lands on a neighbour (e.g. the AI provider pad behind the CyfroAI Engine)
      const at: V3 = l.def.class === 'environment' ? [l.pos[0], l.pos[1] + 2.9, l.pos[2]]
        : l.def.class === 'reserved' ? [l.pos[0], l.pos[1] + 2.75, l.pos[2]] // beside its own "?", never on a neighbour
        : Math.abs(dx) > Math.abs(dz) ? [l.pos[0] + Math.sign(dx) * hx * 0.9, l.pos[1] + 0.6, l.pos[2]] : [l.pos[0], l.pos[1] + 0.6, l.pos[2] + Math.sign(dz) * hz * 0.9];
      if (b) b.dataset.secondary = secondary ? '1' : '';
      place(b, at, show);
      if (b && secondary && b.style.opacity === '1') b.style.opacity = '0.5';
    }
    // tooltip anchored above the hovered chunk (or the hovered hotspot label)
    const t = L.tip; const id = state.labelHover ?? state.hovered;
    if (t && id) {
      const [cid, hid] = id.split(':'); const l = live.find((x) => x.def.id === cid);
      if (l) {
        const h = hid ? l.def.hotspots.find((x) => x.id === hid) : null;
        const at: V3 = h ? [l.pos[0] + h.at[0], l.pos[1] + h.at[1], l.pos[2] + h.at[2]] : [l.pos[0], l.pos[1] + 3.4, l.pos[2]];
        v.set(...at).project(camera);
        let x = ((v.x + 1) / 2) * width, y = ((1 - v.y) / 2) * height - (h ? 30 : 10);
        const tw = t.offsetWidth, th = t.offsetHeight;
        if (y - th < 8) y = y + th + 40;
        x = Math.min(Math.max(x, tw / 2 + 12), width - tw / 2 - 12); y = Math.min(Math.max(y, th + 8), height - 8);
        t.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
      }
    }
  }

  /* adaptive pixel ratio: step down when frames are slow, back up when there is headroom */
  let slowFor = 0, fastFor = 0;
  function adapt(dt: number) {
    if (dt <= 0 || state.reduced || state.frozen) return;
    if (dt > 1 / 42) { slowFor += dt; fastFor = 0; } else if (dt < 1 / 56) { fastFor += dt; slowFor = 0; }
    if (slowFor > 1.5 && dpr > 1) { dpr = Math.max(1, +(dpr - 0.25).toFixed(2)); renderer.setPixelRatio(dpr); resize(); slowFor = 0; }
    else if (slowFor > 3 && dpr <= 1 && !state.lowPower) { state.lowPower = true; slowFor = 0; }
    if (fastFor > 6 && dpr < maxDpr) { dpr = Math.min(maxDpr, +(dpr + 0.25).toFixed(2)); renderer.setPixelRatio(dpr); resize(); fastFor = 0; }
  }

  function wake() { if (!frame && visible && !document.hidden) frame = requestAnimationFrame(tick); }
  function resize() {
    width = el.clientWidth; height = el.clientHeight; camera.aspect = width / Math.max(1, height); camera.fov = width < 600 ? 50 : 34; camera.updateProjectionMatrix();
    renderer.setSize(width, height, false); engineChunk?.inst.engine?.resize(width, height);
    overview = overviewPreset(); LIMITS.distMax = overview.dist * 1.35; buildPath();
    if (introDone && !state.selected) orbit.aim(overview); // keep the overview framed after a resize / rotation
    wake();
  }
  function applyTheme(d: boolean) {
    state.dark = d; themeCity(d, scene, m, sun, fill); transport.setTheme(d);
    for (const l of live) { l.inst.theme?.(d); l.inst.engine?.setTheme(d); l.lastPaint = -1; }
    groundMat.opacity = d ? 0.2 : 0.3; renderer.shadowMap.needsUpdate = true; wake();
  }
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) wake(); else { cancelAnimationFrame(frame); frame = 0; last = null; } }, { threshold: 0.02 });
  const ro = new ResizeObserver(() => { if (ready) resize(); });
  const onVis = () => { if (document.hidden) { cancelAnimationFrame(frame); frame = 0; last = null; } else wake(); };
  document.addEventListener('visibilitychange', onVis);
  const lost = (e: Event) => { e.preventDefault(); cb.onError(); };
  canvas.addEventListener('webglcontextlost', lost);

  /* test/debug hook (opt-in with ?cityDebug=1): read state, pin the clock, place the camera. Compiled out of production
     builds, so no query parameter can enable it on the public site. */
  // (both values are inlined at build time — next.config.ts defines NEXT_PUBLIC_CITY_DEBUG — so a production build folds
  //  this to `false` and drops the hook: development builds, or a local validation build with NEXT_PUBLIC_CITY_DEBUG=1)
  if ((process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_CITY_DEBUG === '1') && typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('cityDebug')) {
    (window as unknown as Record<string, unknown>).__cyfroCity = {
      info: () => ({ calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures, dpr, levels: el.dataset.levels }),
      setClock: (t: number | null) => { debugClock = t; if (t !== null) opClock = t; wake(); },
      setOrbit: (o: OrbitState) => { finishIntro(); orbit.aim(o, 1000); orbit.update(1, true); wake(); },
      chunkOrbit, overview: () => overview, overviewFitK: () => lastOverviewK, overviewFor: (theta: number, elev: number) => overviewOrbit(theta, elev), chunks: () => live.map((l) => ({ id: l.def.id, pos: l.pos, level: l.level })),
      /** what the activity director is doing this frame (for validation) */
      activity: () => { const d = lastDirected; return d && { mode: d.mode, carriers: d.st.packets.length, routes: [...new Set(d.st.packets.map((p) => p.flow))], working: Object.entries(d.st.chunk).filter(([id, c]) => c.phase !== 'idle' && (!d.active || d.active.has(id))).map(([id]) => id), tracks: [...new Set(d.st.beats.map((b) => b.track))], loop: d.loop }; },
      select: (id: string | null) => { state.selected = id; refreshRims(); wake(); },
      /** assembly: jump the build clock (deterministic captures); the camera follows its path at once */
      setIntroClock: (t: number) => { if (!A) return; if (introDone) { introDone = false; setCityMerged(false); } introClock = t; applyPresentation(t); orbit.aim(samplePath(t), 1000); orbit.update(1, true); emitIntro(); wake(); },
      introInfo: () => ({ T: introClock, total: INTRO, done: introDone }),
      assemblySlots: () => (A ? A.slots.map((sl, i) => ({ id: sl.id, start: A.start[i], arrived: A.start[i] + 1 })) : []),
      /**
       * Assembly visibility audit at build time T: walks the scene and reports anything rendered that belongs to
       * (or covers the cell of) a platform that has not started arriving, plus connections, docks and labels
       * shown too early. Ownership: chunk group, pad, foundation tile, rim, cable; anything else is "shared"
       * and must not cover an absent platform's cell. Leaves the clock at T.
       */
      auditAssembly: (T: number) => {
        if (!A) return ['no assembly'];
        if (introDone) { introDone = false; setCityMerged(false); }
        introClock = T; applyPresentation(T); world.updateMatrixWorld(true);
        const out: string[] = [], box = new Box3(), c = new Vector3();
        const absent = (id: string) => presentAt(id, T) <= 0;
        const owners = new Map<Object3D, string>();
        for (const l of live) owners.set(l.inst.group, `chunk:${l.def.id}`);
        for (const [id, g] of padG) owners.set(g, `chunk:${id}`);
        for (const [id, g] of tileG) owners.set(g, `chunk:${id}`);
        for (const [id, r] of rims) owners.set(r, `chunk:${id}`);
        const ownerOf = (o: Object3D) => { for (let p: Object3D | null = o; p; p = p.parent) { const k = owners.get(p); if (k) return k; if (p.name.startsWith('flow:')) return p.name; } return null; };
        const shown = (o: Object3D) => { for (let p: Object3D | null = o; p; p = p.parent) if (!p.visible) return false; return true; };
        const skip = new Set<Object3D>([...hits, transport.group, ...(engineChunk ? [engineChunk.inst.group] : [])]);
        const under = (o: Object3D) => { for (let p: Object3D | null = o; p; p = p.parent) if (skip.has(p)) return true; return false; };
        world.traverse((o) => {
          const mesh = o as Mesh;
          if (!(mesh.isMesh || (o as LineSegments).isLineSegments) || !shown(o) || under(o)) return;
          const own = ownerOf(o);
          if (own?.startsWith('chunk:')) { const id = own.slice(6); if (absent(id)) out.push(`${id}: ${o.name || o.type} visible before arrival`); return; }
          if (own?.startsWith('flow:')) { const f = FLOWS.find((x) => x.id === own.slice(5))!; if (T < Math.max(A.arrivedAt(f.from.chunk), A.arrivedAt(f.to.chunk))) out.push(`${f.id}: connection visible before both platforms`); return; }
          box.setFromObject(o); if (box.isEmpty()) return;
          for (const l of live) { // shared geometry may not cover the cell of a platform that is not there yet
            if (!absent(l.def.id)) continue;
            const [x, , z] = l.pos;
            if (x > box.min.x + 0.5 && x < box.max.x - 0.5 && z > box.min.z + 0.5 && z < box.max.z - 0.5) { box.getCenter(c); out.push(`shared ${o.parent?.name || ''}/${o.name || o.type} covers absent ${l.def.id}`); }
          }
        });
        const L = labels();
        for (const l of live) { const b = L.chunks[l.def.id]; if (absent(l.def.id) && b && b.style.opacity === '1') out.push(`${l.def.id}: label shown before arrival`); }
        for (const pairs of transport.shownDocks()) if (!pairs.some(([a, b]) => presentAt(a, T) >= 1 && presentAt(b, T) >= 1)) out.push(`dock ${pairs.map((p) => p.join('→')).join(', ')} shown early`);
        return [...new Set(out)];
      },
      /**
       * Connection-line audit from the current camera: for every cable, whether it is visible, and for sample points
       * along it (screen px) whether another opaque object hides it (raycast) — plus a floor point beside each sample
       * so a screenshot can measure contrast. Debug only.
       */
      cableProbe: () => {
        camera.updateMatrixWorld(); const rc = new Raycaster(); const pv = new Vector3(), dir = new Vector3(), q = new Vector3();
        const shown = (o: Object3D) => { for (let x: Object3D | null = o; x; x = x.parent) if (!x.visible) return false; return true; };
        const opaque = (o: Object3D) => { const mt = (o as Mesh).material as Material | undefined; return !!mt && !Array.isArray(mt) && !(mt.transparent && (mt as MeshBasicMaterial).opacity < 0.5); };
        const toPx = (w: Vector3) => { q.copy(w).project(camera); return [Math.round(((q.x + 1) / 2) * width), Math.round(((1 - q.y) / 2) * height), q.z] as const; };
        return [...routes.values()].filter((r) => r.cable).map((r) => {
          const cab = r.cable!; const samples: number[][] = []; let occ = 0;
          for (let k = 1; k < r.pts.length; k++) {
            const [ax, az] = r.pts[k - 1], [bx, bz] = r.pts[k], len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.floor(len / 0.5));
            const nx = -(bz - az) / (len || 1), nz = (bx - ax) / (len || 1);
            for (let d = 0; d < n; d++) {
              const u = (d + 0.5) / n, x = ax + (bx - ax) * u, z = az + (bz - az) * u, y = plateTop(x, z) + 0.05;
              const [sx, sy, sz] = toPx(pv.set(x, y, z)); if (sz > 1 || sx < 0 || sy < 0 || sx > width || sy > height) continue;
              const [ox, oy] = toPx(pv.set(x + nx * 0.32, plateTop(x + nx * 0.32, z + nz * 0.32) + 0.01, z + nz * 0.32));
              dir.set(x, y, z).sub(camera.position); const dist = dir.length(); rc.set(camera.position, dir.normalize()); rc.far = dist - 0.03;
              const hit = rc.intersectObject(world, true).find((h) => (h.object as Mesh).isMesh && shown(h.object) && opaque(h.object) && !hits.includes(h.object as Mesh) && !isAncestor(cab, h.object));
              if (hit) occ++;
              samples.push([sx, sy, ox, oy, hit ? 1 : 0, hit ? (() => { let o: Object3D | null = hit.object; while (o && !o.name) o = o.parent; return o?.name ?? '?'; })() as unknown as number : 0]);
            }
          }
          return { id: r.flow.id, kind: r.flow.kind, visible: cab.visible && shown(cab), n: samples.length, occluded: occ, samples };
        });
      },
      cablesLit: () => [...routes.values()].filter((r) => r.cable && r.lit && !r.lit.startsWith('base')).map((r) => `${r.flow.id}:${r.lit}:${r.cable!.visible ? 'v' : 'h'}`),
      /** draw-relevant objects per chunk: meshes (incl. merged), unique materials, dynamic meshes */
      meshCounts: () => live.map((l) => { let meshes = 0, dyn = 0; const mats = new Set<string>(); l.inst.group.traverse((o) => { const mm = o as Mesh; if (mm.isMesh || (o as LineSegments).isLineSegments) { meshes++; if (isDynamic(o)) dyn++; const mt = mm.material as Material; if (mt && !Array.isArray(mt)) mats.add(mt.uuid); } }); return { id: l.def.id, meshes, dyn, mats: mats.size }; }),
    };
  }
  let ready = false, disposed = false;
  const runSteps = (i: number) => {
    if (disposed) return;
    const t0 = performance.now();
    while (i < steps.length && performance.now() - t0 < 12) steps[i++]();
    if (i < steps.length) { setTimeout(() => runSteps(i), 0); return; }
    applyTheme(state.dark);
    width = el.clientWidth; height = el.clientHeight; camera.aspect = width / Math.max(1, height); camera.updateProjectionMatrix();
    const start = () => {
      if (disposed) return;
      ready = true; resize();
      if (A && !introDone) { setCityMerged(false); applyPresentation(0); orbit.aim(samplePath(0), 1000); orbit.update(1, true); }
      else if (introDone) orbit.aim(overview);
      emitIntro();
      io.observe(el); ro.observe(el); cb.onReady(); wake();
    };
    // compile shaders off the critical path where the driver supports it (KHR_parallel_shader_compile)
    renderer.compileAsync(scene, camera).then(start, start);
  };
  setTimeout(() => runSteps(0), 0);

  return {
    setTheme: applyTheme,
    setReduced(r: boolean) { state.reduced = r; if (r) finishIntro(); for (const l of live) l.lastPaint = -1; wake(); },
    setLowPower(on: boolean) { state.lowPower = on; wake(); },
    setFrozen(f: boolean) { state.frozen = f; for (const l of live) l.lastPaint = -1; wake(); },
    focus(id: string | null) {
      state.selected = id; refreshRims();
      if (id) { finishIntro(); orbit.aim(focusOrbit(id)); } else orbit.aim(overview);
      wake();
    },
    frameFlow(id: string | null) {
      state.highlight = id;
      for (const r of routes.values()) r.lit = undefined; // re-evaluated next frame
      if (id) {
        const r = routes.get(id); if (r) {
          const xs = r.pts.map((p) => p[0]), zs = r.pts.map((p) => p[1]);
          const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cz = (Math.min(...zs) + Math.max(...zs)) / 2, span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs));
          orbit.aim({ target: [cx, 0.8, cz], theta: orbit.cur.theta, elev: 0.75, dist: Math.max(10, span * 1.5 + 6) });
        }
      }
      wake();
    },
    hoverLabel(id: string | null) { state.labelHover = id; refreshRims(); wake(); },
    /** platform name labels on/off (phones default to off; selecting a platform still names it) */
    setLabels(on: boolean) { state.labels = on; wake(); },
    zoom(f: number) { orbit.zoom(f); takeControl(); wake(); },
    overview() { state.selected = null; state.highlight = null; refreshRims(); orbit.aim(overview); wake(); },
    skipIntro() { finishIntro(true); wake(); },
    /** Back to home: contract the city into the Engine; onDone gets the final Engine-only frame (JPEG) */
    leave(onDone: (frame: string | null) => void) { return leaveCity(onDone); },
    cancelLeave() { cancelLeave(); },
    replayIntro() { if (state.reduced) return; state.selected = null; refreshRims(); introDone = false; introClock = 0; lift = 0; if (A) { setCityMerged(false); applyPresentation(0); } emitIntro(); wake(); },
    dispose() {
      disposed = true; cancelAnimationFrame(frame); io.disconnect(); ro.disconnect(); document.removeEventListener('visibilitychange', onVis);
      canvas.removeEventListener('webglcontextlost', lost);
      canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointermove', onMove); canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onCancel); canvas.removeEventListener('pointerleave', onLeave); canvas.removeEventListener('wheel', onWheel);
      el.removeEventListener('keydown', onKey);
      for (const l of live) l.inst.dispose();
      merged.forEach((g) => g.dispose()); polyGeos.forEach((g) => g.dispose()); kit.dispose(); owned.forEach((x) => x.dispose());
      Object.values(m).forEach((x) => (x as Material).dispose());
      transport.dispose();
      hitGeo.dispose(); hitMat.dispose(); rimGeo.dispose(); groundGeo.dispose(); groundMat.dispose();
      logo.dispose(); sun.shadow.dispose(); renderer.dispose(); canvas.remove();
      if (process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_CITY_DEBUG === '1') delete (window as unknown as Record<string, unknown>).__cyfroCity;
    },
  };
}
export type CityApi = NonNullable<ReturnType<typeof createCity>>;
