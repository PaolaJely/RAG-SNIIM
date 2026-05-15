import { useCallback } from "react";
import { useFetch } from "../../../lib/useFetch";
import { getMarkets } from "../../../services/marketService";
import { useFilterStore } from "../../../stores/filterStore";
import type { Market } from "../../../types/market";

export function useMarkets(): ReturnType<typeof useFetch<Market[]>> {
  const { destino } = useFilterStore();
  const queryFn = useCallback(() => getMarkets(destino || undefined), [destino]);
  return useFetch<Market[]>(queryFn, [destino], `markets:${destino}`);
}
