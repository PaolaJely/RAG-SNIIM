import { useCallback, useMemo, useState } from "react";
import { useFetch } from "../../../lib/useFetch";
import { getOhlcPrices } from "../../../services/priceService";
import { useFilterStore } from "../../../stores/filterStore";
import type {
  CandlestickPrice,
  PriceGranularity,
} from "../../../types/prices";

function movingAverage(
  rows: Array<{ close: number }>,
  index: number,
  length: number,
): number | null {
  if (index < length - 1) return null;
  const window = rows.slice(index - length + 1, index + 1);
  return +(window.reduce((sum, row) => sum + row.close, 0) / length).toFixed(2);
}

export interface PriceTrendChartState {
  chartData: CandlestickPrice[];
  granularity: PriceGranularity;
  setGranularity: (granularity: PriceGranularity) => void;
  loading: boolean;
  error: string | null;
  shortPeriod: number;
  longPeriod: number;
}

export function usePriceTrendChart(): PriceTrendChartState {
  const [granularity, setGranularity] = useState<PriceGranularity>("week");
  const { destinos } = useFilterStore();
  const selectionKey = destinos.join("|");
  const queryFn = useCallback(
    () => getOhlcPrices(granularity, destinos),
    [destinos, granularity],
  );
  const { data, loading, error } = useFetch(
    queryFn,
    [selectionKey, granularity],
    `price-ohlc:${granularity}:${selectionKey}`,
  );

  const shortPeriod = granularity === "week" ? 4 : 3;
  const longPeriod = granularity === "week" ? 12 : 6;

  const chartData = useMemo<CandlestickPrice[]>(() => {
    if (!data) return [];
    return data.map((row, index) => ({
      ...row,
      range: [row.low, row.high],
      changePct: row.open ? ((row.close - row.open) / row.open) * 100 : 0,
      movingAverageShort: movingAverage(data, index, shortPeriod),
      movingAverageLong: movingAverage(data, index, longPeriod),
    }));
  }, [data, shortPeriod, longPeriod]);

  return {
    chartData,
    granularity,
    setGranularity,
    loading,
    error,
    shortPeriod,
    longPeriod,
  };
}
