import { createBrowserRouter } from "react-router";
import { lazy } from "react";
import { Layout } from "../shared/layout/Layout";

// Route-level code splitting: each page becomes its own JS chunk.
// The browser only downloads the code for the current route, reducing
// initial bundle from ~827 kB to separate chunks loaded on demand.
const Dashboard = lazy(() =>
  import("../features/dashboard/components/Dashboard").then((m) => ({ default: m.Dashboard })),
);
const Mercados = lazy(() =>
  import("../features/markets/components/Mercados").then((m) => ({ default: m.Mercados })),
);
const ChatIA = lazy(() =>
  import("../features/chat/components/ChatIA").then((m) => ({ default: m.ChatIA })),
);
const DataImport = lazy(() =>
  import("../features/imports/components/DataImport").then((m) => ({ default: m.DataImport })),
);

export { Dashboard, Mercados, ChatIA, DataImport };

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Dashboard },
      { path: "mercados", Component: Mercados },
      { path: "chat-ia", Component: ChatIA },
      { path: "importar-datos", Component: DataImport },
    ],
  },
]);
