import { addDays, todayKey, weekdayOf } from '@/domain/dates';
import { entryKey } from '@/domain/entries';
import { matchesFrequencyDay } from '@/domain/frequency';
import type { AppData, Entry, Goal, Habit } from '@/domain/types';
import { DEFAULT_CATEGORIES, DEFAULT_SETTINGS } from './schema';

const HISTORY_DAYS = 112;

/** Deterministic PRNG so the demo looks identical on every machine. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface DemoSpec {
  habit: Omit<Habit, 'createdAt' | 'order'>;
  /** Chance of completing on a scheduled day. */
  reliability: number;
  /** Chance of a partial (below-target) log. */
  partialChance: number;
  amountFor: (rand: () => number, target: number) => number;
}

export function buildDemoData(today: string = todayKey()): AppData {
  const start = addDays(today, -(HISTORY_DAYS - 1));
  const rand = mulberry32(20260901);

  const specs: DemoSpec[] = [
    {
      habit: {
        id: 'demo-workout',
        name: 'Morning workout',
        description: 'Strength or a long run before the day starts.',
        icon: '🏋️',
        categoryId: 'fitness',
        frequency: { kind: 'timesPerWeek', times: 4 },
        target: { kind: 'check', amount: 1, step: 1 },
        time: '07:00',
        startDate: start,
        archived: false,
      },
      reliability: 0.62,
      partialChance: 0,
      amountFor: () => 1,
    },
    {
      habit: {
        id: 'demo-read',
        name: 'Read',
        description: 'Twenty pages of something that is not a screen.',
        icon: '📖',
        categoryId: 'learning',
        frequency: { kind: 'daily' },
        target: { kind: 'quantity', amount: 20, unit: 'min', step: 5 },
        time: '21:30',
        startDate: start,
        archived: false,
      },
      reliability: 0.84,
      partialChance: 0.14,
      amountFor: (r, target) => target + Math.round(r() * 4) * 5,
    },
    {
      habit: {
        id: 'demo-meditate',
        name: 'Meditation',
        icon: '🧘',
        categoryId: 'mind',
        frequency: { kind: 'daily' },
        target: { kind: 'quantity', amount: 10, unit: 'min', step: 5 },
        time: '06:45',
        startDate: start,
        archived: false,
      },
      reliability: 0.78,
      partialChance: 0.1,
      amountFor: (r, target) => target + Math.round(r() * 2) * 5,
    },
    {
      habit: {
        id: 'demo-water',
        name: 'Drink water',
        description: 'Two litres across the day.',
        icon: '💧',
        categoryId: 'health',
        frequency: { kind: 'daily' },
        target: { kind: 'quantity', amount: 2, unit: 'L', step: 0.5 },
        startDate: start,
        archived: false,
      },
      reliability: 0.88,
      partialChance: 0.18,
      amountFor: (r, target) => target + (r() > 0.7 ? 0.5 : 0),
    },
    {
      habit: {
        id: 'demo-deepwork',
        name: 'Deep work',
        description: 'Ninety uninterrupted minutes on the hard thing.',
        icon: '🎯',
        categoryId: 'productivity',
        frequency: { kind: 'weekdays', days: [1, 2, 3, 4, 5] },
        target: { kind: 'quantity', amount: 90, unit: 'min', step: 15 },
        time: '09:30',
        startDate: start,
        archived: false,
      },
      reliability: 0.74,
      partialChance: 0.12,
      amountFor: (r, target) => target + Math.round(r() * 3) * 15,
    },
    {
      habit: {
        id: 'demo-journal',
        name: 'Evening journal',
        icon: '✍️',
        categoryId: 'personal',
        frequency: { kind: 'timesPerMonth', times: 16 },
        target: { kind: 'check', amount: 1, step: 1 },
        startDate: start,
        archived: false,
      },
      reliability: 0.55,
      partialChance: 0,
      amountFor: () => 1,
    },
  ];

  const habits: Habit[] = specs.map((spec, index) => ({
    ...spec.habit,
    order: index,
    createdAt: new Date().toISOString(),
  }));

  const entries: Record<string, Entry> = {};
  const now = new Date().toISOString();

  for (const spec of specs) {
    const { habit } = spec;
    // A gentle upward trend: the user has been getting better over time.
    for (let offset = 0; offset < HISTORY_DAYS; offset += 1) {
      const date = addDays(start, offset);
      if (date > today) break;
      if (!matchesFrequencyDay(habit.frequency, date)) continue;

      const maturity = offset / HISTORY_DAYS;
      const weekend = weekdayOf(date) === 0 || weekdayOf(date) === 6;
      let chance = spec.reliability * (0.78 + maturity * 0.34);
      if (weekend && habit.frequency.kind !== 'weekdays') chance *= 0.92;
      // Leave the last two days sparse so the dashboard has something to do.
      if (date >= addDays(today, -1)) chance *= 0.45;

      const roll = rand();
      if (roll > chance) continue;

      const partial = rand() < spec.partialChance;
      const amount = partial
        ? Math.max(habit.target.step ?? 1, roundTo(habit.target.amount * 0.55, habit.target.step ?? 1))
        : spec.amountFor(rand, habit.target.amount);

      entries[entryKey(habit.id, date)] = {
        habitId: habit.id,
        date,
        amount,
        updatedAt: now,
      };
    }
  }

  const goals: Goal[] = [
    {
      id: 'demo-goal-workout',
      title: 'Train four times',
      period: 'week',
      metric: { kind: 'habitDays', habitId: 'demo-workout' },
      target: 4,
      createdAt: now,
    },
    {
      id: 'demo-goal-read-week',
      title: 'Read on five days',
      period: 'week',
      metric: { kind: 'habitDays', habitId: 'demo-read' },
      target: 5,
      createdAt: now,
    },
    {
      id: 'demo-goal-consistency',
      title: 'Stay above 85%',
      period: 'week',
      metric: { kind: 'consistency' },
      target: 85,
      createdAt: now,
    },
    {
      id: 'demo-goal-read-month',
      title: 'Read on twenty days',
      period: 'month',
      metric: { kind: 'habitDays', habitId: 'demo-read' },
      target: 20,
      createdAt: now,
    },
    {
      id: 'demo-goal-deepwork',
      title: '20 hours of deep work',
      period: 'month',
      metric: { kind: 'habitAmount', habitId: 'demo-deepwork' },
      target: 1200,
      createdAt: now,
    },
    {
      id: 'demo-goal-perfect',
      title: 'Twelve perfect days',
      period: 'month',
      metric: { kind: 'perfectDays' },
      target: 12,
      createdAt: now,
    },
  ];

  return {
    habits,
    entries,
    categories: DEFAULT_CATEGORIES.map((category) => ({ ...category })),
    goals,
    settings: { ...DEFAULT_SETTINGS },
  };
}

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}
