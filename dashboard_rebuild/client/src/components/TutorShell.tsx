import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { TutorErrorBoundary } from "@/components/TutorErrorBoundary";
import { Button } from "@/components/ui/button";
import { SourceShelf } from "@/components/studio/SourceShelf";
import { RunConfigPanel } from "@/components/studio/RunConfigPanel";
import {
  StudioShell,
  buildStudioShellPresetLayout,
} from "@/components/studio/StudioShell";
import { StudioDocumentDock } from "@/components/studio/StudioDocumentDock";
import { StudioWorkspaceUnified } from "@/components/studio/StudioWorkspaceUnified";
import { PrimePacketPanel } from "@/components/studio/PrimePacketPanel";
import { PolishPacketPanel } from "@/components/studio/PolishPacketPanel";
import { MemoryPanel } from "@/components/studio/MemoryPanel";
import { TutorLiveStudyPane } from "@/components/tutor-shell/TutorLiveStudyPane";
import { TutorScholarStrategyPanel } from "@/components/tutor-shell/TutorScholarStrategyPanel";
import {
  TutorWorkflowPolishStudioLazy,
  TutorWorkflowPrimingPanelLazy,
} from "@/components/tutor-shell/TutorShellDeferredPanels";
import type {
  StudioDocumentTab,
  StudioPanelLayoutItem,
} from "@/lib/studioPanelLayout";
import type { StudioRunRuntimeState } from "@/lib/studioRunRuntimeState";
import {
  buildStudioWorkspaceObjects,
  type StudioWorkspaceObject,
} from "@/lib/studioWorkspaceObjects";
import {
  buildPolishPacketSections,
  buildPrimePacketSections,
  type StudioPolishPromotedNote,
} from "@/lib/studioPacketSections";
import { serializeStudioPacketSectionsForTutor } from "@/lib/studioPacketSerializer";
import { deriveVaultFolder } from "@/lib/tutorUtils";
import { buildStudioMemoryStatus } from "@/lib/studioMemoryStatus";
import type { ChatMessage } from "@/components/TutorChat.types";
import { api } from "@/lib/api";
import type { TutorMemoryCapsule, TutorTemplateChain } from "@/lib/api";
import type { TutorHubResumeCandidate } from "@/lib/api";
import type { UseTutorHubReturn } from "@/hooks/useTutorHub";
import type { UseTutorSessionReturn } from "@/hooks/useTutorSession";
import type { UseTutorWorkflowReturn } from "@/hooks/useTutorWorkflow";
import { useBrainFeedback } from "@/hooks/useBrainFeedback";
import type { TutorBoardScope } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import type { ChangeEvent } from "react";

type PrimePromotedWorkspaceObject = Extract<
  StudioWorkspaceObject,
  { kind: "excerpt" | "text_note" }
>;

function readTemplateChainLabel(chain: TutorTemplateChain): string {
  const legacyTitle = (chain as TutorTemplateChain & { title?: string }).title;
  return chain.name || legacyTitle || `Chain #${chain.id}`;
}

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

function parseRuleSnapshotLines(value: string | null | undefined): string[] {
  if (typeof value !== "string") {
    return [];
  }
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => Boolean(line));
}

function formatMaterialFileType(value: string | null | undefined): string {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized ? normalized.toUpperCase() : "FILE";
}

function formatEntryMaterialLabel(
  title: string | null | undefined,
  sourcePath: string | null | undefined,
): string {
  const preferredLabel = typeof title === "string" ? title.trim() : "";
  const fallbackLabel = typeof sourcePath === "string" ? sourcePath.trim() : "";
  const resolvedLabel = preferredLabel || fallbackLabel;

  if (!resolvedLabel) {
    return "Unknown material";
  }

  const basename = resolvedLabel.split(/[\\/]/).pop()?.trim() || resolvedLabel;
  return basename || "Unknown material";
}

const ENTRY_CARD_UPLOAD_ACCEPT = ".pdf,.docx,.mp4,.pptx";

