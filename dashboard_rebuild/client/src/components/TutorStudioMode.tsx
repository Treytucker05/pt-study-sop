import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
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
  Eye,
  Wrench,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import type { Material, MaterialContent, TutorBoardScope, TutorStudioItem } from "@/lib/api";
import { MaterialViewer } from "@/components/MaterialViewer";
import { TutorWorkspaceSurface, type TutorWorkspaceSurfaceHandle } from "@/components/TutorWorkspaceSurface";
import {
  buildMaterialViewerPopoutHtml,
  STUDIO_MATERIAL_VIEWER_POPOUT_CHANNEL,
  type MaterialViewerPopoutSnapshot,
} from "@/lib/materialViewerPopout";
import { createBroadcastChannelTransport, createStateSnapshot } from "@/lib/popoutSync";
import { StudioBreadcrumb, type StudioLevel } from "@/components/StudioBreadcrumb";
import { StudioClassPicker } from "@/components/StudioClassPicker";
import { StudioClassDetail } from "@/components/StudioClassDetail";
import { StudioPrepMode } from "@/components/StudioPrepMode";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { BTN_TOOLBAR, BTN_TOOLBAR_ACTIVE } from "@/lib/theme";

type TutorStudioModeProps = {
  courseId?: number;
  chainId?: number;
  activeSessionId: string | null;
  availableMaterials: Material[];
  selectedMaterialIds: number[];
  activeBoardScope: TutorBoardScope;
  activeBoardId?: number | null;
  viewerState?: Record<string, unknown> | null;
  onBoardScopeChange: (scope: TutorBoardScope) => void;
  onActiveBoardIdChange?: (boardId: number | null) => void;
  onViewerStateChange?: (state: Record<string, unknown> | null) => void;
  onCourseChange?: (courseId: number | undefined) => void;
  onLaunchSession?: () => void;
  entryRequest?: TutorStudioEntryRequest | null;
};

export type TutorStudioEntryRequest = {
  level: StudioLevel;
  token: number;
};

const BOARD_OPTIONS: Array<{
  id: TutorBoardScope;
  label: string;
  description: string;
}> = [
  { id: "session", label: "SESSION BOARD", description: "Raw captures from the current session." },
  { id: "project", label: "PROJECT BOARD", description: "Promoted resources worth keeping." },
  { id: "overall", label: "OVERALL BOARD", description: "Aggregated promoted resources." },
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

type RightPanelTab = "source" | "workbench";

function useMaterialViewerPopout(
  viewerMaterial: Material | null,
  viewerMaterialContent?: MaterialContent,
) {
  const materialPopoutRef = useRef<Window | null>(null);
  const materialPopoutChannelRef = useRef<ReturnType<typeof createBroadcastChannelTransport> | null>(null);

  const snapshot = useMemo<MaterialViewerPopoutSnapshot>(
    () => ({
      title: viewerMaterialContent?.title || (viewerMaterial ? getMaterialLabel(viewerMaterial) : "Material Viewer"),
      url: viewerMaterial ? api.tutor.getMaterialFileUrl(viewerMaterial.id) : null,
      fileType: viewerMaterialContent?.file_type || viewerMaterial?.file_type || null,
      textContent: viewerMaterialContent?.content || null,
    }),
    [viewerMaterial, viewerMaterialContent],
  );

  const openMaterialViewerPopout = useCallback(() => {
    if (materialPopoutRef.current && !materialPopoutRef.current.closed) {
      materialPopoutRef.current.focus();
      return;
    }

    const transport = createBroadcastChannelTransport(STUDIO_MATERIAL_VIEWER_POPOUT_CHANNEL);
    materialPopoutChannelRef.current = transport;

    const html = buildMaterialViewerPopoutHtml({
      channelName: STUDIO_MATERIAL_VIEWER_POPOUT_CHANNEL,
      initialSnapshot: snapshot,
      liveSyncAvailable: transport.available,
    });

    const popup = window.open("", "_blank", "width=800,height=900,menubar=no,toolbar=no");
    if (!popup) {
      toast.error("Popup blocked — allow popups for this site");
      transport.close();
      materialPopoutChannelRef.current = null;
      return;
    }

    popup.document.write(html);
    popup.document.close();
    materialPopoutRef.current = popup;

    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        materialPopoutRef.current = null;
        transport.close();
        materialPopoutChannelRef.current = null;
      }
    }, 1000);
  }, [snapshot]);

  useEffect(() => {
    const transport = materialPopoutChannelRef.current;
    if (!transport?.available || !materialPopoutRef.current || materialPopoutRef.current.closed) return;
    transport.postMessage(createStateSnapshot(snapshot, Date.now(), true));
  }, [snapshot]);

  useEffect(() => {
    return () => {
      materialPopoutChannelRef.current?.close();
    };
  }, []);

  return openMaterialViewerPopout;
}

