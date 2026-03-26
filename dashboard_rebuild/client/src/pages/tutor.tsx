import { CoreWorkspaceFrame } from "@/components/CoreWorkspaceFrame";
import { PageScaffold } from "@/components/PageScaffold";
import { TutorShell } from "@/components/TutorShell";
import { TutorTopBar } from "@/components/TutorTopBar";
import { TutorTabBar } from "@/components/TutorTabBar";
import type { StudioSubTab } from "@/components/TutorTabBar";
import { useTutorHub } from "@/hooks/useTutorHub";
import { useStudioRun } from "@/hooks/useStudioRun";
import { useTutorSession } from "@/hooks/useTutorSession";
import {
  useTutorWorkflow,
  type TutorWorkflowSessionBridge,
} from "@/hooks/useTutorWorkflow";
import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
import { HudButton } from "@/components/ui/HudButton";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Palette, RefreshCw } from "lucide-react";
import { readTutorShellQuery, writeTutorShellQuery } from "@/lib/tutorUtils";
import type { TutorPageMode, TutorShellQuery, TutorStudioView } from "@/lib/tutorUtils";
import { resolveTutorTeachRuntime } from "@/components/TutorChat.types";
import {
  normalizeStudioWorkspaceObjects,
} from "@/lib/studioWorkspaceObjects";
import { normalizeStudioPolishPromotedNotes } from "@/lib/studioPacketSections";

