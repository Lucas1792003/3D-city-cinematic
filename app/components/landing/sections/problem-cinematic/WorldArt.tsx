'use client';

import { useId, useImperativeHandle, useRef, type ReactNode, type Ref } from 'react';
import { bell, clamp, lerp, r1, seg, track, type Key } from './timeline';
import {
  ASSETS,
  BAR_HALF,
  CODE_LINES,
  CONTEXT_ROWS,
  CORE,
  COUNTER,
  ESCALATION,
  EXPERTS,
  FLAW_LINE,
  FOCUS,
  ISLANDS,
  PANEL,
  PRIORITY,
  SIGNALS,
  codeLineX,
  codeLineY,
} from './worldData';
import OwlActor, { type OwlActorHandle, type OwlMood } from './OwlActor';
import s from './Art.module.css';

/**
 * The persistent cinematic world (Direction C): one SVG, rendered once; apply(p) writes every
 * object's state for scroll progress p. Rounded, dimensional illustration with the owl as a
 * supporting character. Every object keeps its identity across all five acts.
 */

export type WorldHandle = { apply: (p: number) => void };

const F = { w: 1000, h: 700, ax: 500, ay: 350 };

/* ── Art-specific layout (lens units) ── */
const TRAY = { x: 84, y: 100, w: 384, h: 464 };
const APPS = { x: 386, y: -248, w: 228, h: 152 };
const CODE_ISLAND = { x: -290, y: 300, scale: 0.6 }; // where the code file settles in Act 4
const INFRA = { x: 1108, y: 300, w: 190, unit: 40, gap: 8, dx: 18, dy: -14 };
const PLATES = {
  code: { x: -352, y: 236, w: 304, h: 262 },
  apps: { x: 352, y: -300, w: 296, h: 236 },
  infra: { x: 1072, y: 236, w: 290, h: 262 },
};
// Connections plug into ports on the objects (Code top, Web apps sides, Infrastructure roof)
type P2 = [number, number];
const PORTS: Record<string, P2> = { code: [-200, 300], appsL: [386, -172], appsR: [614, -172], infra: [1212, 293] };
const Q1: [P2, P2, P2] = [PORTS.code, [-170, -160], PORTS.appsL];
const Q2: [P2, P2, P2] = [PORTS.appsR, [1180, -160], PORTS.infra];
const qd = (q: [P2, P2, P2]) => `M${q[0][0]} ${q[0][1]}Q${q[1][0]} ${q[1][1]} ${q[2][0]} ${q[2][1]}`;
const qAt = (q: [P2, P2, P2], t: number): P2 => {
  const u = 1 - t;
  return [u * u * q[0][0] + 2 * u * t * q[1][0] + t * t * q[2][0], u * u * q[0][1] + 2 * u * t * q[1][1] + t * t * q[2][1]];
};
const L1 = qd(Q1);
const L2 = qd(Q2);
const L_MIDS: P2[] = [qAt(Q1, 0.5), qAt(Q2, 0.5)];

/* ── Act 5 final layout: Sources → CyfroSec analysis → Prioritized findings → Guidance ── */
const ENV = { x: -50, y: -120, w: 1130, h: 260 }; // the one plate the three tool plates merge into
const CORE_F: P2 = [500, 330];
const CODE_F: P2 = [10, -50]; // top-left of the code file (scale 0.6)
const APPS_S = 0.85;
const INFRA_C: P2 = [1203, 368];
const INFRA_F: P2 = [900, 10];
const INFRA_S = 0.85;
const TRAY_C: P2 = [TRAY.x + TRAY.w / 2, TRAY.y + TRAY.h / 2];
const TRAY_F: P2 = [500, 650];
const TRAY_S = 0.4;
/** Ranked finding rows, full size, between CyfroSec and the findings list (world coordinates). */
const ROWS: P2[] = [[510, 462], [510, 512]];
const ROW_LABELS = ['Code', 'Infrastructure'];
const ROW_BUG_X = 432;
// The exploited signals rise into the right end of each row (expressed in tray coordinates, since they ride the tray)
const PRIO_F: P2[] = ROWS.map(([, y]) => [TRAY_C[0] + (664 - TRAY_F[0]) / TRAY_S, TRAY_C[1] + (y - TRAY_F[1]) / TRAY_S]);
const ASSETS_F: P2[] = [[1160, 270], [1160, 395], [1160, 520]];
const TEAM = { x: 800, y: 620, w: 420, h: 80 };
const EXPERTS_F: P2[] = [[834, 664], [864, 664], [894, 664]];
const CODE_BUG_F: P2 = [179, 17];
const INFRA_BUG_F: P2 = [984, -55];
const APPS_MON_F: P2 = [597, -55];

type C4 = [P2, P2, P2, P2];
const cd = (c: C4) => `M${c[0][0]} ${c[0][1]}C${c[1][0]} ${c[1][1]} ${c[2][0]} ${c[2][1]} ${c[3][0]} ${c[3][1]}`;
const cAt = (c: C4, t: number): P2 => {
  const u = 1 - t;
  const a = u * u * u, b = 3 * u * u * t, cc = 3 * u * t * t, d = t * t * t;
  return [a * c[0][0] + b * c[1][0] + cc * c[2][0] + d * c[3][0], a * c[0][1] + b * c[1][1] + cc * c[2][1] + d * c[3][1]];
};
const endAngle = (c: C4) => (Math.atan2(c[3][1] - c[2][1], c[3][0] - c[2][0]) * 180) / Math.PI;
/** Every connection has a source, a destination and a meaning. */
const LINES: Record<string, { c: C4; kind: 'primary' | 'secondary' }> = {
  d1: { c: [[100, 186], [100, 250], [440, 250], [472, 282]], kind: 'primary' }, // discovery: Code → CyfroSec
  d2: { c: [[500, 126], [500, 180], [500, 230], [500, 268]], kind: 'primary' }, // discovery: Web apps → CyfroSec
  d3: { c: [[900, 186], [900, 250], [560, 250], [528, 282]], kind: 'primary' }, // discovery: Infrastructure → CyfroSec
  c4: { c: [[1094, 395], [900, 395], [700, 352], [552, 338]], kind: 'secondary' }, // impact context: Business assets → CyfroSec
  p5: { c: [[500, 408], [500, 416], [500, 426], [500, 436]], kind: 'primary' }, // prioritization: CyfroSec → findings
  g7: { c: [[586, 650], [680, 650], [720, 660], [792, 660]], kind: 'primary' }, // guidance: findings → teams
};
/** Act 5 answers, in the order the world shows them. */
export const ART_ANSWER_AT = { visibility: 0.765, context: 0.8, noise: 0.815, code: 0.87 } as const;

const CAMERA: Key[] = [
  { p: 0, v: [500, 360, 0.92] },
  { p: 0.12, v: [500, 350, 0.95] },
  { p: 0.2, v: [500, 350, 1] },
  { p: 0.31, v: [490, 360, 1.02] },
  { p: 0.4, v: [PANEL.x + PANEL.w / 2, PANEL.y + PANEL.h / 2 - 12, 2.15] },
  { p: 0.53, v: [PANEL.x + PANEL.w / 2, PANEL.y + PANEL.h / 2 - 12, 2.2] },
  { p: 0.62, v: [505, 150, 0.57] }, // framed low enough that the owl perched on Web apps clears the navbar
  { p: 0.68, v: [505, 150, 0.57] },
  { p: 0.715, v: [515, 280, 0.52] }, // pull back: the whole fragmented world comes into view
  { p: 0.8, v: [560, 300, 0.7] }, // then ease in as it reorganises around CyfroSec
  { p: 1, v: [560, 300, 0.7] },
];

