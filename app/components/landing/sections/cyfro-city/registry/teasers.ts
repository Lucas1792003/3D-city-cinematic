/**
 * PUBLIC teaser configuration for "? — Coming Soon" platforms. DEFAULT DENY: the list is empty.
 *
 * A mystery platform is a deliberate, temporary product announcement. Add an entry ONLY when BOTH are true:
 *   1. the feature is confirmed to be actively in development, and
 *   2. teasing it publicly has been explicitly approved.
 * Being documented, partly built, behind a disabled flag or on a roadmap is NOT enough, and nothing here is
 * ever generated from roadmap data.
 *
 * This file ships in the public static bundle, so it holds only opaque ids (`reserved-NN`) and a grid cell —
 * never a feature name, description, internal id or status note. The mapping "reserved-NN → internal feature"
 * lives outside this repository (product-owned). Lifecycle:
 *   - approved teaser      → add an entry here (it appears in the city and the assembly cinematic);
 *   - feature released     → remove the entry and add the real chunk to chunks.ts (machinery, copy, flows);
 *   - cancelled / paused / approval withdrawn → remove the entry.
 * Teasers sit in the "edge" district (east of the CyfroSec platform), each on its own pad, with no connections.
 */
export type Teaser = {
  /** opaque public id, e.g. 'reserved-01' */
  id: string;
  /** a free grid cell on the expansion edge */
  grid: { x: number; z: number };
  /** confirmed by product: actively in development */
  inDevelopment: boolean;
  /** confirmed by product: public teaser approved */
  teaserApproved: boolean;
};

// personal copy: one "? — Coming Soon" platform in the south-east corner of the edge district
export const TEASERS: Teaser[] = [
  { id: 'reserved-01', grid: { x: 5, z: 2 }, inDevelopment: true, teaserApproved: true },
];
