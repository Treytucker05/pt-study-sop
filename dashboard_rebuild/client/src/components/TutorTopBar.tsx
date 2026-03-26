import { CONTROL_KICKER } from "@/components/shell/controlStyles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  Clock,
  Timer,
  SkipForward,
  Layers3,
  Route,
  Target,
  CheckCircle2,
  Lock,
  Sparkles,
} from "lucide-react";
import { ICON_SM } from "@/lib/theme";
import { CONTROL_PLANE_COLORS } from "@/lib/colors";
import { cn } from "@/lib/utils";
import {
  getMethodStageBadgeLabel,
  getMethodStageColorKey,
} from "@/lib/controlStages";
import type { TutorPageMode, TutorStudioView } from "@/lib/tutorUtils";
import type { StudioSubTab } from "@/components/TutorTabBar";
import type { TutorWorkflowDetailResponse } from "@/lib/api";
import type { TutorBrainLaunchContext } from "@/lib/tutorClientState";
import type { TutorTemplateChain } from "@/lib/api";
import type {
  TutorTeachRuntimeField,
  TutorTeachRuntimeStatus,
  TutorTeachRuntimeViewModel,
} from "@/components/TutorChat.types";

export interface TutorTopBarProps {
  shellMode: TutorPageMode;
  isTutorSessionView: boolean;
  brainLaunchContext: TutorBrainLaunchContext | null;
  topic: string;
  turnCount: number;
  startedAt: string | null;
  hasChain: boolean;
  currentBlock: TutorTemplateChain["blocks"][number] | null;
  isChainComplete: boolean;
  blockTimerSeconds: number | null;
  timerPaused: boolean;
  progressCount: number;
  chainBlocksLength: number;
  formatTimer: (seconds: number) => string;
  onSetTimerPaused: (fn: (prev: boolean) => boolean) => void;
  onAdvanceBlock: () => void;
  activeWorkflowId: string | null;
  activeWorkflowDetail: TutorWorkflowDetailResponse | undefined;
  studioView: TutorStudioView;
  studioSubTabs: StudioSubTab[];
  activeSessionId: string | null;
  teachRuntime: TutorTeachRuntimeViewModel | null;
}

const RUNTIME_STATUS_STYLES: Record<TutorTeachRuntimeStatus, string> = {
  live: "border-primary/40 bg-primary/10 text-primary",
  available: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  pending: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  locked: "border-red-500/30 bg-red-500/10 text-red-200",
  complete: "border-emerald-500/50 bg-emerald-500/10 text-emerald-200",
  skipped: "border-slate-500/40 bg-slate-500/10 text-slate-300",
  fallback: "border-secondary/40 bg-secondary/10 text-secondary-foreground",
};

const RUNTIME_CARD_BASE =
  "relative overflow-hidden border border-[rgba(255,78,108,0.18)] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(0,0,0,0.1)_22%,rgba(0,0,0,0.26)_100%),linear-gradient(135deg,rgba(255,44,78,0.08),rgba(0,0,0,0.02)_42%,rgba(0,0,0,0.1)_100%)] p-4 backdrop-blur-sm shadow-[0_14px_28px_rgba(0,0,0,0.14)]";

const TUTOR_STRIP =
  "relative overflow-hidden border border-[rgba(255,78,108,0.16)] bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(0,0,0,0.1)_20%,rgba(0,0,0,0.24)_100%),linear-gradient(135deg,rgba(255,42,76,0.07),rgba(0,0,0,0.03)_46%,rgba(0,0,0,0.09)_100%)] px-4 py-3 backdrop-blur-sm shadow-[0_10px_24px_rgba(0,0,0,0.12)]";

const TUTOR_META_CHIP =
  "inline-flex min-h-[40px] items-center gap-2 border border-[rgba(255,78,108,0.18)] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(0,0,0,0.12)_28%,rgba(0,0,0,0.24)_100%)] px-3 py-2 font-mono text-sm text-foreground/82 backdrop-blur-sm";

function runtimeBadgeClasses(status: TutorTeachRuntimeStatus): string {
  return cn(
    "rounded-[0.2rem] px-2 py-1 font-mono text-ui-2xs uppercase tracking-[0.18em]",
    RUNTIME_STATUS_STYLES[status],
  );
}

