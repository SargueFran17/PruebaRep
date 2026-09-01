import { describe, expect, it } from 'vitest';
import { makeEntries, makeHabit, mergeEntries } from '@/test/factories';
import {
  completionsByHabit,
  computeHabitStats,
  computeOverview,
  countAllCompletions,
  habitCompletionRate,
  summariseDay,
  summariseRange,
  weeklySeries,
} from './stats';

describe('habitCompletionRate', () => {
  it('divides by scheduled days, not calendar days', () => {
    // Mon/Wed/Fri across 1–7 Sep 2025 → 3 scheduled days.
    const habit = makeHabit({
      frequency: { kind: 'weekdays', days: [1, 3, 5] },
      startDate: '2025-09-01',
    });
    const entries = makeEntries(habit.id, ['2025-09-01', '2025-09-03']);
    const rate = habitCompletionRate(
      habit,
      entries,
      { start: '2025-09-01', end: '2025-09-07' },
      '2025-09-07',
      1,
    );
    expect(rate.completed).toBe(2);
    expect(rate.total).toBe(3);
    expect(rate.rate).toBeCloseTo(2 / 3);
  });

  it('never counts days in the future', () => {
    const habit = makeHabit({ startDate: '2025-09-01' });
    const entries = makeEntries(habit.id, ['2025-09-01', '2025-09-02']);
    const rate = habitCompletionRate(
      habit,
      entries,
      { start: '2025-09-01', end: '2025-09-30' },
      '2025-09-02',
      1,
    );
    expect(rate.total).toBe(2);
    expect(rate.rate).toBe(1);
  });

  it('ignores days before the habit existed', () => {
    const habit = makeHabit({ startDate: '2025-09-05' });
    const entries = makeEntries(habit.id, ['2025-09-05']);
    const rate = habitCompletionRate(
      habit,
      entries,
      { start: '2025-09-01', end: '2025-09-05' },
      '2025-09-05',
      1,
    );
    expect(rate.total).toBe(1);
  });

  it('returns a zero ratio when nothing is scheduled', () => {
    const habit = makeHabit({ startDate: '2025-10-01' });
    const rate = habitCompletionRate(
      habit,
      {},
      { start: '2025-09-01', end: '2025-09-07' },
      '2025-09-07',
      1,
    );
    expect(rate).toEqual({ completed: 0, total: 0, rate: 0 });
  });

  it('caps an over-achieving quota week at 100%', () => {
    const habit = makeHabit({
      frequency: { kind: 'timesPerWeek', times: 2 },
      startDate: '2025-09-01',
    });
    const entries = makeEntries(habit.id, [
      '2025-09-01', '2025-09-02', '2025-09-03', '2025-09-04', '2025-09-05',
    ]);
    const rate = habitCompletionRate(
      habit,
      entries,
      { start: '2025-09-01', end: '2025-09-07' },
      '2025-09-07',
      1,
    );
    expect(rate.rate).toBe(1);
    expect(rate.completed).toBe(2);
  });

  it('treats a partial quantity as not completed', () => {
    const habit = makeHabit({
      startDate: '2025-09-01',
      target: { kind: 'quantity', amount: 30, unit: 'min', step: 5 },
    });
    const entries = makeEntries(habit.id, [
      ['2025-09-01', 30],
      ['2025-09-02', 15],
    ]);
    const rate = habitCompletionRate(
      habit,
      entries,
      { start: '2025-09-01', end: '2025-09-02' },
      '2025-09-02',
      1,
    );
    expect(rate.completed).toBe(1);
    expect(rate.total).toBe(2);
  });
});

describe('summariseDay', () => {
  const a = makeHabit({ id: 'a', startDate: '2025-09-01' });
  const b = makeHabit({ id: 'b', startDate: '2025-09-01' });

  it('reports a perfect day when everything scheduled is done', () => {
    const entries = mergeEntries(makeEntries('a', ['2025-09-01']), makeEntries('b', ['2025-09-01']));
    const summary = summariseDay([a, b], entries, '2025-09-01');
    expect(summary).toMatchObject({ completed: 2, scheduled: 2, perfect: true });
    expect(summary.rate).toBe(1);
  });

  it('is not perfect when one habit is missing', () => {
    const entries = makeEntries('a', ['2025-09-01']);
    const summary = summariseDay([a, b], entries, '2025-09-01');
    expect(summary.perfect).toBe(false);
    expect(summary.rate).toBe(0.5);
  });

  it('reports a null rate when nothing was scheduled', () => {
    const weekdayHabit = makeHabit({
      id: 'c',
      frequency: { kind: 'weekdays', days: [1] },
      startDate: '2025-09-01',
    });
    const summary = summariseDay([weekdayHabit], {}, '2025-09-06');
    expect(summary.rate).toBeNull();
    expect(summary.perfect).toBe(false);
  });

  it('counts a quota habit done on an unscheduled day as a bonus, not a requirement', () => {
    const quota = makeHabit({
      id: 'q',
      frequency: { kind: 'timesPerWeek', times: 2 },
      startDate: '2025-09-01',
    });
    const idle = summariseDay([quota], {}, '2025-09-01');
    expect(idle.scheduled).toBe(0);
    expect(idle.rate).toBeNull();

    const done = summariseDay([quota], makeEntries('q', ['2025-09-01']), '2025-09-01');
    expect(done.completed).toBe(1);
    expect(done.scheduled).toBe(1);
  });
});

