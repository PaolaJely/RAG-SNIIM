import {
  createBrowserRouter,
  isRouteErrorResponse,
  useRouteError,
} from "react-router";
import { Layout } from "../shared/layout/Layout";

function RootErrorBoundary() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? error.statusText || `Error ${error.status}`
    : error instanceof Error
      ? error.message
      : "No fue posible cargar esta vista.";

  return (
    <div className="flex h-screen items-center justify-center bg-surface p-6">
      <section
        className="w-full max-w-md rounded-lg border border-border bg-surface-raised p-5 text-center"
        role="alert"
      >
        <h1 className="text-base font-semibold text-foreground">
          Algo salió mal
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      </section>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    ErrorBoundary: RootErrorBoundary,
    children: [
      {
        index: true,
        lazy: async () => {
          const { Dashboard } = await import("../features/dashboard/components/Dashboard");
          return { Component: Dashboard };
        },
      },
      {
        path: "mercados",
        lazy: async () => {
          const { Mercados } = await import("../features/markets/components/Mercados");
          return { Component: Mercados };
        },
      },
      {
        path: "chat-ia",
        lazy: async () => {
          const { ChatIA } = await import("../features/chat/components/ChatIA");
          return { Component: ChatIA };
        },
      },
      {
        path: "importar-datos",
        lazy: async () => {
          const { DataImport } = await import("../features/imports/components/DataImport");
          return { Component: DataImport };
        },
      },
    ],
  },
]);
