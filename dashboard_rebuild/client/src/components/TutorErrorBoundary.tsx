import { Component, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TutorErrorBoundaryProps {
  children: ReactNode;
  fallbackLabel?: string;
}

interface TutorErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class TutorErrorBoundary extends Component<
  TutorErrorBoundaryProps,
  TutorErrorBoundaryState
> {
  constructor(props: TutorErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): TutorErrorBoundaryState {
    return { hasError: true, error };
  }

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallbackLabel = "this tab" } = this.props;

    if (!hasError) {
      return children;
    }

    return (
      <div className="flex items-center justify-center h-full">
        <div className="rounded-none border-2 border-primary/20 bg-black/40 max-w-md w-full p-8 text-center space-y-4">
          <AlertTriangle className="mx-auto h-8 w-8 text-primary/60" />
          <div className="font-arcade text-sm text-primary">
            SOMETHING WENT WRONG
          </div>
          <div className="font-terminal text-sm text-muted-foreground">
            {fallbackLabel} encountered an error. Click below to try again.
          </div>
          {error?.message && (
            <div className="text-red-400/70 text-[10px] break-words">
              {error.message}
            </div>
          )}
          <Button
            className="rounded-none border-2 border-primary font-arcade text-[10px]"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            RETRY
          </Button>
        </div>
      </div>
    );
  }
}
