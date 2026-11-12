import type { MockDb } from "./seed";

export interface MockPersistence {
  load(): MockDb | null;
  save(db: MockDb): void;
}

export const MOCK_STORAGE_KEY = "pkonek.mock.v2";

/** Keeps demo changes (new reports, status changes) across reloads in this browser. */
export function localStoragePersistence(key = MOCK_STORAGE_KEY): MockPersistence {
  return {
    load() {
      try {
        const raw = typeof window === "undefined" ? null : window.localStorage.getItem(key);
        const db = raw ? (JSON.parse(raw) as MockDb) : null;
        return db?.version === 2 ? db : null;
      } catch {
        return null;
      }
    },
    save(db) {
      try {
        window.localStorage.setItem(key, JSON.stringify(db));
      } catch {
        // Storage full or blocked: keep working in memory.
      }
    },
  };
}

export function memoryPersistence(initial: MockDb | null = null): MockPersistence {
  let stored = initial ? structuredClone(initial) : null;
  return {
    load: () => (stored ? structuredClone(stored) : null),
    save: (db) => {
      stored = structuredClone(db);
    },
  };
}

/** Clears saved demo data so the next load starts from the seed. */
export function resetMockData(key = MOCK_STORAGE_KEY) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}
