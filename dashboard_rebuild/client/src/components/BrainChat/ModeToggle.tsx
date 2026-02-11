import { MessageSquare, BrainCircuit, Layers, BookOpen } from "lucide-react";
import type { Mode, IngestTarget } from "./types";
import { CHATGPT_ANKI_PROMPT } from "./types";

interface ModeToggleProps {
  mode: Mode;
  setMode: (mode: Mode) => void;
  ingestTarget: IngestTarget;
  setIngestTarget: (target: IngestTarget) => void;
  promptCopied: boolean;
  setPromptCopied: (copied: boolean) => void;
}

export function ModeToggle({
  mode,
  setMode,
  ingestTarget,
  setIngestTarget,
  promptCopied,
  setPromptCopied,
}: ModeToggleProps) {
  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(CHATGPT_ANKI_PROMPT);
    setPromptCopied(true);
    setTimeout(() => setPromptCopied(false), 2000);
  };

  return (
    <div className="px-3 py-1 border-b border-primary/30 flex items-center justify-between gap-2 shrink-0">
      <div className="flex bg-black/40 border border-primary/40 rounded-none overflow-hidden mr-2">
        <button
          onClick={() => setMode("chat")}
          className={`flex items-center gap-1 px-2 py-0.5 text-xs font-arcade transition-colors ${
            mode === "chat"
              ? "bg-primary text-black"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <MessageSquare className="w-3 h-3" /> CHAT
        </button>
        <button
          onClick={() => setMode("ingest")}
          className={`flex items-center gap-1 px-2 py-0.5 text-xs font-arcade transition-colors ${
            mode === "ingest"
              ? "bg-primary text-black"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <BrainCircuit className="w-3 h-3" /> INGEST
        </button>
      </div>

      <p className="text-xs text-muted-foreground truncate flex-1">
        {mode === "chat"
          ? "Chat with Gemini Flash"
          : "Paste notes to create cards & save sessions"}
      </p>

      {mode === "ingest" && (
        <>
          <div className="flex bg-black/40 border border-primary/40 rounded-none overflow-hidden shrink-0">
            {(["anki", "obsidian", "both"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setIngestTarget(t)}
                className={`flex items-center gap-1 px-2 py-0.5 text-xs font-arcade transition-colors ${
                  ingestTarget === t
                    ? "bg-primary text-black"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "anki" && (
                  <>
                    <Layers className="w-3 h-3" /> ANKI
                  </>
                )}
                {t === "obsidian" && (
                  <>
                    <BookOpen className="w-3 h-3" /> OBSIDIAN
                  </>
                )}
                {t === "both" && <>BOTH</>}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="bg-primary hover:bg-primary/80 px-2 py-0.5 rounded-none text-xs font-terminal shrink-0"
            onClick={handleCopyPrompt}
          >
            {promptCopied ? "Copied!" : "Copy Prompt"}
          </button>
        </>
      )}
    </div>
  );
}
