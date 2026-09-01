import { useState } from 'react';
import { Button, Field, Modal, SegmentedControl, Select, TextInput } from '@/components/ui';
import type { Goal, GoalMetric, GoalPeriod } from '@/domain/types';
import { useActiveHabits } from '@/store/selectors';
import { useAppStore } from '@/store/useAppStore';

interface GoalDialogProps {
  open: boolean;
  goal?: Goal;
  defaultPeriod?: GoalPeriod;
  onClose: () => void;
}

type MetricKind = GoalMetric['kind'];

const METRIC_OPTIONS: { value: MetricKind; label: string; help: string }[] = [
  { value: 'habitDays', label: 'Days completing a habit', help: 'e.g. read on 5 days' },
  { value: 'habitAmount', label: 'Total amount of a habit', help: 'e.g. 300 minutes read' },
  { value: 'consistency', label: 'Overall completion rate', help: 'a percentage across every habit' },
  { value: 'perfectDays', label: 'Perfect days', help: 'days where every habit was done' },
];

export function GoalDialog({ open, goal, defaultPeriod = 'week', onClose }: GoalDialogProps) {
  const habits = useActiveHabits();
  const addGoal = useAppStore((state) => state.addGoal);
  const updateGoal = useAppStore((state) => state.updateGoal);
  const notify = useAppStore((state) => state.notify);

  const [title, setTitle] = useState(goal?.title ?? '');
  const [period, setPeriod] = useState<GoalPeriod>(goal?.period ?? defaultPeriod);
  const [kind, setKind] = useState<MetricKind>(goal?.metric.kind ?? 'habitDays');
  const [habitId, setHabitId] = useState(
    goal && 'habitId' in goal.metric ? goal.metric.habitId : (habits[0]?.id ?? ''),
  );
  const [target, setTarget] = useState(String(goal?.target ?? 5));
  const [submitted, setSubmitted] = useState(false);

  const needsHabit = kind === 'habitDays' || kind === 'habitAmount';
  const parsedTarget = Number.parseFloat(target);
  const targetValid = Number.isFinite(parsedTarget) && parsedTarget > 0;
  const habitValid = !needsHabit || Boolean(habitId);
  const titleValid = title.trim().length > 0;
  const valid = targetValid && habitValid && titleValid;

  const selectedHabit = habits.find((habit) => habit.id === habitId);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (!valid) return;

    const metric: GoalMetric = needsHabit
      ? kind === 'habitDays'
        ? { kind: 'habitDays', habitId }
        : { kind: 'habitAmount', habitId }
      : kind === 'consistency'
        ? { kind: 'consistency' }
        : { kind: 'perfectDays' };

    const draft = { title: title.trim(), period, metric, target: parsedTarget };
    if (goal) {
      updateGoal(goal.id, draft);
      notify('Goal updated');
    } else {
      addGoal(draft);
      notify('Goal created');
    }
    onClose();
  };

  const unitHint =
    kind === 'consistency'
      ? 'Percentage, 1–100'
      : kind === 'habitAmount'
        ? `In ${selectedHabit?.target.unit ?? 'the habit unit'}`
        : 'Number of days';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={goal ? 'Edit goal' : 'New goal'}
      description={`A ${period === 'week' ? 'weekly' : 'monthly'} target to aim at.`}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="goal-form">
            {goal ? 'Save goal' : 'Create goal'}
          </Button>
        </>
      }
    >
      <form id="goal-form" onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        <Field
          label="Title"
          error={submitted && !titleValid ? 'Give the goal a name.' : undefined}
        >
          {(id) => (
            <TextInput
              id={id}
              value={title}
              autoFocus
              maxLength={50}
              placeholder="Train four times"
              onChange={(event) => setTitle(event.target.value)}
            />
          )}
        </Field>

        <div className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium tracking-wide text-muted uppercase">
            Period
          </span>
          <SegmentedControl<GoalPeriod>
            label="Goal period"
            value={period}
            onChange={setPeriod}
            size="sm"
            options={[
              { value: 'week', label: 'Weekly' },
              { value: 'month', label: 'Monthly' },
            ]}
          className="w-full"
          />
        </div>

        <Field label="Measure">
          {(id) => (
            <Select
              id={id}
              value={kind}
              onChange={(event) => setKind(event.target.value as MetricKind)}
            >
              {METRIC_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} — {option.help}
                </option>
              ))}
            </Select>
          )}
        </Field>

        {needsHabit ? (
          <Field
            label="Habit"
            error={submitted && !habitValid ? 'Create a habit first.' : undefined}
          >
            {(id) => (
              <Select
                id={id}
                value={habitId}
                onChange={(event) => setHabitId(event.target.value)}
              >
                {habits.length === 0 ? <option value="">No habits yet</option> : null}
                {habits.map((habit) => (
                  <option key={habit.id} value={habit.id}>
                    {habit.icon} {habit.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        ) : null}

        <Field
          label="Target"
          hint={unitHint}
          error={submitted && !targetValid ? 'Enter a number above zero.' : undefined}
        >
          {(id) => (
            <TextInput
              id={id}
              type="number"
              inputMode="numeric"
              min="1"
              step="any"
              value={target}
              onChange={(event) => setTarget(event.target.value)}
            />
          )}
        </Field>
      </form>
    </Modal>
  );
}
