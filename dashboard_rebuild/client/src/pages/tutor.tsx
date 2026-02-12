import Layout from "@/components/layout";
import { Card } from "@/components/ui/card";
import { useState, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { TutorMode, TutorSessionSummary, TutorTemplateChain } from "@/lib/api";
import { ContentFilter } from "@/components/ContentFilter";
import { VaultPicker } from "@/components/VaultPicker";
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
} from "lucide-react";
import {
  TEXT_PANEL_TITLE,
  TEXT_BODY,
  TEXT_MUTED,
  TEXT_BADGE,
  ICON_SM,
} from "@/lib/theme";

export default function Tutor() {
  const queryClient = useQueryClient();
  const tutorMaterialStorageKey = "tutor.selected_material_ids.v1";

  // Session state
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

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

  useEffect(() => {
    try {
      localStorage.setItem(tutorMaterialStorageKey, JSON.stringify(selectedMaterials));
    } catch { /* ignore */ }
  }, [tutorMaterialStorageKey, selectedMaterials]);

  // Recent sessions
  const { data: recentSessions = [] } = useQuery<TutorSessionSummary[]>({
    queryKey: ["tutor-sessions"],
    queryFn: () => api.tutor.listSessions({ limit: 10 }),
  });

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
      setStartedAt(session.started_at);
      setArtifacts([]);
      setTurnCount(0);
      setCurrentBlockIndex(session.current_block_index ?? 0);
      setShowSetup(false);

      if (chainId) {
        const full = await api.tutor.getSession(session.session_id);
        if (full.chain_blocks) {
          setChainBlocks(full.chain_blocks.map((b) => ({
            id: b.id,
            name: b.name,
            category: b.category,
            duration: b.default_duration_min,
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
          content: artifact.content.slice(0, 200),
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
      if (result.complete) {
        toast.success("Chain complete!");
      } else {
        toast.success(`Advanced to: ${result.block_name}`);
      }
    } catch (err) {
      toast.error(`Failed to advance block: ${err instanceof Error ? err.message : "Unknown"}`);
    }
  }, [activeSessionId]);

  const resumeSession = useCallback(
    async (sessionId: string) => {
      try {
        const session = await api.tutor.getSession(sessionId);
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
            duration: block.default_duration_min,
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
                parsed.map((a: { type: string; title: string; created_at: string }) => ({
                  type: a.type as "note" | "card" | "map",
                  title: a.title,
                  content: "",
                  createdAt: a.created_at,
                }))
              );
            }
          } catch {
            setArtifacts([]);
          }
        }
        toast.success("Session resumed");
      } catch (err) {
        toast.error(`Failed to resume session: ${err instanceof Error ? err.message : "Unknown"}`);
      }
    },
    []
  );

  // ─── SETUP VIEW ─── (no active session)
  if (!activeSessionId && !showSetup) {
    return (
      <Layout>
        <div className="flex flex-col h-[calc(100vh-140px)] px-4 pb-2">
          {/* Vault file picker — fills all available height */}
          <Card className="flex-1 min-h-0 bg-black/40 border-[3px] border-double border-primary rounded-none overflow-hidden flex flex-col">
            <div className="shrink-0 px-3 py-1.5 border-b-2 border-primary/30 flex items-center justify-between">
              <div className={TEXT_PANEL_TITLE}>VAULT FILES</div>
              <span className="font-arcade text-xs text-primary/50 tracking-widest">TUTOR</span>
            </div>
            <VaultPicker
              selectedPaths={selectedPaths}
              onSelectedPathsChange={setSelectedPaths}
            />
          </Card>

          {selectedMaterials.length > 0 && (
            <Card className="shrink-0 mt-2 bg-black/40 border-[3px] border-double border-primary/70 rounded-none">
              <div className="px-3 py-2 border-b-2 border-primary/30 font-arcade text-xs tracking-widest">
                PROJECT FILES FOR THIS SESSION
              </div>
              <div className="px-3 py-2">
                <span className={TEXT_BODY}>
                  {selectedMaterials.length} library file{selectedMaterials.length === 1 ? "" : "s"} selected
                </span>
              </div>
            </Card>
          )}

          {/* Toolbar — thin horizontal strip */}
          <Card className="shrink-0 mt-2 bg-black/40 border-[3px] border-double border-primary rounded-none overflow-hidden">
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
                hasActiveSession={false}
                compact
              />
            </Card>

            {/* Recent sessions — single-line chips */}
            {recentSessions.length > 0 && (
              <div className="shrink-0 flex items-center gap-2 mt-1 overflow-x-auto pb-1">
                <span className="font-arcade text-xs text-primary/60 shrink-0">RECENT:</span>
                {recentSessions.slice(0, 8).map((s) => (
                  <button
                    key={s.session_id}
                    onClick={() => resumeSession(s.session_id)}
                    className="shrink-0 border border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/10 px-2 py-0.5 font-terminal text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${s.status === "active" ? "bg-green-400" : "bg-muted-foreground/40"}`} />
                    <span className="truncate max-w-[100px]">{s.topic || s.mode}</span>
                    <span className="text-muted-foreground/50">{s.turn_count}t</span>
                  </button>
                ))}
              </div>
            )}
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
  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-140px)]">
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
          </div>
        </div>

        {/* Main content: Chat (+ optional artifacts panel) */}
        <div className="flex-1 flex min-h-0">
          {/* Chat — takes all available space */}
          <div className="flex-1 bg-black/60 border-x-2 border-primary/20 flex flex-col min-w-0">
            <TutorChat
              sessionId={activeSessionId}
              engine={model === "buster" ? "buster" : undefined}
              onArtifactCreated={handleArtifactCreated}
              onSessionEnd={endSession}
              chainBlocks={chainBlocks}
              currentBlockIndex={currentBlockIndex}
              onAdvanceBlock={advanceBlock}
            />
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
