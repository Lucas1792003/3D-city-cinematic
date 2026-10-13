'use client';

import type { ReactNode } from 'react';
import { en } from './locales/en';

export function LangProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useTranslation() {
  return { t: en };
}