export function TutorStudioMode({
  courseId,
  chainId,
  activeSessionId,
  availableMaterials,
  selectedMaterialIds,
  activeBoardScope,
  activeBoardId,
  viewerState,
  onBoardScopeChange,
  onActiveBoardIdChange,
  onViewerStateChange,
  onCourseChange,
  onLaunchSession,
  entryRequest = null,
}: TutorStudioModeProps) {
  const queryClient = useQueryClient();

  // Studio drill-down level
  const [studioLevel, setStudioLevel] = useState<StudioLevel>(() =>
    typeof courseId === "number" ? 3 : 1,
  );
  const [rightTab, setRightTab] = useState<RightPanelTab>("source");
  const lastEntryTokenRef = useRef<number | null>(null);

  // L3 workspace state
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [selectedViewerMaterialId, setSelectedViewerMaterialId] = useState<number | null>(null);

  // Popout refs
  const workspaceSurfaceRef = useRef<TutorWorkspaceSurfaceHandle>(null);

  // Sync studioLevel when courseId changes externally
  useEffect(() => {
    if (typeof courseId !== "number" && studioLevel !== 1) {
      setStudioLevel(1);
    }
  }, [courseId, studioLevel]);

  useEffect(() => {
    if (!entryRequest || typeof courseId !== "number") return;
    if (lastEntryTokenRef.current === entryRequest.token) return;
    lastEntryTokenRef.current = entryRequest.token;
    setStudioLevel(entryRequest.level);
  }, [courseId, entryRequest]);

  // Fetch course name for breadcrumb
  const { data: contentSources } = useQuery({
    queryKey: ["tutor-content-sources"],
    queryFn: () => api.tutor.getContentSources(),
    staleTime: 60 * 1000,
  });

  const courseName = useMemo(() => {
    if (typeof courseId !== "number") return "";
    return contentSources?.courses.find((c) => c.id === courseId)?.name || "";
  }, [courseId, contentSources]);

  // ─── L3 Data ───
  const { data: sessionRestore } = useQuery({
    queryKey: ["tutor-studio-restore", "session", courseId, activeSessionId],
    queryFn: () =>
      api.tutor.restoreStudioItems({
        course_id: courseId!,
        tutor_session_id: activeSessionId || undefined,
        scope: "session",
      }),
    enabled: typeof courseId === "number" && Boolean(activeSessionId) && studioLevel === 3,
  });

  const { data: projectRestore } = useQuery({
    queryKey: ["tutor-studio-restore", "project", courseId, activeSessionId],
    queryFn: () =>
      api.tutor.restoreStudioItems({
        course_id: courseId!,
        tutor_session_id: activeSessionId || undefined,
        scope: "project",
      }),
    enabled: typeof courseId === "number" && studioLevel === 3,
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
    if (activeBoardScope === "session") return sessionItems;
    if (activeBoardScope === "project") return projectItems;
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
      if (current && visibleItems.some((item) => item.id === current)) return current;
      if (activeBoardId && visibleItems.some((item) => item.id === activeBoardId)) return activeBoardId;
      return visibleItems[0].id;
    });
  }, [activeBoardId, visibleItems]);

  const selectedMaterials = useMemo(
    () =>
      selectedMaterialIds
        .map((id) => availableMaterials.find((m) => m.id === id) || null)
        .filter((m): m is Material => m !== null),
    [availableMaterials, selectedMaterialIds],
  );
  const viewerMaterial = useMemo(
    () => selectedMaterials.find((m) => m.id === selectedViewerMaterialId) || selectedMaterials[0] || null,
    [selectedMaterials, selectedViewerMaterialId],
  );
  const { data: viewerMaterialContent, isLoading: viewerMaterialLoading } = useQuery<MaterialContent>({
    queryKey: ["tutor-studio", "material-content", viewerMaterial?.id],
    queryFn: () => api.tutor.getMaterialContent(viewerMaterial!.id),
    enabled: viewerMaterial !== null && studioLevel === 3,
    staleTime: 60 * 1000,
  });
  const openMaterialViewerPopout = useMaterialViewerPopout(
    viewerMaterial,
    viewerMaterialContent,
  );

  useEffect(() => {
    const persistedMaterialId =
      typeof viewerState?.material_id === "number" ? viewerState.material_id : null;
    if (!selectedMaterials.length) {
      setSelectedViewerMaterialId(null);
      return;
    }
    setSelectedViewerMaterialId((current) => {
      if (current && selectedMaterials.some((m) => m.id === current)) return current;
      if (persistedMaterialId && selectedMaterials.some((m) => m.id === persistedMaterialId)) return persistedMaterialId;
      return selectedMaterials[0].id;
    });
  }, [selectedMaterials, viewerState]);

  useEffect(() => {
    if (!onViewerStateChange) return;
    onViewerStateChange(
      viewerMaterial
        ? { material_id: viewerMaterial.id, source_path: viewerMaterial.source_path, file_type: viewerMaterial.file_type }
        : null,
    );
  }, [onViewerStateChange, viewerMaterial]);

  useEffect(() => {
    onActiveBoardIdChange?.(selectedItem?.id ?? null);
  }, [onActiveBoardIdChange, selectedItem?.id]);

  // ─── Navigation handlers ───
  const handleSelectCourse = (id: number) => {
    onCourseChange?.(id);
    setStudioLevel(2);
  };

  const handleBreadcrumbNavigate = (level: StudioLevel) => {
    if (level === 1) {
      setStudioLevel(1);
    } else {
      setStudioLevel(level);
    }
  };

  const handleDrillToWorkspace = () => {
    setStudioLevel(3);
  };

  const handleLaunchSession = () => {
    onLaunchSession?.();
  };

  const openWorkbenchPopout = useCallback(() => {
    workspaceSurfaceRef.current?.openPopout("viewer");
  }, []);

  // ─── Render ───

  // L1: Class Picker
  if (studioLevel === 1 || typeof courseId !== "number") {
    return (
      <StudioRootLevelView
        activeSessionId={activeSessionId}
        onNavigate={handleBreadcrumbNavigate}
        onSelectCourse={handleSelectCourse}
      />
    );
  }

  // L2: Class Detail
  if (studioLevel === 2) {
    return (
      <StudioCourseLevelView
        courseId={courseId}
        courseName={courseName}
        onDrillToWorkspace={handleDrillToWorkspace}
        onLaunchSession={handleLaunchSession}
        onNavigate={handleBreadcrumbNavigate}
      />
    );
  }

  // L3: Workspace — prep mode (no session) vs board mode (active session)
  if (!activeSessionId) {
    return (
      <StudioPrepWorkspaceView
        chainId={chainId}
        courseName={courseName}
        onLaunchSession={handleLaunchSession}
        onNavigate={handleBreadcrumbNavigate}
        onOpenMaterialPopout={openMaterialViewerPopout}
        onOpenWorkbenchPopout={openWorkbenchPopout}
        onSelectMaterial={setSelectedViewerMaterialId}
        selectedMaterials={selectedMaterials}
        viewerMaterial={viewerMaterial}
        viewerMaterialContent={viewerMaterialContent ?? undefined}
        viewerMaterialLoading={viewerMaterialLoading}
        workspaceSurfaceRef={workspaceSurfaceRef}
      />
    );
  }

  // L3: Active session — 3-column board layout
  return (
    <StudioActiveWorkspaceView
      activeBoardId={activeBoardId}
      activeBoardScope={activeBoardScope}
      activeSessionId={activeSessionId}
      courseName={courseName}
      onActiveBoardIdChange={onActiveBoardIdChange}
      onBoardScopeChange={onBoardScopeChange}
      onNavigate={handleBreadcrumbNavigate}
      onOpenMaterialViewerPopout={openMaterialViewerPopout}
      onOpenWorkbenchPopout={openWorkbenchPopout}
      onPromoteItem={(itemId, mode) => promoteMutation.mutate({ itemId, mode })}
      onSelectBoardItem={setSelectedItemId}
      onSelectMaterial={setSelectedViewerMaterialId}
      projectItems={projectItems}
      selectedItem={selectedItem}
      selectedMaterials={selectedMaterials}
      sessionItems={sessionItems}
      viewerMaterial={viewerMaterial}
      viewerMaterialContent={viewerMaterialContent ?? undefined}
      viewerMaterialLoading={viewerMaterialLoading}
      visibleItems={visibleItems}
      workspaceSurfaceRef={workspaceSurfaceRef}
      rightTab={rightTab}
      onRightTabChange={setRightTab}
      isPromoting={promoteMutation.isPending}
    />
  );
}

