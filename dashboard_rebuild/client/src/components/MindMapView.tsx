import { useEffect, useRef, useState, useCallback, useMemo } from "react";
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
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { applyDagreLayout, parseMermaid, toMermaid } from "@/lib/mermaid-to-reactflow";
import {
  MIND_MAP_NODE_TYPES,
  MIND_MAP_DEFAULT_EDGE_OPTIONS,
  getMindMapNodeStyle,
  type MindMapShape,
} from "@/components/brain/MindMapNodes";
import { MindMapToolbar } from "@/components/brain/MindMapToolbar";
import { MindMapDrawLayer, type DrawStroke } from "@/components/brain/MindMapDrawLayer";
import { buildBrainCanvasMarkdown, sanitizeCanvasTitle } from "@/components/brain/brainDoc";
import type { GraphCanvasCommand, GraphCanvasStatus } from "@/components/brain/graph-canvas-types";

// Color indices for curriculum seed: Cyan=6, Yellow=4, Green=3 in CONCEPT_NODE_COLORS
const SEED_COLOR: Record<string, number> = { course: 6, module: 4, lo: 3 };
const SEED_SHAPE: Record<string, MindMapShape> = {
  course: "rectangle",
  module: "rectangle",
  lo: "rectangle",
};

interface MindMapViewProps {
  hideToolbar?: boolean;
  externalCommand?: GraphCanvasCommand | null;
  onStatusChange?: (status: GraphCanvasStatus) => void;
}

interface CurriculumNode {
  id: string;
  name: string;
  type: "course" | "module" | "lo";
}

interface CurriculumLink {
  source: string;
  target: string;
}

