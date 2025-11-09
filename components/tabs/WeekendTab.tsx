"use client";

import React, { useTransition } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { usePlanner } from '@/contexts/PlannerContext';
import { updateWeekendConfig } from '@/app/actions/weekend-actions';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' }
];

const WeekendTab: React.FC = () => {
  const { plannerData, setPlannerData, isAuthenticated, getWeekendDays, saveLocalWeekendConfig } = usePlanner();
  const [isPending, startTransition] = useTransition();

  // Get weekend days from context (works with localStorage or DB)
  const weekendDays = getWeekendDays();

  // Toggle a day in the weekend array
  const toggleDay = (day: number) => {
    const isCurrentlyWeekend = weekendDays.includes(day);
    const newIsWeekend = !isCurrentlyWeekend;

    // Calculate new weekend days array
    const newWeekendDays = newIsWeekend
      ? [...weekendDays, day]
      : weekendDays.filter((d) => d !== day);

    // If not authenticated, save to localStorage
    if (!isAuthenticated) {
      saveLocalWeekendConfig(newWeekendDays);
      return;
    }

    // If authenticated, optimistically update UI then persist to database
    if (plannerData) {
      const updatedConfig = plannerData.weekendConfig.map((config) =>
        config.day_of_week === day
          ? { ...config, is_weekend: newIsWeekend }
          : config
      );

      setPlannerData({
        ...plannerData,
        weekendConfig: updatedConfig,
      });
    }

    // Persist to database
    startTransition(async () => {
      const result = await updateWeekendConfig(day, newIsWeekend);

      if (!result.success) {
        console.error('Failed to update weekend config:', result.error);

        // Revert optimistic update on error
        if (plannerData) {
          const revertedConfig = plannerData.weekendConfig.map((config) =>
            config.day_of_week === day
              ? { ...config, is_weekend: isCurrentlyWeekend }
              : config
          );

          setPlannerData({
            ...plannerData,
            weekendConfig: revertedConfig,
          });
        }
      }
    });
  };

  return (
    <div className="space-y-3 text-[hsl(var(--ghibli-forest))]">
      <div className="rounded-3xl border border-[hsl(var(--border) / 0.7)] bg-[hsl(var(--card) / 0.8)] p-3 shadow-[0_30px_80px_-48px_rgba(38,73,70,0.55)] backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[hsl(var(--ghibli-forest))]">Weekend pattern</h3>
          {isPending && (
            <span className="rounded-full bg-[hsl(var(--primary) / 0.2)] px-2 py-0.5 text-[11px] text-[hsl(var(--primary) / 0.7)]">
              Saving…
            </span>
          )}
        </div>
        <p className="mt-1 text-[11px] text-[hsl(var(--ghibli-forest) / 0.55)]">
          Toggle the days counted as weekends to match your schedule.
        </p>

        <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {DAYS_OF_WEEK.map((day) => {
            const isWeekend = weekendDays.includes(day.value);
            return (
              <div
                key={day.value}
                onClick={() => toggleDay(day.value)}
                className={cn(
                  'flex items-center gap-2 rounded-2xl border px-2.5 py-1.5 text-left text-sm transition shadow-[0_16px_45px_-36px_rgba(42,84,74,0.5)]',
                  isWeekend
                    ? 'border-[hsl(var(--secondary))] bg-[hsl(var(--secondary) / 0.25)] text-[hsl(var(--secondary-foreground))]'
                    : 'border-[hsl(var(--border) / 0.7)] bg-[hsl(var(--card))] text-[hsl(var(--ghibli-forest) / 0.7)] hover:border-[hsl(var(--primary) / 0.35)] hover:bg-[hsl(var(--primary) / 0.08)] hover:text-[hsl(var(--ghibli-forest))]',
                  isPending ? 'pointer-events-none opacity-80' : 'cursor-pointer',
                )}
              >
                <Checkbox
                  id={`day-${day.value}`}
                  checked={isWeekend}
                  onCheckedChange={() => toggleDay(day.value)}
                  className="h-3.5 w-3.5 border-[hsl(var(--border) / 0.7)] data-[state=checked]:border-[hsl(var(--secondary))] data-[state=checked]:bg-[hsl(var(--secondary))]"
                  disabled={isPending}
                />
                <Label
                  htmlFor={`day-${day.value}`}
                  className={`cursor-pointer text-xs font-medium leading-none ${
                    isPending ? 'opacity-60' : ''
                  }`}
                >
                  {day.label}
                </Label>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-[11px] text-[hsl(var(--ghibli-forest) / 0.55)]">
        Weekend days are skipped automatically in the optimizer so your PTO stretches further.
      </p>
    </div>
  );
};

export default WeekendTab; 