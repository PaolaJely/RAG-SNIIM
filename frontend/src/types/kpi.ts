export interface KpiData {
  precio_promedio: number;
  cambio_pct: number | null;
  precio_max: number;
  precio_max_mercado: string;
  precio_max_fecha: string;
  precio_min: number;
  precio_min_mercado: string;
  precio_min_fecha: string;
  total_mercados: number;
}
