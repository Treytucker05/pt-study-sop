import { useState, useCallback, useRef, lazy, Suspense, type ReactElement } from "react";
import {
  FileText,
  Zap,
  Package,
  StickyNote,
  Target,
  PenTool,
  BookOpen,
  Plus,
  Send,
  Network,
  GitBranch,
  Brain,
  ZoomIn,
  ZoomOut,
  Maximize,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  TransformWrapper,
  TransformComponent,
  useControls,
} from "react-zoom-pan-pinch";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Material, MethodBlock } from "@/api.types";
import { WorkspacePanel } from "@/components/ui/WorkspacePanel";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// Lazy-load heavy tool components so they don't bloat the initial bundle
const ExcalidrawCanvas = lazy(() =>
  import("@/components/brain/ExcalidrawCanvas").then((m) => ({
    default: m.ExcalidrawCanvas,
  })),
);
const ConceptMapStructured = lazy(() =>
  import("@/components/brain/ConceptMapStructured").then((m) => ({
    default: m.ConceptMapStructured,
  })),
);
const VaultGraphView = lazy(() =>
  import("@/components/VaultGraphView").then((m) => ({
    default: m.VaultGraphView,
  })),
);
const MindMapView = lazy(() =>
  import("@/components/MindMapView").then((m) => ({
    default: m.MindMapView,
  })),
);

// ── Props ─────────────────────────────────────────────────────────────

export interface WorkspaceCanvasProps {
  courseId: number | null;
  selectedMaterialIds: number[];
}

// ── Panel registry types ──────────────────────────────────────────────

export interface PanelRegistryEntry {
  type: string;
  label: string;
  icon: LucideIcon;
  defaultSize: { width: number; height: number };
  allowMultiple: boolean;
}

export const PANEL_REGISTRY: PanelRegistryEntry[] = [
  { type: "material-viewer", label: "Material Viewer", icon: FileText,    defaultSize: { width: 400, height: 500 }, allowMultiple: false },
  { type: "method-runner",   label: "Method Runner",   icon: Zap,         defaultSize: { width: 400, height: 500 }, allowMultiple: true },
  { type: "packet",          label: "Packet",          icon: Package,     defaultSize: { width: 350, height: 600 }, allowMultiple: false },
  { type: "notes",           label: "Notes",           icon: StickyNote,  defaultSize: { width: 350, height: 400 }, allowMultiple: true },
  { type: "objectives",      label: "Objectives",      icon: Target,      defaultSize: { width: 350, height: 400 }, allowMultiple: false },
  { type: "excalidraw",      label: "Excalidraw",      icon: PenTool,     defaultSize: { width: 600, height: 500 }, allowMultiple: false },
  { type: "concept-map",     label: "Concept Map",     icon: Network,     defaultSize: { width: 600, height: 500 }, allowMultiple: false },
  { type: "vault-graph",     label: "Vault Graph",     icon: GitBranch,   defaultSize: { width: 600, height: 500 }, allowMultiple: false },
  { type: "mind-map",        label: "Mind Map",        icon: Brain,       defaultSize: { width: 600, height: 500 }, allowMultiple: false },
  { type: "obsidian",        label: "Obsidian",        icon: BookOpen,    defaultSize: { width: 400, height: 500 }, allowMultiple: false },
];

// ── Panel instance state ──────────────────────────────────────────────

