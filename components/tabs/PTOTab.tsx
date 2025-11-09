"use client";

import React, { useState, useEffect, useTransition } from 'react';
import { Calendar } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { usePlanner } from '@/contexts/PlannerContext';
import { savePTOSettings, addAccrualRule } from '@/app/actions/settings-actions';
import PTOBalanceCard from '@/components/PTOBalanceCard';
// PTO accrual frequency options
const ACCRUAL_FREQUENCIES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' }
];

interface LocalPTOSettings {
  initialBalance: number;
  asOfDate: string;
  accrualFrequency: 'weekly' | 'biweekly' | 'monthly' | 'yearly';
  accrualAmount: number;
  maxCarryover: number;
}

const PTOTab: React.FC = () => {
  const { plannerData, setPlannerData, isAuthenticated, getSettings, saveLocalSettings } = usePlanner();
  const [isPending, startTransition] = useTransition();
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Initialize local settings from planner data or localStorage
  const [localSettings, setLocalSettings] = useState<LocalPTOSettings>(() => {
    const settings = getSettings();
    return {
      initialBalance: settings.initial_balance || 15,
      asOfDate: settings.pto_start_date || new Date().toISOString().split('T')[0],
      accrualFrequency: 'monthly',
      accrualAmount: 1.25,
      maxCarryover: settings.carry_over_limit || 5,
    };
  });

  // Update local settings when planner data changes
  useEffect(() => {
    const settings = getSettings();
    if (settings) {
      setLocalSettings({
        initialBalance: settings.initial_balance || 15,
        asOfDate: settings.pto_start_date || new Date().toISOString().split('T')[0],
        accrualFrequency: 'monthly',
        accrualAmount: 1.25,
        maxCarryover: settings.carry_over_limit || 5,
      });
    }
  }, [plannerData?.settings, getSettings]);

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    // Convert numeric fields to numbers
    let parsedValue: string | number = value;
    if (['initialBalance', 'accrualAmount', 'maxCarryover'].includes(name)) {
      parsedValue = parseFloat(value) || 0;
    }

    setLocalSettings({
      ...localSettings,
      [name]: parsedValue
    });
  };

  // Save settings (to localStorage or database)
  const handleSave = React.useCallback(async () => {
    setSaveStatus('idle');

    // If not authenticated, save to localStorage
    if (!isAuthenticated) {
      const settings = {
        initial_balance: localSettings.initialBalance,
        pto_start_date: localSettings.asOfDate,
        carry_over_limit: localSettings.maxCarryover,
        pto_display_unit: 'days' as const,
        hours_per_day: 8,
      };
      saveLocalSettings(settings);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
      return;
    }

    // If authenticated, save to database
    startTransition(async () => {
      try {
        // Save PTO settings
        const settingsResult = await savePTOSettings({
          pto_start_date: localSettings.asOfDate,
          initial_balance: localSettings.initialBalance,
          carry_over_limit: localSettings.maxCarryover,
          max_balance: undefined,
          renewal_date: undefined,
          allow_negative_balance: false,
          pto_display_unit: 'days',
          hours_per_day: 8,
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
  }, [localSettings.initialBalance, localSettings.asOfDate, localSettings.maxCarryover, handleSave]);

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1.4fr),minmax(0,1fr)] md:items-start">
        <div className="space-y-3 rounded-3xl border border-[hsl(var(--border) / 0.7)] bg-[hsl(var(--card) / 0.78)] p-4 shadow-[0_36px_90px_-48px_rgba(38,73,70,0.6)] backdrop-blur-md">
          <div className="flex items-center justify-end">
            <div className="text-[11px] text-[hsl(var(--ghibli-forest) / 0.65)]">
              {isPending ? (
                <span className="rounded-full bg-[hsl(var(--primary) / 0.2)] px-2 py-0.5 text-[hsl(var(--primary) / 0.65)]">
                  Saving…
                </span>
              ) : saveStatus === 'success' ? (
                <span className="rounded-full bg-[hsl(var(--secondary) / 0.25)] px-2 py-0.5 text-[hsl(var(--secondary-foreground))]">
                  Saved
                </span>
              ) : saveStatus === 'error' ? (
                <span className="rounded-full bg-[hsl(var(--destructive) / 0.2)] px-2 py-0.5 text-[hsl(var(--destructive))]">
                  Will retry
                </span>
              ) : (
                <span className="rounded-full bg-[hsl(var(--muted) / 0.55)] px-2 py-0.5 text-[hsl(var(--ghibli-forest) / 0.7)]">
                  Synced
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label
                htmlFor="initialBalance"
                className="text-xs font-semibold uppercase tracking-[0.08em] text-[hsl(var(--ghibli-forest) / 0.6)]"
              >
                Initial balance (days)
              </Label>
              <Input
                id="initialBalance"
                name="initialBalance"
                type="number"
                min="0"
                step="0.5"
                value={localSettings.initialBalance}
                onChange={handleChange}
                className="!h-8 rounded-lg border-[hsl(var(--border) / 0.7)] bg-[hsl(var(--card))] px-2 py-1 text-xs shadow-[0_14px_30px_-22px_rgba(42,84,74,0.4)]"
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="asOfDate"
                className="text-xs font-semibold uppercase tracking-[0.08em] text-[hsl(var(--ghibli-forest) / 0.6)]"
              >
                As of date
              </Label>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-[hsl(var(--primary) / 0.5)]" />
                <Input
                  id="asOfDate"
                  name="asOfDate"
                  type="date"
                  value={localSettings.asOfDate}
                  onChange={handleChange}
                  className="!h-8 rounded-lg border-[hsl(var(--border) / 0.7)] bg-[hsl(var(--card))] pl-8 pr-2 text-xs shadow-[0_14px_30px_-22px_rgba(42,84,74,0.4)]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="accrualFrequency"
                className="text-xs font-semibold uppercase tracking-[0.08em] text-[hsl(var(--ghibli-forest) / 0.6)]"
              >
                Accrual frequency
              </Label>
              <select
                id="accrualFrequency"
                name="accrualFrequency"
                value={localSettings.accrualFrequency}
                onChange={handleChange}
                className="w-full rounded-lg border border-[hsl(var(--border) / 0.7)] bg-[hsl(var(--card))] py-1.5 px-2 text-xs text-[hsl(var(--foreground))] shadow-[0_14px_30px_-22px_rgba(42,84,74,0.4)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary) / 0.35)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {ACCRUAL_FREQUENCIES.map((freq) => (
                  <option key={freq.value} value={freq.value}>
                    {freq.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="accrualAmount"
                className="text-xs font-semibold uppercase tracking-[0.08em] text-[hsl(var(--ghibli-forest) / 0.6)]"
              >
                Accrual amount
              </Label>
              <Input
                id="accrualAmount"
                name="accrualAmount"
                type="number"
                min="0"
                step="0.5"
                value={localSettings.accrualAmount}
                onChange={handleChange}
                className="!h-8 rounded-lg border-[hsl(var(--border) / 0.7)] bg-[hsl(var(--card))] px-2 py-1 text-xs shadow-[0_14px_30px_-22px_rgba(42,84,74,0.4)]"
              />
              <p className="text-[10px] text-[hsl(var(--ghibli-forest) / 0.5)]">
                Per {localSettings.accrualFrequency} period
              </p>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="maxCarryover"
                className="text-xs font-semibold uppercase tracking-[0.08em] text-[hsl(var(--ghibli-forest) / 0.6)]"
              >
                Max carryover (days)
              </Label>
              <Input
                id="maxCarryover"
                name="maxCarryover"
                type="number"
                min="0"
                step="0.5"
                value={localSettings.maxCarryover}
                onChange={handleChange}
                className="!h-8 rounded-lg border-[hsl(var(--border) / 0.7)] bg-[hsl(var(--card))] px-2 py-1 text-xs shadow-[0_14px_30px_-22px_rgba(42,84,74,0.4)]"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <PTOBalanceCard />
          <div className="rounded-2xl border border-[hsl(var(--border) / 0.65)] bg-[hsl(var(--card) / 0.68)] p-3 text-[11px] text-[hsl(var(--ghibli-forest) / 0.65)] shadow-[0_28px_70px_-48px_rgba(42,84,74,0.45)] backdrop-blur-sm">
            PTO totals update the moment you change a field. Your selections and accrual details sync automatically to your account or local device.
          </div>
        </div>
      </div>
    </div>
  );
};

export default PTOTab; 