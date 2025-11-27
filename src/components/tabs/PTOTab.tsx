"use client";

import React, { useState, useEffect, useTransition, useCallback, useRef, useMemo } from 'react';
import { Calendar } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePlanner } from '@/contexts/PlannerContext';
import { savePTOSettings, addAccrualRule } from '@/app/actions/settings-actions';
import { formatDateLocal, parseDateLocal } from '@/lib/date-utils';
// PTO accrual frequency options
const ACCRUAL_FREQUENCIES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' }
];

const DEFAULT_HOURS_PER_DAY = 8;
const DEFAULT_HOURS_PER_WEEK = 40;

interface UnitBadgeProps {
  unit: 'days' | 'hours';
  onToggle?: () => void;
  labelOverride?: string;
}

const UnitBadge: React.FC<UnitBadgeProps> = ({ unit, onToggle, labelOverride }) => {
  const label = labelOverride ?? (unit === 'days' ? 'Days' : 'Hours');
  const sharedClasses =
    'absolute inset-y-[3px] right-[3px] flex items-center rounded-md bg-muted px-2 text-[11px] font-semibold uppercase transition-colors';

  if (onToggle) {
    const nextUnit = unit === 'days' ? 'hours' : 'days';
    return (
      <button
        type="button"
        onClick={onToggle}
        className={`${sharedClasses} text-muted-foreground hover:bg-muted/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
        aria-label={`Switch to ${nextUnit}`}
        title={`Switch to ${nextUnit}`}
      >
        {label}
      </button>
    );
  }

  return <span className={`${sharedClasses} pointer-events-none cursor-default text-muted-foreground`}>{label}</span>;
};

const hasCustomHourSettings = (hoursPerDay: number, hoursPerWeek: number): boolean => {
  const differsFrom = (value: number, baseline: number) => Math.abs(value - baseline) > 0.001;
  return differsFrom(hoursPerDay, DEFAULT_HOURS_PER_DAY) || differsFrom(hoursPerWeek, DEFAULT_HOURS_PER_WEEK);
};

const toDateInputValue = (date: Date): string => {
  return formatDateLocal(date);
};

const getDefaultResetDate = (asOfDate?: string): string => {
  if (asOfDate) {
    const base = parseDateLocal(asOfDate);
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

type FieldUnit = 'days' | 'hours';

interface FieldUnits {
  initialBalance: FieldUnit;
  accrualAmount: FieldUnit;
  maxCarryover: FieldUnit;
}

interface PTOTabProps {
  onHeaderActionsChange?: (actions: React.ReactNode | null) => void;
}

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect;

const PTOTab: React.FC<PTOTabProps> = ({ onHeaderActionsChange }) => {
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
      asOfDate: settings.pto_start_date || formatDateLocal(new Date()),
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
  const [fieldUnits, setFieldUnits] = useState<FieldUnits>(() => {
    const settings = getSettings();
    const displayUnit = settings.pto_display_unit === 'hours' ? 'hours' : 'days';
    return {
      initialBalance: displayUnit,
      accrualAmount: displayUnit,
      maxCarryover: displayUnit,
    };
  });
  const lastDisplayUnitRef = useRef<FieldUnit>(localSettings.displayUnit);

  const [renderedInHeader, setRenderedInHeader] = useState(false);

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
        asOfDate: settings.pto_start_date || formatDateLocal(new Date()),
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
    if (['hoursPerDay', 'hoursPerWeek'].includes(name)) {
      parsedValue = parseFloat(value) || 0;
    }

    setLocalSettings({
      ...localSettings,
      [name]: parsedValue
    });
  };

  const handleNumericChangeWithUnit = useCallback(
    (field: keyof Pick<LocalPTOSettings, 'initialBalance' | 'accrualAmount' | 'maxCarryover'>, value: string) => {
      const parsed = parseFloat(value);
      const numericValue = Number.isFinite(parsed) ? parsed : 0;
      const sourceUnit = fieldUnits[field];
      const baseUnit = localSettings.displayUnit;
      const hoursPerDay = localSettings.hoursPerDay > 0 ? localSettings.hoursPerDay : DEFAULT_HOURS_PER_DAY;
      const converted = convertBetweenUnits(numericValue, sourceUnit, baseUnit, hoursPerDay);

      setLocalSettings((prev) => ({
        ...prev,
        [field]: converted,
      }));
    },
    [fieldUnits, localSettings.displayUnit, localSettings.hoursPerDay]
  );

  const toggleFieldUnit = useCallback((field: keyof FieldUnits) => {
    setFieldUnits((prevUnits) => {
      const nextUnit: FieldUnit = prevUnits[field] === 'days' ? 'hours' : 'days';

      if (field === 'initialBalance') {
        setLocalSettings((prevSettings) => {
          const hoursPerDay = prevSettings.hoursPerDay > 0 ? prevSettings.hoursPerDay : DEFAULT_HOURS_PER_DAY;

          return {
            ...prevSettings,
            displayUnit: nextUnit,
            initialBalance: convertBetweenUnits(
              prevSettings.initialBalance,
              prevSettings.displayUnit,
              nextUnit,
              hoursPerDay
            ),
            accrualAmount: convertBetweenUnits(
              prevSettings.accrualAmount,
              prevSettings.displayUnit,
              nextUnit,
              hoursPerDay
            ),
            maxCarryover: convertBetweenUnits(
              prevSettings.maxCarryover,
              prevSettings.displayUnit,
              nextUnit,
              hoursPerDay
            ),
          };
        });
        lastDisplayUnitRef.current = nextUnit;
      }

      return {
        ...prevUnits,
        [field]: nextUnit,
      };
    });
  }, []);

  const handleAccrualFrequencyChange = useCallback((value: string) => {
    setLocalSettings((prev) => ({
      ...prev,
      accrualFrequency: value as 'weekly' | 'biweekly' | 'monthly' | 'yearly',
    }));
  }, []);

  const handleAdvancedToggle = useCallback((checked: boolean) => {
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
  }, []);

  const advancedToggleNode = useMemo(
    () => (
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <label htmlFor="advanced-toggle" className="cursor-pointer">Advanced</label>
        <Switch
          id="advanced-toggle"
          checked={localSettings.enableCarryoverLimit}
          onCheckedChange={handleAdvancedToggle}
          aria-label="Toggle advanced PTO controls"
        />
      </div>
    ),
    [handleAdvancedToggle, localSettings.enableCarryoverLimit]
  );

  useIsomorphicLayoutEffect(() => {
    if (!onHeaderActionsChange) {
      console.log('[PTOTab] No onHeaderActionsChange callback provided');
      setRenderedInHeader(false);
      return;
    }

    console.log('[PTOTab] Setting header actions', { hasAdvancedToggle: !!advancedToggleNode });
    onHeaderActionsChange(advancedToggleNode);
    setRenderedInHeader(true);

    return () => {
      console.log('[PTOTab] Cleanup: clearing header actions');
      setRenderedInHeader(false);
      onHeaderActionsChange(null);
    };
  }, [advancedToggleNode, onHeaderActionsChange]);

  useEffect(() => {
    const previous = lastDisplayUnitRef.current;
    const next = localSettings.displayUnit;

    if (previous !== next) {
      setFieldUnits((prevUnits) => ({
        initialBalance: prevUnits.initialBalance === previous ? next : prevUnits.initialBalance,
        accrualAmount: prevUnits.accrualAmount === previous ? next : prevUnits.accrualAmount,
        maxCarryover: prevUnits.maxCarryover === previous ? next : prevUnits.maxCarryover,
      }));
      lastDisplayUnitRef.current = next;
    }
  }, [localSettings.displayUnit]);

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
  // Using a ref to avoid handleSave in deps (it changes on every render due to localSettings)
  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSaveRef.current();
    }, 500); // Auto-save 500ms after user stops typing

    return () => clearTimeout(timeoutId);
  }, [
    localSettings.initialBalance,
    localSettings.asOfDate,
    localSettings.accrualFrequency,
    localSettings.maxCarryover,
    localSettings.enableCarryoverLimit,
    localSettings.carryoverResetDate,
    localSettings.accrualAmount,
    localSettings.displayUnit,
    localSettings.hoursPerDay,
    localSettings.hoursPerWeek,
  ]);

  const accrualFrequencyLabel =
    ACCRUAL_FREQUENCIES.find((freq) => freq.value === localSettings.accrualFrequency)?.label ?? 'Monthly';

  const hoursPerDayForDisplay =
    localSettings.hoursPerDay && localSettings.hoursPerDay > 0 ? localSettings.hoursPerDay : DEFAULT_HOURS_PER_DAY;

  const displayValues = {
    initialBalance: convertBetweenUnits(
      localSettings.initialBalance,
      localSettings.displayUnit,
      fieldUnits.initialBalance,
      hoursPerDayForDisplay
    ),
    accrualAmount: convertBetweenUnits(
      localSettings.accrualAmount,
      localSettings.displayUnit,
      fieldUnits.accrualAmount,
      hoursPerDayForDisplay
    ),
    maxCarryover: convertBetweenUnits(
      localSettings.maxCarryover,
      localSettings.displayUnit,
      fieldUnits.maxCarryover,
      hoursPerDayForDisplay
    ),
  };

  const accrualUnitLabel = fieldUnits.accrualAmount === 'hours' ? 'hours' : 'days';

  return (
    <div className="space-y-6">
      {!renderedInHeader && (
        <div className="flex justify-end">{advancedToggleNode}</div>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="initialBalance" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Initial balance
          </Label>
          <div className="relative">
            <Input
              id="initialBalance"
              name="initialBalance"
              type="number"
              min="0"
              step="0.5"
              value={displayValues.initialBalance}
              onChange={(event) => handleNumericChangeWithUnit('initialBalance', event.target.value)}
              className="!h-9 pr-16 text-xs"
            />
            <UnitBadge unit={fieldUnits.initialBalance} onToggle={() => toggleFieldUnit('initialBalance')} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="asOfDate" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            As of date
          </Label>
          <div className="relative">
            <Calendar className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="asOfDate"
              name="asOfDate"
              type="date"
              value={localSettings.asOfDate}
              onChange={handleChange}
              className="!h-9 appearance-none pl-9 pr-3 text-xs"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="accrualAmount" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Accrual amount
          </Label>
          <div className="relative">
            <Input
              id="accrualAmount"
              name="accrualAmount"
              type="number"
              min="0"
              step="0.5"
              value={displayValues.accrualAmount}
              onChange={(event) => handleNumericChangeWithUnit('accrualAmount', event.target.value)}
              className="!h-9 pr-16 text-xs"
            />
            <UnitBadge unit={fieldUnits.accrualAmount} onToggle={() => toggleFieldUnit('accrualAmount')} />
          </div>
          <p className="text-[10px] text-muted-foreground/70">
            Per {accrualFrequencyLabel.toLowerCase()} period ({accrualUnitLabel})
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="accrualFrequency" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Accrual frequency
          </Label>
          <Select value={localSettings.accrualFrequency} onValueChange={handleAccrualFrequencyChange}>
            <SelectTrigger className="!h-9 w-full text-xs" size="sm">
              <SelectValue placeholder="Select frequency" />
            </SelectTrigger>
            <SelectContent>
              {ACCRUAL_FREQUENCIES.map((freq) => (
                <SelectItem key={freq.value} value={freq.value}>
                  {freq.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {localSettings.enableCarryoverLimit && (
        <div className="space-y-4 pt-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Advanced options</p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="maxCarryover" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Max carryover
              </Label>
              <div className="relative">
                <Input
                  id="maxCarryover"
                  name="maxCarryover"
                  type="number"
                  min="0"
                  step="0.5"
                  value={displayValues.maxCarryover}
                  onChange={(event) => handleNumericChangeWithUnit('maxCarryover', event.target.value)}
                  className="!h-9 pr-16 text-xs"
                />
                <UnitBadge unit={fieldUnits.maxCarryover} onToggle={() => toggleFieldUnit('maxCarryover')} />
              </div>
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
                className="!h-9 appearance-none pr-3 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="hoursPerDay" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Hours per PTO day
              </Label>
              <div className="relative">
                <Input
                  id="hoursPerDay"
                  name="hoursPerDay"
                  type="number"
                  min="0.25"
                  max="24"
                  step="0.25"
                  value={localSettings.hoursPerDay}
                  onChange={handleChange}
                  className="!h-9 pr-16 text-xs"
                />
                <UnitBadge unit="hours" labelOverride="Hours" />
              </div>
              <p className="text-[10px] text-muted-foreground/70">Used when converting PTO days to hours</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="hoursPerWeek" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Hours per week
              </Label>
              <div className="relative">
                <Input
                  id="hoursPerWeek"
                  name="hoursPerWeek"
                  type="number"
                  min="1"
                  max="168"
                  step="0.5"
                  value={localSettings.hoursPerWeek}
                  onChange={handleChange}
                  className="!h-9 pr-16 text-xs"
                />
                <UnitBadge unit="hours" labelOverride="Hours" />
              </div>
              <p className="text-[10px] text-muted-foreground/70">Aligns PTO plans with non-standard schedules</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PTOTab; 
