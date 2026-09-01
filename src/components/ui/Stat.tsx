import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface StatProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: 'default' | 'gold';
  className?: string;
}

export function Stat({ label, value, hint, tone = 'default', className }: StatProps) {
  return (
    <div className={cn('min-w-0', className)}>
      <p className="text-[11px] font-medium tracking-[0.06em] text-faint uppercase">{label}</p>
      <p
        className={cn(
          'display tnum mt-1 text-[26px] leading-none',
          tone === 'gold' ? 'text-gold-text' : 'text-ink',
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-1.5 text-[12px] text-muted">{hint}</p> : null}
    </div>
  );
}
