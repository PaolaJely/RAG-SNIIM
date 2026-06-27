import { useMemo } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { usePriceTrendChart } from "../hooks/usePriceTrendChart";
import { ChartSkeleton } from "./ChartSkeleton";
import { GranularityToggle } from "./GranularityToggle";
import { PriceRangeTooltip } from "./PriceRangeTooltip";
import type { CandlestickPrice } from "../../../types/prices";

const COLORS = {
  rising: "#16a34a",
  falling: "#dc2626",
} as const;

interface CandleShapeProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: CandlestickPrice;
}

function Candlestick({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  payload,
}: CandleShapeProps) {
  if (!payload) return null;

  const { open, close, low, high } = payload;
  const rising = close >= open;
  const color = rising ? COLORS.rising : COLORS.falling;
  const scale = high === low ? 0 : height / (high - low);
  const bodyTop = y + (high - Math.max(open, close)) * scale;
  const rawBodyHeight = Math.abs(open - close) * scale;
  const bodyHeight = Math.max(rawBodyHeight, 3);
  const candleWidth = Math.min(Math.max(width * 0.48, 8), 28);
  const center = x + width / 2;

  return (
    <g role="img" aria-label={`${payload.month}: apertura ${open}, cierre ${close}`}>
      <line
        x1={center}
        x2={center}
        y1={y}
        y2={y + height}
        stroke={color}
        strokeWidth={1.5}
      />
      <rect
        x={center - candleWidth / 2}
        y={bodyTop}
        width={candleWidth}
        height={bodyHeight}
        rx={1.5}
        fill={rising ? color : "var(--surface-raised)"}
        stroke={color}
        strokeWidth={2}
      />
    </g>
  );
}

export function PriceTrendChartView() {
  const { chartData, granularity, setGranularity, loading } =
    usePriceTrendChart();
  const tooltipContent = useMemo(() => <PriceRangeTooltip />, []);

  return (
    <div className="rounded-xl border border-border bg-surface-raised p-5">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Velas de precios 2025
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Apertura, cierre y rango mín/máx · MXN/kg
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <i className="h-2.5 w-2.5 rounded-sm bg-brand-success" /> Alza
            </span>
            <span className="flex items-center gap-1.5">
              <i className="h-2.5 w-2.5 rounded-sm bg-brand-danger" /> Baja
            </span>
          </div>
          <GranularityToggle value={granularity} onChange={setGranularity} />
        </div>
      </div>

      {loading ? (
        <ChartSkeleton />
      ) : chartData.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
          Sin datos de precios para mostrar
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart
            data={chartData}
            margin={{ top: 12, right: 12, left: -4, bottom: 0 }}
          >
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
              tickFormatter={(value: number) => `$${value}`}
              domain={["dataMin - 2", "dataMax + 2"]}
              width={48}
            />
            <Tooltip
              content={tooltipContent}
              cursor={{ fill: "currentColor", opacity: 0.04 }}
            />
            <Bar
              dataKey="range"
              shape={<Candlestick />}
              isAnimationActive
              animationDuration={450}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
