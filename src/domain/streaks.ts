import { eachDay } from './dates';
import type { EntryMap } from './entries';
import {
  frequencyScale,
  habitWindowEnd,
  isCompletedOn,
  isRequiredOn,
  requiredDaysBetween,
  summarisePeriods,
} from './frequency';
import type { DateKey, Habit, WeekStart } from './types';

export type StreakUnit = 'day' | 'week' | 'month';

export interface Streak {
  current: number;
  best: number;
  unit: StreakUnit;
  /**
   * True when the current period/day is still open and undone — the streak is
   * intact but needs today's work to extend.
   */
  atRisk: boolean;
}

const EMPTY: Streak = { current: 0, best: 0, unit: 'day', atRisk: false };

/**
 * Streaks are measured in the habit's own cadence:
 *  · day-scheduled habits count consecutive *scheduled* days, so a Mon/Wed/Fri
 *    habit is not broken by an idle Tuesday;
 *  · quota habits count consecutive satisfied weeks or months.
 *
 * The open period never breaks a streak — it can only extend it. That keeps the
 * number from dropping to zero every morning before the user has had a chance.
 */
export function computeStreak(
  habit: Habit,
  entries: EntryMap,
  today: DateKey,
  weekStart: WeekStart,
): Streak {
  const scale = frequencyScale(habit.frequency);
  return scale === 'day'
    ? dayStreak(habit, entries, today)
    : periodStreak(habit, entries, today, weekStart, scale);
}

function dayStreak(habit: Habit, entries: EntryMap, today: DateKey): Streak {
  const end = habitWindowEnd(habit, today);
  if (end < habit.startDate) return { ...EMPTY };

  const days = requiredDaysBetween(habit, habit.startDate, end);
  if (days.length === 0) return { ...EMPTY };

  const last = days[days.length - 1] as DateKey;
  const lastIsOpen = last === today && !isCompletedOn(habit, entries, last);
  const scanned = lastIsOpen ? days.slice(0, -1) : days;

  let run = 0;
  let best = 0;
  for (const day of scanned) {
    if (isCompletedOn(habit, entries, day)) {
      run += 1;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }

  return { current: run, best, unit: 'day', atRisk: lastIsOpen && run > 0 };
}

function periodStreak(
  habit: Habit,
  entries: EntryMap,
  today: DateKey,
  weekStart: WeekStart,
  scale: 'week' | 'month',
): Streak {
  const periods = summarisePeriods(habit, entries, today, weekStart);
  if (periods.length === 0) return { ...EMPTY, unit: scale };

  const last = periods[periods.length - 1] as (typeof periods)[number];
  const lastIsOpen = last.inProgress && !last.satisfied;
  const scanned = lastIsOpen ? periods.slice(0, -1) : periods;

  let run = 0;
  let best = 0;
  for (const period of scanned) {
    if (period.satisfied) {
      run += 1;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }

  return { current: run, best, unit: scale, atRisk: lastIsOpen && run > 0 };
}

export function formatStreak(streak: Streak): string {
  if (streak.current === 0) return 'No streak yet';
  const noun = streak.unit === 'day' ? 'day' : streak.unit === 'week' ? 'week' : 'month';
  return `${streak.current} ${noun}${streak.current === 1 ? '' : 's'}`;
}

/**
 * The account-wide streak: consecutive days where every habit scheduled that
 * day was completed. Today counts only once it is already perfect.
 */
export function computeOverallStreak(
  habits: Habit[],
  entries: EntryMap,
  today: DateKey,
  earliest: DateKey,
): Streak {
  if (habits.length === 0 || earliest > today) return { ...EMPTY };

  const evaluate = (day: DateKey): DayVerdict => {
    const scheduled = habits.filter((habit) => isRequiredOn(habit, day));
    if (scheduled.length === 0) return 'unscheduled';
    return scheduled.every((habit) => isCompletedOn(habit, entries, day))
      ? 'perfect'
      : 'missed';
  };

  const days = eachDay(earliest, today);
  const todayVerdict = evaluate(today);
  // An unfinished today is not a broken streak — drop it from the scan.
  const scanned = todayVerdict === 'perfect' ? days : days.slice(0, -1);

  let run = 0;
  let best = 0;
  for (const day of scanned) {
    const verdict = evaluate(day);
    if (verdict === 'perfect') {
      run += 1;
      if (run > best) best = run;
    } else if (verdict === 'missed') {
      run = 0;
    }
  }

  return { current: run, best, unit: 'day', atRisk: todayVerdict === 'missed' && run > 0 };
}

type DayVerdict = 'unscheduled' | 'perfect' | 'missed';
