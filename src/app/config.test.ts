import { describe, expect, it } from 'vitest';
import { FUTURE_MONTHS, futureHorizon, futureMonthLimit } from './config';

describe('calendar horizon', () => {
  it('opens exactly two months ahead', () => {
    expect(FUTURE_MONTHS).toBe(2);
    expect(futureMonthLimit('2026-09-15')).toBe('2026-11-01');
    expect(futureHorizon('2026-09-15')).toBe('2026-11-30');
  });

  it('crosses a year boundary', () => {
    expect(futureMonthLimit('2026-12-10')).toBe('2027-02-01');
    expect(futureHorizon('2026-12-10')).toBe('2027-02-28');
  });

  it('lands on the right last day of a leap February', () => {
    expect(futureHorizon('2023-12-31')).toBe('2024-02-29');
  });

  it('clamps the day when the target month is shorter', () => {
    // 31 Dec + 2 months is the end of February, not 2 or 3 March.
    expect(futureHorizon('2025-12-31')).toBe('2026-02-28');
  });
});
