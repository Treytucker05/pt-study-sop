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
import {
  DEFAULT_EDGE_OPTIONS,
  EDGE_COLORS,
  NODE_COLORS,
  NODE_TYPES,
} from "./ConceptMapStructuredConfig";
import { ConceptMapStructuredImport } from "./ConceptMapStructuredImport";

interface ConceptMapStructuredProps {
  initialMermaid?: string;
  onSave?: (mermaid: string) => void;
  className?: string;
}

export function ConceptMapStructured({
  initialMermaid,
  onSave,
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
  const { toast } = useToast();

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
    const title = ((nodes[0]?.data as { label?: string })?.label || "Untitled").replace(/[/\\?%*:|"<>]/g, "-");
    const md = `---\ntype: concept-map\ncreated: ${new Date().toISOString()}\n---\n\n# ${title} Concept Map\n\n\`\`\`mermaid\n${code}\n\`\`\`\n`;
    const path = `Concept Maps/${title}.md`;
    try {
      await api.obsidian.saveFile(path, md);
      toast({ title: "Saved to vault", description: path });
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
      <div className="flex items-center gap-1 px-2 py-1 border-b border-secondary/30 bg-black/40 shrink-0 flex-wrap">
        <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[9px] font-terminal" onClick={goBackToImport} title="Back to import">
          <ArrowLeft className="w-3 h-3" />
        </Button>
        <div className="w-px h-4 bg-secondary/30" />
        <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[9px] font-terminal" onClick={addNode} title="Add node">
          <Plus className="w-3 h-3" />
        </Button>
        <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[9px] font-terminal" onClick={deleteSelected} title="Delete selected">
          <Trash2 className="w-3 h-3" />
        </Button>
        <div className="relative">
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-1.5 text-[9px] font-terminal"
            onClick={() => setShowColorPicker(showColorPicker ? null : "node")}
            title="Color selected"
          >
            <Palette className="w-3 h-3" />
          </Button>
          {showColorPicker && (
            <div className="absolute top-full left-0 mt-1 p-2 bg-black border-2 border-primary/50 z-50 space-y-2 min-w-[160px]">
              <p className="font-terminal text-[9px] text-muted-foreground">NODE COLORS</p>
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
              <p className="font-terminal text-[9px] text-muted-foreground pt-1">EDGE COLORS</p>
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
        <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[9px] font-terminal" onClick={autoLayout} title="Auto layout">
          <LayoutGrid className="w-3 h-3" />
        </Button>
        <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[9px] font-terminal" onClick={toggleDirection} title={`Direction: ${direction}`}>
          {direction === "TB" ? <ArrowUpDown className="w-3 h-3" /> : <ArrowLeftRight className="w-3 h-3" />}
        </Button>
        <div className="w-px h-4 bg-secondary/30" />
        <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[9px] font-terminal" onClick={exportMermaid} title="Copy Mermaid">
          <FileText className="w-3 h-3" />
        </Button>
        <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[9px] font-terminal" onClick={exportPng} title="Export PNG">
          <Download className="w-3 h-3" />
        </Button>
        <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[9px] font-terminal" onClick={saveToVault} title="Save to vault">
          <Save className="w-3 h-3" />
        </Button>
        <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[9px] font-terminal" onClick={() => setIsFullscreen(!isFullscreen)} title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
          {isFullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-1.5 text-[9px] font-terminal"
          onClick={() => {
            setShowImport(true);
            setNodes([]);
            setEdges([]);
          }}
          title="Import Mermaid"
        >
          <Import className="w-3 h-3" />
        </Button>
        <div className="ml-auto flex items-center gap-2 text-[9px] font-terminal text-muted-foreground">
          <span>{nodes.length}N / {edges.length}E</span>
          <span className={cn("w-2 h-2 rounded-full", isDirty ? "bg-red-500" : "bg-green-500")} />
          <span>{isDirty ? "Unsaved" : "Saved"}</span>
        </div>
      </div>

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
