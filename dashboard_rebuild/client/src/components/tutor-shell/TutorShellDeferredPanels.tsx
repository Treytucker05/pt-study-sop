import {
  Suspense,
  lazy,
  type ComponentProps,
} from "react";

type TutorWorkflowPrimingPanelProps = ComponentProps<
  typeof import("@/components/TutorWorkflowPrimingPanel").TutorWorkflowPrimingPanel
>;
type TutorWorkflowPolishStudioProps = ComponentProps<
  typeof import("@/components/TutorWorkflowPolishStudio").TutorWorkflowPolishStudio
>;
type TutorWorkflowFinalSyncProps = ComponentProps<
  typeof import("@/components/TutorWorkflowFinalSync").TutorWorkflowFinalSync
>;
type TutorStudioModeProps = ComponentProps<
  typeof import("@/components/TutorStudioMode").TutorStudioMode
>;

const TutorWorkflowPrimingPanelDeferred = lazy(async () => {
  const module = await import("@/components/TutorWorkflowPrimingPanel");
  return { default: module.TutorWorkflowPrimingPanel };
});

const TutorWorkflowPolishStudioDeferred = lazy(async () => {
  const module = await import("@/components/TutorWorkflowPolishStudio");
  return { default: module.TutorWorkflowPolishStudio };
});

const TutorWorkflowFinalSyncDeferred = lazy(async () => {
  const module = await import("@/components/TutorWorkflowFinalSync");
  return { default: module.TutorWorkflowFinalSync };
});

const TutorStudioModeDeferred = lazy(async () => {
  const module = await import("@/components/TutorStudioMode");
  return { default: module.TutorStudioMode };
});

function StudioPanelLoading() {
  return (
    <div
      data-testid="studio-panel-loading"
      className="flex min-h-[12rem] items-center justify-center border border-primary/10 bg-black/20 font-mono text-sm text-foreground/72"
    >
      Loading panel...
    </div>
  );
}

export function TutorWorkflowPrimingPanelLazy(
  props: TutorWorkflowPrimingPanelProps,
) {
  return (
    <Suspense fallback={<StudioPanelLoading />}>
      <TutorWorkflowPrimingPanelDeferred {...props} />
    </Suspense>
  );
}

export function TutorWorkflowPolishStudioLazy(
  props: TutorWorkflowPolishStudioProps,
) {
  return (
    <Suspense fallback={<StudioPanelLoading />}>
      <TutorWorkflowPolishStudioDeferred {...props} />
    </Suspense>
  );
}

export function TutorWorkflowFinalSyncLazy(
  props: TutorWorkflowFinalSyncProps,
) {
  return (
    <Suspense fallback={<StudioPanelLoading />}>
      <TutorWorkflowFinalSyncDeferred {...props} />
    </Suspense>
  );
}

export function TutorStudioModeLazy(props: TutorStudioModeProps) {
  return (
    <Suspense fallback={<StudioPanelLoading />}>
      <TutorStudioModeDeferred {...props} />
    </Suspense>
  );
}
