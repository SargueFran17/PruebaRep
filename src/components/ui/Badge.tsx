import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'neutral' | 'accent' | 'gold' | 'positive' | 'quiet';

const TONES: Record<Tone, string> = {
  neutral: 'bg-sunken text-muted border-line',
  accent: 'bg-accent-tint text-accent-text border-accent-line',
  gold: 'bg-gold-tint text-gold-text border-gold-line',
  positive: 'bg-positive/10 text-positive border-positive/25',
  quiet: 'bg-transparent text-faint border-line',
};

export function Badge({
  tone = 'neutral',
  icon,
  children,
  className,
}: {
  tone?: Tone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium tracking-wide',
        TONES[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
