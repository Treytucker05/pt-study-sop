import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../src/styles/theme.css";
import "../src/styles/hud-components.css";
import "./theme-lab.css";
import { ThemeLabPreview } from "./ThemeLabPreview";

const el = document.getElementById("theme-lab-wrapper-root");
if (el) {
  createRoot(el).render(
    <StrictMode>
      <ThemeLabPreview />
    </StrictMode>,
  );
}
