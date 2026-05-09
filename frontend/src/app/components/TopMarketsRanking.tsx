import { useApi } from "../hooks/useApi";
import { useFilter } from "../context/FilterContext";

interface Mercado {
  nombre: string;
  precio_promedio: number;
  precio_min: number | null;
  precio_max: number | null;
  registros: number;
}

const BAR_COLORS = ["#3498DB", "#5DADE2", "#7FB3D5", "#85C1E2", "#A9CCE3", "#AED6F1", "#D6EAF8", "#EBF5FB"];

export function TopMarketsRanking() {
  const { selectedDestino } = useFilter();
  const params = selectedDestino ? { destino: selectedDestino } : undefined;
  const { data: mercados, loading } = useApi<Mercado[]>("/api/mercados", params);

  const top = mercados?.slice(0, 8) ?? [];
  const maxPrice = top.length ? Math.max(...top.map((m) => m.precio_promedio)) : 1;

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="mb-6">
        <h3 className="text-[#1B4F72]">Mercados con Mayor Precio Promedio</h3>
        <p className="text-sm text-gray-500 mt-1">MXN/kg · normalizado por presentación</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-8 bg-gray-100 rounded-full animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {top.map((market, index) => {
            const widthPercent = (market.precio_promedio / maxPrice) * 100;
            return (
              <div key={market.nombre} className="group">
                <div className="flex items-center gap-3">
                  <div className="w-36 text-sm text-gray-700 truncate" title={market.nombre}>
                    {market.nombre}
                  </div>
                  <div className="flex-1 relative">
                    <div className="w-full bg-gray-100 rounded-full h-8 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300 group-hover:opacity-80 flex items-center justify-end pr-3"
                        style={{ width: `${widthPercent}%`, backgroundColor: BAR_COLORS[index] ?? BAR_COLORS[BAR_COLORS.length - 1] }}
                      >
                        <span className={`text-xs ${index < 3 ? "text-white" : "text-gray-700"}`}>
                          ${market.precio_promedio.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-600">
                    #{index + 1}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
