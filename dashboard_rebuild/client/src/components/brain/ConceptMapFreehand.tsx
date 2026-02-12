import { cn } from "@/lib/utils";
import type { GraphCanvasCommand, GraphCanvasStatus } from "./graph-canvas-types";

interface ConceptMapFreehandProps {
  className?: string;
  initialSnapshot?: unknown;
  initialTitle?: string;
  hideToolbar?: boolean;
  externalCommand?: GraphCanvasCommand | null;
  onStatusChange?: (status: GraphCanvasStatus) => void;
  onImportMermaid?: (mermaid: string) => void;
}

export function ConceptMapFreehand({ className }: ConceptMapFreehandProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center h-full gap-4 text-muted-foreground", className)}>
      <p className="font-arcade text-sm text-primary">FREEHAND MOVED TO CANVAS TAB</p>
      <p className="font-terminal text-base">
        Switch to the CANVAS tab (Alt+1) for the full Excalidraw drawing experience.
      </p>
    </div>
  );
}
