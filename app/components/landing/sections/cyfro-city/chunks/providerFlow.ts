import type { ChunkSignal } from './types';

/**
 * External AI provider as a request gateway. Shared by the 3D pad and its status screen so they never drift.
 *
 * Product facts: CyfroAI Insights, CyfroAssistant and CyfroCode send AI requests through the shared AI layer
 * to an external model provider (the F12 link) and receive a response. Deliberately GENERIC: no provider name
 * or logo, no region, hosting or residency claim, no provider topology and no storage of responses — the
 * racks, gateway and status wording are illustrative.
 * Import-free (type-only imports) so the sequence can be tested under plain Node.
 */
const seg = (k: number, a: number, b: number) => Math.min(1, Math.max(0, (k - a) / (b - a)));
export type ProviderStage = 'idle' | 'queued' | 'ready' | 'active' | 'prepared' | 'sent';
export const STAGES: Exclude<ProviderStage, 'idle'>[] = ['queued', 'ready', 'active', 'prepared', 'sent'];
export const STAGE_LABEL: Record<ProviderStage, string> = {
  idle: 'Waiting for requests', queued: 'Request queued', ready: 'Provider ready', active: 'Model active', prepared: 'Response prepared', sent: 'Response sent',
};
/** one exchange, 0..1: request docks and queues → gateway opens → the model runs → response prepared → response leaves */
export const PX = { queued: [0, 0.15], ready: [0.15, 0.3], active: [0.3, 0.62], prepared: [0.62, 0.76], sent: [0.76, 1] } as const;
/** the request token's trip from the gateway to the compute node, and the response's trip back */
export const TRIP = { in: [0.17, 0.32], out: [0.62, 0.76] } as const;
export const NODE = 1; // the compute node that answers (the middle rack; illustrative)

/** story step → exchange progress. F12 brings the request in until 0.42 and takes the response out from 0.58. */
const STORY_MAP: [number, number][] = [[0.36, 0], [0.42, 0.15], [0.58, 0.76], [0.8, 1]];
function fromStory(p: number): number {
  if (p < STORY_MAP[0][0]) return -1;
  for (let i = 1; i < STORY_MAP.length; i++) {
    const [a, x0] = STORY_MAP[i - 1], [b, x1] = STORY_MAP[i];
    if (p < b) return x0 + (x1 - x0) * seg(p, a, b);
  }
  return 1;
}
const BEATS = ['i-insights', 'c-draft'];

export type ProviderState = { stage: ProviderStage; x: number; inbound: boolean };
export const stageAt = (x: number): ProviderStage => (x < 0 ? 'idle' : STAGES.find((st) => x < PX[st][1]) ?? 'sent');

/** the selected working pass, the story's AI request, a still frame, or idle */
export function providerState(s: ChunkSignal): ProviderState {
  if (s.still) return { stage: 'active', x: 0.45, inbound: false };
  const lp = s.loop; // the still frame returned above, so this is localLoop(s)
  let x = -1, inbound = false;
  if (lp) x = lp.k < 0.06 ? -1 : Math.min(1, (lp.k - 0.06) / 0.88);
  else if (BEATS.some((b) => s.beats.includes(b))) { x = fromStory(s.progress); inbound = x < 0 && s.progress >= 0.2; }
  return { stage: stageAt(x), x, inbound };
}
