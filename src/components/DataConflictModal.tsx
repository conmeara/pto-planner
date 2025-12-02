"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Cloud, Smartphone, GitMerge, Loader2 } from 'lucide-react';

export type ConflictResolution = 'keep-synced' | 'use-local' | 'merge';

export interface ConflictData {
  localPtoDays: number;
  syncedPtoDays: number;
  localHolidays: number;
  syncedHolidays: number;
  hasLocalSettings: boolean;
}

interface DataConflictModalProps {
  open: boolean;
  conflictData: ConflictData | null;
  onResolve: (resolution: ConflictResolution) => Promise<void>;
}

const DataConflictModal: React.FC<DataConflictModalProps> = ({
  open,
  conflictData,
  onResolve,
}) => {
  const [isResolving, setIsResolving] = useState(false);
  const [selectedOption, setSelectedOption] = useState<ConflictResolution | null>(null);

  const handleResolve = async (resolution: ConflictResolution) => {
    setSelectedOption(resolution);
    setIsResolving(true);
    try {
      await onResolve(resolution);
    } finally {
      setIsResolving(false);
      setSelectedOption(null);
    }
  };

  if (!conflictData) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Data Found on This Device</DialogTitle>
          <DialogDescription>
            You have existing data in your account, but we also found unsaved data on this device. How would you like to proceed?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {/* Summary of data */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border border-border bg-muted/50 p-3">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <Cloud className="h-4 w-4 text-primary" />
                Synced Data
              </div>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                <li>{conflictData.syncedPtoDays} PTO day{conflictData.syncedPtoDays !== 1 ? 's' : ''}</li>
                <li>{conflictData.syncedHolidays} holiday{conflictData.syncedHolidays !== 1 ? 's' : ''}</li>
              </ul>
            </div>
            <div className="rounded-lg border border-border bg-muted/50 p-3">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <Smartphone className="h-4 w-4 text-amber-500" />
                Local Data
              </div>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                <li>{conflictData.localPtoDays} PTO day{conflictData.localPtoDays !== 1 ? 's' : ''}</li>
                <li>{conflictData.localHolidays} holiday{conflictData.localHolidays !== 1 ? 's' : ''}</li>
                {conflictData.hasLocalSettings && <li>Custom settings</li>}
              </ul>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-2">
            <button
              onClick={() => handleResolve('keep-synced')}
              disabled={isResolving}
              className="w-full rounded-lg border border-border bg-card p-3 text-left transition-colors hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 font-medium text-foreground">
                    <Cloud className="h-4 w-4 text-primary" />
                    Keep synced data
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Use your existing account data. Local data will be discarded.
                  </p>
                </div>
                {isResolving && selectedOption === 'keep-synced' && (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                )}
              </div>
            </button>

            <button
              onClick={() => handleResolve('use-local')}
              disabled={isResolving}
              className="w-full rounded-lg border border-border bg-card p-3 text-left transition-colors hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 font-medium text-foreground">
                    <Smartphone className="h-4 w-4 text-amber-500" />
                    Use local data
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Replace your synced data with the data from this device.
                  </p>
                </div>
                {isResolving && selectedOption === 'use-local' && (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                )}
              </div>
            </button>

            <button
              onClick={() => handleResolve('merge')}
              disabled={isResolving}
              className="w-full rounded-lg border-2 border-primary bg-primary/5 p-3 text-left transition-colors hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 font-medium text-foreground">
                    <GitMerge className="h-4 w-4 text-primary" />
                    Merge both
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      Recommended
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Combine both datasets. Duplicate dates will be kept from your synced data.
                  </p>
                </div>
                {isResolving && selectedOption === 'merge' && (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                )}
              </div>
            </button>
          </div>
        </div>

        <DialogFooter className="sm:justify-center">
          <p className="text-center text-[10px] text-muted-foreground">
            This choice cannot be undone. Your selection will sync across all your devices.
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DataConflictModal;
