import type { Metadata } from 'next';
import './globals.css';
import { LangProvider } from '@/src/i18n';
import { AnnouncementProvider } from '@/app/components/landing/AnnouncementProvider';
import Dashify from './Dashify';

export const metadata: Metadata = { title: '3D City Cinematic' };

const themeBootstrapScript = `
(() => {
  try {
    const stored = window.localStorage.getItem('cyfrosec.theme');
    const isDark = stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', isDark);
  } catch (_err) {}
})();
`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" dir="ltr" className="dark" data-theme="themecyfrosec" data-theme-redesign="enabled" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body className="antialiased cy-bg-canvas cy-text-primary">
        <Dashify />
        <LangProvider>
          <AnnouncementProvider>{children}</AnnouncementProvider>
        </LangProvider>
      </body>
    </html>
  );
}
