import { useMemo } from "react";
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from "recharts";
import { usePriceTrendChart } from "../hooks/usePriceTrendChart";
import { ChartSkeleton } from "./ChartSkeleton";
import { GranularityToggle } from "./GranularityToggle";
import { PriceRangeTooltip } from "./PriceRangeTooltip";

// ─── Constants ───────────────────────────────────────────────────────────────

const COLORS = {
  primary: "#1B4F72",
  muted:   "#94a3b8",
  peak:    "#F4D03F",
} as const;

// ─── Component ───────────────────────────────────────────────────────────────

export function PriceTrendChart() {
  const { chartData, peakRow, granularity, setGranularity, loading } =
    usePriceTrendChart();

  // Stable element reference prevents Recharts from remounting the tooltip
  // on every chart re-render (Recharts clones this element internally).
  const tooltipContent = useMemo(() => <PriceRangeTooltip />, []);

  return (
    <div className="bg-surface-raised rounded-xl border border-border p-5">
      {/* Header ── title + granularity toggle */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Evolución de Precios 2025
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Precio frecuente con rango mín/máx (MXN/kg)
          </p>
        </div>
        <GranularityToggle value={granularity} onChange={setGranularity} />
      </div>

      {/* Body ── skeleton or chart */}
      {loading ? (
        <ChartSkeleton />
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
          >
            <defs>
              <linearGradient id="gradRange" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={COLORS.primary} stopOpacity={0.15} />
                <stop offset="100%" stopColor={COLORS.primary} stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="currentColor"
              className="text-border"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "currentColor" }}
              className="text-muted-foreground"
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "currentColor" }}
              className="text-muted-foreground"
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `$${v}`}
              domain={[0, "auto"]}
              width={42}
            />
            <Tooltip
              content={tooltipContent}
              cursor={{
                stroke: COLORS.primary,
                strokeWidth: 1,
                strokeDasharray: "4 2",
              }}
            />

            {/* Range band: max area filled, min area clears the fill */}
            <Area type="monotone" dataKey="precio_max" stroke="none" fill="url(#gradRange)" fillOpacity={1} />
            <Area type="monotone" dataKey="precio_min" stroke="none" fill="white"           fillOpacity={0} />

            {/* Range boundary lines (dashed) */}
            <Line type="monotone" dataKey="precio_min" stroke={COLORS.muted} strokeWidth={1} strokeDasharray="4 3" dot={false} />
            <Line type="monotone" dataKey="precio_max" stroke={COLORS.muted} strokeWidth={1} strokeDasharray="4 3" dot={false} />

            {/* Main price trend line */}
            <Line
              type="monotone"
              dataKey="precio_frec"
              stroke={COLORS.primary}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: COLORS.primary, strokeWidth: 0 }}
            />

            {/* Peak marker */}
            {peakRow && (
              <ReferenceDot
                x={peakRow.month}
                y={peakRow.precio_frec}
                r={4}
                fill={COLORS.peak}
                stroke={COLORS.primary}
                strokeWidth={2}
                label={{
                  value: `Pico $${peakRow.precio_frec}`,
                  position: "top",
                  fill: COLORS.primary,
                  fontSize: 10,
                  offset: 8,
                }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
