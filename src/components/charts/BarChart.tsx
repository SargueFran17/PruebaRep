import { cn } from '@/lib/cn';

export interface BarDatum {
  label: string;
  /** 0–1. */
  value: number;
  caption?: string;
  highlight?: boolean;
}

/**
 * A restrained column chart. No axes, no gridlines: the value labels carry the
 * numbers and the bars carry the shape.
 */
export function BarChart({
  data,
  height = 132,
  ariaLabel,
  format = (value) => `${Math.round(value * 100)}%`,
}: {
  data: BarDatum[];
  height?: number;
  ariaLabel: string;
  format?: (value: number) => string;
}) {
  if (data.length === 0) return null;

  return (
    <div role="img" aria-label={ariaLabel} className="flex flex-col gap-2">
      <div className="flex items-end gap-1.5 border-b border-line" style={{ height }}>
        {data.map((datum, index) => {
          const percent = Math.max(0, Math.min(1, datum.value));
          return (
            <div
              key={`${datum.label}-${index}`}
              className="flex h-full flex-1 flex-col justify-end gap-1"
            >
              <span
                className={cn(
                  'tnum text-center text-[10px]',
                  datum.highlight ? 'font-semibold text-ink' : 'text-faint',
                )}
              >
                {percent > 0 ? format(datum.value) : '—'}
              </span>
              <div
                className={cn(
                  'w-full rounded-t-[4px] transition-[height] duration-500',
                  datum.highlight ? 'bg-accent' : percent > 0 ? 'bg-accent/40' : 'bg-sunken',
                )}
                style={{ height: `${Math.max(percent * 100, percent > 0 ? 4 : 2)}%` }}
                title={`${datum.label}: ${format(datum.value)}`}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-1.5">
        {data.map((datum, index) => (
          <div key={`${datum.label}-label-${index}`} className="flex-1 text-center">
            <p
              className={cn(
                'truncate text-[10.5px]',
                datum.highlight ? 'font-medium text-ink' : 'text-faint',
              )}
            >
              {datum.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
