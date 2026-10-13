'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { CHUNKS, DISTRICTS, MYSTERY_COPY } from './registry';
import type { CityApi } from './engine/createCity';
import CityList, { connectionsOf, evidenceText } from './CityList';
import styles from './City.module.css';
import { HOME_RETURN_URL, clearHandoff, readHandoff, rememberCityStage, writeHandoff, type Handoff } from '../cityHandoff';

const CityScene = dynamic(() => import('./CityScene'), { ssr: false });

const subReduce = (cb: () => void) => { const q = window.matchMedia('(prefers-reduced-motion: reduce)'); q.addEventListener('change', cb); return () => q.removeEventListener('change', cb); };
const subTheme = (cb: () => void) => { const o = new MutationObserver(cb); o.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] }); return () => o.disconnect(); };
const INTRO_KEY = 'cyfro-city-intro-seen';
const subWidth = (cb: () => void) => { window.addEventListener('resize', cb); return () => window.removeEventListener('resize', cb); };
const readSeen = () => { try { return sessionStorage.getItem(INTRO_KEY) === '1'; } catch { return false; } };
const markSeen = () => { try { sessionStorage.setItem(INTRO_KEY, '1'); } catch { /* storage unavailable: the intro may simply play again */ } };
const districtName = (id: string) => DISTRICTS.find((d) => d.id === id)?.name ?? id;
const chunkName = (id: string) => { const c = CHUNKS.find((x) => x.id === id); return c?.copy?.name ?? MYSTERY_COPY.label; };
const KIND: Record<string, string> = { DATA: 'Data', CTRL: 'Control', JOB: 'Job', EVT: 'Event', APPR: 'Approved action', AI: 'AI request', RPT: 'Report', EXT: 'External' };

/**
 * CyfroSec 3D City — section shell: heading, view controls with the Platforms menu, the 3D stage, the explanation
 * panel, the cinematic HUD, and the HTML list (the WebGL fallback). The page variant also runs the way back home.
 * variant 'page' (/platform-city): full-height stage, Back to home, and the assembly cinematic — the city
 * builds itself around the CyfroAI Engine every time the page opens (no "seen" memory; reduced motion skips it).
 */
