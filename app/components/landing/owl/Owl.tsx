'use client';

import { useEffect, useId, useState } from 'react';
import { cn } from '@/lib/utils';
import styles from './Owl.module.css';

/**
 * Approved CyfroSec Owl V3: round proportions, a smooth cream facial disc,
 * warm amber eyes, short layered wings, and the original CyfroSec emblem.
 * Independent SVG parts retain the existing flight, blink, gaze, breathing,
 * ruffle, and lower-beak controls. V1 and the static V2 export remain available
 * for comparison in docs/design/owl-v3.
 */

export type OwlPose = 'flying' | 'perched';
export type OwlBeak = 'closed' | 'slight' | 'wide';

interface OwlProps {
  pose: OwlPose;
  /** Beak opens and closes while true. */
  talking?: boolean;
  /** Resting beak when not talking: closed (neutral, default), slight, or wide. The upper hook stays fixed. */
  beak?: OwlBeak;
  /** Where the owl looks: -1 (left) … 0 (ahead) … 1 (right). */
  look?: number;
  /** Where the pupils point, each axis -1 … 1 (toward the cursor). null = straight at the viewer. */
  gaze?: { x: number; y: number } | null;
  /** Idle life (blinks, breathing, ruffles). Off when out of view or reduced motion. */
  idle?: boolean;
  className?: string;
}

