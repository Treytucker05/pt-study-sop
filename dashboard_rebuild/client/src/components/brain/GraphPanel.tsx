import { useState, lazy, Suspense, Component, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

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
      {/* Sub-selector pills */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-secondary/30 bg-black/40 shrink-0">
        {views.map((v) => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            className={`px-2.5 py-1 font-terminal text-xs transition-colors ${
              view === v.id
                ? "bg-primary/20 text-primary border border-primary/40"
                : "text-muted-foreground hover:text-foreground border border-transparent"
            }`}
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
