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

type WorkspaceTabId = "canvas" | "mind-map" | "concept-map";

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

const MindMapViewDeferred = lazy(async () => {
  const module = await import("@/components/MindMapView");
  return { default: module.MindMapView };
});

const ConceptMapStructuredDeferred = lazy(async () => {
  const module = await import("@/components/brain/ConceptMapStructured");
  return { default: module.ConceptMapStructured };
});

const WORKSPACE_TABS: Array<{ id: WorkspaceTabId; label: string }> = [
  { id: "canvas", label: "Canvas" },
  { id: "mind-map", label: "Mind Map" },
  { id: "concept-map", label: "Concept Map" },
];

function WorkspaceTabFallback({ label }: { label: string }) {
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
  const [activeTab, setActiveTab] = useState<WorkspaceTabId>("canvas");
  const [visitedTabs, setVisitedTabs] = useState<Record<WorkspaceTabId, boolean>>({
    canvas: true,
    "mind-map": false,
    "concept-map": false,
  });
  const [materialSidebarOpen, setMaterialSidebarOpen] = useState(true);
  const [conceptMapCommand, setConceptMapCommand] = useState<GraphCanvasCommand | null>(null);
  const [mindMapCommand, setMindMapCommand] = useState<GraphCanvasCommand | null>(null);
  const lastConceptMapRequestKeyRef = useRef<number | null>(null);
  const conceptMapCommandCounterRef = useRef<number>(1_000_000);
  const conceptMapSessionSeedKeyRef = useRef<string | null>(null);
  const addItemCommandCounterRef = useRef<number>(2_000_000);
  const lastWorkspaceTabRequestKeyRef = useRef<number | null>(null);

  const handleSelectTab = (nextTab: WorkspaceTabId) => {
    setActiveTab(nextTab);
    setVisitedTabs((current) =>
      current[nextTab] ? current : { ...current, [nextTab]: true },
    );
  };

  useEffect(() => {
    const requestKey = conceptMapImportRequest?.requestKey;
    if (typeof requestKey !== "number" || lastConceptMapRequestKeyRef.current === requestKey) {
      return;
    }

    lastConceptMapRequestKeyRef.current = requestKey;
    setActiveTab("concept-map");
    setVisitedTabs((current) =>
      current["concept-map"] ? current : { ...current, "concept-map": true },
    );
    setConceptMapCommand({
      id: requestKey,
      target: "structured",
      type: "import_mermaid",
      payload: conceptMapImportRequest?.mermaid || "",
    });
  }, [conceptMapImportRequest]);

  // External tab-switch request — used by the Document Dock clip flow so a
  // freshly clipped excerpt actually shows up on the tldraw Canvas tab where
  // it renders, instead of staying invisible on Mind Map / Concept Map.
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
    setActiveTab(tab);
    setVisitedTabs((current) =>
      current[tab] ? current : { ...current, [tab]: true },
    );
  }, [workspaceTabRequest]);

  const sessionConceptMapMermaid = useMemo(() => {
    if (!sessionMaterialBundle?.isReady) return "";
    return buildConceptMapFromBundle(sessionMaterialBundle);
  }, [sessionMaterialBundle]);

  useEffect(() => {
    if (!sessionMaterialBundle?.isReady) return;
    if (!visitedTabs["concept-map"]) return;
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
  }, [sessionConceptMapMermaid, sessionMaterialBundle, visitedTabs]);

  const handleAddItemToCanvas = useCallback(
    (label: string) => {
      const trimmed = label.trim();
      if (!trimmed) return;
      const nextId = ++addItemCommandCounterRef.current;
      if (activeTab === "mind-map") {
        setMindMapCommand({
          id: nextId,
          target: "mindmap",
          type: "add_node",
          payload: { label: trimmed },
        });
      } else if (activeTab === "concept-map") {
        setConceptMapCommand({
          id: nextId,
          target: "structured",
          type: "add_node",
          payload: { label: trimmed },
        });
      }
    },
    [activeTab],
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
      data-course-id={typeof courseId === "number" ? courseId : undefined}
      data-vault-folder={vaultFolder || undefined}
      className="flex h-full min-h-0 flex-1 flex-row"
    >
      {materialSidebarOpen ? (
        <StudioWorkspaceMaterialSidebar
          bundle={sessionMaterialBundle}
          activeTabId={activeTab}
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
            className="inline-flex h-7 w-7 items-center justify-center rounded-[0.55rem] border border-primary/15 bg-black/30 text-foreground/68 transition-colors hover:border-primary/35 hover:bg-primary/10 hover:text-white"
          >
            {materialSidebarOpen ? (
              <PanelLeftClose className="h-3.5 w-3.5" />
            ) : (
              <PanelLeftOpen className="h-3.5 w-3.5" />
            )}
          </button>
          <div
            data-testid="studio-workspace-unified-tabs"
            role="tablist"
            aria-label={
              canvasProps.courseName
                ? `Workspace tools for ${canvasProps.courseName}`
                : "Workspace tools"
            }
            className="flex items-center gap-2"
          >
          {WORKSPACE_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`studio-workspace-tab-${tab.id}`}
                type="button"
                role="tab"
                data-testid={`studio-workspace-tab-${tab.id}`}
                aria-selected={isActive}
                onClick={() => handleSelectTab(tab.id)}
                className={cn(
                  "rounded-[0.65rem] border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors",
                  isActive
                    ? "border-primary/30 bg-black/20 text-white"
                    : "border-transparent text-foreground/70 hover:border-primary/15 hover:bg-black/15 hover:text-white",
                )}
              >
                {tab.label}
              </button>
            );
          })}
          </div>
        </div>

        <div className="relative min-h-0 flex-1">
        {visitedTabs.canvas ? (
          <div
            role="tabpanel"
            aria-labelledby="studio-workspace-tab-canvas"
            aria-hidden={activeTab !== "canvas"}
            className={cn(
              "absolute inset-0 min-h-0",
              activeTab === "canvas" ? "z-10" : "pointer-events-none z-0 opacity-0",
            )}
          >
            <StudioTldrawWorkspaceLazy
              {...canvasProps}
              sessionBundle={sessionMaterialBundle}
            />
          </div>
        ) : null}

        {visitedTabs["mind-map"] ? (
          <div
            role="tabpanel"
            aria-labelledby="studio-workspace-tab-mind-map"
            aria-hidden={activeTab !== "mind-map"}
            className={cn(
              "absolute inset-0 min-h-0",
              activeTab === "mind-map"
                ? "z-10"
                : "pointer-events-none z-0 opacity-0",
            )}
          >
            {/* MindMapView owns its own vault/course fetches; the shell only mounts it. */}
            <Suspense fallback={<WorkspaceTabFallback label="mind map" />}>
              <MindMapViewDeferred
                sessionBundle={sessionMaterialBundle}
                externalCommand={mindMapCommand}
              />
            </Suspense>
          </div>
        ) : null}

        {visitedTabs["concept-map"] ? (
          <div
            role="tabpanel"
            aria-labelledby="studio-workspace-tab-concept-map"
            aria-hidden={activeTab !== "concept-map"}
            className={cn(
              "absolute inset-0 flex min-h-0 flex-col",
              activeTab === "concept-map"
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
                className="rounded-[0.65rem] border border-primary/25 bg-black/35 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-foreground/78 transition-colors hover:border-primary/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Refresh from session
              </button>
            </div>
            {/* ConceptMapStructured already owns import/export state; the shell only mounts it. */}
            <div className="flex-1 min-h-0">
              <Suspense fallback={<WorkspaceTabFallback label="concept map" />}>
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
