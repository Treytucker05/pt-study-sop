import { useCallback, useEffect, useReducer, useRef, type ReactNode } from "react";
import {
  Plus,
  Trash2,
  Palette,
  Shapes,
  Spline,
  Paintbrush,
  LayoutGrid,
  ArrowUpDown,
  Maximize2,
  Grid3X3,
  Lock,
  GripHorizontal,
  Settings,
  ChevronDown,
  ChevronUp,
  Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CONCEPT_NODE_COLORS, CONCEPT_EDGE_COLORS } from "@/lib/colors";
import type { StructuredShape } from "./StructuredShapeNode";
import { STRUCTURED_SHAPES } from "./StructuredShapeNode";

// ─── Tool definitions ────────────────────────────────────────────────────────

interface ToolDef {
  id: string;
  label: string;
  icon: ReactNode;
  defaultOn: boolean;
}

const ICON = "w-3.5 h-3.5";

const ALL_TOOLS: ToolDef[] = [
  { id: "add_node", label: "Add Node", icon: <Plus className={ICON} />, defaultOn: true },
  { id: "delete", label: "Delete", icon: <Trash2 className={ICON} />, defaultOn: true },
  { id: "node_color", label: "Node Color", icon: <Palette className={ICON} />, defaultOn: true },
  { id: "node_shape", label: "Node Shape", icon: <Shapes className={ICON} />, defaultOn: true },
  { id: "edge_type", label: "Edge Style", icon: <Spline className={ICON} />, defaultOn: true },
  { id: "edge_label", label: "Edge Label", icon: <Tag className={ICON} />, defaultOn: true },
  { id: "edge_color", label: "Edge Color", icon: <Paintbrush className={ICON} />, defaultOn: false },
  { id: "auto_layout", label: "Auto Layout", icon: <LayoutGrid className={ICON} />, defaultOn: true },
  { id: "direction", label: "Direction", icon: <ArrowUpDown className={ICON} />, defaultOn: true },
  { id: "fit_view", label: "Fit View", icon: <Maximize2 className={ICON} />, defaultOn: false },
  { id: "snap_grid", label: "Snap Grid", icon: <Grid3X3 className={ICON} />, defaultOn: false },
  { id: "lock", label: "Lock Canvas", icon: <Lock className={ICON} />, defaultOn: false },
];

const DEFAULT_VISIBLE = new Set(ALL_TOOLS.filter((t) => t.defaultOn).map((t) => t.id));

export type EdgeType = "smoothstep" | "straight" | "step" | "bezier";
const EDGE_TYPES: { value: EdgeType; label: string }[] = [
  { value: "smoothstep", label: "Smooth" },
  { value: "straight", label: "Straight" },
  { value: "step", label: "Step" },
  { value: "bezier", label: "Bezier" },
];

const SHAPE_LABELS: Record<StructuredShape, string> = {
  rectangle: "Rect",
  circle: "Circle",
  diamond: "Diamond",
  hexagon: "Hex",
};

// ─── Persistence ─────────────────────────────────────────────────────────────

const LS_PREFIX = "canvas-toolbox";

