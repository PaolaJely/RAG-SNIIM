import { fetchJson } from "./api";
import type { MonthlyPrice, HeatmapData } from "../types/prices";

export function getMonthlyPrices(destino?: string): Promise<MonthlyPrice[]> {
  return fetchJson<MonthlyPrice[]>(
    "/api/precios/mensual",
    destino ? { destino } : undefined,
  );
}

export function getPriceHeatmap(destino?: string): Promise<HeatmapData> {
  return fetchJson<HeatmapData>(
    "/api/precios/heatmap",
    destino ? { destino } : undefined,
  );
}
