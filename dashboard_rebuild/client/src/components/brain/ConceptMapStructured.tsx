import { useCallback, useEffect, useReducer, useRef, useState, type Dispatch, type MutableRefObject, type RefObject } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  addEdge,
  reconnectEdge,
  MarkerType,
  ConnectionMode,
  type Connection,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { cn } from "@/lib/utils";
import { parseMermaid, toMermaid, applyDagreLayout } from "@/lib/mermaid-to-reactflow";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { buildBrainCanvasMarkdown, sanitizeCanvasTitle } from "./brainDoc";
import {
  DEFAULT_EDGE_OPTIONS,
  EDGE_TYPES,
  NODE_TYPES,
} from "./ConceptMapStructuredConfig";
import { ConceptMapStructuredImport } from "./ConceptMapStructuredImport";
import { CanvasToolbox, type EdgeType } from "./CanvasToolbox";
import { SHAPE_SIZES, type StructuredShape } from "./StructuredShapeNode";
import type { GraphCanvasCommand, GraphCanvasStatus } from "./graph-canvas-types";

// ─── localStorage helpers ────────────────────────────────────────────────────

const LS_PREFIX = "structured-canvas";

function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`${LS_PREFIX}-${key}`);
    if (raw) return JSON.parse(raw) as T;
  } catch { /* corrupted */ }
  return fallback;
}

function lsSet(key: string, val: unknown): void {
  localStorage.setItem(`${LS_PREFIX}-${key}`, JSON.stringify(val));
}

// ─── Component ───────────────────────────────────────────────────────────────

interface ConceptMapStructuredProps {
  initialMermaid?: string;
  onSave?: (mermaid: string) => void;
  onInitialMermaidConsumed?: () => void;
  hideToolbar?: boolean;
  externalCommand?: GraphCanvasCommand | null;
  onStatusChange?: (status: GraphCanvasStatus) => void;
  className?: string;
}

type StructuredUiState = {
  direction: "TB" | "LR";
  showImport: boolean;
  mermaidInput: string;
  nodeCounter: number;
  isFullscreen: boolean;
  isDirty: boolean;
  edgeType: EdgeType;
  nodeShape: StructuredShape;
  snapToGrid: boolean;
  locked: boolean;
};

type StructuredUiPatch =
  | Partial<StructuredUiState>
  | ((state: StructuredUiState) => Partial<StructuredUiState>);

function createStructuredUiState(initialMermaid?: string): StructuredUiState {
  return {
    direction: "TB",
    showImport: !initialMermaid,
    mermaidInput: initialMermaid || "",
    nodeCounter: 0,
    isFullscreen: false,
    isDirty: false,
    edgeType: lsGet("edgeType", "smoothstep"),
    nodeShape: lsGet("nodeShape", "rectangle"),
    snapToGrid: lsGet("snapToGrid", false),
    locked: false,
  };
}

function structuredUiReducer(
  state: StructuredUiState,
  patch: StructuredUiPatch,
): StructuredUiState {
  const nextPatch = typeof patch === "function" ? patch(state) : patch;
  return { ...state, ...nextPatch };
}

