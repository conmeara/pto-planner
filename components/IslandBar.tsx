"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserRound, X, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    label: 'Save',
    panelTitle: 'Save & Sync',
    panelDescription: 'Sign in to sync across devices and keep changes in step automatically.',
  },
];

const IslandBar: React.FC<IslandBarProps> = ({ className }) => {
  const [activeTab, setActiveTab] = useState<TabType>(TabType.NONE);

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
    <div className={cn('mx-auto w-full max-w-7xl space-y-3 px-0', className)}>
      <div className="sticky top-0 z-40 flex justify-center pt-2">
        <motion.div
          className="flex items-center gap-1 rounded-full border border-slate-200/70 bg-white/90 px-2 py-1.5 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:border-slate-700/60 dark:bg-slate-950/70 sm:gap-1.5 sm:px-2.5"
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
                  'flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/70 dark:focus-visible:ring-slate-500 sm:px-2.5',
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm dark:bg-white/90 dark:text-slate-900'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-white'
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
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="rounded-2xl border border-slate-200/80 bg-white/95 px-4 py-4 text-slate-900 shadow-md dark:border-slate-700/60 dark:bg-slate-950/85 dark:text-slate-100 sm:px-6"
          >
            <div className="flex flex-wrap items-start gap-3">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {ActiveIcon && (
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-900/90 text-white dark:bg-white/90 dark:text-slate-900">
                      <ActiveIcon className="h-4 w-4" />
                    </span>
                  )}
                  <span className="truncate">{activeTabConfig.panelTitle}</span>
                </div>
                {activeTabConfig.panelDescription && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {activeTabConfig.panelDescription}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setActiveTab(TabType.NONE)}
                className="ml-auto rounded-full p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-white"
                aria-label="Close panel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4">
              {renderActiveTabContent()}
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
};

export default IslandBar;