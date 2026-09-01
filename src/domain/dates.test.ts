import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonths,
  daysInMonth,
  daysRemainingIn,
  differenceInDays,
  eachDay,
  elapsedRange,
  endOfMonth,
  endOfWeek,
  fromDateKey,
  isValidDateKey,
  monthRange,
  startOfMonth,
  startOfWeek,
  toDateKey,
  weekRange,
  weekdayOf,
} from './dates';

describe('date keys', () => {
  it('round-trips a local calendar day', () => {
    expect(toDateKey(new Date(2025, 8, 1))).toBe('2025-09-01');
    expect(fromDateKey('2025-09-01').getDate()).toBe(1);
    expect(fromDateKey('2025-09-01').getMonth()).toBe(8);
  });

  it('does not shift the day the way `new Date(string)` does', () => {
    // The classic bug: ISO date-only strings parse as UTC midnight.
    expect(fromDateKey('2025-03-30').getDate()).toBe(30);
    expect(toDateKey(fromDateKey('2025-01-01'))).toBe('2025-01-01');
  });

  it('rejects malformed and impossible keys', () => {
    expect(isValidDateKey('2025-13-01')).toBe(false);
    expect(isValidDateKey('2025-02-30')).toBe(false);
    expect(isValidDateKey('2025-1-1')).toBe(false);
    expect(isValidDateKey('not-a-date')).toBe(false);
    expect(isValidDateKey('2024-02-29')).toBe(true);
  });

  it('throws on an invalid key rather than returning Invalid Date', () => {
    expect(() => fromDateKey('nope')).toThrow();
  });
});

describe('addDays', () => {
  it('crosses month boundaries', () => {
    expect(addDays('2025-01-31', 1)).toBe('2025-02-01');
    expect(addDays('2025-03-01', -1)).toBe('2025-02-28');
  });

  it('crosses year boundaries', () => {
    expect(addDays('2025-12-31', 1)).toBe('2026-01-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('handles leap years', () => {
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2024-02-29', 1)).toBe('2024-03-01');
    expect(addDays('2023-02-28', 1)).toBe('2023-03-01');
  });
});

describe('addMonths', () => {
  it('clamps to the last valid day of the target month', () => {
    expect(addMonths('2025-01-31', 1)).toBe('2025-02-28');
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29');
    expect(addMonths('2025-03-31', -1)).toBe('2025-02-28');
  });

  it('crosses years', () => {
    expect(addMonths('2025-12-15', 1)).toBe('2026-01-15');
    expect(addMonths('2025-01-15', -1)).toBe('2024-12-15');
  });
});

describe('week boundaries', () => {
  it('starts on Monday when configured', () => {
    // 2025-09-01 is a Monday.
    expect(startOfWeek('2025-09-03', 1)).toBe('2025-09-01');
    expect(endOfWeek('2025-09-03', 1)).toBe('2025-09-07');
  });

  it('starts on Sunday when configured', () => {
    expect(startOfWeek('2025-09-03', 0)).toBe('2025-08-31');
    expect(endOfWeek('2025-09-03', 0)).toBe('2025-09-06');
  });

  it('handles a week spanning two months', () => {
    const range = weekRange('2025-10-01', 1);
    expect(range.start).toBe('2025-09-29');
    expect(range.end).toBe('2025-10-05');
  });

  it('handles a week spanning two years', () => {
    const range = weekRange('2026-01-01', 1);
    expect(range.start).toBe('2025-12-29');
    expect(range.end).toBe('2026-01-04');
  });
});

describe('month boundaries', () => {
  it('finds the last day of months of differing length', () => {
    expect(endOfMonth('2025-02-10')).toBe('2025-02-28');
    expect(endOfMonth('2024-02-10')).toBe('2024-02-29');
    expect(endOfMonth('2025-04-10')).toBe('2025-04-30');
    expect(endOfMonth('2025-12-10')).toBe('2025-12-31');
  });

  it('reports days in month', () => {
    expect(daysInMonth(2025, 1)).toBe(28);
    expect(daysInMonth(2024, 1)).toBe(29);
    expect(daysInMonth(2025, 0)).toBe(31);
  });

  it('builds a month range', () => {
    expect(monthRange('2025-09-15')).toEqual({ start: '2025-09-01', end: '2025-09-30' });
    expect(startOfMonth('2025-09-15')).toBe('2025-09-01');
  });
});

describe('eachDay', () => {
  it('is inclusive at both ends', () => {
    expect(eachDay('2025-09-01', '2025-09-03')).toEqual([
      '2025-09-01',
      '2025-09-02',
      '2025-09-03',
    ]);
  });

  it('returns a single day for an equal range and nothing for an inverted one', () => {
    expect(eachDay('2025-09-01', '2025-09-01')).toEqual(['2025-09-01']);
    expect(eachDay('2025-09-05', '2025-09-01')).toEqual([]);
  });

  it('spans a leap-year February correctly', () => {
    expect(eachDay('2024-02-27', '2024-03-01')).toHaveLength(4);
  });
});

describe('differenceInDays', () => {
  it('counts whole days across a DST boundary', () => {
    expect(differenceInDays('2025-03-29', '2025-03-31')).toBe(2);
    expect(differenceInDays('2025-10-25', '2025-10-27')).toBe(2);
  });

  it('is signed', () => {
    expect(differenceInDays('2025-09-05', '2025-09-01')).toBe(-4);
  });
});

describe('range helpers', () => {
  it('clips a range to today', () => {
    expect(elapsedRange({ start: '2025-09-01', end: '2025-09-30' }, '2025-09-10')).toEqual({
      start: '2025-09-01',
      end: '2025-09-10',
    });
  });

  it('returns null for a range that has not started', () => {
    expect(elapsedRange({ start: '2025-10-01', end: '2025-10-31' }, '2025-09-10')).toBeNull();
  });

  it('does not extend a range that already ended', () => {
    expect(elapsedRange({ start: '2025-08-01', end: '2025-08-31' }, '2025-09-10')).toEqual({
      start: '2025-08-01',
      end: '2025-08-31',
    });
  });

  it('counts days remaining, excluding today', () => {
    expect(daysRemainingIn({ start: '2025-09-01', end: '2025-09-07' }, '2025-09-05')).toBe(2);
    expect(daysRemainingIn({ start: '2025-09-01', end: '2025-09-07' }, '2025-09-07')).toBe(0);
    expect(daysRemainingIn({ start: '2025-09-01', end: '2025-09-07' }, '2025-09-30')).toBe(0);
  });
});

describe('weekdayOf', () => {
  it('matches the local calendar', () => {
    expect(weekdayOf('2025-09-01')).toBe(1); // Monday
    expect(weekdayOf('2025-09-07')).toBe(0); // Sunday
  });
});
