import type { ChunkSignal } from './types';
import { localLoop } from './process';

/**
 * CyfroTopology's illustrative graph, shared by the 3D table and the node-details screen so they never drift.
 * Node and edge types follow the product (agents, subnets, assets; risk and agent-coverage overlays come from
 * CyfroAI Insights). Names and addresses are illustrative documentation values.
 *
 * Working sequence (k = 0..1): records arrive → nodes appear tier by tier → relationships draw in → the graph
 * settles → one asset is selected: its links pulse, its path to the agent is highlighted, overlays light.
 */
export type TopoNode = { p: [number, number, number]; r: number; kind: 'agent' | 'subnet' | 'asset'; name: string; tier: 0 | 1 | 2; parent: number };
const ASSET_NAMES = ['db-03', 'app-01', 'ws-22', 'print-4', 'cam-7', 'vm-app-5', 'ws-17', 'api-01', 'backup-2'];
const PER_SUBNET = [3, 2, 2, 2];

export const TOPO_NODES: TopoNode[] = (() => {
  const n: TopoNode[] = [{ p: [0, 0.32, 0], r: 0.13, kind: 'agent', name: 'agent-01', tier: 0, parent: -1 }];
  for (let i = 0; i < 4; i++) { const a = (i * Math.PI) / 2 + Math.PI / 4; n.push({ p: [0.55 * Math.cos(a), 0.08, 0.55 * Math.sin(a)], r: 0.085, kind: 'subnet', name: `192.0.2.${i * 64}/26`, tier: 1, parent: 0 }); }
  let k = 0;
  PER_SUBNET.forEach((cnt, i) => {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    for (let j = 0; j < cnt; j++) {
      const da = (j - (cnt - 1) / 2) * 0.42, rr = 0.98 + (j % 2) * 0.08;
      n.push({ p: [rr * Math.cos(a + da), -0.2 - (j % 2) * 0.1, rr * Math.sin(a + da)], r: 0.05 + ((k * 7) % 3) * 0.008, kind: 'asset', name: ASSET_NAMES[k], tier: 2, parent: 1 + i });
      k++;
    }
  });
  return n;
})();
/** edges: agent–subnet, subnet–asset, and a few asset–asset relationships */
export const TOPO_EDGES: [number, number][] = [
  ...TOPO_NODES.map((nd, i) => [nd.parent, i] as [number, number]).filter(([a]) => a >= 0),
  [5, 8], [9, 11], [7, 13],
];
export const SELECTED = 5; // db-03 (first asset)
export const RISK = [5, 10]; // assets carrying an Insights risk overlay
export const PATH_EDGES = TOPO_EDGES.map(([a, b], i) => ({ a, b, i })).filter(({ a, b }) => (a === TOPO_NODES[SELECTED].parent && b === SELECTED) || (a === 0 && b === TOPO_NODES[SELECTED].parent)).map((e) => e.i);
export const LINKED = TOPO_EDGES.filter(([a, b]) => a === SELECTED || b === SELECTED).map(([a, b]) => (a === SELECTED ? b : a));

/** when each node appears / each edge finishes drawing (fractions of the sequence) */
export const nodeAt = (i: number) => { const nd = TOPO_NODES[i]; return nd.tier === 0 ? 0.12 : nd.tier === 1 ? 0.18 + (i - 1) * 0.03 : 0.28 + (i - 5) * 0.018; };
export const edgeAt = (i: number) => 0.38 + i * 0.017; // tree edges first (agent → subnets → assets), then cross links
export const STAGE = { records: 0.15, relations: 0.66, settled: 0.75, select: 0.78, overlay: 0.86 };

/** The sequence position shown right now: story step (opened / read by the assistant), the selected chunk's
 *  working pass, or -1 = at rest (complete graph, nothing selected). */
export function topoK(s: ChunkSignal): number {
  if (s.still) return 1;
  const lp = localLoop(s);
  if (lp) return lp.k;
  if (s.beats.includes('i-views')) return s.progress;
  if (s.beats.includes('i-ask')) return 1;
  return -1;
}
