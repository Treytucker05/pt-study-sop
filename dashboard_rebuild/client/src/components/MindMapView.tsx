import { useEffect, useRef, useState, useCallback, useMemo, useId, useReducer, type Dispatch, type MutableRefObject, type RefObject } from "react";
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
import {
  buildMindMapFromBundle,
  isBundleSeedEdgeId,
  isBundleSeedNodeId,
} from "@/lib/mindMapFromBundle";
import type { SessionMaterialBundle } from "@/lib/sessionMaterialBundle";

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
  sessionBundle?: SessionMaterialBundle;
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

type MindMapUiState = {
  direction: "TB" | "LR";
  nodeCounter: number;
  isDirty: boolean;
  drawMode: boolean;
  drawStrokes: DrawStroke[];
  showMermaidImport: boolean;
  mermaidInput: string;
  selectedCourses: Set<string>;
  selectedSubfolders: Set<string>;
  showNotes: boolean;
};

type MindMapUiPatch =
  | Partial<MindMapUiState>
  | ((state: MindMapUiState) => Partial<MindMapUiState>);

function createMindMapUiState(): MindMapUiState {
  return {
    direction: "LR",
    nodeCounter: 0,
    isDirty: false,
    drawMode: false,
    drawStrokes: [],
    showMermaidImport: false,
    mermaidInput: "",
    selectedCourses: new Set(COURSE_FOLDERS.map((course) => course.id)),
    selectedSubfolders: new Set(),
    showNotes: true,
  };
}

function mindMapUiReducer(state: MindMapUiState, patch: MindMapUiPatch): MindMapUiState {
  const nextPatch = typeof patch === "function" ? patch(state) : patch;
  return { ...state, ...nextPatch };
}

function sanitizeDomIdPart(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-");
}

