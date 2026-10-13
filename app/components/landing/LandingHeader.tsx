'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { ChevronDown, Menu, X, ArrowRight, Moon, Sun } from 'lucide-react';
import { motion, AnimatePresence, useScroll, useMotionValueEvent, useReducedMotion } from 'framer-motion';
import { DropdownNavigation } from './ui/dropdown-navigation';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { LANDING_NAV_ITEMS, LANDING_NAV_ITEMS_SCROLLED } from './navigation';
import { useThemeMode } from '@/app/hooks/useThemeMode';
import { useAppEntryGuard } from '@/app/lib/use-app-entry-guard';
import { useTranslation } from '@/src/i18n';
import type { NavItem } from './ui/dropdown-navigation';
import { NAV_TOP_EVENT, readHandoff } from './sections/cityHandoff';
import type { Dictionary } from '@/src/i18n/locales/en';

type AuthSegment = 'signIn' | 'getStarted' | null;

function scrollToHash(selector: string, attempts = 20) {
  const el = document.querySelector(selector);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' });
    return;
  }
  if (attempts > 0) {
    setTimeout(() => scrollToHash(selector, attempts - 1), 120);
  }
}

// Build translated nav items by overlaying labels/descriptions from the dict
function buildTranslatedNavItems(t: Dictionary, items: NavItem[]): NavItem[] {
  return items.map((item) => {
    if (item.id === 0) return { ...item, label: t.nav.home };
    if (item.id === 1) {
      return {
        ...item,
        label: t.nav.product,
        subMenus: item.subMenus?.map((menu) => ({
          ...menu,
          title: t.nav.product,
          items: menu.items.map((subItem, i) => ({
            ...subItem,
            label: t.nav.productSubmenu[i]?.label ?? subItem.label,
            description: t.nav.productSubmenu[i]?.description ?? subItem.description,
          })),
        })),
      };
    }
    if (item.id === 3) {
      return {
        ...item,
        label: t.nav.solutions,
        subMenus: item.subMenus?.map((menu) => ({
          ...menu,
          title: t.nav.solutions,
          items: menu.items.map((subItem, i) => ({
            ...subItem,
            label: t.nav.solutionsSubmenu[i]?.label ?? subItem.label,
            description: t.nav.solutionsSubmenu[i]?.description ?? subItem.description,
          })),
        })),
      };
    }
    if (item.id === 4) return { ...item, label: t.nav.documentation };
    if (item.id === 5) {
      if (item.subMenus) {
        return {
          ...item,
          label: t.nav.company,
          subMenus: item.subMenus.map((menu) => ({
            ...menu,
            title: t.nav.company,
            items: menu.items.map((subItem, i) => ({
              ...subItem,
              label: t.nav.aboutSubmenu[i]?.label ?? subItem.label,
              description: t.nav.aboutSubmenu[i]?.description ?? subItem.description,
            })),
          })),
        };
      }
      return { ...item, label: t.nav.about };
    }
    if (item.id === 6) return { ...item, label: t.nav.subscriptions };
    return item;
  });
}