export default function CityCinematic({ variant = 'section' }: { variant?: 'section' | 'page' }) {
  const page = variant === 'page';
  const reduced = useSyncExternalStore(subReduce, () => window.matchMedia('(prefers-reduced-motion: reduce)').matches, () => false);
  const dark = useSyncExternalStore(subTheme, () => document.documentElement.classList.contains('dark'), () => true);
  const seenStored = useSyncExternalStore(() => () => {}, readSeen, () => false);
  const seen = page ? false : seenStored;
  const compact = useSyncExternalStore(subWidth, () => window.innerWidth < 700, () => false);
  const [labelPref, setLabelPref] = useState<boolean | null>(null);
  const labels = labelPref ?? !compact; // phones start without labels so the city stays visible
  const [api, setApi] = useState<CityApi | null>(null);
  const [ready, setReady] = useState(false);
  // arriving from the homepage outro: hold its last (Engine-only) frame over the stage until the city's own first
  // frame is up, then crossfade — the visitor never sees a blank stage and the shot continues (cityHandoff.ts)
  const [handoff] = useState<Handoff | null>(() => (page && typeof window !== 'undefined' ? readHandoff('city') : null));
  const [veil, setVeil] = useState<'hold' | 'fade' | 'gone'>(handoff ? 'hold' : 'gone');
  const stageEl = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [labelHover, setLabelHover] = useState<string | null>(null);
  const [intro, setIntro] = useState({ running: false, act: '', index: 0, total: 0 });
  const [caption, setCaption] = useState<string[]>([]);
  const [introStarted, setIntroStarted] = useState(false);
  const [frozen, setFrozen] = useState(false);
  const [flow, setFlow] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);

  const onApi = useCallback((a: CityApi | null) => setApi(a), []);
  const select = useCallback((id: string | null) => {
    setSelected(id); setFlow(null);
    api?.frameFlow(null);
    if (id) api?.focus(id); else api?.overview();
    if (id) { const c = CHUNKS.find((x) => x.id === id); setStatus(`${chunkName(id)} focused.${c ? ` ${connectionsOf(c).length} connections.` : ''}`); } else setStatus('City overview.');
  }, [api]);
  const callbacks = useMemo(() => ({
    onReady: () => setReady(true),
    onError: () => setFailed(true),
    onHover: (id: string | null) => setHovered(id),
    onSelect: (id: string | null) => select(id),
    onIntro: (s: { running: boolean; act: string; index: number; total: number }) => { setIntro(s); if (s.running) setIntroStarted(true); if (!s.running && !page) markSeen(); },
    onCaption: (c: string[]) => setCaption(c),
    onLabelHover: (id: string | null) => { setLabelHover(id); api?.hoverLabel(id); },
    onLabelClick: (id: string) => select(id),
  }), [api, select, page]);

  useEffect(() => { api?.setFrozen(frozen); }, [api, frozen]);
  // the Platforms dropdown: closes on Escape, on a click outside it, and after choosing a platform
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setMenuOpen(false); menuRef.current?.querySelector('button')?.focus(); } };
    const onDown = (e: PointerEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false); };
    document.addEventListener('keydown', onKey); document.addEventListener('pointerdown', onDown);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onDown); };
  }, [menuOpen]);
  // page variant: keep the "Back to home" row visible just below the site nav, in both of its states
  // (full-width at the top, floating after scrolling) — the nav's real bottom edge is measured, not guessed
  const barRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!page) return;
    const nav = document.querySelector('.cy-navbar-root'); const bar = barRef.current;
    if (!nav || !bar) return;
    let raf = 0;
    const update = () => { raf = 0; bar.style.setProperty('--nav-bottom', `${Math.max(0, Math.round(nav.getBoundingClientRect().bottom))}px`); };
    const queue = () => { if (!raf) raf = requestAnimationFrame(update); };
    const ro = new ResizeObserver(queue); ro.observe(nav);
    window.addEventListener('scroll', queue, { passive: true }); window.addEventListener('resize', queue);
    nav.addEventListener('transitionend', queue, true);
    update();
    return () => { ro.disconnect(); window.removeEventListener('scroll', queue); window.removeEventListener('resize', queue); nav.removeEventListener('transitionend', queue, true); if (raf) cancelAnimationFrame(raf); };
  }, [page]);

  // page variant: the mouse wheel does not scroll the page — the city fills the window and there is nothing
  // below it. Scrollable panels (feature details, Platforms menu, site menus) still scroll, and Ctrl/⌘ + wheel
  // still zooms the city. If the window is genuinely too short for the layout, normal scrolling is kept.
  useEffect(() => {
    if (!page) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) return;
      const t = e.target as Element | null;
      if (t?.closest?.('aside, #city-platforms, .cy-navbar-root, [data-scroll-ok]')) return;
      if (document.documentElement.scrollHeight - window.innerHeight > 120) return;
      e.preventDefault();
    };
    window.addEventListener('wheel', onWheel, { passive: false });
    return () => window.removeEventListener('wheel', onWheel);
  }, [page]);

  useEffect(() => {
    if (veil === 'hold' && (ready || failed)) { const id = window.setTimeout(() => setVeil('fade'), failed ? 0 : 120); return () => window.clearTimeout(id); }
    if (veil === 'fade') { const id = window.setTimeout(() => { setVeil('gone'); clearHandoff(); }, 600); return () => window.clearTimeout(id); }
  }, [veil, ready, failed]);
  useEffect(() => { if (handoff && reduced) clearHandoff(); }, [handoff, reduced]); // reduced motion: straight to the city, no held frame
  const showVeil = veil !== 'gone' && !!handoff && !reduced;
  // remember where this page's stage sits for the current window size, so the next homepage outro lands exactly here
  useEffect(() => {
    if (!page) return;
    const measure = () => { const r = stageEl.current?.getBoundingClientRect(); if (r) rememberCityStage({ top: Math.round(r.top + window.scrollY), left: Math.round(r.left), width: Math.round(r.width), height: Math.round(r.height) }); };
    const id = window.setTimeout(measure, 400); window.addEventListener('resize', measure);
    return () => { window.clearTimeout(id); window.removeEventListener('resize', measure); };
  }, [page]);

  const barHidden = page && !reduced && !failed && (intro.running || !introStarted);

  /* ── Back to home: the city contracts into the CyfroAI Engine, then the homepage's Platform Architecture section
     continues from the same shot (sections/cityHandoff.ts). Reduced motion / no 3D / a modified click: plain link. ── */
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const goneHome = useRef(false), homeFallback = useRef<number | null>(null);
  useEffect(() => () => { if (homeFallback.current) window.clearTimeout(homeFallback.current); }, []);
  const goHome = useCallback((frame: string | null) => {
    if (goneHome.current) return; goneHome.current = true;
    const r = stageEl.current?.getBoundingClientRect();
    writeHandoff(frame, dark, 'home', r ? { top: Math.round(r.top), left: Math.round(r.left), width: Math.round(r.width), height: Math.round(r.height) } : undefined);
    router.push(HOME_RETURN_URL, { scroll: false });
    homeFallback.current = window.setTimeout(() => {
      // deliberate hard navigation: only when the router itself failed to move
      const bp = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
      if (window.location.pathname.startsWith(`${bp}/platform-city`)) window.location.assign(bp + HOME_RETURN_URL);
    }, 12000);
  }, [router, dark]);
  const onBackHome = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    if (leaving || goneHome.current) return; // repeated clicks
    void import('../platform-architecture-3d/CinematicScene').catch(() => {}); router.prefetch('/');
    if (reduced || failed || !ready || !api) { clearHandoff(); goneHome.current = true; router.push(HOME_RETURN_URL, { scroll: false }); return; }
    setMenuOpen(false); setSelected(null); setFlow(null);
    if (api.leave((frame) => goHome(frame))) setLeaving(true); else goHome(null);
  }, [leaving, reduced, failed, ready, api, router, goHome]);
  const stayInCity = useCallback(() => { api?.cancelLeave(); setLeaving(false); }, [api]);
  useEffect(() => {
    if (!leaving) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') stayInCity(); };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [leaving, stayInCity]);

  const sel = selected ? CHUNKS.find((c) => c.id === selected) ?? null : null;
  const tipId = labelHover ?? hovered;
  const tipText = useMemo(() => {
    if (!tipId) return null;
    const [cid, hid] = tipId.split(':'); const c = CHUNKS.find((x) => x.id === cid); if (!c) return null;
    if (hid) { const h = c.hotspots.find((x) => x.id === hid); return h ? { title: h.name, body: h.summary } : null; }
    return c.copy ? { title: c.copy.name, body: c.copy.summary } : { title: MYSTERY_COPY.label, body: MYSTERY_COPY.body };
  }, [tipId]);

  const badge = <p className={styles.badge}>Illustrative walkthrough, not live data</p>;
  const stageTools = (
    <>
            {!page && badge}

            <div className={styles.viewCtl} role="group" aria-label="View controls">
              <button type="button" aria-label="Zoom out" onClick={() => api?.zoom(1 / 0.82)}>−</button>
              <button type="button" aria-label="Zoom in" onClick={() => api?.zoom(0.82)}>+</button>
              <div className={styles.menuWrap} ref={menuRef}>
                <button type="button" aria-haspopup="true" aria-expanded={menuOpen} aria-controls="city-platforms" onClick={() => setMenuOpen((o) => !o)}>
                  Platforms <svg aria-hidden="true" className={styles.chev} width="10" height="10" viewBox="0 0 10 10"><path d="M2 3.5 5 6.5 8 3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
                {menuOpen && (
                  <nav id="city-platforms" className={styles.menu} aria-label="City features"><div className={styles.menuCols}>
                    {DISTRICTS.map((d) => {
                      const list = CHUNKS.filter((c) => c.district === d.id); if (!list.length) return null;
                      return (
                        <div key={d.id} className={styles.menuGroup}>
                          <h3>{d.name}</h3>
                          <ul>{list.map((c) => (
                            <li key={c.id}><button type="button" className={styles.menuItem} aria-current={selected === c.id ? 'true' : undefined} onClick={() => { setMenuOpen(false); select(c.id); }}
                              aria-label={c.copy ? undefined : `${MYSTERY_COPY.label} (reserved platform ${CHUNKS.filter((x) => !x.copy).indexOf(c) + 1})`} title={c.copy?.summary ?? MYSTERY_COPY.body}
                              onMouseEnter={() => callbacks.onLabelHover(c.id)} onMouseLeave={() => callbacks.onLabelHover(null)}>
                              <span className={styles.menuName}>{c.copy ? c.copy.name : MYSTERY_COPY.label}</span>
                              <span className={styles.menuSub}>{c.copy ? c.copy.summary : MYSTERY_COPY.body}</span>
                            </button></li>
                          ))}</ul>
                        </div>
                    );
                  })}
                </div></nav>
              )}
            </div>
            <button type="button" aria-pressed={labels} onClick={() => setLabelPref(!labels)}>Labels</button>
            <button type="button" onClick={() => select(null)}>Overview</button>
          </div>
    </>
  );

  return (
    <section id="architecture-detail" aria-labelledby="city-heading" className={page ? `${styles.section} ${styles.pageSection}` : styles.section}>
      {page ? (
        // the title row belongs to the finished city: hidden (space kept, so the stage never moves) while it assembles
        <header ref={barRef} className={styles.pageBar} data-hidden={barHidden ? 'true' : undefined} inert={barHidden || undefined}>
          <Link href={HOME_RETURN_URL} scroll={false} className={styles.back} onClick={onBackHome} aria-disabled={leaving || undefined}>← Back to home</Link>
          <h1 id="city-heading"><span>3D City</span></h1>
          <p>Each square platform is part of the product. Watch the city assemble, then select any platform to learn more.</p>
          {!failed && badge /* sits in the title row's free space; the row below holds only the view controls */}
          {/* badge + view controls ride along with the sticky heading row, below the site nav */}
          {!failed && <div className={styles.pageTools}>{stageTools}</div>}
        </header>
      ) : (
        <header className={styles.head}>
          <h2 id="city-heading">Platform <span>Architecture</span></h2>
          <p>How CyfroSec works, shown as a miniature city. Each square platform is part of the product. Select one to see what it does and what it connects to.</p>
        </header>
      )}

      {failed ? (
        <CityList failed />
      ) : (
        <div ref={stageEl} className={page ? `${styles.stage} ${styles.pageStage}` : styles.stage}>
          <CityScene dark={dark} reduced={reduced} skipIntro={seen} assembly={page} labels={labels} hovered={hovered} tipText={tipText} onApi={onApi} callbacks={callbacks} />
          {!ready && !showVeil && <p className={styles.loading}>{page ? 'Preparing the city…' : 'Loading the city…'}</p>}
          {showVeil && handoff && (
            <div className={styles.handoffVeil} data-state={veil} aria-hidden="true" style={{ background: handoff.dark ? '#0d1b29' : '#ffffff' }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- a one-off data URL frame from the homepage, not an asset */}
              {handoff.img && <img src={handoff.img} alt="" />}
            </div>
          )}
          {!page && stageTools}

          {sel && (
            <aside ref={panelRef} className={styles.panel} aria-label={sel?.copy?.name ?? 'Feature details'}>
              {sel && (sel.copy ? (
                <>
                  <p className={styles.kicker}>{districtName(sel.district)}</p>
                  <h3>{sel.copy.name}</h3>
                  <p className={styles.summary}>{sel.copy.summary}</p>
                  <p>{sel.copy.details}</p>
                  {sel.hotspots.length > 0 && (
                    <>
                      <h4>What happens here</h4>
                      <ul className={styles.hotspots}>
                        {sel.hotspots.map((h) => (
                          <li key={h.id}><button type="button" onMouseEnter={() => callbacks.onLabelHover(`${sel.id}:${h.id}`)} onMouseLeave={() => callbacks.onLabelHover(null)} onFocus={() => callbacks.onLabelHover(`${sel.id}:${h.id}`)} onBlur={() => callbacks.onLabelHover(null)}><strong className={styles.hotspotName}>{h.name}</strong><span>{h.summary}</span></button></li>
                        ))}
                      </ul>
                    </>
                  )}
                  {connectionsOf(sel).length > 0 && (
                    <>
                      <h4>Connections</h4>
                      <ul className={styles.flows}>
                        {connectionsOf(sel).map(({ f, out, other }) => (
                          <li key={f.id}>
                            <button type="button" aria-pressed={flow === f.id} disabled={f.display === 'hidden'} onClick={() => { const n = flow === f.id ? null : f.id; setFlow(n); api?.frameFlow(n); }}>
                              <span className={styles.flowDir}>{out ? '→' : '←'} {other}</span>
                              <span>{f.label}</span>
                              <span className={styles.chips}>
                                <em>{KIND[f.kind]}</em><em>{evidenceText(f.evidence)}</em>
                                {f.inProcess && <em>Shared library call</em>}{f.external && <em>Leaves CyfroSec</em>}{f.gatedBy && <em>Requires approval</em>}{f.display === 'hidden' && <em>Not animated</em>}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                  <p className={styles.evidence}><strong>Evidence:</strong> {sel.copy.evidenceNote}</p>
                  <div className={styles.panelNav}>
                    {sel.href && <a href={sel.href}>Learn more</a>}
                    <button type="button" onClick={() => select(null)}>Back to overview</button>
                  </div>
                </>
              ) : (
                <>
                  <h3>{MYSTERY_COPY.label}</h3>
                  <p>{MYSTERY_COPY.body}</p>
                  <div className={styles.panelNav}><button type="button" onClick={() => select(null)}>Back to overview</button></div>
                </>
              ))}
            </aside>
          )}

          <div className={styles.hud}>
            {leaving ? (
              <>
                <span className={styles.marker} aria-live="polite">Returning to Platform Architecture…</span>
                <button type="button" onClick={() => goHome(null)}>Skip</button>
                <button type="button" onClick={stayInCity}>Stay here</button>
              </>
            ) : page && intro.running ? (
              <span className={`${styles.marker} ${styles.markerStack}`}><span className={styles.markerHead}><strong>{intro.act}</strong>&nbsp;· {intro.index} of {intro.total}</span>{caption[0] ? <span className={styles.markerText}>{caption[0]}</span> : null}</span>
            ) : (
              <span className={styles.marker}>{intro.running ? `Introduction · ${intro.act}` : caption[0] ?? (compact ? 'Tap a platform to see what it does' : 'Drag to rotate · select any platform')}</span>
            )}
            {!leaving && intro.running && <button type="button" onClick={() => api?.skipIntro()}>Skip intro</button>}
            {!leaving && !intro.running && !reduced && <button type="button" onClick={() => { setSelected(null); setFrozen(false); api?.replayIntro(); }}>Replay intro</button>}
            {!leaving && !reduced && <button type="button" aria-pressed={frozen} onClick={() => setFrozen((f) => !f)}>{frozen ? 'Resume motion' : 'Pause motion'}</button>}
          </div>
          {page && intro.running && <p className={styles.orderNote}>Platforms appear in presentation order, not the order in which the software runs.</p>}
          <p className={styles.srOnly} aria-live="polite">{status}</p>
        </div>
      )}

    </section>
  );
}