function MindMapSidebar({
  checkboxIdBase,
  courseNoteCounts,
  graphNodeCount,
  onResetSubfolders,
  onSeedMap,
  onToggleCourse,
  onToggleShowNotes,
  onToggleSubfolder,
  selectedCourses,
  selectedSubfolders,
  showNotes,
  vaultOnline,
  visibleSubfolders,
  sessionReady,
  onRefreshFromSession,
}: {
  checkboxIdBase: string;
  courseNoteCounts: Map<string, number>;
  graphNodeCount: number;
  onResetSubfolders: () => void;
  onSeedMap: () => void;
  onToggleCourse: (id: string) => void;
  onToggleShowNotes: (checked: boolean) => void;
  onToggleSubfolder: (key: string) => void;
  selectedCourses: Set<string>;
  selectedSubfolders: Set<string>;
  showNotes: boolean;
  vaultOnline: boolean;
  visibleSubfolders: Array<{ key: string; name: string; courseId: string }>;
  sessionReady: boolean;
  onRefreshFromSession: () => void;
}) {
  return (
    <div className="w-[160px] shrink-0 border-r border-secondary/30 bg-black/60 h-full overflow-y-auto">
      <div className="p-3 space-y-4">
          {!vaultOnline && (
            <div className="font-arcade text-xs text-red-400 text-center py-1 border border-red-500/30 bg-red-500/10">
              OBSIDIAN OFFLINE
            </div>
          )}

          <div>
            <div className="font-arcade text-xs text-primary mb-2">COURSES</div>
            {COURSE_FOLDERS.map((course) => (
              <label
                key={course.id}
                htmlFor={`${checkboxIdBase}-course-${course.id}`}
                className="flex items-center gap-2 py-1 cursor-pointer"
              >
                <Checkbox
                  id={`${checkboxIdBase}-course-${course.id}`}
                  checked={selectedCourses.has(course.id)}
                  onCheckedChange={() => onToggleCourse(course.id)}
                  className="border-cyan-500 data-[state=checked]:bg-cyan-500"
                />
                <span className="font-terminal text-xs text-cyan-300">
                  {course.name}
                  <span className="text-muted-foreground ml-1">
                    ({courseNoteCounts.get(course.id) ?? 0})
                  </span>
                </span>
              </label>
            ))}
          </div>

          {visibleSubfolders.length > 0 && (
            <div>
              <div className="font-arcade text-xs text-yellow-400 mb-2">SUBFOLDERS</div>
              <label
                htmlFor={`${checkboxIdBase}-subfolders-all`}
                className="flex items-center gap-2 py-1 cursor-pointer mb-1"
              >
                <Checkbox
                  id={`${checkboxIdBase}-subfolders-all`}
                  checked={selectedSubfolders.size === 0}
                  onCheckedChange={onResetSubfolders}
                  className="border-yellow-500 data-[state=checked]:bg-yellow-500"
                />
                <span className="font-terminal text-xs text-yellow-200">All</span>
              </label>
              {visibleSubfolders.map((subfolder) => {
                const subfolderCheckboxId = `${checkboxIdBase}-subfolder-${sanitizeDomIdPart(subfolder.key)}`;
                return (
                  <label key={subfolder.key} htmlFor={subfolderCheckboxId} className="flex items-center gap-2 py-0.5 cursor-pointer">
                    <Checkbox
                      id={subfolderCheckboxId}
                      checked={selectedSubfolders.size === 0 || selectedSubfolders.has(subfolder.key)}
                      onCheckedChange={() => onToggleSubfolder(subfolder.key)}
                      className="border-yellow-500 data-[state=checked]:bg-yellow-500"
                    />
                    <span className="font-terminal text-xs text-yellow-100 truncate">{subfolder.name}</span>
                  </label>
                );
              })}
            </div>
          )}

          <div>
            <label htmlFor={`${checkboxIdBase}-show-notes`} className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                id={`${checkboxIdBase}-show-notes`}
                checked={showNotes}
                onCheckedChange={(checked) => onToggleShowNotes(!!checked)}
                className="border-green-500 data-[state=checked]:bg-green-500"
              />
              <span className="font-terminal text-xs text-green-300">Show Notes</span>
            </label>
          </div>

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

          <div className="pt-2 border-t border-secondary/30 space-y-1">
            <Button
              size="sm"
              variant="outline"
              className="w-full h-7 text-xs font-terminal border-primary/50 text-primary"
              onClick={onRefreshFromSession}
              disabled={!sessionReady}
              title={sessionReady ? "Re-seed from the active session" : "No session material yet"}
            >
              Refresh from session
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="w-full h-7 text-xs font-terminal border-primary/50 text-primary"
              onClick={onSeedMap}
              disabled={!vaultOnline}
            >
              Seed Map ({graphNodeCount})
            </Button>
          </div>
      </div>
    </div>
  );
}

function useMindMapVaultGraphData({
  patchViewState,
  selectedCourses,
  selectedSubfolders,
  showNotes,
  vaultIndex,
}: {
  patchViewState: Dispatch<MindMapUiPatch>;
  selectedCourses: Set<string>;
  selectedSubfolders: Set<string>;
  showNotes: boolean;
  vaultIndex: Awaited<ReturnType<typeof api.obsidian.getVaultIndex>> | undefined;
}) {
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
          const subfolder = segments[0];
          const list = subfolderNotes.get(subfolder) ?? [];
          list.push({ name: noteName, path: fullPath });
          subfolderNotes.set(subfolder, list);
        }
      }

      for (const [subfolderName, noteList] of subfolderNotes) {
        const subfolderKey = `${course.id}/${subfolderName}`;
        if (selectedSubfolders.size > 0 && !selectedSubfolders.has(subfolderKey)) continue;
        const subfolderNodeId = `subfolder-${course.id}-${subfolderName}`;
        gNodes.push({
          id: subfolderNodeId,
          name: `${subfolderName} (${noteList.length})`,
          type: "subfolder",
        });
        gLinks.push({ source: courseNodeId, target: subfolderNodeId });

        if (showNotes) {
          for (const note of noteList) {
            const noteId = `note-${note.path}`;
            gNodes.push({
              id: noteId,
              name: note.name,
              type: "note",
              vaultPath: note.path,
            });
            gLinks.push({ source: subfolderNodeId, target: noteId });
          }
        }
      }

      if (showNotes) {
        for (const note of rootNotes) {
          const noteId = `note-${note.path}`;
          gNodes.push({
            id: noteId,
            name: note.name,
            type: "note",
            vaultPath: note.path,
          });
          gLinks.push({ source: courseNodeId, target: noteId });
        }
      }
    }
    return { nodes: gNodes, links: gLinks };
  }, [selectedCourses, selectedSubfolders, showNotes, vaultIndex]);

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
  }, [selectedCourses, vaultIndex]);

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

  const toggleCourse = useCallback((id: string) => {
    patchViewState((prev) => {
      const next = new Set(prev.selectedCourses);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { selectedCourses: next };
    });
  }, [patchViewState]);

  const toggleSubfolder = useCallback((key: string) => {
    patchViewState((prev) => {
      const next = new Set(prev.selectedSubfolders);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return { selectedSubfolders: next };
    });
  }, [patchViewState]);

  return { courseNoteCounts, graphData, toggleCourse, toggleSubfolder, visibleSubfolders };
}

