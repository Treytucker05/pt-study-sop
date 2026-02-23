import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  Loader2,
  FileText,
  CreditCard,
  Map,
  CheckCircle2,
  XCircle,
  BookOpen,
  StickyNote,
  Upload,
  FolderPlus,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  api,
  type BehaviorOverride,
  type Material,
  type TeachBackRubric,
  type TutorAccuracyProfile,
  type TutorCitation,
  type TutorRetrievalDebug,
  type TutorSSEChunk,
  type TutorVerdict,
} from "@/lib/api";
import { toast } from "sonner";

interface ToolAction {
  tool: string;
  success: boolean;
  message: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  citations?: TutorCitation[];
  model?: string;
  retrievalDebug?: TutorRetrievalDebug;
  isStreaming?: boolean;
  toolActions?: ToolAction[];
  verdict?: TutorVerdict;
  teachBackRubric?: TeachBackRubric;
}

export interface ChainBlock {
  id: number;
  name: string;
  category: string;
  description?: string;
  duration: number;
  facilitation_prompt?: string;
}

interface TutorChatProps {
  sessionId: string | null;
  courseId?: number;
  availableMaterials: Material[];
  selectedMaterialIds: number[];
  accuracyProfile: TutorAccuracyProfile;
  onAccuracyProfileChange: (profile: TutorAccuracyProfile) => void;
  onSelectedMaterialIdsChange: (ids: number[]) => void;
  onMaterialsChanged?: () => Promise<void> | void;
  onArtifactCreated: (artifact: { type: string; content: string; title?: string }) => void;
  onTurnComplete?: (masteryUpdate?: { skill_id: string; new_mastery: number; correct: boolean }) => void;
}

type ArtifactType = "note" | "card" | "map";

function parseArtifactCommand(message: string): { type: ArtifactType | null; title: string } {
  const trimmed = message.trim();
  if (/^\/(note|save)\b/i.test(trimmed)) {
    return {
      type: "note",
      title: trimmed.replace(/^\/(note|save)\s*/i, "").trim(),
    };
  }
  if (/^\/(card|flashcard)\b/i.test(trimmed)) {
    return {
      type: "card",
      title: trimmed.replace(/^\/(card|flashcard)\s*/i, "").trim(),
    };
  }
  if (/^\/(map|diagram)\b/i.test(trimmed)) {
    return {
      type: "map",
      title: trimmed.replace(/^\/(map|diagram)\s*/i, "").trim(),
    };
  }
  return { type: null, title: "" };
}

const TOOL_LABELS: Record<string, string> = {
  save_to_obsidian: "Obsidian",
  create_note: "Notes",
  create_anki_card: "Anki",
};

const TOOL_ICONS: Record<string, typeof FileText> = {
  save_to_obsidian: BookOpen,
  create_note: StickyNote,
  create_anki_card: CreditCard,
};

