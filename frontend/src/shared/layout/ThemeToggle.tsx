import { Moon, Sun } from "lucide-react";
import { memo } from "react";
import { useTheme } from "next-themes";

/**
 * Icon button that cycles between light and dark themes.
 * Memoized: only re-renders when the active theme changes.
 */
export const ThemeToggle = memo(function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
      aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
    >
      {isDark
        ? <Sun  className="w-3.5 h-3.5" aria-hidden="true" />
        : <Moon className="w-3.5 h-3.5" aria-hidden="true" />}
    </button>
  );
});
