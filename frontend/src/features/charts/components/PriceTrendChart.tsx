import { lazy, Suspense } from "react";
import { ChartSkeleton } from "./ChartSkeleton";

const PriceTrendChartView = lazy(() =>
  import("./PriceTrendChartView").then((m) => ({
    default: m.PriceTrendChartView,
  })),
);

export function PriceTrendChart() {
  return (
    <Suspense fallback={<ChartSkeleton height={332} />}>
      <PriceTrendChartView />
    </Suspense>
  );
}
