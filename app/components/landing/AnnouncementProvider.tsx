'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import {
  AnnouncementConfig,
  DEFAULT_ANNOUNCEMENT_CONFIG,
  normalizeConfig,
} from '@/app/lib/announcement-config';

interface AnnouncementState {
  config: AnnouncementConfig;
  /** True once the runtime fetch has resolved (success or fallback). */
  loaded: boolean;
}

const AnnouncementContext = createContext<AnnouncementState>({
  config: DEFAULT_ANNOUNCEMENT_CONFIG,
  loaded: false,
});

/**
 * Fetches the runtime-published `/announcement.json` once and shares it with the
 * banner and the maintenance gate. Falls back to the disabled default on any
 * error or 404 (e.g. before the first publish), so the site never breaks.
 */
export function AnnouncementProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AnnouncementState>({
    config: DEFAULT_ANNOUNCEMENT_CONFIG,
    loaded: false,
  });

  useEffect(() => {
    let cancelled = false;
    fetch('/announcement.json', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((raw) => {
        if (!cancelled) setState({ config: normalizeConfig(raw), loaded: true });
      })
      .catch(() => {
        if (!cancelled) setState({ config: DEFAULT_ANNOUNCEMENT_CONFIG, loaded: true });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return <AnnouncementContext.Provider value={state}>{children}</AnnouncementContext.Provider>;
}

export function useAnnouncementConfig(): AnnouncementState {
  return useContext(AnnouncementContext);
}
