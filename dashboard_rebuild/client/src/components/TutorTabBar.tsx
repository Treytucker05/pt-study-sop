import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { controlToggleButton } from "@/components/shell/controlStyles";
import {
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
import type { TutorPageMode, TutorWorkflowView } from "@/lib/tutorUtils";
import type { TutorArtifact } from "@/components/TutorArtifacts";
import { toast } from "sonner";

export interface TutorTabBarProps {
  shellMode: TutorPageMode;
  workflowView: TutorWorkflowView;
  activeSessionId: string | null;
  showArtifacts: boolean;
  artifacts: TutorArtifact[];
  onSetShellMode: (mode: TutorPageMode) => void;
  onSetWorkflowView: (view: TutorWorkflowView) => void;
  onSetShowArtifacts: (show: boolean) => void;
  onSetShowEndConfirm: (show: boolean) => void;
  onOpenSettings: () => void;
  onSetStudioEntryRequest: (req: null) => void;
  onSetScheduleLaunchIntent: (intent: null) => void;
}

export function TutorTabBar({
  shellMode,
  workflowView,
  activeSessionId,
  showArtifacts,
  artifacts,
  onSetShellMode,
  onSetWorkflowView,
  onSetShowArtifacts,
  onSetShowEndConfirm,
  onOpenSettings,
  onSetStudioEntryRequest,
  onSetScheduleLaunchIntent,
}: TutorTabBarProps) {
  const clearNavIntents = () => {
    onSetStudioEntryRequest(null);
    onSetScheduleLaunchIntent(null);
  };

  return (
    <div
      role="tablist"
      aria-label="Tutor workspace navigation"
      data-testid="workspace-tab-bar"
      className="flex flex-wrap items-center gap-2 overflow-x-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-primary/30 pb-1 -mb-1"
    >
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
        className={cn(
          controlToggleButton(shellMode === "dashboard" && workflowView === "launch", "primary"),
          "flex-shrink-0 whitespace-nowrap",
        )}
      >
        LAUNCH
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
