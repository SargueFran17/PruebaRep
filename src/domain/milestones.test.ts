import { describe, expect, it } from 'vitest';
import type { OverviewStats } from './stats';
import { achievedMilestones, computeMilestones, nextMilestone } from './milestones';

function overview(partial: Partial<OverviewStats> = {}): OverviewStats {
  return {
    overall: { completed: 0, total: 0, rate: 0 },
    thisWeek: { completed: 0, total: 0, rate: 0 },
    thisMonth: { completed: 0, total: 0, rate: 0 },
    completedToday: 0,
    scheduledToday: 0,
    pendingToday: 0,
    perfectDays: 0,
    totalCompletions: 0,
    streak: { current: 0, best: 0, unit: 'day', atRisk: false },
    activeHabits: 0,
    ...partial,
  };
}

describe('computeMilestones', () => {
  it('unlocks nothing for a brand-new account', () => {
    const milestones = computeMilestones(overview(), null);
    expect(achievedMilestones(milestones)).toHaveLength(0);
  });

  it('unlocks every threshold at or below the value reached', () => {
    const milestones = computeMilestones(
      overview({ streak: { current: 30, best: 30, unit: 'day', atRisk: false } }),
      null,
    );
    const streaks = milestones.filter((m) => m.kind === 'streak' && m.achieved);
    expect(streaks.map((m) => m.threshold)).toEqual([7, 14, 30]);
  });

  it('takes the best streak from either the account or a single habit', () => {
    const milestones = computeMilestones(overview(), {
      current: 2,
      best: 14,
      unit: 'day',
      atRisk: false,
    });
    expect(milestones.find((m) => m.id === 'streak-14')?.achieved).toBe(true);
  });

  it('tracks completions and perfect days independently', () => {
    const milestones = computeMilestones(
      overview({ totalCompletions: 120, perfectDays: 8 }),
      null,
    );
    expect(milestones.find((m) => m.id === 'volume-100')?.achieved).toBe(true);
    expect(milestones.find((m) => m.id === 'volume-250')?.achieved).toBe(false);
    expect(milestones.find((m) => m.id === 'perfect-7')?.achieved).toBe(true);
    expect(milestones.find((m) => m.id === 'perfect-30')?.achieved).toBe(false);
  });

  it('reports the next target in each track', () => {
    const milestones = computeMilestones(overview({ totalCompletions: 60 }), null);
    expect(nextMilestone(milestones, 'volume')?.threshold).toBe(100);
    expect(nextMilestone(milestones, 'streak')?.threshold).toBe(7);
  });
});