function StudioRootLevelView({
  activeSessionId,
  onNavigate,
  onSelectCourse,
}: {
  activeSessionId: string | null;
  onNavigate: (level: StudioLevel) => void;
  onSelectCourse: (courseId: number) => void;
}) {
  return (
    <div className="flex h-full flex-col min-h-0">
      <StudioBreadcrumb level={1} onNavigate={onNavigate} />
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        <div className="mx-auto w-full max-w-5xl">
          <StudioClassPicker
            onSelectCourse={onSelectCourse}
            activeSessionId={activeSessionId}
          />
        </div>
      </div>
    </div>
  );
}

function StudioCourseLevelView({
  courseId,
  courseName,
  onDrillToWorkspace,
  onLaunchSession,
  onNavigate,
}: {
  courseId: number;
  courseName: string;
  onDrillToWorkspace: () => void;
  onLaunchSession: () => void;
  onNavigate: (level: StudioLevel) => void;
}) {
  return (
    <div className="flex h-full flex-col min-h-0">
      <StudioBreadcrumb level={2} courseName={courseName} onNavigate={onNavigate} />
      <div className="flex-1 min-h-0 overflow-y-auto">
        <StudioClassDetail
          courseId={courseId}
          onLaunchSession={onLaunchSession}
          onDrillToWorkspace={onDrillToWorkspace}
        />
      </div>
    </div>
  );
}

