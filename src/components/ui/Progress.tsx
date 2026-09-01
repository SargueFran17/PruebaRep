import { cn } from '@/lib/cn';

interface ProgressProps {
  /** 0–1. */
  value: number;
  className?: string;
  tone?: 'accent' | 'gold' | 'muted';
  size?: 'sm' | 'md';
  label?: string;
  /** Optional marker showing where an even pace would be by now. */
  pace?: number;
}

const TONES = {
  accent: 'bg-accent',
  gold: 'bg-gold',
  muted: 'bg-line-strong',
} as const;

export function Progress({
  value,
  className,
  tone = 'accent',
  size = 'md',
  label,
  pace,
}: ProgressProps) {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  const percent = Math.round(clamped * 100);

  return (
    <div
      className={cn(
        'relative w-full overflow-hidden rounded-full bg-sunken',
        size === 'sm' ? 'h-1.5' : 'h-2',
        className,
      )}
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-500', TONES[tone])}
        style={{ width: `${percent}%` }}
      />
      {pace !== undefined && pace > 0 && pace < 1 ? (
        <span
          aria-hidden
          className="absolute top-0 h-full w-px bg-ink/25"
          style={{ left: `${Math.round(pace * 100)}%` }}
        />
      ) : null}
    </div>
  );
}

interface RingProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  tone?: 'accent' | 'gold';
  className?: string;
  children?: React.ReactNode;
  label?: string;
}

export function ProgressRing({
  value,
  size = 96,
  strokeWidth = 8,
  tone = 'accent',
  className,
  children,
  label,
}: RingProps) {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={Math.round(clamped * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-sunken"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={cn(
            'transition-[stroke-dashoffset] duration-700',
            tone === 'gold' ? 'stroke-gold' : 'stroke-accent',
          )}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: circumference * (1 - clamped),
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}
