"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Calendar from '@/components/Calendar';
import IslandBar from '@/components/IslandBar';

interface Holiday {
  date: string;
  name: string;
  localName: string;
  countryCode: string;
  global: boolean;
}

export default function Home() {
  const [selectedDays, setSelectedDays] = useState<Date[]>([]);
  const [publicHolidays, setPublicHolidays] = useState<Date[]>([]);
  const [selectedCountry, setSelectedCountry] = useState('US');
  const [showHolidays, setShowHolidays] = useState(true);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  
  // Fetch holidays from API
  const fetchHolidays = useCallback(async (country: string, year: number) => {
    try {
      const response = await fetch(`/api/holidays?country=${country}&year=${year}`);
      const result = await response.json();
      
      if (result.success && result.data) {
        // Convert holiday date strings to Date objects
        const holidayDates = result.data.map((holiday: Holiday) => 
          new Date(holiday.date + 'T00:00:00')
        );
        setPublicHolidays(holidayDates);
      }
    } catch (error) {
      console.error('Error fetching holidays:', error);
    }
  }, []);
  
  // Fetch holidays on mount and when country/year changes
  useEffect(() => {
    fetchHolidays(selectedCountry, currentYear);
  }, [selectedCountry, currentYear, fetchHolidays]);
  
  // Handle day click
  const handleDayClick = (date: Date) => {
    // Find if the date is already selected
    const isSelected = selectedDays.some(selectedDay => 
      selectedDay.getDate() === date.getDate() && 
      selectedDay.getMonth() === date.getMonth() && 
      selectedDay.getFullYear() === date.getFullYear()
    );
    
    if (isSelected) {
      // Remove from selection
      setSelectedDays(selectedDays.filter(selectedDay => 
        selectedDay.getDate() !== date.getDate() || 
        selectedDay.getMonth() !== date.getMonth() || 
        selectedDay.getFullYear() !== date.getFullYear()
      ));
    } else {
      // Add to selection
      setSelectedDays([...selectedDays, date]);
    }
  };
  
  // Handle country change from IslandBar
  const handleCountryChange = (country: string) => {
    setSelectedCountry(country);
  };
  
  // Handle show holidays toggle
  const handleShowHolidaysChange = (show: boolean) => {
    setShowHolidays(show);
  };
  
  // Handle holiday refresh
  const handleRefreshHolidays = async () => {
    await fetchHolidays(selectedCountry, currentYear);
  };
  
  // Handle year change from Calendar
  const handleYearChange = (year: number) => {
    setCurrentYear(year);
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="pt-4 pb-10">
        <IslandBar 
          onCountryChange={handleCountryChange}
          onShowHolidaysChange={handleShowHolidaysChange}
          onRefreshHolidays={handleRefreshHolidays}
          selectedCountry={selectedCountry}
          showHolidays={showHolidays}
        />
      </div>
      
      <div className="container mx-auto px-4 pb-16">
        <h1 className="text-3xl font-bold mb-6 text-center">PTO Calendar</h1>
        <div className="w-full max-w-6xl mx-auto bg-gray-900 p-6 rounded-xl shadow-xl border border-gray-800">
          <Calendar 
            onDayClick={handleDayClick}
            selectedDays={selectedDays}
            publicHolidays={showHolidays ? publicHolidays : []}
            onYearChange={handleYearChange}
          />
        </div>
      </div>
    </main>
  );
}
