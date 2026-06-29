import { useCallback } from "react";
import { useFetch } from "../../../lib/useFetch";
import { getMonthlyPrices } from "../../../services/priceService";
import { useFilterStore } from "../../../stores/filterStore";
import type { MonthlyPrice } from "../../../types/prices";

export function usePriceTrend(): ReturnType<typeof useFetch<MonthlyPrice[]>> {
  const { destinos, source } = useFilterStore();
  const selectionKey = `${source}:${destinos.join("|")}`;
  const queryFn = useCallback(
    () => getMonthlyPrices(destinos, source),
    [destinos, source],
  );
  return useFetch<MonthlyPrice[]>(
    queryFn,
    [selectionKey],
    `price-trend:${selectionKey}`,
  );
}
