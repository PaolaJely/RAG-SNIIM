/**
 * Global destination filter store.
 *
 * Implemented with React Context + useState for zero extra dependencies.
 * Migration path → replace with Zustand `create()` when installed:
 *
 *   export const useFilterStore = create<FilterState>((set) => ({
 *     destino: "",
 *     setDestino: (d) => set({ destino: d }),
 *     clearDestino: () => set({ destino: "" }),
 *   }));
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";

interface FilterState {
  destino: string;
  setDestino: (d: string) => void;
  clearDestino: () => void;
}

const FilterStoreContext = createContext<FilterState | null>(null);

export function FilterStoreProvider({ children }: { children: ReactNode }) {
  const [destino, setDestinoState] = useState("");

  // Stable references: setters never change, so consumers wrapped in
  // React.memo won't re-render when only `destino` value changes.
  const setDestino = useCallback((d: string) => setDestinoState(d), []);
  const clearDestino = useCallback(() => setDestinoState(""), []);

  const value = useMemo(
    () => ({ destino, setDestino, clearDestino }),
    [destino, setDestino, clearDestino],
  );

  return (
    <FilterStoreContext.Provider value={value}>
      {children}
    </FilterStoreContext.Provider>
  );
}

export function useFilterStore(): FilterState {
  const ctx = useContext(FilterStoreContext);
  if (!ctx) throw new Error("useFilterStore must be used inside FilterStoreProvider");
  return ctx;
}
