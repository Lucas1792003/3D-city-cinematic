'use client';

import { useEffect, useRef, useSyncExternalStore, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/src/i18n';
import { clamp, seg } from './timeline';
import { ACTS } from './worldData';
import World, { ART_ANSWER_AT as ANSWER_AT, type WorldHandle } from './WorldArt';

/**
 * "Why traditional platforms fall behind" as one continuous story.
 * Scroll position is the only clock: it drives the camera, every world object and the
 * captions. Nothing is mounted, swapped or timed.
 */

type Range = readonly [number, number];
type Copy = { eyebrow: string; name: string; description: string; impact: string; metricLabel: string; metricValue: string };

// Story order → index into t.problem.cards (which keeps its original order).
const PROBLEMS: { card: number; range: Range; to: number }[] = [
  { card: 1, range: ACTS.alert, to: 0.125 },
  { card: 0, range: ACTS.context, to: 0.31 },
  { card: 3, range: ACTS.code, to: 0.53 },
  { card: 2, range: ACTS.visibility, to: 0.675 },
];
const ALL: Range[] = [...PROBLEMS.map((a) => a.range), ACTS.cyfrosec];

const REDUCE = '(prefers-reduced-motion: reduce)';
const subscribeReduce = (cb: () => void) => {
  const mq = window.matchMedia(REDUCE);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
};
const useReducedMotion = () =>
  useSyncExternalStore(subscribeReduce, () => window.matchMedia(REDUCE).matches, () => false);

/* ── Shared text blocks ── */

export function ProblemText({ n, c, large }: { n: number; c: Copy; large?: boolean }) {
  return (
    <>
      <p className="flex items-baseline gap-3 text-xs font-bold uppercase tracking-[0.18em]">
        <span className="tabular-nums text-lp-link">{String(n).padStart(2, '0')}</span>
        <span className="text-lp-muted">{c.eyebrow}</span>
      </p>
      <h3 className={cn('mt-3 font-bold leading-[1.12] tracking-tight text-lp-heading', large ? 'text-[2rem] 2xl:text-[2.35rem]' : 'text-2xl sm:text-[1.75rem]')}>
        {c.name}
      </h3>
      <p className="mt-4 text-base leading-relaxed text-lp-body">{c.description}</p>
      <p className="mt-3 text-[0.95rem] leading-relaxed text-lp-muted">{c.impact}</p>
      <p className="mt-5 border-s-2 border-lp-accent ps-4">
        <span className="block text-[11px] font-bold uppercase tracking-[0.16em] text-lp-accent-text">{c.metricLabel}</span>
        <span className="mt-1 block text-lg font-bold text-lp-heading">{c.metricValue}</span>
      </p>
    </>
  );
}

export type Answer = { problem: string; title: string; body: string; at: number };

export function AnswersText({ title, answers, rowRef }: { title: ReactNode; answers: Answer[]; rowRef?: (i: number) => (el: HTMLElement | null) => void }) {
  return (
    <>
      <p className="flex items-baseline gap-3 text-xs font-bold uppercase tracking-[0.18em]">
        <span className="tabular-nums text-lp-link">05</span>
        <span className="text-lp-link">CyfroSec</span>
      </p>
      <h3 className="mt-3 text-2xl font-bold leading-tight tracking-tight text-lp-heading sm:text-[1.75rem]">{title}</h3>
      <ol className="mt-5 flex flex-col gap-4">
        {answers.map((a, i) => (
          <li key={a.title} ref={rowRef?.(i)} className="border-s-2 border-lp-brand ps-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-lp-muted">{a.problem}</p>
            <p className="mt-0.5 text-[0.95rem] font-bold text-lp-heading">{a.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-lp-body">{a.body}</p>
          </li>
        ))}
      </ol>
    </>
  );
}

/* ── Phones: each act plays its own transformation when it scrolls into view ── */

function ActScene({ from, to, still, duration = 2100 }: { from: number; to: number; still: boolean; duration?: number }) {
  const world = useRef<WorldHandle>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const w = world.current;
    const el = box.current;
    if (!w || !el) return;
    if (still) {
      w.apply(to);
      return;
    }
    w.apply(from);
    let raf = 0;
    const play = () => {
      const start = performance.now();
      const tick = (now: number) => {
        const t = clamp((now - start) / duration);
        const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
        w.apply(from + (to - from) * e);
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(
      ([e]) => {
        cancelAnimationFrame(raf);
        if (e.isIntersecting) play();
        else w.apply(from); // reset off screen, so it replays on return
      },
      { threshold: 0.45 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [from, to, still, duration]);

  return (
    <div ref={box} className="mt-7 aspect-[10/7] lg:mt-0 overflow-hidden rounded-2xl border border-lp-border bg-lp-page">
      <World ref={world} idle={!still} />
    </div>
  );
}

export default function CinematicStory() {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const cards = t.problem.cards;
  const brings = t.problem.brings;

  const answers: Answer[] = [
    // In the order the world shows them: connect the sources, add context, prioritize, make it actionable
    { problem: cards[2].eyebrow, title: brings.items[0].title, body: brings.items[0].description, at: ANSWER_AT.visibility },
    { problem: cards[0].eyebrow, title: t.highlights.items[0].title, body: t.highlights.items[0].description, at: ANSWER_AT.context },
    { problem: cards[1].eyebrow, title: t.outcomes.items[1].title, body: t.outcomes.items[1].description, at: ANSWER_AT.noise },
    { problem: cards[3].eyebrow, title: t.pages.cyfroCode.useCases[0].title, body: t.pages.cyfroCode.useCases[0].body, at: ANSWER_AT.code },
  ];
  const answersTitle = (
    <>
      {brings.titlePre}
      <span className="text-lp-link">{brings.titleBrand}</span>
      {brings.titleMid}
      {brings.titlePost}
    </>
  );
  const railLabels = [...PROBLEMS.map((a) => cards[a.card].eyebrow), brings.titleBrand];

  /* Desktop: scroll → p → world + captions + rail, written straight to the DOM */
  const section = useRef<HTMLDivElement>(null);
  const world = useRef<WorldHandle>(null);
  const worldBox = useRef<HTMLDivElement>(null);
  const captionCol = useRef<HTMLDivElement>(null);
  const captions = useRef<(HTMLElement | null)[]>([]);
  const rows = useRef<(HTMLElement | null)[]>([]);
  const railFill = useRef<(HTMLElement | null)[]>([]);
  const railLabel = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const el = section.current;
    if (!el || reduced) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      if (el.offsetParent === null) return; // hidden below lg
      const r = el.getBoundingClientRect();
      const p = clamp(-r.top / (r.height - window.innerHeight));
      // The world gets its own region, right of the captions
      const col = captionCol.current;
      const box = worldBox.current;
      if (col && box) box.style.left = `${Math.round(col.getBoundingClientRect().right + 24)}px`;
      world.current?.apply(p);

      ALL.forEach(([a, b], i) => {
        const node = captions.current[i];
        if (!node) return;
        // Hand off without overlap: the old caption is gone before the next one arrives
        const enter = i === 0 ? 1 : seg(p, a + 0.002, a + 0.02);
        const leave = i === ALL.length - 1 ? 1 : 1 - seg(p, b - 0.02, b - 0.002);
        const op = enter * leave;
        node.style.opacity = op.toFixed(3);
        node.style.transform = `translateY(${((1 - enter) * 28 - (1 - leave) * 28).toFixed(1)}px)`;
        node.style.pointerEvents = op > 0.5 ? 'auto' : 'none';
        const fill = railFill.current[i];
        if (fill) fill.style.transform = `scaleX(${clamp((p - a) / (b - a)).toFixed(3)})`;
        railLabel.current[i]?.setAttribute('data-active', String(p >= a && (p < b || i === ALL.length - 1)));
      });
      answers.forEach((ans, i) => {
        const row = rows.current[i];
        if (!row) return;
        const v = seg(p, ans.at - 0.012, ans.at + 0.02);
        row.style.opacity = (0.15 + 0.85 * v).toFixed(3);
        row.style.transform = `translateX(${((1 - v) * 10).toFixed(1)}px)`;
      });
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          window.addEventListener('scroll', onScroll, { passive: true });
          window.addEventListener('resize', onScroll);
          onScroll();
        } else {
          window.removeEventListener('scroll', onScroll);
          window.removeEventListener('resize', onScroll);
        }
      },
      { rootMargin: '200px 0px' },
    );
    io.observe(el);
    update();
    return () => {
      io.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
    // answers' timings are static; the copy itself doesn't affect the effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  const durations = ALL.map(([a, b]) => b - a);

  return (
    <>
      {/* Desktop: one pinned cinematic frame. The page scrolls normally; the frame follows. */}
      {!reduced && (
        <div ref={section} className="relative hidden lg:block" style={{ height: '960vh' }}>
          <div className="sticky top-0 h-screen overflow-hidden">
            <div
              ref={worldBox}
              className="absolute bottom-20 right-0 top-24"
              style={{ left: '44%', maskImage: 'linear-gradient(to right, transparent, #000 72px)' }}
              aria-hidden="true"
            >
              <World ref={world} idle={!reduced} />
            </div>

            <div className="container relative mx-auto h-full max-w-screen-xl px-8 3xl:max-w-screen-2xl">
              <div ref={captionCol} className="relative h-full w-[min(30rem,38%)] pb-24 pt-28">
                {PROBLEMS.map(({ card }, i) => (
                  <div key={card} className="absolute inset-x-0 bottom-24 top-28 flex items-center">
                    <div
                      ref={(node) => {
                        captions.current[i] = node;
                      }}
                      style={{ opacity: i === 0 ? 1 : 0 }}
                    >
                      <ProblemText n={i + 1} c={cards[card]} large />
                    </div>
                  </div>
                ))}
                <div className="absolute inset-x-0 bottom-24 top-28 flex items-center">
                  <div
                    ref={(node) => {
                      captions.current[PROBLEMS.length] = node;
                    }}
                    style={{ opacity: 0 }}
                  >
                    <AnswersText
                      title={answersTitle}
                      answers={answers}
                      rowRef={(i) => (node) => {
                        rows.current[i] = node;
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Chapter rail: where you are in the story */}
              <div className="absolute bottom-9 left-8 right-8 flex gap-2" aria-hidden="true">
                {railLabels.map((label, i) => (
                  <div key={label} className="min-w-0" style={{ flexGrow: durations[i], flexBasis: 0 }}>
                    <div className="h-[3px] overflow-hidden rounded-full bg-lp-border">
                      <div
                        ref={(node) => {
                          railFill.current[i] = node;
                        }}
                        className={cn('h-full origin-left', i === ALL.length - 1 ? 'bg-lp-brand' : 'bg-lp-accent')}
                        style={{ transform: 'scaleX(0)' }}
                      />
                    </div>
                    <p
                      ref={(node) => {
                        railLabel.current[i] = node;
                      }}
                      className="mt-2 truncate text-[11px] font-bold uppercase tracking-[0.14em] text-lp-muted transition-colors duration-300 data-[active=true]:text-lp-heading"
                    >
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Phones (and reduced motion everywhere): a vertical story, one act at a time */}
      <ol className={cn('container mx-auto flex max-w-screen-xl flex-col gap-16 px-4 sm:gap-20 sm:px-6 lg:px-8', !reduced && 'lg:hidden', reduced && 'lg:mt-14')}>
        {PROBLEMS.map(({ card, range, to }, i) => (
          <li key={card} className="lg:grid lg:grid-cols-2 lg:items-center lg:gap-14">
            <div>
              <ProblemText n={i + 1} c={cards[card]} />
            </div>
            <ActScene from={range[0]} to={to} still={reduced} />
          </li>
        ))}
        <li className="lg:grid lg:grid-cols-2 lg:items-center lg:gap-14">
          <div>
            <AnswersText title={answersTitle} answers={answers} />
          </div>
          <ActScene from={ACTS.cyfrosec[0]} to={1} still={reduced} duration={3400} />
        </li>
      </ol>
    </>
  );
}
