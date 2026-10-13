import type { ChunkDefinition, DistrictDefinition, FlowDefinition, StoryBeat } from './types';
import type { Teaser } from './teasers';

/**
 * Registry validation (docs/design/3d-city/05 §5–§6, 07 §7). Pure; returns a list of problems.
 * Used by `tests/city-registry.test.cjs` and, in development, asserted when the scene starts.
 */

const LIFECYCLES = ['planned', 'in_development', 'available', 'deprecated'];
const VISIBILITY = ['full', 'mystery'];
const SIDES = ['n', 'e', 's', 'w'];
const KINDS = ['DATA', 'CTRL', 'JOB', 'EVT', 'APPR', 'AI', 'RPT', 'EXT'];
const DISPLAYS = ['animate', 'static', 'hidden'];
const EVIDENCE = ['code', 'documented'];
const RESERVED_ID = /^reserved-\d{2}$/;
const ID = /^[a-z][a-z0-9-]*$/;

export interface RegistryInput {
  chunks: ChunkDefinition[];
  flows: FlowDefinition[];
  districts: DistrictDefinition[];
  story: StoryBeat[];
  cycles: { infra: number; code: number };
  mysteryCopy: { label: string; body: string };
  /** continuous background traffic (story.ts AMBIENT) */
  ambient?: { flow: string; every: number; dur: number; offset: number }[];
  /** public teaser configuration (teasers.ts) */
  teasers?: Teaser[];
}

