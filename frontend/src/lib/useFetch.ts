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

function buildDepsKey(deps: unknown[]): string {
  return deps.map((d) => JSON.stringify(d)).join("\0");
}

function readCachedState<T>(cacheKey?: string): Pick<FetchState<T>, "data" | "loading" | "error"> {
  const cached = cacheKey ? getCached<T>(cacheKey) : null;
  return {
    data: cached,
    loading: cached === null,
    error: null,
  };
}

export function useFetch<T>(
  queryFn: () => Promise<T>,
  deps: unknown[],
  cacheKey?: string,
): FetchState<T> {
  const depsKey = buildDepsKey(deps);
  const [tick, setTick] = useState(0);
  const requestKey = `${cacheKey ?? ""}|${depsKey}`;

  const [prevRequestKey, setPrevRequestKey] = useState(requestKey);
  const [prevTick, setPrevTick] = useState(tick);
  const [state, setState] = useState(() => readCachedState<T>(cacheKey));

  if (requestKey !== prevRequestKey) {
    setPrevRequestKey(requestKey);
    setState(readCachedState<T>(cacheKey));
  } else if (tick !== prevTick) {
    setPrevTick(tick);
    setState({ data: null, loading: true, error: null });
  }

  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!state.loading) return;

    let cancelled = false;

    const run = cacheKey
      ? fetchWithCache<T>(cacheKey, queryFn)
      : queryFn();

    run
      .then((result) => {
        if (!cancelled && mounted.current) {
          setState({ data: result, loading: false, error: null });
        }
      })
      .catch((err: unknown) => {
        if (!cancelled && mounted.current) {
          setState({
            data: null,
            loading: false,
            error: err instanceof Error ? err.message : "Error desconocido",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [requestKey, tick, state.loading, cacheKey, queryFn]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  return { ...state, refetch };
}