function tutorUtilityButton(compact = false): string {
  return cn(
    "inline-flex min-h-[40px] items-center justify-center gap-2 rounded-[0.28rem] border border-[rgba(255,78,108,0.18)] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(0,0,0,0.12)_26%,rgba(0,0,0,0.24)_100%)] px-3 py-2 font-mono text-ui-2xs uppercase tracking-[0.16em] text-foreground/78 transition-colors duration-150 ease-out hover:border-[rgba(255,108,136,0.32)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/55 focus-visible:ring-offset-2 focus-visible:ring-offset-black backdrop-blur-sm",
    compact ? "h-10 w-10 px-0" : null,
  );
}

function RuntimeValue({
  field,
  detail,
}: {
  field: TutorTeachRuntimeField;
  detail?: string | null;
}) {
  return (
    <div className={RUNTIME_CARD_BASE}>
      <div className="flex items-start justify-between gap-2">
        <div className={CONTROL_KICKER}>{field.label}</div>
        <Badge variant="outline" className={runtimeBadgeClasses(field.status)}>
          {field.status}
        </Badge>
      </div>
      <div className="mt-2 font-mono text-base leading-7 text-foreground">
        {field.value}
      </div>
      {detail ? (
        <div className="mt-2 font-mono text-sm leading-6 text-foreground/72">
          {detail}
        </div>
      ) : null}
    </div>
  );
}

