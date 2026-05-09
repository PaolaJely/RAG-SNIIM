import { Outlet, NavLink, useLocation } from "react-router";
import {
  BarChart3,
  Map,
  MessageSquare,
  Settings,
  Calendar,
  ChevronDown,
  Moon,
  Sun,
  X,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useTheme } from "next-themes";
import { useApi } from "../hooks/useApi";
import { useFilter } from "../context/FilterContext";

interface Mercado {
  nombre: string;
  precio_promedio: number;
}

const PAGE_TITLE: Record<string, string> = {
  "/": "Dashboard de Precios",
  "/mercados": "Mercados y Destinos",
  "/chat-ia": "Asistente Inteligente",
};

export function Layout() {
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const { selectedDestino, setSelectedDestino } = useFilter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: mercados } = useApi<Mercado[]>("/api/mercados");

  const destinos = mercados?.map((m) => m.nombre) ?? [];
  const filtered = destinos.filter((d) =>
    d.toLowerCase().includes(search.toLowerCase())
  );

  // Cierra el dropdown al hacer click fuera
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const currentTitle = PAGE_TITLE[location.pathname] ?? "Dashboard";
  const isDark = theme === "dark";

  return (
    <div className="flex h-screen bg-[#F8F9FA]">
      {/* Sidebar */}
      <aside className="w-60 bg-[#1A252F] flex flex-col">
        <div className="px-6 py-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🍌</span>
            <div className="flex flex-col">
              <span className="text-white font-semibold">SNIIM</span>
              <span className="text-[#F4D03F] text-xs">Plátano</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-6 space-y-1">
          {[
            { to: "/", end: true, icon: BarChart3, label: "Dashboard" },
            { to: "/mercados", end: false, icon: Map, label: "Mercados" },
            { to: "/chat-ia", end: false, icon: MessageSquare, label: "Chat IA" },
            { to: "/configuracion", end: false, icon: Settings, label: "Configuración" },
          ].map(({ to, end, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center px-3 py-2.5 rounded-md transition-colors relative ${
                  isActive
                    ? "text-[#F4D03F] bg-white/5"
                    : "text-gray-300 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#F4D03F] rounded-r" />}
                  <Icon className="w-5 h-5 ml-1" />
                  <span className="ml-3">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="px-6 py-4 border-t border-white/10">
          <p className="text-xs text-gray-500">Datos 2025 · 6,086 registros</p>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 gap-4">
          <h1 className="text-[#1B4F72] font-semibold shrink-0">{currentTitle}</h1>

          {/* Date range (informativo) */}
          <div className="hidden md:flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span>01 Ene 2025 — 31 Dic 2025</span>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            {/* Dropdown destinos */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen((o) => !o)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:border-[#1B4F72] transition-colors text-sm text-gray-700 bg-white min-w-[180px]"
              >
                <span className="flex-1 text-left truncate">
                  {selectedDestino || "Todos los destinos"}
                </span>
                {selectedDestino ? (
                  <X
                    className="w-3.5 h-3.5 text-gray-400 hover:text-gray-700 shrink-0"
                    onClick={(e) => { e.stopPropagation(); setSelectedDestino(""); }}
                  />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                )}
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-1 w-72 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
                  <div className="p-2 border-b border-gray-100">
                    <input
                      autoFocus
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Buscar destino..."
                      className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4F72]"
                    />
                  </div>
                  <ul className="max-h-60 overflow-y-auto py-1">
                    <li>
                      <button
                        onClick={() => { setSelectedDestino(""); setDropdownOpen(false); setSearch(""); }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${!selectedDestino ? "text-[#1B4F72] font-medium" : "text-gray-700"}`}
                      >
                        Todos los destinos
                      </button>
                    </li>
                    {filtered.map((d) => (
                      <li key={d}>
                        <button
                          onClick={() => { setSelectedDestino(d); setDropdownOpen(false); setSearch(""); }}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${selectedDestino === d ? "text-[#1B4F72] font-medium bg-blue-50" : "text-gray-700"}`}
                        >
                          {d}
                        </button>
                      </li>
                    ))}
                    {filtered.length === 0 && (
                      <li className="px-4 py-3 text-sm text-gray-400 text-center">Sin resultados</li>
                    )}
                  </ul>
                </div>
              )}
            </div>

            {/* Dark mode toggle */}
            <button
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
              aria-label="Cambiar tema"
              title={isDark ? "Modo claro" : "Modo oscuro"}
            >
              {isDark ? (
                <Sun className="w-5 h-5 text-yellow-500" />
              ) : (
                <Moon className="w-5 h-5 text-gray-500" />
              )}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
