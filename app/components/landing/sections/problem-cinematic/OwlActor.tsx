'use client';

import { useImperativeHandle, useState, type Ref } from 'react';
import { Owl, type OwlBeak, type OwlPose } from '../../owl/Owl';
import s from './Art.module.css';

/**
 * The owl as a supporting character inside the world. Its position is written per frame
 * by the world; its expression (pose, beak, gaze) only re-renders when the scroll
 * position crosses into a different reaction.
 */

export type OwlMood = { pose: OwlPose; beak: OwlBeak; look: number; gaze: { x: number; y: number } | null };
export type OwlActorHandle = { set: (m: OwlMood) => void };

const same = (a: OwlMood, b: OwlMood) =>
  a.pose === b.pose && a.beak === b.beak && a.look === b.look && a.gaze?.x === b.gaze?.x && a.gaze?.y === b.gaze?.y;

export default function OwlActor({ ref, idle }: { ref?: Ref<OwlActorHandle>; idle: boolean }) {
  const [m, setM] = useState<OwlMood>({ pose: 'perched', beak: 'closed', look: 0, gaze: null });
  useImperativeHandle(ref, () => ({ set: (next) => setM((prev) => (same(prev, next) ? prev : next)) }), []);
  // A fixed 240 × 260 viewport, so the owl's own SVG maps 1:1 onto world units
  return (
    <svg x={0} y={0} width={240} height={260} viewBox="0 0 240 260" overflow="visible">
      <Owl pose={m.pose} beak={m.beak} look={m.look} gaze={m.gaze} idle={idle && m.pose === 'perched'} className={s.owlSvg} />
    </svg>
  );
}
