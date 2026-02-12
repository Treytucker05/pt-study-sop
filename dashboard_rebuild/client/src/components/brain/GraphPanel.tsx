import { lazy, Suspense, Component, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
const UnifiedBrainCanvas = lazy(() =>
  import("./UnifiedBrainCanvas").then((m) => ({ default: m.UnifiedBrainCanvas }))
);

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

export function GraphPanel() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 min-h-0 overflow-hidden">
        <GraphErrorBoundary>
          <Suspense fallback={<GraphLoading />}>
            <UnifiedBrainCanvas />
          </Suspense>
        </GraphErrorBoundary>
      </div>
    </div>
  );
}
