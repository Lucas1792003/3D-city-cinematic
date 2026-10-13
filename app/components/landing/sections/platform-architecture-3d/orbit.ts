import type { PerspectiveCamera } from 'three';
import type { Pose } from './cinematic';

/**
 * The scene's single camera controller: an orbit around a target, described by azimuth (θ, unlimited),
 * elevation (φ above the platform, clamped) and distance (clamped). Every camera source — the one-time
 * intro, the tab presets, Reset View and the visitor's drag / pinch / zoom — only sets the goal; the
 * camera follows it with damping, so nothing competes and nothing jumps.
 */
type V3 = [number, number, number];
export type Orbit = { target: V3; theta: number; elev: number; dist: number };

export const LIMITS = { elevMin: (20 * Math.PI) / 180, elevMax: (80 * Math.PI) / 180, distMin: 7, distMax: 34 };
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export function fromPose(p: Pose): Orbit {
  const dx = p.pos[0] - p.target[0], dy = p.pos[1] - p.target[1], dz = p.pos[2] - p.target[2];
  const dist = Math.hypot(dx, dy, dz);
  return { target: [...p.target], theta: Math.atan2(dx, dz), elev: Math.asin(dy / dist), dist };
}

export function createOrbit(start: Pose) {
  const cur = fromPose(start);
  const goal = fromPose(start);
  let vTheta = 0, vElev = 0; // inertia after a drag (rad/s)
  let rate = 3.2; // damping toward the goal (1/s); faster while the visitor is dragging

  /** Aim for a pose by the shortest way round (θ is unwrapped toward the current angle). */
  function aim(p: Pose, follow = 3.2) {
    const o = fromPose(p);
    const turns = Math.round((cur.theta - o.theta) / (Math.PI * 2));
    goal.target = o.target; goal.theta = o.theta + turns * Math.PI * 2; goal.elev = clamp(o.elev, LIMITS.elevMin, LIMITS.elevMax); goal.dist = clamp(o.dist, LIMITS.distMin, LIMITS.distMax);
    vTheta = vElev = 0; rate = follow;
  }
  /** Visitor rotation (radians). */
  function rotate(dTheta: number, dElev: number) {
    goal.theta += dTheta; goal.elev = clamp(goal.elev + dElev, LIMITS.elevMin, LIMITS.elevMax); rate = 14;
  }
  function fling(vt: number, ve: number) { vTheta = vt; vElev = ve; rate = 9; }
  function zoom(factor: number) { goal.dist = clamp(goal.dist * factor, LIMITS.distMin, LIMITS.distMax); rate = Math.max(rate, 6); }

  /** Advance damping; returns true while the camera is still moving. */
  function update(dt: number, reduced: boolean) {
    if (!reduced && (Math.abs(vTheta) > 0.001 || Math.abs(vElev) > 0.001)) {
      goal.theta += vTheta * dt; goal.elev = clamp(goal.elev + vElev * dt, LIMITS.elevMin, LIMITS.elevMax);
      const decay = Math.exp(-dt * 4.5); vTheta *= decay; vElev *= decay;
    } else { vTheta = vElev = 0; }
    const k = reduced || dt === 0 ? (reduced ? 1 : 0) : 1 - Math.exp(-dt * rate);
    cur.theta += (goal.theta - cur.theta) * k; cur.elev += (goal.elev - cur.elev) * k; cur.dist += (goal.dist - cur.dist) * k;
    for (let i = 0; i < 3; i++) cur.target[i] += (goal.target[i] - cur.target[i]) * k;
    return Math.abs(goal.theta - cur.theta) + Math.abs(goal.elev - cur.elev) + Math.abs(goal.dist - cur.dist) / 10 + Math.abs(goal.target[0] - cur.target[0]) / 10 > 0.0005
      || Math.abs(vTheta) > 0.001 || Math.abs(vElev) > 0.001;
  }
  /** Places the camera. `narrow` pushes it back on portrait screens so the same framing still fits. */
  function apply(camera: PerspectiveCamera, narrow: number) {
    const d = cur.dist * narrow, h = Math.cos(cur.elev) * d;
    camera.position.set(cur.target[0] + Math.sin(cur.theta) * h, cur.target[1] + Math.sin(cur.elev) * d, cur.target[2] + Math.cos(cur.theta) * h);
    camera.lookAt(...cur.target);
  }
  return { cur, goal, aim, rotate, fling, zoom, update, apply };
}
