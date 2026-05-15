import { DollarSign, ArrowUp, ArrowDown, Store } from "lucide-react";
import { motion } from "motion/react";
import { KpiCard, KpiCardSkeleton } from "./KpiCard";
import { DashboardHeader } from "./DashboardHeader";
import { PriceTrendChart } from "../../charts/components/PriceTrendChart";
import { PriceHeatmap } from "../../charts/components/PriceHeatmap";
import { TopMarketsRanking } from "../../charts/components/TopMarketsRanking";
import { useKpis } from "../hooks/useKpis";
import { formatPrice, formatPct } from "../../../lib/format";

export function Dashboard() {
  const { data: kpis, loading, error } = useKpis();

  return (
    <div className="p-5 lg:p-7 xl:p-8 space-y-6 max-w-[1600px] mx-auto">
      <DashboardHeader />

      {/* KPI grid */}
      <section aria-label="Indicadores clave de precio">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          {loading || !kpis ? (
            error ? (
              <div className="col-span-4 text-center py-6 text-sm text-muted-foreground">
                Sin datos para este destino
              </div>
            ) : (
              Array.from({ length: 4 }).map((_, i) => <KpiCardSkeleton key={i} />)
            )
          ) : (
            <>
              <KpiCard
                label="Precio promedio"
                value={formatPrice(kpis.precio_promedio)}
                unit="MXN/kg"
                trend={kpis.cambio_pct !== null ? (kpis.cambio_pct >= 0 ? "up" : "down") : null}
                trendLabel={kpis.cambio_pct !== null ? `${formatPct(kpis.cambio_pct)} vs mes ant.` : undefined}
                icon={<DollarSign className="w-3.5 h-3.5 text-brand" />}
                iconBg="bg-brand-muted"
                delay={0}
              />
              <KpiCard
                label="Precio máximo"
                value={formatPrice(kpis.precio_max)}
                unit="MXN/kg"
                sublabel={`${kpis.precio_max_mercado} · ${kpis.precio_max_fecha}`}
                icon={<ArrowUp className="w-3.5 h-3.5 text-brand-danger" />}
                iconBg="bg-brand-danger-muted"
                delay={0.05}
              />
              <KpiCard
                label="Precio mínimo"
                value={formatPrice(kpis.precio_min)}
                unit="MXN/kg"
                sublabel={`${kpis.precio_min_mercado} · ${kpis.precio_min_fecha}`}
                icon={<ArrowDown className="w-3.5 h-3.5 text-brand-success" />}
                iconBg="bg-brand-success-muted"
                delay={0.1}
              />
              <KpiCard
                label="Ciudades destino"
                value={String(kpis.total_mercados)}
                sublabel="mercados monitoreados"
                icon={<Store className="w-3.5 h-3.5 text-brand-warning" />}
                iconBg="bg-brand-warning-muted"
                delay={0.15}
              />
            </>
          )}
        </div>
      </section>

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.18 }}
        aria-label="Evolución de precios"
      >
        <PriceTrendChart />
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.24 }}
        className="grid grid-cols-1 xl:grid-cols-2 gap-4"
        aria-label="Análisis por mercado"
      >
        <PriceHeatmap />
        <TopMarketsRanking />
      </motion.section>
    </div>
  );
}
