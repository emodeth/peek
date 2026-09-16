import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { initializeNativeShell } from "./native/tray";
import "./styles.css";

void initializeNativeShell();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
