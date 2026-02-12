import { useCallback, useEffect, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
  type Connection,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { toPng } from "html-to-image";
import { Button } from "@/components/ui/button";
import {
  LayoutGrid,
  Download,
  FileText,
  Plus,
  Trash2,
  ArrowLeftRight,
  ArrowUpDown,
  Import,
  ArrowLeft,
  Maximize2,
  Minimize2,
  Palette,
  Save,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { parseMermaid, toMermaid, applyDagreLayout } from "@/lib/mermaid-to-reactflow";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { buildBrainCanvasMarkdown, sanitizeCanvasTitle } from "./brainDoc";
import {
  DEFAULT_EDGE_OPTIONS,
  EDGE_COLORS,
  NODE_COLORS,
  NODE_TYPES,
} from "./ConceptMapStructuredConfig";
import { ConceptMapStructuredImport } from "./ConceptMapStructuredImport";
import type { GraphCanvasCommand, GraphCanvasStatus } from "./graph-canvas-types";

interface ConceptMapStructuredProps {
  initialMermaid?: string;
  onSave?: (mermaid: string) => void;
  onInitialMermaidConsumed?: () => void;
  hideToolbar?: boolean;
  externalCommand?: GraphCanvasCommand | null;
  onStatusChange?: (status: GraphCanvasStatus) => void;
  className?: string;
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
  const [direction, setDirection] = useState<"TB" | "LR">("TB");
  const [showImport, setShowImport] = useState(!initialMermaid && nodes.length === 0);
  const [mermaidInput, setMermaidInput] = useState(initialMermaid || "");
  const [nodeCounter, setNodeCounter] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState<"node" | "edge" | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const reactFlowRef = useRef<HTMLDivElement>(null);
  const initialMermaidConsumedRef = useRef(false);
  const lastCommandIdRef = useRef(0);
  const { toast } = useToast();

  const importMermaid = useCallback(
    (code: string) => {
      if (!code.trim()) return;
      const result = parseMermaid(code);
      setDirection(result.direction);
      const layoutNodes = applyDagreLayout(result.nodes, result.edges, {
        direction: result.direction,
      });
      setNodes(layoutNodes);
      setEdges(result.edges);
      setNodeCounter(result.nodes.length);
      setShowImport(false);
      setIsDirty(true);
    },
    [setNodes, setEdges]
  );

  useEffect(() => {
    if (initialMermaid?.trim() && !initialMermaidConsumedRef.current) {
      initialMermaidConsumedRef.current = true;
      importMermaid(initialMermaid);
      setMermaidInput(initialMermaid);
      onInitialMermaidConsumed?.();
    }
  }, [initialMermaid, importMermaid, onInitialMermaidConsumed]);

  useEffect(() => {
    if (!isFullscreen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isFullscreen]);

  const onNodesChange = useCallback(
    (changes: any) => {
      setIsDirty(true);
      onNodesChangeBase(changes);
    },
    [onNodesChangeBase]
  );

  const onEdgesChange = useCallback(
    (changes: any) => {
      setIsDirty(true);
      onEdgesChangeBase(changes);
    },
    [onEdgesChangeBase]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      setIsDirty(true);
      setEdges((eds) => addEdge(connection, eds));
    },
    [setEdges]
  );

  const autoLayout = useCallback(() => {
    const layoutNodes = applyDagreLayout(nodes, edges, { direction });
    setNodes(layoutNodes);
    setIsDirty(true);
  }, [nodes, edges, direction, setNodes]);

  const toggleDirection = useCallback(() => {
    const newDir = direction === "TB" ? "LR" : "TB";
    setDirection(newDir);
    const layoutNodes = applyDagreLayout(nodes, edges, { direction: newDir });
    setNodes(layoutNodes);
    setIsDirty(true);
  }, [direction, nodes, edges, setNodes]);

  const addNode = useCallback(() => {
    const id = `N${nodeCounter + 1}`;
    setNodeCounter((c) => c + 1);
    const newNode: Node = {
      id,
      type: "arcade",
      position: { x: Math.random() * 300 + 50, y: Math.random() * 200 + 50 },
      data: { label: `New Node ${nodeCounter + 1}`, colorIdx: 0 },
    };
    setNodes((nds) => [...nds, newNode]);
    setIsDirty(true);
  }, [nodeCounter, setNodes]);

  const deleteSelected = useCallback(() => {
    setNodes((nds) => nds.filter((n) => !n.selected));
    setEdges((eds) => eds.filter((e) => !e.selected));
    setIsDirty(true);
  }, [setNodes, setEdges]);

  const setSelectedNodeColor = useCallback((colorIdx: number) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.selected ? { ...n, data: { ...n.data, colorIdx } } : n
      )
    );
    setShowColorPicker(null);
    setIsDirty(true);
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
    setShowColorPicker(null);
    setIsDirty(true);
  }, [setEdges]);

  const exportPng = useCallback(async () => {
    if (!reactFlowRef.current) return;
    try {
      const viewport = reactFlowRef.current.querySelector(".react-flow__viewport") as HTMLElement;
      if (!viewport) return;
      const dataUrl = await toPng(viewport, { backgroundColor: "#000", quality: 1 });
      const link = document.createElement("a");
      link.download = "concept-map.png";
      link.href = dataUrl;
      link.click();
      toast({ title: "PNG exported" });
    } catch (err) {
      toast({ title: "Export failed", description: String(err), variant: "destructive" });
    }
  }, [toast]);

  const exportMermaid = useCallback(() => {
    const code = toMermaid(nodes, edges, direction);
    navigator.clipboard.writeText(code);
    toast({ title: "Mermaid copied to clipboard" });
  }, [nodes, edges, direction, toast]);

  const saveToVault = useCallback(async () => {
    const code = toMermaid(nodes, edges, direction);
    const title = sanitizeCanvasTitle((nodes[0]?.data as { label?: string })?.label || "Untitled Canvas");
    const basePath = `Brain Canvas/${title}`;
    const markdownPath = `${basePath}.md`;
    const layoutPath = `${basePath}.layout.json`;
    const layoutJson = JSON.stringify({
      direction,
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: n.data,
        style: n.style,
      })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label,
        style: e.style,
        markerEnd: e.markerEnd,
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
      onSave?.(code);
      setIsDirty(false);
    } catch (err) {
      toast({ title: "Save failed", description: String(err), variant: "destructive" });
    }
  }, [nodes, edges, direction, toast, onSave]);

  const goBackToImport = useCallback(() => {
    setShowImport(true);
    setMermaidInput(nodes.length > 0 ? toMermaid(nodes, edges, direction) : "");
  }, [nodes, edges, direction]);

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
        .filter((n) => n.selected)
        .map((n) => String((n.data as { label?: string })?.label || n.id)),
    });
  }, [onStatusChange, isDirty, nodes, edges]);

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
          setMermaidInput(code);
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
    externalCommand,
    saveToVault,
    exportPng,
    exportMermaid,
    importMermaid,
    goBackToImport,
    addNode,
    deleteSelected,
    autoLayout,
    toggleDirection,
  ]);

  if (showImport && nodes.length === 0) {
    return (
      <ConceptMapStructuredImport
        mermaidInput={mermaidInput}
        onMermaidInputChange={setMermaidInput}
        onImport={importMermaid}
        onBlank={() => {
          setShowImport(false);
          addNode();
        }}
        className={className}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col",
        isFullscreen ? "fixed inset-0 z-[100010] bg-black" : "h-full",
        className
      )}
    >
      {!hideToolbar && (
        <div className="flex items-center gap-1 px-2 py-1 border-b border-secondary/30 bg-black/40 shrink-0 flex-wrap">
          <Button size="sm" variant="ghost" className="h-6 px-1.5 text-xs font-terminal" onClick={goBackToImport} title="Back to import">
            <ArrowLeft className="w-3 h-3" />
          </Button>
          <div className="w-px h-4 bg-secondary/30" />
          <Button size="sm" variant="ghost" className="h-6 px-1.5 text-xs font-terminal" onClick={addNode} title="Add node">
            <Plus className="w-3 h-3" />
          </Button>
          <Button size="sm" variant="ghost" className="h-6 px-1.5 text-xs font-terminal" onClick={deleteSelected} title="Delete selected">
            <Trash2 className="w-3 h-3" />
          </Button>
          <div className="relative">
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-1.5 text-xs font-terminal"
              onClick={() => setShowColorPicker(showColorPicker ? null : "node")}
              title="Color selected"
            >
              <Palette className="w-3 h-3" />
            </Button>
            {showColorPicker && (
              <div className="absolute top-full left-0 mt-1 p-2 bg-black border-2 border-primary/50 z-50 space-y-2 min-w-[160px]">
                <p className="font-terminal text-xs text-muted-foreground">NODE COLORS</p>
                <div className="flex flex-wrap gap-1">
                  {NODE_COLORS.map((c, i) => (
                    <button
                      key={c.name}
                      onClick={() => setSelectedNodeColor(i)}
                      className={cn("w-5 h-5 border-2 rounded-none", c.border, c.bg)}
                      title={c.name}
                    />
                  ))}
                </div>
                <p className="font-terminal text-xs text-muted-foreground pt-1">EDGE COLORS</p>
                <div className="flex flex-wrap gap-1">
                  {EDGE_COLORS.map((c) => (
                    <button
                      key={c.name}
                      onClick={() => setSelectedEdgeColor(c.stroke)}
                      className="w-5 h-5 border-2 border-secondary/50 rounded-none"
                      style={{ backgroundColor: c.stroke }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="w-px h-4 bg-secondary/30" />
          <Button size="sm" variant="ghost" className="h-6 px-1.5 text-xs font-terminal" onClick={autoLayout} title="Auto layout">
            <LayoutGrid className="w-3 h-3" />
          </Button>
          <Button size="sm" variant="ghost" className="h-6 px-1.5 text-xs font-terminal" onClick={toggleDirection} title={`Direction: ${direction}`}>
            {direction === "TB" ? <ArrowUpDown className="w-3 h-3" /> : <ArrowLeftRight className="w-3 h-3" />}
          </Button>
          <div className="w-px h-4 bg-secondary/30" />
          <Button size="sm" variant="ghost" className="h-6 px-1.5 text-xs font-terminal" onClick={exportMermaid} title="Copy Mermaid">
            <FileText className="w-3 h-3" />
          </Button>
          <Button size="sm" variant="ghost" className="h-6 px-1.5 text-xs font-terminal" onClick={exportPng} title="Export PNG">
            <Download className="w-3 h-3" />
          </Button>
          <Button size="sm" variant="ghost" className="h-6 px-1.5 text-xs font-terminal" onClick={saveToVault} title="Save to vault">
            <Save className="w-3 h-3" />
          </Button>
          <Button size="sm" variant="ghost" className="h-6 px-1.5 text-xs font-terminal" onClick={() => setIsFullscreen(!isFullscreen)} title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
            {isFullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-1.5 text-xs font-terminal"
            onClick={() => {
              setShowImport(true);
              setNodes([]);
              setEdges([]);
            }}
            title="Import Mermaid"
          >
            <Import className="w-3 h-3" />
          </Button>
          <div className="ml-auto flex items-center gap-2 text-xs font-terminal text-muted-foreground">
            <span>{nodes.length}N / {edges.length}E</span>
            <span className={cn("w-2 h-2 rounded-full", isDirty ? "bg-destructive" : "bg-success")} />
            <span>{isDirty ? "Unsaved" : "Saved"}</span>
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0" ref={reactFlowRef}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={NODE_TYPES}
          defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
          fitView
          className="bg-black/80"
          proOptions={{ hideAttribution: true }}
          onPaneClick={() => setShowColorPicker(null)}
        >
          <Background color="hsl(var(--primary) / 0.1)" gap={20} />
          <Controls className="!bg-black !border-primary [&_button]:!bg-black/80 [&_button]:!border-primary/50 [&_button]:!text-primary" />
          <MiniMap
            className="!bg-black/80 !border-primary"
            nodeColor="hsl(var(--primary))"
            maskColor="rgba(0,0,0,0.5)"
          />
        </ReactFlow>
      </div>
    </div>
  );
}
