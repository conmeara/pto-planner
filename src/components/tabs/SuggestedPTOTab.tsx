"use client";

import React, { useMemo, useState } from 'react';
import {
  BrainCircuit,
  CalendarRange,
  Eraser,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import { usePlanner } from '@/contexts/PlannerContext';
import { formatDateLocal, parseDateLocal } from '@/lib/date-utils';
import type { RankingMode } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

const SuggestedPTOTab: React.FC = () => {
  const {
    suggestionPreferences,
    updateSuggestionPreferences,
    isGeneratingSuggestions,
    lastOptimizationResult,
    suggestedDays,
    applySuggestions,
    clearSuggestions,
    selectedDays,
  } = usePlanner();

  const [showAdvanced, setShowAdvanced] = useState(false);

  const breaks = lastOptimizationResult?.breaks ?? [];

  const metrics = useMemo(() => {
    return {
      breakCount: breaks.length,
      totalPTOUsed: lastOptimizationResult?.totalPTOUsed ?? 0,
      totalDaysOff: lastOptimizationResult?.totalDaysOff ?? 0,
      averageEfficiency: lastOptimizationResult?.averageEfficiency ?? 0,
      remainingPTO: lastOptimizationResult?.remainingPTO ?? 0,
    };
  }, [breaks.length, lastOptimizationResult]);

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

  const handleApply = () => {
    applySuggestions();
  };

  const handleClear = () => {
    clearSuggestions();
  };

  const disableApply = suggestedDays.length === 0;
  const disableClear = disableApply && breaks.length === 0;

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-border bg-card/40 p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-sm">Advanced settings</p>
            <p className="text-xs text-muted-foreground">
              Toggle timeframe, ranking, and PTO constraints if you want to fine-tune suggestions.
            </p>
          </div>
          <Switch
            checked={showAdvanced}
            onCheckedChange={setShowAdvanced}
            aria-label="Toggle advanced PTO suggestion settings"
          />
        </div>
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
                    value={formatDateLocal(suggestionPreferences.earliestStart)}
                    onChange={(event) => handleDateChange('earliestStart', event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="latestEnd">Latest end</Label>
                  <Input
                    id="latestEnd"
                    type="date"
                    value={formatDateLocal(suggestionPreferences.latestEnd)}
                    onChange={(event) => handleDateChange('latestEnd', event.target.value)}
                  />
                </div>
              </div>
              <div className="mt-4 space-y-1.5">
                <Label>Ranking mode</Label>
                <Select
                  value={suggestionPreferences.rankingMode}
                  onValueChange={(value) => handleRankingModeChange(value as RankingMode)}
                >
                  <SelectTrigger className="h-9">
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
                <p className="text-xs text-muted-foreground">
                  {selectedRankingMode?.description ?? 'Pick how you want breaks to be sorted.'}
                </p>
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

          <section className="rounded-3xl border border-border bg-card/40 p-4">
            <div className="grid gap-4 md:grid-cols-2">
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
              <div className="flex items-start justify-between gap-3 rounded-2xl border border-dashed border-border/70 bg-muted/40 p-3">
                <div>
                  <p className="font-medium text-sm">Stretch around existing PTO</p>
                  <p className="text-xs text-muted-foreground">
                    You currently have {selectedDays.length} PTO days selected. Treat them as anchors so
                    the engine extends those plans.
                  </p>
                </div>
                <Switch
                  checked={suggestionPreferences.extendExistingPTO}
                  onCheckedChange={handleToggleAnchors}
                  aria-label="Extend existing PTO"
                />
              </div>
            </div>
          </section>
        </>
      )}

      <section className="rounded-3xl border border-border bg-card/50 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-1 flex-wrap gap-4">
            <Metric label="Breaks planned" value={metrics.breakCount} />
            <Metric label="Total days off" value={`${metrics.totalDaysOff}d`} />
            <Metric label="PTO used" value={`${metrics.totalPTOUsed}d`} />
            <Metric label="Avg efficiency" value={formatEfficiency(metrics.averageEfficiency)} />
            <Metric label="Remaining PTO" value={`${metrics.remainingPTO}d`} />
            <Metric label="Safety reserve" value={`${suggestionPreferences.minPTOToKeep}d`} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className="gap-2"
              onClick={handleApply}
              disabled={disableApply}
            >
              <Sparkles className="h-4 w-4" />
              Apply {suggestedDays.length > 0 ? `${suggestedDays.length} day${suggestedDays.length !== 1 ? 's' : ''}` : ''}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="gap-2"
              onClick={handleClear}
              disabled={disableClear}
            >
              <Eraser className="h-4 w-4" />
              Clear
            </Button>
          </div>
        </div>
      </section>

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
}

const Metric: React.FC<MetricProps> = ({ label, value }) => {
  return (
    <div>
      <p className="text-[11px] uppercase text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
};

export default SuggestedPTOTab;
