import { useMemo, useRef, type ReactNode } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Compass,
  Layers3,
  MessageSquare,
  Wrench,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CONTROL_COPY,
  CONTROL_DECK,
  CONTROL_DECK_BOTTOMLINE,
  CONTROL_DECK_INSET,
  CONTROL_DECK_SECTION,
  CONTROL_DECK_TOPLINE,
  CONTROL_KICKER,
} from "@/components/shell/controlStyles";
import { BTN_OUTLINE, BTN_PRIMARY } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { formatWorkflowStatus, truncateWorkflowId } from "@/lib/workflowStatus";

type StudioWorkflowSummary = {
  workflowId: string | null;
  currentStage: string | null;
  status: string | null;
  updatedAt: string | null;
};

type TutorStudioHomeProps = {
  workflow: StudioWorkflowSummary | null;
  courseName: string | null;
  studyUnit: string | null;
  topic: string | null;
  selectedMaterialCount: number;
  hasTutorWork: boolean;
  hasFinalSyncAccess: boolean;
  hasActiveSession: boolean;
  bootstrappingPriming: boolean;
  onResumeTutor: () => void;
  onOpenPriming: () => void;
  onOpenPolish: () => void;
  onOpenFinalSync: () => void;
  workbenchPanel: ReactNode;
};

type StudioActionCardProps = {
  title: string;
  subtitle: string;
  helperText: string;
  buttonLabel: string;
  enabled: boolean;
  busy?: boolean;
  icon: typeof Compass;
  onClick: () => void;
  tone?: "default" | "success";
};

