import type { TooltipProps } from "recharts";
import type { CandlestickPrice } from "../../../types/prices";

type Props = TooltipProps<number, string>;

const MONTH_NAMES: Record<string, string> = {
  Ene: "Enero", Feb: "Febrero", Mar: "Marzo",
  Abr: "Abril", May: "Mayo", Jun: "Junio",
  Jul: "Julio", Ago: "Agosto", Sep: "Septiembre",
  Oct: "Octubre", Nov: "Noviembre", Dic: "Diciembre",
};

const price = (value: number) => `$${value.toFixed(2)}`;

export function PriceRangeTooltip({ active, payload }: Props) {
  if (!active || !payload?.length) return null;

  const d = payload[0].payload as CandlestickPrice;
  const rising = d.close >= d.open;

  return (
    <div className="min-w-44 rounded-lg border border-border bg-popover px-3 py-2.5 text-xs shadow-xl">
      <div className="mb-2 flex items-center justify-between gap-4">
        <p className="font-semibold text-foreground">
          {MONTH_NAMES[d.month] ?? d.month} 2025
        </p>
        <span className={rising ? "text-brand-success" : "text-brand-danger"}>
          {d.changePct >= 0 ? "+" : ""}{d.changePct.toFixed(1)}%
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-5 gap-y-1 text-muted-foreground">
        <span>Apertura</span><strong className="text-right text-foreground">{price(d.open)}</strong>
        <span>Máximo</span><strong className="text-right text-foreground">{price(d.high)}</strong>
        <span>Mínimo</span><strong className="text-right text-foreground">{price(d.low)}</strong>
        <span>Cierre</span><strong className="text-right text-foreground">{price(d.close)}</strong>
      </div>
      <p className="mt-2 border-t border-border pt-2 text-[10px] text-muted-foreground">
        MXN/kg · cierre basado en precio frecuente
      </p>
    </div>
  );
}