describe('summariseRange', () => {
  it('blanks out days after today', () => {
    const habit = makeHabit({ id: 'a', startDate: '2025-09-01' });
    const entries = makeEntries('a', ['2025-09-01']);
    const summaries = summariseRange(
      [habit],
      entries,
      { start: '2025-09-01', end: '2025-09-04' },
      '2025-09-02',
    );
    expect(summaries).toHaveLength(4);
    expect(summaries[0]?.rate).toBe(1);
    expect(summaries[1]?.rate).toBe(0);
    expect(summaries[2]?.rate).toBeNull();
    expect(summaries[3]?.rate).toBeNull();
  });
});

describe('computeOverview', () => {
  const a = makeHabit({ id: 'a', name: 'A', startDate: '2025-09-01' });
  const b = makeHabit({ id: 'b', name: 'B', startDate: '2025-09-01' });
  const entries = mergeEntries(
    makeEntries('a', ['2025-09-01', '2025-09-02', '2025-09-03']),
    makeEntries('b', ['2025-09-01', '2025-09-02']),
  );

  it('counts perfect days across the whole history', () => {
    const overview = computeOverview([a, b], entries, '2025-09-03', 1);
    expect(overview.perfectDays).toBe(2);
  });

  it('reports today at a glance', () => {
    const overview = computeOverview([a, b], entries, '2025-09-03', 1);
    expect(overview.scheduledToday).toBe(2);
    expect(overview.completedToday).toBe(1);
    expect(overview.pendingToday).toBe(1);
  });

  it('aggregates the overall rate across habits', () => {
    const overview = computeOverview([a, b], entries, '2025-09-03', 1);
    // 5 completions out of 6 scheduled habit-days.
    expect(overview.overall.completed).toBe(5);
    expect(overview.overall.total).toBe(6);
  });

  it('handles an empty account without dividing by zero', () => {
    const overview = computeOverview([], {}, '2025-09-03', 1);
    expect(overview.overall.rate).toBe(0);
    expect(overview.perfectDays).toBe(0);
    expect(overview.streak.current).toBe(0);
  });
});

describe('countAllCompletions', () => {
  it('counts only entries that reach their habit target', () => {
    const habit = makeHabit({
      id: 'a',
      target: { kind: 'quantity', amount: 20, unit: 'min', step: 5 },
    });
    const entries = makeEntries('a', [
      ['2025-09-01', 20],
      ['2025-09-02', 10],
      ['2025-09-03', 40],
    ]);
    expect(countAllCompletions([habit], entries)).toBe(2);
  });

  it('ignores entries whose habit no longer exists', () => {
    expect(countAllCompletions([], makeEntries('ghost', ['2025-09-01']))).toBe(0);
  });
});

describe('computeHabitStats', () => {
  it('gathers streak, totals and rates in one pass', () => {
    const habit = makeHabit({
      id: 'a',
      startDate: '2025-09-01',
      target: { kind: 'quantity', amount: 10, unit: 'min', step: 5 },
    });
    const entries = makeEntries('a', [
      ['2025-09-01', 10],
      ['2025-09-02', 20],
      ['2025-09-03', 5],
    ]);
    const stats = computeHabitStats(habit, entries, '2025-09-03', 1);
    expect(stats.totalCompletions).toBe(2);
    expect(stats.totalAmount).toBe(35);
    // Today is logged but below target, so it is still open: the streak holds
    // at 2 and is flagged as at risk rather than reset.
    expect(stats.streak.current).toBe(2);
    expect(stats.streak.atRisk).toBe(true);
    expect(stats.streak.best).toBe(2);
    expect(stats.allTime.rate).toBeCloseTo(2 / 3);
  });

  it('reports weekly period progress for a quota habit', () => {
    const habit = makeHabit({
      id: 'a',
      frequency: { kind: 'timesPerWeek', times: 4 },
      startDate: '2025-09-01',
    });
    const entries = makeEntries('a', ['2025-09-01', '2025-09-02']);
    const stats = computeHabitStats(habit, entries, '2025-09-03', 1);
    expect(stats.periodProgress).toEqual({ done: 2, target: 4 });
  });
});

describe('weeklySeries and distribution', () => {
  it('returns one point per week, oldest first', () => {
    const habit = makeHabit({ id: 'a', startDate: '2025-08-01' });
    const entries = makeEntries('a', ['2025-09-01', '2025-09-02']);
    const series = weeklySeries([habit], entries, '2025-09-03', 1, 4);
    expect(series).toHaveLength(4);
    const starts = series.map((point) => point.start);
    expect([...starts].sort()).toEqual(starts);
    expect(series[3]?.completed).toBe(2);
  });

  it('ranks habits by completions in the range', () => {
    const a = makeHabit({ id: 'a', name: 'A', startDate: '2025-09-01' });
    const b = makeHabit({ id: 'b', name: 'B', startDate: '2025-09-01' });
    const entries = mergeEntries(
      makeEntries('a', ['2025-09-01', '2025-09-02', '2025-09-03']),
      makeEntries('b', ['2025-09-01']),
    );
    const ranked = completionsByHabit([a, b], entries, {
      start: '2025-09-01',
      end: '2025-09-03',
    });
    expect(ranked[0]?.habit.id).toBe('a');
    expect(ranked[0]?.count).toBe(3);
    expect(ranked[1]?.count).toBe(1);
  });
});
