import type { AppData, Category, Settings } from '@/domain/types';

export const SCHEMA_VERSION = 1;
export const STORAGE_KEY = 'cadence:v1';

export interface PersistedEnvelope {
  version: number;
  updatedAt: string;
  data: AppData;
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'health', name: 'Health', system: true },
  { id: 'fitness', name: 'Fitness', system: true },
  { id: 'mind', name: 'Mind', system: true },
  { id: 'learning', name: 'Learning', system: true },
  { id: 'productivity', name: 'Productivity', system: true },
  { id: 'personal', name: 'Personal', system: true },
  { id: 'other', name: 'Other', system: true },
];

export const DEFAULT_SETTINGS: Settings = {
  weekStart: 1,
  theme: 'system',
  confirmDestructive: true,
  reduceMotion: false,
};

export function emptyData(): AppData {
  return {
    habits: [],
    entries: {},
    categories: DEFAULT_CATEGORIES.map((category) => ({ ...category })),
    goals: [],
    settings: { ...DEFAULT_SETTINGS },
  };
}
