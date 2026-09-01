import type { DaySummary } from '@/domain/stats';

export type DayTone = 'future' | 'none' | 'low' | 'mid' | 'high' | 'perfect';

/**
 * The calendar's single source of colour truth.
 * grey → partial greys → navy for an excellent day → gold for a perfect one.
 */
export function dayTone(summary: DaySummary, today: string): DayTone {
  if (summary.date > today) return 'future';
  if (summary.rate === null) return 'none';
  if (summary.perfect) return 'perfect';
  if (summary.rate >= 0.75) return 'high';
  if (summary.rate >= 0.4) return 'mid';
  if (summary.rate > 0) return 'low';
  return 'none';
}

export const TONE_FILL: Record<DayTone, string> = {
  future: 'bg-canvas ring-1 ring-line ring-inset',
  none: 'bg-sunken',
  low: 'bg-line-strong',
  mid: 'bg-accent/45',
  high: 'bg-accent',
  perfect: 'bg-gold',
};

export const TONE_TEXT: Record<DayTone, string> = {
  future: 'text-faint',
  none: 'text-muted',
  low: 'text-ink',
  mid: 'text-ink',
  high: 'text-accent-contrast',
  perfect: 'text-[#3a2c10]',
};

export const TONE_LABEL: Record<DayTone, string> = {
  future: 'upcoming',
  none: 'nothing logged',
  low: 'a little done',
  mid: 'partly done',
  high: 'nearly all done',
  perfect: 'perfect day',
};

/**
 * One sentence describing a day, shared by the month grid and the week strip so
 * both read identically to a screen reader. A future day is "upcoming", never
 * "nothing scheduled" — nothing has been missed yet.
 */
export function describeDay(summary: DaySummary, today: string, longDate: string): string {
  const tone = dayTone(summary, today);
  if (tone === 'future') return `${longDate} — upcoming`;
  if (summary.rate === null) return `${longDate} — nothing scheduled`;
  return `${longDate} — ${summary.completed} of ${summary.scheduled} habits, ${TONE_LABEL[tone]}`;
}

export const LEGEND: { tone: DayTone; label: string }[] = [
  { tone: 'none', label: 'None' },
  { tone: 'low', label: 'Some' },
  { tone: 'mid', label: 'Most' },
  { tone: 'high', label: 'Excellent' },
  { tone: 'perfect', label: 'Perfect' },
];
