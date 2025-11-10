"use client";

import React, { useState, useEffect, useTransition } from 'react';
import { Calendar } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { usePlanner } from '@/contexts/PlannerContext';
import { savePTOSettings, addAccrualRule } from '@/app/actions/settings-actions';
import { cn } from '@/lib/utils';
// PTO accrual frequency options
const ACCRUAL_FREQUENCIES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' }
];

const DEFAULT_HOURS_PER_DAY = 8;
const DEFAULT_HOURS_PER_WEEK = 40;

const hasCustomHourSettings = (hoursPerDay: number, hoursPerWeek: number): boolean => {
  const differsFrom = (value: number, baseline: number) => Math.abs(value - baseline) > 0.001;
  return differsFrom(hoursPerDay, DEFAULT_HOURS_PER_DAY) || differsFrom(hoursPerWeek, DEFAULT_HOURS_PER_WEEK);
};

const toDateInputValue = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const getDefaultResetDate = (asOfDate?: string): string => {
  if (asOfDate) {
    const base = new Date(`${asOfDate}T00:00:00`);
    return toDateInputValue(new Date(base.getFullYear(), 11, 31));
  }
  const today = new Date();
  return toDateInputValue(new Date(today.getFullYear(), 11, 31));
};

const convertBetweenUnits = (
  value: number,
  fromUnit: 'days' | 'hours',
  toUnit: 'days' | 'hours',
  hoursPerDay: number
): number => {
  if (!Number.isFinite(value)) return 0;
  const normalizedHours = hoursPerDay > 0 ? hoursPerDay : 8;
  if (fromUnit === toUnit) {
    return value;
  }
  if (fromUnit === 'days' && toUnit === 'hours') {
    const converted = value * normalizedHours;
    return Math.round(converted * 1000) / 1000;
  }
  // from hours to days
  const converted = value / normalizedHours;
  return Math.round(converted * 1000) / 1000;
};

interface LocalPTOSettings {
  initialBalance: number;
  asOfDate: string;
  accrualFrequency: 'weekly' | 'biweekly' | 'monthly' | 'yearly';
  accrualAmount: number;
  maxCarryover: number;
  enableCarryoverLimit: boolean;
  carryoverResetDate: string;
  displayUnit: 'days' | 'hours';
  hoursPerDay: number;
  hoursPerWeek: number;
}

