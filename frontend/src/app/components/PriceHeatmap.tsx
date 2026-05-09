import { Info } from "lucide-react";
import { useApi } from "../hooks/useApi";
import { useFilter } from "../context/FilterContext";

interface HeatmapData {
  destinos: string[];
  meses: string[];
  data: Record<string, Record<string, number | null>>;
}

const COLOR_STEPS = ["#FEF9E7", "#FDEBD0", "#FAD7A0", "#F8C471", "#F39C12", "#E67E22"];

function getColor(price: number | null, min: number, max: number): string {
  if (price === null) return "#F3F4F6";
  const normalized = (price - min) / (max - min || 1);
  const idx = Math.min(Math.floor(normalized * COLOR_STEPS.length), COLOR_STEPS.length - 1);
  return COLOR_STEPS[Math.max(0, idx)];
}

function getTextColor(price: number | null, min: number, max: number): string {
  if (price === null) return "#9CA3AF";
  return (price - min) / (max - min || 1) > 0.6 ? "#ffffff" : "#333333";
}

export function PriceHeatmap() {
  const { selectedDestino } = useFilter();
  const params = selectedDestino ? { destino: selectedDestino } : undefined;
  const { data, loading } = useApi<HeatmapData>("/api/precios/heatmap", params);

  const allPrices = data
    ? Object.values(data.data).flatMap((row) => Object.values(row).filter((v) => v !== null) as number[])
    : [];
  const min = allPrices.length ? Math.min(...allPrices) : 0;
  const max = allPrices.length ? Math.max(...allPrices) : 1;

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-[#1B4F72]">Mapa de Calor por Mercado</h3>
        <div className="group relative">
          <Info className="w-4 h-4 text-gray-400 cursor-help" />
          <div className="absolute left-0 top-6 w-52 bg-gray-900 text-white text-xs rounded-lg p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
            Precio frecuente promedio por ciudad y mes (MXN/kg)
          </div>
        </div>
      </div>

      {loading ? (
        <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Cargando...</div>
      ) : data ? (
        <>
          <div className="overflow-x-auto mb-4">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left py-2 px-3 text-xs text-gray-600 w-32">Ciudad</th>
                  {data.meses.map((m) => (
                    <th key={m} className="text-center py-2 px-1 text-xs text-gray-600">{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.destinos.map((dest) => (
                  <tr key={dest}>
                    <td className="py-1 px-3 text-xs text-gray-700 truncate max-w-[8rem]" title={dest}>{dest}</td>
                    {data.meses.map((mes) => {
                      const price = data.data[dest]?.[mes] ?? null;
                      return (
                        <td key={mes} className="p-1">
                          <div
                            className="w-full h-8 flex items-center justify-center rounded text-xs transition-transform hover:scale-110 cursor-pointer"
                            style={{ backgroundColor: getColor(price, min, max), color: getTextColor(price, min, max) }}
                            title={price ? `$${price}/kg` : "Sin datos"}
                          >
                            {price !== null ? `$${price}` : "—"}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-600">${min.toFixed(0)}</span>
            <div className="flex-1 h-3 rounded-full overflow-hidden flex">
              {COLOR_STEPS.map((c) => (
                <div key={c} className="flex-1" style={{ backgroundColor: c }} />
              ))}
            </div>
            <span className="text-xs text-gray-600">${max.toFixed(0)}</span>
          </div>
        </>
      ) : null}
    </div>
  );
}
