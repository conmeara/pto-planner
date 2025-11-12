"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Globe, CheckCircle, Trash2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { usePlanner } from '@/contexts/PlannerContext';
import { formatDateLocal, parseDateLocal } from '@/lib/date-utils';
import type { CustomHoliday } from '@/types';
import { cn } from '@/lib/utils';
import { getCalendarYearBounds } from '@/lib/calendar-range';

type CountryOption = { code: string; name: string };

// Default country list used before remote data loads or if it fails
const DEFAULT_COUNTRIES: CountryOption[] = [
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
  const [customHolidayEndDate, setCustomHolidayEndDate] = useState('');
  const [customHolidayRepeats, setCustomHolidayRepeats] = useState(false);
  const [isAddingHoliday, setIsAddingHoliday] = useState(false);
  const [countries, setCountries] = useState<CountryOption[]>(DEFAULT_COUNTRIES);
  const [isFetchingCountries, setIsFetchingCountries] = useState(false);
  const [countriesError, setCountriesError] = useState<string | null>(null);

  const holidays = getHolidays();
  const calendarBounds = useMemo(() => getCalendarYearBounds(new Date()), []);
  const { startYear: calendarStartYear, endYear: calendarEndYear } = calendarBounds;

  const yearRangeKeys = useMemo(() => {
    const years: string[] = [];
    for (let year = calendarStartYear; year <= calendarEndYear; year += 1) {
      years.push(String(year));
    }
    return years;
  }, [calendarStartYear, calendarEndYear]);

  useEffect(() => {
    setSelectedCountry(countryCode || 'US');
  }, [countryCode]);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const loadCountries = async () => {
      try {
        setIsFetchingCountries(true);
        const response = await fetch('https://date.nager.at/api/v3/AvailableCountries', {
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to load countries: ${response.status}`);
        }

        const data: Array<{ countryCode: string; name: string }> = await response.json();
        if (!isMounted) {
          return;
        }

        const mapped = data
          .map((entry) => ({
            code: entry.countryCode,
            name: entry.name,
          }))
          .filter((entry) => entry.code && entry.name)
          .sort((a, b) => a.name.localeCompare(b.name));

        setCountries(mapped);
        setCountriesError(null);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        console.error('Failed to fetch country list', error);
        if (isMounted) {
          setCountries(DEFAULT_COUNTRIES);
          setCountriesError('Showing a limited country list while we retry.');
        }
      } finally {
        if (isMounted) {
          setIsFetchingCountries(false);
        }
      }
    };

    void loadCountries();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

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

  const groupedHolidays = useMemo<Record<string, CustomHoliday[]>>(() => {
    const groups: Record<string, CustomHoliday[]> = yearRangeKeys.reduce(
      (acc, year) => {
        acc[year] = [];
        return acc;
      },
      {} as Record<string, CustomHoliday[]>,
    );

    const recurringHolidays = sortedHolidays.filter((holiday) => holiday.repeats_yearly);

    sortedHolidays.forEach((holiday) => {
      if (holiday.repeats_yearly) {
        return;
      }

      const date = parseDateLocal(holiday.date);
      const yearKey = String(date.getFullYear());

      if (groups[yearKey]) {
        groups[yearKey].push(holiday);
      }
    });

    if (recurringHolidays.length > 0) {
      yearRangeKeys.forEach((yearKey) => {
        const year = Number(yearKey);
        recurringHolidays.forEach((holiday) => {
          const originalDate = parseDateLocal(holiday.date);
          const projectedDate = new Date(year, originalDate.getMonth(), originalDate.getDate());
          groups[yearKey].push({
            ...holiday,
            date: formatDateLocal(projectedDate),
          });
        });
      });
    }

    Object.values(groups).forEach((list) => {
      list.sort((a, b) => a.date.localeCompare(b.date));
    });

    return groups;
  }, [sortedHolidays, yearRangeKeys]);

  const yearTabs = yearRangeKeys;

  const [activeYear, setActiveYear] = useState<string>('');

  useEffect(() => {
    if (yearTabs.length === 0) {
      setActiveYear('');
      return;
    }

    const currentYearKey = String(new Date().getFullYear());
    if (yearTabs.includes(currentYearKey)) {
      setActiveYear(currentYearKey);
      return;
    }

    setActiveYear(yearTabs[0]);
  }, [yearTabs]);

  const activeHolidays = activeYear ? groupedHolidays[activeYear] ?? [] : [];
  const hasLoadedAny = sortedHolidays.length > 0;

  const availableCountries = useMemo(() => {
    if (!selectedCountry) return countries;
    const exists = countries.some((country) => country.code === selectedCountry);
    if (exists) return countries;
    return [
      ...countries,
      { code: selectedCountry, name: `Detected (${selectedCountry})` },
    ];
  }, [countries, selectedCountry]);

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
    setSuccessMessage(`Loaded ${count} holidays for ${result.countryCode} (${result.year})`);
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
      setErrorMessage('Holiday start date is required.');
      return;
    }

    const startDateObj = parseDateLocal(customHolidayDate);
    if (Number.isNaN(startDateObj.getTime())) {
      setErrorMessage('Holiday start date is invalid.');
      return;
    }

    if (customHolidayEndDate) {
      const endDateObj = parseDateLocal(customHolidayEndDate);
      if (Number.isNaN(endDateObj.getTime())) {
        setErrorMessage('Holiday end date is invalid.');
        return;
      }

      if (endDateObj < startDateObj) {
        setErrorMessage('End date cannot be before start date.');
        return;
      }
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsAddingHoliday(true);

    const result = await addHoliday({
      name: trimmedName,
      date: customHolidayDate,
      endDate: customHolidayEndDate || undefined,
      repeatsYearly: customHolidayRepeats,
    });

    setIsAddingHoliday(false);

    if (!result.success) {
      setErrorMessage(result.error || 'Unable to add that holiday.');
      return;
    }

    const addedHolidays = result.data ?? [];
    const addedCount = addedHolidays.length;

    if (addedCount === 0) {
      setErrorMessage('No holidays were added.');
      return;
    }

    const datesForDisplay = addedHolidays
      .map((holiday) => parseDateLocal(holiday.date))
      .filter((dateObj) => !Number.isNaN(dateObj.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());

    const formatter = new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    let rangeText = '';
    if (datesForDisplay.length === 1) {
      rangeText = formatter.format(datesForDisplay[0]);
    } else if (datesForDisplay.length > 1) {
      const startLabel = formatter.format(datesForDisplay[0]);
      const endLabel = formatter.format(datesForDisplay[datesForDisplay.length - 1]);
      rangeText = `${startLabel} – ${endLabel}`;
    }

    const dayLabel = addedCount === 1 ? 'day' : 'days';
    const rangeSuffix = rangeText ? ` (${rangeText})` : '';
    setSuccessMessage(`Added ${addedCount} holiday ${dayLabel} for ${trimmedName}${rangeSuffix}.`);
    setCustomHolidayName('');
    setCustomHolidayDate('');
    setCustomHolidayEndDate('');
    setCustomHolidayRepeats(false);
  };

  const formatTabLabel = (key: string) => key;

  const activeYearLabel = activeYear ? formatTabLabel(activeYear) : `${calendarStartYear} – ${calendarEndYear}`;

  return (
    <div className="space-y-4 text-sm text-foreground">
      {/* Country Selection */}
      <div className="space-y-2">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <Label htmlFor="country" className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Country
          </Label>
          {(isLoadingHolidays || isFetchingCountries) && (
            <span className="text-[11px] text-muted-foreground">
              {isFetchingCountries ? 'Loading countries...' : 'Loading holidays...'}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <div className="relative flex-1">
            <Globe className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <select
              id="country"
              value={selectedCountry}
              onChange={(event) => handleCountryChange(event.target.value)}
              className="w-full rounded-2xl border border-border bg-card py-2 pl-8 pr-3 text-xs text-foreground transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isLoadingHolidays || isFetchingCountries}
            >
              {isFetchingCountries && (
                <option value="" disabled>
                  Loading countries...
                </option>
              )}
              {availableCountries.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-1.5 sm:justify-end">
            {yearTabs.map((tabKey) => {
              const isActive = tabKey === activeYear;
              return (
                <button
                  type="button"
                  key={tabKey}
                  onClick={() => setActiveYear(tabKey)}
                  className={cn(
                    'rounded-2xl border px-3 py-1.5 text-[11px] font-medium transition',
                    isActive
                      ? 'border-primary bg-primary/15 text-primary'
                      : 'border-transparent bg-muted text-muted-foreground hover:text-foreground'
                  )}
                >
                  {formatTabLabel(tabKey)}
                </button>
              );
            })}
          </div>
        </div>
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

      {countriesError && (
        <div className="rounded-2xl border border-border/60 bg-muted/40 px-3 py-1.5 text-[11px] text-muted-foreground">
          {countriesError}
        </div>
      )}

      <div className="space-y-3">
        <div className="max-h-64 overflow-y-auto rounded-3xl border border-border bg-card">
          <div className="divide-y divide-border/60">
            <form
              onSubmit={handleAddHoliday}
              className="flex flex-col gap-3 bg-card px-3 py-2 text-[11px] transition hover:bg-muted/60 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex flex-col gap-2 sm:min-w-0 sm:flex-1 sm:flex-row sm:items-center sm:gap-3">
                <Label htmlFor="custom-holiday-name" className="sr-only">
                  Holiday name
                </Label>
                <Input
                  id="custom-holiday-name"
                  value={customHolidayName}
                  onChange={(event) => setCustomHolidayName(event.target.value)}
                  placeholder="Add custom holiday"
                  className="!h-8 !text-[11px] w-full min-w-0 flex-1 rounded-2xl border border-border/60 bg-card px-3 font-medium text-foreground !shadow-none transition placeholder:text-muted-foreground focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring sm:!h-7 sm:rounded-none sm:border-0 sm:border-b sm:border-border/40 sm:bg-transparent sm:px-0 sm:focus-visible:border-b sm:focus-visible:border-primary/50 sm:focus-visible:ring-0"
                />
                <div className="flex flex-col gap-2 sm:flex-row sm:shrink-0 sm:gap-2">
                  <div className="w-full sm:w-32">
                    <Label htmlFor="custom-holiday-date" className="sr-only">
                      Holiday start date
                    </Label>
                    <Input
                      id="custom-holiday-date"
                      type="date"
                      value={customHolidayDate}
                      onChange={(event) => setCustomHolidayDate(event.target.value)}
                      className="!h-8 !text-[11px] w-full appearance-none rounded-2xl border border-border/60 bg-card px-3 text-muted-foreground !shadow-none transition focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring sm:!h-7 sm:rounded-none sm:border-0 sm:border-b sm:border-border/40 sm:bg-transparent sm:px-0 sm:text-muted-foreground sm:focus-visible:border-b sm:focus-visible:border-primary/50 sm:focus-visible:ring-0"
                    />
                  </div>
                  <div className="w-full sm:w-32">
                    <Label htmlFor="custom-holiday-end-date" className="sr-only">
                      Holiday end date (optional)
                    </Label>
                    <Input
                      id="custom-holiday-end-date"
                      type="date"
                      value={customHolidayEndDate}
                      onChange={(event) => setCustomHolidayEndDate(event.target.value)}
                      placeholder="End date (optional)"
                      className={cn(
                        '!h-8 !text-[11px] w-full appearance-none rounded-2xl border border-border/60 bg-card px-3 !shadow-none transition focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring sm:!h-7 sm:rounded-none sm:border-0 sm:border-b sm:border-border/40 sm:bg-transparent sm:px-0 sm:focus-visible:border-b sm:focus-visible:border-primary/50 sm:focus-visible:ring-0',
                        customHolidayEndDate
                          ? 'text-foreground'
                          : 'text-muted-foreground opacity-60 focus-visible:opacity-100'
                      )}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-1 sm:shrink-0">
                  <Checkbox
                    id="custom-holiday-repeats"
                    checked={customHolidayRepeats}
                    onCheckedChange={(checked) => setCustomHolidayRepeats(checked === true)}
                    className="data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                  />
                  <Label htmlFor="custom-holiday-repeats" className="text-[11px] text-muted-foreground">
                    Yearly
                  </Label>
                </div>
              </div>
              <Button
                type="submit"
                size="sm"
                disabled={
                  isAddingHoliday || !customHolidayName.trim() || !customHolidayDate
                }
                className="h-9 w-full shrink-0 rounded-2xl px-3 text-[11px] sm:h-7 sm:w-auto"
              >
                {isAddingHoliday ? 'Adding…' : 'Add'}
              </Button>
            </form>
            {!hasLoadedAny ? (
              <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                {isLoadingHolidays ? 'Loading holidays...' : 'Select a country to load holidays'}
              </div>
            ) : activeHolidays.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                No holidays for {activeYearLabel}.
              </div>
            ) : (
              activeHolidays.map((holiday, index) => {
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
                      {holiday.repeats_yearly && (
                        <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                          Recurring
                        </span>
                      )}
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
              })
            )}
          </div>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Official holidays are sourced from the Nager.Date public dataset. Changing your country refreshes holidays between {calendarStartYear} and {calendarEndYear}. Recurring events appear in every year with a badge.
      </p>
    </div>
  );
};

export default HolidaysTab;
