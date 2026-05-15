/**
 * Generic data-fetching hook with loading / error state + cache.
 *
 * - Pass `cacheKey` to enable 5-minute in-memory caching and
 *   in-flight deduplication (multiple components requesting the
 *   same key share one network request).
 * - Mirrors TanStack Query's mental model so the migration is
 *   a 1-to-1 swap: replace useFetch(fn, deps, key) with
 *   useQuery({ queryKey: [key, ...deps], queryFn: fn }).
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { fetchWithCache, getCached } from "./fetchCache";

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useFetch<T>(
  queryFn: () => Promise<T>,
  deps: unknown[],
  cacheKey?: string,
): FetchState<T> {
  const cachedInitial = cacheKey ? getCached<T>(cacheKey) : null;

  const [data, setData] = useState<T | null>(cachedInitial);
  const [loading, setLoading] = useState(cachedInitial === null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    // Reset stale data from a previous key so components never display
    // data that belongs to a different filter value. If the new key is
    // already cached, fetchWithCache will resolve immediately and data
    // will be repopulated before the next paint.
    setData(null);
    setLoading(true);
    setError(null);

    const fetch = cacheKey
      ? fetchWithCache<T>(cacheKey, queryFn)
      : queryFn();

    fetch
      .then((result) => {
        if (!cancelled && mounted.current) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled && mounted.current) {
          setError(err instanceof Error ? err.message : "Error desconocido");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  return { data, loading, error, refetch };
}
