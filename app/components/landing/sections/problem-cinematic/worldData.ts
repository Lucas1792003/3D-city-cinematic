import { rand } from './timeline';

/**
 * The persistent world, in "lens" units (a 1000 × 700 frame at zoom 1). Every object
 * keeps its identity for the whole story; acts only move, stretch, recolour or dim it.
 */

/* ── Acts: uneven on purpose, so the big transformations get room ── */

export const ACTS = {
  alert: [0, 0.14],
  context: [0.14, 0.32],
  code: [0.32, 0.54],
  visibility: [0.54, 0.68],
  cyfrosec: [0.68, 1],
} as const;

/* ── The three tools. Alerts stream in from them in Act 1 (off camera); the Act 4
      pull-back reveals them as islands. ── */

export type Source = 'code' | 'apps' | 'infra';
export const ISLANDS: Record<Source, { c: [number, number]; label: string }> = {
  code: { c: [-200, 360], label: 'Code' },
  apps: { c: [500, -170], label: 'Web apps' },
  infra: { c: [1200, 360], label: 'Infrastructure' },
};

/* ── Alerts → findings ── */

export const SIGNAL_COUNT = 84;
export const EXPLOITED = [17, 46, 71];
export const FOCUS = 46; // the exploited finding the camera dives into
export const PRIORITY = [17, 71]; // re-sorted to the top in Act 5 (the focus one is in the code island)

const SOURCES: Source[] = ['code', 'apps', 'infra'];
export type Signal = {
  source: Source;
  inbox: [number, number]; // Act 1: where it lands in the crowded inbox
  list: [number, number]; // Act 2: finding bar centre
  spawn: number;
  stagger: number;
  exploited: boolean;
};

export const SIGNALS: Signal[] = Array.from({ length: SIGNAL_COUNT }, (_, i) => {
  const ic = i % 12;
  const ir = Math.floor(i / 12);
  const lr = Math.floor(i / 6);
  const lc = i % 6;
  return {
    source: SOURCES[i % 3],
    inbox: [235 + ic * 48 + (rand(i, 1) - 0.5) * 16, 175 + ir * 50 + (rand(i, 2) - 0.5) * 16],
    list: [124 + lc * 60, 128 + lr * 32],
    spawn: 0.012 + (i / SIGNAL_COUNT) * 0.095 + rand(i, 3) * 0.008,
    stagger: (lr / 14) * 0.03,
    exploited: EXPLOITED.includes(i),
  };
});
export const BAR_HALF = 22;

/* ── Act 1 evidence counter (the real H1 2025 figures) ── */

export const COUNTER = { at: [500, 92] as [number, number], total: 23667, exploited: 161 };

/* ── Act 2: assets, missing context, escalation ── */

export const ASSETS: [number, number][] = [
  [800, 200],
  [800, 350],
  [800, 500],
];
export const CONTEXT_ROWS = [2, 7, 11];
export const EXPERTS: [number, number][] = [
  [770, 640],
  [806, 640],
  [842, 640],
];
export const ESCALATION = 'M260 566C300 650 560 640 742 640';

/* ── CyfroSec core: faintly present from Act 1, fully revealed in Act 5 ── */

export const CORE: [number, number] = [500, 770];

/* ── Act 3: code file grown from the focus finding ── */

export const PANEL = { x: 330, y: 262, w: 300, h: 200 };
export const CODE_LINES = [
  { len: 120, indent: 0 },
  { len: 170, indent: 16 },
  { len: 140, indent: 16 },
  { len: 196, indent: 32, ai: true },
  { len: 178, indent: 32, ai: true, flaw: true }, // the focus finding settles here
  { len: 92, indent: 32, ai: true },
  { len: 160, indent: 16 },
  { len: 128, indent: 16 },
  { len: 70, indent: 0 },
];
export const FLAW_LINE = CODE_LINES.findIndex((l) => l.flaw);
export const codeLineY = (j: number) => PANEL.y + 44 + j * 17;
export const codeLineX = (j: number) => PANEL.x + 46 + CODE_LINES[j].indent;
