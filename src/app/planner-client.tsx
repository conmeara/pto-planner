'use client';

import React from 'react';
import Calendar from '@/components/Calendar';
import IslandBar from '@/components/IslandBar';
import DataConflictModal from '@/components/DataConflictModal';
import { CalendarNavigationProvider } from '@/contexts/CalendarNavigationContext';
import { PlannerProvider, usePlanner } from '@/contexts/PlannerContext';
import type { PlannerData } from '@/types';

interface PlannerClientProps {
  initialData: PlannerData | null;
}

function ConflictModalWrapper() {
  const { showConflictModal, conflictData, resolveConflict } = usePlanner();

  return (
    <DataConflictModal
      open={showConflictModal}
      conflictData={conflictData}
      onResolve={resolveConflict}
    />
  );
}

export default function PlannerClient({ initialData }: PlannerClientProps) {
  return (
    <PlannerProvider initialData={initialData}>
      <CalendarNavigationProvider>
        <main className="container mx-auto px-4 py-4">
          <div className="flex flex-col gap-4">
            <IslandBar />
            <Calendar />
          </div>
        </main>
        <ConflictModalWrapper />
      </CalendarNavigationProvider>
    </PlannerProvider>
  );
}
