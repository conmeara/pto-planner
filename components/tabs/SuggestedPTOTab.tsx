"use client";

import React, { useState, useEffect } from 'react';
import { BrainCircuit, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
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
      <div className="space-y-3">
        {STRATEGIES.map((strategy) => {
          const isActive = currentStrategy === strategy.type;

          return (
            <div
              key={strategy.type}
              className={cn(
                'group cursor-pointer rounded-2xl border px-4 py-3 transition-all duration-200',
                isActive
                  ? 'border-[hsl(var(--accent))] bg-[hsl(var(--accent) / 0.22)] shadow-[0_18px_40px_-28px_rgba(189,169,90,0.65)] ring-2 ring-[hsl(var(--accent) / 0.45)]'
                  : 'border-[hsl(var(--border) / 0.75)] bg-[hsl(var(--card) / 0.78)] shadow-[0_12px_30px_-24px_rgba(60,98,86,0.35)] hover:border-[hsl(var(--accent) / 0.4)] hover:shadow-[0_16px_40px_-30px_rgba(60,98,86,0.45)]',
              )}
              onClick={() => !isOptimizing && handleSelectStrategy(strategy.type)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full text-[hsl(var(--accent-foreground))] shadow-[0_8px_18px_-12px_rgba(189,169,90,0.45)] transition-colors duration-200',
                      isActive
                        ? 'bg-[hsl(var(--accent))]'
                        : 'bg-[hsl(var(--accent) / 0.25)] group-hover:bg-[hsl(var(--accent) / 0.35)]',
                    )}
                  >
                    {strategy.icon}
                  </div>
                  <div>
                    <h3 className="font-medium text-[hsl(var(--ghibli-forest))]">
                      {strategy.title}
                    </h3>
                    <p className="text-sm text-[hsl(var(--ghibli-forest) / 0.65)]">
                      {strategy.description}
                    </p>
                  </div>
                </div>
                {isActive && suggestedDays.length > 0 && (
                  <Badge className="bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] shadow-[0_10px_24px_-16px_rgba(80,130,110,0.45)]">
                    {suggestedDays.length} suggested
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {isOptimizing && (
        <div className="flex items-center gap-2 rounded-2xl border border-[hsl(var(--primary) / 0.35)] bg-[hsl(var(--primary) / 0.14)] px-3 py-2 text-xs text-[hsl(var(--primary) / 0.7)] shadow-[0_12px_30px_-24px_rgba(70,110,125,0.35)]">
          <BrainCircuit className="h-3.5 w-3.5 animate-spin" />
          Crunching calendar data…
        </div>
      )}
    </div>
  );
};

export default SuggestedPTOTab;