export interface PanelInstance {
  id: string;
  type: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  collapsed: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────

const STAGGER_OFFSET = 30;

function registryFor(type: string): PanelRegistryEntry | undefined {
  return PANEL_REGISTRY.find((e) => e.type === type);
}

let panelCounter = 0;
function nextPanelId(type: string): string {
  panelCounter += 1;
  return `${type}-${panelCounter}`;
}

function buildDefaultLayout(): PanelInstance[] {
  return [
    {
      id: nextPanelId("material-viewer"),
      type: "material-viewer",
      position: { x: 20, y: 20 },
      size: { width: 400, height: 500 },
      collapsed: false,
    },
    {
      id: nextPanelId("method-runner"),
      type: "method-runner",
      position: { x: 440, y: 20 },
      size: { width: 400, height: 500 },
      collapsed: false,
    },
    {
      id: nextPanelId("packet"),
      type: "packet",
      position: { x: 860, y: 20 },
      size: { width: 350, height: 600 },
      collapsed: false,
    },
  ];
}

// ── Lazy-loading placeholder ──────────────────────────────────────────

function LazyFallback({ label }: { label: string }): ReactElement {
  return (
    <div className="flex items-center justify-center h-full">
      <span className="animate-pulse font-terminal text-xs text-primary/50 uppercase tracking-wider">
        Loading {label}...
      </span>
    </div>
  );
}

// ── Live panel content components ─────────────────────────────────────

const FILE_TYPE_COLORS: Record<string, string> = {
  pdf: "bg-red-800/60 text-red-300",
  ppt: "bg-orange-800/60 text-orange-300",
  pptx: "bg-orange-800/60 text-orange-300",
  txt: "bg-green-800/60 text-green-300",
  mp4: "bg-blue-800/60 text-blue-300",
};

function MaterialViewerContent({
  courseId,
  selectedMaterialIds,
}: {
  courseId: number | null;
  selectedMaterialIds: number[];
}): ReactElement {
  const [activeId, setActiveId] = useState<number | null>(null);

  const { data: allMaterials = [] } = useQuery<Material[]>({
    queryKey: ["workspace-materials", courseId],
    queryFn: () =>
      api.tutor.getMaterials(courseId ? { course_id: courseId } : undefined),
    enabled: courseId !== null,
  });

  const materials =
    selectedMaterialIds.length > 0
      ? allMaterials.filter((m) => selectedMaterialIds.includes(m.id))
      : allMaterials;

  const activeMaterial = materials.find((m) => m.id === activeId) ?? null;
  const isPdf = activeMaterial?.file_type?.toLowerCase() === "pdf";

  const { data: content } = useQuery({
    queryKey: ["workspace-material-content", activeId],
    queryFn: () => api.tutor.getMaterialContent(activeId!),
    enabled: activeId !== null && !isPdf,
  });

  if (materials.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="font-mono text-sm text-foreground/50">
          {courseId === null ? "Select a course" : "No materials available"}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-2 p-2">
      {/* Material list */}
      <ScrollArea className="max-h-[200px]">
        <ul className="space-y-1">
          {materials.map((m) => {
            const isActive = m.id === activeId;
            const ft = (m.file_type ?? "").toLowerCase();
            const badgeColor =
              FILE_TYPE_COLORS[ft] ?? "bg-gray-800/60 text-gray-300";
            return (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => setActiveId(m.id)}
                  className={cn(
                    "flex items-center gap-2 w-full rounded-sm border px-2 py-1.5 text-left font-mono text-xs transition-colors",
                    isActive
                      ? "border-primary/50 bg-primary/10 text-foreground"
                      : "border-primary/10 text-foreground/60 hover:border-primary/30 hover:text-foreground/80",
                  )}
                >
                  <FileText className="w-3 h-3 shrink-0 text-primary/50" />
                  <span className="truncate">{m.title || "Untitled"}</span>
                  <span
                    className={cn(
                      "ml-auto shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider",
                      badgeColor,
                    )}
                  >
                    {(ft || "file").toUpperCase()}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </ScrollArea>

      {/* Preview area */}
      {activeMaterial && (
        <div className="flex-1 min-h-0 flex flex-col rounded-sm border border-primary/15 bg-black/40">
          <div className="flex items-center gap-2 border-b border-primary/15 px-3 py-1.5">
            <Send className="w-3 h-3 text-primary/50" />
            <span className="font-terminal text-xs text-primary/80 truncate">
              {activeMaterial.title || "Untitled"}
            </span>
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            {isPdf ? (
              <iframe
                src={api.tutor.getMaterialFileUrl(activeId!)}
                title="PDF viewer"
                className="h-full w-full border-0"
              />
            ) : content?.content ? (
              <pre className="whitespace-pre-wrap p-3 font-terminal text-xs leading-5 text-foreground/80">
                {content.content}
              </pre>
            ) : (
              <div className="flex h-20 items-center justify-center">
                <span className="animate-pulse font-mono text-xs text-foreground/50">
                  Loading...
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const CATEGORY_COLORS: Record<string, string> = {
  retrieve: "bg-green-500/20 text-green-400",
  encode: "bg-blue-500/20 text-blue-400",
  review: "bg-purple-500/20 text-purple-400",
  organize: "bg-amber-500/20 text-amber-400",
  prepare: "bg-cyan-500/20 text-cyan-400",
  teach: "bg-teal-500/20 text-teal-400",
  interrogate: "bg-violet-500/20 text-violet-400",
};

function MethodRunnerContent(): ReactElement {
  const [selectedBlock, setSelectedBlock] = useState<MethodBlock | null>(null);

  const { data: blocks = [] } = useQuery<MethodBlock[]>({
    queryKey: ["workspace-method-blocks"],
    queryFn: () => api.tutor.getMethodBlocks(),
  });

  if (selectedBlock) {
    return (
      <div className="flex flex-col h-full p-2 gap-2">
        <button
          type="button"
          onClick={() => setSelectedBlock(null)}
          className="self-start text-xs font-terminal text-primary/60 hover:text-primary transition-colors"
        >
          &larr; Back to list
        </button>
        <div className="flex-1 min-h-0 overflow-auto rounded-sm border border-primary/15 bg-black/40 p-3">
          <h4 className="font-terminal text-sm text-primary/90 tracking-wider uppercase">
            {selectedBlock.name}
          </h4>
          <div className="mt-2 flex flex-wrap gap-2">
            <span
              className={cn(
                "text-[10px] px-1.5 py-0.5 rounded-sm uppercase font-terminal tracking-wider",
                CATEGORY_COLORS[selectedBlock.category] ?? "bg-primary/10 text-primary/70",
              )}
            >
              {selectedBlock.category}
            </span>
            {selectedBlock.method_id && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-primary/10 text-primary/50 font-mono">
                {selectedBlock.method_id}
              </span>
            )}
            {selectedBlock.best_stage && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-primary/10 text-primary/50 font-mono">
                Stage: {selectedBlock.best_stage}
              </span>
            )}
          </div>
          {selectedBlock.description && (
            <p className="mt-3 text-xs text-foreground/70 leading-5">
              {selectedBlock.description}
            </p>
          )}
          <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] font-mono text-foreground/50">
            <div>Duration: {selectedBlock.default_duration_min}min</div>
            <div>Energy: {selectedBlock.energy_cost}</div>
          </div>
          {selectedBlock.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {selectedBlock.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] px-1 py-0.5 rounded-sm bg-primary/5 text-primary/40 font-mono"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (blocks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="font-mono text-sm text-foreground/50">
          No method blocks available
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-2">
      <ScrollArea className="flex-1">
        <ul className="space-y-1">
          {blocks.map((block) => (
            <li key={block.id}>
              <button
                type="button"
                onClick={() => setSelectedBlock(block)}
                className={cn(
                  "w-full text-left px-2 py-1.5 rounded-sm",
                  "bg-background/40 border border-primary/10",
                  "hover:border-primary/30 hover:bg-primary/5",
                  "transition-colors cursor-pointer",
                )}
              >
                <div className="flex items-center gap-2">
                  <Zap className="w-3 h-3 shrink-0 text-primary/50" />
                  <span className="font-terminal text-xs text-primary/90 truncate">
                    {block.name}
                  </span>
                  <span
                    className={cn(
                      "ml-auto shrink-0 text-[10px] px-1.5 py-0.5 rounded-sm uppercase font-terminal tracking-wider",
                      CATEGORY_COLORS[block.category] ?? "bg-primary/10 text-primary/70",
                    )}
                  >
                    {block.category}
                  </span>
                </div>
                {block.description && (
                  <p className="text-[10px] text-primary/40 mt-0.5 line-clamp-1 pl-5">
                    {block.description}
                  </p>
                )}
              </button>
            </li>
          ))}
        </ul>
      </ScrollArea>
    </div>
  );
}

// ── Tool panel content wrappers ───────────────────────────────────────

function ExcalidrawPanelContent(): ReactElement {
  return (
    <Suspense fallback={<LazyFallback label="Excalidraw" />}>
      <div className="h-full w-full">
        <ExcalidrawCanvas />
      </div>
    </Suspense>
  );
}

function ConceptMapPanelContent(): ReactElement {
  return (
    <Suspense fallback={<LazyFallback label="Concept Map" />}>
      <div className="h-full w-full">
        <ConceptMapStructured />
      </div>
    </Suspense>
  );
}

function VaultGraphPanelContent(): ReactElement {
  return (
    <Suspense fallback={<LazyFallback label="Vault Graph" />}>
      <div className="h-full w-full">
        <VaultGraphView />
      </div>
    </Suspense>
  );
}

function MindMapPanelContent(): ReactElement {
  return (
    <Suspense fallback={<LazyFallback label="Mind Map" />}>
      <div className="h-full w-full">
        <MindMapView />
      </div>
    </Suspense>
  );
}

// ── Zoom controls (inside TransformWrapper context) ───────────────────

function ZoomControls(): ReactElement {
  const { zoomIn, zoomOut, resetTransform } = useControls();
  return (
    <div className="absolute top-3 right-3 z-50 flex items-center gap-1 bg-background/90 border border-primary/20 rounded-sm shadow-[0_2px_8px_rgba(0,0,0,0.4)]">
      <button
        type="button"
        onClick={() => zoomIn(0.2)}
        className="flex items-center justify-center w-8 h-8 text-primary/60 hover:text-primary hover:bg-primary/10 transition-colors"
        title="Zoom In"
      >
        <ZoomIn className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => zoomOut(0.2)}
        className="flex items-center justify-center w-8 h-8 text-primary/60 hover:text-primary hover:bg-primary/10 transition-colors"
        title="Zoom Out"
      >
        <ZoomOut className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => resetTransform()}
        className="flex items-center justify-center w-8 h-8 text-primary/60 hover:text-primary hover:bg-primary/10 transition-colors font-terminal text-xs"
        title="Reset zoom (1:1)"
      >
        <Maximize className="w-4 h-4" />
      </button>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────

export function WorkspaceCanvas({
  courseId,
  selectedMaterialIds,
}: WorkspaceCanvasProps): ReactElement {
  const [panels, setPanels] = useState<PanelInstance[]>(buildDefaultLayout);
  const [menuOpen, setMenuOpen] = useState(false);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);

  // Spawn a new panel or flash an existing single-instance one
  const spawnPanel = useCallback(
    (type: string) => {
      const entry = registryFor(type);
      if (!entry) return;

      // Single-instance guard: if it already exists, flash it
      if (!entry.allowMultiple) {
        const existing = panels.find((p) => p.type === type);
        if (existing) {
          if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
          setFlashId(existing.id);
          flashTimerRef.current = setTimeout(() => setFlashId(null), 600);
          setMenuOpen(false);
          return;
        }
      }

      const instanceCount = panels.length;
      const newPanel: PanelInstance = {
        id: nextPanelId(type),
        type,
        position: {
          x: 20 + instanceCount * STAGGER_OFFSET,
          y: 20 + instanceCount * STAGGER_OFFSET,
        },
        size: { ...entry.defaultSize },
        collapsed: false,
      };

      setPanels((prev) => [...prev, newPanel]);
      setMenuOpen(false);
    },
    [panels],
  );

  const closePanel = useCallback((id: string) => {
    setPanels((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const updateCollapsed = useCallback((id: string, collapsed: boolean) => {
    setPanels((prev) =>
      prev.map((p) => (p.id === id ? { ...p, collapsed } : p)),
    );
  }, []);

  const updatePosition = useCallback(
    (id: string, position: { x: number; y: number }) => {
      setPanels((prev) =>
        prev.map((p) => (p.id === id ? { ...p, position } : p)),
      );
    },
    [],
  );

  const updateSize = useCallback(
    (id: string, size: { width: number; height: number }) => {
      setPanels((prev) =>
        prev.map((p) => (p.id === id ? { ...p, size } : p)),
      );
    },
    [],
  );

  // Render panel content based on type
  const renderPanelContent = useCallback(
    (panelType: string, icon: LucideIcon, label: string): ReactElement => {
      const Icon = icon;
      switch (panelType) {
        case "material-viewer":
          return (
            <MaterialViewerContent
              courseId={courseId}
              selectedMaterialIds={selectedMaterialIds}
            />
          );
        case "method-runner":
          return <MethodRunnerContent />;
        case "excalidraw":
          return <ExcalidrawPanelContent />;
        case "concept-map":
          return <ConceptMapPanelContent />;
        case "vault-graph":
          return <VaultGraphPanelContent />;
        case "mind-map":
          return <MindMapPanelContent />;
        default:
          return (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-primary/40">
              <Icon className="w-8 h-8" />
              <span className="font-terminal text-xs uppercase tracking-wider">
                {label}
              </span>
            </div>
          );
      }
    },
    [courseId, selectedMaterialIds],
  );

  return (
    <div
      className="relative bg-background/50"
      style={{ width: "100%", height: "calc(100vh - 180px)", overflow: "hidden", position: "relative" }}
    >
      <TransformWrapper
        initialScale={0.7}
        minScale={0.3}
        maxScale={2}
        centerOnInit
        wheel={{ step: 0.08 }}
        panning={{ activationKeys: [" "], velocityDisabled: true }}
        doubleClick={{ disabled: true }}
      >
        <ZoomControls />
        <TransformComponent
          wrapperStyle={{ width: "100%", height: "100%" }}
          contentStyle={{ width: "4000px", height: "4000px", position: "relative" }}
        >
          {/* ── Active panels ─────────────────────────────────────── */}
          {panels.map((panel) => {
            const entry = registryFor(panel.type);
            if (!entry) return null;

            return (
              <WorkspacePanel
                key={panel.id}
                id={panel.id}
                title={entry.label}
                defaultPosition={panel.position}
                defaultSize={panel.size}
                collapsed={panel.collapsed}
                onCollapsedChange={(c) => updateCollapsed(panel.id, c)}
                onPositionChange={(pos) => updatePosition(panel.id, pos)}
                onSizeChange={(s) => updateSize(panel.id, s)}
                onClose={() => closePanel(panel.id)}
                className={cn(
                  flashId === panel.id && "ring-2 ring-primary animate-pulse",
                )}
              >
                {renderPanelContent(panel.type, entry.icon, entry.label)}
              </WorkspacePanel>
            );
          })}
        </TransformComponent>
      </TransformWrapper>

      {/* ── Add-panel button + dropdown (outside transform) ──── */}
      <div className="absolute bottom-4 right-4 z-50">
        {menuOpen && (
          <div
            role="menu"
            className={cn(
              "absolute bottom-12 right-0 w-52",
              "bg-background/95 backdrop-blur-sm border border-primary/20 rounded-sm",
              "shadow-[0_4px_12px_rgba(0,0,0,0.4)] py-1",
            )}
          >
            {PANEL_REGISTRY.map((entry) => {
              const Icon = entry.icon;
              const alreadyOpen =
                !entry.allowMultiple &&
                panels.some((p) => p.type === entry.type);

              return (
                <button
                  key={entry.type}
                  role="menuitem"
                  type="button"
                  aria-label={entry.label}
                  disabled={alreadyOpen}
                  onClick={() => spawnPanel(entry.type)}
                  className={cn(
                    "flex items-center gap-2 w-full px-3 py-2 text-left",
                    "font-terminal text-xs uppercase tracking-wider",
                    alreadyOpen
                      ? "text-primary/25 cursor-not-allowed"
                      : "text-primary/70 hover:bg-primary/10 hover:text-primary",
                    "transition-colors",
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {entry.label}
                </button>
              );
            })}
          </div>
        )}

        <button
          type="button"
          aria-label="Add panel"
          onClick={() => setMenuOpen((o) => !o)}
          className={cn(
            "flex items-center justify-center w-10 h-10 rounded-full",
            "bg-primary/10 border border-primary/30 text-primary/70",
            "hover:bg-primary/20 hover:text-primary transition-colors",
            "shadow-[0_2px_8px_rgba(0,0,0,0.3)]",
          )}
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
