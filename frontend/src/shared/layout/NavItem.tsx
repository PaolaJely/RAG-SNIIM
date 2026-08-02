import { NavLink } from "react-router";
import { memo } from "react";
import type { LucideIcon } from "lucide-react";

export interface NavItemConfig {
  to: string;
  end: boolean;
  icon: LucideIcon;
  label: string;
  hint: string;
  disabled?: boolean;
}

interface Props extends NavItemConfig {
  expanded: boolean;
}

// ─── Sub-pieces ──────────────────────────────────────────────────────────────

function ActiveIndicator() {
  return (
    <span
      className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-brand-accent rounded-r"
      aria-hidden="true"
    />
  );
}

function CollapsedTooltip({ label, hint }: { label: string; hint: string }) {
  return (
    <span
      role="tooltip"
      className="absolute left-full ml-3 px-2.5 py-1.5 bg-popover border border-border text-foreground text-xs font-medium rounded-lg whitespace-nowrap shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-opacity duration-150"
    >
      {label}
      <span className="ml-1.5 text-muted-foreground font-mono text-[10px]">{hint}</span>
    </span>
  );
}

// ─── Disabled state ───────────────────────────────────────────────────────────

function DisabledNavItem({
  icon: Icon,
  label,
  hint,
  expanded,
}: Pick<Props, "icon" | "label" | "hint" | "expanded">) {
  return (
    <div
      className={[
        "group relative flex items-center rounded-lg text-sm opacity-40 cursor-not-allowed select-none",
        expanded ? "gap-3 px-3 py-2" : "justify-center py-2.5",
        "text-white/35",
      ].join(" ")}
      aria-disabled="true"
      title={`${label} (próximamente)`}
    >
      <Icon className="w-4 h-4 shrink-0 text-white/35" aria-hidden="true" />
      {expanded && (
        <>
          <span className="flex-1 font-medium leading-none">{label}</span>
          <span className="border border-white/15 text-white/25 text-[9px] font-medium px-1 py-0.5 rounded">
            Soon
          </span>
        </>
      )}
      {!expanded && <CollapsedTooltip label={label} hint={hint} />}
    </div>
  );
}

// ─── Active/inactive link ────────────────────────────────────────────────────

function ActiveNavItem({
  to,
  end,
  icon: Icon,
  label,
  hint,
  expanded,
}: Omit<Props, "disabled">) {
  return (
    <NavLink
      to={to}
      end={end}
      aria-label={label}
      className={({ isActive }) =>
        [
          "group relative flex items-center rounded-lg transition-colors duration-150 text-sm",
          expanded ? "gap-3 px-3 py-2" : "justify-center py-2.5",
          isActive
            ? "bg-white/10 text-white"
            : "text-white/50 hover:bg-white/6 hover:text-white/85",
        ].join(" ")
      }
    >
      {({ isActive }) => (
        <>
          {isActive && expanded && <ActiveIndicator />}
          <Icon
            className={[
              "w-4 h-4 shrink-0 transition-colors",
              isActive ? "text-brand-accent" : "text-white/35 group-hover:text-white/70",
            ].join(" ")}
            aria-hidden="true"
          />
          {expanded && (
            <>
              <span className="flex-1 font-medium leading-none">{label}</span>
              <span className="text-[10px] font-mono text-white/15 group-hover:text-white/30 transition-colors">
                {hint}
              </span>
            </>
          )}
          {!expanded && <CollapsedTooltip label={label} hint={hint} />}
        </>
      )}
    </NavLink>
  );
}

// ─── Public component ────────────────────────────────────────────────────────

/**
 * Individual sidebar navigation item.
 *
 * When `disabled` is true renders a non-interactive placeholder with a
 * "Soon" badge instead of navigating (fixes the broken /configuracion route).
 */
export const NavItem = memo(function NavItem(props: Props) {
  return props.disabled
    ? <DisabledNavItem {...props} />
    : <ActiveNavItem {...props} />;
});
