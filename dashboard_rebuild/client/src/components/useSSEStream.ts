import { useState, useRef, useEffect, useCallback, type Dispatch, type SetStateAction } from "react";
import type { TutorCitation, TutorRetrievalDebug, TutorSSEChunk, TutorVerdict, TeachBackRubric, BehaviorOverride, TutorAccuracyProfile } from "@/lib/api";
import type { ChatMessage, ToolAction } from "./TutorChat.types";
import { normalizeArtifactType, parseArtifactCommand, detectMarkdownTable, detectMermaidBlock, TOOL_LABELS } from "./TutorChat.types";

interface UseSSEStreamOptions {
  sessionId: string | null;
  selectedMaterialIds: number[];
  selectedVaultPaths: string[];
  accuracyProfile: TutorAccuracyProfile;
  behaviorOverride: BehaviorOverride | null;
  onBehaviorOverrideReset: () => void;
  onArtifactCreated: (artifact: { type: string; content: string; title?: string }) => void;
  onAssistantTurnCommitted?: (payload: {
    userMessage: string;
    assistantMessage: ChatMessage;
  }) => void;
  onTurnComplete?: (masteryUpdate?: { skill_id: string; new_mastery: number; correct: boolean }) => void;
  initialTurns?: { question: string; answer: string | null }[];
  materialsOn: boolean;
  obsidianOn: boolean;
  webSearchOn: boolean;
  deepThinkOn: boolean;
  geminiVisionOn: boolean;
}

interface UseSSEStreamReturn {
  messages: ChatMessage[];
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
  isStreaming: boolean;
  sendMessage: () => void;
  streamAbortRef: React.MutableRefObject<AbortController | null>;
}

