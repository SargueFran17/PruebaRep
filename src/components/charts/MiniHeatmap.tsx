import { eachDay, weekdayOf } from '@/domain/dates';
import { isRequiredOn, isCompletedOn, matchesFrequencyDay } from '@/domain/frequency';
import type { DateKey, Habit } from '@/domain/types';
import { cn } from '@/lib/cn';
import { formatMediumDate } from '@/lib/format';
import { useAppStore } from '@/store/useAppStore';

/**
 * A compact per-habit history strip. Columns are weeks, rows are weekdays —
 * the shape reads as "consistency" at a glance without needing a legend.
 */
export function MiniHeatmap({
  habit,
  start,
  end,
}: {
  habit: Habit;
  start: DateKey;
  end: DateKey;
}) {
  const entries = useAppStore((state) => state.data.entries);
  const days = eachDay(start, end);
  if (days.length === 0) return null;

  const columns: (DateKey | null)[][] = [];
  let column: (DateKey | null)[] = Array.from(
    { length: weekdayOf(days[0] as DateKey) },
    () => null,
  );

  for (const day of days) {
    column.push(day);
    if (column.length === 7) {
      columns.push(column);
      column = [];
    }
  }
  if (column.length > 0) {
    columns.push([...column, ...Array.from({ length: 7 - column.length }, () => null)]);
  }

  return (
    <div className="w-full">
      <div className="flex w-full gap-[3px]">
        {columns.map((week, index) => (
          <div key={index} className="flex min-w-0 flex-1 flex-col gap-[3px]">
            {week.map((day, dayIndex) => {
              if (!day) return <span key={dayIndex} className="aspect-square w-full" aria-hidden />;
              const scheduled = matchesFrequencyDay(habit.frequency, day) && day >= habit.startDate;
              const done = isCompletedOn(habit, entries, day);
              const missed = isRequiredOn(habit, day) && !done;
              return (
                <span
                  key={day}
                  title={`${formatMediumDate(day)} — ${done ? 'completed' : scheduled ? 'not completed' : 'not scheduled'}`}
                  className={cn(
                    'aspect-square w-full rounded-[3px]',
                    done
                      ? 'bg-accent'
                      : missed
                        ? 'bg-line-strong'
                        : scheduled
                          ? 'bg-sunken ring-1 ring-line ring-inset'
                          : 'bg-sunken/60',
                  )}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
