import { create } from 'zustand';
import { todayKey } from '@/domain/dates';
import { entryKey } from '@/domain/entries';
import type {
  AppData,
  Category,
  DateKey,
  Goal,
  Habit,
  Settings,
} from '@/domain/types';
import { buildDemoData } from '@/persistence/demo';
import { emptyData } from '@/persistence/schema';
import { createStorageAdapter, deserialise, serialise } from '@/persistence/storage';
import type { StorageAdapter } from '@/persistence/storage';
import { createId } from '@/lib/id';

export type HabitDraft = Omit<Habit, 'id' | 'createdAt' | 'order' | 'archived' | 'archivedAt'>;
export type GoalDraft = Omit<Goal, 'id' | 'createdAt'>;

export interface AppState {
  data: AppData;
  status: 'loading' | 'ready';
  /** Transient signal consumed by the toast layer. */
  notice: { id: string; message: string; tone: 'default' | 'gold' } | null;

  hydrate: () => Promise<void>;
  setStorage: (adapter: StorageAdapter) => void;

  addHabit: (draft: HabitDraft) => Habit;
  updateHabit: (id: string, patch: Partial<HabitDraft>) => void;
  deleteHabit: (id: string) => void;
  setHabitArchived: (id: string, archived: boolean) => void;
  reorderHabits: (orderedIds: string[]) => void;

  setEntryAmount: (habitId: string, date: DateKey, amount: number) => void;
  toggleHabit: (habitId: string, date: DateKey) => void;

  addGoal: (draft: GoalDraft) => Goal;
  updateGoal: (id: string, patch: Partial<GoalDraft>) => void;
  deleteGoal: (id: string) => void;

  addCategory: (name: string) => Category;
  renameCategory: (id: string, name: string) => void;
  deleteCategory: (id: string) => void;

  updateSettings: (patch: Partial<Settings>) => void;

  loadDemoData: () => void;
  resetAll: () => void;
  exportData: () => string;
  importData: (raw: string) => { ok: true } | { ok: false; error: string };

  notify: (message: string, tone?: 'default' | 'gold') => void;
  dismissNotice: () => void;
}

let storage: StorageAdapter = createStorageAdapter();
let saveTimer: ReturnType<typeof setTimeout> | null = null;

/** Writes are debounced: rapid tapping should not thrash localStorage. */
function persist(data: AppData): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    void storage.save(data);
    saveTimer = null;
  }, 120);
}

export function flushPersistence(data: AppData): Promise<void> {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  return storage.save(data);
}