export function Owl({ pose, talking = false, beak = 'closed', look = 0, gaze = null, idle = false, className }: OwlProps) {
  const flying = pose === 'flying';
  const [blink, setBlink] = useState(false);
  const [ruffle, setRuffle] = useState(false);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const id = (name: string) => `owl-${uid}-${name}`;

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
  const pupilX = clamp(gaze ? gaze.x : look) * 6;
  const pupilY = clamp(gaze ? gaze.y : 0) * 5;
  const beakOpen = beak === 'wide' ? 6 : beak === 'slight' ? 2.5 : 0;

  return (
    <svg
      viewBox="0 0 240 260"
      className={cn(styles.palette, className, flying && styles.flying, idle && !flying && styles.idle, ruffle && !flying && styles.ruffle, talking && styles.talking)}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id={id('head-shade')} cx="38%" cy="27%" r="86%">
          <stop stopColor="var(--owl-head-highlight, #365b98)" />
          <stop offset=".58" stopColor="var(--owl-head-base, #244579)" />
          <stop offset="1" stopColor="var(--owl-head-shadow, #192f55)" />
        </radialGradient>
        <radialGradient id={id('body-shade')} cx="43%" cy="35%" r="75%">
          <stop stopColor="var(--owl-body-highlight, #31558b)" />
          <stop offset=".72" stopColor="var(--owl-body-base, #223e6a)" />
          <stop offset="1" stopColor="var(--owl-deep-shadow, #172d50)" />
        </radialGradient>
        <radialGradient id={id('face-shade')} cx="43%" cy="35%" r="76%">
          <stop stopColor="#fff5e8" />
          <stop offset=".68" stopColor="#f8ead7" />
          <stop offset="1" stopColor="#e9ceb0" />
        </radialGradient>
        <radialGradient id={id('amber')} cx="38%" cy="35%" r="72%">
          <stop stopColor="#ffce89" />
          <stop offset=".52" stopColor="#fba657" />
          <stop offset="1" stopColor="#ce682b" />
        </radialGradient>
        <radialGradient id={id('pupil-shade')} cx="45%" cy="38%" r="74%">
          <stop stopColor="#152635" />
          <stop offset="1" stopColor="#08151f" />
        </radialGradient>
        <linearGradient id={id('wing-shade')} x2=".65" y2="1">
          <stop stopColor="var(--owl-wing-base, #34558a)" />
          <stop offset="1" stopColor="var(--owl-deep-shadow, #172d50)" />
        </linearGradient>
        <linearGradient id={id('beak-shade')} x2=".6" y2="1">
          <stop stopColor="#ffb870" />
          <stop offset=".56" stopColor="#f69b50" />
          <stop offset="1" stopColor="#ce6a2e" />
        </linearGradient>
      </defs>
      <g id={id('tail')} data-part="tail">
        <path d="M105 222 Q98 241 108 244 Q115 244 119 237 Q122 248 129 244 Q140 240 133 222Z" fill="var(--owl-tail, #1b335a)" />
      </g>
      <g id={id('body')} data-part="body" className={cn(styles.part, styles.body)}>
        <path d="M120 128 C160 127 188 153 185 190 C183 220 160 240 120 240 C80 240 57 220 55 190 C52 153 80 127 120 128Z" fill={`url(#${id('body-shade')})`} />
        <path d="M82 169 C103 158 144 156 160 180 C171 200 157 225 139 232 C112 242 88 226 82 204 C80 196 80 182 82 169Z" fill="var(--owl-belly, #355687)" opacity=".3" />
        <path d="M89 219 Q103 228 113 226 Q124 233 139 226 Q147 224 154 218 Q147 234 124 235 Q102 234 89 219Z" fill="var(--owl-lower-feathers, #294771)" opacity=".6" />
        <g id={id('emblem')} data-part="emblem">
          <image href={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/circle_logo.png`} x="103" y="187" width="34" height="34" />
        </g>
      </g>
      <g id={id('wing-left')} data-part="wingLeft" className={cn(styles.part, styles.wingLeft)}>
        <path d="M69 146 C53 147 42 163 41 181 C40 197 48 214 61 221 C68 225 76 221 75 212 C84 213 85 205 81 195 C84 177 82 155 69 146Z" fill={`url(#${id('wing-shade')})`} />
        <path d="M68 150 C55 154 48 165 47 177 C51 181 60 181 66 176 C71 171 75 161 75 156Z" fill="var(--owl-coverts, #416193)" opacity=".65" />
        <path d="M66 177 C59 191 59 203 64 214 C70 218 75 212 73 204 C74 195 75 185 74 177Z" fill="var(--owl-wing-feathers, #284677)" />
        <path d="M54 181 C51 193 55 208 61 214" fill="none" stroke="var(--owl-wing-separation, #182f53)" strokeWidth="1.2" strokeLinecap="round" opacity=".3" />
      </g>
      <g id={id('wing-right')} data-part="wingRight" className={cn(styles.part, styles.wingRight)}>
        <g transform="translate(240 0) scale(-1 1)">
          <path d="M69 146 C53 147 42 163 41 181 C40 197 48 214 61 221 C68 225 76 221 75 212 C84 213 85 205 81 195 C84 177 82 155 69 146Z" fill={`url(#${id('wing-shade')})`} />
          <path d="M68 150 C55 154 48 165 47 177 C51 181 60 181 66 176 C71 171 75 161 75 156Z" fill="var(--owl-coverts, #416193)" opacity=".65" />
          <path d="M66 177 C59 191 59 203 64 214 C70 218 75 212 73 204 C74 195 75 185 74 177Z" fill="var(--owl-wing-feathers, #284677)" />
          <path d="M54 181 C51 193 55 208 61 214" fill="none" stroke="var(--owl-wing-separation, #182f53)" strokeWidth="1.2" strokeLinecap="round" opacity=".3" />
        </g>
      </g>
      <g id={id('feet')} data-part="feet" className={cn(styles.part, styles.feet)}>
        <g transform="translate(101 0)">
          <path d="M-5 232 Q0 229 5 232 L5 241 L-5 241Z" fill="#e18a43" />
          <path d="M-4 237 C-10 238 -11 244 -8 247 C-5 248 -4 243 -1 242 C-2 247 0 250 3 248 C5 246 3 243 3 241 C7 242 7 248 10 247 C13 246 10 239 5 238Z" fill="#f3a259" />
          <path d="M-8 247 Q-7 249 -6 248 M3 248 Q4 249 5 247 M10 247 Q11 248 12 246" fill="none" stroke="#ad7446" strokeWidth=".75" strokeLinecap="round" />
        </g>
        <g transform="translate(139 0)">
          <path d="M-5 232 Q0 229 5 232 L5 241 L-5 241Z" fill="#e18a43" />
          <path d="M-4 237 C-10 238 -11 244 -8 247 C-5 248 -4 243 -1 242 C-2 247 0 250 3 248 C5 246 3 243 3 241 C7 242 7 248 10 247 C13 246 10 239 5 238Z" fill="#f3a259" />
          <path d="M-8 247 Q-7 249 -6 248 M3 248 Q4 249 5 247 M10 247 Q11 248 12 246" fill="none" stroke="#ad7446" strokeWidth=".75" strokeLinecap="round" />
        </g>
      </g>
      <g id={id('head')} data-part="head" className={cn(styles.part, styles.head)} style={{ transform: `translateX(${look * 3}px) rotate(${look * 7}deg)` }}>
        <g id={id('ear-tufts')} data-part="earTufts">
          <path d="M53 56 C42 49 37 35 42 22 C44 17 49 19 51 23 C58 34 68 35 80 43Z" fill="var(--owl-ear, #2c4b7c)" />
          <path d="M49 29 Q55 40 68 45 Q59 45 52 39Z" fill="var(--owl-ear-highlight, #4770a5)" opacity=".6" />
          <path d="M187 56 C198 49 203 35 198 22 C196 17 191 19 189 23 C182 34 172 35 160 43Z" fill="var(--owl-ear, #2c4b7c)" />
          <path d="M191 29 Q185 40 172 45 Q181 45 188 39Z" fill="var(--owl-ear-highlight, #4770a5)" opacity=".6" />
        </g>
        <path d="M120 27 C169 24 207 51 213 95 C218 140 184 172 120 175 C56 172 22 140 27 95 C33 51 71 24 120 27Z" fill={`url(#${id('head-shade')})`} />
        <g id={id('crown')} data-part="crown" fill="var(--owl-crown, #2c4c7c)">
          <path d="M107 30 Q101 22 109 20 Q117 19 121 28Z" />
          <path d="M117 28 Q120 17 127 20 Q131 23 128 30Z" />
        </g>
        <path d="M51 62 C73 39 99 36 117 40 C93 40 70 48 56 64Z" fill="var(--owl-rim-highlight, #597bad)" opacity=".16" />
        <path d="M120 73 C105 57 76 55 56 71 C35 87 36 116 49 136 C63 154 86 162 120 171 C154 162 177 154 191 136 C204 116 205 87 184 71 C164 55 135 57 120 73Z" fill={`url(#${id('face-shade')})`} />
        <path d="M47 119 C55 148 85 157 120 166 C155 157 185 148 193 119 C188 151 155 164 120 171 C85 164 52 151 47 119Z" fill="#d7b994" opacity=".22" />
        <g id={id('brows')} data-part="brows" fill="#36547b" opacity=".72">
          <path d="M57 78 C66 71 81 70 93 74 C79 73 67 74 57 78Z" />
          <path d="M147 74 C159 70 174 71 183 78 C173 74 161 73 147 74Z" />
        </g>
        <g id={id('eye-left')} data-part="eye-left">
          <ellipse cx="81" cy="108" rx="29.5" ry="31.5" fill="#fff8ec" />
          <clipPath id={id('eye-clip-left')}>
            <ellipse cx="81" cy="108" rx="29.5" ry="31.5" />
          </clipPath>
          <g clipPath={`url(#${id('eye-clip-left')})`}>
            <g id={id('pupil-left')} data-part="pupil-left" className={styles.part} style={{ transform: `translate(${pupilX}px, ${pupilY}px)` }}>
              <ellipse cx="81" cy="108.5" rx="27.5" ry="29.5" fill={`url(#${id('amber')})`} />
              <path d="M60 123 Q81 140 102 122 Q94 136 81 137 Q67 136 60 123Z" fill="#ffd395" opacity=".55" />
              <ellipse cx="81" cy="107" rx="21.5" ry="23" fill={`url(#${id('pupil-shade')})`} />
              <ellipse cx="74" cy="97" rx="7" ry="6" transform="rotate(-25 74 97)" fill="#ffffff" />
              <circle cx="89" cy="116" r="2.8" fill="#fff5e5" opacity=".9" />
            </g>
          </g>
          <path d="M53 99 C57 83 71 77 81 77 C93 77 106 84 110 101" fill="none" stroke="#654a34" strokeWidth="1.3" strokeLinecap="round" opacity=".65" />
          <g id={id('lid-left')} data-part="lid-left" className={cn(styles.part, styles.lid)} style={{ transform: `scaleY(${blink ? 1 : 0})` }}>
            <ellipse cx="81" cy="108" rx="30.5" ry="32.5" fill="#f6e7d2" />
          </g>
        </g>
        <g id={id('eye-right')} data-part="eye-right">
          <ellipse cx="159" cy="108" rx="29.5" ry="31.5" fill="#fff8ec" />
          <clipPath id={id('eye-clip-right')}>
            <ellipse cx="159" cy="108" rx="29.5" ry="31.5" />
          </clipPath>
          <g clipPath={`url(#${id('eye-clip-right')})`}>
            <g id={id('pupil-right')} data-part="pupil-right" className={styles.part} style={{ transform: `translate(${pupilX}px, ${pupilY}px)` }}>
              <ellipse cx="159" cy="108.5" rx="27.5" ry="29.5" fill={`url(#${id('amber')})`} />
              <path d="M138 123 Q159 140 180 122 Q172 136 159 137 Q145 136 138 123Z" fill="#ffd395" opacity=".55" />
              <ellipse cx="159" cy="107" rx="21.5" ry="23" fill={`url(#${id('pupil-shade')})`} />
              <ellipse cx="152" cy="97" rx="7" ry="6" transform="rotate(-25 152 97)" fill="#ffffff" />
              <circle cx="167" cy="116" r="2.8" fill="#fff5e5" opacity=".9" />
            </g>
          </g>
          <path d="M131 99 C135 83 149 77 159 77 C171 77 184 84 188 101" fill="none" stroke="#654a34" strokeWidth="1.3" strokeLinecap="round" opacity=".65" />
          <g id={id('lid-right')} data-part="lid-right" className={cn(styles.part, styles.lid)} style={{ transform: `scaleY(${blink ? 1 : 0})` }}>
            <ellipse cx="159" cy="108" rx="30.5" ry="32.5" fill="#f6e7d2" />
          </g>
        </g>
        <g id={id('beak')} data-part="beak">
          <ellipse cx="120" cy="150" rx="5.5" ry="7.5" fill="#563224" opacity={talking || beakOpen > 0 ? 1 : 0} />
          <g id={id('beak-lower')} data-part="beakLower" className={cn(styles.part, styles.beakLower)} style={beakOpen ? { transform: `translateY(${beakOpen}px)` } : undefined}>
            <path d="M114 146 C115 154 125 154 126 146 Q120 150 114 146Z" fill="#d7803d" />
          </g>
          <path d="M111 136 C112 131 128 131 129 136 C130 142 126 149 121 152 C120 153 119 152 118 151 C114 147 110 142 111 136Z" fill={`url(#${id('beak-shade')})`} />
          <path d="M114 136 Q114 141 117 145" stroke="#ffdaa4" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity=".8" />
          <ellipse cx="116.5" cy="136" rx=".85" ry=".6" fill="#b96c32" />
          <ellipse cx="123.5" cy="136" rx=".85" ry=".6" fill="#b96c32" />
        </g>
      </g>
    </svg>
  );
}
