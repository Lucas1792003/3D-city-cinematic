'use client';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { ARCH_SECTION_ID, NAV_TOP_EVENT, centredScrollTop, clearHandoff, expectedCityStage, readHandoff, type Handoff, type StageRect } from '../cityHandoff';
import { useTranslation } from '@/src/i18n';
import { ACTS, type TabView } from './cinematic';
import type { CameraMode, Hotspot } from './CinematicScene';
import styles from './Cinematic.module.css';

const CinematicScene = dynamic(() => import('./CinematicScene'), { ssr: false });

const subReduce = (cb: () => void) => { const m = window.matchMedia('(prefers-reduced-motion: reduce)'); m.addEventListener('change', cb); return () => m.removeEventListener('change', cb); };
const subTheme = (cb: () => void) => { const o = new MutationObserver(cb); o.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] }); return () => o.disconnect(); };

/** Where each of the 11 components (and the 3 zones) sits in the one world coordinate system. */
const POS: Record<string, [number, number, number]> = {
  sources: [-6, 0.4, 3.95], processing: [0, 0.4, 3.95], outputs: [6, 0.4, 3.95],
  'ai-infra': [-6.7, 3.45, -1.7], network: [-4.65, 1.35, 1.6], 'code-src': [-7.15, 3.15, 1.6],
  agent: [-1.46, 1.55, 1.9], ingestion: [1.16, 1.55, 1.9], engine: [0.3, 3.85, -0.9],
  insights: [6, 3.95, -1.95], assistant: [4.81, 1.0, 1.9], 'code-out': [7.19, 1.0, 2.25], compliance: [4.4, 2.35, -0.8], dashboards: [7.6, 2.35, -0.8],
};

/**
 * PROTOTYPE · the architecture as a continuously operating miniature world.
 * Scroll controls visibility. Time controls animation. The visitor's tab choice controls exploration.
 */
