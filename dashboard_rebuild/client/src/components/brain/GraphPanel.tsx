import { useState, lazy, Suspense, Component, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const ConceptMapEditor = lazy(() => import("@/components/ConceptMapEditor").then(m => ({ default: m.ConceptMapEditor })));
const VaultGraphView = lazy(() => import("@/components/VaultGraphView").then(m => ({ default: m.VaultGraphView })));
const MindMapView = lazy(() => import("@/components/MindMapView").then(m => ({ default: m.MindMapView })));

class GraphErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null };
  static getDerivedStateFromError(err: Error) {
    return { error: err.message };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-2 p-4">
          <p className="font-arcade text-xs text-red-400">GRAPH RENDER ERROR</p>
          <p className="font-terminal text-xs text-muted-foreground text-center">{this.state.error}</p>
          <button
            className="font-terminal text-sm text-primary underline"
            onClick={() => this.setState({ error: null })}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function GraphLoading() {
  return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );
}

type GraphView = "concept" | "vault" | "mindmap";

export function GraphPanel() {
  const [view, setView] = useState<GraphView>("concept");

  const views: { id: GraphView; label: string }[] = [
    { id: "concept", label: "Concept Map" },
    { id: "vault", label: "Vault Graph" },
    { id: "mindmap", label: "Mind Map" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Sub-tabs: same height/padding as main tabs, global tab-sub-bar */}
      <div className="tab-sub-bar" role="tablist" aria-label="Graph view">
        {views.map((v) => (
          <button
            key={v.id}
            role="tab"
            aria-selected={view === v.id}
            onClick={() => setView(v.id)}
            className={cn("tab-sub-item", view === v.id && "active")}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Graph content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <GraphErrorBoundary>
          <Suspense fallback={<GraphLoading />}>
            {view === "concept" && <ConceptMapEditor />}
            {view === "vault" && <VaultGraphView />}
            {view === "mindmap" && <MindMapView />}
          </Suspense>
        </GraphErrorBoundary>
      </div>
    </div>
  );
}
