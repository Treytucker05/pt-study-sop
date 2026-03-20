import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  TutorAccuracyProfile,
  TutorBoardScope,
  TutorConfigCheck,
  TutorObjectiveScope,
  TutorProjectShellResponse,
  TutorScholarStrategy,
  TutorSessionPreflightResponse,
  TutorSessionWithTurns,
  TutorStrategyFeedback,
  TutorTemplateChain,
} from "@/lib/api";
import type { TutorArtifact } from "@/components/TutorArtifacts";
import type { ChatMessage } from "@/components/TutorChat.types";
import {
  clearTutorActiveSessionId,
  normalizeTutorAccuracyProfile,
  normalizeTutorObjectiveScope,
  writeTutorActiveSessionId,
  writeTutorSelectedMaterialIds,
} from "@/lib/tutorClientState";
import { normalizeArtifactType } from "@/lib/tutorUtils";
import type { TutorPageMode, TutorShellQuery } from "@/lib/tutorUtils";
import { toast } from "sonner";
import type { UseTutorHubReturn } from "./useTutorHub";

export interface UseTutorSessionParams {
  initialRouteQuery: TutorShellQuery;
  hub: UseTutorHubReturn;
  activeSessionId: string | null;
  setActiveSessionId: (id: string | null) => void;
  shellMode: TutorPageMode;
  setShellMode: (mode: TutorPageMode) => void;
  setShowSetup: (show: boolean) => void;
  setRestoredTurns: (turns: { question: string; answer: string | null }[] | undefined) => void;
  hasRestored: boolean;
  activeWorkflowId: string | null;
  activeWorkflowDetail: { stage_time_logs?: Array<{ stage: string; seconds_active?: number; pause_count?: number }> } | null;
}

