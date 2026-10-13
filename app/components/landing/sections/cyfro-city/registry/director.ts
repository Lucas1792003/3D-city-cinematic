import type { FlowDefinition, StoryBeat, StoryState } from './types';

/**
 * The activity director: the ONE place that decides what the city is doing right now.
 *
 * Priorities (highest wins; lower ones are silenced, not layered on top):
 *  1. user-selected chunk  → a chunk-centred programme: only that chunk's verified story steps (with their own
 *                             carriers), then one pass of its working sequence, then a short rest. Unrelated
 *                             chunks and routes stay quiet.
 *  2. background demo      → overview: ONE workflow at a time — the infrastructure scan, a pause, the code
 *                             security scan, a pause — never both tracks at once.
 *  3. ambient              → during the pauses only the agent's heartbeat (a single carrier) and each chunk's
 *                             low-intensity idle state.
 *
 * Everything is a pure function of the operation clock, so pausing the clock pauses the whole city and
 * screenshots stay repeatable. The CyfroAI Engine reads only the clock and reduced-motion; the director never
 * changes either.
 */

export const REST = { overview: 10, focus: 3 };
/**
 * Story pace: every story step plays this many times slower than its registry timing, so packets travel at a
 * readable speed and the machines that react to them stay in step. Pauses, a selected chunk's own working pass
 * and the CyfroAI Engine (own clock) are not affected.
 */
export const PACE = 1.3;
/** one pass of a chunk's own working sequence when it is selected (seconds; 0 = it has none) */
export const LOOP_SECONDS: Record<string, number> = {
  'scan-control': 9, 'cyfro-agent': 10, 'network-discovery': 8, 'asset-discovery': 12, 'service-fingerprinting': 12,
  'data-ingestion': 10, 'cyfro-ai-insights': 10, 'cyfro-topology': 12, 'cyfro-compliance': 14, 'cyfro-assistant': 10, reporting: 9, 'git-hosting': 8, 'ai-providers': 10,
};
/** the approval room mirrors both checkpoints; it is in no flow, so its programme is the decision beats */
const MIRRORS: Record<string, string[]> = { 'access-plaza': ['i-propose', 'i-approved', 'i-rejected', 'c-wait', 'c-approved', 'c-rejected'] };

export type Directed = {
  st: StoryState;
  mode: 'overview' | 'focus' | 'assembly';
  /** chunks allowed to show story activity this frame (null = all) */
  active: Set<string> | null;
  /** the selected chunk's own working sequence: progress 0..1 and pass number, or null */
  loop: { id: string; k: number; n: number } | null;
};

/**
 * A short demonstration played while a platform assembles (platform-city cinematic): one pass of its own
 * working sequence (`loop`, progress range k), or a slice of the illustrative story (`story`, story time range t)
 * limited to platforms already present. `none`: the platform just settles.
 */
export type DemoSpec = { kind: 'loop'; k: [number, number] } | { kind: 'story'; track: 'infra' | 'code'; t: [number, number] } | { kind: 'none' };

export interface DirectorDeps {
  STORY: StoryBeat[]; FLOWS: FlowDefinition[]; INFRA_CYCLE: number; CODE_CYCLE: number;
  evaluateStory: (t: number, beats?: StoryBeat[], ambient?: boolean) => StoryState;
  AMBIENT: { flow: string; every: number; dur: number; offset: number }[];
}

