import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Material } from "@/lib/api";
import {
  buildStudioWorkspaceObjects,
  type StudioWorkspaceObject,
} from "@/lib/studioWorkspaceObjects";

export interface SourceShelfProps {
  courseId?: number | null;
  courseName: string | null;
  studyUnit: string | null;
  topic: string | null;
  materials: Material[];
  selectedMaterialIds: number[];
  selectedMaterialCount: number;
  selectedPaths: string[];
  vaultFolder: string | null;
  workspaceObjectIds?: string[];
  onAddToWorkspace?: (object: StudioWorkspaceObject) => void;
  onOpenInDocumentDock?: (
    object: Extract<StudioWorkspaceObject, { kind: "material" }>,
  ) => void;
}

type SourceShelfTab = "current_run" | "library" | "vault";

export function SourceShelf({
  courseId,
  courseName,
  studyUnit,
  topic,
  materials,
  selectedMaterialIds,
  selectedMaterialCount,
  selectedPaths,
  vaultFolder,
  workspaceObjectIds = [],
  onAddToWorkspace,
  onOpenInDocumentDock,
}: SourceShelfProps) {
  const [activeTab, setActiveTab] = useState<SourceShelfTab>("current_run");

  const scopedMaterials = useMemo(
    () =>
      typeof courseId === "number"
        ? materials.filter((material) => material.course_id === courseId)
        : materials,
    [courseId, materials],
  );

  const currentRunMaterialObjects = useMemo(
    () =>
      buildStudioWorkspaceObjects({
        materials: scopedMaterials,
        selectedMaterialIds,
        selectedPaths: [],
      }).filter(
        (
          workspaceObject,
        ): workspaceObject is Extract<StudioWorkspaceObject, { kind: "material" }> =>
          workspaceObject.kind === "material",
      ),
    [scopedMaterials, selectedMaterialIds],
  );

  const libraryMaterialObjects = useMemo(
    () =>
      buildStudioWorkspaceObjects({
        materials: scopedMaterials,
        selectedMaterialIds: scopedMaterials.map((material) => material.id),
        selectedPaths: [],
      }).filter(
        (
          workspaceObject,
        ): workspaceObject is Extract<StudioWorkspaceObject, { kind: "material" }> =>
          workspaceObject.kind === "material",
      ),
    [scopedMaterials],
  );

  const vaultPathObjects = useMemo(
    () =>
      buildStudioWorkspaceObjects({
        materials: [],
        selectedMaterialIds: [],
        selectedPaths,
      }).filter(
        (
          workspaceObject,
        ): workspaceObject is Extract<StudioWorkspaceObject, { kind: "vault_path" }> =>
          workspaceObject.kind === "vault_path",
      ),
    [selectedPaths],
  );

  const renderMaterialCard = (
    workspaceObject: Extract<StudioWorkspaceObject, { kind: "material" }>,
  ) => {
    const isInWorkspace = workspaceObjectIds.includes(workspaceObject.id);

    return (
      <div
        key={workspaceObject.id}
        className="rounded-[0.85rem] border border-primary/12 bg-black/15 p-3"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="break-words text-sm text-foreground">
              {workspaceObject.title}
            </div>
            <div className="mt-1 break-all text-xs text-foreground/62">
              {workspaceObject.detail}
            </div>
          </div>
          <Badge
            variant="outline"
            className="rounded-full border-primary/20 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-primary/84"
          >
            {workspaceObject.badge}
          </Badge>
        </div>
        <div className="mt-3">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenInDocumentDock?.(workspaceObject)}
              aria-label={`Open ${workspaceObject.title} in Document Dock`}
              className="h-8 rounded-full border-primary/20 bg-black/20 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-primary/84 hover:bg-black/30"
            >
              Open in Document Dock
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isInWorkspace}
              onClick={() => onAddToWorkspace?.(workspaceObject)}
              aria-label={
                isInWorkspace
                  ? `${workspaceObject.title} already in workspace`
                  : `Add ${workspaceObject.title} to workspace`
              }
              className="h-8 rounded-full border-primary/20 bg-black/20 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-primary/84 hover:bg-black/30 disabled:cursor-default disabled:opacity-100 disabled:text-foreground/60"
            >
              {isInWorkspace ? "In Workspace" : "Add to Workspace"}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderVaultPathCard = (
    workspaceObject: Extract<StudioWorkspaceObject, { kind: "vault_path" }>,
  ) => {
    const isInWorkspace = workspaceObjectIds.includes(workspaceObject.id);

    return (
      <div
        key={workspaceObject.id}
        className="rounded-[0.85rem] border border-primary/12 bg-black/15 p-3"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="break-all text-sm text-foreground">
              {workspaceObject.title}
            </div>
            <div className="mt-1 text-xs text-foreground/62">
              {workspaceObject.detail}
            </div>
          </div>
          <Badge
            variant="outline"
            className="rounded-full border-primary/20 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-primary/84"
          >
            {workspaceObject.badge}
          </Badge>
        </div>
        <div className="mt-3">
          <Button
            type="button"
            variant="outline"
            disabled={isInWorkspace}
            onClick={() => onAddToWorkspace?.(workspaceObject)}
            aria-label={
              isInWorkspace
                ? `${workspaceObject.title} already in workspace`
                : `Add ${workspaceObject.title} to workspace`
            }
            className="h-8 rounded-full border-primary/20 bg-black/20 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-primary/84 hover:bg-black/30 disabled:cursor-default disabled:opacity-100 disabled:text-foreground/60"
          >
            {isInWorkspace ? "In Workspace" : "Add to Workspace"}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 font-mono text-sm text-foreground/78">
      <div className="flex flex-wrap gap-2">
        {([
          ["current_run", "Current Run"],
          ["library", "Library"],
          ["vault", "Vault"],
        ] as const).map(([tabId, label]) => {
          const isActive = activeTab === tabId;
          return (
            <Button
              key={tabId}
              type="button"
              variant="outline"
              onClick={() => setActiveTab(tabId)}
              aria-pressed={isActive}
              className={
                isActive
                  ? "h-8 rounded-full border-primary/30 bg-black/20 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-primary/88"
                  : "h-8 rounded-full border-primary/20 bg-transparent px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-foreground/60"
              }
            >
              {label}
            </Button>
          );
        })}
      </div>

      <div className="space-y-3 rounded-[0.85rem] border border-primary/15 bg-black/15 p-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-primary/72">
            Course
          </div>
          <div className="mt-1 text-sm text-foreground">
            {courseName || "No course selected"}
          </div>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-primary/72">
            Study Unit
          </div>
          <div className="mt-1 text-sm text-foreground">
            {studyUnit || "No study unit selected"}
          </div>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-primary/72">
            Topic
          </div>
          <div className="mt-1 text-sm text-foreground">
            {topic || "Broad module scope"}
          </div>
        </div>
      </div>

      <div className="space-y-3 rounded-[0.85rem] border border-primary/10 bg-black/10 p-3 text-foreground/72">
        <div>{selectedMaterialCount} materials in run</div>
        <div>{vaultFolder || "Vault path not derived yet"}</div>
      </div>

      <div className="space-y-3 rounded-[0.85rem] border border-primary/10 bg-black/10 p-3 text-foreground/72">
        {activeTab === "current_run" ? (
          <>
            <div className="text-[10px] uppercase tracking-[0.18em] text-primary/72">
              Current Run Sources
            </div>

            {currentRunMaterialObjects.length > 0 ? (
              currentRunMaterialObjects.map(renderMaterialCard)
            ) : (
              <div>No current-run source objects available yet.</div>
            )}
          </>
        ) : null}

        {activeTab === "library" ? (
          <>
            <div className="text-[10px] uppercase tracking-[0.18em] text-primary/72">
              Library Sources
            </div>

            {libraryMaterialObjects.length > 0 ? (
              libraryMaterialObjects.map(renderMaterialCard)
            ) : (
              <div>No library materials available for this course yet.</div>
            )}
          </>
        ) : null}

        {activeTab === "vault" ? (
          <>
            <div className="text-[10px] uppercase tracking-[0.18em] text-primary/72">
              Linked Vault Paths
            </div>
            <div className="rounded-[0.75rem] border border-primary/12 bg-black/15 p-3 text-xs text-foreground/62">
              {vaultFolder || "Vault path not derived yet"}
            </div>

            {vaultPathObjects.length > 0 ? (
              vaultPathObjects.map(renderVaultPathCard)
            ) : (
              <div>No linked vault paths available for this run yet.</div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
