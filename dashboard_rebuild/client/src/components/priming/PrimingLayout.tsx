import type { ReactElement, ReactNode, RefObject } from "react";

import {
  CONTROL_COPY,
  CONTROL_DECK_SECTION,
  CONTROL_KICKER,
  controlToggleButton,
} from "@/components/shell/controlStyles";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type PrimingStepId =
  | "setup"
  | "materials"
  | "methods"
  | "outputs"
  | "handoff";

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
    <div className={cn(CONTROL_DECK_SECTION, "space-y-2.5 px-3 py-3")}>
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
          controlToggleButton(
            active,
            active ? "primary" : "secondary",
            true,
            Boolean(step.disabled),
          ),
          "w-full justify-start whitespace-normal rounded-[0.95rem] px-3 py-2.5 text-left leading-5",
        )}
      >
        {step.label}
      </Button>
      <div
        id={helperId}
        className={cn(CONTROL_COPY, "text-sm leading-6 text-foreground/70")}
      >
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
        <div
          className={cn(
            CONTROL_DECK_SECTION,
            "space-y-4 rounded-[1.2rem] px-4 py-4",
          )}
        >
          <div>
            <div className={cn(CONTROL_KICKER, "text-ui-xs")}>PRIMING FLOW</div>
            <div
              className={cn(
                CONTROL_COPY,
                "mt-2 text-sm leading-6 text-foreground/70",
              )}
            >
              Move step by step. The source viewer stays beside the active panel
              so you do not lose the material while working.
            </div>
          </div>
          <div
            role="tablist"
            aria-label="Priming step navigation"
            className="space-y-2"
          >
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
          <div
            role="tablist"
            aria-label="Priming step navigation"
            className="grid gap-2 md:grid-cols-2"
          >
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
          className={cn(
            CONTROL_DECK_SECTION,
            "overflow-hidden rounded-[1.2rem] px-0 py-0",
          )}
        >
          <div className="border-b border-primary/15 bg-black/35 px-4 py-4">
            <h2
              ref={headingRef}
              tabIndex={-1}
              className={cn(CONTROL_KICKER, "text-sm outline-none")}
            >
              {activeStep.label}
            </h2>
            <p
              className={cn(
                CONTROL_COPY,
                "mt-2 text-sm leading-6 text-foreground/70",
              )}
            >
              {activeStep.summary}
            </p>
          </div>
          <div className="p-4">{activeContent}</div>
        </section>

        <details
          className={cn(
            CONTROL_DECK_SECTION,
            "overflow-hidden rounded-[1.2rem] px-0 py-0 xl:hidden",
          )}
        >
          <summary
            className={cn(
              CONTROL_KICKER,
              "list-none cursor-pointer px-4 py-3 text-ui-xs",
            )}
          >
            SOURCE VIEWER
          </summary>
          <div className="border-t border-primary/15">{sourceViewer}</div>
        </details>
      </div>

      <aside className="hidden xl:block min-w-0">
        <div
          className={cn(
            CONTROL_DECK_SECTION,
            "sticky top-4 min-w-0 overflow-hidden rounded-[1.2rem] px-0 py-0",
          )}
        >
          {sourceViewer}
        </div>
      </aside>
    </div>
  );
}
