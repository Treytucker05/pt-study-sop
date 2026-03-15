import { type RefObject, useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Eye,
  Layers3,
  Play,
  Wrench,
} from "lucide-react";

import { api } from "@/lib/api";
import type { Material, MaterialContent, MethodBlock } from "@/lib/api";
import { getDisplayStage, DISPLAY_STAGE_LABELS } from "@/lib/displayStage";
import { CONTROL_PLANE_COLORS, CONTROL_PLANE_DEFAULT } from "@/lib/colors";
import { MaterialViewer } from "@/components/MaterialViewer";
import { TutorWorkspaceSurface, type TutorWorkspaceSurfaceHandle } from "@/components/TutorWorkspaceSurface";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

function getMaterialLabel(material: Material): string {
  const explicitTitle = String(material.title || "").trim();
  if (explicitTitle) return explicitTitle;
  const normalizedPath = String(material.source_path || "").replace(/\\/g, "/").trim();
  if (!normalizedPath) return `Material ${material.id}`;
  const segments = normalizedPath.split("/");
  return segments[segments.length - 1] || `Material ${material.id}`;
}

function stageBadgeColors(block: MethodBlock) {
  const stage = getDisplayStage(block);
  const stageKey = block.control_stage?.toUpperCase() || block.category?.toUpperCase() || "";
  return CONTROL_PLANE_COLORS[stageKey] || CONTROL_PLANE_COLORS[stage] || CONTROL_PLANE_DEFAULT;
}

type RightTab = "material" | "workbench";

type StudioPrepModeProps = {
  chainId?: number;
  availableMaterials: Material[];
  viewerMaterial: Material | null;
  viewerMaterialContent?: MaterialContent;
  viewerMaterialLoading: boolean;
  onSelectMaterial: (id: number) => void;
  onOpenMaterialPopout: () => void;
  onOpenWorkbenchPopout: () => void;
  onLaunchSession: () => void;
  workspaceSurfaceRef: RefObject<TutorWorkspaceSurfaceHandle | null>;
};

