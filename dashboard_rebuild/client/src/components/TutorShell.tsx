import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { TutorErrorBoundary } from "@/components/TutorErrorBoundary";
import { Button } from "@/components/ui/button";
import { SourceShelf } from "@/components/studio/SourceShelf";
import { RunConfigPanel } from "@/components/studio/RunConfigPanel";
import { StudioDocumentDock } from "@/components/studio/StudioDocumentDock";
import { StudioTldrawWorkspaceLazy } from "@/components/studio/StudioTldrawWorkspaceLazy";
import { StudioWorkspaceHome } from "@/components/studio/StudioWorkspaceHome";
import { PrimePacketPanel } from "@/components/studio/PrimePacketPanel";
import { PolishPacketPanel } from "@/components/studio/PolishPacketPanel";
import { TutorStatusPanel } from "@/components/studio/TutorStatusPanel";
import { MemoryPanel } from "@/components/studio/MemoryPanel";
import { RepairCandidatesPanel } from "@/components/studio/RepairCandidatesPanel";
import { TutorArtifactsDrawer } from "@/components/tutor-shell/TutorArtifactsDrawer";
import { TutorLiveStudyPane } from "@/components/tutor-shell/TutorLiveStudyPane";
import { TutorScholarStrategyPanel } from "@/components/tutor-shell/TutorScholarStrategyPanel";
import {
  TutorWorkflowFinalSyncLazy,
  TutorWorkflowPolishStudioLazy,
  TutorWorkflowPrimingPanelLazy,
} from "@/components/tutor-shell/TutorShellDeferredPanels";
import { TutorStudioShellPane } from "@/components/tutor-shell/TutorStudioShellPane";
import type {
  StudioDocumentTab,
  StudioPanelLayoutItem,
} from "@/lib/studioPanelLayout";
import type { StudioRunRuntimeState } from "@/lib/studioRunRuntimeState";
import { cn } from "@/lib/utils";
import {
  buildStudioWorkspaceObjects,
  createStudioRepairWorkspaceObject,
  type StudioWorkspaceObject,
} from "@/lib/studioWorkspaceObjects";
import {
  buildPolishPacketSections,
  buildPrimePacketSections,
  type StudioPolishPromotedNote,
} from "@/lib/studioPacketSections";
import { serializeStudioPacketSectionsForTutor } from "@/lib/studioPacketSerializer";
import { buildStudioMemoryStatus } from "@/lib/studioMemoryStatus";
import {
  buildStudioRepairCandidates,
  type StudioRepairCandidate,
} from "@/lib/studioRepairCandidates";
import { buildStudioTutorStatus } from "@/lib/studioTutorStatus";
import type { ChatMessage } from "@/components/TutorChat.types";
import type { TutorPageMode } from "@/lib/tutorUtils";
import { api } from "@/lib/api";
import type { TutorMemoryCapsule, TutorTemplateChain } from "@/lib/api";
import type { TutorHubResumeCandidate } from "@/lib/api";
import type { UseTutorHubReturn } from "@/hooks/useTutorHub";
import type { UseTutorSessionReturn } from "@/hooks/useTutorSession";
import type { UseTutorWorkflowReturn } from "@/hooks/useTutorWorkflow";
import { useBrainFeedback } from "@/hooks/useBrainFeedback";
import type { TutorBoardScope } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { TUTOR_SHELL_BACKDROP } from "@/components/tutor-shell/tutorShellStyles";

type PrimePromotedWorkspaceObject = Extract<
  StudioWorkspaceObject,
  { kind: "excerpt" | "text_note" }
>;

