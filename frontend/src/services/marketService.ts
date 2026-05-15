import { fetchJson } from "./api";
import type { Market, MarketMinimal } from "../types/market";

export function getMarkets(destino?: string): Promise<Market[]> {
  return fetchJson<Market[]>(
    "/api/mercados",
    destino ? { destino } : undefined,
  );
}

export function getMarketsMinimal(destino?: string): Promise<MarketMinimal[]> {
  return fetchJson<MarketMinimal[]>(
    "/api/mercados",
    destino ? { destino } : undefined,
  );
}