/* ── Owl choreography (all a function of p, so it reverses with scroll) ── */
const OWL_START: [number, number] = [790, 120];
const OWL_CODE: [number, number] = [PANEL.x + PANEL.w - 60, PANEL.y + 2];
const OWL_APPS: [number, number] = [APPS.x + APPS.w - 50, APPS.y + 2];
// Act 5: the owl lands on the floor to the left of the CyfroSec platform (not on it)
const OWL_CORE: [number, number] = [370, 440]; // below the incoming lines, so nothing flows through the owl
/** The CyfroSec emblem on the owl's chest (owl-local coordinates) and the platform socket. */
const CHEST: [number, number] = [120, 204];
const SOCKET_Y = -20; // socket centre, relative to the core (before the platform scales up)
/** Where the owl hops up to on the platform rim to place the emblem, and its beak (owl-local). */
const RIM: [number, number] = [466, 338];
const BEAK: [number, number] = [120, 160];
const BP = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
const FLIGHTS = [
  { a: 0.36, b: 0.41, from: OWL_START, to: OWL_CODE },
  { a: 0.555, b: 0.61, from: OWL_CODE, to: OWL_APPS },
  { a: 0.672, b: 0.712, from: OWL_APPS, to: OWL_CORE },
];
const q = (v: number) => Math.round(clamp(v, -1, 1) * 5) / 5;

function owlPlace(p: number, mapCode: (x: number, y: number) => [number, number], mapApps: (x: number, y: number) => [number, number]) {
  let pos: [number, number] = OWL_START;
  let flying = false;
  let dir = 0;
  for (const f of FLIGHTS) {
    const map = (pt: [number, number]) => (pt === OWL_CODE ? mapCode(...pt) : pt === OWL_APPS ? mapApps(...pt) : pt);
    const from = map(f.from);
    const to = map(f.to);
    if (p >= f.b) pos = to;
    else if (p > f.a) {
      const t = seg(p, f.a, f.b);
      pos = [lerp(from[0], to[0], t), lerp(from[1], to[1], t) - Math.sin(Math.PI * t) * 150];
      flying = true;
      dir = Math.sign(to[0] - from[0]);
    } else break;
  }
  // Act 5: with the emblem in its beak, a hop up onto the platform rim, then back down
  const hopUp = seg(p, 0.724, 0.738);
  const hopDown = seg(p, 0.76, 0.774);
  if (hopUp > 0 && hopDown === 0) {
    pos = [lerp(OWL_CORE[0], RIM[0], hopUp), lerp(OWL_CORE[1], RIM[1], hopUp) - Math.sin(Math.PI * hopUp) * 50];
    if (hopUp < 1) { flying = true; dir = 1; }
  }
  if (hopDown > 0) {
    pos = [lerp(RIM[0], OWL_CORE[0], hopDown), lerp(RIM[1], OWL_CORE[1], hopDown) - Math.sin(Math.PI * hopDown) * 40];
    if (hopDown < 1) { flying = true; dir = -1; }
  }
  // Anticipation: a small crouch just before each take-off (flights and hops)
  const crouch = [...FLIGHTS.map((f) => f.a), 0.724, 0.76].reduce((acc, a) => acc + bell(p, a - 0.012, a - 0.005, a - 0.005, a + 0.002), 0);
  return { pos: [pos[0], pos[1] + crouch * 6] as [number, number], flying, dir };
}

function owlMood(p: number, flying: boolean, dir: number): OwlMood {
  if (flying) return { pose: 'flying', beak: 'closed', look: dir, gaze: null };
  if (p < 0.45) return { pose: 'perched', beak: 'closed', look: -0.6, gaze: { x: -0.6, y: 0.6 } }; // eyes on the new code
  if (p < 0.5) return { pose: 'perched', beak: 'closed', look: -0.2, gaze: { x: -0.2, y: q(lerp(-0.6, 1, seg(p, 0.45, 0.5))) } }; // follows the scanner
  if (p < 0.556) return { pose: 'perched', beak: 'wide', look: -0.8, gaze: { x: -0.8, y: 0.6 } }; // "the scanner missed it!"
  if (p < 0.69) {
    const look = q(lerp(-1, 1, seg(p, 0.62, 0.68))); // glances from tool to tool
    return { pose: 'perched', beak: 'closed', look, gaze: { x: look, y: 0.4 } };
  }
  // Act 5: lands beside the platform, takes the emblem from its chest and places it
  if (p < 0.712) return { pose: 'perched', beak: 'closed', look: 0.6, gaze: { x: 0.6, y: 0.4 } };
  if (p < 0.724) return { pose: 'perched', beak: 'closed', look: 0, gaze: { x: 0, y: 1 } }; // bends to pick the emblem off its chest
  if (p < 0.75) return { pose: 'perched', beak: 'closed', look: 0.8, gaze: { x: 0.8, y: 0.8 } }; // carries it in its beak, eyes on the socket
  if (p < 0.756) return { pose: 'perched', beak: 'slight', look: 0.8, gaze: { x: 0.6, y: 1 } }; // lets go into the socket
  if (p < 0.765) return { pose: 'perched', beak: 'wide', look: 0.8, gaze: { x: 0.8, y: 0.4 } }; // delight as it lights up
  // Then happy, following each connection as it lands
  const g =
    p < 0.8 ? { x: 0.2, y: -1 } : p < 0.815 ? { x: 1, y: -0.2 } : p < 0.87 ? { x: 0.4, y: 1 } : p < 0.92 ? { x: 1, y: 0.6 } : null;
  return { pose: 'perched', beak: p >= 0.92 ? 'wide' : 'slight', look: g ? g.x : 0, gaze: g };
}

const backOut = (t: number) => {
  const c1 = 1.5;
  const u = clamp(t) - 1;
  return 1 + (c1 + 1) * u * u * u + c1 * u * u;
};

/* ── Small illustration helpers (static markup) ── */
const Shadowed = ({ x, y, w, h, rx, depth = 9, children }: { x: number; y: number; w: number; h: number; rx: number; depth?: number; children?: ReactNode }) => (
  <>
    <rect x={x + 6} y={y + depth + 8} width={w} height={h} rx={rx} className={s.shade} />
    <rect x={x} y={y + depth} width={w} height={h} rx={rx} className={s.edge} />
    <rect x={x} y={y} width={w} height={h} rx={rx} className={s.surface} />
    {children}
  </>
);

const Bug = ({ x, y, k = 1 }: { x: number; y: number; k?: number }) => (
  <g transform={`translate(${x} ${y}) scale(${k})`}>
    <circle r={16} className={s.bugRing} />
    <ellipse cx={0} cy={2} rx={5.5} ry={7} className={s.orange} />
    <circle cx={0} cy={-6.5} r={3.4} className={s.orange} />
    <path d="M-5.5 -1h-4.5M5.5 -1h4.5M-5 4.5l-4.5 2.8M5 4.5l4.5 2.8M-4.5 -6.5l-3-3M4.5 -6.5l3-3" className={s.bugLegs} />
  </g>
);

/** Business assets: small buildings with three shaded faces (front, side, roof) on a raised slab. */
const DX = 22;
const DY = -15;
const sideFace = (x: number, y: number, h: number, dx = DX, dy = DY) => `M${x} ${y}l${dx} ${dy}v${h}l${-dx} ${-dy}z`;
const topFace = (x: number, y: number, w: number, dx = DX, dy = DY) => `M${x} ${y}l${dx} ${dy}h${w}l${-dx} ${-dy}z`;

function Slab({ x, y, w }: { x: number; y: number; w: number }) {
  return (
    <>
      <ellipse cx={x + w / 2 + 14} cy={y + 18} rx={w * 0.72} ry={12} className={s.shade} />
      <path d={sideFace(x + w, y, 10)} className={s.sideDeep} />
      <path d={topFace(x, y, w)} className={s.top} />
      <rect x={x} y={y} width={w} height={10} rx={2} className={s.edge} />
    </>
  );
}

