import { addDays, eachDay, elapsedRange, fromDateKey, monthRange, weekRange } from './dates';
import type { DateRange } from './dates';
import type { EntryMap } from './entries';
import {
  countCompletions,
  frequencyScale,
  habitWindowEnd,
  isCompletedOn,
  isRequiredOn,
  requiredDaysBetween,
  summarisePeriods,
  sumAmounts,
} from './frequency';
import { computeOverallStreak, computeStreak } from './streaks';
import type { Streak } from './streaks';
import type { DateKey, Habit, WeekStart } from './types';

export interface Ratio {
  completed: number;
  total: number;
  rate: number;
}

export function ratio(completed: number, total: number): Ratio {
  return { completed, total, rate: total > 0 ? completed / total : 0 };
}

/**
 * Completion rate over a range.
 * Day-scheduled habits: completed scheduled days ÷ scheduled days.
 * Quota habits: completions ÷ quota, summed over periods, each capped at 100 %
 * so an exceptional week cannot paper over a missed one.
 */
export function habitCompletionRate(
  habit: Habit,
  entries: EntryMap,
  range: DateRange,
  today: DateKey,
  weekStart: WeekStart,
): Ratio {
  const elapsed = elapsedRange(range, habitWindowEnd(habit, today));
  if (!elapsed) return ratio(0, 0);

  if (frequencyScale(habit.frequency) === 'day') {
    const days = requiredDaysBetween(habit, elapsed.start, elapsed.end);
    const done = days.filter((day) => isCompletedOn(habit, entries, day)).length;
    return ratio(done, days.length);
  }

  const periods = summarisePeriods(habit, entries, today, weekStart).filter(
    (period) => period.end >= range.start && period.start <= range.end,
  );
  // The open period is judged on the days that have happened, so a fresh
  // Monday does not drag the month's rate down.
  let completed = 0;
  let total = 0;
  for (const period of periods) {
    const quota = period.inProgress ? period.elapsedQuota : period.quota;
    completed += Math.min(period.completions, quota);
    total += quota;
  }
  return ratio(completed, total);
}

export interface HabitStats {
  habit: Habit;
  streak: Streak;
  /** Completions across the habit's entire life. */
  totalCompletions: number;
  totalAmount: number;
  /** All-time completion rate. */
  allTime: Ratio;
  last30: Ratio;
  thisWeek: Ratio;
  thisMonth: Ratio;
  /** Times done in the current cadence period, and how many are needed. */
  periodProgress: { done: number; target: number };
}

export function computeHabitStats(
  habit: Habit,
  entries: EntryMap,
  today: DateKey,
  weekStart: WeekStart,
): HabitStats {
  const end = habitWindowEnd(habit, today);
  const lifetime: DateRange = { start: habit.startDate, end };
  const last30: DateRange = { start: addDays(today, -29), end: today };
  const week = weekRange(today, weekStart);
  const month = monthRange(today);

  const scale = frequencyScale(habit.frequency);
  const periodTarget =
    scale === 'day'
      ? requiredDaysBetween(habit, week.start, week.end).length
      : habit.frequency.kind === 'timesPerWeek' || habit.frequency.kind === 'timesPerMonth'
        ? habit.frequency.times
        : 0;
  const periodRange = scale === 'month' ? month : week;

  return {
    habit,
    streak: computeStreak(habit, entries, today, weekStart),
    totalCompletions: countCompletions(habit, entries, lifetime.start, lifetime.end),
    totalAmount: sumAmounts(habit, entries, lifetime.start, lifetime.end),
    allTime: habitCompletionRate(habit, entries, lifetime, today, weekStart),
    last30: habitCompletionRate(habit, entries, last30, today, weekStart),
    thisWeek: habitCompletionRate(habit, entries, week, today, weekStart),
    thisMonth: habitCompletionRate(habit, entries, month, today, weekStart),
    periodProgress: {
      done: countCompletions(habit, entries, periodRange.start, periodRange.end),
      target: periodTarget,
    },
  };
}

export interface DaySummary {
  date: DateKey;
  scheduled: number;
  completed: number;
  /** 0–1; `null` when nothing was scheduled that day. */
  rate: number | null;
  perfect: boolean;
}

export function summariseDay(
  habits: Habit[],
  entries: EntryMap,
  date: DateKey,
): DaySummary {
  const scheduled = habits.filter((habit) => isRequiredOn(habit, date));
  const extras = habits.filter(
    (habit) =>
      !isRequiredOn(habit, date) &&
      frequencyScale(habit.frequency) !== 'day' &&
      isCompletedOn(habit, entries, date),
  );
  const completed =
    scheduled.filter((habit) => isCompletedOn(habit, entries, date)).length + extras.length;
  const total = scheduled.length + extras.length;
  return {
    date,
    scheduled: total,
    completed,
    rate: total > 0 ? completed / total : null,
    perfect: scheduled.length > 0 && completed >= total,
  };
}

