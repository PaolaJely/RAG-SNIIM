import React from "react";
import ReactDOM from "react-dom/client";
import { ThemeProvider } from "next-themes";
import { FilterStoreProvider } from "./stores/filterStore.tsx";
import App from "./app/App";
import "./styles/index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <FilterStoreProvider>
        <App />
      </FilterStoreProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