function formatWorkflowDate(value: string | null): string {
  if (!value) return "Not saved yet";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not saved yet";
  return parsed.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function StudioActionCard({
  title,
  subtitle,
  helperText,
  buttonLabel,
  enabled,
  busy = false,
  icon: Icon,
  onClick,
  tone = "default",
}: StudioActionCardProps) {
  const helperId = `studio-home-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-helper`;

  return (
    <Card className={CONTROL_DECK}>
      <div className={CONTROL_DECK_INSET} />
      <div className={CONTROL_DECK_TOPLINE} />
      <div className={CONTROL_DECK_BOTTOMLINE} />
      <CardHeader className="relative z-10 border-b border-primary/15 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <CardTitle className="font-arcade text-xs text-primary">
              {title}
            </CardTitle>
            <p className="font-mono text-sm leading-6 text-foreground/72">
              {subtitle}
            </p>
          </div>
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full border border-primary/20 bg-black/45",
              tone === "success" && "border-emerald-500/30 text-emerald-300",
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative z-10 space-y-3 pt-4">
        <div
          id={helperId}
          className={cn(
            "min-h-[3rem] font-mono text-sm leading-6",
            enabled ? "text-foreground/84" : "text-foreground/48",
          )}
        >
          {helperText}
        </div>
        <Button
          type="button"
          onClick={onClick}
          disabled={!enabled || busy}
          aria-describedby={helperId}
          className={cn(
            enabled ? BTN_PRIMARY : BTN_OUTLINE,
            "w-full text-ui-2xs",
            !enabled && "cursor-not-allowed opacity-70 hover:translate-y-0",
          )}
        >
          {busy ? "PREPARING..." : buttonLabel}
        </Button>
      </CardContent>
    </Card>
  );
}

export function TutorStudioHome({
  workflow,
  courseName,
  studyUnit,
  topic,
  selectedMaterialCount,
  hasTutorWork,
  hasFinalSyncAccess,
  hasActiveSession,
  bootstrappingPriming,
  onResumeTutor,
  onOpenPriming,
  onOpenPolish,
  onOpenFinalSync,
  workbenchPanel,
}: TutorStudioHomeProps) {
  const workbenchRef = useRef<HTMLDivElement | null>(null);
  const currentStage = workflow?.currentStage ?? null;
  const primingPreferred =
    !workflow?.workflowId ||
    currentStage === "launch" ||
    currentStage === "priming";

  const openWorkbench = () => {
    workbenchRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const primaryAction = useMemo(() => {
    if (hasActiveSession) {
      return {
        label: "RESUME TUTOR",
        detail:
          "You already have a live Tutor session running. Resume that surface first.",
        onClick: onResumeTutor,
      };
    }
    if (hasFinalSyncAccess) {
      return {
        label: "OPEN FINAL SYNC",
        detail:
          "This workflow already has a finalized Polish path ready for final sync.",
        onClick: onOpenFinalSync,
      };
    }
    if (hasTutorWork) {
      return {
        label: "OPEN POLISH",
        detail:
          "Tutor work exists. Review and refine the captures before you publish anything.",
        onClick: onOpenPolish,
      };
    }
    if (primingPreferred) {
      return {
        label: workflow?.workflowId ? "CONTINUE PRIMING" : "START PRIMING",
        detail: workflow?.workflowId
          ? "Return to Priming to finish setup, run PRIME methods, and complete the Tutor handoff."
          : "Open Priming directly from Studio even if you have not created a workflow yet.",
        onClick: onOpenPriming,
      };
    }
    return {
      label: "OPEN WORKBENCH",
      detail:
        "No workflow step needs immediate attention. Drop into the workbench tools from Home.",
      onClick: openWorkbench,
    };
  }, [
    hasActiveSession,
    hasFinalSyncAccess,
    hasTutorWork,
    onOpenFinalSync,
    onOpenPolish,
    onOpenPriming,
    onResumeTutor,
    primingPreferred,
    workflow?.workflowId,
  ]);

  const summaryItems = [
    {
      label: "Workflow",
      value: workflow?.workflowId
        ? truncateWorkflowId(workflow.workflowId)
        : "No active workflow",
      helper: workflow?.status
        ? formatWorkflowStatus(workflow.status)
        : "Studio can bootstrap Priming inline.",
    },
    {
      label: "Course",
      value: courseName || "No course selected",
      helper: studyUnit || "Select the study unit in Priming or the workbench.",
    },
    {
      label: "Topic",
      value: topic || "Broad module scope",
      helper:
        selectedMaterialCount > 0
          ? `${selectedMaterialCount} materials in scope`
          : "No materials scoped yet",
    },
    {
      label: "Last Update",
      value: formatWorkflowDate(workflow?.updatedAt ?? null),
      helper: currentStage
        ? `Stage ${currentStage.replace(/_/g, " ").toUpperCase()}`
        : "Home overview",
    },
  ];

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <Card className={CONTROL_DECK}>
          <div className={CONTROL_DECK_INSET} />
          <div className={CONTROL_DECK_TOPLINE} />
          <div className={CONTROL_DECK_BOTTOMLINE} />
          <CardHeader className="relative z-10 border-b border-primary/15 pb-3">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
              <div className="space-y-2">
                <CardTitle className="font-arcade text-xs text-primary">
                  STUDIO HOME
                </CardTitle>
                <p className={CONTROL_COPY}>
                  Studio is where prep and wrap-up live. Start from the next
                  recommended action, then drop into the workbench below when
                  you need open-ended class tools.
                </p>
              </div>
              <Button
                type="button"
                onClick={primaryAction.onClick}
                className={cn(
                  BTN_PRIMARY,
                  "w-full text-ui-2xs xl:w-auto xl:min-w-[15rem]",
                )}
                disabled={
                  bootstrappingPriming &&
                  primaryAction.onClick === onOpenPriming
                }
              >
                {bootstrappingPriming && primaryAction.onClick === onOpenPriming
                  ? "PREPARING PRIMING..."
                  : primaryAction.label}
                <ArrowRight className="ml-2 h-3.5 w-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="relative z-10 space-y-4 pt-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {summaryItems.map((item) => (
                <div
                  key={item.label}
                  className={cn(CONTROL_DECK_SECTION, "space-y-1")}
                >
                  <div className={CONTROL_KICKER}>{item.label}</div>
                  <div className="mt-2 break-all font-mono text-sm leading-6 text-foreground">
                    {item.value}
                  </div>
                  <div className="font-mono text-sm leading-6 text-foreground/72">
                    {item.helper}
                  </div>
                </div>
              ))}
            </div>

            <div className={cn(CONTROL_DECK_SECTION, "p-4")}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className={CONTROL_KICKER}>Next Recommended Action</div>
                  <div className="mt-2 font-mono text-sm leading-6 text-foreground">
                    {primaryAction.label}
                  </div>
                </div>
                {hasActiveSession ? (
                  <Badge
                    variant="outline"
                    className="rounded-full border-emerald-500/30 px-3 py-1 font-terminal text-ui-2xs text-emerald-300"
                  >
                    LIVE SESSION
                  </Badge>
                ) : currentStage ? (
                  <Badge
                    variant="outline"
                    className="rounded-full border-primary/25 px-3 py-1 font-terminal text-ui-2xs text-primary/80"
                  >
                    {currentStage.replace(/_/g, " ").toUpperCase()}
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="rounded-full border-primary/25 px-3 py-1 font-terminal text-ui-2xs text-primary/80"
                  >
                    READY
                  </Badge>
                )}
              </div>
              <div className="mt-2 font-mono text-sm leading-6 text-foreground/72">
                {primaryAction.detail}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 xl:grid-cols-4">
          <StudioActionCard
            title="PRIMING"
            subtitle="Setup, material scope, PRIME methods, outputs, and Tutor handoff."
            helperText={
              workflow?.workflowId
                ? "Continue the existing workflow in Priming or reopen the priming setup from Studio."
                : "Start Priming directly from Studio. The workflow will be bootstrapped inline without sending you back to Launch."
            }
            buttonLabel={
              workflow?.workflowId ? "CONTINUE PRIMING" : "START PRIMING"
            }
            enabled
            busy={bootstrappingPriming}
            icon={Compass}
            onClick={onOpenPriming}
          />
          <StudioActionCard
            title="WORKBENCH"
            subtitle="Boards, captures, material viewing, and open-ended class prep."
            helperText="The workbench stays available under Home so you can keep using Studio tools without leaving the overview."
            buttonLabel="OPEN WORKBENCH"
            enabled
            icon={Wrench}
            onClick={openWorkbench}
          />
          <StudioActionCard
            title="POLISH"
            subtitle="Review Tutor notes, feedback, and refinement work before publishing."
            helperText={
              hasTutorWork
                ? "Tutor work exists for this workflow, so Polish is available now."
                : "Run or capture Tutor work first to unlock Polish."
            }
            buttonLabel="OPEN POLISH"
            enabled={hasTutorWork}
            icon={MessageSquare}
            onClick={onOpenPolish}
          />
          <StudioActionCard
            title="FINAL SYNC"
            subtitle="Push approved outputs into the downstream systems once review is done."
            helperText={
              hasFinalSyncAccess
                ? "A finalized Polish path exists, so Final Sync is ready."
                : "Finalize a Polish bundle first to unlock Final Sync."
            }
            buttonLabel="OPEN FINAL SYNC"
            enabled={hasFinalSyncAccess}
            icon={CheckCircle2}
            onClick={onOpenFinalSync}
            tone={hasFinalSyncAccess ? "success" : "default"}
          />
        </div>

        <Card className={CONTROL_DECK} ref={workbenchRef}>
          <div className={CONTROL_DECK_INSET} />
          <div className={CONTROL_DECK_TOPLINE} />
          <div className={CONTROL_DECK_BOTTOMLINE} />
          <CardHeader className="relative z-10 border-b border-primary/15 pb-3">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-2">
                <CardTitle className="font-arcade text-xs text-primary">
                  WORKBENCH
                </CardTitle>
                <p className={CONTROL_COPY}>
                  Keep using the class picker, course detail, boards, material
                  viewer, and workspace tools from here without losing the Home
                  overview.
                </p>
              </div>
              <Badge
                variant="outline"
                className="rounded-full border-primary/25 px-3 py-1 font-terminal text-ui-2xs text-primary/80"
              >
                <Layers3 className="mr-2 h-3.5 w-3.5" />
                EMBEDDED
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="relative z-10 p-0">
            <div className="h-[46rem] min-h-[70vh]">{workbenchPanel}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
