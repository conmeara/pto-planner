"use client";

import React, { useState, useEffect } from 'react';
import { BrainCircuit, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { usePlanner } from '@/contexts/PlannerContext';
import type { StrategyType } from '@/types';
import { cn } from '@/lib/utils';

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
    icon: <Star className="h-3.5 w-3.5" />
  },
  {
    type: 'long-weekends',
    title: 'Long Weekends',
    description: 'Multiple 3-4 day breaks throughout the year, typically extending weekends',
    icon: <Star className="h-3.5 w-3.5" />
  },
  {
    type: 'mini-breaks',
    title: 'Mini Breaks',
    description: 'Several 5-6 day breaks spread across the year',
    icon: <Star className="h-3.5 w-3.5" />
  },
  {
    type: 'week-long',
    title: 'Week-Long Breaks',
    description: '7-9 day getaways, ideal for proper vacations',
    icon: <Star className="h-3.5 w-3.5" />
  },
  {
    type: 'extended',
    title: 'Extended Vacations',
    description: '10-15 day breaks for deeper relaxation, fewer times per year',
    icon: <Star className="h-3.5 w-3.5" />
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {STRATEGIES.map((strategy) => {
          const isActive = currentStrategy === strategy.type;

          return (
            <button
              key={strategy.type}
              type="button"
              onClick={() => !isOptimizing && handleSelectStrategy(strategy.type)}
              className={cn(
                'rounded-3xl border border-border bg-card p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isActive ? 'border-primary-border bg-primary/10' : 'hover:bg-muted/60'
              )}
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'inline-flex h-6 w-6 items-center justify-center rounded-full border border-border text-muted-foreground',
                      isActive && 'border-primary bg-primary text-primary-foreground'
                    )}
                  >
                    {strategy.icon}
                  </div>
                  <h3 className="font-semibold text-sm text-foreground">{strategy.title}</h3>
                  {isActive && suggestedDays.length > 0 && (
                    <Badge className="ml-auto bg-primary text-primary-foreground">
                      {suggestedDays.length}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-snug">{strategy.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      {isOptimizing && (
        <div className="flex items-center gap-2 rounded-3xl border border-border bg-muted/70 px-3 py-2 text-xs text-muted-foreground">
          <BrainCircuit className="h-3.5 w-3.5 animate-spin text-primary" />
          Crunching calendar data…
        </div>
      )}
    </div>
  );
};

export default SuggestedPTOTab;