export function TutorTopBar({
  shellMode,
  isTutorSessionView,
  brainLaunchContext,
  topic,
  turnCount,
  startedAt,
  hasChain,
  currentBlock,
  isChainComplete,
  blockTimerSeconds,
  timerPaused,
  progressCount,
  chainBlocksLength,
  formatTimer,
  onSetTimerPaused,
  onAdvanceBlock,
  activeWorkflowId,
  activeWorkflowDetail,
  studioView,
  studioSubTabs,
  activeSessionId,
  teachRuntime,
}: TutorTopBarProps) {
  const workflowStageLabel = activeWorkflowDetail?.workflow?.current_stage
    ? activeWorkflowDetail.workflow.current_stage
        .replace(/_/g, " ")
        .toUpperCase()
    : null;
  const workflowStatusLabel = activeWorkflowDetail?.workflow?.status
    ? activeWorkflowDetail.workflow.status.replace(/_/g, " ").toUpperCase()
    : null;
  const surfaceLabel =
    shellMode === "studio"
      ? `STUDIO / ${studioView === "home" ? "HOME" : studioView.replace(/_/g, " ").toUpperCase()}`
      : shellMode.toUpperCase();

  return (
    <div className="flex flex-col gap-4">
      {!isTutorSessionView && brainLaunchContext?.title ? (
        <div
          data-testid="tutor-brain-handoff"
          className={cn(TUTOR_STRIP, "space-y-1")}
        >
          <div className={CONTROL_KICKER}>Opened From Brain</div>
          <div className="font-mono text-base leading-7 text-white">
            {brainLaunchContext.title}
          </div>
          {brainLaunchContext.reason ? (
            <div className="font-mono text-sm leading-6 text-foreground/72">
              {brainLaunchContext.reason}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-3">
        {activeWorkflowId || workflowStageLabel || isTutorSessionView ? (
          <div
            className={cn(TUTOR_STRIP, "flex flex-wrap items-center gap-2.5")}
          >
            <span className="font-arcade text-ui-xs uppercase tracking-[0.18em] text-white">
              ACTIVE WORKFLOW
            </span>
            <span className="h-4 w-px bg-primary/18" aria-hidden="true" />
            <span className="font-mono text-sm uppercase tracking-[0.16em] text-foreground/78">
              {surfaceLabel}
            </span>
            {workflowStageLabel ? (
              <Badge
                variant="outline"
                className="rounded-[0.2rem] border-primary/20 px-2 py-1 font-mono text-ui-2xs uppercase tracking-[0.18em]"
              >
                STAGE {workflowStageLabel}
              </Badge>
            ) : null}
            {workflowStatusLabel ? (
              <Badge
                variant="outline"
                className="rounded-[0.2rem] border-secondary/25 px-2 py-1 font-mono text-ui-2xs uppercase tracking-[0.18em]"
              >
                {workflowStatusLabel}
              </Badge>
            ) : null}
            {isTutorSessionView ? (
              <Badge
                variant="outline"
                className="rounded-[0.2rem] border-emerald-500/26 px-2 py-1 font-mono text-ui-2xs uppercase tracking-[0.18em] text-emerald-300"
              >
                LIVE SESSION
              </Badge>
            ) : null}
          </div>
        ) : null}
      </div>

      {isTutorSessionView ? (
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <div
              className={cn(
                TUTOR_META_CHIP,
                "min-w-[15rem] justify-between gap-3",
              )}
            >
              <span className="font-mono text-ui-2xs uppercase tracking-[0.18em] text-foreground/52">
                Topic
              </span>
              <span className="truncate text-sm text-foreground">
                {topic || "Freeform"}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(TUTOR_META_CHIP, "min-h-[40px] px-2.5")}
                title="Turns"
              >
                <MessageSquare className={ICON_SM} />
                {turnCount}
              </span>
              {startedAt ? (
                <span
                  className={cn(TUTOR_META_CHIP, "min-h-[40px] px-2.5")}
                  title="Started At"
                >
                  <Clock className={ICON_SM} />
                  {new Date(startedAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              ) : null}
            </div>

            {hasChain && currentBlock && !isChainComplete ? (
              <div
                className={cn(
                  TUTOR_STRIP,
                  "flex flex-wrap items-center gap-2 py-2 sm:ml-auto sm:max-w-full",
                )}
              >
                <Badge
                  variant="outline"
                  className={cn(
                    "h-7 rounded-[0.2rem] px-2 font-mono text-ui-2xs uppercase tracking-[0.18em]",
                    CONTROL_PLANE_COLORS[getMethodStageColorKey(currentBlock)]
                      ?.badge || "bg-secondary/20 text-muted-foreground",
                  )}
                >
                  {getMethodStageBadgeLabel(currentBlock)}
                </Badge>
                <span
                  className="max-w-[220px] truncate font-mono text-sm text-foreground"
                  title={currentBlock.name}
                >
                  {currentBlock.name}
                </span>
                {blockTimerSeconds !== null ? (
                  <span
                    className={cn(
                      "font-mono text-sm tabular-nums",
                      blockTimerSeconds <= 0
                        ? "animate-pulse text-destructive"
                        : blockTimerSeconds <= 60
                          ? "text-destructive"
                          : blockTimerSeconds <= 120
                            ? "text-warning"
                            : "text-foreground",
                    )}
                  >
                    {formatTimer(Math.max(0, blockTimerSeconds))}
                  </span>
                ) : null}
                <span className="font-mono text-ui-2xs uppercase tracking-[0.16em] text-muted-foreground">
                  {progressCount}/{chainBlocksLength}
                </span>
                {blockTimerSeconds !== null ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSetTimerPaused((prev) => !prev)}
                    className={tutorUtilityButton(true)}
                    title={timerPaused ? "Resume timer" : "Pause timer"}
                  >
                    {timerPaused ? (
                      <Timer className="h-3 w-3" />
                    ) : (
                      <Clock className="h-3 w-3" />
                    )}
                  </Button>
                ) : null}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onAdvanceBlock}
                  className={tutorUtilityButton()}
                  title="Skip to next block"
                >
                  <SkipForward className="h-3 w-3" />
                  Next
                </Button>
              </div>
            ) : null}
          </div>

          {teachRuntime ? (
            <div
              data-testid="tutor-teach-runtime"
              className="relative overflow-hidden border border-primary/18 bg-[linear-gradient(180deg,rgba(255,42,76,0.08),transparent_16%),linear-gradient(180deg,rgba(255,255,255,0.025),rgba(0,0,0,0.12)_22%,rgba(0,0,0,0.24)_100%)] p-4 backdrop-blur-md shadow-[0_16px_36px_rgba(0,0,0,0.16)]"
            >
              <div className="flex flex-col gap-2 border-b border-primary/15 pb-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className={CONTROL_KICKER}>Live TEACH Runtime</div>
                  <div className="mt-2 max-w-3xl font-mono text-base leading-7 text-foreground/76">
                    Exposes the current teaching contract, unlock state, and
                    mnemonic slot without hiding backend gaps.
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={runtimeBadgeClasses(teachRuntime.stage.status)}
                >
                  {teachRuntime.packetSource === "backend"
                    ? "backend packet"
                    : teachRuntime.packetSource === "mixed"
                      ? "mixed packet"
                      : "inferred fallback"}
                </Badge>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <RuntimeValue
                  field={teachRuntime.stage}
                  detail={
                    currentBlock
                      ? `${currentBlock.name} • block ${progressCount}/${Math.max(chainBlocksLength, 1)}`
                      : "No active chain block is loaded yet."
                  }
                />
                <RuntimeValue
                  field={teachRuntime.conceptType}
                  detail={`Bridge now: ${teachRuntime.bridge.value}`}
                />
                <RuntimeValue
                  field={teachRuntime.depth}
                  detail={`${teachRuntime.depth.start} -> ${teachRuntime.depth.current} -> ${teachRuntime.depth.ceiling}`}
                />
                <RuntimeValue
                  field={teachRuntime.requiredArtifact}
                  detail={`Mnemonic slot: ${teachRuntime.mnemonic.value}`}
                />
                <div className={RUNTIME_CARD_BASE}>
                  <div className="flex items-start justify-between gap-2">
                    <div className={CONTROL_KICKER}>Unlocks</div>
                    <Badge
                      variant="outline"
                      className={runtimeBadgeClasses(
                        teachRuntime.l4Unlock.status,
                      )}
                    >
                      {teachRuntime.l4Unlock.unlocked ? "L4 ready" : "L4 gated"}
                    </Badge>
                  </div>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center gap-2 font-mono text-base leading-7 text-foreground">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <span>{teachRuntime.functionConfirmation.value}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-base leading-7 text-foreground">
                      <Lock className="h-4 w-4 text-primary" />
                      <span>{teachRuntime.l4Unlock.value}</span>
                    </div>
                  </div>
                </div>
                <div className={RUNTIME_CARD_BASE}>
                  <div className="flex items-start justify-between gap-2">
                    <div className={CONTROL_KICKER}>Close Contract</div>
                    <Badge
                      variant="outline"
                      className={runtimeBadgeClasses(
                        teachRuntime.mnemonic.status,
                      )}
                    >
                      {teachRuntime.mnemonic.status}
                    </Badge>
                  </div>
                  <div className="mt-2 space-y-2 font-mono text-base leading-7 text-foreground">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      <span>{teachRuntime.requiredArtifact.value}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <span>{teachRuntime.mnemonic.value}</span>
                    </div>
                  </div>
                </div>
                <div className={RUNTIME_CARD_BASE}>
                  <div className={CONTROL_KICKER}>Lane Summary</div>
                  <div className="mt-2 space-y-2 font-mono text-base leading-7 text-foreground">
                    <div className="flex items-center gap-2">
                      <Layers3 className="h-4 w-4 text-primary" />
                      <span>{teachRuntime.stage.value}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Route className="h-4 w-4 text-primary" />
                      <span>{teachRuntime.bridge.value}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <span>{teachRuntime.depth.current}</span>
                    </div>
                  </div>
                </div>
                <div
                  className={cn(
                    RUNTIME_CARD_BASE,
                    "sm:col-span-2 xl:col-span-2",
                  )}
                >
                  <div className={CONTROL_KICKER}>Runtime Note</div>
                  <div className="mt-2 font-mono text-base leading-7 text-foreground">
                    {teachRuntime.note}
                  </div>
                  {teachRuntime.missingBackendFields.length > 0 ? (
                    <div className="mt-3 border-t border-primary/15 pt-3 font-mono text-sm leading-6 text-foreground/72">
                      Waiting on backend fields:{" "}
                      {teachRuntime.missingBackendFields.join(", ")}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
