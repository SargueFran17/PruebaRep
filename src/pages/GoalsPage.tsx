import { useState } from 'react';
import { Plus, Target, Trophy } from 'lucide-react';
import type { Goal } from '@/domain/types';
import { Badge, Button, Card, CardBody, CardHeader, ConfirmDialog, EmptyState } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { GoalDialog } from '@/components/goals/GoalDialog';
import { GoalRow } from '@/components/goals/GoalRow';
import { formatMonth, formatRange, pluralise } from '@/lib/format';
import { useActiveHabits, useGoalProgress, useSettings, useToday } from '@/store/selectors';
import { useAppStore } from '@/store/useAppStore';

export function GoalsPage() {
  const today = useToday();
  const { confirmDestructive } = useSettings();
  const habits = useActiveHabits();
  const weekly = useGoalProgress('week');
  const monthly = useGoalProgress('month');
  const deleteGoal = useAppStore((state) => state.deleteGoal);
  const notify = useAppStore((state) => state.notify);

  const [creating, setCreating] = useState<false | 'week' | 'month'>(false);
  const [editing, setEditing] = useState<Goal | undefined>();
  const [deleting, setDeleting] = useState<Goal | undefined>();

  const achieved = [...weekly, ...monthly].filter(
    (progress) => progress.status === 'achieved',
  ).length;

  const remove = (goal: Goal) => {
    deleteGoal(goal.id);
    notify(`${goal.title} deleted`);
    setDeleting(undefined);
  };

  const weekLabel = weekly[0] ? formatRange(weekly[0].range.start, weekly[0].range.end) : '';
  const monthLabel = monthly[0] ? formatMonth(monthly[0].range.start) : formatMonth(today);

  return (
    <div>
      <PageHeader
        eyebrow="Targets"
        title="Goals"
        description="Weekly targets keep the week honest; monthly targets keep the month ambitious."
        actions={
          <Button
            variant="primary"
            icon={<Plus size={16} strokeWidth={2} aria-hidden />}
            onClick={() => setCreating('week')}
            disabled={habits.length === 0}
          >
            New goal
          </Button>
        }
      />

      {achieved > 0 ? (
        <div className="mb-5 flex items-center gap-2.5 rounded-lg border border-gold-line bg-gold-tint px-4 py-3">
          <Trophy size={16} strokeWidth={1.75} className="shrink-0 text-gold-text" aria-hidden />
          <p className="text-[13.5px] text-gold-text">
            <strong className="font-semibold">{achieved}</strong>{' '}
            {pluralise(achieved, 'goal')} achieved this period.
          </p>
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <GoalSection
          title="Weekly goals"
          subtitle={weekLabel || 'This week'}
          progresses={weekly}
          emptyTitle="Set a goal for this week"
          emptyDescription="Five days of reading. Four workouts. Something you can finish by Sunday."
          disabled={habits.length === 0}
          onCreate={() => setCreating('week')}
          onEdit={setEditing}
          onDelete={(goal) => (confirmDestructive ? setDeleting(goal) : remove(goal))}
        />

        <GoalSection
          title="Monthly goals"
          subtitle={monthLabel}
          progresses={monthly}
          emptyTitle="Set a goal for this month"
          emptyDescription="Twenty days read. Sixteen sessions trained. A month is long enough to matter."
          disabled={habits.length === 0}
          onCreate={() => setCreating('month')}
          onEdit={setEditing}
          onDelete={(goal) => (confirmDestructive ? setDeleting(goal) : remove(goal))}
        />
      </div>

      {habits.length === 0 ? (
        <p className="mt-4 text-center text-[13px] text-muted">
          Goals measure habits — create a habit first.
        </p>
      ) : null}

      <GoalDialog
        key={creating || 'closed'}
        open={creating !== false}
        defaultPeriod={creating === false ? 'week' : creating}
        onClose={() => setCreating(false)}
      />
      <GoalDialog
        key={editing?.id ?? 'no-edit'}
        open={Boolean(editing)}
        goal={editing}
        onClose={() => setEditing(undefined)}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        title={`Delete ${deleting?.title ?? 'goal'}?`}
        message="The goal is removed. Your habit history is untouched."
        confirmLabel="Delete goal"
        destructive
        onConfirm={() => deleting && remove(deleting)}
        onCancel={() => setDeleting(undefined)}
      />
    </div>
  );
}

function GoalSection({
  title,
  subtitle,
  progresses,
  emptyTitle,
  emptyDescription,
  disabled,
  onCreate,
  onEdit,
  onDelete,
}: {
  title: string;
  subtitle: string;
  progresses: ReturnType<typeof useGoalProgress>;
  emptyTitle: string;
  emptyDescription: string;
  disabled: boolean;
  onCreate: () => void;
  onEdit: (goal: Goal) => void;
  onDelete: (goal: Goal) => void;
}) {
  return (
    <Card>
      <CardHeader
        title={title}
        subtitle={subtitle}
        action={
          progresses.length > 0 ? (
            <Badge tone="neutral">
              {progresses.filter((progress) => progress.status === 'achieved').length} /{' '}
              {progresses.length}
            </Badge>
          ) : null
        }
      />
      <CardBody>
        {progresses.length === 0 ? (
          <EmptyState
            compact
            icon={<Target size={18} strokeWidth={1.75} aria-hidden />}
            title={emptyTitle}
            description={emptyDescription}
            action={
              <Button
                size="sm"
                variant="secondary"
                onClick={onCreate}
                disabled={disabled}
                icon={<Plus size={14} strokeWidth={2} aria-hidden />}
              >
                Add goal
              </Button>
            }
          />
        ) : (
          <ul className="flex flex-col gap-5">
            {progresses.map((progress) => (
              <li key={progress.goal.id}>
                <GoalRow
                  progress={progress}
                  onEdit={() => onEdit(progress.goal)}
                  onDelete={() => onDelete(progress.goal)}
                />
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
