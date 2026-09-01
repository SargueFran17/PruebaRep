import { describe, expect, it } from 'vitest';
import { makeEntries, makeGoal, makeHabit, mergeEntries } from '@/test/factories';
import {
  computeGoalProgress,
  describeGoalMetric,
  formatMeasurePair,
  goalRange,
  goalStatusLabel,
} from './goals';

const habit = makeHabit({ id: 'read', name: 'Read', startDate: '2025-09-01' });

describe('goalRange', () => {
  it('resolves the week and month containing the anchor', () => {
    expect(goalRange('week', '2025-09-03', 1)).toEqual({
      start: '2025-09-01',
      end: '2025-09-07',
    });
    expect(goalRange('month', '2025-09-03', 1)).toEqual({
      start: '2025-09-01',
      end: '2025-09-30',
    });
  });
});

describe('habitDays goals', () => {
  const goal = makeGoal({
    title: 'Read five days',
    period: 'week',
    metric: { kind: 'habitDays', habitId: 'read' },
    target: 5,
  });

  it('counts completed days inside the period', () => {
    const entries = makeEntries('read', ['2025-09-01', '2025-09-02', '2025-09-03']);
    const progress = computeGoalProgress(goal, [habit], entries, '2025-09-03', 1);
    expect(progress.value).toBe(3);
    expect(progress.target).toBe(5);
    expect(progress.ratio).toBeCloseTo(0.6);
    expect(progress.label).toBe('3 / 5 days');
  });

  it('marks the goal achieved once the target is met', () => {
    const entries = makeEntries('read', [
      '2025-09-01', '2025-09-02', '2025-09-03', '2025-09-04', '2025-09-05',
    ]);
    const progress = computeGoalProgress(goal, [habit], entries, '2025-09-05', 1);
    expect(progress.status).toBe('achieved');
    expect(progress.ratio).toBe(1);
  });

  it('clamps the ratio when the target is exceeded', () => {
    const entries = makeEntries('read', [
      '2025-09-01', '2025-09-02', '2025-09-03', '2025-09-04', '2025-09-05', '2025-09-06',
    ]);
    const progress = computeGoalProgress(goal, [habit], entries, '2025-09-06', 1);
    expect(progress.value).toBe(6);
    expect(progress.ratio).toBe(1);
    expect(progress.status).toBe('achieved');
  });

  it('ignores days outside the period', () => {
    const entries = makeEntries('read', ['2025-08-30', '2025-09-01', '2025-09-08']);
    const progress = computeGoalProgress(goal, [habit], entries, '2025-09-03', 1);
    expect(progress.value).toBe(1);
  });

  it('never counts days that have not happened yet', () => {
    const entries = makeEntries('read', ['2025-09-01', '2025-09-06']);
    const progress = computeGoalProgress(goal, [habit], entries, '2025-09-02', 1);
    expect(progress.value).toBe(1);
  });

  it('reports zero when the habit was deleted', () => {
    const entries = makeEntries('read', ['2025-09-01']);
    const progress = computeGoalProgress(goal, [], entries, '2025-09-03', 1);
    expect(progress.value).toBe(0);
    expect(describeGoalMetric(goal, [])).toContain('removed');
  });
});

describe('habitAmount goals', () => {
  it('sums logged amounts rather than counting days', () => {
    const measured = makeHabit({
      id: 'read',
      name: 'Read',
      startDate: '2025-09-01',
      target: { kind: 'quantity', amount: 20, unit: 'min', step: 5 },
    });
    const goal = makeGoal({
      period: 'month',
      metric: { kind: 'habitAmount', habitId: 'read' },
      target: 100,
    });
    const entries = makeEntries('read', [
      ['2025-09-01', 30],
      ['2025-09-02', 15],
      ['2025-09-03', 25],
    ]);
    const progress = computeGoalProgress(goal, [measured], entries, '2025-09-03', 1);
    expect(progress.value).toBe(70);
    expect(progress.unit).toBe('min');
    expect(progress.label).toBe('70 / 100 min');
  });

  it('promotes a large minutes target to hours in the label', () => {
    const measured = makeHabit({
      id: 'deep',
      name: 'Deep work',
      startDate: '2025-09-01',
      target: { kind: 'quantity', amount: 90, unit: 'min', step: 15 },
    });
    const goal = makeGoal({
      period: 'month',
      metric: { kind: 'habitAmount', habitId: 'deep' },
      target: 1200,
    });
    const entries = makeEntries('deep', [
      ['2025-09-01', 90],
      ['2025-09-02', 120],
    ]);
    const progress = computeGoalProgress(goal, [measured], entries, '2025-09-02', 1);
    expect(progress.value).toBe(210);
    expect(progress.label).toBe('3.5 / 20 h');
  });
});

