"use client";

import React, { useState } from 'react';
import Calendar from '@/components/Calendar';
import IslandBar from '@/components/IslandBar';

export default function Home() {
  const [selectedDays, setSelectedDays] = useState<Date[]>([]);
  
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

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="pt-4 pb-10">
        <IslandBar />
      </div>
      
      <div className="container mx-auto px-4 pb-16">
        <h1 className="text-3xl font-bold mb-6 text-center">PTO Calendar</h1>
        <div className="w-full max-w-6xl mx-auto bg-gray-900 p-6 rounded-xl shadow-xl border border-gray-800">
          <Calendar 
            onDayClick={handleDayClick}
            selectedDays={selectedDays}
          />
        </div>
      </div>
    </main>
  );
}
