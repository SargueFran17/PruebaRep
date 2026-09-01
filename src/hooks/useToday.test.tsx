import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { useFollowsToday, useToday } from './useToday';

function Probe() {
  const today = useToday();
  const [selected, setSelected] = useState(today);
  const [anchor, setAnchor] = useState('2026-01-01');
  useFollowsToday(today, [setSelected, setAnchor]);
  return (
    <div>
      <span data-testid="today">{today}</span>
      <span data-testid="selected">{selected}</span>
      <span data-testid="anchor">{anchor}</span>
    </div>
  );
}

describe('useToday', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('rolls over to the new day at midnight while the app stays open', () => {
    vi.setSystemTime(new Date(2026, 8, 1, 23, 58, 0));
    render(<Probe />);
    expect(screen.getByTestId('today')).toHaveTextContent('2026-09-01');

    act(() => {
      vi.advanceTimersByTime(5 * 60 * 1000);
    });
    expect(screen.getByTestId('today')).toHaveTextContent('2026-09-02');
  });

  it('keeps rolling over on subsequent days', () => {
    vi.setSystemTime(new Date(2026, 8, 1, 23, 59, 0));
    render(<Probe />);

    act(() => {
      vi.advanceTimersByTime(2 * 60 * 1000);
    });
    expect(screen.getByTestId('today')).toHaveTextContent('2026-09-02');

    act(() => {
      vi.advanceTimersByTime(24 * 60 * 60 * 1000);
    });
    expect(screen.getByTestId('today')).toHaveTextContent('2026-09-03');
  });

  it('crosses a year boundary', () => {
    vi.setSystemTime(new Date(2026, 11, 31, 23, 59, 30));
    render(<Probe />);
    expect(screen.getByTestId('today')).toHaveTextContent('2026-12-31');

    act(() => {
      vi.advanceTimersByTime(60 * 1000);
    });
    expect(screen.getByTestId('today')).toHaveTextContent('2027-01-01');
  });

  it('re-checks the date when the tab regains focus after being asleep', () => {
    vi.setSystemTime(new Date(2026, 8, 1, 10, 0, 0));
    render(<Probe />);
    expect(screen.getByTestId('today')).toHaveTextContent('2026-09-01');

    // A sleeping phone does not fire the timer; the wake-up does.
    act(() => {
      vi.setSystemTime(new Date(2026, 8, 4, 9, 0, 0));
      window.dispatchEvent(new Event('focus'));
    });
    expect(screen.getByTestId('today')).toHaveTextContent('2026-09-04');
  });
});

describe('useFollowsToday', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('moves a selection that was pinned to today, and leaves others alone', () => {
    vi.setSystemTime(new Date(2026, 8, 1, 23, 59, 0));
    render(<Probe />);
    expect(screen.getByTestId('selected')).toHaveTextContent('2026-09-01');
    expect(screen.getByTestId('anchor')).toHaveTextContent('2026-01-01');

    act(() => {
      vi.advanceTimersByTime(2 * 60 * 1000);
    });

    // The one that was showing "today" follows; the deliberately chosen date stays.
    expect(screen.getByTestId('selected')).toHaveTextContent('2026-09-02');
    expect(screen.getByTestId('anchor')).toHaveTextContent('2026-01-01');
  });
});
