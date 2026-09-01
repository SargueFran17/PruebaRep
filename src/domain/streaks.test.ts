import { describe, expect, it } from 'vitest';
import { makeEntries, makeHabit, mergeEntries } from '@/test/factories';
import type { Frequency } from './types';
import { computeOverallStreak, computeStreak, formatStreak } from './streaks';

const MONDAY_WED_FRI: Frequency = { kind: 'weekdays', days: [1, 3, 5] };

describe('daily habits', () => {
  it('counts consecutive completed days', () => {
    const habit = makeHabit({ startDate: '2025-09-01' });
    const entries = makeEntries(habit.id, ['2025-09-01', '2025-09-02', '2025-09-03']);
    const streak = computeStreak(habit, entries, '2025-09-03', 1);
    expect(streak.current).toBe(3);
    expect(streak.best).toBe(3);
    expect(streak.unit).toBe('day');
  });

  it('breaks on a missed day', () => {
    const habit = makeHabit({ startDate: '2025-09-01' });
    const entries = makeEntries(habit.id, ['2025-09-01', '2025-09-03', '2025-09-04']);
    const streak = computeStreak(habit, entries, '2025-09-04', 1);
    expect(streak.current).toBe(2);
    expect(streak.best).toBe(2);
  });

  it('keeps the best streak after the current one breaks', () => {
    const habit = makeHabit({ startDate: '2025-09-01' });
    const entries = makeEntries(habit.id, [
      '2025-09-01',
      '2025-09-02',
      '2025-09-03',
      '2025-09-04',
      // 5th missed
      '2025-09-06',
    ]);
    const streak = computeStreak(habit, entries, '2025-09-06', 1);
    expect(streak.current).toBe(1);
    expect(streak.best).toBe(4);
  });

  it('does not break the streak just because today is not done yet', () => {
    const habit = makeHabit({ startDate: '2025-09-01' });
    const entries = makeEntries(habit.id, ['2025-09-01', '2025-09-02', '2025-09-03']);
    const streak = computeStreak(habit, entries, '2025-09-04', 1);
    expect(streak.current).toBe(3);
    expect(streak.atRisk).toBe(true);
  });

  it('reports no streak before anything is logged', () => {
    const habit = makeHabit({ startDate: '2025-09-01' });
    const streak = computeStreak(habit, {}, '2025-09-05', 1);
    expect(streak.current).toBe(0);
    expect(streak.best).toBe(0);
    expect(streak.atRisk).toBe(false);
  });

  it('ignores days before the habit started', () => {
    const habit = makeHabit({ startDate: '2025-09-03' });
    const entries = makeEntries(habit.id, ['2025-09-01', '2025-09-03', '2025-09-04']);
    expect(computeStreak(habit, entries, '2025-09-04', 1).current).toBe(2);
  });

  it('counts a partial quantity as incomplete', () => {
    const habit = makeHabit({
      startDate: '2025-09-01',
      target: { kind: 'quantity', amount: 20, unit: 'min', step: 5 },
    });
    const entries = makeEntries(habit.id, [
      ['2025-09-01', 20],
      ['2025-09-02', 10],
      ['2025-09-03', 25],
    ]);
    const streak = computeStreak(habit, entries, '2025-09-03', 1);
    expect(streak.current).toBe(1);
    expect(streak.best).toBe(1);
  });
});