export default function ArchitectureCinematic({ outroRequest = 0, onOutroEnd, onOutroCancelled }: {
  /** increments when the visitor asks for the 3D City (homepage CTA) */
  outroRequest?: number;
  /** the outro finished (frame = a JPEG of its last, Engine-only frame), was skipped (null), or is not possible here (null) */
  onOutroEnd?: (frame: string | null) => void;
  onOutroCancelled?: () => void;
} = {}) {
  const { t } = useTranslation();
  const a = t.archDetail;
  const pa = t.platformArch;
  const reduced = useSyncExternalStore(subReduce, () => window.matchMedia('(prefers-reduced-motion: reduce)').matches, () => false);
  const dark = useSyncExternalStore(subTheme, () => document.documentElement.classList.contains('dark'), () => true);

  // Exact names and descriptions from the existing copy (t.archDetail)
  const info = useMemo(() => {
    const m: Record<string, { name: string; desc: string }> = {
      sources: { name: a.sourceLabel, desc: a.dataSources.map((d) => d.label).join(' · ') },
      processing: { name: a.processingLabel, desc: a.processingSteps.map((d) => d.title).join(' · ') },
      outputs: { name: a.outputLabel, desc: a.outputs.map((d) => d.label).join(' · ') },
    };
    ['ai-infra', 'network', 'code-src'].forEach((id, i) => (m[id] = { name: a.dataSources[i].label, desc: a.dataSources[i].sub }));
    ['agent', 'ingestion', 'engine'].forEach((id, i) => (m[id] = { name: a.processingSteps[i].title, desc: a.processingSteps[i].subtitle }));
    ['insights', 'assistant', 'code-out', 'compliance', 'dashboards'].forEach((id, i) => (m[id] = { name: a.outputs[i].label, desc: a.outputs[i].sub }));
    return m;
  }, [a]);
  const hotspots: Hotspot[] = useMemo(() => Object.keys(POS).map((id) => ({ id, label: info[id].name, desc: info[id].desc, at: POS[id] })), [info]);

  const [mode, setMode] = useState<CameraMode>({ view: null, replay: 0, skip: 0, reset: 0, zoom: 0 });
  /* coming back from /platform-city: a short reassembly around the Engine (or, after a skip, the finished
     architecture) — never the 20 s introduction. Read once; the record is cleared when it has been used. */
  const [ret] = useState<Handoff | null>(() => (typeof window !== 'undefined' ? readHandoff('home') : null));
  const [entry] = useState<'tour' | 'overview' | 'return'>(() => (ret ? (ret.img && !window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'return' : 'overview') : 'tour'));
  const [introDone, setIntroDone] = useState(false);
  const [frozen, setFrozen] = useState(false);
  const [actId, setActId] = useState(1);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const onAct = useCallback((id: number) => setActId(id), []);
  const onIntroDone = useCallback((d: boolean) => setIntroDone(d), []);
  const onReady = useCallback(() => setReady(true), []);
  const onError = useCallback(() => setFailed(true), []);

  /* ── outro to the 3D City: the stage glides to where the city page's stage will be, the rest of the page fades
     to the page background (under the site nav), and the scene separates around the Engine (CinematicScene). ── */
  const stageRef = useRef<HTMLDivElement>(null);
  const [flip, setFlip] = useState<{ from: StageRect; to: StageRect; on: boolean; back?: boolean } | null>(() => (entry === 'return' && ret ? { from: ret.rect ?? expectedCityStage(), to: ret.rect ?? expectedCityStage(), on: false, back: true } : null));
  const [veil, setVeil] = useState<'hold' | 'fade' | 'gone'>(entry === 'return' ? 'hold' : 'gone');
  const placeholderRef = useRef<HTMLDivElement>(null);
  const endRef = useRef(onOutroEnd), cancelRef = useRef(onOutroCancelled);
  useEffect(() => { endRef.current = onOutroEnd; cancelRef.current = onOutroCancelled; });
  const lastReq = useRef(outroRequest);
  useEffect(() => {
    if (outroRequest === lastReq.current) return;
    lastReq.current = outroRequest;
    if (reduced || failed || !ready || !stageRef.current) { endRef.current?.(null); return; } // no cinematic here: plain navigation
    const r = stageRef.current.getBoundingClientRect();
    setFlip({ from: { top: r.top, left: r.left, width: r.width, height: r.height }, to: expectedCityStage(), on: false });
    setMode((m) => ({ ...m, outro: (m.outro ?? 0) + 1 }));
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setFlip((f) => (f ? { ...f, on: true } : f))));
    return () => cancelAnimationFrame(id);
  }, [outroRequest, reduced, failed, ready]);
  const cancelOutro = useCallback(() => { setMode((m) => ({ ...m, outroCancel: (m.outroCancel ?? 0) + 1 })); setFlip(null); setVeil('gone'); cancelRef.current?.(); }, []);
  useEffect(() => {
    if (!flip) return;
    window.dispatchEvent(new CustomEvent(NAV_TOP_EVENT, { detail: true })); // the site nav takes the city page's top state
    // while the outro plays: Escape returns to the homepage, and the page does not scroll underneath it
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') cancelOutro(); };
    const stop = (e: Event) => e.preventDefault();
    window.addEventListener('keydown', onKey); window.addEventListener('wheel', stop, { passive: false }); window.addEventListener('touchmove', stop, { passive: false });
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('wheel', stop); window.removeEventListener('touchmove', stop); window.dispatchEvent(new CustomEvent(NAV_TOP_EVENT, { detail: false })); };
  }, [flip, cancelOutro]);
  const onOutroDone = useCallback((frame: string | null) => endRef.current?.(frame), []);

  // land on this section, centred under the site nav, before the first paint (no flash of the top of the page)
  useLayoutEffect(() => {
    if (!ret && window.location.hash !== `#${ARCH_SECTION_ID}`) return;
    const target = () => { const st = (flip ? placeholderRef.current : stageRef.current) ?? stageRef.current; return st ? centredScrollTop(st) : null; };
    const align = () => { const y = target(); if (y !== null) window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior }); };
    align();
    if (flip && placeholderRef.current) { const r = placeholderRef.current.getBoundingClientRect(); const to = { top: r.top, left: r.left, width: r.width, height: r.height }; setFlip((f) => (f ? { ...f, to } : f)); }
    // content above may still settle (fonts, images): keep the section centred for a moment unless the visitor scrolls
    let stop = false; const quit = () => { stop = true; };
    window.addEventListener('wheel', quit, { passive: true, once: true }); window.addEventListener('touchstart', quit, { passive: true, once: true }); window.addEventListener('keydown', quit, { once: true });
    const t0 = performance.now(); let raf = 0;
    const keep = () => { if (stop || performance.now() - t0 > 900) return; align(); raf = requestAnimationFrame(keep); };
    raf = requestAnimationFrame(keep);
    if (entry !== 'return') { clearHandoff(); document.getElementById('arch-cine-heading')?.focus({ preventScroll: true }); }
    return () => { cancelAnimationFrame(raf); window.removeEventListener('wheel', quit); window.removeEventListener('touchstart', quit); window.removeEventListener('keydown', quit); };
    // once, at mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // the return, once the scene is up: the held city frame crossfades into the live scene, then the stage glides back
  // into the page while the architecture reassembles around the Engine
  const finishReturn = useCallback(() => { setFlip(null); setVeil('gone'); clearHandoff(); document.getElementById('arch-cine-heading')?.focus({ preventScroll: true }); }, []);
  useEffect(() => {
    if (entry !== 'return') return;
    if (failed) { const id = window.setTimeout(finishReturn, 0); return () => window.clearTimeout(id); } // no 3D: show the page as it is
    if (veil === 'hold' && ready) { const id = window.setTimeout(() => setVeil('fade'), 120); return () => window.clearTimeout(id); }
    if (veil === 'fade') {
      const id = window.setTimeout(() => { setVeil('gone'); setFlip((f) => (f ? { ...f, on: true } : f)); setMode((m) => ({ ...m, returnGo: (m.returnGo ?? 0) + 1 })); }, 450);
      return () => window.clearTimeout(id);
    }
  }, [entry, veil, ready, failed, finishReturn]);
  useEffect(() => { // never stuck: if the scene does not come up, show the page as it is
    if (entry !== 'return') return;
    const id = window.setTimeout(() => { if (!ready) { setMode((m) => ({ ...m, outroCancel: (m.outroCancel ?? 0) + 1 })); finishReturn(); } }, 6000);
    return () => window.clearTimeout(id);
  }, [entry, ready, finishReturn]);
  const outroOn = !!flip;
  const rect = flip ? (flip.on ? flip.to : flip.from) : null;

  const touring = mode.view === null && !reduced && !introDone;
  const tabs: { view: TabView; label: string }[] = [
    { view: 'overview', label: 'Overview' },
    { view: 'sources', label: a.sourceLabel },
    { view: 'processing', label: a.processingLabel },
    { view: 'outputs', label: a.outputLabel },
  ];
  const act = ACTS.find((x) => x.id === actId);

  return (
    <section id="architecture-detail" aria-labelledby="arch-cine-heading" className={styles.section}>
      <header className={styles.head}>
        <h2 id="arch-cine-heading" tabIndex={-1}>{a.titlePre} {a.titleHighlight}</h2>
        <p>{a.subtitle}</p>
      </header>

      <div className={styles.tabs} role="group" aria-label="Architecture camera views">
        {tabs.map((tab) => (
          <button key={tab.view} type="button" aria-pressed={mode.view === tab.view} onClick={() => setMode((m) => ({ ...m, view: tab.view }))}>
            {tab.label}
          </button>
        ))}
      </div>

      {flip && <div ref={placeholderRef} aria-hidden="true" className={styles.stagePlaceholder} /> /* holds the stage's place in the page while it is lifted out */}
      {flip && <div aria-hidden="true" className={styles.outroBackdrop} data-on={(flip.back ? !flip.on : flip.on) ? 'true' : 'false'} />}
      <div ref={stageRef} className={styles.stage} data-outro={outroOn ? 'true' : undefined}
        style={rect ? { position: 'fixed', top: rect.top, left: rect.left, width: rect.width, height: rect.height, zIndex: 41 } : undefined}>
        {!failed && (
          <CinematicScene dark={dark} reduced={reduced} mode={mode} frozen={frozen} hotspots={hotspots}
            onAct={onAct} onIntroDone={onIntroDone} onReady={onReady} onError={onError} onOutroDone={onOutroDone}
            entry={entry} onReturnDone={finishReturn} />
        )}
        {veil !== 'gone' && ret?.img && (
          // eslint-disable-next-line @next/next/no-img-element -- a one-off data URL frame from the city page, not an asset
          <img className={styles.returnVeil} data-state={veil} src={ret.img} alt="" aria-hidden="true" />
        )}
        {(!ready || failed) && <p className={styles.loading}>{failed ? 'The 3D view is unavailable in this browser.' : 'Loading the miniature environment…'}</p>}

        <p className={styles.final} style={{ opacity: touring && actId === 6 ? 1 : 0 }}>
          {pa.titlePre} <span>{pa.titleHighlight}</span>
        </p>


        {/* View controls: zoom and Reset View (the camera only; machines keep running) */}
        <div className={styles.viewCtl} role="group" aria-label="View controls" hidden={outroOn}>
          <button type="button" aria-label="Zoom out" onClick={() => setMode((m) => ({ ...m, zoom: m.zoom - 1 }))}>−</button>
          <button type="button" aria-label="Zoom in" onClick={() => setMode((m) => ({ ...m, zoom: m.zoom + 1 }))}>+</button>
          <button type="button" onClick={() => setMode((m) => ({ ...m, view: null, reset: m.reset + 1 }))}>Reset view</button>
        </div>

        {outroOn ? (
          <div className={styles.hud}>
            {flip?.back ? (
              <>
                <span className={styles.marker} aria-live="polite">Back to Platform Architecture</span>
                <button type="button" onClick={cancelOutro}>Skip</button>
              </>
            ) : (
              <>
                <span className={styles.marker} aria-live="polite">Opening the 3D City…</span>
                <button type="button" onClick={() => endRef.current?.(null)}>Skip</button>
                <button type="button" onClick={cancelOutro}>Stay here</button>
              </>
            )}
          </div>
        ) : (
        <div className={styles.hud}>
          <span className={styles.marker} aria-live="polite">
            {touring ? `Introduction · ${act?.name ?? ''}` : 'Drag to rotate · hover any machine to see what it does'}
          </span>
          {touring && <button type="button" onClick={() => setMode((m) => ({ ...m, skip: m.skip + 1 }))}>Skip intro</button>}
          {!touring && !reduced && <button type="button" onClick={() => setMode((m) => ({ ...m, view: null, replay: m.replay + 1 }))}>Replay intro</button>}
          {!reduced && <button type="button" aria-pressed={frozen} onClick={() => setFrozen((f) => !f)}>{frozen ? 'Resume motion' : 'Pause motion'}</button>}
        </div>
        )}
      </div>
    </section>
  );
}
