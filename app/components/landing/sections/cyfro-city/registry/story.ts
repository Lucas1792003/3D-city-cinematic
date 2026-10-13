import type { ChunkPhase, FlowRun, StoryBeat, StoryState } from './types';

/**
 * The ILLUSTRATIVE walkthrough (docs/design/3d-city/06 §2): a pre-scripted explanation of verified
 * behaviour, never live data. Two independent tracks — infrastructure and code security — because
 * the code shows two separate pipelines. Packets only travel on flows listed in flows.ts.
 * Approval checkpoints always pause first; even cycles show an approval, odd cycles a rejection.
 */

export const INFRA_CYCLE = 36;
export const CODE_CYCLE = 24;

const run = (id: string, a = 0, b = 1, reverse = false, count = 1): FlowRun => ({ id, a, b, reverse, count });
const hold = (id: string, mode: 'wait' | 'discard'): FlowRun => ({ id, a: 0, b: 1, hold: mode });

export const STORY: StoryBeat[] = [
  /* ── Infrastructure track ── */
  { id: 'i-connect', track: 'infra', from: 0, to: 3, caption: 'CyfroAgent keeps its own outbound connection to CyfroSec open. Heartbeats and status travel out.',
    chunks: { 'cyfro-agent': 'emitting', 'scan-control': 'receiving' }, flows: [run('F01', 0, 0.5), run('F01', 0.5, 1)] },
  { id: 'i-assign', track: 'infra', from: 3, to: 6, caption: 'Scan Control finds a due scan and sends it over the agent’s own connection. CyfroSec never connects in.',
    chunks: { 'scan-control': 'emitting', 'cyfro-agent': 'receiving' }, flows: [run('F02', 0.1, 0.9)] },
  { id: 'i-network', track: 'infra', from: 6, to: 8, caption: 'The agent runs Network Discovery against the chosen subnet.',
    chunks: { 'cyfro-agent': 'working', 'network-discovery': 'working', 'customer-infra': 'receiving' }, flows: [run('F23a', 0, 0.35), run('F24a', 0.3, 0.7), run('F23a', 0.7, 1, true)] },
  { id: 'i-assets', track: 'infra', from: 8, to: 10, caption: 'Asset Discovery sweeps the agent’s local subnet for devices.',
    chunks: { 'cyfro-agent': 'working', 'asset-discovery': 'working', 'customer-infra': 'receiving' }, flows: [run('F23b', 0, 0.35), run('F24b', 0.3, 0.7), run('F23b', 0.7, 1, true)] },
  { id: 'i-fingerprint', track: 'infra', from: 10, to: 12, caption: 'Service Fingerprinting reads the host filesystem, read-only, for vulnerabilities, misconfigurations and secrets.',
    chunks: { 'cyfro-agent': 'working', 'service-fingerprinting': 'working', 'customer-infra': 'receiving' }, flows: [run('F23c', 0, 0.35), run('F24c', 0.3, 0.7), run('F23c', 0.7, 1, true)] },
  { id: 'i-upload', track: 'infra', from: 12, to: 15, caption: 'The agent uploads the results to CyfroSec over outbound HTTPS.',
    chunks: { 'cyfro-agent': 'emitting', 'data-ingestion': 'receiving' }, flows: [run('F03', 0, 1, false, 3)] }, // results are uploaded in chunks
  { id: 'i-correlate', track: 'infra', from: 15, to: 19, caption: 'Results are de-duplicated, normalised and correlated into a snapshot, then ranked by fixed rules. No AI is involved.',
    chunks: { 'data-ingestion': 'working' }, flows: [] },
  { id: 'i-fanout', track: 'infra', from: 19, to: 22, caption: 'An AI insight job and a compliance evaluation are queued in parallel, and a “scan completed” notification is sent.',
    chunks: { 'data-ingestion': 'emitting', 'cyfro-ai-insights': 'receiving', 'cyfro-compliance': 'receiving', reporting: 'receiving' }, flows: [run('F04'), run('F05'), run('F08', 0.2, 0.9)] },
  { id: 'i-insights', track: 'infra', from: 22, to: 26, caption: 'CyfroAI Insights asks the shared AI layer to explain the top-ranked risks. The request goes to an external AI provider and back.',
    chunks: { 'cyfro-ai-insights': 'working', 'cyfro-ai-engine': 'working', 'ai-providers': 'working' }, flows: [run('F09', 0, 0.2), run('F12', 0.2, 0.42), run('F12', 0.58, 0.8, true), run('F09', 0.8, 1, true)] }, // the provider answers between 0.42 and 0.58,
  { id: 'i-compliance', track: 'infra', from: 22, to: 26, caption: '',
    chunks: { 'cyfro-compliance': 'working' }, flows: [] },
  { id: 'i-views', track: 'infra', from: 26, to: 28.5, caption: 'Someone opens CyfroTopology and the reports. Both read the same snapshot on demand.',
    chunks: { 'cyfro-topology': 'working', reporting: 'working' }, flows: [run('F06'), run('F07', 0.1, 1)] },
  { id: 'i-ask', track: 'infra', from: 28.5, to: 31, caption: 'Someone asks CyfroAssistant a question. It reads the data it needs with a tool, then uses the shared AI layer to answer.',
    chunks: { 'cyfro-assistant': 'working', 'cyfro-topology': 'emitting', 'cyfro-ai-engine': 'working' }, flows: [run('F14a', 0, 0.35, true), run('F10', 0.35, 0.65), run('F10', 0.65, 1, true)] },
  { id: 'i-propose', track: 'infra', from: 31, to: 33.5, caption: 'CyfroAssistant proposes starting a scan. Actions that change something always wait for a person’s approval.',
    chunks: { 'cyfro-assistant': 'waiting_approval' }, flows: [hold('F15', 'wait')], decision: { checkpoint: 'cyfro-assistant:approval', even: 'approved', odd: 'rejected' } },
  { id: 'i-approved', track: 'infra', from: 33.5, to: 36, caption: 'A person approves, and the action reaches Scan Control.',
    chunks: { 'cyfro-assistant': 'approved', 'scan-control': 'receiving' }, flows: [run('F15', 0, 0.9)], onlyIf: { checkpoint: 'cyfro-assistant:approval', decision: 'approved' } },
  { id: 'i-rejected', track: 'infra', from: 33.5, to: 36, caption: 'A person rejects the request, and the action does not run.',
    chunks: { 'cyfro-assistant': 'rejected' }, flows: [hold('F15', 'discard')], onlyIf: { checkpoint: 'cyfro-assistant:approval', decision: 'rejected' } },

  /* ── Code security track (independent: never routed through CyfroAgent) ── */
  { id: 'c-clone', track: 'code', from: 0, to: 3, caption: 'A CyfroCode scan is requested, and CyfroSec clones the repository from your code hosting.',
    chunks: { 'git-hosting': 'emitting', 'cyfro-code': 'receiving' }, flows: [run('F16', 0, 1, false, 3)] },
  { id: 'c-scan', track: 'code', from: 3, to: 8, caption: 'Code, secret, dependency and infrastructure-as-code scanners run on CyfroSec’s side.',
    chunks: { 'cyfro-code': 'working' }, flows: [] },
  { id: 'c-draft', track: 'code', from: 8, to: 12, caption: 'Findings are explained and a patch is drafted with help from the shared AI layer, then checked to apply cleanly.',
    chunks: { 'cyfro-code': 'working', 'cyfro-ai-engine': 'working', 'ai-providers': 'working' }, flows: [run('F11', 0, 0.2), run('F12', 0.2, 0.42), run('F12', 0.58, 0.8, true), run('F11', 0.8, 1, true)] }, // the provider answers between 0.42 and 0.58,
  { id: 'c-wait', track: 'code', from: 12, to: 16, caption: 'The patch waits for human approval. Nothing is published yet.',
    chunks: { 'cyfro-code': 'waiting_approval' }, flows: [hold('F17', 'wait')], decision: { checkpoint: 'cyfro-code:approval', even: 'approved', odd: 'rejected' } },
  { id: 'c-approved', track: 'code', from: 16, to: 20, caption: 'A person approves. A branch is pushed and a pull request is opened for review.',
    chunks: { 'cyfro-code': 'approved', 'git-hosting': 'receiving' }, flows: [run('F17', 0, 1)], onlyIf: { checkpoint: 'cyfro-code:approval', decision: 'approved' } },
  { id: 'c-rejected', track: 'code', from: 16, to: 20, caption: 'A person rejects the patch. The draft is discarded and nothing is pushed.',
    chunks: { 'cyfro-code': 'rejected' }, flows: [hold('F17', 'discard')], onlyIf: { checkpoint: 'cyfro-code:approval', decision: 'rejected' } },
];

