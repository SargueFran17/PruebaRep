import { Flame } from 'lucide-react';
import { completionState, dayProgress, getAmount } from '@/domain/entries';
import type { EntryMap } from '@/domain/entries';
import { describeFrequency, frequencyScale } from '@/domain/frequency';
import { computeStreak } from '@/domain/streaks';
import type { DateKey, Habit, WeekStart } from '@/domain/types';
import { cn } from '@/lib/cn';
import { formatQuantity } from '@/lib/format';
import { HabitCheck } from './HabitCheck';
import { QuantityStepper } from './QuantityStepper';

interface HabitRowProps {
  habit: Habit;
  entries: EntryMap;
  date: DateKey;
  weekStart: WeekStart;
  onToggle: () => void;
  onSetAmount: (amount: number) => void;
  onOpen?: () => void;
  /** When set, the row is informational only (e.g. a future day). */
  readOnlyReason?: string;
}

/**
 * Layout: [ one-tap check ][ name + cadence, opens detail ][ quantity stepper ].
 * Two targets, both large enough for a thumb, no overflow menu to hunt for.
 */
export function HabitRow({
  habit,
  entries,
  date,
  weekStart,
  onToggle,
  onSetAmount,
  onOpen,
  readOnlyReason,
}: HabitRowProps) {
  const state = completionState(habit, entries, date);
  const amount = getAmount(entries, habit.id, date);
  const progress = dayProgress(habit, entries, date);
  const streak = computeStreak(habit, entries, date, weekStart);
  const isQuantity = habit.target.kind === 'quantity';
  const showStepper = isQuantity && !readOnlyReason;
  const scale = frequencyScale(habit.frequency);

  const details = (
    <>
      <div className="flex items-center gap-2">
        <span aria-hidden className="text-[15px] leading-none">
          {habit.icon}
        </span>
        <span
          className={cn(
            'truncate text-[14.5px] font-medium transition-colors duration-200',
            state === 'complete' ? 'text-muted' : 'text-ink',
          )}
        >
          {habit.name}
        </span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] text-faint">
        <span>{describeFrequency(habit.frequency, weekStart)}</span>
        {/* The stepper already shows the running amount; repeating it here
            only crowds the line on narrow screens. */}
        {isQuantity && !showStepper ? (
          <>
            <Dot />
            <span className="tnum">
              {formatQuantity(amount, habit.target.unit)} /{' '}
              {formatQuantity(habit.target.amount, habit.target.unit)}
            </span>
          </>
        ) : null}
        {streak.current > 0 ? (
          <>
            <Dot />
            <span
              className={cn(
                'tnum inline-flex items-center gap-1',
                streak.current >= 7 ? 'text-gold-text' : 'text-muted',
              )}
            >
              <Flame size={11} strokeWidth={2} aria-hidden />
              {streak.current}
              <span className="sr-only">{scale === 'day' ? 'day' : scale} streak</span>
            </span>
          </>
        ) : null}
      </div>
    </>
  );

  return (
    <div
      className={cn(
        // Wraps rather than crushes: on a very narrow phone the stepper drops
        // to a second line instead of squeezing the name down to one letter.
        'group flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-3 transition-colors duration-200 sm:flex-nowrap sm:gap-x-4 sm:px-5',
        state === 'complete' && 'bg-accent-tint/35',
      )}
    >
      <HabitCheck
        state={state}
        progress={progress}
        onToggle={onToggle}
        disabled={Boolean(readOnlyReason)}
        label={
          readOnlyReason ??
          `${state === 'complete' ? 'Mark incomplete' : 'Complete'} ${habit.name}`
        }
      />

      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          aria-label={`Open details for ${habit.name}`}
          className="min-w-0 flex-1 basis-36 rounded-md py-0.5 text-left transition-opacity hover:opacity-80"
        >
          {details}
        </button>
      ) : (
        <div className="min-w-0 flex-1 basis-36">{details}</div>
      )}

      {showStepper ? (
        <div className="ml-auto shrink-0">
          <QuantityStepper
            amount={amount}
            target={habit.target.amount}
            step={habit.target.step ?? 1}
            unit={habit.target.unit}
            habitName={habit.name}
            onChange={onSetAmount}
          />
        </div>
      ) : null}
    </div>
  );
}

function Dot() {
  return <span aria-hidden className="h-0.5 w-0.5 rounded-full bg-disabled" />;
}
