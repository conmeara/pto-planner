/**
 * Gap-filling PTO optimization engine
 *
 * Generates consecutive-day break suggestions by identifying the working-day gaps
 * between existing non-working anchors (weekends, holidays, optionally existing PTO)
 * and ranking the most efficient ways to fill those gaps with PTO.
 */

import type {
  AnchorInfo,
  AnchorType,
  OptimizationResult,
  RankingMode,
  SuggestionPreferences,
  SuggestedBreak,
} from '@/types';

// -----------------------------------------------------------------------------
// Config
// -----------------------------------------------------------------------------

export interface PTOOptimizerConfig {
  availablePTO: number;
  weekendDays: number[];
  holidays: Date[];
  selectedPTODays?: Date[];
}

type AnchorSource = 'weekend' | 'holiday' | 'existing';

interface DayInfo {
  date: Date;
  isWeekend: boolean;
  isHoliday: boolean;
  isExisting: boolean;
  isNonWorking: boolean;
  anchorSources: Set<AnchorSource>;
}

type SegmentKind = 'non-working' | 'working';

interface Segment {
  kind: SegmentKind;
  start: Date;
  end: Date;
  days: Date[];
  anchorSources?: Set<AnchorSource>;
}

interface AnchorSegmentInternal {
  start: Date;
  end: Date;
  days: Date[];
  type: AnchorType;
  countsTowardRun: boolean;
  sources: Set<AnchorSource>;
}

type BoundaryPosition = 'start' | 'end';

// -----------------------------------------------------------------------------
// Date helpers
// -----------------------------------------------------------------------------

const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
});

const startOfDay = (input: Date): Date => {
  const date = new Date(input);
  date.setHours(0, 0, 0, 0);
  return date;
};

const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const compareAsc = (a: Date, b: Date): number => a.getTime() - b.getTime();

const dateKey = (date: Date): string => startOfDay(date).toISOString();

const formatDate = (date: Date): string => DATE_FORMATTER.format(date);

const formatDateRange = (start: Date, end: Date): string => {
  if (start.getTime() === end.getTime()) {
    return formatDate(start);
  }
  return `${formatDate(start)} – ${formatDate(end)}`;
};

// -----------------------------------------------------------------------------
// Anchor helpers
// -----------------------------------------------------------------------------

const shouldCountAnchor = (sources: Set<AnchorSource>, extendExisting: boolean): boolean => {
  if (sources.has('weekend') || sources.has('holiday')) {
    return true;
  }
  if (sources.has('existing') && extendExisting) {
    return true;
  }
  return false;
};

const deriveAnchorType = (sources: Set<AnchorSource>, boundary?: BoundaryPosition): AnchorType => {
  if (boundary === 'start') {
    return 'boundary-start';
  }
  if (boundary === 'end') {
    return 'boundary-end';
  }

  const hasWeekend = sources.has('weekend');
  const hasHoliday = sources.has('holiday');
  const hasExisting = sources.has('existing');

  if (hasWeekend && hasHoliday) {
    return 'mixed';
  }
  if (hasWeekend) {
    return 'weekend';
  }
  if (hasHoliday) {
    return 'holiday';
  }
  if (hasExisting) {
    return 'existing';
  }
  return 'existing';
};

const buildAnchorInfo = (segment: AnchorSegmentInternal | null): AnchorInfo | null => {
  if (!segment) {
    return null;
  }

  const labelPrefix = (() => {
    switch (segment.type) {
      case 'weekend':
        return 'Weekend';
      case 'holiday':
        return 'Holiday';
      case 'mixed':
        return 'Holiday + Weekend';
      case 'existing':
        return 'Existing PTO';
      case 'boundary-start':
        return 'Timeframe start';
      case 'boundary-end':
        return 'Timeframe end';
      default:
        return 'Anchor';
    }
  })();

  const label =
    segment.type === 'boundary-start' || segment.type === 'boundary-end'
      ? labelPrefix
      : `${labelPrefix} (${formatDateRange(segment.start, segment.end)})`;

  return {
    start: segment.start,
    end: segment.end,
    dayCount: segment.days.length,
    type: segment.type,
    label,
    countsTowardRun: segment.countsTowardRun,
  };
};

