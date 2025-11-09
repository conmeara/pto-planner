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
        <div className="space-y-3 rounded-xl border border-slate-200/70 bg-white/80 p-3 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/60">
          <div className="flex items-center justify-end">
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              {isPending ? (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300">Saving…</span>
              ) : saveStatus === 'success' ? (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300">Saved</span>
              ) : saveStatus === 'error' ? (
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300">Will retry</span>
              ) : (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800">Synced</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="initialBalance" className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-300">
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
                className="!h-8 px-2 py-1 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="asOfDate" className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-300">
                As of date
              </Label>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
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
              <Label htmlFor="accrualFrequency" className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-300">
                Accrual frequency
              </Label>
              <select
                id="accrualFrequency"
                name="accrualFrequency"
                value={localSettings.accrualFrequency}
                onChange={handleChange}
                className="w-full rounded-md border border-slate-200 bg-white py-1.5 px-2 text-xs text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-400 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-rose-500"
              >
                {ACCRUAL_FREQUENCIES.map((freq) => (
                  <option key={freq.value} value={freq.value}>
                    {freq.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="accrualAmount" className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-300">
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
                className="!h-8 px-2 py-1 text-xs"
              />
              <p className="text-[10px] text-slate-400 dark:text-slate-500">Per {localSettings.accrualFrequency} period</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="maxCarryover" className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-300">
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
                className="!h-8 px-2 py-1 text-xs"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <PTOBalanceCard />
          <div className="rounded-lg border border-slate-200/70 bg-white/90 p-2.5 text-[11px] text-slate-600 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-slate-300">
            PTO totals update the moment you change a field. Your selections and accrual details sync automatically to your account or local device.
          </div>
        </div>
      </div>
    </div>
  );
};

export default PTOTab; 