function Building({ x, y, kind }: { x: number; y: number; kind: 0 | 1 | 2 }) {
  const base = y + 22;
  if (kind === 2) {
    // data store: a shaded cylinder in three tiers
    const rx = 30;
    const ry = 10;
    const top = base - 68;
    return (
      <g>
        <ellipse cx={x + 10} cy={base + 14} rx={50} ry={13} className={s.shade} />
        <ellipse cx={x} cy={base + 4} rx={rx + 10} ry={ry + 4} className={s.edge} />
        <ellipse cx={x} cy={base} rx={rx + 10} ry={ry + 4} className={s.top} />
        <rect x={x - rx} y={top} width={rx * 2} height={base - top - 4} className={s.blueSoft} />
        <rect x={x + 4} y={top} width={rx - 4} height={base - top - 4} className={s.blueSide} />
        <path d={`M${x - rx} ${base - 4}a${rx} ${ry} 0 0 0 ${rx * 2} 0`} className={s.blueSide} />
        {[1, 2].map((k) => (
          <path key={k} d={`M${x - rx} ${top + k * 22}a${rx} ${ry} 0 0 0 ${rx * 2} 0`} className={s.tierLine} />
        ))}
        <ellipse cx={x} cy={top} rx={rx} ry={ry} className={s.blue} />
        <ellipse cx={x - 4} cy={top - 1} rx={rx * 0.55} ry={ry * 0.45} className={s.blueMid} />
        <text x={x} y={y + 66} textAnchor="middle" className={s.label}>Business asset</text>
      </g>
    );
  }
  const w = kind === 0 ? 54 : 76;
  const h = kind === 0 ? 92 : 58;
  const bx = x - w / 2 - 8;
  const by = base - h;
  return (
    <g>
      <Slab x={bx - 10} y={base} w={w + 20} />
      <path d={sideFace(bx + w, by, h)} className={s.sideDeep} />
      <path d={topFace(bx, by, w)} className={s.top} />
      <rect x={bx} y={by} width={w} height={h} className={s.surface} />
      {kind === 0 ? (
        <>
          {/* rooftop unit */}
          <path d={sideFace(bx + 30, by - 9, 7, 8, -5)} className={s.sideDeep} />
          <path d={topFace(bx + 16, by - 9, 14, 8, -5)} className={s.top} />
          <rect x={bx + 16} y={by - 9} width={14} height={7} className={s.surfacePlain} />
          {Array.from({ length: 12 }, (_, i) => (
            <rect key={i} x={bx + 8 + (i % 3) * 14} y={by + 10 + Math.floor(i / 3) * 17} width={9} height={10} rx={1.5} className={i === 4 || i === 9 ? s.blue : s.blueSoft} />
          ))}
          {[0, 1, 2, 3].map((r) => (
            <path key={r} d={`M${bx + w + 5} ${by + 8 + r * 17}l12 -8v9l-12 8z`} className={s.blueSide} />
          ))}
          <rect x={bx + 21} y={base - 14} width={12} height={14} className={s.blueDeep} />
        </>
      ) : (
        <>
          {/* striped awning wrapping the corner */}
          {Array.from({ length: 5 }, (_, i) => (
            <rect key={i} x={bx + i * (w / 5)} y={by + 4} width={w / 5} height={14} className={i % 2 ? s.blueSoft : s.blue} />
          ))}
          <path d={`M${bx + w} ${by + 4}l${DX} ${DY}v14l${-DX} ${-DY}z`} className={s.blueMid} />
          <rect x={bx + 8} y={by + 26} width={28} height={18} rx={2} className={s.blueSoft} />
          <rect x={bx + 46} y={by + 26} width={18} height={h - 26} rx={2} className={s.blueDeep} />
          <path d={`M${bx + w + 6} ${by + 26}l12 -8v12l-12 8z`} className={s.blueSide} />
        </>
      )}
      <text x={x} y={y + 66} textAnchor="middle" className={s.label}>Business asset</text>
    </g>
  );
}

function Person({ x, y, tone }: { x: number; y: number; tone: string }) {
  return (
    <g>
      <ellipse cx={x} cy={y + 15} rx={15} ry={4} className={s.shade} />
      <rect x={x - 12} y={y - 2} width={24} height={16} rx={8} className={tone} />
      <circle cx={x} cy={y - 11} r={8} className={tone} />
    </g>
  );
}

