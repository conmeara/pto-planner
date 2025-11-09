"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Globe, RefreshCw, CheckCircle, Trash2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { usePlanner } from '@/contexts/PlannerContext';
import { Badge } from '@/components/ui/badge';
import { parseDateLocal } from '@/lib/date-utils';
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
    getHolidays,
    refreshHolidays,
    removeHoliday,
    countryCode,
    setCountryCode,
    isLoadingHolidays,
    addHoliday,
  } = usePlanner();
  const [selectedCountry, setSelectedCountry] = useState<string>(countryCode || 'US');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [customHolidayName, setCustomHolidayName] = useState('');
  const [customHolidayDate, setCustomHolidayDate] = useState('');
  const [customHolidayRepeats, setCustomHolidayRepeats] = useState(true);
  const [isAddingHoliday, setIsAddingHoliday] = useState(false);

  const holidays = getHolidays();

  useEffect(() => {
    setSelectedCountry(countryCode || 'US');
  }, [countryCode]);

  useEffect(() => {
    if (holidays.length > 0 && !lastUpdated) {
      setLastUpdated('Auto loaded');
    }
  }, [holidays.length, lastUpdated]);

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timer = window.setTimeout(() => setSuccessMessage(null), 5000);
    return () => window.clearTimeout(timer);
  }, [successMessage]);

  const sortedHolidays = useMemo(() => {
    return [...holidays].sort((a, b) => a.date.localeCompare(b.date));
  }, [holidays]);

  const availableCountries = useMemo(() => {
    if (!selectedCountry) return COUNTRIES;
    const exists = COUNTRIES.some((country) => country.code === selectedCountry);
    if (exists) return COUNTRIES;
    return [
      ...COUNTRIES,
      { code: selectedCountry, name: `Detected (${selectedCountry})` },
    ];
  }, [selectedCountry]);

  const handleCountryChange = (code: string) => {
    setSelectedCountry(code);
    setCountryCode(code);
  };

  const formatHolidayDate = (dateStr: string, repeatsYearly: boolean) => {
    const date = parseDateLocal(dateStr);
    return date.toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric',
      ...(repeatsYearly ? {} : { year: 'numeric' }),
    });
  };

  const handleRefreshHolidays = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const result = await refreshHolidays(selectedCountry, {
      replaceExisting: true,
      persistCountry: true,
    });

    if (!result.success) {
      setErrorMessage(result.error || 'Failed to refresh holidays. Please try again.');
      return;
    }

    const count = result.holidays?.length ?? 0;
    setSuccessMessage(`Loaded ${count} holidays for ${result.countryCode}`);
    setLastUpdated(new Date().toLocaleString());
  };

  const handleRemoveHoliday = async (holiday: CustomHoliday) => {
    setErrorMessage(null);
    const identifier = holiday.id ?? `${holiday.date}-${holiday.name}`;
    setRemovingId(identifier);

    const result = await removeHoliday({
      id: identifier,
      name: holiday.name,
      date: holiday.date,
    });

    setRemovingId(null);

    if (!result.success) {
      setErrorMessage(result.error || 'Unable to remove that holiday.');
      return;
    }

    setSuccessMessage(`Removed ${holiday.name}`);
    setLastUpdated(new Date().toLocaleString());
  };

  const handleAddHoliday = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = customHolidayName.trim();

    if (!trimmedName) {
      setErrorMessage('Holiday name is required.');
      return;
    }

    if (!customHolidayDate) {
      setErrorMessage('Holiday date is required.');
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsAddingHoliday(true);

    const result = await addHoliday({
      name: trimmedName,
      date: customHolidayDate,
      repeatsYearly: customHolidayRepeats,
    });

    setIsAddingHoliday(false);

    if (!result.success) {
      setErrorMessage(result.error || 'Unable to add that holiday.');
      return;
    }

    setSuccessMessage(`Added ${trimmedName}`);
    setLastUpdated(new Date().toLocaleString());
    setCustomHolidayName('');
    setCustomHolidayDate('');
    setCustomHolidayRepeats(true);
  };

  const isRefreshing = isLoadingHolidays;
  const lastUpdatedLabel = lastUpdated ?? (holidays.length > 0 ? 'Auto loaded' : 'Not yet loaded');

  return (
    <div className="space-y-3 text-slate-800 dark:text-slate-100">

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr),auto] md:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="country" className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-300">
            Country
          </Label>
          <div className="relative">
            <Globe className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-300" />
            <select
              id="country"
              value={selectedCountry}
              onChange={(event) => handleCountryChange(event.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-800 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-emerald-400"
              disabled={isRefreshing}
            >
              {availableCountries.map((country) => (
                <option key={country.code} value={country.code} className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">
                  {country.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1 md:items-end">
          <Button
            onClick={handleRefreshHolidays}
            variant="outline"
            className="w-full border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800 md:w-auto"
            disabled={isRefreshing}
          >
            {isRefreshing ? (
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
          <p className="text-[11px] text-slate-500 dark:text-slate-400 md:text-right">
            Last updated: {lastUpdatedLabel}
          </p>
        </div>
      </div>

      {successMessage && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-700 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-500/10 dark:text-emerald-300">
          <p className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            {successMessage}
          </p>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs text-rose-600 shadow-sm dark:border-rose-900/60 dark:bg-rose-500/10 dark:text-rose-300">
          {errorMessage}
        </div>
      )}

      <form
        onSubmit={handleAddHoliday}
        className="space-y-2.5 rounded-xl border border-slate-200 bg-slate-50/80 p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/40"
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Add custom holiday</p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="custom-holiday-name" className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Holiday name
            </Label>
            <Input
              id="custom-holiday-name"
              value={customHolidayName}
              onChange={(event) => setCustomHolidayName(event.target.value)}
              placeholder="Company Founders Day"
              className="!h-8 px-2 py-1 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="custom-holiday-date" className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Date
            </Label>
            <Input
              id="custom-holiday-date"
              type="date"
              value={customHolidayDate}
              onChange={(event) => setCustomHolidayDate(event.target.value)}
              className="!h-8 px-2 py-1 text-xs"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="custom-holiday-repeats"
            checked={customHolidayRepeats}
            onCheckedChange={(checked) => setCustomHolidayRepeats(checked === true)}
            className="border-slate-300 data-[state=checked]:border-emerald-500 data-[state=checked]:bg-emerald-500 dark:border-slate-600"
          />
          <Label htmlFor="custom-holiday-repeats" className="text-xs text-slate-600 dark:text-slate-300">
            Repeats every year
          </Label>
        </div>
        <div className="flex justify-end">
          <Button
            type="submit"
            size="sm"
            disabled={
              isAddingHoliday || !customHolidayName.trim() || !customHolidayDate
            }
            className="bg-emerald-500 text-white hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500"
          >
            {isAddingHoliday ? 'Adding…' : 'Add holiday'}
          </Button>
        </div>
      </form>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-300">
          <span>{holidays.length} holidays loaded</span>
          <span>{selectedCountry}</span>
        </div>

        <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
          {sortedHolidays.length === 0 ? (
            <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-xs text-slate-500 dark:border-slate-600 dark:bg-slate-900/30 dark:text-slate-300">
              Holidays will appear here as soon as we finish loading them for your country.
            </div>
          ) : (
            sortedHolidays.map((holiday) => {
              const key = holiday.id ?? `${holiday.date}-${holiday.name}`;
              const isRemoving = removingId === key;

              return (
                <div
                  key={key}
                  className="flex items-start justify-between rounded-lg border border-slate-200 bg-white px-3 py-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-900/60"
                >
                  <div className="space-y-1">
                    <p className="text-[13px] font-medium text-slate-800 dark:text-slate-100">{holiday.name}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-300">
                      {formatHolidayDate(holiday.date, holiday.repeats_yearly)}
                    </p>
                    <div className="flex gap-2">
                      <Badge
                        variant="outline"
                        className="border-emerald-200 bg-emerald-50 text-[11px] text-emerald-700 dark:border-emerald-500/60 dark:bg-emerald-500/10 dark:text-emerald-300"
                      >
                        {holiday.repeats_yearly ? 'Repeats yearly' : 'One-time'}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveHoliday(holiday)}
                    disabled={isRemoving || isRefreshing}
                    className="h-7 w-7 rounded-full text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:text-rose-300 dark:hover:bg-rose-500/15 dark:hover:text-rose-200"
                  >
                    <Trash2 className={`h-3.5 w-3.5 ${isRemoving ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </div>

      <p className="text-[11px] text-slate-500 dark:text-slate-400">
        Holidays are sourced from the Nager.Date public dataset. Refreshing will replace the current list for {new Date().getFullYear()}.
      </p>
    </div>
  );
};

export default HolidaysTab;
