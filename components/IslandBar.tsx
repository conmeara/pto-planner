"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, UserRound, X, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCalendarNavigation } from '@/contexts/CalendarNavigationContext';
import { Button } from './ui/button';

// Tab components
import PTOTab from './tabs/PTOTab';
import SuggestedPTOTab from './tabs/SuggestedPTOTab';
import HolidaysTab from './tabs/HolidaysTab';
import WeekendTab from './tabs/WeekendTab';
import SaveTab from './tabs/SaveTab';

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
    legendDotClass: 'bg-green-500',
    label: 'PTO',
    panelTitle: 'PTO Settings',
    panelDescription: 'Adjust balances and accrual – updates are saved instantly.',
  },
  {
    type: TabType.SUGGESTED_PTO,
    legendDotClass: 'bg-yellow-200 dark:bg-yellow-800',
    label: 'Suggested',
    panelTitle: 'Suggested PTO Plans',
    panelDescription: 'Pick a strategy and see it reflected on the calendar immediately.',
  },
  {
    type: TabType.PUBLIC_HOLIDAYS,
    legendDotClass: 'bg-blue-100 dark:bg-blue-900',
    label: 'Holidays',
    panelTitle: 'Holiday Calendar',
    panelDescription: 'Review and manage holidays that affect your time off.',
  },
  {
    type: TabType.WEEKENDS,
    legendDotClass: 'bg-gray-100 dark:bg-gray-800',
    label: 'Weekends',
    panelTitle: 'Weekend Configuration',
    panelDescription: 'Toggle which days count as weekends for calculations.',
  },
  {
    type: TabType.SAVE,
    icon: UserRound,
    label: 'Account',
    panelTitle: 'Account & Sync',
    panelDescription: 'Sign in to sync across devices and keep changes in step automatically.',
  },
];

const IslandBar: React.FC<IslandBarProps> = ({ className }) => {
  const [activeTab, setActiveTab] = useState<TabType>(TabType.NONE);
  const { goPrev, goNext, goToday, canGoPrev, canGoNext, label, isBusy } =
    useCalendarNavigation();

  // Close the panel when users press Escape
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveTab(TabType.NONE);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleTab = (tab: TabType) => {
    setActiveTab((current) => (current === tab ? TabType.NONE : tab));
  };

  const activeTabConfig = TABS.find((tab) => tab.type === activeTab);
  const ActiveIcon = activeTabConfig?.icon;

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case TabType.PTO:
        return <PTOTab />;
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
  };

  return (
    <div className={cn('relative z-20 mx-auto w-full max-w-6xl px-2 sm:px-0', className)}>
      <motion.div
        layout
        className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white/90 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:border-slate-700/60 dark:bg-slate-950/70"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 px-2 py-1.5 sm:px-3">
          <div className="flex flex-wrap items-center gap-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.type;

              return (
                <button
                  key={tab.type}
                  type="button"
                  onClick={() => toggleTab(tab.type)}
                  className={cn(
                    'flex items-center gap-1 rounded-full px-3 py-2 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/70 dark:focus-visible:ring-slate-500',
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm dark:bg-white/90 dark:text-slate-900'
                      : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-white'
                  )}
                  aria-expanded={isActive}
                  aria-controls={`island-panel-${tab.type}`}
                >
                  {tab.legendDotClass ? (
                    <span
                      aria-hidden="true"
                      className={cn('h-3.5 w-3.5 rounded-full', tab.legendDotClass)}
                    />
                  ) : (
                    Icon && <Icon className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sr-only sm:hidden">{tab.label}</span>
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="hidden text-xs font-medium text-slate-500 dark:text-slate-400 sm:inline">
              {label || 'Current months'}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={goPrev}
                disabled={!canGoPrev || isBusy}
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only sm:ml-1">Prev</span>
              </Button>
              <Button variant="outline" size="sm" onClick={goToday} disabled={isBusy}>
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goNext}
                disabled={!canGoNext || isBusy}
              >
                <span className="sr-only sm:not-sr-only sm:mr-1">Next</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <AnimatePresence initial={false} mode="wait">
          {activeTab !== TabType.NONE && activeTabConfig && (
            <motion.div
              key={activeTab}
              id={`island-panel-${activeTab}`}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.24, ease: 'easeInOut' }}
              className="overflow-hidden border-t border-slate-200/70 bg-white/95 text-slate-900 dark:border-slate-700/60 dark:bg-slate-950/80 dark:text-slate-100 max-h-[70vh]"
            >
              <div className="px-4 py-4 sm:px-6 sm:py-5">
                <div className="flex items-start justify-between gap-3 pb-3">
                  <div>
                    {ActiveIcon && (
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
                        <ActiveIcon className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                        <span>{activeTabConfig.panelTitle}</span>
                      </div>
                    )}
                    {activeTabConfig.panelDescription && (
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {activeTabConfig.panelDescription}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab(TabType.NONE)}
                    className="rounded-full p-1 text-slate-500 transition-colors hover:bg-slate-100/80 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-white"
                    aria-label="Close panel"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-2 max-h-[60vh] overflow-y-auto pr-2">
                  {renderActiveTabContent()}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default IslandBar;