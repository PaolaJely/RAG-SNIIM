import { destinationParams, fetchJson } from "./api";
import type { Market, MarketMinimal } from "../types/market";

export function getMarkets(destinos?: string[]): Promise<Market[]> {
  return fetchJson<Market[]>(
    "/api/mercados",
    destinationParams(destinos),
  );
}

export function getMarketsMinimal(destinos?: string[]): Promise<MarketMinimal[]> {
  return fetchJson<MarketMinimal[]>(
    "/api/mercados",
    destinationParams(destinos),
  );
}
