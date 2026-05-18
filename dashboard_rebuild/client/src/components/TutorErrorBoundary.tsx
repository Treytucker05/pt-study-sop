import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TutorErrorBoundaryProps {
  children: ReactNode;
  fallbackLabel?: string;
}

interface TutorErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  /** True when the error is a stale lazy-chunk fetch (deploy mid-session). */
  isStaleChunk: boolean;
  /** True once we have kicked off the self-healing reload. */
  reloading: boolean;
}

/**
 * A dynamic `import()` of a Vite-built, content-hashed chunk fails when the
 * app is rebuilt/redeployed while the page is still open: the old hash
 * (e.g. StudioTldrawWorkspace-sWdn-uot.js) no longer exists on the server.
 * The browser surfaces this as one of a few message shapes / a
 * `ChunkLoadError`. A soft state-reset RETRY can never fix this — the only
 * cure is reloading the page so the fresh asset manifest is fetched.
 */
function isStaleChunkError(error: unknown): boolean {
  if (!error) return false;
  const err = error as { name?: string; message?: string };
  if (err.name === "ChunkLoadError") return true;
  const msg = String(err.message ?? "");
  return (
    /failed to fetch dynamically imported module/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg) ||
    /importing a module script failed/i.test(msg) ||
    /dynamically imported module.*\.(?:js|mjs)/i.test(msg)
  );
}

const RELOAD_GUARD_KEY = "tutor-stale-chunk-reload-at";
// If a stale-chunk error recurs within this window of our last self-heal
// reload, the reload didn't fix it — stop looping and show a manual prompt.
const RELOAD_GUARD_MS = 15_000;

/** Reload preserving the current URL (deep-link session params) + bust caches. */
function cacheBustingReload(): void {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set("_cb", String(Date.now()));
    window.location.replace(url.toString());
  } catch {
    window.location.reload();
  }
}

export class TutorErrorBoundary extends Component<
  TutorErrorBoundaryProps,
  TutorErrorBoundaryState
> {
  constructor(props: TutorErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      isStaleChunk: false,
      reloading: false,
    };
  }

  static getDerivedStateFromError(error: Error): TutorErrorBoundaryState {
    return {
      hasError: true,
      error,
      isStaleChunk: isStaleChunkError(error),
      reloading: false,
    };
  }

  componentDidCatch(error: Error): void {
    if (!isStaleChunkError(error)) return;
    // Guard against an infinite reload loop: only auto-reload if we haven't
    // just done so. If we reloaded < RELOAD_GUARD_MS ago and still hit a
    // stale-chunk error, the reload didn't help — fall through to the
    // manual prompt instead of looping.
    let lastReloadAt = 0;
    try {
      lastReloadAt = Number(
        window.sessionStorage.getItem(RELOAD_GUARD_KEY) ?? "0",
      );
    } catch {
      lastReloadAt = 0;
    }
    const now = Date.now();
    if (now - lastReloadAt < RELOAD_GUARD_MS) return;
    try {
      window.sessionStorage.setItem(RELOAD_GUARD_KEY, String(now));
    } catch {
      /* sessionStorage unavailable — best-effort, still reload once */
    }
    this.setState({ reloading: true });
    cacheBustingReload();
  }

  render(): ReactNode {
    const { hasError, error, isStaleChunk, reloading } = this.state;
    const { children, fallbackLabel = "this tab" } = this.props;

    if (!hasError) {
      return children;
    }

    if (isStaleChunk && reloading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="rounded-none border-2 border-primary/20 bg-black/40 max-w-md w-full p-8 text-center space-y-4">
            <RefreshCw className="mx-auto h-8 w-8 text-primary/60 animate-spin" />
            <div className="font-arcade text-sm text-primary">
              UPDATING…
            </div>
            <div className="font-terminal text-sm text-muted-foreground">
              A newer version of the app was deployed. Reloading {fallbackLabel}
              {" "}with the latest build…
            </div>
          </div>
        </div>
      );
    }

    const staleChunk = isStaleChunk;

    return (
      <div className="flex items-center justify-center h-full">
        <div className="rounded-none border-2 border-primary/20 bg-black/40 max-w-md w-full p-8 text-center space-y-4">
          <AlertTriangle className="mx-auto h-8 w-8 text-primary/60" />
          <div className="font-arcade text-sm text-primary">
            {staleChunk ? "NEW VERSION AVAILABLE" : "SOMETHING WENT WRONG"}
          </div>
          <div className="font-terminal text-sm text-muted-foreground">
            {staleChunk
              ? `${fallbackLabel} is running an outdated build. Reload to get the latest version.`
              : `${fallbackLabel} encountered an error. Click below to try again.`}
          </div>
          {!staleChunk && error?.message && (
            <div className="text-red-400/70 text-ui-2xs break-words">
              {error.message}
            </div>
          )}
          <Button
            className="rounded-none border-2 border-primary font-arcade text-ui-2xs"
            onClick={() => {
              if (staleChunk) {
                cacheBustingReload();
                return;
              }
              this.setState({
                hasError: false,
                error: null,
                isStaleChunk: false,
                reloading: false,
              });
            }}
          >
            {staleChunk ? "RELOAD" : "RETRY"}
          </Button>
        </div>
      </div>
    );
  }
}