function readCapsuleRecordLabel(record: Record<string, unknown> | null | undefined): string | null {
  if (!record) return null;
  for (const key of ["label", "title", "content", "message", "text", "concept", "question"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function serializeMemoryCapsuleContext(capsule: TutorMemoryCapsule | null | undefined): string {
  if (!capsule) return "";

  const lines: string[] = [];
  const summaryText = capsule.summary_text?.trim();
  const ruleSnapshotText = capsule.rule_snapshot_text?.trim();
  const currentObjective = capsule.current_objective?.trim();
  const studyUnit = capsule.study_unit?.trim();

  if (summaryText) lines.push(`Summary: ${summaryText}`);
  if (ruleSnapshotText) {
    lines.push("Rule reinforcement:");
    lines.push(ruleSnapshotText);
  }
  if (currentObjective) lines.push(`Current objective: ${currentObjective}`);
  if (studyUnit) lines.push(`Study unit: ${studyUnit}`);

  const weakPoints = (capsule.weak_points || [])
    .map((record) => readCapsuleRecordLabel(record))
    .filter((value): value is string => Boolean(value));
  if (weakPoints.length > 0) {
    lines.push("Weak points:");
    lines.push(...weakPoints.map((value) => `- ${value}`));
  }

  const unresolvedQuestions = (capsule.unresolved_questions || [])
    .map((record) => readCapsuleRecordLabel(record))
    .filter((value): value is string => Boolean(value));
  if (unresolvedQuestions.length > 0) {
    lines.push("Unresolved questions:");
    lines.push(...unresolvedQuestions.map((value) => `- ${value}`));
  }

  return lines.join("\n").trim();
}

export interface TutorShellProps {
  shellMode: TutorPageMode;
  setShellMode: (mode: TutorPageMode) => void;
  activeSessionId: string | null;
  hub: UseTutorHubReturn;
  session: UseTutorSessionReturn;
  workflow: UseTutorWorkflowReturn;
  restoredTurns: { question: string; answer: string | null }[] | undefined;
  activeBoardScope: TutorBoardScope;
  activeBoardId: number | null;
  viewerState: Record<string, unknown> | null;
  documentTabs?: StudioDocumentTab[];
  activeDocumentTabId?: string | null;
  panelLayout?: StudioPanelLayoutItem[];
  runtimeState?: StudioRunRuntimeState;
  tutorChainId?: number;
  tutorCustomBlockIds?: number[];
  setActiveBoardScope: (scope: TutorBoardScope) => void;
  setActiveBoardId: (id: number | null) => void;
  setViewerState: (state: Record<string, unknown> | null) => void;
  setDocumentTabs?: (
    next:
      | StudioDocumentTab[]
      | ((current: StudioDocumentTab[]) => StudioDocumentTab[]),
  ) => void;
  setActiveDocumentTabId?: (id: string | null) => void;
  setPanelLayout?: (
    next:
      | StudioPanelLayoutItem[]
      | ((current: StudioPanelLayoutItem[]) => StudioPanelLayoutItem[]),
  ) => void;
  setActiveMemoryCapsuleId?: (id: number | null) => void;
  setCompactionTelemetry?: (
    compactionTelemetry: Record<string, unknown> | null,
  ) => void;
  setDirectNoteSaveStatus?: (
    directNoteSaveStatus: Record<string, unknown> | null,
  ) => void;
  setTutorChainId?: (id: number | undefined) => void;
  setTutorCustomBlockIds?: (ids: number[]) => void;
  setShowSetup: (show: boolean) => void;
  queryClient: ReturnType<
    typeof import("@tanstack/react-query").useQueryClient
  >;
  promotedPrimePacketObjects?: PrimePromotedWorkspaceObject[];
  promotedPolishPacketNotes?: StudioPolishPromotedNote[];
  onPromotePrimePacketObject?: (
    workspaceObject: PrimePromotedWorkspaceObject,
  ) => void;
  onPromotePolishPacketNote?: (note: StudioPolishPromotedNote) => void;
  onResumeHubCandidate: (
    candidate: TutorHubResumeCandidate,
  ) => void | Promise<void>;
}

export function TutorShell({
  shellMode,
  setShellMode,
  activeSessionId,
  hub,
  session,
  workflow,
  restoredTurns,
  activeBoardScope,
  activeBoardId,
  viewerState,
  documentTabs: controlledDocumentTabs,
  activeDocumentTabId: controlledActiveDocumentTabId,
  panelLayout = [],
  runtimeState,
  tutorChainId,
  tutorCustomBlockIds = [],
  setActiveBoardScope,
  setActiveBoardId,
  setViewerState,
  setDocumentTabs: controlledSetDocumentTabs,
  setActiveDocumentTabId: controlledSetActiveDocumentTabId,
  setPanelLayout = () => undefined,
  setActiveMemoryCapsuleId,
  setCompactionTelemetry,
  setDirectNoteSaveStatus,
  setTutorChainId,
  setTutorCustomBlockIds,
  setShowSetup,
  queryClient,
  promotedPrimePacketObjects: controlledPromotedPrimePacketObjects,
  promotedPolishPacketNotes: controlledPromotedPolishPacketNotes,
  onPromotePrimePacketObject,
  onPromotePolishPacketNote,
  onResumeHubCandidate,
}: TutorShellProps) {
  const currentRunWorkspaceObjects = useMemo(
    () =>
      buildStudioWorkspaceObjects({
        materials: hub.chatMaterials,
        selectedMaterialIds: hub.selectedMaterials,
        selectedPaths: hub.selectedPaths,
      }),
    [hub.chatMaterials, hub.selectedMaterials, hub.selectedPaths],
  );
  const [canvasObjectIds, setCanvasObjectIds] = useState<string[]>([]);
  const [workspaceDraftObjects, setWorkspaceDraftObjects] = useState<
    StudioWorkspaceObject[]
  >([]);
  const [localDocumentTabs, setLocalDocumentTabs] = useState<StudioDocumentTab[]>(
    controlledDocumentTabs ?? [],
  );
  const [localActiveDocumentTabId, setLocalActiveDocumentTabId] = useState<
    string | null
  >(controlledActiveDocumentTabId ?? null);
  const [localPromotedPrimePacketObjects, setLocalPromotedPrimePacketObjects] =
    useState<PrimePromotedWorkspaceObject[]>([]);
  const [localPromotedPolishNotes, setLocalPromotedPolishNotes] = useState<
    StudioPolishPromotedNote[]
  >([]);
  const promotedPrimePacketObjects = useMemo(() => {
    const merged = new Map<string, PrimePromotedWorkspaceObject>();

    for (const workspaceObject of controlledPromotedPrimePacketObjects ?? []) {
      merged.set(workspaceObject.id, workspaceObject);
    }

    for (const workspaceObject of localPromotedPrimePacketObjects) {
      merged.set(workspaceObject.id, workspaceObject);
    }

    return Array.from(merged.values());
  }, [controlledPromotedPrimePacketObjects, localPromotedPrimePacketObjects]);
  const promotedPrimeObjectIds = useMemo(
    () => promotedPrimePacketObjects.map((workspaceObject) => workspaceObject.id),
    [promotedPrimePacketObjects],
  );
  const documentTabs = controlledDocumentTabs ?? localDocumentTabs;
  const activeDocumentTabId =
    controlledActiveDocumentTabId ?? localActiveDocumentTabId;
  const setDocumentTabs =
    controlledSetDocumentTabs ?? setLocalDocumentTabs;
  const setActiveDocumentTabId =
    controlledSetActiveDocumentTabId ?? setLocalActiveDocumentTabId;
  const promotedPolishPacketNotes = useMemo(() => {
    const merged = new Map<string, StudioPolishPromotedNote>();

    for (const note of controlledPromotedPolishPacketNotes ?? []) {
      merged.set(note.id, note);
    }

    for (const note of localPromotedPolishNotes) {
      merged.set(note.id, note);
    }

    return Array.from(merged.values());
  }, [controlledPromotedPolishPacketNotes, localPromotedPolishNotes]);
  const hasFloatingPrimingPanel = useMemo(
    () => panelLayout.some((item) => item.panel === "priming"),
    [panelLayout],
  );
  const hasFloatingTutorPanel = useMemo(
    () => panelLayout.some((item) => item.panel === "tutor"),
    [panelLayout],
  );
  const hasFloatingPolishPanel = useMemo(
    () => panelLayout.some((item) => item.panel === "polish"),
    [panelLayout],
  );
  const canvasObjects = useMemo(
    () => [
      ...currentRunWorkspaceObjects.filter((workspaceObject) =>
        canvasObjectIds.includes(workspaceObject.id),
      ),
      ...workspaceDraftObjects,
    ],
    [canvasObjectIds, currentRunWorkspaceObjects, workspaceDraftObjects],
  );
  const promotedPrimeExcerptObjects = useMemo(
    () =>
      promotedPrimePacketObjects.filter(
        (
          workspaceObject,
        ): workspaceObject is Extract<StudioWorkspaceObject, { kind: "excerpt" }> =>
          workspaceObject.kind === "excerpt",
      ),
    [promotedPrimePacketObjects],
  );
  const promotedPrimeArtifactObjects = useMemo(
    () =>
      promotedPrimePacketObjects.filter(
        (
          workspaceObject,
        ): workspaceObject is Exclude<
          StudioWorkspaceObject,
          { kind: "material" | "vault_path" | "excerpt" }
        > =>
          workspaceObject.kind !== "material" &&
          workspaceObject.kind !== "vault_path" &&
          workspaceObject.kind !== "excerpt",
      ),
    [promotedPrimePacketObjects],
  );
  const workspaceRepairCandidateIds = useMemo(
    () =>
      workspaceDraftObjects.flatMap((workspaceObject) =>
        workspaceObject.kind === "text_note" &&
        workspaceObject.provenance.sourceType === "repair_candidate"
          ? [workspaceObject.provenance.candidateId]
          : [],
      ),
    [workspaceDraftObjects],
  );
  const primePacketSections = useMemo(
    () =>
      buildPrimePacketSections({
        materials: hub.chatMaterials,
        selectedMaterialIds: hub.selectedMaterials,
        selectedPaths: hub.selectedPaths,
        primingBundle: workflow.activeWorkflowDetail?.priming_bundle ?? null,
        primingSummaryText: workflow.primingSummaryText,
        primingConceptsText: workflow.primingConceptsText,
        primingTerminologyText: workflow.primingTerminologyText,
        primingRootExplanationText: workflow.primingRootExplanationText,
        primingGapsText: workflow.primingGapsText,
        primingStrategyText: workflow.primingStrategyText,
        promotedExcerptObjects: promotedPrimeExcerptObjects,
        promotedNoteObjects: promotedPrimeArtifactObjects,
      }),
    [
      hub.chatMaterials,
      hub.selectedMaterials,
      hub.selectedPaths,
      workflow.activeWorkflowDetail?.priming_bundle,
      workflow.primingSummaryText,
      workflow.primingConceptsText,
      workflow.primingTerminologyText,
      workflow.primingRootExplanationText,
      workflow.primingGapsText,
      workflow.primingStrategyText,
      promotedPrimeExcerptObjects,
      promotedPrimeArtifactObjects,
    ],
  );
  const primePacketContext = useMemo(
    () => serializeStudioPacketSectionsForTutor(primePacketSections),
    [primePacketSections],
  );
  const polishPacketSections = useMemo(
    () =>
      buildPolishPacketSections({
        promotedNotes: promotedPolishPacketNotes,
        capturedNotes: workflow.activeWorkflowDetail?.captured_notes ?? [],
        polishBundle: workflow.activeWorkflowDetail?.polish_bundle ?? null,
        publishResults: workflow.activeWorkflowDetail?.publish_results ?? [],
      }),
    [
      promotedPolishPacketNotes,
      workflow.activeWorkflowDetail?.captured_notes,
      workflow.activeWorkflowDetail?.polish_bundle,
      workflow.activeWorkflowDetail?.publish_results,
    ],
  );
  const tutorStatus = useMemo(
    () =>
      buildStudioTutorStatus({
        scholarStrategy: session.scholarStrategy,
        turnCount: session.turnCount ?? 0,
        memoryCapsuleCount:
          workflow.activeWorkflowDetail?.memory_capsules?.length ?? 0,
        latestAssistantContent:
          session.latestCommittedAssistantMessage?.content ?? null,
        compactionTelemetry: runtimeState?.compactionTelemetry ?? null,
        directNoteSaveStatus: runtimeState?.directNoteSaveStatus ?? null,
        latestVerdict: session.latestCommittedAssistantMessage?.verdict ?? null,
        latestTeachBackRubric:
          session.latestCommittedAssistantMessage?.teachBackRubric ?? null,
        stageTimerDisplaySeconds: session.stageTimerDisplaySeconds ?? 0,
        stageTimerRunning: session.stageTimerRunning ?? false,
      }),
    [
      session.scholarStrategy,
      session.turnCount,
      workflow.activeWorkflowDetail?.memory_capsules?.length,
      session.latestCommittedAssistantMessage?.content,
      runtimeState?.compactionTelemetry,
      runtimeState?.directNoteSaveStatus,
      session.latestCommittedAssistantMessage?.verdict,
      session.latestCommittedAssistantMessage?.teachBackRubric,
      session.stageTimerDisplaySeconds,
      session.stageTimerRunning,
    ],
  );
  const repairCandidates = useMemo(
    () =>
      buildStudioRepairCandidates({
        messageHistory: session.committedAssistantMessages.map((message) => ({
          sessionTurnNumber: message.sessionTurnNumber,
          verdict: message.verdict ?? null,
          teachBackRubric: message.teachBackRubric ?? null,
        })),
        latestVerdict: session.latestCommittedAssistantMessage?.verdict ?? null,
        latestTeachBackRubric:
          session.latestCommittedAssistantMessage?.teachBackRubric ?? null,
      }),
    [
      session.committedAssistantMessages,
      session.latestCommittedAssistantMessage?.verdict,
      session.latestCommittedAssistantMessage?.teachBackRubric,
    ],
  );
  const memoryStatus = useMemo(
    () =>
      buildStudioMemoryStatus({
        memoryCapsules: workflow.activeWorkflowDetail?.memory_capsules ?? [],
        turnCount: session.turnCount ?? 0,
        latestAssistantContent:
          session.latestCommittedAssistantMessage?.content ?? null,
        stageTimerDisplaySeconds: session.stageTimerDisplaySeconds ?? 0,
        compactionTelemetry: runtimeState?.compactionTelemetry ?? null,
      }),
    [
      workflow.activeWorkflowDetail?.memory_capsules,
      session.turnCount,
      session.latestCommittedAssistantMessage?.content,
      session.stageTimerDisplaySeconds,
      runtimeState?.compactionTelemetry,
    ],
  );
  const activeMemoryCapsuleContext = useMemo(() => {
    const memoryCapsules = workflow.activeWorkflowDetail?.memory_capsules ?? [];
    if (!runtimeState?.activeMemoryCapsuleId) return "";

    const activeCapsule =
      memoryCapsules.find((capsule) => capsule.id === runtimeState.activeMemoryCapsuleId) ??
      null;
    return serializeMemoryCapsuleContext(activeCapsule);
  }, [
    runtimeState?.activeMemoryCapsuleId,
    workflow.activeWorkflowDetail?.memory_capsules,
  ]);
  const handleAddWorkspaceObject = useCallback(
    (workspaceObject: StudioWorkspaceObject) => {
      setCanvasObjectIds((prev) =>
        prev.includes(workspaceObject.id) ? prev : [...prev, workspaceObject.id],
      );
    },
    [],
  );
  const handleOpenSourceInDocumentDock = useCallback(
    (workspaceObject: Extract<StudioWorkspaceObject, { kind: "material" }>) => {
      const materialId = Number.parseInt(
        workspaceObject.id.replace(/^material:/, ""),
        10,
      );
      if (!Number.isFinite(materialId)) return;
      const tabId = `doc-material-${materialId}`;

      setDocumentTabs((current) =>
        current.some((tab) => tab.id === tabId)
          ? current
          : [
              ...current,
              {
                id: tabId,
                kind: "material",
                title: workspaceObject.title,
                sourceId: materialId,
                sourcePath: workspaceObject.detail || null,
              },
            ],
      );
      setActiveDocumentTabId(tabId);
      setViewerState({
        material_id: materialId,
        source_path: workspaceObject.detail || null,
        file_type: workspaceObject.badge || null,
      });
    },
    [setActiveDocumentTabId, setDocumentTabs, setViewerState],
  );
  const handleSelectDocumentTab = useCallback(
    (tabId: string) => {
      setActiveDocumentTabId(tabId);
      const nextTab = documentTabs.find((tab) => tab.id === tabId) || null;
      if (!nextTab) return;

      if (nextTab.kind === "material" && typeof nextTab.sourceId === "number") {
        const material = hub.chatMaterials.find(
          (candidate) => candidate.id === nextTab.sourceId,
        );
        setViewerState({
          material_id: nextTab.sourceId,
          source_path: nextTab.sourcePath ?? material?.source_path ?? null,
          file_type: material?.file_type ?? null,
          source_title: nextTab.title,
        });
      }
    },
    [
      documentTabs,
      hub.chatMaterials,
      setActiveDocumentTabId,
      setViewerState,
    ],
  );
  const handleClipExcerpt = useCallback((workspaceObject: StudioWorkspaceObject) => {
    setWorkspaceDraftObjects((prev) =>
      prev.some((existingObject) => existingObject.id === workspaceObject.id)
        ? prev
        : [...prev, workspaceObject],
    );
  }, []);
  useEffect(() => {
    if (!activeDocumentTabId) return;
    const activeTab = documentTabs.find((tab) => tab.id === activeDocumentTabId);
    if (!activeTab) return;
    if (activeTab.kind !== "material" || typeof activeTab.sourceId !== "number") {
      return;
    }

    const material = hub.chatMaterials.find(
      (candidate) => candidate.id === activeTab.sourceId,
    );
    const nextSourcePath = activeTab.sourcePath ?? material?.source_path ?? null;
    const nextFileType = material?.file_type ?? null;

    if (
      viewerState?.material_id === activeTab.sourceId &&
      viewerState?.source_path === nextSourcePath &&
      viewerState?.file_type === nextFileType &&
      viewerState?.source_title === activeTab.title
    ) {
      return;
    }

    setViewerState({
      material_id: activeTab.sourceId,
      source_path: nextSourcePath,
      file_type: nextFileType,
      source_title: activeTab.title,
    });
  }, [
    activeDocumentTabId,
    documentTabs,
    hub.chatMaterials,
    setViewerState,
    viewerState,
  ]);
  const handlePromoteExcerptToPrime = useCallback(
    (workspaceObject: Extract<StudioWorkspaceObject, { kind: "excerpt" }>) => {
      if (onPromotePrimePacketObject) {
        onPromotePrimePacketObject(workspaceObject);
        return;
      }
      setLocalPromotedPrimePacketObjects((prev) =>
        prev.some((existingObject) => existingObject.id === workspaceObject.id)
          ? prev
          : [...prev, workspaceObject],
      );
    },
    [onPromotePrimePacketObject],
  );
  const handlePromoteTextNoteToPrime = useCallback(
    (workspaceObject: Extract<StudioWorkspaceObject, { kind: "text_note" }>) => {
      if (onPromotePrimePacketObject) {
        onPromotePrimePacketObject(workspaceObject);
        return;
      }
      setLocalPromotedPrimePacketObjects((prev) =>
        prev.some((existingObject) => existingObject.id === workspaceObject.id)
          ? prev
          : [...prev, workspaceObject],
      );
    },
    [onPromotePrimePacketObject],
  );
  const handlePromoteTutorReplyToPolish = useCallback(
    (payload: { message: ChatMessage; index: number }) => {
      const content = payload.message.content.trim();
      if (!content) return;

      const turnNumber = payload.message.sessionTurnNumber ?? payload.index + 1;
      const noteId = payload.message.messageId || `assistant-message-${turnNumber}`;
      const promotedNote = {
        id: noteId,
        title: `Tutor Reply ${turnNumber}`,
        content,
        badge: "TUTOR",
      } satisfies StudioPolishPromotedNote;

      if (onPromotePolishPacketNote) {
        onPromotePolishPacketNote(promotedNote);
        toast.success("Promoted to Polish Packet");
        return;
      }

      setLocalPromotedPolishNotes((prev) =>
        prev.some((note) => note.id === noteId)
          ? prev
          : [
              ...prev,
              promotedNote,
            ],
      );
      toast.success("Promoted to Polish Packet");
    },
    [onPromotePolishPacketNote],
  );
  const handleSendRepairCandidateToWorkspace = useCallback(
    (candidate: StudioRepairCandidate) => {
      const workspaceObject = createStudioRepairWorkspaceObject(candidate);
      setWorkspaceDraftObjects((prev) =>
        prev.some((existingObject) => existingObject.id === workspaceObject.id)
          ? prev
          : [...prev, workspaceObject],
      );
      toast.success("Repair candidate sent to Workspace");
    },
    [],
  );

  const { data: templateChains = [], isLoading: templateChainsLoading } =
    useQuery<TutorTemplateChain[]>({
      queryKey: ["tutor-chains-templates"],
      queryFn: () => api.tutor.getTemplateChains(),
      enabled: shellMode === "studio",
      staleTime: 60 * 1000,
    });

  const { submitBrainFeedback } = useBrainFeedback();
  const liveTutorSessionId = session.hasActiveTutorSession
    ? activeSessionId
    : null;

  const currentWorkflowStage =
    workflow.activeWorkflowDetail?.workflow?.current_stage ?? null;
  const hasTutorWork =
    Boolean(liveTutorSessionId) ||
    currentWorkflowStage === "tutor" ||
    currentWorkflowStage === "polish" ||
    currentWorkflowStage === "final_sync" ||
    (workflow.activeWorkflowDetail?.captured_notes?.length ?? 0) > 0;
  const hasFinalSyncAccess =
    Boolean(workflow.activeWorkflowDetail?.polish_bundle) ||
    currentWorkflowStage === "final_sync";
  const studioStageNav = (
    <>
      {[
        { key: "home", label: "HOME", available: true },
        { key: "workspace", label: "WORKSPACE", available: true },
        {
          key: "priming",
          label: workflow.bootstrappingPriming ? "PRIMING..." : "PRIMING",
          available: !workflow.bootstrappingPriming,
        },
        { key: "polish", label: "POLISH", available: hasTutorWork },
        {
          key: "final_sync",
          label: "FINAL SYNC",
          available: hasFinalSyncAccess,
        },
      ].map((stage) => {
        const isActive = workflow.studioView === stage.key;
        return (
          <Button
            key={stage.key}
            type="button"
            variant="ghost"
            disabled={!stage.available}
            aria-pressed={isActive}
            onClick={() => {
              if (stage.key === "priming") {
                void workflow.openStudioPriming();
                return;
              }
              workflow.setStudioView(stage.key as typeof workflow.studioView);
            }}
            className={cn(
              "h-9 rounded-full border px-3 font-mono text-[10px] uppercase tracking-[0.18em]",
              isActive
                ? "border-[rgba(255,112,138,0.40)] bg-[linear-gradient(180deg,rgba(255,72,104,0.18),rgba(12,2,5,0.94)_52%,rgba(0,0,0,0.98)_100%)] text-white"
                : "border-[rgba(255,70,104,0.12)] bg-black/25 text-[#ffd4dc]/78 hover:border-[rgba(255,108,136,0.26)] hover:text-white",
              !stage.available && "cursor-not-allowed opacity-35",
            )}
          >
            {stage.label}
          </Button>
        );
      })}
    </>
  );

  // ── Save Gist: summarize a reply via LLM and capture as workflow note ──
  const handleSaveGist = useCallback(
    async (content: string) => {
      if (!liveTutorSessionId) {
        toast.error("No active session");
        return;
      }
      try {
        const { summary } = await api.tutor.summarizeReply(
          liveTutorSessionId,
          content,
        );
        if (workflow.activeWorkflowId) {
          await api.tutor.captureWorkflowNote(workflow.activeWorkflowId, {
            tutor_session_id: liveTutorSessionId,
            stage: "tutor",
            note_mode: "exact",
            title: `[Gist] ${summary.slice(0, 50)}`,
            content: summary,
            status: "captured",
          });
          await queryClient.invalidateQueries({
            queryKey: ["tutor-workflow-detail", workflow.activeWorkflowId],
          });
        }
        toast.success("Saved gist to Packet");
      } catch (err) {
        toast.error(
          `Failed to save gist: ${err instanceof Error ? err.message : "Unknown error"}`,
        );
      }
    },
    [liveTutorSessionId, workflow.activeWorkflowId, queryClient],
  );

  const studioWorkspaceContentHome = (
    <StudioWorkspaceHome
        workflow={
          workflow.activeWorkflowDetail?.workflow
            ? {
                workflowId: workflow.activeWorkflowDetail.workflow.workflow_id,
                currentStage:
                  workflow.activeWorkflowDetail.workflow.current_stage,
                status: workflow.activeWorkflowDetail.workflow.status,
                updatedAt: workflow.activeWorkflowDetail.workflow.updated_at,
              }
            : null
        }
        courseName={
          hub.courseLabel ||
          workflow.activeWorkflowDetail?.workflow?.course_name ||
          null
        }
        studyUnit={
          hub.effectiveStudyUnit ||
          workflow.activeWorkflowDetail?.workflow?.study_unit ||
          null
        }
        topic={
          hub.effectiveTopic ||
          workflow.activeWorkflowDetail?.workflow?.topic ||
          null
        }
        selectedMaterialCount={hub.selectedMaterials.length}
        hasTutorWork={hasTutorWork}
        hasFinalSyncAccess={hasFinalSyncAccess}
        hasActiveSession={Boolean(liveTutorSessionId)}
        resumeCandidate={hub.tutorHub?.resume_candidate ?? null}
        bootstrappingPriming={workflow.bootstrappingPriming}
        onResumeTutor={() => setShellMode("tutor")}
        onResumeCandidate={(candidate) => {
          void onResumeHubCandidate(candidate);
        }}
        onOpenWorkspace={() => workflow.setStudioView("workspace")}
        onOpenPriming={() => {
          void workflow.openStudioPriming();
        }}
        onOpenPolish={() => workflow.setStudioView("polish")}
        onOpenFinalSync={() => workflow.setStudioView("final_sync")}
      />
  );

  const workspaceStudioContent = (
    <div className="flex-1 min-h-0 flex flex-col">
      <StudioTldrawWorkspaceLazy
        canvasObjects={canvasObjects}
        courseName={hub.courseLabel || null}
        currentRunObjects={currentRunWorkspaceObjects}
        promotedPrimeObjectIds={promotedPrimeObjectIds}
        selectedMaterialCount={hub.selectedMaterials.length}
        onPromoteExcerptToPrime={handlePromoteExcerptToPrime}
        onPromoteTextNoteToPrime={handlePromoteTextNoteToPrime}
      />
    </div>
  );

  const primingStudioContent = (
    <div className="flex-1 min-h-0 overflow-y-auto w-full p-4">
      <TutorWorkflowPrimingPanelLazy
        workflow={workflow.activeWorkflowDetail?.workflow || null}
        courses={hub.tutorContentSources?.courses || []}
        courseId={hub.courseId}
        setCourseId={hub.setCourseId}
        selectedMaterials={hub.selectedMaterials}
        setSelectedMaterials={hub.setSelectedMaterials}
        topic={hub.topic}
        setTopic={hub.setTopic}
        objectiveScope={hub.objectiveScope}
        setObjectiveScope={hub.setObjectiveScope}
        selectedObjectiveId={hub.selectedObjectiveId}
        setSelectedObjectiveId={hub.setSelectedObjectiveId}
        selectedObjectiveGroup={hub.selectedObjectiveGroup}
        setSelectedObjectiveGroup={hub.setSelectedObjectiveGroup}
        availableObjectives={hub.availableObjectives}
        studyUnitOptions={hub.studyUnitOptions}
        primingMethods={workflow.primingMethods}
        setPrimingMethods={workflow.setPrimingMethods}
        primingMethodRuns={workflow.primingMethodRuns}
        chainId={hub.chainId}
        setChainId={hub.setChainId}
        customBlockIds={hub.customBlockIds}
        setCustomBlockIds={hub.setCustomBlockIds}
        templateChains={templateChains}
        templateChainsLoading={templateChainsLoading}
        summaryText={workflow.primingSummaryText}
        setSummaryText={workflow.setPrimingSummaryText}
        conceptsText={workflow.primingConceptsText}
        setConceptsText={workflow.setPrimingConceptsText}
        terminologyText={workflow.primingTerminologyText}
        setTerminologyText={workflow.setPrimingTerminologyText}
        rootExplanationText={workflow.primingRootExplanationText}
        setRootExplanationText={workflow.setPrimingRootExplanationText}
        gapsText={workflow.primingGapsText}
        setGapsText={workflow.setPrimingGapsText}
        recommendedStrategyText={workflow.primingStrategyText}
        setRecommendedStrategyText={workflow.setPrimingStrategyText}
        sourceInventory={workflow.mergedPrimingSourceInventory}
        vaultFolderPreview={hub.derivedVaultFolder}
        readinessItems={workflow.primingReadinessItems}
        preflightBlockers={session.preflight?.blockers || []}
        preflightLoading={session.preflightLoading}
        preflightError={session.preflightError}
        onBackToStudio={() => {
          workflow.setStudioView("home");
          setShellMode("studio");
        }}
        onSaveDraft={() => {
          void workflow.saveWorkflowPriming("draft");
        }}
        onMarkReady={() => {
          void workflow.saveWorkflowPriming("ready");
        }}
        onStartTutor={() => {
          void workflow.startTutorFromWorkflow(
            {
              ...(primePacketContext ? { packet_context: primePacketContext } : {}),
              ...(activeMemoryCapsuleContext
                ? { memory_capsule_context: activeMemoryCapsuleContext }
                : {}),
            },
          );
        }}
        onRunAssistForSelected={() => {
          void workflow.runWorkflowPrimingAssist(
            hub.selectedMaterials,
            {
              ...(primePacketContext ? { packet_context: primePacketContext } : {}),
              ...(activeMemoryCapsuleContext
                ? { memory_capsule_context: activeMemoryCapsuleContext }
                : {}),
            },
          );
        }}
        onRunAssistForMaterial={(materialId) => {
          void workflow.runWorkflowPrimingAssist(
            [materialId],
            {
              ...(primePacketContext ? { packet_context: primePacketContext } : {}),
              ...(activeMemoryCapsuleContext
                ? { memory_capsule_context: activeMemoryCapsuleContext }
                : {}),
            },
          );
        }}
        isSaving={workflow.savingPrimingBundle}
        isStartingTutor={session.isStarting}
        isRunningAssist={workflow.runningPrimingAssist}
        assistTargetMaterialId={workflow.primingAssistTargetMaterialId}
      />
    </div>
  );

  const tutorStudioContent = (
    <div className="flex-1 flex flex-col min-h-0">
      <TutorLiveStudyPane
        activeSessionId={liveTutorSessionId}
        hub={hub}
        session={session}
        workflow={workflow}
        restoredTurns={restoredTurns}
        queryClient={queryClient}
        setShellMode={setShellMode}
        onStartSession={() => {
          void session.startSession(
            {
              ...(primePacketContext ? { packet_context: primePacketContext } : {}),
              ...(activeMemoryCapsuleContext
                ? { memory_capsule_context: activeMemoryCapsuleContext }
                : {}),
            },
          );
        }}
        activeMemoryCapsuleContext={activeMemoryCapsuleContext}
        onActivateMemoryCapsule={setActiveMemoryCapsuleId}
        onDirectNoteSaveStatus={setDirectNoteSaveStatus}
        onSaveGist={handleSaveGist}
        onPromoteTutorReplyToPolish={handlePromoteTutorReplyToPolish}
        onCompactionTelemetry={(telemetry) => {
          setCompactionTelemetry?.(telemetry);
        }}
        submitBrainFeedback={submitBrainFeedback}
      />
    </div>
  );

  const polishStudioContent = (
    <div className="flex-1 min-h-0 overflow-y-auto w-full p-4">
      <TutorWorkflowPolishStudioLazy
        workflow={workflow.activeWorkflowDetail?.workflow || null}
        primingBundleId={workflow.activeWorkflowDetail?.priming_bundle?.id || null}
        capturedNotes={workflow.activeWorkflowDetail?.captured_notes || []}
        feedbackEvents={workflow.activeWorkflowDetail?.feedback_events || []}
        memoryCapsules={workflow.activeWorkflowDetail?.memory_capsules || []}
        existingBundle={workflow.activeWorkflowDetail?.polish_bundle || null}
        onBackToTutor={() => setShellMode("tutor")}
        onSaveDraft={(payload) => {
          void workflow.saveWorkflowPolish(payload, false);
        }}
        onFinalize={(payload) => {
          void workflow.saveWorkflowPolish(payload, true);
        }}
        isSaving={workflow.savingPolishBundle}
      />
    </div>
  );

  const finalSyncStudioContent = (
    <div className="flex-1 min-h-0 overflow-y-auto w-full p-4">
      <TutorWorkflowFinalSyncLazy
        workflowDetail={workflow.activeWorkflowDetail || null}
        onBackToPolish={() => workflow.setStudioView("polish")}
      />
    </div>
  );

  const studioWorkspaceContent =
    workflow.studioView === "home" ? (
      studioWorkspaceContentHome
    ) : workflow.studioView === "workspace" ? (
      workspaceStudioContent
    ) : workflow.studioView === "priming" ? (
      primingStudioContent
    ) : workflow.studioView === "polish" ? (
      polishStudioContent
    ) : (
      finalSyncStudioContent
    );

  return (
    <>
      {/* Scholar strategy panel */}
      {shellMode === "tutor" && liveTutorSessionId && session.scholarStrategy && (
        <TutorScholarStrategyPanel session={session} />
      )}

      {/* Main content area */}
      <div className="flex-1 flex min-h-0 relative">
        <div
          className={cn("flex-1 flex flex-col min-w-0", TUTOR_SHELL_BACKDROP)}
          role="tabpanel"
          aria-labelledby={`tutor-tab-${shellMode}`}
        >
          {shellMode === "studio" ? (
            <TutorStudioShellPane
              view={workflow.studioView}
              primingPanel={hasFloatingPrimingPanel ? primingStudioContent : undefined}
              tutorPanel={hasFloatingTutorPanel ? tutorStudioContent : undefined}
              polishPanel={hasFloatingPolishPanel ? polishStudioContent : undefined}
              sourceShelf={
                <SourceShelf
                  courseName={
                    hub.courseLabel ||
                    workflow.activeWorkflowDetail?.workflow?.course_name ||
                    null
                  }
                  studyUnit={
                    hub.effectiveStudyUnit ||
                    workflow.activeWorkflowDetail?.workflow?.study_unit ||
                    null
                  }
                  topic={
                    hub.effectiveTopic ||
                    workflow.activeWorkflowDetail?.workflow?.topic ||
                    null
                  }
                  materials={hub.chatMaterials}
                  selectedMaterialIds={hub.selectedMaterials}
                  selectedMaterialCount={hub.selectedMaterials.length}
                  selectedPaths={hub.selectedPaths}
                  vaultFolder={hub.derivedVaultFolder || null}
                  workspaceObjectIds={canvasObjectIds}
                  onAddToWorkspace={handleAddWorkspaceObject}
                  onOpenInDocumentDock={handleOpenSourceInDocumentDock}
                />
              }
              documentDock={
                <StudioDocumentDock
                  materials={hub.chatMaterials}
                  selectedMaterialIds={hub.selectedMaterials}
                  selectedPaths={hub.selectedPaths}
                  viewerState={viewerState}
                  documentTabs={documentTabs}
                  activeDocumentTabId={activeDocumentTabId}
                  onSelectDocumentTab={handleSelectDocumentTab}
                  onClipExcerpt={handleClipExcerpt}
                />
              }
              runConfig={
                <RunConfigPanel
                  primingMethodIds={workflow.primingMethods}
                  setPrimingMethods={workflow.setPrimingMethods}
                  tutorChainId={tutorChainId}
                  setTutorChainId={setTutorChainId}
                  tutorCustomBlockIds={tutorCustomBlockIds}
                  setTutorCustomBlockIds={setTutorCustomBlockIds}
                  accuracyProfile={hub.accuracyProfile}
                  setAccuracyProfile={hub.setAccuracyProfile}
                  objectiveScope={hub.objectiveScope}
                  setObjectiveScope={hub.setObjectiveScope}
                  templateChains={templateChains}
                  templateChainsLoading={templateChainsLoading}
                  hasActiveSession={Boolean(liveTutorSessionId)}
                />
              }
              tutorStatus={<TutorStatusPanel status={tutorStatus} />}
              repairCandidates={
                <RepairCandidatesPanel
                  candidates={repairCandidates}
                  sentCandidateIds={workspaceRepairCandidateIds}
                  onSendToWorkspace={handleSendRepairCandidateToWorkspace}
                />
              }
              memory={
                <MemoryPanel
                  status={memoryStatus}
                  activeCapsuleId={runtimeState?.activeMemoryCapsuleId ?? null}
                  onActivateCapsule={setActiveMemoryCapsuleId}
                />
              }
              primePacket={<PrimePacketPanel sections={primePacketSections} />}
              polishPacket={<PolishPacketPanel sections={polishPacketSections} />}
              workspace={studioWorkspaceContent}
              stageNav={studioStageNav}
              panelLayout={panelLayout}
              setPanelLayout={setPanelLayout}
            />
          ) : (
            <div
              key="chat"
              className="flex-1 flex flex-col min-h-0 animate-fade-slide-in"
            >
              <TutorErrorBoundary fallbackLabel="Tutor">
                <TutorLiveStudyPane
                  activeSessionId={liveTutorSessionId}
                  hub={hub}
                  session={session}
                  workflow={workflow}
                  restoredTurns={restoredTurns}
                  queryClient={queryClient}
                  setShellMode={setShellMode}
                  onStartSession={() => {
                    void session.startSession(
                      {
                        ...(primePacketContext ? { packet_context: primePacketContext } : {}),
                        ...(activeMemoryCapsuleContext
                          ? { memory_capsule_context: activeMemoryCapsuleContext }
                          : {}),
                      },
                    );
                  }}
                  activeMemoryCapsuleContext={activeMemoryCapsuleContext}
                  onActivateMemoryCapsule={setActiveMemoryCapsuleId}
                  onDirectNoteSaveStatus={setDirectNoteSaveStatus}
                  onSaveGist={handleSaveGist}
                  onPromoteTutorReplyToPolish={handlePromoteTutorReplyToPolish}
                  onCompactionTelemetry={(telemetry) => {
                    setCompactionTelemetry?.(telemetry);
                  }}
                  submitBrainFeedback={submitBrainFeedback}
                />
              </TutorErrorBoundary>
            </div>
          )}
        </div>

        {/* Right side artifact panel */}
        <TutorArtifactsDrawer
          activeSessionId={liveTutorSessionId}
          shellMode={shellMode}
          hub={hub}
          session={session}
        />
      </div>
    </>
  );
}
