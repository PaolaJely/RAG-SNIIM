import { useCallback } from "react";
import { useFetch } from "../../../lib/useFetch";
import { getPriceHeatmap } from "../../../services/priceService";
import { useFilterStore } from "../../../stores/filterStore";
import type { HeatmapData } from "../../../types/prices";

export function usePriceHeatmap(): ReturnType<typeof useFetch<HeatmapData>> {
  const { destino } = useFilterStore();
  const queryFn = useCallback(() => getPriceHeatmap(destino || undefined), [destino]);
  return useFetch<HeatmapData>(queryFn, [destino], `price-heatmap:${destino}`);
}