export function MindMapView({
  hideToolbar = false,
  externalCommand,
  onStatusChange,
}: MindMapViewProps) {
  const [nodes, setNodes, onNodesChangeBase] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChangeBase] = useEdgesState<Edge>([]);
  const [direction, setDirection] = useState<"TB" | "LR">("LR");
  const [nodeCounter, setNodeCounter] = useState(0);
  const [isDirty, setIsDirty] = useState(false);
  const [drawMode, setDrawMode] = useState(false);
  const [drawStrokes, setDrawStrokes] = useState<DrawStroke[]>([]);
  const [showMermaidImport, setShowMermaidImport] = useState(false);
  const [mermaidInput, setMermaidInput] = useState("");
  const reactFlowRef = useRef<HTMLDivElement>(null);
  const didInitRef = useRef(false);
  const lastCommandIdRef = useRef(0);
  const { toast } = useToast();

  // --- Curriculum sidebar state (kept from original) ---
  const [selectedCourses, setSelectedCourses] = useState<Set<number>>(new Set());
  const [selectedModules, setSelectedModules] = useState<Set<number>>(new Set());
  const [includeLOs, setIncludeLOs] = useState(true);

  const { data: courses = [] } = useQuery({
    queryKey: ["courses"],
    queryFn: () => api.courses.getActive(),
  });

  const courseIds = courses.map((c: any) => c.id).sort();

  const { data: allModules = [] } = useQuery({
    queryKey: ["modules", "all", courseIds],
    queryFn: async () => {
      const results = await Promise.all(
        courses.map((c: any) => api.modules.getByCourse(c.id))
      );
      return results.flat();
    },
    enabled: courses.length > 0,
  });

  const { data: allLOs = [] } = useQuery({
    queryKey: ["learningObjectives", "all", courseIds, includeLOs],
    queryFn: async () => {
      const results = await Promise.all(
        courses.map((c: any) => api.learningObjectives.getByCourse(c.id))
      );
      return results.flat();
    },
    enabled: courses.length > 0 && includeLOs,
  });

  useEffect(() => {
    if (courses.length > 0 && !didInitRef.current) {
      didInitRef.current = true;
      setSelectedCourses(new Set(courses.map((c: any) => c.id)));
    }
  }, [courses]);

  const graphData = useMemo(() => {
    const gNodes: CurriculumNode[] = [];
    const gLinks: CurriculumLink[] = [];

    const modulesByCourse = new Map<number, any[]>();
    for (const m of allModules) {
      const list = modulesByCourse.get(m.courseId) ?? [];
      list.push(m);
      modulesByCourse.set(m.courseId, list);
    }
    const losByModule = new Map<number, any[]>();
    for (const lo of allLOs) {
      if (lo.moduleId == null) continue;
      const list = losByModule.get(lo.moduleId) ?? [];
      list.push(lo);
      losByModule.set(lo.moduleId, list);
    }

    for (const course of courses) {
      if (!selectedCourses.has(course.id)) continue;
      const courseId = `course-${course.id}`;
      gNodes.push({ id: courseId, name: course.name, type: "course" });

      const courseModules = modulesByCourse.get(course.id) ?? [];
      for (const mod of courseModules) {
        if (selectedModules.size > 0 && !selectedModules.has(mod.id)) continue;
        const modId = `module-${mod.id}`;
        gNodes.push({ id: modId, name: mod.name, type: "module" });
        gLinks.push({ source: courseId, target: modId });

        if (includeLOs) {
          const modLOs = losByModule.get(mod.id) ?? [];
          for (const lo of modLOs) {
            const loId = `lo-${lo.id}`;
            gNodes.push({ id: loId, name: `${lo.loCode}: ${lo.title}`, type: "lo" });
            gLinks.push({ source: modId, target: loId });
          }
        }
      }
    }
    return { nodes: gNodes, links: gLinks };
  }, [courses, allModules, allLOs, selectedCourses, selectedModules, includeLOs]);

  const toggleCourse = (id: number) => {
    setSelectedCourses((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleModule = (id: number) => {
    setSelectedModules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // --- ReactFlow change wrappers (mark dirty) ---
  const onNodesChange = useCallback(
    (changes: any) => { setIsDirty(true); onNodesChangeBase(changes); },
    [onNodesChangeBase]
  );
  const onEdgesChange = useCallback(
    (changes: any) => { setIsDirty(true); onEdgesChangeBase(changes); },
    [onEdgesChangeBase]
  );
  const onConnect = useCallback(
    (connection: Connection) => {
      setIsDirty(true);
      setEdges((eds) => addEdge(connection, eds));
    },
    [setEdges]
  );

  // --- Listen for node label edits from MindMapShapeNode ---
  useEffect(() => {
    const handler = (e: Event) => {
      const { id, label } = (e as CustomEvent).detail;
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, label } } : n))
      );
      setIsDirty(true);
    };
    window.addEventListener("mindmap:node-label", handler);
    return () => window.removeEventListener("mindmap:node-label", handler);
  }, [setNodes]);

  // --- Seed map from curriculum ---
  const seedMap = useCallback(() => {
    const { nodes: curNodes, links: curLinks } = graphData;
    if (curNodes.length === 0) {
      toast({ title: "No data", description: "Select courses first", variant: "destructive" });
      return;
    }

    const existingCustomIds = new Set(
      nodes.filter((n) => !n.id.startsWith("course-") && !n.id.startsWith("module-") && !n.id.startsWith("lo-"))
        .map((n) => n.id)
    );
    const customNodes = nodes.filter((n) => existingCustomIds.has(n.id));
    const customEdges = edges.filter(
      (e) => existingCustomIds.has(e.source) || existingCustomIds.has(e.target)
    );

    const seedNodes: Node[] = curNodes.map((cn) => ({
      id: cn.id,
      type: "mindmapShape",
      position: { x: 0, y: 0 },
      data: (() => {
        const shape = SEED_SHAPE[cn.type] ?? "rectangle";
        return {
          label: cn.name,
          colorIdx: SEED_COLOR[cn.type] ?? 0,
          shape,
        };
      })(),
      style: getMindMapNodeStyle(SEED_SHAPE[cn.type] ?? "rectangle"),
    }));

    const seedEdges: Edge[] = curLinks.map((cl, i) => ({
      id: `seed-e-${i}`,
      source: cl.source,
      target: cl.target,
      ...MIND_MAP_DEFAULT_EDGE_OPTIONS,
    }));

    const allNodes = [...seedNodes, ...customNodes];
    const allEdges = [...seedEdges, ...customEdges];
    const laid = applyDagreLayout(allNodes, allEdges, { direction });
    setNodes(laid);
    setEdges(allEdges);
    setNodeCounter(allNodes.length);
    setIsDirty(true);
    toast({ title: "Map seeded", description: `${curNodes.length} curriculum nodes` });
  }, [graphData, nodes, edges, direction, setNodes, setEdges, toast]);

  // --- Add node ---
  const addNode = useCallback(
    (shape: MindMapShape) => {
      const id = `mm-${nodeCounter + 1}`;
      setNodeCounter((c) => c + 1);
      const newNode: Node = {
        id,
        type: "mindmapShape",
        position: { x: Math.random() * 300 + 50, y: Math.random() * 200 + 50 },
        data: { label: `Node ${nodeCounter + 1}`, colorIdx: 0, shape },
        style: getMindMapNodeStyle(shape),
      };
      setNodes((nds) => [...nds, newNode]);
      setIsDirty(true);
    },
    [nodeCounter, setNodes]
  );

  // --- Delete selected ---
  const deleteSelected = useCallback(() => {
    setNodes((nds) => nds.filter((n) => !n.selected));
    setEdges((eds) => eds.filter((e) => !e.selected));
    setIsDirty(true);
  }, [setNodes, setEdges]);

  // --- Color / shape changes ---
  const setSelectedNodeColor = useCallback(
    (colorIdx: number) => {
      setNodes((nds) =>
        nds.map((n) => (n.selected ? { ...n, data: { ...n.data, colorIdx } } : n))
      );
      setIsDirty(true);
    },
    [setNodes]
  );

  const setSelectedEdgeColor = useCallback(
    (stroke: string) => {
      setEdges((eds) =>
        eds.map((e) =>
          e.selected
            ? {
                ...e,
                style: { ...e.style, stroke, strokeWidth: 2.5 },
                markerEnd: { type: MarkerType.ArrowClosed, color: stroke },
              }
            : e
        )
      );
      setIsDirty(true);
    },
    [setEdges]
  );

  const setSelectedShape = useCallback(
    (shape: MindMapShape) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.selected && n.type === "mindmapShape"
            ? {
                ...n,
                data: { ...n.data, shape },
                style: getMindMapNodeStyle(shape),
              }
            : n
        )
      );
      setIsDirty(true);
    },
    [setNodes]
  );

  // --- Layout ---
  const autoLayout = useCallback(() => {
    const laid = applyDagreLayout(nodes, edges, { direction });
    setNodes(laid);
    setIsDirty(true);
  }, [nodes, edges, direction, setNodes]);

  const toggleDirection = useCallback(() => {
    const newDir = direction === "TB" ? "LR" : "TB";
    setDirection(newDir);
    const laid = applyDagreLayout(nodes, edges, { direction: newDir });
    setNodes(laid);
    setIsDirty(true);
  }, [direction, nodes, edges, setNodes]);

  // --- Paste images ---
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (!item.type.startsWith("image/")) continue;
        const file = item.getAsFile();
        if (!file) continue;
        const reader = new FileReader();
        reader.onload = () => {
          const id = `mm-img-${nodeCounter + 1}`;
          setNodeCounter((c) => c + 1);
          const newNode: Node = {
            id,
            type: "mindmapImage",
            position: { x: Math.random() * 300 + 50, y: Math.random() * 200 + 50 },
            data: { src: reader.result as string },
            style: { width: 200, height: 150 },
          };
          setNodes((nds) => [...nds, newNode]);
          setIsDirty(true);
        };
        reader.readAsDataURL(file);
        break;
      }
    },
    [nodeCounter, setNodes]
  );

  // --- Export PNG ---
  const exportPng = useCallback(async () => {
    if (!reactFlowRef.current) return;
    try {
      const viewport = reactFlowRef.current.querySelector(
        ".react-flow__viewport"
      ) as HTMLElement;
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
          link.download = "mind-map.png";
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
  }, [toast]);

  // --- Mermaid export/import ---
  const exportMermaid = useCallback(() => {
    if (nodes.length === 0) {
      toast({ title: "Nothing to export", description: "Add nodes first", variant: "destructive" });
      return;
    }

    const alias = new Map<string, string>();
    nodes.forEach((node, idx) => {
      alias.set(node.id, `N${idx + 1}`);
    });

    const normalizedNodes = nodes.map((node) => ({
      ...node,
      id: alias.get(node.id) || node.id,
      data: {
        ...node.data,
        label: String((node.data as { label?: string })?.label || node.id),
      },
    }));
    const normalizedEdges = edges
      .filter((edge) => alias.has(edge.source) && alias.has(edge.target))
      .map((edge) => ({
        ...edge,
        source: alias.get(edge.source) || edge.source,
        target: alias.get(edge.target) || edge.target,
      }));

    const mermaid = toMermaid(normalizedNodes, normalizedEdges, direction);
    navigator.clipboard.writeText(mermaid);
    toast({ title: "Mermaid copied to clipboard" });
  }, [nodes, edges, direction, toast]);

  const importMermaid = useCallback((code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;

    const parsed = parseMermaid(trimmed);
    const mappedNodes: Node[] = parsed.nodes.map((node, idx) => ({
      ...node,
      id: `mm-import-${idx + 1}`,
      type: "mindmapShape",
      data: {
        label: String((node.data as { label?: string })?.label || node.id),
        colorIdx: 0,
        shape: "rectangle",
      },
      style: getMindMapNodeStyle("rectangle"),
    }));

    const idBySource = new Map<string, string>();
    parsed.nodes.forEach((node, idx) => {
      idBySource.set(node.id, `mm-import-${idx + 1}`);
    });

    const mappedEdges: Edge[] = parsed.edges
      .map((edge, idx) => {
        const source = idBySource.get(edge.source);
        const target = idBySource.get(edge.target);
        if (!source || !target) return null;
        return {
          id: `mm-import-e-${idx + 1}`,
          source,
          target,
          ...MIND_MAP_DEFAULT_EDGE_OPTIONS,
        };
      })
      .filter((edge): edge is Edge => edge !== null);

    const laidOut = applyDagreLayout(mappedNodes, mappedEdges, {
      direction: parsed.direction,
    });

    setDirection(parsed.direction);
    setNodes(laidOut);
    setEdges(mappedEdges);
    setNodeCounter(mappedNodes.length);
    setIsDirty(true);
    toast({ title: "Mermaid imported", description: `${mappedNodes.length} nodes` });
  }, [setNodes, setEdges, toast]);

  // --- Save to Obsidian vault ---
  const saveToVault = useCallback(async () => {
    const title = sanitizeCanvasTitle((nodes[0]?.data as { label?: string })?.label || "Untitled Canvas");
    const basePath = `Brain Canvas/${title}`;
    const markdownPath = `${basePath}.md`;
    const layoutPath = `${basePath}.layout.json`;
    const strokesPath = `${basePath}.strokes.json`;

    const alias = new Map<string, string>();
    nodes.forEach((node, idx) => alias.set(node.id, `N${idx + 1}`));
    const mermaidNodes = nodes.map((node) => ({
      ...node,
      id: alias.get(node.id) || node.id,
      data: {
        ...node.data,
        label: String((node.data as { label?: string })?.label || node.id),
      },
    }));
    const mermaidEdges = edges
      .filter((edge) => alias.has(edge.source) && alias.has(edge.target))
      .map((edge) => ({
        ...edge,
        source: alias.get(edge.source) || edge.source,
        target: alias.get(edge.target) || edge.target,
      }));
    const mermaid = toMermaid(mermaidNodes, mermaidEdges, direction);

    const layoutPayload = JSON.stringify({
      nodes: nodes.map((n) => ({ id: n.id, type: n.type, position: n.position, data: n.data, style: n.style })),
      edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target, style: e.style, markerEnd: e.markerEnd })),
      meta: { direction, updated: new Date().toISOString() },
    }, null, 2);
    const strokesPayload = JSON.stringify({
      strokes: drawStrokes,
      updated: new Date().toISOString(),
    }, null, 2);
    const markdown = buildBrainCanvasMarkdown({
      mode: "mindmap",
      title,
      mermaid,
      layoutPath,
      strokesPath,
    });

    try {
      await api.obsidian.saveFile(layoutPath, layoutPayload);
      await api.obsidian.saveFile(strokesPath, strokesPayload);
      await api.obsidian.saveFile(markdownPath, markdown);
      toast({ title: "Saved to vault", description: markdownPath });
      setIsDirty(false);
    } catch (err) {
      toast({ title: "Save failed", description: String(err), variant: "destructive" });
    }
  }, [nodes, edges, drawStrokes, direction, toast]);

  // --- Draw layer ---
  const handleStrokeAdd = useCallback((stroke: DrawStroke) => {
    setDrawStrokes((prev) => [...prev, stroke]);
    setIsDirty(true);
  }, []);

  useEffect(() => {
    onStatusChange?.({
      mode: "mindmap",
      isDirty,
      nodeCount: nodes.length,
      edgeCount: edges.length,
      canUndo: false,
      canRedo: false,
      supportsMermaid: true,
      supportsDraw: true,
      selectedLabels: nodes
        .filter((node) => node.selected)
        .map((node) => String((node.data as { label?: string })?.label || node.id)),
    });
  }, [onStatusChange, isDirty, nodes, edges]);

  useEffect(() => {
    if (!externalCommand || externalCommand.target !== "mindmap") return;
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
          setShowMermaidImport(false);
        } else {
          setShowMermaidImport(true);
        }
        break;
      }
      case "add_node":
        addNode("rectangle");
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
      case "toggle_draw":
        setDrawMode((prev) => !prev);
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
    addNode,
    deleteSelected,
    autoLayout,
    toggleDirection,
  ]);

  const activeCourseModules = allModules.filter((m: any) =>
    selectedCourses.has(m.courseId)
  );

  return (
    <div className="flex h-full" onPaste={handlePaste}>
      {/* Sidebar */}
      <div className="w-[160px] shrink-0 border-r border-secondary/30 bg-black/60">
        <ScrollArea className="h-full">
          <div className="p-3 space-y-4">
            <div>
              <div className="font-arcade text-xs text-primary mb-2">COURSES</div>
              {courses.map((c: any) => (
                <label key={c.id} className="flex items-center gap-2 py-1 cursor-pointer">
                  <Checkbox
                    checked={selectedCourses.has(c.id)}
                    onCheckedChange={() => toggleCourse(c.id)}
                    className="border-cyan-500 data-[state=checked]:bg-cyan-500"
                  />
                  <span className="font-terminal text-xs text-cyan-300">{c.name}</span>
                </label>
              ))}
            </div>

            {activeCourseModules.length > 0 && (
              <div>
                <div className="font-arcade text-xs text-yellow-400 mb-2">MODULES</div>
                <label className="flex items-center gap-2 py-1 cursor-pointer mb-1">
                  <Checkbox
                    checked={selectedModules.size === 0}
                    onCheckedChange={() => setSelectedModules(new Set())}
                    className="border-yellow-500 data-[state=checked]:bg-yellow-500"
                  />
                  <span className="font-terminal text-xs text-yellow-200">All Modules</span>
                </label>
                {activeCourseModules.map((m: any) => (
                  <label key={m.id} className="flex items-center gap-2 py-0.5 cursor-pointer">
                    <Checkbox
                      checked={selectedModules.size === 0 || selectedModules.has(m.id)}
                      onCheckedChange={() => toggleModule(m.id)}
                      className="border-yellow-500 data-[state=checked]:bg-yellow-500"
                    />
                    <span className="font-terminal text-xs text-yellow-100 truncate">{m.name}</span>
                  </label>
                ))}
              </div>
            )}

            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={includeLOs}
                  onCheckedChange={(checked) => setIncludeLOs(!!checked)}
                  className="border-green-500 data-[state=checked]:bg-green-500"
                />
                <span className="font-terminal text-xs text-green-300">Show LOs</span>
              </label>
            </div>

            {/* Legend */}
            <div className="pt-2 border-t border-secondary/30 space-y-1">
              <div className="font-arcade text-xs text-muted-foreground mb-1">LEGEND</div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm border-2 border-cyan-400 bg-cyan-400/15" />
                <span className="font-terminal text-xs text-cyan-300">Course</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm border border-yellow-400 bg-yellow-400/12" />
                <span className="font-terminal text-xs text-yellow-300">Module</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm border border-green-400 bg-green-400/8" />
                <span className="font-terminal text-xs text-green-300">LO</span>
              </div>
            </div>

            <div className="pt-2 border-t border-secondary/30">
              <Button
                size="sm"
                variant="outline"
                className="w-full h-7 text-xs font-terminal border-primary/50 text-primary"
                onClick={seedMap}
              >
                Seed Map ({graphData.nodes.length})
              </Button>
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Main canvas area */}
      <div className="flex-1 flex flex-col min-h-0">
        {!hideToolbar && (
          <MindMapToolbar
            onSeedMap={seedMap}
            onAddNode={addNode}
            onDeleteSelected={deleteSelected}
            onSetNodeColor={setSelectedNodeColor}
            onSetEdgeColor={setSelectedEdgeColor}
            onSetShape={setSelectedShape}
            onAutoLayout={autoLayout}
            onToggleDirection={toggleDirection}
            direction={direction}
            drawMode={drawMode}
            onToggleDraw={() => setDrawMode((d) => !d)}
            onExportPng={exportPng}
            onSaveToVault={saveToVault}
            nodeCount={nodes.length}
            edgeCount={edges.length}
            isDirty={isDirty}
          />
        )}
        {showMermaidImport && (
          <div className="shrink-0 px-3 py-2 border-b border-primary/20 bg-black/40 flex flex-col gap-2">
            <p className="font-arcade text-xs text-primary">PASTE MERMAID TO IMPORT</p>
            <textarea
              value={mermaidInput}
              onChange={(e) => setMermaidInput(e.target.value)}
              placeholder="graph LR&#10;  A[Course] --> B[Module]"
              className="min-h-[64px] w-full px-2 py-1.5 font-mono text-xs bg-black/60 border border-primary/30 rounded-none text-foreground placeholder:text-muted-foreground resize-y"
              rows={4}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                className="rounded-none font-terminal text-xs"
                disabled={!mermaidInput.trim()}
                onClick={() => {
                  importMermaid(mermaidInput);
                  setShowMermaidImport(false);
                }}
              >
                Import
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-none font-terminal text-xs border-primary/30"
                onClick={() => setShowMermaidImport(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
        <div className="flex-1 min-h-0 relative" ref={reactFlowRef}>
          <MindMapDrawLayer
            active={drawMode}
            strokes={drawStrokes}
            onStrokeAdd={handleStrokeAdd}
          />
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={MIND_MAP_NODE_TYPES}
            defaultEdgeOptions={MIND_MAP_DEFAULT_EDGE_OPTIONS}
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
          </ReactFlow>
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center font-terminal text-xs text-muted-foreground pointer-events-none">
              Select courses & click "Seed Map", or add nodes manually
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