function useMindMapCanvasPersistence({
  addNode,
  autoLayout,
  deleteSelected,
  direction,
  drawStrokes,
  edges,
  externalCommand,
  importMermaid,
  isDirty,
  lastCommandIdRef,
  nodes,
  onStatusChange,
  patchViewState,
  reactFlowRef,
  setNodes,
  toggleDirection,
}: {
  addNode: (shape: MindMapShape) => void;
  autoLayout: () => void;
  deleteSelected: () => void;
  direction: "TB" | "LR";
  drawStrokes: DrawStroke[];
  edges: Edge[];
  externalCommand?: GraphCanvasCommand | null;
  importMermaid: (code: string) => void;
  isDirty: boolean;
  lastCommandIdRef: MutableRefObject<number>;
  nodes: Node[];
  onStatusChange?: (status: GraphCanvasStatus) => void;
  patchViewState: Dispatch<MindMapUiPatch>;
  reactFlowRef: RefObject<HTMLDivElement | null>;
  setNodes: ReturnType<typeof useNodesState<Node>>[1];
  toggleDirection: () => void;
}) {
  const { toast } = useToast();

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
  }, [reactFlowRef, toast]);

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
  }, [direction, edges, nodes, toast]);

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
      nodes: nodes.map((node) => ({ id: node.id, type: node.type, position: node.position, data: node.data, style: node.style })),
      edges: edges.map((edge) => ({ id: edge.id, source: edge.source, target: edge.target, style: edge.style, markerEnd: edge.markerEnd })),
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
      await Promise.all([
        api.obsidian.saveFile(layoutPath, layoutPayload),
        api.obsidian.saveFile(strokesPath, strokesPayload),
        api.obsidian.saveFile(markdownPath, markdown),
      ]);
      toast({ title: "Saved to vault", description: markdownPath });
      patchViewState({ isDirty: false });
    } catch (err) {
      toast({ title: "Save failed", description: String(err), variant: "destructive" });
    }
  }, [direction, drawStrokes, edges, nodes, patchViewState, toast]);

  const handlePaste = useCallback(
    (event: React.ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (!item.type.startsWith("image/")) continue;
        const file = item.getAsFile();
        if (!file) continue;
        const reader = new FileReader();
        reader.onload = () => {
          const nextCount = nodes.length + 1;
          const id = `mm-img-${nextCount}`;
          const newNode: Node = {
            id,
            type: "mindmapImage",
            position: { x: Math.random() * 300 + 50, y: Math.random() * 200 + 50 },
            data: { src: reader.result as string },
            style: { width: 200, height: 150 },
          };
          setNodes((current) => [...current, newNode]);
          patchViewState((prev) => ({
            nodeCounter: Math.max(prev.nodeCounter + 1, nextCount),
            isDirty: true,
          }));
        };
        reader.readAsDataURL(file);
        break;
      }
    },
    [nodes.length, patchViewState, setNodes],
  );

  const handleStrokeAdd = useCallback((stroke: DrawStroke) => {
    patchViewState((prev) => ({
      drawStrokes: [...prev.drawStrokes, stroke],
      isDirty: true,
    }));
  }, [patchViewState]);

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
  }, [edges, isDirty, nodes, onStatusChange]);

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
          patchViewState({ mermaidInput: code, showMermaidImport: false });
        } else {
          patchViewState({ showMermaidImport: true });
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
        patchViewState((prev) => ({ drawMode: !prev.drawMode }));
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
    importMermaid,
    lastCommandIdRef,
    patchViewState,
    saveToVault,
    toggleDirection,
  ]);

  return { exportPng, handlePaste, handleStrokeAdd, saveToVault };
}