export default function WorldArt({ ref, idle = true }: { ref?: Ref<WorldHandle>; idle?: boolean }) {
  const floorId = useId();
  const svg = useRef<SVGSVGElement>(null);
  const nodes = useRef<Record<string, Element> | null>(null);
  const owl = useRef<OwlActorHandle>(null);

  useImperativeHandle(ref, () => ({
    apply(p: number) {
      if (!nodes.current && svg.current) {
        nodes.current = {};
        svg.current.querySelectorAll('[data-k]').forEach((n) => {
          nodes.current![n.getAttribute('data-k')!] = n;
        });
      }
      const el = nodes.current ?? {};
      const set = (key: string, attrs: Record<string, number | string>) => {
        const node = el[key];
        if (!node) return;
        for (const k in attrs) node.setAttribute(k, String(attrs[k]));
      };
      const o = (key: string, v: number) => set(key, { opacity: v.toFixed(3) });
      const draw = (key: string, v: number) => set(key, { 'stroke-dashoffset': (1 - v).toFixed(3), opacity: v > 0.001 ? 1 : 0 });

      /* Camera */
      const [cx, cy, z] = track(CAMERA, p);
      set('camera', { transform: `translate(${F.ax} ${F.ay}) scale(${z.toFixed(4)}) translate(${-cx} ${-cy})` });

      const dim = 1 - 0.82 * seg(p, 0.32, 0.38) * (1 - seg(p, 0.55, 0.61));
      // Act 4 → 5 is one continuous reorganisation of the same objects: overlapping windows, curved paths.
      const arc = (k: number) => Math.sin(Math.PI * k);
      const kCore = seg(p, 0.69, 0.725); // 2. CyfroSec rises to the centre, curving past the findings
      const kCode = seg(p, 0.7, 0.76); // 2. sources glide into a row, one after another
      const kApps = seg(p, 0.71, 0.77);
      const kInfra = seg(p, 0.72, 0.78);
      const kTray = seg(p, 0.68, 0.725); // 1. findings make room first, gliding down under where CyfroSec will be
      const kPlate = seg(p, 0.74, 0.79); // the separate tool plates follow their tools, then merge
      const scaffold = 1 - seg(p, 0.7, 0.74); // Act 4 links, ports and "?" chips dissolve while still attached
      const quiet = seg(p, 0.815, 0.84); // noise recedes as findings are prioritized

      /* Code file: grows from the finding, settles into the Code island (Act 4), then into the sources row (Act 5) */
      const k4 = seg(p, 0.55, 0.62);
      const sc = lerp(1, CODE_ISLAND.scale, k4);
      const tx = lerp(lerp(0, CODE_ISLAND.x - PANEL.x * CODE_ISLAND.scale, k4), CODE_F[0] - PANEL.x * CODE_ISLAND.scale, kCode);
      const ty = lerp(lerp(0, CODE_ISLAND.y - PANEL.y * CODE_ISLAND.scale, k4), CODE_F[1] - PANEL.y * CODE_ISLAND.scale, kCode) - 70 * arc(kCode);
      const codeDelta: P2 = [300 * kCode, -350 * kCode - 70 * arc(kCode)];
      const mapCode = (x: number, y: number): [number, number] => [x * sc + tx, y * sc + ty];
      set('code', { transform: `translate(${r1(tx)} ${r1(ty)}) scale(${sc.toFixed(4)})` });

      /* Findings tray: shrinks into the compact prioritized list under CyfroSec */
      const ts = lerp(1, TRAY_S, kTray);
      const tcx = lerp(TRAY_C[0], TRAY_F[0], kTray) + 40 * arc(kTray);
      const tcy = lerp(TRAY_C[1], TRAY_F[1], kTray);
      const mapTray = (x: number, y: number): [number, number] => [tcx + (x - TRAY_C[0]) * ts, tcy + (y - TRAY_C[1]) * ts];
      const trayT = `translate(${r1(tcx)} ${r1(tcy)}) scale(${ts.toFixed(4)}) translate(${-TRAY_C[0]} ${-TRAY_C[1]})`;

      const growLin = clamp((p - 0.355) / (0.41 - 0.355));
      const grow = seg(p, 0.355, 0.41);
      const growB = backOut(growLin);

      /* Signals */
      SIGNALS.forEach((g, i) => {
        const [sx, sy] = ISLANDS[g.source].c;
        const fly = seg(p, g.spawn, g.spawn + 0.03);
        const k = seg(p, 0.15 + g.stagger, 0.22 + g.stagger);
        let x = lerp(lerp(sx, g.inbox[0], fly), g.list[0], k);
        let y = lerp(lerp(sy, g.inbox[1], fly), g.list[1], k);
        let half = BAR_HALF * k;
        let w = 10 - k;
        let op = seg(p, g.spawn, g.spawn + 0.006) * (g.exploited ? 1 : 0.6);
        let x1: number;
        let x2: number;
        if (i === FOCUS) {
          const lx = codeLineX(FLAW_LINE);
          x1 = lerp(x - half, lx, grow) * sc + tx;
          x2 = lerp(x + half, lx + CODE_LINES[FLAW_LINE].len, grow) * sc + tx;
          y = lerp(y, codeLineY(FLAW_LINE), grow) * sc + ty;
          w = lerp(w, 8, grow) * sc;
        } else {
          const pr = PRIORITY.indexOf(i);
          if (pr >= 0) {
            x = lerp(x, PRIO_F[pr][0], quiet);
            y = lerp(y, PRIO_F[pr][1] - 6 * bell(p, 0.835, 0.842, 0.842, 0.85), quiet);
            half = lerp(half, BAR_HALF + 4, quiet);
          } else if (!g.exploited) {
            op *= lerp(1, 0.35, quiet);
          }
          op *= dim;
          // ride the tray as it shrinks into place (only once the bars are on it)
          const [mx, my] = mapTray(x, y);
          x = lerp(x, mx, k);
          y = lerp(y, my, k);
          half *= lerp(1, ts, k);
          w *= lerp(1, ts, k);
          x1 = x - half;
          x2 = x + half;
        }
        set(`sig${i}`, { x1: r1(x1), x2: r1(x2), y1: r1(y), y2: r1(y), 'stroke-width': r1(w), opacity: op.toFixed(3) });
      });
      set('tray', { opacity: (seg(p, 0.15, 0.2) * dim).toFixed(3), transform: trayT });
      set('trayItems', { transform: trayT });
      PRIORITY.forEach((_, k) => o(`prio${k}`, seg(p, 0.83, 0.845)));
      o('trayLabel', 1 - kTray);
      o('findingsLabel', seg(p, 0.83, 0.845));

      /* Act 1 counter */
      o('counter', seg(p, 0.01, 0.03) * (1 - seg(p, 0.15, 0.19)));
      const n = el.counterNum;
      if (n) n.textContent = Math.round(COUNTER.total * seg(p, 0.015, 0.11)).toLocaleString('en-US');
      o('counterExploited', seg(p, 0.1, 0.12));

      /* Act 2 → 5: business assets become the impact-context column */
      ASSETS.forEach(([ax, ay], k) => {
        const a = seg(p, 0.2 + k * 0.01, 0.25 + k * 0.01);
        const hop = 10 * bell(p, 0.81 + k * 0.004, 0.816 + k * 0.004, 0.816 + k * 0.004, 0.826 + k * 0.004);
        const kA = seg(p, 0.72 + k * 0.012, 0.78 + k * 0.012);
        const dx = (ASSETS_F[k][0] - ax) * kA;
        const dy = (ASSETS_F[k][1] - ay) * kA - 50 * arc(kA);
        set(`asset${k}`, { opacity: (a * dim).toFixed(3), transform: `translate(${r1(dx)} ${r1(dy - hop + 14 * (a - 1))})` });
        const sy0 = 128 + CONTEXT_ROWS[k] * 32;
        const [sxm, sym] = mapTray(474, sy0); // these stubs belong to the findings, so they travel with the tray
        set(`ctxBroken${k}`, {
          opacity: (seg(p, 0.23 + k * 0.01, 0.27 + k * 0.01) * dim * (1 - seg(p, 0.7, 0.73))).toFixed(3),
          transform: `translate(${r1(sxm - 474)} ${r1(sym - sy0)})`,
        });
      });
      let expert0: P2 = EXPERTS[0];
      EXPERTS.forEach(([ex, ey], k) => {
        const a = seg(p, 0.27 + k * 0.01, 0.31 + k * 0.01);
        const hop = 8 * bell(p, 0.905 + k * 0.004, 0.911 + k * 0.004, 0.911 + k * 0.004, 0.921 + k * 0.004);
        const kE = seg(p, 0.8 + k * 0.006, 0.875 + k * 0.006);
        const dx = (EXPERTS_F[k][0] - ex) * kE;
        const dy = (EXPERTS_F[k][1] - ey) * kE - 30 * arc(kE);
        set(`expert${k}`, { opacity: (a * dim).toFixed(3), transform: `translate(${r1(dx)} ${r1(dy - hop + 8 * (a - 1))})` });
        if (k === 0) expert0 = [ex + dx, ey + dy];
      });
      // Escalation (findings → experts) stays attached to both ends while the layout reorganises, then dissolves
      const [es0, es1] = mapTray(260, 566);
      const [ee0, ee1]: P2 = [expert0[0] - 28, expert0[1]];
      set('escalation', { d: `M${r1(es0)} ${r1(es1)}C${r1(es0 + 40)} ${r1(es1 + 84)} ${r1(ee0 - 182)} ${r1(ee1)} ${r1(ee0)} ${r1(ee1)}` });
      draw('escalation', seg(p, 0.26, 0.31));
      o('escalationWrap', dim * (1 - seg(p, 0.72, 0.75)));

      /* CyfroSec core: moves to the centre, stays dim and empty until the owl places the emblem */
      const coreX = lerp(CORE[0], CORE_F[0], kCore) + 150 * arc(kCore);
      const coreY = lerp(CORE[1], CORE_F[1], kCore);
      const reveal = seg(p, 0.756, 0.768);
      const pulseFlash = 0.1 * bell(p, 0.962, 0.968, 0.968, 0.976);
      const coreScale = lerp(1, 1.3, reveal) + 0.08 * bell(p, 0.756, 0.762, 0.762, 0.774) + pulseFlash;
      set('core', {
        opacity: (lerp(seg(p, 0.03, 0.08) * 0.32, 1, reveal) * lerp(dim, 1, reveal)).toFixed(3),
        transform: `translate(${r1(coreX)} ${r1(coreY)}) scale(${coreScale.toFixed(3)})`,
      });
      const wave = seg(p, 0.755, 0.775);
      set('snapWave', {
        opacity: bell(p, 0.755, 0.759, 0.763, 0.775).toFixed(3),
        transform: `translate(${r1(coreX)} ${r1(coreY + SOCKET_Y * coreScale)}) scale(${(1 + 2.4 * wave).toFixed(3)})`,
      });
      o('coreHint', 0.35 * seg(p, 0.27, 0.31) * dim * (1 - kCore));

      /* Act 3: code file */
      const [fx, fy] = SIGNALS[FOCUS].list;
      const gx = lerp(fx - BAR_HALF - 6, PANEL.x, grow);
      const gy = lerp(fy - 9, PANEL.y, grow);
      const gw = lerp(BAR_HALF * 2 + 12, PANEL.w, growB);
      const gh = lerp(18, PANEL.h, growB);
      const pOn = seg(p, 0.35, 0.36);
      set('panelShadow', { x: r1(gx + 8), y: r1(gy + 20), width: r1(gw), height: r1(gh), opacity: pOn.toFixed(3) });
      set('panelEdge', { x: r1(gx), y: r1(gy + 10), width: r1(gw), height: r1(gh), opacity: pOn.toFixed(3) });
      set('panel', { x: r1(gx), y: r1(gy), width: r1(gw), height: r1(gh), opacity: pOn.toFixed(3) });
      o('chrome', seg(p, 0.4, 0.42));
      CODE_LINES.forEach((l, j) => {
        if (j === FLAW_LINE) return;
        const t = seg(p, 0.39 + j * 0.004, 0.42 + j * 0.004);
        set(`line${j}`, { x2: r1(codeLineX(j) + l.len * t), opacity: t > 0.01 ? 1 : 0 });
      });
      CODE_LINES.forEach((l, j) => {
        if (l.ai) o(`spark${j}`, seg(p, 0.42 + j * 0.004, 0.44 + j * 0.004));
      });
      o('flawBand', seg(p, 0.43, 0.45));
      const wob = bell(p, 0.5, 0.507, 0.507, 0.52);
      set('bug', {
        opacity: seg(p, 0.43, 0.45).toFixed(3),
        transform: `translate(${PANEL.x + PANEL.w - 18} ${codeLineY(FLAW_LINE)}) rotate(${r1(wob * 14)}) scale(${(seg(p, 0.43, 0.45) * 0.4 + 0.6 + wob * 0.15).toFixed(3)})`,
      });
      const scanY = lerp(PANEL.y + 36, PANEL.y + PANEL.h - 8, seg(p, 0.45, 0.5));
      set('scan', { transform: `translate(0 ${r1(scanY)})`, opacity: bell(p, 0.445, 0.455, 0.495, 0.505).toFixed(3) });
      o('tag', seg(p, 0.5, 0.52) * (1 - seg(p, 0.68, 0.7)));

      /* Act 4: tools appear on separate plates; Act 5: they line up as the sources row */
      set('codeLabel', { opacity: seg(p, 0.6, 0.63).toFixed(3), transform: `translate(${r1(codeDelta[0])} ${r1(codeDelta[1])})` });
      const appsIn = seg(p, 0.58, 0.63);
      const appsS = lerp(lerp(0.9, 1, appsIn), APPS_S, kApps);
      const appsY = -172 + 182 * kApps;
      const mapApps = (x: number, y: number): [number, number] => [500 + (x - 500) * appsS, appsY + (y + 172) * appsS];
      set('apps', { opacity: appsIn.toFixed(3), transform: `translate(500 ${r1(appsY)}) scale(${appsS.toFixed(3)}) translate(-500 172)` });
      const infraIn = seg(p, 0.59, 0.64);
      const infraS = lerp(lerp(0.9, 1, infraIn), INFRA_S, kInfra);
      const infraX = lerp(INFRA_C[0], INFRA_F[0], kInfra);
      const infraY = lerp(INFRA_C[1], INFRA_F[1], kInfra) - 80 * arc(kInfra);
      const mapInfra = (x: number, y: number): P2 => [infraX + (x - INFRA_C[0]) * infraS, infraY + (y - INFRA_C[1]) * infraS];
      set('infra', {
        opacity: infraIn.toFixed(3),
        transform: `translate(${r1(infraX)} ${r1(infraY)}) scale(${infraS.toFixed(3)}) translate(${-INFRA_C[0]} ${-INFRA_C[1]})`,
      });
      // The three tool plates travel with their tools, then stretch into the one environment plate
      const appsDelta: P2 = [0, appsY + 172];
      const infraDelta: P2 = [infraX - INFRA_C[0], infraY - INFRA_C[1]];
      const plateIn = seg(p, 0.6, 0.65);
      const merged = seg(p, 0.775, 0.79);
      ([['code', codeDelta], ['apps', appsDelta], ['infra', infraDelta]] as [keyof typeof PLATES, P2][]).forEach(([key, [ddx, ddy]]) => {
        const pl = PLATES[key];
        set(`plateRect-${key}`, {
          x: r1(lerp(pl.x + ddx, ENV.x, kPlate)),
          y: r1(lerp(pl.y + ddy, ENV.y, kPlate)),
          width: r1(lerp(pl.w, ENV.w, kPlate)),
          height: r1(lerp(pl.h, ENV.h, kPlate)),
          opacity: (plateIn * (1 - merged)).toFixed(3),
        });
        set(`plateLabel-${key}`, { opacity: (plateIn * (1 - seg(p, 0.7, 0.72))).toFixed(3), transform: `translate(${r1(ddx)} ${r1(ddy)})` });
      });
      // Act 4 ports and dotted links stay attached to the moving tools while they dissolve
      const ports: P2[] = [
        [PORTS.code[0] + codeDelta[0], PORTS.code[1] + codeDelta[1]],
        mapApps(...PORTS.appsL),
        mapApps(...PORTS.appsR),
        mapInfra(...PORTS.infra),
      ];
      ports.forEach(([x, y], i) => set(`port${i}`, { transform: `translate(${r1(x)} ${r1(y)})`, opacity: (plateIn * scaffold).toFixed(3) }));
      const shift = (a: P2, b: P2, base: P2): P2 => [base[0] + ((a[0] + b[0]) / 2), base[1] + ((a[1] + b[1]) / 2)];
      const q1: [P2, P2, P2] = [ports[0], shift([ports[0][0] - Q1[0][0], ports[0][1] - Q1[0][1]], [ports[1][0] - Q1[2][0], ports[1][1] - Q1[2][1]], Q1[1]), ports[1]];
      const q2: [P2, P2, P2] = [ports[2], shift([ports[2][0] - Q2[0][0], ports[2][1] - Q2[0][1]], [ports[3][0] - Q2[2][0], ports[3][1] - Q2[2][1]], Q2[1]), ports[3]];
      set('tl1', { d: qd(q1) });
      set('tl2', { d: qd(q2) });
      set('stub', { d: qd(q1) });
      set('stub2', { d: qd([q2[2], q2[1], q2[0]]) }); // from the Infrastructure end back toward Web apps
      [q1, q2].forEach((qq, i) => {
        const [mx, my] = qAt(qq, 0.5);
        set(`tlq${i}`, { transform: `translate(${r1(mx)} ${r1(my)})` });
      });
      o('toolLinks', seg(p, 0.62, 0.66) * scaffold);
      o('toolChips', seg(p, 0.62, 0.66) * scaffold);
      const stub = 0.47 * seg(p, 0.64, 0.67); // runs up to the "?" chip (the trail is lost between tools)
      set('stub', { 'stroke-dasharray': `${stub.toFixed(3)} 2`, opacity: (stub > 0.001 ? 1 : 0) * (1 - seg(p, 0.7, 0.73)) });
      set('stub2', { 'stroke-dasharray': `${stub.toFixed(3)} 2`, opacity: (stub > 0.001 ? 1 : 0) * (1 - seg(p, 0.7, 0.73)) });
      o('envPlate', merged);

      /* Act 5: purposeful connections, drawn in story order from source to destination */
      const lineAt: Record<string, number> = {
        d1: seg(p, 0.765, 0.785),
        d2: seg(p, 0.775, 0.795),
        d3: seg(p, 0.785, 0.805),
        c4: seg(p, 0.8, 0.82),
        p5: seg(p, 0.815, 0.83),
        g7: seg(p, 0.885, 0.905),
      };
      for (const key in LINES) {
        const v = lineAt[key];
        const L = LINES[key];
        if (L.kind === 'primary') draw(`line-${key}`, v);
        else o(`line-${key}`, v); // dashed secondary lines fade in (dashes can't also "draw")
        o(`head-${key}`, seg(v, 0.85, 1));
        // a small signal rides the head of each primary line while it draws, so direction reads in paused frames
        if (L.kind === 'primary') {
          const [hx, hy] = cAt(L.c, v);
          set(`sig-${key}`, { transform: `translate(${r1(hx)} ${r1(hy)})`, opacity: bell(v, 0.02, 0.1, 0.85, 1).toFixed(3) });
        }
      }
      o('bracket', lineAt.c4);
      o('ctxLabel', seg(p, 0.81, 0.825));

      /* Continuity: each vulnerability lifts off its system, rides that system's discovery line into CyfroSec,
         is analyzed there, then travels down into its own row in Prioritized findings. Nothing vanishes. */
      const collect = (key: string, from: P2, line: C4, ride: [number, number], down: [number, number], row: number, side: number) => {
        const u1 = seg(p, ride[0], ride[1]);
        const u2 = seg(p, down[0], down[1]);
        const [sx2, sy2]: P2 = [ROW_BUG_X, ROWS[row][1]];
        let pt: P2;
        let k = 1;
        if (u2 > 0) {
          const [ax, ay] = cAt(LINES.p5.c, Math.min(1, u2 / 0.6));
          pt = u2 < 0.6 ? [ax, ay] : [lerp(LINES.p5.c[3][0], sx2, (u2 - 0.6) / 0.4), lerp(LINES.p5.c[3][1], sy2, (u2 - 0.6) / 0.4)];
        } else if (u1 >= 1) {
          pt = [coreX + side * 16, coreY - 14]; // being analyzed at the core
          k = 0.75;
        } else if (u1 < 0.15) {
          const h = u1 / 0.15;
          pt = [lerp(from[0], line[0][0], h), lerp(from[1], line[0][1], h) - Math.sin(Math.PI * h) * 30];
        } else {
          pt = cAt(line, (u1 - 0.15) / 0.85);
        }
        if (u1 >= 1 && u2 === 0) k = 0.75;
        set(key, { opacity: u1 > 0.001 ? '1' : '0', transform: `translate(${r1(pt[0])} ${r1(pt[1])}) scale(${k.toFixed(3)})` });
        return u1;
      };
      const takenCode = collect('flyBug0', CODE_BUG_F, LINES.d1.c, [0.765, 0.79], [0.815, 0.835], 0, -1);
      const takenInfra = collect('flyBug1', INFRA_BUG_F, LINES.d3.c, [0.785, 0.81], [0.822, 0.842], 1, 1);
      o('infraBug', infraIn * (takenInfra > 0.001 ? 0 : 1));
      if (takenCode > 0.001) o('bug', 0);
      // the sources return to a calm, monitored state once their findings have been collected
      o('mon0', seg(p, 0.79, 0.8));
      o('mon1', seg(p, 0.795, 0.805));
      o('mon2', seg(p, 0.81, 0.82));
      // rows in Prioritized findings: the vulnerabilities stay visible, ranked
      o('row0', seg(p, 0.828, 0.84));
      o('row1', seg(p, 0.836, 0.848));
      const team = seg(p, 0.895, 0.91);
      set('team', { opacity: team.toFixed(3), transform: `translate(0 ${r1(10 * (1 - team))})` });
      const done = seg(p, 0.92, 0.935);
      set('analysisPill', { opacity: done.toFixed(3), transform: `translate(${r1(-10 * (1 - done))} 0)` });

      /* Final pulse: once, Sources → CyfroSec → findings → guidance */
      const ps = seg(p, 0.945, 0.995);
      const seg3 = ps * 3;
      const [qx, qy] = seg3 < 1 ? cAt(LINES.d2.c, seg3) : seg3 < 2 ? cAt(LINES.p5.c, seg3 - 1) : cAt(LINES.g7.c, Math.min(1, seg3 - 2));
      set('pulse', { transform: `translate(${r1(qx)} ${r1(qy)})`, opacity: bell(p, 0.945, 0.95, 0.99, 0.998).toFixed(3) });

      /* Owl: placement every frame, expression only when it changes */
      const { pos, flying, dir } = owlPlace(p, mapCode, mapApps);
      const os = 0.38 / z; // constant, modest on-screen size as the camera moves
      const ox = pos[0] - 120 * os;
      const oy = pos[1] - 250 * os;
      // a small bow to take the emblem off its chest, then a deep lean from the rim to set it in the socket
      const lean = 14 * bell(p, 0.712, 0.717, 0.72, 0.725) + 38 * (seg(p, 0.738, 0.748) - seg(p, 0.752, 0.76));
      const carrying = p >= 0.716; // from here the emblem is off the owl's chest
      set('owl', {
        opacity: seg(p, 0.36, 0.375).toFixed(3),
        transform: `translate(${r1(ox)} ${r1(oy)}) scale(${os.toFixed(4)}) rotate(${r1(lean)} 120 230)`, // bows from the hips
        class: carrying ? s.carrying : '',
      });
      // owl-local point → world, following the owl's position, scale and lean
      const rad = (lean * Math.PI) / 180;
      const owlPt = (lx: number, ly: number): P2 => {
        const dx = (lx - 120) * os;
        const dy = (ly - 230) * os;
        const hx = pos[0];
        const hy = pos[1] - 20 * os; // hip pivot
        return [hx + dx * Math.cos(rad) - dy * Math.sin(rad), hy + dx * Math.sin(rad) + dy * Math.cos(rad)];
      };
      // The emblem: chest → beak (picked up) → carried in the beak → dropped into the socket
      const socket: P2 = [coreX, coreY + SOCKET_Y * coreScale];
      const pick = seg(p, 0.716, 0.724);
      const drop = seg(p, 0.75, 0.756);
      const inBeak = owlPt(...BEAK);
      let orb: P2 = pick < 1 ? (() => { const a = owlPt(...CHEST); return [lerp(a[0], inBeak[0], pick), lerp(a[1], inBeak[1], pick)] as P2; })() : inBeak;
      if (drop > 0) orb = [lerp(inBeak[0], socket[0], drop), lerp(inBeak[1], socket[1], drop)];
      const orbSize = lerp(30 * os, 38 * coreScale, drop); // diameter in world units: small in the beak, bigger in the socket
      set('orb', {
        opacity: (carrying ? 1 : 0).toString(),
        transform: `translate(${r1(orb[0])} ${r1(orb[1])}) scale(${(orbSize / 34).toFixed(4)}) rotate(${r1(lean * 0.5)})`,
      });
      owl.current?.set(owlMood(p, flying, dir));
      const pop = (key: string, v: number, at = '214 26') => set(key, { opacity: v.toFixed(3), transform: `translate(${at}) scale(${(0.6 + 0.4 * v).toFixed(3)})` });
      pop('bubbleRisk', bell(p, 0.503, 0.515, 0.545, 0.555));
      pop('bubbleQuestion', bell(p, 0.625, 0.64, 0.68, 0.69));

    },
  }));

  const signal = (i: number) => {
    const g = SIGNALS[i];
    const [x, y] = ISLANDS[g.source].c;
    return <line key={i} data-k={`sig${i}`} x1={x} x2={x} y1={y} y2={y} strokeWidth={10} opacity={0} className={g.exploited ? s.signalRisk : s.signal} />;
  };
  const codeBottom = CODE_ISLAND.y + PANEL.h * CODE_ISLAND.scale;
  const codeCx = CODE_ISLAND.x + (PANEL.w * CODE_ISLAND.scale) / 2;

  return (
    <svg ref={svg} viewBox={`0 0 ${F.w} ${F.h}`} preserveAspectRatio="xMidYMid meet" className={s.world} aria-hidden="true" focusable="false">
      <defs>
        <pattern id={floorId} width={25} height={25} patternUnits="userSpaceOnUse">
          <circle cx={12.5} cy={12.5} r={1.1} className={s.floorDot} />
        </pattern>
      </defs>
      <g data-k="camera">
        <rect x={-2400} y={-2000} width={5800} height={4800} fill={`url(#${floorId})`} />

        {/* Act 5: one soft plate behind the sources (replaces the giant loop) */}
        <g data-k="envPlate" opacity={0}>
          <rect x={ENV.x} y={ENV.y} width={ENV.w} height={ENV.h} rx={40} className={s.envPlate} />
          <text x={ENV.x + 32} y={ENV.y + 32} textAnchor="start" className={s.envLabel}>Your environment, connected</text>
        </g>

        {/* Ranked findings: the collected vulnerabilities stay visible here (orange = unresolved risk) */}
        {ROWS.map(([cx, cy], k) => (
          <g key={k} data-k={`row${k}`} opacity={0}>
            <rect x={cx - 180 + 4} y={cy - 22 + 7} width={360} height={44} rx={22} className={s.shade} />
            <rect x={cx - 180} y={cy - 22} width={360} height={44} rx={22} className={s.rowCard} />
            <rect x={cx - 172} y={cy - 15} width={58} height={30} rx={15} className={s.blue} />
            <text x={cx - 143} y={cy + 7} textAnchor="middle" className={s.tagRow}>{`P${k + 1}`}</text>
            <text x={cx - 58} y={cy + 8} className={s.rowLabel}>{ROW_LABELS[k]}</text>
          </g>
        ))}

        {/* Act 4: each tool sits on its own plate */}
        {(Object.keys(PLATES) as (keyof typeof PLATES)[]).map((key) => {
          const pl = PLATES[key];
          return (
            <g key={key}>
              <rect data-k={`plateRect-${key}`} x={pl.x} y={pl.y} width={pl.w} height={pl.h} rx={34} className={s.plate} opacity={0} />
              <text data-k={`plateLabel-${key}`} x={pl.x + pl.w / 2} y={pl.y + pl.h + 36} textAnchor="middle" className={s.capsWide} opacity={0}>Separate tool</text>
            </g>
          );
        })}
        <g data-k="toolLinks" opacity={0}>
          <path data-k="tl1" d={L1} className={s.beadsWide} />
          <path data-k="tl2" d={L2} className={s.beadsWide} />
        </g>
        {/* Layering: dotted link → orange trail → "?" chip on top, so each trail ends at its chip */}
        <path data-k="stub" d={L1} pathLength={1} className={s.trace} opacity={0} />
        <path data-k="stub2" d={L2} pathLength={1} className={s.trace} opacity={0} />
        <g data-k="toolChips" opacity={0}>
          {L_MIDS.map(([x, y], i) => (
            <g key={i} data-k={`tlq${i}`} transform={`translate(${r1(x)} ${r1(y)})`}>
              <rect x={-24} y={-24} width={48} height={48} rx={16} className={s.chip} />
              <text x={0} y={8} textAnchor="middle" className={s.glyphWide}>?</text>
            </g>
          ))}
        </g>
        {/* Act 4 ports: grey sockets where the tools could connect, but don't */}
        {Object.values(PORTS).map(([x, y], i) => (
          <g key={i} data-k={`port${i}`} transform={`translate(${x} ${y})`} opacity={0}>
            <circle cy={4} r={14} className={s.edge} />
            <circle r={14} className={s.portGrey} />
            <circle r={5} className={s.mark} />
          </g>
        ))}

        {/* Act 5 connections. Primary = solid brand blue; secondary = thin, muted */}
        <path data-k="bracket" d="M1100 222V578" className={s.secondaryLine} opacity={0} />
        <text data-k="ctxLabel" x={975} y={378} textAnchor="middle" className={s.miniLabel} opacity={0}>impact context</text>
        {Object.entries(LINES).map(([key, L]) => {
          const [ex, ey] = L.c[3];
          return (
            <g key={key}>
              <path data-k={`line-${key}`} d={cd(L.c)} pathLength={L.kind === 'primary' ? 1 : undefined} className={L.kind === 'primary' ? s.primary : s.secondary} opacity={0} />
              <path data-k={`head-${key}`} d="M-9 -7L5 0L-9 7z" transform={`translate(${ex} ${ey}) rotate(${r1(endAngle(L.c))})`} className={L.kind === 'primary' ? s.blue : s.blueMuted} opacity={0} />
              {L.kind === 'primary' && (
                <g data-k={`sig-${key}`} opacity={0}>
                  <circle r={13} className={s.signalHalo} />
                  <circle r={6.5} className={s.blue} />
                </g>
              )}
            </g>
          );
        })}
        <g data-k="pulse" opacity={0}>
          <circle r={18} className={s.signalHalo} />
          <circle r={8} className={s.blue} />
        </g>

        {/* Web apps: a browser with a little depth */}
        <g data-k="apps" opacity={0}>
          <Shadowed x={APPS.x} y={APPS.y} w={APPS.w} h={APPS.h} rx={22} depth={11}>
            <path d={`M${APPS.x} ${APPS.y + 34}v-12a22 22 0 0 1 22 -22h${APPS.w - 44}a22 22 0 0 1 22 22v12z`} className={s.inset} />
            {[0, 1, 2].map((k) => (
              <circle key={k} cx={APPS.x + 22 + k * 16} cy={APPS.y + 17} r={5.5} className={k === 0 ? s.orange : s.blueMid} />
            ))}
            <rect x={APPS.x + 78} y={APPS.y + 10} width={128} height={14} rx={7} className={s.surfacePlain} />
            <rect x={APPS.x + 18} y={APPS.y + 48} width={112} height={78} rx={14} className={s.blueSoft} />
            <circle cx={APPS.x + 52} cy={APPS.y + 76} r={12} className={s.blue} />
            <path d={`M${APPS.x + 22} ${APPS.y + 122}l34 -26 22 18 18 -12 30 20z`} className={s.blueMid} />
            <rect x={APPS.x + 142} y={APPS.y + 52} width={66} height={10} rx={5} className={s.mark} opacity={0.5} />
            <rect x={APPS.x + 142} y={APPS.y + 70} width={48} height={10} rx={5} className={s.mark} opacity={0.35} />
            <rect x={APPS.x + 142} y={APPS.y + 100} width={66} height={24} rx={12} className={s.blue} />
          </Shadowed>
          <text x={APPS.x + APPS.w / 2} y={APPS.y + APPS.h + 44} textAnchor="middle" className={s.title}>Web apps</text>
        </g>

        {/* Infrastructure: a server stack with an oblique side and top (2.5D) */}
        <g data-k="infra" opacity={0}>
          <ellipse cx={INFRA.x + INFRA.w / 2 + 12} cy={INFRA.y + 3 * (INFRA.unit + INFRA.gap) + 10} rx={120} ry={14} className={s.shade} />
          <path
            d={`M${INFRA.x + INFRA.w} ${INFRA.y}l${INFRA.dx} ${INFRA.dy}v${3 * INFRA.unit + 2 * INFRA.gap}l${-INFRA.dx} ${-INFRA.dy}z`}
            className={s.side}
          />
          <path d={`M${INFRA.x} ${INFRA.y}l${INFRA.dx} ${INFRA.dy}h${INFRA.w}l${-INFRA.dx} ${-INFRA.dy}z`} className={s.inset} />
          {[0, 1, 2].map((k) => {
            const y = INFRA.y + k * (INFRA.unit + INFRA.gap);
            return (
              <g key={k}>
                <rect x={INFRA.x} y={y + 5} width={INFRA.w} height={INFRA.unit} rx={11} className={s.edge} />
                <rect x={INFRA.x} y={y} width={INFRA.w} height={INFRA.unit} rx={11} className={s.surface} />
                <circle cx={INFRA.x + 22} cy={y + 20} r={5.5} className={k === 1 ? s.orange : s.blue} />
                <circle cx={INFRA.x + 40} cy={y + 20} r={5.5} className={s.mark} opacity={0.45} />
                {[0, 1, 2, 3].map((j) => (
                  <rect key={j} x={INFRA.x + 104 + j * 18} y={y + 11} width={8} height={18} rx={4} className={s.inset} />
                ))}
              </g>
            );
          })}
          <g data-k="infraBug">
            <Bug x={INFRA.x + INFRA.w + 4} y={INFRA.y - 8} k={1.1} />
          </g>
          <text x={INFRA.x + INFRA.w / 2 + 6} y={INFRA.y + 3 * (INFRA.unit + INFRA.gap) + 58} textAnchor="middle" className={s.title}>Infrastructure</text>
        </g>

        {/* CyfroSec core: a small platform, faint until Act 5 */}
        <path data-k="coreHint" d={`M${CORE[0]} ${CORE[1] - 26}C${CORE[0]} 680 300 650 300 592`} className={s.hint} opacity={0} />
        <g data-k="core" opacity={0}>
          <ellipse cx={0} cy={24} rx={52} ry={16} className={s.shade} />
          <ellipse cx={0} cy={12} rx={44} ry={15} className={s.edge} />
          <ellipse cx={0} cy={4} rx={44} ry={15} className={s.coreTop} />
          <circle cx={0} cy={SOCKET_Y} r={24} className={s.coreRing} />
          <circle cx={0} cy={SOCKET_Y} r={17} className={s.socket} />
          <text y={50} textAnchor="middle" className={s.coreLabel}>CyfroSec</text>
        </g>

        {/* Findings tray (the list of signals sits on it) */}
        <g data-k="tray" opacity={0}>
          <Shadowed x={TRAY.x} y={TRAY.y} w={TRAY.w} h={TRAY.h} rx={28} depth={12} />
          <text data-k="trayLabel" x={TRAY.x + 4} y={TRAY.y + TRAY.h + 46} className={s.caps}>Findings</text>
        </g>
        <text data-k="findingsLabel" x={TRAY_F[0]} y={TRAY_F[1] + (TRAY.h / 2) * TRAY_S + 40} textAnchor="middle" className={s.cardTitle} opacity={0}>Prioritized findings</text>

        {SIGNALS.map((_, i) => (i === FOCUS ? null : signal(i)))}
        <g data-k="trayItems">
          {PRIO_F.map(([x, y], k) => (
            <rect key={k} data-k={`prio${k}`} x={x - BAR_HALF - 12} y={y - 12} width={BAR_HALF * 2 + 24} height={24} rx={12} className={s.priority} opacity={0} />
          ))}
        </g>

        {/* Act 1 counter */}
        <g data-k="counter" opacity={0}>
          <text data-k="counterNum" x={COUNTER.at[0]} y={COUNTER.at[1]} textAnchor="middle" className={s.counterNum}>0</text>
          <text x={COUNTER.at[0]} y={COUNTER.at[1] + 26} textAnchor="middle" className={s.counterLabel}>
            CVEs in H1 2025
            <tspan data-k="counterExploited" className={s.counterRisk} opacity={0}> · 161 exploited</tspan>
          </text>
        </g>

        {/* Business assets */}
        {ASSETS.map(([x, y], k) => (
          <g key={k} data-k={`asset${k}`} opacity={0}>
            <Building x={x} y={y} kind={k as 0 | 1 | 2} />
          </g>
        ))}
        {CONTEXT_ROWS.map((row, k) => {
          const y1 = 128 + row * 32;
          const [, y2] = ASSETS[k];
          const my = (y1 + y2) / 2;
          return (
            <g key={row}>
              <g data-k={`ctxBroken${k}`} opacity={0}>
                <path d={`M474 ${y1}C560 ${y1} 580 ${my} 622 ${my}`} className={s.beads} />
                <rect x={624} y={my - 14} width={28} height={28} rx={10} className={s.chip} />
                <text x={638} y={my + 5} textAnchor="middle" className={s.glyph}>?</text>
              </g>
            </g>
          );
        })}
        <g data-k="escalationWrap">
          <path data-k="escalation" d={ESCALATION} pathLength={1} className={s.riskPath} opacity={0} />
        </g>
        {/* Act 5: the guidance card the prioritized findings lead to (the people sit inside it) */}
        <g data-k="team" opacity={0}>
          <rect x={TEAM.x + 4} y={TEAM.y + 12} width={TEAM.w} height={TEAM.h} rx={20} className={s.shade} />
          <rect x={TEAM.x} y={TEAM.y + 6} width={TEAM.w} height={TEAM.h} rx={20} className={s.edge} />
          <rect x={TEAM.x} y={TEAM.y} width={TEAM.w} height={TEAM.h} rx={20} className={s.teamCard} />
          <text x={TEAM.x + 124} y={TEAM.y + 48} className={s.cardTitle}>Remediation guidance ready</text>
        </g>
        {EXPERTS.map(([x, y], k) => (
          <g key={k} data-k={`expert${k}`} opacity={0}>
            <Person x={x} y={y} tone={k === 1 ? s.blueMid : s.mark} />
          </g>
        ))}

        {/* Act 3 → 4: the code file */}
        <g data-k="code">
          <rect data-k="panelShadow" x={0} y={0} width={0} height={0} rx={16} opacity={0} className={s.shade} />
          <rect data-k="panelEdge" x={0} y={0} width={0} height={0} rx={16} opacity={0} className={s.edge} />
          <rect data-k="panel" x={0} y={0} width={0} height={0} rx={16} opacity={0} className={s.panel} />
          <g data-k="chrome" opacity={0}>
            <path d={`M${PANEL.x} ${PANEL.y + 28}v-12a16 16 0 0 1 16 -16h${PANEL.w - 32}a16 16 0 0 1 16 16v12z`} className={s.inset} />
            {[0, 1, 2].map((k) => (
              <circle key={k} cx={PANEL.x + 16 + k * 12} cy={PANEL.y + 14} r={4} className={k === 0 ? s.orange : s.blueMid} />
            ))}
            <text x={PANEL.x + PANEL.w - 16} y={PANEL.y + 18.5} textAnchor="end" className={s.titleSmall}>Code</text>
            {CODE_LINES.map((_, j) => (
              <text key={j} x={PANEL.x + 22} y={codeLineY(j) + 2.5} textAnchor="end" className={s.lineNo}>{j + 1}</text>
            ))}
          </g>
          <rect
            data-k="flawBand"
            x={codeLineX(FLAW_LINE) - 12}
            y={codeLineY(FLAW_LINE) - 9}
            width={CODE_LINES[FLAW_LINE].len + 24}
            height={22}
            rx={11}
            className={s.orangeSoft}
            opacity={0}
          />
          {CODE_LINES.map((l, j) =>
            j === FLAW_LINE ? null : (
              <line key={j} data-k={`line${j}`} x1={codeLineX(j)} x2={codeLineX(j)} y1={codeLineY(j)} y2={codeLineY(j)} strokeWidth={8} opacity={0} className={l.ai ? s.codeAi : s.code} />
            ),
          )}
          {CODE_LINES.map((l, j) => {
            if (!l.ai) return null;
            const x = PANEL.x + 32;
            const y = codeLineY(j);
            return <path key={j} data-k={`spark${j}`} d={`M${x} ${y - 5}l1.5 3.5l3.5 1.5l-3.5 1.5l-1.5 3.5l-1.5-3.5l-3.5-1.5l3.5-1.5z`} opacity={0} className={s.blue} />;
          })}
          <g data-k="scan" opacity={0}>
            <rect x={PANEL.x + 1} y={-12} width={PANEL.w - 2} height={12} className={s.scanBand} />
            <rect x={PANEL.x + 1} y={-1.5} width={PANEL.w - 2} height={2} className={s.scanLine} />
          </g>
          <g data-k="tag" opacity={0}>
            <rect x={PANEL.x + 8} y={PANEL.y - 26} width={78} height={18} rx={9} className={s.tag} />
            <path d={`M${PANEL.x + 17} ${PANEL.y - 17}l2.5 2.5l4.5 -5`} className={s.tagCheck} />
            <text x={PANEL.x + 29} y={PANEL.y - 14} className={s.tagText}>Scan passed</text>
          </g>
          <g data-k="bug" opacity={0}>
            <Bug x={0} y={0} k={0.85} />
          </g>
        </g>
        {signal(FOCUS)}
        <text data-k="codeLabel" x={codeCx} y={codeBottom + 50} textAnchor="middle" className={s.title} opacity={0}>Code</text>

        {/* Act 5: calm blue monitoring indicators on the sources (after their findings are collected) */}
        {[CODE_BUG_F, APPS_MON_F, INFRA_BUG_F].map(([x, y], k) => (
          <g key={k} data-k={`mon${k}`} opacity={0}>
            <g transform={`translate(${x} ${y})`}>
              <path d="M0 -19L15 -13V0C15 11 8 18 0 21C-8 18 -15 11 -15 0V-13Z" className={s.monitorBadge} />
              <path d="M-6.5 0.5l4.5 4.5l8.5 -9" className={s.shieldCheck} />
            </g>
          </g>
        ))}

        {/* The collected vulnerabilities, travelling from their systems to the findings panel */}
        {[0, 1].map((k) => (
          <g key={k} data-k={`flyBug${k}`} opacity={0}>
            <Bug x={0} y={0} k={k === 0 ? 0.75 : 1} />
          </g>
        ))}

        {/* "Analysis complete" sits beside CyfroSec: discovery, correlation and prioritization are done */}
        <g data-k="analysisPill" opacity={0}>
          <rect x={570} y={376} width={226} height={38} rx={19} className={s.statusChip} />
          <g transform="translate(592 395) scale(0.68)">
            <path d="M0 -19L15 -13V0C15 11 8 18 0 21C-8 18 -15 11 -15 0V-13Z" className={s.blue} />
            <path d="M-6.5 0.5l4.5 4.5l8.5 -9" className={s.shieldCheckWhite} />
          </g>
          <text x={610} y={401} className={s.statusText}>Analysis complete</text>
        </g>

        {/* The owl: a supporting character, drawn last so it perches on top */}
        <g data-k="owl" opacity={0}>
          <OwlActor ref={owl} idle={idle} />
          <g data-k="bubbleRisk" opacity={0}>
            <circle r={30} className={s.bubbleRisk} />
            <text y={14} textAnchor="middle" className={s.bubbleText}>!</text>
          </g>
          <g data-k="bubbleQuestion" opacity={0}>
            <circle r={30} className={s.bubbleQuestion} />
            <text y={14} textAnchor="middle" className={s.bubbleQuestionText}>?</text>
          </g>


        </g>

        {/* The CyfroSec emblem the owl carries from its chest to the platform */}
        <circle data-k="snapWave" r={20} className={s.snapWave} opacity={0} />
        <g data-k="orb" opacity={0}>
          <circle r={19} className={s.orbBack} />
          <image href={`${BP}/circle_logo.png`} x={-17} y={-17} width={34} height={34} />
        </g>
      </g>
    </svg>
  );
}
