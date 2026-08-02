import { useState } from "react";
import { motion } from "motion/react";
import { getDayGreeting, formatLongDate } from "../../../lib/format";
import { useFilterStore } from "../../../stores/filterStore.tsx";
import { postJson } from "../../../services/api";

export function DashboardHeader() {
  const { destinos, source } = useFilterStore();
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const sourceLabel = {
    sniim: "SNIIM",
    local: "Productores locales",
    all: "SNIIM + productores locales",
  }[source];

  async function handleActualizar() {
    setCargando(true);
    setMensaje(null);
    try {
      await postJson("/api/actualizar", {});
      setMensaje("Datos actualizados correctamente.");
    } catch {
      setMensaje("Error al actualizar. Intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  }

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
        {mensaje !== "" && (
          <p className="text-xs mt-1 text-muted-foreground">{mensaje}</p>
          )}
      </div>
      <div className="flex items-center gap-3">
        <p className="text-xs text-muted-foreground shrink-0">
          {source === "local" ? "Datos importados" : "Precios del plátano Tabasco"}
          {" · "}
          {sourceLabel}
        </p>
        <button
          onClick={handleActualizar}
          disabled={cargando}
          className="text-xs px-3 py-1.5 rounded-md bg-brand text-white disabled:opacity-50 shrink-0"
        >
          {cargando ? "Actualizando..." : "Actualizar datos"}
        </button>
      </div>
    </motion.div>
  );
}