import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type RefObject,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  FileStack,
  FolderOpen,
  History,
  Layers3,
  ListChecks,
  PencilLine,
  Save,
  Sparkles,
  ArrowUpRight,
  Copy,
  MoveRight,
  BookOpenText,
  Eye,
  Wrench,
  ExternalLink,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import type {
  Material,
  MaterialContent,
  TutorBoardScope,
  TutorStudioItem,
} from "@/lib/api";
import { MaterialViewer } from "@/components/MaterialViewer";
import {
  TutorWorkspaceSurface,
  type TutorWorkspaceSurfaceHandle,
} from "@/components/TutorWorkspaceSurface";
import { TutorEmptyState } from "@/components/TutorEmptyState";
import {
  buildMaterialViewerPopoutHtml,
  STUDIO_MATERIAL_VIEWER_POPOUT_CHANNEL,
  type MaterialViewerPopoutSnapshot,
} from "@/lib/materialViewerPopout";
import {
  createBroadcastChannelTransport,
  createStateSnapshot,
} from "@/lib/popoutSync";
import {
  StudioBreadcrumb,
  type StudioLevel,
} from "@/components/StudioBreadcrumb";
import { StudioClassPicker } from "@/components/StudioClassPicker";
import { StudioClassDetail } from "@/components/StudioClassDetail";
import { StudioPrepMode } from "@/components/StudioPrepMode";
import {
  CONTROL_DECK,
  CONTROL_DECK_BOTTOMLINE,
  CONTROL_DECK_INSET,
  CONTROL_DECK_SECTION,
  CONTROL_DECK_TOPLINE,
  CONTROL_KICKER,
  controlToggleButton,
} from "@/components/shell/controlStyles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
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
  {
    id: "session",
    label: "SESSION BOARD",
    description: "Raw captures from the current session.",
  },
  {
    id: "project",
    label: "PROJECT BOARD",
    description: "Promoted resources worth keeping.",
  },
  {
    id: "overall",
    label: "OVERALL BOARD",
    description: "Aggregated promoted resources.",
  },
];

function itemLabel(item: TutorStudioItem): string {
  return item.title?.trim() || `${item.item_type.toUpperCase()} ${item.id}`;
}

function itemExcerpt(item: TutorStudioItem): string {
  const body =
    typeof item.body_markdown === "string" &&
    item.body_markdown.trim().length > 0
      ? item.body_markdown
      : typeof item.payload === "string"
        ? item.payload
        : JSON.stringify(item.payload || "", null, 2);
  return (
    String(body).replace(/\s+/g, " ").trim().slice(0, 220) ||
    "No saved content yet."
  );
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
  const normalizedPath = String(material.source_path || "")
    .replace(/\\/g, "/")
    .trim();
  if (!normalizedPath) return `Material ${material.id}`;
  const segments = normalizedPath.split("/");
  return segments[segments.length - 1] || `Material ${material.id}`;
}

type RightPanelTab = "source" | "workbench";

type HistoryItemSnapshot = {
  id: number;
  title: string;
  status: TutorStudioItem["status"];
};

type StudioUiState = {
  studioLevel: StudioLevel;
  rightTab: RightPanelTab;
  selectedItemId: number | null;
  selectedViewerMaterialId: number | null;
  isEditingItem: boolean;
  draftTitle: string;
  draftBody: string;
  historyOpen: boolean;
  historyItemId: number | null;
  historyItemSnapshot: HistoryItemSnapshot | null;
};

type StudioUiPatch =
  | Partial<StudioUiState>
  | ((state: StudioUiState) => Partial<StudioUiState>);

type StudioUiAction = {
  type: "patch";
  patch: StudioUiPatch;
};

function createHistorySnapshot(item: TutorStudioItem): HistoryItemSnapshot {
  return {
    id: item.id,
    title: itemLabel(item),
    status: item.status,
  };
}

function createInitialStudioUiState(courseId?: number): StudioUiState {
  return {
    studioLevel: typeof courseId === "number" ? 3 : 1,
    rightTab: "source",
    selectedItemId: null,
    selectedViewerMaterialId: null,
    isEditingItem: false,
    draftTitle: "",
    draftBody: "",
    historyOpen: false,
    historyItemId: null,
    historyItemSnapshot: null,
  };
}

function studioUiReducer(
  state: StudioUiState,
  action: StudioUiAction,
): StudioUiState {
  const patch =
    typeof action.patch === "function" ? action.patch(state) : action.patch;
  const entries = Object.entries(patch) as Array<
    [keyof StudioUiState, StudioUiState[keyof StudioUiState]]
  >;
  if (entries.length === 0) {
    return state;
  }

  const hasChange = entries.some(
    ([key, value]) => !Object.is(state[key], value),
  );
  if (!hasChange) {
    return state;
  }

  return { ...state, ...patch };
}

