import { MessageSquare, ChevronRight, ChevronLeft } from "lucide-react";
import { BrainChat } from "@/components/BrainChat";
import { ErrorBoundary, TabErrorFallback } from "@/components/ErrorBoundary";
import { useState } from "react";

interface ChatSidePanelProps {
  expanded: boolean;
  onToggle: () => void;
}

export function ChatSidePanel({ expanded, onToggle }: ChatSidePanelProps) {
  const [errorKey, setErrorKey] = useState(0);

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="chat-side-rail"
        title="Expand chat panel"
        aria-label="Expand chat panel"
      >
        <ChevronLeft className="w-3 h-3 text-muted-foreground shrink-0" />
        <span className="chat-side-rail__label">CHAT</span>
      </button>
    );
  }

  return (
    <div className="chat-side-panel">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-primary/20 bg-black/40 shrink-0 h-8">
        <span className="font-arcade text-[8px] text-primary tracking-wider">
          BRAIN CHAT
        </span>
        <button
          type="button"
          onClick={onToggle}
          className="p-1 text-muted-foreground hover:text-foreground transition-colors"
          title="Collapse chat panel"
          aria-label="Collapse chat panel"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        <ErrorBoundary
          key={errorKey}
          fallback={
            <TabErrorFallback
              tabName="CHAT"
              onReset={() => setErrorKey((k) => k + 1)}
            />
          }
        >
          <BrainChat />
        </ErrorBoundary>
      </div>
    </div>
  );
}
