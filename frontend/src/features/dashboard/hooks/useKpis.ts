import { useCallback } from "react";
import { useFetch } from "../../../lib/useFetch";
import { getKpis } from "../../../services/kpiService";
import { useFilterStore } from "../../../stores/filterStore";
import type { KpiData } from "../../../types/kpi";

export function useKpis(): ReturnType<typeof useFetch<KpiData>> {
  const { destino } = useFilterStore();
  // Stable queryFn: recreated only when destino changes, not on every render.
  const queryFn = useCallback(() => getKpis(destino || undefined), [destino]);
  return useFetch<KpiData>(queryFn, [destino], `kpis:${destino}`);
}
