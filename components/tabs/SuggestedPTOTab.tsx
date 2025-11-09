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
    selectedDays,
    lastOptimizationResult,
    getCurrentBalance,
    runOptimization,
    applySuggestions,
    clearSuggestions,
  } = usePlanner();

  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const initialPTO = getCurrentBalance();
  const usedPTO = selectedDays.length;
  const remainingPTO = Math.max(initialPTO - usedPTO, 0);

  // Handle strategy selection
  const handleSelectStrategy = async (strategyType: StrategyType) => {
    setIsOptimizing(true);

    try {
      runOptimization(strategyType);
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
    } finally {
      setIsApplying(false);
    }
  };

  // Handle clearing suggestions
  const handleClear = () => {
    clearSuggestions();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-slate-500 dark:text-slate-300">
          Pick a strategy to let the optimizer fill in high-impact breaks automatically.
        </p>
        <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          {remainingPTO} days free
        </Badge>
      </div>

      {remainingPTO <= 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:border-rose-900/60 dark:bg-rose-500/15 dark:text-rose-200">
          ⚠️ You're out of PTO days. Adjust your selections or settings to unlock new suggestions.
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        {STRATEGIES.map((strategy) => {
          const isActive = currentStrategy === strategy.type;
          return (
            <button
              key={strategy.type}
              type="button"
              onClick={() => !isOptimizing && handleSelectStrategy(strategy.type)}
              className={`relative flex h-full flex-col gap-1 rounded-lg border px-3 py-2.5 text-left transition-all ${
                isActive
                  ? 'border-amber-400 bg-amber-50 shadow-sm dark:border-amber-600 dark:bg-amber-500/15'
                  : 'border-slate-200 bg-white hover:border-amber-200 dark:border-slate-700 dark:bg-slate-900/60 dark:hover:border-amber-700'
              } ${isOptimizing ? 'cursor-wait opacity-90' : 'cursor-pointer'}`}
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full ${
                    isActive ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200'
                  }`}
                >
                  {strategy.icon}
                </span>
                {strategy.title}
              </div>
              <p className="text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                {strategy.description}
              </p>
              {isActive && suggestedDays.length > 0 && (
                <Badge className="w-fit border-amber-400 bg-amber-100 text-amber-700 dark:border-amber-600 dark:bg-amber-500/20 dark:text-amber-200">
                  {suggestedDays.length} days suggested
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      {isOptimizing && (
        <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:border-blue-900/60 dark:bg-blue-500/10 dark:text-blue-200">
          <BrainCircuit className="h-3.5 w-3.5 animate-spin" />
          Crunching calendar data…
        </div>
      )}

      {lastOptimizationResult && currentStrategy && suggestedDays.length > 0 && (
        <div className="grid gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-700 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-500/15 dark:text-emerald-200">
          <div className="flex items-center gap-2 font-semibold">
            <Sparkles className="h-3.5 w-3.5" />
            Optimization preview
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-emerald-500/80">Used</p>
              <p className="text-sm font-semibold">{lastOptimizationResult.totalPTOUsed}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-emerald-500/80">Days off</p>
              <p className="text-sm font-semibold">{lastOptimizationResult.totalDaysOff}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-emerald-500/80">Efficiency</p>
              <p className="text-sm font-semibold">{lastOptimizationResult.averageEfficiency.toFixed(2)}x</p>
            </div>
          </div>
        </div>
      )}

      {currentStrategy && suggestedDays.length > 0 && (
        <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white/90 p-2.5 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-300">
            <span>Suggestions highlight in yellow—apply once they look right.</span>
            <span className="font-medium text-slate-700 dark:text-slate-100">{suggestedDays.length} total days</span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              onClick={handleApply}
              className="flex-1 bg-amber-500 text-white hover:bg-amber-600"
              size="sm"
              disabled={isApplying}
            >
              {isApplying ? (
                <>
                  <BrainCircuit className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Applying…
                </>
              ) : (
                <>
                  <Check className="mr-2 h-3.5 w-3.5" />
                  Apply plan
                </>
              )}
            </Button>
            <Button
              onClick={handleClear}
              variant="outline"
              size="sm"
              className="flex-1 border-slate-300 dark:border-slate-600"
              disabled={isApplying}
            >
              Clear
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuggestedPTOTab;
