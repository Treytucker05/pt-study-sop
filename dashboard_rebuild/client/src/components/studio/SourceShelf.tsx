import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Material } from "@/lib/api";
import {
  buildStudioWorkspaceObjects,
  type StudioWorkspaceObject,
} from "@/lib/studioWorkspaceObjects";

export interface SourceShelfProps {
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
}

export function SourceShelf({
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
}: SourceShelfProps) {
  const currentRunObjects = buildStudioWorkspaceObjects({
    materials,
    selectedMaterialIds,
    selectedPaths,
  });

  return (
    <div className="space-y-4 font-mono text-sm text-foreground/78">
      <div className="flex flex-wrap gap-2">
        <Badge
          variant="outline"
          className="rounded-full border-primary/30 bg-black/20 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-primary/88"
        >
          Current Run
        </Badge>
        <Badge
          variant="outline"
          className="rounded-full border-primary/20 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-foreground/60"
        >
          Library
        </Badge>
        <Badge
          variant="outline"
          className="rounded-full border-primary/20 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-foreground/60"
        >
          Vault
        </Badge>
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
        <div className="text-[10px] uppercase tracking-[0.18em] text-primary/72">
          Current Run Sources
        </div>

        {currentRunObjects.length > 0 ? (
          currentRunObjects.map((workspaceObject) => {
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
          })
        ) : (
          <div>No current-run source objects available yet.</div>
        )}
      </div>
    </div>
  );
}
