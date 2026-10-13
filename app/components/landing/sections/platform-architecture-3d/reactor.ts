import {
  AdditiveBlending, BufferAttribute, BufferGeometry, CanvasTexture, Color, CylinderGeometry, Group, Mesh, MeshBasicMaterial,
  MeshStandardMaterial, NormalBlending, PointLight, Points, PointsMaterial, RingGeometry, ShaderMaterial, SphereGeometry, Sprite,
  SpriteMaterial, SRGBColorSpace, TorusGeometry, Vector3, type Blending,
} from 'three';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';

/**
 * The CyfroAI Engine reactor: the floating CyfroSec logo orb as a contained electrical core that
 * powers the device below it.
 *
 * One ~10 s energy cycle (seamless, slightly different every time):
 *   A stable (0–4 s) → B charging (4–6 s) → C discharge (6–7 s) → D recovery (7–10 s).
 * Effects: procedural branching lightning (pooled thick lines, rebuilt in place each frame),
 * pooled sparks with short streaks, orbiting particles, an animated field shell, three rings at
 * independent speeds, a beam with a bright filament and travelling packets, ripples and circuit
 * traces on the top panel, and one shadowless point light for local reflections.
 * The logo itself never moves. Reduced motion / paused: a steady glow only.
 */

export type ReactorPhase = 'stable' | 'charging' | 'discharge' | 'recovery';
export type ReactorSignal = {
  /** where the reactor is in its cycle (shared with the engine's face so they never drift apart) */
  phase: ReactorPhase;
  /** 0..1 overall charge level (smooth, continuous across cycles) */
  energy: number;
  /** 0..1 discharge flash, decaying after each discharge */
  flash: number;
  /** seconds since the last discharge reached the device */
  sinceDischarge: number;
  /** seconds since the last energy packet reached the device */
  sincePacket: number;
};

const ORB = { x: 0.3, z: -0.9, y: 3.0, r: 0.55 }; // ≈40% of the device width; bottom stays ~0.28 above the top panel
const TOP = 2.165; // device top surface (inset panel)
const INSET = { hx: 0.95, hz: 0.575 }; // half-size of the top inset panel
const CYCLE = 10;
const PHASE = { B: 4, C: 6, D: 7 };
const TAU = Math.PI * 2;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const ease = (x: number) => { const v = clamp01(x); return v * v * (3 - 2 * v); };
const hash = (a: number, b = 0) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };

/** Energy level for time-in-cycle u (continuous at the loop point). */
function energyAt(u: number, k: number) {
  const wob = 0.04 * Math.sin(u * 1.7 + k) + 0.02 * Math.sin(u * 4.3 + k * 2);
  if (u < PHASE.B) return 0.2 + wob * ease(u / 0.6) * ease((PHASE.B - u) / 0.6);
  if (u < PHASE.C) return 0.2 + 0.68 * ease((u - PHASE.B) / (PHASE.C - PHASE.B));
  if (u < PHASE.D) return 0.88 + 0.12 * Math.exp(-(u - PHASE.C) * 3);
  // Recovery starts exactly where the discharge ends and lands exactly on the stable level at the loop point
  const cEnd = 0.88 + 0.12 * Math.exp(-(PHASE.D - PHASE.C) * 3), tail = Math.exp(-(CYCLE - PHASE.D) * 1.7);
  return 0.2 + (cEnd - 0.2) * (Math.exp(-(u - PHASE.D) * 1.7) - tail * ((u - PHASE.D) / (CYCLE - PHASE.D)));
}

function canvasTexture(size: number, draw: (ctx: CanvasRenderingContext2D, s: number) => void) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  draw(c.getContext('2d')!, size);
  const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; return t;
}
const radial = (stops: [number, string][]) => (ctx: CanvasRenderingContext2D, s: number) => {
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  stops.forEach(([o, c]) => g.addColorStop(o, c)); ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
};

/* ── Field shell: fresnel edge, drifting bands, slight wobble ── */
const FIELD_VERT = /* glsl */ `
uniform float uTime; uniform float uEnergy;
varying vec3 vN; varying vec3 vV; varying vec3 vP;
void main() {
  vec3 p = position + normal * sin(position.y * 13.0 + uTime * 2.6) * cos(position.x * 9.0 - uTime * 1.7) * (0.006 + 0.012 * uEnergy);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); vP = position;
  gl_Position = projectionMatrix * mv;
}`;
const FIELD_FRAG = /* glsl */ `
uniform float uTime; uniform float uEnergy; uniform float uFlash; uniform float uOpacity; uniform vec3 uColor;
varying vec3 vN; varying vec3 vV; varying vec3 vP;
void main() {
  float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.4);
  float bands = 0.5 + 0.5 * sin(vP.y * 30.0 - uTime * 2.2 + sin(vP.x * 11.0 + uTime * 0.9) * 1.6);
  float cells = 0.5 + 0.5 * sin(vP.x * 24.0 + uTime * 1.3) * sin(vP.z * 24.0 - uTime * 1.1);
  float a = fres * (0.3 + 0.7 * uEnergy + uFlash) * (0.55 + 0.3 * bands + 0.15 * cells) * uOpacity;
  gl_FragColor = vec4(uColor * (1.0 + 0.6 * uEnergy + uFlash), a);
}`;

