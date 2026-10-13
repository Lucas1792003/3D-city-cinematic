import type { ChunkSignal } from './types';
import { localLoop, seg } from './process';

/**
 * CyfroAgent's run state, shared by the 3D chunk and its status screen so they never drift.
 *
 * Grounded in the backend's agent contract and the agent-side inventory (cyfro-infra-2026:
 * `routes/agent_control.py`, `routes/scan_results.py`, `docs/cyfroagent/scan-data/agent-side-scan-data-inventory.md`):
 *  - the agent enrolls once, then opens its OWN outbound control stream (`GET /me/control-stream`, SSE) and
 *    posts heartbeats (`/me/heartbeat`); signed commands arrive over that stream and are acknowledged
 *    (`/me/commands/{id}/ack`, `/output`) — CyfroSec never connects in;
 *  - three scan families: port scan (Nmap), asset discovery (Nmap host discovery + passive ARP/LLDP/DHCP/mDNS
 *    observations, probes, banners), fingerprinting (Trivy over a host filesystem, container image,
 *    repository or SBOM: vulnerabilities, misconfigurations, secrets);
 *  - results go to family-specific upload endpoints; fingerprint results can arrive as shards
 *    (`/fingerprint/uploads/{id}/shards`); failed deliveries are kept locally and retried.
 * The agent's own source is not available to this project, so finer on-host behaviour is not shown.
 */
export const FAMILIES = [
  { key: 'port', label: 'Port scan', tool: 'Nmap', beat: 'i-network', color: '#039be0' },
  { key: 'asset', label: 'Asset discovery', tool: 'Nmap + passive', beat: 'i-assets', color: '#bfefff' },
  { key: 'fp', label: 'Fingerprinting', tool: 'Trivy', beat: 'i-fingerprint', color: '#5caa83' },
] as const;
export const SHARDS = 3; // fingerprint results delivered in shards (illustrative count)
export type AgentStage = 'waiting' | 'connected' | 'command' | 'scan' | 'collect' | 'upload' | 'complete';
export const STAGE_LABEL: Record<AgentStage, string> = {
  waiting: 'Waiting for work', connected: 'Connected · heartbeat', command: 'Signed command received', scan: 'Scan running',
  collect: 'Collecting results', upload: 'Uploading results', complete: 'Run complete',
};
export type AgentState = { stage: AgentStage; fam: number; k: number; done: number; shards: number; upload: number; still: boolean };

/** Where the agent is in its run: story steps, the selected working pass, or waiting. */
export function agentState(s: ChunkSignal): AgentState {
  const st: AgentState = { stage: 'waiting', fam: -1, k: 0, done: 0, shards: 0, upload: 0, still: s.still };
  if (s.still) return { ...st, stage: 'complete', done: 3, shards: SHARDS, upload: 1 };
  const lp = localLoop(s);
  if (lp) { // rehearsal: command → three scans (run, then collect) → upload → complete
    const k = lp.k;
    if (k < 0.1) return { ...st, stage: 'command', k: k / 0.1 };
    if (k < 0.7) { const f = Math.min(2, Math.floor((k - 0.1) / 0.2)), u = (k - 0.1 - f * 0.2) / 0.2; return scanState(st, f, u); }
    if (k < 0.9) return { ...st, stage: 'upload', k: (k - 0.7) / 0.2, done: 3, shards: SHARDS, upload: (k - 0.7) / 0.2 };
    return { ...st, stage: 'complete', k: (k - 0.9) / 0.1, done: 3, shards: SHARDS, upload: 1 };
  }
  const b = s.beats;
  if (b.includes('i-connect')) return { ...st, stage: 'connected', k: s.progress };
  if (b.includes('i-assign')) return { ...st, stage: 'command', k: s.progress };
  const f = FAMILIES.findIndex((x) => b.includes(x.beat));
  if (f >= 0) return scanState(st, f, s.progress);
  if (b.includes('i-upload')) return { ...st, stage: 'upload', k: s.progress, done: 3, shards: SHARDS, upload: s.progress };
  if (b.includes('i-correlate')) return { ...st, stage: 'complete', k: s.progress, done: 3, shards: SHARDS, upload: 1 };
  return st;
}
function scanState(st: AgentState, f: number, u: number): AgentState {
  const collect = u >= 0.72;
  return { ...st, stage: collect ? 'collect' : 'scan', fam: f, k: collect ? (u - 0.72) / 0.28 : u / 0.72, done: f, shards: f === 2 ? Math.floor(seg(u, 0.2, 0.9) * SHARDS + 0.0001) : f > 2 ? SHARDS : 0 };
}
