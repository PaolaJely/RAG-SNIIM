import { dashboardParams, fetchJson } from "./api";
import type { DataSource } from "../stores/filterStore";
import type {
  CandlestickPrice,
  HeatmapData,
  MonthlyPrice,
  PriceGranularity,
} from "../types/prices";

export function getMonthlyPrices(
  destinos?: string[],
  source: DataSource = "sniim",
): Promise<MonthlyPrice[]> {
  return fetchJson<MonthlyPrice[]>(
    "/api/precios/mensual",
    dashboardParams(destinos, source),
  );
}

export function getPriceHeatmap(
  destinos?: string[],
  source: DataSource = "sniim",
): Promise<HeatmapData> {
  return fetchJson<HeatmapData>(
    "/api/precios/heatmap",
    dashboardParams(destinos, source),
  );
}

type OhlcApiRow = Omit<
  CandlestickPrice,
  "range" | "changePct" | "movingAverageShort" | "movingAverageLong"
>;

export function getOhlcPrices(
  granularity: PriceGranularity,
  destinos?: string[],
  source: DataSource = "sniim",
): Promise<OhlcApiRow[]> {
  return fetchJson<OhlcApiRow[]>("/api/precios/ohlc", {
    granularidad: granularity,
    ...dashboardParams(destinos, source),
  });
}
