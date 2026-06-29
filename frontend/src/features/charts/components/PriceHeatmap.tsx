import { Info } from "lucide-react";
import { usePriceHeatmap } from "../hooks/usePriceHeatmap";
import { useFilterStore } from "../../../stores/filterStore";

const COLOR_STEPS = [
  "#FEF9E7", "#FDF2D0", "#FDEBD0",
  "#FAD7A0", "#F8C471", "#F5A623",
];

function getColor(price: number | null, min: number, max: number): string {
  if (price === null) return "transparent";
  const idx = Math.min(
    Math.floor(((price - min) / (max - min || 1)) * COLOR_STEPS.length),
    COLOR_STEPS.length - 1,
  );
  return COLOR_STEPS[Math.max(0, idx)];
}

function getTextColor(price: number | null, min: number, max: number): string {
  if (price === null) return "#94a3b8";
  return (price - min) / (max - min || 1) > 0.65 ? "#78350f" : "#451a03";
}

export function PriceHeatmap() {
  const { data, loading } = usePriceHeatmap();
  const { source } = useFilterStore();
  const unit = source === "local" ? "unidad" : "kg";

  const allPrices = data
    ? Object.values(data.data).flatMap((row) =>
        Object.values(row).filter((v): v is number => v !== null),
      )
    : [];
  const min = allPrices.length ? Math.min(...allPrices) : 0;
  const max = allPrices.length ? Math.max(...allPrices) : 1;

  return (
    <div className="bg-surface-raised rounded-xl border border-border p-5">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-sm font-semibold text-foreground">
          Mapa de Calor por Mercado
        </h3>
        <div className="group relative ml-0.5">
          <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
          <div
            role="tooltip"
            className="absolute left-0 top-5 w-52 bg-popover border border-border text-foreground text-xs rounded-lg p-2.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg leading-relaxed"
          >
            Precio frecuente promedio por ciudad y mes (MXN/{unit})
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2 animate-pulse">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-2">
              <div className="w-24 h-6 bg-muted rounded" />
              {Array.from({ length: 6 }).map((_, j) => (
                <div key={j} className="flex-1 h-6 bg-muted rounded" />
              ))}
            </div>
          ))}
        </div>
      ) : data ? (
        <>
          <div className="overflow-x-auto overflow-y-auto max-h-80 -mx-1 px-1">
            <table
              className="w-full border-collapse"
              aria-label="Mapa de calor de precios por mercado y mes"
            >
              <thead className="sticky top-0 z-10 bg-surface-raised">
                <tr>
                  <th scope="col" className="text-left py-1.5 pr-3 text-[11px] font-medium text-muted-foreground w-28">
                    Ciudad
                  </th>
                  {data.meses.map((m) => (
                    <th key={m} scope="col" className="text-center py-1.5 px-0.5 text-[11px] font-medium text-muted-foreground">
                      {m}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.destinos.map((dest) => (
                  <tr key={dest}>
                    <td className="py-0.5 pr-3 text-[11px] text-muted-foreground truncate max-w-[7rem]" title={dest}>
                      {dest}
                    </td>
                    {data.meses.map((mes) => {
                      const price = data.data[dest]?.[mes] ?? null;
                      return (
                        <td key={mes} className="p-0.5">
                          <div
                            className="w-full h-7 flex items-center justify-center rounded text-[10px] font-medium transition-transform hover:scale-105 cursor-default select-none"
                            style={{
                              backgroundColor: price !== null ? getColor(price, min, max) : undefined,
                              color: price !== null ? getTextColor(price, min, max) : undefined,
                            }}
                            title={price ? `$${price}/${unit}` : "Sin datos"}
                            aria-label={price !== null ? `${dest}, ${mes}: $${price}/${unit}` : `${dest}, ${mes}: Sin datos`}
                          >
                            {price !== null ? `$${price}` : <span className="text-muted-foreground/30">—</span>}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-2.5 mt-4">
            <span className="text-[10px] text-muted-foreground font-medium">${min.toFixed(0)}</span>
            <div className="flex-1 h-2 rounded-full overflow-hidden flex">
              {COLOR_STEPS.map((c, i) => (
                <div key={i} className="flex-1" style={{ backgroundColor: c }} />
              ))}
            </div>
            <span className="text-[10px] text-muted-foreground font-medium">${max.toFixed(0)}</span>
          </div>
        </>
      ) : null}
    </div>
  );
}
