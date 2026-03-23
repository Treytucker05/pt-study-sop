import { CoreWorkspaceFrame } from "@/components/CoreWorkspaceFrame";
import { PageScaffold } from "@/components/PageScaffold";
import { TutorShell } from "@/components/TutorShell";
import { TutorTopBar } from "@/components/TutorTopBar";
import { TutorTabBar } from "@/components/TutorTabBar";
import type { StudioSubTab } from "@/components/TutorTabBar";
import { useTutorHub } from "@/hooks/useTutorHub";
import { useTutorSession } from "@/hooks/useTutorSession";
import { useTutorWorkflow } from "@/hooks/useTutorWorkflow";
import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  TutorBoardScope,
  TutorHubEventSummary,
  TutorHubRecommendedAction,
  TutorHubResumeCandidate,
  TutorProjectShellResponse,
  TutorShellMode,
} from "@/lib/api";
import {
  clearTutorActiveSessionId,
  consumeTutorLaunchHandoff,
  peekTutorLaunchHandoff,
  readTutorActiveSessionId,
  readTutorSelectedMaterialIds,
  readTutorStoredStartState,
  writeTutorActiveSessionId,
  writeTutorSelectedMaterialIds,
  writeLibraryLaunchFromTutor,
  type TutorBrainLaunchContext,
} from "@/lib/tutorClientState";
import type { TutorStudioEntryRequest } from "@/components/TutorStudioMode";
import type { TutorScheduleLaunchIntent } from "@/components/TutorScheduleMode";
import { HudButton } from "@/components/ui/HudButton";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import { Palette, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { readTutorShellQuery, writeTutorShellQuery } from "@/lib/tutorUtils";
import type { TutorPageMode, TutorShellQuery, TutorStudioView } from "@/lib/tutorUtils";
import { resolveTutorTeachRuntime } from "@/components/TutorChat.types";

function useTutorPageController() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const initialRouteQuery = useMemo(() => readTutorShellQuery(), []);
  const navigationTokenRef = useRef(0);
  const explicitShellModeRef = useRef<{
    courseId: number;
    mode: TutorShellMode;
  } | null>(null);
  const lastPersistedShellKeyRef = useRef("");
  const resumedFromProjectShellRef = useRef(false);

  // ─── Shell state ───
  const pendingLaunchHandoff = peekTutorLaunchHandoff();
  const shouldSuppressStoredSessionResume =
    !initialRouteQuery.sessionId &&
    (pendingLaunchHandoff.fromLibraryHandoff ||
      Boolean(pendingLaunchHandoff.brainLaunchContext));
  const storedActiveSessionId = shouldSuppressStoredSessionResume
    ? null
    : readTutorActiveSessionId();
  const [activeSessionId, setActiveSessionId] = useState<string | null>(
    initialRouteQuery.sessionId || storedActiveSessionId,
  );
  const [hasRestored, setHasRestored] = useState(false);
  const [restoredTurns, setRestoredTurns] = useState<
    { question: string; answer: string | null }[] | undefined
  >();
  const initialShellMode =
    initialRouteQuery.mode ||
    (initialRouteQuery.sessionId || storedActiveSessionId ? "tutor" : "studio");
  const [shellMode, setShellMode] = useState<TutorPageMode>(initialShellMode);
  const [studioEntryRequest, setStudioEntryRequest] =
    useState<TutorStudioEntryRequest | null>(null);
  const [scheduleLaunchIntent, setScheduleLaunchIntent] =
    useState<TutorScheduleLaunchIntent | null>(null);
  const [activeBoardScope, setActiveBoardScope] = useState<TutorBoardScope>(
    initialRouteQuery.boardScope || "project",
  );
  const [activeBoardId, setActiveBoardId] = useState<number | null>(
    initialRouteQuery.boardId ?? null,
  );
  const [viewerState, setViewerState] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [shellRevision, setShellRevision] = useState(0);
  const [shellHydratedCourseId, setShellHydratedCourseId] = useState<
    number | null
  >(null);
  const [showSetup, setShowSetup] = useState<boolean>(
    () => !Boolean(initialRouteQuery.sessionId || storedActiveSessionId),
  );
  const [brainLaunchContext, setBrainLaunchContext] =
    useState<TutorBrainLaunchContext | null>(null);

  // ─── Settings state ───
  const [showSettings, setShowSettings] = useState(false);
  const [customInstructions, setCustomInstructions] = useState("");
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(true);

  // ─── Compose hooks ───
  const hub = useTutorHub({
    initialRouteQuery,
    hasRestored,
    shellMode,
    activeSessionId,
  });

  const session = useTutorSession({
    initialRouteQuery,
    hub,
    activeSessionId,
    setActiveSessionId,
    shellMode,
    studioView: "workbench",
    setShellMode,
    setShowSetup,
    setRestoredTurns,
    hasRestored,
    activeWorkflowId: null, // will be set after workflow hook
    activeWorkflowDetail: null,
  });

  const workflow = useTutorWorkflow({
    hub,
    session,
    activeSessionId,
    shellMode,
    setShellMode,
    hasRestored,
  });

  // Re-create session with workflow context for stage timer
  const sessionWithWorkflow = useTutorSession({
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

  // ─── Settings callbacks ───
  const openSettings = useCallback(async () => {
    setShowSettings(true);
    setSettingsLoading(true);
    try {
      const data = await api.tutor.getSettings();
      setCustomInstructions(data.custom_instructions);
    } catch {
      toast.error("Failed to load tutor settings");
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  const saveSettings = useCallback(async () => {
    setSettingsSaving(true);
    try {
      await api.tutor.saveSettings({ custom_instructions: customInstructions });
      toast.success("Custom instructions saved");
      setShowSettings(false);
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSettingsSaving(false);
    }
  }, [customInstructions]);

  const restoreDefaultInstructions = useCallback(async () => {
    setSettingsLoading(true);
    try {
      await api.tutor.saveSettings({ custom_instructions: "" });
      const data = await api.tutor.getSettings();
      setCustomInstructions(data.custom_instructions);
      toast.success("Restored default instructions");
    } catch {
      toast.error("Failed to restore defaults");
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  // ─── Navigation helpers ───
  const nextNavigationToken = useCallback(() => {
    navigationTokenRef.current += 1;
    return navigationTokenRef.current;
  }, []);

  const openProjectFromHub = useCallback(
    (nextCourseId: number) => {
      explicitShellModeRef.current = { courseId: nextCourseId, mode: "studio" };
      hub.setCourseId(nextCourseId);
      workflow.setStudioView("workbench");
      setShellMode("studio");
      setShowSetup(false);
      setScheduleLaunchIntent(null);
      setStudioEntryRequest({ level: 2, token: nextNavigationToken() });
    },
    [hub, nextNavigationToken, workflow],
  );

  const openScheduleCourseFromHub = useCallback(
    (nextCourseId: number, kind: "manage_event" | "manage_exam") => {
      explicitShellModeRef.current = {
        courseId: nextCourseId,
        mode: "schedule",
      };
      hub.setCourseId(nextCourseId);
      setShellMode("schedule");
      setShowSetup(false);
      setStudioEntryRequest(null);
      setScheduleLaunchIntent({
        token: nextNavigationToken(),
        kind,
        courseId: nextCourseId,
      });
    },
    [hub, nextNavigationToken],
  );

  const openScheduleEventFromHub = useCallback(
    (event: TutorHubEventSummary) => {
      explicitShellModeRef.current = {
        courseId: event.course_id,
        mode: "schedule",
      };
      hub.setCourseId(event.course_id);
      setShellMode("schedule");
      setShowSetup(false);
      setStudioEntryRequest(null);
      setScheduleLaunchIntent({
        token: nextNavigationToken(),
        kind: "open_event",
        courseId: event.course_id,
        courseEventId: event.id,
      });
    },
    [hub, nextNavigationToken],
  );

  const openLibraryFromHub = useCallback(
    (params: {
      source: "assignment" | "exam" | "course";
      courseId: number;
      courseName?: string | null;
      courseEventId?: number;
      eventType?: string | null;
    }) => {
      writeLibraryLaunchFromTutor({
        source: params.source,
        courseId: params.courseId,
        courseName: params.courseName || undefined,
        courseEventId: params.courseEventId,
        eventType: params.eventType || null,
        target: "load_materials",
      });
      setLocation("/library");
    },
    [setLocation],
  );

  const resumeFromHubCandidate = useCallback(
    async (candidate: TutorHubResumeCandidate) => {
      if (candidate.can_resume && candidate.session_id) {
        await sessionWithWorkflow.resumeSession(candidate.session_id);
        setShowSetup(false);
        setShellMode("tutor");
        return;
      }

      if (typeof candidate.course_id !== "number") return;

      explicitShellModeRef.current = {
        courseId: candidate.course_id,
        mode: candidate.last_mode === "launch" ? "studio" : candidate.last_mode || "studio",
      };
      hub.setCourseId(candidate.course_id);
      setStudioEntryRequest(null);
      setScheduleLaunchIntent(null);

      if (!candidate.session_id) {
        clearTutorActiveSessionId();
        setActiveSessionId(null);
      }

      if (candidate.last_mode === "schedule") {
        setShellMode("schedule");
        setShowSetup(false);
        return;
      }
      if (candidate.last_mode === "publish") {
        workflow.setStudioView("workbench");
        setShellMode("studio");
        setShowSetup(false);
        return;
      }
      if (candidate.last_mode === "studio") {
        workflow.setStudioView("workbench");
        setShellMode("studio");
        setShowSetup(false);
        return;
      }
      setShellMode("studio");
      setShowSetup(false);
    },
    [hub, sessionWithWorkflow, workflow],
  );

  const runRecommendedAction = useCallback(
    async (action: TutorHubRecommendedAction) => {
      if (action.kind === "resume_session" && action.session_id) {
        await sessionWithWorkflow.resumeSession(action.session_id);
        setShowSetup(false);
        setShellMode("tutor");
        return;
      }

      if (
        action.kind === "wheel_course" &&
        typeof action.course_id === "number"
      ) {
        openProjectFromHub(action.course_id);
        return;
      }

      if (
        (action.kind === "planner_task" ||
          action.kind === "exam" ||
          action.kind === "assignment") &&
        typeof action.course_id === "number"
      ) {
        if (typeof action.course_event_id === "number") {
          openScheduleEventFromHub({
            id: action.course_event_id,
            course_id: action.course_id,
            course_name: action.course_name || action.course_code || "Course",
            course_code: action.course_code,
            title: action.title,
            type: action.event_type || "other",
            scheduled_date: null,
            status: "pending",
          });
          return;
        }
        openScheduleCourseFromHub(
          action.course_id,
          action.kind === "exam" ? "manage_exam" : "manage_event",
        );
      }
    },
    [
      openProjectFromHub,
      openScheduleCourseFromHub,
      openScheduleEventFromHub,
      sessionWithWorkflow,
    ],
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
        if (nextProjectShell.workspace_state.last_mode === "studio") {
          workflow.setStudioView("workbench");
        }
        setShellMode(
          nextProjectShell.workspace_state.last_mode === "publish" ||
          nextProjectShell.workspace_state.last_mode === "launch"
            ? "studio"
            : nextProjectShell.workspace_state.last_mode,
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
    [activeBoardScope, hub, initialRouteQuery, shellMode, workflow],
  );

  const openStudioHome = useCallback(() => {
    if (typeof hub.courseId === "number") {
      explicitShellModeRef.current = { courseId: hub.courseId, mode: "studio" };
    }
    setStudioEntryRequest(null);
    setScheduleLaunchIntent(null);
    workflow.setStudioView("workspace");
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
          sessionWithWorkflow.applySessionState(s);
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
  }, [applyStoredStartState, hub, initialRouteQuery, sessionWithWorkflow]);

  // ─── Effects ───
  useEffect(() => {
    if (hasRestored) return;
    setHasRestored(true);
    void restoreTutorShellState();
  }, [hasRestored, restoreTutorShellState]);

  useEffect(() => {
    if (!sessionWithWorkflow.projectShell || typeof hub.courseId !== "number")
      return;
    const explicitShellMode = explicitShellModeRef.current;
    const hasExplicitModeOverride =
      explicitShellMode?.courseId === hub.courseId;
    if (shellHydratedCourseId !== hub.courseId) {
      hydrateProjectShellState(
        sessionWithWorkflow.projectShell,
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
      sessionWithWorkflow.projectShell.active_session?.session_id
    ) {
      resumedFromProjectShellRef.current = true;
      void api.tutor
        .getSession(sessionWithWorkflow.projectShell.active_session.session_id)
        .then((s) => {
          sessionWithWorkflow.applySessionState(s);
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
    shellMode,
    sessionWithWorkflow,
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
  ]);

  // ─── Derived ───
  const isTutorSessionView = shellMode === "tutor" && Boolean(activeSessionId);

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
          sessionWithWorkflow.currentBlock?.control_stage ||
          sessionWithWorkflow.currentBlock?.category ||
          workflow.activeWorkflowDetail?.workflow?.current_stage ||
          null,
        currentBlock: sessionWithWorkflow.currentBlock,
      }),
    [sessionWithWorkflow.currentBlock, workflow.activeWorkflowDetail],
  );

  // ─── Studio sub-tabs ───
  const currentWorkflowStage =
    workflow.activeWorkflowDetail?.workflow?.current_stage ?? null;
  const hasTutorWork =
    Boolean(activeSessionId) ||
    currentWorkflowStage === "tutor" ||
    currentWorkflowStage === "polish" ||
    currentWorkflowStage === "final_sync" ||
    (workflow.activeWorkflowDetail?.captured_notes?.length ?? 0) > 0;
  const hasFinalSyncAccess =
    Boolean(workflow.activeWorkflowDetail?.polish_bundle) ||
    currentWorkflowStage === "final_sync";

  const studioSubTabs: StudioSubTab[] = useMemo(
    () => [
      // { key: "workbench" as TutorStudioView, label: "WORKBENCH", available: true },
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

  const handleStudioSubTabClick = useCallback(
    (key: TutorStudioView) => {
      if (key === "priming") {
        void workflow.openStudioPriming();
      } else {
        workflow.setStudioView(key);
      }
      setShellMode("studio");
    },
    [workflow, setShellMode],
  );

  // ─── Top bar ───
  const tutorShellTopBar = (
    <TutorTopBar
      shellMode={shellMode}
      isTutorSessionView={isTutorSessionView}
      brainLaunchContext={brainLaunchContext}
      topic={hub.topic || "Freeform"}
      turnCount={sessionWithWorkflow.turnCount}
      startedAt={sessionWithWorkflow.startedAt}
      hasChain={sessionWithWorkflow.hasChain}
      currentBlock={sessionWithWorkflow.currentBlock}
      isChainComplete={sessionWithWorkflow.isChainComplete}
      blockTimerSeconds={sessionWithWorkflow.blockTimerSeconds}
      timerPaused={sessionWithWorkflow.timerPaused}
      progressCount={sessionWithWorkflow.progressCount}
      chainBlocksLength={sessionWithWorkflow.chainBlocks.length}
      formatTimer={sessionWithWorkflow.formatTimer}
      onSetTimerPaused={sessionWithWorkflow.setTimerPaused}
      onAdvanceBlock={sessionWithWorkflow.advanceBlock}
      activeWorkflowId={workflow.activeWorkflowId}
      activeWorkflowDetail={workflow.activeWorkflowDetail}
      studioView={workflow.studioView}
      studioSubTabs={studioSubTabs}
      teachRuntime={teachRuntime}
      activeSessionId={activeSessionId}
    />
  );

  const tutorWorkspaceNav = (
    <div className="px-2 md:px-3">
      <TutorTabBar
        shellMode={shellMode}
        activeSessionId={activeSessionId}
        showArtifacts={sessionWithWorkflow.showArtifacts}
        artifacts={sessionWithWorkflow.artifacts}
        onSetShellMode={setShellMode}
        onOpenStudioHome={openStudioHome}
        onSetShowArtifacts={sessionWithWorkflow.setShowArtifacts}
        onSetShowEndConfirm={sessionWithWorkflow.setShowEndConfirm}
        onOpenSettings={openSettings}
        onSetStudioEntryRequest={setStudioEntryRequest}
        onSetScheduleLaunchIntent={setScheduleLaunchIntent}
        studioSubTabs={studioSubTabs}
        studioView={workflow.studioView}
        onStudioSubTabClick={handleStudioSubTabClick}
      />
    </div>
  );

  // ─── Render ───
  return (
    <PageScaffold
      eyebrow="Live Study Core"
      title="Tutor"
      subtitle="Run your study plan from Studio through Priming, then move into Tutor, schedule, and Final Sync without losing context. [v0.9.0-workspace]"
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
          activeSessionId={activeSessionId}
          hub={hub}
          session={sessionWithWorkflow}
          workflow={workflow}
          restoredTurns={restoredTurns}
          studioEntryRequest={studioEntryRequest}
          scheduleLaunchIntent={scheduleLaunchIntent}
          activeBoardScope={activeBoardScope}
          activeBoardId={activeBoardId}
          viewerState={viewerState}
          setActiveBoardScope={setActiveBoardScope}
          setActiveBoardId={setActiveBoardId}
          setViewerState={setViewerState}
          setShowSetup={setShowSetup}
          queryClient={queryClient}
          showSettings={showSettings}
          setShowSettings={setShowSettings}
          customInstructions={customInstructions}
          setCustomInstructions={setCustomInstructions}
          settingsLoading={settingsLoading}
          settingsSaving={settingsSaving}
          isPreviewMode={isPreviewMode}
          setIsPreviewMode={setIsPreviewMode}
          saveSettings={saveSettings}
          restoreDefaultInstructions={restoreDefaultInstructions}
          onResumeHubCandidate={resumeFromHubCandidate}
        />
      </CoreWorkspaceFrame>
    </PageScaffold>
  );
}

export default function Tutor() {
  return useTutorPageController();
}
