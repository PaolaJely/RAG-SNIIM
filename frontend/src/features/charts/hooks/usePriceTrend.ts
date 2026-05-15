import { useCallback } from "react";
import { useFetch } from "../../../lib/useFetch";
import { getMonthlyPrices } from "../../../services/priceService";
import { useFilterStore } from "../../../stores/filterStore";
import type { MonthlyPrice } from "../../../types/prices";

export function usePriceTrend(): ReturnType<typeof useFetch<MonthlyPrice[]>> {
  const { destino } = useFilterStore();
  const queryFn = useCallback(() => getMonthlyPrices(destino || undefined), [destino]);
  return useFetch<MonthlyPrice[]>(queryFn, [destino], `price-trend:${destino}`);
}
