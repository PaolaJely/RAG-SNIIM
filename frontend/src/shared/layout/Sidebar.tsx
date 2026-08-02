import { BarChart3, FileUp, Map, MessageSquare, Settings, Wheat, ChevronLeft, ChevronRight } from "lucide-react";
import { NavItem } from "./NavItem";
import type { NavItemConfig } from "./NavItem";

// ─── Navigation config ────────────────────────────────────────────────────────
// `disabled: true` renders a non-interactive placeholder instead of a broken link.
// Remove the flag once the route is implemented in routes.tsx.

const NAV_ITEMS: NavItemConfig[] = [
  { to: "/",             end: true,  icon: BarChart3,    label: "Dashboard",     hint: "D" },
  { to: "/mercados",     end: false, icon: Map,          label: "Mercados",      hint: "M" },
  { to: "/chat-ia",      end: false, icon: MessageSquare,label: "Chat IA",       hint: "C" },
  { to: "/importar-datos", end: false, icon: FileUp,      label: "Importar datos",hint: "I" },
  { to: "/configuracion",end: false, icon: Settings,     label: "Configuración", hint: "⚙", disabled: true },
];

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  expanded: boolean;
  onToggle: () => void;
}

export function Sidebar({ expanded, onToggle }: Props) {
  return (
    <>
      {/* Brand logo */}
      <div
        className={[
          "flex items-center h-14 border-b border-white/8 shrink-0 transition-[padding,gap] duration-150",
          expanded ? "px-4 gap-3" : "justify-center",
        ].join(" ")}
      >
        <div className="w-7 h-7 rounded-md bg-brand-accent/15 flex items-center justify-center shrink-0">
          <Wheat className="w-3.5 h-3.5 text-brand-accent" aria-hidden="true" />
        </div>
        {expanded && (
          <div className="overflow-hidden">
            <p className="text-white text-[13px] font-semibold leading-none tracking-tight">SNIIM</p>
            <p className="text-white/30 text-[10px] mt-0.5 leading-none">Precios Agrícolas</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-0.5" aria-label="Menú principal">
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.to} {...item} expanded={expanded} />
        ))}
      </nav>

      {/* Footer — dataset info + expand/collapse toggle */}
      <div className="p-2 border-t border-white/8 space-y-1">
        {expanded && (
          <p className="text-[10px] text-white/20 px-2 pb-1 leading-relaxed">
            Datos 2025 · 6,086 registros
          </p>
        )}
        <button
          type="button"
          onClick={onToggle}
          aria-label={expanded ? "Contraer menú" : "Expandir menú"}
          className="w-full flex items-center justify-center py-2 rounded-lg text-white/25 hover:text-white/55 hover:bg-white/5 transition-colors duration-150"
        >
          {expanded
            ? <ChevronLeft  className="w-4 h-4" aria-hidden="true" />
            : <ChevronRight className="w-4 h-4" aria-hidden="true" />}
        </button>
      </div>
    </>
  );
}
