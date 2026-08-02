import { Check, ChevronDown, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useFetch } from "../../lib/useFetch";
import { getMarketsMinimal } from "../../services/marketService";
import { useFilterStore } from "../../stores/filterStore";

export function DestinationFilter() {
  const { destinos, source, toggleDestino, clearDestinos } = useFilterStore();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const fetchMarkets = useCallback(
    () => getMarketsMinimal(undefined, source),
    [source],
  );
  const { data: markets } = useFetch(
    fetchMarkets,
    [source],
    `markets:minimal:${source}`,
  );

  const names = useMemo(
    () => markets?.map((market) => market.nombre) ?? [],
    [markets],
  );
  const filtered = useMemo(
    () =>
      names.filter((name) =>
        name.toLowerCase().includes(search.trim().toLowerCase()),
      ),
    [names, search],
  );
  const selectedDestinos = useMemo(() => new Set(destinos), [destinos]);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  const label =
    destinos.length === 0
      ? "Todos los mercados"
      : destinos.length === 1
        ? destinos[0]
        : `${destinos.length} mercados`;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Seleccionar mercados para comparar"
        className={[
          "flex h-8 max-w-[130px] items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors duration-150 sm:max-w-[220px]",
          "bg-surface-raised text-foreground/75 hover:text-foreground",
          open
            ? "border-brand/40 text-foreground ring-1 ring-brand/15"
            : "border-border hover:border-border/80",
        ].join(" ")}
      >
        <span className="truncate">{label}</span>
        {destinos.length > 0 ? (
          <span className="rounded-full bg-brand px-1.5 py-0.5 text-[10px] leading-none text-brand-foreground">
            {destinos.length}
          </span>
        ) : null}
        <ChevronDown
          className={`h-3 w-3 shrink-0 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full z-50 mt-1.5 w-80 overflow-hidden rounded-xl border border-border bg-surface-raised shadow-xl"
          >
            <div className="border-b border-border p-2">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar mercado..."
                aria-label="Buscar mercado"
                className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand/40 focus:outline-none focus:ring-1 focus:ring-brand/30"
              />
            </div>

            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <p className="text-[11px] text-muted-foreground">
                {destinos.length
                  ? `${destinos.length} seleccionados`
                  : "Comparando todos los mercados"}
              </p>
              {destinos.length > 0 && (
                <button
                  type="button"
                  onClick={clearDestinos}
                  className="flex items-center gap-1 text-[11px] font-medium text-brand hover:underline"
                >
                  <X className="h-3 w-3" /> Limpiar
                </button>
              )}
            </div>

            <ul
              className="max-h-64 overflow-y-auto py-1"
              role="listbox"
              aria-label="Mercados para comparar"
              aria-multiselectable="true"
            >
              {filtered.map((name) => {
                const selected = selectedDestinos.has(name);
                return (
                  <li key={name}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => toggleDestino(name)}
                      className={[
                        "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors",
                        selected
                          ? "bg-brand-muted/40 font-medium text-brand"
                          : "text-foreground hover:bg-muted",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                          selected
                            ? "border-brand bg-brand text-brand-foreground"
                            : "border-border bg-surface",
                        ].join(" ")}
                        aria-hidden="true"
                      >
                        {selected && <Check className="h-3 w-3" />}
                      </span>
                      <span className="truncate">{name}</span>
                    </button>
                  </li>
                );
              })}
              {filtered.length === 0 && (
                <li className="px-3 py-5 text-center text-xs text-muted-foreground">
                  Sin mercados coincidentes
                </li>
              )}
            </ul>

            <div className="border-t border-border bg-surface-secondary px-3 py-2 text-[10px] text-muted-foreground">
              Marca dos o más mercados para comparar sus datos.
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
