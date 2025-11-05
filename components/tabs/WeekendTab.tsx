"use client";

import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface WeekendTabProps {
  weekendDays: number[];
  onWeekendChange: (days: number[]) => void;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' }
];

const WeekendTab: React.FC<WeekendTabProps> = ({ weekendDays, onWeekendChange }) => {
  // Toggle a day in the weekend array
  const toggleDay = (day: number) => {
    if (weekendDays.includes(day)) {
      onWeekendChange(weekendDays.filter(d => d !== day));
    } else {
      onWeekendChange([...weekendDays, day]);
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
              onCheckedChange={() => toggleDay(day.value)}
              className="data-[state=checked]:bg-purple-500"
            />
            <Label 
              htmlFor={`day-${day.value}`}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
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
      </div>
    </div>
  );
};

export default WeekendTab; 