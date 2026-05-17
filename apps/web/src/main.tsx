import React from "react";
import ReactDOM from "react-dom/client";
import "./styles/globals.css";
import "./i18n";
import { App } from "./app/App";
import { PromptDeskQueryProvider } from "./lib/query";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <PromptDeskQueryProvider>
      <App />
    </PromptDeskQueryProvider>
  </React.StrictMode>
);
