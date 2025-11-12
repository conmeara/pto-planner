"use client";

import React, { useTransition } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { usePlanner } from '@/contexts/PlannerContext';
import { updateWeekendConfig } from '@/app/actions/weekend-actions';
import { cn } from '@/lib/utils';

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
    <div className="flex flex-wrap items-center gap-2">
      {DAYS_OF_WEEK.map((day) => {
        const isWeekendDay = weekendDays.includes(day.value);

        return (
          <div
            key={day.value}
            role="button"
            tabIndex={0}
            aria-pressed={isWeekendDay}
            onClick={() => toggleDay(day.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                toggleDay(day.value);
              }
            }}
            className={cn(
              'flex items-center gap-2 rounded-2xl border-2 px-3 py-1.5 text-xs font-semibold shadow-xs transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isWeekendDay
                ? 'border-primary-border bg-primary/15 text-foreground'
                : 'border-border bg-card text-muted-foreground hover:bg-muted/80 hover:text-foreground',
              isPending ? 'pointer-events-none opacity-70' : 'cursor-pointer'
            )}
          >
            <Checkbox
              id={`day-${day.value}`}
              checked={isWeekendDay}
              onCheckedChange={() => toggleDay(day.value)}
              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary-border h-4 w-4"
              disabled={isPending}
            />
            <Label
              htmlFor={`day-${day.value}`}
              className={cn(
                'cursor-pointer text-xs font-semibold tracking-wide',
                isWeekendDay ? 'text-foreground' : 'text-muted-foreground',
                isPending && 'opacity-70'
              )}
            >
              {day.label}
            </Label>
          </div>
        );
      })}
      {isPending && (
        <span className="text-[11px] text-muted-foreground">Saving…</span>
      )}
    </div>
  );
};

export default WeekendTab; 
