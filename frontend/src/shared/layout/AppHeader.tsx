import { Menu } from "lucide-react";
import { memo } from "react";
import { DestinationFilter } from "./DestinationFilter";
import { ThemeToggle } from "./ThemeToggle";

interface Props {
  onMenuClick: () => void;
}

/**
 * Top application bar: mobile hamburger, destination filter, theme toggle.
 * Memoized so it doesn't re-render when only the sidebar expanded state changes.
 */
export const AppHeader = memo(function AppHeader({ onMenuClick }: Props) {
  return (
    <header
      className="h-14 bg-surface-raised border-b border-border flex items-center px-4 lg:px-5 gap-3 shrink-0"
    >
      <button
        type="button"
        className="lg:hidden p-2 -ml-1 rounded-lg hover:bg-muted transition-colors text-foreground/60 hover:text-foreground"
        onClick={onMenuClick}
        aria-label="Abrir menú"
        aria-haspopup="dialog"
      >
        <Menu className="w-4 h-4" aria-hidden="true" />
      </button>

      <div className="flex-1" aria-hidden="true" />

      <div className="flex items-center gap-1.5">
        <DestinationFilter />
        <div className="w-px h-5 bg-border" aria-hidden="true" />
        <ThemeToggle />
      </div>
    </header>
  );
});