const PTOTab: React.FC = () => {
  const { plannerData, setPlannerData, isAuthenticated, getSettings, saveLocalSettings } = usePlanner();
  const [isPending, startTransition] = useTransition();
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Initialize local settings from planner data or localStorage
  const [localSettings, setLocalSettings] = useState<LocalPTOSettings>(() => {
    const settings = getSettings();
    const carryoverEnabled = typeof settings.carry_over_limit === 'number' && settings.carry_over_limit >= 0;
    const displayUnit = settings.pto_display_unit === 'hours' ? 'hours' : 'days';
    const hoursPerDay =
      settings.hours_per_day && settings.hours_per_day > 0 ? settings.hours_per_day : DEFAULT_HOURS_PER_DAY;
    const hoursPerWeek =
      settings.hours_per_week && settings.hours_per_week > 0 ? settings.hours_per_week : DEFAULT_HOURS_PER_WEEK;
    const advancedEnabled = carryoverEnabled || hasCustomHourSettings(hoursPerDay, hoursPerWeek);
    return {
      initialBalance: settings.initial_balance || 15,
      asOfDate: settings.pto_start_date || new Date().toISOString().split('T')[0],
      accrualFrequency: 'monthly',
      accrualAmount: 1.25,
      maxCarryover: settings.carry_over_limit ?? 5,
      enableCarryoverLimit: advancedEnabled,
      carryoverResetDate: settings.renewal_date || getDefaultResetDate(settings.pto_start_date),
      displayUnit,
      hoursPerDay,
      hoursPerWeek,
    };
  });

  const unitLabel = localSettings.displayUnit === 'hours' ? 'hours' : 'days';

  // Update local settings when planner data changes
  useEffect(() => {
    const settings = getSettings();
    if (settings) {
      const carryoverEnabled = typeof settings.carry_over_limit === 'number' && settings.carry_over_limit >= 0;
      const displayUnit = settings.pto_display_unit === 'hours' ? 'hours' : 'days';
      const hoursPerDay =
        settings.hours_per_day && settings.hours_per_day > 0 ? settings.hours_per_day : DEFAULT_HOURS_PER_DAY;
      const hoursPerWeek =
        settings.hours_per_week && settings.hours_per_week > 0 ? settings.hours_per_week : DEFAULT_HOURS_PER_WEEK;
      const advancedEnabled = carryoverEnabled || hasCustomHourSettings(hoursPerDay, hoursPerWeek);
      setLocalSettings({
        initialBalance: settings.initial_balance || 15,
        asOfDate: settings.pto_start_date || new Date().toISOString().split('T')[0],
        accrualFrequency: 'monthly',
        accrualAmount: 1.25,
        maxCarryover: settings.carry_over_limit ?? 5,
        enableCarryoverLimit: advancedEnabled,
        carryoverResetDate: settings.renewal_date || getDefaultResetDate(settings.pto_start_date),
        displayUnit,
        hoursPerDay,
        hoursPerWeek,
      });
    }
  }, [plannerData?.settings, getSettings]);

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    // Convert numeric fields to numbers
    let parsedValue: string | number = value;
    if (['initialBalance', 'accrualAmount', 'maxCarryover', 'hoursPerDay', 'hoursPerWeek'].includes(name)) {
      parsedValue = parseFloat(value) || 0;
    }

    setLocalSettings({
      ...localSettings,
      [name]: parsedValue
    });
  };

  const handleDisplayUnitChange = (nextUnit: 'days' | 'hours') => {
    setLocalSettings((prev) => {
      if (nextUnit === prev.displayUnit) {
        return prev;
      }

      const hoursPerDay = prev.hoursPerDay > 0 ? prev.hoursPerDay : 8;

      return {
        ...prev,
        displayUnit: nextUnit,
        initialBalance: convertBetweenUnits(prev.initialBalance, prev.displayUnit, nextUnit, hoursPerDay),
        accrualAmount: convertBetweenUnits(prev.accrualAmount, prev.displayUnit, nextUnit, hoursPerDay),
        maxCarryover: convertBetweenUnits(prev.maxCarryover, prev.displayUnit, nextUnit, hoursPerDay),
      };
    });
  };

  const handleAdvancedToggle = (checked: boolean) => {
    setLocalSettings((prev) => {
      if (checked) {
        return {
          ...prev,
          enableCarryoverLimit: true,
          carryoverResetDate: prev.carryoverResetDate || getDefaultResetDate(prev.asOfDate),
        };
      }

      return {
        ...prev,
        enableCarryoverLimit: false,
        hoursPerDay: DEFAULT_HOURS_PER_DAY,
        hoursPerWeek: DEFAULT_HOURS_PER_WEEK,
      };
    });
  };

  // Save settings (to localStorage or database)
  const handleSave = React.useCallback(async () => {
    setSaveStatus('idle');

    // If not authenticated, save to localStorage
    if (!isAuthenticated) {
      const carryOverLimitValue = localSettings.enableCarryoverLimit ? localSettings.maxCarryover : null;
      const renewalDateValue = localSettings.enableCarryoverLimit ? localSettings.carryoverResetDate : null;

      const settings = {
        initial_balance: localSettings.initialBalance,
        pto_start_date: localSettings.asOfDate,
        carry_over_limit: carryOverLimitValue ?? undefined,
        renewal_date: renewalDateValue ?? undefined,
        pto_display_unit: localSettings.displayUnit,
        hours_per_day: localSettings.hoursPerDay,
        hours_per_week: localSettings.hoursPerWeek,
      };
      saveLocalSettings(settings);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
      return;
    }

    // If authenticated, save to database
    startTransition(async () => {
      try {
        const carryOverLimitValue = localSettings.enableCarryoverLimit ? localSettings.maxCarryover : null;
        const renewalDateValue = localSettings.enableCarryoverLimit ? localSettings.carryoverResetDate : null;

        // Save PTO settings
        const settingsResult = await savePTOSettings({
          pto_start_date: localSettings.asOfDate,
          initial_balance: localSettings.initialBalance,
          carry_over_limit: carryOverLimitValue,
          max_balance: undefined,
          renewal_date: renewalDateValue,
          allow_negative_balance: false,
          pto_display_unit: localSettings.displayUnit,
          hours_per_day: localSettings.hoursPerDay,
          hours_per_week: localSettings.hoursPerWeek,
        });

        if (!settingsResult.success) {
          console.error('Failed to save settings:', settingsResult.error);
          setSaveStatus('error');
          return;
        }

        // Create accrual rule
        const accrualResult = await addAccrualRule({
          name: `${localSettings.accrualFrequency} accrual`,
          accrual_amount: localSettings.accrualAmount,
          accrual_frequency: localSettings.accrualFrequency,
          accrual_day: undefined,
          effective_date: localSettings.asOfDate,
          end_date: undefined,
          is_active: true,
        });

        if (!accrualResult.success) {
          console.error('Failed to save accrual rule:', accrualResult.error);
          setSaveStatus('error');
          return;
        }

        // Update context with new data
        if (plannerData) {
          setPlannerData({
            ...plannerData,
            settings: settingsResult.data,
            accrualRules: [...plannerData.accrualRules, accrualResult.data],
          });
        }

        setSaveStatus('success');

        // Clear success message after 3 seconds
        setTimeout(() => setSaveStatus('idle'), 3000);
      } catch (error) {
        console.error('Error saving PTO settings:', error);
        setSaveStatus('error');
      }
    });
  }, [localSettings, isAuthenticated, plannerData, saveLocalSettings, setPlannerData, startTransition]);

  // Auto-save after settings change (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSave();
    }, 500); // Auto-save 500ms after user stops typing

    return () => clearTimeout(timeoutId);
  }, [
    localSettings.initialBalance,
    localSettings.asOfDate,
    localSettings.maxCarryover,
    localSettings.enableCarryoverLimit,
    localSettings.carryoverResetDate,
    localSettings.accrualAmount,
    localSettings.displayUnit,
    localSettings.hoursPerDay,
    localSettings.hoursPerWeek,
    handleSave,
  ]);

  return (
    <div className="space-y-3">
      <div className="space-y-3 p-3">
        <div className="flex items-center justify-end gap-2 px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          <span>Input unit</span>
          <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card/80 p-0.5">
            <button
              type="button"
              onClick={() => handleDisplayUnitChange('days')}
              className={cn(
                'rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition-colors',
                localSettings.displayUnit === 'days'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Days
            </button>
            <button
              type="button"
              onClick={() => handleDisplayUnitChange('hours')}
              className={cn(
                'rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition-colors',
                localSettings.displayUnit === 'hours'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Hours
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1.5">
            <Label htmlFor="initialBalance" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Initial balance ({unitLabel})
            </Label>
            <Input
              id="initialBalance"
              name="initialBalance"
              type="number"
              min="0"
              step="0.5"
              value={localSettings.initialBalance}
              onChange={handleChange}
              className="!h-8 px-2 py-1 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="asOfDate" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              As of date
            </Label>
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="asOfDate"
                name="asOfDate"
                type="date"
                value={localSettings.asOfDate}
                onChange={handleChange}
                className="!h-8 pl-8 pr-2 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="accrualAmount" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Accrual amount ({unitLabel})
            </Label>
            <Input
              id="accrualAmount"
              name="accrualAmount"
              type="number"
              min="0"
              step="0.5"
              value={localSettings.accrualAmount}
              onChange={handleChange}
              className="!h-8 px-2 py-1 text-xs"
            />
            <p className="text-[10px] text-muted-foreground/70">
              Per {localSettings.accrualFrequency} period ({unitLabel})
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="accrualFrequency" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Accrual frequency
            </Label>
            <select
              id="accrualFrequency"
              name="accrualFrequency"
              value={localSettings.accrualFrequency}
              onChange={handleChange}
              className="w-full rounded-md border border-input bg-background py-1.5 px-2 text-xs text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-70"
            >
              {ACCRUAL_FREQUENCIES.map((freq) => (
                <option key={freq.value} value={freq.value}>
                  {freq.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex h-full items-center justify-end gap-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <span>Advanced</span>
            <Switch
              checked={localSettings.enableCarryoverLimit}
              onCheckedChange={handleAdvancedToggle}
              aria-label="Toggle advanced PTO controls"
              className="data-[state=checked]:border-primary-border border"
            />
          </div>

          {localSettings.enableCarryoverLimit && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="maxCarryover" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Max carryover ({unitLabel})
                </Label>
                <Input
                  id="maxCarryover"
                  name="maxCarryover"
                  type="number"
                  min="0"
                  step="0.5"
                  value={localSettings.maxCarryover}
                  onChange={handleChange}
                  className="!h-8 px-2 py-1 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="carryoverResetDate" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Rollover date
                </Label>
                <Input
                  id="carryoverResetDate"
                  name="carryoverResetDate"
                  type="date"
                  value={localSettings.carryoverResetDate}
                  onChange={handleChange}
                  className="!h-8 px-2 py-1 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="hoursPerDay" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Hours per PTO day
                </Label>
                <Input
                  id="hoursPerDay"
                  name="hoursPerDay"
                  type="number"
                  min="0.25"
                  max="24"
                  step="0.25"
                  value={localSettings.hoursPerDay}
                  onChange={handleChange}
                  className="!h-8 px-2 py-1 text-xs"
                />
                <p className="text-[10px] text-muted-foreground/70">Used when converting PTO days to hours</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="hoursPerWeek" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Hours per week
                </Label>
                <Input
                  id="hoursPerWeek"
                  name="hoursPerWeek"
                  type="number"
                  min="1"
                  max="168"
                  step="0.5"
                  value={localSettings.hoursPerWeek}
                  onChange={handleChange}
                  className="!h-8 px-2 py-1 text-xs"
                />
                <p className="text-[10px] text-muted-foreground/70">Aligns PTO plans with non-standard schedules</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PTOTab; 
