/**
 * Centralized query key factory.
 * Prevents typos and enables targeted cache invalidation.
 *
 * Usage with TanStack Query (when installed):
 *   useQuery({ queryKey: queryKeys.kpis(destino), queryFn: ... })
 */
export const queryKeys = {
  markets: (destino?: string) => ["markets", destino ?? "all"] as const,
  kpis: (destino?: string) => ["kpis", destino ?? "all"] as const,
  priceTrend: (destino?: string) => ["price-trend", destino ?? "all"] as const,
  priceHeatmap: (destino?: string) => ["price-heatmap", destino ?? "all"] as const,
} as const;
