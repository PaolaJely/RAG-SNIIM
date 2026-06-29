import { Database } from "lucide-react";
import {
  useFilterStore,
  type DataSource,
} from "../../stores/filterStore";

const OPTIONS: Array<{ value: DataSource; label: string }> = [
  { value: "sniim", label: "SNIIM" },
  { value: "local", label: "Productores locales" },
  { value: "all", label: "Todos" },
];

export function SourceFilter() {
  const { source, setSource } = useFilterStore();

  return (
    <label className="flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface-raised px-2 text-xs text-foreground/75">
      <Database className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
      <span className="sr-only">Fuente de datos</span>
      <select
        value={source}
        onChange={(event) => setSource(event.target.value as DataSource)}
        className="max-w-24 bg-transparent font-medium outline-none sm:max-w-36"
        aria-label="Fuente de datos"
      >
        {OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
