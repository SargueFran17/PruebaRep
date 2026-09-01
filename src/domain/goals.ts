import { daysRemainingIn, elapsedRange, monthRange, weekRange } from './dates';
import type { DateRange } from './dates';
import type { EntryMap } from './entries';
import { countCompletions, sumAmounts } from './frequency';
import { habitCompletionRate, summariseDay } from './stats';
import { eachDay } from './dates';
import type { DateKey, Goal, GoalPeriod, Habit, WeekStart } from './types';

export type GoalStatus = 'achieved' | 'onTrack' | 'behind' | 'notStarted';

export interface GoalProgress {
  goal: Goal;
  range: DateRange;
  /** Current value in the goal's own unit (days, minutes, %…). */
  value: number;
  target: number;
  /** 0–1, clamped. */
  ratio: number;
  status: GoalStatus;
  daysRemaining: number;
  /** Where the user *should* be by now if progress were even. 0–1. */
  expectedRatio: number;
  unit: string;
  /** Human label such as "3 / 4 sessions". */
  label: string;
}

export function goalRange(
  period: GoalPeriod,
  anchor: DateKey,
  weekStart: WeekStart,
): DateRange {
  return period === 'week' ? weekRange(anchor, weekStart) : monthRange(anchor);
}

export function computeGoalProgress(
  goal: Goal,
  habits: Habit[],
  entries: EntryMap,
  today: DateKey,
  weekStart: WeekStart,
  anchor: DateKey = today,
): GoalProgress {
  const range = goalRange(goal.period, anchor, weekStart);
  const elapsed = elapsedRange(range, today);
  const metric = goal.metric;
  const habit =
    'habitId' in metric ? habits.find((candidate) => candidate.id === metric.habitId) : undefined;

  let value = 0;
  let unit = '';

  switch (goal.metric.kind) {
    case 'habitDays': {
      value = habit && elapsed ? countCompletions(habit, entries, elapsed.start, elapsed.end) : 0;
      unit = 'days';
      break;
    }
    case 'habitAmount': {
      value = habit && elapsed ? sumAmounts(habit, entries, elapsed.start, elapsed.end) : 0;
      unit = habit?.target.unit ?? '';
      break;
    }
    case 'consistency': {
      let completed = 0;
      let total = 0;
      for (const candidate of habits) {
        const r = habitCompletionRate(candidate, entries, range, today, weekStart);
        completed += r.completed;
        total += r.total;
      }
      value = total > 0 ? Math.round((completed / total) * 100) : 0;
      unit = '%';
      break;
    }
    case 'perfectDays': {
      value = elapsed
        ? eachDay(elapsed.start, elapsed.end).filter(
            (day) => summariseDay(habits, entries, day).perfect,
          ).length
        : 0;
      unit = 'days';
      break;
    }
  }

  const target = Math.max(1, goal.target);
  const progressRatio = Math.min(1, value / target);
  const totalDays = eachDay(range.start, range.end).length;
  const daysRemaining = daysRemainingIn(range, today);
  const daysElapsed = Math.max(0, totalDays - daysRemaining);

  // A consistency goal is a rate, not a tally: it does not accumulate over the
  // period, so pacing it against elapsed days would be meaningless. Judge it
  // against the target directly and show no pace marker.
  const isRate = goal.metric.kind === 'consistency';
  const expectedRatio = isRate || totalDays === 0 ? 0 : Math.min(1, daysElapsed / totalDays);

  let status: GoalStatus;
  if (value >= target) status = 'achieved';
  else if (value === 0 && daysElapsed <= 1) status = 'notStarted';
  else if (isRate) status = progressRatio >= 0.9 ? 'onTrack' : 'behind';
  else status = progressRatio >= expectedRatio - 0.12 ? 'onTrack' : 'behind';

  return {
    goal,
    range,
    value,
    target,
    ratio: progressRatio,
    status,
    daysRemaining,
    expectedRatio,
    unit,
    label:
      goal.metric.kind === 'consistency'
        ? `${value}% of ${target}%`
        : formatMeasurePair(value, target, unit),
  };
}

export function describeGoalMetric(goal: Goal, habits: Habit[]): string {
  const metric = goal.metric;
  const habit =
    'habitId' in metric ? habits.find((candidate) => candidate.id === metric.habitId) : undefined;
  switch (goal.metric.kind) {
    case 'habitDays':
      return habit ? `Days completing ${habit.name}` : 'Days (habit removed)';
    case 'habitAmount':
      return habit
        ? `Total ${habit.target.unit ?? 'amount'} of ${habit.name}`
        : 'Amount (habit removed)';
    case 'consistency':
      return 'Overall completion rate';
    case 'perfectDays':
      return 'Days with every habit done';
  }
}

export function goalStatusLabel(status: GoalStatus): string {
  switch (status) {
    case 'achieved':
      return 'Achieved';
    case 'onTrack':
      return 'On track';
    case 'behind':
      return 'Behind';
    case 'notStarted':
      return 'Not started';
  }
}

/**
 * Formats a measured value with its unit, promoting large minute counts to
 * hours — "1200 min" is technically right but nobody reads it that way.
 */
export function formatMeasure(value: number, unit?: string): string {
  if (unit === 'min' && Math.abs(value) >= 120) {
    return `${formatNumber(value / 60)} h`;
  }
  return unit ? `${formatNumber(value)} ${unit}` : formatNumber(value);
}

/**
 * "12 / 20 h" — both sides share one unit, named once at the end, chosen from
 * whichever value is large enough to decide the scale.
 */
export function formatMeasurePair(value: number, target: number, unit?: string): string {
  const asHours = unit === 'min' && Math.max(Math.abs(value), Math.abs(target)) >= 120;
  if (asHours) return `${formatNumber(value / 60)} / ${formatNumber(target / 60)} h`;
  return `${formatNumber(value)} / ${formatNumber(target)}${unit ? ` ${unit}` : ''}`;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1).replace(/\.0$/, '');
}
