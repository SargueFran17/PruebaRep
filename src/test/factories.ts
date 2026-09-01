import { entryKey } from '@/domain/entries';
import type { EntryMap } from '@/domain/entries';
import type { DateKey, Frequency, Goal, Habit, HabitTarget } from '@/domain/types';

export function makeHabit(overrides: Partial<Habit> = {}): Habit {
  const target: HabitTarget = overrides.target ?? { kind: 'check', amount: 1, step: 1 };
  const frequency: Frequency = overrides.frequency ?? { kind: 'daily' };
  return {
    id: 'h1',
    name: 'Test habit',
    icon: '◆',
    categoryId: 'other',
    startDate: '2025-01-01',
    archived: false,
    order: 0,
    createdAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
    frequency,
    target,
  };
}

/** Builds an entry map from `[date, amount]` pairs; amount defaults to 1. */
export function makeEntries(
  habitId: string,
  days: (DateKey | [DateKey, number])[],
): EntryMap {
  const entries: EntryMap = {};
  for (const day of days) {
    const [date, amount] = Array.isArray(day) ? day : [day, 1];
    entries[entryKey(habitId, date)] = {
      habitId,
      date,
      amount,
      updatedAt: '2025-01-01T00:00:00.000Z',
    };
  }
  return entries;
}

export function mergeEntries(...maps: EntryMap[]): EntryMap {
  return Object.assign({}, ...maps) as EntryMap;
}

export function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'g1',
    title: 'Test goal',
    period: 'week',
    metric: { kind: 'perfectDays' },
    target: 5,
    createdAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}
