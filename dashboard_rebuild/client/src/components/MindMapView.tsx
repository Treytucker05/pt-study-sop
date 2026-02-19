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
import { COURSE_FOLDERS } from "@/config/courses";
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

// Color indices: Cyan=6 (course), Yellow=4 (subfolder), Green=3 (note)
const SEED_COLOR: Record<string, number> = { course: 6, subfolder: 4, note: 3 };
const SEED_SHAPE: Record<string, MindMapShape> = {
  course: "rectangle",
  subfolder: "rectangle",
  note: "rectangle",
};

interface MindMapViewProps {
  hideToolbar?: boolean;
  externalCommand?: GraphCanvasCommand | null;
  onStatusChange?: (status: GraphCanvasStatus) => void;
}

interface CurriculumNode {
  id: string;
  name: string;
  type: "course" | "subfolder" | "note";
  vaultPath?: string;
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
  const lastCommandIdRef = useRef(0);
  const { toast } = useToast();

  // --- Vault-driven sidebar state ---
  const [selectedCourses, setSelectedCourses] = useState<Set<string>>(
    () => new Set(COURSE_FOLDERS.map((c) => c.id))
  );
  const [selectedSubfolders, setSelectedSubfolders] = useState<Set<string>>(new Set());
  const [showNotes, setShowNotes] = useState(true);

  const { data: obsidianStatus } = useQuery({
    queryKey: ["obsidian", "status"],
    queryFn: api.obsidian.getStatus,
    refetchInterval: 30_000,
  });

  const { data: obsidianConfig } = useQuery({
    queryKey: ["obsidian", "config"],
    queryFn: api.obsidian.getConfig,
  });

  const vaultOnline = obsidianStatus?.status === "online";

  const { data: vaultIndex } = useQuery({
    queryKey: ["obsidian", "vaultIndex"],
    queryFn: () => api.obsidian.getVaultIndex(),
    enabled: vaultOnline,
    staleTime: 5 * 60_000,
  });

  // --- Build vault tree from index ---
  const graphData = useMemo(() => {
    const gNodes: CurriculumNode[] = [];
    const gLinks: CurriculumLink[] = [];
    if (!vaultIndex?.paths) return { nodes: gNodes, links: gLinks };

    for (const course of COURSE_FOLDERS) {
      if (!selectedCourses.has(course.id)) continue;
      const courseNodeId = `course-${course.id}`;
      gNodes.push({ id: courseNodeId, name: course.name, type: "course" });

      const subfolderNotes = new Map<string, { name: string; path: string }[]>();
      const rootNotes: { name: string; path: string }[] = [];

      for (const [noteName, fullPath] of Object.entries(vaultIndex.paths)) {
        if (!fullPath.startsWith(course.path + "/")) continue;
        const relative = fullPath.slice(course.path.length + 1);
        const segments = relative.split("/");
        if (segments.length === 1) {
          rootNotes.push({ name: noteName, path: fullPath });
        } else {
          const sf = segments[0];
          const list = subfolderNotes.get(sf) ?? [];
          list.push({ name: noteName, path: fullPath });
          subfolderNotes.set(sf, list);
        }
      }

      for (const [sfName, noteList] of subfolderNotes) {
        const sfKey = `${course.id}/${sfName}`;
        if (selectedSubfolders.size > 0 && !selectedSubfolders.has(sfKey)) continue;
        const sfNodeId = `subfolder-${course.id}-${sfName}`;
        gNodes.push({
          id: sfNodeId,
          name: `${sfName} (${noteList.length})`,
          type: "subfolder",
        });
        gLinks.push({ source: courseNodeId, target: sfNodeId });

        if (showNotes) {
          for (const n of noteList) {
            const noteId = `note-${n.path}`;
            gNodes.push({
              id: noteId,
              name: n.name,
              type: "note",
              vaultPath: n.path,
            });
            gLinks.push({ source: sfNodeId, target: noteId });
          }
        }
      }

      if (showNotes) {
        for (const rn of rootNotes) {
          const noteId = `note-${rn.path}`;
          gNodes.push({
            id: noteId,
            name: rn.name,
            type: "note",
            vaultPath: rn.path,
          });
          gLinks.push({ source: courseNodeId, target: noteId });
        }
      }
    }
    return { nodes: gNodes, links: gLinks };
  }, [vaultIndex, selectedCourses, selectedSubfolders, showNotes]);

  // --- Sidebar helper data ---
  const visibleSubfolders = useMemo(() => {
    if (!vaultIndex?.paths) return [];
    const result: { key: string; name: string; courseId: string }[] = [];
    const seen = new Set<string>();
    for (const course of COURSE_FOLDERS) {
      if (!selectedCourses.has(course.id)) continue;
      for (const fullPath of Object.values(vaultIndex.paths)) {
        if (!fullPath.startsWith(course.path + "/")) continue;
        const relative = fullPath.slice(course.path.length + 1);
        const segments = relative.split("/");
        if (segments.length > 1) {
          const key = `${course.id}/${segments[0]}`;
          if (!seen.has(key)) {
            seen.add(key);
            result.push({ key, name: segments[0], courseId: course.id });
          }
        }
      }
    }
    return result;
  }, [vaultIndex, selectedCourses]);

  const courseNoteCounts = useMemo(() => {
    const counts = new Map<string, number>();
    if (!vaultIndex?.paths) return counts;
    for (const course of COURSE_FOLDERS) {
      let count = 0;
      for (const fullPath of Object.values(vaultIndex.paths)) {
        if (fullPath.startsWith(course.path + "/")) count++;
      }
      counts.set(course.id, count);
    }
    return counts;
  }, [vaultIndex]);

