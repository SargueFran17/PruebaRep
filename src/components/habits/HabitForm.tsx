import { useMemo, useState } from 'react';
import { todayKey } from '@/domain/dates';
import { MIN_DAYS, SHORT_DAYS } from '@/domain/frequency';
import type { Category, Frequency, Habit, WeekStart, Weekday } from '@/domain/types';
import { cn } from '@/lib/cn';
import { Button, Field, SegmentedControl, Select, TextArea, TextInput } from '@/components/ui';
import type { HabitDraft } from '@/store/useAppStore';

const ICONS = [
  '🏋️', '🏃', '🧘', '📖', '✍️', '💧', '🥗', '😴', '🎯', '🧠',
  '💻', '🎸', '🌱', '☀️', '🚶', '🧹', '💊', '📵', '🗣️', '◆',
];

const UNITS = ['min', 'h', 'pages', 'km', 'L', 'reps', 'sessions', 'words'];

interface HabitFormProps {
  habit?: Habit;
  categories: Category[];
  weekStart: WeekStart;
  onSubmit: (draft: HabitDraft) => void;
  /** Id used by the dialog footer's submit button. */
  formId?: string;
}

type FrequencyKind = Frequency['kind'];

export function HabitForm({
  habit,
  categories,
  weekStart,
  onSubmit,
  formId = 'habit-form',
}: HabitFormProps) {
  const [name, setName] = useState(habit?.name ?? '');
  const [description, setDescription] = useState(habit?.description ?? '');
  const [icon, setIcon] = useState(habit?.icon ?? '◆');
  const [categoryId, setCategoryId] = useState(habit?.categoryId ?? categories[0]?.id ?? 'other');
  const [kind, setKind] = useState<FrequencyKind>(habit?.frequency.kind ?? 'daily');
  const [days, setDays] = useState<Weekday[]>(
    habit?.frequency.kind === 'weekdays' ? habit.frequency.days : [1, 2, 3, 4, 5],
  );
  const [timesPerWeek, setTimesPerWeek] = useState(
    habit?.frequency.kind === 'timesPerWeek' ? habit.frequency.times : 4,
  );
  const [timesPerMonth, setTimesPerMonth] = useState(
    habit?.frequency.kind === 'timesPerMonth' ? habit.frequency.times : 12,
  );
  const [measurable, setMeasurable] = useState(habit?.target.kind === 'quantity');
  const [amount, setAmount] = useState(
    habit?.target.kind === 'quantity' ? String(habit.target.amount) : '20',
  );
  const [unit, setUnit] = useState(habit?.target.unit ?? 'min');
  const [time, setTime] = useState(habit?.time ?? '');
  const [startDate, setStartDate] = useState(habit?.startDate ?? todayKey());
  const [showAdvanced, setShowAdvanced] = useState(Boolean(habit?.description || habit?.time));
  const [submitted, setSubmitted] = useState(false);

  const dayOrder = useMemo(
    () => Array.from({ length: 7 }, (_, i) => ((weekStart + i) % 7) as Weekday),
    [weekStart],
  );

  const parsedAmount = Number.parseFloat(amount);
  const amountValid = !measurable || (Number.isFinite(parsedAmount) && parsedAmount > 0);
  const nameValid = name.trim().length > 0;
  const daysValid = kind !== 'weekdays' || days.length > 0;
  const valid = nameValid && amountValid && daysValid;

  const buildFrequency = (): Frequency => {
    switch (kind) {
      case 'weekdays':
        return { kind: 'weekdays', days: [...days].sort((a, b) => a - b) };
      case 'timesPerWeek':
        return { kind: 'timesPerWeek', times: timesPerWeek };
      case 'timesPerMonth':
        return { kind: 'timesPerMonth', times: timesPerMonth };
      case 'daily':
      default:
        return { kind: 'daily' };
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (!valid) return;

    onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      icon,
      categoryId,
      frequency: buildFrequency(),
      target: measurable
        ? {
            kind: 'quantity',
            amount: parsedAmount,
            unit: unit.trim() || undefined,
            step: suggestStep(parsedAmount, unit),
          }
        : { kind: 'check', amount: 1, step: 1 },
      time: time || undefined,
      startDate,
    });
  };

  const toggleDay = (day: Weekday) => {
    setDays((current) =>
      current.includes(day) ? current.filter((value) => value !== day) : [...current, day],
    );
  };

  return (
    <form id={formId} onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <div className="flex gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium tracking-wide text-muted uppercase">Icon</span>
          <IconPicker value={icon} onChange={setIcon} />
        </div>
        <Field
          label="Name"
          className="flex-1"
          error={submitted && !nameValid ? 'Give the habit a name.' : undefined}
        >
          {(id) => (
            <TextInput
              id={id}
              value={name}
              autoFocus
              maxLength={60}
              placeholder="Read before bed"
              onChange={(event) => setName(event.target.value)}
              aria-invalid={submitted && !nameValid}
            />
          )}
        </Field>
      </div>

      <Field label="Category">
        {(id) => (
          <Select
            id={id}
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <div className="flex flex-col gap-2.5">
        <span className="text-[12px] font-medium tracking-wide text-muted uppercase">
          Frequency
        </span>
        <SegmentedControl<FrequencyKind>
          label="Frequency"
          value={kind}
          onChange={setKind}
          size="sm"
          options={[
            { value: 'daily', label: 'Daily' },
            { value: 'weekdays', label: 'Set days' },
            { value: 'timesPerWeek', label: '× / week' },
            { value: 'timesPerMonth', label: '× / month' },
          ]}
        className="w-full"
          />

        {kind === 'weekdays' ? (
          <div className="flex flex-col gap-1.5">
            <div role="group" aria-label="Days of the week" className="flex gap-1.5">
              {dayOrder.map((day) => {
                const selected = days.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    aria-pressed={selected}
                    aria-label={SHORT_DAYS[day]}
                    className={cn(
                      'h-9 flex-1 rounded-md border text-[13px] font-medium transition-colors duration-150',
                      selected
                        ? 'border-accent bg-accent text-accent-contrast'
                        : 'border-line-strong bg-surface text-muted hover:border-accent-line hover:text-ink',
                    )}
                  >
                    {MIN_DAYS[day]}
                  </button>
                );
              })}
            </div>
            {submitted && !daysValid ? (
              <p className="text-[12px] text-negative" role="alert">
                Pick at least one day.
              </p>
            ) : null}
          </div>
        ) : null}

        {kind === 'timesPerWeek' ? (
          <Counter
            label="Times per week"
            value={timesPerWeek}
            min={1}
            max={7}
            onChange={setTimesPerWeek}
            suffix="× per week"
          />
        ) : null}

        {kind === 'timesPerMonth' ? (
          <Counter
            label="Times per month"
            value={timesPerMonth}
            min={1}
            max={31}
            onChange={setTimesPerMonth}
            suffix="× per month"
          />
        ) : null}
      </div>

      <div className="flex flex-col gap-2.5 rounded-md border border-line bg-sunken/50 p-3.5">
        <SegmentedControl
          label="Tracking type"
          size="sm"
          value={measurable ? 'quantity' : 'check'}
          onChange={(value) => setMeasurable(value === 'quantity')}
          options={[
            { value: 'check', label: 'Simple check' },
            { value: 'quantity', label: 'Measured amount' },
          ]}
        className="w-full"
          />
        {measurable ? (
          <div className="flex gap-3">
            <Field
              label="Daily target"
              className="w-32"
              error={submitted && !amountValid ? 'Enter a number.' : undefined}
            >
              {(id) => (
                <TextInput
                  id={id}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  aria-invalid={submitted && !amountValid}
                />
              )}
            </Field>
            <Field label="Unit" className="flex-1">
              {(id) => (
                <>
                  <TextInput
                    id={id}
                    list="habit-units"
                    value={unit}
                    maxLength={12}
                    placeholder="min"
                    onChange={(event) => setUnit(event.target.value)}
                  />
                  <datalist id="habit-units">
                    {UNITS.map((option) => (
                      <option key={option} value={option} />
                    ))}
                  </datalist>
                </>
              )}
            </Field>
          </div>
        ) : (
          <p className="text-[12.5px] text-muted">
            One tap marks the day done. Switch to a measured amount to log minutes, pages or litres.
          </p>
        )}
      </div>

      {showAdvanced ? (
        <div className="flex flex-col gap-4 border-t border-line pt-4">
          <Field label="Description" hint="Optional — a note to your future self.">
            {(id) => (
              <TextArea
                id={id}
                value={description}
                maxLength={200}
                placeholder="Twenty pages of something that is not a screen."
                onChange={(event) => setDescription(event.target.value)}
              />
            )}
          </Field>
          <div className="flex gap-3">
            <Field label="Time" className="flex-1" hint="Optional reminder time.">
              {(id) => (
                <TextInput
                  id={id}
                  type="time"
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                />
              )}
            </Field>
            <Field label="Start date" className="flex-1">
              {(id) => (
                <TextInput
                  id={id}
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value || todayKey())}
                />
              )}
            </Field>
          </div>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() => setShowAdvanced(true)}
        >
          + Description, time and start date
        </Button>
      )}

      <span className="sr-only" aria-live="polite">
        {submitted && !valid ? 'Please fix the highlighted fields.' : ''}
      </span>
    </form>
  );
}