function useMaterialViewerPopout(
  viewerMaterial: Material | null,
  viewerMaterialContent?: MaterialContent,
) {
  const materialPopoutRef = useRef<Window | null>(null);
  const materialPopoutChannelRef = useRef<ReturnType<
    typeof createBroadcastChannelTransport
  > | null>(null);

  const snapshot = useMemo<MaterialViewerPopoutSnapshot>(
    () => ({
      title:
        viewerMaterialContent?.title ||
        (viewerMaterial ? getMaterialLabel(viewerMaterial) : "Material Viewer"),
      url: viewerMaterial
        ? api.tutor.getMaterialFileUrl(viewerMaterial.id)
        : null,
      fileType:
        viewerMaterialContent?.file_type || viewerMaterial?.file_type || null,
      textContent: viewerMaterialContent?.content || null,
    }),
    [viewerMaterial, viewerMaterialContent],
  );

  const openMaterialViewerPopout = useCallback(() => {
    if (materialPopoutRef.current && !materialPopoutRef.current.closed) {
      materialPopoutRef.current.focus();
      return;
    }

    const transport = createBroadcastChannelTransport(
      STUDIO_MATERIAL_VIEWER_POPOUT_CHANNEL,
    );
    materialPopoutChannelRef.current = transport;

    const html = buildMaterialViewerPopoutHtml({
      channelName: STUDIO_MATERIAL_VIEWER_POPOUT_CHANNEL,
      initialSnapshot: snapshot,
      liveSyncAvailable: transport.available,
    });

    const popup = window.open(
      "",
      "_blank",
      "width=800,height=900,menubar=no,toolbar=no",
    );
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
    if (
      !transport?.available ||
      !materialPopoutRef.current ||
      materialPopoutRef.current.closed
    )
      return;
    transport.postMessage(createStateSnapshot(snapshot, Date.now(), true));
  }, [snapshot]);

  useEffect(() => {
    return () => {
      materialPopoutChannelRef.current?.close();
    };
  }, []);

  return openMaterialViewerPopout;
}

