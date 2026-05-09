import { useState } from "react";
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from "recharts";
import { useApi } from "../hooks/useApi";
import { useFilter } from "../context/FilterContext";

interface MonthData {
  month: string;
  precio_frec: number;
  precio_min: number | null;
  precio_max: number | null;
}

type Granularity = "month" | "quarter";

const MONTH_NAMES: Record<string, string> = {
  Ene: "Enero", Feb: "Febrero", Mar: "Marzo", Abr: "Abril",
  May: "Mayo", Jun: "Junio", Jul: "Julio", Ago: "Agosto",
  Sep: "Septiembre", Oct: "Octubre", Nov: "Noviembre", Dic: "Diciembre",
};

function toQuarterly(data: MonthData[]): MonthData[] {
  const quarters = [
    { label: "Q1", months: ["Ene", "Feb", "Mar"] },
    { label: "Q2", months: ["Abr", "May", "Jun"] },
    { label: "Q3", months: ["Jul", "Ago", "Sep"] },
    { label: "Q4", months: ["Oct", "Nov", "Dic"] },
  ];
  return quarters.map(({ label, months }) => {
    const rows = data.filter((d) => months.includes(d.month));
    if (!rows.length) return { month: label, precio_frec: 0, precio_min: null, precio_max: null };
    return {
      month: label,
      precio_frec: +(rows.reduce((s, r) => s + r.precio_frec, 0) / rows.length).toFixed(2),
      precio_min: +(Math.min(...rows.map((r) => r.precio_min ?? Infinity))).toFixed(2),
      precio_max: +(Math.max(...rows.map((r) => r.precio_max ?? -Infinity))).toFixed(2),
    };
  }).filter((r) => r.precio_frec > 0);
}

export function PriceTrendChart() {
  const [granularity, setGranularity] = useState<Granularity>("month");
  const { selectedDestino } = useFilter();
  const params = selectedDestino ? { destino: selectedDestino } : undefined;
  const { data: monthly, loading } = useApi<MonthData[]>("/api/precios/mensual", params);

  const data = !monthly ? [] : granularity === "quarter" ? toQuarterly(monthly) : monthly;

  const peakRow = data.reduce(
    (best, row) => (row.precio_frec > (best?.precio_frec ?? 0) ? row : best),
    null as MonthData | null
  );

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 w-full" style={{ height: "340px" }}>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-[#1B4F72] mb-1">Evolución de Precios 2025</h3>
          <p className="text-sm text-gray-500">Precio frecuente con rango mín/máximo (MXN/kg)</p>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(["month", "quarter"] as Granularity[]).map((g) => (
            <button
              key={g}
              onClick={() => setGranularity(g)}
              className={`px-4 py-1.5 rounded-md text-sm transition-colors ${
                granularity === g ? "bg-[#1B4F72] text-white" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {g === "month" ? "Mes" : "Trimestre"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
          Cargando datos...
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorRange" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1B4F72" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#1B4F72" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis dataKey="month" stroke="#6b7280" tick={{ fill: "#6b7280", fontSize: 12 }} tickLine={false} />
            <YAxis stroke="#6b7280" tick={{ fill: "#6b7280", fontSize: 12 }} tickLine={false} tickFormatter={(v) => `$${v}`} domain={[0, "auto"]} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as MonthData;
                return (
                  <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                    <p className="text-sm text-gray-600 mb-1">
                      {MONTH_NAMES[d.month] ?? d.month} 2025
                    </p>
                    <p className="text-sm text-[#1B4F72]">Frec: ${d.precio_frec}/kg</p>
                    <p className="text-xs text-gray-500">
                      Rango: ${d.precio_min}–${d.precio_max}/kg
                    </p>
                  </div>
                );
              }}
            />
            <Area type="monotone" dataKey="precio_max" stroke="none" fill="url(#colorRange)" fillOpacity={1} />
            <Area type="monotone" dataKey="precio_min" stroke="none" fill="#ffffff" fillOpacity={1} />
            <Line type="monotone" dataKey="precio_min" stroke="#9ca3af" strokeWidth={1} strokeDasharray="5 5" dot={false} />
            <Line type="monotone" dataKey="precio_max" stroke="#9ca3af" strokeWidth={1} strokeDasharray="5 5" dot={false} />
            <Line type="monotone" dataKey="precio_frec" stroke="#1B4F72" strokeWidth={2.5} dot={false} />
            {peakRow && (
              <ReferenceDot
                x={peakRow.month}
                y={peakRow.precio_frec}
                r={5}
                fill="#F4D03F"
                stroke="#1B4F72"
                strokeWidth={2}
                label={{ value: `Pico: $${peakRow.precio_frec}`, position: "top", fill: "#1B4F72", fontSize: 11, offset: 8 }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
