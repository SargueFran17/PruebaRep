import { beforeEach, describe, expect, it } from 'vitest';
import { emptyData } from '@/persistence/schema';
import { MemoryStorageAdapter } from '@/persistence/storage';
import { useAppStore } from './useAppStore';
import type { HabitDraft } from './useAppStore';

const draft: HabitDraft = {
  name: 'Read',
  icon: '📖',
  categoryId: 'learning',
  frequency: { kind: 'daily' },
  target: { kind: 'quantity', amount: 20, unit: 'min', step: 5 },
  startDate: '2025-09-01',
};

beforeEach(() => {
  useAppStore.getState().setStorage(new MemoryStorageAdapter());
  useAppStore.setState({ data: emptyData(), status: 'ready', notice: null });
});

describe('habit lifecycle', () => {
  it('creates, updates and deletes a habit', () => {
    const store = useAppStore.getState();
    const habit = store.addHabit(draft);
    expect(useAppStore.getState().data.habits).toHaveLength(1);

    useAppStore.getState().updateHabit(habit.id, { name: 'Read more' });
    expect(useAppStore.getState().data.habits[0]?.name).toBe('Read more');

    useAppStore.getState().deleteHabit(habit.id);
    expect(useAppStore.getState().data.habits).toHaveLength(0);
  });

  it('removes a habit’s entries and goals when it is deleted', () => {
    const store = useAppStore.getState();
    const habit = store.addHabit(draft);
    useAppStore.getState().setEntryAmount(habit.id, '2025-09-01', 20);
    useAppStore.getState().addGoal({
      title: 'Read five days',
      period: 'week',
      metric: { kind: 'habitDays', habitId: habit.id },
      target: 5,
    });
    useAppStore.getState().addGoal({
      title: 'Perfect days',
      period: 'month',
      metric: { kind: 'perfectDays' },
      target: 10,
    });

    useAppStore.getState().deleteHabit(habit.id);
    const data = useAppStore.getState().data;
    expect(Object.keys(data.entries)).toHaveLength(0);
    expect(data.goals).toHaveLength(1);
    expect(data.goals[0]?.metric.kind).toBe('perfectDays');
  });

  it('stamps an archive date so history stops there', () => {
    const habit = useAppStore.getState().addHabit(draft);
    useAppStore.getState().setHabitArchived(habit.id, true);
    const archived = useAppStore.getState().data.habits[0];
    expect(archived?.archived).toBe(true);
    expect(archived?.archivedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    useAppStore.getState().setHabitArchived(habit.id, false);
    expect(useAppStore.getState().data.habits[0]?.archivedAt).toBeUndefined();
  });

  it('reorders habits and renumbers them contiguously', () => {
    const a = useAppStore.getState().addHabit({ ...draft, name: 'A' });
    const b = useAppStore.getState().addHabit({ ...draft, name: 'B' });
    const c = useAppStore.getState().addHabit({ ...draft, name: 'C' });

    useAppStore.getState().reorderHabits([c.id, a.id, b.id]);
    expect(useAppStore.getState().data.habits.map((habit) => habit.name)).toEqual([
      'C',
      'A',
      'B',
    ]);
    expect(useAppStore.getState().data.habits.map((habit) => habit.order)).toEqual([0, 1, 2]);
  });
});

describe('entries', () => {
  it('toggles a habit to its full target and back to nothing', () => {
    const habit = useAppStore.getState().addHabit(draft);
    useAppStore.getState().toggleHabit(habit.id, '2025-09-01');
    expect(useAppStore.getState().data.entries[`${habit.id}|2025-09-01`]?.amount).toBe(20);

    useAppStore.getState().toggleHabit(habit.id, '2025-09-01');
    expect(useAppStore.getState().data.entries[`${habit.id}|2025-09-01`]).toBeUndefined();
  });

  it('deletes the record rather than storing a zero', () => {
    const habit = useAppStore.getState().addHabit(draft);
    useAppStore.getState().setEntryAmount(habit.id, '2025-09-01', 10);
    useAppStore.getState().setEntryAmount(habit.id, '2025-09-01', 0);
    expect(Object.keys(useAppStore.getState().data.entries)).toHaveLength(0);
  });

  it('increments without dropping below zero', () => {
    const habit = useAppStore.getState().addHabit(draft);
    useAppStore.getState().incrementHabit(habit.id, '2025-09-01', 5);
    useAppStore.getState().incrementHabit(habit.id, '2025-09-01', 5);
    expect(useAppStore.getState().data.entries[`${habit.id}|2025-09-01`]?.amount).toBe(10);

    useAppStore.getState().incrementHabit(habit.id, '2025-09-01', -50);
    expect(useAppStore.getState().data.entries[`${habit.id}|2025-09-01`]).toBeUndefined();
  });

  it('keeps fractional amounts usable', () => {
    const water = useAppStore.getState().addHabit({
      ...draft,
      name: 'Water',
      target: { kind: 'quantity', amount: 2, unit: 'L', step: 0.5 },
    });
    useAppStore.getState().incrementHabit(water.id, '2025-09-01', 0.5);
    useAppStore.getState().incrementHabit(water.id, '2025-09-01', 0.5);
    expect(useAppStore.getState().data.entries[`${water.id}|2025-09-01`]?.amount).toBe(1);
  });
});

describe('categories', () => {
  it('moves habits to Other when their category is deleted', () => {
    const category = useAppStore.getState().addCategory('Morning');
    const habit = useAppStore.getState().addHabit({ ...draft, categoryId: category.id });
    useAppStore.getState().deleteCategory(category.id);

    expect(useAppStore.getState().data.habits.find((h) => h.id === habit.id)?.categoryId).toBe(
      'other',
    );
    expect(
      useAppStore.getState().data.categories.some((c) => c.id === category.id),
    ).toBe(false);
  });
});

describe('import and export', () => {
  it('round-trips through the export format', () => {
    const habit = useAppStore.getState().addHabit(draft);
    useAppStore.getState().setEntryAmount(habit.id, '2025-09-01', 20);
    const exported = useAppStore.getState().exportData();

    useAppStore.getState().resetAll();
    expect(useAppStore.getState().data.habits).toHaveLength(0);

    const result = useAppStore.getState().importData(exported);
    expect(result.ok).toBe(true);
    expect(useAppStore.getState().data.habits[0]?.name).toBe('Read');
    expect(Object.keys(useAppStore.getState().data.entries)).toHaveLength(1);
  });

  it('rejects a file that is not JSON without losing current data', () => {
    useAppStore.getState().addHabit(draft);
    const result = useAppStore.getState().importData('<html>nope</html>');
    expect(result.ok).toBe(false);
    expect(useAppStore.getState().data.habits).toHaveLength(1);
  });

  it('keeps settings when data is reset', () => {
    useAppStore.getState().updateSettings({ weekStart: 0, theme: 'dark' });
    useAppStore.getState().addHabit(draft);
    useAppStore.getState().resetAll();
    expect(useAppStore.getState().data.settings.weekStart).toBe(0);
    expect(useAppStore.getState().data.settings.theme).toBe('dark');
  });
});

describe('demo data', () => {
  it('loads a history rich enough to exercise every screen', () => {
    useAppStore.getState().loadDemoData();
    const data = useAppStore.getState().data;
    expect(data.habits.length).toBeGreaterThanOrEqual(5);
    expect(Object.keys(data.entries).length).toBeGreaterThan(100);
    expect(data.goals.some((goal) => goal.period === 'week')).toBe(true);
    expect(data.goals.some((goal) => goal.period === 'month')).toBe(true);
  });
});

describe('persistence', () => {
  it('reloads what was saved', async () => {
    const adapter = new MemoryStorageAdapter();
    useAppStore.getState().setStorage(adapter);
    const habit = useAppStore.getState().addHabit(draft);
    useAppStore.getState().setEntryAmount(habit.id, '2025-09-01', 20);

    // The store debounces writes; wait past the window.
    await new Promise((resolve) => setTimeout(resolve, 200));

    useAppStore.setState({ data: emptyData() });
    await useAppStore.getState().hydrate();

    expect(useAppStore.getState().data.habits[0]?.name).toBe('Read');
    expect(useAppStore.getState().data.entries[`${habit.id}|2025-09-01`]?.amount).toBe(20);
  });
});
