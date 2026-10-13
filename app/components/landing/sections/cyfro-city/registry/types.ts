/**
 * CyfroSec 3D City — registry types (see docs/design/3d-city/05-chunk-design-system.md).
 * Data files in this folder only use `import type` from here, so they stay loadable by `node --test`.
 */

/** Internal lifecycle. Visitors never see the difference between `planned` and `in_development`. */
export type Lifecycle = 'planned' | 'in_development' | 'available' | 'deprecated';
/** What visitors may see. `mystery` = black reserved platform with "? — Coming Soon" only. */
export type PublicVisibility = 'full' | 'mystery';
/** A = feature chunk, D = environment/external pad (02-feature-inventory.md). */
export type ChunkClass = 'feature' | 'environment' | 'reserved';
export type DistrictId = 'customer' | 'control' | 'code' | 'ai' | 'operations' | 'edge' | 'external';
export type Side = 'n' | 'e' | 's' | 'w';
export type PerfTier = 'hero' | 'standard' | 'light';
/** How strongly the source code backs a statement or connection. */
export type Evidence = 'code' | 'documented';

export interface PortDef {
  id: string;
  side: Side;
  /** position along the edge, −0.4..0.4 of the footprint (0 = middle) */
  offset?: number;
}

export interface HotspotDef {
  id: string;
  name: string;
  summary: string;
  /** label anchor, local to the chunk origin (y = height above the chunk deck top) */
  at: [number, number, number];
}

export interface ChunkCopy {
  name: string;
  /** one sentence */
  summary: string;
  /** 2–4 plain-language sentences, checked against source evidence */
  details: string;
  /** what the 3D objects depict (list view / screen readers) */
  depicts: string;
  /** where the claim comes from (shown in the panel as "Evidence") */
  evidenceNote: string;
  /** optional compact name for overview labels (the full name is used everywhere else) */
  short?: string;
}

export interface CameraDef {
  /** local target relative to the chunk centre */
  target: [number, number, number];
  /** azimuth in degrees (0 = looking from +Z toward −Z) */
  azimuth: number;
  elevation: number;
  distance: number;
}

export interface ChunkDefinition {
  id: string;
  class: ChunkClass;
  district: DistrictId;
  grid: { x: number; z: number };
  footprint: { w: number; d: number };
  lifecycle: Lifecycle;
  publicVisibility: PublicVisibility;
  /** visual builder key (chunks/index.ts) */
  builder: string;
  perfTier: PerfTier;
  /** null for reserved chunks: they use the shared MYSTERY_COPY */
  copy: ChunkCopy | null;
  ports: PortDef[];
  hotspots: HotspotDef[];
  camera: CameraDef;
  /** chunk ids this chunk depends on to do its job (verified relationships, not visual neighbours) */
  dependsOn: string[];
  /** public product page, when one exists */
  href?: string;
}

export type FlowKind = 'DATA' | 'CTRL' | 'JOB' | 'EVT' | 'APPR' | 'AI' | 'RPT' | 'EXT';
export type FlowDisplay = 'animate' | 'static' | 'hidden';

export interface FlowDefinition {
  id: string;
  from: { chunk: string; port: string };
  to: { chunk: string; port: string };
  kind: FlowKind;
  /** 'code' = traced in the product source; 'documented' = agent-side behaviour from documentation only */
  evidence: Evidence;
  /** pointer into docs/design/3d-city/03-workflow-map.md */
  ref: string;
  display: FlowDisplay;
  /** short, public explanation */
  label: string;
  /** this flow travels inside another flow's pipe (F02 rides F01: the agent opened the connection) */
  carrier?: string;
  /** drawn as a dotted in-process link (shared library call, not a network hop) */
  inProcess?: boolean;
  /** flows that leave the CyfroSec platform */
  external?: boolean;
  /** approval checkpoint that must be passed before this flow may animate */
  gatedBy?: string;
  track: 'infra' | 'code' | 'shared';
}

export interface DistrictDefinition {
  id: DistrictId;
  name: string;
  /** physical boundary only where one exists in the real architecture */
  boundary: 'wall' | 'none' | 'detached';
  summary: string;
}

/* ── Illustrative story ── */
export type ChunkPhase = 'idle' | 'receiving' | 'working' | 'emitting' | 'waiting_approval' | 'approved' | 'rejected';

export interface StoryBeat {
  id: string;
  track: 'infra' | 'code';
  /** seconds within the track's cycle */
  from: number;
  to: number;
  caption: string;
  /** chunk phases during this beat */
  chunks: Record<string, ChunkPhase>;
  /** packets that travel during this beat; a/b = sub-window of the beat (0..1), reverse = response */
  flows: FlowRun[];
  /** decision beats: what happens on even / odd cycles */
  decision?: { checkpoint: string; even: 'approved' | 'rejected'; odd: 'approved' | 'rejected' };
  /** only shown on cycles where the named checkpoint's decision equals this value */
  onlyIf?: { checkpoint: string; decision: 'approved' | 'rejected' };
}

/**
 * One flow's carriers during a beat. `count` = a convoy of carriers on the same route (e.g. a chunked upload).
 * `hold`: the carrier is loaded but does NOT travel — 'wait' = held at the source dock until a person decides;
 * 'discard' = the held carrier is withdrawn (rejected). Only travelling runs move data.
 */
export interface FlowRun { id: string; a?: number; b?: number; reverse?: boolean; count?: number; hold?: 'wait' | 'discard' }
export type PacketMode = 'travel' | 'wait' | 'discard';

export interface StoryState {
  infraCycle: number;
  codeCycle: number;
  /** active beats (one per track at most) */
  beats: StoryBeat[];
  chunk: Record<string, { phase: ChunkPhase; progress: number }>;
  /** packets in flight this instant */
  packets: { flow: string; u: number; reverse: boolean; mode: PacketMode; /** index within a convoy */ i: number }[];
  decisions: Record<string, 'approved' | 'rejected' | 'pending'>;
}
