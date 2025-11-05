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
    <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border border-gray-200 dark:border-gray-700 shadow-lg">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            PTO Balance
          </h3>
        </div>

        <div className="space-y-3">
          {/* Initial Balance */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">Initial Balance</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {initialBalance} {displayUnit}
            </span>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-gray-700"></div>

          {/* Days Selected */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
              <TrendingDown className="h-3 w-3" />
              Days Selected
            </span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {daysSelected} {displayUnit}
            </span>
          </div>

          {/* Suggested Days (if any) */}
          {hasSuggestions && (
            <div className="flex justify-between items-center bg-yellow-50 dark:bg-yellow-900/20 -mx-2 px-2 py-1 rounded">
              <span className="text-sm text-yellow-700 dark:text-yellow-300 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Suggested Days
              </span>
              <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                {suggestedCount} {displayUnit}
              </span>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-gray-700"></div>

          {/* Remaining Balance */}
          <div className="flex justify-between items-center pt-1">
            <span className="text-base font-semibold text-gray-900 dark:text-white">
              Remaining
            </span>
            <span className={`text-2xl font-bold ${getBalanceColor()}`}>
              {remainingBalance} {displayUnit}
            </span>
          </div>

          {/* Warning if overbooked */}
          {remainingBalance < 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded text-xs text-red-800 dark:text-red-300">
              ⚠️ You've selected more PTO than available
            </div>
          )}

          {/* Low balance warning */}
          {remainingBalance >= 0 && remainingBalance < initialBalance * 0.2 && (
            <div className="bg-orange-50 dark:bg-orange-900/20 p-2 rounded text-xs text-orange-800 dark:text-orange-300">
              💡 You're running low on PTO
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default PTOBalanceCard;
