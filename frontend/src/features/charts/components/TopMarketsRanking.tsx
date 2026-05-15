import { useMemo } from "react";
import { useMarkets } from "../../markets/hooks/useMarkets";
import { formatPriceShort } from "../../../lib/format";

const RANK_COLORS = [
  { bar: "#1B4F72", text: "text-white" },
  { bar: "#2471A3", text: "text-white" },
  { bar: "#2E86C1", text: "text-white" },
  { bar: "#5DADE2", text: "text-white" },
  { bar: "#7FB3D5", text: "text-foreground" },
  { bar: "#A9CCE3", text: "text-foreground" },
  { bar: "#D6EAF8", text: "text-foreground" },
  { bar: "#EBF5FB", text: "text-foreground" },
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
          Precio frecuente promedio · MXN/kg
        </p>
      </div>

      {loading ? (
        <RankingSkeleton />
      ) : (
        <div className="space-y-2.5" role="list" aria-label="Ranking de mercados">
          {top.map((market, index) => {
            const widthPct = (market.precio_promedio / maxPrice) * 100;
            const colors = RANK_COLORS[index] ?? RANK_COLORS[RANK_COLORS.length - 1];

            return (
              <div key={market.nombre} className="flex items-center gap-2.5" role="listitem">
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
                    role="meter"
                    aria-label={`${market.nombre}: ${formatPriceShort(market.precio_promedio)}/kg`}
                    aria-valuenow={market.precio_promedio}
                    aria-valuemin={0}
                    aria-valuemax={maxPrice}
                  >
                    <span className={`text-[10px] font-semibold ${colors.text} whitespace-nowrap`}>
                      {formatPriceShort(market.precio_promedio)}
                    </span>
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
