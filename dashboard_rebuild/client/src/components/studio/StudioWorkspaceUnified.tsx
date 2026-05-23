import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import type { GraphCanvasCommand } from "@/components/brain/graph-canvas-types";

import {
  type StudioTldrawWorkspaceProps,
} from "@/components/studio/StudioTldrawWorkspace";
import { StudioTldrawWorkspaceLazy } from "@/components/studio/StudioTldrawWorkspaceLazy";
import { StudioWorkspaceMaterialSidebar } from "@/components/studio/StudioWorkspaceMaterialSidebar";
import { cn } from "@/lib/utils";
import { buildConceptMapFromBundle } from "@/lib/conceptMapFromBundle";
import type { SessionMaterialBundle } from "@/lib/sessionMaterialBundle";

/** @deprecated Legacy tab id — use WorkspaceToolId. */
type WorkspaceTabId = "canvas" | "mind-map" | "concept-map";

export type WorkspaceToolId = "select" | "mind-map" | "concept-map";

type StudioWorkspaceUnifiedProps = StudioTldrawWorkspaceProps & {
  courseId?: number | null;
  vaultFolder?: string | null;
  conceptMapImportRequest?: {
    mermaid: string;
    requestKey: number;
  } | null;
  workspaceTabRequest?: {
    tab: WorkspaceTabId;
    requestKey: number;
  } | null;
  sessionMaterialBundle?: SessionMaterialBundle;
};

const WORKSPACE_TOOLS: Array<{ id: WorkspaceToolId; label: string }> = [
  { id: "select", label: "Select" },
  { id: "mind-map", label: "Mind map" },
  { id: "concept-map", label: "Concept map" },
];

function workspaceTabToTool(tab: WorkspaceTabId): WorkspaceToolId {
  if (tab === "canvas") {
    return "select";
  }
  return tab;
}

const MindMapViewDeferred = lazy(async () => {
  const module = await import("@/components/MindMapView");
  return { default: module.MindMapView };
});

const ConceptMapStructuredDeferred = lazy(async () => {
  const module = await import("@/components/brain/ConceptMapStructured");
  return { default: module.ConceptMapStructured };
});

function WorkspaceToolFallback({ label }: { label: string }) {
  return (
    <div className="flex h-full min-h-0 items-center justify-center border border-primary/10 bg-black/20 font-mono text-xs uppercase tracking-[0.18em] text-foreground/72">
      Loading {label}...
    </div>
  );
}

