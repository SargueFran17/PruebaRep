import type { ReactNode } from 'react';
import { Card } from '@/components/ui';
import type { EntryMap } from '@/domain/entries';
import type { DateKey, Habit, WeekStart } from '@/domain/types';
import { HabitRow } from './HabitRow';

interface HabitListProps {
  habits: Habit[];
  entries: EntryMap;
  date: DateKey;
  weekStart: WeekStart;
  onToggle: (habitId: string) => void;
  onSetAmount: (habitId: string, amount: number) => void;
  onOpen?: (habit: Habit) => void;
  readOnlyReason?: string;
  empty?: ReactNode;
}

export function HabitList({
  habits,
  entries,
  date,
  weekStart,
  onToggle,
  onSetAmount,
  onOpen,
  readOnlyReason,
  empty,
}: HabitListProps) {
  if (habits.length === 0) return <>{empty}</>;

  return (
    <Card className="overflow-hidden">
      <ul className="divide-y divide-line">
        {habits.map((habit) => (
          <li key={habit.id}>
            <HabitRow
              habit={habit}
              entries={entries}
              date={date}
              weekStart={weekStart}
              onToggle={() => onToggle(habit.id)}
              onSetAmount={(amount) => onSetAmount(habit.id, amount)}
              onOpen={onOpen ? () => onOpen(habit) : undefined}
              readOnlyReason={readOnlyReason}
            />
          </li>
        ))}
      </ul>
    </Card>
  );
}
