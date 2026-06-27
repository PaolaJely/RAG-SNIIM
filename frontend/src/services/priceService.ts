import { destinationParams, fetchJson } from "./api";
import type {
  CandlestickPrice,
  HeatmapData,
  MonthlyPrice,
  PriceGranularity,
} from "../types/prices";

export function getMonthlyPrices(destinos?: string[]): Promise<MonthlyPrice[]> {
  return fetchJson<MonthlyPrice[]>(
    "/api/precios/mensual",
    destinationParams(destinos),
  );
}

export function getPriceHeatmap(destinos?: string[]): Promise<HeatmapData> {
  return fetchJson<HeatmapData>(
    "/api/precios/heatmap",
    destinationParams(destinos),
  );
}

type OhlcApiRow = Omit<
  CandlestickPrice,
  "range" | "changePct" | "movingAverageShort" | "movingAverageLong"
>;

export function getOhlcPrices(
  granularity: PriceGranularity,
  destinos?: string[],
): Promise<OhlcApiRow[]> {
  return fetchJson<OhlcApiRow[]>("/api/precios/ohlc", {
    granularidad: granularity,
    ...(destinationParams(destinos) ?? {}),
  });
}
