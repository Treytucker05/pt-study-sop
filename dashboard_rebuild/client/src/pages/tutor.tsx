import { CoreWorkspaceFrame } from "@/components/CoreWorkspaceFrame";
import { PageScaffold } from "@/components/PageScaffold";
import { TutorShell } from "@/components/TutorShell";
import { TutorTopBar } from "@/components/TutorTopBar";
import { HudButton } from "@/components/ui/HudButton";
import { buildStudioShellPresetLayout } from "@/components/studio/StudioShell";
import { resolveTutorTeachRuntime } from "@/components/TutorChat.types";
import { useTutorHub } from "@/hooks/useTutorHub";
import { useStudioRun } from "@/hooks/useStudioRun";
import { useTutorSession } from "@/hooks/useTutorSession";
import {
  useTutorWorkflow,
  type TutorWorkflowSessionBridge,
} from "@/hooks/useTutorWorkflow";
import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import type {
  TutorBoardScope,
  TutorHubResumeCandidate,
  TutorProjectShellResponse,
} from "@/lib/api";
import {
  writeTutorAccuracyProfile,
  clearTutorActiveSessionId,
  consumeTutorLaunchHandoff,
  peekTutorLaunchHandoff,
  readTutorActiveSessionId,
  readTutorSelectedMaterialIds,
  readTutorStoredStartState,
  writeTutorObjectiveScope,
  writeTutorSelectedMaterialIds,
  writeTutorStoredStartState,
  writeTutorVaultFolder,
} from "@/lib/tutorClientState";
import { readTutorShellQuery, writeTutorShellQuery } from "@/lib/tutorUtils";
import {
  normalizeStudioWorkspaceObjects,
} from "@/lib/studioWorkspaceObjects";
import { normalizeStudioPolishPromotedNotes } from "@/lib/studioPacketSections";
import {
  normalizeStudioDocumentTabs,
} from "@/lib/studioPanelLayout";
import {
  normalizeStudioRunRuntimeState,
  serializeStudioRunRuntimeState,
} from "@/lib/studioRunRuntimeState";
import { toast } from "sonner";

