import { Outlet } from "react-router";
import { Suspense } from "react";
import { motion } from "motion/react";
import { useSidebarState } from "./hooks/useSidebarState";
import { Sidebar } from "./Sidebar";
import { AppHeader } from "./AppHeader";
import { MobileSidebar } from "./MobileSidebar";
import { PageSkeleton } from "./PageSkeleton";

export function Layout() {
  const { expanded, mobileOpen, toggleExpanded, openMobile, closeMobile } =
    useSidebarState();

  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      {/* Mobile: full-screen drawer (hidden on lg+) */}
      <MobileSidebar open={mobileOpen} onClose={closeMobile} />

      {/* Desktop: animated collapsible sidebar (hidden on <lg) */}
      <motion.aside
        layout
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className={[
          "hidden lg:flex flex-col bg-brand-sidebar shrink-0 overflow-hidden",
          expanded ? "w-56" : "w-14",
        ].join(" ")}
        aria-label="Navegación principal"
      >
        <Sidebar expanded={expanded} onToggle={toggleExpanded} />
      </motion.aside>

      {/* Content area */}
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader onMenuClick={openMobile} />
        <main className="flex-1 overflow-auto" id="main-content" tabIndex={-1}>
          <Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