const createBoundaryAnchor = (
  position: BoundaryPosition,
  reference: Date
): AnchorSegmentInternal => ({
  start: reference,
  end: reference,
  days: [],
  type: position === 'start' ? 'boundary-start' : 'boundary-end',
  countsTowardRun: false,
  sources: new Set(),
});

const toAnchorSegment = (
  segment: Segment,
  extendExisting: boolean
): AnchorSegmentInternal => {
  const sources = segment.anchorSources ?? new Set<AnchorSource>();
  return {
    start: segment.start,
    end: segment.end,
    days: segment.days,
    type: deriveAnchorType(sources),
    countsTowardRun: shouldCountAnchor(sources, extendExisting),
    sources,
  };
};

// -----------------------------------------------------------------------------
// Core algorithm
// -----------------------------------------------------------------------------

export function optimizePTO(
  config: PTOOptimizerConfig,
  preferences: SuggestionPreferences
): OptimizationResult {
  const sanitized = sanitizePreferences(preferences, config.availablePTO);
  const { earliestStart, latestEnd } = sanitized;

  if (earliestStart > latestEnd) {
    return emptyResult();
  }

  const availableBudget = Math.max(
    0,
    Math.min(Math.floor(config.availablePTO), sanitized.maxPTOToUse)
  );

  if (availableBudget <= 0 || sanitized.maxPTOPerBreak <= 0 || sanitized.maxSuggestions <= 0) {
    return {
      ...emptyResult(),
      remainingPTO: Math.max(0, availableBudget),
    };
  }

  const weekendSet = new Set(config.weekendDays);
  const holidaySet = new Set(config.holidays.map((date) => dateKey(date)));
  const selectedSet = new Set((config.selectedPTODays ?? []).map((date) => dateKey(date)));

  const timeline = buildTimeline(
    earliestStart,
    latestEnd,
    weekendSet,
    holidaySet,
    selectedSet
  );

  if (timeline.length === 0) {
    return {
      ...emptyResult(),
      remainingPTO: availableBudget,
    };
  }

  const candidateBreaks = buildCandidateBreaks(
    timeline,
    sanitized,
    earliestStart,
    latestEnd
  );

  if (candidateBreaks.length === 0) {
    return {
      ...emptyResult(),
      remainingPTO: availableBudget,
    };
  }

  const sortedCandidates = sortCandidates(candidateBreaks, sanitized.rankingMode);
  const selectedBreaks: SuggestedBreak[] = [];
  let remainingBudget = availableBudget;

  for (const candidate of sortedCandidates) {
    if (selectedBreaks.length >= sanitized.maxSuggestions) {
      break;
    }
    if (candidate.ptoRequired > remainingBudget) {
      continue;
    }
    if (isOverlapping(candidate, selectedBreaks, sanitized.minSpacingBetweenBreaks)) {
      continue;
    }

    selectedBreaks.push(candidate);
    remainingBudget -= candidate.ptoRequired;
  }

  const suggestedDays = dedupeAndSortDates(
    selectedBreaks.flatMap((breakItem) => breakItem.ptoDays)
  );

  const totalPTOUsed = selectedBreaks.reduce((sum, item) => sum + item.ptoRequired, 0);
  const totalDaysOff = selectedBreaks.reduce((sum, item) => sum + item.totalDaysOff, 0);

  return {
    suggestedDays,
    breaks: selectedBreaks,
    totalPTOUsed,
    totalDaysOff,
    averageEfficiency: totalPTOUsed > 0 ? totalDaysOff / totalPTOUsed : 0,
    remainingPTO: Math.max(0, remainingBudget),
  };
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

const emptyResult = (): OptimizationResult => ({
  suggestedDays: [],
  breaks: [],
  totalPTOUsed: 0,
  totalDaysOff: 0,
  averageEfficiency: 0,
  remainingPTO: 0,
});

const sanitizePreferences = (
  preferences: SuggestionPreferences,
  availablePTO: number
) => {
  const today = startOfDay(new Date());
  let earliest = startOfDay(preferences.earliestStart);
  let latest = startOfDay(preferences.latestEnd);

  if (latest < earliest) {
    [earliest, latest] = [latest, earliest];
  }

  earliest = compareAsc(earliest, today) < 0 ? today : earliest;

  const maxPTOBudget = Math.max(0, Math.floor(preferences.maxPTOToUse));
  const absoluteBudget = Math.max(0, Math.floor(availablePTO));
  const maxPTOPerBreak = Math.max(1, Math.floor(preferences.maxPTOPerBreak));
  const minDaysOff = Math.max(1, Math.floor(preferences.minConsecutiveDaysOff));
  const maxSuggestions = Math.max(0, Math.floor(preferences.maxSuggestions));
  const minSpacing = Math.max(0, Math.floor(preferences.minSpacingBetweenBreaks));
  const rankingMode: RankingMode = preferences.rankingMode ?? 'efficiency';

  return {
    earliestStart: earliest,
    latestEnd: latest,
    maxPTOToUse: Math.min(maxPTOBudget, absoluteBudget),
    maxPTOPerBreak,
    minConsecutiveDaysOff: minDaysOff,
    maxSuggestions,
    rankingMode,
    minSpacingBetweenBreaks: minSpacing,
    extendExistingPTO: preferences.extendExistingPTO,
  };
};

const buildTimeline = (
  start: Date,
  end: Date,
  weekendSet: Set<number>,
  holidaySet: Set<string>,
  selectedSet: Set<string>
): Segment[] => {
  const segments: Segment[] = [];
  let current: Segment | null = null;

  for (
    let cursor = new Date(start);
    compareAsc(cursor, end) <= 0;
    cursor = addDays(cursor, 1)
  ) {
    const date = startOfDay(cursor);
    const key = dateKey(date);

    const isWeekend = weekendSet.has(date.getDay());
    const isHoliday = holidaySet.has(key);
    const isExisting = selectedSet.has(key);
    const isNonWorking = isWeekend || isHoliday || isExisting;
    const anchorSources = new Set<AnchorSource>();

    if (isWeekend) anchorSources.add('weekend');
    if (isHoliday) anchorSources.add('holiday');
    if (isExisting) anchorSources.add('existing');

    const kind: SegmentKind = isNonWorking ? 'non-working' : 'working';
    const dayClone = new Date(date);

    if (!current || current.kind !== kind) {
      if (current) {
        segments.push(current);
      }
      current = {
        kind,
        start: dayClone,
        end: dayClone,
        days: [dayClone],
        anchorSources: kind === 'non-working' ? anchorSources : undefined,
      };
    } else {
      current.end = dayClone;
      current.days.push(dayClone);
      if (kind === 'non-working' && current.anchorSources) {
        anchorSources.forEach((source) => current!.anchorSources!.add(source));
      }
    }
  }

  if (current) {
    segments.push(current);
  }

  return segments;
};

const buildCandidateBreaks = (
  segments: Segment[],
  preferences: ReturnType<typeof sanitizePreferences>,
  rangeStart: Date,
  rangeEnd: Date
): SuggestedBreak[] => {
  const candidates: SuggestedBreak[] = [];

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    if (segment.kind !== 'working' || segment.days.length === 0) {
      continue;
    }

    const prevAnchorSegment = findNeighborAnchor(
      segments,
      i,
      'backward',
      preferences.extendExistingPTO
    ) ?? createBoundaryAnchor('start', rangeStart);

    const nextAnchorSegment = findNeighborAnchor(
      segments,
      i,
      'forward',
      preferences.extendExistingPTO
    ) ?? createBoundaryAnchor('end', rangeEnd);

    const workdays = segment.days;
    const ptoRequired = workdays.length;

    if (ptoRequired === 0 || ptoRequired > preferences.maxPTOPerBreak) {
      continue;
    }

    const totalDaysOff =
      ptoRequired +
      (prevAnchorSegment.countsTowardRun ? prevAnchorSegment.days.length : 0) +
      (nextAnchorSegment.countsTowardRun ? nextAnchorSegment.days.length : 0);

    if (totalDaysOff < preferences.minConsecutiveDaysOff) {
      continue;
    }

    const breakStart = prevAnchorSegment.countsTowardRun
      ? prevAnchorSegment.start
      : workdays[0];
    const breakEnd = nextAnchorSegment.countsTowardRun
      ? nextAnchorSegment.end
      : workdays[workdays.length - 1];

    const breakCandidate: SuggestedBreak = {
      id: `${dateKey(breakStart)}_${dateKey(breakEnd)}_${ptoRequired}`,
      start: breakStart,
      end: breakEnd,
      ptoDays: [...workdays],
      ptoRequired,
      totalDaysOff,
      efficiency: totalDaysOff / ptoRequired,
      anchors: {
        before: buildAnchorInfo(prevAnchorSegment),
        after: buildAnchorInfo(nextAnchorSegment),
      },
    };

    candidates.push(breakCandidate);
  }

  return candidates;
};

