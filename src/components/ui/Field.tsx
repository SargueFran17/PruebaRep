import { useId } from 'react';
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

// 16px on phones is deliberate: iOS Safari zooms the whole page in when a
// focused field is smaller than that, which then forces sideways scrolling.
// Desktop keeps the tighter 14px.
const CONTROL =
  'w-full rounded-md border border-line-strong bg-surface px-3 text-base sm:text-sm text-ink placeholder:text-faint ' +
  'transition-colors duration-150 hover:border-accent-line focus:border-accent-text focus:outline-none ' +
  'focus-visible:outline-2 focus-visible:outline-accent-text focus-visible:outline-offset-1 disabled:opacity-50';

interface FieldWrapperProps {
  label: string;
  hint?: ReactNode;
  error?: string;
  children: (id: string) => ReactNode;
  className?: string;
  /** Visually hide the label but keep it for screen readers. */
  hideLabel?: boolean;
}

export function Field({ label, hint, error, children, className, hideLabel }: FieldWrapperProps) {
  const id = useId();
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label
        htmlFor={id}
        className={cn(
          'text-[12px] font-medium tracking-wide text-muted uppercase',
          hideLabel && 'sr-only',
        )}
      >
        {label}
      </label>
      {children(id)}
      {error ? (
        <p className="text-[12px] text-negative" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[12px] text-faint">{hint}</p>
      ) : null}
    </div>
  );
}

export function TextInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(CONTROL, 'h-10', className)} {...props} />;
}

export function TextArea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(CONTROL, 'min-h-20 resize-y py-2.5', className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(CONTROL, 'h-10 cursor-pointer appearance-none pr-8', className)} {...props}>
      {children}
    </select>
  );
}

/** Segmented control — used for frequency kind, period switches, theme. */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  label,
  size = 'md',
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: ReactNode; title?: string }[];
  label: string;
  size?: 'sm' | 'md';
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        'inline-flex items-center gap-1 rounded-md border border-line bg-sunken p-1',
        className,
      )}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            title={option.title}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex-1 rounded-sm px-2 font-medium transition-colors duration-150',
              size === 'sm' ? 'h-8 text-[12px]' : 'h-9 text-[13px]',
              selected
                ? 'bg-surface text-ink shadow-card'
                : 'text-muted hover:text-ink',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <label htmlFor={id} className="block text-sm font-medium text-ink">
          {label}
        </label>
        {description ? <p className="mt-0.5 text-[13px] text-muted">{description}</p> : null}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          'touch-target relative mt-0.5 h-6 w-10 shrink-0 rounded-full border transition-colors duration-200',
          checked ? 'border-accent bg-accent' : 'border-line-strong bg-sunken',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0 h-4.5 w-4.5 rounded-full bg-surface shadow-card transition-transform duration-200',
            checked ? 'translate-x-[19px]' : 'translate-x-[3px]',
          )}
        />
      </button>
    </div>
  );
}
