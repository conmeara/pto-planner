"use client";

import React, { useState, useEffect } from 'react';
import { Globe, RefreshCw, Calendar } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

// Expanded country list for comprehensive holiday support
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
  { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },
  { code: 'MX', name: 'Mexico' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' },
  { code: 'FI', name: 'Finland' },
  { code: 'PL', name: 'Poland' },
  { code: 'CH', name: 'Switzerland' },
];

interface Holiday {
  date: string;
  name: string;
  localName: string;
  countryCode: string;
  global: boolean;
}

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
  const [upcomingHolidays, setUpcomingHolidays] = useState<Holiday[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  // Fetch upcoming holidays for preview
  useEffect(() => {
    const fetchUpcomingHolidays = async () => {
      try {
        const currentYear = new Date().getFullYear();
        const response = await fetch(`/api/holidays?country=${selectedCountry}&year=${currentYear}`);
        const result = await response.json();
        
        if (result.success && result.data) {
          // Filter for upcoming holidays only (from today onwards)
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const upcoming = result.data
            .filter((holiday: Holiday) => {
              const holidayDate = new Date(holiday.date + 'T00:00:00');
              return holidayDate >= today;
            })
            .slice(0, 5); // Show only next 5 holidays
          
          setUpcomingHolidays(upcoming);
        }
      } catch (error) {
        console.error('Error fetching holidays preview:', error);
      }
    };
    
    fetchUpcomingHolidays();
  }, [selectedCountry]);
  
  // Handle refresh button click
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefreshHolidays();
      setLastUpdated(new Date());
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
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
      
      {/* Upcoming Holidays Preview */}
      {showHolidays && upcomingHolidays.length > 0 && (
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium mb-3 flex items-center">
            <Calendar className="mr-2 h-4 w-4" />
            Upcoming Holidays
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {upcomingHolidays.map((holiday, index) => (
              <div 
                key={index}
                className="flex justify-between items-start p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {holiday.name}
                  </p>
                  {holiday.localName !== holiday.name && (
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {holiday.localName}
                    </p>
                  )}
                </div>
                <span className="text-xs font-medium text-blue-600 dark:text-blue-400 whitespace-nowrap ml-2">
                  {formatDate(holiday.date)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      
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
          Last updated: {lastUpdated.toLocaleDateString()}
        </p>
      </div>
      
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Public holidays are fetched from Nager.Date API, a free global holiday database. 
          Holidays are automatically updated when you change countries or years.
        </p>
      </div>
    </div>
  );
};

export default HolidaysTab; 