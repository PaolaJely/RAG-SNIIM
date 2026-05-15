import { ChevronDown, X } from "lucide-react";
import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useFetch } from "../../lib/useFetch";
import { getMarketsMinimal } from "../../services/marketService";
import { useFilterStore } from "../../stores/filterStore";

export function DestinationFilter() {
  const { destino, setDestino, clearDestino } = useFilterStore();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const { data: markets } = useFetch(getMarketsMinimal, [], "markets:minimal");

  // Memoize derived arrays so they don't re-allocate when destino changes
  // (Context value update) but markets data hasn't changed.
  const names = useMemo(
    () => markets?.map((m) => m.nombre) ?? [],
    [markets],
  );

  const filtered = useMemo(
    () => names.filter((n) => n.toLowerCase().includes(search.toLowerCase())),
    [names, search],
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Filtrar por destino"
        className={[
          "flex items-center gap-1.5 h-8 px-3 rounded-lg border text-xs font-medium transition-all duration-150",
          "bg-surface-raised text-foreground/75 hover:text-foreground max-w-[200px]",
          open
            ? "border-brand/40 ring-1 ring-brand/15 text-foreground"
            : "border-border hover:border-border/80",
        ].join(" ")}
      >
        <span className="truncate">{destino || "Todos los destinos"}</span>
        {destino ? (
          <X
            className="w-3 h-3 text-muted-foreground hover:text-foreground shrink-0"
            onClick={(e) => { e.stopPropagation(); clearDestino(); }}
            aria-label="Limpiar filtro"
          />
        ) : (
          <ChevronDown
            className={`w-3 h-3 text-muted-foreground shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            role="listbox"
            aria-label="Seleccionar destino"
            className="absolute right-0 top-full mt-1.5 w-72 bg-surface-raised border border-border rounded-xl shadow-xl z-50 overflow-hidden"
          >
            <div className="p-2 border-b border-border">
              <input
                autoFocus
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar destino..."
                aria-label="Buscar destino"
                className="w-full px-3 py-1.5 text-sm rounded-lg bg-surface border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand/30 focus:border-brand/40 transition-all"
              />
            </div>
            <ul className="max-h-56 overflow-y-auto py-1" role="group">
              <li role="option" aria-selected={!destino}>
                <button
                  onClick={() => { clearDestino(); setOpen(false); setSearch(""); }}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${!destino ? "text-brand font-medium bg-brand-muted/40" : "text-foreground hover:bg-muted"}`}
                >
                  Todos los destinos
                </button>
              </li>
              {filtered.map((n) => (
                <li key={n} role="option" aria-selected={destino === n}>
                  <button
                    onClick={() => { setDestino(n); setOpen(false); setSearch(""); }}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${destino === n ? "text-brand font-medium bg-brand-muted/40" : "text-foreground hover:bg-muted"}`}
                  >
                    {n}
                  </button>
                </li>
              ))}
              {filtered.length === 0 && (
                <li className="px-3 py-4 text-xs text-muted-foreground text-center">Sin resultados</li>
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
