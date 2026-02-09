import { Component, type ReactNode, type ErrorInfo } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: Array<string | number>;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught error:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && this.props.resetKeys) {
      const keysChanged = this.props.resetKeys.some(
        (key, i) => key !== prevProps.resetKeys?.[i]
      );
      if (keysChanged) {
        this.reset();
      }
    }
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center">
          <AlertTriangle className="w-10 h-10 text-red-500 mb-3" />
          <h3 className="font-arcade text-sm text-red-400 mb-2">
            COMPONENT ERROR
          </h3>
          <p className="font-terminal text-xs text-muted-foreground mb-4 max-w-xs">
            {this.state.error?.message || "Something went wrong"}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={this.reset}
            className="rounded-none font-terminal text-xs"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Specialized error fallback for sidebar
export function SidebarErrorFallback({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-4 text-center">
      <AlertTriangle className="w-8 h-8 text-red-500 mb-2" />
      <p className="font-terminal text-xs text-red-400 mb-2">
        Sidebar Error
      </p>
      <Button
        variant="ghost"
        size="sm"
        onClick={onReset}
        className="rounded-none font-terminal text-xs h-6"
      >
        <RefreshCw className="w-3 h-3 mr-1" />
        Retry
      </Button>
    </div>
  );
}

// Specialized error fallback for tabs
export function TabErrorFallback({
  tabName,
  onReset,
}: {
  tabName: string;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
      <AlertTriangle className="w-10 h-10 text-red-500 mb-3" />
      <h3 className="font-arcade text-sm text-red-400 mb-2">
        {tabName} TAB ERROR
      </h3>
      <p className="font-terminal text-xs text-muted-foreground mb-4">
        Failed to load {tabName.toLowerCase()} view
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={onReset}
        className="rounded-none font-terminal text-xs"
      >
        <RefreshCw className="w-3 h-3 mr-1" />
        Reload Tab
      </Button>
    </div>
  );
}
