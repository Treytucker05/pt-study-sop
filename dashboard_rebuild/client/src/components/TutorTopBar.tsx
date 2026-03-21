import {
  CONTROL_CHIP,
  CONTROL_COPY,
  CONTROL_DECK_SECTION,
  CONTROL_KICKER,
  controlToggleButton,
} from "@/components/shell/controlStyles";
import { TutorWorkflowStepper } from "@/components/TutorWorkflowStepper";
import { TutorTabBar } from "@/components/TutorTabBar";
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
import { getMethodStageBadgeLabel, getMethodStageColorKey } from "@/lib/controlStages";
import type { TutorPageMode, TutorWorkflowView } from "@/lib/tutorUtils";
import type { TutorWorkflowDetailResponse } from "@/lib/api";
import type { TutorArtifact } from "@/components/TutorArtifacts";
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
  workflowView: TutorWorkflowView;
  hasPolishBundle: boolean;
  onStepperStageClick: (stage: string) => void;
  activeSessionId: string | null;
  showArtifacts: boolean;
  artifacts: TutorArtifact[];
  teachRuntime: TutorTeachRuntimeViewModel | null;
  onSetShellMode: (mode: TutorPageMode) => void;
  onSetWorkflowView: (view: TutorWorkflowView) => void;
  onSetShowArtifacts: (show: boolean) => void;
  onSetShowEndConfirm: (show: boolean) => void;
  onOpenSettings: () => void;
  onSetStudioEntryRequest: (req: null) => void;
  onSetScheduleLaunchIntent: (intent: null) => void;
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
  "rounded-none border-2 border-primary/20 bg-black/45 p-3 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]";

