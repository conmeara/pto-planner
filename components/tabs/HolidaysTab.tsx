"use client";

import React, { useState } from 'react';
import { Globe, RefreshCw } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

// Example country list - this would be expanded in a real app
const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'JP', name: 'Japan' },
  { code: 'CN', name: 'China' },
  { code: 'BR', name: 'Brazil' },
  { code: 'IN', name: 'India' },
];

interface HolidaysTabProps {
  selectedCountry: string;
  showHolidays: boolean;
  onCountryChange: (country: string) => void;
  onShowHolidaysChange: (show: boolean) => void;
  onRefreshHolidays: () => void;
}

const HolidaysTab: React.FC<HolidaysTabProps> = ({
  selectedCountry,
  showHolidays,
  onCountryChange,
  onShowHolidaysChange,
  onRefreshHolidays
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Handle refresh button click
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefreshHolidays();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
        Configure public holidays for your country. These will be highlighted on the calendar
        and can be considered when planning your PTO.
      </p>
      
      {/* Country Selection */}
      <div className="space-y-2">
        <Label htmlFor="country" className="text-sm font-medium">Country</Label>
        <div className="relative">
          <Globe className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
          <select
            id="country"
            value={selectedCountry}
            onChange={(e) => onCountryChange(e.target.value)}
            className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md pl-8 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Show Holidays Toggle */}
      <div className="flex items-center space-x-2 pt-2">
        <Checkbox 
          id="show-holidays" 
          checked={showHolidays}
          onCheckedChange={(checked) => onShowHolidaysChange(!!checked)}
          className="data-[state=checked]:bg-blue-500"
        />
        <Label 
          htmlFor="show-holidays"
          className="text-sm font-medium leading-none"
        >
          Show holidays on calendar
        </Label>
      </div>
      
      {/* Refresh Holidays Button */}
      <div className="pt-4">
        <Button 
          onClick={handleRefresh}
          variant="outline"
          className="w-full"
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Refreshing...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Holidays
            </>
          )}
        </Button>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Last updated: {new Date().toLocaleDateString()}
        </p>
      </div>
      
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Public holidays are fetched from a global holiday database. You can refresh them annually or after changing countries.
        </p>
      </div>
    </div>
  );
};

export default HolidaysTab; 