import type { DateKey, Entry, Habit } from './types';

export type EntryMap = Record<string, Entry>;

export function entryKey(habitId: string, date: DateKey): string {
  return `${habitId}|${date}`;
}

export function getAmount(entries: EntryMap, habitId: string, date: DateKey): number {
  return entries[entryKey(habitId, date)]?.amount ?? 0;
}

export type CompletionState = 'empty' | 'partial' | 'complete';

export function completionState(
  habit: Habit,
  entries: EntryMap,
  date: DateKey,
): CompletionState {
  const amount = getAmount(entries, habit.id, date);
  if (amount <= 0) return 'empty';
  return amount >= habit.target.amount ? 'complete' : 'partial';
}

/** Fraction of the day's target reached, clamped to [0, 1]. */
export function dayProgress(habit: Habit, entries: EntryMap, date: DateKey): number {
  if (habit.target.amount <= 0) return 0;
  return Math.min(1, getAmount(entries, habit.id, date) / habit.target.amount);
}