function StudioPrepWorkspaceView({
  chainId,
  courseName,
  onLaunchSession,
  onNavigate,
  onOpenMaterialPopout,
  onOpenWorkbenchPopout,
  onSelectMaterial,
  selectedMaterials,
  viewerMaterial,
  viewerMaterialContent,
  viewerMaterialLoading,
  workspaceSurfaceRef,
}: {
  chainId?: number;
  courseName: string;
  onLaunchSession: () => void;
  onNavigate: (level: StudioLevel) => void;
  onOpenMaterialPopout: () => void;
  onOpenWorkbenchPopout: () => void;
  onSelectMaterial: (materialId: number | null) => void;
  selectedMaterials: Material[];
  viewerMaterial: Material | null;
  viewerMaterialContent?: MaterialContent;
  viewerMaterialLoading: boolean;
  workspaceSurfaceRef: RefObject<TutorWorkspaceSurfaceHandle | null>;
}) {
  return (
    <div className="flex h-full flex-col min-h-0">
      <StudioBreadcrumb level={3} courseName={courseName} onNavigate={onNavigate} />
      <StudioPrepMode
        chainId={chainId}
        availableMaterials={selectedMaterials}
        viewerMaterial={viewerMaterial}
        viewerMaterialContent={viewerMaterialContent}
        viewerMaterialLoading={viewerMaterialLoading}
        onSelectMaterial={onSelectMaterial}
        onOpenMaterialPopout={onOpenMaterialPopout}
        onOpenWorkbenchPopout={onOpenWorkbenchPopout}
        onLaunchSession={onLaunchSession}
        workspaceSurfaceRef={workspaceSurfaceRef}
      />
    </div>
  );
}