export const useAppStore = create<AppState>()((set, get) => {
  const commit = (next: AppData): void => {
    persist(next);
    set({ data: next });
  };

  const mutate = (recipe: (data: AppData) => AppData): void => {
    commit(recipe(get().data));
  };

  return {
    data: emptyData(),
    status: 'loading',
    notice: null,

    setStorage: (adapter) => {
      storage = adapter;
    },

    hydrate: async () => {
      const loaded = await storage.load();
      set({ data: loaded ?? emptyData(), status: 'ready' });
    },

    addHabit: (draft) => {
      const habit: Habit = {
        ...draft,
        id: createId('habit'),
        archived: false,
        order: get().data.habits.length,
        createdAt: new Date().toISOString(),
      };
      mutate((data) => ({ ...data, habits: [...data.habits, habit] }));
      return habit;
    },

    updateHabit: (id, patch) => {
      mutate((data) => ({
        ...data,
        habits: data.habits.map((habit) => (habit.id === id ? { ...habit, ...patch } : habit)),
      }));
    },

    deleteHabit: (id) => {
      mutate((data) => {
        const entries = Object.fromEntries(
          Object.entries(data.entries).filter(([, entry]) => entry.habitId !== id),
        );
        return {
          ...data,
          habits: data.habits
            .filter((habit) => habit.id !== id)
            .map((habit, index) => ({ ...habit, order: index })),
          entries,
          goals: data.goals.filter(
            (goal) => !('habitId' in goal.metric) || goal.metric.habitId !== id,
          ),
        };
      });
    },

    setHabitArchived: (id, archived) => {
      mutate((data) => ({
        ...data,
        habits: data.habits.map((habit) =>
          habit.id === id
            ? { ...habit, archived, archivedAt: archived ? todayKey() : undefined }
            : habit,
        ),
      }));
    },

    reorderHabits: (orderedIds) => {
      mutate((data) => {
        const position = new Map(orderedIds.map((id, index) => [id, index]));
        return {
          ...data,
          habits: [...data.habits]
            .sort(
              (a, b) =>
                (position.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
                (position.get(b.id) ?? Number.MAX_SAFE_INTEGER),
            )
            .map((habit, index) => ({ ...habit, order: index })),
        };
      });
    },

    setEntryAmount: (habitId, date, amount) => {
      mutate((data) => {
        const key = entryKey(habitId, date);
        const entries = { ...data.entries };
        if (amount <= 0) delete entries[key];
        else
          entries[key] = {
            habitId,
            date,
            amount: Math.round(amount * 100) / 100,
            updatedAt: new Date().toISOString(),
          };
        return { ...data, entries };
      });
    },

    toggleHabit: (habitId, date) => {
      const { data } = get();
      const habit = data.habits.find((candidate) => candidate.id === habitId);
      if (!habit) return;
      const current = data.entries[entryKey(habitId, date)]?.amount ?? 0;
      const next = current >= habit.target.amount ? 0 : habit.target.amount;
      get().setEntryAmount(habitId, date, next);
    },

    addGoal: (draft) => {
      const goal: Goal = { ...draft, id: createId('goal'), createdAt: new Date().toISOString() };
      mutate((data) => ({ ...data, goals: [...data.goals, goal] }));
      return goal;
    },

    updateGoal: (id, patch) => {
      mutate((data) => ({
        ...data,
        goals: data.goals.map((goal) => (goal.id === id ? { ...goal, ...patch } : goal)),
      }));
    },

    deleteGoal: (id) => {
      mutate((data) => ({ ...data, goals: data.goals.filter((goal) => goal.id !== id) }));
    },

    addCategory: (name) => {
      const category: Category = { id: createId('cat'), name: name.trim() };
      mutate((data) => ({ ...data, categories: [...data.categories, category] }));
      return category;
    },

    renameCategory: (id, name) => {
      // A category with no name is unusable in every picker it appears in, so
      // an empty edit is simply not committed.
      const trimmed = name.trim();
      if (!trimmed) return;
      mutate((data) => ({
        ...data,
        categories: data.categories.map((category) =>
          category.id === id ? { ...category, name: trimmed } : category,
        ),
      }));
    },

    deleteCategory: (id) => {
      mutate((data) => ({
        ...data,
        categories: data.categories.filter((category) => category.id !== id),
        habits: data.habits.map((habit) =>
          habit.categoryId === id ? { ...habit, categoryId: 'other' } : habit,
        ),
      }));
    },

    updateSettings: (patch) => {
      mutate((data) => ({ ...data, settings: { ...data.settings, ...patch } }));
    },

    loadDemoData: () => {
      const demo = buildDemoData();
      commit({ ...demo, settings: get().data.settings });
      get().notify('Demo data loaded', 'gold');
    },

    resetAll: () => {
      commit({ ...emptyData(), settings: get().data.settings });
      get().notify('All data deleted');
    },

    exportData: () => serialise(get().data),

    importData: (raw) => {
      try {
        const data = deserialise(raw);
        commit(data);
        get().notify('Data imported', 'gold');
        return { ok: true };
      } catch {
        return { ok: false, error: 'That file could not be read as Cadence data.' };
      }
    },

    notify: (message, tone = 'default') => {
      set({ notice: { id: createId(), message, tone } });
    },

    dismissNotice: () => set({ notice: null }),
  };
});
