import { useCallback } from "react";
import { useFetch } from "../../../lib/useFetch";
import { getPriceHeatmap } from "../../../services/priceService";
import { useFilterStore } from "../../../stores/filterStore";
import type { HeatmapData } from "../../../types/prices";

export function usePriceHeatmap(): ReturnType<typeof useFetch<HeatmapData>> {
  const { destinos } = useFilterStore();
  const selectionKey = destinos.join("|");
  const queryFn = useCallback(() => getPriceHeatmap(destinos), [destinos]);
  return useFetch<HeatmapData>(
    queryFn,
    [selectionKey],
    `price-heatmap:${selectionKey}`,
  );
}
