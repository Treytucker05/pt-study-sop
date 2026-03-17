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
} from "lucide-react";
import { ICON_SM } from "@/lib/theme";
import { CONTROL_PLANE_COLORS } from "@/lib/colors";
import { cn } from "@/lib/utils";
import type { TutorPageMode, TutorWorkflowView } from "@/lib/tutorUtils";
import type { TutorWorkflowDetailResponse } from "@/lib/api";
import type { TutorArtifact } from "@/components/TutorArtifacts";
import type { TutorBrainLaunchContext } from "@/lib/tutorClientState";
import type { TutorTemplateChain } from "@/lib/api";

export interface TutorTopBarProps {
  shellMode: TutorPageMode;
  isTutorSessionView: boolean;
  brainLaunchContext: TutorBrainLaunchContext | null;
  topic: string;
  turnCount: number;
  startedAt: string | null;
  // Chain / block
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
  // Workflow stepper
  activeWorkflowId: string | null;
  activeWorkflowDetail: TutorWorkflowDetailResponse | undefined;
  workflowView: TutorWorkflowView;
  onStepperStageClick: (stage: string) => void;
  // Tab bar
  activeSessionId: string | null;
  showArtifacts: boolean;
  artifacts: TutorArtifact[];
  onSetShellMode: (mode: TutorPageMode) => void;
  onSetWorkflowView: (view: TutorWorkflowView) => void;
  onSetShowArtifacts: (show: boolean) => void;
  onSetShowEndConfirm: (show: boolean) => void;
  onOpenWorkflowPolish: () => void;
  onOpenSettings: () => void;
  onSetStudioEntryRequest: (req: null) => void;
  onSetScheduleLaunchIntent: (intent: null) => void;
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
  onStepperStageClick,
  activeSessionId,
  showArtifacts,
  artifacts,
  onSetShellMode,
  onSetWorkflowView,
  onSetShowArtifacts,
  onSetShowEndConfirm,
  onOpenWorkflowPolish,
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
          <Badge variant="outline" className="shrink-0 rounded-full border-primary/30 px-3 py-1 font-terminal text-[10px]">
            BRAIN TO TUTOR LIVE SURFACE
          </Badge>
        ) : null}
      </div>
      {!isTutorSessionView && brainLaunchContext?.title ? (
        <div
          data-testid="tutor-brain-handoff"
          className={cn(CONTROL_DECK_SECTION, "space-y-1")}
        >
          <div className={CONTROL_KICKER}>Opened From Brain</div>
          <div className="font-terminal text-xs text-white">{brainLaunchContext.title}</div>
          {brainLaunchContext.reason ? (
            <div className={cn(CONTROL_COPY, "text-[11px]")}>
              {brainLaunchContext.reason}
            </div>
          ) : null}
        </div>
      ) : null}
      {isTutorSessionView ? (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <Badge variant="outline" className="min-h-[40px] shrink-0 rounded-full border-primary/30 px-3 font-terminal text-[11px]">
            <span className="text-muted-foreground mr-1">TOPIC:</span>
            <span className="text-foreground">{topic || "Freeform"}</span>
          </Badge>
          <div className="flex items-center gap-2 shrink-0">
            <span className={cn(CONTROL_CHIP, "min-h-[40px] px-2.5 text-[11px]")} title="Turns">
              <MessageSquare className={ICON_SM} />
              {turnCount}
            </span>
            {startedAt ? (
              <span className={cn(CONTROL_CHIP, "min-h-[40px] px-2.5 text-[11px]")} title="Started At">
                <Clock className={ICON_SM} />
                {new Date(startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            ) : null}
          </div>

          {hasChain && currentBlock && !isChainComplete ? (
            <div className="flex items-center gap-2 px-2 shrink-0 border-l border-primary/20">
              <Badge
                variant="outline"
                className={`h-7 rounded-full px-2 text-[10px] font-arcade uppercase ${
                  CONTROL_PLANE_COLORS[currentBlock.control_stage?.toUpperCase?.() || currentBlock.category?.toUpperCase?.() || ""]?.badge
                  || "bg-secondary/20 text-muted-foreground"
                }`}
              >
                {currentBlock.control_stage || currentBlock.category || "BLOCK"}
              </Badge>
              <span className="text-xs font-terminal text-foreground truncate max-w-[120px]" title={currentBlock.name}>
                {currentBlock.name}
              </span>
              {blockTimerSeconds !== null ? (
                <span
                  className={`text-sm font-arcade tabular-nums ${
                    blockTimerSeconds <= 0
                      ? "text-destructive animate-pulse"
                      : blockTimerSeconds <= 60
                        ? "text-destructive"
                        : blockTimerSeconds <= 120
                          ? "text-warning"
                          : "text-foreground"
                  }`}
                >
                  {formatTimer(Math.max(0, blockTimerSeconds))}
                </span>
              ) : null}
              <span className="text-[10px] text-muted-foreground font-terminal">
                {progressCount}/{chainBlocksLength}
              </span>
              {blockTimerSeconds !== null ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSetTimerPaused((p) => !p)}
                  className={cn(controlToggleButton(false, "secondary", true), "h-8 w-8 p-0 text-muted-foreground")}
                  title={timerPaused ? "Resume timer" : "Pause timer"}
                >
                  {timerPaused ? <Timer className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                </Button>
              ) : null}
              <Button
                variant="ghost"
                size="sm"
                onClick={onAdvanceBlock}
                className={cn(controlToggleButton(false, "secondary", true), "h-8 px-2 text-[10px]")}
                title="Skip to next block"
              >
                <SkipForward className="w-3 h-3" />
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      <TutorWorkflowStepper
        activeWorkflowId={activeWorkflowId}
        currentStage={activeWorkflowDetail?.workflow?.status ?? null}
        onStageClick={onStepperStageClick}
      />

      <TutorTabBar
        shellMode={shellMode}
        workflowView={workflowView}
        activeWorkflowId={activeWorkflowId}
        activeWorkflowDetail={activeWorkflowDetail}
        activeSessionId={activeSessionId}
        showArtifacts={showArtifacts}
        artifacts={artifacts}
        onSetShellMode={onSetShellMode}
        onSetWorkflowView={onSetWorkflowView}
        onSetShowArtifacts={onSetShowArtifacts}
        onSetShowEndConfirm={onSetShowEndConfirm}
        onOpenWorkflowPolish={onOpenWorkflowPolish}
        onOpenSettings={onOpenSettings}
        onSetStudioEntryRequest={onSetStudioEntryRequest}
        onSetScheduleLaunchIntent={onSetScheduleLaunchIntent}
      />
    </div>
  );
}