function useTutorPageController() {
  const queryClient = useQueryClient();
  const initialRouteQuery = useMemo(() => readTutorShellQuery(), []);
  const explicitShellModeRef = useRef<{
    courseId: number;
    mode: TutorPageMode;
  } | null>(null);
  const lastPersistedShellKeyRef = useRef("");
  const resumedFromProjectShellRef = useRef(false);

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
    shellMode,
    setShellMode,
    activeBoardScope,
    setActiveBoardScope,
    activeBoardId,
    setActiveBoardId,
    viewerState,
    setViewerState,
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
    shellMode,
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
    shellMode,
    setShellMode,
    hasRestored,
  });

  const session = useTutorSession({
    initialRouteQuery,
    hub,
    activeSessionId,
    setActiveSessionId,
    shellMode,
    studioView: workflow.studioView,
    setShellMode,
    setShowSetup,
    setRestoredTurns,
    hasRestored,
    activeWorkflowId: workflow.activeWorkflowId,
    activeWorkflowDetail: workflow.activeWorkflowDetail ?? null,
  });

  useEffect(() => {
    sessionBridgeRef.current = session;
  }, [session]);

  // ─── Navigation helpers ───
  const resumeFromHubCandidate = useCallback(
    async (candidate: TutorHubResumeCandidate) => {
      if (candidate.can_resume && candidate.session_id) {
        await session.resumeSession(candidate.session_id);
        setShowSetup(false);
        setShellMode("tutor");
        return;
      }

      if (typeof candidate.course_id !== "number") return;

      explicitShellModeRef.current = {
        courseId: candidate.course_id,
        mode: candidate.last_mode === "tutor" ? "tutor" : "studio",
      };
      hub.setCourseId(candidate.course_id);

      if (!candidate.session_id) {
        clearTutorActiveSessionId();
        setActiveSessionId(null);
      }

      if (candidate.last_mode !== "tutor") {
        workflow.setStudioView("home");
        setShellMode("studio");
        setShowSetup(false);
        return;
      }
      setShellMode("tutor");
      setShowSetup(false);
    },
    [hub, session, workflow],
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
    (
      nextProjectShell: TutorProjectShellResponse,
      nextCourseId: number,
      hasExplicitModeOverride: boolean,
    ) => {
      setShellHydratedCourseId(nextCourseId);
      setShellRevision(nextProjectShell.workspace_state.revision || 0);
      if (
        !hasExplicitModeOverride &&
        !initialRouteQuery.mode &&
        shellMode === "studio" &&
        !workflow.activeWorkflowId &&
        nextProjectShell.workspace_state.last_mode
      ) {
        if (nextProjectShell.workspace_state.last_mode !== "tutor") {
          workflow.setStudioView("home");
        }
        setShellMode(
          nextProjectShell.workspace_state.last_mode === "tutor" ? "tutor" : "studio",
        );
      }
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
      hub,
      initialRouteQuery,
      setPromotedPolishPacketNotes,
      shellMode,
      workflow,
    ],
  );

  const openStudioHome = useCallback(() => {
    if (typeof hub.courseId === "number") {
      explicitShellModeRef.current = { courseId: hub.courseId, mode: "studio" };
    }
    workflow.setStudioView("home");
    setShellMode("studio");
    setShowSetup(false);
  }, [hub.courseId, workflow]);

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
        if (!initialRouteQuery.mode) {
          setShellMode("studio");
        }
      }
    } catch {
      if (!initialRouteQuery.sessionId) {
        clearTutorActiveSessionId();
        if (!initialRouteQuery.mode) {
          setShellMode("studio");
        }
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
    if (!session.projectShell || typeof hub.courseId !== "number")
      return;
    const explicitShellMode = explicitShellModeRef.current;
    const hasExplicitModeOverride =
      explicitShellMode?.courseId === hub.courseId;
    if (shellHydratedCourseId !== hub.courseId) {
      hydrateProjectShellState(
        session.projectShell,
        hub.courseId,
        hasExplicitModeOverride,
      );
      if (hasExplicitModeOverride) {
        explicitShellModeRef.current = null;
      }
    }
    if (
      !resumedFromProjectShellRef.current &&
      !activeSessionId &&
      !brainLaunchContext &&
      !workflow.activeWorkflowId &&
      shellMode === "tutor" &&
      session.projectShell.active_session?.session_id
    ) {
      resumedFromProjectShellRef.current = true;
      void api.tutor
        .getSession(session.projectShell.active_session.session_id)
        .then((s) => {
          if (s.status !== "active") {
            session.clearActiveSessionState({
              nextShellMode: initialRouteQuery.mode === "tutor" ? "tutor" : "studio",
            });
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
    initialRouteQuery.mode,
    shellMode,
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
  }, [activeSessionId, hasRestored, shellMode, workflow.studioView]);

  useEffect(() => {
    writeTutorShellQuery({
      courseId: hub.courseId,
      sessionId: activeSessionId || undefined,
      mode: shellMode,
      boardScope: activeBoardScope,
      boardId: activeBoardId ?? undefined,
    });
  }, [
    activeBoardId,
    activeBoardScope,
    activeSessionId,
    hub.courseId,
    shellMode,
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
      shellMode,
      activeBoardScope,
      activeBoardId,
      viewerState,
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
          last_mode: shellMode,
          active_board_scope: activeBoardScope,
          active_board_id: activeBoardId,
          viewer_state: viewerState,
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
    shellMode,
    shellHydratedCourseId,
    shellRevision,
    viewerState,
    promotedPrimePacketObjects,
    promotedPolishPacketNotes,
  ]);

  // ─── Derived ───
  const isTutorSessionView = session.isTutorSessionView;
  const liveTutorSessionId = session.hasActiveTutorSession
    ? activeSessionId
    : null;

  const tutorHeroStats = [
    { label: "Mode", value: shellMode.toUpperCase() },
    {
      label: "Session",
      value: isTutorSessionView ? "LIVE" : "READY",
      tone: isTutorSessionView ? "success" : "info",
    } as const,
    {
      label: "Course",
      value: hub.courseLabel || "UNSCOPED",
      tone: hub.courseLabel ? "default" : "warn",
    } as const,
    {
      label: "Materials",
      value: String(hub.selectedMaterials.length),
      tone: hub.selectedMaterials.length > 0 ? "info" : "default",
    } as const,
  ];

  const teachRuntime = useMemo(
    () =>
      resolveTutorTeachRuntime({
        workflowDetail: workflow.activeWorkflowDetail as unknown,
        workflowStage:
          session.currentBlock?.control_stage ||
          session.currentBlock?.category ||
          workflow.activeWorkflowDetail?.workflow?.current_stage ||
          null,
        currentBlock: session.currentBlock,
      }),
    [session.currentBlock, workflow.activeWorkflowDetail],
  );

  // ─── Studio sub-tabs ───
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

  const studioSubTabs: StudioSubTab[] = useMemo(
    () => [
      // {
      //   key: "priming" as TutorStudioView,
      //   label: workflow.bootstrappingPriming ? "PRIMING..." : "PRIMING",
      //   available: !workflow.bootstrappingPriming,
      // },
      // { key: "polish" as TutorStudioView, label: "POLISH", available: hasTutorWork },
      // { key: "final_sync" as TutorStudioView, label: "FINAL SYNC", available: hasFinalSyncAccess },
      { key: "workspace" as TutorStudioView, label: "WORKSPACE", available: true },
    ],
    [workflow.bootstrappingPriming, hasTutorWork, hasFinalSyncAccess],
  );

  // ─── Top bar ───
  const tutorShellTopBar = (
    <TutorTopBar
      shellMode={shellMode}
      isTutorSessionView={isTutorSessionView}
      brainLaunchContext={brainLaunchContext}
      topic={hub.topic || "Freeform"}
      turnCount={session.turnCount}
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
      onAdvanceBlock={session.advanceBlock}
      activeWorkflowId={workflow.activeWorkflowId}
      activeWorkflowDetail={workflow.activeWorkflowDetail}
      studioView={workflow.studioView}
      studioSubTabs={studioSubTabs}
      teachRuntime={teachRuntime}
      activeSessionId={liveTutorSessionId}
    />
  );

  const tutorWorkspaceNav = (
    <div className="px-2 md:px-3">
      <TutorTabBar
        shellMode={shellMode}
        activeSessionId={liveTutorSessionId}
        showArtifacts={session.showArtifacts}
        artifacts={session.artifacts}
        onSetShellMode={setShellMode}
        onOpenStudioHome={openStudioHome}
        onSetShowArtifacts={session.setShowArtifacts}
        onSetShowEndConfirm={session.setShowEndConfirm}
      />
    </div>
  );

  // ─── Render ───
  return (
    <PageScaffold
      eyebrow="Live Study Core"
      title="Tutor"
      subtitle="Run your study plan from Workspace Home through Priming, then move into Tutor and Final Sync without losing context. [v0.9.1-clarity]"
      className="h-full min-h-0 [&_.page-shell\_\_horizon]:hidden [&_.page-shell\_\_hero]:border-transparent [&_.page-shell\_\_hero]:before:hidden"
      contentClassName="gap-6"
      stats={tutorHeroStats}
      heroFooter={tutorWorkspaceNav}
      actions={
        <>
          <a
            href="/theme-lab/index.html"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "gap-2 px-4 uppercase tracking-[0.14em] text-[#ffd8e0]",
            )}
          >
            <Palette className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
            <span>THEME LAB</span>
          </a>
          <HudButton
            variant="outline"
            className="gap-2 px-4 py-2 text-ui-xs text-[#ffd8e0]"
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
            <span>REFRESH</span>
          </HudButton>
        </>
      }
    >
      <CoreWorkspaceFrame
        topBar={tutorShellTopBar}
        topBarVariant="integrated"
        className="tutor-shell-frame"
        topBarClassName="tutor-shell-frame__topbar"
        topBarSurfaceClassName="tutor-shell-frame__topbar-surface"
        mainClassName="tutor-shell-frame__main"
        contentClassName="relative min-h-0"
      >
        <TutorShell
          shellMode={shellMode}
          setShellMode={setShellMode}
          activeSessionId={liveTutorSessionId}
          hub={hub}
          session={session}
          workflow={workflow}
          restoredTurns={restoredTurns}
          activeBoardScope={activeBoardScope}
          activeBoardId={activeBoardId}
          viewerState={viewerState}
          setActiveBoardScope={setActiveBoardScope}
          setActiveBoardId={setActiveBoardId}
          setViewerState={setViewerState}
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
          onResumeHubCandidate={resumeFromHubCandidate}
        />
      </CoreWorkspaceFrame>
    </PageScaffold>
  );
}

export default function Tutor() {
  return useTutorPageController();
}
