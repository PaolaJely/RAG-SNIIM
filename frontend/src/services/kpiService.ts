import { destinationParams, fetchJson } from "./api";
import type { KpiData } from "../types/kpi";

export function getKpis(destinos?: string[]): Promise<KpiData> {
  return fetchJson<KpiData>(
    "/api/kpis",
    destinationParams(destinos),
  );
}