function StudioActiveWorkspaceView({
  activeBoardScope,
  activeSessionId,
  courseName,
  onBoardScopeChange,
  onNavigate,
  onOpenMaterialViewerPopout,
  onOpenWorkbenchPopout,
  onPromoteItem,
  onSelectBoardItem,
  onSelectMaterial,
  projectItems,
  rightTab,
  onRightTabChange,
  selectedItem,
  selectedMaterials,
  sessionItems,
  viewerMaterial,
  viewerMaterialContent,
  viewerMaterialLoading,
  visibleItems,
  workspaceSurfaceRef,
  isPromoting,
}: {
  activeBoardId?: number | null;
  activeBoardScope: TutorBoardScope;
  activeSessionId: string | null;
  courseName: string;
  onActiveBoardIdChange?: (boardId: number | null) => void;
  onBoardScopeChange: (scope: TutorBoardScope) => void;
  onNavigate: (level: StudioLevel) => void;
  onOpenMaterialViewerPopout: () => void;
  onOpenWorkbenchPopout: () => void;
  onPromoteItem: (itemId: number, mode: "copy" | "move") => void;
  onSelectBoardItem: (itemId: number) => void;
  onSelectMaterial: (materialId: number) => void;
  projectItems: TutorStudioItem[];
  rightTab: RightPanelTab;
  onRightTabChange: (tab: RightPanelTab) => void;
  selectedItem: TutorStudioItem | null;
  selectedMaterials: Material[];
  sessionItems: TutorStudioItem[];
  viewerMaterial: Material | null;
  viewerMaterialContent?: MaterialContent;
  viewerMaterialLoading: boolean;
  visibleItems: TutorStudioItem[];
  workspaceSurfaceRef: RefObject<TutorWorkspaceSurfaceHandle | null>;
  isPromoting: boolean;
}) {
  return (
    <div className="flex h-full flex-col min-h-0">
      <StudioBreadcrumb level={3} courseName={courseName} onNavigate={onNavigate} />
      <div className="flex-1 min-h-0 grid gap-0 lg:grid-cols-[250px_1fr_320px]">
        <StudioBoardSidebar
          activeBoardScope={activeBoardScope}
          onBoardScopeChange={onBoardScopeChange}
          onSelectBoardItem={onSelectBoardItem}
          projectItems={projectItems}
          selectedItemId={selectedItem?.id ?? null}
          selectedMaterialsCount={selectedMaterials.length}
          sessionItems={sessionItems}
          visibleItems={visibleItems}
        />
        <StudioSummaryPanel
          activeBoardScope={activeBoardScope}
          isPromoting={isPromoting}
          onPromoteItem={onPromoteItem}
          selectedItem={selectedItem}
        />
        <StudioRightPanel
          onOpenMaterialViewerPopout={onOpenMaterialViewerPopout}
          onOpenWorkbenchPopout={onOpenWorkbenchPopout}
          onRightTabChange={onRightTabChange}
          onSelectMaterial={onSelectMaterial}
          rightTab={rightTab}
          selectedMaterials={selectedMaterials}
          viewerMaterial={viewerMaterial}
          viewerMaterialContent={viewerMaterialContent}
          viewerMaterialLoading={viewerMaterialLoading}
          workspaceSurfaceRef={workspaceSurfaceRef}
        />
      </div>
    </div>
  );
}

