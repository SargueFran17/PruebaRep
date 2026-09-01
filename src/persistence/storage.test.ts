import { describe, expect, it } from 'vitest';
import { makeHabit } from '@/test/factories';
import { emptyData } from './schema';
import { deserialise, MemoryStorageAdapter, migrate, serialise } from './storage';
import { parseAppData } from './validate';

describe('serialise / deserialise', () => {
  it('round-trips an app payload', () => {
    const data = emptyData();
    data.habits.push(makeHabit({ id: 'h1', name: 'Read' }));
    data.entries['h1|2025-09-01'] = {
      habitId: 'h1',
      date: '2025-09-01',
      amount: 1,
      updatedAt: '2025-09-01T10:00:00.000Z',
    };

    const restored = deserialise(serialise(data));
    expect(restored.habits).toHaveLength(1);
    expect(restored.habits[0]?.name).toBe('Read');
    expect(restored.entries['h1|2025-09-01']?.amount).toBe(1);
  });
});

describe('migrate', () => {
  it('reads a version-0 payload stored without an envelope', () => {
    const legacy = { habits: [makeHabit({ id: 'h1', name: 'Legacy' })], entries: {} };
    const data = migrate(legacy as never);
    expect(data.habits[0]?.name).toBe('Legacy');
    expect(data.settings.weekStart).toBe(1);
  });

  it('falls back to an empty document for null input', () => {
    expect(migrate(null).habits).toEqual([]);
  });
});

describe('parseAppData', () => {
  it('drops habits with no id or name', () => {
    const data = parseAppData({
      habits: [{ id: '', name: 'x' }, { id: 'h1', name: '' }, { id: 'h2', name: 'Keep' }],
    });
    expect(data.habits).toHaveLength(1);
    expect(data.habits[0]?.id).toBe('h2');
  });

  it('drops entries pointing at habits that do not exist', () => {
    const data = parseAppData({
      habits: [{ id: 'h1', name: 'Read', startDate: '2025-09-01' }],
      entries: {
        a: { habitId: 'h1', date: '2025-09-01', amount: 1 },
        b: { habitId: 'ghost', date: '2025-09-01', amount: 1 },
      },
    });
    expect(Object.keys(data.entries)).toEqual(['h1|2025-09-01']);
  });

  it('drops entries with an invalid date or non-positive amount', () => {
    const data = parseAppData({
      habits: [{ id: 'h1', name: 'Read' }],
      entries: {
        a: { habitId: 'h1', date: '2025-13-40', amount: 1 },
        b: { habitId: 'h1', date: '2025-09-01', amount: 0 },
        c: { habitId: 'h1', date: '2025-09-02', amount: 3 },
      },
    });
    expect(Object.keys(data.entries)).toEqual(['h1|2025-09-02']);
  });

  it('repairs a malformed frequency instead of throwing', () => {
    const data = parseAppData({
      habits: [{ id: 'h1', name: 'Read', frequency: { kind: 'nonsense' } }],
    });
    expect(data.habits[0]?.frequency).toEqual({ kind: 'daily' });
  });

  it('clamps an out-of-range weekly quota', () => {
    const data = parseAppData({
      habits: [
        { id: 'h1', name: 'Gym', frequency: { kind: 'timesPerWeek', times: 99 } },
      ],
    });
    expect(data.habits[0]?.frequency).toEqual({ kind: 'timesPerWeek', times: 7 });
  });

  it('drops goals whose habit is gone and keeps the rest', () => {
    const data = parseAppData({
      habits: [{ id: 'h1', name: 'Read' }],
      goals: [
        { id: 'g1', title: 'A', period: 'week', metric: { kind: 'habitDays', habitId: 'h1' }, target: 5 },
        { id: 'g2', title: 'B', period: 'week', metric: { kind: 'habitDays', habitId: 'gone' }, target: 5 },
        { id: 'g3', title: 'C', period: 'month', metric: { kind: 'perfectDays' }, target: 10 },
      ],
    });
    expect(data.goals.map((goal) => goal.id)).toEqual(['g1', 'g3']);
  });

  it('normalises habit ordering', () => {
    const data = parseAppData({
      habits: [
        { id: 'a', name: 'A', order: 5 },
        { id: 'b', name: 'B', order: 2 },
      ],
    });
    expect(data.habits.map((habit) => [habit.id, habit.order])).toEqual([
      ['b', 0],
      ['a', 1],
    ]);
  });

  it('restores default categories and settings when missing', () => {
    const data = parseAppData({ habits: [] });
    expect(data.categories.length).toBeGreaterThan(0);
    expect(data.settings).toEqual({
      weekStart: 1,
      theme: 'system',
      confirmDestructive: true,
      reduceMotion: false,
    });
  });

  it('survives complete garbage', () => {
    expect(parseAppData('nope').habits).toEqual([]);
    expect(parseAppData(null).habits).toEqual([]);
    expect(parseAppData(42).goals).toEqual([]);
  });
});

describe('MemoryStorageAdapter', () => {
  it('stores and clears a snapshot', async () => {
    const adapter = new MemoryStorageAdapter();
    expect(await adapter.load()).toBeNull();

    const data = emptyData();
    data.habits.push(makeHabit({ id: 'h1' }));
    await adapter.save(data);

    const loaded = await adapter.load();
    expect(loaded?.habits).toHaveLength(1);

    // The snapshot is a copy: mutating it must not reach back into storage.
    loaded?.habits.pop();
    expect((await adapter.load())?.habits).toHaveLength(1);

    await adapter.clear();
    expect(await adapter.load()).toBeNull();
  });
});