function useTutorStudioModeController({
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
  const [studioState, dispatchStudioState] = useReducer(
    studioUiReducer,
    courseId,
    createInitialStudioUiState,
  );
  const lastEntryTokenRef = useRef<number | null>(null);
  const workspaceSurfaceRef = useRef<TutorWorkspaceSurfaceHandle>(null);
  const {
    studioLevel,
    rightTab,
    selectedItemId,
    selectedViewerMaterialId,
    isEditingItem,
    draftTitle,
    draftBody,
    historyOpen,
    historyItemId,
    historyItemSnapshot,
  } = studioState;
  const patchStudioState = useCallback((patch: StudioUiPatch) => {
    dispatchStudioState({ type: "patch", patch });
  }, []);

  useEffect(() => {
    if (typeof courseId !== "number" && studioLevel !== 1) {
      patchStudioState({ studioLevel: 1 });
    }
  }, [courseId, patchStudioState, studioLevel]);

  useEffect(() => {
    if (!entryRequest || typeof courseId !== "number") return;
    if (lastEntryTokenRef.current === entryRequest.token) return;
    lastEntryTokenRef.current = entryRequest.token;
    patchStudioState({ studioLevel: entryRequest.level });
  }, [courseId, entryRequest, patchStudioState]);

  const { data: contentSources } = useQuery({
    queryKey: ["tutor-content-sources"],
    queryFn: () => api.tutor.getContentSources(),
    staleTime: 60 * 1000,
  });

  const courseName = useMemo(() => {
    if (typeof courseId !== "number") return "";
    return contentSources?.courses.find((c) => c.id === courseId)?.name || "";
  }, [courseId, contentSources]);

  const { data: sessionRestore } = useQuery({
    queryKey: ["tutor-studio-restore", "session", courseId, activeSessionId],
    queryFn: () =>
      api.tutor.restoreStudioItems({
        course_id: courseId!,
        tutor_session_id: activeSessionId || undefined,
        scope: "session",
      }),
    enabled:
      typeof courseId === "number" &&
      Boolean(activeSessionId) &&
      studioLevel === 3,
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

  const { data: revisionHistory, isLoading: revisionHistoryLoading } = useQuery(
    {
      queryKey: ["tutor-studio-revisions", historyItemId],
      queryFn: () => api.tutor.getStudioItemRevisions(historyItemId!),
      enabled: studioLevel === 3 && historyOpen && historyItemId !== null,
      staleTime: 30 * 1000,
    },
  );

  async function invalidateStudioState(itemId?: number) {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["tutor-studio-restore"] }),
      queryClient.invalidateQueries({ queryKey: ["tutor-studio-overview"] }),
      queryClient.invalidateQueries({ queryKey: ["tutor-project-shell"] }),
      queryClient.invalidateQueries({
        queryKey: ["tutor-studio-revisions", itemId],
      }),
    ]);
  }

  const promoteMutation = useMutation({
    mutationFn: (payload: { itemId: number; mode: "copy" | "move" }) =>
      api.tutor.promoteStudioItem({
        item_id: payload.itemId,
        promotion_mode: payload.mode,
        target_scope: "project",
      }),
    onSuccess: async () => {
      toast.success("Studio item promoted");
      await invalidateStudioState();
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to promote Studio item",
      );
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: (payload: {
      itemId: number;
      data: Parameters<typeof api.tutor.updateStudioItem>[1];
      successMessage: string;
      preserveHistory?: boolean;
      historySnapshot?: {
        id: number;
        title: string;
        status: TutorStudioItem["status"];
      };
    }) => api.tutor.updateStudioItem(payload.itemId, payload.data),
    onSuccess: async (result, variables) => {
      const nextPatch: Partial<StudioUiState> = { isEditingItem: false };
      if (variables.preserveHistory) {
        nextPatch.historyOpen = true;
        nextPatch.historyItemId = result.item.id;
        nextPatch.historyItemSnapshot =
          variables.historySnapshot ?? createHistorySnapshot(result.item);
      }
      patchStudioState(nextPatch);
      toast.success(variables.successMessage);
      await invalidateStudioState(result.item.id);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to update Studio item",
      );
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
    if (!selectedItem) return;
    patchStudioState({
      isEditingItem: false,
      draftTitle: selectedItem.title ?? "",
      draftBody: selectedItem.body_markdown ?? "",
      ...(historyOpen
        ? {}
        : {
            historyItemId: selectedItem.id,
            historyItemSnapshot: createHistorySnapshot(selectedItem),
          }),
    });
  }, [historyOpen, patchStudioState, selectedItem]);

  useEffect(() => {
    if (!visibleItems.length) {
      patchStudioState({ selectedItemId: null });
      return;
    }
    patchStudioState((current) => {
      if (
        current.selectedItemId &&
        visibleItems.some((item) => item.id === current.selectedItemId)
      ) {
        return {};
      }
      if (
        activeBoardId &&
        visibleItems.some((item) => item.id === activeBoardId)
      ) {
        return { selectedItemId: activeBoardId };
      }
      return { selectedItemId: visibleItems[0].id };
    });
  }, [activeBoardId, patchStudioState, visibleItems]);

  const selectedMaterials = useMemo(
    () =>
      selectedMaterialIds
        .map((id) => availableMaterials.find((m) => m.id === id) || null)
        .filter((m): m is Material => m !== null),
    [availableMaterials, selectedMaterialIds],
  );
  const viewerMaterial = useMemo(
    () =>
      selectedMaterials.find((m) => m.id === selectedViewerMaterialId) ||
      selectedMaterials[0] ||
      null,
    [selectedMaterials, selectedViewerMaterialId],
  );
  const { data: viewerMaterialContent, isLoading: viewerMaterialLoading } =
    useQuery<MaterialContent>({
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
      typeof viewerState?.material_id === "number"
        ? viewerState.material_id
        : null;
    if (!selectedMaterials.length) {
      patchStudioState({ selectedViewerMaterialId: null });
      return;
    }
    patchStudioState((current) => {
      if (
        current.selectedViewerMaterialId &&
        selectedMaterials.some(
          (material) => material.id === current.selectedViewerMaterialId,
        )
      ) {
        return {};
      }
      if (
        persistedMaterialId &&
        selectedMaterials.some(
          (material) => material.id === persistedMaterialId,
        )
      ) {
        return { selectedViewerMaterialId: persistedMaterialId };
      }
      return { selectedViewerMaterialId: selectedMaterials[0].id };
    });
  }, [patchStudioState, selectedMaterials, viewerState]);

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

  const handleToggleHistory = () => {
    if (historyOpen) {
      patchStudioState({ historyOpen: false });
      return;
    }
    if (!selectedItem) return;
    patchStudioState({
      historyItemId: selectedItem.id,
      historyItemSnapshot: createHistorySnapshot(selectedItem),
      historyOpen: true,
    });
  };

  const handleSaveItemEdit = () => {
    if (!selectedItem) return;
    updateItemMutation.mutate({
      itemId: selectedItem.id,
      data: {
        title: draftTitle.trim() || null,
        body_markdown: draftBody.trim() || null,
      },
      successMessage: "Studio item updated",
    });
  };

  const handleMarkBoarded = () => {
    if (!selectedItem) return;
    updateItemMutation.mutate({
      itemId: selectedItem.id,
      data: { status: "boarded" },
      successMessage: "Studio item marked boarded",
    });
  };

  const handleArchiveItem = () => {
    if (!selectedItem) return;
    updateItemMutation.mutate({
      itemId: selectedItem.id,
      data: { status: "archived" },
      successMessage: "Studio item archived",
      preserveHistory: true,
      historySnapshot: {
        id: selectedItem.id,
        title: itemLabel(selectedItem),
        status: "archived",
      },
    });
  };

  const handleSelectCourse = (id: number) => {
    onCourseChange?.(id);
    patchStudioState({ studioLevel: 2 });
  };

  const handleBreadcrumbNavigate = (level: StudioLevel) => {
    patchStudioState({ studioLevel: level === 1 ? 1 : level });
  };

  const handleDrillToWorkspace = () => {
    patchStudioState({ studioLevel: 3 });
  };

  const handleLaunchSession = () => {
    onLaunchSession?.();
  };

  const openWorkbenchPopout = useCallback(() => {
    workspaceSurfaceRef.current?.openPopout("viewer");
  }, []);

  return {
    activeBoardId,
    activeBoardScope,
    activeSessionId,
    chainId,
    courseId,
    courseName,
    draftBody,
    draftTitle,
    handleArchiveItem,
    handleBreadcrumbNavigate,
    handleDrillToWorkspace,
    handleLaunchSession,
    handleMarkBoarded,
    handleSaveItemEdit,
    handleSelectCourse,
    handleToggleHistory,
    historyItemSnapshot,
    historyOpen,
    isEditingItem,
    openMaterialViewerPopout,
    openWorkbenchPopout,
    patchStudioState,
    projectItems,
    revisionHistory: revisionHistory?.revisions ?? [],
    revisionHistoryLoading,
    rightTab,
    selectedItem,
    selectedMaterials,
    sessionItems,
    studioLevel,
    updateItemPending: updateItemMutation.isPending,
    viewerMaterial,
    viewerMaterialContent: viewerMaterialContent ?? undefined,
    viewerMaterialLoading,
    visibleItems,
    workspaceSurfaceRef,
    isPromoting: promoteMutation.isPending,
    onActiveBoardIdChange,
    onBoardScopeChange,
    onLaunchSession,
    onViewerStateChange,
    promoteItem: (itemId: number, mode: "copy" | "move") =>
      promoteMutation.mutate({ itemId, mode }),
  };
}

