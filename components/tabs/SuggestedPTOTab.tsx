"use client";

import React, { useState } from 'react';
import { BrainCircuit, Check, Star, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePlanner } from '@/contexts/PlannerContext';

// Strategy types
export enum StrategyType {
  BALANCED_MIX = 'balanced',
  LONG_WEEKENDS = 'long-weekends',
  MINI_BREAKS = 'mini-breaks',
  WEEK_LONG = 'week-long',
  EXTENDED = 'extended'
}

// Strategy configuration
const STRATEGIES = [
  {
    type: StrategyType.BALANCED_MIX,
    title: 'Balanced Mix',
    description: 'Combination of short breaks and longer vacations throughout the year',
    icon: <Star className="h-4 w-4" />
  },
  {
    type: StrategyType.LONG_WEEKENDS,
    title: 'Long Weekends',
    description: 'Multiple 3-4 day breaks throughout the year, typically extending weekends',
    icon: <Star className="h-4 w-4" />
  },
  {
    type: StrategyType.MINI_BREAKS,
    title: 'Mini Breaks',
    description: 'Several 5-6 day breaks spread across the year',
    icon: <Star className="h-4 w-4" />
  },
  {
    type: StrategyType.WEEK_LONG,
    title: 'Week-Long Breaks',
    description: '7-9 day getaways, ideal for proper vacations',
    icon: <Star className="h-4 w-4" />
  },
  {
    type: StrategyType.EXTENDED,
    title: 'Extended Vacations',
    description: '10-15 day breaks for deeper relaxation, fewer times per year',
    icon: <Star className="h-4 w-4" />
  }
];

const SuggestedPTOTab: React.FC = () => {
  const {
    currentStrategy,
    suggestedDays,
    getCurrentBalance,
    runOptimization,
    applySuggestions,
    clearSuggestions,
  } = usePlanner();

  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<{
    totalPTOUsed: number;
    totalDaysOff: number;
    efficiency: number;
  } | null>(null);

  const availablePTO = getCurrentBalance();

  // Handle strategy selection
  const handleSelectStrategy = async (strategyType: StrategyType) => {
    setIsOptimizing(true);
    setOptimizationResult(null);

    try {
      const result = runOptimization(strategyType);

      if (result) {
        setOptimizationResult({
          totalPTOUsed: result.totalPTOUsed,
          totalDaysOff: result.totalDaysOff,
          efficiency: result.averageEfficiency,
        });
      }
    } catch (error) {
      console.error('Optimization error:', error);
    } finally {
      setIsOptimizing(false);
    }
  };

  // Handle applying suggestions
  const handleApply = async () => {
    if (!currentStrategy || suggestedDays.length === 0) return;

    setIsApplying(true);
    try {
      applySuggestions();
      setOptimizationResult(null);
    } finally {
      setIsApplying(false);
    }
  };

  // Handle clearing suggestions
  const handleClear = () => {
    clearSuggestions();
    setOptimizationResult(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Select a strategy to optimize your PTO usage.
        </p>
        <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800">
          {availablePTO} days available
        </Badge>
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
                ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700'
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
              {currentStrategy === strategy.type && suggestedDays.length > 0 && (
                <Badge className="bg-amber-500 text-white">
                  {suggestedDays.length} days suggested
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

      {optimizationResult && currentStrategy && suggestedDays.length > 0 && (
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-md">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-green-600 dark:text-green-400" />
            <h4 className="text-sm font-semibold text-green-800 dark:text-green-300">
              Optimization Results
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
        </div>
      )}

      {currentStrategy && suggestedDays.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
          <Button
            onClick={handleApply}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white"
            disabled={isApplying}
          >
            {isApplying ? (
              <>
                <BrainCircuit className="mr-2 h-4 w-4 animate-spin" />
                Applying strategy...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Apply {suggestedDays.length} suggested days
              </>
            )}
          </Button>

          <Button
            onClick={handleClear}
            variant="outline"
            className="w-full border-gray-300 dark:border-gray-600"
            disabled={isApplying}
          >
            Clear suggestions
          </Button>

          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
            Suggested days will be shown in yellow on the calendar.
            Click "Apply" to add them to your PTO plan.
          </p>
        </div>
      )}
    </div>
  );
};

export default SuggestedPTOTab;
