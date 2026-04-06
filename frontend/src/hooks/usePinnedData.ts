import { useCallback, useMemo, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'airaie:pinned-data';

type PinnedDataMap = Record<string, Record<string, unknown>>;

/**
 * Read pinned data from localStorage.
 * Returns an empty object if nothing stored.
 */
function readStore(): PinnedDataMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as PinnedDataMap;
  } catch {
    return {};
  }
}

function writeStore(data: PinnedDataMap): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  // Dispatch a storage event on the same window so subscribers re-render
  window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
}

/**
 * Subscribe to storage changes for our key.
 * Works across tabs AND same-tab (via custom dispatch above).
 */
function subscribe(callback: () => void): () => void {
  const handler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null) {
      callback();
    }
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}

function getSnapshot(): PinnedDataMap {
  return readStore();
}

/**
 * Data pinning hook (n8n pattern).
 * Pin execution output as test data for any node.
 * Persisted in localStorage across sessions.
 */
export function usePinnedData() {
  const store = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const pin = useCallback((nodeId: string, data: Record<string, unknown>) => {
    const current = readStore();
    writeStore({ ...current, [nodeId]: data });
  }, []);

  const unpin = useCallback((nodeId: string) => {
    const current = readStore();
    const next = { ...current };
    delete next[nodeId];
    writeStore(next);
  }, []);

  const getPinnedData = useCallback(
    (nodeId: string): Record<string, unknown> | undefined => {
      return store[nodeId];
    },
    [store],
  );

  const isPinned = useCallback(
    (nodeId: string): boolean => {
      return nodeId in store;
    },
    [store],
  );

  const pinnedNodeIds = useMemo(() => Object.keys(store), [store]);

  return { pin, unpin, getPinnedData, isPinned, pinnedNodeIds };
}
