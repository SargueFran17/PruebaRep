import { useMemo, useState } from 'react';
import { BarChart3, Flame, Lock, Trophy } from 'lucide-react';
import { addDays, monthRange, weekRange } from '@/domain/dates';
import { completionsByHabit, weekdayBreakdown, weeklySeries } from '@/domain/stats';
import { frequencyScale, FULL_DAYS, SHORT_DAYS } from '@/domain/frequency';
import { Badge, Card, CardBody, CardHeader, EmptyState, Progress, SegmentedControl, Stat } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { BarChart } from '@/components/charts/BarChart';
import { formatMediumDate, formatPercent, pluralise } from '@/lib/format';
import {
  useAllHabitStats,
  useHabits,
  useMilestones,
  useOverview,
  useSettings,
  useToday,
} from '@/store/selectors';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/cn';

type Range = '30' | '90' | 'all';

export function InsightsPage() {
  const today = useToday();
  const { weekStart } = useSettings();
  const habits = useHabits();
  const entries = useAppStore((state) => state.data.entries);
  const overview = useOverview();
  const stats = useAllHabitStats();
  const milestones = useMilestones();
  const [range, setRange] = useState<Range>('30');

  const rangeStart = useMemo(() => {
    if (range === 'all') {
      return habits.reduce(
        (min, habit) => (habit.startDate < min ? habit.startDate : min),
        today,
      );
    }
    return addDays(today, range === '30' ? -29 : -89);
  }, [range, habits, today]);

  const series = useMemo(
    () => weeklySeries(habits, entries, today, weekStart, range === '30' ? 6 : 13),
    [habits, entries, today, weekStart, range],
  );

  const distribution = useMemo(
    () => completionsByHabit(habits.filter((habit) => !habit.archived), entries, { start: rangeStart, end: today }),
    [habits, entries, rangeStart, today],
  );

  const weekdays = useMemo(() => {
    const buckets = weekdayBreakdown(habits, entries, { start: rangeStart, end: today }, today);
    const order = Array.from({ length: 7 }, (_, i) => (weekStart + i) % 7);
    return order.map((day) => buckets[day]).filter((bucket) => bucket !== undefined);
  }, [habits, entries, rangeStart, today, weekStart]);

  const weakestDay = (() => {
    const scored = weekdays.filter((bucket) => bucket.total > 0);
    if (scored.length < 2) return null;
    const best = scored.reduce((high, bucket) => (bucket.rate > high.rate ? bucket : high));
    const worst = scored.reduce((low, bucket) => (bucket.rate < low.rate ? bucket : low));
    return worst.rate < best.rate - 0.05 ? FULL_DAYS[worst.weekday] : null;
  })();

  const week = weekRange(today, weekStart);
  const month = monthRange(today);
  // Only the highest badge in each track is worth showing; the rest are noise.
  const achieved = (['streak', 'volume', 'perfect'] as const)
    .map((kind) => milestones.filter((m) => m.kind === kind && m.achieved).at(-1))
    .filter((milestone) => milestone !== undefined);
  const achievedCount = milestones.filter((milestone) => milestone.achieved).length;
  const upcoming = milestones.filter((milestone) => !milestone.achieved).slice(0, 3);

  if (habits.length === 0) {
    return (
      <div>
        <PageHeader eyebrow="Analysis" title="Insights" />
        <Card>
          <EmptyState
            icon={<BarChart3 size={19} strokeWidth={1.75} aria-hidden />}
            title="No data yet"
            description="Track a habit for a few days and your patterns will start showing up here."
          />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Analysis"
        title="Insights"
        description="What the record actually says — not what it feels like."
        actions={
          <SegmentedControl<Range>
            label="Time range"
            value={range}
            onChange={setRange}
            size="sm"
            className="w-56"
            options={[
              { value: '30', label: '30 days' },
              { value: '90', label: '90 days' },
              { value: 'all', label: 'All time' },
            ]}
          />
        }
      />

      <div className="flex flex-col gap-5">
        <Card>
          <div className="grid grid-cols-2 gap-y-6 px-5 py-5 sm:grid-cols-3 lg:grid-cols-6">
            <Stat
              label="Completion"
              value={formatPercent(overview.overall.rate)}
              hint="all time"
            />
            <Stat
              label="This week"
              value={formatPercent(overview.thisWeek.rate)}
              hint={`${overview.thisWeek.completed} of ${overview.thisWeek.total}`}
            />
            <Stat
              label="This month"
              value={formatPercent(overview.thisMonth.rate)}
              hint={`${overview.thisMonth.completed} of ${overview.thisMonth.total}`}
            />
            <Stat
              label="Streak"
              value={overview.streak.current}
              hint={`best ${overview.streak.best}`}
              tone={overview.streak.current >= 7 ? 'gold' : 'default'}
            />
            <Stat
              label="Perfect days"
              value={overview.perfectDays}
              hint="every habit done"
              tone={overview.perfectDays >= 10 ? 'gold' : 'default'}
            />
            <Stat
              label="Completions"
              value={overview.totalCompletions}
              hint="total logged"
            />
          </div>
        </Card>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader
              title="Week by week"
              subtitle={`Completion rate, last ${series.length} weeks`}
            />
            <CardBody>
              <BarChart
                ariaLabel="Completion rate by week"
                data={series.map((point, index) => ({
                  label: formatMediumDate(point.start),
                  value: point.rate,
                  highlight: index === series.length - 1,
                }))}
              />
              <ul className="sr-only">
                {series.map((point) => (
                  <li key={point.start}>
                    Week of {formatMediumDate(point.start)}: {formatPercent(point.rate)}
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="By day of the week"
              subtitle={weakestDay ? `${weakestDay} is your hardest day` : 'Where consistency slips'}
            />
            <CardBody>
              <BarChart
                ariaLabel="Completion rate by day of the week"
                data={weekdays.map((bucket) => ({
                  label: SHORT_DAYS[bucket.weekday] ?? '',
                  value: bucket.rate,
                }))}
              />
              <ul className="sr-only">
                {weekdays.map((bucket) => (
                  <li key={bucket.weekday}>
                    {SHORT_DAYS[bucket.weekday]}: {formatPercent(bucket.rate)} across{' '}
                    {bucket.total} scheduled habits
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader
            title="By habit"
            subtitle={`Completions and rate since ${formatMediumDate(rangeStart)}`}
          />
          <CardBody>
            <ul className="flex flex-col divide-y divide-line">
              {stats.map((entry) => {
                const count =
                  distribution.find((item) => item.habit.id === entry.habit.id)?.count ?? 0;
                const scale = frequencyScale(entry.habit.frequency);
                const rate = range === '30' ? entry.last30.rate : entry.allTime.rate;
                return (
                  <li key={entry.habit.id} className="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0">
                    <span
                      aria-hidden
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-line bg-sunken text-[15px]"
                    >
                      {entry.habit.icon}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="truncate text-[14px] font-medium text-ink">
                          {entry.habit.name}
                        </p>
                        <span className="tnum shrink-0 text-[12.5px] text-muted">
                          {formatPercent(rate)}
                        </span>
                      </div>
                      <div className="mt-1.5">
                        <Progress
                          size="sm"
                          value={rate}
                          label={`${entry.habit.name}: ${formatPercent(rate)}`}
                        />
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-faint">
                        <span className="tnum">{count} completed in range</span>
                        {entry.streak.current > 0 ? (
                          <span
                            className={cn(
                              'tnum inline-flex items-center gap-1',
                              entry.streak.current >= 7 && 'text-gold-text',
                            )}
                          >
                            <Flame size={10} strokeWidth={2} aria-hidden />
                            {entry.streak.current}{' '}
                            {pluralise(entry.streak.current, scale === 'day' ? 'day' : scale)}
                          </span>
                        ) : null}
                        <span className="tnum">
                          best {entry.streak.best}{' '}
                          {pluralise(entry.streak.best, scale === 'day' ? 'day' : scale)}
                        </span>
                      </div>
                    </div>

                  </li>
                );
              })}
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Milestones"
            subtitle={`${achievedCount} of ${milestones.length} reached`}
            action={
              achievedCount > 0 ? (
                <Badge tone="gold" icon={<Trophy size={11} strokeWidth={2} />}>
                  {achievedCount}
                </Badge>
              ) : null
            }
          />
          <CardBody>
            {achieved.length === 0 && upcoming.length === 0 ? (
              <p className="text-[13px] text-muted">Keep going — the first milestone is seven days.</p>
            ) : (
              <div className="flex flex-col gap-5">
                {achieved.length > 0 ? (
                  <ul className="flex flex-wrap gap-2">
                    {achieved.map((milestone) => (
                      <li key={milestone.id}>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-line bg-gold-tint px-2.5 py-1 text-[12px] font-medium text-gold-text">
                          <Trophy size={11} strokeWidth={2} aria-hidden />
                          {milestone.title}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}

                {upcoming.length > 0 ? (
                  <div>
                    <p className="mb-2.5 text-[11px] font-medium tracking-[0.06em] text-faint uppercase">
                      Next up
                    </p>
                    <ul className="flex flex-col gap-3">
                      {upcoming.map((milestone) => (
                        <li key={milestone.id} className="flex items-center gap-3">
                          <Lock size={13} strokeWidth={1.75} className="shrink-0 text-disabled" aria-hidden />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline justify-between gap-3">
                              <span className="truncate text-[13px] text-ink">{milestone.title}</span>
                              <span className="tnum shrink-0 text-[12px] text-faint">
                                {milestone.value} / {milestone.threshold}
                              </span>
                            </div>
                            <Progress
                              className="mt-1.5"
                              size="sm"
                              tone="muted"
                              value={milestone.value / milestone.threshold}
                              label={`${milestone.title}: ${milestone.value} of ${milestone.threshold}`}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            )}
          </CardBody>
        </Card>

        <p className="text-center text-[12px] text-faint">
          Week of {formatMediumDate(week.start)} · {formatMediumDate(month.start)} onwards
        </p>
      </div>
    </div>
  );
}
