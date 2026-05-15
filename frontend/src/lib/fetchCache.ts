/**
 * Lightweight in-memory cache + in-flight request deduplication.
 *
 * Replaces the need for TanStack Query's built-in cache while keeping
 * the migration path clean: when @tanstack/react-query is installed,
 * delete this file and configure QueryClient with staleTime instead.
 *
 * Usage:
 *   const data = await fetchWithCache("markets", () => getMarkets());
 */

type CacheEntry<T> = { data: T; ts: number };

const cache = new Map<string, CacheEntry<unknown>>();
const pending = new Map<string, Promise<unknown>>();

const DEFAULT_STALE_MS = 5 * 60 * 1000; // 5 min

export function getCached<T>(key: string, staleMs = DEFAULT_STALE_MS): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() - entry.ts > staleMs) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

export function setCached(key: string, data: unknown): void {
  cache.set(key, { data, ts: Date.now() });
}

export function invalidateCache(keyPrefix?: string): void {
  if (!keyPrefix) {
    cache.clear();
    return;
  }
  for (const k of cache.keys()) {
    if (k.startsWith(keyPrefix)) cache.delete(k);
  }
}

/**
 * Fetch with cache + in-flight deduplication.
 * If two components request the same key simultaneously, only one
 * network request is made; both receive the same Promise.
 */
export async function fetchWithCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  staleMs = DEFAULT_STALE_MS,
): Promise<T> {
  const hit = getCached<T>(key, staleMs);
  if (hit !== null) return hit;

  const inflight = pending.get(key) as Promise<T> | undefined;
  if (inflight) return inflight;

  const req = fetcher().then((data) => {
    setCached(key, data);
    pending.delete(key);
    return data;
  }).catch((err) => {
    pending.delete(key);
    throw err;
  });

  pending.set(key, req);
  return req;
}
