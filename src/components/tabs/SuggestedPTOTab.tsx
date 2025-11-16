"use client";

import React, { useMemo } from 'react';
import {
  Anchor as AnchorIcon,
  BrainCircuit,
  CalendarRange,
  Eraser,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import { usePlanner } from '@/contexts/PlannerContext';
import { formatDateLocal, parseDateLocal } from '@/lib/date-utils';
import type { RankingMode, SuggestedBreak } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const EFFICIENCY_FORMATTER = new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const SHORT_DATE = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
const LONG_DATE = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

type NumericPreferenceField =
  | 'maxPTOToUse'
  | 'maxPTOPerBreak'
  | 'minConsecutiveDaysOff'
  | 'maxSuggestions'
  | 'minSpacingBetweenBreaks';

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

const formatDisplayDate = (date: Date) => LONG_DATE.format(date);
const formatDisplayRange = (start: Date, end: Date) =>
  start.getTime() === end.getTime()
    ? formatDisplayDate(start)
    : `${formatDisplayDate(start)} → ${formatDisplayDate(end)}`;

const formatEfficiency = (value: number) => (value > 0 ? `${EFFICIENCY_FORMATTER.format(value)}×` : '—');

const SuggestedPTOTab: React.FC = () => {
  const {
    suggestionPreferences,
    updateSuggestionPreferences,
    generateSuggestions,
    isGeneratingSuggestions,
    lastOptimizationResult,
    suggestedDays,
    applySuggestions,
    clearSuggestions,
    selectedDays,
  } = usePlanner();

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

  const handleRegenerate = () => {
    generateSuggestions();
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
              id="maxPTOToUse"
              label="Max PTO to use"
              min={1}
              value={suggestionPreferences.maxPTOToUse}
              onChange={(value) => handleNumericChange('maxPTOToUse', value, 1)}
              suffix="days"
            />
            <NumberField
              id="maxPTOPerBreak"
              label="Max PTO per break"
              min={1}
              value={suggestionPreferences.maxPTOPerBreak}
              onChange={(value) => handleNumericChange('maxPTOPerBreak', value, 1)}
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
              id="maxSuggestions"
              label="Max suggestions"
              min={1}
              value={suggestionPreferences.maxSuggestions}
              onChange={(value) => handleNumericChange('maxSuggestions', value, 1)}
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

      <section className="rounded-3xl border border-border bg-card/50 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-1 flex-wrap gap-4">
            <Metric label="Breaks planned" value={metrics.breakCount} />
            <Metric label="Total days off" value={`${metrics.totalDaysOff}d`} />
            <Metric
              label="PTO used"
              value={`${metrics.totalPTOUsed}/${suggestionPreferences.maxPTOToUse}d`}
            />
            <Metric label="Avg efficiency" value={formatEfficiency(metrics.averageEfficiency)} />
            <Metric label="Remaining PTO" value={`${metrics.remainingPTO}d`} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              className="gap-2"
              disabled={isGeneratingSuggestions}
              onClick={handleRegenerate}
            >
              {isGeneratingSuggestions ? (
                <>
                  <BrainCircuit className="h-4 w-4 animate-spin" />
                  Regenerating…
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Regenerate
                </>
              )}
            </Button>
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

      <section className="space-y-3">
        {breaks.length === 0 ? (
          <EmptyState />
        ) : (
          breaks.map((breakItem, index) => (
            <BreakCard key={breakItem.id} breakItem={breakItem} index={index} />
          ))
        )}
      </section>
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

interface BreakCardProps {
  breakItem: SuggestedBreak;
  index: number;
}

const BreakCard: React.FC<BreakCardProps> = ({ breakItem, index }) => {
  const beforeAnchor = breakItem.anchors.before;
  const afterAnchor = breakItem.anchors.after;
  const ptoDayBadges = useMemo(() => {
    const MAX_BADGES = 6;
    const dates = breakItem.ptoDays;
    if (dates.length <= MAX_BADGES) {
      return dates.map((date) => ({
        label: SHORT_DATE.format(date),
        key: date.toISOString(),
      }));
    }

    const visible = dates.slice(0, MAX_BADGES - 1).map((date) => ({
      label: SHORT_DATE.format(date),
      key: date.toISOString(),
    }));
    visible.push({
      label: `+${dates.length - (MAX_BADGES - 1)}`,
      key: 'more',
    });
    return visible;
  }, [breakItem.ptoDays]);

  return (
    <div className="rounded-3xl border border-border bg-card/60 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">#{index + 1}</Badge>
        <h4 className="font-semibold text-sm text-foreground">{formatDisplayRange(breakItem.start, breakItem.end)}</h4>
        <span className="text-xs text-muted-foreground">
          {breakItem.totalDaysOff} total days off
        </span>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Metric label="PTO days" value={`${breakItem.ptoRequired}`} />
        <Metric label="Efficiency" value={formatEfficiency(breakItem.efficiency)} />
        <Metric
          label="Streak length"
          value={`${breakItem.totalDaysOff} day${breakItem.totalDaysOff !== 1 ? 's' : ''}`}
        />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div>
          <p className="flex items-center gap-1 text-[11px] uppercase text-muted-foreground">
            <AnchorIcon className="h-3 w-3" />
            Anchors
          </p>
          <div className="text-sm text-foreground">
            <AnchorLabel anchor={beforeAnchor} />
            <span className="mx-1 text-muted-foreground">→</span>
            <AnchorLabel anchor={afterAnchor} />
          </div>
        </div>
        <div>
          <p className="text-[11px] uppercase text-muted-foreground">PTO days to request</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {ptoDayBadges.map((day) => (
              <Badge key={day.key} variant="outline" className="text-xs">
                {day.label}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const AnchorLabel: React.FC<{ anchor: SuggestedBreak['anchors']['before'] }> = ({ anchor }) => {
  if (!anchor) {
    return <span className="text-muted-foreground">Timeframe boundary</span>;
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs',
        anchor.countsTowardRun ? 'bg-primary/10 text-foreground' : 'bg-muted text-muted-foreground'
      )}
    >
      {anchor.label}
    </span>
  );
};

const EmptyState: React.FC = () => {
  return (
    <div className="rounded-3xl border border-dashed border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground">
      <p className="font-medium text-muted-foreground">No suggestions yet</p>
      <p className="mt-1">
        Adjust the timeframe or filters and tap <span className="font-semibold">Regenerate</span> to
        see PTO streaks that maximize your time off.
      </p>
    </div>
  );
};

export default SuggestedPTOTab;
