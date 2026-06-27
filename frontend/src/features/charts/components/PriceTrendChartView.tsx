import { useEffect, useMemo, useRef } from "react";
import { useTheme } from "next-themes";
import * as echarts from "echarts/core";
import type { EChartsOption } from "echarts";
import { BarChart, CandlestickChart, LineChart } from "echarts/charts";
import {
  DataZoomComponent,
  GridComponent,
  MarkLineComponent,
  TooltipComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { usePriceTrendChart } from "../hooks/usePriceTrendChart";
import { ChartSkeleton } from "./ChartSkeleton";
import { GranularityToggle } from "./GranularityToggle";
import type { CandlestickPrice } from "../../../types/prices";

echarts.use([
  BarChart,
  CandlestickChart,
  LineChart,
  DataZoomComponent,
  GridComponent,
  MarkLineComponent,
  TooltipComponent,
  CanvasRenderer,
]);

const COLORS = {
  rising: "#4ea5a1",
  falling: "#c36b6b",
  shortAverage: "#49b8d1",
  longAverage: "#c13d76",
  accent: "#f59e42",
} as const;

function formatPrice(value: number): string {
  return `$${value.toFixed(2)}`;
}

function tooltipHtml(row: CandlestickPrice): string {
  const rising = row.close >= row.open;
  const changeColor = rising ? COLORS.rising : COLORS.falling;

  return `
    <div style="min-width:230px;font-size:12px">
      <div style="display:flex;justify-content:space-between;gap:18px;margin-bottom:8px">
        <strong>${row.start_date} — ${row.end_date}</strong>
        <strong style="color:${changeColor}">
          ${row.changePct >= 0 ? "+" : ""}${row.changePct.toFixed(1)}%
        </strong>
      </div>
      <div style="display:grid;grid-template-columns:1fr auto;gap:4px 18px;color:#94a3b8">
        <span>Apertura</span><b style="color:#e2e8f0">${formatPrice(row.open)}</b>
        <span>Máximo</span><b style="color:#e2e8f0">${formatPrice(row.high)}</b>
        <span>Mínimo</span><b style="color:#e2e8f0">${formatPrice(row.low)}</b>
        <span>Cierre</span><b style="color:#e2e8f0">${formatPrice(row.close)}</b>
        <span>Observaciones</span><b style="color:#e2e8f0">${row.observations}</b>
      </div>
    </div>
  `;
}

interface FinancialChartProps {
  data: CandlestickPrice[];
  dark: boolean;
  shortPeriod: number;
  longPeriod: number;
}

function FinancialChart({
  data,
  dark,
  shortPeriod,
  longPeriod,
}: FinancialChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const option = useMemo<EChartsOption>(() => {
    const background = dark ? "#14233d" : "#f8fafc";
    const panel = dark ? "#101d33" : "#eef2f7";
    const grid = dark ? "rgba(148,163,184,0.08)" : "rgba(71,85,105,0.10)";
    const text = dark ? "#94a3b8" : "#64748b";
    const axis = dark ? "#31415d" : "#cbd5e1";
    const candleData = data.map((row) => [row.open, row.close, row.low, row.high]);
    const last = data.at(-1);
    const start = Math.max(0, 100 - (20 / Math.max(data.length, 1)) * 100);

    return {
      backgroundColor: background,
      animation: true,
      animationDuration: 350,
      grid: [
        { left: 12, right: 68, top: 18, height: "62%", containLabel: true },
        { left: 12, right: 68, top: "67%", height: "12%", containLabel: true },
      ],
      axisPointer: {
        link: [{ xAxisIndex: "all" }],
        label: { backgroundColor: COLORS.accent, color: "#172033" },
      },
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "cross",
          lineStyle: { color: COLORS.accent, width: 1 },
          crossStyle: { color: COLORS.accent, width: 1 },
        },
        backgroundColor: "rgba(15, 29, 51, 0.96)",
        borderColor: "#334155",
        textStyle: { color: "#e2e8f0" },
        padding: 12,
        formatter: (params: unknown) => {
          const items = params as Array<{ dataIndex?: number }>;
          const index = items.find((item) => item.dataIndex != null)?.dataIndex;
          return index == null || !data[index] ? "" : tooltipHtml(data[index]);
        },
      },
      xAxis: [
        {
          type: "category",
          data: data.map((row) => row.period),
          boundaryGap: true,
          axisLine: { lineStyle: { color: axis } },
          axisTick: { show: false },
          axisLabel: { color: text, fontSize: 10, hideOverlap: true },
          splitLine: { show: true, lineStyle: { color: grid } },
          min: "dataMin",
          max: "dataMax",
        },
        {
          type: "category",
          gridIndex: 1,
          data: data.map((row) => row.period),
          boundaryGap: true,
          axisLine: { lineStyle: { color: axis } },
          axisTick: { show: false },
          axisLabel: { show: false },
          splitLine: { show: false },
          min: "dataMin",
          max: "dataMax",
        },
      ],
      yAxis: [
        {
          scale: true,
          position: "right",
          splitNumber: 5,
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: {
            color: text,
            fontSize: 10,
            formatter: (value: number) => `$${value.toFixed(0)}`,
          },
          splitLine: { lineStyle: { color: grid } },
        },
        {
          scale: true,
          gridIndex: 1,
          position: "right",
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { show: false },
          splitLine: { show: false },
        },
      ],
      dataZoom: [
        {
          type: "inside",
          xAxisIndex: [0, 1],
          start,
          end: 100,
          zoomOnMouseWheel: true,
          moveOnMouseMove: true,
          moveOnMouseWheel: false,
        },
        {
          type: "slider",
          xAxisIndex: [0, 1],
          start,
          end: 100,
          bottom: 4,
          height: 42,
          borderColor: axis,
          backgroundColor: panel,
          fillerColor: dark ? "rgba(73,184,209,0.10)" : "rgba(14,165,233,0.10)",
          dataBackground: {
            lineStyle: { color: COLORS.shortAverage, width: 1 },
            areaStyle: { color: dark ? "#172a45" : "#dbeafe" },
          },
          selectedDataBackground: {
            lineStyle: { color: COLORS.shortAverage },
            areaStyle: { color: dark ? "#1d3555" : "#bfdbfe" },
          },
          handleStyle: { color: COLORS.accent, borderColor: COLORS.accent },
          moveHandleStyle: { color: COLORS.accent, opacity: 0.5 },
          textStyle: { color: text, fontSize: 9 },
          brushSelect: true,
        },
      ],
      series: [
        {
          name: "Precio OHLC",
          type: "candlestick",
          data: candleData,
          itemStyle: {
            color: "rgba(78,165,161,0.34)",
            color0: "rgba(195,107,107,0.34)",
            borderColor: COLORS.rising,
            borderColor0: COLORS.falling,
            borderWidth: 1,
          },
          markLine: last
            ? {
                silent: true,
                symbol: ["none", "none"],
                lineStyle: { color: COLORS.accent, width: 1 },
                label: {
                  show: true,
                  position: "end",
                  formatter: formatPrice(last.close),
                  color: "#172033",
                  backgroundColor: COLORS.accent,
                  padding: [3, 5],
                  fontSize: 10,
                },
                data: [{ yAxis: last.close }],
              }
            : undefined,
        },
        {
          name: `Media móvil ${shortPeriod}`,
          type: "line",
          data: data.map((row) => row.movingAverageShort),
          symbol: "none",
          smooth: true,
          lineStyle: { color: COLORS.shortAverage, width: 1.25 },
        },
        {
          name: `Media móvil ${longPeriod}`,
          type: "line",
          data: data.map((row) => row.movingAverageLong),
          symbol: "none",
          smooth: true,
          lineStyle: { color: COLORS.longAverage, width: 1.25 },
        },
        {
          name: "Observaciones",
          type: "bar",
          xAxisIndex: 1,
          yAxisIndex: 1,
          data: data.map((row) => ({
            value: row.observations,
            itemStyle: {
              color:
                row.close >= row.open
                  ? "rgba(78,165,161,0.60)"
                  : "rgba(195,107,107,0.60)",
            },
          })),
          barMaxWidth: 12,
        },
      ],
    };
  }, [data, dark, shortPeriod, longPeriod]);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = echarts.init(containerRef.current, undefined, {
      renderer: "canvas",
    });
    chart.setOption(option);

    const resizeObserver = new ResizeObserver(() => chart.resize());
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.dispose();
    };
  }, [option]);

  return (
    <div
      ref={containerRef}
      className="h-[440px] w-full overflow-hidden rounded-lg"
      role="img"
      aria-label="Gráfica interactiva de velas de precios"
    />
  );
}

