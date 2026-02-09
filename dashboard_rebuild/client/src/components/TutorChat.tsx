import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  Loader2,
  FileText,
  CreditCard,
  Map,
  Square,
  ChevronDown,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { TutorCitation, TutorSSEChunk } from "@/lib/api";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  citations?: TutorCitation[];
  isStreaming?: boolean;
}

interface TutorChatProps {
  sessionId: string | null;
  onArtifactCreated: (artifact: { type: string; content: string; title?: string }) => void;
  onSessionEnd: () => void;
}

export function TutorChat({ sessionId, onArtifactCreated, onSessionEnd }: TutorChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const sendMessage = useCallback(async () => {
    if (!input.trim() || !sessionId || isStreaming) return;

    const userMessage = input.trim();
    setInput("");

    // Check for slash commands
    const isNoteCmd = /^\/(note|save)\b/i.test(userMessage);
    const isCardCmd = /^\/(card|flashcard)\b/i.test(userMessage);
    const isMapCmd = /^\/(map|diagram)\b/i.test(userMessage);

    // Add user message
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);

    // Add empty assistant message for streaming
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "", isStreaming: true },
    ]);
    setIsStreaming(true);

    try {
      const response = await fetch(`/api/tutor/session/${sessionId}/turn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No response body");

      let buffer = "";
      let fullText = "";
      let citations: TutorCitation[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") break;

          try {
            const parsed: TutorSSEChunk = JSON.parse(data);

            if (parsed.type === "error") {
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: `Error: ${parsed.content}`,
                };
                return updated;
              });
              setIsStreaming(false);
              return;
            }

            if (parsed.type === "token" && parsed.content) {
              fullText += parsed.content;
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
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
            }
          } catch {
            /* skip malformed */
          }
        }
      }

      // Finalize message
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: fullText,
          citations,
          isStreaming: false,
        };
        return updated;
      });

      // Handle artifact slash commands after response
      if (isNoteCmd || isCardCmd || isMapCmd) {
        const artifactType = isNoteCmd ? "note" : isCardCmd ? "card" : "map";
        onArtifactCreated({
          type: artifactType,
          content: fullText,
          title: userMessage.replace(/^\/(note|card|flashcard|map|diagram|save)\s*/i, "").trim(),
        });
      }
    } catch (err) {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: `Connection error: ${err instanceof Error ? err.message : "Unknown"}`,
        };
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  }, [input, sessionId, isStreaming, onArtifactCreated]);

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
          <div className="font-terminal text-xs text-muted-foreground/70">
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
        className="flex-1 overflow-y-auto p-3 space-y-3"
      >
        {messages.length === 0 && (
          <div className="text-center py-8 space-y-2">
            <div className="font-arcade text-xs text-primary">
              SESSION STARTED
            </div>
            <div className="font-terminal text-xs text-muted-foreground">
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
              className={`max-w-[85%] px-3 py-2 text-xs font-terminal ${
                msg.role === "user"
                  ? "bg-primary/20 border-2 border-primary/50 text-foreground"
                  : "bg-black/40 border-2 border-muted-foreground/20 text-foreground"
              }`}
            >
              {msg.role === "assistant" ? (
                <div className="prose prose-invert prose-xs max-w-none [&_p]:my-1 [&_li]:my-0.5 [&_h1]:text-sm [&_h2]:text-xs [&_h3]:text-xs [&_code]:text-[10px] [&_pre]:text-[10px]">
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

              {/* Citations */}
              {msg.citations && msg.citations.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-muted-foreground/20">
                  {msg.citations.map((c) => (
                    <Badge
                      key={c.index}
                      variant="outline"
                      className="text-[10px] rounded-none"
                    >
                      [{c.index}] {c.source}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Command hints */}
      <div className="flex items-center gap-2 px-3 py-1 border-t border-muted-foreground/20">
        <span className="text-[10px] font-terminal text-muted-foreground/50">
          Commands:
        </span>
        <Badge variant="outline" className="text-[10px] rounded-none cursor-pointer hover:bg-primary/10"
          onClick={() => setInput("/note ")}>
          <FileText className="w-2.5 h-2.5 mr-1" />/note
        </Badge>
        <Badge variant="outline" className="text-[10px] rounded-none cursor-pointer hover:bg-primary/10"
          onClick={() => setInput("/card ")}>
          <CreditCard className="w-2.5 h-2.5 mr-1" />/card
        </Badge>
        <Badge variant="outline" className="text-[10px] rounded-none cursor-pointer hover:bg-primary/10"
          onClick={() => setInput("/map ")}>
          <Map className="w-2.5 h-2.5 mr-1" />/map
        </Badge>

        <div className="flex-1" />

        <Button
          variant="ghost"
          size="sm"
          onClick={onSessionEnd}
          className="text-[10px] font-terminal text-destructive hover:text-destructive h-5 px-2"
        >
          <Square className="w-2.5 h-2.5 mr-1" />
          END
        </Button>
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 p-3 border-t-2 border-muted-foreground/30">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question..."
          disabled={isStreaming}
          className="flex-1 bg-black/60 border-2 border-muted-foreground/30 px-3 py-2 text-xs font-terminal text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none disabled:opacity-50"
        />
        <Button
          onClick={sendMessage}
          disabled={!input.trim() || isStreaming}
          className="rounded-none border-2 border-primary h-9 w-9 p-0"
        >
          {isStreaming ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