export function StudioWorkspaceUnified({
  courseId,
  vaultFolder,
  conceptMapImportRequest,
  workspaceTabRequest,
  sessionMaterialBundle,
  ...canvasProps
}: StudioWorkspaceUnifiedProps) {
  const [activeTool, setActiveTool] = useState<WorkspaceToolId>("select");
  const [visitedTools, setVisitedTools] = useState<Record<WorkspaceToolId, boolean>>({
    select: true,
    "mind-map": false,
    "concept-map": false,
  });
  const [materialSidebarOpen, setMaterialSidebarOpen] = useState(false);
  const [conceptMapCommand, setConceptMapCommand] = useState<GraphCanvasCommand | null>(null);
  const [mindMapCommand, setMindMapCommand] = useState<GraphCanvasCommand | null>(null);
  const lastConceptMapRequestKeyRef = useRef<number | null>(null);
  const conceptMapCommandCounterRef = useRef<number>(1_000_000);
  const conceptMapSessionSeedKeyRef = useRef<string | null>(null);
  const addItemCommandCounterRef = useRef<number>(2_000_000);
  const lastWorkspaceTabRequestKeyRef = useRef<number | null>(null);

  const handleSelectTool = (nextTool: WorkspaceToolId) => {
    setActiveTool(nextTool);
    setVisitedTools((current) =>
      current[nextTool] ? current : { ...current, [nextTool]: true },
    );
  };

  useEffect(() => {
    const requestKey = conceptMapImportRequest?.requestKey;
    if (typeof requestKey !== "number" || lastConceptMapRequestKeyRef.current === requestKey) {
      return;
    }

    lastConceptMapRequestKeyRef.current = requestKey;
    setActiveTool("concept-map");
    setVisitedTools((current) =>
      current["concept-map"] ? current : { ...current, "concept-map": true },
    );
    setConceptMapCommand({
      id: requestKey,
      target: "structured",
      type: "import_mermaid",
      payload: conceptMapImportRequest?.mermaid || "",
    });
  }, [conceptMapImportRequest]);

  useEffect(() => {
    const requestKey = workspaceTabRequest?.requestKey;
    const tab = workspaceTabRequest?.tab;
    if (
      typeof requestKey !== "number" ||
      lastWorkspaceTabRequestKeyRef.current === requestKey ||
      !tab
    ) {
      return;
    }
    lastWorkspaceTabRequestKeyRef.current = requestKey;
    const tool = workspaceTabToTool(tab);
    setActiveTool(tool);
    setVisitedTools((current) =>
      current[tool] ? current : { ...current, [tool]: true },
    );
  }, [workspaceTabRequest]);

  const sessionConceptMapMermaid = useMemo(() => {
    if (!sessionMaterialBundle?.isReady) return "";
    return buildConceptMapFromBundle(sessionMaterialBundle);
  }, [sessionMaterialBundle]);

  useEffect(() => {
    if (!sessionMaterialBundle?.isReady) return;
    if (!visitedTools["concept-map"]) return;
    if (!sessionConceptMapMermaid) return;
    if (conceptMapSessionSeedKeyRef.current === sessionMaterialBundle.sessionKey) return;
    conceptMapSessionSeedKeyRef.current = sessionMaterialBundle.sessionKey;
    const nextId = ++conceptMapCommandCounterRef.current;
    setConceptMapCommand({
      id: nextId,
      target: "structured",
      type: "import_mermaid",
      payload: sessionConceptMapMermaid,
    });
  }, [sessionConceptMapMermaid, sessionMaterialBundle, visitedTools]);

  const handleAddItemToCanvas = useCallback(
    (label: string) => {
      const trimmed = label.trim();
      if (!trimmed) return;
      const nextId = ++addItemCommandCounterRef.current;
      if (activeTool === "mind-map") {
        setMindMapCommand({
          id: nextId,
          target: "mindmap",
          type: "add_node",
          payload: { label: trimmed },
        });
      } else if (activeTool === "concept-map") {
        setConceptMapCommand({
          id: nextId,
          target: "structured",
          type: "add_node",
          payload: { label: trimmed },
        });
      }
    },
    [activeTool],
  );

  const handleRefreshConceptMapFromSession = useCallback(() => {
    if (!sessionConceptMapMermaid) return;
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        "Re-seed the concept map from the current session? Your manual edits in this concept map will be replaced.",
      );
      if (!confirmed) return;
    }
    const nextId = ++conceptMapCommandCounterRef.current;
    setConceptMapCommand({
      id: nextId,
      target: "structured",
      type: "import_mermaid",
      payload: sessionConceptMapMermaid,
    });
    conceptMapSessionSeedKeyRef.current = sessionMaterialBundle?.sessionKey ?? null;
  }, [sessionConceptMapMermaid, sessionMaterialBundle]);

  return (
    <div
      data-testid="studio-workspace-unified"
      data-workspace-tool={activeTool}
      data-course-id={typeof courseId === "number" ? courseId : undefined}
      data-vault-folder={vaultFolder || undefined}
      className="flex h-full min-h-0 flex-1 flex-row"
    >
      {materialSidebarOpen ? (
        <StudioWorkspaceMaterialSidebar
          bundle={sessionMaterialBundle}
          workspaceObjects={canvasProps.canvasObjects}
          activeTabId={activeTool === "select" ? "canvas" : activeTool}
          onAddToCanvas={handleAddItemToCanvas}
        />
      ) : null}

      <div className="flex h-full min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center gap-2 border-b border-primary/12 bg-black/35 px-3 py-2">
          <button
            type="button"
            data-testid="studio-workspace-material-toggle"
            onClick={() => setMaterialSidebarOpen((open) => !open)}
            aria-label={
              materialSidebarOpen
                ? "Hide material sidebar"
                : "Show material sidebar"
            }
            title={
              materialSidebarOpen
                ? "Hide material sidebar"
                : "Show material sidebar"
            }
            className="inline-flex h-7 w-7 items-center justify-center rounded-[var(--ds-radius-sm)] border border-primary/15 bg-black/30 text-foreground/68 transition-colors hover:border-primary/35 hover:bg-primary/10 hover:text-white"
          >
            {materialSidebarOpen ? (
              <PanelLeftClose className="h-3.5 w-3.5" />
            ) : (
              <PanelLeftOpen className="h-3.5 w-3.5" />
            )}
          </button>
          <div
            data-testid="studio-workspace-toolbar"
            role="toolbar"
            aria-label={
              canvasProps.courseName
                ? `Workspace tools for ${canvasProps.courseName}`
                : "Workspace tools"
            }
            className="flex items-center gap-2"
          >
            {WORKSPACE_TOOLS.map((tool) => {
              const isActive = activeTool === tool.id;
              return (
                <button
                  key={tool.id}
                  type="button"
                  data-testid={`studio-workspace-tool-${tool.id}`}
                  aria-pressed={isActive}
                  onClick={() => handleSelectTool(tool.id)}
                  className={cn(
                    "rounded-[var(--ds-r-065)] border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors",
                    isActive
                      ? "border-primary/30 bg-black/20 text-white"
                      : "border-transparent text-foreground/70 hover:border-primary/15 hover:bg-black/15 hover:text-white",
                  )}
                >
                  {tool.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="relative min-h-0 flex-1">
          {visitedTools.select ? (
            <div
              aria-hidden={activeTool !== "select"}
              className={cn(
                "absolute inset-0 min-h-0",
                activeTool === "select" ? "z-10" : "pointer-events-none z-0 opacity-0",
              )}
            >
              <StudioTldrawWorkspaceLazy
                {...canvasProps}
                sessionBundle={sessionMaterialBundle}
              />
            </div>
          ) : null}

          {visitedTools["mind-map"] ? (
            <div
              aria-hidden={activeTool !== "mind-map"}
              className={cn(
                "absolute inset-0 min-h-0",
                activeTool === "mind-map"
                  ? "z-10"
                  : "pointer-events-none z-0 opacity-0",
              )}
            >
              <Suspense fallback={<WorkspaceToolFallback label="mind map" />}>
                <MindMapViewDeferred
                  sessionBundle={sessionMaterialBundle}
                  externalCommand={mindMapCommand}
                />
              </Suspense>
            </div>
          ) : null}

          {visitedTools["concept-map"] ? (
            <div
              aria-hidden={activeTool !== "concept-map"}
              className={cn(
                "absolute inset-0 flex min-h-0 flex-col",
                activeTool === "concept-map"
                  ? "z-10"
                  : "pointer-events-none z-0 opacity-0",
              )}
            >
              <div className="flex shrink-0 items-center justify-end gap-2 border-b border-primary/10 bg-black/30 px-3 py-1.5">
                <button
                  type="button"
                  data-testid="concept-map-refresh-from-session"
                  onClick={handleRefreshConceptMapFromSession}
                  disabled={!sessionConceptMapMermaid}
                  title={
                    sessionConceptMapMermaid
                      ? "Re-seed the concept map from the active session"
                      : "No session material yet"
                  }
                  className="rounded-[var(--ds-r-065)] border border-primary/25 bg-black/35 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-foreground/78 transition-colors hover:border-primary/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Refresh from session
                </button>
              </div>
              <div className="min-h-0 flex-1">
                <Suspense fallback={<WorkspaceToolFallback label="concept map" />}>
                  <ConceptMapStructuredDeferred
                    externalCommand={conceptMapCommand}
                    className="h-full"
                  />
                </Suspense>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
