import { TrendingUp, TrendingDown } from "lucide-react";
import { memo } from "react";
import { motion } from "motion/react";

export interface KpiCardProps {
  label: string;
  value: string;
  unit?: string;
  sublabel?: string;
  trend?: "up" | "down" | null;
  trendLabel?: string;
  icon: React.ReactNode;
  iconBg: string;
  delay?: number;
}

export const KpiCard = memo(function KpiCard({
  label,
  value,
  unit,
  sublabel,
  trend,
  trendLabel,
  icon,
  iconBg,
  delay = 0,
}: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay, ease: "easeOut" }}
      className="bg-surface-raised rounded-xl border border-border p-5 hover:shadow-sm transition-shadow duration-200"
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
        <div className={`w-7 h-7 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
          {icon}
        </div>
      </div>

      <div className="flex items-baseline gap-1.5 mb-2">
        <span className="text-2xl font-semibold text-foreground tracking-tight tabular-nums">
          {value}
        </span>
        {unit && (
          <span className="text-xs text-muted-foreground">{unit}</span>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap min-h-[1.25rem]">
        {trend && trendLabel && (
          <span
            className={[
              "inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-md",
              trend === "up"
                ? "text-brand-success bg-brand-success-muted"
                : "text-brand-danger bg-brand-danger-muted",
            ].join(" ")}
          >
            {trend === "up" ? (
              <TrendingUp className="w-3 h-3" aria-hidden="true" />
            ) : (
              <TrendingDown className="w-3 h-3" aria-hidden="true" />
            )}
            {trendLabel}
          </span>
        )}
        {sublabel && (
          <span className="text-[11px] text-muted-foreground truncate" title={sublabel}>
            {sublabel}
          </span>
        )}
      </div>
    </motion.div>
  );
});

export function KpiCardSkeleton() {
  return (
    <div className="bg-surface-raised rounded-xl border border-border p-5 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-2.5 bg-muted rounded w-20" />
        <div className="w-7 h-7 bg-muted rounded-lg" />
      </div>
      <div className="h-7 bg-muted rounded w-24 mb-2.5" />
      <div className="h-2.5 bg-muted rounded w-32" />
    </div>
  );
}
