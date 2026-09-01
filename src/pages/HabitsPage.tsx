import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Flame, ListChecks, Plus, Trophy } from 'lucide-react';
import { describeFrequency, frequencyScale } from '@/domain/frequency';
import type { Habit } from '@/domain/types';
import { Badge, Button, Card, EmptyState, Progress, SegmentedControl } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { HabitDialog } from '@/components/habits/HabitDialog';
import { HabitDetail } from '@/components/habits/HabitDetail';
import { formatPercent, pluralise } from '@/lib/format';
import { useAllHabitStats, useCategories, useSettings } from '@/store/selectors';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/cn';

type Filter = 'active' | 'archived';

export function HabitsPage() {
  const [filter, setFilter] = useState<Filter>('active');
  const [category, setCategory] = useState('all');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Habit | undefined>();
  const [detail, setDetail] = useState<Habit | undefined>();

  const { weekStart } = useSettings();
  const categories = useCategories();
  const allStats = useAllHabitStats(true);
  const reorder = useAppStore((state) => state.reorderHabits);

  const visible = useMemo(
    () =>
      allStats.filter((stats) => {
        const matchesFilter =
          filter === 'archived' ? stats.habit.archived : !stats.habit.archived;
        const matchesCategory = category === 'all' || stats.habit.categoryId === category;
        return matchesFilter && matchesCategory;
      }),
    [allStats, filter, category],
  );

  const activeCount = allStats.filter((stats) => !stats.habit.archived).length;
  const archivedCount = allStats.length - activeCount;

  const move = (habitId: string, direction: -1 | 1) => {
    const ordered = allStats
      .filter((stats) => !stats.habit.archived)
      .map((stats) => stats.habit.id);
    const index = ordered.indexOf(habitId);
    const next = index + direction;
    if (index < 0 || next < 0 || next >= ordered.length) return;
    const swapped = [...ordered];
    swapped[index] = ordered[next] as string;
    swapped[next] = ordered[index] as string;
    reorder(swapped);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Library"
        title="Habits"
        description="Everything you are tracking, with its cadence and record."
        actions={
          <Button
            variant="primary"
            icon={<Plus size={16} strokeWidth={2} aria-hidden />}
            onClick={() => setCreating(true)}
          >
            New habit
          </Button>
        }
      />

      {allStats.length > 0 ? (
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <SegmentedControl<Filter>
            label="Habit status"
            value={filter}
            onChange={setFilter}
            size="sm"
            className="w-auto min-w-56"
            options={[
              { value: 'active', label: `Active ${activeCount}` },
              { value: 'archived', label: `Archived ${archivedCount}` },
            ]}
          />

          <div className="scrollbar-slim -mx-1 flex gap-1.5 overflow-x-auto px-1 py-0.5">
            <CategoryChip
              label="All"
              active={category === 'all'}
              onClick={() => setCategory('all')}
            />
            {categories
              .filter((entry) =>
                allStats.some((stats) => stats.habit.categoryId === entry.id),
              )
              .map((entry) => (
                <CategoryChip
                  key={entry.id}
                  label={entry.name}
                  active={category === entry.id}
                  onClick={() => setCategory(entry.id)}
                />
              ))}
          </div>
        </div>
      ) : null}

      {visible.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ListChecks size={19} strokeWidth={1.75} aria-hidden />}
            title={
              allStats.length === 0
                ? 'Build your first habit.'
                : filter === 'archived'
                  ? 'Nothing archived'
                  : 'No habits in this category'
            }
            description={
              allStats.length === 0
                ? 'One repeated action, tracked honestly, is where every streak starts.'
                : filter === 'archived'
                  ? 'Archived habits keep their history but leave your daily list.'
                  : 'Try another category, or add a habit here.'
            }
            action={
              allStats.length === 0 || filter === 'active' ? (
                <Button
                  variant="primary"
                  icon={<Plus size={15} strokeWidth={2} aria-hidden />}
                  onClick={() => setCreating(true)}
                >
                  Create habit
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {visible.map((stats, index) => {
            const { habit } = stats;
            const scale = frequencyScale(habit.frequency);
            const canReorder = !habit.archived && filter === 'active' && category === 'all';
            return (
              <li key={habit.id}>
                <Card className="transition-shadow duration-200 hover:shadow-raised">
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <span
                        aria-hidden
                        className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-line bg-sunken text-[17px]"
                      >
                        {habit.icon}
                      </span>

                      <button
                        type="button"
                        onClick={() => setDetail(habit)}
                        className="min-w-0 flex-1 text-left"
                        aria-label={`Open details for ${habit.name}`}
                      >
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-[15px] font-medium text-ink">{habit.name}</span>
                          {habit.archived ? <Badge tone="quiet">Archived</Badge> : null}
                          {stats.streak.current >= 7 ? (
                            <Badge tone="gold" icon={<Trophy size={10} strokeWidth={2} />}>
                              {stats.streak.current}
                            </Badge>
                          ) : null}
                        </span>
                        <span className="mt-0.5 block text-[12.5px] text-muted">
                          {describeFrequency(habit.frequency, weekStart)}
                          {habit.target.kind === 'quantity'
                            ? ` · ${habit.target.amount} ${habit.target.unit ?? ''}`.trimEnd()
                            : ''}
                        </span>
                      </button>

                      <div className="hidden shrink-0 items-start gap-6 pr-1 sm:flex sm:gap-8">
                        <MiniStat
                          label="Current"
                          value={`${stats.streak.current}`}
                          suffix={pluralise(stats.streak.current, scale === 'day' ? 'day' : scale)}
                          icon={<Flame size={11} strokeWidth={2} aria-hidden />}
                          gold={stats.streak.current >= 7}
                        />
                        <MiniStat
                          label="Best"
                          value={`${stats.streak.best}`}
                          suffix={pluralise(stats.streak.best, scale === 'day' ? 'day' : scale)}
                        />
                        <MiniStat
                          label="Rate"
                          value={formatPercent(stats.allTime.rate)}
                          suffix="all time"
                        />
                      </div>

                      {canReorder ? (
                        <div className="flex shrink-0 flex-col gap-0.5">
                          <ReorderButton
                            label={`Move ${habit.name} up`}
                            disabled={index === 0}
                            onClick={() => move(habit.id, -1)}
                          >
                            <ArrowUp size={13} strokeWidth={2} aria-hidden />
                          </ReorderButton>
                          <ReorderButton
                            label={`Move ${habit.name} down`}
                            disabled={index === visible.length - 1}
                            onClick={() => move(habit.id, 1)}
                          >
                            <ArrowDown size={13} strokeWidth={2} aria-hidden />
                          </ReorderButton>
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-3 sm:hidden">
                      <MiniStat
                        label="Current"
                        value={`${stats.streak.current}`}
                        suffix={pluralise(stats.streak.current, scale === 'day' ? 'day' : scale)}
                        icon={<Flame size={11} strokeWidth={2} aria-hidden />}
                        gold={stats.streak.current >= 7}
                      />
                      <MiniStat
                        label="Best"
                        value={`${stats.streak.best}`}
                        suffix={pluralise(stats.streak.best, scale === 'day' ? 'day' : scale)}
                      />
                      <MiniStat
                        label="Rate"
                        value={formatPercent(stats.allTime.rate)}
                        suffix="all time"
                      />
                    </div>

                    <div className="mt-3.5 flex items-center gap-3">
                      <Progress
                        className="flex-1"
                        size="sm"
                        value={stats.last30.rate}
                        label={`${habit.name}: ${formatPercent(stats.last30.rate)} over the last 30 days`}
                      />
                      <span className="tnum shrink-0 text-[11px] text-faint">30 days</span>
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <HabitDialog open={creating} onClose={() => setCreating(false)} />
      <HabitDialog open={Boolean(editing)} habit={editing} onClose={() => setEditing(undefined)} />
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

function MiniStat({
  label,
  value,
  suffix,
  icon,
  gold,
}: {
  label: string;
  value: string;
  suffix: string;
  icon?: React.ReactNode;
  gold?: boolean;
}) {
  return (
    <div>
      <p className="flex items-center gap-1 text-[10.5px] font-medium tracking-[0.05em] text-faint uppercase">
        {icon}
        {label}
      </p>
      <p className={cn('tnum mt-0.5 text-[15px] font-semibold', gold ? 'text-gold-text' : 'text-ink')}>
        {value} <span className="text-[11px] font-normal text-faint">{suffix}</span>
      </p>
    </div>
  );
}

function CategoryChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'shrink-0 rounded-full border px-3 py-1 text-[12.5px] font-medium transition-colors duration-150',
        active
          ? 'border-accent bg-accent text-accent-contrast'
          : 'border-line bg-surface text-muted hover:border-accent-line hover:text-ink',
      )}
    >
      {label}
    </button>
  );
}

function ReorderButton({
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
      className="grid h-7 w-7 place-items-center rounded-md text-faint transition-colors hover:bg-sunken hover:text-ink disabled:pointer-events-none disabled:opacity-25"
    >
      {children}
    </button>
  );
}
