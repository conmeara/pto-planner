"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Globe, CheckCircle, Trash2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { usePlanner } from '@/contexts/PlannerContext';
import { parseDateLocal } from '@/lib/date-utils';
import type { CustomHoliday } from '@/types';
import { cn } from '@/lib/utils';

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

  const handleCountryChange = async (code: string) => {
    setSelectedCountry(code);
    setCountryCode(code);
    setErrorMessage(null);
    setSuccessMessage(null);

    // Auto-load holidays for the new country
    const result = await refreshHolidays(code, {
      replaceExisting: true,
      persistCountry: true,
    });

    if (!result.success) {
      setErrorMessage(result.error || 'Failed to load holidays. Please try again.');
      return;
    }

    const count = result.holidays?.length ?? 0;
    setSuccessMessage(`Loaded ${count} holidays for ${result.countryCode}`);
  };

  const formatHolidayDate = (dateStr: string, repeatsYearly: boolean) => {
    const date = parseDateLocal(dateStr);
    return date.toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric',
      ...(repeatsYearly ? {} : { year: 'numeric' }),
    });
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
    setCustomHolidayName('');
    setCustomHolidayDate('');
    setCustomHolidayRepeats(true);
  };

  return (
    <div className="space-y-4 text-sm text-foreground">

      <div className="grid gap-3 lg:grid-cols-2">
        {/* Country Selection */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="country" className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Country
            </Label>
            {isLoadingHolidays && (
              <span className="text-[11px] text-muted-foreground">Loading holidays...</span>
            )}
          </div>
          <div className="relative">
            <Globe className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <select
              id="country"
              value={selectedCountry}
              onChange={(event) => handleCountryChange(event.target.value)}
              className="w-full rounded-2xl border border-border bg-card py-2 pl-8 pr-3 text-xs text-foreground transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isLoadingHolidays}
            >
              {availableCountries.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Add Custom Holiday Form */}
        <form
          onSubmit={handleAddHoliday}
          className="space-y-2 rounded-3xl border border-border bg-card px-4 py-3"
        >
          <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Add Custom Holiday
          </Label>
          <div className="flex gap-2">
            <Input
              id="custom-holiday-name"
              value={customHolidayName}
              onChange={(event) => setCustomHolidayName(event.target.value)}
              placeholder="Holiday name"
              className="!h-8 flex-1 px-2 py-1 text-xs"
            />
            <Input
              id="custom-holiday-date"
              type="date"
              value={customHolidayDate}
              onChange={(event) => setCustomHolidayDate(event.target.value)}
              className="!h-8 w-32 px-2 py-1 text-xs"
            />
            <div className="flex items-center gap-1.5">
              <Checkbox
                id="custom-holiday-repeats"
                checked={customHolidayRepeats}
                onCheckedChange={(checked) => setCustomHolidayRepeats(checked === true)}
                className="data-[state=checked]:border-primary data-[state=checked]:bg-primary"
              />
              <Label htmlFor="custom-holiday-repeats" className="text-xs text-muted-foreground">
                Yearly
              </Label>
            </div>
            <Button
              type="submit"
              size="sm"
              disabled={
                isAddingHoliday || !customHolidayName.trim() || !customHolidayDate
              }
              className="h-8"
            >
              {isAddingHoliday ? 'Adding…' : 'Add'}
            </Button>
          </div>
        </form>
      </div>

      {successMessage && (
        <div className="rounded-2xl border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs text-foreground">
          <p className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-primary" />
            {successMessage}
          </p>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs text-destructive">
          {errorMessage}
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
          <span>{holidays.length} holidays</span>
          <span className="uppercase">{selectedCountry}</span>
        </div>

        <div className="max-h-64 overflow-y-auto rounded-3xl border border-border bg-card">
          {sortedHolidays.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-muted-foreground">
              {isLoadingHolidays ? 'Loading holidays...' : 'Select a country to load holidays'}
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {sortedHolidays.map((holiday, index) => {
                const key = holiday.id ?? `${holiday.date}-${holiday.name}`;
                const isRemoving = removingId === key;

                return (
                  <div
                    key={key}
                    className={cn(
                      'flex items-center justify-between gap-3 px-3 py-1.5 text-xs transition',
                      index % 2 === 0 ? 'bg-card' : 'bg-muted/40',
                      'hover:bg-muted/70'
                    )}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <span className="truncate font-medium text-foreground">{holiday.name}</span>
                      <span className="shrink-0 text-muted-foreground">
                        {formatHolidayDate(holiday.date, holiday.repeats_yearly)}
                      </span>
                      <span
                        className={cn(
                          'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium',
                          holiday.repeats_yearly
                            ? 'bg-primary/15 text-primary'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {holiday.repeats_yearly ? 'Yearly' : 'Once'}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemoveHoliday(holiday)}
                      disabled={isRemoving || isLoadingHolidays}
                      className="shrink-0 text-muted-foreground transition hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50"
                      title="Delete holiday"
                    >
                      <Trash2 className={`h-3.5 w-3.5 ${isRemoving ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Official holidays are sourced from the Nager.Date public dataset. Changing your country will update the list for {new Date().getFullYear()}.
      </p>
    </div>
  );
};

export default HolidaysTab;