function AuthSegmentedPill({
  mobile = false,
  onNavigate,
}: {
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  const { t } = useTranslation();
  const [activeSegment, setActiveSegment] = useState<AuthSegment>(null);
  const guardAppEntry = useAppEntryGuard();

  const wrapperClassName = mobile ? 'grid w-full grid-cols-2 gap-2' : 'inline-flex items-center gap-1.5';

  const segmentClassName = mobile ? 'min-h-10 text-sm' : 'h-10 text-[13px] xl:text-sm 3xl:h-11 3xl:text-[14px]';

  const signInWidth = mobile
    ? undefined
    : activeSegment === 'signIn'
      ? 98
      : activeSegment === 'getStarted'
        ? 90
        : 94;

  const getStartedWidth = mobile
    ? undefined
    : activeSegment === 'getStarted'
      ? 118
      : activeSegment === 'signIn'
        ? 110
        : 114;

  return (
    <div
      className={wrapperClassName}
      onMouseLeave={() => setActiveSegment(null)}
    >
      <Link
        href={`${process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.cyfrosec.com'}/dashboard`}
        onMouseEnter={() => setActiveSegment('signIn')}
        onFocus={() => setActiveSegment('signIn')}
        onBlur={() => setActiveSegment(null)}
        onClick={(event) => {
          guardAppEntry(event);
          onNavigate?.();
        }}
        className={`group relative inline-flex items-center justify-center rounded-full px-4 font-semibold transition-[width,background-color,box-shadow,color,transform] duration-200 ease-out ${segmentClassName} ${
          activeSegment === 'signIn'
            ? 'border border-lp-border-strong bg-lp-surface text-lp-heading'
            : 'border border-transparent bg-transparent text-lp-heading hover:border-lp-border-strong hover:bg-lp-surface'
        }`}
        style={signInWidth ? { width: `${signInWidth}px` } : undefined}
      >
        <span className="relative">{t.nav.signIn}</span>
      </Link>

      <Link
        href={`${process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.cyfrosec.com'}/get-started`}
        onMouseEnter={() => setActiveSegment('getStarted')}
        onFocus={() => setActiveSegment('getStarted')}
        onBlur={() => setActiveSegment(null)}
        onClick={(event) => {
          guardAppEntry(event);
          onNavigate?.();
        }}
        className={`group relative inline-flex items-center justify-center rounded-full px-4 font-semibold transition-[width,background-color,border-color,box-shadow,color,transform] duration-200 ease-out ${segmentClassName} ${
          activeSegment === 'getStarted'
            ? 'border border-transparent bg-lp-cta text-lp-on-cta'
            : 'border border-lp-border bg-lp-icon-bg text-lp-link hover:border-transparent hover:bg-lp-cta hover:text-lp-on-cta'
        }`}
        style={getStartedWidth ? { width: `${getStartedWidth}px` } : undefined}
      >
        <span className="relative flex items-center whitespace-nowrap">
          {t.nav.getStarted}
          <span
            className={`overflow-hidden transition-all duration-200 ${activeSegment === 'getStarted' ? 'ms-2 w-4 opacity-100' : 'ms-0 w-0 opacity-0'}`}
            aria-hidden="true"
          >
            <ArrowRight className="w-4 h-4" />
          </span>
        </span>
      </Link>
    </div>
  );
}

/**
 * @param fixedTop keep the full-width top state while scrolling (no floating "scrolled" bar).
 *                 Used by the 3D City page; every other page keeps the default behaviour.
 */
export function LandingHeader({ fixedTop = false }: { fixedTop?: boolean } = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const { toggleTheme } = useThemeMode();
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [scrolled, setIsScrolled] = useState(false);
  // the homepage → 3D City outro asks for the full-width top state, so the nav matches the city page's at the cut
  const [forceTop, setForceTop] = useState(() => !fixedTop && typeof window !== 'undefined' && !!readHandoff('home')?.img); // returning from the city: start in the city page's top state
  useEffect(() => {
    const on = (e: Event) => setForceTop(Boolean((e as CustomEvent<boolean>).detail));
    window.addEventListener(NAV_TOP_EVENT, on);
    return () => window.removeEventListener(NAV_TOP_EVENT, on);
  }, []);
  const isScrolled = scrolled && !forceTop;
  // arriving through one of those transitions (either way): the nav is already in place, so it does not slide in again
  const [arrivedSeamless] = useState(() => typeof window !== 'undefined' && readHandoff(fixedTop ? 'city' : 'home') !== null);

  const shouldReduceMotion = useReducedMotion();
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, 'change', (latest) => {
    setIsScrolled(!fixedTop && latest > 20);
  });

  // Rebuild nav items with translated labels/descriptions
  const translatedNavItemsFull = useMemo(() => buildTranslatedNavItems(t, LANDING_NAV_ITEMS), [t]);
  const translatedNavItemsScrolled = useMemo(() => buildTranslatedNavItems(t, LANDING_NAV_ITEMS_SCROLLED), [t]);
  const translatedNavItems = isScrolled ? translatedNavItemsScrolled : translatedNavItemsFull;

  function handleDropdownToggle(label: string) {
    setActiveDropdown((prev) => (prev === label ? null : label));
  }

  const handlePrefetch = useCallback(function handlePrefetch() {}, []);

  const handleNavClick = useCallback(function handleNavClick(href: string, isNav: boolean | undefined, event: React.MouseEvent | undefined) {
    setMobileMenuOpen(false);
    setActiveDropdown(null);
    if (isNav) {
      event?.preventDefault();
      router.push(href);
    } else if (href.startsWith('#')) {
      event?.preventDefault();
      if (pathname === '/') {
        scrollToHash(href);
      } else {
        router.push(`/${href}`);
      }
    }
  }, [router, pathname]);

  return (
    <motion.header
      className="cy-navbar-root fixed left-0 right-0 z-50 transition-all duration-300"
      style={{ top: 'var(--banner-h, 0px)' }}
      initial={shouldReduceMotion || arrivedSeamless ? false : { y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className={`transition-all duration-300 ${isScrolled ? 'px-3 sm:px-4 xl:px-6 3xl:px-8 pt-2 sm:pt-3 xl:pt-4 3xl:pt-5' : ''}`}>
        <motion.div
          className={`cy-navbar-shell relative flex items-center justify-between transition-all duration-300 ${
            isScrolled
              ? 'cy-navbar-shell-scrolled h-14 sm:h-16 lg:h-20 xl:h-22 3xl:h-24 4xl:h-26 max-w-7xl xl:max-w-[1400px] 3xl:max-w-[1600px] 4xl:max-w-[1800px] mx-auto px-4 lg:px-6 xl:px-8 3xl:px-10 4xl:px-12 rounded-2xl bg-transparent backdrop-blur-xl border cy-border shadow-lg shadow-black/10'
              : 'h-14 sm:h-16 lg:h-20 xl:h-22 3xl:h-24 4xl:h-26 w-full px-4 sm:px-6 lg:px-8 xl:px-16 3xl:px-24 4xl:px-28 bg-[var(--bg-canvas)] border-b border-[color-mix(in_srgb,var(--border-default)_25%,transparent)]'
          }`}
        >

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 z-10">
            <span className="cy-themed-logo">
              <img
                src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/logo.png`}
                alt="CyfroSec"
                className={`w-auto ${isScrolled ? 'h-9 sm:h-11 lg:h-16 xl:h-18 3xl:h-20 4xl:h-22' : 'h-10 sm:h-12 lg:h-20 xl:h-22 3xl:h-24 4xl:h-26'}`}
              />
              <span aria-hidden="true" className="cy-themed-logo-blue" style={{ maskImage: `url("${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/logo.png")` }} />
            </span>
          </Link>

          {/* Desktop nav - centered */}
          <div className="cy-navbar-nav hidden lg:flex flex-1 justify-center">
            <DropdownNavigation
              navItems={translatedNavItems}
              onNavigate={handleNavClick}
              onPrefetch={handlePrefetch}
            />
          </div>

          {/* Desktop CTAs */}
          <div className="cy-navbar-actions hidden lg:flex items-center gap-2 xl:gap-3 3xl:gap-3.5 z-10">
            {/* Theme toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex size-10 items-center justify-center rounded-full border cy-border cy-bg-elevated cy-text-secondary transition-colors hover:cy-text-primary hover:bg-[color-mix(in_srgb,var(--text-primary)_6%,transparent)] 3xl:size-11"
              aria-label="Toggle theme"
            >
              {/* Both icons render; the pre-paint `.dark` class picks one, so server and client markup match */}
              <Sun className="hidden dark:block size-4 3xl:size-[18px]" />
              <Moon className="block dark:hidden size-4 3xl:size-[18px]" />
            </button>

            <Link
              href="/contact"
              className="group relative inline-flex h-10 items-center justify-center rounded-full px-4 text-[13px] font-semibold transition-[background-color,box-shadow,color,transform] duration-200 ease-out border border-transparent bg-transparent text-lp-heading hover:border-lp-border-strong hover:bg-lp-surface xl:text-sm 3xl:h-11 3xl:px-5 3xl:text-[15px]"
            >
              <span className="relative">{t.nav.contactSales}</span>
            </Link>
            <AuthSegmentedPill />
          </div>

          {/* Mobile toggle */}
          <div className="cy-navbar-mobile-toggle flex items-center gap-2 lg:hidden z-10">
            <button
              type="button"
              onClick={toggleTheme}
              className="cy-navbar-ghost rounded-full p-2 cy-text-secondary transition-all hover:bg-[color-mix(in_srgb,var(--text-primary)_6%,transparent)]"
              aria-label="Toggle theme"
            >
              <Sun className="hidden dark:block w-5 h-5" />
              <Moon className="block dark:hidden w-5 h-5" />
            </button>
            <button
              type="button"
              className="cy-navbar-ghost rounded-full p-2 cy-text-secondary transition-all hover:bg-[color-mix(in_srgb,var(--text-primary)_6%,transparent)]"
              aria-label="Toggle menu"
              onClick={() => setMobileMenuOpen((v) => !v)}
            >
              <motion.div
                initial={false}
                animate={{ rotate: mobileMenuOpen ? 90 : 0 }}
                transition={{ duration: 0.2 }}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </motion.div>
            </button>
          </div>
        </motion.div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              className="absolute top-full left-4 right-4 mt-2 overflow-hidden rounded-2xl border cy-border cy-bg-elevated shadow-2xl lg:hidden backdrop-blur-xl z-50"
              initial={{ height: 0, opacity: 0, y: -10 }}
              animate={{ height: 'auto', opacity: 1, y: 0 }}
              exit={{ height: 0, opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flex flex-col gap-1 px-4 py-5 max-h-[85vh] overflow-y-auto">
                {translatedNavItemsFull.map((item) => (
                  item.subMenus ? (
                    <div key={item.label}>
                      <button
                        className="w-full flex items-center justify-between rounded-xl px-3 py-3 text-sm font-medium cy-text-primary transition-colors hover:bg-[color-mix(in_srgb,var(--text-primary)_6%,transparent)]"
                        onClick={() => handleDropdownToggle(item.label)}
                        aria-expanded={activeDropdown === item.label}
                      >
                        {item.label}
                        <ChevronDown className={`w-4 h-4 transition-transform ${activeDropdown === item.label ? 'rotate-180' : ''}`} />
                      </button>
                      {activeDropdown === item.label && (
                        <div className="ms-4 mt-1 space-y-1 border-s-2 cy-border ps-4">
                          {item.subMenus.flatMap((group) =>
                            group.items.map((subItem) => (
                              subItem.isNav ? (
                                <Link
                                  key={subItem.label}
                                  href={subItem.href}
                                  className="block py-2 text-sm cy-text-secondary hover:cy-text-primary transition-colors"
                                  onClick={() => setMobileMenuOpen(false)}
                                >
                                  {subItem.label}
                                </Link>
                              ) : (
                                <a
                                  key={subItem.label}
                                  href={subItem.href}
                                  className="block py-2 text-sm cy-text-secondary hover:cy-text-primary transition-colors"
                                  onClick={(e) => handleNavClick(subItem.href, subItem.isNav, e)}
                                >
                                  {subItem.label}
                                </a>
                              )
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <a
                      key={item.label}
                      href={item.link}
                      className="rounded-xl px-3 py-3 text-sm font-medium cy-text-primary transition-colors hover:bg-[color-mix(in_srgb,var(--text-primary)_6%,transparent)]"
                      onClick={(e) => handleNavClick(item.link, item.isNav, e)}
                    >
                      {item.label}
                    </a>
                  )
                ))}

                <div className="my-3 border-t cy-border mx-2" />

                <div className="flex flex-col gap-3 px-2">
                  <AuthSegmentedPill mobile onNavigate={() => setMobileMenuOpen(false)} />
                  <Link
                    href="/contact"
                    className="group relative flex min-h-10 items-center justify-center gap-2 w-full rounded-full px-4 py-3 font-semibold transition-[background-color,box-shadow,color,transform] duration-200 ease-out border border-transparent bg-transparent text-lp-heading hover:border-lp-border-strong hover:bg-lp-surface"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span className="relative">{t.nav.contactSales}</span>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
}

export default LandingHeader;