function IconPicker({ value, onChange }: { value: string; onChange: (icon: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-label={`Habit icon, currently ${value}. Choose another`}
        className="grid h-10 w-12 place-items-center rounded-md border border-line-strong bg-surface text-lg transition-colors hover:border-accent-line"
      >
        {value}
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden />
          <div className="animate-fade-up absolute top-full left-0 z-20 mt-1.5 grid w-60 grid-cols-5 gap-1 rounded-md border border-line bg-surface p-2 shadow-raised">
            {ICONS.map((option) => (
              <button
                key={option}
                type="button"
                aria-label={`Use ${option}`}
                aria-pressed={option === value}
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                }}
                className={cn(
                  'grid h-9 place-items-center rounded-sm text-lg transition-colors',
                  option === value ? 'bg-accent-tint' : 'hover:bg-sunken',
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function Counter({
  label,
  value,
  min,
  max,
  onChange,
  suffix,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  suffix: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border border-line bg-surface px-3 py-2">
      <span className="text-[13px] text-muted">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
          className="touch-target grid h-8 w-8 place-items-center rounded-full border border-line-strong text-muted transition-colors hover:text-ink disabled:opacity-35"
        >
          −
        </button>
        <span className="tnum min-w-24 text-center text-[13px] font-medium text-ink">
          {value} {suffix.replace(/^\d+×\s*/, '')}
        </span>
        <button
          type="button"
          aria-label={`Increase ${label}`}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
          className="touch-target grid h-8 w-8 place-items-center rounded-full border border-line-strong text-muted transition-colors hover:text-ink disabled:opacity-35"
        >
          +
        </button>
      </div>
    </div>
  );
}

/** A sensible +/− increment: 5 for minutes, 0.5 for litres, 1 otherwise. */
function suggestStep(amount: number, unit: string): number {
  if (unit === 'min') return amount >= 60 ? 15 : 5;
  if (unit === 'L') return 0.5;
  if (unit === 'h') return 0.5;
  if (amount >= 100) return 10;
  if (amount >= 20) return 5;
  return 1;
}
