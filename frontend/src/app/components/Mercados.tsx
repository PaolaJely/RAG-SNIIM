import { MapPin, Search, Filter } from "lucide-react";
import { useState } from "react";
import { useApi } from "../hooks/useApi";
import { useFilter } from "../context/FilterContext";

interface Mercado {
  nombre: string;
  precio_promedio: number;
  precio_min: number | null;
  precio_max: number | null;
  registros: number;
}

export function Mercados() {
  const { selectedDestino } = useFilter();
  const params = selectedDestino ? { destino: selectedDestino } : undefined;
  const { data: mercados, loading } = useApi<Mercado[]>("/api/mercados", params);
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = (mercados ?? []).filter((m) =>
    m.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-[#1B4F72] mb-2">Directorio de Mercados</h2>
        <p className="text-gray-600">
          Explora precios del plátano Tabasco en mercados de abastos de todo México
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar mercado o ciudad..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4F72]"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-3" />
              <div className="h-4 bg-gray-100 rounded w-1/2 mb-4" />
              <div className="space-y-2">
                <div className="h-3 bg-gray-100 rounded" />
                <div className="h-3 bg-gray-100 rounded w-4/5" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="mb-4 text-sm text-gray-600">
            Mostrando {filtered.length} de {mercados?.length ?? 0} mercados
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((mercado) => (
              <div
                key={mercado.nombre}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6"
              >
                <div className="flex items-start gap-2 mb-3">
                  <MapPin className="w-4 h-4 text-[#1B4F72] mt-1 shrink-0" />
                  <h4 className="text-[#1B4F72] leading-snug">{mercado.nombre}</h4>
                </div>

                <div className="space-y-2 mt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Precio promedio:</span>
                    <span className="text-[#1B4F72] font-medium">${mercado.precio_promedio.toFixed(2)} MXN/kg</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Rango:</span>
                    <span className="text-sm">${mercado.precio_min?.toFixed(2) ?? "—"} – ${mercado.precio_max?.toFixed(2) ?? "—"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Registros:</span>
                    <span className="px-2 py-0.5 bg-[#F4D03F]/20 text-[#1B4F72] rounded text-sm">
                      {mercado.registros}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <p className="text-gray-500">No se encontraron mercados con esa búsqueda</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
