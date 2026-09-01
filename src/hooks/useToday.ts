import { useEffect, useState } from 'react';
import { todayKey } from '@/domain/dates';
import type { DateKey } from '@/domain/types';

/**
 * Today's date, kept live.
 *
 * Reading `todayKey()` during render is not enough: React only re-renders on a
 * state change, so an app left open overnight keeps showing yesterday — and,
 * worse, writes that night's completions to the wrong day. This schedules a
 * tick just after the next local midnight, and re-checks whenever the tab comes
 * back, because background timers are throttled and a phone may have been
 * asleep for hours.
 */
export function useToday(): DateKey {
  const [day, setDay] = useState<DateKey>(() => todayKey());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const msUntilNextMidnight = (): number => {
      const now = new Date();
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
      // Never schedule a zero-delay timer, which would spin.
      return Math.max(1000, next.getTime() - now.getTime());
    };

    const schedule = (): void => {
      timer = setTimeout(() => {
        setDay(todayKey());
        schedule();
      }, msUntilNextMidnight());
    };

    const sync = (): void => {
      if (!document.hidden) setDay(todayKey());
    };

    schedule();
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('focus', sync);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('focus', sync);
    };
  }, []);

  return day;
}

/**
 * Keeps a date the user picked in step with the calendar: if they were looking
 * at "today" when midnight passed, move them to the new today; if they had
 * deliberately navigated elsewhere, leave them there.
 *
 * Adjusts during render rather than in an effect, so the screen never paints a
 * frame with the stale date.
 */
export function useFollowsToday(
  today: DateKey,
  setters: ((update: (current: DateKey) => DateKey) => void)[],
): void {
  const [previous, setPrevious] = useState(today);

  if (previous !== today) {
    setPrevious(today);
    for (const set of setters) {
      set((current) => (current === previous ? today : current));
    }
  }
}
