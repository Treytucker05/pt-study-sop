import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  Loader2,
  FileText,
  CreditCard,
  Map,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { type TutorCitation, type TutorSSEChunk } from "@/lib/api";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  citations?: TutorCitation[];
  model?: string;
  isStreaming?: boolean;
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
  engine?: string;
  onArtifactCreated: (artifact: { type: string; content: string; title?: string }) => void;
  focusMode?: boolean;
  onTurnComplete?: () => void;
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

export function TutorChat({
  sessionId,
  engine,
  onArtifactCreated,
  focusMode = false,
  onTurnComplete,
}: TutorChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
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

    try {
      const response = await fetch(`/api/tutor/session/${sessionId}/turn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage, ...(engine ? { engine } : {}) }),
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
      let serverArtifactCmd: { type?: string; raw?: string } | null = null;
      let streamErrored = false;
      let doneSignal = false;

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

      // Finalize message
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (!last || last.role !== "assistant") return prev;
        updated[updated.length - 1] = {
          role: "assistant",
          content: fullText,
          citations,
          model: modelId,
          isStreaming: false,
        };
        return updated;
      });

      // Notify turn completion
      onTurnComplete?.();

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
  }, [input, sessionId, isStreaming, engine, onArtifactCreated, onTurnComplete]);

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
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div
        ref={scrollRef}
        className={`flex-1 overflow-y-auto space-y-4 bg-zinc-950/30 ${
          focusMode ? "p-5 md:p-6" : "p-4"
        }`}
      >
        {messages.length === 0 && (
          <div className="text-center py-8 space-y-2">
            <div className="font-arcade text-sm text-primary">
              SESSION STARTED
            </div>
            <div className="font-sans text-lg text-muted-foreground leading-7">
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
              className={`px-3 py-2 text-[17px] leading-7 font-sans ${
                msg.role === "user"
                  ? "max-w-[72%]"
                  : focusMode
                    ? "max-w-[98%]"
                    : "max-w-[96%]"
              } ${
                msg.role === "user"
                  ? "bg-primary/15 border-2 border-primary/40 text-foreground"
                  : "bg-zinc-900/95 border-2 border-zinc-600 text-zinc-100"
              }`}
            >
              {msg.role === "assistant" ? (
                <div className="prose prose-invert prose-lg max-w-none font-sans [&_p]:my-2 [&_li]:my-1 [&_p]:leading-7 [&_li]:leading-7 [&_code]:text-base [&_pre]:text-base">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content || (msg.isStreaming ? "..." : "")}
                  </ReactMarkdown>
                  {msg.isStreaming && (
                    <span className="inline-block w-2 h-3 bg-primary animate-pulse ml-0.5" />
                  )}
                </div>
              ) : (
                <div>{msg.content}</div>
              )}

              {/* Action buttons for completed assistant messages */}
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
                    className="flex items-center gap-1 px-2 py-1 text-xs font-terminal text-muted-foreground hover:text-primary hover:bg-primary/10 border border-primary/20 hover:border-primary/50 transition-colors"
                  >
                    <FileText className="w-3 h-3" /> Save Note
                  </button>
                  <button
                    onClick={() =>
                      onArtifactCreated({
                        type: "card",
                        content: msg.content,
                        title: `Tutor card ${i}`,
                      })
                    }
                    className="flex items-center gap-1 px-2 py-1 text-xs font-terminal text-muted-foreground hover:text-primary hover:bg-primary/10 border border-primary/20 hover:border-primary/50 transition-colors"
                  >
                    <CreditCard className="w-3 h-3" /> Create Card
                  </button>
                  <button
                    onClick={() => {
                      onArtifactCreated({
                        type: "map",
                        content: msg.content,
                        title: `Tutor map ${i}`,
                      });
                    }}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-terminal text-muted-foreground hover:text-primary hover:bg-primary/10 border border-primary/20 hover:border-primary/50 transition-colors"
                  >
                    <Map className="w-3 h-3" /> Create Map
                  </button>
                </div>
              )}

              {/* Citations + Model */}
              {(msg.citations?.length || msg.model) && !msg.isStreaming ? (
                <div className="flex flex-wrap items-center gap-1 mt-2 pt-2 border-t border-primary/20">
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

      <div className="flex items-center gap-2 p-3 border-t-2 border-primary/20">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question..."
          disabled={isStreaming}
          className="flex-1 bg-zinc-950 border-2 border-zinc-600 rounded-none px-3 py-2 text-[17px] leading-7 font-sans text-zinc-100 placeholder:text-zinc-400 focus:border-primary focus:outline-none disabled:opacity-50"
        />
        <Button
          onClick={sendMessage}
          disabled={!input.trim() || isStreaming}
          className="rounded-none border-[3px] border-double border-primary h-11 w-11 p-0"
        >
          {isStreaming ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </Button>
      </div>
    </div>
  );
}
