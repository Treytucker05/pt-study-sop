import Layout from "@/components/layout";
import { CoreWorkspaceFrame } from "@/components/CoreWorkspaceFrame";
import { PageScaffold } from "@/components/PageScaffold";
import {
  CONTROL_CHIP,
  CONTROL_COPY,
  CONTROL_DECK_SECTION,
  CONTROL_KICKER,
  controlToggleButton,
} from "@/components/shell/controlStyles";
import { TutorWorkflowStepper } from "@/components/TutorWorkflowStepper";
import { TutorTabBar } from "@/components/TutorTabBar";
import { TutorShell } from "@/components/TutorShell";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import {
  MessageSquare,
  Clock,
  Timer,
  SkipForward,
  RefreshCw,
} from "lucide-react";
import { ICON_SM, ICON_MD } from "@/lib/theme";
import { CONTROL_PLANE_COLORS } from "@/lib/colors";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  readTutorShellQuery,
  writeTutorShellQuery,
} from "@/lib/tutorUtils";
import type { TutorPageMode, TutorShellQuery } from "@/lib/tutorUtils";

function useTutorPageController() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const initialRouteQuery = useMemo(() => readTutorShellQuery(), []);
  const navigationTokenRef = useRef(0);
  const explicitShellModeRef = useRef<{ courseId: number; mode: TutorShellMode } | null>(null);
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
  const [shellMode, setShellMode] = useState<TutorPageMode>(
    initialRouteQuery.mode ||
      (initialRouteQuery.sessionId || storedActiveSessionId ? "tutor" : "dashboard"),
  );
  const [studioEntryRequest, setStudioEntryRequest] = useState<TutorStudioEntryRequest | null>(null);
  const [scheduleLaunchIntent, setScheduleLaunchIntent] =
    useState<TutorScheduleLaunchIntent | null>(null);
  const [activeBoardScope, setActiveBoardScope] = useState<TutorBoardScope>(
    initialRouteQuery.boardScope || "project",
  );
  const [activeBoardId, setActiveBoardId] = useState<number | null>(
    initialRouteQuery.boardId ?? null,
  );
  const [viewerState, setViewerState] = useState<Record<string, unknown> | null>(null);
  const [shellRevision, setShellRevision] = useState(0);
  const [shellHydratedCourseId, setShellHydratedCourseId] = useState<number | null>(null);
  const [showSetup, setShowSetup] = useState<boolean>(
    () => !Boolean(initialRouteQuery.sessionId || storedActiveSessionId),
  );
  const [brainLaunchContext, setBrainLaunchContext] = useState<TutorBrainLaunchContext | null>(
    null,
  );

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

  const openProjectFromHub = useCallback((nextCourseId: number) => {
    explicitShellModeRef.current = { courseId: nextCourseId, mode: "studio" };
    hub.setCourseId(nextCourseId);
    setShellMode("studio");
    setShowSetup(false);
    setScheduleLaunchIntent(null);
    setStudioEntryRequest({ level: 2, token: nextNavigationToken() });
  }, [hub, nextNavigationToken]);

  const openScheduleCourseFromHub = useCallback(
    (nextCourseId: number, kind: "manage_event" | "manage_exam") => {
      explicitShellModeRef.current = { courseId: nextCourseId, mode: "schedule" };
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
      explicitShellModeRef.current = { courseId: event.course_id, mode: "schedule" };
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
        mode: candidate.last_mode || "studio",
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
        workflow.setWorkflowView("launch");
        setShellMode("dashboard");
        setShowSetup(false);
        return;
      }
      if (candidate.last_mode === "studio") {
        setShellMode("studio");
        setShowSetup(false);
        return;
      }
      setShellMode("dashboard");
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

      if (action.kind === "wheel_course" && typeof action.course_id === "number") {
        openProjectFromHub(action.course_id);
        return;
      }

      if (
        (action.kind === "planner_task" || action.kind === "exam" || action.kind === "assignment") &&
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
    [openProjectFromHub, openScheduleCourseFromHub, openScheduleEventFromHub, sessionWithWorkflow],
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
        nextProjectShell.workspace_state.last_mode
      ) {
        setShellMode(
          nextProjectShell.workspace_state.last_mode === "publish"
            ? "dashboard"
            : nextProjectShell.workspace_state.last_mode,
        );
      }
      if (
        !initialRouteQuery.boardScope &&
        activeBoardScope === "project" &&
        nextProjectShell.workspace_state.active_board_scope
      ) {
        setActiveBoardScope(nextProjectShell.workspace_state.active_board_scope);
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
          writeTutorSelectedMaterialIds(nextProjectShell.workspace_state.selected_material_ids),
        );
      }
    },
    [activeBoardScope, hub, initialRouteQuery, shellMode],
  );

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
      (fromBrainHandoff || fromLibraryHandoff ? null : readTutorActiveSessionId());
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
          setShellMode("dashboard");
        }
      }
    } catch {
      if (!initialRouteQuery.sessionId) {
        clearTutorActiveSessionId();
        if (!initialRouteQuery.mode) {
          setShellMode("dashboard");
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
          hub.setCourseId((prev) => (typeof prev === "number" ? prev : currentCourse.id));
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
    if (!sessionWithWorkflow.projectShell || typeof hub.courseId !== "number") return;
    const explicitShellMode = explicitShellModeRef.current;
    const hasExplicitModeOverride = explicitShellMode?.courseId === hub.courseId;
    if (shellHydratedCourseId !== hub.courseId) {
      hydrateProjectShellState(sessionWithWorkflow.projectShell, hub.courseId, hasExplicitModeOverride);
      if (hasExplicitModeOverride) {
        explicitShellModeRef.current = null;
      }
    }
    if (
      !resumedFromProjectShellRef.current &&
      !activeSessionId &&
      !brainLaunchContext &&
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
    sessionWithWorkflow,
    shellHydratedCourseId,
  ]);

  useEffect(() => {
    if (!hasRestored) return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [activeSessionId, hasRestored, shellMode, workflow.workflowView]);

  useEffect(() => {
    writeTutorShellQuery({
      courseId: hub.courseId,
      sessionId: activeSessionId || undefined,
      mode: shellMode,
      boardScope: activeBoardScope,
      boardId: activeBoardId ?? undefined,
    });
  }, [activeBoardId, activeBoardScope, activeSessionId, hub.courseId, shellMode]);

  // Shell persistence
  useEffect(() => {
    if (!hasRestored || typeof hub.courseId !== "number" || shellMode === "dashboard") return;
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
        await queryClient.invalidateQueries({ queryKey: ["tutor-project-shell", hub.courseId] });
      } catch {
        await queryClient.invalidateQueries({ queryKey: ["tutor-project-shell", hub.courseId] });
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

  // ─── Top bar ───
  const tutorShellTopBar = (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 border-b border-primary/10 pb-2">
        <div>
          <div className={CONTROL_KICKER}>Tutor</div>
          <div className={cn(CONTROL_COPY, "text-[11px]")}>
            Brain&apos;s default live study surface for guided sessions, artifacts, and next-step handoff.
          </div>
        </div>
        {!isTutorSessionView ? (
          <Badge variant="outline" className="shrink-0 rounded-full border-primary/30 px-3 py-1 font-terminal text-[10px]">
            BRAIN TO TUTOR LIVE SURFACE
          </Badge>
        ) : null}
      </div>
      {!isTutorSessionView && brainLaunchContext?.title ? (
        <div
          data-testid="tutor-brain-handoff"
          className={cn(CONTROL_DECK_SECTION, "space-y-1")}
        >
          <div className={CONTROL_KICKER}>Opened From Brain</div>
          <div className="font-terminal text-xs text-white">{brainLaunchContext.title}</div>
          {brainLaunchContext.reason ? (
            <div className={cn(CONTROL_COPY, "text-[11px]")}>
              {brainLaunchContext.reason}
            </div>
          ) : null}
        </div>
      ) : null}
      {isTutorSessionView ? (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <Badge variant="outline" className="min-h-[40px] shrink-0 rounded-full border-primary/30 px-3 font-terminal text-[11px]">
            <span className="text-muted-foreground mr-1">TOPIC:</span>
            <span className="text-foreground">{hub.topic || "Freeform"}</span>
          </Badge>
          <div className="flex items-center gap-2 shrink-0">
            <span className={cn(CONTROL_CHIP, "min-h-[40px] px-2.5 text-[11px]")} title="Turns">
              <MessageSquare className={ICON_SM} />
              {sessionWithWorkflow.turnCount}
            </span>
            {sessionWithWorkflow.startedAt ? (
              <span className={cn(CONTROL_CHIP, "min-h-[40px] px-2.5 text-[11px]")} title="Started At">
                <Clock className={ICON_SM} />
                {new Date(sessionWithWorkflow.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            ) : null}
          </div>

          {sessionWithWorkflow.hasChain && sessionWithWorkflow.currentBlock && !sessionWithWorkflow.isChainComplete ? (
            <div className="flex items-center gap-2 px-2 shrink-0 border-l border-primary/20">
              <Badge
                variant="outline"
                className={`h-7 rounded-full px-2 text-[10px] font-arcade uppercase ${
                  CONTROL_PLANE_COLORS[sessionWithWorkflow.currentBlock.control_stage?.toUpperCase?.() || sessionWithWorkflow.currentBlock.category?.toUpperCase?.() || ""]?.badge
                  || "bg-secondary/20 text-muted-foreground"
                }`}
              >
                {sessionWithWorkflow.currentBlock.control_stage || sessionWithWorkflow.currentBlock.category || "BLOCK"}
              </Badge>
              <span className="text-xs font-terminal text-foreground truncate max-w-[120px]" title={sessionWithWorkflow.currentBlock.name}>
                {sessionWithWorkflow.currentBlock.name}
              </span>
              {sessionWithWorkflow.blockTimerSeconds !== null ? (
                <span
                  className={`text-sm font-arcade tabular-nums ${
                    sessionWithWorkflow.blockTimerSeconds <= 0
                      ? "text-destructive animate-pulse"
                      : sessionWithWorkflow.blockTimerSeconds <= 60
                        ? "text-destructive"
                        : sessionWithWorkflow.blockTimerSeconds <= 120
                          ? "text-warning"
                          : "text-foreground"
                  }`}
                >
                  {sessionWithWorkflow.formatTimer(Math.max(0, sessionWithWorkflow.blockTimerSeconds))}
                </span>
              ) : null}
              <span className="text-[10px] text-muted-foreground font-terminal">
                {sessionWithWorkflow.progressCount}/{sessionWithWorkflow.chainBlocks.length}
              </span>
              {sessionWithWorkflow.blockTimerSeconds !== null ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => sessionWithWorkflow.setTimerPaused((p: boolean) => !p)}
                  className={cn(controlToggleButton(false, "secondary", true), "h-8 w-8 p-0 text-muted-foreground")}
                  title={sessionWithWorkflow.timerPaused ? "Resume timer" : "Pause timer"}
                >
                  {sessionWithWorkflow.timerPaused ? <Timer className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                </Button>
              ) : null}
              <Button
                variant="ghost"
                size="sm"
                onClick={sessionWithWorkflow.advanceBlock}
                className={cn(controlToggleButton(false, "secondary", true), "h-8 px-2 text-[10px]")}
                title="Skip to next block"
              >
                <SkipForward className="w-3 h-3" />
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      <TutorWorkflowStepper
        activeWorkflowId={workflow.activeWorkflowId}
        currentStage={workflow.activeWorkflowDetail?.workflow?.status ?? null}
        onStageClick={(stage) => {
          setStudioEntryRequest(null);
          setScheduleLaunchIntent(null);
          if (stage === "tutor") {
            setShellMode("tutor");
          } else if (stage === "polish") {
            void workflow.openWorkflowPolish();
          } else {
            setShellMode("dashboard");
            workflow.setWorkflowView(stage as "priming" | "final_sync");
          }
        }}
      />

      <TutorTabBar
        shellMode={shellMode}
        workflowView={workflow.workflowView}
        activeWorkflowId={workflow.activeWorkflowId}
        activeWorkflowDetail={workflow.activeWorkflowDetail}
        activeSessionId={activeSessionId}
        showArtifacts={sessionWithWorkflow.showArtifacts}
        artifacts={sessionWithWorkflow.artifacts}
        onSetShellMode={setShellMode}
        onSetWorkflowView={workflow.setWorkflowView}
        onSetShowArtifacts={sessionWithWorkflow.setShowArtifacts}
        onSetShowEndConfirm={sessionWithWorkflow.setShowEndConfirm}
        onOpenWorkflowPolish={() => void workflow.openWorkflowPolish()}
        onOpenSettings={openSettings}
        onSetStudioEntryRequest={setStudioEntryRequest}
        onSetScheduleLaunchIntent={setScheduleLaunchIntent}
      />
    </div>
  );

  // ─── Render ───
  return (
    <Layout>
      <PageScaffold
        eyebrow="Live Study Core"
        title="Tutor"
        subtitle="Run your study plan from Launch through Priming, then move into Tutor, Studio, schedule, and Final Sync without losing context."
        className="min-h-[calc(100vh-140px)]"
        contentClassName="gap-6"
        stats={tutorHeroStats}
        actions={
          <Button
            variant="shell"
            size="sm"
            className="font-arcade text-xs"
            onClick={() => {
              void Promise.all([
                queryClient.invalidateQueries({ queryKey: ["tutor-hub"] }),
                queryClient.invalidateQueries({ queryKey: ["tutor-sessions"] }),
                queryClient.invalidateQueries({ queryKey: ["tutor-project-shell"] }),
                queryClient.invalidateQueries({ queryKey: ["tutor-studio-restore"] }),
                queryClient.invalidateQueries({ queryKey: ["tutor-chat-materials-all-enabled"] }),
                queryClient.invalidateQueries({ queryKey: ["obsidian"] }),
              ]);
            }}
          >
            <RefreshCw className="w-3 h-3 mr-2" /> REFRESH
          </Button>
        }
      >
        <CoreWorkspaceFrame topBar={tutorShellTopBar} contentClassName="relative min-h-0">
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
          />
        </CoreWorkspaceFrame>
      </PageScaffold>
    </Layout>
  );
}

export default function Tutor() {
  return useTutorPageController();
}
