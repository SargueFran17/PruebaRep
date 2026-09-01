import { useState } from 'react';
import { Archive, ArchiveRestore, Flame, Pencil, Trash2, Trophy } from 'lucide-react';
import { addDays } from '@/domain/dates';
import { describeFrequency, frequencyScale } from '@/domain/frequency';
import type { Habit } from '@/domain/types';
import { Badge, Button, ConfirmDialog, Modal, Progress } from '@/components/ui';
import { formatLongDate, formatPercent, formatQuantity, pluralise } from '@/lib/format';
import { useCategoryName, useHabitStats, useSettings, useToday } from '@/store/selectors';
import { useAppStore } from '@/store/useAppStore';
import { MiniHeatmap } from '@/components/charts/MiniHeatmap';

interface HabitDetailProps {
  habit: Habit | undefined;
  open: boolean;
  onClose: () => void;
  onEdit: (habit: Habit) => void;
}

export function HabitDetail({ habit, open, onClose, onEdit }: HabitDetailProps) {
  const stats = useHabitStats(habit);
  const today = useToday();
  const { weekStart, confirmDestructive } = useSettings();
  const categoryName = useCategoryName(habit?.categoryId ?? 'other');
  const deleteHabit = useAppStore((state) => state.deleteHabit);
  const setArchived = useAppStore((state) => state.setHabitArchived);
  const notify = useAppStore((state) => state.notify);
  const [confirming, setConfirming] = useState(false);

  if (!habit || !stats) return null;

  const scale = frequencyScale(habit.frequency);
  const streakNoun = pluralise(stats.streak.current, scale === 'day' ? 'day' : scale);

  const remove = () => {
    deleteHabit(habit.id);
    notify(`${habit.name} deleted`);
    setConfirming(false);
    onClose();
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={habit.name}
        description={`${categoryName} · ${describeFrequency(habit.frequency, weekStart)}`}
        footer={
          <>
            <Button
              variant="danger"
              size="sm"
              icon={<Trash2 size={14} strokeWidth={1.75} />}
              onClick={() => (confirmDestructive ? setConfirming(true) : remove())}
            >
              Delete
            </Button>
            <div className="flex-1" />
            <Button
              variant="secondary"
              size="sm"
              icon={
                habit.archived ? (
                  <ArchiveRestore size={14} strokeWidth={1.75} />
                ) : (
                  <Archive size={14} strokeWidth={1.75} />
                )
              }
              onClick={() => {
                setArchived(habit.id, !habit.archived);
                notify(habit.archived ? `${habit.name} restored` : `${habit.name} archived`);
                onClose();
              }}
            >
              {habit.archived ? 'Restore' : 'Archive'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Pencil size={14} strokeWidth={1.75} />}
              onClick={() => onEdit(habit)}
            >
              Edit
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-6">
          {habit.description ? (
            <p className="text-[13.5px] leading-relaxed text-muted">{habit.description}</p>
          ) : null}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricTile
              label="Current"
              value={`${stats.streak.current}`}
              hint={streakNoun}
              icon={<Flame size={13} strokeWidth={2} aria-hidden />}
              gold={stats.streak.current >= 7}
            />
            <MetricTile
              label="Best"
              value={`${stats.streak.best}`}
              hint={pluralise(stats.streak.best, scale === 'day' ? 'day' : scale)}
              icon={<Trophy size={13} strokeWidth={2} aria-hidden />}
              gold={stats.streak.best >= 7}
            />
            <MetricTile label="Completed" value={`${stats.totalCompletions}`} hint="all time" />
            <MetricTile
              label="Rate"
              value={formatPercent(stats.allTime.rate)}
              hint="all time"
            />
          </div>

          <section className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <h3 className="text-[13px] font-semibold text-ink">Last 30 days</h3>
              <span className="tnum text-[12px] text-muted">
                {stats.last30.completed} / {stats.last30.total} ·{' '}
                {formatPercent(stats.last30.rate)}
              </span>
            </div>
            <Progress value={stats.last30.rate} label="Completion over the last 30 days" />

            <div className="mt-4 flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between">
                <h3 className="text-[13px] font-semibold text-ink">Last 12 weeks</h3>
                <span className="text-[11.5px] text-faint">one square per day</span>
              </div>
              <MiniHeatmap habit={habit} start={addDays(today, -83)} end={today} />
            </div>
          </section>

          {habit.target.kind === 'quantity' ? (
            <section className="flex items-baseline justify-between rounded-md border border-line bg-sunken/50 px-3.5 py-3">
              <span className="text-[13px] text-muted">Total logged</span>
              <span className="tnum text-[14px] font-medium text-ink">
                {formatQuantity(stats.totalAmount, habit.target.unit)}
              </span>
            </section>
          ) : null}

          <dl className="grid grid-cols-2 gap-y-2.5 text-[12.5px]">
            <Meta label="Target">
              {habit.target.kind === 'quantity'
                ? formatQuantity(habit.target.amount, habit.target.unit)
                : 'Complete once'}
            </Meta>
            <Meta label="Started">{formatLongDate(habit.startDate)}</Meta>
            {habit.time ? <Meta label="Time">{habit.time}</Meta> : null}
            <Meta label="Status">
              {habit.archived ? (
                <Badge tone="quiet">Archived</Badge>
              ) : (
                <Badge tone="accent">Active</Badge>
              )}
            </Meta>
          </dl>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirming}
        title={`Delete ${habit.name}?`}
        message="This removes the habit and its entire history. Archiving keeps the record and hides it from your day."
        confirmLabel="Delete permanently"
        destructive
        onConfirm={remove}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}

function MetricTile({
  label,
  value,
  hint,
  icon,
  gold,
}: {
  label: string;
  value: string;
  hint: string;
  icon?: React.ReactNode;
  gold?: boolean;
}) {
  return (
    <div className="rounded-md border border-line bg-sunken/40 px-3 py-2.5">
      <p className="flex items-center gap-1 text-[11px] font-medium tracking-[0.05em] text-faint uppercase">
        {icon}
        {label}
      </p>
      <p
        className={`display tnum mt-1 text-[21px] leading-none ${gold ? 'text-gold-text' : 'text-ink'}`}
      >
        {value}
      </p>
      <p className="mt-1 text-[11.5px] text-faint">{hint}</p>
    </div>
  );
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] tracking-[0.05em] text-faint uppercase">{label}</dt>
      <dd className="mt-0.5 text-ink">{children}</dd>
    </div>
  );
}
