import type { PerspectiveCamera } from 'three';

/**
 * The city's camera controller — the original platform-architecture-3d/orbit.ts behaviour
 * (unlimited azimuth, clamped elevation and distance, damping toward a goal, drag inertia),
 * with limits that the engine derives from the registry bounds instead of constants.
 */
type V3 = [number, number, number];
export type OrbitState = { target: V3; theta: number; elev: number; dist: number };
export const LIMITS = { elevMin: (16 * Math.PI) / 180, elevMax: (82 * Math.PI) / 180, distMin: 4.5, distMax: 70 };
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export function createOrbit(start: OrbitState) {
  const cur: OrbitState = { ...start, target: [...start.target] };
  const goal: OrbitState = { ...start, target: [...start.target] };
  let vTheta = 0, vElev = 0, rate = 3.2;

  function aim(o: OrbitState, follow = 3.2) {
    const turns = Math.round((cur.theta - o.theta) / (Math.PI * 2));
    goal.target = [...o.target]; goal.theta = o.theta + turns * Math.PI * 2;
    goal.elev = clamp(o.elev, LIMITS.elevMin, LIMITS.elevMax); goal.dist = clamp(o.dist, LIMITS.distMin, LIMITS.distMax);
    vTheta = vElev = 0; rate = follow;
  }
  function rotate(dTheta: number, dElev: number) { goal.theta += dTheta; goal.elev = clamp(goal.elev + dElev, LIMITS.elevMin, LIMITS.elevMax); rate = 14; }
  function fling(vt: number, ve: number) { vTheta = vt; vElev = ve; rate = 9; }
  function zoom(factor: number) { goal.dist = clamp(goal.dist * factor, LIMITS.distMin, LIMITS.distMax); rate = Math.max(rate, 6); }
  function update(dt: number, reduced: boolean) {
    if (!reduced && (Math.abs(vTheta) > 0.001 || Math.abs(vElev) > 0.001)) {
      goal.theta += vTheta * dt; goal.elev = clamp(goal.elev + vElev * dt, LIMITS.elevMin, LIMITS.elevMax);
      const decay = Math.exp(-dt * 4.5); vTheta *= decay; vElev *= decay;
    } else { vTheta = vElev = 0; }
    const k = reduced || dt === 0 ? (reduced ? 1 : 0) : 1 - Math.exp(-dt * rate);
    cur.theta += (goal.theta - cur.theta) * k; cur.elev += (goal.elev - cur.elev) * k; cur.dist += (goal.dist - cur.dist) * k;
    for (let i = 0; i < 3; i++) cur.target[i] += (goal.target[i] - cur.target[i]) * k;
    return Math.abs(goal.theta - cur.theta) + Math.abs(goal.elev - cur.elev) + Math.abs(goal.dist - cur.dist) / 10
      + (Math.abs(goal.target[0] - cur.target[0]) + Math.abs(goal.target[2] - cur.target[2])) / 10 > 0.0005 || Math.abs(vTheta) > 0.001 || Math.abs(vElev) > 0.001;
  }
  function apply(camera: PerspectiveCamera, narrow: number) {
    const d = cur.dist * narrow, h = Math.cos(cur.elev) * d;
    camera.position.set(cur.target[0] + Math.sin(cur.theta) * h, cur.target[1] + Math.sin(cur.elev) * d, cur.target[2] + Math.cos(cur.theta) * h);
    camera.lookAt(...cur.target);
  }
  return { cur, goal, aim, rotate, fling, zoom, update, apply };
}
export type Orbit = ReturnType<typeof createOrbit>;
