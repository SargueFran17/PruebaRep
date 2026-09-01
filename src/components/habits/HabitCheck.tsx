import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { CompletionState } from '@/domain/entries';

interface HabitCheckProps {
  state: CompletionState;
  /** 0–1 fill for quantity habits that are partially logged. */
  progress: number;
  onToggle: () => void;
  label: string;
  size?: 'md' | 'lg';
  disabled?: boolean;
}

/**
 * The app's primary control. One tap completes; the ring fills for measurable
 * habits. The pop and halo fire only on the transition into "complete" — never
 * on undo, and never on first render.
 */
export function HabitCheck({
  state,
  progress,
  onToggle,
  label,
  size = 'md',
  disabled,
}: HabitCheckProps) {
  const [celebrate, setCelebrate] = useState(false);
  const previous = useRef(state);

  useEffect(() => {
    if (previous.current !== 'complete' && state === 'complete') {
      setCelebrate(true);
      const timer = window.setTimeout(() => setCelebrate(false), 560);
      previous.current = state;
      return () => window.clearTimeout(timer);
    }
    previous.current = state;
  }, [state]);

  const box = size === 'lg' ? 44 : 38;
  const stroke = 2.5;
  const radius = (box - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const complete = state === 'complete';

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={complete}
      aria-label={label}
      className={cn(
        'relative grid shrink-0 place-items-center rounded-full transition-transform duration-150',
        'disabled:cursor-not-allowed disabled:opacity-40',
        !disabled && 'hover:scale-[1.04] active:scale-95',
        celebrate && 'animate-pop',
      )}
      style={{ width: box, height: box }}
    >
      {celebrate ? (
        <span
          aria-hidden
          className="animate-ring absolute inset-0 rounded-full border-2 border-accent"
        />
      ) : null}

      <svg width={box} height={box} className="-rotate-90" aria-hidden>
        <circle
          cx={box / 2}
          cy={box / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className={cn(
            'transition-colors duration-200',
            complete ? 'stroke-accent' : 'stroke-line-strong',
          )}
        />
        {!complete && progress > 0 ? (
          <circle
            cx={box / 2}
            cy={box / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            className="stroke-accent-text transition-[stroke-dashoffset] duration-400"
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: circumference * (1 - progress),
            }}
          />
        ) : null}
      </svg>

      <span
        aria-hidden
        className={cn(
          'absolute inset-[3px] grid place-items-center rounded-full transition-all duration-200',
          complete ? 'scale-100 bg-accent opacity-100' : 'scale-75 opacity-0',
        )}
      >
        <Check
          size={size === 'lg' ? 20 : 17}
          strokeWidth={2.75}
          className="text-accent-contrast"
        />
      </span>
    </button>
  );
}
