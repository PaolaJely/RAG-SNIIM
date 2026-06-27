import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface FilterState {
  destinos: string[];
  toggleDestino: (destino: string) => void;
  clearDestinos: () => void;
}

const FilterStoreContext = createContext<FilterState | null>(null);

export function FilterStoreProvider({ children }: { children: ReactNode }) {
  const [destinos, setDestinos] = useState<string[]>([]);

  const toggleDestino = useCallback((destino: string) => {
    setDestinos((current) =>
      current.includes(destino)
        ? current.filter((item) => item !== destino)
        : [...current, destino],
    );
  }, []);

  const clearDestinos = useCallback(() => setDestinos([]), []);

  const value = useMemo(
    () => ({ destinos, toggleDestino, clearDestinos }),
    [destinos, toggleDestino, clearDestinos],
  );

  return (
    <FilterStoreContext.Provider value={value}>
      {children}
    </FilterStoreContext.Provider>
  );
}

export function useFilterStore(): FilterState {
  const ctx = useContext(FilterStoreContext);
  if (!ctx) {
    throw new Error("useFilterStore must be used inside FilterStoreProvider");
  }
  return ctx;
}
