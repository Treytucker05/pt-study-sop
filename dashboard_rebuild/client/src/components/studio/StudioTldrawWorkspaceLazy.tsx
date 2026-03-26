import { Suspense, lazy } from "react";

import type { StudioTldrawWorkspaceProps } from "@/components/studio/StudioTldrawWorkspace";

const StudioTldrawWorkspaceDeferred = lazy(async () => {
  const module = await import("@/components/studio/StudioTldrawWorkspace");
  return { default: module.StudioTldrawWorkspace };
});

export function StudioTldrawWorkspaceLazy(
  props: StudioTldrawWorkspaceProps,
) {
  return (
    <Suspense
      fallback={
        <div
          data-testid="studio-workspace-loading"
          className="flex flex-1 min-h-0 items-center justify-center border border-primary/10 bg-black/20 font-mono text-sm text-foreground/72"
        >
          Loading workspace...
        </div>
      }
    >
      <StudioTldrawWorkspaceDeferred {...props} />
    </Suspense>
  );
}