  const toggleCourse = (id: string) => {
    setSelectedCourses((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSubfolder = (key: string) => {
    setSelectedSubfolders((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
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

  // --- Seed map from vault curriculum ---
  const seedMap = useCallback(() => {
    const { nodes: curNodes, links: curLinks } = graphData;
    if (curNodes.length === 0) {
      toast({ title: "No data", description: "Select courses first", variant: "destructive" });
      return;
    }

    const existingCustomIds = new Set(
      nodes.filter((n) =>
        !String(n.id).startsWith("course-") &&
        !String(n.id).startsWith("subfolder-") &&
        !String(n.id).startsWith("note-")
      ).map((n) => n.id)
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
          ...(cn.vaultPath ? { vaultPath: cn.vaultPath } : {}),
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
    toast({ title: "Map seeded", description: `${curNodes.length} vault nodes` });
  }, [graphData, nodes, edges, direction, setNodes, setEdges, toast]);

  // --- Double-click node to open in Obsidian ---
  const onNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      const vaultPath = (node.data as { vaultPath?: string })?.vaultPath;
      if (!vaultPath) return;
      const vaultName = obsidianConfig?.vaultName || "Treys School";
      const filePath = vaultPath.replace(/\.md$/, "");
      window.open(
        `obsidian://open?vault=${encodeURIComponent(vaultName)}&file=${encodeURIComponent(filePath)}`,
        "_blank"
      );
    },
    [obsidianConfig]
  );

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

    const mappedEdges = parsed.edges
      .map((edge, idx) => {
        const source = idBySource.get(edge.source);
        const target = idBySource.get(edge.target);
        if (!source || !target) return null;
        return {
          id: `mm-import-e-${idx + 1}`,
          source,
          target,
          ...MIND_MAP_DEFAULT_EDGE_OPTIONS,
        } as Edge;
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

  return (
    <div className="flex h-full" onPaste={handlePaste}>
      {/* Sidebar */}
      <div className="w-[160px] shrink-0 border-r border-secondary/30 bg-black/60">
        <ScrollArea className="h-full">
          <div className="p-3 space-y-4">
            {!vaultOnline && (
              <div className="font-arcade text-xs text-red-400 text-center py-1 border border-red-500/30 bg-red-500/10">
                OBSIDIAN OFFLINE
              </div>
            )}

            <div>
              <div className="font-arcade text-xs text-primary mb-2">COURSES</div>
              {COURSE_FOLDERS.map((c) => (
                <label key={c.id} className="flex items-center gap-2 py-1 cursor-pointer">
                  <Checkbox
                    checked={selectedCourses.has(c.id)}
                    onCheckedChange={() => toggleCourse(c.id)}
                    className="border-cyan-500 data-[state=checked]:bg-cyan-500"
                  />
                  <span className="font-terminal text-xs text-cyan-300">
                    {c.name}
                    <span className="text-muted-foreground ml-1">
                      ({courseNoteCounts.get(c.id) ?? 0})
                    </span>
                  </span>
                </label>
              ))}
            </div>

            {visibleSubfolders.length > 0 && (
              <div>
                <div className="font-arcade text-xs text-yellow-400 mb-2">SUBFOLDERS</div>
                <label className="flex items-center gap-2 py-1 cursor-pointer mb-1">
                  <Checkbox
                    checked={selectedSubfolders.size === 0}
                    onCheckedChange={() => setSelectedSubfolders(new Set())}
                    className="border-yellow-500 data-[state=checked]:bg-yellow-500"
                  />
                  <span className="font-terminal text-xs text-yellow-200">All</span>
                </label>
                {visibleSubfolders.map((sf) => (
                  <label key={sf.key} className="flex items-center gap-2 py-0.5 cursor-pointer">
                    <Checkbox
                      checked={selectedSubfolders.size === 0 || selectedSubfolders.has(sf.key)}
                      onCheckedChange={() => toggleSubfolder(sf.key)}
                      className="border-yellow-500 data-[state=checked]:bg-yellow-500"
                    />
                    <span className="font-terminal text-xs text-yellow-100 truncate">{sf.name}</span>
                  </label>
                ))}
              </div>
            )}

            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={showNotes}
                  onCheckedChange={(checked) => setShowNotes(!!checked)}
                  className="border-green-500 data-[state=checked]:bg-green-500"
                />
                <span className="font-terminal text-xs text-green-300">Show Notes</span>
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
                <span className="font-terminal text-xs text-yellow-300">Subfolder</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm border border-green-400 bg-green-400/8" />
                <span className="font-terminal text-xs text-green-300">Note</span>
              </div>
            </div>

            <div className="pt-2 border-t border-secondary/30">
              <Button
                size="sm"
                variant="outline"
                className="w-full h-7 text-xs font-terminal border-primary/50 text-primary"
                onClick={seedMap}
                disabled={!vaultOnline}
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
              className="min-h-[64px] w-full px-2 py-1.5 font-terminal text-xs bg-black/60 border border-primary/30 rounded-none text-foreground placeholder:text-muted-foreground resize-y"
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
            onNodeDoubleClick={onNodeDoubleClick}
            nodeTypes={MIND_MAP_NODE_TYPES}
            defaultEdgeOptions={MIND_MAP_DEFAULT_EDGE_OPTIONS}
            fitView
            className="bg-black/40"
            proOptions={{ hideAttribution: true }}
          >
            <Background color="hsl(var(--primary) / 0.1)" gap={20} />
            <Controls className="!bg-black !border-primary [&_button]:!bg-black/40 [&_button]:!border-primary/50 [&_button]:!text-primary" />
            <MiniMap
              className="!bg-black/40 !border-primary"
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
