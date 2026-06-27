import { useCallback } from "react";
import { useFetch } from "../../../lib/useFetch";
import { getKpis } from "../../../services/kpiService";
import { useFilterStore } from "../../../stores/filterStore";
import type { KpiData } from "../../../types/kpi";

export function useKpis(): ReturnType<typeof useFetch<KpiData>> {
  const { destinos } = useFilterStore();
  const selectionKey = destinos.join("|");
  const queryFn = useCallback(() => getKpis(destinos), [destinos]);
  return useFetch<KpiData>(queryFn, [selectionKey], `kpis:${selectionKey}`);
}
