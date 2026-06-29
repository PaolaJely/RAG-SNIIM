import { dashboardParams, fetchJson } from "./api";
import type { DataSource } from "../stores/filterStore";
import type { KpiData } from "../types/kpi";

export function getKpis(
  destinos?: string[],
  source: DataSource = "sniim",
): Promise<KpiData> {
  return fetchJson<KpiData>(
    "/api/kpis",
    dashboardParams(destinos, source),
  );
}
