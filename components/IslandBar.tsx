"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// Tab components
import PTOTab from './tabs/PTOTab';
import SuggestedPTOTab from './tabs/SuggestedPTOTab';
import HolidaysTab from './tabs/HolidaysTab';
import WeekendTab from './tabs/WeekendTab';
import SaveTab from './tabs/SaveTab';
import { ThemeSwitcher } from './theme-switcher';

// Tab types
export enum TabType {
  PTO = 'pto',
  SUGGESTED_PTO = 'suggested',
  PUBLIC_HOLIDAYS = 'holidays',
  WEEKENDS = 'weekends',
  SAVE = 'save',
  NONE = 'none',
}

// IslandBar props
interface IslandBarProps {
  className?: string;
}

interface TabConfig {
  type: TabType;
  icon?: LucideIcon;
  legendDotClass?: string;
  label: string;
  panelTitle: string;
  panelDescription?: string;
}

const TABS: TabConfig[] = [
  {
    type: TabType.PTO,
    legendDotClass: 'bg-primary',
    label: 'PTO',
    panelTitle: 'PTO Settings',
    panelDescription: 'Adjust balances and accrual.',
  },
  {
    type: TabType.SUGGESTED_PTO,
    legendDotClass: 'bg-suggested',
    label: 'Suggested',
    panelTitle: 'Suggested PTO Plans',
    panelDescription: 'Pick a strategy and see it reflected on the calendar immediately.',
  },
  {
    type: TabType.PUBLIC_HOLIDAYS,
    legendDotClass: 'bg-holiday',
    label: 'Holidays',
    panelTitle: 'Holiday Calendar',
    panelDescription: 'Review and manage holidays that affect your time off.',
  },
  {
    type: TabType.WEEKENDS,
    legendDotClass: 'bg-border',
    label: 'Weekends',
    panelTitle: 'Weekend Configuration',
    panelDescription: 'Toggle which days count as weekends for calculations.',
  },
  {
    type: TabType.SAVE,
    label: 'Save',
    panelTitle: 'Save & Sync',
    panelDescription: 'Sign in to sync across devices',
  },
];

const ACTIVE_TAB_STORAGE_KEY = 'islandBar.activeTab';
const VALID_TABS = new Set<TabType>(Object.values(TabType) as TabType[]);

