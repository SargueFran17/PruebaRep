import { addDays, eachDay, endOfMonth, startOfMonth, startOfWeek } from '@/domain/dates';
import type { DaySummary } from '@/domain/stats';
import type { DateKey, WeekStart } from '@/domain/types';
import { MIN_DAYS, SHORT_DAYS } from '@/domain/frequency';
import { cn } from '@/lib/cn';
import { formatLongDate } from '@/lib/format';
import { dayTone, describeDay, TONE_FILL, TONE_TEXT } from './dayTone';

interface MonthGridProps {
  month: DateKey;
  summaries: Map<DateKey, DaySummary>;
  today: DateKey;
  weekStart: WeekStart;
  selected: DateKey;
  onSelect: (date: DateKey) => void;
}

export function MonthGrid({
  month,
  summaries,
  today,
  weekStart,
  selected,
  onSelect,
}: MonthGridProps) {
  const first = startOfMonth(month);
  const last = endOfMonth(month);
  const gridStart = startOfWeek(first, weekStart);
  const days = eachDay(gridStart, last);
  // Pad to whole weeks so the grid never reflows between months.
  const padded = [...days];
  while (padded.length % 7 !== 0) {
    padded.push(addDays(padded[padded.length - 1] as DateKey, 1));
  }
  const headers = Array.from({ length: 7 }, (_, i) => (weekStart + i) % 7);

  return (
    <div>
      <div className="mb-2 grid grid-cols-7 gap-1.5">
        {headers.map((day) => (
          <div
            key={day}
            className="text-center text-[11px] font-medium tracking-[0.06em] text-faint uppercase"
          >
            <span aria-hidden>{MIN_DAYS[day]}</span>
            <span className="sr-only">{SHORT_DAYS[day]}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {padded.map((date) => {
          const outside = date.slice(0, 7) !== month.slice(0, 7);
          const summary =
            summaries.get(date) ??
            ({ date, scheduled: 0, completed: 0, rate: null, perfect: false } satisfies DaySummary);
          const tone = dayTone(summary, today);
          const isToday = date === today;
          const isSelected = date === selected;

          return (
            <button
              key={date}
              type="button"
              onClick={() => onSelect(date)}
              aria-current={isToday ? 'date' : undefined}
              aria-pressed={isSelected}
              aria-label={describeDay(summary, today, formatLongDate(date))}
              className={cn(
                'group relative aspect-square rounded-md transition-[transform,box-shadow] duration-150',
                'hover:z-10 hover:scale-[1.06] focus-visible:z-10',
                outside && 'opacity-35',
                isSelected && 'ring-2 ring-accent-text ring-offset-2 ring-offset-surface',
              )}
            >
              <span
                className={cn(
                  'absolute inset-0 grid place-items-center rounded-md',
                  TONE_FILL[tone],
                )}
              >
                <span
                  className={cn(
                    'tnum text-[12.5px] font-medium',
                    TONE_TEXT[tone],
                    isToday && 'font-bold underline decoration-2 underline-offset-[3px]',
                  )}
                >
                  {Number(date.slice(8))}
                </span>
              </span>
              {summary.perfect ? (
                <span
                  aria-hidden
                  className="absolute top-1 right-1 h-1 w-1 rounded-full bg-[#3a2c10]/50"
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
