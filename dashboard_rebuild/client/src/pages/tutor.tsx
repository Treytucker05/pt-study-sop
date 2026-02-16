import Layout from "@/components/layout";
import { Card } from "@/components/ui/card";
import { useState, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { TutorMode, TutorSessionSummary, TutorTemplateChain, TutorSessionWithTurns, TutorConfigCheck } from "@/lib/api";
import { ContentFilter } from "@/components/ContentFilter";
import { TutorWizard } from "@/components/TutorWizard";
import { TutorChat } from "@/components/TutorChat";
import { TutorArtifacts, type TutorArtifact } from "@/components/TutorArtifacts";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  PanelRightClose,
  PanelRightOpen,
  Clock,
  MessageSquare,
  Settings2,
  FolderOpen,
  Check,
  X,
  Trash2,
  Square,
  Send,
  Loader2,
  AlertTriangle,
  Timer,
  SkipForward,
  Plus,
} from "lucide-react";
import {
  TEXT_BODY,
  TEXT_MUTED,
  TEXT_BADGE,
  ICON_SM,
} from "@/lib/theme";

export default function Tutor() {
  const queryClient = useQueryClient();
  const tutorMaterialStorageKey = "tutor.selected_material_ids.v1";
  const tutorWizardStorageKey = "tutor.wizard.state.v1";
  const tutorActiveSessionKey = "tutor.active_session.v1";

  // Session state
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [hasRestored, setHasRestored] = useState(false);

  // Filter state
  const [courseId, setCourseId] = useState<number | undefined>();
  const [selectedMaterials, setSelectedMaterials] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem(tutorMaterialStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.filter((v) => typeof v === "number");
      }
    } catch { /* corrupted */ }
    return [];
  });
  const [mode, setMode] = useState<TutorMode>("Core");
  const [chainId, setChainId] = useState<number | undefined>();
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [chainBlocks, setChainBlocks] = useState<TutorTemplateChain["blocks"]>([]);
  const [customBlockIds, setCustomBlockIds] = useState<number[]>([]);
  const [topic, setTopic] = useState("");
  const [model, setModel] = useState("codex");
  const [webSearch, setWebSearch] = useState(false);

  // Vault file picker
  const [selectedPaths, setSelectedPaths] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("tutor.vault_selected.v1");
      if (saved) {
        const p = JSON.parse(saved);
        if (Array.isArray(p)) return p;
      }
    } catch { /* corrupted */ }
    return [];
  });

  // Artifacts
  const [artifacts, setArtifacts] = useState<TutorArtifact[]>([]);
  const [turnCount, setTurnCount] = useState(0);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [showArtifacts, setShowArtifacts] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [isShipping, setIsShipping] = useState(false);

  // Block timer
  const [blockTimerSeconds, setBlockTimerSeconds] = useState<number | null>(null);
  const [timerWarningShown, setTimerWarningShown] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(tutorMaterialStorageKey, JSON.stringify(selectedMaterials));
    } catch { /* ignore */ }
  }, [tutorMaterialStorageKey, selectedMaterials]);

  useEffect(() => {
    try {
      localStorage.setItem(
        tutorWizardStorageKey,
        JSON.stringify({
          courseId,
          topic,
          selectedMaterials,
          chainId,
          customBlockIds,
          mode,
          model,
          webSearch,
          selectedPaths,
        }),
      );
    } catch (error) {
      void error;
    }
  }, [
    tutorWizardStorageKey,
    courseId,
    topic,
    selectedMaterials,
    chainId,
    customBlockIds,
    mode,
    model,
    webSearch,
    selectedPaths,
  ]);

  // Recent sessions
  const { data: recentSessions = [] } = useQuery<TutorSessionSummary[]>({
    queryKey: ["tutor-sessions"],
    queryFn: () => api.tutor.listSessions({ limit: 10 }),
  });

  // Config check (runs once on mount)
  const { data: configStatus } = useQuery<TutorConfigCheck>({
    queryKey: ["tutor-config-check"],
    queryFn: () => api.tutor.configCheck(),
    staleTime: 5 * 60 * 1000,
  });

  const applySessionState = useCallback((session: TutorSessionWithTurns) => {
    setActiveSessionId(session.session_id);
    setTurnCount(session.turn_count);
    setStartedAt(session.started_at);
    setMode(session.mode);
    setTopic(session.topic || "");
    setCourseId(session.course_id ?? undefined);
    setChainId(session.method_chain_id ?? undefined);
    setCurrentBlockIndex(session.current_block_index ?? 0);
    setChainBlocks(
      (session.chain_blocks || []).map((block) => ({
        id: block.id,
        name: block.name,
        category: block.category,
        description: block.description || "",
        duration: block.default_duration_min,
        facilitation_prompt: block.facilitation_prompt || "",
      }))
    );
    if (session.content_filter?.material_ids) {
      setSelectedMaterials(session.content_filter.material_ids);
    }
    try {
      localStorage.setItem(
        tutorMaterialStorageKey,
        JSON.stringify(session.content_filter?.material_ids || []),
      );
    } catch { /* ignore */ }
    if (session.content_filter?.model) {
      setModel(session.content_filter.model);
    }
    setWebSearch(Boolean(session.content_filter?.web_search));
    if (session.artifacts_json) {
      try {
        const parsed = JSON.parse(session.artifacts_json);
        if (Array.isArray(parsed)) {
          setArtifacts(
            parsed.map((a: { type: string; title: string; content?: string; created_at: string }) => ({
              type: a.type as "note" | "card" | "map",
              title: a.title,
              content: a.content || "",
              createdAt: a.created_at,
            }))
          );
        }
      } catch {
        setArtifacts([]);
      }
    }
    try {
      localStorage.setItem(tutorActiveSessionKey, session.session_id);
    } catch (error) {
      void error;
    }
  }, [tutorMaterialStorageKey, tutorActiveSessionKey]);

  const startSession = useCallback(async () => {
    setIsStarting(true);
    try {
      let resolvedChainId = chainId;
      if (!resolvedChainId && customBlockIds.length > 0) {
        const customChain = await api.tutor.createCustomChain(customBlockIds, `Custom ${topic || "Chain"}`);
        resolvedChainId = customChain.id;
      }

      const session = await api.tutor.createSession({
        course_id: courseId,
        phase: "first_pass",
        mode,
        topic: topic || undefined,
        content_filter: {
          ...(selectedPaths.length > 0 ? { folders: selectedPaths } : {}),
          ...(selectedMaterials.length > 0 ? { material_ids: selectedMaterials } : {}),
          model,
          ...(webSearch ? { web_search: true } : {}),
        },
        method_chain_id: resolvedChainId,
      });
      setActiveSessionId(session.session_id);
      try {
        localStorage.setItem(tutorActiveSessionKey, session.session_id);
      } catch (error) {
        void error;
      }
      setStartedAt(session.started_at);
      setArtifacts([]);
      setTurnCount(0);
      setCurrentBlockIndex(session.current_block_index ?? 0);
      setShowSetup(false);

      if (resolvedChainId) {
        const full = await api.tutor.getSession(session.session_id);
        if (full.chain_blocks) {
          setChainBlocks(full.chain_blocks.map((b) => ({
            id: b.id,
            name: b.name,
            category: b.category,
            description: b.description || "",
            duration: b.default_duration_min,
            facilitation_prompt: b.facilitation_prompt || "",
          })));
        }
      } else {
        setChainBlocks([]);
      }

      toast.success("Tutor session started");
      queryClient.invalidateQueries({ queryKey: ["tutor-sessions"] });
    } catch (err) {
      toast.error(`Failed to start session: ${err instanceof Error ? err.message : "Unknown"}`);
    } finally {
      setIsStarting(false);
    }
  }, [courseId, mode, topic, selectedPaths, selectedMaterials, model, webSearch, chainId, customBlockIds, queryClient]);

  const endSession = useCallback(async () => {
    if (!activeSessionId) return;
    try {
      await api.tutor.endSession(activeSessionId);
      toast.success("Session ended");
      setActiveSessionId(null);
      try {
        localStorage.removeItem(tutorActiveSessionKey);
      } catch (error) {
        void error;
      }
      setArtifacts([]);
      setTurnCount(0);
      setStartedAt(null);
      setCurrentBlockIndex(0);
      setChainBlocks([]);
      setShowArtifacts(false);
      queryClient.invalidateQueries({ queryKey: ["tutor-sessions"] });
    } catch (err) {
      toast.error(`Failed to end session: ${err instanceof Error ? err.message : "Unknown"}`);
    }
  }, [activeSessionId, queryClient]);

  const shipToBrainAndEnd = useCallback(async () => {
    if (!activeSessionId) return;
    setIsShipping(true);
    try {
      const full = await api.tutor.getSession(activeSessionId);
      if (full.turns && full.turns.length > 0) {
        const lines: string[] = [
          `# Tutor: ${topic || mode}`,
          `**Date:** ${new Date(startedAt || Date.now()).toLocaleDateString()}`,
          `**Mode:** ${mode} | **Turns:** ${turnCount}`,
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
        const filename = `Tutor - ${(topic || mode).replace(/[^a-zA-Z0-9 ]/g, "").trim()}`;
        const path = `Study Sessions/${filename}.md`;
        await api.obsidian.append(path, lines.join("\n"));
      }
      toast.success("Session shipped to Brain");
    } catch (err) {
      toast.error(`Ship failed: ${err instanceof Error ? err.message : "Unknown"}`);
    } finally {
      setIsShipping(false);
    }
    await endSession();
    setShowEndConfirm(false);
  }, [activeSessionId, topic, mode, startedAt, turnCount, artifacts.length, endSession]);

  const handleArtifactCreated = useCallback(
    async (artifact: { type: string; content: string; title?: string }) => {
      if (!activeSessionId) return;
      try {
        const result = await api.tutor.createArtifact(activeSessionId, {
          type: artifact.type as "note" | "card" | "map",
          content: artifact.content,
          title: artifact.title,
        });
        const newArtifact: TutorArtifact = {
          type: artifact.type as "note" | "card" | "map",
          title: artifact.title || `${artifact.type} #${artifacts.length + 1}`,
          content: artifact.content,
          createdAt: new Date().toISOString(),
          cardId: result.card_id,
        };
        setArtifacts((prev) => [...prev, newArtifact]);
        setShowArtifacts(true);
        toast.success(`${artifact.type.charAt(0).toUpperCase() + artifact.type.slice(1)} created`);
      } catch (err) {
        toast.error(`Failed to create artifact: ${err instanceof Error ? err.message : "Unknown"}`);
      }
    },
    [activeSessionId, artifacts.length]
  );

  const advanceBlock = useCallback(async () => {
    if (!activeSessionId) return;
    try {
      const result = await api.tutor.advanceBlock(activeSessionId);
      setCurrentBlockIndex(result.block_index);
      setTimerWarningShown(false);
      // Reset timer for new block
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
    } catch (err) {
      toast.error(`Failed to advance block: ${err instanceof Error ? err.message : "Unknown"}`);
    }
  }, [activeSessionId]);

  // Block timer countdown
  useEffect(() => {
    if (blockTimerSeconds === null || blockTimerSeconds <= 0) return;
    const interval = setInterval(() => {
      setBlockTimerSeconds((prev) => {
        if (prev === null) return null;
        const next = prev - 1;
        if (next === 60 && !timerWarningShown) {
          toast.info("1 minute remaining on this block", { duration: 5000 });
          setTimerWarningShown(true);
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [blockTimerSeconds, timerWarningShown]);

  // Start timer when session begins with a chain
  useEffect(() => {
    if (chainBlocks.length > 0 && activeSessionId && currentBlockIndex < chainBlocks.length) {
      const block = chainBlocks[currentBlockIndex];
      if (block.duration && blockTimerSeconds === null) {
        setBlockTimerSeconds(block.duration * 60);
      }
    }
  }, [chainBlocks, activeSessionId, currentBlockIndex]);

  const handleDeleteArtifacts = useCallback(
    async (sid: string, indexes: number[]) => {
      await api.tutor.deleteArtifacts(sid, indexes);
      setArtifacts((prev) => {
        const sorted = [...indexes].sort((a, b) => b - a);
        const next = [...prev];
        for (const i of sorted) {
          if (i >= 0 && i < next.length) next.splice(i, 1);
        }
        return next;
      });
    },
    []
  );

  const resumeSession = useCallback(
    async (sessionId: string) => {
      try {
        const session = await api.tutor.getSession(sessionId);
        applySessionState(session);
        toast.success("Session resumed");
      } catch (err) {
        toast.error(`Failed to resume session: ${err instanceof Error ? err.message : "Unknown"}`);
      }
    },
    [applySessionState]
  );

  useEffect(() => {
    if (hasRestored) return;
    setHasRestored(true);

    const restore = async () => {
      let resumed = false;
      let restoredCourseId = false;
      try {
        const savedSessionId = localStorage.getItem(tutorActiveSessionKey);
        if (savedSessionId) {
          const session = await api.tutor.getSession(savedSessionId);
          if (session.status === "active") {
            applySessionState(session);
            resumed = true;
          } else {
            localStorage.removeItem(tutorActiveSessionKey);
          }
        }
      } catch (error) {
        void error;
        try {
          localStorage.removeItem(tutorActiveSessionKey);
        } catch (innerError) {
          void innerError;
        }
      }

      if (resumed) return;

      try {
        const saved = localStorage.getItem(tutorWizardStorageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (typeof parsed?.courseId === "number") {
            setCourseId(parsed.courseId);
            restoredCourseId = true;
          }
          if (typeof parsed?.topic === "string") setTopic(parsed.topic);
          if (Array.isArray(parsed?.selectedMaterials)) {
            setSelectedMaterials(parsed.selectedMaterials.filter((v: unknown) => typeof v === "number"));
          }
          if (typeof parsed?.chainId === "number") setChainId(parsed.chainId);
          if (Array.isArray(parsed?.customBlockIds)) {
            setCustomBlockIds(parsed.customBlockIds.filter((v: unknown) => typeof v === "number"));
          }
          if (typeof parsed?.mode === "string") setMode(parsed.mode);
          if (typeof parsed?.model === "string") setModel(parsed.model);
          if (typeof parsed?.webSearch === "boolean") setWebSearch(parsed.webSearch);
          if (Array.isArray(parsed?.selectedPaths)) {
            setSelectedPaths(parsed.selectedPaths.filter((v: unknown) => typeof v === "string"));
          }
        }
      } catch (error) {
        void error;
      }

      if (restoredCourseId) return;

      try {
        const { currentCourse } = await api.studyWheel.getCurrentCourse();
        if (typeof currentCourse?.id === "number") {
          setCourseId((prev) => (typeof prev === "number" ? prev : currentCourse.id));
        }
      } catch (error) {
        void error;
      }
    };

    void restore();
  }, [
    applySessionState,
    hasRestored,
    tutorActiveSessionKey,
    tutorWizardStorageKey,
  ]);

  // ─── SETUP VIEW ─── (no active session)
  if (!activeSessionId && !showSetup) {
    return (
      <Layout>
        <div className="flex flex-col h-[calc(100vh-140px)]">
          <TutorWizard
            courseId={courseId}
            setCourseId={setCourseId}
            selectedMaterials={selectedMaterials}
            setSelectedMaterials={setSelectedMaterials}
            topic={topic}
            setTopic={setTopic}
            chainId={chainId}
            setChainId={setChainId}
            customBlockIds={customBlockIds}
            setCustomBlockIds={setCustomBlockIds}
            mode={mode}
            setMode={setMode}
            model={model}
            setModel={setModel}
            webSearch={webSearch}
            setWebSearch={setWebSearch}
            onStartSession={startSession}
            isStarting={isStarting}
            recentSessions={recentSessions}
            onResumeSession={resumeSession}
          />
        </div>
      </Layout>
    );
  }

  // Setup overlay during active session (toggle setup panel)
  if (showSetup && activeSessionId) {
    return (
      <Layout>
        <div className="flex flex-col h-[calc(100vh-140px)]">
          <div className="shrink-0 flex items-center gap-3 px-4 py-2 bg-black/60 border-b-2 border-primary/30">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSetup(false)}
              className="rounded-none font-arcade text-xs text-primary h-8 px-3"
            >
              BACK TO CHAT
            </Button>
            <span className="font-terminal text-base text-muted-foreground">Editing session settings</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto py-6 px-4">
              <Card className="bg-black/40 border-[3px] border-double border-primary rounded-none overflow-hidden">
                <ContentFilter
                  courseId={courseId}
                  setCourseId={setCourseId}
                  selectedMaterials={selectedMaterials}
                  setSelectedMaterials={setSelectedMaterials}
                  mode={mode}
                  setMode={setMode}
                  chainId={chainId}
                  setChainId={setChainId}
                  customBlockIds={customBlockIds}
                  setCustomBlockIds={setCustomBlockIds}
                  topic={topic}
                  setTopic={setTopic}
                  model={model}
                  setModel={setModel}
                  webSearch={webSearch}
                  setWebSearch={setWebSearch}
                  onStartSession={startSession}
                  isStarting={isStarting}
                  hasActiveSession={true}
                />
              </Card>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // ─── SESSION VIEW ─── (active session, full-screen chat)
  const formatTimer = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-140px)]">
        {/* Config warning banner */}
        {configStatus && !configStatus.ok && (
          <div className="shrink-0 flex items-center gap-2 px-4 py-1.5 bg-yellow-900/30 border-b border-yellow-400/30">
            <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />
            <span className="font-terminal text-xs text-yellow-400/80">
              {configStatus.issues.join(" · ")}
            </span>
          </div>
        )}

        {/* Session status bar */}
        <div className="shrink-0 flex items-center gap-3 px-4 py-2 bg-black/60 border-b-2 border-primary/30">
          <Badge variant="outline" className={`${TEXT_BADGE} h-6 px-2 text-primary border-primary/50`}>
            {mode}
          </Badge>
          {topic && (
            <span className="font-terminal text-base text-foreground truncate max-w-[300px]">
              {topic}
            </span>
          )}

          {/* Block timer */}
          {blockTimerSeconds !== null && blockTimerSeconds > 0 && (
            <div className={`flex items-center gap-1 font-terminal text-sm ${
              blockTimerSeconds <= 60 ? "text-red-400 animate-pulse" : "text-primary/70"
            }`}>
              <Timer className="w-3.5 h-3.5" />
              {formatTimer(blockTimerSeconds)}
              <button
                onClick={() => setBlockTimerSeconds(null)}
                className="text-muted-foreground/50 hover:text-muted-foreground ml-0.5"
                title="Dismiss timer"
              >
                <X className="w-3 h-3" />
              </button>
              <button
                onClick={() => setBlockTimerSeconds((p) => (p ?? 0) + 300)}
                className="text-muted-foreground/50 hover:text-primary ml-0.5"
                title="Add 5 minutes"
              >
                <Plus className="w-3 h-3" />
              </button>
              <button
                onClick={advanceBlock}
                className="text-muted-foreground/50 hover:text-primary ml-0.5"
                title="Skip to next block"
              >
                <SkipForward className="w-3 h-3" />
              </button>
            </div>
          )}

          <div className={`flex items-center gap-3 ${TEXT_MUTED} ml-auto`}>
            <span className="flex items-center gap-1">
              <MessageSquare className={ICON_SM} />
              {turnCount}
            </span>
            {startedAt && (
              <span className="flex items-center gap-1">
                <Clock className={ICON_SM} />
                {new Date(startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}

            {/* Settings toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSetup(true)}
              className="h-7 w-7 p-0 rounded-none text-muted-foreground hover:text-primary"
              title="Session settings"
            >
              <Settings2 className="w-4 h-4" />
            </Button>

            {/* Artifacts toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowArtifacts(!showArtifacts)}
              className={`h-7 px-2 rounded-none font-terminal text-sm gap-1 ${
                showArtifacts ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary"
              }`}
              title="Toggle artifacts panel"
            >
              {showArtifacts ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
              {artifacts.length > 0 && (
                <Badge variant="outline" className="text-xs h-5 px-1 rounded-none">
                  {artifacts.length}
                </Badge>
              )}
            </Button>

            <div className="w-px h-5 bg-primary/20" />

            {/* End session */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowEndConfirm(true)}
              className="h-7 px-2 rounded-none font-terminal text-sm text-red-400/70 hover:text-red-400 hover:bg-red-400/10 gap-1"
              title="End session"
            >
              <Square className="w-3.5 h-3.5" />
              END
            </Button>
          </div>
        </div>

        {/* Main content: Chat (+ optional artifacts panel) */}
        <div className="flex-1 flex min-h-0">
          <div className="flex-1 bg-zinc-950/80 border-x-2 border-primary/20 flex flex-col min-w-0 relative">
            <TutorChat
              sessionId={activeSessionId}
              engine={undefined}
              onArtifactCreated={handleArtifactCreated}
              onSessionEnd={endSession}
              chainBlocks={chainBlocks}
              currentBlockIndex={currentBlockIndex}
              onAdvanceBlock={advanceBlock}
            />

            {showEndConfirm && (
              <div className="absolute inset-x-0 bottom-0 z-50 bg-black/95 border-t-2 border-primary/50 p-4">
                <div className="max-w-md mx-auto space-y-3">
                  <div className="font-arcade text-sm text-primary tracking-wider">SESSION COMPLETE</div>
                  <div className="flex items-center gap-4 font-terminal text-xs text-muted-foreground">
                    <span>{mode}</span>
                    <span className="text-foreground">{topic || "No topic"}</span>
                    <span>{turnCount} turns</span>
                    {artifacts.length > 0 && <span>{artifacts.length} artifacts</span>}
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      onClick={shipToBrainAndEnd}
                      disabled={isShipping}
                      className="rounded-none font-arcade text-xs bg-primary/10 hover:bg-primary/20 border-2 border-primary text-primary gap-1.5 h-9 px-4"
                    >
                      {isShipping ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      {isShipping ? "SHIPPING..." : "SHIP TO BRAIN"}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => { endSession(); setShowEndConfirm(false); }}
                      disabled={isShipping}
                      className="rounded-none font-terminal text-xs text-muted-foreground hover:text-foreground h-9 px-3"
                    >
                      END WITHOUT SAVING
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setShowEndConfirm(false)}
                      disabled={isShipping}
                      className="rounded-none font-terminal text-xs text-muted-foreground hover:text-foreground h-9 px-3 ml-auto"
                    >
                      CANCEL
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Artifacts drawer — collapsible right panel */}
          {showArtifacts && (
            <div className="w-80 shrink-0 bg-black/40 border-l-2 border-primary/30 overflow-hidden">
              <TutorArtifacts
                sessionId={activeSessionId}
                artifacts={artifacts}
                turnCount={turnCount}
                mode={mode}
                topic={topic}
                startedAt={startedAt}
                onCreateArtifact={handleArtifactCreated}
                recentSessions={recentSessions}
                onResumeSession={resumeSession}
                onDeleteArtifacts={handleDeleteArtifacts}
              />
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

// ─── Recent Session Card (for setup view) ───

function RecentSessionCard({
  session: s,
  onResume,
}: {
  session: TutorSessionSummary;
  onResume: (id: string) => void;
}) {
  const queryClient = useQueryClient();
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleDelete = async () => {
    try {
      await api.tutor.deleteSession(s.session_id);
      toast.success("Session deleted");
      queryClient.invalidateQueries({ queryKey: ["tutor-sessions"] });
    } catch (err) {
      toast.error(`Delete failed: ${err instanceof Error ? err.message : "Unknown"}`);
    }
    setDeleteConfirm(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const full = await api.tutor.getSession(s.session_id);
      if (!full.turns || full.turns.length === 0) {
        toast.error("No turns to save");
        return;
      }
      const lines: string[] = [
        `# Tutor: ${s.topic || s.mode}`,
        `**Date:** ${new Date(s.started_at).toLocaleDateString()}`,
        `**Mode:** ${s.mode} | **Turns:** ${s.turn_count}`,
        "", "---", "",
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
      const filename = `Tutor - ${(s.topic || s.mode).replace(/[^a-zA-Z0-9 ]/g, "").trim()}`;
      await api.obsidian.append(`Study Sessions/${filename}.md`, lines.join("\n"));
      toast.success("Saved to Obsidian");
    } catch (err) {
      toast.error(`Save failed: ${err instanceof Error ? err.message : "Unknown"}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border-[3px] border-double border-muted-foreground/10 hover:border-muted-foreground/30 transition-colors">
      <button
        onClick={() => onResume(s.session_id)}
        className="w-full text-left px-3 py-2.5"
      >
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={`${TEXT_BADGE} h-5 px-1.5 shrink-0 ${
              s.status === "active" ? "text-green-400 border-green-400/50" : "text-muted-foreground"
            }`}
          >
            {s.status === "active" ? "LIVE" : "DONE"}
          </Badge>
          <span className="font-terminal text-sm truncate flex-1">{s.topic || s.mode}</span>
        </div>
        <div className={`flex items-center gap-2 mt-1.5 ${TEXT_MUTED}`}>
          <span className="flex items-center gap-1">
            <MessageSquare className={ICON_SM} />
            {s.turn_count}
          </span>
          <span className="flex items-center gap-1">
            <Clock className={ICON_SM} />
            {new Date(s.started_at).toLocaleDateString()}
          </span>
          <Badge variant="outline" className={`${TEXT_BADGE} h-4 px-1 ml-auto`}>
            {s.mode}
          </Badge>
        </div>
      </button>

      <div className="flex items-center border-t border-primary/20 px-2 py-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-3 rounded-none text-muted-foreground hover:text-primary font-terminal text-sm"
          disabled={saving}
          onClick={handleSave}
        >
          <FolderOpen className={`${ICON_SM} mr-1`} />
          {saving ? "SAVING..." : "SAVE"}
        </Button>
        <div className="ml-auto">
          {deleteConfirm ? (
            <div className="flex items-center gap-0.5">
              <span className="font-terminal text-sm text-red-400 mr-1">Delete?</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 rounded-none text-red-400 hover:text-red-300 hover:bg-red-400/10"
                onClick={handleDelete}
              >
                <Check className={ICON_SM} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 rounded-none text-muted-foreground hover:text-foreground"
                onClick={() => setDeleteConfirm(false)}
              >
                <X className={ICON_SM} />
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 rounded-none text-muted-foreground hover:text-red-400"
              onClick={() => setDeleteConfirm(true)}
            >
              <Trash2 className={ICON_SM} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
