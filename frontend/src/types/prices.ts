export interface MonthlyPrice {
  month: string;
  precio_frec: number;
  precio_min: number | null;
  precio_max: number | null;
}

export interface CandlestickPrice {
  period: string;
  start_date: string;
  end_date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  observations: number;
  range: [number, number];
  changePct: number;
  movingAverageShort: number | null;
  movingAverageLong: number | null;
}

export interface HeatmapData {
  destinos: string[];
  meses: string[];
  data: Record<string, Record<string, number | null>>;
}

export type PriceGranularity = "week" | "month";
