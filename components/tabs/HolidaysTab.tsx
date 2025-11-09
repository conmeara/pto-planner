"use client";

import React, { useState, useTransition, useEffect } from 'react';
import { Globe, Plus, Trash2, Calendar, Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePlanner } from '@/contexts/PlannerContext';
import { batchAddHolidays, clearHolidaysForYear } from '@/app/actions/holiday-actions';
import type { CustomHoliday } from '@/types';

// Expanded country list (supports Nager.Date API)
const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'JP', name: 'Japan' },
  { code: 'CN', name: 'China' },
  { code: 'BR', name: 'Brazil' },
  { code: 'IN', name: 'India' },
  { code: 'MX', name: 'Mexico' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' },
  { code: 'FI', name: 'Finland' },
  { code: 'PL', name: 'Poland' },
  { code: 'IE', name: 'Ireland' },
];

const HolidaysTab: React.FC = () => {
  const {
    plannerData,
    setPlannerData,
    isAuthenticated,
    getHolidays,
    saveLocalHolidays,
    removeHoliday,
    addHoliday
  } = usePlanner();
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add custom holiday form state
  const [newHolidayName, setNewHolidayName] = useState('');
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [isAddingHoliday, setIsAddingHoliday] = useState(false);

  // Get current holidays
  const holidays = getHolidays();

  // Sort holidays by date
  const sortedHolidays = [...holidays].sort((a, b) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  // Get selected country from localStorage or default to US
  const [selectedCountry, setSelectedCountry] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('pto_planner_country') || 'US';
    }
    return 'US';
  });

  // Fetch holidays from API and save
  const fetchAndSaveHolidays = async (countryCode: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const currentYear = new Date().getFullYear();

      // Fetch from our API route
      const response = await fetch(`/api/holidays?country=${countryCode}&year=${currentYear}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch holidays');
      }

      const result = await response.json();

      if (!result.success || !result.data) {
        throw new Error('Invalid response from holidays API');
      }

      const fetchedHolidays: CustomHoliday[] = result.data;

      // If not authenticated, save to localStorage
      if (!isAuthenticated) {
        saveLocalHolidays(fetchedHolidays);
        setIsLoading(false);
        return;
      }

      // If authenticated, save to database
      startTransition(async () => {
        try {
          // First, clear existing holidays for this year
          const clearResult = await clearHolidaysForYear(currentYear);
          if (!clearResult.success) {
            console.error('Failed to clear holidays:', clearResult.error);
          }

          // Then add new holidays
          const addResult = await batchAddHolidays(fetchedHolidays);

          if (!addResult.success) {
            setError(addResult.error);
            return;
          }

          // Update context with new holidays
          if (plannerData) {
            setPlannerData({
              ...plannerData,
              holidays: addResult.data,
            });
          }
        } catch (err) {
          console.error('Error saving holidays:', err);
          setError('Failed to save holidays. Please try again.');
        } finally {
          setIsLoading(false);
        }
      });
    } catch (err) {
      console.error('Error fetching holidays:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch holidays');
      setIsLoading(false);
    }
  };

  // Auto-fetch holidays when country changes
  useEffect(() => {
    fetchAndSaveHolidays(selectedCountry);
  }, [selectedCountry]);

  // Save country selection to localStorage and fetch holidays
  const handleCountryChange = (countryCode: string) => {
    setSelectedCountry(countryCode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('pto_planner_country', countryCode);
    }
  };

  // Handle holiday deletion
  const handleDeleteHoliday = async (holiday: CustomHoliday) => {
    const result = await removeHoliday({
      id: holiday.id,
      date: holiday.date,
      name: holiday.name
    });

    if (!result.success) {
      setError(result.error || 'Failed to delete holiday');
      setTimeout(() => setError(null), 3000);
    }
  };

  // Handle adding custom holiday
  const handleAddCustomHoliday = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newHolidayName.trim() || !newHolidayDate) {
      setError('Please enter both name and date');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setIsAddingHoliday(true);
    setError(null);

    const result = await addHoliday({
      name: newHolidayName.trim(),
      date: newHolidayDate,
      repeatsYearly: false,
      isPaidHoliday: true
    });

    setIsAddingHoliday(false);

    if (result.success) {
      setNewHolidayName('');
      setNewHolidayDate('');
    } else {
      setError(result.error || 'Failed to add holiday');
      setTimeout(() => setError(null), 3000);
    }
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Select your country to load public holidays. Add custom holidays as needed.
        </p>
      </div>

      {/* Country Selection */}
      <div className="space-y-2">
        <Label htmlFor="country" className="text-sm font-medium flex items-center gap-2">
          <Globe className="h-4 w-4" />
          Country
        </Label>
        <select
          id="country"
          value={selectedCountry}
          onChange={(e) => handleCountryChange(e.target.value)}
          className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          disabled={isLoading || isPending}
        >
          {COUNTRIES.map((country) => (
            <option key={country.code} value={country.code}>
              {country.name}
            </option>
          ))}
        </select>
        {isLoading && (
          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mt-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Loading holidays...
          </p>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 rounded-md text-sm">
          <p className="text-red-800 dark:text-red-300">
            {error}
          </p>
        </div>
      )}

      {/* Holidays List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">
            Holidays ({sortedHolidays.length})
          </Label>
        </div>

        {sortedHolidays.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
            <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No holidays loaded</p>
            <p className="text-xs mt-1">Select a country to load holidays</p>
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md">
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {sortedHolidays.map((holiday) => (
                <div
                  key={holiday.id}
                  className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {holiday.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(holiday.date)}
                    </p>
                  </div>
                  <Button
                    onClick={() => handleDeleteHoliday(holiday)}
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Custom Holiday */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <Label className="text-sm font-medium mb-3 block">Add Custom Holiday</Label>
        <form onSubmit={handleAddCustomHoliday} className="space-y-3">
          <div className="space-y-2">
            <Input
              type="text"
              placeholder="Holiday name"
              value={newHolidayName}
              onChange={(e) => setNewHolidayName(e.target.value)}
              className="w-full"
              disabled={isAddingHoliday}
            />
            <Input
              type="date"
              value={newHolidayDate}
              onChange={(e) => setNewHolidayDate(e.target.value)}
              className="w-full"
              disabled={isAddingHoliday}
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={isAddingHoliday || !newHolidayName.trim() || !newHolidayDate}
          >
            {isAddingHoliday ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Add Holiday
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default HolidaysTab;
