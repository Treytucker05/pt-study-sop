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
      <div className="section-block section-block-gap border-primary/30 shrink-0 flex-row flex-wrap gap-2">
        <span className="section-header text-primary/90 w-full sm:w-auto">Concept Map</span>
        <div className="flex items-center gap-1 flex-wrap">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              className={cn(
                "tab-sub-item min-h-[32px]",
                mode === m.id && "active"
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
        <span className="text-[10px] font-terminal text-muted-foreground ml-auto">
          {mode === "freehand" ? "tldraw · infinite canvas" : "Mermaid + React Flow"}
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