function useTutorPageController() {
  const queryClient = useQueryClient();
  const initialRouteQuery = useMemo(() => readTutorShellQuery(), []);
  const lastPersistedShellKeyRef = useRef("");
  const resumedFromProjectShellRef = useRef(false);
  const suppressProjectShellRestoreRef = useRef(false);
  const [workspaceResetVersion, setWorkspaceResetVersion] = useState(0);
  const [sessionActionPending, setSessionActionPending] = useState(false);
  const [startPrimingPending, setStartPrimingPending] = useState(false);

  // ─── Shell state ───
  const pendingLaunchHandoff = useMemo(() => peekTutorLaunchHandoff(), []);
  const storedActiveSessionId = useMemo(() => readTutorActiveSessionId(), []);
  const studioRun = useStudioRun({
    initialRouteQuery,
    storedActiveSessionId,
    pendingLaunchHandoff,
    persistStartState: false,
    persistShellQuery: false,
    topic: "",
    selectedMaterialIds: [],
    customBlockIds: [],
    accuracyProfile: "strict",
    objectiveScope: "module_all",
    selectedObjectiveId: "",
    selectedObjectiveGroup: "",
    selectedPaths: [],
    vaultFolder: "",
  });
  const {
    activeSessionId,
    setActiveSessionId,
    hasRestored,
    setHasRestored,
    restoredTurns,
    setRestoredTurns,
    activeBoardScope,
    setActiveBoardScope,
    activeBoardId,
    setActiveBoardId,
    viewerState,
    setViewerState,
    panelLayout,
    setPanelLayout,
    documentTabs,
    setDocumentTabs,
    activeDocumentTabId,
    setActiveDocumentTabId,
    runtimeState,
    setRuntimeState,
    setActiveMemoryCapsuleId,
    setCompactionTelemetry,
    setDirectNoteSaveStatus,
    setPrimingMethodIds,
    setPrimingChainId,
    setPrimingCustomBlockIds,
    tutorChainId,
    setTutorChainId,
    tutorCustomBlockIds,
    setTutorCustomBlockIds,
    showSetup,
    setShowSetup,
    brainLaunchContext,
    setBrainLaunchContext,
    shellRevision,
    setShellRevision,
    shellHydratedCourseId,
    setShellHydratedCourseId,
    promotedPrimePacketObjects,
    setPromotedPrimePacketObjects,
    promotedPolishPacketNotes,
    setPromotedPolishPacketNotes,
  } = studioRun;

  // ─── Compose hooks ───
  const hub = useTutorHub({
    initialRouteQuery,
    hasRestored,
    activeSessionId,
    persistClientState: false,
  });

  useEffect(() => {
    writeTutorSelectedMaterialIds(hub.selectedMaterials);
    writeTutorAccuracyProfile(hub.accuracyProfile);
    writeTutorObjectiveScope(hub.objectiveScope);
    writeTutorVaultFolder(hub.vaultFolder);
    writeTutorStoredStartState({
      courseId: hub.courseId,
      topic: hub.topic,
      selectedMaterials: hub.selectedMaterials,
      chainId: hub.chainId,
      customBlockIds: hub.customBlockIds,
      accuracyProfile: hub.accuracyProfile,
      objectiveScope: hub.objectiveScope,
      selectedObjectiveId: hub.selectedObjectiveId,
      selectedObjectiveGroup: hub.selectedObjectiveGroup,
      selectedPaths: hub.selectedPaths,
    });
  }, [
    hub.accuracyProfile,
    hub.chainId,
    hub.courseId,
    hub.customBlockIds,
    hub.objectiveScope,
    hub.selectedMaterials,
    hub.selectedObjectiveGroup,
    hub.selectedObjectiveId,
    hub.selectedPaths,
    hub.topic,
    hub.vaultFolder,
  ]);

  const sessionBridgeRef = useRef<TutorWorkflowSessionBridge>({
    startSession: async () => null,
    resumeSession: async () => null,
    clearActiveSessionState: () => undefined,
    checkpointWorkflowStudyTimer: async () => 0,
    latestCommittedAssistantMessage: null,
    artifacts: [],
  });

  const workflow = useTutorWorkflow({
    hub,
    session: sessionBridgeRef.current,
    activeSessionId,
    hasRestored,
  });

  const session = useTutorSession({
    initialRouteQuery,
    hub,
    tutorChainId,
    tutorCustomBlockIds,
    setTutorChainId,
    setTutorCustomBlockIds,
    activeSessionId,
    setActiveSessionId,
    setShowSetup,
    setRestoredTurns,
    hasRestored,
    activeWorkflowId: workflow.activeWorkflowId,
    activeWorkflowDetail: workflow.activeWorkflowDetail ?? null,
  });

  useEffect(() => {
    sessionBridgeRef.current = session;
  }, [session]);

  const liveTutorSessionId = session.hasActiveTutorSession
    ? activeSessionId
    : null;

  // ─── Navigation helpers ───
  const resumeFromHubCandidate = useCallback(
    async (candidate: TutorHubResumeCandidate) => {
      if (candidate.can_resume && candidate.session_id) {
        await session.resumeSession(candidate.session_id);
        setShowSetup(false);
        return;
      }

      if (typeof candidate.course_id !== "number") return;

      hub.setCourseId(candidate.course_id);

      if (!candidate.session_id) {
        clearTutorActiveSessionId();
        setActiveSessionId(null);
      }

      setShowSetup(false);
    },
    [hub, session],
  );

  // ─── Stored start state ───
  const applyStoredStartState = useCallback(
    (
      savedStartState: ReturnType<typeof readTutorStoredStartState>,
      canonicalMaterialSelection: number[],
    ) => {
      if (!savedStartState) return false;
      let restoredCourseId = false;
      if (typeof savedStartState.courseId === "number") {
        hub.setCourseId(savedStartState.courseId);
        restoredCourseId = true;
      }
      hub.setTopic(savedStartState.topic);
      if (canonicalMaterialSelection.length === 0) {
        hub.setSelectedMaterials(savedStartState.selectedMaterials);
      }
      hub.setChainId(savedStartState.chainId);
      hub.setCustomBlockIds(savedStartState.customBlockIds);
      setTutorChainId(savedStartState.chainId);
      setTutorCustomBlockIds(savedStartState.customBlockIds);
      hub.setAccuracyProfile(savedStartState.accuracyProfile);
      hub.setObjectiveScope(savedStartState.objectiveScope);
      hub.setSelectedObjectiveId(savedStartState.selectedObjectiveId);
      hub.setSelectedObjectiveGroup(savedStartState.selectedObjectiveGroup);
      hub.setSelectedPaths(savedStartState.selectedPaths);
      return restoredCourseId;
    },
    [hub],
  );

  // ─── Project shell hydration ───
  const hydrateProjectShellState = useCallback(
    (nextProjectShell: TutorProjectShellResponse, nextCourseId: number) => {
      setShellHydratedCourseId(nextCourseId);
      setShellRevision(nextProjectShell.workspace_state.revision || 0);
      if (
        !initialRouteQuery.boardScope &&
        activeBoardScope === "project" &&
        nextProjectShell.workspace_state.active_board_scope
      ) {
        setActiveBoardScope(
          nextProjectShell.workspace_state.active_board_scope,
        );
      }
      if (
        initialRouteQuery.boardId === undefined &&
        typeof nextProjectShell.workspace_state.active_board_id === "number"
      ) {
        setActiveBoardId(nextProjectShell.workspace_state.active_board_id);
      }
      setViewerState(nextProjectShell.workspace_state.viewer_state || null);
      setDocumentTabs(
        normalizeStudioDocumentTabs(
          nextProjectShell.workspace_state.document_tabs,
        ),
      );
      setActiveDocumentTabId(
        typeof nextProjectShell.workspace_state.active_document_tab_id === "string"
          ? nextProjectShell.workspace_state.active_document_tab_id
          : null,
      );
      setRuntimeState(
        normalizeStudioRunRuntimeState(
          nextProjectShell.workspace_state.runtime_state,
        ),
      );
      setTutorChainId(
        typeof nextProjectShell.workspace_state.tutor_chain_id === "number"
          ? nextProjectShell.workspace_state.tutor_chain_id
          : undefined,
      );
      setTutorCustomBlockIds(
        Array.isArray(nextProjectShell.workspace_state.tutor_custom_block_ids)
          ? nextProjectShell.workspace_state.tutor_custom_block_ids.filter(
              (value): value is number => typeof value === "number",
            )
          : [],
      );
      setPromotedPrimePacketObjects(
        normalizeStudioWorkspaceObjects(
          nextProjectShell.workspace_state.prime_packet_promoted_objects,
        ),
      );
      setPromotedPolishPacketNotes(
        normalizeStudioPolishPromotedNotes(
          nextProjectShell.workspace_state.polish_packet_promoted_notes,
        ),
      );
      if (
        hub.selectedMaterials.length === 0 &&
        Array.isArray(nextProjectShell.workspace_state.selected_material_ids) &&
        nextProjectShell.workspace_state.selected_material_ids.length > 0
      ) {
        hub.setSelectedMaterials(
          writeTutorSelectedMaterialIds(
            nextProjectShell.workspace_state.selected_material_ids,
          ),
        );
      }
    },
    [
      activeBoardScope,
      initialRouteQuery,
      setPromotedPolishPacketNotes,
      setActiveDocumentTabId,
      setDocumentTabs,
      setRuntimeState,
      setTutorChainId,
      setTutorCustomBlockIds,
    ],
  );

  const resetTutorWorkspaceHome = useCallback(
    (nextCourseId?: number) => {
      suppressProjectShellRestoreRef.current = true;
      resumedFromProjectShellRef.current = true;
      session.clearActiveSessionState();
      workflow.setActiveWorkflowId(null);
      hub.clearMaterialSelection();
      hub.setSelectedPaths([]);
      hub.setTopic("");
      hub.setSelectedObjectiveGroup("");
      hub.setSelectedObjectiveId("");
      hub.setObjectiveScope("module_all");
      setTutorChainId(undefined);
      setTutorCustomBlockIds([]);
      setActiveBoardScope("project");
      setActiveBoardId(null);
      setViewerState(null);
      setPanelLayout([]);
      setDocumentTabs([]);
      setActiveDocumentTabId(null);
      setRuntimeState(normalizeStudioRunRuntimeState(null));
      setPromotedPrimePacketObjects([]);
      setPromotedPolishPacketNotes([]);
      setBrainLaunchContext(null);
      setShellRevision(0);
      setShellHydratedCourseId(
        typeof nextCourseId === "number"
          ? nextCourseId
          : typeof hub.courseId === "number"
            ? hub.courseId
            : null,
      );
      setShowSetup(true);
      setWorkspaceResetVersion((current) => current + 1);
    },
    [
      hub,
      session,
      setActiveBoardId,
      setActiveBoardScope,
      setActiveDocumentTabId,
      setBrainLaunchContext,
      setDocumentTabs,
      setPanelLayout,
      setPromotedPrimePacketObjects,
      setPromotedPolishPacketNotes,
      setRuntimeState,
      setShowSetup,
      setShellHydratedCourseId,
      setShellRevision,
      setTutorChainId,
      setTutorCustomBlockIds,
      setViewerState,
      workflow,
    ],
  );

  const handleTutorSessionAction = useCallback(async () => {
    if (sessionActionPending) return;
    setSessionActionPending(true);
    suppressProjectShellRestoreRef.current = true;
    resumedFromProjectShellRef.current = true;
    try {
      if (liveTutorSessionId) {
        await session.endSessionById(liveTutorSessionId);
        toast.success("Session ended");
      }
      resetTutorWorkspaceHome();
    } catch (error) {
      toast.error(
        `Failed to end session: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    } finally {
      setSessionActionPending(false);
    }
  }, [
    liveTutorSessionId,
    resetTutorWorkspaceHome,
    session,
    sessionActionPending,
  ]);

  const handleStartPrimingFromEntry = useCallback(async () => {
    if (typeof hub.courseId !== "number") {
      toast.error("Choose a course before starting Priming.");
      return;
    }

    const nextCourseId = hub.courseId;
    setStartPrimingPending(true);
    suppressProjectShellRestoreRef.current = true;
    resumedFromProjectShellRef.current = true;
    try {
      const courseMaterialIds = hub.loadCourseMaterials(nextCourseId);
      workflow.setActiveWorkflowId(null);
      hub.setSelectedPaths([]);
      hub.setTopic("");
      hub.setSelectedObjectiveGroup("");
      hub.setSelectedObjectiveId("");
      hub.setObjectiveScope("module_all");
      setTutorChainId(undefined);
      setTutorCustomBlockIds([]);
      setActiveBoardScope("project");
      setActiveBoardId(null);
      setViewerState(null);
      setDocumentTabs([]);
      setActiveDocumentTabId(null);
      setRuntimeState(normalizeStudioRunRuntimeState(null));
      setPromotedPrimePacketObjects([]);
      setPromotedPolishPacketNotes([]);
      setBrainLaunchContext(null);
      setShellRevision(0);
      setShellHydratedCourseId(nextCourseId);
      setShowSetup(false);
      setPanelLayout([]);
      setWorkspaceResetVersion((current) => current + 1);
      await workflow.createWorkflowAndOpenPriming({
        courseId: nextCourseId,
        topic: "",
        selectedMaterials: courseMaterialIds,
        selectedPaths: [],
        selectedObjectiveGroup: "",
        selectedObjectiveId: "",
        objectiveScope: "module_all",
      });
    } finally {
      setStartPrimingPending(false);
    }
  }, [
    hub,
    setActiveBoardId,
    setActiveBoardScope,
    setActiveDocumentTabId,
    setBrainLaunchContext,
    setDocumentTabs,
    setPanelLayout,
    setPromotedPrimePacketObjects,
    setPromotedPolishPacketNotes,
    setRuntimeState,
    setShowSetup,
    setShellHydratedCourseId,
    setShellRevision,
    setTutorChainId,
    setTutorCustomBlockIds,
    setViewerState,
    workflow,
  ]);

  // ─── Restore shell state on mount ───
  const restoreTutorShellState = useCallback(async () => {
    let restoredCourseId = false;
    const { fromLibraryHandoff, brainLaunchContext: nextBrainLaunchContext } =
      consumeTutorLaunchHandoff();
    const fromBrainHandoff = Boolean(nextBrainLaunchContext);
    if (nextBrainLaunchContext) {
      setBrainLaunchContext(nextBrainLaunchContext);
    }

    const resumeCandidateSessionId =
      initialRouteQuery.sessionId ||
      (fromBrainHandoff || fromLibraryHandoff
        ? null
        : readTutorActiveSessionId());
    try {
      if (resumeCandidateSessionId) {
        const s = await api.tutor.getSession(resumeCandidateSessionId);
        if (s.status === "active") {
          session.applySessionState(s);
          setShowSetup(false);
          return;
        }
        clearTutorActiveSessionId();
      }
    } catch {
      if (!initialRouteQuery.sessionId) {
        clearTutorActiveSessionId();
      }
    }

    setShowSetup(true);
    const canonicalMaterialSelection = readTutorSelectedMaterialIds();
    if (canonicalMaterialSelection.length > 0) {
      hub.setSelectedMaterials(canonicalMaterialSelection);
    }
    if (!fromLibraryHandoff && !fromBrainHandoff) {
      restoredCourseId = applyStoredStartState(
        readTutorStoredStartState(),
        canonicalMaterialSelection,
      );
    }
    if (fromLibraryHandoff || fromBrainHandoff || !restoredCourseId) {
      try {
        const { currentCourse } = await api.studyWheel.getCurrentCourse();
        if (typeof currentCourse?.id === "number") {
          hub.setCourseId((prev) =>
            typeof prev === "number" ? prev : currentCourse.id,
          );
        }
      } catch {
        /* ignore */
      }
    }
  }, [applyStoredStartState, hub, initialRouteQuery, session]);

  // ─── Effects ───
  useEffect(() => {
    if (hasRestored) return;
    setHasRestored(true);
    void restoreTutorShellState();
  }, [hasRestored, restoreTutorShellState]);

  useEffect(() => {
    if (
      !session.projectShell ||
      typeof hub.courseId !== "number" ||
      suppressProjectShellRestoreRef.current
    )
      return;
    if (shellHydratedCourseId !== hub.courseId) {
      hydrateProjectShellState(session.projectShell, hub.courseId);
    }
    if (
      !resumedFromProjectShellRef.current &&
      !suppressProjectShellRestoreRef.current &&
      !activeSessionId &&
      !brainLaunchContext &&
      !workflow.activeWorkflowId &&
      session.projectShell.active_session?.session_id
    ) {
      resumedFromProjectShellRef.current = true;
      void api.tutor
        .getSession(session.projectShell.active_session.session_id)
        .then((s) => {
          if (s.status !== "active") {
            session.clearActiveSessionState();
            return;
          }
          session.applySessionState(s);
          setShowSetup(false);
        })
        .catch(() => {
          resumedFromProjectShellRef.current = false;
        });
    }
  }, [
    activeSessionId,
    brainLaunchContext,
    hub.courseId,
    hydrateProjectShellState,
    session,
    workflow.activeWorkflowId,
    shellHydratedCourseId,
  ]);

  useEffect(() => {
    if (!hasRestored) return;
    // Target both window and <main> — main is the actual scroll container in the layout grid
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document
      .querySelector("main")
      ?.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [activeSessionId, hasRestored]);

  useEffect(() => {
    writeTutorShellQuery({
      courseId: hub.courseId,
      sessionId: activeSessionId || undefined,
      boardScope: activeBoardScope,
      boardId: activeBoardId ?? undefined,
    });
  }, [
    activeBoardId,
    activeBoardScope,
    activeSessionId,
    hub.courseId,
  ]);

  // Shell persistence
  useEffect(() => {
    if (
      !hasRestored ||
      typeof hub.courseId !== "number" ||
      shellHydratedCourseId !== hub.courseId
    ) {
      return;
    }
    const persistKey = JSON.stringify({
      courseId: hub.courseId,
      activeSessionId,
      activeBoardScope,
      activeBoardId,
      viewerState,
      panelLayout,
      documentTabs,
      activeDocumentTabId,
      runtimeState,
      tutorChainId,
      tutorCustomBlockIds,
      promotedPrimePacketObjects,
      promotedPolishPacketNotes,
      selectedMaterialIds: hub.selectedMaterials,
    });
    if (persistKey === lastPersistedShellKeyRef.current) return;

    const timeoutId = window.setTimeout(async () => {
      lastPersistedShellKeyRef.current = persistKey;
      try {
        const result = await api.tutor.saveProjectShellState({
          course_id: hub.courseId!,
          active_tutor_session_id: activeSessionId,
          active_board_scope: activeBoardScope,
          active_board_id: activeBoardId,
          viewer_state: viewerState,
          panel_layout: panelLayout,
          document_tabs: documentTabs,
          active_document_tab_id: activeDocumentTabId,
          runtime_state: serializeStudioRunRuntimeState(runtimeState),
          tutor_chain_id: tutorChainId ?? null,
          tutor_custom_block_ids: tutorCustomBlockIds,
          prime_packet_promoted_objects: promotedPrimePacketObjects,
          polish_packet_promoted_notes: promotedPolishPacketNotes,
          selected_material_ids: hub.selectedMaterials,
          revision: shellRevision,
        });
        setShellRevision(result.workspace_state.revision);
        await queryClient.invalidateQueries({
          queryKey: ["tutor-project-shell", hub.courseId],
        });
      } catch {
        await queryClient.invalidateQueries({
          queryKey: ["tutor-project-shell", hub.courseId],
        });
      }
    }, 250);
    return () => window.clearTimeout(timeoutId);
  }, [
    activeBoardId,
    activeBoardScope,
    activeSessionId,
    hub.courseId,
    hub.selectedMaterials,
    hasRestored,
    queryClient,
    shellHydratedCourseId,
    shellRevision,
    viewerState,
    panelLayout,
    documentTabs,
    activeDocumentTabId,
    runtimeState,
    tutorChainId,
    tutorCustomBlockIds,
    promotedPrimePacketObjects,
    promotedPolishPacketNotes,
  ]);

  // ─── Derived ───
  const hasValidatedTutorSession =
    session.isTutorSessionView &&
    Boolean(liveTutorSessionId) &&
    Boolean(session.startedAt);
  const resumeCandidate = hub.tutorHub?.resume_candidate ?? null;
  const tutorHeroStats = useMemo(
    () => [
      { label: "Surface", value: "TUTOR", tone: "info" as const },
      {
        label: "Session",
        value: hasValidatedTutorSession ? "LIVE" : "READY",
        tone: hasValidatedTutorSession ? "success" as const : "info" as const,
      },
      {
        label: "Course",
        value: hub.courseLabel || "UNSCOPED",
        tone: hub.courseLabel ? undefined : ("warn" as const),
      },
      {
        label: "Materials",
        value: String(hub.selectedMaterials.length),
        tone:
          hub.selectedMaterials.length > 0
            ? ("info" as const)
            : undefined,
      },
    ],
    [hasValidatedTutorSession, hub.courseLabel, hub.selectedMaterials.length],
  );
  const tutorTopBar = useMemo(() => {
    const teachRuntime =
      session.currentBlock || workflow.activeWorkflowDetail
        ? resolveTutorTeachRuntime({
            workflowDetail: workflow.activeWorkflowDetail ?? undefined,
            workflowStage:
              workflow.activeWorkflowDetail?.workflow?.current_stage ?? null,
            currentBlock: session.currentBlock,
          })
        : null;

    return (
      <TutorTopBar
        isTutorSessionView={hasValidatedTutorSession}
        brainLaunchContext={brainLaunchContext}
        topic={hub.effectiveTopic || hub.topic || ""}
        turnCount={session.turnCount ?? 0}
        startedAt={session.startedAt}
        hasChain={session.hasChain}
        currentBlock={session.currentBlock}
        isChainComplete={session.isChainComplete}
        blockTimerSeconds={session.blockTimerSeconds}
        timerPaused={session.timerPaused}
        progressCount={session.progressCount}
        chainBlocksLength={session.chainBlocks.length}
        formatTimer={session.formatTimer}
        onSetTimerPaused={session.setTimerPaused}
        onAdvanceBlock={() => {
          void session.advanceBlock();
        }}
        activeWorkflowId={workflow.activeWorkflowId}
        activeWorkflowDetail={workflow.activeWorkflowDetail ?? undefined}
        activeSessionId={liveTutorSessionId}
        teachRuntime={teachRuntime}
        sessionActionLabel={liveTutorSessionId ? "End Session" : "New Session"}
        sessionActionPending={sessionActionPending}
        onSessionAction={() => {
          void handleTutorSessionAction();
        }}
      />
    );
  }, [
    brainLaunchContext,
    handleTutorSessionAction,
    hasValidatedTutorSession,
    hub.effectiveTopic,
    hub.topic,
    liveTutorSessionId,
    sessionActionPending,
    session.blockTimerSeconds,
    session.chainBlocks.length,
    session.currentBlock,
    session.formatTimer,
    session.hasChain,
    session.isChainComplete,
    session.progressCount,
    session.setTimerPaused,
    session.startedAt,
    session.timerPaused,
    session.turnCount,
    workflow.activeWorkflowDetail,
    workflow.activeWorkflowId,
    session.advanceBlock,
  ]);
  const tutorHeroActionClassName =
    "tutor-hero-action inline-flex min-h-[56px] min-w-[12rem] w-auto shrink-0 items-center justify-center gap-2.5 rounded-none px-6 py-3.5 font-arcade text-[0.92rem] leading-none tracking-[0.16em]";

  // ─── Render ───
  return (
    <PageScaffold
      eyebrow="Live Study Core"
      title="Tutor"
      subtitle="Run your study plan from Workspace Home through Priming, then move into Tutor and Final Sync without losing context."
      className="h-full min-h-0"
      contentClassName="gap-6"
      heroClassName="min-h-[243px]"
      stats={tutorHeroStats}
      actions={
        <>
          <HudButton
            variant="primary"
            className={`${tutorHeroActionClassName} tutor-hero-action--primary`}
            disabled={sessionActionPending}
            onClick={() => {
              void handleTutorSessionAction();
            }}
          >
            <span className="tutor-hero-action__label">NEW SESSION</span>
          </HudButton>
          {resumeCandidate ? (
            <HudButton
              variant="outline"
              className={`${tutorHeroActionClassName} tutor-hero-action--outline`}
              onClick={() => {
                void (async () => {
                  await resumeFromHubCandidate(resumeCandidate);
                  setPanelLayout(buildStudioShellPresetLayout("study"));
                })();
              }}
            >
              <span className="tutor-hero-action__label">RESUME</span>
            </HudButton>
          ) : null}
          <HudButton
            variant="outline"
            className={`${tutorHeroActionClassName} tutor-hero-action--outline`}
            onClick={() => {
              void Promise.all([
                queryClient.invalidateQueries({ queryKey: ["tutor-hub"] }),
                queryClient.invalidateQueries({ queryKey: ["tutor-sessions"] }),
                queryClient.invalidateQueries({
                  queryKey: ["tutor-project-shell"],
                }),
                queryClient.invalidateQueries({
                  queryKey: ["tutor-studio-restore"],
                }),
                queryClient.invalidateQueries({
                  queryKey: ["tutor-chat-materials-all-enabled"],
                }),
                queryClient.invalidateQueries({ queryKey: ["obsidian"] }),
              ]);
            }}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="tutor-hero-action__label">REFRESH</span>
          </HudButton>
        </>
      }
    >
      <CoreWorkspaceFrame
        className="tutor-shell-frame"
        mainClassName="tutor-shell-frame__main"
        contentClassName="relative min-h-0"
        topBar={tutorTopBar}
      >
        <TutorShell
        activeSessionId={liveTutorSessionId}
        hub={hub}
        session={session}
        workflow={workflow}
        showSetup={showSetup}
        restoredTurns={restoredTurns}
          activeBoardScope={activeBoardScope}
          activeBoardId={activeBoardId}
          viewerState={viewerState}
          documentTabs={documentTabs}
          activeDocumentTabId={activeDocumentTabId}
          panelLayout={panelLayout}
          runtimeState={runtimeState}
          primingMethodIds={runtimeState.primingMethodIds}
          primingChainId={runtimeState.primingChainId ?? undefined}
          primingCustomBlockIds={runtimeState.primingCustomBlockIds}
          tutorChainId={tutorChainId}
          tutorCustomBlockIds={tutorCustomBlockIds}
          setActiveBoardScope={setActiveBoardScope}
          setActiveBoardId={setActiveBoardId}
          setViewerState={setViewerState}
          setDocumentTabs={setDocumentTabs}
          setActiveDocumentTabId={setActiveDocumentTabId}
          setPanelLayout={setPanelLayout}
          setActiveMemoryCapsuleId={setActiveMemoryCapsuleId}
          setCompactionTelemetry={setCompactionTelemetry}
          setDirectNoteSaveStatus={setDirectNoteSaveStatus}
          setPrimingMethodIds={setPrimingMethodIds}
          setPrimingChainId={setPrimingChainId}
          setPrimingCustomBlockIds={setPrimingCustomBlockIds}
          setTutorChainId={setTutorChainId}
          setTutorCustomBlockIds={setTutorCustomBlockIds}
          setShowSetup={setShowSetup}
          queryClient={queryClient}
          promotedPrimePacketObjects={promotedPrimePacketObjects}
          promotedPolishPacketNotes={promotedPolishPacketNotes}
          onPromotePrimePacketObject={(workspaceObject) => {
            setPromotedPrimePacketObjects((prev) =>
              prev.some((existingObject) => existingObject.id === workspaceObject.id)
                ? prev
                : [...prev, workspaceObject],
            );
          }}
          onPromotePolishPacketNote={(note) => {
            setPromotedPolishPacketNotes((prev) =>
              prev.some((existingNote) => existingNote.id === note.id)
                ? prev
                : [...prev, note],
            );
          }}
          onStartPriming={handleStartPrimingFromEntry}
          isStartingPriming={startPrimingPending}
          workspaceResetVersion={workspaceResetVersion}
          onResumeHubCandidate={resumeFromHubCandidate}
        />
      </CoreWorkspaceFrame>
    </PageScaffold>
  );
}

export default function Tutor() {
  return useTutorPageController();
}
