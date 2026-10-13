import type { Metadata } from 'next';
import styles from '@/app/landing-theme.module.css';
import CityCinematic from '@/app/components/landing/sections/cyfro-city/CityCinematic';

// The immersive CyfroSec 3D City: no site nav bar and no footer in this copy — the city fills the page.
// Reached from the homepage's Platform Architecture section ("Explore the Full 3D City") or directly by URL.
export const metadata: Metadata = {
  title: '3D City: Interactive Platform Architecture | CyfroSec',
  description: 'Watch the CyfroSec platform assemble as a miniature 3D city, then explore how each security capability connects.',
};

export default function PlatformCityPage() {
  return (
    <div className={`scroll-smooth ${styles.wrapper} cy-bg-canvas cy-text-primary`}>
      <main dir="ltr" className="bg-lp-page min-h-screen">
        <CityCinematic variant="page" />
      </main>
    </div>
  );
}
