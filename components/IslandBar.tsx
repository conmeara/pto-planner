"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, type LucideIcon } from 'lucide-react';
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
    legendDotClass: 'bg-[hsl(var(--secondary))]',
    label: 'PTO',
    panelTitle: 'PTO Settings',
    panelDescription: 'Adjust balances and accrual – updates are saved instantly.',
  },
  {
    type: TabType.SUGGESTED_PTO,
    legendDotClass: 'bg-[hsl(var(--accent))]',
    label: 'Suggested',
    panelTitle: 'Suggested PTO Plans',
    panelDescription: 'Pick a strategy and see it reflected on the calendar immediately.',
  },
  {
    type: TabType.PUBLIC_HOLIDAYS,
    legendDotClass: 'bg-[hsl(var(--primary) / 0.8)]',
    label: 'Holidays',
    panelTitle: 'Holiday Calendar',
    panelDescription: 'Review and manage holidays that affect your time off.',
  },
  {
    type: TabType.WEEKENDS,
    legendDotClass: 'bg-[hsl(var(--muted))]',
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
            className="flex items-center gap-1 rounded-full border border-[hsl(var(--primary) / 0.25)] bg-[hsl(var(--card) / 0.88)] px-2 py-1.5 shadow-[0_20px_45px_-28px_rgba(38,73,70,0.6)] backdrop-blur-md supports-[backdrop-filter]:bg-[hsl(var(--card) / 0.78)] sm:gap-1.5 sm:px-2.5"
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
                    'flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:px-2.5',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-[0_14px_30px_-18px_rgba(38,73,70,0.65)]'
                      : 'text-[hsl(var(--ghibli-forest) / 0.75)] hover:bg-[hsl(var(--primary) / 0.12)] hover:text-[hsl(var(--ghibli-forest))]'
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
                      className={cn('h-3 w-3 rounded-full sm:h-3.5 sm:w-3.5 shadow-[0_0_0_1px_rgba(255,255,255,0.35)]', tab.legendDotClass)}
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
              className="rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card) / 0.92)] px-4 py-4 text-[hsl(var(--foreground))] shadow-[0_28px_65px_-40px_rgba(53,84,74,0.65)] backdrop-blur-md sm:px-6"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-baseline gap-2">
                  <span className="text-sm font-semibold text-[hsl(var(--ghibli-forest))]">
                  {activeTabConfig.panelTitle}
                </span>
                {activeTabConfig.panelDescription && (
                    <p className="text-xs text-[hsl(var(--ghibli-forest) / 0.65)]">
                    {activeTabConfig.panelDescription}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab(TabType.NONE)}
                    className="rounded-full p-1.5 text-[hsl(var(--ghibli-forest) / 0.6)] transition-colors hover:bg-[hsl(var(--primary) / 0.12)] hover:text-[hsl(var(--foreground))]"
                  aria-label="Close panel"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
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