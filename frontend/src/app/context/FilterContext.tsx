import { createContext, useContext, useState } from "react";

interface FilterContextValue {
  selectedDestino: string;
  setSelectedDestino: (d: string) => void;
}

const FilterContext = createContext<FilterContextValue>({
  selectedDestino: "",
  setSelectedDestino: () => {},
});

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [selectedDestino, setSelectedDestino] = useState("");
  return (
    <FilterContext.Provider value={{ selectedDestino, setSelectedDestino }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilter() {
  return useContext(FilterContext);
}
