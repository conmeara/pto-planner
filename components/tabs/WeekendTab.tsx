"use client";

import React, { useTransition, useMemo, useEffect, useState } from 'react';
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
  const [showLocalSaveMessage, setShowLocalSaveMessage] = useState(false);

  // Get weekend days from context (works with localStorage or DB)
  // Use useMemo to ensure it updates when dependencies change
  const weekendDays = useMemo(() => {
    return getWeekendDays();
  }, [getWeekendDays]);

  // Auto-hide the local save message after 2 seconds
  useEffect(() => {
    if (showLocalSaveMessage) {
      const timer = setTimeout(() => {
        setShowLocalSaveMessage(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showLocalSaveMessage]);

  // Toggle a day in the weekend array
  const toggleDay = (day: number, newIsWeekend: boolean) => {
    // Calculate new weekend days array
    const newWeekendDays = newIsWeekend
      ? [...weekendDays, day].sort((a, b) => a - b)
      : weekendDays.filter((d) => d !== day);

    // If not authenticated, save to localStorage and update context state
    if (!isAuthenticated) {
      saveLocalWeekendConfig(newWeekendDays);
      // Show save confirmation
      setShowLocalSaveMessage(true);
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

      // Persist to database
      startTransition(async () => {
        const result = await updateWeekendConfig(day, newIsWeekend);

        if (!result.success) {
          console.error('Failed to update weekend config:', result.error);

          // Revert optimistic update on error
          const revertedConfig = plannerData.weekendConfig.map((config) =>
            config.day_of_week === day
              ? { ...config, is_weekend: !newIsWeekend }
              : config
          );

          setPlannerData({
            ...plannerData,
            weekendConfig: revertedConfig,
          });
        }
      });
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
        Select the days that should be considered weekends. These days will be highlighted
        in the calendar and excluded from PTO calculations.
      </p>

      <div className="grid grid-cols-1 gap-3">
        {DAYS_OF_WEEK.map((day) => (
          <div key={day.value} className="flex items-center space-x-2">
            <Checkbox
              id={`day-${day.value}`}
              checked={weekendDays.includes(day.value)}
              onCheckedChange={(checked) => {
                // Handle the checked state from Radix UI (boolean | 'indeterminate')
                const isChecked = checked === true;
                toggleDay(day.value, isChecked);
              }}
              className="data-[state=checked]:bg-purple-500"
              disabled={isPending}
            />
            <Label
              htmlFor={`day-${day.value}`}
              className={`text-sm font-medium leading-none ${
                isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              }`}
            >
              {day.label}
            </Label>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Most countries consider Saturday and Sunday as weekends, but this can vary around the world.
        </p>
        {isPending && (
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
            Saving changes to database...
          </p>
        )}
        {!isAuthenticated && showLocalSaveMessage && (
          <p className="text-xs text-green-600 dark:text-green-400 mt-2">
            Changes saved locally
          </p>
        )}
      </div>
    </div>
  );
};

export default WeekendTab; 