import { cn } from "@/lib/utils";
import { CONTROL_DECK_SECTION } from "@/components/shell/controlStyles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatWorkflowStatus, truncateWorkflowId } from "@/lib/workflowStatus";
import { CheckCircle2, Play } from "lucide-react";

const STAGE_ORDER = ["priming", "tutor", "polish", "final_sync", "complete"] as const;

const STAGE_LABELS: Record<string, string> = {
  priming: "Priming",
  tutor: "Tutor",
  polish: "Polish",
  final_sync: "Final Sync",
  complete: "Complete",
};

const LOCKED_TOOLTIPS: Record<string, string> = {
  tutor: "Complete Priming and start a Tutor session",
  polish: "Run a Tutor session first",
  final_sync: "Finalize Polish review first",
  complete: "Run Final Sync first",
};

export interface TutorWorkflowContextStripProps {
  workflowId: string | null;
  currentStage: string | null;
  status: string | null;
  courseName: string | null;
  studyUnit: string | null;
  topic: string | null;
  recommendedAction: { title: string; reason: string } | null;
  onStartNew: () => void;
  onRunRecommendedAction: () => void;
}

export function TutorWorkflowContextStrip({
  workflowId,
  currentStage,
  status,
  courseName,
  studyUnit,
  topic,
  recommendedAction,
  onStartNew,
  onRunRecommendedAction,
}: TutorWorkflowContextStripProps) {
  if (!workflowId) {
    return (
      <div className={cn(CONTROL_DECK_SECTION, "flex flex-wrap items-center gap-3 px-4 py-2")}>
        <span className="font-mono text-sm text-foreground/50">No active workflow</span>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto h-7 rounded-none border-primary/30 font-arcade text-ui-2xs uppercase"
          onClick={onStartNew}
        >
          Start New
        </Button>
      </div>
    );
  }

  return (
    <div className={cn(CONTROL_DECK_SECTION, "flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2")}>
      {/* Left: workflow context */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0">
        <Badge variant="outline" className="font-mono text-sm shrink-0">
          {truncateWorkflowId(workflowId)}
        </Badge>

        <Badge variant="secondary" className="font-mono text-sm uppercase shrink-0">
          {currentStage ?? "—"}
        </Badge>

        <Badge variant="outline" className="font-mono text-sm shrink-0">
          {formatWorkflowStatus(status)}
        </Badge>

        {courseName ? (
          <span className="flex items-center gap-1 min-w-0">
            <span className="text-ui-2xs text-foreground/50 uppercase shrink-0">Course</span>
            <span className="font-mono text-sm text-foreground/80 truncate">{courseName}</span>
          </span>
        ) : null}

        {studyUnit ? (
          <span className="flex items-center gap-1 min-w-0">
            <span className="text-ui-2xs text-foreground/50 uppercase shrink-0">Unit</span>
            <span className="font-mono text-sm text-foreground/80 truncate">{studyUnit}</span>
          </span>
        ) : null}

        {topic ? (
          <span className="flex items-center gap-1 min-w-0">
            <span className="text-ui-2xs text-foreground/50 uppercase shrink-0">Topic</span>
            <span className="font-mono text-sm text-foreground/80 truncate">{topic}</span>
          </span>
        ) : null}
      </div>

      {/* Right: recommended action */}
      {recommendedAction ? (
        <div className="flex items-center gap-2 ml-auto shrink-0">
          <span className="font-mono text-sm text-foreground/70">
            Next: {recommendedAction.title}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 rounded-none"
            onClick={onRunRecommendedAction}
            title={recommendedAction.reason}
          >
            <Play className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : null}

      {/* Progress indicator */}
      <WorkflowProgressIndicator currentStage={currentStage} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Workflow progress indicator — compact horizontal stage sequence   */
/* ------------------------------------------------------------------ */

function WorkflowProgressIndicator({
  currentStage,
}: {
  currentStage: string | null;
}): React.ReactElement {
  const currentIdx = currentStage
    ? STAGE_ORDER.indexOf(currentStage as (typeof STAGE_ORDER)[number])
    : -1;

  return (
    <div className="flex w-full items-center gap-0 pt-1">
      {STAGE_ORDER.map((stage, idx) => {
        const isCompleted = currentIdx > idx;
        const isCurrent = currentIdx === idx;
        const isLocked = currentIdx < idx;

        return (
          <div key={stage} className="flex items-center">
            {/* Connector line before (skip first) */}
            {idx > 0 && (
              <div
                className={cn(
                  "h-px w-4 shrink-0",
                  isCompleted || isCurrent
                    ? "bg-primary/40"
                    : "bg-foreground/10",
                )}
              />
            )}

            {/* Stage pill */}
            <span
              className={cn(
                "inline-flex items-center gap-1 font-arcade text-ui-2xs uppercase tracking-wider select-none whitespace-nowrap",
                isCurrent && "text-primary drop-shadow-[0_0_4px_var(--primary)]",
                isCompleted && "cursor-pointer text-emerald-400/70",
                isLocked && "text-foreground/25",
              )}
              title={isLocked ? LOCKED_TOOLTIPS[stage] : undefined}
            >
              {isCompleted && (
                <CheckCircle2 className="h-3 w-3 shrink-0" />
              )}
              {isCurrent && (
                <span className="relative mr-0.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-primary shadow-[0_0_4px_var(--primary)] animate-pulse" />
              )}
              {STAGE_LABELS[stage]}
            </span>
          </div>
        );
      })}
    </div>
  );
}
