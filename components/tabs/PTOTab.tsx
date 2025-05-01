"use client";

import React, { useState } from 'react';
import { Calendar, Palette } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

// PTO accrual frequency options
const ACCRUAL_FREQUENCIES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' }
];

// PTO color options
const PTO_COLORS = [
  { value: 'green-500', label: 'Green', class: 'bg-green-500' },
  { value: 'blue-500', label: 'Blue', class: 'bg-blue-500' },
  { value: 'purple-500', label: 'Purple', class: 'bg-purple-500' },
  { value: 'rose-500', label: 'Rose', class: 'bg-rose-500' },
  { value: 'amber-500', label: 'Amber', class: 'bg-amber-500' },
  { value: 'emerald-500', label: 'Emerald', class: 'bg-emerald-500' },
];

interface PTOSettings {
  initialBalance: number;
  asOfDate: string;
  accrualFrequency: string;
  accrualAmount: number;
  maxCarryover: number;
  ptoColor: string;
}

interface PTOTabProps {
  settings: PTOSettings;
  onSettingsChange: (settings: PTOSettings) => void;
}

const PTOTab: React.FC<PTOTabProps> = ({ settings, onSettingsChange }) => {
  const [localSettings, setLocalSettings] = useState<PTOSettings>(settings);

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

  // Save settings
  const handleSave = () => {
    onSettingsChange(localSettings);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
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
      
      <div className="pt-4 mt-2">
        <Button onClick={handleSave} className="w-full bg-rose-600 hover:bg-rose-700">
          Save Settings
        </Button>
      </div>
    </div>
  );
};

export default PTOTab; 