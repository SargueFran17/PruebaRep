import { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from '@/domain/dates';
import type { Habit } from '@/domain/types';
import { Button, Card, CardBody, CardHeader, EmptyState, SegmentedControl } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { futureHorizon, futureMonthLimit } from '@/app/config';
import { useSwipe } from '@/hooks/useSwipe';
import { MonthGrid } from '@/components/calendar/MonthGrid';
import { WeekStrip } from '@/components/calendar/WeekStrip';
import { LEGEND, TONE_FILL } from '@/components/calendar/dayTone';
import { HabitList } from '@/components/habits/HabitList';
import { HabitDetail } from '@/components/habits/HabitDetail';
import { HabitDialog } from '@/components/habits/HabitDialog';
import { useHabitActions } from '@/hooks/useHabitActions';
import { useFollowsToday } from '@/hooks/useToday';
import { formatLongDate, formatMonthYear, formatPercent, pluralise } from '@/lib/format';
import {
  useHabits,
  useHabitsForDay,
  useRangeSummaries,
  useSettings,
  useToday,
  useWeekSummaries,
} from '@/store/selectors';
import { useAppStore } from '@/store/useAppStore';

type View = 'month' | 'week';

export function CalendarPage() {
  const today = useToday();
  const { weekStart } = useSettings();
  const entries = useAppStore((state) => state.data.entries);
  const habits = useHabits();

  const [view, setView] = useState<View>('month');
  const [anchor, setAnchor] = useState(today);
  const [selected, setSelected] = useState(today);
  useFollowsToday(today, [setAnchor, setSelected]);
  const [detail, setDetail] = useState<Habit | undefined>();
  const [editing, setEditing] = useState<Habit | undefined>();

  const monthStart = startOfMonth(anchor);
  const gridStart = startOfWeek(monthStart, weekStart);
  const gridEnd = endOfWeek(endOfMonth(anchor), weekStart);

  const monthSummaries = useRangeSummaries(gridStart, gridEnd);
  const weekSummaries = useWeekSummaries(anchor);
  const summaryMap = useMemo(
    () => new Map(monthSummaries.map((summary) => [summary.date, summary])),
    [monthSummaries],
  );

  const habitsForDay = useHabitsForDay(selected);
  const { toggle, setAmount } = useHabitActions(selected);
  const selectedSummary = summaryMap.get(selected);

  const monthDays = monthSummaries.filter(
    (summary) => isSameMonth(summary.date, monthStart) && summary.rate !== null,
  );
  const monthRate =
    monthDays.length > 0
      ? monthDays.reduce((total, summary) => total + (summary.rate ?? 0), 0) / monthDays.length
      : 0;
  const perfectCount = monthDays.filter((summary) => summary.perfect).length;

  const horizon = futureHorizon(today);

  const shiftMonth = (delta: number) => {
    const target = addMonths(monthStart, delta);
    if (target > futureMonthLimit(today)) return;
    setAnchor(target);
    setSelected(isSameMonth(today, target) ? today : startOfMonth(target));
  };

  const shiftWeek = (delta: number) => {
    const target = addDays(anchor, delta * 7);
    if (startOfWeek(target, weekStart) > horizon) return;
    setAnchor(target);
    setSelected(target);
  };

  // Drag or swipe sideways to move through time; the arrows do the same thing
  // and stay for keyboard and assistive technology.
  const swipe = useSwipe({
    onSwipeLeft: () => (view === 'month' ? shiftMonth(1) : shiftWeek(1)),
    onSwipeRight: () => (view === 'month' ? shiftMonth(-1) : shiftWeek(-1)),
  });

  if (habits.length === 0) {
    return (
      <div>
        <PageHeader eyebrow="History" title="Calendar" />
        <Card>
          <EmptyState
            icon={<CalendarDays size={19} strokeWidth={1.75} aria-hidden />}
            title="Nothing to show yet"
            description="Once you track a habit, every day you complete it appears here."
          />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="History"
        title="Calendar"
        description="Each square is a day. The darker it is, the more of that day you finished."
        actions={
          <SegmentedControl<View>
            label="Calendar view"
            value={view}
            onChange={setView}
            size="sm"
            className="w-40"
            options={[
              { value: 'month', label: 'Month' },
              { value: 'week', label: 'Week' },
            ]}
          />
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr] lg:items-start [&>*]:min-w-0">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 pt-5 pb-4 sm:px-5">
            <div className="min-w-0">
              <h2 className="text-[15px] font-semibold text-ink">
                {formatMonthYear(monthStart)}
              </h2>
              <p className="mt-0.5 text-[12.5px] text-muted">
                {monthDays.length === 0
                  ? monthStart > today
                    ? 'Still to come'
                    : 'Nothing recorded'
                  : `${formatPercent(monthRate)} average · ${perfectCount} ${pluralise(
                      perfectCount,
                      'perfect day',
                    )}`}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <NavButton label="Previous month" onClick={() => shiftMonth(-1)}>
                <ChevronLeft size={16} strokeWidth={1.75} aria-hidden />
              </NavButton>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setAnchor(today);
                  setSelected(today);
                }}
              >
                Today
              </Button>
              <NavButton
                label="Next month"
                disabled={monthStart >= futureMonthLimit(today)}
                onClick={() => shiftMonth(1)}
              >
                <ChevronRight size={16} strokeWidth={1.75} aria-hidden />
              </NavButton>
            </div>
          </div>

          <CardBody>
            <div
              {...swipe.bindings}
              className="touch-pan-y select-none"
              style={{
                transform: `translateX(${swipe.offset}px)`,
                transition: swipe.dragging ? 'none' : 'transform 220ms var(--ease-out-soft)',
              }}
            >
              {view === 'month' ? (
                <MonthGrid
                  month={monthStart}
                  summaries={summaryMap}
                  today={today}
                  weekStart={weekStart}
                  selected={selected}
                  onSelect={setSelected}
                />
              ) : (
                <WeekStrip
                  summaries={weekSummaries}
                  today={today}
                  maxDate={horizon}
                  selected={selected}
                  onSelect={setSelected}
                  onShift={shiftWeek}
                />
              )}
            </div>

            <ul className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-4">
              {LEGEND.map((item) => (
                <li key={item.tone} className="flex items-center gap-1.5 text-[11.5px] text-muted">
                  <span
                    aria-hidden
                    className={`h-3 w-3 rounded-[4px] ring-1 ring-line ring-inset ${TONE_FILL[item.tone]}`}
                  />
                  {item.label}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        <Card className="lg:sticky lg:top-8">
          <CardHeader
            title={selected === today ? 'Today' : formatLongDate(selected)}
            subtitle={
              selectedSummary && selectedSummary.rate !== null
                ? `${selectedSummary.completed} of ${selectedSummary.scheduled} completed · ${formatPercent(selectedSummary.rate)}`
                : selected > today
                  ? 'This day has not happened yet'
                  : 'Nothing was scheduled'
            }
          />
          <CardBody className="px-0 pb-0">
            <HabitList
              habits={habitsForDay}
              entries={entries}
              date={selected}
              weekStart={weekStart}
              onToggle={toggle}
              onSetAmount={setAmount}
              onOpen={setDetail}
              readOnlyReason={selected > today ? 'This day has not happened yet' : undefined}
              empty={
                <EmptyState
                  compact
                  icon={<CalendarDays size={17} strokeWidth={1.75} aria-hidden />}
                  title="No habits scheduled"
                  description="Nothing was due on this day."
                />
              }
            />
            {habitsForDay.length > 0 ? (
              <p className="px-5 pt-3 pb-5 text-[12px] text-faint">
                {selected > today
                  ? 'Planned for this day. You can tick habits off once the day arrives.'
                  : selected < today
                    ? 'You can still correct a past day — the record should match what happened.'
                    : 'Tap a circle to complete a habit.'}
              </p>
            ) : null}
          </CardBody>
        </Card>
      </div>

      <HabitDetail
        open={Boolean(detail)}
        habit={detail}
        onClose={() => setDetail(undefined)}
        onEdit={(habit) => {
          setDetail(undefined);
          setEditing(habit);
        }}
      />
      <HabitDialog open={Boolean(editing)} habit={editing} onClose={() => setEditing(undefined)} />
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