export function summariseRange(
  habits: Habit[],
  entries: EntryMap,
  range: DateRange,
  today: DateKey,
): DaySummary[] {
  const clipped = elapsedRange(range, today);
  const days = eachDay(range.start, range.end);
  return days.map((date) =>
    clipped && date <= clipped.end
      ? summariseDay(habits, entries, date)
      : { date, scheduled: 0, completed: 0, rate: null, perfect: false },
  );
}

export interface OverviewStats {
  overall: Ratio;
  thisWeek: Ratio;
  thisMonth: Ratio;
  completedToday: number;
  scheduledToday: number;
  pendingToday: number;
  perfectDays: number;
  totalCompletions: number;
  streak: Streak;
  activeHabits: number;
}

export function computeOverview(
  habits: Habit[],
  entries: EntryMap,
  today: DateKey,
  weekStart: WeekStart,
): OverviewStats {
  const active = habits.filter((habit) => !habit.archived);
  const earliest = habits.reduce<DateKey | null>(
    (min, habit) => (min === null || habit.startDate < min ? habit.startDate : min),
    null,
  );

  const aggregate = (range: DateRange): Ratio => {
    let completed = 0;
    let total = 0;
    for (const habit of habits) {
      const r = habitCompletionRate(habit, entries, range, today, weekStart);
      completed += r.completed;
      total += r.total;
    }
    return ratio(completed, total);
  };

  const lifetime: DateRange = { start: earliest ?? today, end: today };
  const todaySummary = summariseDay(active, entries, today);
  const perfectDays = earliest
    ? eachDay(earliest, today).filter((day) => summariseDay(habits, entries, day).perfect)
        .length
    : 0;

  return {
    overall: aggregate(lifetime),
    thisWeek: aggregate(weekRange(today, weekStart)),
    thisMonth: aggregate(monthRange(today)),
    completedToday: todaySummary.completed,
    scheduledToday: todaySummary.scheduled,
    pendingToday: Math.max(0, todaySummary.scheduled - todaySummary.completed),
    perfectDays,
    totalCompletions: countAllCompletions(habits, entries),
    streak: computeOverallStreak(habits, entries, today, earliest ?? today),
    activeHabits: active.length,
  };
}

export function countAllCompletions(habits: Habit[], entries: EntryMap): number {
  const targets = new Map(habits.map((habit) => [habit.id, habit.target.amount]));
  let total = 0;
  for (const entry of Object.values(entries)) {
    const target = targets.get(entry.habitId);
    if (target === undefined) continue;
    if (entry.amount > 0 && entry.amount >= target) total += 1;
  }
  return total;
}

/** Per-habit completion counts inside a range — feeds the distribution chart. */
export function completionsByHabit(
  habits: Habit[],
  entries: EntryMap,
  range: DateRange,
): { habit: Habit; count: number }[] {
  return habits
    .map((habit) => ({
      habit,
      count: countCompletions(habit, entries, range.start, range.end),
    }))
    .sort((a, b) => b.count - a.count);
}

/** Rolling series of completion rates, one point per week. */
export function weeklySeries(
  habits: Habit[],
  entries: EntryMap,
  today: DateKey,
  weekStart: WeekStart,
  weeks: number,
): { start: DateKey; end: DateKey; rate: number; completed: number; total: number }[] {
  const series: { start: DateKey; end: DateKey; rate: number; completed: number; total: number }[] =
    [];
  for (let i = weeks - 1; i >= 0; i -= 1) {
    const anchor = addDays(today, -7 * i);
    const range = weekRange(anchor, weekStart);
    let completed = 0;
    let total = 0;
    for (const habit of habits) {
      const r = habitCompletionRate(habit, entries, range, today, weekStart);
      completed += r.completed;
      total += r.total;
    }
    series.push({ ...range, completed, total, rate: total > 0 ? completed / total : 0 });
  }
  return series;
}

/**
 * Completion rate bucketed by day of the week — the one view that reliably
 * shows *where* consistency actually breaks (almost always the weekend).
 */
export function weekdayBreakdown(
  habits: Habit[],
  entries: EntryMap,
  range: DateRange,
  today: DateKey,
): { weekday: number; completed: number; total: number; rate: number }[] {
  const buckets = Array.from({ length: 7 }, (_, weekday) => ({
    weekday,
    completed: 0,
    total: 0,
    rate: 0,
  }));

  const elapsed = elapsedRange(range, today);
  if (!elapsed) return buckets;

  for (const date of eachDay(elapsed.start, elapsed.end)) {
    const bucket = buckets[fromDateKey(date).getDay()];
    if (!bucket) continue;
    for (const habit of habits) {
      if (!isRequiredOn(habit, date)) continue;
      bucket.total += 1;
      if (isCompletedOn(habit, entries, date)) bucket.completed += 1;
    }
  }

  for (const bucket of buckets) {
    bucket.rate = bucket.total > 0 ? bucket.completed / bucket.total : 0;
  }
  return buckets;
}