function runtimeBadgeClasses(status: TutorTeachRuntimeStatus): string {
  return cn(
    "rounded-none px-2 py-1 font-arcade text-[10px] uppercase tracking-[0.18em]",
    RUNTIME_STATUS_STYLES[status],
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
      <div className="mt-2 font-terminal text-sm text-foreground">{field.value}</div>
      {detail ? (
        <div className="mt-2 font-terminal text-xs leading-5 text-muted-foreground">
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
  workflowView,
  hasPolishBundle,
  onStepperStageClick,
  activeSessionId,
  showArtifacts,
  artifacts,
  teachRuntime,
  onSetShellMode,
  onSetWorkflowView,
  onSetShowArtifacts,
  onSetShowEndConfirm,
  onOpenSettings,
  onSetStudioEntryRequest,
  onSetScheduleLaunchIntent,
}: TutorTopBarProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 border-b border-primary/10 pb-2">
        <div>
          <div className={CONTROL_KICKER}>Tutor</div>
          <div className={cn(CONTROL_COPY, "text-[11px]")}>
            Brain&apos;s default live study surface for guided sessions, artifacts, and next-step handoff.
          </div>
        </div>
        {!isTutorSessionView ? (
          <Badge
            variant="outline"
            className="shrink-0 rounded-full border-primary/30 px-3 py-1 font-terminal text-[10px]"
          >
            BRAIN TO TUTOR LIVE SURFACE
          </Badge>
        ) : null}
      </div>

      {!isTutorSessionView && brainLaunchContext?.title ? (
        <div data-testid="tutor-brain-handoff" className={cn(CONTROL_DECK_SECTION, "space-y-1")}>
          <div className={CONTROL_KICKER}>Opened From Brain</div>
          <div className="font-terminal text-xs text-white">{brainLaunchContext.title}</div>
          {brainLaunchContext.reason ? (
            <div className={cn(CONTROL_COPY, "text-[11px]")}>{brainLaunchContext.reason}</div>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-3 border border-primary/15 bg-black/25 p-3">
        <TutorWorkflowStepper
          activeWorkflowId={activeWorkflowId}
          currentStage={activeWorkflowDetail?.workflow?.status ?? null}
          shellMode={shellMode}
          workflowView={workflowView}
          hasActiveSession={Boolean(activeSessionId)}
          hasPolishBundle={hasPolishBundle}
          onStageClick={onStepperStageClick}
        />

        <TutorTabBar
          shellMode={shellMode}
          workflowView={workflowView}
          activeSessionId={activeSessionId}
          showArtifacts={showArtifacts}
          artifacts={artifacts}
          onSetShellMode={onSetShellMode}
          onSetWorkflowView={onSetWorkflowView}
          onSetShowArtifacts={onSetShowArtifacts}
          onSetShowEndConfirm={onSetShowEndConfirm}
          onOpenSettings={onOpenSettings}
          onSetStudioEntryRequest={onSetStudioEntryRequest}
          onSetScheduleLaunchIntent={onSetScheduleLaunchIntent}
        />
      </div>

      {isTutorSessionView ? (
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <Badge
              variant="outline"
              className="min-h-[40px] shrink-0 rounded-full border-primary/30 px-3 font-terminal text-[11px]"
            >
              <span className="mr-1 text-muted-foreground">TOPIC:</span>
              <span className="text-foreground">{topic || "Freeform"}</span>
            </Badge>

            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(CONTROL_CHIP, "min-h-[40px] px-2.5 text-[11px]")}
                title="Turns"
              >
                <MessageSquare className={ICON_SM} />
                {turnCount}
              </span>
              {startedAt ? (
                <span
                  className={cn(CONTROL_CHIP, "min-h-[40px] px-2.5 text-[11px]")}
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
              <div className="flex flex-wrap items-center gap-2 border-primary/20 sm:border-l sm:pl-3">
                <Badge
                  variant="outline"
                  className={cn(
                    "h-7 rounded-full px-2 text-[10px] font-arcade uppercase",
                    CONTROL_PLANE_COLORS[getMethodStageColorKey(currentBlock)]?.badge
                      || "bg-secondary/20 text-muted-foreground",
                  )}
                >
                  {getMethodStageBadgeLabel(currentBlock)}
                </Badge>
                <span
                  className="max-w-[160px] truncate font-terminal text-xs text-foreground"
                  title={currentBlock.name}
                >
                  {currentBlock.name}
                </span>
                {blockTimerSeconds !== null ? (
                  <span
                    className={cn(
                      "text-sm font-arcade tabular-nums",
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
                <span className="font-terminal text-[10px] text-muted-foreground">
                  {progressCount}/{chainBlocksLength}
                </span>
                {blockTimerSeconds !== null ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSetTimerPaused((prev) => !prev)}
                    className={cn(
                      controlToggleButton(false, "secondary", true),
                      "h-8 w-8 p-0 text-muted-foreground",
                    )}
                    title={timerPaused ? "Resume timer" : "Pause timer"}
                  >
                    {timerPaused ? <Timer className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                  </Button>
                ) : null}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onAdvanceBlock}
                  className={cn(
                    controlToggleButton(false, "secondary", true),
                    "h-8 px-2 text-[10px]",
                  )}
                  title="Skip to next block"
                >
                  <SkipForward className="h-3 w-3" />
                </Button>
              </div>
            ) : null}
          </div>

          {teachRuntime ? (
            <div
              data-testid="tutor-teach-runtime"
              className="rounded-none border-2 border-primary/20 bg-gradient-to-b from-black/60 to-black/35 p-3"
            >
              <div className="flex flex-col gap-2 border-b border-primary/15 pb-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className={CONTROL_KICKER}>Live TEACH Runtime</div>
                  <div className="font-terminal text-xs leading-5 text-muted-foreground">
                    Exposes the current teaching contract, unlock state, and mnemonic slot without
                    hiding backend gaps.
                  </div>
                </div>
                <Badge variant="outline" className={runtimeBadgeClasses(teachRuntime.stage.status)}>
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
                      className={runtimeBadgeClasses(teachRuntime.l4Unlock.status)}
                    >
                      {teachRuntime.l4Unlock.unlocked ? "L4 ready" : "L4 gated"}
                    </Badge>
                  </div>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center gap-2 font-terminal text-sm text-foreground">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <span>{teachRuntime.functionConfirmation.value}</span>
                    </div>
                    <div className="flex items-center gap-2 font-terminal text-sm text-foreground">
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
                      className={runtimeBadgeClasses(teachRuntime.mnemonic.status)}
                    >
                      {teachRuntime.mnemonic.status}
                    </Badge>
                  </div>
                  <div className="mt-2 space-y-2 font-terminal text-sm text-foreground">
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
                  <div className="mt-2 space-y-2 font-terminal text-sm text-foreground">
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
                <div className={cn(RUNTIME_CARD_BASE, "sm:col-span-2 xl:col-span-2")}>
                  <div className={CONTROL_KICKER}>Runtime Note</div>
                  <div className="mt-2 font-terminal text-sm leading-6 text-foreground">
                    {teachRuntime.note}
                  </div>
                  {teachRuntime.missingBackendFields.length > 0 ? (
                    <div className="mt-3 border-t border-primary/15 pt-3 font-terminal text-xs leading-5 text-muted-foreground">
                      Waiting on backend fields: {teachRuntime.missingBackendFields.join(", ")}
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
