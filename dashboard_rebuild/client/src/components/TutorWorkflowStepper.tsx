import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TutorWorkflowStepperProps {
  activeWorkflowId: string | null;
  currentStage: string | null;
  onStageClick: (stage: string) => void;
}

const STAGES = [
  { key: "priming", label: "PRIMING", statuses: ["priming_in_progress", "priming_complete"] },
  { key: "tutor", label: "TUTOR", statuses: ["tutor_in_progress", "tutor_complete"] },
  { key: "polish", label: "POLISH", statuses: ["polish_in_progress", "polish_complete"] },
  { key: "final_sync", label: "FINAL SYNC", statuses: ["stored"] },
] as const;

function resolveStageIndex(status: string | null): number {
  if (!status) return -1;
  for (let i = 0; i < STAGES.length; i++) {
    if ((STAGES[i].statuses as readonly string[]).includes(status)) return i;
  }
  if (status === "stored") return STAGES.length;
  if (status === "launch_ready") return -1;
  return -1;
}

export function TutorWorkflowStepper({
  activeWorkflowId,
  currentStage,
  onStageClick,
}: TutorWorkflowStepperProps): React.ReactNode {
  if (!activeWorkflowId) return null;

  const activeIndex = resolveStageIndex(currentStage);
  const allComplete = currentStage === "stored";

  return (
    <div className="flex items-center gap-0 py-1.5 px-1 overflow-x-auto no-scrollbar">
      {STAGES.map((stage, i) => {
        const isCompleted = allComplete || i < activeIndex;
        const isCurrent = !allComplete && i === activeIndex;
        const isFuture = !allComplete && i > activeIndex;

        return (
          <div key={stage.key} className="flex items-center">
            {i > 0 && (
              <div
                className={cn(
                  "w-6 h-px mx-0.5",
                  isCompleted || isCurrent
                    ? "bg-primary/60"
                    : "bg-muted-foreground/20",
                )}
              />
            )}
            <button
              type="button"
              onClick={() => {
                if (!isFuture) onStageClick(stage.key);
              }}
              disabled={isFuture}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 border-2 rounded-none transition-all duration-150",
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
                isFuture && [
                  "border-muted-foreground/20 text-muted-foreground opacity-50",
                  "cursor-not-allowed",
                ],
              )}
            >
              {isCompleted ? (
                <Check className="w-3 h-3 shrink-0" />
              ) : (
                <div
                  className={cn(
                    "w-3 h-3 shrink-0 border-2 rounded-none",
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
  );
}
