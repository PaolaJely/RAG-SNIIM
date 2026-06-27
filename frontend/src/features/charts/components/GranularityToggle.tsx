import { memo } from "react";
import type { PriceGranularity } from "../../../types/prices";

interface Props {
  value: PriceGranularity;
  onChange: (g: PriceGranularity) => void;
}

const OPTIONS: { value: PriceGranularity; label: string }[] = [
  { value: "week", label: "Semanal" },
  { value: "month", label: "Mensual" },
];

/**
 * Segmented control for switching chart granularity.
 * Memoized so it doesn't re-render when only chart data changes.
 */
export const GranularityToggle = memo(function GranularityToggle({ value, onChange }: Props) {
  return (
    <fieldset className="flex gap-1 bg-muted rounded-lg p-1 border-0 min-w-0">
      <legend className="sr-only">Granularidad del gráfico</legend>
      {OPTIONS.map((opt) => (
        <button
          type="button"
          key={opt.value}
          onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
          className={[
            "px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150",
            value === opt.value
              ? "bg-surface-raised text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          ].join(" ")}
        >
          {opt.label}
        </button>
      ))}
    </fieldset>
  );
});