export function useTutorSession({
  initialRouteQuery,
  hub,
  activeSessionId,
  setActiveSessionId,
  shellMode,
  setShellMode,
  setShowSetup,
  setRestoredTurns,
  hasRestored,
  activeWorkflowId,
  activeWorkflowDetail,
}: UseTutorSessionParams) {
  const queryClient = useQueryClient();

  // ─── Session runtime state ───
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [chainBlocks, setChainBlocks] = useState<TutorTemplateChain["blocks"]>([]);
  const [artifacts, setArtifacts] = useState<TutorArtifact[]>([]);
  const [turnCount, setTurnCount] = useState(0);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [showArtifacts, setShowArtifacts] = useState(false);
  const [scholarStrategyExpanded, setScholarStrategyExpanded] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [isShipping, setIsShipping] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [blockTimerSeconds, setBlockTimerSeconds] = useState<number | null>(null);
  const [timerWarningShown, setTimerWarningShown] = useState(false);
  const [timerPaused, setTimerPaused] = useState(false);
  const [scholarStrategy, setScholarStrategy] = useState<TutorScholarStrategy | null>(null);
  const [strategyFeedback, setStrategyFeedback] = useState<TutorStrategyFeedback | null>(null);
  const [strategyNotes, setStrategyNotes] = useState("");
  const [savingStrategyFeedback, setSavingStrategyFeedback] = useState(false);
  const [latestCommittedAssistantMessage, setLatestCommittedAssistantMessage] =
    useState<ChatMessage | null>(null);

  // ─── Stage timer state ───
  const [stageTimerRunning, setStageTimerRunning] = useState(false);
  const [stageTimerStartedAt, setStageTimerStartedAt] = useState<string | null>(null);
  const [stageTimerAccumulatedSeconds, setStageTimerAccumulatedSeconds] = useState(0);
  const [stageTimerPauseCount, setStageTimerPauseCount] = useState(0);
  const [stageTimerDisplaySeconds, setStageTimerDisplaySeconds] = useState(0);
  const stageTimerSessionRef = useRef<string | null>(null);

  // ─── Preflight ───
  const preflightPayload = useMemo(() => {
    if (typeof hub.courseId !== "number") return null;
    return {
      course_id: hub.courseId,
      topic: hub.effectiveTopic || undefined,
      study_unit: hub.selectedObjectiveGroup || undefined,
      module_name: hub.selectedObjectiveGroup || undefined,
      objective_scope: hub.objectiveScope,
      focus_objective_id: hub.selectedObjectiveId || undefined,
      learning_objectives:
        hub.scopedObjectives.length > 0
          ? hub.scopedObjectives.map((objective) => ({
              ...(objective.loCode ? { lo_code: objective.loCode } : {}),
              title: objective.title,
              status: objective.status,
              group: objective.groupName || undefined,
            }))
          : undefined,
      content_filter: {
        ...(hub.selectedPaths.length > 0 ? { folders: hub.selectedPaths } : {}),
        material_ids: hub.selectedMaterials,
        ...(hub.derivedVaultFolder ? { vault_folder: hub.derivedVaultFolder } : {}),
        accuracy_profile: hub.accuracyProfile,
        objective_scope: hub.objectiveScope,
        ...(hub.selectedObjectiveId ? { focus_objective_id: hub.selectedObjectiveId } : {}),
        web_search: false,
      },
    };
  }, [
    hub.accuracyProfile,
    hub.courseId,
    hub.derivedVaultFolder,
    hub.effectiveTopic,
    hub.objectiveScope,
    hub.scopedObjectives,
    hub.selectedMaterials,
    hub.selectedObjectiveGroup,
    hub.selectedObjectiveId,
    hub.selectedPaths,
  ]);

  const {
    data: preflight,
    isFetching: preflightLoading,
    error: preflightError,
  } = useQuery<TutorSessionPreflightResponse>({
    queryKey: [
      "tutor-session-preflight",
      JSON.stringify(preflightPayload || {}),
    ],
    queryFn: () => api.tutor.preflightSession(preflightPayload!),
    enabled:
      shellMode === "dashboard" &&
      !!preflightPayload &&
      hub.selectedMaterials.length > 0 &&
      !!hub.selectedObjectiveGroup,
    staleTime: 30 * 1000,
  });

  // ─── Config check ───
  const { data: configStatus } = useQuery<TutorConfigCheck>({
    queryKey: ["tutor-config-check"],
    queryFn: () => api.tutor.configCheck(),
    staleTime: 5 * 60 * 1000,
  });

  // ─── Project shell ───
  const { data: projectShell } = useQuery<TutorProjectShellResponse>({
    queryKey: ["tutor-project-shell", hub.courseId, activeSessionId],
    queryFn: () =>
      api.tutor.getProjectShell({
        course_id: hub.courseId!,
        ...(activeSessionId ? { session_id: activeSessionId } : {}),
      }),
    enabled: hasRestored && typeof hub.courseId === "number",
    staleTime: 30 * 1000,
  });

  const { data: projectStudioItems } = useQuery({
    queryKey: ["tutor-studio-restore", "project", hub.courseId, activeSessionId],
    queryFn: () =>
      api.tutor.restoreStudioItems({
        course_id: hub.courseId!,
        tutor_session_id: activeSessionId || undefined,
        scope: "project",
      }),
    enabled: hasRestored && typeof hub.courseId === "number",
    staleTime: 15 * 1000,
  });

  // ─── Apply session state from server ───
  const applySessionState = useCallback((session: TutorSessionWithTurns) => {
    setActiveSessionId(session.session_id);
    setShellMode("tutor");
    setShowSetup(false);
    setTurnCount(session.turn_count);
    setStartedAt(session.started_at);
    hub.setTopic(session.topic || "");
    hub.setCourseId(session.course_id ?? undefined);
    hub.setChainId(session.method_chain_id ?? undefined);
    setCurrentBlockIndex(session.current_block_index ?? 0);
    setChainBlocks(
      (session.chain_blocks || []).map((block) => ({
        ...block,
        category: block.category,
        description: block.description || "",
        duration: block.default_duration_min,
        facilitation_prompt: block.facilitation_prompt || "",
      }))
    );
    const materialIds = session.content_filter?.material_ids || [];
    hub.setSelectedMaterials(materialIds);
    writeTutorSelectedMaterialIds(materialIds);
    hub.setAccuracyProfile(
      normalizeTutorAccuracyProfile(session.content_filter?.accuracy_profile)
    );
    hub.setObjectiveScope(
      normalizeTutorObjectiveScope(session.content_filter?.objective_scope),
    );
    hub.setSelectedObjectiveId(String(session.content_filter?.focus_objective_id || ""));
    hub.setSelectedObjectiveGroup(
      String(
        session.content_filter?.map_of_contents?.module_name ||
          session.content_filter?.module_name ||
          ""
      )
    );
    if (typeof session.content_filter?.vault_folder === "string") {
      hub.setVaultFolder(session.content_filter.vault_folder);
    }
    setScholarStrategy(session.scholar_strategy || null);
    setStrategyFeedback(session.strategy_feedback || null);
    setStrategyNotes(session.strategy_feedback?.notes || "");
    if (session.artifacts_json) {
      try {
        const parsed = JSON.parse(session.artifacts_json);
        if (Array.isArray(parsed)) {
          setArtifacts(
            parsed
              .map((a: { type?: string; title?: string; content?: string; created_at?: string }) => {
                const type = normalizeArtifactType(a.type);
                if (!type) return null;
                return {
                  type,
                  title: a.title || "",
                  content: a.content || "",
                  createdAt: a.created_at || new Date().toISOString(),
                };
              })
              .filter((artifact): artifact is TutorArtifact => artifact !== null)
          );
        } else {
          setArtifacts([]);
        }
      } catch {
        setArtifacts([]);
      }
    } else {
      setArtifacts([]);
    }
    if (session.turns && session.turns.length > 0) {
      setRestoredTurns(session.turns.map((t) => ({ question: t.question, answer: t.answer })));
    } else {
      setRestoredTurns(undefined);
    }
    writeTutorActiveSessionId(session.session_id);
  }, [hub, setActiveSessionId, setRestoredTurns, setShellMode, setShowSetup]);

  // ─── Clear session ───
  const clearActiveSessionState = useCallback(() => {
    setActiveSessionId(null);
    setLatestCommittedAssistantMessage(null);
    setRestoredTurns(undefined);
    setArtifacts([]);
    setTurnCount(0);
    setStartedAt(null);
    setCurrentBlockIndex(0);
    setChainBlocks([]);
    setScholarStrategy(null);
    setStrategyFeedback(null);
    setStrategyNotes("");
    setShowSetup(false);
    setShowArtifacts(false);
    setShowEndConfirm(false);
    setShellMode("dashboard");
    clearTutorActiveSessionId();
  }, [setActiveSessionId, setRestoredTurns, setShellMode, setShowSetup]);

  // ─── Stage timer persistence ───
  const persistStageTimeSlice = useCallback(
    async (triggerSource: string, notes: Record<string, unknown>[] = []) => {
      if (!activeWorkflowId || !activeSessionId || !stageTimerStartedAt) return 0;
      const endTs = new Date().toISOString();
      const sliceSeconds = Math.max(
        0,
        Math.floor((Date.now() - new Date(stageTimerStartedAt).getTime()) / 1000),
      );
      await api.tutor.logWorkflowStageTime(activeWorkflowId, {
        stage: "tutor",
        start_ts: stageTimerStartedAt,
        end_ts: endTs,
        seconds_active: sliceSeconds,
        pause_count: stageTimerPauseCount,
        notes,
        trigger_source: triggerSource,
      });
      setStageTimerAccumulatedSeconds((prev) => prev + sliceSeconds);
      setStageTimerDisplaySeconds((prev) => prev + sliceSeconds);
      setStageTimerStartedAt(null);
      return sliceSeconds;
    },
    [activeSessionId, activeWorkflowId, stageTimerPauseCount, stageTimerStartedAt],
  );

  // ─── End session ───
  const endSessionById = useCallback(async (sessionId: string) => {
    if (sessionId === activeSessionId && stageTimerRunning && stageTimerStartedAt) {
      try {
        await persistStageTimeSlice("session_end", [
          { kind: "study_timer", session_id: sessionId, block_index: currentBlockIndex },
        ]);
      } catch {
        toast.error("Failed to persist final tutor study-time slice");
      }
    }
    await api.tutor.endSession(sessionId);
    if (sessionId === activeSessionId) {
      clearTutorActiveSessionId();
      clearActiveSessionState();
    }
    queryClient.invalidateQueries({ queryKey: ["tutor-sessions"] });
  }, [
    activeSessionId,
    clearActiveSessionState,
    currentBlockIndex,
    persistStageTimeSlice,
    queryClient,
    stageTimerRunning,
    stageTimerStartedAt,
  ]);

  const endSession = useCallback(async () => {
    if (!activeSessionId) return;
    try {
      await endSessionById(activeSessionId);
      toast.success("Session ended");
    } catch (err) {
      toast.error(`Failed to end session: ${err instanceof Error ? err.message : "Unknown"}`);
    }
  }, [activeSessionId, endSessionById]);

  // ─── Ship to Brain ───
  const shipToBrainAndEnd = useCallback(async () => {
    if (!activeSessionId) return;
    setIsShipping(true);
    try {
      const full = await api.tutor.getSession(activeSessionId);
      if (full.turns && full.turns.length > 0) {
        const lines: string[] = [
          `# Tutor: ${hub.topic || "Session"}`,
          `**Date:** ${new Date(startedAt || Date.now()).toLocaleDateString()}`,
          `**Turns:** ${turnCount}`,
          `**Artifacts:** ${artifacts.length}`,
          "",
          "---",
          "",
        ];
        for (const turn of full.turns) {
          lines.push(`## Q${turn.turn_number}`);
          lines.push(turn.question);
          lines.push("");
          if (turn.answer) {
            lines.push(`**Answer:**`);
            lines.push(turn.answer);
            lines.push("");
          }
        }
        const filename = `Tutor - ${(hub.topic || "Session").replace(/[^a-zA-Z0-9 ]/g, "").trim()}`;
        const path = `Study Sessions/${filename}.md`;
        await api.obsidian.append(path, lines.join("\n"));
      }
      setTimeout(() => {
        toast.success("Session shipped to Brain");
      }, 100);
      await endSession();
    } catch (err) {
      toast.error(`Ship failed: ${err instanceof Error ? err.message : "Unknown"}`);
    } finally {
      setIsShipping(false);
      setShowEndConfirm(false);
    }
  }, [activeSessionId, hub.topic, startedAt, turnCount, artifacts.length, endSession]);

  // ─── Start session ───
  const startSession = useCallback(async () => {
    setIsStarting(true);
    try {
      if (hub.objectiveScope === "single_focus" && !hub.selectedObjectiveId) {
        toast.error("Choose a focus objective before starting a single-focus Tutor session.");
        return null;
      }
      if (!preflightPayload) {
        toast.error("Select a course, objective scope, and materials before starting the Tutor.");
        return null;
      }
      let resolvedChainId = hub.chainId;
      if (!resolvedChainId && hub.customBlockIds.length > 0) {
        const customChain = await api.tutor.createCustomChain(
          hub.customBlockIds,
          `Custom ${hub.effectiveTopic || "Chain"}`,
        );
        resolvedChainId = customChain.id;
      }
      const preflightResult = await api.tutor.preflightSession(preflightPayload);
      if (preflightResult.blockers.length > 0) {
        toast.error(preflightResult.blockers[0].message);
        return null;
      }

      const session = await api.tutor.createSession({
        preflight_id: preflightResult.preflight_id,
        phase: "first_pass",
        mode: "Core",
        method_chain_id: resolvedChainId,
      });
      const full = await api.tutor.getSession(session.session_id);
      applySessionState(full);
      queryClient.invalidateQueries({ queryKey: ["tutor-chat-materials-all-enabled"] });
      setShowSetup(false);
      setShellMode("tutor");

      toast.success("Tutor session started");
      queryClient.invalidateQueries({ queryKey: ["tutor-sessions"] });
      return full;
    } catch (err) {
      toast.error(`Failed to start session: ${err instanceof Error ? err.message : "Unknown"}`);
      return null;
    } finally {
      setIsStarting(false);
    }
  }, [preflightPayload, hub.objectiveScope, hub.selectedObjectiveId, hub.chainId, hub.customBlockIds, hub.effectiveTopic, queryClient, applySessionState, setShellMode, setShowSetup]);

  // ─── Resume session ───
  const resumeSession = useCallback(
    async (sessionId: string) => {
      try {
        const session = await api.tutor.getSession(sessionId);
        applySessionState(session);
        setShellMode("tutor");
        toast.success("Session resumed");
      } catch (err) {
        toast.error(`Failed to resume session: ${err instanceof Error ? err.message : "Unknown"}`);
      }
    },
    [applySessionState, setShellMode]
  );

  // ─── Artifact handling ───
  const handleArtifactCreated = useCallback(
    async (artifact: { type: string; content: string; title?: string }) => {
      if (!activeSessionId) return;
      const artifactType = normalizeArtifactType(artifact.type);
      if (!artifactType) {
        toast.error(`Unsupported artifact type: ${artifact.type}`);
        return;
      }
      try {
        const result = await api.tutor.createArtifact(activeSessionId, {
          type: artifactType,
          content: artifact.content,
          title: artifact.title,
        });
        const newArtifact: TutorArtifact = {
          type: artifactType,
          title: artifact.title || `${artifactType} #${artifacts.length + 1}`,
          content: artifact.content,
          createdAt: new Date().toISOString(),
          cardId: result.card_id,
        };
        setArtifacts((prev) => [...prev, newArtifact]);
        setShowArtifacts(true);
        toast.success(
          `${artifactType.charAt(0).toUpperCase() + artifactType.slice(1)} created`
        );
      } catch (err) {
        toast.error(`Failed to create artifact: ${err instanceof Error ? err.message : "Unknown"}`);
      }
    },
    [activeSessionId, artifacts.length]
  );

  const handleStudioCapture = useCallback(
    async (capture: {
      content: string;
      title?: string;
      itemType?: string;
      target: "note" | "summary_board";
      sourceKind?: string;
      sourcePath?: string;
      sourceLocator?: Record<string, unknown>;
    }) => {
      if (typeof hub.courseId !== "number") {
        toast.error("Select a course before sending items to Studio.");
        return;
      }
      try {
        await api.tutor.captureStudioItem({
          course_id: hub.courseId,
          tutor_session_id: activeSessionId,
          scope: activeSessionId ? "session" : "project",
          item_type: capture.itemType || "note",
          title: capture.title,
          body_markdown: capture.content,
          source_kind: capture.sourceKind || "tutor_chat",
          source_path: capture.sourcePath,
          source_locator: capture.sourceLocator,
          status: capture.target === "summary_board" ? "boarded" : "captured",
        });
        setShellMode("studio");
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["tutor-studio-restore"] }),
          queryClient.invalidateQueries({ queryKey: ["tutor-project-shell"] }),
        ]);
        toast.success(
          capture.target === "summary_board"
            ? "Sent to Studio Summary Board"
            : "Sent to Studio Note",
        );
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to send item to Studio");
      }
    },
    [activeSessionId, hub.courseId, queryClient, setShellMode],
  );

  // ─── Block advancement ───
  const advanceBlock = useCallback(async () => {
    if (!activeSessionId) return;
    try {
      const result = await api.tutor.advanceBlock(activeSessionId);
      setCurrentBlockIndex(result.block_index);
      setTimerWarningShown(false);
      setTimerPaused(false);
      if (result.block_duration) {
        setBlockTimerSeconds(result.block_duration * 60);
      } else {
        setBlockTimerSeconds(null);
      }
      if (result.complete) {
        setBlockTimerSeconds(null);
        toast.success("Chain complete!");
      } else {
        toast.success(`Advanced to: ${result.block_name}`);
      }
      if (result.vault_write_status === "success") {
        toast.success("Note saved", { duration: 2000 });
      } else if (result.vault_write_status === "failed" || result.vault_write_status === "unavailable") {
        toast.warning("Vault note failed — Obsidian may not be running", { duration: 5000 });
      }
    } catch (err) {
      toast.error(`Failed to advance block: ${err instanceof Error ? err.message : "Unknown"}`);
    }
  }, [activeSessionId]);

  // ─── Delete artifacts ───
  const handleDeleteArtifacts = useCallback(
    async (sid: string, indexes: number[]) => {
      const result = await api.tutor.deleteArtifacts(sid, indexes);
      const skippedIndexes = new Set(result.skipped_indexes || []);
      const deletedIndexes = indexes.filter((index) => !skippedIndexes.has(index));
      if (sid === activeSessionId) {
        setArtifacts((prev) => {
          const sorted = [...deletedIndexes].sort((a, b) => b - a);
          const next = [...prev];
          for (const i of sorted) {
            if (i >= 0 && i < next.length) next.splice(i, 1);
          }
          return next;
        });
      }
      queryClient.invalidateQueries({ queryKey: ["tutor-sessions"] });
      return result;
    },
    [activeSessionId, queryClient]
  );

  // ─── Strategy feedback ───
  const saveScholarStrategyFeedback = useCallback(async (
    field: "pacing" | "scaffolds" | "retrievalPressure" | "explanationDensity",
    value: string,
  ) => {
    if (!activeSessionId) return;
    const nextFeedback: TutorStrategyFeedback = {
      ...(strategyFeedback || {}),
      [field]: value,
      notes: strategyNotes || null,
    };
    setSavingStrategyFeedback(true);
    try {
      const result = await api.tutor.saveStrategyFeedback(activeSessionId, nextFeedback);
      setStrategyFeedback(result.strategy_feedback);
      setStrategyNotes(result.strategy_feedback.notes || "");
    } catch {
      toast.error("Failed to save Scholar strategy feedback");
    } finally {
      setSavingStrategyFeedback(false);
    }
  }, [activeSessionId, strategyFeedback, strategyNotes]);

  const saveScholarStrategyNotes = useCallback(async () => {
    if (!activeSessionId) return;
    const nextFeedback: TutorStrategyFeedback = {
      ...(strategyFeedback || {}),
      notes: strategyNotes || null,
    };
    setSavingStrategyFeedback(true);
    try {
      const result = await api.tutor.saveStrategyFeedback(activeSessionId, nextFeedback);
      setStrategyFeedback(result.strategy_feedback);
      toast.success("Scholar strategy feedback saved");
    } catch {
      toast.error("Failed to save Scholar strategy notes");
    } finally {
      setSavingStrategyFeedback(false);
    }
  }, [activeSessionId, strategyFeedback, strategyNotes]);

  // ─── Stage timer toggle ───
  const toggleWorkflowStudyTimer = useCallback(async () => {
    if (!activeWorkflowId) {
      toast.error("Launch Tutor from a study plan to record study time.");
      return;
    }
    try {
      if (stageTimerRunning) {
        await persistStageTimeSlice("manual_pause", [
          { kind: "study_timer", session_id: activeSessionId, block_index: currentBlockIndex },
        ]);
        setStageTimerPauseCount((prev) => prev + 1);
        setStageTimerRunning(false);
        toast.success("Tutor study timer paused");
      } else {
        setStageTimerStartedAt(new Date().toISOString());
        setStageTimerRunning(true);
        toast.success("Tutor study timer resumed");
      }
    } catch (err) {
      toast.error(
        `Failed to update study timer: ${err instanceof Error ? err.message : "Unknown"}`,
      );
    }
  }, [
    activeSessionId,
    activeWorkflowId,
    currentBlockIndex,
    persistStageTimeSlice,
    stageTimerRunning,
  ]);

  // ─── Block timer countdown ───
  useEffect(() => {
    if (blockTimerSeconds === null || blockTimerSeconds <= 0 || timerPaused) return;
    const interval = setInterval(() => {
      setBlockTimerSeconds((prev) => (prev === null ? null : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [blockTimerSeconds, timerPaused]);

  useEffect(() => {
    if (blockTimerSeconds !== 60 || timerPaused || timerWarningShown) return;
    toast.info("1 minute remaining on this block", { duration: 5000 });
    setTimerWarningShown(true);
  }, [blockTimerSeconds, timerPaused, timerWarningShown]);

  useEffect(() => {
    if (chainBlocks.length > 0 && activeSessionId && currentBlockIndex < chainBlocks.length) {
      const block = chainBlocks[currentBlockIndex];
      if (block.duration && blockTimerSeconds === null) {
        setBlockTimerSeconds(block.duration * 60);
      }
    }
  }, [chainBlocks, activeSessionId, currentBlockIndex]);

  // ─── Stage timer initialization ───
  useEffect(() => {
    if (shellMode !== "tutor" || !activeSessionId) {
      stageTimerSessionRef.current = null;
      setStageTimerRunning(false);
      setStageTimerStartedAt(null);
      setStageTimerDisplaySeconds(stageTimerAccumulatedSeconds);
      return;
    }
    if (stageTimerSessionRef.current === activeSessionId) return;
    stageTimerSessionRef.current = activeSessionId;
    const existingLogs = (activeWorkflowDetail?.stage_time_logs || []).filter(
      (log) => log.stage === "tutor",
    );
    const accumulated = existingLogs.reduce((sum, log) => sum + (log.seconds_active || 0), 0);
    const pauses = existingLogs.reduce((sum, log) => sum + (log.pause_count || 0), 0);
    setStageTimerAccumulatedSeconds(accumulated);
    setStageTimerPauseCount(pauses);
    setStageTimerDisplaySeconds(accumulated);
    if (activeWorkflowId) {
      setStageTimerStartedAt(new Date().toISOString());
      setStageTimerRunning(true);
    }
  }, [
    activeSessionId,
    activeWorkflowDetail?.stage_time_logs,
    activeWorkflowId,
    shellMode,
    stageTimerAccumulatedSeconds,
  ]);

  useEffect(() => {
    if (!stageTimerRunning || !stageTimerStartedAt) {
      setStageTimerDisplaySeconds(stageTimerAccumulatedSeconds);
      return;
    }
    const updateDisplay = () => {
      const elapsed =
        Math.max(0, Math.floor((Date.now() - new Date(stageTimerStartedAt).getTime()) / 1000)) +
        stageTimerAccumulatedSeconds;
      setStageTimerDisplaySeconds(elapsed);
    };
    updateDisplay();
    const interval = window.setInterval(updateDisplay, 1000);
    return () => window.clearInterval(interval);
  }, [stageTimerAccumulatedSeconds, stageTimerRunning, stageTimerStartedAt]);

  // ─── Derived state ───
  const formatTimer = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };
  const currentBlock =
    chainBlocks.length > 0 && currentBlockIndex < chainBlocks.length
      ? chainBlocks[currentBlockIndex]
      : null;
  const hasChain = chainBlocks.length > 0;
  const isChainComplete = hasChain && currentBlockIndex >= chainBlocks.length;
  const progressCount = hasChain ? Math.min(currentBlockIndex + 1, chainBlocks.length) : 0;
  const promotedStudioItems =
    projectStudioItems?.items.filter((item) => item.status === "promoted") || [];
  const isTutorSessionView = shellMode === "tutor" && Boolean(activeSessionId);

  return {
    // Session state
    currentBlockIndex,
    chainBlocks,
    artifacts,
    setArtifacts,
    turnCount,
    setTurnCount,
    startedAt,
    showArtifacts,
    setShowArtifacts,
    scholarStrategyExpanded,
    setScholarStrategyExpanded,
    showEndConfirm,
    setShowEndConfirm,
    isShipping,
    isStarting,
    blockTimerSeconds,
    timerPaused,
    setTimerPaused,
    scholarStrategy,
    strategyFeedback,
    strategyNotes,
    setStrategyNotes,
    savingStrategyFeedback,
    latestCommittedAssistantMessage,
    setLatestCommittedAssistantMessage,

    // Stage timer
    stageTimerRunning,
    stageTimerStartedAt,
    stageTimerPauseCount,
    stageTimerDisplaySeconds,

    // Preflight
    preflight,
    preflightLoading,
    preflightError,
    preflightPayload,
    configStatus,

    // Project shell
    projectShell,
    projectStudioItems,

    // Derived
    currentBlock,
    hasChain,
    isChainComplete,
    progressCount,
    formatTimer,
    promotedStudioItems,
    isTutorSessionView,

    // Actions
    applySessionState,
    clearActiveSessionState,
    persistStageTimeSlice,
    endSessionById,
    endSession,
    shipToBrainAndEnd,
    startSession,
    resumeSession,
    handleArtifactCreated,
    handleStudioCapture,
    advanceBlock,
    handleDeleteArtifacts,
    saveScholarStrategyFeedback,
    saveScholarStrategyNotes,
    toggleWorkflowStudyTimer,
  };
}

export type UseTutorSessionReturn = ReturnType<typeof useTutorSession>;
