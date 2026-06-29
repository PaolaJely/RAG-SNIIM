import { useMemo } from "react";
import { useMarkets } from "../../markets/hooks/useMarkets";
import { formatPriceShort } from "../../../lib/format";
import { useFilterStore } from "../../../stores/filterStore";

const RANK_COLORS = [
  { bar: "#1B4F72", textOnBar: "text-white" },
  { bar: "#2471A3", textOnBar: "text-white" },
  { bar: "#2E86C1", textOnBar: "text-white" },
  { bar: "#5DADE2", textOnBar: "text-white" },
  { bar: "#7FB3D5", textOnBar: "text-slate-900" },
  { bar: "#A9CCE3", textOnBar: "text-slate-900" },
  { bar: "#D6EAF8", textOnBar: "text-slate-900" },
  { bar: "#EBF5FB", textOnBar: "text-slate-900" },
];

const MEDALS = ["🥇", "🥈", "🥉"];

function RankingSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-5 h-5 bg-muted rounded-full shrink-0" />
          <div className="w-20 h-3 bg-muted rounded shrink-0" />
          <div className="flex-1 h-7 bg-muted rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export function TopMarketsRanking() {
  const { data: markets, loading } = useMarkets();
  const { source } = useFilterStore();
  const unit = source === "local" ? "unidad" : "kg";

  const { top, maxPrice } = useMemo(() => {
    const slice = markets?.slice(0, 8) ?? [];
    let max = 1;
    for (const m of slice) {
      if (m.precio_promedio > max) max = m.precio_promedio;
    }
    return { top: slice, maxPrice: max };
  }, [markets]);

  return (
    <div className="bg-surface-raised rounded-xl border border-border p-5">
      <div className="mb-5">
        <h3 className="text-sm font-semibold text-foreground">
          Mercados con Mayor Precio
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Precio frecuente promedio · MXN/{unit}
        </p>
      </div>

      {loading ? (
        <RankingSkeleton />
      ) : (
        <ol className="space-y-2.5" aria-label="Ranking de mercados">
          {top.map((market, index) => {
            const widthPct = (market.precio_promedio / maxPrice) * 100;
            const colors = RANK_COLORS[index] ?? RANK_COLORS[RANK_COLORS.length - 1];

            return (
              <li key={market.nombre} className="flex items-center gap-2.5">
                <div
                  className={[
                    "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                    index < 3
                      ? "bg-brand-accent/20 text-brand-accent-foreground"
                      : "bg-muted text-muted-foreground",
                  ].join(" ")}
                  aria-label={`Posición ${index + 1}`}
                >
                  {index < 3 ? MEDALS[index] : index + 1}
                </div>
                <div className="w-28 text-xs text-muted-foreground truncate shrink-0" title={market.nombre}>
                  {market.nombre}
                </div>
                <div className="flex-1 bg-muted rounded-md h-7 overflow-hidden">
                  <div
                    className="h-full flex items-center justify-end pr-2.5 rounded-md transition-all duration-500 ease-out"
                    style={{ width: `${Math.max(widthPct, 12)}%`, backgroundColor: colors.bar }}
                    aria-label={`${market.nombre}: ${formatPriceShort(market.precio_promedio)}/${unit}`}
                  >
                    <span className={`text-[10px] font-semibold ${colors.textOnBar} whitespace-nowrap`}>
                      {formatPriceShort(market.precio_promedio)}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
