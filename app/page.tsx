import styles from '@/app/landing-theme.module.css';
import ProblemStatement from '@/app/components/landing/sections/ProblemStatement';
import PlatformArchitectureDetail from '@/app/components/landing/sections/PlatformArchitectureDetail';

// The two cinematic sections only: "Why Traditional Security Platforms Fall Behind" and the
// Platform Architecture 3D scene ("Explore the Full 3D City" → /platform-city and back).
export default function Home() {
  return (
    <div className={`scroll-smooth ${styles.wrapper} cy-bg-canvas cy-text-primary`}>
      <main dir="ltr" className="bg-lp-page min-h-screen">
        <div style={{ height: '30vh' }} />
        <ProblemStatement />
        <PlatformArchitectureDetail />
        <div style={{ height: '40vh' }} />
      </main>
    </div>
  );
}
