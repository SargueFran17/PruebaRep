import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatAmount } from '@/lib/format';

interface QuantityStepperProps {
  amount: number;
  target: number;
  step: number;
  unit?: string;
  onChange: (amount: number) => void;
  habitName: string;
}

/** Inline +/− control for measurable habits: log 15 more minutes without a modal. */
export function QuantityStepper({
  amount,
  target,
  step,
  unit,
  onChange,
  habitName,
}: QuantityStepperProps) {
  const round = (value: number): number => Math.max(0, Math.round(value * 100) / 100);

  return (
    <div className="flex items-center gap-1 rounded-full border border-line bg-surface p-0.5">
      <StepButton
        label={`Remove ${formatAmount(step, unit)} from ${habitName}`}
        onClick={() => onChange(round(amount - step))}
        disabled={amount <= 0}
      >
        <Minus size={14} strokeWidth={2} aria-hidden />
      </StepButton>
      <span
        className={cn(
          'tnum min-w-14 px-1 text-center text-[12.5px] font-medium',
          amount >= target ? 'text-accent-text' : 'text-muted',
        )}
      >
        {formatAmount(amount, unit)}
      </span>
      <StepButton
        label={`Add ${formatAmount(step, unit)} to ${habitName}`}
        onClick={() => onChange(round(amount + step))}
      >
        <Plus size={14} strokeWidth={2} aria-hidden />
      </StepButton>
    </div>
  );
}

function StepButton({
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
      className="grid h-7 w-7 place-items-center rounded-full text-muted transition-colors hover:bg-sunken hover:text-ink disabled:pointer-events-none disabled:opacity-35"
    >
      {children}
    </button>
  );
}
