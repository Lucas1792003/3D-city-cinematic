'use client';

import { useEffect, useRef, useState, type ComponentType } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { Owl } from './Owl';

type Phase = 'waiting' | 'flying' | 'landed';

interface OwlSceneProps {
  /** Picked item's title; null before any pick (the owl greets instead). */
  title: string | null;
  line: string;
  Icon: ComponentType<{ className?: string }> | null;
  index: number | null;
  total: number;
  /** Cursor position (client px) while it is over the icon tiles; null otherwise. */
  pointer: { x: number; y: number } | null;
  panelId: string;
  labelledBy: string | null;
}

const TYPE_SPEED = 25; // characters per second

/** Wooden branch the owl lands on: bark, grain, knots, a cut end and leafy twigs (flat colours, no gradients). */
const BARK = '#6b4a2f';
const BARK_DARK = '#4a3220';
const BARK_LIGHT = '#8f6a45';
const HEARTWOOD = '#c9a27a';
const LEAF = '#5f8f4e';
const LEAF_DARK = '#46703a';

function Leaf({ x, y, rotate, dark = false }: { x: number; y: number; rotate: number; dark?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate})`}>
      <path d="M0 0C6-9 20-11 30-4C22 5 8 7 0 0z" fill={dark ? LEAF_DARK : LEAF} />
      <path d="M2 0C10-2 18-3 27-4" fill="none" stroke={LEAF_DARK} strokeWidth={1} strokeLinecap="round" opacity={0.7} />
    </g>
  );
}

function Branch() {
  return (
    <svg
      viewBox="0 0 560 80"
      preserveAspectRatio="none"
      className="absolute inset-x-0 bottom-0 h-[60px] w-full sm:h-[72px]"
      aria-hidden="true"
    >
      {/* Twig hanging below, behind the limb */}
      <path d="M352 58C368 66 380 72 398 76" fill="none" stroke={BARK_DARK} strokeWidth={4} strokeLinecap="round" />
      <Leaf x={396} y={76} rotate={-20} dark />
      <Leaf x={376} y={70} rotate={40} />

      {/* Broken stub pointing up */}
      <path d="M196 50C200 38 206 30 214 24L222 28C214 34 210 42 208 52z" fill={BARK} />
      <ellipse cx={218} cy={26} rx={5} ry={3} transform="rotate(-35 218 26)" fill={HEARTWOOD} />

      {/* Upward twig with leaves */}
      <path d="M462 44C470 34 476 24 490 16" fill="none" stroke={BARK} strokeWidth={4} strokeLinecap="round" />
      <path d="M478 26C486 26 494 30 500 36" fill="none" stroke={BARK} strokeWidth={2.5} strokeLinecap="round" />
      <Leaf x={490} y={16} rotate={-25} />
      <Leaf x={499} y={36} rotate={20} dark />
      <Leaf x={471} y={33} rotate={-150} />

      {/* Main limb: thick on the left, tapering to the tip */}
      <path
        d="M0 44C120 45 220 51 320 49C420 47 500 41 550 37L558 38C504 50 424 59 320 62C220 65 120 63 0 65z"
        fill={BARK}
      />
      {/* Underside shadow */}
      <path d="M0 58C120 57 220 59 320 57C420 55 500 47 556 38C504 50 424 59 320 62C220 65 120 63 0 65z" fill={BARK_DARK} />
      {/* Sunlit top edge */}
      <path d="M0 45.5C120 46.5 220 52.5 320 50.5C420 48.5 500 42.5 548 38.5" fill="none" stroke={BARK_LIGHT} strokeWidth={2.5} strokeLinecap="round" />

      {/* Bark grain */}
      <g fill="none" stroke={BARK_DARK} strokeLinecap="round" opacity={0.8}>
        <path d="M14 50C60 50 90 52 130 52" strokeWidth={1.4} />
        <path d="M40 55C90 55 130 57 170 56" strokeWidth={1.2} />
        <path d="M150 52C190 53 230 56 250 55" strokeWidth={1.2} />
        <path d="M285 54C330 54 370 52 400 51" strokeWidth={1.2} />
        <path d="M300 58C340 58 380 56 410 54" strokeWidth={1} />
        <path d="M420 49C450 48 480 45 510 42" strokeWidth={1} />
        <path d="M96 48c8 1 14 3 18 6M340 52c6 0 12 2 16 4" strokeWidth={1} />
      </g>

      {/* Knots */}
      <g>
        <ellipse cx={268} cy={55} rx={9} ry={5} fill={BARK_DARK} />
        <ellipse cx={268} cy={55} rx={5} ry={2.6} fill="none" stroke={BARK_LIGHT} strokeWidth={1.2} />
        <ellipse cx={435} cy={50} rx={5} ry={3} fill={BARK_DARK} />
        <ellipse cx={435} cy={50} rx={2.4} ry={1.4} fill={BARK_LIGHT} />
      </g>

      {/* Cut end with growth rings */}
      <ellipse cx={2} cy={54.5} rx={6} ry={10.5} fill={HEARTWOOD} stroke={BARK_DARK} strokeWidth={2} />
      <ellipse cx={2} cy={54.5} rx={3.6} ry={6.5} fill="none" stroke={BARK_LIGHT} strokeWidth={1} />
      <ellipse cx={2} cy={54.5} rx={1.6} ry={3} fill="none" stroke={BARK_LIGHT} strokeWidth={1} />

      {/* Leaf cluster at the tip */}
      <Leaf x={552} y={37} rotate={-35} />
      <Leaf x={548} y={39} rotate={30} dark />
    </svg>
  );
}

export function OwlScene({ title, line, Icon, index, total, pointer, panelId, labelledBy }: OwlSceneProps) {
  const reduce = useReducedMotion() ?? false;
  const scene = useRef<HTMLDivElement>(null);
  const owlRef = useRef<HTMLDivElement>(null);
  const [gaze, setGaze] = useState<{ x: number; y: number } | null>(null);
  const arrived = useInView(scene, { once: true, amount: 0.4 });
  const visible = useInView(scene, { amount: 0.1 });
  const [phase, setPhase] = useState<Phase>('waiting');
  const [hop, setHop] = useState(0);
  // Starts empty: the greeting types out once the owl has landed.
  const [typed, setTyped] = useState(0);
  const [pageVisible, setPageVisible] = useState(true);
  const lastIndex = useRef(index);

  const landed = reduce || phase === 'landed';

  // Fly in once the section is reached.
  useEffect(() => {
    if (!arrived || reduce) return;
    const frame = requestAnimationFrame(() => setPhase((p) => (p === 'waiting' ? 'flying' : p)));
    return () => cancelAnimationFrame(frame);
  }, [arrived, reduce]);

  useEffect(() => {
    const onVisibility = () => setPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // A new tile was picked: hop, type the line out, and keep the bubble in sight on small screens.
  useEffect(() => {
    if (index === lastIndex.current) return;
    lastIndex.current = index;
    const frame = requestAnimationFrame(() => {
      setHop((n) => n + 1);
      setTyped(reduce ? line.length : 0);
      const el = scene.current;
      if (el && window.innerWidth < 1024) {
        const r = el.getBoundingClientRect();
        if (r.bottom < 80 || r.top > window.innerHeight - 80) {
          el.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
        }
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [index, line.length, reduce]);

  // Eyes follow the cursor while it is over the icon tiles; otherwise they look straight at the viewer.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const owl = owlRef.current;
      if (!pointer || !owl) { setGaze(null); return; }
      const r = owl.getBoundingClientRect();
      const dx = pointer.x - (r.left + r.width / 2);
      const dy = pointer.y - (r.top + r.height * 0.4); // eye line
      const dist = Math.hypot(dx, dy) || 1;
      const reach = Math.min(1, dist / 160);
      setGaze({ x: (dx / dist) * reach, y: (dy / dist) * reach });
    });
    return () => cancelAnimationFrame(frame);
  }, [pointer]);

  // Typewriter (visual only — screen readers get the full line straight away).
  useEffect(() => {
    if (typed >= line.length || !landed) return;
    if (reduce) { const f = requestAnimationFrame(() => setTyped(line.length)); return () => cancelAnimationFrame(f); }
    const timer = setTimeout(() => setTyped((n) => Math.min(line.length, n + 1)), 1000 / TYPE_SPEED);
    return () => clearTimeout(timer);
  }, [typed, line.length, landed, reduce]);

  const talking = landed && typed < line.length;
  const idle = landed && !reduce && visible && pageVisible;
  // Over the tiles the head turns a little toward the cursor; otherwise it faces the viewer.
  const look = gaze ? gaze.x * 0.5 : 0;

  return (
    <div ref={scene} className="relative mt-6 sm:mt-10 min-h-[20rem] sm:min-h-[19rem]">
      <Branch />

      {/* Owl: flies in along an arc, then perches on the branch at the left */}
      <motion.div
        className="absolute bottom-[1.2rem] left-0 w-[8.5rem] sm:bottom-[1.4rem] sm:left-2 sm:w-[11rem]"
        initial={reduce ? false : { opacity: 0, x: 520, y: -260, rotate: -12 }}
        animate={
          reduce || phase === 'landed'
            ? { opacity: 1, x: 0, y: 0, rotate: 0 }
            : phase === 'flying'
              ? { opacity: [0, 1, 1, 1], x: [520, 320, 110, 0], y: [-260, -230, -110, 0], rotate: [-12, -6, 10, 0] }
              : { opacity: 0, x: 520, y: -260, rotate: -12 }
        }
        transition={phase === 'flying' ? { duration: 1.9, times: [0, 0.35, 0.75, 1], ease: 'easeInOut' } : { duration: 0 }}
        onAnimationComplete={() => { if (phase === 'flying') setPhase('landed'); }}
      >
        {/* Landing bounce, then a hop each time a new tile is picked */}
        <motion.div
          ref={owlRef}
          key={landed && !reduce ? `perch-${hop}` : 'still'}
          initial={{ y: 0 }}
          animate={landed && !reduce ? { y: hop ? [0, -14, 0] : [0, 7, 0] } : { y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
        >
          <Owl pose={phase === 'flying' ? 'flying' : 'perched'} talking={talking} look={look} gaze={gaze} idle={idle} className="h-auto w-full" />
        </motion.div>
      </motion.div>

      {/* Speech bubble */}
      <motion.div
        id={panelId}
        role="tabpanel"
        aria-labelledby={labelledBy ?? undefined}
        aria-label={labelledBy ? undefined : 'CyfroSec owl'}
        className="absolute bottom-[4rem] left-[8.75rem] right-0 sm:bottom-[4.5rem] sm:left-[11.25rem]"
        initial={false}
        animate={{ opacity: landed ? 1 : 0, scale: landed ? 1 : 0.92, y: landed ? 0 : 10 }}
        transition={{ duration: reduce ? 0 : 0.35, ease: 'easeOut' }}
        style={{ transformOrigin: 'left bottom' }}
      >
        <button
          type="button"
          onClick={() => setTyped(line.length)}
          className="relative block w-full cursor-default rounded-2xl border border-lp-border bg-lp-card p-4 text-start shadow-[var(--shadow-card)] sm:p-5"
          tabIndex={-1}
        >
          {/* Tail on the left edge, pointing at the owl's beak */}
          <span aria-hidden="true" className="absolute -left-2 bottom-[2.1rem] size-4 rotate-45 border-b border-l border-lp-border bg-lp-card sm:bottom-[3rem]" />
          {Icon && title && index !== null && (
            <>
              <span className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-lp-muted">
                <Icon className="size-3.5 text-[#0278ae] dark:text-[#33afdf]" aria-hidden="true" />
                {String(index + 1).padStart(2, '0')} / {total}
              </span>
              <span className="mt-2 block text-base sm:text-lg font-semibold text-lp-heading">{title}</span>
            </>
          )}
          <span aria-live="polite" className="sr-only">{line}</span>
          <span aria-hidden="true" className={`block text-sm sm:text-base leading-relaxed text-lp-body ${title ? 'mt-1.5 min-h-[4.5rem]' : 'text-base sm:text-lg font-medium text-lp-heading'}`}>
            {line.slice(0, typed)}
            {typed < line.length && <span className="ms-0.5 inline-block h-4 w-0.5 translate-y-0.5 animate-pulse bg-lp-body" />}
          </span>
        </button>
      </motion.div>
    </div>
  );
}