export function StudioPrepMode({
  chainId,
  availableMaterials,
  viewerMaterial,
  viewerMaterialContent,
  viewerMaterialLoading,
  onSelectMaterial,
  onOpenMaterialPopout,
  onOpenWorkbenchPopout,
  onLaunchSession,
  workspaceSurfaceRef,
}: StudioPrepModeProps) {
  const [activeStepId, setActiveStepId] = useState<number | null>(null);
  const [rightTab, setRightTab] = useState<RightTab>("material");

  const { data: chainData } = useQuery({
    queryKey: ["chain-expanded", chainId],
    queryFn: () => api.chains.getOne(chainId!),
    enabled: typeof chainId === "number",
    staleTime: 60 * 1000,
  });

  const blocks = chainData?.blocks ?? [];
  const activeBlock = blocks.find((b) => b.id === activeStepId) ?? null;

  const handleStepClick = useCallback((blockId: number) => {
    setActiveStepId((prev) => (prev === blockId ? null : blockId));
  }, []);

  // ─── No chain selected ───
  if (typeof chainId !== "number") {
    return (
      <div className="flex flex-1 min-h-0 items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <Layers3 className="mx-auto mb-3 h-8 w-8 text-primary/40" />
          <div className="font-arcade text-xs text-primary">NO CHAIN SELECTED</div>
          <div className="mt-2 font-terminal text-sm text-muted-foreground">
            Pick a method chain from the Start Panel to guide your prep work.
          </div>
          <Button
            type="button"
            onClick={onLaunchSession}
            className="mt-4 rounded-none border-2 border-primary bg-primary/10 font-arcade text-[10px] text-primary hover:bg-primary/20"
          >
            <Play className="mr-1.5 h-3 w-3" />
            OPEN START PANEL
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 grid gap-0 grid-cols-[220px_1fr]">
      {/* ─── Left: Method Rail ─── */}
      <div className="flex min-h-0 flex-col border-r border-primary/20 bg-black/40">
        {/* Chain header — compact single line */}
        <div className="flex items-center gap-2 border-b border-primary/20 px-2.5 py-1.5 bg-black/30">
          <span className="font-arcade text-[9px] text-primary/60 shrink-0">GUIDE</span>
          {chainData && (
            <span className="font-terminal text-[11px] text-muted-foreground truncate">
              {chainData.name}
            </span>
          )}
        </div>

        {/* Steps + inline facilitation in a single scroll area */}
        <ScrollArea className="min-h-0 flex-1">
          <div className="p-1.5 space-y-0.5">
            {blocks.map((block, idx) => {
              const stage = getDisplayStage(block);
              const colors = stageBadgeColors(block);
              const isActive = activeBlock?.id === block.id;
              return (
                <div key={block.id}>
                  <button
                    type="button"
                    data-testid={`prep-step-${block.id}`}
                    onClick={() => handleStepClick(block.id)}
                    className={cn(
                      "block w-full border px-2 py-1.5 text-left transition-colors",
                      isActive
                        ? "border-yellow-500/50 bg-yellow-500/5"
                        : "border-primary/10 bg-transparent hover:border-primary/30 hover:bg-black/20",
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="font-terminal text-[10px] text-muted-foreground shrink-0 w-3.5 text-right">
                        {idx + 1}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn("rounded-none text-[8px] px-1 py-0 shrink-0 leading-tight", colors.badge)}
                      >
                        {DISPLAY_STAGE_LABELS[stage]}
                      </Badge>
                      <span className="font-arcade text-[9px] text-primary truncate flex-1">
                        {block.name}
                      </span>
                      <span className="font-terminal text-[10px] text-muted-foreground/60 shrink-0">
                        {block.default_duration_min}m
                      </span>
                      {isActive ? (
                        <ChevronDown className="h-2.5 w-2.5 text-yellow-400 shrink-0" />
                      ) : (
                        <ChevronRight className="h-2.5 w-2.5 text-muted-foreground/30 shrink-0" />
                      )}
                    </div>
                  </button>

                  {/* Inline facilitation — expands within the scroll */}
                  {isActive && (
                    <div className="border-x border-b border-yellow-500/20 bg-yellow-500/[0.03] px-2.5 py-2">
                      <div className="font-arcade text-[8px] text-yellow-400/70 mb-1">FACILITATION</div>
                      <div className="font-terminal text-[11px] text-zinc-300 whitespace-pre-wrap leading-relaxed max-h-[180px] overflow-y-auto">
                        {activeBlock.facilitation_prompt || "No facilitation prompt for this block."}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Launch button — always anchored */}
        <div className="border-t border-primary/20 p-2">
          <Button
            type="button"
            onClick={onLaunchSession}
            className="w-full rounded-none border-2 border-green-500 bg-green-500/10 font-arcade text-[10px] text-green-400 hover:bg-green-500/20"
            data-testid="prep-launch-session"
          >
            <Play className="mr-1.5 h-3 w-3" />
            LAUNCH SESSION
          </Button>
        </div>
      </div>

      {/* ─── Right: Material / Workbench ─── */}
      <div className="flex min-h-0 flex-col bg-black/20">
        {/* Tab bar + source picker — single compact header row */}
        <div className="flex items-center border-b border-primary/20 bg-black/30">
          {/* Material / Workbench tabs */}
          <div className="flex items-center gap-1 px-2 py-1">
            <button
              type="button"
              onClick={() => setRightTab("material")}
              className={cn(
                "flex items-center gap-1 px-2 py-1 font-arcade text-[10px] transition-colors",
                rightTab === "material"
                  ? "text-primary border-b border-primary"
                  : "text-muted-foreground hover:text-primary",
              )}
            >
              <Eye className="h-3 w-3" />
              MATERIAL
            </button>
            <button
              type="button"
              onClick={onOpenMaterialPopout}
              className="text-muted-foreground hover:text-primary p-1"
              title="Open viewer in new window"
            >
              <ExternalLink className="h-3 w-3" />
            </button>

            <div className="mx-1 h-4 w-px bg-primary/20" />

            <button
              type="button"
              onClick={() => setRightTab("workbench")}
              className={cn(
                "flex items-center gap-1 px-2 py-1 font-arcade text-[10px] transition-colors",
                rightTab === "workbench"
                  ? "text-primary border-b border-primary"
                  : "text-muted-foreground hover:text-primary",
              )}
            >
              <Wrench className="h-3 w-3" />
              WORKBENCH
            </button>
            <button
              type="button"
              onClick={onOpenWorkbenchPopout}
              className="text-muted-foreground hover:text-primary p-1"
              title="Open workbench in new window"
            >
              <ExternalLink className="h-3 w-3" />
            </button>
          </div>

          {/* Source picker — horizontal tabs on the right side of the header */}
          {rightTab === "material" && availableMaterials.length > 0 && (
            <>
              <div className="mx-1 h-4 w-px bg-primary/15" />
              <div className="flex items-center gap-1 overflow-x-auto px-2 py-1 scrollbar-none">
                {availableMaterials.map((material) => {
                  const active = viewerMaterial?.id === material.id;
                  return (
                    <button
                      key={material.id}
                      type="button"
                      data-testid={`prep-material-picker-${material.id}`}
                      onClick={() => onSelectMaterial(material.id)}
                      className={cn(
                        "shrink-0 border px-2 py-0.5 font-terminal text-[10px] transition-colors whitespace-nowrap max-w-[140px] truncate",
                        active
                          ? "border-primary/50 bg-primary/10 text-primary"
                          : "border-primary/15 bg-black/30 text-muted-foreground hover:border-primary/35 hover:text-primary",
                      )}
                    >
                      {getMaterialLabel(material)}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Tab content — workbench always mounted via CSS toggle */}
        <div className="flex-1 min-h-0 relative">
          <div className={cn("absolute inset-0", rightTab === "workbench" ? "" : "hidden")}>
            <TutorWorkspaceSurface ref={workspaceSurfaceRef} />
          </div>
          <div className={cn("absolute inset-0 flex min-h-0 flex-col", rightTab === "material" ? "" : "hidden")}>
            {/* Full-bleed material viewer */}
            <div className="flex-1 min-h-0 p-2">
              {viewerMaterial ? (
                <div className="flex h-full min-h-0 flex-col" data-testid="prep-material-viewer-pane">
                  {viewerMaterialLoading ? (
                    <div className="flex h-full items-center justify-center">
                      <div className="font-terminal text-sm text-muted-foreground">Loading material...</div>
                    </div>
                  ) : (
                    <MaterialViewer
                      source={{
                        id: viewerMaterial.id,
                        title: viewerMaterialContent?.title || getMaterialLabel(viewerMaterial),
                        fileName: viewerMaterial.source_path,
                        fileType: viewerMaterialContent?.file_type || viewerMaterial.file_type,
                        url: api.tutor.getMaterialFileUrl(viewerMaterial.id),
                        textContent: viewerMaterialContent?.content || null,
                      }}
                      className="min-h-0 flex-1"
                    />
                  )}
                </div>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center">
                    <div className="font-arcade text-[10px] text-primary">MATERIAL VIEWER</div>
                    <div className="mt-2 font-terminal text-xs text-muted-foreground max-w-xs">
                      Choose materials in the Start Panel to view them here while working.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
