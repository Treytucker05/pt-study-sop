import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FileStack,
  FolderOpen,
  Layers3,
  Sparkles,
  ArrowUpRight,
  Copy,
  MoveRight,
  BookOpenText,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import type { Material, MaterialContent, TutorBoardScope, TutorStudioItem } from "@/lib/api";
import { MaterialViewer } from "@/components/MaterialViewer";
import { TutorWorkspaceSurface } from "@/components/TutorWorkspaceSurface";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type TutorStudioModeProps = {
  courseId?: number;
  activeSessionId: string | null;
  availableMaterials: Material[];
  selectedMaterialIds: number[];
  activeBoardScope: TutorBoardScope;
  activeBoardId?: number | null;
  viewerState?: Record<string, unknown> | null;
  onBoardScopeChange: (scope: TutorBoardScope) => void;
  onActiveBoardIdChange?: (boardId: number | null) => void;
  onViewerStateChange?: (state: Record<string, unknown> | null) => void;
};

const BOARD_OPTIONS: Array<{
  id: TutorBoardScope;
  label: string;
  description: string;
}> = [
  { id: "session", label: "SESSION BOARD", description: "Raw captures and compacted notes from the current session." },
  { id: "project", label: "PROJECT BOARD", description: "Promoted project resources that are worth keeping." },
  { id: "overall", label: "OVERALL BOARD", description: "Aggregated promoted resources across the current project shell." },
];

function itemLabel(item: TutorStudioItem): string {
  return item.title?.trim() || `${item.item_type.toUpperCase()} ${item.id}`;
}

function itemExcerpt(item: TutorStudioItem): string {
  const body =
    typeof item.body_markdown === "string" && item.body_markdown.trim().length > 0
      ? item.body_markdown
      : typeof item.payload === "string"
        ? item.payload
        : JSON.stringify(item.payload || "", null, 2);
  return String(body).replace(/\s+/g, " ").trim().slice(0, 220) || "No saved content yet.";
}

function statusClass(status: TutorStudioItem["status"]) {
  switch (status) {
    case "promoted":
      return "border-green-500/40 text-green-300";
    case "boarded":
      return "border-yellow-500/40 text-yellow-300";
    case "archived":
      return "border-zinc-500/40 text-zinc-300";
    default:
      return "border-primary/30 text-primary";
  }
}

function getMaterialLabel(material: Material): string {
  const explicitTitle = String(material.title || "").trim();
  if (explicitTitle) return explicitTitle;

  const normalizedPath = String(material.source_path || "").replace(/\\/g, "/").trim();
  if (!normalizedPath) return `Material ${material.id}`;
  const segments = normalizedPath.split("/");
  return segments[segments.length - 1] || `Material ${material.id}`;
}

