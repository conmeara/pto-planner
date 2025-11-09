"use client";

import React from 'react';
import { Calendar, TrendingDown, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { usePlanner } from '@/contexts/PlannerContext';

/**
 * PTOBalanceCard Component
 *
 * Displays real-time PTO balance information including:
 * - Initial balance
 * - Days selected
 * - Remaining balance
 * - Suggested days (if any)
 */
const PTOBalanceCard: React.FC = () => {
  const { selectedDays, suggestedDays, getCurrentBalance, getSettings } = usePlanner();

  const initialBalance = getCurrentBalance();
  const settings = getSettings();

  // Calculate days selected
  const daysSelected = selectedDays.length;

  // Calculate remaining balance
  const remainingBalance = initialBalance - daysSelected;

  // Calculate efficiency if suggested days exist
  const hasSuggestions = suggestedDays.length > 0;
  const suggestedCount = suggestedDays.length;

  // Determine color based on balance
  const getBalanceColor = () => {
    if (remainingBalance < 0) return 'text-red-600 dark:text-red-400';
    if (remainingBalance < initialBalance * 0.2) return 'text-orange-600 dark:text-orange-400';
    return 'text-green-600 dark:text-green-400';
  };

  // Format display unit
  const displayUnit = settings.pto_display_unit === 'hours' ? 'hours' : 'days';

  return (
    <Card className="border border-gray-200/70 bg-white/85 shadow-sm backdrop-blur dark:border-gray-700/60 dark:bg-gray-900/70">
      <div className="p-3">
        <div className="mb-2 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            PTO Balance
          </h3>
        </div>

        <div className="space-y-2">
          {/* Initial Balance */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600 dark:text-gray-400">Initial Balance</span>
            <span className="text-xs font-medium text-gray-900 dark:text-white">
              {initialBalance} {displayUnit}
            </span>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-gray-700" />

          {/* Days Selected */}
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
              <TrendingDown className="h-3 w-3" />
              Days Selected
            </span>
            <span className="text-xs font-medium text-gray-900 dark:text-white">
              {daysSelected} {displayUnit}
            </span>
          </div>

          {/* Suggested Days (if any) */}
          {hasSuggestions && (
            <div className="-mx-1 flex items-center justify-between rounded bg-yellow-50 px-2 py-1 text-yellow-700 dark:bg-yellow-900/25 dark:text-yellow-300">
              <span className="flex items-center gap-1 text-xs">
                <TrendingUp className="h-3 w-3" />
                Suggested Days
              </span>
              <span className="text-xs font-medium text-yellow-800 dark:text-yellow-200">
                {suggestedCount} {displayUnit}
              </span>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-gray-700" />

          {/* Remaining Balance */}
          <div className="flex items-end justify-between pt-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Remaining
            </span>
            <span className={`text-lg font-bold ${getBalanceColor()}`}>
              {remainingBalance} {displayUnit}
            </span>
          </div>

          {/* Warning if overbooked */}
          {remainingBalance < 0 && (
            <div className="rounded bg-red-50 p-2 text-[11px] text-red-700 dark:bg-red-900/25 dark:text-red-300">
              ⚠️ You've selected more PTO than available
            </div>
          )}

          {/* Low balance warning */}
          {remainingBalance >= 0 && remainingBalance < initialBalance * 0.2 && (
            <div className="rounded bg-orange-50 p-2 text-[11px] text-orange-700 dark:bg-orange-900/25 dark:text-orange-300">
              💡 You're running low on PTO
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default PTOBalanceCard;
