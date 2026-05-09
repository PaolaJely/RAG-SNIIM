import React from "react";
import ReactDOM from "react-dom/client";
import { ThemeProvider } from "next-themes";
import App from "./app/App";
import { FilterProvider } from "./app/context/FilterContext";
import "./styles/index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <FilterProvider>
        <App />
      </FilterProvider>
    </ThemeProvider>
  </React.StrictMode>
);
