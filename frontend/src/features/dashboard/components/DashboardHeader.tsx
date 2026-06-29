import { motion } from "motion/react";
import { getDayGreeting, formatLongDate } from "../../../lib/format";
import { useFilterStore } from "../../../stores/filterStore.tsx";

export function DashboardHeader() {
  const { destinos, source } = useFilterStore();
  const sourceLabel = {
    sniim: "SNIIM",
    local: "Productores locales",
    all: "SNIIM + productores locales",
  }[source];

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      className="flex flex-col sm:flex-row sm:items-end justify-between gap-2"
    >
      <div>
        <h1 className="text-lg font-semibold text-foreground">
          {getDayGreeting()}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5 capitalize">
          {formatLongDate()}
          {destinos.length > 0 && (
            <>
              {" · "}
              <span className="text-brand font-medium">
                {destinos.length === 1
                  ? destinos[0]
                  : `${destinos.length} mercados comparados`}
              </span>
            </>
          )}
        </p>
      </div>
      <p className="text-xs text-muted-foreground shrink-0">
        {source === "local" ? "Datos importados" : "Precios del plátano Tabasco"}
        {" · "}
        {sourceLabel}
      </p>
    </motion.div>
  );
}