export function validateRegistry(r: RegistryInput): string[] {
  const errors: string[] = [];
  const err = (m: string) => errors.push(m);
  const byId = new Map<string, ChunkDefinition>();
  const districtIds = new Set(r.districts.map((d) => d.id));

  /* ── chunks ── */
  for (const c of r.chunks) {
    if (byId.has(c.id)) err(`duplicate chunk id: ${c.id}`);
    byId.set(c.id, c);
    if (!ID.test(c.id)) err(`${c.id}: id must be kebab-case`);
    if (!districtIds.has(c.district)) err(`${c.id}: unknown district ${c.district}`);
    if (!LIFECYCLES.includes(c.lifecycle)) err(`${c.id}: unsupported lifecycle ${c.lifecycle}`);
    if (!VISIBILITY.includes(c.publicVisibility)) err(`${c.id}: unsupported publicVisibility ${c.publicVisibility}`);
    if (!Number.isInteger(c.grid.x) || !Number.isInteger(c.grid.z)) err(`${c.id}: grid coordinates must be integers`);
    if (!(c.footprint.w >= 1 && c.footprint.d >= 1 && Number.isInteger(c.footprint.w) && Number.isInteger(c.footprint.d))) err(`${c.id}: invalid footprint`);

    const cm = c.camera;
    if (!cm || ![cm.azimuth, cm.elevation, cm.distance, ...cm.target].every(Number.isFinite)) err(`${c.id}: missing or invalid camera target`);
    else {
      if (cm.distance < 4 || cm.distance > 40) err(`${c.id}: camera distance out of range`);
      if (cm.elevation < 15 || cm.elevation > 80) err(`${c.id}: camera elevation out of range`);
    }

    const portIds = new Set<string>();
    for (const p of c.ports) {
      if (portIds.has(p.id)) err(`${c.id}: duplicate port ${p.id}`);
      portIds.add(p.id);
      if (!SIDES.includes(p.side)) err(`${c.id}.${p.id}: invalid port side ${p.side}`);
      if (p.offset !== undefined && (!Number.isFinite(p.offset) || Math.abs(p.offset) > 0.45)) err(`${c.id}.${p.id}: port offset must be within ±0.45`);
    }
    const hs = new Set<string>();
    for (const h of c.hotspots) {
      if (hs.has(h.id)) err(`${c.id}: duplicate hotspot ${h.id}`);
      hs.add(h.id);
      if (!h.name || !h.summary) err(`${c.id}.${h.id}: hotspot needs a name and summary`);
      if (!h.at.every(Number.isFinite)) err(`${c.id}.${h.id}: invalid hotspot anchor`);
    }

    if (c.publicVisibility === 'full') {
      if (!(c.lifecycle === 'available' || c.lifecycle === 'deprecated')) err(`${c.id}: only available/deprecated chunks may be fully visible`);
      if (c.class === 'reserved' || RESERVED_ID.test(c.id)) err(`${c.id}: reserved chunks cannot be fully visible`);
      const k = c.copy;
      if (!k) err(`${c.id}: missing copy`);
      else for (const f of ['name', 'summary', 'details', 'depicts', 'evidenceNote'] as const) if (!k[f] || k[f].trim().length < 3) err(`${c.id}: missing ${f}`);
    } else {
      // mystery: nothing that could identify the future feature may ship
      // the shipped lifecycle of a reserved platform is always 'planned': its real status (planned or in
      // development) lives with the internal mapping outside this repository, so the bundle reveals nothing
      if (c.lifecycle !== 'planned') err(`${c.id}: mystery chunks must ship with lifecycle "planned" (keep the real status outside the repository)`);
      if (!RESERVED_ID.test(c.id)) err(`${c.id}: mystery chunks must use an opaque reserved-NN id`);
      if (c.class !== 'reserved') err(`${c.id}: mystery chunks must have class "reserved"`);
      if (c.copy !== null) err(`${c.id}: mystery chunks may not carry copy`);
      if (c.ports.length || c.hotspots.length) err(`${c.id}: mystery chunks may not have ports or hotspots`);
      if (c.builder !== 'mystery') err(`${c.id}: mystery chunks must use the mystery builder`);
      if (c.href) err(`${c.id}: mystery chunks may not link anywhere`);
      if (c.dependsOn.length) err(`${c.id}: mystery chunks may not declare dependencies`);
      const extra = Object.keys(c).filter((k) => !['id', 'class', 'district', 'grid', 'footprint', 'lifecycle', 'publicVisibility', 'builder', 'perfTier', 'copy', 'ports', 'hotspots', 'camera', 'dependsOn'].includes(k));
      if (extra.length) err(`${c.id}: mystery chunk has unexpected fields: ${extra.join(', ')}`);
    }
    if (c.class === 'reserved' && c.publicVisibility !== 'mystery') err(`${c.id}: reserved class must be a mystery chunk`);
  }
  for (const c of r.chunks) for (const d of c.dependsOn) {
    const t = byId.get(d);
    if (!t) err(`${c.id}: depends on unknown chunk ${d}`);
    else if (t.publicVisibility !== 'full') err(`${c.id}: depends on a mystery chunk`);
  }
  if (r.mysteryCopy.label !== '? — Coming Soon') err('mystery label must be exactly "? — Coming Soon"');

  /* occupied cells */
  const cells = new Map<string, string>();
  for (const c of r.chunks) for (let x = 0; x < c.footprint.w; x++) for (let z = 0; z < c.footprint.d; z++) {
    const k = `${c.grid.x + x},${c.grid.z + z}`;
    if (cells.has(k)) err(`grid cell ${k} occupied by both ${cells.get(k)} and ${c.id}`);
    cells.set(k, c.id);
  }

  /* ── flows ── */
  const flowIds = new Map<string, FlowDefinition>();
  for (const f of r.flows) {
    if (flowIds.has(f.id)) err(`duplicate flow id: ${f.id}`);
    flowIds.set(f.id, f);
    if (!KINDS.includes(f.kind)) err(`${f.id}: unknown kind ${f.kind}`);
    if (!DISPLAYS.includes(f.display)) err(`${f.id}: unknown display ${f.display}`);
    if (!EVIDENCE.includes(f.evidence)) err(`${f.id}: evidence must be "code" or "documented" (unverified edges may not be shown)`);
    if (!/^03:F\d+$/.test(f.ref)) err(`${f.id}: ref must point to a connection in 03-workflow-map.md`);
    if (!f.label) err(`${f.id}: missing label`);
    for (const end of [f.from, f.to]) {
      const c = byId.get(end.chunk);
      if (!c) { err(`${f.id}: unknown chunk ${end.chunk}`); continue; }
      if (c.publicVisibility !== 'full') err(`${f.id}: connections may not touch mystery chunk ${c.id}`);
      if (!c.ports.some((p) => p.id === end.port)) err(`${f.id}: ${end.chunk} has no port ${end.port}`);
    }
    if (f.from.chunk === f.to.chunk) err(`${f.id}: a connection must join two chunks`);
    const fc = byId.get(f.from.chunk), tc = byId.get(f.to.chunk);
    if (fc && tc) {
      // the only crossing of the customer boundary is CyfroAgent's own connection through the gate
      const crosses = (fc.district === 'customer') !== (tc.district === 'customer');
      if (crosses) {
        const agentEnd = fc.district === 'customer' ? f.from : f.to;
        if (!(agentEnd.chunk === 'cyfro-agent' && ['uplink', 'upload'].includes(agentEnd.port))) err(`${f.id}: crosses the customer boundary outside CyfroAgent's gate`);
        if (fc.district !== 'customer' && f.display !== 'hidden' && !f.carrier) err(`${f.id}: inbound to the customer environment must ride the agent-opened connection (carrier)`);
      }
      if (f.external && fc.district !== 'external' && tc.district !== 'external') err(`${f.id}: external flows must touch an external pad`);
      if ((fc.district === 'external' || tc.district === 'external') && !f.external) err(`${f.id}: flows to external pads must be marked external`);
      if (f.inProcess && f.to.chunk !== 'cyfro-ai-engine') err(`${f.id}: in-process AI links must end at the shared AI layer`);
    }
    if (f.carrier) {
      const car = r.flows.find((x) => x.id === f.carrier);
      if (!car) err(`${f.id}: unknown carrier ${f.carrier}`);
      else if (!((car.from.chunk === f.to.chunk && car.to.chunk === f.from.chunk) || (car.from.chunk === f.from.chunk && car.to.chunk === f.to.chunk))) err(`${f.id}: carrier must join the same two chunks`);
    }
    if (f.gatedBy) {
      const [chunk, hotspot] = f.gatedBy.split(':');
      const c = byId.get(chunk);
      if (!c || !c.hotspots.some((h) => h.id === hotspot)) err(`${f.id}: gatedBy ${f.gatedBy} does not name a chunk hotspot`);
    }
  }

  /* ── story ── */
  for (const b of r.story) {
    const cycle = r.cycles[b.track];
    if (!(b.from >= 0 && b.to > b.from && b.to <= cycle)) err(`${b.id}: beat times outside the ${b.track} cycle`);
    for (const id of Object.keys(b.chunks)) {
      const c = byId.get(id);
      if (!c) err(`${b.id}: unknown chunk ${id}`);
      else if (c.publicVisibility !== 'full') err(`${b.id}: the story may not animate mystery chunk ${id}`);
    }
    for (const run of b.flows) {
      const f = flowIds.get(run.id);
      if (!f) { err(`${b.id}: unknown flow ${run.id}`); continue; }
      if (f.display !== 'animate') err(`${b.id}: flow ${run.id} is not allowed to animate (display=${f.display})`);
      if (run.count !== undefined && !(Number.isInteger(run.count) && run.count >= 1 && run.count <= 6)) err(`${b.id}: convoy size for ${run.id} must be 1–6`);
      if (run.hold) {
        // a held carrier never moves: it waits at its checkpoint, or is withdrawn after a rejection
        const ok = f.gatedBy && (run.hold === 'wait' ? b.decision?.checkpoint === f.gatedBy : b.onlyIf?.checkpoint === f.gatedBy && b.onlyIf.decision === 'rejected');
        if (!ok) err(`${b.id}: ${run.id} may only be held at its own approval checkpoint (wait) or withdrawn after a rejection (discard)`);
      } else if (f.gatedBy) {
        const ok = b.onlyIf?.checkpoint === f.gatedBy && b.onlyIf.decision === 'approved';
        if (!ok) err(`${b.id}: gated flow ${run.id} may only animate after an approval of ${f.gatedBy}`);
        const dec = r.story.find((x) => x.decision?.checkpoint === f.gatedBy && x.track === b.track);
        if (!dec || dec.to > b.from) err(`${b.id}: gated flow ${run.id} must follow its approval checkpoint beat`);
      }
      const a = run.a ?? 0, e = run.b ?? 1;
      if (!(a >= 0 && e <= 1 && e > a)) err(`${b.id}: invalid sub-window for ${run.id}`);
    }
    for (const [id, phase] of Object.entries(b.chunks)) {
      if ((phase === 'approved' || phase === 'rejected') && !(b.onlyIf && b.onlyIf.decision === phase)) err(`${b.id}: ${id} cannot show ${phase} without a matching decision`);
    }
    if (b.decision) {
      const [chunk, hotspot] = b.decision.checkpoint.split(':');
      if (!byId.get(chunk)?.hotspots.some((h) => h.id === hotspot)) err(`${b.id}: decision checkpoint ${b.decision.checkpoint} is not a hotspot`);
      if (b.chunks[chunk] !== 'waiting_approval') err(`${b.id}: a decision beat must show ${chunk} waiting for approval`);
      if (b.decision.even === b.decision.odd) err(`${b.id}: the story must show both an approval and a rejection`);
    }
  }
  /* ── teasers: default deny, opaque ids only, nothing else may ship ── */
  const seen = new Set<string>();
  for (const t of r.teasers ?? []) {
    const extra = Object.keys(t).filter((k) => !['id', 'grid', 'inDevelopment', 'teaserApproved'].includes(k));
    if (extra.length) err(`teaser ${t.id}: unexpected fields ${extra.join(', ')} (public config holds opaque ids only)`);
    if (!RESERVED_ID.test(t.id)) err(`teaser ${t.id}: must use an opaque reserved-NN id`);
    if (seen.has(t.id)) err(`teaser ${t.id}: duplicate`); seen.add(t.id);
    if (t.inDevelopment !== true || t.teaserApproved !== true) err(`teaser ${t.id}: only features that are in development AND approved for a public teaser may be listed — remove the entry otherwise`);
    if (!Number.isInteger(t.grid?.x) || !Number.isInteger(t.grid?.z)) err(`teaser ${t.id}: grid must be integers`);
  }
  const shownMystery = r.chunks.filter((c) => c.publicVisibility === 'mystery').map((c) => c.id).sort();
  if (r.teasers) {
    const approved = r.teasers.filter((t) => t.inDevelopment === true && t.teaserApproved === true).map((t) => t.id).sort();
    if (shownMystery.join() !== approved.join()) err(`mystery platforms (${shownMystery.join(', ') || 'none'}) must match the approved teasers (${approved.join(', ') || 'none'})`);
  }

  /* ── background traffic: only continuous, ungated, platform-internal flows ── */
  for (const am of r.ambient ?? []) {
    const f = flowIds.get(am.flow);
    if (!f) { err(`ambient: unknown flow ${am.flow}`); continue; }
    if (f.display !== 'animate' || f.gatedBy || f.external || f.carrier) err(`ambient: ${am.flow} cannot carry background traffic`);
    if (!(am.dur > 0 && am.dur < am.every)) err(`ambient: ${am.flow} needs 0 < dur < every`);
  }
  return errors;
}
