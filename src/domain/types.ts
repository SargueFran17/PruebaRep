/**
 * Core domain entities.
 *
 * Dates are stored as `DateKey` — a local calendar day in `YYYY-MM-DD` form.
 * Never a timestamp: a habit belongs to the day the user lived, not to a UTC
 * instant, so day identity must survive timezone and DST changes.
 */

export type DateKey = string;

/** 0 = Sunday … 6 = Saturday, matching `Date.prototype.getDay`. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type WeekStart = 0 | 1;

export type Frequency =
  | { kind: 'daily' }
  | { kind: 'weekdays'; days: Weekday[] }
  | { kind: 'timesPerWeek'; times: number }
  | { kind: 'timesPerMonth'; times: number };

export type FrequencyKind = Frequency['kind'];

/** A habit is either a simple check, or a measurable amount (30 min, 2 L…). */
export interface HabitTarget {
  kind: 'check' | 'quantity';
  /** Amount required for a day to count as complete. `1` for checks. */
  amount: number;
  /** Display unit for quantity habits: "min", "pages", "L"… */
  unit?: string;
  /** Increment used by the quick-add stepper. */
  step?: number;
}

export interface Habit {
  id: string;
  name: string;
  description?: string;
  /** A single emoji used as the habit's mark. */
  icon: string;
  categoryId: string;
  frequency: Frequency;
  target: HabitTarget;
  /** Optional reminder time, `HH:mm`. Purely informational for now. */
  time?: string;
  startDate: DateKey;
  archived: boolean;
  /** Day the habit was archived; scans stop here so history stays truthful. */
  archivedAt?: DateKey;
  order: number;
  createdAt: string;
}

/** One habit on one day. Absence of an entry means "not done". */
export interface Entry {
  habitId: string;
  date: DateKey;
  amount: number;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  /** Built-in categories cannot be deleted, only renamed. */
  system?: boolean;
}

export type GoalPeriod = 'week' | 'month';

export type GoalMetric =
  /** Number of days this habit was completed. */
  | { kind: 'habitDays'; habitId: string }
  /** Sum of recorded amounts for this habit (minutes read, litres drunk…). */
  | { kind: 'habitAmount'; habitId: string }
  /** Percentage of all scheduled habit-days completed. */
  | { kind: 'consistency' }
  /** Number of days where every scheduled habit was completed. */
  | { kind: 'perfectDays' };

export interface Goal {
  id: string;
  title: string;
  period: GoalPeriod;
  metric: GoalMetric;
  target: number;
  createdAt: string;
}

export type ThemePreference = 'light' | 'dark' | 'system';

export interface Settings {
  weekStart: WeekStart;
  theme: ThemePreference;
  /** Show a confirmation before destructive actions. */
  confirmDestructive: boolean;
  reduceMotion: boolean;
}

export interface AppData {
  habits: Habit[];
  /** Keyed by `${habitId}|${date}` for O(1) lookup. */
  entries: Record<string, Entry>;
  categories: Category[];
  goals: Goal[];
  settings: Settings;
}
