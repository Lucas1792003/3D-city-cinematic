import type { ChunkSignal } from './types';
import { localLoop } from './process';

/**
 * Service Fingerprinting as an inspection lab. Shared by the 3D chunk and its two screens so they never drift.
 *
 * Product facts (cyfro-infra-2026, docs/cyfroagent/scan-data/agent-side-scan-data-inventory.md and
 * routes/scan_results.py): fingerprinting is Trivy run by CyfroAgent over ONE target — a host filesystem (mounted
 * read-only), a container image, a repository or an SBOM. It identifies installed software (OS packages and
 * libraries), matches it against vulnerability advisories, and also reports misconfigurations and secrets.
 * Results are uploaded in shards. It is NOT network port/banner fingerprinting, so nothing here probes ports.
 * Package names, versions and findings are illustrative.
 */
export const TARGETS = [
  { key: 'host', label: 'Host filesystem', note: 'mounted read-only' },
  { key: 'image', label: 'Container image', note: 'image layers' },
] as const;
/** software the inspection identifies on the target: role · name · version, and whether an advisory matches */
export const IDENTIFIED = [
  { role: 'TLS library', name: 'openssl', ver: '3.0.2', hit: true },
  { role: 'Web server', name: 'nginx', ver: '1.24.0', hit: false },
  { role: 'Database', name: 'postgresql', ver: '15.4', hit: false },
  { role: 'Runtime', name: 'python', ver: '3.11.4', hit: true },
  { role: 'SSH server', name: 'openssh', ver: '8.9p1', hit: false },
  { role: 'Logging lib', name: 'log4j-core', ver: '2.14.1', hit: true },
] as const;
export const HIGHLIGHT = 5; // the stand-out match (illustrative)
export const FINDINGS = [{ label: 'Vulnerabilities', n: 12 }, { label: 'Misconfigurations', n: 5 }, { label: 'Secrets', n: 1 }] as const;
export const SHARDS = 3;

/** phases of one inspection (0..1) */
export const FW = { load: [0, 0.12], power: [0.1, 0.2], scan: [0.2, 0.55], match: [0.5, 0.75], classify: [0.72, 0.86], pack: [0.84, 0.97] } as const;
export const idAt = (i: number) => FW.scan[0] + ((FW.scan[1] - FW.scan[0]) * (i + 0.7)) / IDENTIFIED.length;
export const matchAt = (i: number) => FW.match[0] + ((FW.match[1] - FW.match[0]) * (i + 0.6)) / IDENTIFIED.length;

/** story step (i-fingerprint), the selected working pass, or -1 = idle (last result held) */
export function labK(s: ChunkSignal): number {
  if (s.still) return 1;
  const lp = localLoop(s);
  if (lp) return lp.k;
  if (s.beats.includes('i-fingerprint')) return s.progress;
  return -1;
}
/** which target the current run inspects (alternates per run; the story shows the host filesystem) */
export const targetOf = (s: ChunkSignal) => (s.loop ? s.loop.n % 2 : 0);