const PRIORITY: Record<ChunkPhase, number> = { idle: 0, receiving: 1, emitting: 2, working: 3, approved: 4, rejected: 4, waiting_approval: 5 };

/** Decision for a checkpoint on a given cycle (from the beat that declares it). */
export function decisionFor(beats: StoryBeat[], checkpoint: string, cycle: number): 'approved' | 'rejected' {
  const d = beats.find((b) => b.decision?.checkpoint === checkpoint)?.decision;
  if (!d) return 'approved';
  return cycle % 2 === 0 ? d.even : d.odd;
}

/** Pure: the story at clock t (seconds). Deterministic, so screenshots and tests are repeatable. */
export function evaluateStory(t: number, beats: StoryBeat[] = STORY, ambient = true): StoryState {
  const cycles = { infra: Math.floor(t / INFRA_CYCLE), code: Math.floor(t / CODE_CYCLE) };
  const local = { infra: t - cycles.infra * INFRA_CYCLE, code: t - cycles.code * CODE_CYCLE };
  const state: StoryState = { infraCycle: cycles.infra, codeCycle: cycles.code, beats: [], chunk: {}, packets: [], decisions: {} };
  for (const b of beats) {
    if (!b.decision) continue;
    const lt = local[b.track];
    state.decisions[b.decision.checkpoint] = lt < b.to ? 'pending' : decisionFor(beats, b.decision.checkpoint, cycles[b.track]);
  }
  for (const b of beats) {
    const lt = local[b.track];
    if (lt < b.from || lt >= b.to) continue;
    if (b.onlyIf && decisionFor(beats, b.onlyIf.checkpoint, cycles[b.track]) !== b.onlyIf.decision) continue;
    state.beats.push(b);
    const k = (lt - b.from) / (b.to - b.from);
    for (const [id, phase] of Object.entries(b.chunks)) {
      const cur = state.chunk[id];
      if (!cur || PRIORITY[phase] >= PRIORITY[cur.phase]) state.chunk[id] = { phase, progress: k };
    }
    for (const r of b.flows) {
      const a = r.a ?? 0, e = r.b ?? 1, u = (k - a) / (e - a);
      if (!(u >= 0 && u < 1)) continue;
      if (r.hold) { state.packets.push({ flow: r.id, u, reverse: !!r.reverse, mode: r.hold, i: 0 }); continue; }
      // a convoy: carriers leave CONVOY_GAP apart and all arrive inside the window
      const n = Math.max(1, r.count ?? 1), span = 1 + CONVOY_GAP * (n - 1);
      for (let i = 0; i < n; i++) {
        const ui = u * span - i * CONVOY_GAP;
        if (ui >= 0 && ui < 1) state.packets.push({ flow: r.id, u: ui, reverse: !!r.reverse, mode: 'travel', i });
      }
    }
  }
  // background traffic on verified, continuous flows (e.g. the agent's heartbeats over its own connection)
  if (ambient) for (const am of AMBIENT) {
    const u = (((t - am.offset) % am.every) + am.every) % am.every / am.dur;
    if (u < 1) state.packets.push({ flow: am.flow, u, reverse: false, mode: 'travel', i: 0 });
  }
  return state;
}

export const CONVOY_GAP = 0.28;
/**
 * Background traffic on flows whose label documents continuous traffic: F01 = the agent's own outbound
 * connection carrying heartbeats and status. The activity director sends it ONCE per pause between workflows
 * (at `offset` seconds into the pause, travelling `dur` seconds); `every` is the longest gap it may repeat at
 * when used on its own. The cadence is illustrative.
 */
export const AMBIENT: { flow: string; every: number; dur: number; offset: number }[] = [
  { flow: 'F01', every: 8, dur: 2.6, offset: 2.5 },
];
