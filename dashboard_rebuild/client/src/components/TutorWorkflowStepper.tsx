import { Check, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { TutorPageMode, TutorWorkflowView } from "@/lib/tutorUtils";
import { cn } from "@/lib/utils";

export type TutorWorkflowStageKey =
  | "launch"
  | "priming"
  | "tutor"
  | "polish"
  | "final_sync";

export interface TutorWorkflowStepperProps {
  activeWorkflowId: string | null;
  currentStage: string | null;
  shellMode: TutorPageMode;
  workflowView: TutorWorkflowView;
  hasActiveSession: boolean;
  hasPolishBundle: boolean;
  onStageClick: (stage: TutorWorkflowStageKey) => void;
}

const STAGES: Array<{
  key: TutorWorkflowStageKey;
  label: string;
  statuses: string[];
}> = [
  { key: "launch", label: "LAUNCH", statuses: ["launch_ready"] },
  {
    key: "priming",
    label: "PRIMING",
    statuses: ["priming_in_progress", "priming_complete"],
  },
  {
    key: "tutor",
    label: "TUTOR",
    statuses: ["tutor_in_progress", "tutor_complete"],
  },
  {
    key: "polish",
    label: "POLISH",
    statuses: ["polish_in_progress", "polish_complete"],
  },
  { key: "final_sync", label: "FINAL SYNC", statuses: ["stored"] },
];

function resolveStageIndexFromStatus(status: string | null): number {
  if (!status) return -1;
  const normalized = status.trim().toLowerCase();
  const index = STAGES.findIndex((stage) => stage.statuses.includes(normalized));
  return index;
}

function resolveVisibleStageKey(
  shellMode: TutorPageMode,
  workflowView: TutorWorkflowView,
  currentStage: string | null,
): TutorWorkflowStageKey {
  if (shellMode === "dashboard") return workflowView;
  if (shellMode === "tutor") return "tutor";
  const statusIndex = resolveStageIndexFromStatus(currentStage);
  return statusIndex >= 0 ? STAGES[statusIndex].key : "launch";
}

export function TutorWorkflowStepper({
  activeWorkflowId,
  currentStage,
  shellMode,
  workflowView,
  hasActiveSession,
  hasPolishBundle,
  onStageClick,
}: TutorWorkflowStepperProps): React.ReactNode {
  const hasWorkflowContext =
    Boolean(activeWorkflowId)
    || Boolean(currentStage)
    || hasActiveSession
    || hasPolishBundle
    || shellMode !== "dashboard";

  if (!hasWorkflowContext) return null;

  const currentKey = resolveVisibleStageKey(shellMode, workflowView, currentStage);
  const currentIndex = STAGES.findIndex((stage) => stage.key === currentKey);
  const persistedIndex = resolveStageIndexFromStatus(currentStage);

  const canAccessStage = (stageKey: TutorWorkflowStageKey): boolean => {
    switch (stageKey) {
      case "launch":
        return true;
      case "priming":
        return Boolean(activeWorkflowId);
      case "tutor":
        return hasActiveSession || persistedIndex >= 2;
      case "polish":
        return hasActiveSession || persistedIndex >= 3;
      case "final_sync":
        return hasPolishBundle || persistedIndex >= 4;
      default:
        return false;
    }
  };

  const previousStage = currentIndex > 0 ? STAGES[currentIndex - 1] : null;
  const nextStage = currentIndex >= 0 && currentIndex < STAGES.length - 1 ? STAGES[currentIndex + 1] : null;
  const canGoPrevious = previousStage ? canAccessStage(previousStage.key) : false;
  const canGoNext = nextStage ? canAccessStage(nextStage.key) : false;

  return (
    <div
      data-testid="workflow-stepper"
      className="space-y-2 border border-primary/15 bg-black/30 p-3"
    >
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="font-arcade text-ui-2xs text-primary/80">WORKFLOW NAVIGATOR</div>
          <div className="mt-1 font-terminal text-xs text-muted-foreground">
            Move between the main study stages without hunting below the runtime diagnostics.
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => previousStage && onStageClick(previousStage.key)}
            disabled={!canGoPrevious}
            className="rounded-none font-arcade text-ui-2xs"
          >
            <ChevronLeft className="mr-1 h-3.5 w-3.5" />
            {previousStage ? `BACK TO ${previousStage.label}` : "BACK"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => nextStage && onStageClick(nextStage.key)}
            disabled={!canGoNext}
            className="rounded-none font-arcade text-ui-2xs"
          >
            {nextStage ? `NEXT: ${nextStage.label}` : "NEXT"}
            <ChevronRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-0 overflow-x-auto py-1 no-scrollbar">
        {STAGES.map((stage, index) => {
          const isCurrent = index === currentIndex;
          const isCompleted = index < currentIndex;
          const isAccessible = canAccessStage(stage.key);

          return (
            <div key={stage.key} className="flex items-center">
              {index > 0 ? (
                <div
                  className={cn(
                    "mx-0.5 h-px w-6",
                    isCompleted || isCurrent ? "bg-primary/60" : "bg-muted-foreground/20",
                  )}
                />
              ) : null}
              <button
                type="button"
                onClick={() => {
                  if (isAccessible) onStageClick(stage.key);
                }}
                disabled={!isAccessible}
                className={cn(
                  "flex items-center gap-1.5 rounded-none border-2 px-2 py-1 transition-all duration-150",
                  "font-arcade text-xs uppercase tracking-wider",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                  isCurrent && [
                    "border-primary text-primary",
                    "shadow-[0_0_8px_rgba(255,106,136,0.3)]",
                    "[text-shadow:0_0_6px_rgba(255,106,136,0.4)]",
                  ],
                  isCompleted && [
                    "border-green-400/40 text-green-400",
                    "cursor-pointer hover:border-green-400/60",
                  ],
                  !isCurrent && !isCompleted && isAccessible && [
                    "border-primary/25 text-foreground/90",
                    "cursor-pointer hover:border-primary/45 hover:text-primary",
                  ],
                  !isAccessible && [
                    "cursor-not-allowed border-muted-foreground/20 text-muted-foreground opacity-50",
                  ],
                )}
              >
                {isCompleted ? (
                  <Check className="h-3 w-3 shrink-0" />
                ) : (
                  <div
                    className={cn(
                      "h-3 w-3 shrink-0 rounded-none border-2",
                      isCurrent ? "border-primary bg-primary/20" : "border-muted-foreground/30",
                    )}
                  />
                )}
                <span className="whitespace-nowrap">{stage.label}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