describe('formatMeasurePair', () => {
  it('names the unit once, at the end', () => {
    expect(formatMeasurePair(3, 5, 'pages')).toBe('3 / 5 pages');
    expect(formatMeasurePair(0, 12, undefined)).toBe('0 / 12');
  });

  it('switches both sides to hours together', () => {
    expect(formatMeasurePair(60, 600, 'min')).toBe('1 / 10 h');
    expect(formatMeasurePair(30, 90, 'min')).toBe('30 / 90 min');
  });
});

describe('consistency goals', () => {
  it('measures the percentage across every habit', () => {
    const a = makeHabit({ id: 'a', startDate: '2025-09-01' });
    const b = makeHabit({ id: 'b', startDate: '2025-09-01' });
    const goal = makeGoal({ period: 'week', metric: { kind: 'consistency' }, target: 90 });
    const entries = mergeEntries(
      makeEntries('a', ['2025-09-01', '2025-09-02']),
      makeEntries('b', ['2025-09-01']),
    );
    const progress = computeGoalProgress(goal, [a, b], entries, '2025-09-02', 1);
    // 3 of 4 scheduled habit-days.
    expect(progress.value).toBe(75);
    expect(progress.label).toBe('75% of 90%');
    expect(progress.status).toBe('behind');
  });

  it('is achieved at the threshold', () => {
    const a = makeHabit({ id: 'a', startDate: '2025-09-01' });
    const goal = makeGoal({ period: 'week', metric: { kind: 'consistency' }, target: 90 });
    const entries = makeEntries('a', ['2025-09-01', '2025-09-02']);
    const progress = computeGoalProgress(goal, [a], entries, '2025-09-02', 1);
    expect(progress.value).toBe(100);
    expect(progress.status).toBe('achieved');
  });
});

describe('perfectDays goals', () => {
  it('counts days where every scheduled habit was completed', () => {
    const a = makeHabit({ id: 'a', startDate: '2025-09-01' });
    const b = makeHabit({ id: 'b', startDate: '2025-09-01' });
    const goal = makeGoal({ period: 'month', metric: { kind: 'perfectDays' }, target: 10 });
    const entries = mergeEntries(
      makeEntries('a', ['2025-09-01', '2025-09-02', '2025-09-03']),
      makeEntries('b', ['2025-09-01', '2025-09-03']),
    );
    const progress = computeGoalProgress(goal, [a, b], entries, '2025-09-03', 1);
    expect(progress.value).toBe(2);
  });
});

describe('pacing', () => {
  const goal = makeGoal({
    period: 'week',
    metric: { kind: 'habitDays', habitId: 'read' },
    target: 7,
  });

  it('counts the days left in the period', () => {
    const progress = computeGoalProgress(goal, [habit], {}, '2025-09-03', 1);
    expect(progress.daysRemaining).toBe(4);
    expect(progress.expectedRatio).toBeCloseTo(3 / 7);
  });

  it('reports the last day of the period as having none remaining', () => {
    const progress = computeGoalProgress(goal, [habit], {}, '2025-09-07', 1);
    expect(progress.daysRemaining).toBe(0);
  });

  it('is on track when progress keeps pace', () => {
    const entries = makeEntries('read', ['2025-09-01', '2025-09-02', '2025-09-03']);
    const progress = computeGoalProgress(goal, [habit], entries, '2025-09-03', 1);
    expect(progress.status).toBe('onTrack');
  });

  it('is behind when progress lags well behind the pace', () => {
    const entries = makeEntries('read', ['2025-09-01']);
    const progress = computeGoalProgress(goal, [habit], entries, '2025-09-06', 1);
    expect(progress.status).toBe('behind');
  });

  it('is "not started" on the first day with nothing logged', () => {
    const progress = computeGoalProgress(goal, [habit], {}, '2025-09-01', 1);
    expect(progress.status).toBe('notStarted');
  });

  it('measures a monthly goal against the whole month', () => {
    const monthly = makeGoal({
      period: 'month',
      metric: { kind: 'habitDays', habitId: 'read' },
      target: 20,
    });
    const entries = makeEntries(
      'read',
      Array.from({ length: 12 }, (_, i) => `2025-09-${`${i + 1}`.padStart(2, '0')}`),
    );
    const progress = computeGoalProgress(monthly, [habit], entries, '2025-09-22', 1);
    expect(progress.value).toBe(12);
    expect(progress.ratio).toBeCloseTo(0.6);
    expect(progress.daysRemaining).toBe(8);
  });

  it('handles a week that spans two months', () => {
    const entries = makeEntries('read', ['2025-09-29', '2025-09-30', '2025-10-01']);
    const progress = computeGoalProgress(goal, [habit], entries, '2025-10-01', 1);
    expect(progress.range).toEqual({ start: '2025-09-29', end: '2025-10-05' });
    expect(progress.value).toBe(3);
  });
});

describe('goalStatusLabel', () => {
  it('gives every status a human label', () => {
    expect(goalStatusLabel('achieved')).toBe('Achieved');
    expect(goalStatusLabel('onTrack')).toBe('On track');
    expect(goalStatusLabel('behind')).toBe('Behind');
    expect(goalStatusLabel('notStarted')).toBe('Not started');
  });
});