export function TutorStudioMode(props: TutorStudioModeProps) {
  const controller = useTutorStudioModeController(props);
  const {
    activeBoardId,
    activeBoardScope,
    activeSessionId,
    chainId,
    courseId,
    courseName,
    draftBody,
    draftTitle,
    handleArchiveItem,
    handleBreadcrumbNavigate,
    handleDrillToWorkspace,
    handleLaunchSession,
    handleMarkBoarded,
    handleSaveItemEdit,
    handleSelectCourse,
    handleToggleHistory,
    historyItemSnapshot,
    historyOpen,
    isEditingItem,
    openMaterialViewerPopout,
    openWorkbenchPopout,
    patchStudioState,
    projectItems,
    revisionHistory,
    revisionHistoryLoading,
    rightTab,
    selectedItem,
    selectedMaterials,
    sessionItems,
    studioLevel,
    updateItemPending,
    viewerMaterial,
    viewerMaterialContent,
    viewerMaterialLoading,
    visibleItems,
    workspaceSurfaceRef,
    isPromoting,
    onActiveBoardIdChange,
    onBoardScopeChange,
    promoteItem,
  } = controller;

  if (typeof courseId !== "number") {
    return (
      <TutorEmptyState
        icon={FolderOpen}
        title="NO COURSE SELECTED"
        description="Choose a course from Studio or resume a workflow to open Studio."
        actions={[
          {
            label: "GO TO STUDIO",
            icon: ListChecks,
            onClick: handleLaunchSession,
            variant: "primary",
          },
        ]}
      />
    );
  }

  if (studioLevel === 1) {
    return (
      <StudioRootLevelView
        activeSessionId={activeSessionId}
        onNavigate={handleBreadcrumbNavigate}
        onSelectCourse={handleSelectCourse}
      />
    );
  }

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

  if (!activeSessionId) {
    return (
      <StudioPrepWorkspaceView
        chainId={chainId}
        courseName={courseName}
        onLaunchSession={handleLaunchSession}
        onNavigate={handleBreadcrumbNavigate}
        onOpenMaterialPopout={openMaterialViewerPopout}
        onOpenWorkbenchPopout={openWorkbenchPopout}
        onSelectMaterial={(materialId) =>
          patchStudioState({ selectedViewerMaterialId: materialId })
        }
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
      onArchiveItem={handleArchiveItem}
      onBoardScopeChange={onBoardScopeChange}
      onCancelEditing={() => {
        patchStudioState({
          isEditingItem: false,
          draftTitle: selectedItem?.title ?? "",
          draftBody: selectedItem?.body_markdown ?? "",
        });
      }}
      onDraftBodyChange={(value) => patchStudioState({ draftBody: value })}
      onDraftTitleChange={(value) => patchStudioState({ draftTitle: value })}
      onMarkBoarded={handleMarkBoarded}
      onNavigate={handleBreadcrumbNavigate}
      onOpenMaterialViewerPopout={openMaterialViewerPopout}
      onOpenWorkbenchPopout={openWorkbenchPopout}
      onPromoteItem={promoteItem}
      onSaveItemEdit={handleSaveItemEdit}
      onSelectBoardItem={(selectedId) =>
        patchStudioState({ selectedItemId: selectedId })
      }
      onSelectMaterial={(materialId) =>
        patchStudioState({ selectedViewerMaterialId: materialId })
      }
      onStartEditing={() => patchStudioState({ isEditingItem: true })}
      onToggleHistory={handleToggleHistory}
      projectItems={projectItems}
      draftBody={draftBody}
      draftTitle={draftTitle}
      historyItemSnapshot={historyItemSnapshot}
      historyOpen={historyOpen}
      isEditingItem={isEditingItem}
      isHistoryLoading={revisionHistoryLoading}
      isUpdatingItem={updateItemPending}
      revisionHistory={revisionHistory}
      selectedItem={selectedItem}
      selectedMaterials={selectedMaterials}
      sessionItems={sessionItems}
      viewerMaterial={viewerMaterial}
      viewerMaterialContent={viewerMaterialContent ?? undefined}
      viewerMaterialLoading={viewerMaterialLoading}
      visibleItems={visibleItems}
      workspaceSurfaceRef={workspaceSurfaceRef}
      rightTab={rightTab}
      onRightTabChange={(tab) => patchStudioState({ rightTab: tab })}
      isPromoting={isPromoting}
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
      <StudioBreadcrumb
        level={2}
        courseName={courseName}
        onNavigate={onNavigate}
      />
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
      <StudioBreadcrumb
        level={3}
        courseName={courseName}
        onNavigate={onNavigate}
      />
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
  draftBody,
  draftTitle,
  historyItemSnapshot,
  historyOpen,
  isEditingItem,
  isHistoryLoading,
  onBoardScopeChange,
  onArchiveItem,
  onCancelEditing,
  onDraftBodyChange,
  onDraftTitleChange,
  onMarkBoarded,
  onNavigate,
  onOpenMaterialViewerPopout,
  onOpenWorkbenchPopout,
  onPromoteItem,
  onSaveItemEdit,
  onSelectBoardItem,
  onSelectMaterial,
  onStartEditing,
  onToggleHistory,
  projectItems,
  revisionHistory,
  rightTab,
  onRightTabChange,
  isUpdatingItem,
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
  draftBody: string;
  draftTitle: string;
  historyItemSnapshot: {
    id: number;
    title: string;
    status: TutorStudioItem["status"];
  } | null;
  historyOpen: boolean;
  isEditingItem: boolean;
  isHistoryLoading: boolean;
  onActiveBoardIdChange?: (boardId: number | null) => void;
  onBoardScopeChange: (scope: TutorBoardScope) => void;
  onArchiveItem: () => void;
  onCancelEditing: () => void;
  onDraftBodyChange: (value: string) => void;
  onDraftTitleChange: (value: string) => void;
  onMarkBoarded: () => void;
  onNavigate: (level: StudioLevel) => void;
  onOpenMaterialViewerPopout: () => void;
  onOpenWorkbenchPopout: () => void;
  onPromoteItem: (itemId: number, mode: "copy" | "move") => void;
  onSaveItemEdit: () => void;
  onSelectBoardItem: (itemId: number) => void;
  onSelectMaterial: (materialId: number) => void;
  onStartEditing: () => void;
  onToggleHistory: () => void;
  projectItems: TutorStudioItem[];
  revisionHistory: Array<{
    revision: number;
    body_markdown: string | null;
    payload: unknown;
    source_locator: Record<string, unknown> | null;
    created_at: string;
  }>;
  rightTab: RightPanelTab;
  onRightTabChange: (tab: RightPanelTab) => void;
  isUpdatingItem: boolean;
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
      <StudioBreadcrumb
        level={3}
        courseName={courseName}
        onNavigate={onNavigate}
      />
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
          draftBody={draftBody}
          draftTitle={draftTitle}
          historyItemSnapshot={historyItemSnapshot}
          historyOpen={historyOpen}
          isEditingItem={isEditingItem}
          isHistoryLoading={isHistoryLoading}
          isPromoting={isPromoting}
          isUpdatingItem={isUpdatingItem}
          onArchiveItem={onArchiveItem}
          onCancelEditing={onCancelEditing}
          onDraftBodyChange={onDraftBodyChange}
          onDraftTitleChange={onDraftTitleChange}
          onMarkBoarded={onMarkBoarded}
          onPromoteItem={onPromoteItem}
          onSaveItemEdit={onSaveItemEdit}
          onStartEditing={onStartEditing}
          onToggleHistory={onToggleHistory}
          revisionHistory={revisionHistory}
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
                <div className="font-arcade text-ui-2xs text-primary">
                  {option.label}
                </div>
                <div className="mt-0.5 font-terminal text-ui-xs text-muted-foreground">
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
          <div className="flex items-center gap-2 font-arcade text-ui-2xs text-primary">
            <FileStack className="h-3.5 w-3.5" />
            BOARD ITEMS
          </div>

          {visibleItems.length === 0 ? (
            <div className="border border-primary/20 bg-black/35 p-3">
              <div className="font-arcade text-ui-2xs text-primary">EMPTY</div>
              <div className="mt-1 font-terminal text-ui-xs text-muted-foreground">
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
                      <div className="font-arcade text-ui-2xs text-primary truncate">
                        {itemLabel(item)}
                      </div>
                      <div className="mt-0.5 font-terminal text-ui-xs text-muted-foreground">
                        {item.scope.toUpperCase()} •{" "}
                        {item.item_type.toUpperCase()}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-none text-ui-2xs shrink-0",
                        statusClass(item.status),
                      )}
                    >
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
      <div className="font-arcade text-ui-2xs text-primary">{label}</div>
      <div className="mt-0.5 font-terminal text-sm text-white">{value}</div>
    </div>
  );
}

type StudioRevision = {
  revision: number;
  body_markdown: string | null;
  payload: unknown;
  source_locator: Record<string, unknown> | null;
  created_at: string;
};

function StudioRevisionHistorySection({
  historyTarget,
  isHistoryLoading,
  revisionHistory,
}: {
  historyTarget:
    | { title: string; status: TutorStudioItem["status"] }
    | HistoryItemSnapshot
    | null;
  isHistoryLoading: boolean;
  revisionHistory: StudioRevision[];
}) {
  return (
    <div className="space-y-2 border border-primary/15 bg-black/45 p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="font-arcade text-ui-2xs text-primary">
            REVISION HISTORY
          </div>
          {historyTarget ? (
            <div className="mt-1 font-terminal text-ui-xs text-muted-foreground">
              {historyTarget.title} • {historyTarget.status.toUpperCase()}
            </div>
          ) : null}
        </div>
        <Badge
          variant="outline"
          className="rounded-none border-primary/30 text-ui-2xs text-muted-foreground"
        >
          {revisionHistory.length} REV
        </Badge>
      </div>
      {isHistoryLoading ? (
        <div className="font-terminal text-xs text-muted-foreground">
          Loading history...
        </div>
      ) : revisionHistory.length === 0 ? (
        <div className="font-terminal text-xs text-muted-foreground">
          No revisions recorded yet.
        </div>
      ) : (
        <div className="space-y-2">
          {revisionHistory.map((revision) => (
            <div
              key={revision.revision}
              className="border border-primary/15 bg-black/35 p-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="font-arcade text-ui-2xs text-primary">
                  REV {revision.revision}
                </div>
                <div className="font-terminal text-ui-xs text-muted-foreground">
                  {new Date(revision.created_at).toLocaleString()}
                </div>
              </div>
              <div className="mt-2 whitespace-pre-wrap font-terminal text-xs text-zinc-300">
                {revision.body_markdown ||
                  JSON.stringify(
                    revision.payload || revision.source_locator || {},
                    null,
                    2,
                  )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StudioSelectedItemCard({
  activeBoardScope,
  draftBody,
  draftTitle,
  historyOpen,
  historyTarget,
  isEditingItem,
  isHistoryLoading,
  isPromoting,
  isUpdatingItem,
  onArchiveItem,
  onCancelEditing,
  onDraftBodyChange,
  onDraftTitleChange,
  onMarkBoarded,
  onPromoteItem,
  onSaveItemEdit,
  onStartEditing,
  onToggleHistory,
  revisionHistory,
  selectedItem,
}: {
  activeBoardScope: TutorBoardScope;
  draftBody: string;
  draftTitle: string;
  historyOpen: boolean;
  historyTarget:
    | { title: string; status: TutorStudioItem["status"] }
    | HistoryItemSnapshot
    | null;
  isEditingItem: boolean;
  isHistoryLoading: boolean;
  isPromoting: boolean;
  isUpdatingItem: boolean;
  onArchiveItem: () => void;
  onCancelEditing: () => void;
  onDraftBodyChange: (value: string) => void;
  onDraftTitleChange: (value: string) => void;
  onMarkBoarded: () => void;
  onPromoteItem: (itemId: number, mode: "copy" | "move") => void;
  onSaveItemEdit: () => void;
  onStartEditing: () => void;
  onToggleHistory: () => void;
  revisionHistory: StudioRevision[];
  selectedItem: TutorStudioItem;
}) {
  const canEdit = true;
  const canBoard = selectedItem.status === "captured";
  const canArchive =
    selectedItem.status === "captured" || selectedItem.status === "boarded";
  const lifecycleDisabled = isUpdatingItem || isPromoting;

  return (
    <Card className={CONTROL_DECK}>
      <div className={CONTROL_DECK_INSET} />
      <div className={CONTROL_DECK_TOPLINE} />
      <div className={CONTROL_DECK_BOTTOMLINE} />
      <CardHeader className="relative z-10 space-y-2 border-b border-primary/15 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="font-arcade text-xs text-primary">
            {itemLabel(selectedItem)}
          </CardTitle>
          <Badge
            variant="outline"
            className={cn(
              "rounded-full px-2.5 py-1 font-terminal text-ui-2xs",
              statusClass(selectedItem.status),
            )}
          >
            {selectedItem.status.toUpperCase()}
          </Badge>
        </div>
        <div className="font-mono text-sm leading-6 text-foreground/72">
          {selectedItem.source_kind || "studio"} • {selectedItem.scope} scope
        </div>
      </CardHeader>
      <CardContent className="relative z-10 flex flex-col gap-3 p-4">
        {isEditingItem ? (
          <div className={cn(CONTROL_DECK_SECTION, "space-y-3")}>
            <div className="space-y-1.5">
              <div className={CONTROL_KICKER}>TITLE</div>
              <Input
                data-testid="studio-item-title-input"
                value={draftTitle}
                onChange={(event) => onDraftTitleChange(event.target.value)}
                className="rounded-none border-primary/20 bg-black/50 font-terminal text-sm"
                placeholder="Studio item title"
              />
            </div>
            <div className="space-y-1.5">
              <div className={CONTROL_KICKER}>BODY</div>
              <Textarea
                data-testid="studio-item-body-input"
                value={draftBody}
                onChange={(event) => onDraftBodyChange(event.target.value)}
                className="min-h-[220px] rounded-none border-primary/20 bg-black/50 font-terminal text-sm"
                placeholder="Edit the Studio note body"
              />
            </div>
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh] border border-primary/15 bg-black/40 p-3">
            <div className="whitespace-pre-wrap font-terminal text-sm text-zinc-200">
              {selectedItem.body_markdown ||
                JSON.stringify(selectedItem.payload || {}, null, 2)}
            </div>
          </ScrollArea>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {isEditingItem ? (
            <>
              <Button
                type="button"
                data-testid="studio-item-save"
                variant="outline"
                disabled={lifecycleDisabled}
                className={controlToggleButton(true, "primary", true)}
                onClick={onSaveItemEdit}
              >
                <Save className="mr-1 h-3 w-3" />
                SAVE
              </Button>
              <Button
                type="button"
                data-testid="studio-item-cancel"
                variant="outline"
                disabled={lifecycleDisabled}
                className={controlToggleButton(false, "secondary", true)}
                onClick={onCancelEditing}
              >
                <X className="mr-1 h-3 w-3" />
                CANCEL
              </Button>
            </>
          ) : (
            <Button
              type="button"
              data-testid="studio-item-edit"
              variant="outline"
              disabled={!canEdit || lifecycleDisabled}
              className={controlToggleButton(false, "secondary", true)}
              onClick={onStartEditing}
            >
              <PencilLine className="mr-1 h-3 w-3" />
              EDIT
            </Button>
          )}
          <Button
            type="button"
            data-testid="studio-item-board"
            variant="outline"
            disabled={!canBoard || lifecycleDisabled}
            className={controlToggleButton(false, "secondary", true)}
            onClick={onMarkBoarded}
          >
            <ArrowUpRight className="mr-1 h-3 w-3" />
            MARK BOARDED
          </Button>
          <Button
            type="button"
            data-testid="studio-item-archive"
            variant="outline"
            disabled={!canArchive || lifecycleDisabled}
            className={controlToggleButton(false, "secondary", true)}
            onClick={onArchiveItem}
          >
            <Archive className="mr-1 h-3 w-3" />
            ARCHIVE
          </Button>
          <Button
            type="button"
            data-testid="studio-item-history"
            variant="outline"
            disabled={lifecycleDisabled}
            className={controlToggleButton(false, "secondary", true)}
            onClick={onToggleHistory}
          >
            <History className="mr-1 h-3 w-3" />
            {historyOpen ? "HIDE HISTORY" : "HISTORY"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={
              lifecycleDisabled ||
              selectedItem.status === "promoted" ||
              activeBoardScope === "overall"
            }
            className={controlToggleButton(false, "secondary", true)}
            onClick={() => onPromoteItem(selectedItem.id, "copy")}
          >
            <Copy className="mr-1 h-3 w-3" />
            COPY TO PROJECT
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={
              lifecycleDisabled ||
              selectedItem.status === "promoted" ||
              activeBoardScope === "overall"
            }
            className={controlToggleButton(false, "secondary", true)}
            onClick={() => onPromoteItem(selectedItem.id, "move")}
          >
            <MoveRight className="mr-1 h-3 w-3" />
            MOVE TO PROJECT
          </Button>
          {selectedItem.source_path ? (
            <Badge
              variant="outline"
              className="max-w-xs truncate rounded-full border-primary/30 px-3 py-1 font-terminal text-ui-2xs text-muted-foreground"
            >
              <FolderOpen className="mr-1 h-3 w-3 shrink-0" />
              {selectedItem.source_path}
            </Badge>
          ) : null}
        </div>
        {historyOpen ? (
          <StudioRevisionHistorySection
            historyTarget={historyTarget}
            isHistoryLoading={isHistoryLoading}
            revisionHistory={revisionHistory}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

function StudioPinnedHistoryCard({
  historyItemSnapshot,
  isHistoryLoading,
  revisionHistory,
}: {
  historyItemSnapshot: HistoryItemSnapshot;
  isHistoryLoading: boolean;
  revisionHistory: StudioRevision[];
}) {
  return (
    <Card className={CONTROL_DECK}>
      <div className={CONTROL_DECK_INSET} />
      <div className={CONTROL_DECK_TOPLINE} />
      <div className={CONTROL_DECK_BOTTOMLINE} />
      <CardHeader className="relative z-10 space-y-2 border-b border-primary/15 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="font-arcade text-xs text-primary">
            {historyItemSnapshot.title}
          </CardTitle>
          <Badge
            variant="outline"
            className={cn(
              "rounded-full px-2.5 py-1 font-terminal text-ui-2xs",
              statusClass(historyItemSnapshot.status),
            )}
          >
            {historyItemSnapshot.status.toUpperCase()}
          </Badge>
        </div>
        <div className="font-mono text-sm leading-6 text-foreground/72">
          This item is no longer on the active board, but its revision history
          is still available.
        </div>
      </CardHeader>
      <CardContent className="relative z-10 p-4">
        <StudioRevisionHistorySection
          historyTarget={historyItemSnapshot}
          isHistoryLoading={isHistoryLoading}
          revisionHistory={revisionHistory}
        />
      </CardContent>
    </Card>
  );
}

function StudioSummaryEmptyState() {
  return (
    <div className={cn(CONTROL_DECK_SECTION, "p-6 text-center")}>
      <div className="font-arcade text-ui-2xs text-primary">
        NO ITEM SELECTED
      </div>
      <div className="mt-2 font-mono text-sm leading-6 text-foreground/72">
        Select an item from the board sidebar, or use Tutor to capture new
        content.
      </div>
    </div>
  );
}

function StudioSummaryPanel({
  activeBoardScope,
  draftBody,
  draftTitle,
  historyItemSnapshot,
  historyOpen,
  isEditingItem,
  isHistoryLoading,
  isPromoting,
  isUpdatingItem,
  onArchiveItem,
  onCancelEditing,
  onDraftBodyChange,
  onDraftTitleChange,
  onMarkBoarded,
  onPromoteItem,
  onSaveItemEdit,
  onStartEditing,
  onToggleHistory,
  revisionHistory,
  selectedItem,
}: {
  activeBoardScope: TutorBoardScope;
  draftBody: string;
  draftTitle: string;
  historyItemSnapshot: {
    id: number;
    title: string;
    status: TutorStudioItem["status"];
  } | null;
  historyOpen: boolean;
  isEditingItem: boolean;
  isHistoryLoading: boolean;
  isPromoting: boolean;
  isUpdatingItem: boolean;
  onArchiveItem: () => void;
  onCancelEditing: () => void;
  onDraftBodyChange: (value: string) => void;
  onDraftTitleChange: (value: string) => void;
  onMarkBoarded: () => void;
  onPromoteItem: (itemId: number, mode: "copy" | "move") => void;
  onSaveItemEdit: () => void;
  onStartEditing: () => void;
  onToggleHistory: () => void;
  revisionHistory: Array<{
    revision: number;
    body_markdown: string | null;
    payload: unknown;
    source_locator: Record<string, unknown> | null;
    created_at: string;
  }>;
  selectedItem: TutorStudioItem | null;
}) {
  const historyPinnedToHiddenItem =
    historyOpen &&
    historyItemSnapshot !== null &&
    selectedItem?.id !== historyItemSnapshot.id;
  const historyTarget = historyPinnedToHiddenItem
    ? historyItemSnapshot
    : selectedItem
      ? { title: itemLabel(selectedItem), status: selectedItem.status }
      : historyItemSnapshot;
  const canEdit = selectedItem !== null;

  return (
    <div className="flex min-h-0 flex-col border-r border-primary/20 bg-black/20">
      <div className="flex items-center gap-1 border-b border-primary/20 px-3 py-1.5 bg-black/30">
        <Layers3 className="h-3 w-3 text-primary" />
        <span className="font-arcade text-ui-2xs text-primary">SUMMARY</span>
        <div className="ml-auto">
          <Badge
            variant="outline"
            className="rounded-none text-ui-2xs border-primary/30 text-muted-foreground"
          >
            <Sparkles className="mr-1 h-3 w-3" />
            {activeBoardScope === "session" ? "SESSION" : "PROJECT"}
          </Badge>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {selectedItem && !historyPinnedToHiddenItem ? (
          <StudioSelectedItemCard
            activeBoardScope={activeBoardScope}
            draftBody={draftBody}
            draftTitle={draftTitle}
            historyOpen={historyOpen}
            historyTarget={historyTarget}
            isEditingItem={isEditingItem}
            isHistoryLoading={isHistoryLoading}
            isPromoting={isPromoting}
            isUpdatingItem={isUpdatingItem}
            onArchiveItem={onArchiveItem}
            onCancelEditing={onCancelEditing}
            onDraftBodyChange={onDraftBodyChange}
            onDraftTitleChange={onDraftTitleChange}
            onMarkBoarded={onMarkBoarded}
            onPromoteItem={onPromoteItem}
            onSaveItemEdit={onSaveItemEdit}
            onStartEditing={onStartEditing}
            onToggleHistory={onToggleHistory}
            revisionHistory={revisionHistory}
            selectedItem={selectedItem}
          />
        ) : historyOpen && historyItemSnapshot ? (
          <StudioPinnedHistoryCard
            historyItemSnapshot={historyItemSnapshot}
            isHistoryLoading={isHistoryLoading}
            revisionHistory={revisionHistory}
          />
        ) : (
          <StudioSummaryEmptyState />
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
            "flex items-center gap-1 px-2 py-1 font-arcade text-ui-2xs transition-colors",
            rightTab === "source"
              ? "text-primary border-b border-primary"
              : "text-muted-foreground hover:text-primary",
          )}
        >
          <Eye className="h-3 w-3" />
          SOURCE
          {selectedMaterials.length > 0 ? (
            <Badge
              variant="outline"
              className="ml-1 h-4 px-1 text-ui-2xs rounded-none border-primary/40"
            >
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
            "flex items-center gap-1 px-2 py-1 font-arcade text-ui-2xs transition-colors",
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
        <div
          className={cn(
            "absolute inset-0",
            rightTab === "workbench" ? "" : "hidden",
          )}
        >
          <TutorWorkspaceSurface ref={workspaceSurfaceRef} />
        </div>
        <div
          className={cn(
            "absolute inset-0 flex min-h-0",
            rightTab === "source" ? "" : "hidden",
          )}
        >
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
        <div className="flex items-center gap-1.5 font-arcade text-ui-2xs text-primary">
          <BookOpenText className="h-3 w-3" />
          SOURCES
        </div>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-1.5 p-2">
          {materials.length === 0 ? (
            <div className="p-2 font-terminal text-ui-xs text-muted-foreground">
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
                  <div className="font-arcade text-ui-2xs text-primary truncate">
                    {getMaterialLabel(material)}
                  </div>
                  <div className="mt-0.5 font-terminal text-ui-xs text-muted-foreground">
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
        <div
          className="flex h-full min-h-0 flex-col gap-3"
          data-testid="studio-material-viewer-pane"
        >
          {viewerMaterialLoading ? (
            <div className="flex h-full items-center justify-center">
              <div className="font-terminal text-sm text-muted-foreground">
                Loading material...
              </div>
            </div>
          ) : (
            <MaterialViewer
              source={{
                id: viewerMaterial.id,
                title:
                  viewerMaterialContent?.title ||
                  getMaterialLabel(viewerMaterial),
                fileName: viewerMaterial.source_path,
                fileType:
                  viewerMaterialContent?.file_type || viewerMaterial.file_type,
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
            <div className="font-arcade text-ui-2xs text-primary">
              SOURCE VIEWER
            </div>
            <div className="mt-2 font-terminal text-xs text-muted-foreground max-w-xs">
              Choose materials in the Start Panel to view them here while
              working.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
