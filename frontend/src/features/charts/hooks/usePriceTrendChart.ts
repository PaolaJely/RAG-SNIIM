/**
 * UI-layer hook for PriceTrendChart.
 *
 * Owns:
 *  - granularity UI state
 *  - monthly → quarterly aggregation (pure transformation)
 *  - candlestick derivation
 *
 * Keeps PriceTrendChart free of business logic so it only
 * describes how the chart looks, not how the data is shaped.
 */

import { useState, useMemo } from "react";
import { usePriceTrend } from "./usePriceTrend";
import type {
  CandlestickPrice,
  MonthlyPrice,
  PriceGranularity,
} from "../../../types/prices";

// ─── Constants ───────────────────────────────────────────────────────────────

const QUARTERS: { label: string; months: string[] }[] = [
  { label: "Q1", months: ["Ene", "Feb", "Mar"] },
  { label: "Q2", months: ["Abr", "May", "Jun"] },
  { label: "Q3", months: ["Jul", "Ago", "Sep"] },
  { label: "Q4", months: ["Oct", "Nov", "Dic"] },
];

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function aggregateToQuarters(data: MonthlyPrice[]): MonthlyPrice[] {
  return QUARTERS.flatMap(({ label, months }) => {
    const rows = data.filter((d) => months.includes(d.month));
    if (!rows.length) return [];

    const validMins = rows.map((r) => r.precio_min).filter((v): v is number => v !== null);
    const validMaxes = rows.map((r) => r.precio_max).filter((v): v is number => v !== null);

    return [
      {
        month: label,
        precio_frec: +(rows.reduce((s, r) => s + r.precio_frec, 0) / rows.length).toFixed(2),
        precio_min: validMins.length ? +(Math.min(...validMins)).toFixed(2) : null,
        precio_max: validMaxes.length ? +(Math.max(...validMaxes)).toFixed(2) : null,
      },
    ];
  });
}

function toCandlesticks(data: MonthlyPrice[]): CandlestickPrice[] {
  return data.map((row, index) => {
    const open = index === 0 ? row.precio_frec : data[index - 1].precio_frec;
    const close = row.precio_frec;
    const low = Math.min(row.precio_min ?? Math.min(open, close), open, close);
    const high = Math.max(row.precio_max ?? Math.max(open, close), open, close);

    return {
      ...row,
      open,
      close,
      low,
      high,
      range: [low, high],
      changePct: open ? ((close - open) / open) * 100 : 0,
    };
  });
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface PriceTrendChartState {
  chartData: CandlestickPrice[];
  granularity: PriceGranularity;
  setGranularity: (g: PriceGranularity) => void;
  loading: boolean;
}

export function usePriceTrendChart(): PriceTrendChartState {
  const [granularity, setGranularity] = useState<PriceGranularity>("month");
  const { data: monthly, loading } = usePriceTrend();

  const chartData = useMemo(() => {
    if (!monthly) return [];
    const periodData =
      granularity === "quarter" ? aggregateToQuarters(monthly) : monthly;
    return toCandlesticks(periodData);
  }, [monthly, granularity]);

  return { chartData, granularity, setGranularity, loading };
}
