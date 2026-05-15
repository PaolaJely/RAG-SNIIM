export interface Market {
  nombre: string;
  precio_promedio: number;
  precio_min: number | null;
  precio_max: number | null;
  registros: number;
}

/** Subset used by the destination filter dropdown */
export interface MarketMinimal {
  nombre: string;
  precio_promedio: number;
}
