interface Props {
  bars?: number;
  height?: number;
}

/**
 * Animated placeholder for bar/area charts while data loads.
 * Used by PriceTrendChart; can be reused by any future chart component.
 */
export function ChartSkeleton({ bars = 12, height = 240 }: Props) {
  return (
    <div className="animate-pulse" style={{ height }}>
      <div className="flex items-end gap-1 h-full pb-6">
        {Array.from({ length: bars }).map((_, i) => (
          <div
            key={i}
            className="flex-1 bg-muted rounded-sm"
            style={{ height: `${30 + (i % 4) * 25}%` }}
          />
        ))}
      </div>
    </div>
  );
}
