export interface MonthlyPrice {
  month: string;
  precio_frec: number;
  precio_min: number | null;
  precio_max: number | null;
}

export interface CandlestickPrice extends MonthlyPrice {
  open: number;
  close: number;
  low: number;
  high: number;
  range: [number, number];
  changePct: number;
}

export interface HeatmapData {
  destinos: string[];
  meses: string[];
  data: Record<string, Record<string, number | null>>;
}

export type PriceGranularity = "month" | "quarter";
