import { Check, Pencil, Trash2 } from 'lucide-react';
import type { GoalProgress } from '@/domain/goals';
import { goalStatusLabel } from '@/domain/goals';
import { Badge, Progress } from '@/components/ui';
import { cn } from '@/lib/cn';
import { pluralise } from '@/lib/format';
import { useHabits } from '@/store/selectors';
import { describeGoalMetric } from '@/domain/goals';

interface GoalRowProps {
  progress: GoalProgress;
  compact?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

const STATUS_TONE = {
  achieved: 'gold',
  onTrack: 'accent',
  behind: 'neutral',
  notStarted: 'quiet',
} as const;

export function GoalRow({ progress, compact, onEdit, onDelete }: GoalRowProps) {
  const habits = useHabits();
  const achieved = progress.status === 'achieved';

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {achieved ? (
              <span
                aria-hidden
                className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-gold text-[#3a2c10]"
              >
                <Check size={11} strokeWidth={3} />
              </span>
            ) : null}
            <p
              className={cn(
                'truncate font-medium',
                compact ? 'text-[13.5px]' : 'text-[14.5px]',
                achieved ? 'text-gold-text' : 'text-ink',
              )}
            >
              {progress.goal.title}
            </p>
          </div>
          {!compact ? (
            <p className="mt-0.5 text-[12.5px] text-muted">
              {describeGoalMetric(progress.goal, habits)}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <span
            className={cn(
              'tnum text-[12.5px] font-medium',
              achieved ? 'text-gold-text' : 'text-muted',
            )}
          >
            {progress.label}
          </span>
          {onEdit ? (
            <IconButton label={`Edit ${progress.goal.title}`} onClick={onEdit}>
              <Pencil size={13} strokeWidth={1.75} aria-hidden />
            </IconButton>
          ) : null}
          {onDelete ? (
            <IconButton label={`Delete ${progress.goal.title}`} onClick={onDelete}>
              <Trash2 size={13} strokeWidth={1.75} aria-hidden />
            </IconButton>
          ) : null}
        </div>
      </div>

      <Progress
        value={progress.ratio}
        tone={achieved ? 'gold' : 'accent'}
        size={compact ? 'sm' : 'md'}
        pace={achieved ? undefined : progress.expectedRatio}
        label={`${progress.goal.title}: ${progress.label}`}
      />

      <div className="flex items-center justify-between text-[11.5px]">
        <Badge tone={STATUS_TONE[progress.status]}>{goalStatusLabel(progress.status)}</Badge>
        <span className="tnum text-faint">
          {progress.daysRemaining === 0
            ? 'Last day'
            : `${progress.daysRemaining} ${pluralise(progress.daysRemaining, 'day')} remaining`}
        </span>
      </div>
    </div>
  );
}

function IconButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid h-9 w-9 place-items-center rounded-md text-faint transition-colors hover:bg-sunken hover:text-ink"
    >
      {children}
    </button>
  );
}
