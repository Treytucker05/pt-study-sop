export type GraphCanvasMode = "mindmap" | "structured" | "freehand" | "vault";

export type GraphCanvasCommandType =
  | "save"
  | "export_png"
  | "import_mermaid"
  | "export_mermaid"
  | "undo"
  | "redo"
  | "add_node"
  | "delete_selected"
  | "auto_layout"
  | "toggle_direction"
  | "toggle_draw";

export interface GraphCanvasCommand {
  id: number;
  target: GraphCanvasMode;
  type: GraphCanvasCommandType;
  payload?: unknown;
}

export interface GraphCanvasStatus {
  mode: GraphCanvasMode;
  isDirty: boolean;
  nodeCount: number;
  edgeCount: number;
  canUndo: boolean;
  canRedo: boolean;
  supportsMermaid: boolean;
  supportsDraw: boolean;
  selectedLabels: string[];
}

export const EMPTY_GRAPH_STATUS: GraphCanvasStatus = {
  mode: "vault",
  isDirty: false,
  nodeCount: 0,
  edgeCount: 0,
  canUndo: false,
  canRedo: false,
  supportsMermaid: false,
  supportsDraw: false,
  selectedLabels: [],
};
