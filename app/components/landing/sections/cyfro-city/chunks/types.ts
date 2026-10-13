import type { Group, Material, MeshStandardMaterial, Texture, Vector3, WebGLRenderer } from 'three';
import type { Kit } from '../kit/parts';
import type { CityMaterials } from '../kit/materials';
import type { ChunkDefinition, ChunkPhase } from '../registry/types';

/** Everything a chunk builder may use. Builders never import other chunks. */
export interface ChunkCtx {
  def: ChunkDefinition;
  kit: Kit;
  m: CityMaterials;
  owned: Material[];
  renderer: WebGLRenderer;
  logo: Texture;
  logoUrl: string;
  lite: boolean;
}

/** Per-frame input from the story (or, one day, a live adapter) + the detail level the engine chose. */
export interface ChunkSignal {
  phase: ChunkPhase;
  progress: number;
  /** 1 = focused (full detail), 2 = visible overview (lightweight) */
  level: 1 | 2;
  still: boolean;
  dark: boolean;
  decision: 'approved' | 'rejected' | 'pending';
  /**
   * The two verified human-approval checkpoints (CyfroAssistant changing actions, CyfroCode patch → pull
   * request), as the story shows them right now. Read by the "Your team" approval console; never a new flow.
   */
  approvals: { assistant: ApprovalLane; code: ApprovalLane };
  /** ids of the story beats active right now (e.g. 'i-network'), so a chunk can show WHICH step it is in */
  beats: string[];
  /** 0..1 pulses from the transport manager: a carrier is unloading at / loading out of this chunk right now */
  arrive: number;
  depart: number;
  /** 1 while a loaded carrier is held at this chunk's approval checkpoint */
  hold: number;
  /** low-power mode: keep the process readable, drop secondary motion */
  low: boolean;
  /** set only for the SELECTED chunk while the activity director runs one pass of its own working sequence */
  loop: { k: number; n: number } | null;
}
export type ApprovalLane = { state: 'idle' | 'pending' | 'approved' | 'rejected'; progress: number };

export interface ChunkInstance {
  /** chunk-local group; the engine positions it from the registry grid */
  group: Group;
  update(t: number, s: ChunkSignal): void;
  /** repaint canvas screens; the engine throttles how often this is called per detail level */
  paint?(clock: number, activate: boolean, reduced: boolean, dark: boolean, s: ChunkSignal): void;
  /** CyfroAI Engine only: the original reactor/face hooks, passed straight through */
  engine?: {
    setTheme(dark: boolean): void;
    setHover(on: boolean): void;
    resize(w: number, h: number): void;
    faceCamera(cam: Vector3): void;
    setFacePointer(p: { x: number; y: number } | null, over: boolean): void;
    /** the face display centre in world space (for pointer gaze) */
    faceWorld(out: Vector3): Vector3;
  };
  /** materials whose colour must follow the theme (beyond the shared palette) */
  theme?(dark: boolean): void;
  /** the city's intro clock each frame while the assembly cinematic plays (seconds), or null when it is not playing */
  intro?(T: number | null): void;
  /** never merge this chunk's static meshes (CyfroAI Engine: preserved exactly as built) */
  noMerge?: boolean;
  dispose(): void;
}

export type ChunkBuilder = (ctx: ChunkCtx) => ChunkInstance;
export type { MeshStandardMaterial };
