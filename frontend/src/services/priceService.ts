import { fetchJson } from "./api";
import type {
  CandlestickPrice,
  HeatmapData,
  MonthlyPrice,
  PriceGranularity,
} from "../types/prices";

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

type OhlcApiRow = Omit<
  CandlestickPrice,
  "range" | "changePct" | "movingAverageShort" | "movingAverageLong"
>;

export function getOhlcPrices(
  granularity: PriceGranularity,
  destino?: string,
): Promise<OhlcApiRow[]> {
  return fetchJson<OhlcApiRow[]>("/api/precios/ohlc", {
    granularidad: granularity,
    ...(destino ? { destino } : {}),
  });
}
