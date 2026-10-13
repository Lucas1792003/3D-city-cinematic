'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Wrench, Clock, AlertTriangle } from 'lucide-react';
import { useTranslation } from '@/src/i18n';
import { resolveAnnouncementWindow } from '@/app/lib/announcement-config';
import { useAnnouncementConfig } from '@/app/components/landing/AnnouncementProvider';

// ─── Local formatting helpers ─────────────────────────────────────────────────

function formatLocalTime(utcDate: Date, localTz: string): string {
  return new Intl.DateTimeFormat('en', {
    timeZone: localTz, hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(utcDate);
}

function getLocalTzAbbr(utcDate: Date, localTz: string): string {
  return (
    new Intl.DateTimeFormat('en', { timeZone: localTz, timeZoneName: 'short' })
      .formatToParts(utcDate)
      .find((p) => p.type === 'timeZoneName')?.value ?? ''
  );
}

function formatCountdown(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type BannerStatus = 'scheduled' | 'imminent' | 'in_progress' | 'full_time';

interface BannerData {
  status: BannerStatus;
  timeRange: string;
  secondsLeft: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AnnouncementBanner() {
  const { t } = useTranslation();
  const a = t.announcement;
  const { config } = useAnnouncementConfig();
  const ann = config.announcement;

  const [bannerData, setBannerData] = useState<BannerData | null>(null);
  const bannerRef = useRef<HTMLDivElement>(null);
  const dismissedRef = useRef(false);

  // Admin-customizable copy (published from CyfrOne), with i18n fallbacks.
  const customTitle = ann.title || a.title;
  const customMessage = ann.message || a.message;

  // ── Status state machine (driven by the published config) ──────────────────
  useEffect(() => {
    // Master off, or temporarily paused → no banner.
    if (!ann.enabled || ann.paused) {
      const id = window.setTimeout(() => setBannerData(null), 0);
      return () => window.clearTimeout(id);
    }

    if (ann.fullTime) {
      const id = window.setTimeout(() => {
        setBannerData({ status: 'full_time', timeRange: '', secondsLeft: 0 });
      }, 0);
      return () => window.clearTimeout(id);
    }

    const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const { schedule } = ann;

    function tick() {
      const now = Date.now();
      // Recompute every tick so a one-time window that has ended (or a repeat
      // past its end date) resolves to null → the banner disappears for good.
      const active = resolveAnnouncementWindow(schedule, now);
      if (!active) {
        setBannerData(null);
        return;
      }
      const startMs = active.start.getTime();
      const endMs = active.end.getTime();
      const warnMs = startMs - schedule.warningMinutes * 60 * 1000;
      const timeRange =
        `${formatLocalTime(active.start, localTz)}` +
        `–${formatLocalTime(active.end, localTz)} ` +
        `${getLocalTzAbbr(active.start, localTz)}`;

      if (now >= endMs) {
        setBannerData(null);
        return;
      }
      if (now >= startMs) {
        setBannerData((prev) =>
          prev?.status === 'in_progress'
            ? prev
            : { status: 'in_progress', timeRange, secondsLeft: 0 },
        );
        return;
      }
      if (now >= warnMs) {
        const secondsLeft = Math.ceil((startMs - now) / 1000);
        setBannerData({ status: 'imminent', timeRange, secondsLeft });
        return;
      }
      if (!dismissedRef.current) {
        setBannerData((prev) =>
          prev?.status === 'scheduled'
            ? prev
            : { status: 'scheduled', timeRange, secondsLeft: 0 },
        );
      }
    }

    const intervalId = setInterval(tick, 1000);
    const timeoutId = window.setTimeout(tick, 0);
    return () => {
      clearInterval(intervalId);
      window.clearTimeout(timeoutId);
    };
  }, [ann]);

  // ── CSS variable for navbar offset ─────────────────────────────────────────
  useEffect(() => {
    const el = bannerRef.current;
    if (!el || !bannerData) {
      document.documentElement.style.setProperty('--banner-h', '0px');
      return;
    }
    const sync = () => {
      document.documentElement.style.setProperty('--banner-h', `${el.offsetHeight}px`);
    };
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    sync();
    return () => {
      ro.disconnect();
      document.documentElement.style.setProperty('--banner-h', '0px');
    };
  }, [bannerData]);

  // ── Dismiss ────────────────────────────────────────────────────────────────
  function dismiss() {
    dismissedRef.current = true;
    setBannerData(null);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const { status, timeRange, secondsLeft } = bannerData ?? {};
  const isUrgentStatus = status === 'imminent' || status === 'in_progress' || status === 'full_time';
  const isUrgent = isUrgentStatus || ann.severity === 'warning';
  const countdown = formatCountdown(secondsLeft ?? 0);

  // Text content rendered once for real and once aria-hidden for the ticker loop.
  function tickerCopy(ariaHidden?: true, ghost?: true) {
    return (
      <span
        className={`pr-20 shrink-0${ghost ? ' banner-ticker-ghost' : ''}`}
        aria-hidden={ariaHidden}
      >
        {status === 'scheduled' && (
          <>
            <span className="font-semibold text-white mr-1">{customTitle}:</span>
            {/* Mobile — short */}
            <span className="sm:hidden">
              {a.mobileShortWindow} <span className="text-sky-300" dir="ltr">{timeRange}</span> {a.yourLocalTime}
            </span>
            {/* Desktop — full */}
            <span className="hidden sm:inline">
              {customMessage}{' '}
              {a.windowLabel}{' '}
              <span className="font-medium text-sky-300" dir="ltr">{timeRange}</span>{' '}
              {a.yourLocalTime}
            </span>
          </>
        )}

        {status === 'imminent' && (
          <>
            <span className="font-semibold text-amber-300 mr-1">{a.imminentTitle}</span>
            {/* Mobile */}
            <span className="sm:hidden">
              {a.imminentShort}{' '}
              <span className="font-mono font-bold text-white tabular-nums" dir="ltr">{countdown}</span>
            </span>
            {/* Desktop */}
            <span className="hidden sm:inline">
              {a.imminentLong}{' '}
              <span className="font-mono font-bold text-white tabular-nums tracking-wider" dir="ltr">{countdown}</span>
              {' '}{a.imminentWindow}{' '}
              <span className="font-medium text-amber-200" dir="ltr">{timeRange}</span>{' '}
              {a.windowSuffix}
            </span>
          </>
        )}

        {status === 'in_progress' && (
          <>
            <span className="font-semibold text-amber-300 mr-1">{a.inProgressTitle}</span>
            {/* Mobile */}
            <span className="sm:hidden">{a.inProgressShort}</span>
            {/* Desktop */}
            <span className="hidden sm:inline">
              {a.inProgressLong}{' '}
              {a.windowLabel2}{' '}
              <span className="font-medium text-amber-200" dir="ltr">{timeRange}</span>{' '}
              {a.windowSuffix}
            </span>
          </>
        )}

        {status === 'full_time' && (
          <>
            <span className="font-semibold text-amber-300 mr-1">{customTitle}:</span>
            <span>{customMessage}</span>
          </>
        )}
      </span>
    );
  }

  if (!bannerData) return null;

  return (
    <div
      ref={bannerRef}
      role="banner"
      style={{ colorScheme: 'dark', color: '#e2e8f0' }}
      className={[
        'fixed top-0 left-0 right-0 z-[60] border-b transition-colors duration-500',
        isUrgent
          ? 'bg-[#241300] border-amber-500/35'
          : 'bg-[#0d1b29] border-sky-500/20',
      ].join(' ')}
    >
      <div className="mx-auto flex items-center gap-3 px-4 py-2.5 sm:px-6 max-w-7xl xl:max-w-[1400px]">

        {/* Status icon — shrink-0 keeps it out of the scrolling area */}
        {status === 'scheduled'   && <Wrench       className="shrink-0 w-3.5 h-3.5 text-sky-400" aria-hidden="true" />}
        {status === 'imminent'    && <Clock         className="shrink-0 w-3.5 h-3.5 text-amber-400 animate-pulse" aria-hidden="true" />}
        {status === 'in_progress' && <AlertTriangle className="shrink-0 w-3.5 h-3.5 text-amber-400 animate-pulse" aria-hidden="true" />}
        {status === 'full_time'   && <Wrench        className="shrink-0 w-3.5 h-3.5 text-amber-400" aria-hidden="true" />}

        {/* Scrolling text area */}
        <div className="flex-1 overflow-hidden min-w-0">
          <div style={{ color: 'inherit' }} className="banner-ticker flex w-max whitespace-nowrap text-xs sm:text-sm leading-snug">
            {tickerCopy()}
            {tickerCopy(true, true)}
          </div>
        </div>

        {/* Close — only for non-urgent scheduled state */}
        {status === 'scheduled' && (
          <button
            type="button"
            onClick={dismiss}
            aria-label={a.closeLabel}
            className="shrink-0 rounded-full p-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
