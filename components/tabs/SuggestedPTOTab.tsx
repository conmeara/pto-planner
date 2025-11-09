"use client";

import React, { useState, useEffect } from 'react';
import { BrainCircuit, Star, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { usePlanner } from '@/contexts/PlannerContext';
import type { StrategyType } from '@/types';

// Strategy configuration
const STRATEGIES: Array<{
  type: StrategyType;
  title: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    type: 'balanced',
    title: 'Balanced Mix',
    description: 'Combination of short breaks and longer vacations throughout the year',
    icon: <Star className="h-4 w-4" />
  },
  {
    type: 'long-weekends',
    title: 'Long Weekends',
    description: 'Multiple 3-4 day breaks throughout the year, typically extending weekends',
    icon: <Star className="h-4 w-4" />
  },
  {
    type: 'mini-breaks',
    title: 'Mini Breaks',
    description: 'Several 5-6 day breaks spread across the year',
    icon: <Star className="h-4 w-4" />
  },
  {
    type: 'week-long',
    title: 'Week-Long Breaks',
    description: '7-9 day getaways, ideal for proper vacations',
    icon: <Star className="h-4 w-4" />
  },
  {
    type: 'extended',
    title: 'Extended Vacations',
    description: '10-15 day breaks for deeper relaxation, fewer times per year',
    icon: <Star className="h-4 w-4" />
  }
];

const SuggestedPTOTab: React.FC = () => {
  const {
    currentStrategy,
    suggestedDays,
    selectedDays,
    setSelectedDays,
    setSuggestedDays,
    getCurrentBalance,
    runOptimization,
    setCurrentStrategy,
  } = usePlanner();

  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<{
    totalPTOUsed: number;
    totalDaysOff: number;
    efficiency: number;
  } | null>(null);
  // Track which days were added by the current strategy
  const [currentStrategyDays, setCurrentStrategyDays] = useState<Date[]>([]);

  const availablePTO = getCurrentBalance();

  // Auto-select Balanced Mix on first load
  useEffect(() => {
    // Only auto-select if no strategy is currently selected and we have available PTO
    if (!currentStrategy && availablePTO > 0) {
      handleSelectStrategy('balanced');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  // Handle strategy selection with automatic application
  const handleSelectStrategy = async (strategyType: StrategyType) => {
    // If clicking the same strategy, deselect it
    if (currentStrategy === strategyType) {
      // Remove the strategy days from selected days
      setSelectedDays((prev) =>
        prev.filter((day) =>
          !currentStrategyDays.some((stratDay) =>
            stratDay.getTime() === day.getTime()
          )
        )
      );
      setCurrentStrategyDays([]);
      setSuggestedDays([]);
      setCurrentStrategy(null);
      setOptimizationResult(null);
      return;
    }

    setIsOptimizing(true);
    setOptimizationResult(null);

    try {
      // First, remove any previously applied strategy days
      if (currentStrategyDays.length > 0) {
        setSelectedDays((prev) =>
          prev.filter((day) =>
            !currentStrategyDays.some((stratDay) =>
              stratDay.getTime() === day.getTime()
            )
          )
        );
      }

      const result = runOptimization(strategyType);

      if (result) {
        setOptimizationResult({
          totalPTOUsed: result.totalPTOUsed,
          totalDaysOff: result.totalDaysOff,
          efficiency: result.averageEfficiency,
        });

        // Store the suggested days before applying
        const newStrategyDays = [...result.suggestedDays];
        setCurrentStrategyDays(newStrategyDays);

        // Automatically apply the suggestions by merging into selectedDays
        setSelectedDays((prev) => {
          const combined = [...prev];
          newStrategyDays.forEach((suggestedDate) => {
            const alreadyExists = combined.some((d) =>
              d.getTime() === suggestedDate.getTime()
            );
            if (!alreadyExists) {
              combined.push(suggestedDate);
            }
          });
          return combined;
        });

        // Clear suggested days array since they're now in selectedDays
        setSuggestedDays([]);
        // Keep the strategy selected so user can toggle it off
        // (runOptimization already set currentStrategy, but being explicit)
      }
    } catch (error) {
      console.error('Optimization error:', error);
    } finally {
      setIsOptimizing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 mb-2">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Click a strategy to automatically apply it to your calendar.
          </p>
          <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800">
            {availablePTO} days available
          </Badge>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Click the active strategy again to remove those days.
        </p>
      </div>

      {availablePTO <= 0 && (
        <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-md text-sm">
          <p className="text-orange-800 dark:text-orange-300">
            ⚠️ No PTO days available. Please configure your PTO settings in the PTO tab.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {STRATEGIES.map((strategy) => (
          <div
            key={strategy.type}
            className={`p-3 rounded-lg cursor-pointer transition-all border ${
              currentStrategy === strategy.type
                ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 ring-2 ring-amber-400 dark:ring-amber-600'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-amber-200 dark:hover:border-amber-800'
            }`}
            onClick={() => !isOptimizing && handleSelectStrategy(strategy.type)}
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <div
                  className={`p-1 rounded ${
                    currentStrategy === strategy.type
                      ? 'bg-amber-500 text-white'
                      : 'bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-300'
                  }`}
                >
                  {strategy.icon}
                </div>
                <h3 className="text-sm font-semibold">{strategy.title}</h3>
              </div>
              {currentStrategy === strategy.type && (
                <Badge className="bg-green-500 text-white">
                  ✓ Applied
                </Badge>
              )}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 ml-7">
              {strategy.description}
            </p>
          </div>
        ))}
      </div>

      {isOptimizing && (
        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md text-sm flex items-center gap-2">
          <BrainCircuit className="h-4 w-4 animate-spin text-blue-600" />
          <p className="text-blue-800 dark:text-blue-300">
            Analyzing calendar and optimizing...
          </p>
        </div>
      )}

      {optimizationResult && currentStrategy && (
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-md">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-green-600 dark:text-green-400" />
            <h4 className="text-sm font-semibold text-green-800 dark:text-green-300">
              Strategy Applied
            </h4>
          </div>
          <div className="space-y-1 text-xs text-green-700 dark:text-green-400">
            <p>
              <strong>PTO Days Used:</strong> {optimizationResult.totalPTOUsed} days
            </p>
            <p>
              <strong>Total Days Off:</strong> {optimizationResult.totalDaysOff} days
              (including weekends & holidays)
            </p>
            <p>
              <strong>Efficiency:</strong> {optimizationResult.efficiency.toFixed(2)}x
              <span className="text-xs ml-1">
                ({optimizationResult.totalDaysOff} days off for {optimizationResult.totalPTOUsed}{' '}
                PTO days)
              </span>
            </p>
          </div>
          <p className="text-xs text-green-600 dark:text-green-400 mt-3 text-center">
            Strategy days have been automatically added to your calendar.
            Click the strategy again to remove them.
          </p>
        </div>
      )}
    </div>
  );
};

export default SuggestedPTOTab;
