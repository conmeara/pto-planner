"use client";

import React, { useTransition } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
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
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-200 bg-white/90 p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Weekend pattern</h3>
          {isPending && (
            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[11px] text-purple-600 dark:bg-purple-500/20 dark:text-purple-300">
              Saving…
            </span>
          )}
        </div>
        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-300">
          Toggle the days counted as weekends to match your schedule.
        </p>

        <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {DAYS_OF_WEEK.map((day) => (
            <div
              key={day.value}
              onClick={() => toggleDay(day.value)}
              className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-sm transition ${
                weekendDays.includes(day.value)
                  ? 'border-purple-400 bg-purple-50 text-purple-700 dark:border-purple-600 dark:bg-purple-500/20 dark:text-purple-200'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-purple-300 hover:text-purple-600 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:border-purple-600'
              } ${isPending ? 'pointer-events-none opacity-80' : 'cursor-pointer'}`}
            >
              <Checkbox
                id={`day-${day.value}`}
                checked={weekendDays.includes(day.value)}
                onCheckedChange={() => toggleDay(day.value)}
                className="h-3.5 w-3.5 data-[state=checked]:bg-purple-500"
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
          ))}
        </div>
      </div>

      <p className="text-[11px] text-slate-500 dark:text-slate-400">
        Weekend days are skipped automatically in the optimizer so your PTO stretches further.
      </p>
    </div>
  );
};

export default WeekendTab; 