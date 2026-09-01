import type { AppData } from '@/domain/types';
import { emptyData, SCHEMA_VERSION, STORAGE_KEY } from './schema';
import type { PersistedEnvelope } from './schema';
import { parseAppData } from './validate';

/**
 * The single seam between the app and where data lives.
 *
 * Everything above this interface is storage-agnostic, so swapping localStorage
 * for a REST or SQL backend later means writing one more implementation of
 * `StorageAdapter` — no component or store change.
 */
export interface StorageAdapter {
  load(): Promise<AppData | null>;
  save(data: AppData): Promise<void>;
  clear(): Promise<void>;
}

export class LocalStorageAdapter implements StorageAdapter {
  constructor(
    private readonly key: string = STORAGE_KEY,
    private readonly storage: Storage | null = safeStorage(),
  ) {}

  async load(): Promise<AppData | null> {
    if (!this.storage) return null;
    const raw = this.storage.getItem(this.key);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as Partial<PersistedEnvelope>;
      return migrate(parsed);
    } catch {
      // Corrupted payload: keep a copy for forensics, start clean.
      this.storage.setItem(`${this.key}:corrupt:${Date.now()}`, raw);
      return null;
    }
  }

  async save(data: AppData): Promise<void> {
    if (!this.storage) return;
    const envelope: PersistedEnvelope = {
      version: SCHEMA_VERSION,
      updatedAt: new Date().toISOString(),
      data,
    };
    this.storage.setItem(this.key, JSON.stringify(envelope));
  }

  async clear(): Promise<void> {
    this.storage?.removeItem(this.key);
  }
}

/** In-memory fallback so tests and private-mode browsers still work. */
export class MemoryStorageAdapter implements StorageAdapter {
  private data: AppData | null = null;

  async load(): Promise<AppData | null> {
    return this.data ? structuredClone(this.data) : null;
  }

  async save(data: AppData): Promise<void> {
    this.data = structuredClone(data);
  }

  async clear(): Promise<void> {
    this.data = null;
  }
}

/**
 * Version upgrades happen here. Each step transforms the payload one version
 * forward, so a user returning after several releases is migrated in order.
 */
export function migrate(envelope: Partial<PersistedEnvelope> | null): AppData {
  if (!envelope || typeof envelope !== 'object') return emptyData();
  const version = typeof envelope.version === 'number' ? envelope.version : 0;
  let payload: unknown = envelope.data ?? envelope;

  if (version < 1) {
    // v0 had no envelope: the raw AppData was stored at the top level.
    payload = envelope.data ?? envelope;
  }

  return parseAppData(payload);
}

function safeStorage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    const probe = '__cadence_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}

export function createStorageAdapter(): StorageAdapter {
  return safeStorage() ? new LocalStorageAdapter() : new MemoryStorageAdapter();
}

export function serialise(data: AppData): string {
  const envelope: PersistedEnvelope = {
    version: SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    data,
  };
  return JSON.stringify(envelope, null, 2);
}

export function deserialise(raw: string): AppData {
  return migrate(JSON.parse(raw) as Partial<PersistedEnvelope>);
}
