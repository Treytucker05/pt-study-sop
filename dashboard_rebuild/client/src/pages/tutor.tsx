import Layout from "@/components/layout";
import { Card } from "@/components/ui/card";
import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { TutorMode, TutorSessionSummary } from "@/lib/api";
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
  const [selectedFolders, setSelectedFolders] = useState<string[]>([]);
  const [mode, setMode] = useState<TutorMode>("Core");
  const [topic, setTopic] = useState("");

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
      const session = await api.tutor.createSession({
        course_id: courseId,
        phase: "first_pass",
        mode,
        topic: topic || undefined,
        content_filter: selectedFolders.length > 0 ? { folders: selectedFolders } : undefined,
      });
      setActiveSessionId(session.session_id);
      setStartedAt(session.started_at);
      setArtifacts([]);
      setTurnCount(0);
      toast.success("Tutor session started");
      queryClient.invalidateQueries({ queryKey: ["tutor-sessions"] });
    } catch (err) {
      toast.error(`Failed to start session: ${err instanceof Error ? err.message : "Unknown"}`);
    } finally {
      setIsStarting(false);
    }
  }, [courseId, mode, topic, selectedFolders, queryClient]);

  const endSession = useCallback(async () => {
    if (!activeSessionId) return;
    try {
      await api.tutor.endSession(activeSessionId);
      toast.success("Session ended");
      setActiveSessionId(null);
      setArtifacts([]);
      setTurnCount(0);
      setStartedAt(null);
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
        <Card className="w-56 shrink-0 bg-black/40 border-2 border-primary rounded-none overflow-y-auto">
          <ContentFilter
            courseId={courseId}
            setCourseId={setCourseId}
            selectedFolders={selectedFolders}
            setSelectedFolders={setSelectedFolders}
            mode={mode}
            setMode={setMode}
            topic={topic}
            setTopic={setTopic}
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
          />
        </Card>

        {/* Right: Artifacts */}
        <Card className="w-56 shrink-0 bg-black/40 border-2 border-secondary rounded-none overflow-y-auto">
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
