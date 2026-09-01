import { isValidDateKey } from '@/domain/dates';
import type { AppData, Entry, Frequency, Goal, Habit, Settings } from '@/domain/types';
import { DEFAULT_CATEGORIES, DEFAULT_SETTINGS, emptyData } from './schema';

/**
 * Defensive parsing. Anything read from disk or an imported file is untrusted:
 * a single malformed record must not take the whole app down, so unknown or
 * broken records are dropped rather than thrown.
 */

type Unknown = Record<string, unknown>;

const isObject = (value: unknown): value is Unknown =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const str = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

const num = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const bool = (value: unknown, fallback = false): boolean =>
  typeof value === 'boolean' ? value : fallback;

function parseFrequency(value: unknown): Frequency {
  if (!isObject(value)) return { kind: 'daily' };
  switch (value.kind) {
    case 'weekdays': {
      const days = Array.isArray(value.days)
        ? value.days.filter(
            (day): day is 0 | 1 | 2 | 3 | 4 | 5 | 6 =>
              typeof day === 'number' && day >= 0 && day <= 6,
          )
        : [];
      return { kind: 'weekdays', days: days.length > 0 ? days : [1, 2, 3, 4, 5] };
    }
    case 'timesPerWeek':
      return { kind: 'timesPerWeek', times: clamp(num(value.times, 3), 1, 7) };
    case 'timesPerMonth':
      return { kind: 'timesPerMonth', times: clamp(num(value.times, 10), 1, 31) };
    default:
      return { kind: 'daily' };
  }
}

function parseHabit(value: unknown, index: number): Habit | null {
  if (!isObject(value)) return null;
  const id = str(value.id);
  const name = str(value.name).trim();
  if (!id || !name) return null;
  const startDate = str(value.startDate);
  const target = isObject(value.target) ? value.target : {};
  const amount = Math.max(1, num(target.amount, 1));

  return {
    id,
    name,
    description: str(value.description) || undefined,
    icon: str(value.icon, '◆'),
    categoryId: str(value.categoryId, 'other'),
    frequency: parseFrequency(value.frequency),
    target: {
      kind: target.kind === 'quantity' ? 'quantity' : 'check',
      amount,
      unit: str(target.unit) || undefined,
      step: Math.max(1, num(target.step, 1)),
    },
    time: str(value.time) || undefined,
    startDate: isValidDateKey(startDate) ? startDate : todayFallback(),
    archived: bool(value.archived),
    archivedAt: isValidDateKey(str(value.archivedAt)) ? str(value.archivedAt) : undefined,
    order: num(value.order, index),
    createdAt: str(value.createdAt, new Date().toISOString()),
  };
}

function parseEntry(value: unknown): Entry | null {
  if (!isObject(value)) return null;
  const habitId = str(value.habitId);
  const date = str(value.date);
  if (!habitId || !isValidDateKey(date)) return null;
  const amount = num(value.amount, 0);
  if (amount <= 0) return null;
  return { habitId, date, amount, updatedAt: str(value.updatedAt, new Date().toISOString()) };
}

function parseGoal(value: unknown): Goal | null {
  if (!isObject(value)) return null;
  const id = str(value.id);
  const metric = isObject(value.metric) ? value.metric : null;
  if (!id || !metric) return null;
  const kind = str(metric.kind);
  const habitId = str(metric.habitId);

  let parsedMetric: Goal['metric'];
  if (kind === 'habitDays' && habitId) parsedMetric = { kind: 'habitDays', habitId };
  else if (kind === 'habitAmount' && habitId) parsedMetric = { kind: 'habitAmount', habitId };
  else if (kind === 'perfectDays') parsedMetric = { kind: 'perfectDays' };
  else if (kind === 'consistency') parsedMetric = { kind: 'consistency' };
  else return null;

  return {
    id,
    title: str(value.title, 'Goal'),
    period: value.period === 'month' ? 'month' : 'week',
    metric: parsedMetric,
    target: Math.max(1, num(value.target, 1)),
    createdAt: str(value.createdAt, new Date().toISOString()),
  };
}

function parseSettings(value: unknown): Settings {
  if (!isObject(value)) return { ...DEFAULT_SETTINGS };
  const theme = value.theme;
  return {
    weekStart: value.weekStart === 0 ? 0 : 1,
    theme: theme === 'light' || theme === 'dark' || theme === 'system' ? theme : 'system',
    confirmDestructive: bool(value.confirmDestructive, true),
    reduceMotion: bool(value.reduceMotion, false),
  };
}

export function parseAppData(value: unknown): AppData {
  if (!isObject(value)) return emptyData();

  const habits = Array.isArray(value.habits)
    ? value.habits
        .map((habit, index) => parseHabit(habit, index))
        .filter((habit): habit is Habit => habit !== null)
    : [];

  const habitIds = new Set(habits.map((habit) => habit.id));

  const rawEntries = isObject(value.entries) ? Object.values(value.entries) : [];
  const entries: AppData['entries'] = {};
  for (const raw of rawEntries) {
    const entry = parseEntry(raw);
    if (!entry || !habitIds.has(entry.habitId)) continue;
    entries[`${entry.habitId}|${entry.date}`] = entry;
  }

  const categories = Array.isArray(value.categories)
    ? value.categories
        .filter(isObject)
        .map((category) => ({
          id: str(category.id),
          name: str(category.name),
          system: bool(category.system),
        }))
        .filter((category) => category.id && category.name)
    : [];

  const goals = Array.isArray(value.goals)
    ? value.goals.map(parseGoal).filter((goal): goal is Goal => goal !== null)
    : [];

  return {
    habits: habits.sort((a, b) => a.order - b.order).map((habit, index) => ({ ...habit, order: index })),
    entries,
    categories: categories.length > 0 ? categories : DEFAULT_CATEGORIES.map((c) => ({ ...c })),
    goals: goals.filter(
      (goal) => !('habitId' in goal.metric) || habitIds.has(goal.metric.habitId),
    ),
    settings: parseSettings(value.settings),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function todayFallback(): string {
  const now = new Date();
  return `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, '0')}-${`${now.getDate()}`.padStart(2, '0')}`;
}
