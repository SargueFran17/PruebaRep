import { describe, expect, it } from 'vitest';
import type { DaySummary } from '@/domain/stats';
import { dayTone, describeDay } from './dayTone';

const day = (over: Partial<DaySummary> = {}): DaySummary => ({
  date: '2026-09-01',
  scheduled: 4,
  completed: 2,
  rate: 0.5,
  perfect: false,
  ...over,
});

describe('dayTone', () => {
  it('marks anything after today as future', () => {
    expect(dayTone(day({ date: '2026-09-05' }), '2026-09-01')).toBe('future');
  });

  it('grades a past day by how much was completed', () => {
    expect(dayTone(day({ rate: 0 }), '2026-09-02')).toBe('none');
    expect(dayTone(day({ rate: 0.2 }), '2026-09-02')).toBe('low');
    expect(dayTone(day({ rate: 0.5 }), '2026-09-02')).toBe('mid');
    expect(dayTone(day({ rate: 0.8 }), '2026-09-02')).toBe('high');
  });

  it('reserves the gold tone for a genuinely perfect day', () => {
    expect(dayTone(day({ rate: 1, perfect: true }), '2026-09-02')).toBe('perfect');
    expect(dayTone(day({ rate: 1, perfect: false }), '2026-09-02')).toBe('high');
  });

  it('treats a day with nothing scheduled as empty, not failed', () => {
    expect(dayTone(day({ rate: null, scheduled: 0, completed: 0 }), '2026-09-02')).toBe('none');
  });
});

describe('describeDay', () => {
  it('calls a future day upcoming rather than unscheduled', () => {
    // Regression: the week strip used to announce every future day as
    // "nothing scheduled", which is wrong — nothing has been missed yet.
    expect(describeDay(day({ date: '2026-09-05', rate: null }), '2026-09-01', 'Saturday, September 5'))
      .toBe('Saturday, September 5 — upcoming');
  });

  it('says nothing scheduled only for a past day with no habits due', () => {
    expect(describeDay(day({ rate: null, scheduled: 0 }), '2026-09-02', 'Tuesday, September 1'))
      .toBe('Tuesday, September 1 — nothing scheduled');
  });

  it('reports counts and a plain-language grade for a past day', () => {
    expect(describeDay(day({ completed: 3, scheduled: 4, rate: 0.75 }), '2026-09-02', 'Tuesday, September 1'))
      .toBe('Tuesday, September 1 — 3 of 4 habits, nearly all done');
  });

  it('reads identically for the month grid and the week strip', () => {
    const summary = day({ completed: 4, scheduled: 4, rate: 1, perfect: true });
    const label = describeDay(summary, '2026-09-02', 'Tuesday, September 1');
    expect(label).toContain('perfect day');
    expect(label).toContain('4 of 4 habits');
  });
});
