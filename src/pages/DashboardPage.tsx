import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Flame, Plus, Sparkles, Target, Trophy } from 'lucide-react';
import { addDays, weekRange } from '@/domain/dates';
import type { Habit } from '@/domain/types';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  ProgressRing,
} from '@/components/ui';
import { HabitList } from '@/components/habits/HabitList';
import { HabitDialog } from '@/components/habits/HabitDialog';
import { HabitDetail } from '@/components/habits/HabitDetail';
import { WeekStrip } from '@/components/calendar/WeekStrip';
import { GoalRow } from '@/components/goals/GoalRow';
import { futureHorizon } from '@/app/config';
import { InstallHint } from '@/components/layout/InstallHint';
import { useHabitActions } from '@/hooks/useHabitActions';
import { useFollowsToday } from '@/hooks/useToday';
import {
  formatLongDate,
  formatMediumDate,
  formatPercent,
  greetingFor,
  pluralise,
} from '@/lib/format';
import {
  useActiveHabits,
  useGoalProgress,
  useHabitsForDay,
  useOverview,
  useSettings,
  useToday,
  useWeekSummaries,
} from '@/store/selectors';
import { useAppStore } from '@/store/useAppStore';

export function DashboardPage() {
  const today = useToday();
  const { weekStart } = useSettings();
  const entries = useAppStore((state) => state.data.entries);
  const loadDemo = useAppStore((state) => state.loadDemoData);

  const [selectedDate, setSelectedDate] = useState(today);
  const [weekAnchor, setWeekAnchor] = useState(today);
  // If midnight passes while the dashboard is open, follow it — otherwise the
  // next tap would be recorded against yesterday.
  useFollowsToday(today, [setSelectedDate, setWeekAnchor]);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Habit | undefined>();
  const [detail, setDetail] = useState<Habit | undefined>();

  const allHabits = useActiveHabits();
  const habitsForDay = useHabitsForDay(selectedDate);
  const weekSummaries = useWeekSummaries(weekAnchor);
  const overview = useOverview();
  const weeklyGoals = useGoalProgress('week');
  const { toggle, setAmount } = useHabitActions(selectedDate);

  const { done, pending } = useMemo(
    () => ({
      done: habitsForDay.filter(
        (habit) => (entries[`${habit.id}|${selectedDate}`]?.amount ?? 0) >= habit.target.amount,
      ),
      pending: habitsForDay.filter(
        (habit) => (entries[`${habit.id}|${selectedDate}`]?.amount ?? 0) < habit.target.amount,
      ),
    }),
    [habitsForDay, entries, selectedDate],
  );

  const rate = habitsForDay.length > 0 ? done.length / habitsForDay.length : 0;
  // A habit whose start date has not arrived is invisible on this screen, which
  // otherwise reads as "nothing here" right after the user created one.
  const upcoming = allHabits.filter((habit) => habit.startDate > selectedDate);
  const isToday = selectedDate === today;
  const week = weekRange(weekAnchor, weekStart);
  const weekDays = weekSummaries.filter((summary) => summary.rate !== null);
  const weekRate =
    weekDays.length > 0
      ? weekDays.reduce((total, summary) => total + (summary.rate ?? 0), 0) / weekDays.length
      : 0;

  if (allHabits.length === 0) {
    return (
      <>
        <FirstRun onCreate={() => setCreating(true)} onDemo={loadDemo} />
        <HabitDialog open={creating} onClose={() => setCreating(false)} />
      </>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium tracking-[0.1em] text-faint uppercase">
            {isToday ? greetingFor() : 'Looking back'}
          </p>
          <h1 className="display mt-1 text-[27px] leading-tight text-ink sm:text-[32px]">
            {isToday ? 'Today' : formatLongDate(selectedDate)}
          </h1>
          {isToday ? (
            <p className="mt-1 text-[14px] text-muted">{formatLongDate(today)}</p>
          ) : (
            <button
              type="button"
              onClick={() => setSelectedDate(today)}
              className="mt-1 rounded-sm text-[13px] font-medium text-accent-text hover:underline"
            >
              Back to today
            </button>
          )}
        </div>
        <Button
          variant="primary"
          icon={<Plus size={16} strokeWidth={2} aria-hidden />}
          onClick={() => setCreating(true)}
        >
          New habit
        </Button>
      </header>

      {/* Today's progress — the answer to "how am I doing?" in one glance. */}
      <Card>
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:gap-7">
          <ProgressRing
            value={rate}
            size={104}
            strokeWidth={9}
            tone={rate === 1 ? 'gold' : 'accent'}
            label={`${done.length} of ${habitsForDay.length} habits completed`}
            className="self-center"
          >
            <span className="display tnum text-[24px] leading-none text-ink">
              {Math.round(rate * 100)}
              <span className="text-[14px] text-muted">%</span>
            </span>
          </ProgressRing>

          <div className="min-w-0 flex-1">
            <p className="tnum text-[17px] font-semibold text-ink">
              {done.length} / {habitsForDay.length}{' '}
              <span className="font-normal text-muted">
                {pluralise(habitsForDay.length, 'habit')} completed
              </span>
            </p>
            <p className="mt-1 text-[13.5px] text-muted">
              {habitsForDay.length === 0
                ? 'Nothing scheduled for this day — a deliberate rest counts too.'
                : pending.length === 0
                  ? 'Every habit done. That is a perfect day.'
                  : `${pending.length} ${pluralise(pending.length, 'habit')} left${
                      pending[0] ? ` — start with ${pending[0].name}.` : '.'
                    }`}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge
                tone={overview.streak.current > 0 ? 'accent' : 'quiet'}
                icon={<Flame size={11} strokeWidth={2} />}
              >
                {overview.streak.current > 0
                  ? `${overview.streak.current} perfect ${pluralise(overview.streak.current, 'day')} in a row`
                  : 'No perfect-day streak yet'}
              </Badge>
              {overview.streak.best >= 7 ? (
                <Badge tone="gold" icon={<Trophy size={11} strokeWidth={2} />}>
                  Best {overview.streak.best}
                </Badge>
              ) : null}
              <Badge tone="neutral">Week {formatPercent(overview.thisWeek.rate)}</Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* Pending first: the next action is always at the top of the screen. */}
      <section aria-labelledby="pending-heading" className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between px-0.5">
          <h2 id="pending-heading" className="text-[13px] font-semibold text-ink">
            {isToday ? 'To do' : 'Not completed'}
          </h2>
          <span className="tnum text-[12px] text-faint">
            {pending.length} {pluralise(pending.length, 'habit')}
          </span>
        </div>
        <HabitList
          habits={pending}
          entries={entries}
          date={selectedDate}
          weekStart={weekStart}
          onToggle={toggle}
          onSetAmount={setAmount}
          onOpen={setDetail}
          readOnlyReason={
            selectedDate > today ? 'This day has not happened yet' : undefined
          }
          empty={
            <Card>
              <EmptyState
                compact
                icon={<Sparkles size={18} strokeWidth={1.75} aria-hidden />}
                title={habitsForDay.length === 0 ? 'A clear day' : 'All done'}
                description={
                  habitsForDay.length > 0
                    ? 'Everything scheduled for this day is complete.'
                    : upcoming.length > 0
                      ? `Nothing scheduled yet — ${upcoming[0]?.name} starts on ${formatMediumDate(upcoming[0]?.startDate ?? selectedDate)}.`
                      : 'No habits are scheduled for this day.'
                }
              />
            </Card>
          }
        />
      </section>

      {done.length > 0 ? (
        <section aria-labelledby="done-heading" className="flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between px-0.5">
            <h2 id="done-heading" className="text-[13px] font-semibold text-ink">
              Completed
            </h2>
            <span className="tnum text-[12px] text-faint">{done.length}</span>
          </div>
          <HabitList
            habits={done}
            entries={entries}
            date={selectedDate}
            weekStart={weekStart}
            onToggle={toggle}
            onSetAmount={setAmount}
            onOpen={setDetail}
          />
        </section>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="This week"
            subtitle={`${formatPercent(weekRate)} average completion`}
          />
          <CardBody>
            <WeekStrip
              summaries={weekSummaries}
              today={today}
              maxDate={futureHorizon(today)}
              selected={selectedDate}
              onSelect={(date) => {
                setSelectedDate(date);
                setWeekAnchor(date);
              }}
              onShift={(weeks) =>
                setWeekAnchor((anchor) => {
                  const next = addDays(anchor, weeks * 7);
                  return next > futureHorizon(today) ? anchor : next;
                })
              }
            />
            <p className="sr-only">
              Week of {week.start} to {week.end}
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Weekly goals"
            action={
              <Link
                to="/goals"
                className="-my-1 inline-flex items-center gap-1 rounded-sm py-1 text-[12.5px] font-medium text-accent-text hover:underline"
              >
                All goals
                <ArrowRight size={13} strokeWidth={2} aria-hidden />
              </Link>
            }
          />
          <CardBody>
            {weeklyGoals.length === 0 ? (
              <EmptyState
                compact
                icon={<Target size={18} strokeWidth={1.75} aria-hidden />}
                title="Set a goal for this week"
                description="A weekly target turns scattered days into a plan."
                action={
                  <Link
                    to="/goals"
                    className="inline-flex h-8 items-center rounded-sm border border-line-strong bg-surface px-3 text-[13px] font-medium text-ink transition-colors hover:border-accent-line hover:bg-sunken"
                  >
                    Create a goal
                  </Link>
                }
              />
            ) : (
              <ul className="flex flex-col gap-4">
                {weeklyGoals.slice(0, 4).map((progress) => (
                  <li key={progress.goal.id}>
                    <GoalRow progress={progress} compact />
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <QuickStats />

      <InstallHint />

      <HabitDialog open={creating} onClose={() => setCreating(false)} />
      <HabitDialog
        open={Boolean(editing)}
        habit={editing}
        onClose={() => setEditing(undefined)}
      />
      <HabitDetail
        open={Boolean(detail)}
        habit={detail}
        onClose={() => setDetail(undefined)}
        onEdit={(habit) => {
          setDetail(undefined);
          setEditing(habit);
        }}
      />
    </div>
  );
}

function QuickStats() {
  const overview = useOverview();
  const items = [
    { label: 'Completion', value: formatPercent(overview.overall.rate), hint: 'all time' },
    { label: 'Perfect days', value: `${overview.perfectDays}`, hint: 'every habit done' },
    { label: 'Completions', value: `${overview.totalCompletions}`, hint: 'total logged' },
    { label: 'Active habits', value: `${overview.activeHabits}`, hint: 'in rotation' },
  ];

  return (
    <Card>
      <div className="grid grid-cols-2 divide-x divide-y divide-line sm:grid-cols-4 sm:divide-y-0">
        {items.map((item) => (
          <div key={item.label} className="px-5 py-4">
            <p className="text-[11px] font-medium tracking-[0.06em] text-faint uppercase">
              {item.label}
            </p>
            <p className="display tnum mt-1 text-[22px] leading-none text-ink">{item.value}</p>
            <p className="mt-1 text-[11.5px] text-faint">{item.hint}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function FirstRun({ onCreate, onDemo }: { onCreate: () => void; onDemo: () => void }) {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center text-center">
      <div className="max-w-md">
        <p className="text-[11px] font-medium tracking-[0.14em] text-faint uppercase">Cadence</p>
        <h1 className="display mt-3 text-[30px] leading-tight text-ink sm:text-[36px]">
          Build your first habit.
        </h1>
        <p className="mt-3 text-[14.5px] leading-relaxed text-muted">
          Track what you repeat, see the pattern, and keep the streak honest. Start with one
          thing you want to do tomorrow.
        </p>
        <div className="mt-7 flex flex-col items-center justify-center gap-2.5 sm:flex-row">
          <Button
            variant="primary"
            size="lg"
            icon={<Plus size={17} strokeWidth={2} aria-hidden />}
            onClick={onCreate}
          >
            Create habit
          </Button>
          <Button variant="ghost" size="lg" onClick={onDemo}>
            Explore with demo data
          </Button>
        </div>
      </div>
    </div>
  );
}