export function PriceTrendChartView() {
  const {
    chartData,
    granularity,
    setGranularity,
    loading,
    error,
    shortPeriod,
    longPeriod,
  } = usePriceTrendChart();
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface-raised">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Comportamiento de precios
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Velas OHLC y actividad calculadas con observaciones de Neon
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="hidden items-center gap-3 text-[11px] text-muted-foreground md:flex">
            <span className="flex items-center gap-1.5">
              <i className="h-2.5 w-2.5 rounded-sm bg-[#4ea5a1]" /> Alza
            </span>
            <span className="flex items-center gap-1.5">
              <i className="h-2.5 w-2.5 rounded-sm bg-[#c36b6b]" /> Baja
            </span>
            <span className="flex items-center gap-1.5">
              <i className="h-0.5 w-3 bg-[#49b8d1]" /> MM {shortPeriod}
            </span>
            <span className="flex items-center gap-1.5">
              <i className="h-0.5 w-3 bg-[#c13d76]" /> MM {longPeriod}
            </span>
          </div>
          <GranularityToggle value={granularity} onChange={setGranularity} />
        </div>
      </div>

      <div className="p-2 sm:p-3">
        {loading ? (
          <ChartSkeleton height={440} />
        ) : error ? (
          <div className="flex h-[440px] items-center justify-center text-sm text-brand-danger">
            No fue posible cargar las velas de precios
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-[440px] items-center justify-center text-sm text-muted-foreground">
            Sin datos de precios para mostrar
          </div>
        ) : (
          <FinancialChart
            data={chartData}
            dark={dark}
            shortPeriod={shortPeriod}
            longPeriod={longPeriod}
          />
        )}
      </div>
    </div>
  );
}