const IslandBar: React.FC<IslandBarProps> = ({ className }) => {
  const [activeTab, setActiveTab] = useState<TabType>(TabType.NONE);
  const [headerActions, setHeaderActions] = useState<React.ReactNode>(null);
  const menuContainerRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);

  const setHeaderActionsCallback = useCallback((actions: React.ReactNode | null) => {
    console.log('[IslandBar] setHeaderActionsCallback called', { hasActions: !!actions });
    setHeaderActions(actions);
  }, []);

  const setActiveTabAndPersist = useCallback(
    (update: TabType | ((current: TabType) => TabType)) => {
      setActiveTab((current) => {
        const next = typeof update === 'function' ? update(current) : update;

        if (typeof window !== 'undefined') {
          try {
            window.localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, next);
          } catch (error) {
            console.warn('[IslandBar] Failed to persist active tab', error);
          }
        }

        return next;
      });
    },
    [setActiveTab]
  );

  // Close the panel when users press Escape
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveTabAndPersist(TabType.NONE);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveTabAndPersist]);

  // Don't clear header actions on tab change - let the tabs manage their own cleanup
  // This was causing the toggle to disappear because it cleared AFTER PTOTab set it
  
  useEffect(() => {
    console.log('[IslandBar] headerActions changed', { hasHeaderActions: !!headerActions });
  }, [headerActions]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    let storedTab: string | null = null;

    try {
      storedTab = window.localStorage.getItem(ACTIVE_TAB_STORAGE_KEY);
    } catch (error) {
      console.warn('[IslandBar] Failed to read active tab from storage', error);
    }

    if (storedTab && VALID_TABS.has(storedTab as TabType)) {
      setActiveTab((storedTab as TabType));
      return;
    }

    setActiveTabAndPersist(TabType.PTO);
  }, [setActiveTab, setActiveTabAndPersist]);

  const scrollActivePanelIntoView = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const panel = panelRef.current;
    if (!panel) {
      return;
    }

    const menuHeight = menuContainerRef.current?.getBoundingClientRect().height ?? 0;
    const panelRectTop = panel.getBoundingClientRect().top;
    const scrollMargin = 16;
    const stickyOffset = menuHeight + scrollMargin;
    const panelTopRelativeToViewport = panelRectTop;
    const panelTop = panelRectTop + window.scrollY;
    const targetScrollTop = Math.max(panelTop - stickyOffset, 0);

    if (panelTopRelativeToViewport >= stickyOffset) {
      return;
    }

    const prefersReducedMotion =
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    window.scrollTo({
      top: targetScrollTop,
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
  }, []);

  useEffect(() => {
    if (activeTab === TabType.NONE) {
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      scrollActivePanelIntoView();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [activeTab, scrollActivePanelIntoView]);

  const toggleTab = useCallback(
    (tab: TabType) => {
      setActiveTabAndPersist((current) => {
        if (current === tab) {
          scrollActivePanelIntoView();
          return current;
        }

        return tab;
      });
    },
    [scrollActivePanelIntoView, setActiveTabAndPersist]
  );

  const activeTabConfig = TABS.find((tab) => tab.type === activeTab);

  const activeTabContent = useMemo(() => {
    switch (activeTab) {
      case TabType.PTO:
        return <PTOTab onHeaderActionsChange={setHeaderActionsCallback} />;
      case TabType.SUGGESTED_PTO:
        return <SuggestedPTOTab />;
      case TabType.PUBLIC_HOLIDAYS:
        return <HolidaysTab />;
      case TabType.WEEKENDS:
        return <WeekendTab />;
      case TabType.SAVE:
        return <SaveTab />;
      default:
        return null;
    }
  }, [activeTab, setHeaderActionsCallback]);

  return (
    <div className={cn('mx-auto w-full max-w-7xl space-y-4 px-0', className)}>
      <div ref={menuContainerRef} className="sticky top-0 z-40 flex justify-center pt-2">
        <motion.div
          className="flex items-center gap-1.5 rounded-3xl border border-border/80 bg-muted px-3 py-1.5 text-sm text-muted-foreground sm:px-4"
          layout
          transition={{
            type: 'spring',
            stiffness: 500,
            damping: 40,
            mass: 0.8,
          }}
        >
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.type;

            return (
              <motion.button
                key={tab.type}
                type="button"
                onClick={() => toggleTab(tab.type)}
                className={cn(
                  'inline-flex items-center gap-1 rounded-2xl border border-transparent px-3 py-1.5 text-xs font-semibold tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isActive
                    ? 'border-border bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground/90'
                )}
                aria-expanded={isActive}
                aria-controls={`island-panel-${tab.type}`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                transition={{
                  type: 'spring',
                  stiffness: 600,
                  damping: 30,
                }}
              >
                {tab.legendDotClass ? (
                  <motion.span
                    aria-hidden="true"
                    className={cn('h-3 w-3 rounded-full sm:h-3.5 sm:w-3.5', tab.legendDotClass)}
                    animate={{ scale: isActive ? [1, 1.15, 1] : 1 }}
                    transition={{ duration: 0.3 }}
                  />
                ) : (
                  Icon && <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                )}
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sr-only sm:hidden">{tab.label}</span>
              </motion.button>
            );
          })}
        </motion.div>
      </div>

      <AnimatePresence initial={false} mode="wait">
        {activeTab !== TabType.NONE && activeTabConfig && (
          <motion.section
            key={activeTab}
            id={`island-panel-${activeTab}`}
            ref={panelRef}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="rounded-3xl border border-border bg-card px-5 py-5 text-card-foreground sm:px-7"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-baseline gap-2">
                <span className="text-sm font-semibold text-foreground">
                  {activeTabConfig.panelTitle}
                </span>
                {activeTabConfig.panelDescription && (
                  <p className="text-xs text-muted-foreground">
                    {activeTabConfig.panelDescription}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3">
                {headerActions}
                {activeTab === TabType.SAVE && <ThemeSwitcher />}
                <button
                  type="button"
                  onClick={() => setActiveTabAndPersist(TabType.NONE)}
                  className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Close panel"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-4">{activeTabContent}</div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
};

export default IslandBar;
