import { useMemo } from 'react';
import {
  computeGoalProgress,
  computeHabitStats,
  computeMilestones,
  computeOverview,
  isDueOn,
  summariseRange,
  todayKey,
  weekRange,
} from '@/domain';
import type {
  DaySummary,
  GoalProgress,
  Habit,
  HabitStats,
  Milestone,
  OverviewStats,
} from '@/domain';
import type { DateKey } from '@/domain/types';
import { useAppStore } from './useAppStore';

/**
 * Derived state lives here rather than in components: the store keeps raw
 * records, selectors turn them into the numbers screens render.
 */

export function useToday(): DateKey {
  // Recomputed per render but stable within a day; cheap and always correct
  // across a midnight rollover without a timer.
  return todayKey();
}

export function useSettings() {
  return useAppStore((state) => state.data.settings);
}

export function useHabits(): Habit[] {
  return useAppStore((state) => state.data.habits);
}

export function useActiveHabits(): Habit[] {
  const habits = useHabits();
  return useMemo(
    () => habits.filter((habit) => !habit.archived).sort((a, b) => a.order - b.order),
    [habits],
  );
}

export function useCategories() {
  return useAppStore((state) => state.data.categories);
}

export function useCategoryName(id: string): string {
  const categories = useCategories();
  return categories.find((category) => category.id === id)?.name ?? 'Other';
}

export function useHabitsForDay(date: DateKey): Habit[] {
  const habits = useHabits();
  return useMemo(
    () => habits.filter((habit) => isDueOn(habit, date)).sort((a, b) => a.order - b.order),
    [habits, date],
  );
}

export function useOverview(): OverviewStats {
  const habits = useHabits();
  const entries = useAppStore((state) => state.data.entries);
  const { weekStart } = useSettings();
  const today = useToday();
  return useMemo(
    () => computeOverview(habits, entries, today, weekStart),
    [habits, entries, today, weekStart],
  );
}

export function useHabitStats(habit: Habit | undefined): HabitStats | null {
  const entries = useAppStore((state) => state.data.entries);
  const { weekStart } = useSettings();
  const today = useToday();
  return useMemo(
    () => (habit ? computeHabitStats(habit, entries, today, weekStart) : null),
    [habit, entries, today, weekStart],
  );
}

export function useAllHabitStats(includeArchived = false): HabitStats[] {
  const habits = useHabits();
  const entries = useAppStore((state) => state.data.entries);
  const { weekStart } = useSettings();
  const today = useToday();
  return useMemo(
    () =>
      habits
        .filter((habit) => includeArchived || !habit.archived)
        .sort((a, b) => a.order - b.order)
        .map((habit) => computeHabitStats(habit, entries, today, weekStart)),
    [habits, entries, today, weekStart, includeArchived],
  );
}

export function useWeekSummaries(anchor: DateKey): DaySummary[] {
  const habits = useHabits();
  const entries = useAppStore((state) => state.data.entries);
  const { weekStart } = useSettings();
  const today = useToday();
  return useMemo(
    () => summariseRange(habits, entries, weekRange(anchor, weekStart), today),
    [habits, entries, anchor, weekStart, today],
  );
}

export function useRangeSummaries(start: DateKey, end: DateKey): DaySummary[] {
  const habits = useHabits();
  const entries = useAppStore((state) => state.data.entries);
  const today = useToday();
  return useMemo(
    () => summariseRange(habits, entries, { start, end }, today),
    [habits, entries, start, end, today],
  );
}

export function useGoalProgress(period?: 'week' | 'month', anchor?: DateKey): GoalProgress[] {
  const goals = useAppStore((state) => state.data.goals);
  const habits = useHabits();
  const entries = useAppStore((state) => state.data.entries);
  const { weekStart } = useSettings();
  const today = useToday();
  return useMemo(
    () =>
      goals
        .filter((goal) => !period || goal.period === period)
        .map((goal) =>
          computeGoalProgress(goal, habits, entries, today, weekStart, anchor ?? today),
        ),
    [goals, habits, entries, today, weekStart, period, anchor],
  );
}

export function useMilestones(): Milestone[] {
  const overview = useOverview();
  const stats = useAllHabitStats(true);
  return useMemo(() => {
    const best = stats.reduce<HabitStats | null>(
      (top, candidate) =>
        top === null || candidate.streak.best > top.streak.best ? candidate : top,
      null,
    );
    return computeMilestones(overview, best?.streak ?? null);
  }, [overview, stats]);
}
