'use client';

import React from 'react';
import Calendar from '@/components/Calendar';
import IslandBar from '@/components/IslandBar';
import { PlannerProvider } from '@/contexts/PlannerContext';
import type { PlannerData } from '@/types';

interface PlannerClientProps {
  initialData: PlannerData | null;
}

export default function PlannerClient({ initialData }: PlannerClientProps) {
  return (
    <PlannerProvider initialData={initialData}>
      <div className="min-h-screen bg-gradient-to-b from-sky-50 to-green-50 dark:from-gray-900 dark:to-gray-800">
        <IslandBar />
        <main className="container mx-auto px-4 pt-32 pb-16">
          <Calendar />
        </main>
      </div>
    </PlannerProvider>
  );
}
