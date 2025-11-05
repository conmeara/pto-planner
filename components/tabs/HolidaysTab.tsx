"use client";

import React, { useState, useTransition } from 'react';
import { Globe, RefreshCw, CheckCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
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
  const { plannerData, setPlannerData, isAuthenticated, getHolidays, saveLocalHolidays } = usePlanner();
  const [isPending, startTransition] = useTransition();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Get current holidays
  const holidays = getHolidays();

  // Get selected country from localStorage or default to US
  const [selectedCountry, setSelectedCountry] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('pto_planner_country') || 'US';
    }
    return 'US';
  });

  // Save country selection to localStorage
  const handleCountryChange = (countryCode: string) => {
    setSelectedCountry(countryCode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('pto_planner_country', countryCode);
    }
  };

  // Fetch holidays from API and save
  const handleRefreshHolidays = async () => {
    setIsRefreshing(true);
    setError(null);
    setSuccess(null);

    try {
      const currentYear = new Date().getFullYear();

      // Fetch from our API route
      const response = await fetch(`/api/holidays?country=${selectedCountry}&year=${currentYear}`);

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
        setSuccess(`Successfully loaded ${fetchedHolidays.length} holidays for ${selectedCountry}`);
        setTimeout(() => setSuccess(null), 5000);
        setIsRefreshing(false);
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

          setSuccess(`Successfully loaded ${fetchedHolidays.length} holidays for ${selectedCountry}`);
          setTimeout(() => setSuccess(null), 5000);
        } catch (err) {
          console.error('Error saving holidays:', err);
          setError('Failed to save holidays. Please try again.');
        } finally {
          setIsRefreshing(false);
        }
      });
    } catch (err) {
      console.error('Error fetching holidays:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch holidays');
      setIsRefreshing(false);
    }
  };

  // Get last updated date
  const getLastUpdated = () => {
    if (holidays.length === 0) {
      return 'Never';
    }
    // For now, just show today's date. In a real app, we'd store the last update timestamp
    return new Date().toLocaleDateString();
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
        Load public holidays for your country. These will be highlighted on the calendar
        and excluded from PTO day calculations.
      </p>

      {/* Country Selection */}
      <div className="space-y-2">
        <Label htmlFor="country" className="text-sm font-medium">Country</Label>
        <div className="relative">
          <Globe className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
          <select
            id="country"
            value={selectedCountry}
            onChange={(e) => handleCountryChange(e.target.value)}
            className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md pl-8 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isRefreshing || isPending}
          >
            {COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Current Status */}
      {holidays.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md text-sm">
          <p className="text-blue-800 dark:text-blue-300">
            📅 <strong>{holidays.length} holidays</strong> loaded
          </p>
        </div>
      )}

      {/* Refresh Holidays Button */}
      <div className="pt-2">
        <Button
          onClick={handleRefreshHolidays}
          variant="outline"
          className="w-full border-blue-300 dark:border-blue-600"
          disabled={isRefreshing || isPending}
        >
          {isRefreshing || isPending ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Loading holidays...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              {holidays.length > 0 ? 'Refresh Holidays' : 'Load Holidays'}
            </>
          )}
        </Button>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
          Last updated: {getLastUpdated()}
        </p>
      </div>

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-md text-sm">
          <p className="text-green-800 dark:text-green-300 flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            {success}
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-md text-sm">
          <p className="text-red-800 dark:text-red-300">
            ✗ {error}
          </p>
        </div>
      )}

      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Public holidays are fetched from a global database. Click "Load Holidays" to import
          holidays for {new Date().getFullYear()}.
        </p>
      </div>
    </div>
  );
};

export default HolidaysTab;
