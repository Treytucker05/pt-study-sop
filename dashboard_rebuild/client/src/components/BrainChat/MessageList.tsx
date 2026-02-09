import { useRef, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";
import type { ChatMessage, Mode } from "./types";

interface MessageListProps {
  messages: ChatMessage[];
  loading: boolean;
  mode: Mode;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}

export function MessageList({ messages, loading, mode, scrollRef }: MessageListProps) {
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [scrollRef]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
      {messages.length === 0 && (
        <p className="text-muted-foreground text-sm font-terminal text-center py-8">
          {mode === "chat"
            ? "Ask anything. Paste screenshots with Ctrl+V."
            : "Paste your study notes to ingest into Brain."}
        </p>
      )}

      {messages.map((m, i) => (
        <div
          key={i}
          className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`max-w-[80%] rounded-none px-3 py-2 text-sm font-terminal whitespace-pre-wrap ${
              m.role === "user"
                ? "bg-primary/20 text-foreground border border-primary/30"
                : "bg-secondary/40 text-foreground border border-secondary/60"
            }`}
          >
            {m.images?.map((img, j) => (
              <img
                key={j}
                src={img}
                alt="attached"
                className="max-h-32 rounded-none mb-1"
              />
            ))}
            {m.content}
          </div>
        </div>
      ))}

      {loading && (
        <div className="flex justify-start">
          <div className="bg-secondary/40 border border-secondary/60 rounded-none px-3 py-2">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
          </div>
        </div>
      )}
    </div>
  );
}
