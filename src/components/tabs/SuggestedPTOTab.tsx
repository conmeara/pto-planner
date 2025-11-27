"use client";

import React, { useEffect, useMemo, useState, useLayoutEffect } from 'react';
import {
  BrainCircuit,
  CalendarRange,
  Eraser,
  SlidersHorizontal,
} from 'lucide-react';
import { usePlanner } from '@/contexts/PlannerContext';
import { formatDateLocal, parseDateLocal } from '@/lib/date-utils';
import type { RankingMode } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : React.useEffect;

interface SuggestedPTOTabProps {
  onHeaderActionsChange?: (actions: React.ReactNode | null) => void;
}

const EFFICIENCY_FORMATTER = new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type NumericPreferenceField =
  | 'minPTOToKeep'
  | 'maxConsecutiveDaysOff'
  | 'minConsecutiveDaysOff'
  | 'minSpacingBetweenBreaks'
  | 'streakHighlightThreshold';

const RANKING_MODE_OPTIONS: Array<{ value: RankingMode; label: string; description: string }> = [
  {
    value: 'efficiency',
    label: 'Efficiency',
    description: 'Prioritize breaks that return the most days off per PTO day.',
  },
  {
    value: 'longest',
    label: 'Longest stretch',
    description: 'Favor the largest consecutive day windows, even if PTO cost is higher.',
  },
  {
    value: 'least-pto',
    label: 'Least PTO first',
    description: 'Use as few PTO days as possible while still meeting your filters.',
  },
  {
    value: 'earliest',
    label: 'Earliest first',
    description: 'Surface breaks closest to your start date.',
  },
];

const formatEfficiency = (value: number) => (value > 0 ? `${EFFICIENCY_FORMATTER.format(value)}×` : '—');

const computeTomorrowDateString = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  today.setDate(today.getDate() + 1);
  return formatDateLocal(today);
};