function StudioBoardSidebar({
  activeBoardScope,
  onBoardScopeChange,
  onSelectBoardItem,
  projectItems,
  selectedItemId,
  selectedMaterialsCount,
  sessionItems,
  visibleItems,
}: {
  activeBoardScope: TutorBoardScope;
  onBoardScopeChange: (scope: TutorBoardScope) => void;
  onSelectBoardItem: (itemId: number) => void;
  projectItems: TutorStudioItem[];
  selectedItemId: number | null;
  selectedMaterialsCount: number;
  sessionItems: TutorStudioItem[];
  visibleItems: TutorStudioItem[];
}) {
  return (
    <div className="flex min-h-0 flex-col border-r border-primary/20 bg-black/40">
      <div className="border-b border-primary/20 p-2">
        <div className="grid gap-1">
          {BOARD_OPTIONS.map((option) => {
            const active = option.id === activeBoardScope;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onBoardScopeChange(option.id)}
                className={cn(
                  "border px-2.5 py-1 text-left transition-colors",
                  active
                    ? "border-primary/50 bg-primary/10"
                    : "border-primary/15 bg-black/35 hover:border-primary/35",
                )}
              >
                <div className="font-arcade text-[10px] text-primary">{option.label}</div>
                <div className="mt-0.5 font-terminal text-[11px] text-muted-foreground">
                  {option.description}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1 border-b border-primary/20 px-2 py-1.5">
        <StudioSidebarStat label="SESSION" value={sessionItems.length} />
        <StudioSidebarStat label="PROJECT" value={projectItems.length} />
        <StudioSidebarStat label="SOURCES" value={selectedMaterialsCount} />
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-1.5 p-2">
          <div className="flex items-center gap-2 font-arcade text-[10px] text-primary">
            <FileStack className="h-3.5 w-3.5" />
            BOARD ITEMS
          </div>

          {visibleItems.length === 0 ? (
            <div className="border border-primary/20 bg-black/35 p-3">
              <div className="font-arcade text-[10px] text-primary">EMPTY</div>
              <div className="mt-1 font-terminal text-[11px] text-muted-foreground">
                Send items from Tutor or use the workbench to start building.
              </div>
            </div>
          ) : (
            visibleItems.map((item) => {
              const active = selectedItemId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectBoardItem(item.id)}
                  className={cn(
                    "block w-full border px-2.5 py-1.5 text-left transition-colors",
                    active
                      ? "border-primary/45 bg-primary/10"
                      : "border-primary/15 bg-black/30 hover:border-primary/35",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-arcade text-[10px] text-primary truncate">
                        {itemLabel(item)}
                      </div>
                      <div className="mt-0.5 font-terminal text-[11px] text-muted-foreground">
                        {item.scope.toUpperCase()} • {item.item_type.toUpperCase()}
                      </div>
                    </div>
                    <Badge variant="outline" className={cn("rounded-none text-[10px] shrink-0", statusClass(item.status))}>
                      {item.status.toUpperCase()}
                    </Badge>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function StudioSidebarStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-primary/20 bg-black/35 px-2 py-1">
      <div className="font-arcade text-[10px] text-primary">{label}</div>
      <div className="mt-0.5 font-terminal text-sm text-white">{value}</div>
    </div>
  );
}

function StudioSummaryPanel({
  activeBoardScope,
  isPromoting,
  onPromoteItem,
  selectedItem,
}: {
  activeBoardScope: TutorBoardScope;
  isPromoting: boolean;
  onPromoteItem: (itemId: number, mode: "copy" | "move") => void;
  selectedItem: TutorStudioItem | null;
}) {
  return (
    <div className="flex min-h-0 flex-col border-r border-primary/20 bg-black/20">
      <div className="flex items-center gap-1 border-b border-primary/20 px-3 py-1.5 bg-black/30">
        <Layers3 className="h-3 w-3 text-primary" />
        <span className="font-arcade text-[10px] text-primary">SUMMARY</span>
        <div className="ml-auto">
          <Badge variant="outline" className="rounded-none text-[10px] border-primary/30 text-muted-foreground">
            <Sparkles className="mr-1 h-3 w-3" />
            {activeBoardScope === "session" ? "SESSION" : "PROJECT"}
          </Badge>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {selectedItem ? (
          <Card className="rounded-none border-primary/20 bg-black/35">
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
            <CardContent className="flex flex-col gap-3 p-4">
              <ScrollArea className="max-h-[60vh] border border-primary/15 bg-black/40 p-3">
                <div className="whitespace-pre-wrap font-terminal text-sm text-zinc-200">
                  {selectedItem.body_markdown || JSON.stringify(selectedItem.payload || {}, null, 2)}
                </div>
              </ScrollArea>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPromoting || selectedItem.status === "promoted" || activeBoardScope === "overall"}
                  className="rounded-none border-primary/30 bg-black/50 font-arcade text-[10px]"
                  onClick={() => onPromoteItem(selectedItem.id, "copy")}
                >
                  <Copy className="mr-1 h-3 w-3" />
                  COPY TO PROJECT
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPromoting || selectedItem.status === "promoted" || activeBoardScope === "overall"}
                  className="rounded-none border-primary/30 bg-black/50 font-arcade text-[10px]"
                  onClick={() => onPromoteItem(selectedItem.id, "move")}
                >
                  <MoveRight className="mr-1 h-3 w-3" />
                  MOVE TO PROJECT
                </Button>
                {selectedItem.source_path ? (
                  <Badge variant="outline" className="rounded-none text-[10px] border-primary/30 text-muted-foreground truncate max-w-xs">
                    <FolderOpen className="mr-1 h-3 w-3 shrink-0" />
                    {selectedItem.source_path}
                  </Badge>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="border border-primary/20 bg-black/35 p-6 text-center">
            <div className="font-arcade text-[10px] text-primary">NO ITEM SELECTED</div>
            <div className="mt-2 font-terminal text-xs text-muted-foreground">
              Select an item from the board sidebar, or use Tutor to capture new content.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StudioRightPanel({
  onOpenMaterialViewerPopout,
  onOpenWorkbenchPopout,
  onRightTabChange,
  onSelectMaterial,
  rightTab,
  selectedMaterials,
  viewerMaterial,
  viewerMaterialContent,
  viewerMaterialLoading,
  workspaceSurfaceRef,
}: {
  onOpenMaterialViewerPopout: () => void;
  onOpenWorkbenchPopout: () => void;
  onRightTabChange: (tab: RightPanelTab) => void;
  onSelectMaterial: (materialId: number) => void;
  rightTab: RightPanelTab;
  selectedMaterials: Material[];
  viewerMaterial: Material | null;
  viewerMaterialContent?: MaterialContent;
  viewerMaterialLoading: boolean;
  workspaceSurfaceRef: RefObject<TutorWorkspaceSurfaceHandle | null>;
}) {
  return (
    <div className="flex min-h-0 flex-col bg-black/20">
      <div className="flex items-center gap-1 border-b border-primary/20 px-2 py-1.5 bg-black/30">
        <button
          type="button"
          onClick={() => onRightTabChange("source")}
          className={cn(
            "flex items-center gap-1 px-2 py-1 font-arcade text-[10px] transition-colors",
            rightTab === "source"
              ? "text-primary border-b border-primary"
              : "text-muted-foreground hover:text-primary",
          )}
        >
          <Eye className="h-3 w-3" />
          SOURCE
          {selectedMaterials.length > 0 ? (
            <Badge variant="outline" className="ml-1 h-4 px-1 text-[10px] rounded-none border-primary/40">
              {selectedMaterials.length}
            </Badge>
          ) : null}
        </button>
        <button
          type="button"
          onClick={onOpenMaterialViewerPopout}
          className="text-muted-foreground hover:text-primary p-1"
          title="Open viewer in new window"
        >
          <ExternalLink className="h-3 w-3" />
        </button>

        <div className="mx-1 h-4 w-px bg-primary/20" />

        <button
          type="button"
          onClick={() => onRightTabChange("workbench")}
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

      <div className="flex-1 min-h-0 relative">
        <div className={cn("absolute inset-0", rightTab === "workbench" ? "" : "hidden")}>
          <TutorWorkspaceSurface ref={workspaceSurfaceRef} />
        </div>
        <div className={cn("absolute inset-0 flex min-h-0", rightTab === "source" ? "" : "hidden")}>
          <StudioMaterialList
            materials={selectedMaterials}
            onSelectMaterial={onSelectMaterial}
            selectedMaterialId={viewerMaterial?.id ?? null}
          />
          <StudioMaterialViewerPane
            viewerMaterial={viewerMaterial}
            viewerMaterialContent={viewerMaterialContent}
            viewerMaterialLoading={viewerMaterialLoading}
          />
        </div>
      </div>
    </div>
  );
}

function StudioMaterialList({
  materials,
  onSelectMaterial,
  selectedMaterialId,
}: {
  materials: Material[];
  onSelectMaterial: (materialId: number) => void;
  selectedMaterialId: number | null;
}) {
  return (
    <div className="w-[160px] shrink-0 border-r border-primary/20 bg-black/25 flex flex-col min-h-0">
      <div className="border-b border-primary/15 px-2 py-1.5">
        <div className="flex items-center gap-1.5 font-arcade text-[10px] text-primary">
          <BookOpenText className="h-3 w-3" />
          SOURCES
        </div>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-1.5 p-2">
          {materials.length === 0 ? (
            <div className="p-2 font-terminal text-[11px] text-muted-foreground">
              Select materials via the Start Panel to see them here.
            </div>
          ) : (
            materials.map((material) => {
              const active = selectedMaterialId === material.id;
              return (
                <button
                  key={material.id}
                  type="button"
                  data-testid={`studio-material-picker-${material.id}`}
                  onClick={() => onSelectMaterial(material.id)}
                  className={cn(
                    "block w-full border px-2 py-1.5 text-left transition-colors",
                    active
                      ? "border-primary/45 bg-primary/10"
                      : "border-primary/15 bg-black/30 hover:border-primary/35",
                  )}
                >
                  <div className="font-arcade text-[10px] text-primary truncate">{getMaterialLabel(material)}</div>
                  <div className="mt-0.5 font-terminal text-[11px] text-muted-foreground">
                    {(material.file_type || "file").toUpperCase()}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function StudioMaterialViewerPane({
  viewerMaterial,
  viewerMaterialContent,
  viewerMaterialLoading,
}: {
  viewerMaterial: Material | null;
  viewerMaterialContent?: MaterialContent;
  viewerMaterialLoading: boolean;
}) {
  return (
    <div className="flex-1 min-h-0 p-3">
      {viewerMaterial ? (
        <div className="flex h-full min-h-0 flex-col gap-3" data-testid="studio-material-viewer-pane">
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
            <div className="font-arcade text-[10px] text-primary">SOURCE VIEWER</div>
            <div className="mt-2 font-terminal text-xs text-muted-foreground max-w-xs">
              Choose materials in the Start Panel to view them here while working.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
