import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { installRuntimeNoiseFilter } from "./lib/runtime-noise-filter";

installRuntimeNoiseFilter();

createRoot(document.getElementById("root")!).render(<App />);