export interface TutorShellProps {
  activeSessionId: string | null;
  hub: UseTutorHubReturn;
  session: UseTutorSessionReturn;
  workflow: UseTutorWorkflowReturn;
  showSetup: boolean;
  restoredTurns: { question: string; answer: string | null }[] | undefined;
  activeBoardScope: TutorBoardScope;
  activeBoardId: number | null;
  viewerState: Record<string, unknown> | null;
  documentTabs?: StudioDocumentTab[];
  activeDocumentTabId?: string | null;
  panelLayout?: StudioPanelLayoutItem[];
  runtimeState?: StudioRunRuntimeState;
  primingMethodIds?: string[];
  primingChainId?: number | null;
  primingCustomBlockIds?: number[];
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
  setPrimingMethodIds?: (ids: string[]) => void;
  setPrimingChainId?: (id: number | null | undefined) => void;
  setPrimingCustomBlockIds?: (ids: number[]) => void;
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
  entrySessionName?: string;
  onEntrySessionNameChange?: (value: string) => void;
  entryMaterialSelectionTouched?: boolean;
  onEntryMaterialSelectionTouchedChange?: (touched: boolean) => void;
  entryCardFlashActive?: boolean;
  onStartPriming?: () => void | Promise<void>;
  isStartingPriming?: boolean;
  startPrimingViewportFocusRequestKey?: number | null;
  workspaceResetVersion?: number;
  onResumeHubCandidate: (
    candidate: TutorHubResumeCandidate,
  ) => void | Promise<void>;
}

