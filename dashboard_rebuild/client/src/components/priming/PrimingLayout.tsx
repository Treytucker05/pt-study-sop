import type { ReactElement, ReactNode, RefObject } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type PrimingStepId = "setup" | "materials" | "methods" | "outputs" | "handoff";

export type PrimingLayoutStep = {
  id: PrimingStepId;
  label: string;
  summary: string;
  disabled?: boolean;
  helperText?: string;
};

interface PrimingLayoutProps {
  steps: PrimingLayoutStep[];
  activeStepId: PrimingStepId;
  activeContent: ReactNode;
  sourceViewer: ReactNode;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onStepChange: (stepId: PrimingStepId) => void;
}

function StepButton({
  step,
  active,
  onStepChange,
}: {
  step: PrimingLayoutStep;
  active: boolean;
  onStepChange: (stepId: PrimingStepId) => void;
}) {
  const helperId = `priming-step-helper-${step.id}`;

  return (
    <div className="space-y-2 border border-primary/15 bg-black/30 p-2">
      <Button
        type="button"
        role="tab"
        id={`priming-step-tab-${step.id}`}
        aria-selected={active}
        aria-controls={`priming-step-panel-${step.id}`}
        aria-describedby={helperId}
        variant="ghost"
        size="sm"
        disabled={step.disabled}
        onClick={() => onStepChange(step.id)}
        className={cn(
          "w-full justify-start rounded-none border px-3 py-2 font-arcade text-[10px] tracking-[0.18em]",
          active
            ? "border-primary/45 bg-primary/15 text-primary shadow-[0_0_18px_rgba(255,86,120,0.16)]"
            : "border-primary/15 bg-black/35 text-muted-foreground hover:border-primary/35 hover:text-primary",
          step.disabled && "cursor-not-allowed opacity-50 hover:border-primary/15 hover:text-muted-foreground",
        )}
      >
        {step.label}
      </Button>
      <div id={helperId} className="font-terminal text-[11px] leading-5 text-muted-foreground">
        {step.disabled && step.helperText ? step.helperText : step.summary}
      </div>
    </div>
  );
}

export function PrimingLayout({
  steps,
  activeStepId,
  activeContent,
  sourceViewer,
  headingRef,
  onStepChange,
}: PrimingLayoutProps): ReactElement {
  const activeStep = steps.find((step) => step.id === activeStepId) ?? steps[0];

  return (
    <div className="grid gap-4 xl:grid-cols-[17rem_minmax(0,1fr)_minmax(22rem,0.9fr)]">
      <aside className="hidden xl:block">
        <div className="space-y-3 border border-primary/20 bg-black/35 p-3">
          <div>
            <div className="font-arcade text-[10px] text-primary/80">PRIMING FLOW</div>
            <div className="mt-2 font-terminal text-xs leading-5 text-muted-foreground">
              Move step by step. The source viewer stays beside the active panel so you do not lose the material while working.
            </div>
          </div>
          <div role="tablist" aria-label="Priming step navigation" className="space-y-2">
            {steps.map((step) => (
              <StepButton
                key={step.id}
                step={step}
                active={step.id === activeStepId}
                onStepChange={onStepChange}
              />
            ))}
          </div>
        </div>
      </aside>

      <div className="min-w-0 space-y-4">
        <div className="xl:hidden">
          <div role="tablist" aria-label="Priming step navigation" className="grid gap-2 md:grid-cols-2">
            {steps.map((step) => (
              <StepButton
                key={step.id}
                step={step}
                active={step.id === activeStepId}
                onStepChange={onStepChange}
              />
            ))}
          </div>
        </div>

        <section
          id={`priming-step-panel-${activeStep.id}`}
          role="tabpanel"
          aria-labelledby={`priming-step-tab-${activeStep.id}`}
          className="border border-primary/20 bg-black/35"
        >
          <div className="border-b border-primary/15 bg-black/40 px-4 py-3">
            <h2
              ref={headingRef}
              tabIndex={-1}
              className="font-arcade text-xs text-primary outline-none"
            >
              {activeStep.label}
            </h2>
            <p className="mt-2 font-terminal text-xs leading-5 text-muted-foreground">
              {activeStep.summary}
            </p>
          </div>
          <div className="p-4">{activeContent}</div>
        </section>

        <details className="border border-primary/20 bg-black/35 xl:hidden">
          <summary className="cursor-pointer px-4 py-3 font-arcade text-xs text-primary">
            SOURCE VIEWER
          </summary>
          <div className="border-t border-primary/15">{sourceViewer}</div>
        </details>
      </div>

      <aside className="hidden xl:block min-w-0">
        <div className="sticky top-4 border border-primary/20 bg-black/35">{sourceViewer}</div>
      </aside>
    </div>
  );
}
