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
    if (remainingBalance < 0) return 'text-[hsl(var(--destructive))]';
    if (remainingBalance < initialBalance * 0.2) return 'text-[hsl(var(--accent-foreground))]';
    return 'text-[hsl(var(--secondary-foreground))]';
  };

  // Format display unit
  const displayUnit = settings.pto_display_unit === 'hours' ? 'hours' : 'days';

  return (
    <Card className="rounded-3xl border border-[hsl(var(--border) / 0.65)] bg-[hsl(var(--card) / 0.82)] shadow-[0_28px_75px_-44px_rgba(42,84,74,0.55)] backdrop-blur-md">
      <div className="p-3">
        <div className="mb-2 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-[hsl(var(--primary) / 0.8)]" />
          <h3 className="text-sm font-semibold text-[hsl(var(--ghibli-forest))]">
            PTO Balance
          </h3>
        </div>

        <div className="space-y-2">
          {/* Initial Balance */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-[hsl(var(--ghibli-forest) / 0.6)]">Initial Balance</span>
            <span className="text-xs font-medium text-[hsl(var(--foreground))]">
              {initialBalance} {displayUnit}
            </span>
          </div>

          {/* Divider */}
          <div className="border-t border-[hsl(var(--border) / 0.7)]" />

          {/* Days Selected */}
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-xs text-[hsl(var(--ghibli-forest) / 0.6)]">
              <TrendingDown className="h-3 w-3" />
              Days Selected
            </span>
            <span className="text-xs font-medium text-[hsl(var(--foreground))]">
              {daysSelected} {displayUnit}
            </span>
          </div>

          {/* Suggested Days (if any) */}
          {hasSuggestions && (
            <div className="-mx-1 flex items-center justify-between rounded-xl bg-[hsl(var(--accent) / 0.24)] px-2 py-1 text-[hsl(var(--accent-foreground))] shadow-[0_12px_28px_-20px_rgba(189,169,90,0.4)]">
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
          <div className="border-t border-[hsl(var(--border) / 0.7)]" />

          {/* Remaining Balance */}
          <div className="flex items-end justify-between pt-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-[hsl(var(--ghibli-forest) / 0.5)]">
              Remaining
            </span>
            <span className={`text-lg font-bold ${getBalanceColor()}`}>
              {remainingBalance} {displayUnit}
            </span>
          </div>

          {/* Warning if overbooked */}
          {remainingBalance < 0 && (
            <div className="rounded-xl bg-[hsl(var(--destructive) / 0.18)] p-2 text-[11px] text-[hsl(var(--destructive))] shadow-[0_10px_30px_-24px_rgba(211,109,94,0.6)]">
              ⚠️ You've selected more PTO than available
            </div>
          )}

          {/* Low balance warning */}
          {remainingBalance >= 0 && remainingBalance < initialBalance * 0.2 && (
            <div className="rounded-xl bg-[hsl(var(--accent) / 0.22)] p-2 text-[11px] text-[hsl(var(--accent-foreground))] shadow-[0_10px_30px_-24px_rgba(189,169,90,0.45)]">
              💡 You're running low on PTO
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default PTOBalanceCard;
