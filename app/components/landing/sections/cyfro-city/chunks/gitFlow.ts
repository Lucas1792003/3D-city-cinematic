import type { ChunkSignal } from './types';
import { localLoop } from './process';

/**
 * "Your code hosting": the external repository provider beside CyfroCode. Shared by the 3D pad and its
 * screens so they never drift.
 *
 * Supported providers: GitHub (GitHub App) and Bitbucket (Bitbucket integration). CyfroCode clones the
 * repository when a scan is requested (F16); a branch and pull request reach the provider ONLY after a person
 * approves the patch (F17). The provider never scans, drafts or merges anything here, and a PR is not a merge.
 * Repository names, branches and commit ids are illustrative.
 *
 * Provider marks: path data from Simple Icons (CC0-1.0, v16.35.0; a few number runs written with explicit
 * separators so they cannot read as addresses — same shapes) — trademarks of GitHub, Inc. and
 * Atlassian, shown only to name the supported integrations.
 */
export const PROVIDERS = [
  { key: 'github', name: 'GitHub', via: 'GitHub App', color: { dark: '#ffffff', light: '#181717' },
    path: 'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385 0.6 0.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998 .108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765 .84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42 .36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69 .825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12' },
  { key: 'bitbucket', name: 'Bitbucket', via: 'Bitbucket integration', color: { dark: '#2684ff', light: '#0052cc' },
    path: 'M.778 1.213a.768.768 0 00-.768.892l3.263 19.81c.084.5.515 .868 1.022.873H19.95a.772.772 0 00.77-.646l3.27-20.03a.768.768 0 00-.768-.891zM14.52 15.53H9.522L8.17 8.466h7.561z' },
] as const;
export const REPO = { name: 'example-org/web-app', branch: 'main', head: '7c1e9a2', fix: 'cyfrocode/fix-weak-tls' };

export type GitStage = 'ready' | 'activity' | 'clone' | 'scanning' | 'proposed' | 'waiting' | 'pr' | 'rejected';
export type GitState = { stage: GitStage; k: number; provider: number; prOpen: boolean };

/** which provider the illustrative repository lives on: alternates between runs */
export const providerAt = (t: number) => ((Math.floor(t / 47) % 2) + 2) % 2;

export function gitState(t: number, s: ChunkSignal): GitState {
  const provider = s.still ? 0 : providerAt(t);
  const st: GitState = { stage: 'ready', k: 0, provider, prOpen: false };
  if (s.still) return { ...st, stage: 'pr', k: 1, prOpen: true };
  const lp = localLoop(s);
  if (lp) return { ...st, stage: 'activity', k: lp.k };
  const b = s.beats, lane = s.approvals.code;
  if (b.includes('c-clone')) return { ...st, stage: 'clone', k: s.progress };
  if (b.includes('c-approved') || lane.state === 'approved') {
    const k = b.includes('c-approved') ? s.progress : 1;
    return { ...st, stage: 'pr', k, prOpen: k > 0.9 || s.arrive > 0.1 }; // the PR exists once the branch has arrived
  }
  if (b.includes('c-rejected') || lane.state === 'rejected') return { ...st, stage: 'rejected', k: s.progress };
  if (lane.state === 'pending' || b.includes('c-wait')) return { ...st, stage: 'waiting', k: s.progress };
  if (b.includes('c-draft')) return { ...st, stage: 'proposed', k: s.progress };
  if (b.includes('c-scan')) return { ...st, stage: 'scanning', k: s.progress };
  return st;
}
