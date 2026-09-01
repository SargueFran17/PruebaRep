import { ChevronLeft, ChevronRight } from 'lucide-react';
import { weekdayOf } from '@/domain/dates';
import { MIN_DAYS, SHORT_DAYS } from '@/domain/frequency';
import type { DaySummary } from '@/domain/stats';
import type { DateKey } from '@/domain/types';
import { cn } from '@/lib/cn';
import { formatLongDate, formatRange } from '@/lib/format';
import { dayTone, describeDay, TONE_FILL, TONE_TEXT } from './dayTone';

interface WeekStripProps {
  summaries: DaySummary[];
  today: DateKey;
  selected: DateKey;
  onSelect: (date: DateKey) => void;
  onShift?: (weeks: number) => void;
  showNavigation?: boolean;
  /** Furthest day the strip will navigate to. Defaults to today. */
  maxDate?: DateKey;
}

/** The week at a glance: seven columns, each a bar of the day's completion. */
export function WeekStrip({
  summaries,
  today,
  selected,
  onSelect,
  onShift,
  showNavigation = true,
  maxDate,
}: WeekStripProps) {
  const limit = maxDate ?? today;
  const first = summaries[0]?.date;
  const last = summaries[summaries.length - 1]?.date;

  return (
    <div className="flex flex-col gap-3">
      {showNavigation && first && last ? (
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-medium text-muted">{formatRange(first, last)}</p>
          {onShift ? (
            <div className="flex items-center gap-1">
              <NavButton label="Previous week" onClick={() => onShift(-1)}>
                <ChevronLeft size={16} strokeWidth={1.75} aria-hidden />
              </NavButton>
              <NavButton
                label="Next week"
                disabled={Boolean(last && last >= limit)}
                onClick={() => onShift(1)}
              >
                <ChevronRight size={16} strokeWidth={1.75} aria-hidden />
              </NavButton>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {summaries.map((summary) => {
          const tone = dayTone(summary, today);
          const isToday = summary.date === today;
          const isSelected = summary.date === selected;
          const weekday = weekdayOf(summary.date);
          const height = summary.rate === null ? 0 : Math.max(summary.rate, 0.06);

          return (
            <button
              key={summary.date}
              type="button"
              onClick={() => onSelect(summary.date)}
              aria-pressed={isSelected}
              aria-current={isToday ? 'date' : undefined}
              aria-label={describeDay(summary, today, formatLongDate(summary.date))}
              className={cn(
                'group flex flex-col items-center gap-1.5 rounded-md px-0.5 py-2 transition-colors duration-150',
                isSelected ? 'bg-sunken' : 'hover:bg-sunken/60',
              )}
            >
              <span
                className={cn(
                  'text-[10.5px] font-medium tracking-wide uppercase',
                  isToday ? 'text-accent-text' : 'text-faint',
                )}
              >
                <span aria-hidden>{MIN_DAYS[weekday]}</span>
                <span className="sr-only">{SHORT_DAYS[weekday]}</span>
              </span>

              <span className="flex h-20 w-full items-end justify-center sm:h-24">
                <span
                  className={cn(
                    'flex w-full max-w-9 items-start justify-center rounded-[5px] pt-1 transition-[height] duration-500',
                    summary.rate === null ? 'bg-sunken' : TONE_FILL[tone],
                  )}
                  style={{ height: `${Math.max(height * 100, 8)}%` }}
                >
                  {summary.rate !== null && summary.rate >= 0.55 ? (
                    <span className={cn('tnum text-[10px] font-semibold', TONE_TEXT[tone])}>
                      {summary.completed}
                    </span>
                  ) : null}
                </span>
              </span>

              <span
                className={cn(
                  'tnum text-[11px]',
                  isToday ? 'font-semibold text-ink' : 'text-muted',
                )}
              >
                {Number(summary.date.slice(8))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function NavButton({
  children,
  label,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="grid h-9 w-9 place-items-center rounded-md border border-line text-muted transition-colors hover:border-accent-line hover:text-ink disabled:pointer-events-none disabled:opacity-35"
    >
      {children}
    </button>
  );
}
