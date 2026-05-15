import { Search, PackageSearch } from "lucide-react";
import { useState, useMemo } from "react";
import { motion } from "motion/react";
import { MercadoCard, MercadoCardSkeleton } from "./MercadoCard";
import { useMarkets } from "../hooks/useMarkets";

export function Mercados() {
  const { data: markets, loading } = useMarkets();
  const [searchTerm, setSearchTerm] = useState("");

  // Recompute only when markets data or search term changes,
  // not on every keystroke-unrelated re-render.
  const filtered = useMemo(
    () =>
      (markets ?? []).filter((m) =>
        m.nombre.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    [markets, searchTerm],
  );

  const { globalMin, globalMax } = useMemo(() => {
    if (!filtered.length) return { globalMin: 0, globalMax: 1 };
    let min = Infinity;
    let max = -Infinity;
    for (const m of filtered) {
      if (m.precio_promedio < min) min = m.precio_promedio;
      if (m.precio_promedio > max) max = m.precio_promedio;
    }
    return { globalMin: min, globalMax: max };
  }, [filtered]);

  return (
    <div className="p-5 lg:p-7 xl:p-8 space-y-6 max-w-[1600px] mx-auto">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Directorio de Mercados
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Precios del plátano Tabasco en mercados de abastos de todo México
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
          aria-hidden="true"
        />
        <input
          type="search"
          placeholder="Buscar mercado o ciudad..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label="Buscar mercado"
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-surface-raised text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand/30 focus:border-brand/40 transition-all"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <MercadoCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground" aria-live="polite">
            Mostrando{" "}
            <span className="font-semibold text-foreground">{filtered.length}</span>
            {" "}de{" "}
            <span className="font-semibold text-foreground">{markets?.length ?? 0}</span>
            {" "}mercados
          </p>

          {filtered.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((market, i) => (
                <MercadoCard
                  key={market.nombre}
                  market={market}
                  index={i}
                  globalMin={globalMin}
                  globalMax={globalMax}
                />
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20 text-center"
              role="status"
            >
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <PackageSearch className="w-7 h-7 text-muted-foreground" aria-hidden="true" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">Sin resultados</p>
              <p className="text-xs text-muted-foreground">
                No hay mercados que coincidan con &ldquo;{searchTerm}&rdquo;
              </p>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
