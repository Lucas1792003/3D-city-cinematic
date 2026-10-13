import { BoxGeometry, Color, OctahedronGeometry, Group, InstancedMesh, Matrix4, MeshBasicMaterial, Quaternion, Vector3, type BufferGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { along } from '../registry/grid';
import type { FlowDefinition, StoryState } from '../registry/types';

/**
 * The shared transport manager: every data packet in the city, drawn with five instanced meshes
 * (packet cores, soft glow halos, short trails, the approval-hold marker, port docks). No per-packet loops or objects.
 *
 * A packet is a small glowing block of data — no vehicle: a 0.24 × 0.06 × 0.14 core (about twice a cable's
 * width), a faint halo around it and a trail no longer than the packet itself. It grows at most 2.2× with
 * camera distance so it stays legible from the overview without dominating the machinery.
 *
 * A carrier's life inside its story window:  load at the source dock → travel the verified route →
 * unload at the destination dock. Docks light while loading / unloading, and the engine passes the
 * arrival / departure pulses to the chunks (ChunkSignal.arrive / depart) so the receiving machine reacts.
 * Held carriers (approval checkpoints) sit loaded at their dock, pulsing orange, and never move;
 * a rejected one is withdrawn in place.
 */

export type TransportRoute = { flow: FlowDefinition; pts: [number, number][] };
export type ChunkPulse = { arrive: number; depart: number; hold: number };

const LOAD = 0.11, UNLOAD = 0.1; // most of a packet's window is spent travelling
const ease = (x: number) => { const v = Math.min(1, Math.max(0, x)); return v * v * (3 - 2 * v); };
type Style = 'data' | 'ctrl' | 'evt' | 'ai' | 'appr' | 'ext';
const STYLE: Record<string, Style> = { DATA: 'data', RPT: 'data', JOB: 'ctrl', CTRL: 'ctrl', EVT: 'evt', AI: 'ai', APPR: 'appr', EXT: 'ext' };
// one cyan-blue family (#039be0) with small shifts per flow kind; approval actions keep the orange of their cable
const PAL: Record<'dark' | 'light', Record<Style | 'wait' | 'gone' | 'dock', string>> = {
  dark: { data: '#1fb2f5', ctrl: '#7fd8ff', evt: '#45d0e6', ai: '#dff6ff', appr: '#ff9a55', ext: '#bfe6f7', wait: '#ff9a55', gone: '#6c7a86', dock: '#33afdf' },
  light: { data: '#0278ae', ctrl: '#0a9bd0', evt: '#0b8fa6', ai: '#2a9fd6', appr: '#fe701a', ext: '#4f7d96', wait: '#fe701a', gone: '#9fb2c3', dock: '#0386c6' },
};

export function createTransport(parent: Group, routes: Map<string, TransportRoute>, plateTop: (x: number, z: number) => number, cap = 72) {
  const g = new Group(); g.name = 'transport'; parent.add(g);
  // packet (local +x = direction of travel), floating just above its cable
  const coreGeo = new RoundedBoxGeometry(0.24, 0.06, 0.14, 1, 0.02); coreGeo.translate(0, 0.075, 0);
  const haloGeo = new BoxGeometry(0.32, 0.1, 0.2); haloGeo.translate(0, 0.075, 0);
  const trailGeo = new BoxGeometry(0.24, 0.015, 0.06); trailGeo.translate(-0.26, 0.075, 0);
  // approval hold only: a small marker above a packet waiting for a person (visible even behind machinery)
  const gemGeo = new OctahedronGeometry(0.08, 0); gemGeo.translate(0, 0.32, 0);
  const frame = (w: number, t: number) => [new BoxGeometry(w, 0.03, t).translate(0, 0, (w - t) / 2), new BoxGeometry(w, 0.03, t).translate(0, 0, -(w - t) / 2), new BoxGeometry(t, 0.03, w - 2 * t).translate((w - t) / 2, 0, 0), new BoxGeometry(t, 0.03, w - 2 * t).translate(-(w - t) / 2, 0, 0)];
  const parts = frame(0.64, 0.07); const dockGeo = mergeGeometries(parts as BufferGeometry[], false)!; parts.forEach((p) => p.dispose());
  const glowMat = new MeshBasicMaterial({ toneMapped: false });
  const haloMat = new MeshBasicMaterial({ toneMapped: false, transparent: true, opacity: 0.22, depthWrite: false });
  const trailMat = new MeshBasicMaterial({ toneMapped: false, transparent: true, opacity: 0.35, depthWrite: false });
  const dockMat = new MeshBasicMaterial({ toneMapped: false });
  const mk = (geo: BufferGeometry, mat: MeshBasicMaterial, n: number) => {
    const im = new InstancedMesh(geo, mat, n); im.count = 0; im.frustumCulled = false; im.castShadow = false; im.userData.dynamic = true; g.add(im);
    im.setColorAt(0, new Color()); return im;
  };
  const halos = mk(haloGeo, haloMat, cap), cores = mk(coreGeo, glowMat, cap), trails = mk(trailGeo, trailMat, cap), gems = mk(gemGeo, glowMat, cap);

  // docks: one at each end of every animated route (shared where two routes meet at a port)
  const docks: { p: [number, number]; y: number; pairs: [string, string][] }[] = [], dockOf = new Map<string, number>();
  const dockAt = (p: [number, number], pair: [string, string]) => { const k = `${p[0].toFixed(2)},${p[1].toFixed(2)}`; if (!dockOf.has(k)) { dockOf.set(k, docks.length); docks.push({ p, y: plateTop(p[0], p[1]) + 0.04, pairs: [] }); } const i = dockOf.get(k)!; docks[i].pairs.push(pair); return i; };
  const ends = new Map<string, { a: number; b: number; from: string; to: string; style: Style }>();
  for (const [id, r] of routes) {
    if (r.flow.display !== 'animate') continue;
    const a = r.pts[0], b = r.pts[r.pts.length - 1];
    const pair: [string, string] = [r.flow.from.chunk, r.flow.to.chunk];
    ends.set(id, { a: dockAt(a, pair), b: dockAt(b, pair), from: r.flow.from.chunk, to: r.flow.to.chunk, style: STYLE[r.flow.kind] ?? 'data' });
  }
  const dockMesh = mk(dockGeo, dockMat, Math.max(1, docks.length)); dockMesh.count = docks.length;
  const m4 = new Matrix4(), q = new Quaternion(), s3 = new Vector3(), p3 = new Vector3(), Y = new Vector3(0, 1, 0), c = new Color();
  docks.forEach((d, i) => { dockMesh.setMatrixAt(i, m4.compose(p3.set(d.p[0], d.y, d.p[1]), q.identity(), s3.setScalar(1))); });
  const dockK = new Float32Array(docks.length), dockWait = new Uint8Array(docks.length), dockShown = new Uint8Array(docks.length).fill(1);
  let pal = PAL.dark;

  const pulses: Record<string, ChunkPulse> = {};
  const pulse = (id: string) => (pulses[id] ??= { arrive: 0, depart: 0, hold: 0 });
  const active = new Set<string>();
  const heading = (pts: [number, number][], v: number) => {
    const a = along(pts, Math.max(0, v - 0.01)).p, b = along(pts, Math.min(1, v + 0.01)).p;
    return Math.atan2(-(b[1] - a[1]), b[0] - a[0]);
  };

  return {
    group: g,
    pulses,
    /** flows with a carrier on them this frame (their cables light up) */
    active,
    /** debug / audit: for each dock currently shown, the platform pairs of the routes through it */
    shownDocks() { return docks.filter((_, i) => dockShown[i]).map((d) => d.pairs); },
    /** assembly cinematic: a dock exists only once a connection through it has both of its platforms (null = all) */
    setPresent(isPresent: ((chunk: string) => boolean) | null) {
      let dirty = false;
      docks.forEach((d, i) => {
        const show = !isPresent || d.pairs.some(([a, b]) => isPresent(a) && isPresent(b)) ? 1 : 0;
        if (show !== dockShown[i]) { dockShown[i] = show; dockMesh.setMatrixAt(i, m4.compose(p3.set(d.p[0], d.y, d.p[1]), q.identity(), s3.setScalar(show ? 1 : 0.0001))); dirty = true; }
      });
      if (dirty) dockMesh.instanceMatrix.needsUpdate = true;
    },
    setTheme(dark: boolean) { pal = dark ? PAL.dark : PAL.light; haloMat.opacity = dark ? 0.22 : 0.3; trailMat.opacity = dark ? 0.35 : 0.5; },
    /**
     * @param dist camera distance (packets grow a little with it so they stay legible from the overview)
     * @param low  low-power: convoys shrink to their lead carrier and trails are dropped
     */
    update(st: StoryState, t: number, dist: number, low: boolean, still: boolean) {
      for (const k in pulses) { const p = pulses[k]; p.arrive = 0; p.depart = 0; p.hold = 0; }
      active.clear(); dockK.fill(0); dockWait.fill(0);
      let n = 0;
      const scale = Math.min(2.2, Math.max(1, dist / 13));
      if (!still) for (const pk of st.packets) {
        if (n >= cap) break;
        if (low && pk.i > 0) continue;
        const r = routes.get(pk.flow), e = ends.get(pk.flow); if (!r || !e) continue;
        const startDock = pk.reverse ? e.b : e.a, endDock = pk.reverse ? e.a : e.b;
        const src = pk.reverse ? e.to : e.from, dst = pk.reverse ? e.from : e.to;
        let v: number, sc: number, col = pal[e.style], glow = 0.85, flash = 0;
        if (pk.mode === 'wait') {
          v = 0; sc = 1; col = pal.wait;
          dockK[startDock] = Math.max(dockK[startDock], 0.55 + 0.45 * Math.sin(t * 5)); dockWait[startDock] = 1; pulse(src).hold = 1;
        } else if (pk.mode === 'discard') {
          v = 0; sc = 1 - ease(pk.u * 1.3); col = pal.gone;
        } else {
          active.add(pk.flow); if (r.flow.carrier) active.add(r.flow.carrier);
          if (pk.u < LOAD) { // loading at the source dock
            const k = pk.u / LOAD; v = 0; sc = ease(k * 1.8);
            dockK[startDock] = Math.max(dockK[startDock], Math.sin(Math.PI * k)); pulse(src).depart = Math.max(pulse(src).depart, Math.sin(Math.PI * k));
          } else if (pk.u > 1 - UNLOAD) { // unloading at the destination dock
            const k = (pk.u - (1 - UNLOAD)) / UNLOAD; v = 1; sc = 1 - ease((k - 0.45) * 1.8); flash = Math.sin(Math.PI * Math.min(1, k * 1.6)); // small arrival flash
            dockK[endDock] = Math.max(dockK[endDock], Math.sin(Math.PI * k)); pulse(dst).arrive = Math.max(pulse(dst).arrive, Math.sin(Math.PI * Math.min(1, k * 1.4)));
          } else { const w = (pk.u - LOAD) / (1 - LOAD - UNLOAD); v = 0.6 * w + 0.4 * (0.5 - 0.5 * Math.cos(Math.PI * w)); sc = 1; glow = 1.15; } // gentle start / stop; a little brighter while moving
        }
        const vv = pk.reverse ? 1 - v : v;
        const { p } = along(r.pts, vv);
        const yaw = heading(r.pts, vv) + (pk.reverse ? Math.PI : 0);
        q.setFromAxisAngle(Y, yaw); p3.set(p[0], plateTop(p[0], p[1]) + 0.02, p[1]);
        const k = Math.max(0.001, sc * scale * (e.style === 'ai' ? 0.8 : 1)); // in-process AI calls: a slightly smaller packet
        cores.setMatrixAt(n, m4.compose(p3, q, s3.setScalar(k)));
        halos.setMatrixAt(n, m4.compose(p3, q, s3.setScalar(k * (1 + 0.25 * flash))));
        const moving = pk.mode === 'travel' && pk.u >= LOAD && pk.u <= 1 - UNLOAD && !low;
        trails.setMatrixAt(n, m4.compose(p3, q, s3.set(moving ? k : 0.001, k, k)));
        // a packet held at an approval checkpoint shows a small marker (the visible "waiting for a person" sign)
        const gk = pk.mode === 'wait' ? k * (1 + 0.15 * Math.sin(t * 5)) : 0.001;
        q.setFromAxisAngle(Y, t * 1.5); gems.setMatrixAt(n, m4.compose(p3, q, s3.setScalar(gk)));
        const bright = pk.mode === 'wait' ? 0.7 + 0.4 * Math.sin(t * 5) : glow + 0.5 * flash;
        cores.setColorAt(n, c.set(col).multiplyScalar(bright));
        halos.setColorAt(n, c.set(col).multiplyScalar(0.8 + 1.2 * flash));
        trails.setColorAt(n, c.set(col)); gems.setColorAt(n, c);
        n++;
      }
      halos.count = cores.count = trails.count = gems.count = n;
      trails.visible = !low; // low-power: no trails (held packets keep their marker and the lamp on their dock)
      for (const im of [halos, cores, trails, gems]) { im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; }
      for (let i = 0; i < docks.length; i++) dockMesh.setColorAt(i, c.set(dockWait[i] ? pal.wait : pal.dock).multiplyScalar(0.22 + 0.9 * dockK[i]));
      if (dockMesh.instanceColor) dockMesh.instanceColor.needsUpdate = true;
    },
    dispose() {
      for (const im of [halos, cores, trails, gems, dockMesh]) im.dispose();
      for (const x of [coreGeo, haloGeo, trailGeo, gemGeo, dockGeo]) x.dispose();
      for (const x of [glowMat, haloMat, trailMat, dockMat]) x.dispose();
      g.removeFromParent();
    },
  };
}
