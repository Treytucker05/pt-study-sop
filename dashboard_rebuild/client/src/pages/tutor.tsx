import Layout from "@/components/layout";
import { Card } from "@/components/ui/card";
import { useState, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  Material,
  TutorAccuracyProfile,
  TutorMode,
  TutorSessionSummary,
  TutorTemplateChain,
  TutorSessionWithTurns,
  TutorConfigCheck,
} from "@/lib/api";
import { ContentFilter } from "@/components/ContentFilter";
import { TutorWizard } from "@/components/TutorWizard";
import { TutorChat } from "@/components/TutorChat";
import { TutorArtifacts, type TutorArtifact } from "@/components/TutorArtifacts";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Bot,
  PanelRightClose,
  PanelRightOpen,
  Clock,
  MessageSquare,
  Eye,
  EyeOff,
  Settings2,
  ListChecks,
  FileText,
  CreditCard,
  Map,
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
  CheckCircle2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  TEXT_MUTED,
  TEXT_BADGE,
  ICON_SM,
} from "@/lib/theme";

function parseFacilitationSteps(prompt: string | undefined | null): string[] {
  if (!prompt) return [];
  const lines = prompt.split(/\n/).filter((line) => line.trim());
  return lines
    .map((line) => line.replace(/^\s*(?:\d+[.)]\s*|[-*]\s+)/, "").trim())
    .filter(Boolean);
}

function normalizeAccuracyProfile(value: unknown): TutorAccuracyProfile {
  if (value === "strict" || value === "coverage" || value === "balanced") {
    return value;
  }
  return "strict";
}

