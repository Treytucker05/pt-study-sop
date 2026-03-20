const target = process.argv[2] || "command";

const messages = {
  dev: [
    "PT Study SOP blocks `npm run dev`.",
    "Do not start Vite for this repo.",
    "Use C:\\pt-study-sop\\Start_Dashboard.bat for the live dashboard.",
    "If you need a fresh frontend bundle, run `npm run build` in `dashboard_rebuild`,",
    "then relaunch from Start_Dashboard.bat on http://127.0.0.1:5000.",
  ],
  "dev:client": [
    "PT Study SOP blocks `npm run dev:client`.",
    "Do not start Vite for this repo.",
    "Use C:\\pt-study-sop\\Start_Dashboard.bat for the live dashboard.",
    "The canonical review surface is http://127.0.0.1:5000, not port 3000.",
  ],
  start: [
    "PT Study SOP blocks `npm start` for vite preview.",
    "Do not use a preview/dev server for this repo.",
    "Use C:\\pt-study-sop\\Start_Dashboard.bat for the live dashboard.",
  ],
};

const lines = messages[target] || [
  "PT Study SOP blocks this entrypoint.",
  "Use C:\\pt-study-sop\\Start_Dashboard.bat for the live dashboard.",
];

for (const line of lines) {
  console.error(line);
}

process.exit(1);
