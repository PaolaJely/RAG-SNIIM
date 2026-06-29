import { dashboardParams, fetchJson } from "./api";
import type { DataSource } from "../stores/filterStore";
import type { Market, MarketMinimal } from "../types/market";

export function getMarkets(
  destinos?: string[],
  source: DataSource = "sniim",
): Promise<Market[]> {
  return fetchJson<Market[]>(
    "/api/mercados",
    dashboardParams(destinos, source),
  );
}

export function getMarketsMinimal(
  destinos?: string[],
  source: DataSource = "sniim",
): Promise<MarketMinimal[]> {
  return fetchJson<MarketMinimal[]>(
    "/api/mercados",
    dashboardParams(destinos, source),
  );
}