function VerdictBadge({ verdict }: { verdict: TutorVerdict }) {
  const [expanded, setExpanded] = useState(false);
  const color =
    verdict.verdict === "pass"
      ? "border-green-600 text-green-400 bg-green-950/30"
      : verdict.verdict === "fail"
        ? "border-red-600 text-red-400 bg-red-950/30"
        : "border-yellow-600 text-yellow-400 bg-yellow-950/30";
  const label =
    verdict.verdict === "pass"
      ? "PASS"
      : verdict.verdict === "fail"
        ? "FAIL"
        : "PARTIAL";

  return (
    <div className={`mt-2 pt-2 border-t border-primary/20`}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className={`inline-flex items-center gap-2 px-3 py-1.5 font-arcade text-xs border-2 ${color}`}
      >
        {verdict.verdict === "pass" ? (
          <CheckCircle2 className="w-4 h-4" />
        ) : (
          <XCircle className="w-4 h-4" />
        )}
        {label}
        {verdict.confidence != null && (
          <span className="font-terminal text-[10px] opacity-70">
            ({Math.round(verdict.confidence * 100)}%)
          </span>
        )}
      </button>
      {expanded && (
        <div className="mt-2 space-y-1 font-terminal text-xs text-zinc-300">
          {verdict.why_wrong && (
            <p>
              <span className="text-red-400">Why wrong:</span> {verdict.why_wrong}
            </p>
          )}
          {verdict.error_location?.node && (
            <p>
              <span className="text-yellow-400">Error at:</span>{" "}
              {verdict.error_location.node}
              {verdict.error_location.prereq_from &&
                ` (prereq: ${verdict.error_location.prereq_from} → ${verdict.error_location.prereq_to})`}
            </p>
          )}
          {verdict.next_hint && (
            <p>
              <span className="text-blue-400">Hint:</span> {verdict.next_hint}
            </p>
          )}
          {verdict.next_question && (
            <p>
              <span className="text-primary">Next Q:</span> {verdict.next_question}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function TeachBackBadge({ rubric }: { rubric: TeachBackRubric }) {
  const [expanded, setExpanded] = useState(false);
  const color =
    rubric.overall_rating === "pass"
      ? "border-green-600 text-green-400 bg-green-950/30"
      : rubric.overall_rating === "fail"
        ? "border-red-600 text-red-400 bg-red-950/30"
        : "border-yellow-600 text-yellow-400 bg-yellow-950/30";
  const label =
    rubric.overall_rating === "pass"
      ? "TEACH-BACK PASS"
      : rubric.overall_rating === "fail"
        ? "TEACH-BACK FAIL"
        : "TEACH-BACK PARTIAL";

  return (
    <div className="mt-2 pt-2 border-t border-primary/20">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className={`inline-flex items-center gap-2 px-3 py-1.5 font-arcade text-xs border-2 ${color}`}
      >
        {rubric.overall_rating === "pass" ? (
          <CheckCircle2 className="w-4 h-4" />
        ) : (
          <XCircle className="w-4 h-4" />
        )}
        {label}
        <span className="font-terminal text-[10px] opacity-70">
          A:{rubric.accuracy_score} B:{rubric.breadth_score} S:{rubric.synthesis_score}
        </span>
      </button>
      {expanded && (
        <div className="mt-2 space-y-1 font-terminal text-xs text-zinc-300">
          {rubric._mastery_blocked && (
            <p className="text-red-400">Mastery blocked — improve teach-back to unlock</p>
          )}
          {rubric.strengths && rubric.strengths.length > 0 && (
            <p>
              <span className="text-green-400">Strengths:</span> {rubric.strengths.join(", ")}
            </p>
          )}
          {rubric.misconceptions && rubric.misconceptions.length > 0 && (
            <p>
              <span className="text-red-400">Misconceptions:</span> {rubric.misconceptions.join(", ")}
            </p>
          )}
          {rubric.gaps && rubric.gaps.length > 0 && (
            <p>
              <span className="text-yellow-400">Gaps:</span>{" "}
              {rubric.gaps.map((g) => g.skill_id).join(", ")}
            </p>
          )}
          {rubric.next_focus && (
            <p>
              <span className="text-primary">Next focus:</span> {rubric.next_focus}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function TutorChat({
  sessionId,
  courseId,
  availableMaterials,
  selectedMaterialIds,
  accuracyProfile,
  onAccuracyProfileChange,
  onSelectedMaterialIdsChange,
  onMaterialsChanged,
  onArtifactCreated,
  onTurnComplete,
}: TutorChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [behaviorOverride, setBehaviorOverride] = useState<BehaviorOverride | null>(null);
  const [showMaterialPanel, setShowMaterialPanel] = useState(true);
  const [isUploadingMaterial, setIsUploadingMaterial] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamAbortRef = useRef<AbortController | null>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, [sessionId]);

  // Reset transient chat state when session context changes.
  useEffect(() => {
    streamAbortRef.current?.abort();
    streamAbortRef.current = null;
    setMessages([]);
    setInput("");
    setIsStreaming(false);
  }, [sessionId]);

  const toggleMaterial = useCallback(
    (materialId: number) => {
      if (selectedMaterialIds.includes(materialId)) {
        onSelectedMaterialIdsChange(selectedMaterialIds.filter((id) => id !== materialId));
        return;
      }
      onSelectedMaterialIdsChange([...selectedMaterialIds, materialId]);
    },
    [onSelectedMaterialIdsChange, selectedMaterialIds],
  );

  const selectAllMaterials = useCallback(() => {
    onSelectedMaterialIdsChange(availableMaterials.map((m) => m.id));
  }, [availableMaterials, onSelectedMaterialIdsChange]);

  const clearSelectedMaterials = useCallback(() => {
    onSelectedMaterialIdsChange([]);
  }, [onSelectedMaterialIdsChange]);

  const handleUploadFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setIsUploadingMaterial(true);
      try {
        const uploadedIds: number[] = [];
        for (const file of Array.from(files)) {
          const result = await api.tutor.uploadMaterial(file, { course_id: courseId });
          uploadedIds.push(result.duplicate_of?.id ?? result.id);
        }
        if (onMaterialsChanged) {
          await onMaterialsChanged();
        }
        const merged = Array.from(new Set([...selectedMaterialIds, ...uploadedIds]));
        onSelectedMaterialIdsChange(merged);
        toast.success(
          uploadedIds.length === 1
            ? "Material uploaded and added to this chat"
            : `${uploadedIds.length} materials uploaded and added to this chat`,
        );
      } catch (err) {
        toast.error(`Upload failed: ${err instanceof Error ? err.message : "Unknown error"}`);
      } finally {
        setIsUploadingMaterial(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [courseId, onMaterialsChanged, onSelectedMaterialIdsChange, selectedMaterialIds],
  );

  const sendMessage = useCallback(async () => {
    if (!input.trim() || !sessionId || isStreaming) return;

    const userMessage = input.trim();
    const command = parseArtifactCommand(userMessage);
    setInput("");
    const abortController = new AbortController();
    streamAbortRef.current = abortController;

    // Add user message and placeholder assistant message in one atomic update.
    setMessages((prev) => [
      ...prev,
      { role: "user", content: userMessage },
      { role: "assistant", content: "", isStreaming: true },
    ]);
    setIsStreaming(true);
    const activeBehavior = behaviorOverride;
    setBehaviorOverride(null);

    try {
      const response = await fetch(`/api/tutor/session/${sessionId}/turn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          content_filter: {
            material_ids: selectedMaterialIds,
            accuracy_profile: accuracyProfile,
          },
          behavior_override: activeBehavior,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        let message = `HTTP ${response.status} ${response.statusText}`;
        try {
          const text = await response.text();
          if (text) {
            try {
              const parsed = JSON.parse(text) as { error?: string };
              message = parsed.error || text;
            } catch {
              message = text;
            }
          }
        } catch {
          // ignore parse failures and keep status text
        }
        throw new Error(message);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No response body from tutor stream");

      let buffer = "";
      let fullText = "";
      let citations: TutorCitation[] = [];
      let modelId: string | undefined;
      let retrievalDebug: TutorRetrievalDebug | undefined;
      let serverArtifactCmd: { type?: string; raw?: string } | null = null;
      let verdictData: TutorVerdict | undefined;
      let teachBackData: TeachBackRubric | undefined;
      let masteryUpdateData: { skill_id: string; new_mastery: number; correct: boolean } | undefined;
      let streamErrored = false;
      let doneSignal = false;
      const toolActions: ToolAction[] = [];

      while (!doneSignal) {
        const { done, value } = await reader.read();
        if (done) {
          buffer += decoder.decode();
          doneSignal = true;
        } else {
          buffer += decoder.decode(value, { stream: true });
        }

        const lines = buffer.split("\n");
        if (!doneSignal) {
          buffer = lines.pop() ?? "";
        } else {
          buffer = "";
        }

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") {
            doneSignal = true;
            break;
          }

          try {
            const parsed: TutorSSEChunk = JSON.parse(data);

            if (parsed.type === "error") {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (!last || last.role !== "assistant") return prev;
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: `Error: ${parsed.content}`,
                };
                return updated;
              });
              streamErrored = true;
              setIsStreaming(false);
              doneSignal = true;
              break;
            }

            if (parsed.type === "web_search_searching") {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (!last || last.role !== "assistant") return prev;
                updated[updated.length - 1] = {
                  ...last,
                  content: "Searching the web...\n\n",
                  isStreaming: true,
                };
                return updated;
              });
            }

            if (parsed.type === "web_search_completed") {
              fullText = "";
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (!last || last.role !== "assistant") return prev;
                updated[updated.length - 1] = {
                  ...last,
                  content: "",
                  isStreaming: true,
                };
                return updated;
              });
            }

            if (parsed.type === "tool_call" && parsed.content) {
              try {
                const tc = JSON.parse(parsed.content) as { tool?: string };
                const toolLabel = TOOL_LABELS[tc.tool ?? ""] ?? tc.tool ?? "tool";
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (!last || last.role !== "assistant") return prev;
                  updated[updated.length - 1] = {
                    ...last,
                    content: last.content + `\n\n> *Using ${toolLabel}...*\n\n`,
                    isStreaming: true,
                  };
                  return updated;
                });
              } catch { /* ignore malformed */ }
            }

            if (parsed.type === "tool_result" && parsed.content) {
              try {
                const tr = JSON.parse(parsed.content) as { tool?: string; success?: boolean; message?: string };
                toolActions.push({
                  tool: tr.tool ?? "unknown",
                  success: tr.success ?? false,
                  message: tr.message ?? "",
                });
              } catch { /* ignore malformed */ }
            }

            if (parsed.type === "token" && parsed.content) {
              fullText += parsed.content;
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (!last || last.role !== "assistant") return prev;
                updated[updated.length - 1] = {
                  ...last,
                  content: last.content + parsed.content!,
                  isStreaming: true,
                };
                return updated;
              });
            }

            if (parsed.type === "done") {
              citations = parsed.citations ?? [];
              modelId = parsed.model;
              retrievalDebug = parsed.retrieval_debug;
              verdictData = parsed.verdict;
              teachBackData = parsed.teach_back_rubric;
              masteryUpdateData = parsed.mastery_update;
              // Backend detected natural language artifact command
              if (parsed.artifacts?.length) {
                const cmd = parsed.artifacts[0] as { type?: string; raw?: string };
                if (cmd.type && !command.type) {
                  serverArtifactCmd = cmd;
                }
              }
            }
          } catch {
            /* skip malformed */
          }
        }
      }

      if (streamErrored) {
        return;
      }

      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (!last || last.role !== "assistant") return prev;
        updated[updated.length - 1] = {
          role: "assistant",
          content: fullText,
          citations,
          model: modelId,
          retrievalDebug,
          isStreaming: false,
          toolActions: toolActions.length > 0 ? toolActions : undefined,
          verdict: verdictData,
          teachBackRubric: teachBackData,
        };
        return updated;
      });

      // Notify turn completion (with mastery update if present)
      onTurnComplete?.(masteryUpdateData);

      // Handle artifact slash commands after response
      if (command.type) {
        const fallbackTitle = `Tutor ${command.type}`;
        onArtifactCreated({
          type: command.type,
          content: fullText,
          title: command.title || fallbackTitle,
        });
      } else if (
        serverArtifactCmd?.type &&
        (serverArtifactCmd.type === "note" || serverArtifactCmd.type === "card" || serverArtifactCmd.type === "map")
      ) {
        // Backend detected natural language artifact command (e.g. "put that in my notes")
        onArtifactCreated({
          type: serverArtifactCmd.type,
          content: fullText,
          title: userMessage.slice(0, 80).trim(),
        });
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (!last || last.role !== "assistant") return prev;
        updated[updated.length - 1] = {
          role: "assistant",
          content: `Connection error: ${err instanceof Error ? err.message : "Unknown"}`,
        };
        return updated;
      });
    } finally {
      if (streamAbortRef.current === abortController) {
        streamAbortRef.current = null;
      }
      setIsStreaming(false);
    }
  }, [
    input,
    sessionId,
    isStreaming,
    behaviorOverride,
    onArtifactCreated,
    onTurnComplete,
    selectedMaterialIds,
    accuracyProfile,
  ]);



  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!sessionId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-2">
          <div className="font-arcade text-sm text-muted-foreground">
            NO ACTIVE SESSION
          </div>
          <div className="font-terminal text-lg text-muted-foreground/70">
            Configure content filter and start a session
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0">
      <div className="flex flex-col h-full min-h-0 flex-1">
        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto space-y-4 bg-black/40 p-4 lg:p-6"
        >
          {messages.length === 0 && (
            <div className="text-center py-8 space-y-2">
              <div className="font-arcade text-sm text-primary">
                SESSION STARTED
              </div>
              <div className="font-terminal text-lg text-muted-foreground leading-7">
                Ask a question to begin learning. Use /note, /card, or /map for artifacts.
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`px-3 py-2 text-[17px] leading-7 font-terminal overflow-hidden ${msg.role === "user"
                  ? "max-w-[72%]"
                  : "max-w-[96%]"
                  } ${msg.role === "user"
                    ? "bg-primary/15 border-2 border-primary/40 text-foreground"
                    : "bg-black/40 border-2 border-secondary text-foreground"
                  }`}
              >
                {msg.role === "assistant" ? (
                  <div className="prose prose-invert prose-lg max-w-none font-terminal [&_p]:my-2 [&_li]:my-1 [&_p]:leading-7 [&_li]:leading-7 [&_code]:text-base [&_pre]:text-base [&_pre]:overflow-x-auto [&_code]:break-words [&_a]:break-all">
                    {msg.content ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    ) : msg.isStreaming ? (
                      <div className="flex items-center gap-1.5 py-1">
                        <span className="inline-block w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="inline-block w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="inline-block w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    ) : null}
                    {msg.isStreaming && msg.content && (
                      <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-0.5" />
                    )}
                  </div>
                ) : (
                  <div>{msg.content}</div>
                )}

                {msg.role === "assistant" && msg.toolActions?.length ? (
                  <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-primary/20">
                    {msg.toolActions.map((ta, j) => {
                      const Icon = TOOL_ICONS[ta.tool] ?? FileText;
                      return (
                        <div
                          key={j}
                          className={`flex items-center gap-1.5 px-2 py-1 text-xs font-terminal border ${ta.success
                            ? "border-green-600/50 text-green-400 bg-green-950/30"
                            : "border-red-600/50 text-red-400 bg-red-950/30"
                            }`}
                        >
                          {ta.success ? (
                            <CheckCircle2 className="w-3 h-3 shrink-0" />
                          ) : (
                            <XCircle className="w-3 h-3 shrink-0" />
                          )}
                          <Icon className="w-3 h-3 shrink-0" />
                          <span className="truncate max-w-[200px]">{ta.message}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                {msg.verdict && !msg.isStreaming && (
                  <VerdictBadge verdict={msg.verdict} />
                )}

                {msg.teachBackRubric && !msg.isStreaming && (
                  <TeachBackBadge rubric={msg.teachBackRubric} />
                )}

                {msg.role === "assistant" && msg.content && !msg.isStreaming && (
                  <div className="flex items-center gap-1 mt-2 pt-2 border-t border-primary/20">
                    <button
                      onClick={() =>
                        onArtifactCreated({
                          type: "note",
                          content: msg.content,
                          title: `Tutor note ${i}`,
                        })
                      }
                      className="flex items-center gap-1 px-2 py-1 text-xs font-arcade text-muted-foreground hover:text-primary hover:bg-primary/10 border-2 border-primary/20 hover:border-primary/50 transition-colors shadow-none"
                    >
                      <FileText className="w-3 h-3 text-primary/60" /> Save Note
                    </button>
                    <button
                      onClick={() =>
                        onArtifactCreated({
                          type: "card",
                          content: msg.content,
                          title: `Tutor card ${i}`,
                        })
                      }
                      className="flex items-center gap-1 px-2 py-1 text-xs font-arcade text-muted-foreground hover:text-primary hover:bg-primary/10 border-2 border-primary/20 hover:border-primary/50 transition-colors shadow-none"
                    >
                      <CreditCard className="w-3 h-3 text-primary/60" /> Create Card
                    </button>
                    <button
                      onClick={() => {
                        onArtifactCreated({
                          type: "map",
                          content: msg.content,
                          title: `Tutor map ${i}`,
                        });
                      }}
                      className="flex items-center gap-1 px-2 py-1 text-xs font-arcade text-muted-foreground hover:text-primary hover:bg-primary/10 border-2 border-primary/20 hover:border-primary/50 transition-colors shadow-none"
                    >
                      <Map className="w-3 h-3 text-primary/60" /> Create Map
                    </button>
                  </div>
                )}

                {/* Citations + Model */}
                {(msg.citations?.length || msg.model || msg.retrievalDebug) && !msg.isStreaming ? (
                  <div className="flex flex-wrap items-center gap-1 mt-2 pt-2 border-t border-primary/20">
                    {msg.retrievalDebug ? (
                      <Badge variant="outline" className="text-[11px] rounded-none text-muted-foreground/80">
                        RAG {msg.retrievalDebug.effective_accuracy_profile ?? msg.retrievalDebug.accuracy_profile ?? "strict"}{msg.retrievalDebug.profile_escalated ? " (escalated)" : ""} | conf {(msg.retrievalDebug.retrieval_confidence ?? 0).toFixed(2)} ({msg.retrievalDebug.retrieval_confidence_tier ?? "low"}) | uniq {msg.retrievalDebug.retrieved_material_unique_sources ?? 0} | top {Math.round((msg.retrievalDebug.material_top_source_share ?? 0) * 100)}% | dropped {msg.retrievalDebug.material_dropped_by_cap ?? 0}
                      </Badge>
                    ) : null}
                    {msg.citations?.map((c) =>
                      c.url ? (
                        <a
                          key={c.index}
                          href={c.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Badge
                            variant="outline"
                            className="text-sm rounded-none cursor-pointer hover:bg-primary/10"
                          >
                            [{c.index}] {c.source}
                          </Badge>
                        </a>
                      ) : (
                        <Badge
                          key={c.index}
                          variant="outline"
                          className="text-sm rounded-none"
                        >
                          [{c.index}] {c.source}
                        </Badge>
                      )
                    )}
                    {msg.model && (
                      <Badge variant="outline" className="text-sm rounded-none text-muted-foreground/60 ml-auto">
                        {msg.model}
                      </Badge>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 p-4 lg:p-5 border-t-2 border-primary/20 bg-black/50">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => void handleUploadFiles(e.target.files)}
          />

          <div className="border-2 border-primary/30 bg-black/50">
            <div className="flex flex-wrap items-center gap-2 p-2 border-b border-primary/20">
              <button
                type="button"
                onClick={() => setShowMaterialPanel((prev) => !prev)}
                className="h-8 px-3 font-arcade text-[10px] tracking-wider border-2 border-secondary/40 text-muted-foreground hover:border-secondary hover:text-foreground"
              >
                {showMaterialPanel ? "HIDE MATERIALS" : "SHOW MATERIALS"}
              </button>
              <Badge variant="outline" className="rounded-none h-6 text-[10px] font-arcade border-primary/40">
                LOADED {selectedMaterialIds.length}/{availableMaterials.length}
              </Badge>
              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingMaterial}
                className="h-8 rounded-none px-3 font-arcade text-[10px] gap-1.5 border-2 border-primary/60 bg-primary/10 hover:bg-primary/20"
              >
                {isUploadingMaterial ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FolderPlus className="w-3.5 h-3.5" />
                )}
                ADD FILE
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={selectAllMaterials}
                className="h-8 rounded-none px-3 font-arcade text-[10px] border-2 border-secondary/40 text-muted-foreground hover:border-secondary hover:text-foreground"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                ALL
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={clearSelectedMaterials}
                className="h-8 rounded-none px-3 font-arcade text-[10px] border-2 border-secondary/40 text-muted-foreground hover:border-secondary hover:text-foreground"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                NONE
              </Button>
            </div>
            {showMaterialPanel && (
              <div className="p-2 space-y-2">
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragActive(true);
                  }}
                  onDragLeave={() => setIsDragActive(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragActive(false);
                    void handleUploadFiles(e.dataTransfer.files);
                  }}
                  className={`border-2 border-dashed px-3 py-2 text-xs font-terminal ${
                    isDragActive ? "border-primary text-primary bg-primary/10" : "border-secondary/40 text-muted-foreground"
                  }`}
                >
                  <Upload className="w-3.5 h-3.5 inline mr-1.5" />
                  Drag file here to add to chat + library, or use ADD FILE.
                </div>

                {selectedMaterialIds.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {availableMaterials
                      .filter((m) => selectedMaterialIds.includes(m.id))
                      .map((m) => (
                        <Badge
                          key={`selected-${m.id}`}
                          variant="outline"
                          className="rounded-none text-[10px] font-terminal border-primary/50"
                        >
                          {m.title || `Material ${m.id}`}
                        </Badge>
                      ))}
                  </div>
                )}

                <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                  {availableMaterials.map((material) => {
                    const checked = selectedMaterialIds.includes(material.id);
                    return (
                      <label
                        key={material.id}
                        className={`flex items-center gap-2 px-2 py-1 border text-xs font-terminal cursor-pointer ${
                          checked
                            ? "border-primary/60 bg-primary/10 text-foreground"
                            : "border-secondary/30 text-muted-foreground hover:border-secondary/60 hover:text-foreground"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleMaterial(material.id)}
                          className="h-3.5 w-3.5 accent-red-500"
                        />
                        <span className="truncate">
                          {material.title || `Material ${material.id}`}{" "}
                          <span className="opacity-60">({material.file_type || "file"})</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 min-w-0">
              <label
                htmlFor="accuracy-profile-select"
                className="font-terminal text-xs text-muted-foreground whitespace-nowrap"
              >
                Profile
              </label>
              <select
                id="accuracy-profile-select"
                value={accuracyProfile}
                onChange={(e) => onAccuracyProfileChange(e.target.value as TutorAccuracyProfile)}
                disabled={isStreaming}
                className="h-9 bg-black border-2 border-secondary px-2 text-xs font-terminal text-foreground focus:border-primary focus:outline-none disabled:opacity-50"
              >
                <option value="balanced">Balanced</option>
                <option value="strict">Strict</option>
                <option value="coverage">Coverage</option>
              </select>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(["socratic", "evaluate", "concept_map", "teach_back"] as const).map((mode) => {
                const active = behaviorOverride === mode;
                const labels: Record<BehaviorOverride, string> = {
                  socratic: "ASK / SOCRATIC",
                  evaluate: "EVALUATE",
                  concept_map: "CONCEPT MAP",
                  teach_back: "TEACH-BACK",
                };
                const titles: Record<BehaviorOverride, string> = {
                  socratic: "Socratic — respond with questions only",
                  evaluate: "Evaluate — assess your answer",
                  concept_map: "Concept Map — generate Mermaid diagram",
                  teach_back: "Teach-Back — explain as if teaching a novice",
                };
                return (
                  <button
                    key={mode}
                    type="button"
                    title={titles[mode]}
                    onClick={() => setBehaviorOverride(active ? null : mode)}
                    disabled={isStreaming}
                    className={`h-8 px-3 font-arcade text-[10px] tracking-wider border-2 transition-colors disabled:opacity-50 ${active
                      ? "bg-primary/20 border-primary text-primary"
                      : "border-secondary/40 text-muted-foreground hover:border-secondary hover:text-foreground"
                      }`}
                  >
                    {labels[mode]}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex md:flex-row flex-col items-stretch md:items-center gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question..."
              disabled={isStreaming}
              className="flex-1 min-w-[180px] bg-black/40 border-2 border-primary rounded-none px-3 py-2 text-[17px] leading-7 font-terminal text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none disabled:opacity-50 shadow-none"
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || isStreaming}
              aria-label="Send message"
              className="rounded-none border-[3px] border-double border-primary h-11 w-full md:w-11 p-0 shrink-0"
            >
              {isStreaming ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              ) : (
                <Send className="w-5 h-5 mx-auto" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
