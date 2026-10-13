'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import styles from './Owl.module.css';

/**
 * ORIGINAL (V1) owl, kept for comparison only — not used on the site.
 * CyfroSec owl mascot, drawn in SVG so every part can move on its own.
 * Redrawn from the character sheet (owl_mascot.png, kept in work/docs/landing-page/assets):
 * navy body, cream face, brand-orange eyes/beak/feet, cyan C emblem.
 */

export type OwlPose = 'flying' | 'perched';

interface OwlProps {
  pose: OwlPose;
  /** Beak opens and closes while true. */
  talking?: boolean;
  /** Where the owl looks: -1 (left) … 0 (ahead) … 1 (right). */
  look?: number;
  /** Where the pupils point, each axis -1 … 1 (toward the cursor). null = straight at the viewer. */
  gaze?: { x: number; y: number } | null;
  /** Idle life (blinks, breathing, ruffles). Off when out of view or reduced motion. */
  idle?: boolean;
  className?: string;
}

const BODY = '#1e3a6e';
const SHADE = '#152a52';
const HIGHLIGHT = '#2d5ba8';
const FACE = '#f6e8d8';
const ORANGE = '#fe904d';
const ORANGE_DARK = '#e0701a';
const PUPIL = '#0d1b29';
const EMBLEM = '#33afdf';

// Dark mode gets a thin cool outline so the navy body separates from the #0D1B29 page.
const OUTLINE = 'stroke-transparent dark:stroke-[#6a8aa6]';

export function OwlV1({ pose, talking = false, look = 0, gaze = null, idle = false, className }: OwlProps) {
  const flying = pose === 'flying';
  const [blink, setBlink] = useState(false);
  const [ruffle, setRuffle] = useState(false);

  // Random blinks and the occasional wing ruffle while idle.
  useEffect(() => {
    if (!idle) return;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => {
        if (Math.random() < 0.2) { setRuffle(true); setTimeout(() => setRuffle(false), 650); }
        setBlink(true);
        setTimeout(() => setBlink(false), 140);
        schedule();
      }, 3000 + Math.random() * 3000);
    };
    schedule();
    return () => clearTimeout(timer);
  }, [idle]);

  const clamp = (v: number) => Math.max(-1, Math.min(1, v));
  const pupilX = clamp(gaze ? gaze.x : look) * 7;
  const pupilY = clamp(gaze ? gaze.y : 0) * 6;

  return (
    <svg
      viewBox="0 0 240 260"
      className={cn(className, flying && styles.flying, idle && !flying && styles.idle, ruffle && !flying && styles.ruffle, talking && styles.talking)}
      aria-hidden="true"
      focusable="false"
    >
      {/* Feet: tucked up in flight */}
      <g className={cn(styles.part, styles.feet)}>
        {[96, 144].map((x) => (
          <g key={x} fill={ORANGE}>
            <ellipse cx={x - 8} cy={238} rx={6} ry={5} />
            <ellipse cx={x} cy={240} rx={6} ry={5} />
            <ellipse cx={x + 8} cy={238} rx={6} ry={5} />
          </g>
        ))}
      </g>

      {/* Body (breathes while idle) */}
      <g className={cn(styles.part, styles.body)}>
        <ellipse cx={120} cy={168} rx={74} ry={70} fill={BODY} strokeWidth={1.5} className={OUTLINE} />
        {/* Feather scallops */}
        <g fill="none" stroke={SHADE} strokeWidth={3} strokeLinecap="round" opacity={0.7}>
          <path d="M92 196q8 7 16 0M116 202q8 7 16 0M140 196q8 7 16 0M104 214q8 7 16 0M128 214q8 7 16 0" />
        </g>
        {/* C emblem */}
        <g fill="none" stroke={EMBLEM} strokeWidth={5} strokeLinecap="round">
          <path d="M131 166a14 14 0 1 0 0 18" />
        </g>
        <circle cx={124} cy={175} r={3.5} fill={EMBLEM} />
      </g>

      {/* Wings */}
      <path
        d="M62 126c-24 20-32 60-20 98l10-12l6 16l8-14l8 10c4-26 6-56 0-80c-3-12-6-18-12-18z"
        fill={SHADE}
        strokeWidth={1.5}
        className={cn(OUTLINE, styles.part, styles.wingLeft)}
      />
      <path
        d="M178 126c24 20 32 60 20 98l-10-12l-6 16l-8-14l-8 10c-4-26-6-56 0-80c3-12 6-18 12-18z"
        fill={SHADE}
        strokeWidth={1.5}
        className={cn(OUTLINE, styles.part, styles.wingRight)}
      />

      {/* Head: turns and tilts toward where the owl looks */}
      <g className={cn(styles.part, styles.head)} style={{ transform: `translateX(${look * 3}px) rotate(${look * 7}deg)` }}>
        {/* Ear tufts: swept outward, two-tone like the sheet */}
        <path d="M70 58C52 44 44 22 50 6c10 14 26 22 44 30z" fill={HIGHLIGHT} />
        <path d="M74 54C62 44 58 30 60 20c8 10 18 16 30 20z" fill={BODY} />
        <path d="M170 58c18-14 26-36 20-52c-10 14-26 22-44 30z" fill={HIGHLIGHT} />
        <path d="M166 54c12-10 16-24 14-34c-8 10-18 16-30 20z" fill={BODY} />
        <circle cx={120} cy={98} r={68} fill={BODY} strokeWidth={1.5} className={OUTLINE} />
        {/* Face disc */}
        <g fill={FACE}>
          <circle cx={92} cy={104} r={36} />
          <circle cx={148} cy={104} r={36} />
          <ellipse cx={120} cy={126} rx={36} ry={22} />
        </g>
        {/* Brow feathers over the face */}
        <path d="M58 82c14-22 42-30 62-12c-20-6-40-2-62 12zM182 82c-14-22-42-30-62-12c20-6 40-2 62 12z" fill={HIGHLIGHT} />
        {/* Eyes */}
        {[92, 148].map((cx) => (
          <g key={cx}>
            <circle cx={cx} cy={106} r={25} fill={ORANGE} />
            <circle cx={cx} cy={106} r={25} fill="none" stroke={ORANGE_DARK} strokeWidth={2} />
            <g className={styles.part} style={{ transform: `translate(${pupilX}px, ${pupilY}px)` }}>
              <circle cx={cx} cy={106} r={16} fill={PUPIL} />
              <circle cx={cx - 6} cy={99} r={5.5} fill="#ffffff" />
              <circle cx={cx + 5} cy={112} r={2.2} fill="#ffffff" opacity={0.8} />
            </g>
            {/* Eyelid: drops over the eye to blink */}
            <ellipse
              cx={cx}
              cy={106}
              rx={27}
              ry={27}
              fill={BODY}
              className={cn(styles.part, styles.lid)}
              style={{ transform: `scaleY(${blink ? 1 : 0})` }}
            />
          </g>
        ))}
        {/* Beak: lower half drops while talking */}
        <path d="M112 132l8 14l8-14z" fill={ORANGE_DARK} className={cn(styles.part, styles.beakLower)} />
        <path d="M108 120h24l-12 19z" fill={ORANGE} />
      </g>
    </svg>
  );
}