export function TutorShell({
  activeSessionId,
  hub,
  session,
  workflow,
  showSetup,
  restoredTurns,
  activeBoardScope,
  activeBoardId,
  viewerState,
  documentTabs: controlledDocumentTabs,
  activeDocumentTabId: controlledActiveDocumentTabId,
  panelLayout = [],
  runtimeState,
  primingMethodIds = [],
  primingChainId,
  primingCustomBlockIds = [],
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
  setPrimingMethodIds,
  setPrimingChainId,
  setPrimingCustomBlockIds,
  setTutorChainId,
  setTutorCustomBlockIds,
  setShowSetup,
  queryClient,
  promotedPrimePacketObjects: controlledPromotedPrimePacketObjects,
  promotedPolishPacketNotes: controlledPromotedPolishPacketNotes,
  onPromotePrimePacketObject,
  onPromotePolishPacketNote,
  entrySessionName = "",
  onEntrySessionNameChange,
  onEntryMaterialSelectionTouchedChange,
  entryCardFlashActive = false,
  onStartPriming,
  isStartingPriming = false,
  startPrimingViewportFocusRequestKey = null,
  workspaceResetVersion = 0,
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
  const [notesScratchpad, setNotesScratchpad] = useState("");
  const [sourceShelfUploading, setSourceShelfUploading] = useState(false);
  const entryUploadInputRef = useRef<HTMLInputElement | null>(null);
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
  const activeMemoryCapsule = useMemo(() => {
    const memoryCapsules = workflow.activeWorkflowDetail?.memory_capsules ?? [];
    if (!runtimeState?.activeMemoryCapsuleId) return null;

    const activeCapsule =
      memoryCapsules.find((capsule) => capsule.id === runtimeState.activeMemoryCapsuleId) ??
      null;
    return activeCapsule;
  }, [
    runtimeState?.activeMemoryCapsuleId,
    workflow.activeWorkflowDetail?.memory_capsules,
  ]);
  const activeMemoryCapsuleContext = useMemo(
    () => serializeMemoryCapsuleContext(activeMemoryCapsule),
    [activeMemoryCapsule],
  );
  const activeTutorSessionRules = useMemo(() => {
    const merged = new Map<string, string>();
    const existingSessionRules = Array.isArray(session.activeContentFilter?.session_rules)
      ? session.activeContentFilter.session_rules
      : [];
    for (const rule of existingSessionRules) {
      const normalizedRule = String(rule || "").trim();
      if (normalizedRule) {
        merged.set(normalizedRule, normalizedRule);
      }
    }

    if (activeMemoryCapsule) {
      for (const rule of parseRuleSnapshotLines(activeMemoryCapsule.rule_snapshot_text)) {
        merged.set(rule, rule);
      }
    }

    return Array.from(merged.values());
  }, [activeMemoryCapsule, session.activeContentFilter?.session_rules]);
  const handleAddWorkspaceObject = useCallback(
    (workspaceObject: StudioWorkspaceObject) => {
      setCanvasObjectIds((prev) =>
        prev.includes(workspaceObject.id) ? prev : [...prev, workspaceObject.id],
      );
    },
    [],
  );
  const handleSendPrimingResultToWorkspace = useCallback(
    (workspaceObject: Extract<StudioWorkspaceObject, { kind: "text_note" }>) => {
      setWorkspaceDraftObjects((prev) =>
        prev.some((existingObject) => existingObject.id === workspaceObject.id)
          ? prev
          : [...prev, workspaceObject],
      );
      setCanvasObjectIds((prev) =>
        prev.includes(workspaceObject.id) ? prev : [...prev, workspaceObject.id],
      );
      toast.success("Sent to Workspace");
    },
    [],
  );
  const handleOpenSourceInDocumentDock = useCallback(
    (
      workspaceObject: Extract<
        StudioWorkspaceObject,
        { kind: "material" | "vault_path" }
      >,
    ) => {
      if (workspaceObject.kind === "vault_path") {
        const tabId = `doc-${workspaceObject.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;

        setDocumentTabs((current) =>
          current.some((tab) => tab.id === tabId)
            ? current
            : [
                ...current,
                {
                  id: tabId,
                  kind: "vault",
                  title: workspaceObject.title,
                  sourcePath: workspaceObject.title,
                },
              ],
        );
        setActiveDocumentTabId(tabId);
        setViewerState({
          source_path: workspaceObject.title,
          file_type: workspaceObject.badge,
          source_title: workspaceObject.title,
          source_kind: "vault",
        });
        return;
      }

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
        return;
      }

      if (nextTab.kind === "vault") {
        setViewerState({
          source_path: nextTab.sourcePath ?? null,
          file_type: nextTab.kind,
          source_title: nextTab.title,
          source_kind: "vault",
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
    if (activeTab.kind === "vault") {
      if (
        viewerState?.source_path === (activeTab.sourcePath ?? null) &&
        viewerState?.file_type === activeTab.kind &&
        viewerState?.source_title === activeTab.title &&
        viewerState?.source_kind === "vault"
      ) {
        return;
      }

      setViewerState({
        source_path: activeTab.sourcePath ?? null,
        file_type: activeTab.kind,
        source_title: activeTab.title,
        source_kind: "vault",
      });
      return;
    }

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
  const { data: templateChains = [], isLoading: templateChainsLoading } =
    useQuery<TutorTemplateChain[]>({
      queryKey: ["tutor-chains-templates"],
      queryFn: () => api.tutor.getTemplateChains(),
      staleTime: 60 * 1000,
    });

  const { submitBrainFeedback } = useBrainFeedback();
  const liveTutorSessionId = session.hasActiveTutorSession
    ? activeSessionId
    : null;
  const resumeCandidate = hub.tutorHub?.resume_candidate ?? null;
  const resolvedPrimingMethodIds = useMemo(() => {
    if (primingMethodIds.length > 0 || workflow.primingMethods.length === 0) {
      return primingMethodIds;
    }
    return workflow.primingMethods;
  }, [primingMethodIds, workflow.primingMethods]);
  const tutorChainSelectValue = useMemo(() => {
    if (typeof tutorChainId === "number") {
      return `template:${tutorChainId}`;
    }
    if (tutorCustomBlockIds.length > 0) {
      return "custom";
    }
    return "auto";
  }, [tutorChainId, tutorCustomBlockIds.length]);
  const applyCanvasPreset = useCallback(
    (preset: "priming" | "study" | "polish" | "full_studio" | "minimal") => {
      setPanelLayout(buildStudioShellPresetLayout(preset));
    },
    [setPanelLayout],
  );
  const availableCourses = useMemo(
    () => hub.tutorContentSources?.courses || [],
    [hub.tutorContentSources?.courses],
  );
  const selectedSourceShelfCourse = useMemo(
    () =>
      typeof hub.courseId === "number"
        ? availableCourses.find((course) => course.id === hub.courseId) || null
        : null,
    [availableCourses, hub.courseId],
  );
  const sourceShelfCourseName = useMemo(
    () =>
      hub.courseLabel ||
      selectedSourceShelfCourse?.name ||
      (hub.tutorHub?.resume_candidate?.course_id === hub.courseId
        ? hub.tutorHub?.resume_candidate?.course_name
        : null) ||
      (hub.tutorHub?.study_wheel?.current_course_id === hub.courseId
        ? hub.tutorHub?.study_wheel?.current_course_name
        : null) ||
      workflow.activeWorkflowDetail?.workflow?.course_name ||
      null,
    [
      hub.courseId,
      hub.courseLabel,
      hub.tutorHub?.resume_candidate?.course_id,
      hub.tutorHub?.resume_candidate?.course_name,
      hub.tutorHub?.study_wheel?.current_course_id,
      hub.tutorHub?.study_wheel?.current_course_name,
      selectedSourceShelfCourse?.name,
      workflow.activeWorkflowDetail?.workflow?.course_name,
    ],
  );
  const sourceShelfStudyUnit = useMemo(
    () =>
      hub.effectiveStudyUnit ||
      workflow.activeWorkflowDetail?.workflow?.study_unit ||
      null,
    [hub.effectiveStudyUnit, workflow.activeWorkflowDetail?.workflow?.study_unit],
  );
  const sourceShelfTopic = useMemo(
    () =>
      hub.effectiveTopic ||
      workflow.activeWorkflowDetail?.workflow?.topic ||
      null,
    [hub.effectiveTopic, workflow.activeWorkflowDetail?.workflow?.topic],
  );
  const sourceShelfVaultFolder = useMemo(() => {
    const explicitVaultFolder =
      typeof hub.derivedVaultFolder === "string"
        ? hub.derivedVaultFolder.trim()
        : "";
    if (explicitVaultFolder) {
      return explicitVaultFolder;
    }

    if (!sourceShelfCourseName) {
      return null;
    }

    const apiConfiguredCourseFolder = (
      selectedSourceShelfCourse?.vault_folder ||
      selectedSourceShelfCourse?.vault_path ||
      ""
    )
      .replace(/^Courses\//i, "")
      .trim();
    const configuredCourseFolder =
      apiConfiguredCourseFolder ||
      (hub.courseFolders || []).find(
        (course) =>
          String(course.name || "").trim().toLowerCase() ===
          sourceShelfCourseName.trim().toLowerCase(),
      )?.path || sourceShelfCourseName;

    return deriveVaultFolder(configuredCourseFolder, sourceShelfStudyUnit || "")
      .replace(/^Courses\//i, "")
      .trim();
  }, [
    hub.courseFolders,
    hub.derivedVaultFolder,
    selectedSourceShelfCourse?.vault_folder,
    selectedSourceShelfCourse?.vault_path,
    sourceShelfCourseName,
    sourceShelfStudyUnit,
  ]);
  const selectedCourseMaterialCount = useMemo(
    () =>
      typeof hub.courseId === "number"
        ? hub.getCourseMaterialIds(hub.courseId).length
        : 0,
    [hub],
  );
  const selectedCourseMaterials = useMemo(
    () =>
      typeof hub.courseId === "number"
        ? hub.chatMaterials.filter((material) => material.course_id === hub.courseId)
        : [],
    [hub.chatMaterials, hub.courseId],
  );
  const selectedCourseMaterialIds = useMemo(
    () => selectedCourseMaterials.map((material) => material.id),
    [selectedCourseMaterials],
  );
  const selectedCourseMaterialIdSet = useMemo(
    () => new Set(selectedCourseMaterialIds),
    [selectedCourseMaterialIds],
  );
  const selectedEntryMaterialCount = useMemo(
    () =>
      hub.selectedMaterials.filter((materialId) =>
        selectedCourseMaterialIdSet.has(materialId),
      ).length,
    [hub.selectedMaterials, selectedCourseMaterialIdSet],
  );
  const allEntryMaterialsSelected =
    selectedCourseMaterialIds.length > 0 &&
    selectedEntryMaterialCount === selectedCourseMaterialIds.length;

  const handleSetPrimingMethods = useCallback(
    (ids: string[]) => {
      workflow.setPrimingMethods(ids);
      setPrimingMethodIds?.(ids);
    },
    [setPrimingMethodIds, workflow],
  );

  const handleSetPrimingChainId = useCallback(
    (id: number | null | undefined) => {
      setPrimingChainId?.(id);
      if (typeof id === "number") {
        setPrimingCustomBlockIds?.([]);
      }
    },
    [setPrimingChainId, setPrimingCustomBlockIds],
  );

  const handleSetPrimingCustomBlockIds = useCallback(
    (ids: number[]) => {
      setPrimingCustomBlockIds?.(ids);
      if (ids.length > 0) {
        setPrimingChainId?.(undefined);
      }
    },
    [setPrimingChainId, setPrimingCustomBlockIds],
  );

  const handleUploadSourceShelfFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) {
        return;
      }

      setSourceShelfUploading(true);
      const uploadedIds: number[] = [];
      let successes = 0;
      let failures = 0;

      try {
        for (const file of files) {
          try {
            const result = await api.tutor.uploadMaterial(file, {
              ...(typeof hub.courseId === "number"
                ? { course_id: hub.courseId }
                : {}),
            });
            uploadedIds.push(result.id);
            successes += 1;
          } catch (error) {
            failures += 1;
            toast.error(
              `Upload failed for ${file.name}: ${
                error instanceof Error ? error.message : "Unknown error"
              }`,
            );
          }
        }

        await hub.refreshChatMaterials?.();
        if (uploadedIds.length > 0) {
          hub.setSelectedMaterials((current) =>
            Array.from(new Set([...current, ...uploadedIds])),
          );
        }

        if (successes > 0) {
          toast.success(
            `${successes} file${successes === 1 ? "" : "s"} added to Library and Current Run`,
          );
        }
        if (failures > 0 && successes === 0) {
          toast.error("Upload failed.");
        }
      } finally {
        setSourceShelfUploading(false);
      }
    },
    [hub],
  );

  const handleEntryMaterialUploadChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      try {
        await handleUploadSourceShelfFiles(Array.from(event.target.files));
      } finally {
        event.target.value = "";
      }
    },
    [handleUploadSourceShelfFiles],
  );

  const handleEntryCourseChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      const nextCourseId = Number.parseInt(event.target.value, 10);
      const resolvedCourseId = Number.isFinite(nextCourseId)
        ? nextCourseId
        : undefined;
      hub.setCourseId(resolvedCourseId);
      onEntryMaterialSelectionTouchedChange?.(false);
      if (typeof resolvedCourseId === "number") {
        hub.setSelectedMaterials(hub.getCourseMaterialIds(resolvedCourseId));
        return;
      }
      hub.setSelectedMaterials([]);
    },
    [hub, onEntryMaterialSelectionTouchedChange],
  );

  const handleToggleAllEntryMaterials = useCallback(() => {
    if (selectedCourseMaterialIds.length === 0) {
      return;
    }
    onEntryMaterialSelectionTouchedChange?.(true);
    hub.setSelectedMaterials(
      allEntryMaterialsSelected ? [] : selectedCourseMaterialIds,
    );
  }, [
    allEntryMaterialsSelected,
    hub,
    onEntryMaterialSelectionTouchedChange,
    selectedCourseMaterialIds,
  ]);

  const handleToggleEntryMaterial = useCallback(
    (materialId: number) => {
      onEntryMaterialSelectionTouchedChange?.(true);
      hub.setSelectedMaterials((current) => {
        const currentCourseSelection = current.filter((candidateId) =>
          selectedCourseMaterialIdSet.has(candidateId),
        );
        if (currentCourseSelection.includes(materialId)) {
          return currentCourseSelection.filter(
            (candidateId) => candidateId !== materialId,
          );
        }
        return [...currentCourseSelection, materialId];
      });
    },
    [hub, onEntryMaterialSelectionTouchedChange, selectedCourseMaterialIdSet],
  );

  useEffect(() => {
    setCanvasObjectIds([]);
    setWorkspaceDraftObjects([]);
    setLocalDocumentTabs([]);
    setLocalActiveDocumentTabId(null);
    setLocalPromotedPrimePacketObjects([]);
    setLocalPromotedPolishNotes([]);
    setNotesScratchpad("");
  }, [workspaceResetVersion]);

  const handleClearCanvas = useCallback(() => {
    setPanelLayout([]);
    setCanvasObjectIds([]);
    setWorkspaceDraftObjects([]);
    setDocumentTabs([]);
    setActiveDocumentTabId(null);
    setViewerState(null);
    setLocalPromotedPrimePacketObjects([]);
    setLocalPromotedPolishNotes([]);
    setNotesScratchpad("");
  }, [
    setActiveDocumentTabId,
    setDocumentTabs,
    setPanelLayout,
    setViewerState,
  ]);

  const clearCanvasDisabled = useMemo(
    () =>
      panelLayout.length === 0 &&
      canvasObjectIds.length === 0 &&
      workspaceDraftObjects.length === 0 &&
      documentTabs.length === 0 &&
      !activeDocumentTabId &&
      !viewerState &&
      notesScratchpad.trim().length === 0,
    [
      activeDocumentTabId,
      canvasObjectIds.length,
      documentTabs.length,
      notesScratchpad,
      panelLayout.length,
      viewerState,
      workspaceDraftObjects.length,
    ],
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
  const workspaceStudioContent = (
    <div className="absolute inset-0 flex min-h-0 min-w-0 flex-col">
      <StudioWorkspaceUnified
        canvasObjects={canvasObjects}
        courseId={hub.courseId ?? null}
        courseName={sourceShelfCourseName || null}
        currentRunObjects={currentRunWorkspaceObjects}
        promotedPrimeObjectIds={promotedPrimeObjectIds}
        selectedMaterialCount={hub.selectedMaterials.length}
        vaultFolder={sourceShelfVaultFolder}
        onPromoteExcerptToPrime={handlePromoteExcerptToPrime}
        onPromoteTextNoteToPrime={handlePromoteTextNoteToPrime}
      />
    </div>
  );

  const primingStudioContent = (
    <div className="flex h-full min-h-0 flex-col">
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
          primingMethods={resolvedPrimingMethodIds}
          setPrimingMethods={handleSetPrimingMethods}
          primingMethodRuns={workflow.primingMethodRuns}
          chainId={primingChainId}
          setChainId={handleSetPrimingChainId}
          customBlockIds={primingCustomBlockIds}
          setCustomBlockIds={handleSetPrimingCustomBlockIds}
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
          onBackToStudio={() => undefined}
          onSaveDraft={() => {
            void workflow.saveWorkflowPriming("draft");
          }}
          onMarkReady={() => {
            void workflow.saveWorkflowPriming("ready");
          }}
          onStartTutor={() => {
            applyCanvasPreset("study");
            void workflow.startTutorFromWorkflow({
              ...(primePacketContext ? { packet_context: primePacketContext } : {}),
              ...(activeMemoryCapsuleContext
                ? { memory_capsule_context: activeMemoryCapsuleContext }
                : {}),
            });
          }}
          onRunAssistForSelected={(methodIdOverride) => {
            void workflow.runWorkflowPrimingAssist(hub.selectedMaterials, {
              ...(primePacketContext ? { packet_context: primePacketContext } : {}),
              ...(activeMemoryCapsuleContext
                ? { memory_capsule_context: activeMemoryCapsuleContext }
                : {}),
              ...(methodIdOverride
                ? { priming_method_ids: [methodIdOverride] }
                : {}),
            });
          }}
          onRunAssistForMaterial={(materialId, methodIdOverride) => {
            void workflow.runWorkflowPrimingAssist([materialId], {
              ...(primePacketContext ? { packet_context: primePacketContext } : {}),
              ...(activeMemoryCapsuleContext
                ? { memory_capsule_context: activeMemoryCapsuleContext }
                : {}),
              ...(methodIdOverride
                ? { priming_method_ids: [methodIdOverride] }
                : {}),
            });
          }}
          onPromoteResultToPrimePacket={handlePromoteTextNoteToPrime}
          onSendResultToWorkspace={handleSendPrimingResultToWorkspace}
          onApplyRefinedResults={workflow.applyPrimingDisplayedRun}
          isSaving={workflow.savingPrimingBundle}
          isStartingTutor={session.isStarting}
          isRunningAssist={workflow.runningPrimingAssist}
          assistTargetMaterialId={workflow.primingAssistTargetMaterialId}
        />
      </div>
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
        headerContent={
          <div
            data-testid="tutor-selector-bar"
            className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"
          >
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#ffb9c7]">
                Tutor Runtime
              </div>
              <p className="mt-1 font-mono text-xs leading-6 text-[#ffd9e1]/70">
                Tutor chain and template choices stay local to this panel and do not change Priming scope.
              </p>
            </div>
            <label className="flex min-w-[240px] flex-col gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[#ffb9c7]">
              Tutor Chain Template
              <select
                aria-label="Tutor chain template"
                value={tutorChainSelectValue}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value === "auto") {
                    setTutorChainId?.(undefined);
                    setTutorCustomBlockIds?.([]);
                    return;
                  }
                  if (value === "custom") {
                    setTutorChainId?.(undefined);
                    return;
                  }
                  const templateId = Number.parseInt(value.replace("template:", ""), 10);
                  if (Number.isFinite(templateId)) {
                    setTutorChainId?.(templateId);
                    setTutorCustomBlockIds?.([]);
                  }
                }}
                disabled={templateChainsLoading}
                className="h-10 rounded-[0.85rem] border border-[rgba(255,118,144,0.16)] bg-black/35 px-3 font-mono text-sm text-white outline-none"
              >
                <option value="auto">Auto tutor flow</option>
                {templateChains.map((chain) => (
                  <option key={chain.id} value={`template:${chain.id}`}>
                    {readTemplateChainLabel(chain)}
                  </option>
                ))}
                {tutorCustomBlockIds.length > 0 ? (
                  <option value="custom">
                    Custom stack ({tutorCustomBlockIds.length} blocks)
                  </option>
                ) : null}
              </select>
            </label>
          </div>
        }
        onStartSession={() => {
          applyCanvasPreset("study");
          void session.startSession(
            {
              ...(primePacketContext ? { packet_context: primePacketContext } : {}),
              ...(activeMemoryCapsuleContext
                ? { memory_capsule_context: activeMemoryCapsuleContext }
                : {}),
              ...(activeTutorSessionRules.length > 0
                ? { session_rules: activeTutorSessionRules }
                : {}),
            },
          );
        }}
        activeMemoryCapsuleContext={activeMemoryCapsuleContext}
        sessionRules={activeTutorSessionRules}
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
        onBackToTutor={() => {
          applyCanvasPreset("study");
        }}
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
  const notesPanel = (
    <div className="flex h-full flex-col gap-3 p-3">
      <div className="font-mono text-xs uppercase tracking-[0.18em] text-[#ffd6de]">
        Scratch Notes
      </div>
      <textarea
        value={notesScratchpad}
        onChange={(event) => setNotesScratchpad(event.target.value)}
        placeholder="Capture quick notes, questions, and prompts here."
        className="min-h-0 flex-1 resize-none rounded-[0.8rem] border border-[rgba(255,118,144,0.18)] bg-black/30 p-3 font-mono text-sm leading-6 text-white outline-none placeholder:text-[#ffc8d3]/38"
      />
    </div>
  );
  const runConfigContent = (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-1">
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
      {liveTutorSessionId && session.scholarStrategy ? (
        <TutorScholarStrategyPanel session={session} />
      ) : null}
    </div>
  );
  const entryCard = (
    <div
      data-testid="tutor-entry-card"
      className={`space-y-5 rounded-[1rem] transition-shadow duration-300 ${
        entryCardFlashActive ? "ring-2 ring-primary/50" : ""
      }`}
    >
      <div className="space-y-2">
        <div className="font-mono text-xs uppercase tracking-[0.18em] text-[#ffb9c7]">
          Floating Studio
        </div>
        <h2 className="font-arcade text-lg uppercase tracking-[0.16em] text-white">
          Start A Fresh Study Session
        </h2>
        <div className="font-mono text-sm leading-7 text-[#ffd9e1]/78">
          {hub.courseLabel || "No course selected"}
          {hub.effectiveStudyUnit ? ` · ${hub.effectiveStudyUnit}` : ""}
          {hub.effectiveTopic ? ` · ${hub.effectiveTopic}` : ""}
        </div>
        <p className="font-mono text-sm leading-6 text-[#ffc8d3]/72">
          Choose a course, then launch a clean Priming workspace. Start Priming opens a new workflow and loads that course&apos;s source materials into Source Shelf.
        </p>
      </div>
      <label className="flex max-w-md flex-col gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[#ffb9c7]">
        Session Name
        <input
          aria-label="Session Name"
          type="text"
          value={entrySessionName}
          onChange={(event) => onEntrySessionNameChange?.(event.target.value)}
          placeholder="e.g. Week 9 Basal Ganglia Review"
          className="h-11 rounded-[0.9rem] border border-[rgba(255,118,144,0.18)] bg-black/30 px-3 font-mono text-sm text-white outline-none placeholder:text-[#ffc8d3]/38"
        />
      </label>
      <label className="flex max-w-md flex-col gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[#ffb9c7]">
        Course
        <select
          aria-label="Course for new priming session"
          value={typeof hub.courseId === "number" ? String(hub.courseId) : ""}
          onChange={handleEntryCourseChange}
          className="h-11 rounded-[0.9rem] border border-[rgba(255,118,144,0.18)] bg-black/30 px-3 font-mono text-sm text-white outline-none"
        >
          <option value="">Select course</option>
          {availableCourses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.name}
            </option>
          ))}
        </select>
      </label>
      {typeof hub.courseId === "number" ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#ffb9c7]">
              Session Materials
            </div>
            <button
              type="button"
              onClick={handleToggleAllEntryMaterials}
              className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#ffd6de] transition hover:text-white"
            >
              {allEntryMaterialsSelected ? "Deselect All" : "Select All"}
            </button>
          </div>
          <div className="max-h-[200px] overflow-y-auto rounded-[0.9rem] border border-[rgba(255,118,144,0.18)] bg-black/30 p-2">
            {selectedCourseMaterials.length > 0 ? (
              <div className="space-y-2">
                {selectedCourseMaterials.map((material) => {
                  const checked = hub.selectedMaterials.includes(material.id);
                  const entryMaterialLabel = formatEntryMaterialLabel(
                    material.title,
                    material.source_path,
                  );
                  return (
                    <label
                      key={material.id}
                      className="flex cursor-pointer items-center gap-3 rounded-[0.8rem] border border-transparent px-2 py-2 transition hover:border-[rgba(255,118,144,0.18)] hover:bg-black/20"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleToggleEntryMaterial(material.id)}
                        className="h-4 w-4 rounded border-[rgba(255,118,144,0.28)] bg-black/40 text-primary"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-mono text-sm text-white">
                          {entryMaterialLabel}
                        </div>
                      </div>
                      <span className="rounded-full border border-[rgba(255,118,144,0.22)] bg-black/30 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[#ffd6de]">
                        {formatMaterialFileType(material.file_type)}
                      </span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <div className="font-mono text-xs leading-6 text-[#ffc8d3]/68">
                No materials available for this course yet.
              </div>
            )}
          </div>
          <div className="space-y-2">
            <button
              type="button"
              data-testid="studio-entry-upload-button"
              onClick={() => entryUploadInputRef.current?.click()}
              disabled={sourceShelfUploading}
              className="w-full cursor-pointer rounded-lg border border-[rgba(255,118,144,0.25)] border-dashed p-3 text-center font-mono transition hover:bg-primary/5 disabled:cursor-wait disabled:opacity-70"
            >
              <Upload className="mx-auto h-4 w-4 text-[#ffb9c7]" aria-hidden="true" />
              <div className="mt-2 text-[11px] uppercase tracking-[0.18em] text-white">
                {sourceShelfUploading ? "Uploading Materials..." : "Upload New Materials"}
              </div>
              <div className="mt-1 text-[11px] text-[#ffc8d3]/68">
                PDF, DOCX, MP4, PPTX
              </div>
            </button>
            <input
              ref={entryUploadInputRef}
              data-testid="studio-entry-upload-input"
              aria-label="Upload new materials"
              type="file"
              accept={ENTRY_CARD_UPLOAD_ACCEPT}
              multiple
              className="hidden"
              onChange={handleEntryMaterialUploadChange}
            />
            {sourceShelfUploading ? (
              <div
                data-testid="studio-entry-upload-status"
                className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#ffb9c7]"
              >
                Uploading selected files to this course...
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
      <div
        data-testid="studio-entry-material-count"
        className="font-mono text-xs leading-6 text-[#ffc8d3]/68"
      >
        {typeof hub.courseId === "number"
          ? `${selectedEntryMaterialCount} of ${selectedCourseMaterialCount} materials selected`
          : "Pick a course before selecting materials."}
      </div>
      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          onClick={() => {
            if (onStartPriming) {
              void onStartPriming();
              return;
            }
            setShowSetup(false);
            setPanelLayout([]);
            void workflow.openStudioPriming();
          }}
          disabled={typeof hub.courseId !== "number" || isStartingPriming}
          className="rounded-full border border-[rgba(255,118,144,0.22)] bg-[rgba(255,68,104,0.18)] px-4 font-mono text-xs uppercase tracking-[0.18em] text-white hover:bg-[rgba(255,68,104,0.28)]"
        >
          {isStartingPriming ? "Starting..." : "Start Priming"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => applyCanvasPreset("full_studio")}
          className="rounded-full border-[rgba(255,118,144,0.18)] bg-black/20 px-4 font-mono text-xs uppercase tracking-[0.18em] text-[#ffd6de]"
        >
          Open Full Studio
        </Button>
        {resumeCandidate ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              applyCanvasPreset("study");
              void onResumeHubCandidate(resumeCandidate);
            }}
            className="rounded-full border-[rgba(255,118,144,0.18)] bg-black/20 px-4 font-mono text-xs uppercase tracking-[0.18em] text-[#ffd6de]"
          >
            Resume
          </Button>
        ) : null}
      </div>
    </div>
  );

  return (
    <TutorErrorBoundary fallbackLabel="Studio Canvas">
      <div className="flex min-h-0 flex-1 flex-col">
        <StudioShell
          entryCard={showSetup && !liveTutorSessionId ? entryCard : null}
          defaultPreset={liveTutorSessionId ? "study" : "priming"}
          autoSeedDefaultPreset={false}
          externalLayoutFocusRequestKey={startPrimingViewportFocusRequestKey}
          sourceShelf={
            <SourceShelf
              courseId={hub.courseId ?? null}
              courseName={sourceShelfCourseName}
              studyUnit={sourceShelfStudyUnit}
              topic={sourceShelfTopic}
              materials={hub.chatMaterials}
              selectedMaterialIds={hub.selectedMaterials}
              selectedMaterialCount={hub.selectedMaterials.length}
              selectedPaths={hub.selectedPaths}
              vaultFolder={sourceShelfVaultFolder}
              courseOptions={availableCourses}
              workspaceObjectIds={canvasObjectIds}
              onSelectedMaterialIdsChange={hub.setSelectedMaterials}
              onSelectedPathsChange={hub.setSelectedPaths}
              onUploadFiles={handleUploadSourceShelfFiles}
              isUploading={sourceShelfUploading}
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
          workspace={workspaceStudioContent}
          primingPanel={primingStudioContent}
          tutorPanel={tutorStudioContent}
          polishPanel={polishStudioContent}
          runConfig={runConfigContent}
          memory={
            <MemoryPanel
              status={memoryStatus}
              activeCapsuleId={runtimeState?.activeMemoryCapsuleId ?? null}
              onActivateCapsule={setActiveMemoryCapsuleId}
            />
          }
          primePacket={<PrimePacketPanel sections={primePacketSections} />}
          polishPacket={<PolishPacketPanel sections={polishPacketSections} />}
          notesPanel={notesPanel}
          panelLayout={panelLayout}
          setPanelLayout={setPanelLayout}
          onClearCanvas={handleClearCanvas}
          clearCanvasDisabled={clearCanvasDisabled}
        />
      </div>
    </TutorErrorBoundary>
  );
}