/** Built with its registry inputs passed in, so it stays a pure module that Node tests can load directly. */
export function createDirector({ STORY, FLOWS, INFRA_CYCLE, CODE_CYCLE, evaluateStory, AMBIENT }: DirectorDeps) {
  const TRACK_BEATS = { infra: STORY.filter((b) => b.track === 'infra'), code: STORY.filter((b) => b.track === 'code') };
  const CYCLE = { infra: INFRA_CYCLE, code: CODE_CYCLE };
  const FLOW = new Map(FLOWS.map((f) => [f.id, f]));
  const touches = (flowId: string, chunk: string) => { const f = FLOW.get(flowId); return !!f && (f.from.chunk === chunk || f.to.chunk === chunk); };
  const EMPTY = (): StoryState => ({ infraCycle: 0, codeCycle: 0, beats: [], chunk: {}, packets: [], decisions: {} });

  /* ── 2 · overview: one workflow at a time, with pauses ── */
  const OV = [
    { track: 'infra' as const, len: INFRA_CYCLE * PACE }, { track: null, len: REST.overview },
    { track: 'code' as const, len: CODE_CYCLE * PACE }, { track: null, len: REST.overview },
  ];
  const OV_PERIOD = OV.reduce((s, x) => s + x.len, 0);
  function overview(t: number): Directed {
    const n = Math.floor(t / OV_PERIOD); let u = t - n * OV_PERIOD;
    for (const seg of OV) {
      if (u < seg.len) {
        if (seg.track) return { st: evaluateStory(n * CYCLE[seg.track] + u / PACE, TRACK_BEATS[seg.track], false), mode: 'overview', active: null, loop: null };
        // a pause: just the agent's heartbeat, once
        const st = EMPTY();
        for (const am of AMBIENT) { const k = (u - am.offset) / (am.dur * PACE); if (k >= 0 && k < 1) st.packets.push({ flow: am.flow, u: k, reverse: false, mode: 'travel', i: 0 }); }
        return { st, mode: 'overview', active: null, loop: null };
      }
      u -= seg.len;
    }
    return { st: EMPTY(), mode: 'overview', active: null, loop: null };
  }

  /* ── 1 · focus: the selected chunk's own programme ── */
  type Seg = { kind: 'beat'; beat: StoryBeat; cycle: number; len: number } | { kind: 'loop' | 'rest'; len: number; cycle: number };
  const programmes = new Map<string, { segs: Seg[]; period: number }>();
  function programme(id: string) {
    let p = programmes.get(id);
    if (p) return p;
    const segs: Seg[] = [];
    const mine = (b: StoryBeat) => (MIRRORS[id] ? MIRRORS[id].includes(b.id) : id in b.chunks || b.flows.some((r) => touches(r.id, id)));
    for (const cycle of [0, 1]) { // even cycle shows the approval, odd the rejection (where the chunk has a checkpoint)
      for (const track of ['infra', 'code'] as const) {
        for (const b of TRACK_BEATS[track]) {
          if (!mine(b)) continue;
          if (b.onlyIf && (cycle % 2 === 0 ? 'approved' : 'rejected') !== b.onlyIf.decision) continue;
          segs.push({ kind: 'beat', beat: b, cycle, len: (b.to - b.from) * PACE });
        }
      }
      if (LOOP_SECONDS[id]) segs.push({ kind: 'loop', len: LOOP_SECONDS[id], cycle });
      segs.push({ kind: 'rest', len: REST.focus, cycle });
    }
    p = { segs, period: segs.reduce((s, x) => s + x.len, 0) };
    programmes.set(id, p);
    return p;
  }
  function focus(id: string, t: number): Directed {
    const p = programme(id), n = Math.floor(t / p.period);
    let u = t - n * p.period;
    for (const seg of p.segs) {
      if (u < seg.len) {
        if (seg.kind !== 'beat') return { st: EMPTY(), mode: 'focus', active: new Set([id]), loop: seg.kind === 'loop' ? { id, k: u / seg.len, n: n * 2 + seg.cycle } : null };
        const b = seg.beat, st = evaluateStory(seg.cycle * CYCLE[b.track] + b.from + u / PACE, TRACK_BEATS[b.track], false);
        return { st: relevantTo(st, id, b), mode: 'focus', active: activeSet(st, id), loop: null };
      }
      u -= seg.len;
    }
    return { st: EMPTY(), mode: 'focus', active: new Set([id]), loop: null };
  }
  /** keep only carriers on routes that touch the selected chunk (approval mirrors keep their decision beats) */
  function relevantTo(st: StoryState, id: string, b: StoryBeat): StoryState {
    st.packets = st.packets.filter((p) => touches(p.flow, id) || (MIRRORS[id] && b.flows.some((r) => r.id === p.flow)));
    return st;
  }
  function activeSet(st: StoryState, id: string) {
    const s = new Set([id, ...(MIRRORS[id] ? ['cyfro-assistant', 'cyfro-code'] : [])]);
    for (const p of st.packets) { const f = FLOW.get(p.flow); if (f) { s.add(f.from.chunk); s.add(f.to.chunk); } }
    return s;
  }

  /* ── 0 · assembly cinematic: only the arriving platform demonstrates; everything else is calm ── */
  function assembly(id: string, spec: DemoSpec, u: number, present: (chunk: string) => boolean): Directed {
    if (spec.kind === 'loop') return { st: EMPTY(), mode: 'assembly', active: new Set([id]), loop: { id, k: spec.k[0] + (spec.k[1] - spec.k[0]) * u, n: 0 } };
    if (spec.kind === 'none') return { st: EMPTY(), mode: 'assembly', active: new Set([id]), loop: null };
    const st = evaluateStory(spec.t[0] + (spec.t[1] - spec.t[0]) * u, TRACK_BEATS[spec.track], false);
    // only steps that involve the arriving platform, only carriers between platforms that already exist
    st.beats = st.beats.filter((b) => id in b.chunks || b.flows.some((r) => touches(r.id, id)));
    const keep = new Set(st.beats.flatMap((b) => b.flows.map((r) => r.id)));
    st.packets = st.packets.filter((p) => { const f = FLOW.get(p.flow); return !!f && keep.has(p.flow) && present(f.from.chunk) && present(f.to.chunk); });
    const chunk: StoryState['chunk'] = {};
    for (const b of st.beats) for (const cid of Object.keys(b.chunks)) if (present(cid) && st.chunk[cid]) chunk[cid] = st.chunk[cid];
    st.chunk = chunk;
    return { st, mode: 'assembly', active: new Set([id, ...Object.keys(chunk)]), loop: null };
  }

  function direct(o: { t: number; selected: string | null }): Directed {
    if (o.selected) return focus(o.selected, o.t);
    return overview(o.t);
  }
  return { direct, assembly, OV_PERIOD, programme };
}
export type Director = ReturnType<typeof createDirector>;
