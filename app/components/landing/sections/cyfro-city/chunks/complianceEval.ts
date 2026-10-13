import type { ChunkSignal } from './types';
import { localLoop } from './process';

/**
 * CyfroCompliance's illustrative evaluation, shared by the 3D chunk and the audit screen so they never drift.
 *
 * Grounded in the product (cyfro-infra-2026, backend `services/compliance/evaluation.py`, `scheduler.py`,
 * `cyfro_share/compliance/mapping.py`):
 *  - frameworks: GDPR, SOC 2, NIST CSF, CCPA/CPRA;
 *  - evidence: the correlated scan snapshot — assets, services/ports, vulnerabilities (and relationships,
 *    agent test runs); evaluation runs after correlation (feature-gated) or on a manual refresh;
 *  - control status: passing / partial / failing, `not_evaluable` (no mapped check or incomplete evidence) and
 *    controls that need attestation or are manual-only (a person reviews them — never auto-passed);
 *  - score: the mean over scored technical controls (passing 100, partial 50, failing 0) — not a certification;
 *  - checks are deterministic (AI only helps build control catalogs, never decides a control).
 * Outcomes below are illustrative sample values.
 */
export const FRAMEWORKS = ['GDPR', 'SOC 2', 'NIST CSF', 'CCPA/CPRA'];
export type CStatus = 'passing' | 'partial' | 'failing' | 'not_evaluable' | 'review';
const P = 'passing', A = 'partial', F = 'failing', N = 'not_evaluable', R = 'review';
/** 3 control groups × 4 controls per framework */
export const OUTCOMES: CStatus[][] = [
  [P, P, P, A, P, R, P, P, N, P, A, P],
  [P, P, A, P, F, P, P, R, P, P, N, P],
  [P, A, P, P, P, P, R, P, P, F, P, N],
  [P, P, P, R, A, P, P, P, P, N, P, P],
];
export const STATUS_COLOR: Record<CStatus, string> = { passing: '#4fbf8b', partial: '#f2b24d', failing: '#ff6a4d', not_evaluable: '#8a97a3', review: '#a9b8ff' };
export const EVIDENCE = ['Assets', 'Services & ports', 'Vulnerabilities', 'Agent test runs'];
export const EVIDENCE_COLOR = ['#bfefff', '#33afdf', '#fe904d', '#5caa83'];
/** the framework shown on the gauge and the audit screen */
export const FEATURED = 1;
export function counts(f: number) {
  const c = { passing: 0, partial: 0, failing: 0, not_evaluable: 0, review: 0 } as Record<CStatus, number>;
  for (const s of OUTCOMES[f]) c[s]++;
  return c;
}
/** product formula: mean over scored technical controls (passing 100, partial 50, failing 0) */
export function score(f: number) {
  const c = counts(f), n = c.passing + c.partial + c.failing;
  return n ? Math.round((c.passing * 100 + c.partial * 50) / n) : 0;
}

/** sequence windows (0..1): evidence in → records sorted → controls evaluated → score → results */
export const CW = { arrive: [0, 0.12], records: [0.1, 0.32], evaluate: [0.32, 0.76], score: [0.76, 0.86], results: [0.86, 1] } as const;
/** when the runner reaches framework f (its column resolves during that quarter of the evaluation window) */
export const evalAt = (f: number, i: number) => { const [a, b] = CW.evaluate, q = (b - a) / 4; return a + q * f + (q * 0.9 * (i + 0.5)) / 12; };

/** Story: the F05 job arrives during the fan-out, the evaluation runs in i-compliance. Selected: the director's
 *  working pass. Otherwise -1 = at rest (last results shown, nothing moving). */
export function complianceK(s: ChunkSignal): number {
  if (s.still) return 1;
  const lp = localLoop(s);
  if (lp) return lp.k;
  // the job packet unloads at the end of the fan-out step, so evidence handling starts with i-compliance
  if (s.beats.includes('i-fanout') && s.phase === 'receiving') return s.progress * 0.1;
  if (s.beats.includes('i-compliance')) return 0.1 + s.progress * 0.9;
  return -1;
}
