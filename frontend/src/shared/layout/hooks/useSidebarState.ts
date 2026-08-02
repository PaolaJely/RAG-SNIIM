/**
 * Encapsulates all sidebar state: expanded/collapsed preference
 * (persisted to localStorage) and the mobile drawer open state.
 *
 * Extracted from Layout so the component only describes structure,
 * not state management.
 */

import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router";

const STORAGE_KEY = "sniim-sidebar";

function readPref(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "collapsed";
  } catch {
    return true;
  }
}

function writePref(expanded: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, expanded ? "expanded" : "collapsed");
  } catch {}
}

export interface SidebarState {
  expanded: boolean;
  mobileOpen: boolean;
  toggleExpanded: () => void;
  openMobile: () => void;
  closeMobile: () => void;
}

export function useSidebarState(): SidebarState {
  const [expanded, setExpanded] = useState<boolean>(readPref);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    writePref(expanded);
  }, [expanded]);

  const toggleExpanded = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const openMobile = useCallback(() => setMobileOpen(true), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return { expanded, mobileOpen, toggleExpanded, openMobile, closeMobile };
}
