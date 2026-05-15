import { memo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sidebar } from "./Sidebar";

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * Full-screen mobile navigation: dimmed backdrop overlay + slide-in panel.
 * Hidden on lg+ breakpoints via Tailwind; the desktop sidebar handles those.
 */
export const MobileSidebar = memo(function MobileSidebar({ open, onClose }: Props) {
  return (
    <>
      {/* Backdrop — tapping it closes the sidebar */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="mobile-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-20 lg:hidden"
            onClick={onClose}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Sliding panel */}
      <motion.div
        initial={{ x: "-100%" }}
        animate={{ x: open ? "0%" : "-100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        className="fixed inset-y-0 left-0 z-30 w-56 bg-brand-sidebar flex flex-col lg:hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Navegación móvil"
      >
        <Sidebar expanded={true} onToggle={onClose} />
      </motion.div>
    </>
  );
});
