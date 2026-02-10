import { useState } from "react";
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
  { id: "freehand", label: "FREEHAND" },
  { id: "structured", label: "STRUCTURED" },
];

export function ConceptMapEditor({
  initialMermaid,
  onSave,
  className,
}: ConceptMapEditorProps) {
  const [mode, setMode] = useState<ConceptMapMode>("freehand");

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="flex items-center gap-1 px-2 py-1 border-b border-secondary/30 bg-black/40 shrink-0">
        <span className="font-arcade text-[10px] text-primary mr-2">
          CONCEPT MAP
        </span>
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={cn(
              "px-2.5 py-1 text-[10px] font-terminal border transition-colors",
              mode === m.id
                ? "border-primary text-primary bg-primary/10"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-secondary/40"
            )}
          >
            {m.label}
          </button>
        ))}
        <span className="ml-auto text-[9px] font-terminal text-muted-foreground">
          {mode === "freehand" ? "tldraw canvas" : "Mermaid + React Flow"}
        </span>
      </div>

      <div className="flex-1 min-h-0">
        {mode === "freehand" ? (
          <ConceptMapFreehand className="h-full" />
        ) : (
          <ConceptMapStructured
            initialMermaid={initialMermaid}
            onSave={onSave}
            className="h-full"
          />
        )}
      </div>
    </div>
  );
}
