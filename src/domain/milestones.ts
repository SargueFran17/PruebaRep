import type { OverviewStats } from './stats';
import type { Streak } from './streaks';

export type MilestoneKind = 'streak' | 'volume' | 'perfect';

export interface Milestone {
  id: string;
  kind: MilestoneKind;
  title: string;
  detail: string;
  threshold: number;
  value: number;
  achieved: boolean;
}

const STREAK_STEPS = [7, 14, 30, 60, 100, 365];
const VOLUME_STEPS = [10, 50, 100, 250, 500, 1000];
const PERFECT_STEPS = [1, 7, 30, 100];

/**
 * Milestones are derived, never stored: recomputing them keeps them honest
 * after an import, an edit or a deleted habit.
 */
export function computeMilestones(
  overview: OverviewStats,
  bestHabitStreak: Streak | null,
): Milestone[] {
  const streakValue = Math.max(overview.streak.best, bestHabitStreak?.best ?? 0);

  const milestones: Milestone[] = [
    ...STREAK_STEPS.map((threshold) => ({
      id: `streak-${threshold}`,
      kind: 'streak' as const,
      title: `${threshold}-day streak`,
      detail: 'Longest run of consecutive scheduled days',
      threshold,
      value: streakValue,
      achieved: streakValue >= threshold,
    })),
    ...VOLUME_STEPS.map((threshold) => ({
      id: `volume-${threshold}`,
      kind: 'volume' as const,
      title: `${threshold} habits completed`,
      detail: 'Total completions across every habit',
      threshold,
      value: overview.totalCompletions,
      achieved: overview.totalCompletions >= threshold,
    })),
    ...PERFECT_STEPS.map((threshold) => ({
      id: `perfect-${threshold}`,
      kind: 'perfect' as const,
      title: threshold === 1 ? 'First perfect day' : `${threshold} perfect days`,
      detail: 'Days where every scheduled habit was completed',
      threshold,
      value: overview.perfectDays,
      achieved: overview.perfectDays >= threshold,
    })),
  ];

  return milestones;
}

export function nextMilestone(milestones: Milestone[], kind: MilestoneKind): Milestone | null {
  return milestones.find((m) => m.kind === kind && !m.achieved) ?? null;
}

export function achievedMilestones(milestones: Milestone[]): Milestone[] {
  return milestones.filter((m) => m.achieved);
}
