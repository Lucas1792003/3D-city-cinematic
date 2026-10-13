import { Color, CylinderGeometry, Group, InstancedMesh, Matrix4, MeshBasicMaterial, MeshStandardMaterial, Quaternion, Vector3, type Material } from 'three';
import { createCityScreens } from '../screens/cityScreens';
import { chunkDeck, monitor, DECK_TOP, type CitySlot } from '../kit/machines';
import { person, chair } from '../kit/people';
import type { ChunkBuilder, ChunkSignal } from './types';

/**
 * "Your team" — a miniature security operations & human-approval room.
 *
 * What it shows (all verified in the platform, see the registry copy):
 *  · people sign in through a gate (identity + per-action permissions);
 *  · analysts triage findings at a desk and on a wall dashboard — most findings are review-only;
 *  · an approval console with Pending / Approved / Rejected lamps for the two verified checkpoints:
 *    CyfroAssistant changing actions and CyfroCode patch → pull request. The console only mirrors the
 *    story's checkpoint states (ChunkSignal.approvals); it adds no connection and never decides by itself.
 * A rejected request is never shown as completed: no green lamp, no "sent", the reject key lights.
 *
 * Cost: static parts (desk, wall, gate, torsos, legs, chairs) are merged by the engine; heads and arms are
 * small pivots; people only animate at detail level 1 (focused / near), lamps and screens always reflect state.
 */

