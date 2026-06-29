import { useCallback } from "react";
import { useFetch } from "../../../lib/useFetch";
import { getMarkets } from "../../../services/marketService";
import { useFilterStore } from "../../../stores/filterStore";
import type { Market } from "../../../types/market";

export function useMarkets(): ReturnType<typeof useFetch<Market[]>> {
  const { destinos, source } = useFilterStore();
  const selectionKey = `${source}:${destinos.join("|")}`;
  const queryFn = useCallback(
    () => getMarkets(destinos, source),
    [destinos, source],
  );
  return useFetch<Market[]>(queryFn, [selectionKey], `markets:${selectionKey}`);
}
