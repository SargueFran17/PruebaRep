import { useCallback } from 'react';
import { getAmount } from '@/domain/entries';
import { computeStreak } from '@/domain/streaks';
import type { DateKey } from '@/domain/types';
import { useAppStore } from '@/store/useAppStore';

const STREAK_MILESTONES = new Set([7, 14, 30, 60, 100, 365]);

/**
 * Completion with feedback. The celebration only fires when a milestone is
 * actually crossed — noise on every tap would stop meaning anything.
 */
export function useHabitActions(date: DateKey) {
  const toggleHabit = useAppStore((state) => state.toggleHabit);
  const setEntryAmount = useAppStore((state) => state.setEntryAmount);
  const notify = useAppStore((state) => state.notify);

  const toggle = useCallback(
    (habitId: string) => {
      const before = useAppStore.getState().data;
      const habit = before.habits.find((candidate) => candidate.id === habitId);
      if (!habit) return;

      const wasComplete = getAmount(before.entries, habitId, date) >= habit.target.amount;
      toggleHabit(habitId, date);
      if (wasComplete) return;

      const after = useAppStore.getState().data;
      const streak = computeStreak(habit, after.entries, date, after.settings.weekStart);
      if (STREAK_MILESTONES.has(streak.current)) {
        const noun = streak.unit === 'day' ? 'day' : streak.unit;
        notify(`${streak.current}-${noun} streak · ${habit.name}`, 'gold');
      }
    },
    [date, toggleHabit, notify],
  );

  const setAmount = useCallback(
    (habitId: string, amount: number) => {
      const before = useAppStore.getState().data;
      const habit = before.habits.find((candidate) => candidate.id === habitId);
      if (!habit) return;
      const wasComplete = getAmount(before.entries, habitId, date) >= habit.target.amount;
      setEntryAmount(habitId, date, amount);

      if (!wasComplete && amount >= habit.target.amount) {
        const after = useAppStore.getState().data;
        const streak = computeStreak(habit, after.entries, date, after.settings.weekStart);
        if (STREAK_MILESTONES.has(streak.current)) {
          const noun = streak.unit === 'day' ? 'day' : streak.unit;
          notify(`${streak.current}-${noun} streak · ${habit.name}`, 'gold');
        }
      }
    },
    [date, setEntryAmount, notify],
  );

  return { toggle, setAmount };
}
