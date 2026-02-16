import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  Loader2,
  FileText,
  CreditCard,
  Map,
  Square,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Check,
  Clock,
  ListChecks,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CATEGORY_COLORS, type TutorCitation, type TutorSSEChunk } from "@/lib/api";

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
  onSessionEnd: () => void;
  chainBlocks?: ChainBlock[];
  currentBlockIndex?: number;
  onAdvanceBlock?: () => void;
}

/** Parse facilitation prompt into structured steps */
function parseFacilitationSteps(prompt: string | undefined | null): string[] {
  if (!prompt) return [];
  // Split by numbered lines (1. 2. 3.) or bullet points (- *)
  const lines = prompt.split(/\n/).filter((l) => l.trim());
  const steps: string[] = [];
  for (const line of lines) {
    const cleaned = line.replace(/^\s*(?:\d+[.)]\s*|[-*]\s+)/, "").trim();
    if (cleaned) steps.push(cleaned);
  }
  return steps;
}

export function TutorChat({
  sessionId,
  engine,
  onArtifactCreated,
  onSessionEnd,
  chainBlocks = [],
  currentBlockIndex = 0,
  onAdvanceBlock,
}: TutorChatProps) {
  const hasChain = chainBlocks.length > 0;
  const isChainComplete = hasChain && currentBlockIndex >= chainBlocks.length;
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
        body: JSON.stringify({ message: userMessage, ...(engine ? { engine } : {}) }),
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
      if (!reader) throw new Error("No response body");

      let buffer = "";
      let fullText = "";
      let citations: TutorCitation[] = [];
      let modelId: string | undefined;
      let serverArtifactCmd: { type?: string; raw?: string } | null = null;

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

            if (parsed.type === "web_search_searching") {
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
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
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
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
                if (cmd.type && !isNoteCmd && !isCardCmd && !isMapCmd) {
                  serverArtifactCmd = cmd;
                }
              }
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
          model: modelId,
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
      } else if (serverArtifactCmd?.type) {
        // Backend detected natural language artifact command (e.g. "put that in my notes")
        onArtifactCreated({
          type: serverArtifactCmd.type as "note" | "card" | "map",
          content: fullText,
          title: userMessage.slice(0, 80).trim(),
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
  }, [input, sessionId, isStreaming, engine, onArtifactCreated]);

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

  const [guidanceOpen, setGuidanceOpen] = useState(true);
  const [hoveredBlock, setHoveredBlock] = useState<number | null>(null);
  const currentBlock = hasChain && !isChainComplete ? chainBlocks[currentBlockIndex] : null;
  const facilitationSteps = parseFacilitationSteps(currentBlock?.facilitation_prompt);

  return (
    <div className="flex flex-col h-full">
      {/* Chain Progress Stepper */}
      {hasChain && (
        <div className="shrink-0 border-b-2 border-primary/30 bg-black/40">
          {/* Horizontal stepper */}
          <div className="px-3 py-2 flex items-center gap-1 overflow-x-auto">
            {chainBlocks.map((block, i) => {
              const isCompleted = i < currentBlockIndex;
              const isCurrent = i === currentBlockIndex && !isChainComplete;
              const catColor = CATEGORY_COLORS[block.category as keyof typeof CATEGORY_COLORS] || "#888";
              return (
                <div key={block.id} className="flex items-center shrink-0">
                  {i > 0 && (
                    <ChevronRight className="w-4 h-4 text-muted-foreground/40 mx-0.5" />
                  )}
                  <div
                    className="relative"
                    onMouseEnter={() => setHoveredBlock(i)}
                    onMouseLeave={() => setHoveredBlock(null)}
                  >
                    <div
                      className={`px-2 py-1 border-2 text-base font-terminal flex items-center gap-1 cursor-default transition-colors ${
                        isCurrent
                          ? "border-primary bg-primary/20 text-primary"
                          : isCompleted
                            ? "border-primary/30 bg-primary/5 text-muted-foreground/70 line-through"
                            : "border-primary/20 text-muted-foreground/50"
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : isCurrent ? (
                        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      ) : null}
                      <span className="text-sm">{block.name}</span>
                      {isCurrent && (
                        <span className="text-xs text-muted-foreground ml-1">~{block.duration}m</span>
                      )}
                    </div>
                    {/* Tooltip on hover */}
                    {hoveredBlock === i && block.description && (
                      <div className="absolute z-50 top-full left-0 mt-1 p-2 bg-zinc-900 border-2 border-primary/40 text-sm font-terminal text-muted-foreground max-w-[280px] whitespace-normal">
                        <div className="font-arcade text-xs mb-1" style={{ color: catColor }}>
                          {block.category.toUpperCase()}
                        </div>
                        {block.description}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div className="flex items-center gap-1 ml-auto shrink-0">
              <span className="text-xs font-terminal text-muted-foreground">
                {Math.min(currentBlockIndex + 1, chainBlocks.length)}/{chainBlocks.length}
              </span>
              {!isChainComplete && onAdvanceBlock && (
                <button
                  onClick={onAdvanceBlock}
                  className="px-3 py-1 border-[3px] border-double border-primary/60 text-xs font-arcade text-primary hover:bg-primary/20 transition-colors"
                >
                  NEXT
                </button>
              )}
              {isChainComplete && (
                <span className="px-3 py-1 text-xs font-arcade text-green-400 border-2 border-green-400/50">
                  COMPLETE
                </span>
              )}
            </div>
          </div>

          {/* Block Guidance Panel (collapsible) */}
          {currentBlock && (
            <div className="border-t border-primary/20">
              <button
                onClick={() => setGuidanceOpen(!guidanceOpen)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-primary/5 transition-colors"
              >
                <ListChecks className="w-4 h-4 text-primary" />
                <span className="font-arcade text-xs text-primary">
                  BLOCK GUIDANCE: {currentBlock.name}
                </span>
                <span
                  className="text-xs font-terminal px-1.5 py-0.5 border"
                  style={{ color: CATEGORY_COLORS[currentBlock.category as keyof typeof CATEGORY_COLORS] || "#888", borderColor: (CATEGORY_COLORS[currentBlock.category as keyof typeof CATEGORY_COLORS] || "#888") + "60" }}
                >
                  {currentBlock.category}
                </span>
                <span className="flex items-center gap-0.5 text-xs font-terminal text-muted-foreground ml-auto">
                  <Clock className="w-3 h-3" /> ~{currentBlock.duration}min
                </span>
                {guidanceOpen ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
              {guidanceOpen && (
                <div className="px-3 pb-2 space-y-2">
                  {currentBlock.description && (
                    <p className="text-sm font-terminal text-muted-foreground leading-relaxed">
                      {currentBlock.description}
                    </p>
                  )}
                  {facilitationSteps.length > 0 && (
                    <ol className="space-y-1 pl-1">
                      {facilitationSteps.map((step, si) => (
                        <li
                          key={si}
                          className="flex items-start gap-2 text-sm font-terminal text-muted-foreground"
                        >
                          <span className="shrink-0 w-5 h-5 flex items-center justify-center border border-primary/30 text-xs text-primary mt-0.5">
                            {si + 1}
                          </span>
                          <span className="leading-relaxed">{step}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                  {!currentBlock.description && facilitationSteps.length === 0 && (
                    <p className="text-sm font-terminal text-muted-foreground/60 italic">
                      No specific guidance for this block. Follow the tutor's lead.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 space-y-3 bg-zinc-950/30"
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
              className={`max-w-[85%] px-3 py-2 text-[17px] leading-7 font-sans ${
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
                    onClick={() => onArtifactCreated({ type: "note", content: msg.content, title: `Tutor note ${i}` })}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-terminal text-muted-foreground hover:text-primary hover:bg-primary/10 border border-primary/20 hover:border-primary/50 transition-colors"
                  >
                    <FileText className="w-3 h-3" /> Save Note
                  </button>
                  <button
                    onClick={() => onArtifactCreated({ type: "card", content: msg.content, title: `Tutor card ${i}` })}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-terminal text-muted-foreground hover:text-primary hover:bg-primary/10 border border-primary/20 hover:border-primary/50 transition-colors"
                  >
                    <CreditCard className="w-3 h-3" /> Create Card
                  </button>
                  <button
                    onClick={() => {
                      // Save as note for persistence
                      onArtifactCreated({ type: "note", content: msg.content, title: `Tutor brain ${i}` });
                      // Extract mermaid content if present, otherwise use full text
                      const mermaidMatch = msg.content.match(/```mermaid\n([\s\S]*?)```/);
                      const importContent = mermaidMatch ? mermaidMatch[1].trim() : msg.content;
                      localStorage.setItem("tutor-mermaid-import", importContent);
                      window.location.href = "/brain";
                    }}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-terminal text-muted-foreground hover:text-primary hover:bg-primary/10 border border-primary/20 hover:border-primary/50 transition-colors"
                  >
                    <Map className="w-3 h-3" /> Send to Brain
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

      {/* Command hints */}
      <div className="flex items-center gap-2 px-3 py-2 border-t border-primary/20">
        <span className="text-base font-terminal text-muted-foreground/60">
          Commands:
        </span>
        <Badge variant="outline" className="text-sm rounded-none cursor-pointer hover:bg-primary/10"
          onClick={() => setInput("/note ")}>
          <FileText className="w-4 h-4 mr-1" />/note
        </Badge>
        <Badge variant="outline" className="text-sm rounded-none cursor-pointer hover:bg-primary/10"
          onClick={() => setInput("/card ")}>
          <CreditCard className="w-4 h-4 mr-1" />/card
        </Badge>
        <Badge variant="outline" className="text-sm rounded-none cursor-pointer hover:bg-primary/10"
          onClick={() => setInput("/map ")}>
          <Map className="w-4 h-4 mr-1" />/map
        </Badge>

        <div className="flex-1" />

        <Button
          variant="ghost"
          size="sm"
          onClick={onSessionEnd}
          className="text-sm font-terminal text-destructive hover:text-destructive h-8 px-3"
        >
          <Square className="w-4 h-4 mr-1" />
          END
        </Button>
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