export default function Tutor() {
  const queryClient = useQueryClient();
  const tutorMaterialStorageKey = "tutor.selected_material_ids.v1";
  const tutorAccuracyProfileKey = "tutor.accuracy_profile.v1";
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
  const [accuracyProfile, setAccuracyProfile] = useState<TutorAccuracyProfile>(() => {
    try {
      return normalizeAccuracyProfile(localStorage.getItem(tutorAccuracyProfileKey));
    } catch {
      return "strict";
    }
  });
  const [chainId, setChainId] = useState<number | undefined>();
  const [showMaterials, setShowMaterials] = useState(false);
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [chainBlocks, setChainBlocks] = useState<TutorTemplateChain["blocks"]>([]);
  const [customBlockIds, setCustomBlockIds] = useState<number[]>([]);
  const [topic, setTopic] = useState("");

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
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showRightSidebar, setShowRightSidebar] = useState(true);
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
      localStorage.setItem(tutorAccuracyProfileKey, accuracyProfile);
    } catch {
      /* ignore */
    }
  }, [tutorAccuracyProfileKey, accuracyProfile]);

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
          accuracyProfile,
          selectedPaths,
        }),
      );
    } catch {
      /* localStorage write failed — ignore */
    }
  }, [
    tutorWizardStorageKey,
    courseId,
    topic,
    selectedMaterials,
    chainId,
    customBlockIds,
    accuracyProfile,
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

  const { data: chatMaterials = [] } = useQuery<Material[]>({
    queryKey: ["tutor-chat-materials-all-enabled"],
    queryFn: () => api.tutor.getMaterials({ enabled: true }),
    staleTime: 60 * 1000,
  });

  const applySessionState = useCallback((session: TutorSessionWithTurns) => {
    setActiveSessionId(session.session_id);
    setTurnCount(session.turn_count);
    setStartedAt(session.started_at);
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
    setAccuracyProfile(normalizeAccuracyProfile(session.content_filter?.accuracy_profile));
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
    } catch {
      /* localStorage write failed — ignore */
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
        mode: "Core",
        topic: topic || undefined,
        content_filter: {
          ...(selectedPaths.length > 0 ? { folders: selectedPaths } : {}),
          ...(selectedMaterials.length > 0 ? { material_ids: selectedMaterials } : {}),
          accuracy_profile: accuracyProfile,
          web_search: true,
        },
        method_chain_id: resolvedChainId,
      });
      setActiveSessionId(session.session_id);
      try {
        localStorage.setItem(tutorActiveSessionKey, session.session_id);
      } catch {
        /* localStorage write failed — ignore */
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
  }, [courseId, topic, selectedPaths, selectedMaterials, accuracyProfile, chainId, customBlockIds, queryClient]);

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
          `# Tutor: ${topic || "Session"}`,
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
        const filename = `Tutor - ${(topic || "Session").replace(/[^a-zA-Z0-9 ]/g, "").trim()}`;
        const path = `Study Sessions/${filename}.md`;
        await api.obsidian.append(path, lines.join("\n"));
      }
      // Show toast AFTER ship succeeds but BEFORE endSession unmounts component
      setTimeout(() => {
        toast.success("Session shipped to Brain");
      }, 100);
    } catch (err) {
      toast.error(`Ship failed: ${err instanceof Error ? err.message : "Unknown"}`);
    } finally {
      setIsShipping(false);
    }
    await endSession();
    setShowEndConfirm(false);
  }, [activeSessionId, topic, startedAt, turnCount, artifacts.length, endSession]);

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
      } catch {
        /* session restore failed — clear stale key */
        try {
          localStorage.removeItem(tutorActiveSessionKey);
        } catch {
          /* localStorage remove failed — ignore */
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
          setAccuracyProfile(normalizeAccuracyProfile(parsed?.accuracyProfile));
          if (Array.isArray(parsed?.selectedPaths)) {
            setSelectedPaths(parsed.selectedPaths.filter((v: unknown) => typeof v === "string"));
          }
        }
      } catch {
        /* wizard state restore failed — ignore */
      }

      if (restoredCourseId) return;

      try {
        const { currentCourse } = await api.studyWheel.getCurrentCourse();
        if (typeof currentCourse?.id === "number") {
          setCourseId((prev) => (typeof prev === "number" ? prev : currentCourse.id));
        }
      } catch {
        /* current course fetch failed — ignore */
      }
    };

    void restore();
  }, [
    applySessionState,
    hasRestored,
    tutorAccuracyProfileKey,
    tutorActiveSessionKey,
    tutorWizardStorageKey,
  ]);

  const toggleMaterial = useCallback((id: number) => {
    setSelectedMaterials((prev) => {
      const next = prev.includes(id) ? prev.filter((mid) => mid !== id) : [...prev, id];
      try {
        localStorage.setItem(tutorMaterialStorageKey, JSON.stringify(next));
      } catch { /* ignore */ }
      return next;
    });
  }, [tutorMaterialStorageKey]);

  const selectAllMaterials = useCallback(() => {
    const allIds = chatMaterials.map((m) => m.id);
    setSelectedMaterials(allIds);
    try {
      localStorage.setItem(tutorMaterialStorageKey, JSON.stringify(allIds));
    } catch { /* ignore */ }
  }, [chatMaterials, tutorMaterialStorageKey]);

  const clearMaterialSelection = useCallback(() => {
    setSelectedMaterials([]);
    try {
      localStorage.setItem(tutorMaterialStorageKey, JSON.stringify([]));
    } catch { /* ignore */ }
  }, [tutorMaterialStorageKey]);

  const getFileName = (path: string) => {
    return path.split(/[/\\]/).pop() || path;
  };

  // ─── Derived state ───

  // ─── SESSION VIEW ─── (active session, full-screen chat)
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
  const facilitationSteps = parseFacilitationSteps(currentBlock?.facilitation_prompt);

  return (
    <Layout>
      <div className="flex flex-col h-full min-h-0">
        {/* ─── Main Content Area ─── */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-none bg-black/40 border-b-2 border-primary/20 p-2">
            {/* Top Toolbar Area */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              {activeSessionId && (
                <>
                  <Badge variant="outline" className={`${TEXT_BADGE} h-7 px-2 shrink-0 border-primary/30`}>
                    <span className="text-muted-foreground mr-1">TOPIC:</span>
                    <span className="text-foreground">{topic || "Freeform"}</span>
                  </Badge>
                  <div className={`flex items-center gap-3 px-2 ${TEXT_MUTED} text-xs border-r border-primary/20 shrink-0`}>
                    <span className="flex items-center gap-1" title="Turns">
                      <MessageSquare className={ICON_SM} />
                      {turnCount}
                    </span>
                    {startedAt && (
                      <span className="flex items-center gap-1" title="Started At">
                        <Clock className={ICON_SM} />
                        {new Date(startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </div>
                </>
              )}

              <div className="flex items-center gap-1 shrink-0 ml-auto">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSetup(true)}
                  className={`h-8 rounded-none font-arcade text-xs px-3 ${showSetup
                    ? "text-primary bg-primary/15 border-2 border-primary/40"
                    : "text-muted-foreground hover:text-primary border-2 border-transparent"
                    }`}
                >
                  <Settings2 className="w-3.5 h-3.5 mr-1" />
                  SETUP
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSetup(false)}
                  className={`h-8 rounded-none font-arcade text-xs px-3 ${!showSetup
                    ? "text-primary bg-primary/15 border-2 border-primary/40"
                    : "text-muted-foreground hover:text-primary border-2 border-transparent"
                    }`}
                >
                  <MessageSquare className="w-3.5 h-3.5 mr-1" />
                  CHAT
                </Button>

                {activeSessionId && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowArtifacts((prev) => !prev)}
                      className={`h-8 rounded-none font-arcade text-xs px-3 ml-1 ${showArtifacts
                        ? "text-primary bg-primary/10 border-2 border-primary/40"
                        : "text-muted-foreground hover:text-primary border-2 border-transparent"
                        }`}
                    >
                      {showArtifacts ? (
                        <PanelRightClose className="w-3.5 h-3.5 mr-1" />
                      ) : (
                        <PanelRightOpen className="w-3.5 h-3.5 mr-1" />
                      )}
                      ARTIFACTS
                      {artifacts.length > 0 && (
                        <Badge variant="outline" className="h-4 px-1 ml-1 text-[10px] rounded-none border-primary/40">
                          {artifacts.length}
                        </Badge>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowEndConfirm(true)}
                      className="h-8 rounded-none font-arcade text-xs px-3 text-red-400/70 hover:text-red-400 hover:bg-red-400/10 border-2 border-transparent"
                      title="End session"
                    >
                      <Square className="w-3.5 h-3.5 mr-1" />
                      END
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 flex min-h-0 relative">
            <div className="flex-1 bg-black/40 flex flex-col min-w-0">
              {showSetup ? (
                <div className="flex-1 min-h-0 overflow-y-auto w-full p-4">
                  <div className="w-full max-w-4xl mx-auto">
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
                      onStartSession={startSession}
                      isStarting={isStarting}
                      recentSessions={recentSessions}
                      onResumeSession={(id) => { resumeSession(id); setShowSetup(false); }}
                    />
                  </div>
                </div>
              ) : (
                <>
                  {activeSessionId ? (
                    <TutorChat
                      sessionId={activeSessionId}
                      availableMaterials={chatMaterials}
                      selectedMaterialIds={selectedMaterials}
                      accuracyProfile={accuracyProfile}
                      onAccuracyProfileChange={setAccuracyProfile}
                      onSelectedMaterialIdsChange={setSelectedMaterials}
                      onArtifactCreated={handleArtifactCreated}
                      onTurnComplete={(masteryUpdate) => {
                        setTurnCount((prev) => prev + 1);
                        if (masteryUpdate) {
                          queryClient.invalidateQueries({ queryKey: ["mastery-dashboard"] });
                        }
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center space-y-3">
                        <div className="font-arcade text-sm text-primary">
                          READY TO LEARN
                        </div>
                        <div className="font-terminal text-sm text-muted-foreground max-w-sm">
                          Click SETUP to configure your session, or select a recent session to resume.
                        </div>
                      </div>
                    </div>
                  )}

                  {showEndConfirm && (
                    <div className="absolute inset-x-0 bottom-0 z-50 bg-black/95 border-t-2 border-primary/50 p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.8)]">
                      <div className="max-w-md mx-auto space-y-3">
                        <div className="font-arcade text-sm text-primary tracking-wider">SESSION COMPLETE</div>
                        <div className="flex items-center gap-4 font-terminal text-xs text-muted-foreground">
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
                            className="rounded-none font-arcade text-xs text-muted-foreground hover:text-foreground h-9 px-3 border-2 border-transparent hover:border-primary/40 shadow-none"
                          >
                            END WITHOUT SAVING
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => setShowEndConfirm(false)}
                            disabled={isShipping}
                            className="rounded-none font-arcade text-xs text-muted-foreground hover:text-foreground h-9 px-3 ml-auto border-2 border-transparent hover:border-primary/40 shadow-none"
                          >
                            CANCEL
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Right side panels overlaid when toggle is ON */}
            {activeSessionId && !showSetup && showArtifacts && (
              <div className="w-[320px] shrink-0 border-l-2 border-primary/30 bg-black/90 absolute right-0 inset-y-0 z-30 flex flex-col shadow-[-10px_0_20px_rgba(0,0,0,0.5)]">
                <div className="flex items-center justify-between p-2 border-b-2 border-primary/20 bg-primary/5">
                  <span className="font-arcade text-xs text-primary px-2">ARTIFACTS</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-primary rounded-none"
                    onClick={() => setShowArtifacts(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto">
                  <TutorArtifacts
                    sessionId={activeSessionId}
                    artifacts={artifacts}
                    turnCount={turnCount}
                    topic={topic}
                    startedAt={startedAt}
                    onCreateArtifact={handleArtifactCreated}
                    recentSessions={recentSessions}
                    onResumeSession={resumeSession}
                    onDeleteArtifacts={handleDeleteArtifacts}
                  />
                </div>
              </div>
            )}
          </div>
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
            className={`${TEXT_BADGE} h-5 px-1.5 shrink-0 ${s.status === "active" ? "text-green-400 border-green-400/50" : "text-muted-foreground"
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
