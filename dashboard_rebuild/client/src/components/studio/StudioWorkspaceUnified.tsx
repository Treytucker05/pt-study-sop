import { Suspense, lazy, useState } from "react";

import {
  type StudioTldrawWorkspaceProps,
} from "@/components/studio/StudioTldrawWorkspace";
import { StudioTldrawWorkspaceLazy } from "@/components/studio/StudioTldrawWorkspaceLazy";
import { cn } from "@/lib/utils";

type WorkspaceTabId = "canvas" | "mind-map" | "concept-map";

type StudioWorkspaceUnifiedProps = StudioTldrawWorkspaceProps & {
  courseId?: number | null;
  vaultFolder?: string | null;
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
  ...canvasProps
}: StudioWorkspaceUnifiedProps) {
  const [activeTab, setActiveTab] = useState<WorkspaceTabId>("canvas");
  const [visitedTabs, setVisitedTabs] = useState<Record<WorkspaceTabId, boolean>>({
    canvas: true,
    "mind-map": false,
    "concept-map": false,
  });

  const handleSelectTab = (nextTab: WorkspaceTabId) => {
    setActiveTab(nextTab);
    setVisitedTabs((current) =>
      current[nextTab] ? current : { ...current, [nextTab]: true },
    );
  };

  return (
    <div
      data-testid="studio-workspace-unified"
      data-course-id={typeof courseId === "number" ? courseId : undefined}
      data-vault-folder={vaultFolder || undefined}
      className="flex h-full min-h-0 flex-1 flex-col"
    >
      <div
        data-testid="studio-workspace-unified-tabs"
        role="tablist"
        aria-label={
          canvasProps.courseName
            ? `Workspace tools for ${canvasProps.courseName}`
            : "Workspace tools"
        }
        className="flex shrink-0 items-center gap-2 border-b border-primary/12 bg-black/35 px-3 py-2"
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
            <StudioTldrawWorkspaceLazy {...canvasProps} />
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
              <MindMapViewDeferred />
            </Suspense>
          </div>
        ) : null}

        {visitedTabs["concept-map"] ? (
          <div
            role="tabpanel"
            aria-labelledby="studio-workspace-tab-concept-map"
            aria-hidden={activeTab !== "concept-map"}
            className={cn(
              "absolute inset-0 min-h-0",
              activeTab === "concept-map"
                ? "z-10"
                : "pointer-events-none z-0 opacity-0",
            )}
          >
            {/* ConceptMapStructured already owns import/export state; the shell only mounts it. */}
            <Suspense fallback={<WorkspaceTabFallback label="concept map" />}>
              <ConceptMapStructuredDeferred className="h-full" />
            </Suspense>
          </div>
        ) : null}
      </div>
    </div>
  );
}
