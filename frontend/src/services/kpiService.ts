import { fetchJson } from "./api";
import type { KpiData } from "../types/kpi";

export function getKpis(destino?: string): Promise<KpiData> {
  return fetchJson<KpiData>(
    "/api/kpis",
    destino ? { destino } : undefined,
  );
}