function extractReferenceTargetsFromMessage(message: string): string[] {
  const matches = message.matchAll(/(^|\s)@([^\s@][^\s]*)/g);
  const targets = Array.from(
    new Set(
      Array.from(matches)
        .map((match) => match[2]?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  );
  return targets;
}

export function useSSEStream(options: UseSSEStreamOptions): UseSSEStreamReturn {
  const {
    sessionId,
    selectedMaterialIds,
    selectedVaultPaths,
    accuracyProfile,
    behaviorOverride,
    onBehaviorOverrideReset,
    onArtifactCreated,
    onAssistantTurnCommitted,
    onTurnComplete,
    initialTurns,
    materialsOn,
    obsidianOn,
    webSearchOn,
    deepThinkOn,
    geminiVisionOn,
  } = options;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const streamAbortRef = useRef<AbortController | null>(null);

  const createMessageId = useCallback((role: "user" | "assistant") => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }, []);

  // Reset transient chat state when session context changes.
  // If initialTurns are provided (session restore), hydrate messages from them.
  useEffect(() => {
    streamAbortRef.current?.abort();
    streamAbortRef.current = null;
    setInput("");
    setIsStreaming(false);
    if (initialTurns && initialTurns.length > 0) {
      const restored: ChatMessage[] = [];
      for (const [index, turn] of initialTurns.entries()) {
        restored.push({
          messageId: createMessageId("user"),
          createdAt: new Date().toISOString(),
          sessionTurnNumber: index + 1,
          role: "user",
          content: turn.question,
        });
        if (turn.answer) {
          restored.push({
            messageId: createMessageId("assistant"),
            createdAt: new Date().toISOString(),
            sessionTurnNumber: index + 1,
            role: "assistant",
            content: turn.answer,
          });
        }
      }
      setMessages(restored);
    } else {
      setMessages([]);
    }
  }, [createMessageId, sessionId, initialTurns]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || !sessionId || isStreaming) return;

    const userMessage = input.trim();
    const referenceTargets = extractReferenceTargetsFromMessage(userMessage);
    const command = parseArtifactCommand(userMessage);
    setInput("");
    const abortController = new AbortController();
    streamAbortRef.current = abortController;
    const turnNumber =
      messages.filter((message) => message.role === "user").length + 1;
    const userMessageId = createMessageId("user");
    const assistantMessageId = createMessageId("assistant");
    const createdAt = new Date().toISOString();

    // Add user message and placeholder assistant message in one atomic update.
    setMessages((prev) => [
      ...prev,
      {
        messageId: userMessageId,
        createdAt,
        sessionTurnNumber: turnNumber,
        role: "user",
        content: userMessage,
      },
      {
        messageId: assistantMessageId,
        createdAt,
        sessionTurnNumber: turnNumber,
        role: "assistant",
        content: "",
        isStreaming: true,
      },
    ]);
    setIsStreaming(true);
    const activeBehavior = behaviorOverride;
    onBehaviorOverrideReset();

    try {
      const response = await fetch(`/api/tutor/session/${sessionId}/turn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          content_filter: {
            material_ids: selectedMaterialIds,
            accuracy_profile: accuracyProfile,
            ...(selectedVaultPaths.length > 0 ? { folders: selectedVaultPaths } : {}),
            ...(referenceTargets.length > 0 ? { reference_targets: referenceTargets } : {}),
          },
          behavior_override: activeBehavior,
          mode: {
            materials:  materialsOn,
            obsidian:   obsidianOn,
            web_search: webSearchOn,
            deep_think: deepThinkOn,
            gemini_vision: geminiVisionOn,
          },
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
      let parseErrorCount = 0;
      let streamErrored = false;
      let doneSignal = false;
      let sawDoneChunk = false;
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
            sawDoneChunk = true;
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
                const normalizedType = normalizeArtifactType(cmd.type);
                if (normalizedType && !command.type) {
                  serverArtifactCmd = {
                    ...cmd,
                    type: normalizedType,
                  };
                }
              }
            }
          } catch {
            parseErrorCount += 1;
            console.warn("Tutor SSE parse failed", { data });
          }
        }
      }

      if (!streamErrored && parseErrorCount > 0) {
        streamErrored = true;
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (!last || last.role !== "assistant") return prev;
          updated[updated.length - 1] = {
            ...last,
            content: `${last.content}\n\nSome stream chunks were malformed and could not be parsed. Retry this request if the answer is incomplete.`,
            isStreaming: false,
          };
          return updated;
        });
      } else if (!streamErrored && !sawDoneChunk) {
        streamErrored = true;
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (!last || last.role !== "assistant") return prev;
          updated[updated.length - 1] = {
            ...last,
            content: `${last.content}\n\nThe response stream ended before completion. Retry this request.`,
            isStreaming: false,
          };
          return updated;
        });
      }

      if (streamErrored) {
        return;
      }

      const finalAssistantMessage: ChatMessage = {
        messageId: assistantMessageId,
        createdAt,
        sessionTurnNumber: turnNumber,
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

      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (!last || last.role !== "assistant") return prev;
        updated[updated.length - 1] = finalAssistantMessage;
        return updated;
      });

      onAssistantTurnCommitted?.({
        userMessage,
        assistantMessage: finalAssistantMessage,
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
      } else if (serverArtifactCmd?.type) {
        // Backend detected natural language artifact command
        onArtifactCreated({
          type: serverArtifactCmd.type,
          content: fullText,
          title: userMessage.slice(0, 80).trim(),
        });
      } else {
        // Auto-detect tables and mermaid maps in the response
        const detectedTable = detectMarkdownTable(fullText);
        if (detectedTable) {
          onArtifactCreated({
            type: "note",
            content: detectedTable,
            title: `Table from turn`,
          });
        }
        const detectedMermaid = detectMermaidBlock(fullText);
        if (detectedMermaid) {
          onArtifactCreated({
            type: "map",
            content: "```mermaid\n" + detectedMermaid + "\n```",
            title: `Structured map from turn`,
          });
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (!last || last.role !== "assistant") return prev;
          updated[updated.length - 1] = {
            ...last,
            content: last.content || "(stopped)",
            isStreaming: false,
          };
          return updated;
        });
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
    onBehaviorOverrideReset,
    onArtifactCreated,
    onAssistantTurnCommitted,
    onTurnComplete,
    selectedMaterialIds,
    selectedVaultPaths,
    accuracyProfile,
    materialsOn,
    obsidianOn,
    webSearchOn,
    deepThinkOn,
    geminiVisionOn,
    messages,
    createMessageId,
  ]);

  return {
    messages,
    setMessages,
    input,
    setInput,
    isStreaming,
    sendMessage,
    streamAbortRef,
  };
}