function loadSet(key: string, fallback: Set<string>): Set<string> {
  try {
    const raw = localStorage.getItem(`${LS_PREFIX}-${key}`);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch { /* corrupted */ }
  return fallback;
}

function saveSet(key: string, s: Set<string>): void {
  localStorage.setItem(`${LS_PREFIX}-${key}`, JSON.stringify([...s]));
}

function loadPos(): { x: number; y: number } {
  try {
    const raw = localStorage.getItem(`${LS_PREFIX}-pos`);
    if (raw) {
      const p = JSON.parse(raw);
      if (typeof p.x === "number" && typeof p.y === "number") return p;
    }
  } catch { /* corrupted */ }
  return { x: 12, y: 12 };
}

function savePos(p: { x: number; y: number }): void {
  localStorage.setItem(`${LS_PREFIX}-pos`, JSON.stringify(p));
}

type CanvasToolboxState = {
  visibleTools: Set<string>;
  pos: { x: number; y: number };
  collapsed: boolean;
  showSettings: boolean;
  openSubmenu: string | null;
};

type CanvasToolboxPatch =
  | Partial<CanvasToolboxState>
  | ((state: CanvasToolboxState) => Partial<CanvasToolboxState>);

function createCanvasToolboxState(): CanvasToolboxState {
  return {
    visibleTools: loadSet("visible", DEFAULT_VISIBLE),
    pos: loadPos(),
    collapsed: false,
    showSettings: false,
    openSubmenu: null,
  };
}

function canvasToolboxReducer(state: CanvasToolboxState, patch: CanvasToolboxPatch): CanvasToolboxState {
  const nextPatch = typeof patch === "function" ? patch(state) : patch;
  return { ...state, ...nextPatch };
}

// ─── Component ───────────────────────────────────────────────────────────────

interface CanvasToolboxProps {
  onAction: (id: string) => void;
  edgeType: EdgeType;
  onEdgeTypeChange: (t: EdgeType) => void;
  nodeShape: StructuredShape;
  onNodeShapeChange: (s: StructuredShape) => void;
  snapToGrid: boolean;
  locked: boolean;
  onNodeColorChange: (idx: number) => void;
  onEdgeColorChange: (stroke: string) => void;
}

export function CanvasToolbox({
  onAction,
  edgeType,
  onEdgeTypeChange,
  nodeShape,
  onNodeShapeChange,
  snapToGrid,
  locked,
  onNodeColorChange,
  onEdgeColorChange,
}: CanvasToolboxProps) {
  const [toolboxState, patchToolboxState] = useReducer(
    canvasToolboxReducer,
    undefined,
    createCanvasToolboxState,
  );
  const { visibleTools, pos, collapsed, showSettings, openSubmenu } = toolboxState;

  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const boxRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const toolboxStateRef = useRef(toolboxState);

  useEffect(() => {
    toolboxStateRef.current = toolboxState;
  }, [toolboxState]);

  // Drag handlers
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
  }, [pos]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const parent = boxRef.current?.parentElement;
      if (!parent) return;
      const bounds = parent.getBoundingClientRect();
      const bw = boxRef.current?.offsetWidth ?? 200;
      const bh = boxRef.current?.offsetHeight ?? 40;
      const nx = Math.max(0, Math.min(e.clientX - dragOffset.current.x, bounds.width - bw));
      const ny = Math.max(0, Math.min(e.clientY - dragOffset.current.y, bounds.height - bh));
      patchToolboxState({ pos: { x: nx, y: ny } });
    };
    const onUp = () => {
      if (dragging.current) {
        dragging.current = false;
        savePos(toolboxStateRef.current.pos);
      }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  // Close settings on outside click
  useEffect(() => {
    if (!showSettings) return;
    const handler = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as HTMLElement)) {
        patchToolboxState({ showSettings: false });
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showSettings]);

  // Close submenu on outside click
  useEffect(() => {
    if (!openSubmenu) return;
    const handler = () => patchToolboxState({ openSubmenu: null });
    const timer = setTimeout(() => document.addEventListener("click", handler), 0);
    return () => { clearTimeout(timer); document.removeEventListener("click", handler); };
  }, [openSubmenu, patchToolboxState]);

  const toggleTool = useCallback((id: string) => {
    patchToolboxState((prev) => {
      const next = new Set(prev.visibleTools);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveSet("visible", next);
      return { visibleTools: next };
    });
  }, [patchToolboxState]);

  const handleToolClick = useCallback((id: string) => {
    if (id === "node_color" || id === "edge_color" || id === "node_shape" || id === "edge_type") {
      patchToolboxState((prev) => ({ openSubmenu: prev.openSubmenu === id ? null : id }));
      return;
    }
    onAction(id);
  }, [onAction, patchToolboxState]);

  const btn = "h-7 w-7 flex items-center justify-center border border-primary/30 hover:bg-primary/20 text-primary transition-colors";

  return (
    <div
      ref={boxRef}
      className="absolute z-50 select-none"
      style={{ left: pos.x, top: pos.y }}
    >
      <div className="bg-black/90 border-2 border-primary/60 shadow-none">
        {/* Header / drag bar */}
        <div
          className="flex items-center gap-1 px-1.5 py-0.5 bg-primary/10 cursor-grab active:cursor-grabbing border-b border-primary/30"
          onMouseDown={onMouseDown}
          role="button"
          tabIndex={0}
          aria-label="Move toolbox"
        >
          <GripHorizontal className="w-3 h-3 text-primary/60" />
          <span className="text-ui-2xs font-arcade text-primary/70 uppercase tracking-wider flex-1">
            Tools
          </span>
          <button
            type="button"
            className="text-primary/60 hover:text-primary p-0.5"
            onClick={() => patchToolboxState({ collapsed: !collapsed })}
            title={collapsed ? "Expand" : "Collapse"}
            aria-label={collapsed ? "Expand toolbox" : "Collapse toolbox"}
          >
            {collapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          </button>
          <div className="relative" ref={settingsRef}>
            <button
              type="button"
              className="text-primary/60 hover:text-primary p-0.5"
              onClick={() => patchToolboxState({ showSettings: !showSettings })}
              title="Configure tools"
              aria-label="Configure visible tools"
            >
              <Settings className="w-3 h-3" />
            </button>
            {showSettings && (
              <div className="absolute right-0 top-full mt-1 bg-black border-2 border-primary/50 p-2 min-w-[150px] z-[60]">
                <p className="text-ui-2xs font-arcade text-primary/60 mb-1">SHOW TOOLS</p>
                {ALL_TOOLS.map((t) => (
                  <label
                    key={t.id}
                    className="flex items-center gap-2 text-xs font-terminal text-primary/80 cursor-pointer py-0.5 hover:text-primary"
                  >
                    <input
                      type="checkbox"
                      checked={visibleTools.has(t.id)}
                      onChange={() => toggleTool(t.id)}
                      className="accent-primary"
                    />
                    {t.label}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tool buttons */}
        {!collapsed && (
          <div className="flex flex-wrap gap-0.5 p-1 max-w-[200px]">
            {ALL_TOOLS.filter((t) => visibleTools.has(t.id)).map((tool) => (
              <div key={tool.id} className="relative">
                <button
                  type="button"
                  className={cn(
                    btn,
                    tool.id === "snap_grid" && snapToGrid && "bg-primary/20 ring-1 ring-primary",
                    tool.id === "lock" && locked && "bg-primary/20 ring-1 ring-primary",
                    openSubmenu === tool.id && "bg-primary/20 ring-1 ring-primary"
                  )}
                  onClick={() => handleToolClick(tool.id)}
                  title={tool.label}
                  aria-label={tool.label}
                >
                  {tool.icon}
                </button>

                {/* Submenus */}
                {openSubmenu === tool.id && tool.id === "node_color" && (
                  <div className="absolute left-0 top-full mt-1 bg-black border-2 border-primary/50 p-2 z-[60] min-w-[120px]">
                    <p className="text-ui-2xs font-arcade text-primary/60 mb-1">NODE COLOR</p>
                    <div className="flex flex-wrap gap-1">
                      {CONCEPT_NODE_COLORS.map((c, i) => (
                        <button
                          type="button"
                          key={c.name}
                          onClick={() => { onNodeColorChange(i); patchToolboxState({ openSubmenu: null }); }}
                          className={cn("w-5 h-5 border-2 rounded-none", c.border, c.bg)}
                          title={c.name}
                          aria-label={`Set node color to ${c.name}`}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {openSubmenu === tool.id && tool.id === "edge_color" && (
                  <div className="absolute left-0 top-full mt-1 bg-black border-2 border-primary/50 p-2 z-[60] min-w-[120px]">
                    <p className="text-ui-2xs font-arcade text-primary/60 mb-1">EDGE COLOR</p>
                    <div className="flex flex-wrap gap-1">
                      {CONCEPT_EDGE_COLORS.map((c) => (
                        <button
                          type="button"
                          key={c.name}
                          onClick={() => { onEdgeColorChange(c.stroke); patchToolboxState({ openSubmenu: null }); }}
                          className="w-5 h-5 border-2 border-secondary/50 rounded-none"
                          style={{ backgroundColor: c.stroke }}
                          title={c.name}
                          aria-label={`Set edge color to ${c.name}`}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {openSubmenu === tool.id && tool.id === "node_shape" && (
                  <div className="absolute left-0 top-full mt-1 bg-black border-2 border-primary/50 p-2 z-[60] min-w-[100px]">
                    <p className="text-ui-2xs font-arcade text-primary/60 mb-1">NEW NODE SHAPE</p>
                    {STRUCTURED_SHAPES.map((s) => (
                        <button
                          type="button"
                          key={s}
                          onClick={() => { onNodeShapeChange(s); patchToolboxState({ openSubmenu: null }); }}
                          className={cn(
                            "block w-full text-left text-xs font-terminal px-2 py-0.5 hover:bg-primary/20 text-primary/80",
                            nodeShape === s && "bg-primary/20 text-primary"
                        )}
                        aria-label={`Set node shape to ${SHAPE_LABELS[s]}`}
                      >
                        {SHAPE_LABELS[s]}
                      </button>
                    ))}
                  </div>
                )}

                {openSubmenu === tool.id && tool.id === "edge_type" && (
                  <div className="absolute left-0 top-full mt-1 bg-black border-2 border-primary/50 p-2 z-[60] min-w-[100px]">
                    <p className="text-ui-2xs font-arcade text-primary/60 mb-1">EDGE STYLE</p>
                    {EDGE_TYPES.map((et) => (
                        <button
                          type="button"
                          key={et.value}
                          onClick={() => { onEdgeTypeChange(et.value); patchToolboxState({ openSubmenu: null }); }}
                          className={cn(
                            "block w-full text-left text-xs font-terminal px-2 py-0.5 hover:bg-primary/20 text-primary/80",
                            edgeType === et.value && "bg-primary/20 text-primary"
                        )}
                        aria-label={`Set edge style to ${et.label}`}
                      >
                        {et.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