export function TutorStudioMode({
  courseId,
  activeSessionId,
  availableMaterials,
  selectedMaterialIds,
  activeBoardScope,
  activeBoardId,
  viewerState,
  onBoardScopeChange,
  onActiveBoardIdChange,
  onViewerStateChange,
}: TutorStudioModeProps) {
  const queryClient = useQueryClient();
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [selectedViewerMaterialId, setSelectedViewerMaterialId] = useState<number | null>(null);

  const { data: sessionRestore } = useQuery({
    queryKey: ["tutor-studio-restore", "session", courseId, activeSessionId],
    queryFn: () =>
      api.tutor.restoreStudioItems({
        course_id: courseId!,
        tutor_session_id: activeSessionId || undefined,
        scope: "session",
      }),
    enabled: typeof courseId === "number" && Boolean(activeSessionId),
  });

  const { data: projectRestore } = useQuery({
    queryKey: ["tutor-studio-restore", "project", courseId, activeSessionId],
    queryFn: () =>
      api.tutor.restoreStudioItems({
        course_id: courseId!,
        tutor_session_id: activeSessionId || undefined,
        scope: "project",
      }),
    enabled: typeof courseId === "number",
  });

  const promoteMutation = useMutation({
    mutationFn: (payload: { itemId: number; mode: "copy" | "move" }) =>
      api.tutor.promoteStudioItem({
        item_id: payload.itemId,
        promotion_mode: payload.mode,
        target_scope: "project",
      }),
    onSuccess: async () => {
      toast.success("Studio item promoted");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tutor-studio-restore"] }),
        queryClient.invalidateQueries({ queryKey: ["tutor-project-shell"] }),
      ]);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to promote Studio item");
    },
  });

  const sessionItems = sessionRestore?.items || [];
  const projectItems = projectRestore?.items || [];

  const visibleItems = useMemo(() => {
    if (activeBoardScope === "session") {
      return sessionItems;
    }
    if (activeBoardScope === "project") {
      return projectItems;
    }
    return [...projectItems, ...sessionItems]
      .filter((item) => item.status === "promoted")
      .sort((left, right) => right.id - left.id);
  }, [activeBoardScope, projectItems, sessionItems]);

  const selectedItem =
    visibleItems.find((item) => item.id === selectedItemId) ||
    visibleItems[0] ||
    null;

  useEffect(() => {
    if (!visibleItems.length) {
      setSelectedItemId(null);
      return;
    }

    setSelectedItemId((current) => {
      if (current && visibleItems.some((item) => item.id === current)) {
        return current;
      }
      if (activeBoardId && visibleItems.some((item) => item.id === activeBoardId)) {
        return activeBoardId;
      }
      return visibleItems[0].id;
    });
  }, [activeBoardId, visibleItems]);

  const selectedMaterials = useMemo(
    () =>
      selectedMaterialIds
        .map((id) => availableMaterials.find((material) => material.id === id) || null)
        .filter((material): material is Material => material !== null),
    [availableMaterials, selectedMaterialIds],
  );
  const viewerMaterial = useMemo(
    () => selectedMaterials.find((material) => material.id === selectedViewerMaterialId) || selectedMaterials[0] || null,
    [selectedMaterials, selectedViewerMaterialId],
  );
  const { data: viewerMaterialContent, isLoading: viewerMaterialLoading } = useQuery<MaterialContent>({
    queryKey: ["tutor-studio", "material-content", viewerMaterial?.id],
    queryFn: () => api.tutor.getMaterialContent(viewerMaterial!.id),
    enabled: viewerMaterial !== null,
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    const persistedMaterialId =
      typeof viewerState?.material_id === "number" ? viewerState.material_id : null;

    if (!selectedMaterials.length) {
      setSelectedViewerMaterialId(null);
      return;
    }

    setSelectedViewerMaterialId((current) => {
      if (current && selectedMaterials.some((material) => material.id === current)) {
        return current;
      }
      if (
        persistedMaterialId &&
        selectedMaterials.some((material) => material.id === persistedMaterialId)
      ) {
        return persistedMaterialId;
      }
      return selectedMaterials[0].id;
    });
  }, [selectedMaterials, viewerState]);

  useEffect(() => {
    if (!onViewerStateChange) return;
    onViewerStateChange(
      viewerMaterial
        ? {
            material_id: viewerMaterial.id,
            source_path: viewerMaterial.source_path,
            file_type: viewerMaterial.file_type,
          }
        : null,
    );
  }, [onViewerStateChange, viewerMaterial]);

  useEffect(() => {
    onActiveBoardIdChange?.(selectedItem?.id ?? null);
  }, [onActiveBoardIdChange, selectedItem?.id]);

  if (typeof courseId !== "number") {
    return (
      <div className="flex h-full items-center justify-center bg-black/30 p-6">
        <Card className="w-full max-w-2xl rounded-none border-primary/30 bg-black/40">
          <CardContent className="space-y-3 p-6 text-center">
            <div className="font-arcade text-sm text-primary">STUDIO NEEDS A COURSE</div>
            <p className="font-terminal text-sm text-muted-foreground">
              Select a course or launch Tutor from Brain so Studio can restore the right Inbox,
              boards, schedule, and publish resources.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid h-full min-h-0 gap-0 lg:grid-cols-[340px_1fr]">
      <div className="flex min-h-0 flex-col border-r border-primary/20 bg-black/40">
        <div className="border-b border-primary/20 p-4">
          <div className="font-arcade text-xs text-primary">STUDIO</div>
          <div className="mt-1 font-terminal text-xs text-muted-foreground">
            Session captures land in Inbox first. Promote the useful pieces upward after cleanup.
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
            {BOARD_OPTIONS.map((option) => {
              const active = option.id === activeBoardScope;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onBoardScopeChange(option.id)}
                  className={cn(
                    "border px-3 py-2 text-left transition-colors",
                    active
                      ? "border-primary/50 bg-primary/10"
                      : "border-primary/15 bg-black/35 hover:border-primary/35",
                  )}
                >
                  <div className="font-arcade text-[10px] text-primary">{option.label}</div>
                  <div className="mt-1 font-terminal text-[11px] text-muted-foreground">
                    {option.description}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 border-b border-primary/20 px-4 py-3">
          <div className="border border-primary/20 bg-black/35 px-2 py-2">
            <div className="font-arcade text-[10px] text-primary">SESSION</div>
            <div className="mt-1 font-terminal text-sm text-white">{sessionItems.length}</div>
          </div>
          <div className="border border-primary/20 bg-black/35 px-2 py-2">
            <div className="font-arcade text-[10px] text-primary">PROJECT</div>
            <div className="mt-1 font-terminal text-sm text-white">{projectItems.length}</div>
          </div>
          <div className="border border-primary/20 bg-black/35 px-2 py-2">
            <div className="font-arcade text-[10px] text-primary">MATERIALS</div>
            <div className="mt-1 font-terminal text-sm text-white">{selectedMaterials.length}</div>
          </div>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-3 p-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-arcade text-[10px] text-primary">
                <FileStack className="h-3.5 w-3.5" />
                INBOX / BOARD ITEMS
              </div>
              <div className="font-terminal text-[11px] text-muted-foreground">
                {activeBoardScope === "overall"
                  ? "Aggregated promoted items only."
                  : "Pick an item to review or promote."}
              </div>
            </div>

            {visibleItems.length === 0 ? (
              <Card className="rounded-none border-primary/20 bg-black/35">
                <CardContent className="space-y-2 p-4">
                  <div className="font-arcade text-[10px] text-primary">NO ITEMS YET</div>
                  <div className="font-terminal text-xs text-muted-foreground">
                    Send items from Tutor with the new Studio actions or use the workbench tools on
                    the right to start building.
                  </div>
                </CardContent>
              </Card>
            ) : (
              visibleItems.map((item) => {
                const active = selectedItem?.id === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedItemId(item.id)}
                    className={cn(
                      "block w-full border px-3 py-3 text-left transition-colors",
                      active
                        ? "border-primary/45 bg-primary/10"
                        : "border-primary/15 bg-black/30 hover:border-primary/35",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-arcade text-[10px] text-primary">
                          {itemLabel(item)}
                        </div>
                        <div className="mt-1 font-terminal text-[11px] text-muted-foreground">
                          {item.scope.toUpperCase()} • {item.item_type.toUpperCase()}
                        </div>
                      </div>
                      <Badge variant="outline" className={cn("rounded-none text-[10px]", statusClass(item.status))}>
                        {item.status.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="mt-2 font-terminal text-xs text-muted-foreground">
                      {itemExcerpt(item)}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="grid min-h-0 gap-0 xl:grid-cols-[320px_1fr]">
        <div className="flex min-h-0 flex-col border-b border-primary/20 xl:border-b-0 xl:border-r xl:border-primary/20 bg-black/30">
          <div className="border-b border-primary/20 p-4">
            <div className="flex items-center gap-2 font-arcade text-[10px] text-primary">
              <Layers3 className="h-3.5 w-3.5" />
              SUMMARY BOARD
            </div>
            <div className="mt-1 font-terminal text-[11px] text-muted-foreground">
              Review one item at a time, then copy or move it upward when it becomes project-worthy.
            </div>
          </div>

          <div className="min-h-0 flex-1 p-4">
            {selectedItem ? (
              <Card className="h-full rounded-none border-primary/20 bg-black/35">
                <CardHeader className="space-y-2 border-b border-primary/15 pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="font-arcade text-xs text-primary">
                      {itemLabel(selectedItem)}
                    </CardTitle>
                    <Badge variant="outline" className={cn("rounded-none text-[10px]", statusClass(selectedItem.status))}>
                      {selectedItem.status.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="font-terminal text-[11px] text-muted-foreground">
                    {selectedItem.source_kind || "studio"} • {selectedItem.scope} scope
                  </div>
                </CardHeader>
                <CardContent className="flex h-full flex-col gap-3 p-4">
                  <ScrollArea className="min-h-0 flex-1 border border-primary/15 bg-black/40 p-3">
                    <div className="whitespace-pre-wrap font-terminal text-sm text-zinc-200">
                      {selectedItem.body_markdown || JSON.stringify(selectedItem.payload || {}, null, 2)}
                    </div>
                  </ScrollArea>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={
                        promoteMutation.isPending ||
                        selectedItem.status === "promoted" ||
                        activeBoardScope === "overall"
                      }
                      className="rounded-none border-primary/30 bg-black/50 font-arcade text-[10px]"
                      onClick={() => promoteMutation.mutate({ itemId: selectedItem.id, mode: "copy" })}
                    >
                      <Copy className="mr-1 h-3 w-3" />
                      COPY TO PROJECT
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={
                        promoteMutation.isPending ||
                        selectedItem.status === "promoted" ||
                        activeBoardScope === "overall"
                      }
                      className="rounded-none border-primary/30 bg-black/50 font-arcade text-[10px]"
                      onClick={() => promoteMutation.mutate({ itemId: selectedItem.id, mode: "move" })}
                    >
                      <MoveRight className="mr-1 h-3 w-3" />
                      MOVE TO PROJECT
                    </Button>
                    {selectedItem.source_path ? (
                      <Badge variant="outline" className="rounded-none text-[10px] border-primary/30 text-muted-foreground">
                        <FolderOpen className="mr-1 h-3 w-3" />
                        {selectedItem.source_path}
                      </Badge>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="rounded-none border-primary/20 bg-black/35">
                <CardContent className="space-y-2 p-4">
                  <div className="font-arcade text-[10px] text-primary">SUMMARY BOARD IS EMPTY</div>
                  <div className="font-terminal text-xs text-muted-foreground">
                    Use Tutor capture actions or promote items from a session once something is worth keeping.
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <div className="grid min-h-0 grid-rows-[minmax(320px,0.75fr)_minmax(0,1fr)] bg-black/20">
          <div className="flex min-h-0 flex-col border-b border-primary/20">
            <div className="border-b border-primary/20 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <div>
                  <div className="font-arcade text-[10px] text-primary">SOURCE VIEWER</div>
                  <div className="font-terminal text-[11px] text-muted-foreground">
                    Keep the selected course materials visible while Studio sorts captures on the board.
                  </div>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  {selectedMaterials.length > 0 ? (
                    <Badge variant="outline" className="rounded-none text-[10px] border-primary/30 text-muted-foreground">
                      <ArrowUpRight className="mr-1 h-3 w-3" />
                      {selectedMaterials.length} MATERIALS SELECTED
                    </Badge>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="grid min-h-0 gap-0 xl:grid-cols-[220px_1fr]">
              <div className="flex min-h-0 flex-col border-b border-primary/20 xl:border-b-0 xl:border-r xl:border-primary/20 bg-black/25">
                <div className="border-b border-primary/15 px-4 py-3">
                  <div className="flex items-center gap-2 font-arcade text-[10px] text-primary">
                    <BookOpenText className="h-3.5 w-3.5" />
                    MATERIAL SOURCES
                  </div>
                  <div className="mt-1 font-terminal text-[11px] text-muted-foreground">
                    Pick which selected source stays open while you work the Studio shell.
                  </div>
                </div>

                <ScrollArea className="min-h-0 flex-1">
                  <div className="space-y-2 p-3">
                    {selectedMaterials.length === 0 ? (
                      <Card className="rounded-none border-primary/20 bg-black/35">
                        <CardContent className="space-y-2 p-4">
                          <div className="font-arcade text-[10px] text-primary">NO SELECTED SOURCES</div>
                          <div className="font-terminal text-xs text-muted-foreground">
                            Select Tutor materials to unlock a live source viewer inside Studio.
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      selectedMaterials.map((material) => {
                        const active = viewerMaterial?.id === material.id;
                        return (
                          <button
                            key={material.id}
                            type="button"
                            data-testid={`studio-material-picker-${material.id}`}
                            onClick={() => setSelectedViewerMaterialId(material.id)}
                            className={cn(
                              "block w-full border px-3 py-3 text-left transition-colors",
                              active
                                ? "border-primary/45 bg-primary/10"
                                : "border-primary/15 bg-black/30 hover:border-primary/35",
                            )}
                          >
                            <div className="font-arcade text-[10px] text-primary">{getMaterialLabel(material)}</div>
                            <div className="mt-1 font-terminal text-[11px] text-muted-foreground">
                              {(material.file_type || "file").toUpperCase()}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </div>

              <div className="min-h-0 p-4">
                {viewerMaterial ? (
                  <div className="flex h-full min-h-0 flex-col gap-3" data-testid="studio-material-viewer-pane">
                    {viewerMaterialLoading ? (
                      <Card className="h-full rounded-none border-primary/20 bg-black/35">
                        <CardContent className="flex h-full items-center justify-center p-4">
                          <div className="font-terminal text-sm text-muted-foreground">
                            Loading selected material...
                          </div>
                        </CardContent>
                      </Card>
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
                  <Card className="h-full rounded-none border-primary/20 bg-black/35">
                    <CardContent className="space-y-2 p-4">
                      <div className="font-arcade text-[10px] text-primary">SOURCE VIEWER READY</div>
                      <div className="font-terminal text-xs text-muted-foreground">
                        Choose materials in Tutor and Studio will keep a real source pane open here.
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>

          <div className="min-h-0">
            <div className="border-b border-primary/20 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <div>
                  <div className="font-arcade text-[10px] text-primary">WORKBENCH</div>
                  <div className="font-terminal text-[11px] text-muted-foreground">
                    Notes, canvas, graph, and table tools stay live while you sort captures.
                  </div>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <Badge variant="outline" className="rounded-none text-[10px] border-primary/30 text-muted-foreground">
                    <Sparkles className="mr-1 h-3 w-3" />
                    {activeSessionId ? "SESSION-LINKED" : "PROJECT-LEVEL"}
                  </Badge>
                </div>
              </div>
            </div>
            <TutorWorkspaceSurface />
          </div>
        </div>
      </div>
    </div>
  );
}
