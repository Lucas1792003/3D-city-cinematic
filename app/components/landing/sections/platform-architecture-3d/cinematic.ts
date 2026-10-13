/**
 * The automatic camera tour: six acts on a time clock (≈20 s), looping seamlessly.
 * Objects never move; only the camera does. Scroll never drives this; it only decides whether
 * the scene is running (visibility).
 */
type V3 = [number, number, number];
export type Pose = { pos: V3; target: V3 };
export type Act = { id: number; name: string; dur: number; pose: Pose; focus: string[] };

const OVERVIEW: Pose = { pos: [10.8, 13.5, 19], target: [0, 0.5, 0] };

export const ACTS: Act[] = [
  // Establishing: from the overview, drift slowly toward the left
  { id: 1, name: 'Establishing the world', dur: 2, pose: { pos: [8.6, 12.6, 18.4], target: [-1.4, 0.5, 0] }, focus: ['sources', 'processing', 'outputs'] },
  { id: 2, name: 'Data discovery', dur: 3, pose: { pos: [-1.2, 8.6, 11.6], target: [-6, 1.2, 0.2] }, focus: ['ai-infra', 'network', 'code-src'] },
  { id: 3, name: 'Data ingestion', dur: 3, pose: { pos: [2.4, 6.6, 10.2], target: [-0.2, 1, 1.4] }, focus: ['agent', 'ingestion'] },
  { id: 4, name: 'CyfroAI analysis', dur: 4, pose: { pos: [3.2, 4.8, 7.6], target: [0.3, 1.5, -0.6] }, focus: ['engine', 'agent', 'ingestion'] },
  { id: 5, name: 'Outputs', dur: 5, pose: { pos: [7.2, 10.8, 10.6], target: [6, 1.5, -0.5] }, focus: ['insights', 'assistant', 'code-out', 'compliance', 'dashboards'] },
  // Unified overview: ends exactly on the pose the next cycle starts from
  { id: 6, name: 'Unified platform', dur: 3, pose: OVERVIEW, focus: ['sources', 'processing', 'outputs'] },
];
export const CYCLE = ACTS.reduce((s, a) => s + a.dur, 0);
/** When the first cycle's data reaches Outputs (the monitors switch on then). */
export const OUTPUTS_AT = ACTS.slice(0, 4).reduce((s, a) => s + a.dur, 0);
/** First visit only: a slightly higher reveal before the establishing drift. */
const REVEAL: Pose = { pos: [13.4, 17.5, 23.5], target: [0, 0.3, 0] };

/** Poses the tabs move to (manual exploration). */
export type TabView = 'overview' | 'sources' | 'processing' | 'outputs';
export const TAB_POSES: Record<TabView, Pose> = {
  overview: OVERVIEW,
  sources: ACTS[1].pose,
  processing: { pos: [2.8, 8.4, 11.2], target: [0, 1.5, 0.4] },
  outputs: ACTS[4].pose,
};
export const TAB_FOCUS: Record<TabView, string[]> = {
  overview: ['sources', 'processing', 'outputs'],
  sources: ACTS[1].focus,
  processing: ['agent', 'ingestion', 'engine'],
  outputs: ACTS[4].focus,
};

export const smooth = (t: number) => { const x = Math.min(1, Math.max(0, t)); return x * x * (3 - 2 * x); };
export const mix = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** Camera pose for tour time T (seconds). Each act travels for ~65% of its time, then holds. */
export function sampleTour(T: number): Pose & { act: Act } {
  const first = T < CYCLE;
  let c = ((T % CYCLE) + CYCLE) % CYCLE;
  let i = 0;
  while (i < ACTS.length - 1 && c >= ACTS[i].dur) { c -= ACTS[i].dur; i++; }
  const act = ACTS[i];
  const prev = i === 0 ? (first ? REVEAL : ACTS[ACTS.length - 1].pose) : ACTS[i - 1].pose;
  const k = smooth(c / (act.dur * 0.65));
  return { pos: mix(prev.pos, act.pose.pos, k), target: mix(prev.target, act.pose.target, k), act };
}
