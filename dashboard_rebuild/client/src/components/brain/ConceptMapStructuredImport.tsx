import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Import, Plus } from "lucide-react";
import { DIAGRAM_TEMPLATES } from "@/lib/diagram-templates";
import { cn } from "@/lib/utils";

interface ConceptMapStructuredImportProps {
  mermaidInput: string;
  onMermaidInputChange: (value: string) => void;
  onImport: (code: string) => void;
  onBlank: () => void;
  className?: string;
}

export function ConceptMapStructuredImport({
  mermaidInput,
  onMermaidInputChange,
  onImport,
  onBlank,
  className,
}: ConceptMapStructuredImportProps) {
  return (
    <div className={cn("flex flex-col items-center h-full p-4 gap-3 overflow-auto", className)}>
      <p className="font-arcade text-xs text-primary">CONCEPT MAP EDITOR</p>

      <p className="font-terminal text-xs text-muted-foreground">START FROM TEMPLATE</p>
      <div className="grid grid-cols-2 gap-2 w-full max-w-md">
        {DIAGRAM_TEMPLATES.map((t) => (
          <button
            key={t.id}
            onClick={() => onImport(t.mermaid)}
            className="border-[3px] border-double border-secondary/50 hover:border-primary p-3 cursor-pointer text-left transition-colors bg-black/40"
          >
            <p className="font-terminal text-xs text-primary">{t.name}</p>
            <p className="font-terminal text-xs text-muted-foreground mt-0.5">{t.description}</p>
          </button>
        ))}
      </div>

      <div className="w-px h-2" />
      <p className="font-terminal text-xs text-muted-foreground">OR PASTE MERMAID CODE</p>
      <Textarea
        value={mermaidInput}
        onChange={(e) => onMermaidInputChange(e.target.value)}
        placeholder={`graph TD\n    A["Main Topic"]\n    B["Subtopic 1"]\n    C["Subtopic 2"]\n    A --> B\n    A --> C`}
        className="w-full max-w-md h-32 font-mono text-xs rounded-none border-secondary bg-black/60"
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          className="font-terminal text-xs rounded-none"
          onClick={() => onImport(mermaidInput)}
          disabled={!mermaidInput.trim()}
        >
          <Import className="w-3 h-3 mr-1" />
          Import
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="font-terminal text-xs rounded-none"
          onClick={onBlank}
        >
          <Plus className="w-3 h-3 mr-1" />
          Blank Canvas
        </Button>
      </div>
    </div>
  );
}
