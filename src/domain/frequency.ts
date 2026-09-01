import {
  addDays,
  eachDay,
  monthRange,
  startOfMonth,
  startOfWeek,
  weekRange,
  weekdayOf,
} from './dates';
import { entryKey } from './entries';
import type { EntryMap } from './entries';
import type { DateKey, Frequency, Habit, WeekStart } from './types';

/**
 * Frequency semantics
 * -------------------
 * `daily` / `weekdays` are *day-scheduled*: named days are expected, and a
 * missed one breaks the streak.
 *
 * `timesPerWeek` / `timesPerMonth` are *quota-based*: no single day is
 * required, so every day is offered for completion and success is judged
 * across the whole period.
 */

export type FrequencyScale = 'day' | 'week' | 'month';

export function frequencyScale(frequency: Frequency): FrequencyScale {
  switch (frequency.kind) {
    case 'daily':
    case 'weekdays':
      return 'day';
    case 'timesPerWeek':
      return 'week';
    case 'timesPerMonth':
      return 'month';
  }
}

export function matchesFrequencyDay(frequency: Frequency, date: DateKey): boolean {
  switch (frequency.kind) {
    case 'daily':
      return true;
    case 'weekdays':
      return frequency.days.includes(weekdayOf(date));
    case 'timesPerWeek':
    case 'timesPerMonth':
      return true;
  }
}

/** The last day this habit's history covers: today, or the day it was archived. */
export function habitWindowEnd(habit: Habit, today: DateKey): DateKey {
  if (habit.archivedAt && habit.archivedAt < today) return habit.archivedAt;
  return today;
}

/** Within the habit's lifetime, ignoring the archived flag (history stays real). */
export function isWithinLifetime(habit: Habit, date: DateKey): boolean {
  if (date < habit.startDate) return false;
  if (habit.archivedAt && date > habit.archivedAt) return false;
  return true;
}

/** Should this habit appear in the day's list? Archived habits never do. */
export function isDueOn(habit: Habit, date: DateKey): boolean {
  if (habit.archived) return false;
  return isWithinLifetime(habit, date) && matchesFrequencyDay(habit.frequency, date);
}

/**
 * Days that count *against* the habit — the denominator of its completion rate
 * and the days a streak can break on. Quota habits have no required days.
 */
export function isRequiredOn(habit: Habit, date: DateKey): boolean {
  if (!isWithinLifetime(habit, date)) return false;
  const { frequency } = habit;
  if (frequency.kind === 'daily') return true;
  if (frequency.kind === 'weekdays') return frequency.days.includes(weekdayOf(date));
  return false;
}

export function requiredDaysBetween(habit: Habit, start: DateKey, end: DateKey): DateKey[] {
  return eachDay(start, end).filter((day) => isRequiredOn(habit, day));
}

export function isCompletedOn(habit: Habit, entries: EntryMap, date: DateKey): boolean {
  const amount = entries[entryKey(habit.id, date)]?.amount ?? 0;
  return amount >= habit.target.amount && amount > 0;
}

export function countCompletions(
  habit: Habit,
  entries: EntryMap,
  start: DateKey,
  end: DateKey,
): number {
  let count = 0;
  for (const day of eachDay(start, end)) {
    if (!isWithinLifetime(habit, day)) continue;
    if (isCompletedOn(habit, entries, day)) count += 1;
  }
  return count;
}

export function sumAmounts(
  habit: Habit,
  entries: EntryMap,
  start: DateKey,
  end: DateKey,
): number {
  let total = 0;
  for (const day of eachDay(start, end)) {
    if (!isWithinLifetime(habit, day)) continue;
    total += entries[entryKey(habit.id, day)]?.amount ?? 0;
  }
  return total;
}

export function periodRangeFor(
  scale: 'week' | 'month',
  date: DateKey,
  weekStart: WeekStart,
): { start: DateKey; end: DateKey } {
  return scale === 'week' ? weekRange(date, weekStart) : monthRange(date);
}

