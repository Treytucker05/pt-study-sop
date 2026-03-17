import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { controlToggleButton } from "@/components/shell/controlStyles";
import {
  ListChecks,
  Sparkles,
  FileStack,
  CheckCircle2,
  PenTool,
  MessageSquare,
  Clock,
  SlidersHorizontal,
  PanelRightClose,
  PanelRightOpen,
  Download,
  Square,
} from "lucide-react";
import { ICON_MD, BTN_TOOLBAR } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import type { TutorWorkflowDetailResponse } from "@/lib/api";
import type { TutorPageMode, TutorWorkflowView } from "@/lib/tutorUtils";
import type { TutorArtifact } from "@/components/TutorArtifacts";
import { toast } from "sonner";

export interface TutorTabBarProps {
  shellMode: TutorPageMode;
  workflowView: TutorWorkflowView;
  activeWorkflowId: string | null;
  activeWorkflowDetail: TutorWorkflowDetailResponse | undefined;
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

export function TutorTabBar({
  shellMode,
  workflowView,
  activeWorkflowId,
  activeWorkflowDetail,
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
}: TutorTabBarProps) {
  const clearNavIntents = () => {
    onSetStudioEntryRequest(null);
    onSetScheduleLaunchIntent(null);
  };

  return (
    <div role="tablist" aria-label="Tutor navigation" className="flex flex-wrap items-center gap-2 overflow-x-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-primary/30 pb-1 -mb-1">
      <Button
        role="tab"
        id="tutor-tab-launch"
        aria-selected={shellMode === "dashboard" && workflowView === "launch"}
        variant="ghost"
        size="sm"
        onClick={() => {
          clearNavIntents();
          onSetShellMode("dashboard");
          onSetWorkflowView("launch");
        }}
        className={cn(controlToggleButton(shellMode === "dashboard" && workflowView === "launch", "primary"), "flex-shrink-0 whitespace-nowrap")}
      >
        <ListChecks className={`${ICON_MD} mr-1`} />
        LAUNCH
      </Button>
      <Button
        role="tab"
        id="tutor-tab-priming"
        aria-selected={shellMode === "dashboard" && workflowView === "priming"}
        aria-disabled={!activeWorkflowId}
        variant="ghost"
        size="sm"
        onClick={() => {
          clearNavIntents();
          onSetShellMode("dashboard");
          onSetWorkflowView("priming");
        }}
        className={cn(controlToggleButton(shellMode === "dashboard" && workflowView === "priming", "primary", false, !activeWorkflowId), "flex-shrink-0 whitespace-nowrap")}
        disabled={!activeWorkflowId}
      >
        <Sparkles className={`${ICON_MD} mr-1`} />
        PRIMING
      </Button>
      <Button
        role="tab"
        id="tutor-tab-polish"
        aria-selected={shellMode === "dashboard" && workflowView === "polish"}
        aria-disabled={!activeWorkflowId}
        variant="ghost"
        size="sm"
        onClick={() => {
          void onOpenWorkflowPolish();
        }}
        className={cn(controlToggleButton(shellMode === "dashboard" && workflowView === "polish", "primary", false, !activeWorkflowId), "flex-shrink-0 whitespace-nowrap")}
        disabled={!activeWorkflowId}
      >
        <FileStack className={`${ICON_MD} mr-1`} />
        POLISH
      </Button>
      <Button
        role="tab"
        id="tutor-tab-final_sync"
        aria-selected={shellMode === "dashboard" && workflowView === "final_sync"}
        aria-disabled={!activeWorkflowDetail?.polish_bundle}
        variant="ghost"
        size="sm"
        onClick={() => {
          clearNavIntents();
          onSetShellMode("dashboard");
          onSetWorkflowView("final_sync");
        }}
        className={cn(controlToggleButton(shellMode === "dashboard" && workflowView === "final_sync", "primary", false, !activeWorkflowDetail?.polish_bundle), "flex-shrink-0 whitespace-nowrap")}
        disabled={!activeWorkflowDetail?.polish_bundle}
      >
        <CheckCircle2 className={`${ICON_MD} mr-1`} />
        FINAL SYNC
      </Button>
      <Button
        role="tab"
        id="tutor-tab-studio"
        aria-selected={shellMode === "studio"}
        variant="ghost"
        size="sm"
        onClick={() => {
          clearNavIntents();
          onSetShellMode("studio");
        }}
        className={cn(controlToggleButton(shellMode === "studio", "primary"), "flex-shrink-0 whitespace-nowrap")}
      >
        <PenTool className={`${ICON_MD} mr-1`} />
        STUDIO
      </Button>
      <Button
        role="tab"
        id="tutor-tab-tutor"
        aria-selected={shellMode === "tutor"}
        variant="ghost"
        size="sm"
        onClick={() => {
          clearNavIntents();
          onSetShellMode("tutor");
        }}
        className={cn(controlToggleButton(shellMode === "tutor", "primary"), "flex-shrink-0 whitespace-nowrap")}
      >
        <MessageSquare className={`${ICON_MD} mr-1`} />
        TUTOR
      </Button>
      <Button
        role="tab"
        id="tutor-tab-schedule"
        aria-selected={shellMode === "schedule"}
        variant="ghost"
        size="sm"
        onClick={() => {
          clearNavIntents();
          onSetShellMode("schedule");
        }}
        className={cn(controlToggleButton(shellMode === "schedule", "primary"), "flex-shrink-0 whitespace-nowrap")}
      >
        <Clock className={`${ICON_MD} mr-1`} />
        SCHEDULE
      </Button>
      <Button role="tab" id="tutor-tab-settings" aria-selected={false} variant="ghost" size="sm" onClick={onOpenSettings} className={cn(controlToggleButton(false), "flex-shrink-0 whitespace-nowrap")}>
        <SlidersHorizontal className={`${ICON_MD} mr-1`} />
        SETTINGS
      </Button>

      {activeSessionId && shellMode === "tutor" ? (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSetShowArtifacts(!showArtifacts)}
            className={cn(controlToggleButton(showArtifacts), "ml-1")}
          >
            {showArtifacts ? (
              <PanelRightClose className={`${ICON_MD} mr-1`} />
            ) : (
              <PanelRightOpen className={`${ICON_MD} mr-1`} />
            )}
            ARTIFACTS
            {artifacts.length > 0 ? (
              <Badge variant="outline" className="ml-1 rounded-full border-primary/40 px-1.5 py-0.5 text-[10px]">
                {artifacts.length}
              </Badge>
            ) : null}
          </Button>
          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (activeSessionId) {
                  api.tutor.exportSession(activeSessionId).catch(() => {
                    toast.error("Failed to export session");
                  });
                }
              }}
              className={controlToggleButton(false)}
              title="Export conversation as Markdown"
            >
              <Download className={`${ICON_MD} mr-1`} />
              EXPORT
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSetShowEndConfirm(true)}
              className={cn(
                controlToggleButton(false),
                "h-11 border-destructive/18 text-destructive/80 hover:border-destructive/36 hover:text-destructive",
              )}
              title="End session"
            >
              <Square className={`${ICON_MD} mr-1`} />
              END
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
