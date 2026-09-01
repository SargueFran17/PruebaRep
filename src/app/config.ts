import { addMonths, endOfMonth, startOfMonth } from '@/domain/dates';
import type { DateKey } from '@/domain/types';

/**
 * How far ahead the calendar lets you look. Far enough to plan the next couple
 * of months, close enough that the history stays the point of the screen.
 * Future days are always read-only — you cannot tick a day that has not
 * happened.
 */
export const FUTURE_MONTHS = 2;

/** Last day the calendar will navigate to. */
export function futureHorizon(today: DateKey): DateKey {
  return endOfMonth(addMonths(today, FUTURE_MONTHS));
}

/** Last month the calendar will navigate to, as its first day. */
export function futureMonthLimit(today: DateKey): DateKey {
  return startOfMonth(addMonths(today, FUTURE_MONTHS));
}
