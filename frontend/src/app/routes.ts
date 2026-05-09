import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { Dashboard } from "./components/Dashboard";
import { Mercados } from "./components/Mercados";
import { ChatIA } from "./components/ChatIA";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Dashboard },
      { path: "mercados", Component: Mercados },
      { path: "chat-ia", Component: ChatIA },
    ],
  },
]);