describe('scheduled-day habits', () => {
  it('is not broken by an unscheduled day in between', () => {
    // Mon 1st, Wed 3rd, Fri 5th — Tuesday and Thursday are simply not expected.
    const habit = makeHabit({ frequency: MONDAY_WED_FRI, startDate: '2025-09-01' });
    const entries = makeEntries(habit.id, ['2025-09-01', '2025-09-03', '2025-09-05']);
    const streak = computeStreak(habit, entries, '2025-09-05', 1);
    expect(streak.current).toBe(3);
    expect(streak.best).toBe(3);
  });

  it('breaks when a scheduled day is missed', () => {
    const habit = makeHabit({ frequency: MONDAY_WED_FRI, startDate: '2025-09-01' });
    const entries = makeEntries(habit.id, ['2025-09-01', '2025-09-05']);
    expect(computeStreak(habit, entries, '2025-09-05', 1).current).toBe(1);
  });

  it('survives a whole unscheduled weekend', () => {
    const habit = makeHabit({
      frequency: { kind: 'weekdays', days: [1, 2, 3, 4, 5] },
      startDate: '2025-09-01',
    });
    const entries = makeEntries(habit.id, [
      '2025-09-04',
      '2025-09-05',
      // 6th & 7th are the weekend
      '2025-09-08',
    ]);
    expect(computeStreak(habit, entries, '2025-09-08', 1).current).toBe(3);
  });

  it('keeps the streak alive when today is scheduled but not yet done', () => {
    const habit = makeHabit({ frequency: MONDAY_WED_FRI, startDate: '2025-09-01' });
    const entries = makeEntries(habit.id, ['2025-09-01', '2025-09-03']);
    const streak = computeStreak(habit, entries, '2025-09-05', 1);
    expect(streak.current).toBe(2);
    expect(streak.atRisk).toBe(true);
  });

  it('crosses a month boundary', () => {
    const habit = makeHabit({
      frequency: { kind: 'weekdays', days: [1, 2, 3, 4, 5] },
      startDate: '2025-09-25',
    });
    const entries = makeEntries(habit.id, [
      '2025-09-29',
      '2025-09-30',
      '2025-10-01',
      '2025-10-02',
    ]);
    expect(computeStreak(habit, entries, '2025-10-02', 1).current).toBe(4);
  });

  it('crosses a year boundary', () => {
    const habit = makeHabit({ startDate: '2025-12-29' });
    const entries = makeEntries(habit.id, [
      '2025-12-30',
      '2025-12-31',
      '2026-01-01',
      '2026-01-02',
    ]);
    expect(computeStreak(habit, entries, '2026-01-02', 1).current).toBe(4);
  });

  it('crosses a leap day', () => {
    const habit = makeHabit({ startDate: '2024-02-27' });
    const entries = makeEntries(habit.id, [
      '2024-02-27',
      '2024-02-28',
      '2024-02-29',
      '2024-03-01',
    ]);
    expect(computeStreak(habit, entries, '2024-03-01', 1).current).toBe(4);
  });
});

describe('quota habits', () => {
  it('counts satisfied weeks, not days', () => {
    // 3× per week, starting Monday 1 Sep 2025.
    const habit = makeHabit({
      frequency: { kind: 'timesPerWeek', times: 3 },
      startDate: '2025-09-01',
    });
    const entries = makeEntries(habit.id, [
      '2025-09-01', '2025-09-03', '2025-09-05', // week 1: 3 ✓
      '2025-09-08', '2025-09-10', '2025-09-13', // week 2: 3 ✓
      '2025-09-15', '2025-09-17', '2025-09-19', // week 3: 3 ✓
    ]);
    const streak = computeStreak(habit, entries, '2025-09-21', 1);
    expect(streak.unit).toBe('week');
    expect(streak.current).toBe(3);
    expect(streak.best).toBe(3);
  });

  it('breaks when a week falls short of the quota', () => {
    const habit = makeHabit({
      frequency: { kind: 'timesPerWeek', times: 3 },
      startDate: '2025-09-01',
    });
    const entries = makeEntries(habit.id, [
      '2025-09-01', '2025-09-03', '2025-09-05', // week 1 ✓
      '2025-09-08', // week 2 ✗ (1 of 3)
      '2025-09-15', '2025-09-17', '2025-09-19', // week 3 ✓
    ]);
    const streak = computeStreak(habit, entries, '2025-09-21', 1);
    expect(streak.current).toBe(1);
    expect(streak.best).toBe(1);
  });

  it('does not break on the week still in progress', () => {
    const habit = makeHabit({
      frequency: { kind: 'timesPerWeek', times: 3 },
      startDate: '2025-09-01',
    });
    const entries = makeEntries(habit.id, [
      '2025-09-01', '2025-09-03', '2025-09-05', // week 1 ✓
      '2025-09-08', // current week, only 1 so far
    ]);
    const streak = computeStreak(habit, entries, '2025-09-09', 1);
    expect(streak.current).toBe(1);
    expect(streak.atRisk).toBe(true);
  });

  it('extends immediately once the open week is satisfied', () => {
    const habit = makeHabit({
      frequency: { kind: 'timesPerWeek', times: 2 },
      startDate: '2025-09-01',
    });
    const entries = makeEntries(habit.id, [
      '2025-09-01', '2025-09-03',
      '2025-09-08', '2025-09-09',
    ]);
    const streak = computeStreak(habit, entries, '2025-09-09', 1);
    expect(streak.current).toBe(2);
    expect(streak.atRisk).toBe(false);
  });

  it('pro-rates the quota when the habit starts mid-week', () => {
    // Starts Friday: only 3 of 7 days available, so a 4×/week quota drops to 2.
    const habit = makeHabit({
      frequency: { kind: 'timesPerWeek', times: 4 },
      startDate: '2025-09-05',
    });
    const entries = makeEntries(habit.id, [
      '2025-09-05', '2025-09-06', // 2 in the partial first week
      '2025-09-08', '2025-09-09', '2025-09-10', '2025-09-11', // 4 in a full week
    ]);
    const streak = computeStreak(habit, entries, '2025-09-14', 1);
    expect(streak.current).toBe(2);
  });

  it('respects the week-start setting', () => {
    const habit = makeHabit({
      frequency: { kind: 'timesPerWeek', times: 2 },
      startDate: '2025-09-01',
    });
    // 7 Sep is a Sunday: a new week when weeks start on Sunday, the last day
    // of the previous week when they start on Monday.
    const entries = makeEntries(habit.id, ['2025-09-06', '2025-09-07']);
    expect(computeStreak(habit, entries, '2025-09-07', 1).current).toBe(1);
    expect(computeStreak(habit, entries, '2025-09-07', 0).current).toBe(0);
  });

  it('counts satisfied months for a monthly quota', () => {
    const habit = makeHabit({
      frequency: { kind: 'timesPerMonth', times: 2 },
      startDate: '2025-07-01',
    });
    const entries = makeEntries(habit.id, [
      '2025-07-04', '2025-07-20',
      '2025-08-05', '2025-08-22',
      '2025-09-02', '2025-09-14',
    ]);
    const streak = computeStreak(habit, entries, '2025-09-20', 1);
    expect(streak.unit).toBe('month');
    expect(streak.current).toBe(3);
  });

  it('breaks a monthly streak on a short month', () => {
    const habit = makeHabit({
      frequency: { kind: 'timesPerMonth', times: 2 },
      startDate: '2025-01-01',
    });
    const entries = makeEntries(habit.id, [
      '2025-01-05', '2025-01-20',
      '2025-02-10', // only one in February
      '2025-03-03', '2025-03-19',
    ]);
    expect(computeStreak(habit, entries, '2025-03-31', 1).current).toBe(1);
  });
});

