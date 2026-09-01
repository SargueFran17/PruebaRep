import { fromDateKey, todayKey } from '@/domain/dates';
import { formatMeasure } from '@/domain/goals';
import type { DateKey } from '@/domain/types';

export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

export function formatAmount(amount: number, unit?: string): string {
  const value = Number.isInteger(amount) ? `${amount}` : amount.toFixed(1).replace(/\.0$/, '');
  return unit ? `${value} ${unit}` : value;
}

/** Renders large minute counts as hours: 1200 min → "20 h". */
export const formatQuantity = formatMeasure;

const longDate = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
});
const longDateWithYear = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});
const mediumDate = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
const monthYear = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });
const monthOnly = new Intl.DateTimeFormat(undefined, { month: 'long' });

/** Adds the year only when it is not the current one, to keep today's header short. */
export function formatLongDate(key: DateKey, today: DateKey = todayKey()): string {
  const date = fromDateKey(key);
  return key.slice(0, 4) === today.slice(0, 4)
    ? longDate.format(date)
    : longDateWithYear.format(date);
}

export function formatMediumDate(key: DateKey): string {
  return mediumDate.format(fromDateKey(key));
}

export function formatMonthYear(key: DateKey): string {
  return monthYear.format(fromDateKey(key));
}

export function formatMonth(key: DateKey): string {
  return monthOnly.format(fromDateKey(key));
}

export function greetingFor(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour < 5) return 'Still up';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/** "Sep 1 – Sep 7" or "Sep 29 – Oct 5". */
export function formatRange(start: DateKey, end: DateKey): string {
  return `${formatMediumDate(start)} – ${formatMediumDate(end)}`;
}

export function pluralise(count: number, singular: string, plural = `${singular}s`): string {
  return count === 1 ? singular : plural;
}
