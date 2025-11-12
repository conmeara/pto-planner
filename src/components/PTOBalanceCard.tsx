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
    if (remainingBalance < 0) return 'text-destructive';
    if (remainingBalance < initialBalance * 0.2) return 'text-suggested-foreground';
    return 'text-primary';
  };

  // Format display unit
  const displayUnit = settings.pto_display_unit === 'hours' ? 'hours' : 'days';

  return (
    <Card className="border border-border bg-card/85 shadow-sm backdrop-blur">
      <div className="p-3">
        <div className="mb-2 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">
            PTO Balance
          </h3>
        </div>

        <div className="space-y-2">
          {/* Initial Balance */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Initial Balance</span>
            <span className="text-xs font-medium text-foreground">
              {initialBalance} {displayUnit}
            </span>
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Days Selected */}
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingDown className="h-3 w-3" />
              Days Selected
            </span>
            <span className="text-xs font-medium text-foreground">
              {daysSelected} {displayUnit}
            </span>
          </div>

          {/* Suggested Days (if any) */}
          {hasSuggestions && (
            <div className="-mx-1 flex items-center justify-between rounded bg-suggested px-2 py-1 text-suggested-foreground">
              <span className="flex items-center gap-1 text-xs">
                <TrendingUp className="h-3 w-3" />
                Suggested Days
              </span>
              <span className="text-xs font-medium">
                {suggestedCount} {displayUnit}
              </span>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Remaining Balance */}
          <div className="flex items-end justify-between pt-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Remaining
            </span>
            <span className={`text-lg font-bold ${getBalanceColor()}`}>
              {remainingBalance} {displayUnit}
            </span>
          </div>

          {/* Warning if overbooked */}
          {remainingBalance < 0 && (
            <div className="rounded bg-destructive/10 p-2 text-[11px] text-destructive">
              ⚠️ You've selected more PTO than available
            </div>
          )}

          {/* Low balance warning */}
          {remainingBalance >= 0 && remainingBalance < initialBalance * 0.2 && (
            <div className="rounded bg-suggested/20 p-2 text-[11px] text-suggested-foreground">
              💡 You're running low on PTO
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default PTOBalanceCard;
