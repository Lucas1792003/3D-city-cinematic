'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import type { ComponentType } from 'react';

export interface NavSubItem {
  label: string;
  href: string;
  description: string;
  isNav?: boolean;
  icon: ComponentType<{ className?: string }>;
}

export interface NavSubMenu {
  title: string;
  items: NavSubItem[];
}

export interface NavItem {
  id: number;
  label: string;
  link: string;
  isNav?: boolean;
  subMenus?: NavSubMenu[];
}

interface DropdownNavigationProps {
  navItems: NavItem[];
  onNavigate?: (href: string, isNav: boolean | undefined, event: React.MouseEvent) => void;
  onPrefetch?: (href: string) => void;
}

export const DropdownNavigation = React.memo(function DropdownNavigation({
  navItems,
  onNavigate,
  onPrefetch,
}: DropdownNavigationProps) {
  const [openMenu, setOpenMenu] = React.useState<string | null>(null);
  const [isHover, setIsHover] = React.useState<number | null>(null);

  const handleHover = (menuLabel: string | null) => {
    setOpenMenu(menuLabel);
  };

  return (
    <ul className="relative flex items-center space-x-0 xl:space-x-1 3xl:space-x-2">
      {navItems.map((navItem, index) => (
        <li
          key={navItem.label}
          className="relative"
          onMouseEnter={() => handleHover(navItem.label)}
          onMouseLeave={() => handleHover(null)}
        >
          <a
            href={navItem.link ?? '#'}
            className="cy-navbar-link relative flex cursor-pointer items-center justify-center gap-1 rounded-full px-3 py-2 text-[13px] transition-colors duration-300 group cy-text-secondary hover:cy-text-primary xl:gap-1.5 xl:px-4 xl:text-sm 3xl:gap-2 3xl:px-5 3xl:py-2.5 3xl:text-[15px]"
            onMouseEnter={() => setIsHover(navItem.id)}
            onMouseLeave={() => setIsHover(null)}
            onClick={(event) => onNavigate?.(navItem.link ?? '#', navItem.isNav, event)}
            aria-expanded={openMenu === navItem.label}
            aria-haspopup={Boolean(navItem.subMenus)}
          >
            <span>{navItem.label}</span>
            {navItem.subMenus && (
              <ChevronDown
                className={`h-3.5 w-3.5 xl:h-4 xl:w-4 group-hover:rotate-180 duration-300 transition-transform ${
                  openMenu === navItem.label ? 'rotate-180' : ''
                }`}
              />
            )}
            {(isHover === navItem.id || openMenu === navItem.label) && (
              <motion.div
                layoutId="hover-bg"
                className="cy-navbar-hover-bg absolute inset-0 size-full bg-[color-mix(in_srgb,var(--text-primary)_6%,transparent)]"
                style={{ borderRadius: 99 }}
              />
            )}
          </a>

          <AnimatePresence>
            {openMenu === navItem.label && navItem.subMenus && (
              <div className={`w-auto absolute ${navItem.id === 3 ? 'left-1/2 -translate-x-1/2' : index >= Math.floor(navItems.length / 2) ? 'right-0' : 'left-0'} top-full pt-2 z-50`}>
                <motion.div
                  className={`cy-navbar-dropdown cy-bg-elevated ${navItem.id === 3 ? 'w-[min(680px,calc(100vw-32px))]' : 'w-max'} border cy-border p-4 shadow-2xl xl:p-5 3xl:p-6`}
                  style={{ borderRadius: 16 }}
                  layoutId="menu"
                >
                  <div className="w-fit shrink-0 flex space-x-9 overflow-hidden">
                    {navItem.subMenus.map((sub) => (
                      <motion.div layout className="w-full" key={sub.title}>
                        <h3 className="cy-navbar-dropdown-label mb-4 text-[10px] font-bold uppercase tracking-[0.18em] cy-text-muted xl:text-[11px] 3xl:text-[12px]">
                          {sub.title}
                        </h3>
                        <ul className={navItem.id === 3 ? 'grid grid-flow-col grid-cols-2 grid-rows-5 gap-x-8 gap-y-4' : 'space-y-4'}>
                          {sub.items.map((item) => {
                            return (
                              <li key={item.label}>
                                <a
                                  href={item.href ?? '#'}
                                  className="cy-navbar-dropdown-item flex items-start group rounded-xl p-2 -mx-2 -my-1 transition-colors duration-300"
                                  onMouseEnter={() => item.isNav && onPrefetch?.(item.href)}
                                  onClick={(event) => onNavigate?.(item.href ?? '#', item.isNav, event)}
                                >
                                  <div className={`leading-5 ${navItem.id === 3 ? 'min-w-0' : 'w-max'}`}>
                                    <p className="cy-navbar-dropdown-title text-[13px] font-semibold cy-text-primary shrink-0 xl:text-sm 3xl:text-[15px]">
                                      {item.label}
                                    </p>
                                    <p className="cy-navbar-dropdown-desc text-xs cy-text-muted shrink-0 transition-colors duration-300 group-hover:cy-text-secondary xl:text-[13px] 3xl:text-[14px]">
                                      {item.description}
                                    </p>
                                  </div>
                                </a>
                              </li>
                            );
                          })}
                        </ul>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </li>
      ))}
    </ul>
  );
});