const findNeighborAnchor = (
  segments: Segment[],
  fromIndex: number,
  direction: 'forward' | 'backward',
  extendExisting: boolean
): AnchorSegmentInternal | null => {
  const step = direction === 'forward' ? 1 : -1;

  for (let i = fromIndex + step; i >= 0 && i < segments.length; i += step) {
    if (segments[i].kind === 'non-working') {
      return toAnchorSegment(segments[i], extendExisting);
    }
  }

  return null;
};

const sortCandidates = (candidates: SuggestedBreak[], mode: RankingMode): SuggestedBreak[] => {
  const clone = [...candidates];

  clone.sort((a, b) => {
    switch (mode) {
      case 'longest':
        return (
          b.totalDaysOff - a.totalDaysOff ||
          a.ptoRequired - b.ptoRequired ||
          compareAsc(a.start, b.start)
        );
      case 'least-pto':
        return (
          a.ptoRequired - b.ptoRequired ||
          b.efficiency - a.efficiency ||
          compareAsc(a.start, b.start)
        );
      case 'earliest':
        return (
          compareAsc(a.start, b.start) ||
          b.totalDaysOff - a.totalDaysOff ||
          a.ptoRequired - b.ptoRequired
        );
      case 'efficiency':
      default:
        return (
          b.efficiency - a.efficiency ||
          b.totalDaysOff - a.totalDaysOff ||
          a.ptoRequired - b.ptoRequired ||
          compareAsc(a.start, b.start)
        );
    }
  });

  return clone;
};

const isOverlapping = (
  candidate: SuggestedBreak,
  existing: SuggestedBreak[],
  minSpacing: number
): boolean => {
  const minSpacingOffset = Math.max(0, minSpacing);

  return existing.some((breakItem) => {
    const [first, second] =
      compareAsc(candidate.start, breakItem.start) <= 0
        ? [candidate, breakItem]
        : [breakItem, candidate];

    const earliestNextStart = addDays(first.end, minSpacingOffset + 1);
    return compareAsc(second.start, earliestNextStart) < 0;
  });
};

const dedupeAndSortDates = (dates: Date[]): Date[] => {
  const map = new Map<string, Date>();
  dates.forEach((date) => {
    map.set(dateKey(date), startOfDay(date));
  });

  return Array.from(map.values()).sort(compareAsc);
};