function useMindMapCanvasModel({
  direction,
  edges,
  graphData,
  nodeCounter,
  nodes,
  obsidianConfig,
  onEdgesChangeBase,
  onNodesChangeBase,
  patchViewState,
  setEdges,
  setNodes,
}: {
  direction: "TB" | "LR";
  edges: Edge[];
  graphData: { nodes: CurriculumNode[]; links: CurriculumLink[] };
  nodeCounter: number;
  nodes: Node[];
  obsidianConfig: Awaited<ReturnType<typeof api.obsidian.getConfig>> | undefined;
  onEdgesChangeBase: (changes: any) => void;
  onNodesChangeBase: (changes: any) => void;
  patchViewState: Dispatch<MindMapUiPatch>;
  setEdges: ReturnType<typeof useEdgesState<Edge>>[1];
  setNodes: ReturnType<typeof useNodesState<Node>>[1];
}) {
  const { toast } = useToast();

  const onNodesChange = useCallback((changes: any) => {
    patchViewState({ isDirty: true });
    onNodesChangeBase(changes);
  }, [onNodesChangeBase, patchViewState]);

  const onEdgesChange = useCallback((changes: any) => {
    patchViewState({ isDirty: true });
    onEdgesChangeBase(changes);
  }, [onEdgesChangeBase, patchViewState]);

  const onConnect = useCallback((connection: Connection) => {
    patchViewState({ isDirty: true });
    setEdges((current) => addEdge(connection, current));
  }, [patchViewState, setEdges]);

  useEffect(() => {
    const handler = (event: Event) => {
      const { id, label } = (event as CustomEvent).detail;
      setNodes((current) =>
        current.map((node) =>
          node.id === id ? { ...node, data: { ...node.data, label } } : node
        )
      );
      patchViewState({ isDirty: true });
    };
    window.addEventListener("mindmap:node-label", handler);
    return () => window.removeEventListener("mindmap:node-label", handler);
  }, [patchViewState, setNodes]);

  const seedMap = useCallback(() => {
    const { nodes: graphNodes, links: graphLinks } = graphData;
    if (graphNodes.length === 0) {
      toast({ title: "No data", description: "Select courses first", variant: "destructive" });
      return;
    }

    const existingCustomIds = new Set(
      nodes
        .filter((node) =>
          !String(node.id).startsWith("course-")
          && !String(node.id).startsWith("subfolder-")
          && !String(node.id).startsWith("note-")
        )
        .map((node) => node.id)
    );
    const customNodes = nodes.filter((node) => existingCustomIds.has(node.id));
    const customEdges = edges.filter(
      (edge) => existingCustomIds.has(edge.source) || existingCustomIds.has(edge.target)
    );

    const seedNodes: Node[] = graphNodes.map((graphNode) => {
      const shape = SEED_SHAPE[graphNode.type] ?? "rectangle";
      return {
        id: graphNode.id,
        type: "mindmapShape",
        position: { x: 0, y: 0 },
        data: {
          label: graphNode.name,
          colorIdx: SEED_COLOR[graphNode.type] ?? 0,
          shape,
          ...(graphNode.vaultPath ? { vaultPath: graphNode.vaultPath } : {}),
        },
        style: getMindMapNodeStyle(shape),
      };
    });

    const seedEdges: Edge[] = graphLinks.map((graphLink, index) => ({
      id: `seed-e-${index}`,
      source: graphLink.source,
      target: graphLink.target,
      ...MIND_MAP_DEFAULT_EDGE_OPTIONS,
    }));

    const allNodes = [...seedNodes, ...customNodes];
    const allEdges = [...seedEdges, ...customEdges];
    const laidOut = applyDagreLayout(allNodes, allEdges, { direction });
    setNodes(laidOut);
    setEdges(allEdges);
    patchViewState({ nodeCounter: allNodes.length, isDirty: true });
    toast({ title: "Map seeded", description: `${graphNodes.length} vault nodes` });
  }, [direction, edges, graphData, nodes, patchViewState, setEdges, setNodes, toast]);

  const onNodeDoubleClick = useCallback((_: React.MouseEvent, node: Node) => {
    const vaultPath = (node.data as { vaultPath?: string })?.vaultPath;
    if (!vaultPath) return;
    const vaultName = obsidianConfig?.vaultName || "Treys School";
    const filePath = vaultPath.replace(/\.md$/, "");
    window.open(
      `obsidian://open?vault=${encodeURIComponent(vaultName)}&file=${encodeURIComponent(filePath)}`,
      "_blank"
    );
  }, [obsidianConfig]);

  const addNode = useCallback((shape: MindMapShape) => {
    const nextIndex = nodeCounter + 1;
    const newNode: Node = {
      id: `mm-${nextIndex}`,
      type: "mindmapShape",
      position: { x: Math.random() * 300 + 50, y: Math.random() * 200 + 50 },
      data: { label: `Node ${nextIndex}`, colorIdx: 0, shape },
      style: getMindMapNodeStyle(shape),
    };
    setNodes((current) => [...current, newNode]);
    patchViewState((prev) => ({ nodeCounter: prev.nodeCounter + 1, isDirty: true }));
  }, [nodeCounter, patchViewState, setNodes]);

  const deleteSelected = useCallback(() => {
    setNodes((current) => current.filter((node) => !node.selected));
    setEdges((current) => current.filter((edge) => !edge.selected));
    patchViewState({ isDirty: true });
  }, [patchViewState, setEdges, setNodes]);

  const setSelectedNodeColor = useCallback((colorIdx: number) => {
    setNodes((current) =>
      current.map((node) =>
        node.selected ? { ...node, data: { ...node.data, colorIdx } } : node
      )
    );
    patchViewState({ isDirty: true });
  }, [patchViewState, setNodes]);

  const setSelectedEdgeColor = useCallback((stroke: string) => {
    setEdges((current) =>
      current.map((edge) =>
        edge.selected
          ? {
              ...edge,
              style: { ...edge.style, stroke, strokeWidth: 2.5 },
              markerEnd: { type: MarkerType.ArrowClosed, color: stroke },
            }
          : edge
      )
    );
    patchViewState({ isDirty: true });
  }, [patchViewState, setEdges]);

  const setSelectedShape = useCallback((shape: MindMapShape) => {
    setNodes((current) =>
      current.map((node) =>
        node.selected && node.type === "mindmapShape"
          ? {
              ...node,
              data: { ...node.data, shape },
              style: getMindMapNodeStyle(shape),
            }
          : node
      )
    );
    patchViewState({ isDirty: true });
  }, [patchViewState, setNodes]);

  const autoLayout = useCallback(() => {
    const laidOut = applyDagreLayout(nodes, edges, { direction });
    setNodes(laidOut);
    patchViewState({ isDirty: true });
  }, [direction, edges, nodes, patchViewState, setNodes]);

  const toggleDirection = useCallback(() => {
    const nextDirection = direction === "TB" ? "LR" : "TB";
    const laidOut = applyDagreLayout(nodes, edges, { direction: nextDirection });
    setNodes(laidOut);
    patchViewState({ direction: nextDirection, isDirty: true });
  }, [direction, edges, nodes, patchViewState, setNodes]);

  const importMermaid = useCallback((code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;

    const parsed = parseMermaid(trimmed);
    const mappedNodes: Node[] = parsed.nodes.map((node, index) => ({
      ...node,
      id: `mm-import-${index + 1}`,
      type: "mindmapShape",
      data: {
        label: String((node.data as { label?: string })?.label || node.id),
        colorIdx: 0,
        shape: "rectangle",
      },
      style: getMindMapNodeStyle("rectangle"),
    }));

    const idBySource = new Map<string, string>();
    parsed.nodes.forEach((node, index) => {
      idBySource.set(node.id, `mm-import-${index + 1}`);
    });

    const mappedEdges = parsed.edges
      .map((edge, index) => {
        const source = idBySource.get(edge.source);
        const target = idBySource.get(edge.target);
        if (!source || !target) return null;
        return {
          id: `mm-import-e-${index + 1}`,
          source,
          target,
          ...MIND_MAP_DEFAULT_EDGE_OPTIONS,
        } as Edge;
      })
      .filter((edge): edge is Edge => edge !== null);

    const laidOut = applyDagreLayout(mappedNodes, mappedEdges, {
      direction: parsed.direction,
    });

    setNodes(laidOut);
    setEdges(mappedEdges);
    patchViewState({
      direction: parsed.direction,
      nodeCounter: mappedNodes.length,
      isDirty: true,
    });
    toast({ title: "Mermaid imported", description: `${mappedNodes.length} nodes` });
  }, [patchViewState, setEdges, setNodes, toast]);

  return {
    addNode,
    autoLayout,
    deleteSelected,
    importMermaid,
    onConnect,
    onEdgesChange,
    onNodeDoubleClick,
    onNodesChange,
    seedMap,
    setSelectedEdgeColor,
    setSelectedNodeColor,
    setSelectedShape,
    toggleDirection,
  };
}

