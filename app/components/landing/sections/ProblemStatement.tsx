'use client';

import CinematicStory from './problem-cinematic/CinematicStory';
import { useTranslation } from '@/src/i18n';

export default function ProblemStatement() {
  const { t } = useTranslation();

  return (
    <section id="problem" className="lp-section pt-12 sm:pt-16 lg:pt-20 3xl:pt-24 pb-12 sm:pb-16 lg:pb-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-screen-xl 3xl:max-w-screen-2xl">
        <div className="mb-12 max-w-3xl sm:mb-14 lg:mb-0">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl 3xl:text-6xl font-bold text-lp-heading mb-3 sm:mb-4">
            {t.problem.heading.pre}{' '}
            <span>{t.problem.heading.highlight}</span>
            {t.problem.heading.post}
          </h2>
          <p className="text-base sm:text-lg 3xl:text-xl text-lp-body">{t.problem.subtitle}</p>
        </div>
      </div>

      {/* Full-bleed: the desktop frame spans the viewport; the phone story keeps its own container */}
      <CinematicStory />
    </section>
  );
}