function ConceptMapStructuredCanvas({
  className,
  currentEdgeOptions,
  edgeType,
  edges,
  handleEdgeTypeChange,
  handleNodeShapeChange,
  handleToolAction,
  isDirty,
  isFullscreen,
  locked,
  nodeShape,
  nodes,
  onConnect,
  onEdgesChange,
  onNodesChange,
  onReconnect,
  reactFlowRef,
  setSelectedEdgeColor,
  setSelectedNodeColor,
  snapToGrid,
}: {
  className?: string;
  currentEdgeOptions: Record<string, unknown>;
  edgeType: EdgeType;
  edges: Edge[];
  handleEdgeTypeChange: (newType: EdgeType) => void;
  handleNodeShapeChange: (shape: StructuredShape) => void;
  handleToolAction: (id: string) => void;
  isDirty: boolean;
  isFullscreen: boolean;
  locked: boolean;
  nodeShape: StructuredShape;
  nodes: Node[];
  onConnect: (connection: Connection) => void;
  onEdgesChange: (changes: any) => void;
  onNodesChange: (changes: any) => void;
  onReconnect: (oldEdge: Edge, newConnection: Connection) => void;
  reactFlowRef: RefObject<HTMLDivElement | null>;
  setSelectedEdgeColor: (stroke: string) => void;
  setSelectedNodeColor: (colorIdx: number) => void;
  snapToGrid: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col",
        isFullscreen ? "fixed inset-0 z-[100010] bg-black" : "h-full",
        className,
      )}
    >
      <div className="flex-1 min-h-0 relative" ref={reactFlowRef}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onReconnect={onReconnect}
          edgesReconnectable={!locked}
          nodeTypes={NODE_TYPES}
          edgeTypes={EDGE_TYPES}
          defaultEdgeOptions={currentEdgeOptions}
          snapToGrid={snapToGrid}
          snapGrid={[20, 20]}
          nodesDraggable={!locked}
          connectionMode={ConnectionMode.Loose}
          fitView
          className="bg-black/80"
          proOptions={{ hideAttribution: true }}
        >
          <Background color="hsl(var(--primary) / 0.1)" gap={20} />
          <Controls className="!bg-black !border-primary [&_button]:!bg-black/80 [&_button]:!border-primary/50 [&_button]:!text-primary" />
          <MiniMap
            className="!bg-black/80 !border-primary"
            nodeColor="hsl(var(--primary))"
            maskColor="rgba(0,0,0,0.5)"
          />
          <FitViewListener />
        </ReactFlow>

        <CanvasToolbox
          onAction={handleToolAction}
          edgeType={edgeType}
          onEdgeTypeChange={handleEdgeTypeChange}
          nodeShape={nodeShape}
          onNodeShapeChange={handleNodeShapeChange}
          snapToGrid={snapToGrid}
          locked={locked}
          onNodeColorChange={setSelectedNodeColor}
          onEdgeColorChange={setSelectedEdgeColor}
        />
      </div>

      <div className="flex items-center gap-2 px-2 py-0.5 border-t border-secondary/30 bg-black/40 text-xs font-terminal text-muted-foreground">
        <span>{nodes.length}N / {edges.length}E</span>
        <span className={cn("w-2 h-2 rounded-full", isDirty ? "bg-destructive" : "bg-success")} />
        <span>{isDirty ? "Unsaved" : "Saved"}</span>
      </div>
    </div>
  );
}