export const buildYourTeam: ChunkBuilder = (ctx) => {
  const { kit, m, owned } = ctx; const g = new Group();
  chunkDeck(kit, g, m, m.panel, m.edge);
  const mat = (color: string, e = 0) => { const x = new MeshStandardMaterial({ color, roughness: 0.45, emissive: color, emissiveIntensity: e }); owned.push(x); return x; };
  const skin = m.skin, visor = m.visor;
  const shirtA = m.blue, shirtB = m.white, trousers = m.screen;
  const glow = mat('#33afdf', 0.45); // gate lintel, desk strip and wall service lights share one breathing material

  /* ── West entrance: sign-in gate (identity + per-action permissions) and a sign-in kiosk ── */
  for (const z of [-0.75, 0.75]) kit.box(g, 0.24, 1.55, 0.24, -2.25, DECK_TOP + 0.78, z, m.panel, 0.05);
  kit.box(g, 0.32, 0.24, 1.75, -2.25, DECK_TOP + 1.66, 0, m.edge, 0.05);
  kit.box(g, 0.05, 0.05, 1.4, -2.08, DECK_TOP + 1.66, 0, glow, 0);
  kit.box(g, 0.16, 0.5, 0.16, -2.25, DECK_TOP + 0.25, 0.55, m.edge, 0.03); // badge reader
  kit.box(g, 0.12, 0.08, 0.02, -2.15, DECK_TOP + 0.42, 0.55, m.green, 0);

  /* ── Analyst desk: three monitors (one live triage screen), keyboards, phone, mini rack, status strip ── */
  const DZ = -0.9;
  kit.box(g, 2.9, 0.1, 0.85, -0.55, 1.0, DZ, m.white, 0.05);
  kit.box(g, 2.7, 0.72, 0.55, -0.55, 0.6, DZ - 0.1, m.panel, 0.05);
  kit.box(g, 2.6, 0.03, 0.02, -0.55, 0.9, DZ + 0.18, glow, 0);
  const tri = monitor(kit, g, m, -0.55, 1.62, DZ - 0.22, 0.95, 0.58); // live
  for (const [x, ry] of [[-1.55, 0.35], [0.45, -0.35]] as const) { // side monitors: static panels with a few readable bars
    const s = new Group(); s.position.set(x, 1.55, DZ - 0.18); s.rotation.y = ry; g.add(s);
    kit.box(s, 0.78, 0.5, 0.08, 0, 0, 0, m.edge, 0.03); kit.box(s, 0.7, 0.42, 0.02, 0, 0, 0.045, m.screen, 0.01);
    for (let r = 0; r < 4; r++) kit.box(s, 0.4 - (r % 2) * 0.14, 0.035, 0.01, -0.1 + (r % 2) * 0.07, 0.13 - r * 0.09, 0.06, r === 1 ? m.orange : r === 3 ? m.green : m.blue, 0);
    kit.box(s, 0.08, 0.28, 0.08, 0, -0.38, -0.02, m.edge, 0.02);
  }
  for (const x of [-1.25, 0.15]) { kit.box(g, 0.55, 0.03, 0.18, x, 1.065, DZ + 0.2, m.screen, 0.01); kit.box(g, 0.07, 0.025, 0.1, x + 0.38, 1.065, DZ + 0.22, m.edge, 0.01); }
  kit.box(g, 0.2, 0.06, 0.16, -1.95, 1.08, DZ + 0.05, m.edge, 0.02); kit.box(g, 0.2, 0.04, 0.05, -1.95, 1.13, DZ - 0.01, m.white, 0.015); // desk phone
  kit.box(g, 0.45, 0.62, 0.5, 0.85, 0.55, DZ - 0.08, m.screen, 0.04); // mini rack under the desk end
  const rackMt = mat('#039be0', 0.2); for (let i = 0; i < 3; i++) kit.box(g, 0.06, 0.05, 0.03, 0.98, 0.42 + i * 0.15, DZ + 0.18, rackMt, 0);
  chair(kit, m, g, -1.25, -0.08, Math.PI); chair(kit, m, g, 0.15, -0.08, Math.PI);

  /* ── Wall dashboard (north edge): findings under review + the approval queue ── */
  // kept low (top ≈ 2.4) so the room stays visible from the north during 360° rotation
  for (const x of [-1.62, 1.62]) kit.box(g, 0.14, 2.1, 0.14, x, DECK_TOP + 1.05, -2.32, m.edge, 0.03);
  kit.box(g, 3.5, 0.12, 0.3, 0, DECK_TOP + 0.06, -2.3, m.edge, 0.03);
  const dash = monitor(kit, g, m, 0, 1.72, -2.36, 3.1, 1.12, false);
  // the back of the wall is equipment, not a blank board: vent slats, a cable conduit to the desk, service lights
  for (let i = 0; i < 6; i++) kit.box(g, 0.42, 0.05, 0.03, -1.05 + i * 0.42, 1.95, -2.47, m.screen, 0);
  kit.box(g, 2.6, 0.08, 0.08, 0, 1.25, -2.47, m.panel, 0.02);
  kit.box(g, 0.1, 0.1, 1.2, -1.62, DECK_TOP + 0.05, -1.75, m.edge, 0.02); // floor conduit from the wall to the desk
  for (const x of [-0.9, 0.9]) kit.box(g, 0.12, 0.05, 0.03, x, 1.5, -2.47, glow, 0);

  /* ── Approval console (centre-south): screen + Pending / Approved / Rejected lamps per checkpoint + keys ── */
  const CX = 1.2, CZ = 1.3;
  kit.box(g, 1.15, 0.78, 0.62, CX, 0.62, CZ, m.panel, 0.07);
  kit.box(g, 1.25, 0.06, 0.72, CX, 1.03, CZ, m.edge, 0.02);
  const head = new Group(); head.position.set(CX, 1.06, CZ - 0.12); head.rotation.x = -0.55; g.add(head);
  kit.box(head, 1.12, 0.72, 0.08, 0, 0.38, 0, m.edge, 0.04);
  const consoleScreen = monitor(kit, head, m, 0, 0.38, 0.0, 1.0, 0.62, false);
  // lamp rows on the pedestal front: [pending, approved, rejected] for CyfroAssistant (top) and CyfroCode (bottom)
  // six lamps in ONE instanced draw call; each lamp's brightness is its instance colour (unlit glass)
  const LAMP = ['#fe904d', '#4fbf8b', '#8a97a3'].map((c) => new Color(c));
  const lampGeo = new CylinderGeometry(0.055, 0.055, 0.04, 14);
  const lamps = new InstancedMesh(lampGeo, new MeshBasicMaterial({ toneMapped: false }), 6); owned.push(lamps.material as Material);
  { const mx = new Matrix4(), q = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI / 2), one = new Vector3(1, 1, 1);
    for (let row = 0; row < 2; row++) for (let i = 0; i < 3; i++) { lamps.setMatrixAt(row * 3 + i, mx.compose(new Vector3(CX - 0.3 + i * 0.3, 0.86 - row * 0.2, CZ + 0.33), q, one)); lamps.setColorAt(row * 3 + i, LAMP[i]); } }
  kit.dyn(lamps); g.add(lamps);
  const lampCol = new Color();
  const setLamp = (idx: number, k: number) => { lamps.setColorAt(idx, lampCol.copy(LAMP[idx % 3]).multiplyScalar(k)); };
  kit.box(g, 0.14, 0.05, 0.02, CX - 0.52, 0.86, CZ + 0.32, m.blue, 0); kit.box(g, 0.14, 0.05, 0.02, CX - 0.52, 0.66, CZ + 0.32, m.stripCode, 0); // row keys: assistant / code
  const approveMt = mat('#4fbf8b', 0.05), rejectMt = mat('#8a97a3', 0.05);
  const approveKey = kit.dyn(kit.cylinder(g, 0.09, 0.05, CX - 0.2, 1.085, CZ + 0.22, approveMt, 16));
  const rejectKey = kit.dyn(kit.cylinder(g, 0.09, 0.05, CX + 0.2, 1.085, CZ + 0.22, rejectMt, 16));
  // a subtle floor ring marks the approval area
  const ringMt = mat('#fe904d', 0.12); kit.dyn(kit.torus(g, 1.0, 0.025, CX - 0.35, DECK_TOP + 0.02, CZ, ringMt)).rotation.x = Math.PI / 2;

  /* ── People ── */
  // operators' hands rest on the keyboards (static, merged); the analyst points with the right arm; the reviewer uses both
  // seated analysts type: both arms are animated pivots with hands (transform-only, no extra draw calls)
  const opA = person(kit, m, g, [-1.25, DECK_TOP, -0.12], Math.PI, 'sit', shirtA, trousers, skin, visor);
  const opB = person(kit, m, g, [0.15, DECK_TOP, -0.12], Math.PI, 'sit', shirtB, trousers, skin, visor);
  for (const op of [opA, opB]) { op.armL.rotation.x = -1.15; op.armR.rotation.x = -1.15; }
  const analyst = person(kit, m, g, [1.9, DECK_TOP, -1.35], Math.PI + 0.35, 'stand', shirtB, trousers, skin, visor, [0, null]);
  const reviewer = person(kit, m, g, [0.25, DECK_TOP, 1.45], Math.PI / 2, 'stand', shirtA, trousers, skin, visor);

  const screens = createCityScreens([
    { id: 'teamDashboard', ...dash, group: g },
    { id: 'socMain', ...tri, group: g },
    { id: 'approvalConsole', ...consoleScreen, group: head },
  ] as CitySlot[], ctx.renderer);

  let reach = 0, prevT = -1;
  const cyc6 = (t: number) => ((t % 5) + 5) % 5;
  const anyPending = (s: ChunkSignal) => s.approvals.assistant.state === 'pending' || s.approvals.code.state === 'pending';
  /** the lane that was just decided (first 40 % of its approved/rejected beat): the reviewer presses that key */
  const deciding = (s: ChunkSignal) => (['assistant', 'code'] as const).map((k) => s.approvals[k]).find((l) => (l.state === 'approved' || l.state === 'rejected') && l.progress < 0.4);

  return {
    group: g,
    update(t, s) {
      const dt = prevT < 0 || t < prevT ? 0 : Math.min(0.1, t - prevT); prevT = t;
      /* lamps & keys always mirror the checkpoint states (cheap, and they carry the meaning) */
      (['assistant', 'code'] as const).forEach((k, row) => {
        const l = s.approvals[k], pulse = s.still ? 1 : 0.6 + 0.4 * Math.sin(t * 5);
        setLamp(row * 3, l.state === 'pending' ? pulse : 0.16);
        setLamp(row * 3 + 1, l.state === 'approved' ? 1 : 0.16); // never lit for a rejected request
        setLamp(row * 3 + 2, l.state === 'rejected' ? 0.95 : 0.16);
      });
      if (lamps.instanceColor) lamps.instanceColor.needsUpdate = true;
      const d = deciding(s);
      // keys are dim until pressed, so an unpressed approve key never reads as "approved"
      approveMt.color.set(d?.state === 'approved' ? '#4fbf8b' : '#24473b'); approveMt.emissive.copy(approveMt.color); approveMt.emissiveIntensity = d?.state === 'approved' ? 1.1 : 0.05;
      rejectMt.color.set(d?.state === 'rejected' ? '#c3ccd4' : '#3a444d'); rejectMt.emissive.copy(rejectMt.color); rejectMt.emissiveIntensity = d?.state === 'rejected' ? 0.8 : 0.05;
      approveKey.position.y = 1.085 - (d?.state === 'approved' ? 0.02 : 0); // the pressed key sinks a little
      rejectKey.position.y = 1.085 - (d?.state === 'rejected' ? 0.02 : 0);
      ringMt.emissiveIntensity = anyPending(s) ? (s.still ? 0.6 : 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t * 3))) : 0.1;

      if (s.still) {
        for (const p of [opA, opB, analyst, reviewer]) p.head.rotation.set(0, 0, 0);
        for (const op of [opA, opB]) { op.armL.rotation.x = -1.15; op.armR.rotation.x = -1.15; }
        reviewer.armR.rotation.x = anyPending(s) ? -0.7 : 0; analyst.head.rotation.x = -0.2;
        glow.emissiveIntensity = 0.45; rackMt.emissiveIntensity = 0.4; return;
      }
      glow.emissiveIntensity = 0.45;
      rackMt.emissiveIntensity = cyc6(t) < 0.25 ? 0.8 : 0.3; // a short rack-light flash every few seconds
      if (s.level !== 1) return; // distant / overview: people hold their pose (no per-frame work)

      /* analysts: type, look between their monitors, glance up at the wall — and turn to the approval
         console when a review request arrives */
      const review = anyPending(s) || !!d;
      [opA, opB].forEach((op, i) => {
        const typing = !review || i === 1;
        op.armL.rotation.x = -1.15 + (typing ? 0.09 * Math.max(0, Math.sin(t * 11 + i)) : 0);
        op.armR.rotation.x = -1.15 + (typing ? 0.09 * Math.max(0, Math.sin(t * 11 + i + 1.7)) : 0.25);
        op.head.rotation.y = review && i === 0 ? -1.1 : 0.38 * Math.sin(t * 0.45 + i * 2.1);
        op.head.rotation.x = review && i === 0 ? 0.05 : Math.sin(t * 0.21 + i) > 0.85 ? -0.22 : 0.08;
      });
      analyst.head.rotation.y = 0.45 * Math.sin(t * 0.3);
      analyst.head.rotation.x = -0.22;
      analyst.armR.rotation.x = Math.sin(t * 0.3) > 0.6 ? -1.3 : 0; // points at the dashboard now and then

      /* reviewer: watches the console; hovers while a request waits; presses the key that matches the decision */
      const target = d ? 1 : anyPending(s) ? 0.55 : 0;
      reach += (target - reach) * Math.min(1, dt * 5);
      reviewer.armR.rotation.x = -1.25 * reach;
      reviewer.armL.rotation.x = -0.3 * reach;
      reviewer.head.rotation.x = anyPending(s) || d ? 0.3 : 0.1;
      reviewer.head.rotation.y = d ? 0 : 0.15 * Math.sin(t * 0.6);
      if (d) reviewer.head.rotation.x = 0.3 + 0.12 * Math.sin(Math.min(1, d.progress / 0.4) * Math.PI * 2); // a nod as the decision is made
    },
    paint(cl, _a, red, dark, s) { screens.update(cl, red, dark, s); },
    dispose() { screens.dispose(); lampGeo.dispose(); lamps.dispose(); },
  };
};
