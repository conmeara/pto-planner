"use client";

import React, { useState, useEffect, useTransition } from 'react';
import { Calendar, Palette } from 'lucide-react';
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

// PTO color options (note: color is currently not stored in DB, for future use)
const PTO_COLORS = [
  { value: 'green-500', label: 'Green', class: 'bg-green-500' },
  { value: 'blue-500', label: 'Blue', class: 'bg-blue-500' },
  { value: 'purple-500', label: 'Purple', class: 'bg-purple-500' },
  { value: 'rose-500', label: 'Rose', class: 'bg-rose-500' },
  { value: 'amber-500', label: 'Amber', class: 'bg-amber-500' },
  { value: 'emerald-500', label: 'Emerald', class: 'bg-emerald-500' },
];

interface LocalPTOSettings {
  initialBalance: number;
  asOfDate: string;
  accrualFrequency: 'weekly' | 'biweekly' | 'monthly' | 'yearly';
  accrualAmount: number;
  maxCarryover: number;
  ptoColor: string;
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
      ptoColor: 'green-500',
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
        ptoColor: 'green-500',
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

  // Handle color selection
  const handleColorSelect = (color: string) => {
    setLocalSettings({
      ...localSettings,
      ptoColor: color
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
    <div className="space-y-4">
      {/* PTO Balance Card */}
      <PTOBalanceCard />

      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 mt-6">
        Configure your PTO settings. This information will be used to calculate your available PTO.
      </p>

      <div className="grid grid-cols-1 gap-4">
        {/* Initial Balance */}
        <div className="space-y-2">
          <Label htmlFor="initialBalance" className="text-sm font-medium">Initial PTO Balance (days)</Label>
          <Input
            id="initialBalance"
            name="initialBalance"
            type="number"
            min="0"
            step="0.5"
            value={localSettings.initialBalance}
            onChange={handleChange}
          />
        </div>
        
        {/* As-of Date */}
        <div className="space-y-2">
          <Label htmlFor="asOfDate" className="text-sm font-medium">As of Date</Label>
          <div className="relative">
            <Calendar className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              id="asOfDate"
              name="asOfDate"
              type="date"
              value={localSettings.asOfDate}
              onChange={handleChange}
              className="pl-8"
            />
          </div>
        </div>
        
        {/* Accrual Frequency */}
        <div className="space-y-2">
          <Label htmlFor="accrualFrequency" className="text-sm font-medium">Accrual Frequency</Label>
          <select
            id="accrualFrequency"
            name="accrualFrequency"
            value={localSettings.accrualFrequency}
            onChange={handleChange}
            className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
          >
            {ACCRUAL_FREQUENCIES.map((freq) => (
              <option key={freq.value} value={freq.value}>
                {freq.label}
              </option>
            ))}
          </select>
        </div>
        
        {/* Accrual Amount */}
        <div className="space-y-2">
          <Label htmlFor="accrualAmount" className="text-sm font-medium">
            Accrual Amount (days per {localSettings.accrualFrequency})
          </Label>
          <Input
            id="accrualAmount"
            name="accrualAmount"
            type="number"
            min="0"
            step="0.5"
            value={localSettings.accrualAmount}
            onChange={handleChange}
          />
        </div>
        
        {/* Max Carryover */}
        <div className="space-y-2">
          <Label htmlFor="maxCarryover" className="text-sm font-medium">Maximum PTO Carryover (days)</Label>
          <Input
            id="maxCarryover"
            name="maxCarryover"
            type="number"
            min="0"
            step="0.5"
            value={localSettings.maxCarryover}
            onChange={handleChange}
          />
        </div>
        
        {/* PTO Color */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-gray-500" />
            <Label className="text-sm font-medium">PTO Color</Label>
          </div>
          <div className="flex gap-2 flex-wrap">
            {PTO_COLORS.map((color) => (
              <button
                key={color.value}
                onClick={() => handleColorSelect(color.value)}
                className={`w-8 h-8 rounded-full ${color.class} ${
                  localSettings.ptoColor === color.value ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                }`}
                title={color.label}
                type="button"
                aria-label={`Select ${color.label} color`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Auto-save status indicator */}
      <div className="pt-4 mt-2 text-center">
        {isPending && (
          <p className="text-xs text-blue-600 dark:text-blue-400">
            Saving changes...
          </p>
        )}
        {saveStatus === 'success' && !isPending && (
          <p className="text-xs text-green-600 dark:text-green-400">
            ✓ Saved
          </p>
        )}
        {saveStatus === 'error' && (
          <p className="text-xs text-red-600 dark:text-red-400">
            ✗ Failed to save. Changes will retry automatically.
          </p>
        )}
      </div>
    </div>
  );
};

export default PTOTab; 