type Bolt = {
  on: boolean; kind: 'orbit' | 'jump' | 'branch'; born: number; life: number; seed: number; strength: number;
  a: Vector3; b: Vector3; c: Vector3; segs: number; branches: number; jitter: number;
};
type Spark = { on: boolean; p: Vector3; v: Vector3; age: number; life: number; hot: number };

export function createReactor(parent: Group, opts: { logoUrl: string; lite: boolean }) {
  const lite = opts.lite;
  const g = new Group(); g.name = 'CyfroAI Engine reactor'; parent.add(g);
  const orb = new Group(); orb.position.set(ORB.x, ORB.y, ORB.z); g.add(orb);
  const disposables: { dispose(): void }[] = [];
  const keep = <T extends { dispose(): void }>(x: T) => { disposables.push(x); return x; };
  let dark = true;

  /* ── Orb (kept from the previous version): glass shell, glow, logo, rim, arcs ── */
  const shellMat = keep(new MeshStandardMaterial({ color: '#33afdf', transparent: true, opacity: 0.1, roughness: 0.12, metalness: 0.2, depthWrite: false }));
  const shell = new Mesh(keep(new SphereGeometry(ORB.r, 40, 28)), shellMat); shell.renderOrder = 1; orb.add(shell);

  const fieldUniforms = { uTime: { value: 0 }, uEnergy: { value: 0.2 }, uFlash: { value: 0 }, uOpacity: { value: 1 }, uColor: { value: new Color('#33afdf') } };
  const fieldMat = keep(new ShaderMaterial({ uniforms: fieldUniforms, vertexShader: FIELD_VERT, fragmentShader: FIELD_FRAG, transparent: true, depthWrite: false, blending: AdditiveBlending }));
  const field = new Mesh(keep(new SphereGeometry(ORB.r * 1.08, 48, 32)), fieldMat); field.renderOrder = 2; orb.add(field);

  const glowTex = keep(canvasTexture(256, radial([[0, 'rgba(120,220,255,0.9)'], [0.35, 'rgba(51,175,223,0.4)'], [1, 'rgba(3,155,224,0)']])));
  const glowMat = keep(new SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, opacity: 0.45 }));
  const glow = new Sprite(glowMat); glow.scale.setScalar(ORB.r * 1.9); glow.renderOrder = 3; orb.add(glow);

  /*
   * The logo as a sphere: the official logo (public/circle_logo.png, original proportions) is
   * projected straight onto the front of a lit sphere, so it reads correctly face-on and bulges
   * with real shading towards the edges. The back carries the same logo un-mirrored. The sphere
   * turns to face the viewer (see faceCamera), so the logo stays readable from any angle.
   */
  const logoCanvas = document.createElement('canvas'); logoCanvas.width = logoCanvas.height = 512;
  const logoTex = keep(new CanvasTexture(logoCanvas)); logoTex.colorSpace = SRGBColorSpace; logoTex.anisotropy = 4;
  {
    const ctx = logoCanvas.getContext('2d')!; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 512, 512); // the logo's white disc
    const img = new Image();
    img.onload = () => {
      const SRC = { w: 236, h: 233, cx: 118.5, cy: 117.8, r: 118 }, k = (256 * 0.94) / SRC.r; // measured centre; a little inset so the outer ring curves round the edge
      ctx.drawImage(img, 256 - SRC.cx * k, 256 - SRC.cy * k, SRC.w * k, SRC.h * k); logoTex.needsUpdate = true;
    };
    img.src = opts.logoUrl;
  }
  const LOGO_R = ORB.r * 0.62;
  const logoGeo = keep(new SphereGeometry(LOGO_R, 64, 48));
  { // planar UVs from the front (x, y), un-mirrored on the back
    const p = logoGeo.attributes.position, uv = logoGeo.attributes.uv;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); uv.setXY(i, 0.5 + (z >= 0 ? x : -x) / (2 * LOGO_R), 0.5 + y / (2 * LOGO_R)); }
    uv.needsUpdate = true;
  }
  const logoMat = keep(new MeshStandardMaterial({ map: logoTex, emissiveMap: logoTex, emissive: '#ffffff', emissiveIntensity: 0.32, roughness: 0.32, metalness: 0.12 }));
  const logoHolder = new Group(); orb.add(logoHolder);
  const logo = new Mesh(logoGeo, logoMat); logo.renderOrder = 4; logoHolder.add(logo);
  const faceTarget = new Vector3();

  const rimTex = keep(canvasTexture(256, (ctx, s) => {
    const gr = ctx.createRadialGradient(s / 2, s / 2, s * 0.41, s / 2, s / 2, s / 2);
    gr.addColorStop(0, 'rgba(51,175,223,0)'); gr.addColorStop(0.72, 'rgba(120,215,250,0.95)'); gr.addColorStop(1, 'rgba(51,175,223,0)');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, s, s);
  }));
  const rimMat = keep(new SpriteMaterial({ map: rimTex, transparent: true, depthWrite: false, opacity: 0.6 }));
  const rim = new Sprite(rimMat); rim.scale.setScalar(ORB.r * 2.12); rim.renderOrder = 5; orb.add(rim);

  // Rings at independent speeds: inner (clockwise, slow), middle arc, outer arc (counter-clockwise, slower)
  const ringDefs = [
    { rad: 0.44, tube: 0.004, len: TAU, color: '#7fd6f5', op: 0.35, tiltX: 1.25, tiltZ: 0.2, speed: -0.42 },
    { rad: 0.47, tube: 0.006, len: Math.PI * 1.1, color: '#33afdf', op: 0.55, tiltX: 0.5, tiltZ: 0, speed: 0.31 },
    { rad: 0.51, tube: 0.005, len: Math.PI * 0.7, color: '#039be0', op: 0.45, tiltX: -0.35, tiltZ: -0.3, speed: -0.24 },
  ];
  const rings = ringDefs.map((d) => {
    const holder = new Group(); holder.rotation.set(d.tiltX, 0, d.tiltZ); orb.add(holder);
    const mat = keep(new MeshBasicMaterial({ color: d.color, transparent: true, opacity: d.op, depthWrite: false }));
    const sc = ORB.r / 0.4; // ring sizes were designed for a 0.4 orb
    const ring = new Mesh(keep(new TorusGeometry(d.rad * sc, d.tube * sc, 6, 96, d.len)), mat); ring.rotation.x = Math.PI / 2; ring.renderOrder = 6; holder.add(ring);
    return { holder, mat, base: d.op, speed: d.speed, angle: hash(d.rad) * TAU };
  });

  /* ── Beam: bright filament + soft glow, packets travel down it ── */
  const padMat = keep(new MeshStandardMaterial({ color: '#039be0', roughness: 0.4, emissive: '#039be0', emissiveIntensity: 0.5 }));
  const pad = new Mesh(keep(new CylinderGeometry(0.1, 0.1, 0.012, 32)), padMat); pad.position.set(ORB.x, TOP + 0.006, ORB.z); g.add(pad);
  const beamGeo = keep(new CylinderGeometry(1, 1, 1, 16, 1, true));
  const filamentMat = keep(new MeshBasicMaterial({ color: '#d8f6ff', transparent: true, opacity: 0.85, depthWrite: false, blending: AdditiveBlending }));
  const beamGlowMat = keep(new MeshBasicMaterial({ color: '#33afdf', transparent: true, opacity: 0.22, depthWrite: false, blending: AdditiveBlending }));
  const filament = new Mesh(beamGeo, filamentMat); filament.renderOrder = 2; g.add(filament);
  const beamGlow = new Mesh(beamGeo, beamGlowMat); beamGlow.renderOrder = 2; g.add(beamGlow);

  const dotTex = keep(canvasTexture(64, radial([[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(190,240,255,0.85)'], [0.6, 'rgba(51,175,223,0.25)'], [1, 'rgba(3,155,224,0)']])));
  const packetMat = keep(new SpriteMaterial({ map: dotTex, color: '#bff0ff', transparent: true, depthWrite: false, blending: AdditiveBlending }));
  const packets = Array.from({ length: 4 }, () => { const s = new Sprite(packetMat); s.visible = false; s.renderOrder = 7; g.add(s); return { s, t0: -1, dur: 0.45, strong: false }; });

  /* ── Contact point: flash sprite, ripples and circuit traces on the top panel ── */
  const contactMat = keep(new SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, opacity: 0, blending: AdditiveBlending }));
  const contact = new Sprite(contactMat); contact.position.set(ORB.x, TOP + 0.05, ORB.z); contact.scale.setScalar(0.5); contact.renderOrder = 7; g.add(contact);

  const rippleGeo = keep(new RingGeometry(0.93, 1, 72));
  const ripples = Array.from({ length: 4 }, () => {
    const mat = keep(new MeshBasicMaterial({ color: '#33afdf', transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, blending: AdditiveBlending }));
    const m = new Mesh(rippleGeo, mat); m.rotation.x = -Math.PI / 2; m.position.set(ORB.x, TOP + 0.004, ORB.z); m.visible = false; m.renderOrder = 3; g.add(m);
    return { m, mat, t0: -1, life: 0.9, reach: 1, strength: 1 };
  });

  // Circuit traces (axis-aligned paths outward from the contact pad); each segment lights as the wave passes
  const TRACES: [number, number][][] = [
    [[0.12, 0], [0.5, 0], [0.5, 0.3], [0.86, 0.3]],
    [[-0.12, 0], [-0.5, 0], [-0.5, -0.3], [-0.86, -0.3]],
    [[0, 0.12], [0, 0.44], [0.32, 0.44]],
    [[0, -0.12], [0, -0.44], [-0.32, -0.44]],
    [[0.12, -0.07], [0.72, -0.07], [0.72, -0.46]],
    [[-0.12, 0.07], [-0.72, 0.07], [-0.72, 0.46]],
  ];
  const unitBox = keep(new CylinderGeometry(0.5, 0.5, 1, 4)); unitBox.rotateY(Math.PI / 4);
  const traces: { mat: MeshStandardMaterial; d: number }[] = [];
  const traceColor = new Color('#1d4f72');
  const ellipseDist = (x: number, z: number) => Math.hypot(x / INSET.hx, z / INSET.hz);
  for (const path of TRACES) {
    for (let i = 1; i < path.length; i++) {
      const [x0, z0] = path[i - 1], [x1, z1] = path[i];
      const mat = keep(new MeshStandardMaterial({ color: traceColor, roughness: 0.5, emissive: '#33afdf', emissiveIntensity: 0.04 }));
      const len = Math.hypot(x1 - x0, z1 - z0) + 0.018;
      const seg = new Mesh(unitBox, mat);
      seg.scale.set(x0 !== x1 ? len : 0.018, 0.004, x0 !== x1 ? 0.018 : len);
      seg.position.set(ORB.x + (x0 + x1) / 2, TOP + 0.002, ORB.z + (z0 + z1) / 2); g.add(seg);
      traces.push({ mat, d: ellipseDist((x0 + x1) / 2, (z0 + z1) / 2) });
    }
    const [ex, ez] = path[path.length - 1];
    const mat = keep(new MeshStandardMaterial({ color: traceColor, roughness: 0.5, emissive: '#33afdf', emissiveIntensity: 0.04 }));
    const node = new Mesh(unitBox, mat); node.scale.set(0.05, 0.005, 0.05); node.position.set(ORB.x + ex, TOP + 0.0025, ORB.z + ez); g.add(node);
    traces.push({ mat, d: ellipseDist(ex, ez) + 0.05 });
  }
  const waves = Array.from({ length: 4 }, () => ({ t0: -10, strength: 0 })); // circuit light fronts

  /* ── Local light: reflections on the device and the deck right around it ── */
  const light = new PointLight('#33afdf', 2, 4.2, 2); light.position.set(ORB.x, ORB.y, ORB.z); light.castShadow = false; g.add(light);

  /* ── Lightning: one pooled thick-line buffer (core + glow share it) ── */
  const MAX_SEG = lite ? 260 : 520;
  const pos = new Float32Array(MAX_SEG * 6), col = new Float32Array(MAX_SEG * 6);
  const lineGeo = keep(new LineSegmentsGeometry()); lineGeo.setPositions(pos); lineGeo.setColors(col);
  const posBuf = (lineGeo.attributes.instanceStart as unknown as { data: { array: Float32Array; needsUpdate: boolean } }).data;
  const colBuf = (lineGeo.attributes.instanceColorStart as unknown as { data: { array: Float32Array; needsUpdate: boolean } }).data;
  const coreMat = keep(new LineMaterial({ linewidth: lite ? 1.4 : 1.7, vertexColors: true, transparent: true, depthWrite: false, blending: AdditiveBlending }));
  const glowLineMat = keep(new LineMaterial({ linewidth: lite ? 4 : 5.5, vertexColors: true, transparent: true, depthWrite: false, blending: AdditiveBlending, color: '#5a5a5a' }));
  const glowGeo = keep(new LineSegmentsGeometry());
  for (const name of ['instanceStart', 'instanceEnd', 'instanceColorStart', 'instanceColorEnd']) glowGeo.setAttribute(name, lineGeo.getAttribute(name));
  const coreLines = new LineSegments2(lineGeo, coreMat); coreLines.frustumCulled = false; coreLines.renderOrder = 9;
  const glowLines = new LineSegments2(glowGeo, glowLineMat); glowLines.frustumCulled = false; glowLines.renderOrder = 8;
  g.add(glowLines, coreLines);

  const bolts: Bolt[] = Array.from({ length: lite ? 14 : 26 }, () => ({ on: false, kind: 'orbit', born: 0, life: 0, seed: 0, strength: 1, a: new Vector3(), b: new Vector3(), c: new Vector3(), segs: 8, branches: 0, jitter: 0.03 }));

  /* ── Sparks + orbiting particles: one pooled Points buffer ── */
  const ORBITERS = lite ? 10 : 20, SPARKS = lite ? 40 : 90, NP = ORBITERS + SPARKS;
  const ppos = new Float32Array(NP * 3), pcol = new Float32Array(NP * 3);
  const pGeo = keep(new BufferGeometry());
  pGeo.setAttribute('position', new BufferAttribute(ppos, 3)); pGeo.setAttribute('color', new BufferAttribute(pcol, 3));
  const pMat = keep(new PointsMaterial({ size: 0.05, map: dotTex, vertexColors: true, transparent: true, depthWrite: false, blending: AdditiveBlending, sizeAttenuation: true }));
  const points = new Points(pGeo, pMat); points.frustumCulled = false; points.renderOrder = 9; g.add(points);
  const sparks: Spark[] = Array.from({ length: SPARKS }, () => ({ on: false, p: new Vector3(), v: new Vector3(), age: 0, life: 0, hot: 1 }));
  const orbiters = Array.from({ length: ORBITERS }, (_, i) => ({ phase: hash(i, 1) * TAU, speed: 0.5 + hash(i, 2) * 0.9, incl: (hash(i, 3) - 0.5) * 2.2, rad: 1.18 + hash(i, 4) * 0.3, dir: hash(i, 5) > 0.5 ? 1 : -1 }));

  // Decorative only: never intercepts pointer raycasts (hover uses the engine's hit volumes)
  g.traverse((o) => { o.raycast = () => {}; });

  /* ── Palette (dark: additive light; light theme: deeper blues so it reads on a pale scene) ── */
  const C = { core: new Color(), mid: new Color(), spark: new Color(), orbit: new Color() };
  function setTheme(isDark: boolean) {
    dark = isDark;
    C.core.set(isDark ? '#eafcff' : '#0a6fa8'); C.mid.set(isDark ? '#33afdf' : '#039be0');
    C.spark.set(isDark ? '#d6f7ff' : '#0388c5'); C.orbit.set(isDark ? '#5fc8ee' : '#0b8fca');
    const blend: Blending = isDark ? AdditiveBlending : NormalBlending;
    for (const m of [coreMat, glowLineMat, pMat, filamentMat, beamGlowMat, packetMat, contactMat, fieldMat, ...ripples.map((r) => r.mat)]) { m.blending = blend; m.needsUpdate = true; }
    glowLineMat.color.set(isDark ? '#5a5a5a' : '#ffffff'); glowLineMat.opacity = isDark ? 1 : 0.22;
    fieldUniforms.uColor.value.set(isDark ? '#33afdf' : '#039be0'); fieldUniforms.uOpacity.value = isDark ? 1 : 0.3; // normal blending on a pale scene needs far less
    filamentMat.color.set(isDark ? '#d8f6ff' : '#0a8fd0');
  }
  setTheme(true);

  /* ── Bolt geometry: a jagged quadratic path with branches, written straight into the line buffer ── */
  const tmp = Array.from({ length: 24 }, () => new Vector3());
  const va = new Vector3(), vb = new Vector3(), vc = new Vector3(), vd = new Vector3();
  let segCount = 0;
  function pushSeg(p: Vector3, q: Vector3, color: Color, k: number) {
    if (segCount >= MAX_SEG) return;
    const o = segCount * 6;
    pos[o] = p.x; pos[o + 1] = p.y; pos[o + 2] = p.z; pos[o + 3] = q.x; pos[o + 4] = q.y; pos[o + 5] = q.z;
    const f = dark ? k : 1; // additive fades by colour; normal blending keeps full colour (bolts are brief)
    col[o] = color.r * f; col[o + 1] = color.g * f; col[o + 2] = color.b * f; col[o + 3] = color.r * f; col[o + 4] = color.g * f; col[o + 5] = color.b * f;
    segCount++;
  }
  const mixColor = new Color();
  function drawPath(a: Vector3, b: Vector3, c: Vector3, segs: number, jitter: number, seed: number, k: number, hot: number, branches: number) {
    for (let i = 0; i <= segs; i++) {
      const s = i / segs, w = Math.sin(Math.PI * s);
      const p = tmp[i];
      p.set(0, 0, 0).addScaledVector(a, (1 - s) * (1 - s)).addScaledVector(c, 2 * s * (1 - s)).addScaledVector(b, s * s);
      p.x += (hash(seed, i * 3 + 1) - 0.5) * 2 * jitter * w; p.y += (hash(seed, i * 3 + 2) - 0.5) * 2 * jitter * w; p.z += (hash(seed, i * 3 + 3) - 0.5) * 2 * jitter * w;
    }
    mixColor.copy(C.mid).lerp(C.core, hot);
    for (let i = 0; i < segs; i++) pushSeg(tmp[i], tmp[i + 1], mixColor, k);
    for (let n = 0; n < branches; n++) {
      const at = 2 + Math.floor(hash(seed, 90 + n) * (segs - 3));
      va.copy(tmp[at]); vd.subVectors(tmp[Math.min(segs, at + 1)], tmp[at]).normalize();
      vd.x += (hash(seed, 91 + n) - 0.5) * 1.6; vd.y += (hash(seed, 92 + n) - 0.5) * 1.6; vd.z += (hash(seed, 93 + n) - 0.5) * 1.6; vd.normalize();
      const len = 0.08 + hash(seed, 94 + n) * 0.16;
      let prev = vb.copy(va);
      mixColor.copy(C.mid).lerp(C.core, hot * 0.5);
      for (let j = 1; j <= 3; j++) {
        vc.copy(va).addScaledVector(vd, (len * j) / 3);
        vc.x += (hash(seed, 100 + n * 7 + j) - 0.5) * 0.05; vc.y += (hash(seed, 110 + n * 7 + j) - 0.5) * 0.05; vc.z += (hash(seed, 120 + n * 7 + j) - 0.5) * 0.05;
        pushSeg(prev, vc, mixColor, k * (1 - j * 0.22));
        prev = vb.copy(vc);
      }
    }
  }

  /* ── Spawning ── */
  let rngN = 1;
  const rnd = () => hash(rngN++ * 0.731, 17.3);
  const randomDir = (out: Vector3) => { const u = rnd() * 2 - 1, th = rnd() * TAU, s = Math.sqrt(1 - u * u); return out.set(s * Math.cos(th), u, s * Math.sin(th)); };
  function freeBolt() { return bolts.find((b) => !b.on) ?? null; }
  function spawnOrbit(t: number, oy: number, strength: number) {
    const b = freeBolt(); if (!b) return;
    randomDir(va); vb.copy(va); vd.set(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize(); vb.addScaledVector(vd, 0.9 + rnd() * 0.9).normalize();
    const R = ORB.r * (1.04 + rnd() * 0.08);
    b.a.set(ORB.x, oy, ORB.z).addScaledVector(va, R); b.b.set(ORB.x, oy, ORB.z).addScaledVector(vb, R);
    vc.addVectors(va, vb).normalize(); b.c.set(ORB.x, oy, ORB.z).addScaledVector(vc, R * (1.25 + rnd() * 0.25));
    Object.assign(b, { on: true, kind: 'orbit', born: t, life: 0.1 + rnd() * 0.28, seed: rnd() * 1000, strength, segs: 9, branches: rnd() > 0.55 ? 1 : 0, jitter: 0.025 + rnd() * 0.02 });
  }
  function spawnJump(t: number, oy: number, strength: number, big: boolean) {
    const b = freeBolt(); if (!b) return;
    const ang = rnd() * TAU, spread = big ? 0.15 + rnd() * 0.45 : 0.1 + rnd() * 0.3;
    b.a.set(ORB.x + Math.cos(ang) * 0.12, oy - ORB.r * 0.92, ORB.z + Math.sin(ang) * 0.12);
    b.b.set(ORB.x + Math.cos(ang + 0.6) * spread, TOP + 0.01, ORB.z + Math.sin(ang + 0.6) * spread * 0.6);
    b.c.set((b.a.x + b.b.x) / 2 + (rnd() - 0.5) * 0.35, (b.a.y + b.b.y) / 2, (b.a.z + b.b.z) / 2 + (rnd() - 0.5) * 0.35);
    Object.assign(b, { on: true, kind: 'jump', born: t, life: big ? 0.28 + rnd() * 0.12 : 0.16, seed: rnd() * 1000, strength, segs: big ? 14 : 9, branches: big ? 3 : 1, jitter: big ? 0.07 : 0.045 });
  }
  function spawnBranch(t: number, oy: number) {
    const b = freeBolt(); if (!b) return;
    const y = TOP + 0.05 + rnd() * (oy - ORB.r - TOP - 0.08);
    b.a.set(ORB.x, y, ORB.z); const ang = rnd() * TAU, len = 0.12 + rnd() * 0.14;
    b.b.set(ORB.x + Math.cos(ang) * len, y - 0.04 - rnd() * 0.08, ORB.z + Math.sin(ang) * len);
    b.c.lerpVectors(b.a, b.b, 0.5).y += 0.03;
    Object.assign(b, { on: true, kind: 'branch', born: t, life: 0.08 + rnd() * 0.08, seed: rnd() * 1000, strength: 0.7, segs: 5, branches: 0, jitter: 0.02 });
  }
  function burst(at: Vector3, n: number, speed: number, up: number, hot: number) {
    for (let i = 0; i < n; i++) {
      const s = sparks.find((x) => !x.on); if (!s) return;
      randomDir(vd); vd.y = Math.abs(vd.y) * up + vd.y * (1 - up);
      s.on = true; s.p.copy(at); s.v.copy(vd).multiplyScalar(speed * (0.4 + rnd() * 0.8)); s.age = 0; s.life = 0.18 + rnd() * 0.32; s.hot = hot;
    }
  }
  function ripple(t: number, reach: number, strength: number, life: number) {
    const r = ripples.find((x) => x.t0 < 0 || t - x.t0 > x.life) ?? ripples[0];
    Object.assign(r, { t0: t, reach, strength, life }); r.m.visible = true;
    const w = waves.reduce((m, x) => (x.t0 < m.t0 ? x : m), waves[0]); w.t0 = t; w.strength = strength;
  }

  /* ── State ── */
  let prevT = -1, hover = 0, hoverTarget = 0, lastDischarge = -100, lastPacket = -100;
  let orbitAcc = 0, branchAcc = 0, packetAcc = 0, minorAcc = 0;
  const signal: ReactorSignal = { phase: 'stable', energy: 0.2, flash: 0, sinceDischarge: 100, sincePacket: 100 };
  const contactPoint = new Vector3(ORB.x, TOP + 0.02, ORB.z);

  function update(t: number, still: boolean, activity: number): ReactorSignal {
    const dt = prevT < 0 || t < prevT ? 0 : Math.min(0.1, t - prevT);
    hover += (hoverTarget - hover) * Math.min(1, dt * 4 + (still ? 1 : 0));

    if (still) {
      // Reduced motion / paused: a steady, calm glow; no electricity, sparks or packets
      orb.position.y = ORB.y;
      glowMat.opacity = 0.45; rimMat.opacity = 0.6; logoMat.emissiveIntensity = 0.32;
      fieldUniforms.uTime.value = 0; fieldUniforms.uEnergy.value = 0.25; fieldUniforms.uFlash.value = 0;
      filamentMat.opacity = 0.55; beamGlowMat.opacity = 0.18; setBeam(ORB.y);
      rings.forEach((r) => { r.holder.rotation.y = r.angle; r.mat.opacity = r.base; });
      packets.forEach((p) => { p.s.visible = false; }); contactMat.opacity = 0; padMat.emissiveIntensity = 0.5;
      ripples.forEach((r) => { r.m.visible = false; }); traces.forEach((x) => { x.mat.emissiveIntensity = 0.06; });
      bolts.forEach((b) => { b.on = false; }); sparks.forEach((s) => { s.on = false; });
      light.intensity = dark ? 2 : 1.2;
      segCount = 0; lineGeo.instanceCount = 0; glowGeo.instanceCount = 0;
      writePoints(t, 0.25, true);
      prevT = t;
      signal.phase = 'stable';
      signal.energy = 0.25;
      signal.flash = 0;
      signal.sinceDischarge = signal.sincePacket = 100;
      return signal;
    }

    const k = Math.floor(t / CYCLE), u = t - k * CYCLE, vary = hash(k, 7);
    // Discharge at the start of phase C (detected as a crossing, so it never fires twice or resets)
    if (prevT >= 0 && Math.floor((t - PHASE.C) / CYCLE) > Math.floor((prevT - PHASE.C) / CYCLE)) discharge(t, vary);
    const energy = clamp01(energyAt(u, k) + 0.12 * hover);
    const flash = Math.exp(-Math.max(0, t - lastDischarge) * 4.2);
    const lift = Math.sin((t / 6) * TAU) * 0.035;
    const oy = ORB.y + lift;
    orb.position.y = oy;

    // Orb light and field
    glowMat.opacity = Math.min(1, 0.3 + 0.45 * energy + 0.35 * flash);
    glow.scale.setScalar(ORB.r * (1.8 + 0.35 * energy + 0.3 * flash));
    rimMat.opacity = Math.min(1, 0.45 + 0.4 * energy + 0.3 * flash);
    logoMat.emissiveIntensity = 0.28 + 0.12 * energy + 0.35 * flash; // the logo core brightens as it charges
    fieldUniforms.uTime.value = t; fieldUniforms.uEnergy.value = energy; fieldUniforms.uFlash.value = flash * (dark ? 0.8 : 0.35);
    rings.forEach((r) => { r.angle += dt * r.speed * (1 + energy * 1.6); r.holder.rotation.y = r.angle; r.mat.opacity = Math.min(1, r.base * (0.8 + energy * 0.7 + flash * 0.6)); });
    light.intensity = (dark ? 1 : 0.6) * (1.6 + energy * 3.5 + flash * 16 + hover * 1.5 + activity * 0.8);

    // Beam
    filamentMat.opacity = Math.min(1, 0.45 + 0.45 * energy + 0.4 * flash);
    beamGlowMat.opacity = Math.min(0.8, 0.12 + 0.25 * energy + 0.45 * flash + 0.1 * hover) * (dark ? 1 : 0.35);
    setBeam(oy, 1 + flash * 1.6 + energy * 0.4);

    // Spawning (rates follow the energy level; mobile gets fewer)
    const density = lite ? 0.55 : 1;
    orbitAcc += dt * (1.4 + energy * 11 + hover * 4) * density;
    while (orbitAcc >= 1) { orbitAcc -= 1; spawnOrbit(t, oy, 0.6 + energy * 0.5); }
    branchAcc += dt * (0.8 + energy * 4) * density;
    while (branchAcc >= 1) { branchAcc -= 1; spawnBranch(t, oy); }
    minorAcc += dt * (0.12 + (u > PHASE.B && u < PHASE.C ? 0.9 : 0) + hover * 0.4) * (0.7 + vary * 0.6);
    while (minorAcc >= 1) { minorAcc -= 1; spawnJump(t, oy, 0.7, false); burst(contactPoint, lite ? 3 : 5, 1.2, 0.8, 0.8); }
    packetAcc += dt * (u >= PHASE.B && u < PHASE.C ? 2.4 : 0.65 + hover * 0.6);
    while (packetAcc >= 1) { packetAcc -= 1; const p = packets.find((x) => x.t0 < 0); if (p) { p.t0 = t; p.dur = 0.42 + rnd() * 0.12; p.strong = false; } }
    if (rnd() < dt * (2 + energy * 10) * density) burst(vc.set(ORB.x, oy, ORB.z).addScaledVector(randomDir(vd), ORB.r * 1.05), 1 + Math.floor(rnd() * 2), 0.9, 0.3, 0.9);

    // Packets travel down the beam; arrival pulses the contact point, a small ripple and the circuits
    for (const p of packets) {
      if (p.t0 < 0) continue;
      const s = (t - p.t0) / p.dur;
      if (s >= 1) { p.t0 = -1; p.s.visible = false; lastPacket = t; ripple(t, 0.55, p.strong ? 1 : 0.55, 0.7); burst(contactPoint, lite ? 2 : 4, 0.9, 0.9, 0.7); continue; }
      const y0 = oy - ORB.r, y = y0 + (TOP + 0.02 - y0) * (s * s);
      p.s.visible = true; p.s.position.set(ORB.x, y, ORB.z); p.s.scale.setScalar(p.strong ? 0.16 : 0.1);
    }
    const sincePacket = t - lastPacket, sinceDischarge = t - lastDischarge;
    contactMat.opacity = Math.min(1, 0.9 * flash + 0.5 * Math.exp(-sincePacket * 7));
    contact.scale.setScalar(0.4 + 0.5 * flash);
    padMat.emissiveIntensity = 0.5 + 3 * flash + 1.4 * Math.exp(-sincePacket * 6) + energy * 0.5;

    // Ripples (oval, matching the top inset) and circuit light fronts
    for (const r of ripples) {
      if (r.t0 < 0) continue;
      const p = (t - r.t0) / r.life;
      if (p >= 1) { r.m.visible = false; r.t0 = -1; continue; }
      const rad = 0.08 + ease(p) * r.reach;
      r.m.scale.set(rad * INSET.hx, rad * INSET.hz, 1);
      r.mat.opacity = Math.pow(1 - p, 1.6) * r.strength * (dark ? 0.9 : 0.5);
    }
    for (const tr of traces) {
      let lit = 0;
      for (const w of waves) { const front = (t - w.t0) * 1.7; if (front < 0 || front > 1.6) continue; lit += w.strength * Math.exp(-(((front - tr.d) / 0.16) ** 2)) * (1 - front / 1.6); }
      tr.mat.emissiveIntensity = 0.05 + energy * 0.08 + Math.min(2.2, lit * 2.4);
    }

    writeBolts(t);
    writePoints(t, energy, false, dt, oy);
    prevT = t;
    const phase: ReactorPhase = u < PHASE.B ? 'stable' : u < PHASE.C ? 'charging' : u < PHASE.D ? 'discharge' : 'recovery';
    signal.phase = phase;
    signal.energy = energy;
    signal.flash = flash;
    signal.sinceDischarge = sinceDischarge;
    signal.sincePacket = sincePacket;
    return signal;
  }

  function discharge(t: number, vary: number) {
    lastDischarge = t;
    const oy = orb.position.y;
    const n = 2 + Math.floor(vary * 2.5);
    for (let i = 0; i < n; i++) spawnJump(t + i * 0.02, oy, 1, true);
    for (let i = 0; i < 4; i++) spawnOrbit(t, oy, 1);
    const p = packets.find((x) => x.t0 < 0); if (p) { p.t0 = t; p.dur = 0.22; p.strong = true; }
    ripple(t, 1, 1, 1.1);
    burst(contactPoint, lite ? 10 : 22, 2.2, 0.75, 1);
    burst(vc.set(ORB.x, oy - ORB.r * 0.8, ORB.z), lite ? 6 : 12, 1.6, 0.2, 1);
  }

  function setBeam(oy: number, thick = 1) {
    const bottom = oy - ORB.r, len = Math.max(0.01, bottom - TOP);
    filament.scale.set(0.007 * thick, len, 0.007 * thick); filament.position.set(ORB.x, TOP + len / 2, ORB.z);
    beamGlow.scale.set(0.04 * thick, len, 0.04 * thick); beamGlow.position.set(ORB.x, TOP + len / 2, ORB.z);
  }

  function writeBolts(t: number) {
    segCount = 0;
    for (const b of bolts) {
      if (!b.on) continue;
      const age = t - b.born;
      if (age < 0) continue;
      if (age > b.life) { b.on = false; continue; }
      const p = age / b.life;
      const k = b.strength * (p < 0.15 ? 1 : Math.pow(1 - (p - 0.15) / 0.85, 1.3)) * (0.75 + 0.25 * hash(b.seed, Math.floor(t * 30)));
      const seed = b.seed + Math.floor(t / 0.045) * 13.7; // flicker: the path re-jitters every ~45 ms
      drawPath(b.a, b.b, b.c, b.segs, b.jitter, seed, k, b.kind === 'jump' ? 0.85 : b.kind === 'orbit' ? 0.55 : 0.4, b.branches);
    }
    // Spark streaks: short luminous tails behind fast sparks
    for (const s of sparks) {
      if (!s.on) continue;
      const f = 1 - s.age / s.life;
      vb.copy(s.p).addScaledVector(s.v, -0.035);
      mixColor.copy(C.mid).lerp(C.spark, s.hot * f);
      pushSeg(s.p, vb, mixColor, f * 0.9);
    }
    lineGeo.instanceCount = segCount; glowGeo.instanceCount = segCount;
    posBuf.needsUpdate = true; colBuf.needsUpdate = true;
  }

  const FAR = -50;
  function writePoints(t: number, energy: number, frozen: boolean, dt = 0, oy = ORB.y) {
    // Orbiting particles: drift inward while charging
    const pull = 1 - 0.32 * clamp01((energy - 0.2) / 0.7);
    orbiters.forEach((o, i) => {
      const a = o.phase + (frozen ? 0 : t * o.speed * o.dir * (1 + energy));
      const r = ORB.r * o.rad * pull;
      const x = Math.cos(a) * r, z = Math.sin(a) * r, y = Math.sin(a * 0.7 + o.phase) * r * 0.25;
      const ci = Math.cos(o.incl), si = Math.sin(o.incl);
      ppos[i * 3] = ORB.x + x; ppos[i * 3 + 1] = oy + y * ci - z * si * 0.35; ppos[i * 3 + 2] = ORB.z + z * ci + y * si;
      const f = dark ? 0.5 + 0.4 * energy : 1;
      pcol[i * 3] = C.orbit.r * f; pcol[i * 3 + 1] = C.orbit.g * f; pcol[i * 3 + 2] = C.orbit.b * f;
    });
    sparks.forEach((s, j) => {
      const i = ORBITERS + j;
      if (s.on && !frozen) {
        s.age += dt;
        if (s.age >= s.life) s.on = false;
        else { s.v.y -= 2.2 * dt; s.v.multiplyScalar(1 - Math.min(0.9, dt * 3)); s.p.addScaledVector(s.v, dt); if (s.p.y < TOP + 0.005) { s.p.y = TOP + 0.005; s.v.y *= -0.3; } }
      }
      if (!s.on || frozen) { ppos[i * 3] = 0; ppos[i * 3 + 1] = FAR; ppos[i * 3 + 2] = 0; return; }
      const f = 1 - s.age / s.life;
      ppos[i * 3] = s.p.x; ppos[i * 3 + 1] = s.p.y; ppos[i * 3 + 2] = s.p.z;
      mixColor.copy(C.mid).lerp(C.spark, s.hot * f);
      const k = dark ? f : 1;
      pcol[i * 3] = mixColor.r * k; pcol[i * 3 + 1] = mixColor.g * k; pcol[i * 3 + 2] = mixColor.b * k;
    });
    (pGeo.attributes.position as BufferAttribute).needsUpdate = true; (pGeo.attributes.color as BufferAttribute).needsUpdate = true;
  }

  return {
    update,
    setTheme,
    setHover(on: boolean) { hoverTarget = on ? 1 : 0; },
    /** Turn the logo sphere towards the viewer (yaw and pitch), so the logo is always readable. */
    faceCamera(cam: Vector3) { logoHolder.lookAt(faceTarget.copy(cam)); }, // lookAt points the sphere's front (+Z, the logo) at the viewer
    resize(w: number, h: number) { coreMat.resolution.set(w, h); glowLineMat.resolution.set(w, h); },
    dispose() { parent.remove(g); light.dispose(); disposables.forEach((x) => x.dispose()); },
  };
}

export type Reactor = ReturnType<typeof createReactor>;