const SuggestedPTOTab: React.FC<SuggestedPTOTabProps> = ({ onHeaderActionsChange }) => {
  const {
    suggestionPreferences,
    updateSuggestionPreferences,
    isGeneratingSuggestions,
    lastOptimizationResult,
    clearSuggestions,
    selectedDays,
  } = usePlanner();

  const [minDate, setMinDate] = useState(() => computeTomorrowDateString());

  useEffect(() => {
    const msUntilNextMidnight = () => {
      const now = new Date();
      const nextMidnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        0,
        0,
        0,
        0
      );
      return nextMidnight.getTime() - now.getTime();
    };

    let timer: ReturnType<typeof setTimeout>;

    const scheduleUpdate = () => {
      timer = setTimeout(() => {
        setMinDate(computeTomorrowDateString());
        scheduleUpdate();
      }, msUntilNextMidnight());
    };

    scheduleUpdate();

    return () => {
      clearTimeout(timer);
    };
  }, []);

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [renderedInHeader, setRenderedInHeader] = useState(false);

  const breaks = lastOptimizationResult?.breaks ?? [];

  const metrics = useMemo(() => {
    const breakCount = breaks.length;
    const totalPTOUsed = lastOptimizationResult?.totalPTOUsed ?? 0;
    const totalDaysOff = lastOptimizationResult?.totalDaysOff ?? 0;
    const averageEfficiency = lastOptimizationResult?.averageEfficiency ?? 0;
    const remainingPTO = lastOptimizationResult?.remainingPTO ?? 0;

    const streakLengths = breaks.map((breakItem) => breakItem.totalDaysOff);
    const longestStreak = streakLengths.length > 0 ? Math.max(...streakLengths) : 0;
    const averageStreak =
      streakLengths.length > 0
        ? streakLengths.reduce((sum, length) => sum + length, 0) / streakLengths.length
        : 0;

    return {
      breakCount,
      totalPTOUsed,
      totalDaysOff,
      averageEfficiency,
      remainingPTO,
      longestStreak,
      averageStreak,
    };
  }, [breaks, lastOptimizationResult]);

  const selectedRankingMode = useMemo(
    () => RANKING_MODE_OPTIONS.find((option) => option.value === suggestionPreferences.rankingMode),
    [suggestionPreferences.rankingMode]
  );

  const handleDateChange = (field: 'earliestStart' | 'latestEnd', value: string) => {
    if (!value) return;
    const parsed = parseDateLocal(value);
    if (Number.isNaN(parsed.getTime())) {
      return;
    }
    updateSuggestionPreferences({
      [field]: parsed,
    });
  };

  const handleNumericChange = (field: NumericPreferenceField, value: string, min: number) => {
    if (value === '') {
      return;
    }
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      return;
    }
    updateSuggestionPreferences((prev) => ({
      ...prev,
      [field]: Math.max(min, parsed),
    }));
  };

  const handleRankingModeChange = (mode: RankingMode) => {
    updateSuggestionPreferences({ rankingMode: mode });
  };

  const handleToggleAnchors = (checked: boolean) => {
    updateSuggestionPreferences({ extendExistingPTO: checked });
  };

  const handleClear = () => {
    clearSuggestions();
  };

  const disableClear = breaks.length === 0;

  const advancedToggleNode = useMemo(
    () => (
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-2"
          onClick={handleClear}
          disabled={disableClear}
        >
          <Eraser className="h-4 w-4" />
          Clear
        </Button>
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <label htmlFor="advanced-toggle-suggested" className="cursor-pointer">Advanced</label>
          <Switch
            id="advanced-toggle-suggested"
            checked={showAdvanced}
            onCheckedChange={setShowAdvanced}
            aria-label="Toggle advanced PTO suggestion settings"
          />
        </div>
      </div>
    ),
    [showAdvanced, disableClear, handleClear]
  );

  useIsomorphicLayoutEffect(() => {
    if (!onHeaderActionsChange) {
      setRenderedInHeader(false);
      return;
    }

    onHeaderActionsChange(advancedToggleNode);
    setRenderedInHeader(true);

    return () => {
      setRenderedInHeader(false);
      onHeaderActionsChange(null);
    };
  }, [advancedToggleNode, onHeaderActionsChange]);

  return (
    <div className="space-y-5">
      {!renderedInHeader && (
        <div className="flex justify-end">{advancedToggleNode}</div>
      )}

      <section className="rounded-3xl border border-border bg-card/50 p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-shrink-0">
            <Label className="text-[11px] uppercase text-muted-foreground">Ranking mode</Label>
            <Select
              value={suggestionPreferences.rankingMode}
              onValueChange={(value) => handleRankingModeChange(value as RankingMode)}
            >
              <SelectTrigger className="mt-1.5 h-9 w-full sm:w-[180px]">
                <SelectValue placeholder="Pick a ranking mode" />
              </SelectTrigger>
              <SelectContent>
                {RANKING_MODE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <Metric label="Breaks planned" value={metrics.breakCount} />
            <Metric label="Longest break" value={`${metrics.longestStreak}d`} />
            <Metric label="Total days off" value={`${metrics.totalDaysOff}d`} className="hidden xs:block" />
            <Metric label="PTO used" value={`${metrics.totalPTOUsed}d`} className="hidden sm:block" />
            <Metric label="Avg efficiency" value={formatEfficiency(metrics.averageEfficiency)} className="hidden md:block" />
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {selectedRankingMode?.description ?? 'Pick how you want breaks to be sorted.'}
        </p>
      </section>

      {showAdvanced && (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <ConfigCard
              icon={<CalendarRange className="h-4 w-4 text-primary" />}
              title="Timeframe"
              description="Tell the engine where to look for clever gaps."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="earliestStart">Earliest start</Label>
                  <Input
                    id="earliestStart"
                    type="date"
                    min={minDate}
                    value={formatDateLocal(suggestionPreferences.earliestStart)}
                    onChange={(event) => handleDateChange('earliestStart', event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="latestEnd">Latest end</Label>
                  <Input
                    id="latestEnd"
                    type="date"
                    min={minDate}
                    value={formatDateLocal(suggestionPreferences.latestEnd)}
                    onChange={(event) => handleDateChange('latestEnd', event.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="minSpacingBetweenBreaks">Spacing between breaks (days)</Label>
                  <Input
                    id="minSpacingBetweenBreaks"
                    type="number"
                    min={0}
                    value={suggestionPreferences.minSpacingBetweenBreaks}
                    onChange={(event) =>
                      handleNumericChange('minSpacingBetweenBreaks', event.target.value, 0)
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Reserve breathing room so you are not in PTO mode every other week.
                  </p>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-border/70 bg-muted/40 p-3">
                  <p className="font-medium text-sm">Stretch around existing PTO</p>
                  <Switch
                    checked={suggestionPreferences.extendExistingPTO}
                    onCheckedChange={handleToggleAnchors}
                    aria-label="Extend existing PTO"
                  />
                </div>
              </div>
            </ConfigCard>

            <ConfigCard
              icon={<SlidersHorizontal className="h-4 w-4 text-primary" />}
              title="Usage constraints"
              description="Fine-tune how aggressive the recommendations should be."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <NumberField
                  id="minPTOToKeep"
                  label="Safety reserve"
                  min={0}
                  value={suggestionPreferences.minPTOToKeep}
                  onChange={(value) => handleNumericChange('minPTOToKeep', value, 0)}
                  suffix="days"
                />
                <NumberField
                  id="maxConsecutiveDaysOff"
                  label="Max consecutive days off"
                  min={suggestionPreferences.minConsecutiveDaysOff}
                  value={suggestionPreferences.maxConsecutiveDaysOff}
                  onChange={(value) =>
                    handleNumericChange(
                      'maxConsecutiveDaysOff',
                      value,
                      suggestionPreferences.minConsecutiveDaysOff
                    )
                  }
                  suffix="days"
                />
                <NumberField
                  id="minConsecutiveDaysOff"
                  label="Min consecutive days off"
                  min={1}
                  value={suggestionPreferences.minConsecutiveDaysOff}
                  onChange={(value) => handleNumericChange('minConsecutiveDaysOff', value, 1)}
                  suffix="days"
                />
                <NumberField
                  id="streakHighlightThreshold"
                  label="Highlight streaks of at least"
                  min={3}
                  value={suggestionPreferences.streakHighlightThreshold}
                  onChange={(value) => handleNumericChange('streakHighlightThreshold', value, 3)}
                  suffix="days"
                />
              </div>
            </ConfigCard>
          </div>
        </>
      )}

      {isGeneratingSuggestions && (
        <div className="flex items-center gap-2 rounded-3xl border border-dashed border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          <BrainCircuit className="h-4 w-4 animate-spin text-primary" />
          Crunching weekends, holidays, and anchors…
        </div>
      )}
    </div>
  );
};

interface ConfigCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}

const ConfigCard: React.FC<ConfigCardProps> = ({ icon, title, description, children }) => {
  return (
    <section className="rounded-3xl border border-border bg-card/50 p-4">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-2xl border border-border/70 bg-muted/60">
          {icon}
        </div>
        <div>
          <h3 className="font-semibold text-sm">{title}</h3>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
};

interface NumberFieldProps {
  id: string;
  label: string;
  value: number;
  min?: number;
  suffix?: string;
  onChange: (value: string) => void;
}

const NumberField: React.FC<NumberFieldProps> = ({ id, label, value, min, suffix, onChange }) => {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type="number"
          min={min}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={suffix ? 'pr-16' : undefined}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
};

interface MetricProps {
  label: string;
  value: string | number;
  className?: string;
}

const Metric: React.FC<MetricProps> = ({ label, value, className }) => {
  return (
    <div className={className}>
      <p className="text-[11px] uppercase text-muted-foreground whitespace-nowrap">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
};

export default SuggestedPTOTab;