export function periodStartFor(
  scale: 'week' | 'month',
  date: DateKey,
  weekStart: WeekStart,
): DateKey {
  return scale === 'week' ? startOfWeek(date, weekStart) : startOfMonth(date);
}

export interface PeriodSummary {
  start: DateKey;
  end: DateKey;
  /**
   * Times required in this period. Pro-rated only when the habit's own
   * lifetime clips the period (it started or was archived mid-week) — never by
   * how much of the period has merely elapsed, or an open week would count as
   * satisfied on its first day.
   */
  quota: number;
  /** The same quota scaled to the days that have actually happened. */
  elapsedQuota: number;
  completions: number;
  satisfied: boolean;
  /** The period has not finished yet, so it cannot break a streak. */
  inProgress: boolean;
}

/**
 * Splits a quota habit's lifetime into periods. Without pro-rating, a habit
 * created on a Friday would look like a failure for its first week.
 */
export function summarisePeriods(
  habit: Habit,
  entries: EntryMap,
  today: DateKey,
  weekStart: WeekStart,
): PeriodSummary[] {
  const scale = frequencyScale(habit.frequency);
  if (scale === 'day') return [];
  const times =
    habit.frequency.kind === 'timesPerWeek' || habit.frequency.kind === 'timesPerMonth'
      ? habit.frequency.times
      : 0;

  const windowEnd = habitWindowEnd(habit, today);
  if (windowEnd < habit.startDate) return [];

  const summaries: PeriodSummary[] = [];
  let cursor = periodStartFor(scale, habit.startDate, weekStart);
  let guard = 0;

  while (cursor <= windowEnd && guard < 5_000) {
    const range = periodRangeFor(scale, cursor, weekStart);
    const totalDays = eachDay(range.start, range.end).length;

    // The slice of this period the habit was actually alive for.
    const liveStart = range.start > habit.startDate ? range.start : habit.startDate;
    const liveEnd =
      habit.archivedAt && habit.archivedAt < range.end ? habit.archivedAt : range.end;
    const liveDays = eachDay(liveStart, liveEnd).length;

    // …and the slice of that which has already happened.
    const elapsedEnd = liveEnd < today ? liveEnd : today;
    const elapsedDays = eachDay(liveStart, elapsedEnd).length;

    const completions = countCompletions(habit, entries, liveStart, elapsedEnd);
    const quota = prorate(times, liveDays, totalDays);

    summaries.push({
      start: range.start,
      end: range.end,
      quota,
      elapsedQuota: prorate(times, elapsedDays, totalDays),
      completions,
      satisfied: completions >= quota,
      inProgress: liveEnd > today,
    });

    cursor = periodStartFor(scale, addDays(range.end, 1), weekStart);
    guard += 1;
  }

  return summaries;
}

function prorate(times: number, availableDays: number, totalDays: number): number {
  if (availableDays >= totalDays) return times;
  if (availableDays <= 0) return times;
  return Math.max(1, Math.min(times, Math.round((times * availableDays) / totalDays)));
}

export function describeFrequency(frequency: Frequency, weekStart: WeekStart): string {
  switch (frequency.kind) {
    case 'daily':
      return 'Every day';
    case 'weekdays': {
      const days = frequency.days;
      if (days.length === 0) return 'No days selected';
      if (days.length === 7) return 'Every day';
      if (days.length === 5 && [1, 2, 3, 4, 5].every((d) => days.includes(d as never))) {
        return 'Weekdays';
      }
      if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Weekends';
      const order = Array.from({ length: 7 }, (_, i) => (weekStart + i) % 7);
      return order
        .filter((d) => days.includes(d as never))
        .map((d) => SHORT_DAYS[d])
        .join(' · ');
    }
    case 'timesPerWeek':
      return `${frequency.times}× per week`;
    case 'timesPerMonth':
      return `${frequency.times}× per month`;
  }
}

export const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export const MIN_DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;
export const FULL_DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;
