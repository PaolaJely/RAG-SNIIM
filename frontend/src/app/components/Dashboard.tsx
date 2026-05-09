import { TrendingUp, TrendingDown } from "lucide-react";
import { PriceTrendChart } from "./PriceTrendChart";
import { PriceHeatmap } from "./PriceHeatmap";
import { TopMarketsRanking } from "./TopMarketsRanking";
import { useApi } from "../hooks/useApi";
import { useFilter } from "../context/FilterContext";

interface KpiData {
  precio_promedio: number;
  cambio_pct: number | null;
  precio_max: number;
  precio_max_mercado: string;
  precio_max_fecha: string;
  precio_min: number;
  precio_min_mercado: string;
  precio_min_fecha: string;
  total_mercados: number;
}

function KpiSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border-l-4 border-gray-200 p-6 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-24 mb-3" />
      <div className="h-4 bg-gray-100 rounded w-40 mb-2" />
      <div className="h-3 bg-gray-100 rounded w-32" />
    </div>
  );
}

export function Dashboard() {
  const { selectedDestino } = useFilter();
  const params = selectedDestino ? { destino: selectedDestino } : undefined;
  const { data: kpis, loading: kpiLoading } = useApi<KpiData>("/api/kpis", params);

  return (
    <div className="p-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {kpiLoading ? (
          Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)
        ) : kpis ? (
          <>
            {/* Card 1 - Precio Promedio */}
            <div className="bg-white rounded-xl shadow-sm border-l-4 border-[#1B4F72] p-6">
              <div className="text-3xl text-gray-900 mb-2">${kpis.precio_promedio.toFixed(2)}</div>
              <div className="text-sm text-gray-600 mb-3">Precio frecuente promedio / kg</div>
              {kpis.cambio_pct !== null && (
                <div className={`flex items-center gap-1 text-sm ${kpis.cambio_pct >= 0 ? "text-[#27AE60]" : "text-[#E74C3C]"}`}>
                  {kpis.cambio_pct >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  <span>{kpis.cambio_pct >= 0 ? "+" : ""}{kpis.cambio_pct}% vs mes anterior</span>
                </div>
              )}
            </div>

            {/* Card 2 - Precio Máximo */}
            <div className="bg-white rounded-xl shadow-sm border-l-4 border-[#E74C3C] p-6">
              <div className="text-3xl text-[#E74C3C] mb-2">${kpis.precio_max.toFixed(2)}</div>
              <div className="text-sm text-gray-600 mb-1">Precio máximo histórico 2025</div>
              <div className="text-xs text-gray-500">
                {kpis.precio_max_mercado} · {kpis.precio_max_fecha}
              </div>
            </div>

            {/* Card 3 - Precio Mínimo */}
            <div className="bg-white rounded-xl shadow-sm border-l-4 border-[#27AE60] p-6">
              <div className="text-3xl text-[#27AE60] mb-2">${kpis.precio_min.toFixed(2)}</div>
              <div className="text-sm text-gray-600 mb-1">Precio mínimo histórico 2025</div>
              <div className="text-xs text-gray-500">
                {kpis.precio_min_mercado} · {kpis.precio_min_fecha}
              </div>
            </div>

            {/* Card 4 - Mercados */}
            <div className="bg-white rounded-xl shadow-sm border-l-4 border-[#F4D03F] p-6">
              <div className="text-3xl text-[#1B4F72] mb-2">{kpis.total_mercados}</div>
              <div className="text-sm text-gray-600">Ciudades destino distintas</div>
            </div>
          </>
        ) : null}
      </div>

      {/* Price Trend Chart - Full Width */}
      <div className="mb-8">
        <PriceTrendChart />
      </div>

      {/* Heatmap & Ranking Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <PriceHeatmap />
        <TopMarketsRanking />
      </div>

    </div>
  );
}
