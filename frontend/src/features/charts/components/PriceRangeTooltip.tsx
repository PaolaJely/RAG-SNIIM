import type { TooltipProps } from "recharts";
import type { MonthlyPrice } from "../../../types/prices";

type Props = TooltipProps<number, string>;

// Co-located with the only consumer that needs them.
const MONTH_NAMES: Record<string, string> = {
  Ene: "Enero",   Feb: "Febrero",   Mar: "Marzo",
  Abr: "Abril",   May: "Mayo",      Jun: "Junio",
  Jul: "Julio",   Ago: "Agosto",    Sep: "Septiembre",
  Oct: "Octubre", Nov: "Noviembre", Dic: "Diciembre",
};

/**
 * Custom recharts tooltip for area/line charts showing a price range.
 *
 * Bug fix: the range line is only rendered when both `precio_min` and
 * `precio_max` are non-null, preventing the "$null – $null" display
 * that occurred when quarterly aggregation had missing data.
 */
export function PriceRangeTooltip({ active, payload }: Props) {
  if (!active || !payload?.length) return null;

  const d = payload[0].payload as MonthlyPrice;
  const hasRange = d.precio_min != null && d.precio_max != null;

  return (
    <div className="bg-popover border border-border rounded-xl shadow-lg px-3 py-2.5 text-sm">
      <p className="text-xs text-muted-foreground mb-1.5 font-medium">
        {MONTH_NAMES[d.month] ?? d.month} 2025
      </p>
      <p className="font-semibold text-foreground">
        ${d.precio_frec}
        <span className="font-normal text-muted-foreground text-xs"> /kg</span>
      </p>
      {hasRange && (
        <p className="text-xs text-muted-foreground mt-1">
          Rango: ${d.precio_min} – ${d.precio_max}
        </p>
      )}
    </div>
  );
}
