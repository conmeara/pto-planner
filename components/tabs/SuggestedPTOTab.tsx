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

  const initialPTO = getCurrentBalance();
  const usedPTO = selectedDays.length;
  const availablePTO = Math.max(initialPTO - usedPTO, 0);

  // Auto-select Balanced Mix on first load
  useEffect(() => {
    // Only auto-select if no strategy is currently selected and we have available PTO
    if (!currentStrategy && availablePTO > 0) {
      handleSelectStrategy('balanced');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  // Re-run optimization when selectedDays change (if a strategy is active)
  useEffect(() => {
    if (currentStrategy && !isOptimizing) {
      // Re-optimize to adjust for the new selected days
      const result = runOptimization(currentStrategy);
      if (result) {
        setOptimizationResult({
          totalPTOUsed: result.totalPTOUsed,
          totalDaysOff: result.totalDaysOff,
          efficiency: result.averageEfficiency,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDays, currentStrategy]);

  // Handle strategy selection - shows suggestions in yellow
  const handleSelectStrategy = async (strategyType: StrategyType) => {
    // If clicking the same strategy, deselect it
    if (currentStrategy === strategyType) {
      setSuggestedDays([]);
      setCurrentStrategy(null);
      setOptimizationResult(null);
      return;
    }

    setIsOptimizing(true);

    try {
      const result = runOptimization(strategyType);

      if (result) {
        setOptimizationResult({
          totalPTOUsed: result.totalPTOUsed,
          totalDaysOff: result.totalDaysOff,
          efficiency: result.averageEfficiency,
        });

        // Keep suggested days in the suggestedDays array so they show as yellow
        // User will manually click them to select (turn green)
        // (runOptimization already sets suggestedDays and currentStrategy)
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
            Click a strategy to see suggested PTO days (shown in yellow).
          </p>
          <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800">
            {availablePTO} days available
          </Badge>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Click suggested days on the calendar to select them as PTO.
        </p>
      </div>

      {availablePTO <= 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:border-rose-900/60 dark:bg-rose-500/15 dark:text-rose-200">
          ⚠️ You're out of PTO days. Adjust your selections or settings to unlock new suggestions.
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
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">{strategy.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{strategy.description}</p>
                </div>
              </div>
              {currentStrategy === strategy.type && suggestedDays.length > 0 && (
                <Badge className="bg-amber-500 text-white">
                  {suggestedDays.length} suggested
                </Badge>
              )}
            </div>
          </div>
        ))}
      </div>

      {isOptimizing && (
        <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:border-blue-900/60 dark:bg-blue-500/10 dark:text-blue-200">
          <BrainCircuit className="h-3.5 w-3.5 animate-spin" />
          Crunching calendar data…
        </div>
      )}

      {optimizationResult && currentStrategy && suggestedDays.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-md border border-amber-200 dark:border-amber-700">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              Suggested Plan Preview
            </h4>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-xs uppercase tracking-wide text-amber-600 dark:text-amber-400">Will Use</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{optimizationResult.totalPTOUsed}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-amber-600 dark:text-amber-400">Days Off</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{optimizationResult.totalDaysOff}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-amber-600 dark:text-amber-400">Efficiency</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{optimizationResult.efficiency.toFixed(2)}x</p>
            </div>
          </div>
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-3 text-center">
            {suggestedDays.length} days are highlighted in yellow on the calendar. Click them to select as PTO.
          </p>
        </div>
      )}
    </div>
  );
};

export default SuggestedPTOTab;
