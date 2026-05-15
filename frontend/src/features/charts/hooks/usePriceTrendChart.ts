/**
 * UI-layer hook for PriceTrendChart.
 *
 * Owns:
 *  - granularity UI state
 *  - monthly → quarterly aggregation (pure transformation)
 *  - peak row derivation
 *
 * Keeps PriceTrendChart free of business logic so it only
 * describes how the chart looks, not how the data is shaped.
 */

import { useState, useMemo } from "react";
import { usePriceTrend } from "./usePriceTrend";
import type { MonthlyPrice, PriceGranularity } from "../../../types/prices";

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

function findPeakRow(data: MonthlyPrice[]): MonthlyPrice | null {
  return data.reduce<MonthlyPrice | null>(
    (best, row) => (row.precio_frec > (best?.precio_frec ?? 0) ? row : best),
    null,
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface PriceTrendChartState {
  chartData: MonthlyPrice[];
  peakRow: MonthlyPrice | null;
  granularity: PriceGranularity;
  setGranularity: (g: PriceGranularity) => void;
  loading: boolean;
}

export function usePriceTrendChart(): PriceTrendChartState {
  const [granularity, setGranularity] = useState<PriceGranularity>("month");
  const { data: monthly, loading } = usePriceTrend();

  const chartData = useMemo(() => {
    if (!monthly) return [];
    return granularity === "quarter" ? aggregateToQuarters(monthly) : monthly;
  }, [monthly, granularity]);

  const peakRow = useMemo(() => findPeakRow(chartData), [chartData]);

  return { chartData, peakRow, granularity, setGranularity, loading };
}
