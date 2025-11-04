"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  BrainCircuit, 
  Globe, 
  CalendarDays, 
  Save
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Tab components
import PTOTab from './tabs/PTOTab';
import SuggestedPTOTab, { StrategyType } from './tabs/SuggestedPTOTab';
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
  NONE = 'none'
}

// IslandBar props
interface IslandBarProps {
  className?: string;
  onCountryChange?: (country: string) => void;
  onShowHolidaysChange?: (show: boolean) => void;
  onRefreshHolidays?: () => Promise<void>;
  selectedCountry?: string;
  showHolidays?: boolean;
}

// Default PTO Settings
const DEFAULT_PTO_SETTINGS = {
  initialBalance: 15,
  asOfDate: new Date().toISOString().split('T')[0],
  accrualFrequency: 'monthly',
  accrualAmount: 1.25,
  maxCarryover: 5,
  ptoColor: 'green-500'
};

const IslandBar: React.FC<IslandBarProps> = ({ 
  className,
  onCountryChange: externalCountryChange,
  onShowHolidaysChange: externalShowHolidaysChange,
  onRefreshHolidays: externalRefreshHolidays,
  selectedCountry: externalSelectedCountry = 'US',
  showHolidays: externalShowHolidays = true,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>(TabType.NONE);
  const tabsRef = useRef<HTMLDivElement>(null);
  const [tabsWidth, setTabsWidth] = useState<number>(0);
  
  // State for each tab
  const [ptoSettings, setPtoSettings] = useState(DEFAULT_PTO_SETTINGS);
  const [weekendDays, setWeekendDays] = useState<number[]>([0, 6]); // Sunday and Saturday
  const [selectedCountry, setSelectedCountry] = useState(externalSelectedCountry);
  const [showHolidays, setShowHolidays] = useState(externalShowHolidays);
  const [currentStrategy, setCurrentStrategy] = useState<StrategyType | undefined>(undefined);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);
  
  // Sync external props with internal state
  useEffect(() => {
    setSelectedCountry(externalSelectedCountry);
  }, [externalSelectedCountry]);
  
  useEffect(() => {
    setShowHolidays(externalShowHolidays);
  }, [externalShowHolidays]);
  
  // Get width of tabs for submenu width matching
  useEffect(() => {
    if (tabsRef.current) {
      setTabsWidth(tabsRef.current.offsetWidth);
    }
  }, [activeTab]);
  
  // Toggle tab function
  const toggleTab = (tab: TabType) => {
    if (activeTab === tab) {
      setActiveTab(TabType.NONE);
    } else {
      setActiveTab(tab);
    }
  };

  // Tab handlers
  const handlePTOSettingsChange = (settings: typeof ptoSettings) => {
    setPtoSettings(settings);
    // Here you would also persist settings to your backend/database
  };

  const handleWeekendChange = (days: number[]) => {
    setWeekendDays(days);
    // Here you would also persist weekend configuration
  };

  const handleCountryChange = (country: string) => {
    setSelectedCountry(country);
    if (externalCountryChange) {
      externalCountryChange(country);
    }
  };

  const handleShowHolidaysChange = (show: boolean) => {
    setShowHolidays(show);
    if (externalShowHolidaysChange) {
      externalShowHolidaysChange(show);
    }
  };

  const handleRefreshHolidays = async (): Promise<void> => {
    if (externalRefreshHolidays) {
      await externalRefreshHolidays();
    }
  };

  const handleSelectStrategy = (strategy: StrategyType) => {
    setCurrentStrategy(strategy);
  };

  const handleApplySuggestions = async (): Promise<void> => {
    // Here you would apply the selected strategy
    // For now, just simulate a delay
    await new Promise<void>((resolve) => setTimeout(() => resolve(), 1500));
  };

  const handleSignIn = async (email: string) => {
    // Here you would trigger Supabase magic link auth
    // For now, just simulate a delay and success
    await new Promise<void>((resolve) => setTimeout(() => resolve(), 1500));
    setIsLoggedIn(true);
    setUserEmail(email);
  };

  const handleSignOut = () => {
    setIsLoggedIn(false);
    setUserEmail(undefined);
  };

  const handleSave = async (): Promise<void> => {
    // Here you would save the user's PTO plan
    // For now, just simulate a delay
    await new Promise<void>((resolve) => setTimeout(() => resolve(), 1000));
  };

  // Tab configuration
  const tabs = [
    { 
      type: TabType.PTO, 
      icon: <Calendar className="w-5 h-5" />, 
      label: 'PTO',
      color: 'bg-rose-500/90 hover:bg-rose-500 text-white'
    },
    { 
      type: TabType.SUGGESTED_PTO, 
      icon: <BrainCircuit className="w-5 h-5" />, 
      label: 'Suggested',
      color: 'bg-amber-500/90 hover:bg-amber-500 text-white'
    },
    { 
      type: TabType.PUBLIC_HOLIDAYS, 
      icon: <Globe className="w-5 h-5" />, 
      label: 'Holidays',
      color: 'bg-blue-500/90 hover:bg-blue-500 text-white'
    },
    { 
      type: TabType.WEEKENDS, 
      icon: <CalendarDays className="w-5 h-5" />, 
      label: 'Weekends',
      color: 'bg-purple-500/90 hover:bg-purple-500 text-white'
    },
    { 
      type: TabType.SAVE, 
      icon: <Save className="w-5 h-5" />, 
      label: 'Save',
      color: 'bg-green-500/90 hover:bg-green-500 text-white'
    }
  ];

  // Get tab color based on active tab
  const getActiveTabColor = () => {
    const activeTabConfig = tabs.find(tab => tab.type === activeTab);
    if (!activeTabConfig) return 'bg-gray-900/80';
    
    // Extract the base color without the opacity
    const baseColor = activeTabConfig.color.split(' ')[0].replace('/90', '/95');
    return baseColor;
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Island Bar Container */}
      <div className="flex justify-center">
        <motion.div
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="relative flex flex-col items-center"
        >
          {/* Main tab bar */}
          <div 
            ref={tabsRef}
            className={cn(
              "flex items-center justify-center gap-1 py-1.5 px-2 bg-black/85 backdrop-blur-md border border-white/10 shadow-lg z-10",
              activeTab === TabType.NONE ? "rounded-full" : "rounded-t-full border-b-0"
            )}
          >
            {tabs.map((tab) => (
              <motion.button
                key={tab.type}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-full transition-all",
                  tab.color,
                  activeTab === tab.type ? "shadow-md scale-105" : "opacity-90"
                )}
                onClick={() => toggleTab(tab.type)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {tab.icon}
                <span className="text-sm font-medium">{tab.label}</span>
              </motion.button>
            ))}
          </div>

          {/* Panel container - connected to tab bar */}
          <AnimatePresence>
            {activeTab !== TabType.NONE && (
              <motion.div 
                className={cn(
                  "overflow-hidden border border-white/10 border-t-0 rounded-b-2xl z-0",
                  getActiveTabColor()
                )}
                style={{ width: tabsWidth > 0 ? `${tabsWidth}px` : 'auto' }}
                initial={{ opacity: 0, height: 0 }}
                animate={{ 
                  opacity: 1, 
                  height: "auto"
                }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                <div className="relative px-6 py-5 bg-black/75 backdrop-blur-lg text-white">
                  {/* Content based on active tab */}
                  <div className="pt-1">
                    {activeTab === TabType.PTO && (
                      <div>
                        <h3 className="text-xl font-semibold mb-4">PTO Settings</h3>
                        <PTOTab 
                          settings={ptoSettings}
                          onSettingsChange={handlePTOSettingsChange}
                        />
                      </div>
                    )}
                    
                    {activeTab === TabType.SUGGESTED_PTO && (
                      <div>
                        <h3 className="text-xl font-semibold mb-4">Suggested PTO Strategies</h3>
                        <SuggestedPTOTab 
                          availablePTO={15} // This would come from your calculated PTO balance
                          onSelectStrategy={handleSelectStrategy}
                          onApplySuggestions={handleApplySuggestions}
                          currentStrategy={currentStrategy}
                        />
                      </div>
                    )}
                    
                    {activeTab === TabType.PUBLIC_HOLIDAYS && (
                      <div>
                        <h3 className="text-xl font-semibold mb-4">Public Holidays</h3>
                        <HolidaysTab 
                          selectedCountry={selectedCountry}
                          showHolidays={showHolidays}
                          onCountryChange={handleCountryChange}
                          onShowHolidaysChange={handleShowHolidaysChange}
                          onRefreshHolidays={handleRefreshHolidays}
                        />
                      </div>
                    )}
                    
                    {activeTab === TabType.WEEKENDS && (
                      <div>
                        <h3 className="text-xl font-semibold mb-4">Weekend Configuration</h3>
                        <WeekendTab 
                          weekendDays={weekendDays}
                          onWeekendChange={handleWeekendChange}
                        />
                      </div>
                    )}
                    
                    {activeTab === TabType.SAVE && (
                      <div>
                        <h3 className="text-xl font-semibold mb-4">Save & Account</h3>
                        <SaveTab 
                          isLoggedIn={isLoggedIn}
                          email={userEmail}
                          onSignIn={handleSignIn}
                          onSignOut={handleSignOut}
                          onSave={handleSave}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};

export default IslandBar; 