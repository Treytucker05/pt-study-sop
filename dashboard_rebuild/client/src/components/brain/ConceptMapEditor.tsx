import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { ConceptMapFreehand } from "./ConceptMapFreehand";
import { ConceptMapStructured } from "./ConceptMapStructured";

type ConceptMapMode = "freehand" | "structured";

interface ConceptMapEditorProps {
  initialMermaid?: string;
  onSave?: (mermaid: string) => void;
  className?: string;
}

const MODES: { id: ConceptMapMode; label: string }[] = [
  { id: "freehand", label: "Freehand" },
  { id: "structured", label: "Structured (Mermaid)" },
];

export function ConceptMapEditor({
  initialMermaid,
  onSave,
  className,
}: ConceptMapEditorProps) {
  const [mode, setMode] = useState<ConceptMapMode>("freehand");
  const [mermaidToImport, setMermaidToImport] = useState<string | null>(null);

  const handleImportMermaidAndSwitch = useCallback((mermaid: string) => {
    setMermaidToImport(mermaid.trim() || null);
    setMode("structured");
  }, []);

  const clearMermaidToImport = useCallback(() => setMermaidToImport(null), []);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="flex items-center gap-2 px-2 py-1 border-b border-primary/20 bg-black/40 shrink-0">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMode(m.id)}
            className={cn(
              "px-2 py-1 font-arcade text-xs transition-colors rounded-none",
              mode === m.id
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {m.label}
          </button>
        ))}
        <span className="text-xs font-terminal text-muted-foreground/50 ml-auto">
          {mode === "freehand" ? "tldraw" : "mermaid"}
        </span>
      </div>

      <div className="flex-1 min-h-0">
        {mode === "freehand" ? (
          <ConceptMapFreehand
            className="h-full"
            onImportMermaid={handleImportMermaidAndSwitch}
          />
        ) : (
          <ConceptMapStructured
            initialMermaid={mermaidToImport ?? initialMermaid}
            onSave={onSave}
            onInitialMermaidConsumed={clearMermaidToImport}
            className="h-full"
          />
        )}
      </div>
    </div>
  );
}
