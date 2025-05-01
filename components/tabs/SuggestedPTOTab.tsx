"use client";

import React, { useState } from 'react';
import { BrainCircuit, Check, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
    daysUsed: '15-20',
    icon: <Star className="h-4 w-4" />
  },
  {
    type: StrategyType.LONG_WEEKENDS,
    title: 'Long Weekends',
    description: 'Multiple 3-4 day breaks throughout the year, typically extending weekends',
    daysUsed: '12-15',
    icon: <Star className="h-4 w-4" />
  },
  {
    type: StrategyType.MINI_BREAKS,
    title: 'Mini Breaks',
    description: 'Several 5-6 day breaks spread across the year',
    daysUsed: '15-18',
    icon: <Star className="h-4 w-4" />
  },
  {
    type: StrategyType.WEEK_LONG,
    title: 'Week-Long Breaks',
    description: '7-9 day getaways, ideal for proper vacations',
    daysUsed: '14-21',
    icon: <Star className="h-4 w-4" />
  },
  {
    type: StrategyType.EXTENDED,
    title: 'Extended Vacations',
    description: '10-15 day breaks for deeper relaxation, fewer times per year',
    daysUsed: '20-30',
    icon: <Star className="h-4 w-4" />
  }
];

interface SuggestedPTOTabProps {
  availablePTO: number;
  onSelectStrategy: (strategyType: StrategyType) => void;
  onApplySuggestions: () => void;
  currentStrategy?: StrategyType;
}

const SuggestedPTOTab: React.FC<SuggestedPTOTabProps> = ({
  availablePTO,
  onSelectStrategy,
  onApplySuggestions,
  currentStrategy
}) => {
  const [isApplying, setIsApplying] = useState(false);
  
  const handleApply = async () => {
    if (!currentStrategy) return;
    
    setIsApplying(true);
    try {
      await onApplySuggestions();
    } finally {
      setIsApplying(false);
    }
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
      
      <div className="space-y-3">
        {STRATEGIES.map((strategy) => (
          <div 
            key={strategy.type}
            className={`p-3 rounded-lg cursor-pointer transition-all border ${
              currentStrategy === strategy.type
                ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-amber-200 dark:hover:border-amber-800'
            }`}
            onClick={() => onSelectStrategy(strategy.type)}
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <div className={`p-1 rounded ${
                  currentStrategy === strategy.type 
                    ? 'bg-amber-500 text-white' 
                    : 'bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-300'
                }`}>
                  {strategy.icon}
                </div>
                <h3 className="text-sm font-semibold">{strategy.title}</h3>
              </div>
              <Badge className="bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800">
                {strategy.daysUsed} days
              </Badge>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 ml-7">
              {strategy.description}
            </p>
          </div>
        ))}
      </div>
      
      {currentStrategy && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
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
                Apply strategy
              </>
            )}
          </Button>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
            This will suggest optimal PTO days based on your selection.
            You can review and adjust as needed.
          </p>
        </div>
      )}
    </div>
  );
};

export default SuggestedPTOTab; 