describe('archived habits', () => {
  it('freezes history at the archive date instead of decaying to zero', () => {
    const habit = makeHabit({
      startDate: '2025-09-01',
      archived: true,
      archivedAt: '2025-09-03',
    });
    const entries = makeEntries(habit.id, ['2025-09-01', '2025-09-02', '2025-09-03']);
    const streak = computeStreak(habit, entries, '2025-09-30', 1);
    expect(streak.current).toBe(3);
    expect(streak.best).toBe(3);
  });
});

describe('overall streak', () => {
  it('counts days where every scheduled habit was completed', () => {
    const a = makeHabit({ id: 'a', startDate: '2025-09-01' });
    const b = makeHabit({ id: 'b', startDate: '2025-09-01' });
    const entries = mergeEntries(
      makeEntries('a', ['2025-09-01', '2025-09-02', '2025-09-03']),
      makeEntries('b', ['2025-09-01', '2025-09-02', '2025-09-03']),
    );
    const streak = computeOverallStreak([a, b], entries, '2025-09-03', '2025-09-01');
    expect(streak.current).toBe(3);
  });

  it('breaks when one habit is missed', () => {
    const a = makeHabit({ id: 'a', startDate: '2025-09-01' });
    const b = makeHabit({ id: 'b', startDate: '2025-09-01' });
    const entries = mergeEntries(
      makeEntries('a', ['2025-09-01', '2025-09-02', '2025-09-03']),
      makeEntries('b', ['2025-09-01', '2025-09-03']),
    );
    const streak = computeOverallStreak([a, b], entries, '2025-09-03', '2025-09-01');
    expect(streak.current).toBe(1);
    expect(streak.best).toBe(1);
  });

  it('skips days where nothing was scheduled without breaking', () => {
    const habit = makeHabit({
      id: 'a',
      frequency: { kind: 'weekdays', days: [1, 2, 3, 4, 5] },
      startDate: '2025-09-01',
    });
    const entries = makeEntries('a', ['2025-09-04', '2025-09-05', '2025-09-08']);
    const streak = computeOverallStreak([habit], entries, '2025-09-08', '2025-09-01');
    expect(streak.current).toBe(3);
  });

  it('leaves an unfinished today alone', () => {
    const habit = makeHabit({ id: 'a', startDate: '2025-09-01' });
    const entries = makeEntries('a', ['2025-09-01', '2025-09-02']);
    const streak = computeOverallStreak([habit], entries, '2025-09-03', '2025-09-01');
    expect(streak.current).toBe(2);
    expect(streak.atRisk).toBe(true);
  });
});

describe('formatStreak', () => {
  it('reads naturally in each unit', () => {
    expect(formatStreak({ current: 0, best: 0, unit: 'day', atRisk: false })).toBe('No streak yet');
    expect(formatStreak({ current: 1, best: 1, unit: 'day', atRisk: false })).toBe('1 day');
    expect(formatStreak({ current: 4, best: 4, unit: 'week', atRisk: false })).toBe('4 weeks');
  });
});
