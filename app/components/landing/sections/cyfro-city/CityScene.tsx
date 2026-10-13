'use client';
import { useEffect, useRef } from 'react';
import { CHUNKS, MYSTERY_COPY, REGISTRY_MARKER } from './registry';
import { createCity, type CityApi, type CityCallbacks, type LabelRefs } from './engine/createCity';
import styles from './City.module.css';

/**
 * Mounts the city engine (lazily, when the stage comes near the viewport) and renders the DOM overlays
 * it positions: one label per chunk, the focused chunk's hotspot labels and a tooltip.
 * The labels are visual duplicates of the Platforms menu, so they stay out of the tab order.
 */
export default function CityScene({ dark, reduced, skipIntro, assembly = false, labels, hovered, tipText, onApi, callbacks }: {
  dark: boolean; reduced: boolean; skipIntro: boolean; assembly?: boolean; labels: boolean; hovered: string | null; tipText: { title: string; body: string } | null;
  onApi: (api: CityApi | null) => void; callbacks: CityCallbacks & { onLabelHover: (id: string | null) => void; onLabelClick: (id: string) => void };
}) {
  const host = useRef<HTMLDivElement>(null);
  const refs = useRef<LabelRefs>({ chunks: {}, hotspots: {}, tip: null });
  const api = useRef<CityApi | null>(null);
  const cbs = useRef(callbacks);
  // latest values, read when the engine is created (lazily, after hydration — so the session's
  // "intro already seen" flag is the real one, not the server snapshot)
  const init = useRef({ dark, reduced, skipIntro, labels, assembly });
  useEffect(() => { cbs.current = callbacks; init.current = { dark, reduced, skipIntro, labels, assembly }; });

  useEffect(() => {
    const el = host.current; if (!el) return;
    let city: CityApi | null = null, disposed = false;
    const start = () => {
      if (city || disposed) return;
      city = createCity(el, () => refs.current, init.current, {
        onReady: () => cbs.current.onReady(), onError: () => cbs.current.onError(), onHover: (id) => cbs.current.onHover(id),
        onSelect: (id) => cbs.current.onSelect(id), onIntro: (s) => cbs.current.onIntro(s), onCaption: (c) => cbs.current.onCaption(c),
      });
      api.current = city; city?.setLabels(init.current.labels); onApi(city);
    };
    // lazy construction: build the world only when the stage is about to be seen
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { start(); io.disconnect(); } }, { rootMargin: '300px 0px' });
    io.observe(el);
    return () => { disposed = true; io.disconnect(); city?.dispose(); api.current = null; onApi(null); };
  }, [onApi]);

  useEffect(() => { api.current?.setTheme(dark); }, [dark]);
  useEffect(() => { api.current?.setReduced(reduced); }, [reduced]);
  useEffect(() => { api.current?.setLabels(labels); }, [labels]);

  return (
    <div ref={host} className={styles.scene} tabIndex={0} role="application" aria-roledescription="3D city"
      aria-label="CyfroSec city in 3D. Arrow keys rotate, plus and minus zoom, Escape returns to the overview. Use the Platforms menu to open any platform." data-city="" data-registry={REGISTRY_MARKER}>
      {CHUNKS.map((c) => (
        <button key={c.id} type="button" tabIndex={-1} aria-hidden="true" data-kind={c.publicVisibility === 'mystery' ? 'mystery' : c.class}
          ref={(b) => { refs.current.chunks[c.id] = b; }} className={styles.label} style={{ opacity: 0 }} data-anchor="center" title={c.copy ? c.copy.name : MYSTERY_COPY.label}
          data-hover={hovered === c.id ? 'true' : undefined}
          onClick={() => cbs.current.onLabelClick(c.id)} onMouseEnter={() => cbs.current.onLabelHover(c.id)} onMouseLeave={() => cbs.current.onLabelHover(null)}>
          {c.copy ? c.copy.short ?? c.copy.name : MYSTERY_COPY.label}
        </button>
      ))}
      {CHUNKS.flatMap((c) => c.hotspots.map((h) => (
        <button key={`${c.id}:${h.id}`} type="button" tabIndex={-1} aria-hidden="true" className={styles.hotspot}
          ref={(b) => { refs.current.hotspots[`${c.id}:${h.id}`] = b; }} style={{ opacity: 0 }}
          onMouseEnter={() => cbs.current.onLabelHover(`${c.id}:${h.id}`)} onMouseLeave={() => cbs.current.onLabelHover(null)}
          onClick={() => cbs.current.onLabelHover(`${c.id}:${h.id}`)}>
          {h.name}
        </button>
      )))}
      <div ref={(d) => { refs.current.tip = d; }} role="tooltip" id="city-tip" className={styles.tip} data-open={tipText ? 'true' : 'false'}>
        {tipText && (<><strong>{tipText.title}</strong><span>{tipText.body}</span></>)}
      </div>
    </div>
  );
}
