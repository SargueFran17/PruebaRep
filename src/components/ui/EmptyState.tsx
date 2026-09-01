import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  compact,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'gap-2 px-5 py-8' : 'gap-3 px-6 py-14',
        className,
      )}
    >
      <div
        aria-hidden
        className="grid h-11 w-11 place-items-center rounded-full border border-line bg-sunken text-faint"
      >
        {icon}
      </div>
      <div className="max-w-xs">
        <p className="text-[15px] font-semibold text-ink">{title}</p>
        <p className="mt-1 text-[13px] leading-relaxed text-muted">{description}</p>
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
