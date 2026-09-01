import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { App } from '@/app/App';
import { emptyData } from '@/persistence/schema';
import { MemoryStorageAdapter } from '@/persistence/storage';
import { flushPersistence, useAppStore } from '@/store/useAppStore';

/**
 * The app hydrates from storage on mount, so anything a test seeds into the
 * store must be written through first — otherwise hydration races it away.
 */
async function renderApp(route = '/') {
  await flushPersistence(useAppStore.getState().data);
  return render(
    <MemoryRouter initialEntries={[route]}>
      <App />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  useAppStore.getState().setStorage(new MemoryStorageAdapter());
  useAppStore.setState({ data: emptyData(), status: 'ready', notice: null });
});

describe('first run', () => {
  it('invites the user to build their first habit', async () => {
    await renderApp();
    expect(await screen.findByText('Build your first habit.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create habit/i })).toBeInTheDocument();
  });

  it('fills the app from the demo data button', async () => {
    const user = userEvent.setup();
    await renderApp();
    await user.click(await screen.findByRole('button', { name: /demo data/i }));
    expect(await screen.findByRole('heading', { name: 'Today' })).toBeInTheDocument();
    expect(useAppStore.getState().data.habits.length).toBeGreaterThan(0);
  });
});

describe('creating a habit', () => {
  it('walks from the empty state to a habit on today’s list', async () => {
    const user = userEvent.setup();
    await renderApp();

    await user.click(await screen.findByRole('button', { name: /create habit/i }));

    const dialog = await screen.findByRole('dialog', { name: /new habit/i });
    await user.type(within(dialog).getByLabelText('Name'), 'Meditate');
    await user.click(within(dialog).getByRole('button', { name: /create habit/i }));

    await waitFor(() => {
      expect(useAppStore.getState().data.habits).toHaveLength(1);
    });
    expect(await screen.findByText('Meditate')).toBeInTheDocument();
  });

  it('refuses to submit without a name', async () => {
    const user = userEvent.setup();
    await renderApp();
    await user.click(await screen.findByRole('button', { name: /create habit/i }));

    const dialog = await screen.findByRole('dialog', { name: /new habit/i });
    await user.click(within(dialog).getByRole('button', { name: /create habit/i }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(/give the habit a name/i);
    expect(useAppStore.getState().data.habits).toHaveLength(0);
  });
});

describe('completing habits', () => {
  it('marks a habit done, updates progress, and undoes it', async () => {
    const user = userEvent.setup();
    useAppStore.getState().addHabit({
      name: 'Meditate',
      icon: '🧘',
      categoryId: 'mind',
      frequency: { kind: 'daily' },
      target: { kind: 'check', amount: 1, step: 1 },
      startDate: '2020-01-01',
    });

    await renderApp();

    const complete = await screen.findByRole('button', { name: /^complete meditate$/i });
    expect(
      screen.getByRole('progressbar', { name: /0 of 1 habits completed/i }),
    ).toBeInTheDocument();

    await user.click(complete);
    await waitFor(() => {
      expect(Object.keys(useAppStore.getState().data.entries)).toHaveLength(1);
    });
    expect(
      await screen.findByRole('progressbar', { name: /1 of 1 habits completed/i }),
    ).toBeInTheDocument();

    await user.click(await screen.findByRole('button', { name: /mark incomplete meditate/i }));
    await waitFor(() => {
      expect(Object.keys(useAppStore.getState().data.entries)).toHaveLength(0);
    });
  });

  it('logs a measured habit with the stepper', async () => {
    const user = userEvent.setup();
    const habit = useAppStore.getState().addHabit({
      name: 'Read',
      icon: '📖',
      categoryId: 'learning',
      frequency: { kind: 'daily' },
      target: { kind: 'quantity', amount: 20, unit: 'min', step: 5 },
      startDate: '2020-01-01',
    });

    await renderApp();

    const add = await screen.findByRole('button', { name: /add 5 min to read/i });
    await user.click(add);
    await user.click(add);

    await waitFor(() => {
      const entry = Object.values(useAppStore.getState().data.entries).find(
        (candidate) => candidate.habitId === habit.id,
      );
      expect(entry?.amount).toBe(10);
    });
  });
});

describe('navigation', () => {
  beforeEach(() => {
    useAppStore.getState().loadDemoData();
  });

  it('renders every main screen', async () => {
    const user = userEvent.setup();
    await renderApp();

    const nav = await screen.findAllByRole('navigation', { name: 'Main' });
    const links = within(nav[0] as HTMLElement);

    await user.click(links.getByRole('link', { name: /habits/i }));
    expect(await screen.findByRole('heading', { name: 'Habits' })).toBeInTheDocument();

    await user.click(links.getByRole('link', { name: /calendar/i }));
    expect(await screen.findByRole('heading', { name: 'Calendar' })).toBeInTheDocument();

    await user.click(links.getByRole('link', { name: /goals/i }));
    expect(await screen.findByRole('heading', { name: 'Goals' })).toBeInTheDocument();

    await user.click(links.getByRole('link', { name: /insights/i }));
    expect(await screen.findByRole('heading', { name: 'Insights' })).toBeInTheDocument();
  });

  it('shows weekly and monthly goals with progress', async () => {
    await renderApp('/goals');
    expect(await screen.findByText('Weekly goals')).toBeInTheDocument();
    expect(screen.getByText('Monthly goals')).toBeInTheDocument();
    expect(screen.getAllByRole('progressbar').length).toBeGreaterThan(0);
  });

  it('lets the user open a day on the calendar', async () => {
    const user = userEvent.setup();
    await renderApp('/calendar');

    const grid = await screen.findByRole('heading', { name: 'Calendar' });
    expect(grid).toBeInTheDocument();

    const days = screen.getAllByRole('button', { name: /habits,|nothing scheduled/i });
    expect(days.length).toBeGreaterThan(0);
    await user.click(days[0] as HTMLElement);
    expect(days[0]).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('settings', () => {
  it('changes the week start and persists it', async () => {
    const user = userEvent.setup();
    await renderApp('/settings');

    await user.click(await screen.findByRole('radio', { name: 'Sunday' }));
    expect(useAppStore.getState().data.settings.weekStart).toBe(0);
  });

  it('deletes everything after confirmation', async () => {
    const user = userEvent.setup();
    useAppStore.getState().loadDemoData();
    await renderApp('/settings');

    await user.click(await screen.findByRole('button', { name: /delete everything/i }));
    const dialog = await screen.findByRole('dialog', { name: /delete all data/i });
    await user.click(within(dialog).getByRole('button', { name: /delete everything/i }));

    await waitFor(() => {
      expect(useAppStore.getState().data.habits).toHaveLength(0);
    });
  });
});