function useStructuredCanvasActions({
  addNode,
  autoLayout,
  deleteSelected,
  direction,
  edges,
  exportOnSave,
  externalCommand,
  goBackToImport,
  importMermaid,
  isDirty,
  lastCommandIdRef,
  nodes,
  onStatusChange,
  patchUiState,
  reactFlowRef,
  toggleDirection,
}: {
  addNode: () => void;
  autoLayout: () => void;
  deleteSelected: () => void;
  direction: "TB" | "LR";
  edges: Edge[];
  exportOnSave?: (mermaid: string) => void;
  externalCommand?: GraphCanvasCommand | null;
  goBackToImport: () => void;
  importMermaid: (code: string) => void;
  isDirty: boolean;
  lastCommandIdRef: MutableRefObject<number>;
  nodes: Node[];
  onStatusChange?: (status: GraphCanvasStatus) => void;
  patchUiState: Dispatch<StructuredUiPatch>;
  reactFlowRef: RefObject<HTMLDivElement | null>;
  toggleDirection: () => void;
}) {
  const { toast } = useToast();

  const exportPng = useCallback(async () => {
    if (!reactFlowRef.current) return;
    try {
      const viewport = reactFlowRef.current.querySelector(".react-flow__viewport") as HTMLElement;
      if (!viewport) return;
      const { width, height } = viewport.getBoundingClientRect();
      const clone = viewport.cloneNode(true) as HTMLElement;
      clone.style.backgroundColor = "#000";
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
        <foreignObject width="100%" height="100%">
          <div xmlns="http://www.w3.org/1999/xhtml">${new XMLSerializer().serializeToString(clone)}</div>
        </foreignObject>
      </svg>`;
      const img = new Image();
      const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = width * 2;
        canvas.height = height * 2;
        const ctx = canvas.getContext("2d")!;
        ctx.scale(2, 2);
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        canvas.toBlob((pngBlob) => {
          if (!pngBlob) return;
          const link = document.createElement("a");
          link.download = "concept-map.png";
          link.href = URL.createObjectURL(pngBlob);
          link.click();
          URL.revokeObjectURL(link.href);
          toast({ title: "PNG exported" });
        }, "image/png");
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        toast({ title: "Export failed", variant: "destructive" });
      };
      img.src = url;
    } catch (err) {
      toast({ title: "Export failed", description: String(err), variant: "destructive" });
    }
  }, [reactFlowRef, toast]);

  const exportMermaid = useCallback(() => {
    const code = toMermaid(nodes, edges, direction);
    navigator.clipboard.writeText(code);
    toast({ title: "Mermaid copied to clipboard" });
  }, [direction, edges, nodes, toast]);

  const saveToVault = useCallback(async () => {
    const code = toMermaid(nodes, edges, direction);
    const title = sanitizeCanvasTitle((nodes[0]?.data as { label?: string })?.label || "Untitled Canvas");
    const basePath = `Brain Canvas/${title}`;
    const markdownPath = `${basePath}.md`;
    const layoutPath = `${basePath}.layout.json`;
    const layoutJson = JSON.stringify({
      direction,
      nodes: nodes.map((node) => ({
        id: node.id,
        type: node.type,
        position: node.position,
        data: node.data,
        style: node.style,
      })),
      edges: edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label,
        style: edge.style,
        markerEnd: edge.markerEnd,
        type: edge.type,
      })),
      updated: new Date().toISOString(),
    }, null, 2);
    const markdown = buildBrainCanvasMarkdown({
      mode: "structured",
      title,
      mermaid: code,
      layoutPath,
    });
    try {
      await api.obsidian.saveFile(layoutPath, layoutJson);
      await api.obsidian.saveFile(markdownPath, markdown);
      toast({ title: "Saved to vault", description: markdownPath });
      exportOnSave?.(code);
      patchUiState({ isDirty: false });
    } catch (err) {
      toast({ title: "Save failed", description: String(err), variant: "destructive" });
    }
  }, [direction, edges, exportOnSave, nodes, patchUiState, toast]);

  useEffect(() => {
    onStatusChange?.({
      mode: "structured",
      isDirty,
      nodeCount: nodes.length,
      edgeCount: edges.length,
      canUndo: false,
      canRedo: false,
      supportsMermaid: true,
      supportsDraw: false,
      selectedLabels: nodes
        .filter((node) => node.selected)
        .map((node) => String((node.data as { label?: string })?.label || node.id)),
    });
  }, [edges, isDirty, nodes, onStatusChange]);

  useEffect(() => {
    if (!externalCommand || externalCommand.target !== "structured") return;
    if (externalCommand.id === lastCommandIdRef.current) return;
    lastCommandIdRef.current = externalCommand.id;

    switch (externalCommand.type) {
      case "save":
        void saveToVault();
        break;
      case "export_png":
        void exportPng();
        break;
      case "export_mermaid":
        exportMermaid();
        break;
      case "import_mermaid": {
        const code = typeof externalCommand.payload === "string"
          ? externalCommand.payload.trim()
          : "";
        if (code) {
          importMermaid(code);
          patchUiState({ mermaidInput: code });
        } else {
          goBackToImport();
        }
        break;
      }
      case "add_node":
        addNode();
        break;
      case "delete_selected":
        deleteSelected();
        break;
      case "auto_layout":
        autoLayout();
        break;
      case "toggle_direction":
        toggleDirection();
        break;
      default:
        break;
    }
  }, [
    addNode,
    autoLayout,
    deleteSelected,
    exportMermaid,
    exportPng,
    externalCommand,
    goBackToImport,
    importMermaid,
    lastCommandIdRef,
    patchUiState,
    saveToVault,
    toggleDirection,
  ]);

  return { exportMermaid, exportPng, saveToVault };
}

function useStructuredCanvasEditing({
  onEdgesChangeBase,
  onNodesChangeBase,
  patchUiState,
  setEdges,
  setNodes,
}: {
  onEdgesChangeBase: (changes: any) => void;
  onNodesChangeBase: (changes: any) => void;
  patchUiState: Dispatch<StructuredUiPatch>;
  setEdges: ReturnType<typeof useEdgesState<Edge>>[1];
  setNodes: ReturnType<typeof useNodesState<Node>>[1];
}) {
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail as { label: string };
      setNodes((current) =>
        current.map((node) =>
          node.selected ? { ...node, data: { ...node.data, label: detail.label } } : node
        )
      );
      patchUiState({ isDirty: true });
    };
    window.addEventListener("structured:node-label", handler);
    return () => window.removeEventListener("structured:node-label", handler);
  }, [patchUiState, setNodes]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail as { edgeId: string; label: string };
      setEdges((current) =>
        current.map((edge) =>
          edge.id === detail.edgeId ? { ...edge, data: { ...edge.data, label: detail.label } } : edge
        )
      );
      patchUiState({ isDirty: true });
    };
    window.addEventListener("structured:edge-label", handler);
    return () => window.removeEventListener("structured:edge-label", handler);
  }, [patchUiState, setEdges]);

  const onNodesChange = useCallback((changes: any) => {
    patchUiState({ isDirty: true });
    onNodesChangeBase(changes);
  }, [onNodesChangeBase, patchUiState]);

  const onEdgesChange = useCallback((changes: any) => {
    patchUiState({ isDirty: true });
    onEdgesChangeBase(changes);
  }, [onEdgesChangeBase, patchUiState]);

  const onConnect = useCallback((connection: Connection) => {
    patchUiState({ isDirty: true });
    setEdges((current) => addEdge(connection, current));
  }, [patchUiState, setEdges]);

  const onReconnect = useCallback((oldEdge: Edge, newConnection: Connection) => {
    patchUiState({ isDirty: true });
    setEdges((current) => reconnectEdge(oldEdge, newConnection, current));
  }, [patchUiState, setEdges]);

  return { onConnect, onEdgesChange, onNodesChange, onReconnect };
}

export function ConceptMapStructured({
  initialMermaid,
  onSave,
  onInitialMermaidConsumed,
  hideToolbar = false,
  externalCommand,
  onStatusChange,
  className,
}: ConceptMapStructuredProps) {
  const [nodes, setNodes, onNodesChangeBase] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChangeBase] = useEdgesState<Edge>([]);
  const [uiState, patchUiState] = useReducer(
    structuredUiReducer,
    initialMermaid,
    createStructuredUiState,
  );
  const {
    direction,
    showImport,
    mermaidInput,
    nodeCounter,
    isFullscreen,
    isDirty,
    edgeType,
    nodeShape,
    snapToGrid,
    locked,
  } = uiState;

  const reactFlowRef = useRef<HTMLDivElement>(null);
  const initialMermaidConsumedRef = useRef(false);
  const lastCommandIdRef = useRef(0);
  // ─── Import & init ──────────────────────────────────────────────────────
  const importMermaid = useCallback(
    (code: string) => {
      if (!code.trim()) return;
      const result = parseMermaid(code);
      const layoutNodes = applyDagreLayout(result.nodes, result.edges, {
        direction: result.direction,
      });
      setNodes(layoutNodes);
      setEdges(result.edges);
      patchUiState({
        direction: result.direction,
        nodeCounter: result.nodes.length,
        showImport: false,
        isDirty: true,
      });
    },
    [setNodes, setEdges]
  );

  useEffect(() => {
    if (initialMermaid?.trim() && !initialMermaidConsumedRef.current) {
      initialMermaidConsumedRef.current = true;
      importMermaid(initialMermaid);
      patchUiState({ mermaidInput: initialMermaid });
      onInitialMermaidConsumed?.();
    }
  }, [initialMermaid, importMermaid, onInitialMermaidConsumed]);
  useEffect(() => {
    if (!isFullscreen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") patchUiState({ isFullscreen: false });
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isFullscreen]);
  const { onConnect, onEdgesChange, onNodesChange, onReconnect } =
    useStructuredCanvasEditing({
      onEdgesChangeBase,
      onNodesChangeBase,
      patchUiState,
      setEdges,
      setNodes,
    });

  // ─── Canvas actions ────────────────────────────────────────────────────

  const autoLayout = useCallback(() => {
    const layoutNodes = applyDagreLayout(nodes, edges, { direction });
    setNodes(layoutNodes);
    patchUiState({ isDirty: true });
  }, [nodes, edges, direction, setNodes]);

  const toggleDirection = useCallback(() => {
    const newDir = direction === "TB" ? "LR" : "TB";
    const layoutNodes = applyDagreLayout(nodes, edges, { direction: newDir });
    setNodes(layoutNodes);
    patchUiState({ direction: newDir, isDirty: true });
  }, [direction, nodes, edges, setNodes]);

  const addNode = useCallback(() => {
    const id = `N${nodeCounter + 1}`;
    const size = SHAPE_SIZES[nodeShape];
    const newNode: Node = {
      id,
      type: "structured",
      position: { x: Math.random() * 300 + 50, y: Math.random() * 200 + 50 },
      data: { label: `New Node ${nodeCounter + 1}`, colorIdx: 0, shape: nodeShape },
      style: { width: size.width, height: size.height },
    };
    setNodes((nds) => [...nds, newNode]);
    patchUiState((prev) => ({ nodeCounter: prev.nodeCounter + 1, isDirty: true }));
  }, [nodeCounter, nodeShape, setNodes]);

  const deleteSelected = useCallback(() => {
    setNodes((nds) => nds.filter((n) => !n.selected));
    setEdges((eds) => eds.filter((e) => !e.selected));
    patchUiState({ isDirty: true });
  }, [setNodes, setEdges]);

  const setSelectedNodeColor = useCallback((colorIdx: number) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.selected ? { ...n, data: { ...n.data, colorIdx } } : n
      )
    );
    patchUiState({ isDirty: true });
  }, [setNodes]);

  const setSelectedEdgeColor = useCallback((stroke: string) => {
    setEdges((eds) =>
      eds.map((e) =>
        e.selected
          ? {
              ...e,
              style: { ...e.style, stroke, strokeWidth: 2 },
              markerEnd: { type: MarkerType.ArrowClosed, color: stroke },
            }
          : e
      )
    );
    patchUiState({ isDirty: true });
  }, [setEdges]);

  const setSelectedNodeShape = useCallback((shape: StructuredShape) => {
    const size = SHAPE_SIZES[shape];
    setNodes((nds) =>
      nds.map((n) =>
        n.selected
          ? {
              ...n,
              data: { ...n.data, shape },
              style: { ...n.style, width: size.width, height: size.height },
            }
          : n
      )
    );
    patchUiState({ isDirty: true });
  }, [setNodes]);

  // ─── Edge type change — affects new AND existing edges ─────────────────

  const handleEdgeTypeChange = useCallback((newType: EdgeType) => {
    lsSet("edgeType", newType);
    setEdges((eds) =>
      eds.map((e) => ({ ...e, data: { ...e.data, edgeType: newType } }))
    );
    patchUiState({ edgeType: newType, isDirty: true });
  }, [setEdges]);

  const handleNodeShapeChange = useCallback((shape: StructuredShape) => {
    patchUiState({ nodeShape: shape });
    lsSet("nodeShape", shape);
  }, []);

  const handleSnapToggle = useCallback(() => {
    patchUiState((prev) => {
      const next = !prev.snapToGrid;
      lsSet("snapToGrid", next);
      return { snapToGrid: next };
    });
  }, []);

  const handleLockToggle = useCallback(() => {
    patchUiState((prev) => ({ locked: !prev.locked }));
  }, []);

  // ─── Toolbox action dispatcher ─────────────────────────────────────────

  const handleToolAction = useCallback((id: string) => {
    switch (id) {
      case "add_node": addNode(); break;
      case "delete": deleteSelected(); break;
      case "auto_layout": autoLayout(); break;
      case "direction": toggleDirection(); break;
      case "fit_view":
        // handled via useReactFlow in inner component
        window.dispatchEvent(new CustomEvent("structured:fit-view"));
        break;
      case "snap_grid": handleSnapToggle(); break;
      case "lock": handleLockToggle(); break;
      case "edge_label":
        // Add empty label to selected edges so they enter edit mode
        setEdges((eds) =>
          eds.map((e) =>
            e.selected && !(e.data as any)?.label
              ? { ...e, data: { ...e.data, label: " " } }
              : e
          )
        );
        patchUiState({ isDirty: true });
        break;
    }
  }, [addNode, deleteSelected, autoLayout, toggleDirection, handleSnapToggle, handleLockToggle]);

  const goBackToImport = useCallback(() => {
    patchUiState({
      showImport: true,
      mermaidInput: nodes.length > 0 ? toMermaid(nodes, edges, direction) : "",
    });
  }, [nodes, edges, direction]);

  const { exportPng, saveToVault } = useStructuredCanvasActions({
    addNode,
    autoLayout,
    deleteSelected,
    direction,
    edges,
    exportOnSave: onSave,
    externalCommand,
    goBackToImport,
    importMermaid,
    isDirty,
    lastCommandIdRef,
    nodes,
    onStatusChange,
    patchUiState,
    reactFlowRef,
    toggleDirection,
  });

  // ─── Computed edge options based on current edgeType ────────────────────

  const currentEdgeOptions = {
    ...DEFAULT_EDGE_OPTIONS,
    data: { edgeType },
  };

  // ─── Import screen ────────────────────────────────────────────────────

  if (showImport && nodes.length === 0) {
    return (
      <ConceptMapStructuredImport
        mermaidInput={mermaidInput}
        onMermaidInputChange={(value) => patchUiState({ mermaidInput: value })}
        onImport={importMermaid}
        onBlank={() => {
          patchUiState({ showImport: false });
          addNode();
        }}
        className={className}
      />
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <ConceptMapStructuredCanvas
      className={className}
      currentEdgeOptions={currentEdgeOptions}
      edgeType={edgeType}
      edges={edges}
      handleEdgeTypeChange={handleEdgeTypeChange}
      handleNodeShapeChange={handleNodeShapeChange}
      handleToolAction={handleToolAction}
      isDirty={isDirty}
      isFullscreen={isFullscreen}
      locked={locked}
      nodeShape={nodeShape}
      nodes={nodes}
      onConnect={onConnect}
      onEdgesChange={onEdgesChange}
      onNodesChange={onNodesChange}
      onReconnect={onReconnect}
      reactFlowRef={reactFlowRef}
      setSelectedEdgeColor={setSelectedEdgeColor}
      setSelectedNodeColor={setSelectedNodeColor}
      snapToGrid={snapToGrid}
    />
  );
}

/** Listens for the fit-view custom event and calls fitView from ReactFlow */
function FitViewListener() {
  const { fitView } = useReactFlow();
  useEffect(() => {
    const handler = () => fitView({ padding: 0.2 });
    window.addEventListener("structured:fit-view", handler);
    return () => window.removeEventListener("structured:fit-view", handler);
  }, [fitView]);
  return null;
}
