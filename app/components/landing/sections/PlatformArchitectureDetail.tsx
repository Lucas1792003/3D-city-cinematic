'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from '@/src/i18n';
import ArchitectureCinematic from './platform-architecture-3d/ArchitectureCinematic';
import { clearHandoff, writeHandoff } from './cityHandoff';
import styles from './PlatformArchitectureDetail.module.css';

/**
 * Platform Architecture. Build-time switch (static export, so no runtime flag):
 *   default                       → the original miniature 3D world (one-time intro, live machines, hover, 360° rotation)
 *   NEXT_PUBLIC_ARCH_SCENE=city   → the CyfroSec 3D City (docs/design/3d-city/)
 * The original scene stays in the codebase as the fallback / rollback option. The city is loaded as its
 * own chunk, so the default homepage never downloads it.
 */
const USE_CITY = process.env.NEXT_PUBLIC_ARCH_SCENE === 'city';
const CityCinematic = dynamic(() => import('./cyfro-city/CityCinematic'));
const CITY = '/platform-city';

/** Download the city page's code ahead of time (code only: no WebGL renderer is created on the homepage). */
let warmed = false;
function warmCity() {
  if (warmed) return; warmed = true;
  void import('./cyfro-city/CityCinematic').catch(() => { warmed = false; });
  void import('./cyfro-city/CityScene').catch(() => { warmed = false; });
}

/**
 * The original scene stays exactly as it is; below it, "Explore the Full 3D City" plays a short outro (the
 * architecture separates around the CyfroAI Engine) and continues into /platform-city's assembly from the same
 * camera shot (cityHandoff.ts). Reduced motion, no WebGL or a modified click (new tab) is ordinary navigation.
 */
export default function PlatformArchitectureDetail() {
  const { t } = useTranslation();
  const a = t.archDetail;
  const router = useRouter();
  const [outro, setOutro] = useState(0);
  const busy = useRef(false);
  const fallback = useRef<number | null>(null);
  useEffect(() => () => { if (fallback.current) window.clearTimeout(fallback.current); }, []);

  const leaving = useRef(false);
  const go = useCallback((frame: string | null) => {
    if (leaving.current) return; // Skip and the outro's own end can both arrive
    leaving.current = true;
    if (frame) writeHandoff(frame, document.documentElement.classList.contains('dark')); else clearHandoff();
    router.push(CITY);
    // if the client-side route change stalls (e.g. a chunk failed to load), fall back to an ordinary page load
    fallback.current = window.setTimeout(() => {
      // deliberate hard navigation: only when the router itself failed to move (e.g. a chunk could not load)
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      const bp = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
      if (window.location.pathname.replace(/\/$/, '') !== bp + CITY) window.location.assign(`${bp}${CITY}/`);
    }, 12000);
  }, [router]);

  const onClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // new tab / window: the plain link
    e.preventDefault();
    if (busy.current) return; // repeated clicks
    busy.current = true;
    setOutro((n) => n + 1); // the outro starts now; the city's code downloads alongside it
    warmCity();
  }, []);

  if (USE_CITY) return <CityCinematic />;
  return (
    <>
      <ArchitectureCinematic outroRequest={outro} onOutroEnd={go} onOutroCancelled={() => { busy.current = false; }} />
      <div className={styles.cta}>
        <Link href={CITY} prefetch={false} className={styles.button} onClick={onClick} onPointerEnter={warmCity} onFocus={warmCity}>
          {a.exploreCity} <span aria-hidden="true">→</span>
        </Link>
        <p>{a.exploreCityNote}</p>
      </div>
    </>
  );
}
