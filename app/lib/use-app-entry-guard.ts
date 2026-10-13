'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAnnouncementConfig } from '@/app/components/landing/AnnouncementProvider';
import { isMaintenancePageActive } from '@/app/lib/announcement-config';

/**
 * Click handler for links that leave the static landing site for the live app
 * (Sign In, Get Started, pricing CTAs, ...). When maintenance mode is active it
 * cancels the navigation and routes to the local `/maintenance` page instead,
 * leaving the rest of the marketing site untouched.
 */
export function useAppEntryGuard() {
  const { config } = useAnnouncementConfig();
  const router = useRouter();

  return useCallback(
    (event: React.MouseEvent) => {
      if (!isMaintenancePageActive(config)) return;
      event.preventDefault();
      router.push('/maintenance');
    },
    [config, router],
  );
}
