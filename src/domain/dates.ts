import type { DateKey, WeekStart, Weekday } from './types';

/**
 * All day arithmetic goes through this module.
 *
 * Rule: a `DateKey` is a *local* calendar day. We build `Date` objects with the
 * local constructor (`new Date(y, m, d)`) rather than parsing ISO strings,
 * because `new Date('2025-03-30')` is parsed as UTC midnight and silently
 * shifts a day for anyone west of Greenwich.
 */

const KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function toDateKey(date: Date): DateKey {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function fromDateKey(key: DateKey): Date {
  const match = KEY_PATTERN.exec(key);
  if (!match) throw new Error(`Invalid date key: ${key}`);
  const [, y, m, d] = match;
  return new Date(Number(y), Number(m) - 1, Number(d));
}

export function isValidDateKey(key: string): boolean {
  if (!KEY_PATTERN.test(key)) return false;
  return toDateKey(fromDateKey(key)) === key;
}

export function todayKey(now: Date = new Date()): DateKey {
  return toDateKey(now);
}

export function addDays(key: DateKey, days: number): DateKey {
  const date = fromDateKey(key);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

export function addMonths(key: DateKey, months: number): DateKey {
  const date = fromDateKey(key);
  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  // Clamp: 31 Jan + 1 month is 28/29 Feb, not 2/3 Mar.
  date.setDate(Math.min(day, daysInMonth(date.getFullYear(), date.getMonth())));
  return toDateKey(date);
}

export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function weekdayOf(key: DateKey): Weekday {
  return fromDateKey(key).getDay() as Weekday;
}

/** Whole days from `a` to `b`, signed. Immune to DST because it uses UTC noon. */
export function differenceInDays(a: DateKey, b: DateKey): number {
  const da = fromDateKey(a);
  const db = fromDateKey(b);
  const ua = Date.UTC(da.getFullYear(), da.getMonth(), da.getDate());
  const ub = Date.UTC(db.getFullYear(), db.getMonth(), db.getDate());
  return Math.round((ub - ua) / 86_400_000);
}

export function startOfWeek(key: DateKey, weekStart: WeekStart): DateKey {
  const day = weekdayOf(key);
  const diff = (day - weekStart + 7) % 7;
  return addDays(key, -diff);
}

export function endOfWeek(key: DateKey, weekStart: WeekStart): DateKey {
  return addDays(startOfWeek(key, weekStart), 6);
}

export function startOfMonth(key: DateKey): DateKey {
  return `${key.slice(0, 7)}-01`;
}

export function endOfMonth(key: DateKey): DateKey {
  const date = fromDateKey(key);
  const last = daysInMonth(date.getFullYear(), date.getMonth());
  return `${key.slice(0, 7)}-${`${last}`.padStart(2, '0')}`;
}

export interface DateRange {
  start: DateKey;
  end: DateKey;
}

export function weekRange(key: DateKey, weekStart: WeekStart): DateRange {
  return { start: startOfWeek(key, weekStart), end: endOfWeek(key, weekStart) };
}

export function monthRange(key: DateKey): DateRange {
  return { start: startOfMonth(key), end: endOfMonth(key) };
}

/** Inclusive list of day keys. Returns `[]` when the range is inverted. */
export function eachDay(start: DateKey, end: DateKey): DateKey[] {
  const days: DateKey[] = [];
  let cursor = start;
  let guard = 0;
  while (cursor <= end && guard < 20_000) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
    guard += 1;
  }
  return days;
}

export function isSameMonth(a: DateKey, b: DateKey): boolean {
  return a.slice(0, 7) === b.slice(0, 7);
}

/** Intersection of a range with `[, today]`; used so future days never count. */
export function elapsedRange(range: DateRange, today: DateKey): DateRange | null {
  if (range.start > today) return null;
  return { start: range.start, end: range.end < today ? range.end : today };
}

export function daysRemainingIn(range: DateRange, today: DateKey): number {
  if (today > range.end) return 0;
  if (today < range.start) return differenceInDays(range.start, range.end) + 1;
  return differenceInDays(today, range.end);
}
