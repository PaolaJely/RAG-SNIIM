import { MapPin } from "lucide-react";
import { memo } from "react";
import { motion } from "motion/react";
import { formatPrice } from "../../../lib/format";
import type { Market } from "../../../types/market";
import { useFilterStore } from "../../../stores/filterStore";

interface Props {
  market: Market;
  index: number;
  globalMin: number;
  globalMax: number;
}

function getPriceBarColor(relativePos: number): string {
  if (relativePos < 0.33) return "bg-brand-success";
  if (relativePos < 0.66) return "bg-brand-warning";
  return "bg-brand-danger";
}

// React.memo prevents grid re-renders when only searchTerm changes but
// the individual card's data is the same (e.g. typing narrows the list
// but cards already rendered don't change).
export const MercadoCard = memo(function MercadoCard({ market, index, globalMin, globalMax }: Props) {
  const { source } = useFilterStore();
  const range = globalMax - globalMin || 1;
  const relativePos = (market.precio_promedio - globalMin) / range;
  const barColor = getPriceBarColor(relativePos);
  const barWidth = Math.max(relativePos * 100, 6);

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: Math.min(index * 0.03, 0.3) }}
      className="bg-surface-raised rounded-xl border border-border p-5 hover:shadow-sm hover:border-border/60 transition-[border-color,box-shadow] duration-200"
      aria-label={`Mercado ${market.nombre}`}
    >
      <div className="flex items-start gap-2 mb-4">
        <MapPin className="w-3.5 h-3.5 text-brand mt-0.5 shrink-0" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-foreground leading-snug">
          {market.nombre}
        </h3>
      </div>

      <div className="mb-4">
        <p className="text-2xl font-semibold text-foreground tracking-tight tabular-nums">
          {formatPrice(market.precio_promedio)}
          <span className="text-xs font-normal text-muted-foreground ml-1">
            {source === "local" ? "MXN/unidad" : "MXN/kg"}
          </span>
        </p>
        <div
          className="mt-2 w-full bg-muted rounded-full h-1.5"
          aria-label={`Precio relativo: ${Math.round(relativePos * 100)}% del rango nacional`}
        >
          <div
            className={`h-1.5 rounded-full transition-[width] duration-500 ${barColor}`}
            style={{ width: `${barWidth}%` }}
            aria-hidden="true"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-surface rounded-lg px-3 py-2 border border-border">
          <p className="text-muted-foreground mb-0.5">Mínimo</p>
          <p className="font-semibold text-foreground tabular-nums">
            {market.precio_min !== null ? formatPrice(market.precio_min) : "—"}
          </p>
        </div>
        <div className="bg-surface rounded-lg px-3 py-2 border border-border">
          <p className="text-muted-foreground mb-0.5">Máximo</p>
          <p className="font-semibold text-foreground tabular-nums">
            {market.precio_max !== null ? formatPrice(market.precio_max) : "—"}
          </p>
        </div>
      </div>

      <div className="mt-3 flex justify-end">
        <span className="text-[11px] font-medium text-muted-foreground bg-muted px-2 py-1 rounded-md">
          {market.registros} registros
        </span>
      </div>
    </motion.article>
  );
});

export function MercadoCardSkeleton() {
  return (
    <div className="bg-surface-raised rounded-xl border border-border p-5 animate-pulse space-y-4">
      <div className="flex items-start gap-2">
        <div className="w-3.5 h-3.5 bg-muted rounded mt-0.5 shrink-0" />
        <div className="h-4 bg-muted rounded w-3/4" />
      </div>
      <div className="space-y-2">
        <div className="h-7 bg-muted rounded w-28" />
        <div className="h-1.5 bg-muted rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="h-12 bg-muted rounded-lg" />
        <div className="h-12 bg-muted rounded-lg" />
      </div>
    </div>
  );
}