export function MindMapView({
  hideToolbar = false,
  externalCommand,
  onStatusChange,
  sessionBundle,
}: MindMapViewProps) {
  const [nodes, setNodes, onNodesChangeBase] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChangeBase] = useEdgesState<Edge>([]);
  const [viewState, patchViewState] = useReducer(
    mindMapUiReducer,
    undefined,
    createMindMapUiState,
  );
  const {
    direction,
    nodeCounter,
    isDirty,
    drawMode,
    drawStrokes,
    showMermaidImport,
    mermaidInput,
    selectedCourses,
    selectedSubfolders,
    showNotes,
  } = viewState;
  const reactFlowRef = useRef<HTMLDivElement>(null);
  const lastCommandIdRef = useRef(0);
  const checkboxIdBase = useId();
  const { toast } = useToast();

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

  const { courseNoteCounts, graphData, toggleCourse, toggleSubfolder, visibleSubfolders } =
    useMindMapVaultGraphData({
      patchViewState,
      selectedCourses,
      selectedSubfolders,
      showNotes,
      vaultIndex,
    });
  const {
    addNode,
    autoLayout,
    deleteSelected,
    importMermaid,
    onConnect,
    onEdgesChange,
    onNodeDoubleClick,
    onNodesChange,
    seedMap,
    setSelectedEdgeColor,
    setSelectedNodeColor,
    setSelectedShape,
    toggleDirection,
  } = useMindMapCanvasModel({
    direction,
    edges,
    graphData,
    nodeCounter,
    nodes,
    obsidianConfig,
    onEdgesChangeBase,
    onNodesChangeBase,
    patchViewState,
    setEdges,
    setNodes,
  });

  const { exportPng, handlePaste, handleStrokeAdd, saveToVault } =
    useMindMapCanvasPersistence({
      addNode,
      autoLayout,
      deleteSelected,
      direction,
      drawStrokes,
      edges,
      externalCommand,
      importMermaid,
      isDirty,
      lastCommandIdRef,
      nodes,
      onStatusChange,
      patchViewState,
      reactFlowRef,
      setNodes,
      toggleDirection,
    });

  const applySessionSeed = useCallback(() => {
    if (!sessionBundle) return false;
    const { nodes: seedNodes, edges: seedEdges } = buildMindMapFromBundle(sessionBundle);
    if (seedNodes.length <= 1) return false;

    // Preserve user-added (non-bundle) nodes/edges; replace any prior bundle seed.
    const userNodes = nodes.filter((node) => !isBundleSeedNodeId(node.id));
    const userEdges = edges.filter(
      (edge) =>
        !isBundleSeedEdgeId(edge.id) &&
        !isBundleSeedNodeId(edge.source) &&
        !isBundleSeedNodeId(edge.target),
    );
    const allNodes = [...seedNodes, ...userNodes];
    const allEdges = [...seedEdges, ...userEdges];
    const laidOut = applyDagreLayout(allNodes, allEdges, { direction });
    setNodes(laidOut);
    setEdges(allEdges);
    patchViewState({ nodeCounter: allNodes.length });
    return true;
  }, [direction, edges, nodes, patchViewState, sessionBundle, setEdges, setNodes]);

  const sessionSeedKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!sessionBundle?.isReady) return;
    if (sessionSeedKeyRef.current === sessionBundle.sessionKey) return;
    // Only auto-seed when user has not edited the map yet.
    if (isDirty) {
      sessionSeedKeyRef.current = sessionBundle.sessionKey;
      return;
    }
    const applied = applySessionSeed();
    if (applied) {
      sessionSeedKeyRef.current = sessionBundle.sessionKey;
    }
    // applySessionSeed flips dirty implicitly via node changes — keep it clean
    // after an automatic seed so a user refresh prompt only fires on real edits.
    patchViewState({ isDirty: false });
  }, [applySessionSeed, isDirty, patchViewState, sessionBundle]);

  const handleRefreshFromSession = useCallback(() => {
    if (!sessionBundle?.isReady) {
      toast({
        title: "No session material yet",
        description: "Run Priming first so the map has something to seed from.",
        variant: "destructive",
      });
      return;
    }
    if (isDirty) {
      const confirmed =
        typeof window !== "undefined"
          ? window.confirm(
              "Your mind map has edits. Re-seed from the session? Your custom nodes stay; only the session-seeded items will be replaced.",
            )
          : true;
      if (!confirmed) return;
    }
    const applied = applySessionSeed();
    if (applied) {
      sessionSeedKeyRef.current = sessionBundle.sessionKey;
      patchViewState({ isDirty: false });
      toast({ title: "Mind map refreshed from session" });
    }
  }, [applySessionSeed, isDirty, patchViewState, sessionBundle, toast]);

  return (
    <div className="flex h-full" onPaste={handlePaste}>
      <MindMapSidebar
        checkboxIdBase={checkboxIdBase}
        courseNoteCounts={courseNoteCounts}
        graphNodeCount={graphData.nodes.length}
        onResetSubfolders={() => patchViewState({ selectedSubfolders: new Set() })}
        onSeedMap={seedMap}
        onToggleCourse={toggleCourse}
        onToggleShowNotes={(checked) => patchViewState({ showNotes: checked })}
        onToggleSubfolder={toggleSubfolder}
        selectedCourses={selectedCourses}
        selectedSubfolders={selectedSubfolders}
        showNotes={showNotes}
        vaultOnline={vaultOnline}
        visibleSubfolders={visibleSubfolders}
        sessionReady={Boolean(sessionBundle?.isReady)}
        onRefreshFromSession={handleRefreshFromSession}
      />

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
            onToggleDraw={() => patchViewState((prev) => ({ drawMode: !prev.drawMode }))}
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
              onChange={(e) => patchViewState({ mermaidInput: e.target.value })}
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
                  patchViewState({ showMermaidImport: false });
                }}
              >
                Import
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-none font-terminal text-xs border-primary/30"
                onClick={() => patchViewState({ showMermaidImport: false })}
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
