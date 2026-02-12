import type { ExcalidrawElementSkeleton } from "@excalidraw/excalidraw/data/transform";

export interface LayoutTemplate {
  id: string;
  name: string;
  description: string;
  createElements: () => ExcalidrawElementSkeleton[];
}

function rect(
  x: number, y: number, w: number, h: number,
  opts: Partial<ExcalidrawElementSkeleton> = {}
): ExcalidrawElementSkeleton {
  return {
    type: "rectangle",
    x, y,
    width: w,
    height: h,
    strokeColor: "#ff0000",
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 2,
    roughness: 1,
    ...opts,
  } as ExcalidrawElementSkeleton;
}

function text(
  x: number, y: number, content: string,
  opts: Partial<ExcalidrawElementSkeleton> = {}
): ExcalidrawElementSkeleton {
  return {
    type: "text",
    x, y,
    text: content,
    fontSize: 20,
    fontFamily: 3,
    strokeColor: "#ff0000",
    ...opts,
  } as ExcalidrawElementSkeleton;
}

function arrow(
  x: number, y: number, points: [number, number][],
  opts: Partial<ExcalidrawElementSkeleton> = {}
): ExcalidrawElementSkeleton {
  return {
    type: "arrow",
    x, y,
    points,
    strokeColor: "#ff0000",
    strokeWidth: 2,
    ...opts,
  } as ExcalidrawElementSkeleton;
}

const blankTemplate: LayoutTemplate = {
  id: "blank",
  name: "BLANK CANVAS",
  description: "Fresh infinite canvas, no structure",
  createElements: () => [],
};

const mindMapTemplate: LayoutTemplate = {
  id: "mindmap",
  name: "MIND MAP",
  description: "Central topic with radiating branches. Auto-seeds from curriculum.",
  createElements: () => [
    rect(350, 250, 300, 100, { strokeColor: "#ff0000", strokeWidth: 3 }),
    text(400, 280, "CENTRAL TOPIC", { fontSize: 24, strokeColor: "#ff0000" }),
    rect(0, 50, 220, 80, { strokeColor: "#3b82f6" }),
    text(30, 75, "Branch 1", { strokeColor: "#3b82f6" }),
    rect(780, 50, 220, 80, { strokeColor: "#22c55e" }),
    text(810, 75, "Branch 2", { strokeColor: "#22c55e" }),
    rect(0, 470, 220, 80, { strokeColor: "#eab308" }),
    text(30, 495, "Branch 3", { strokeColor: "#eab308" }),
    rect(780, 470, 220, 80, { strokeColor: "#a855f7" }),
    text(810, 495, "Branch 4", { strokeColor: "#a855f7" }),
    arrow(220, 90, [[130, 160]], { strokeColor: "#3b82f6" }),
    arrow(780, 90, [[-130, 160]], { strokeColor: "#22c55e" }),
    arrow(220, 510, [[130, -160]], { strokeColor: "#eab308" }),
    arrow(780, 510, [[-130, -160]], { strokeColor: "#a855f7" }),
  ],
};

const flowchartTemplate: LayoutTemplate = {
  id: "flowchart",
  name: "FLOWCHART",
  description: "Top-down structured diagram. Mermaid import auto-lays out nodes.",
  createElements: () => [
    rect(350, 20, 300, 80),
    text(410, 45, "START", { fontSize: 24 }),
    arrow(500, 100, [[0, 60]]),
    rect(300, 180, 200, 70),
    text(330, 200, "Step 1"),
    rect(550, 180, 200, 70),
    text(580, 200, "Step 2"),
    arrow(400, 250, [[0, 60]]),
    arrow(650, 250, [[0, 60]]),
    rect(300, 330, 200, 70),
    text(330, 350, "Process A"),
    rect(550, 330, 200, 70),
    text(580, 350, "Process B"),
    arrow(400, 400, [[100, 60]]),
    arrow(650, 400, [[-100, 60]]),
    rect(350, 480, 300, 80),
    text(420, 505, "END", { fontSize: 24 }),
  ],
};

const cornellNotesTemplate: LayoutTemplate = {
  id: "cornell",
  name: "CORNELL NOTES",
  description: "Left column for cues, right for notes, bottom for summary.",
  createElements: () => [
    rect(0, 0, 300, 500, { strokeColor: "#ff0000" }),
    text(20, 15, "CUES / QUESTIONS", { fontSize: 16, strokeColor: "#ff0000" }),
    rect(320, 0, 680, 500, { strokeColor: "#3b82f6" }),
    text(340, 15, "NOTES", { fontSize: 16, strokeColor: "#3b82f6" }),
    rect(0, 520, 1000, 180, { strokeColor: "#22c55e" }),
    text(20, 535, "SUMMARY", { fontSize: 16, strokeColor: "#22c55e" }),
  ],
};

const anatomyTemplate: LayoutTemplate = {
  id: "anatomy",
  name: "ANATOMY",
  description: "Large image area with labeled regions + annotation sidebar.",
  createElements: () => [
    rect(0, 0, 650, 700, { strokeColor: "#3b82f6", strokeWidth: 3 }),
    text(20, 15, "IMAGE / DIAGRAM", { fontSize: 18, strokeColor: "#3b82f6" }),
    text(180, 320, "[ Paste image here ]", { fontSize: 16, strokeColor: "#666666" }),
    rect(670, 0, 330, 320, { strokeColor: "#ff0000" }),
    text(690, 15, "LABELS", { fontSize: 16, strokeColor: "#ff0000" }),
    rect(670, 340, 330, 360, { strokeColor: "#22c55e" }),
    text(690, 355, "NOTES", { fontSize: 16, strokeColor: "#22c55e" }),
  ],
};

const comparisonTemplate: LayoutTemplate = {
  id: "comparison",
  name: "COMPARISON",
  description: "Two-column layout for comparing concepts side by side.",
  createElements: () => [
    rect(0, 0, 1000, 80, { strokeColor: "#ff0000" }),
    text(20, 25, "TOPIC / COMPARISON TITLE", { fontSize: 20, strokeColor: "#ff0000" }),
    rect(0, 100, 480, 450, { strokeColor: "#3b82f6" }),
    text(20, 115, "CONCEPT A", { fontSize: 18, strokeColor: "#3b82f6" }),
    rect(520, 100, 480, 450, { strokeColor: "#22c55e" }),
    text(540, 115, "CONCEPT B", { fontSize: 18, strokeColor: "#22c55e" }),
    rect(0, 570, 1000, 130, { strokeColor: "#eab308" }),
    text(20, 585, "SHARED / COMMON GROUND", { fontSize: 16, strokeColor: "#eab308" }),
  ],
};

export const TEMPLATES: LayoutTemplate[] = [
  blankTemplate,
  mindMapTemplate,
  flowchartTemplate,
  cornellNotesTemplate,
  anatomyTemplate,
  comparisonTemplate,
];
