import { dashboardParams, fetchJson } from "./api";
import type { DataSource } from "../stores/filterStore";
import type {
  CandlestickPrice,
  HeatmapData,
  PriceGranularity,
} from "../types/prices";

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
