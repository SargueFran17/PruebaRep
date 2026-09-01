import { describe, expect, it } from 'vitest';
import { makeEntries, makeHabit } from '@/test/factories';
import {
  countCompletions,
  describeFrequency,
  frequencyScale,
  habitWindowEnd,
  isDueOn,
  isRequiredOn,
  requiredDaysBetween,
  summarisePeriods,
  sumAmounts,
} from './frequency';

describe('frequencyScale', () => {
  it('separates day-scheduled habits from quota habits', () => {
    expect(frequencyScale({ kind: 'daily' })).toBe('day');
    expect(frequencyScale({ kind: 'weekdays', days: [1] })).toBe('day');
    expect(frequencyScale({ kind: 'timesPerWeek', times: 3 })).toBe('week');
    expect(frequencyScale({ kind: 'timesPerMonth', times: 3 })).toBe('month');
  });
});

describe('isDueOn', () => {
  it('shows a daily habit every day from its start date', () => {
    const habit = makeHabit({ startDate: '2025-09-02' });
    expect(isDueOn(habit, '2025-09-01')).toBe(false);
    expect(isDueOn(habit, '2025-09-02')).toBe(true);
  });

  it('shows a scheduled habit only on its days', () => {
    const habit = makeHabit({ frequency: { kind: 'weekdays', days: [1, 3] } });
    expect(isDueOn(habit, '2025-09-01')).toBe(true); // Monday
    expect(isDueOn(habit, '2025-09-02')).toBe(false); // Tuesday
    expect(isDueOn(habit, '2025-09-03')).toBe(true); // Wednesday
  });

  it('offers a quota habit every day', () => {
    const habit = makeHabit({ frequency: { kind: 'timesPerWeek', times: 2 } });
    expect(isDueOn(habit, '2025-09-02')).toBe(true);
    expect(isDueOn(habit, '2025-09-06')).toBe(true);
  });

  it('hides archived habits from the day', () => {
    const habit = makeHabit({ archived: true, archivedAt: '2025-09-02' });
    expect(isDueOn(habit, '2025-09-03')).toBe(false);
  });
});

describe('isRequiredOn', () => {
  it('never marks a quota habit as required on a specific day', () => {
    const habit = makeHabit({ frequency: { kind: 'timesPerWeek', times: 3 } });
    expect(isRequiredOn(habit, '2025-09-01')).toBe(false);
  });

  it('keeps requiring an archived habit within its lifetime, for honest history', () => {
    const habit = makeHabit({
      startDate: '2025-09-01',
      archived: true,
      archivedAt: '2025-09-05',
    });
    expect(isRequiredOn(habit, '2025-09-03')).toBe(true);
    expect(isRequiredOn(habit, '2025-09-06')).toBe(false);
  });
});

describe('requiredDaysBetween', () => {
  it('lists only the scheduled days in the range', () => {
    const habit = makeHabit({
      frequency: { kind: 'weekdays', days: [1, 5] },
      startDate: '2025-09-01',
    });
    expect(requiredDaysBetween(habit, '2025-09-01', '2025-09-14')).toEqual([
      '2025-09-01',
      '2025-09-05',
      '2025-09-08',
      '2025-09-12',
    ]);
  });
});

describe('counting', () => {
  const habit = makeHabit({
    id: 'a',
    startDate: '2025-09-01',
    target: { kind: 'quantity', amount: 20, unit: 'min', step: 5 },
  });
  const entries = makeEntries('a', [
    ['2025-09-01', 20],
    ['2025-09-02', 10],
    ['2025-09-03', 30],
  ]);

  it('counts only days that reach the target', () => {
    expect(countCompletions(habit, entries, '2025-09-01', '2025-09-03')).toBe(2);
  });

  it('sums every logged amount, complete or not', () => {
    expect(sumAmounts(habit, entries, '2025-09-01', '2025-09-03')).toBe(60);
  });

  it('excludes days outside the habit lifetime', () => {
    const late = makeHabit({ ...habit, startDate: '2025-09-03' });
    expect(countCompletions(late, entries, '2025-09-01', '2025-09-03')).toBe(1);
  });
});

describe('habitWindowEnd', () => {
  it('stops at the archive date', () => {
    const habit = makeHabit({ archived: true, archivedAt: '2025-09-05' });
    expect(habitWindowEnd(habit, '2025-09-20')).toBe('2025-09-05');
  });

  it('otherwise runs to today', () => {
    expect(habitWindowEnd(makeHabit(), '2025-09-20')).toBe('2025-09-20');
  });
});

describe('summarisePeriods', () => {
  it('returns nothing for day-scheduled habits', () => {
    expect(summarisePeriods(makeHabit(), {}, '2025-09-10', 1)).toEqual([]);
  });

  it('keeps the full quota for the week in progress', () => {
    const habit = makeHabit({
      id: 'a',
      frequency: { kind: 'timesPerWeek', times: 4 },
      startDate: '2025-09-01',
    });
    const periods = summarisePeriods(habit, makeEntries('a', ['2025-09-01']), '2025-09-02', 1);
    expect(periods).toHaveLength(1);
    expect(periods[0]).toMatchObject({
      quota: 4,
      elapsedQuota: 1,
      completions: 1,
      satisfied: false,
      inProgress: true,
    });
  });

  it('pro-rates a period clipped by the habit start date', () => {
    const habit = makeHabit({
      id: 'a',
      frequency: { kind: 'timesPerWeek', times: 4 },
      startDate: '2025-09-05', // Friday: 3 of 7 days
    });
    const periods = summarisePeriods(habit, {}, '2025-09-14', 1);
    expect(periods[0]?.quota).toBe(2);
    expect(periods[1]?.quota).toBe(4);
  });

  it('does not create periods beyond today', () => {
    const habit = makeHabit({
      frequency: { kind: 'timesPerWeek', times: 2 },
      startDate: '2025-09-01',
    });
    const periods = summarisePeriods(habit, {}, '2025-09-10', 1);
    expect(periods).toHaveLength(2);
    expect(periods[periods.length - 1]?.end).toBe('2025-09-14');
  });
});

describe('describeFrequency', () => {
  it('names common patterns rather than listing days', () => {
    expect(describeFrequency({ kind: 'daily' }, 1)).toBe('Every day');
    expect(describeFrequency({ kind: 'weekdays', days: [1, 2, 3, 4, 5] }, 1)).toBe('Weekdays');
    expect(describeFrequency({ kind: 'weekdays', days: [0, 6] }, 1)).toBe('Weekends');
    expect(describeFrequency({ kind: 'weekdays', days: [0, 1, 2, 3, 4, 5, 6] }, 1)).toBe(
      'Every day',
    );
  });

  it('lists individual days in the user week order', () => {
    expect(describeFrequency({ kind: 'weekdays', days: [0, 3] }, 1)).toBe('Wed · Sun');
    expect(describeFrequency({ kind: 'weekdays', days: [0, 3] }, 0)).toBe('Sun · Wed');
  });

  it('describes quotas', () => {
    expect(describeFrequency({ kind: 'timesPerWeek', times: 4 }, 1)).toBe('4× per week');
    expect(describeFrequency({ kind: 'timesPerMonth', times: 12 }, 1)).toBe('12× per month');
  });
});
