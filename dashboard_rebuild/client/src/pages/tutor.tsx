import Layout from "@/components/layout";
import { Card } from "@/components/ui/card";
import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { TutorMode, TutorSessionSummary, TutorTemplateChain } from "@/lib/api";
import { ContentFilter } from "@/components/ContentFilter";
import { TutorChat } from "@/components/TutorChat";
import { TutorArtifacts, type TutorArtifact } from "@/components/TutorArtifacts";
import { toast } from "sonner";

export default function Tutor() {
  const queryClient = useQueryClient();

  // Session state
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  // Filter state
  const [courseId, setCourseId] = useState<number | undefined>();
  const [selectedMaterials, setSelectedMaterials] = useState<number[]>([]);
  const [mode, setMode] = useState<TutorMode>("Core");
  const [chainId, setChainId] = useState<number | undefined>();
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [chainBlocks, setChainBlocks] = useState<TutorTemplateChain["blocks"]>([]);
  const [customBlockIds, setCustomBlockIds] = useState<number[]>([]);
  const [topic, setTopic] = useState("");
  const [model, setModel] = useState("codex");
  const [webSearch, setWebSearch] = useState(false);

  // Artifacts
  const [artifacts, setArtifacts] = useState<TutorArtifact[]>([]);
  const [turnCount, setTurnCount] = useState(0);
  const [startedAt, setStartedAt] = useState<string | null>(null);

  // Recent sessions
  const { data: recentSessions = [] } = useQuery<TutorSessionSummary[]>({
    queryKey: ["tutor-sessions"],
    queryFn: () => api.tutor.listSessions({ limit: 10 }),
  });

  const startSession = useCallback(async () => {
    setIsStarting(true);
    try {
      // If custom blocks are selected (no template chain), create an ad-hoc chain first
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

      // If chain was selected, fetch full session to get chain_blocks
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
  }, [courseId, mode, topic, selectedMaterials, model, webSearch, chainId, customBlockIds, queryClient]);

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

        // Restore artifacts from session
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

  return (
    <Layout>
      <div className="h-[calc(100vh-140px)] flex gap-2">
        {/* Left: Content Filter */}
        <Card className="w-80 shrink-0 bg-black/40 border-2 border-primary rounded-none overflow-hidden">
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
            hasActiveSession={!!activeSessionId}
          />
        </Card>

        {/* Center: Chat */}
        <Card className="flex-1 bg-black/60 border-2 border-primary rounded-none flex flex-col min-w-0">
          <TutorChat
            sessionId={activeSessionId}
            onArtifactCreated={handleArtifactCreated}
            onSessionEnd={endSession}
            chainBlocks={chainBlocks}
            currentBlockIndex={currentBlockIndex}
            onAdvanceBlock={advanceBlock}
          />
        </Card>

        {/* Right: Artifacts */}
        <Card className="w-80 shrink-0 bg-black/40 border-2 border-primary rounded-none overflow-hidden">
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
        </Card>
      </div>
    </Layout>
  );
}
