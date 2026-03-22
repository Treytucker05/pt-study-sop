import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { ICON_MD } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import type { TutorPageMode } from "@/lib/tutorUtils";
import type { TutorArtifact } from "@/components/TutorArtifacts";
import { toast } from "sonner";

export interface TutorTabBarProps {
  shellMode: TutorPageMode;
  activeSessionId: string | null;
  showArtifacts: boolean;
  artifacts: TutorArtifact[];
  onSetShellMode: (mode: TutorPageMode) => void;
  onOpenStudioHome: () => void;
  onSetShowArtifacts: (show: boolean) => void;
  onSetShowEndConfirm: (show: boolean) => void;
  onOpenSettings: () => void;
  onSetStudioEntryRequest: (req: null) => void;
  onSetScheduleLaunchIntent: (intent: null) => void;
}

function workspaceTabButton(
  active: boolean,
  tone: "default" | "danger" = "default",
) {
  return cn(
    "min-h-[44px] flex-shrink-0 whitespace-nowrap rounded-[0.28rem] border px-3 py-2 font-mono text-ui-xs uppercase tracking-[0.16em] transition-all duration-150 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/55 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
    tone === "danger"
      ? "border-destructive/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.025),rgba(0,0,0,0.16)_26%,rgba(0,0,0,0.4)_100%),linear-gradient(135deg,rgba(88,10,24,0.22),rgba(8,2,4,0.95)_64%,rgba(0,0,0,0.98)_100%)] text-destructive/78 hover:border-destructive/44 hover:text-destructive"
      : active
        ? "border-[rgba(255,112,138,0.34)] bg-[linear-gradient(180deg,rgba(255,72,104,0.14),rgba(12,2,5,0.92)_52%,rgba(0,0,0,0.98)_100%)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05),inset_0_0_0_1px_rgba(255,84,116,0.05)]"
        : "border-[rgba(255,70,104,0.16)] bg-[linear-gradient(180deg,rgba(255,255,255,0.025),rgba(0,0,0,0.16)_26%,rgba(0,0,0,0.4)_100%),linear-gradient(135deg,rgba(66,10,18,0.18),rgba(8,2,4,0.96)_64%,rgba(0,0,0,0.98)_100%)] text-[#ffd4dc] hover:border-[rgba(255,108,136,0.3)] hover:text-white",
  );
}

export function TutorTabBar({
  shellMode,
  activeSessionId,
  showArtifacts,
  artifacts,
  onSetShellMode,
  onOpenStudioHome,
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
      className="flex flex-wrap items-center gap-2 overflow-x-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-primary/30"
    >
      <Button
        role="tab"
        id="tutor-tab-launch"
        aria-selected={shellMode === "launch"}
        variant="ghost"
        size="sm"
        onClick={() => {
          clearNavIntents();
          onSetShellMode("launch");
        }}
        className={workspaceTabButton(shellMode === "launch")}
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
        className={workspaceTabButton(shellMode === "tutor")}
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
          onOpenStudioHome();
        }}
        className={workspaceTabButton(shellMode === "studio")}
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
        className={workspaceTabButton(shellMode === "schedule")}
      >
        <Clock className={`${ICON_MD} mr-1`} />
        SCHEDULE
      </Button>
      <Button
        role="tab"
        id="tutor-tab-settings"
        aria-selected={false}
        variant="ghost"
        size="sm"
        onClick={onOpenSettings}
        className={workspaceTabButton(false)}
      >
        <SlidersHorizontal className={`${ICON_MD} mr-1`} />
        SETTINGS
      </Button>

      {activeSessionId && shellMode === "tutor" ? (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSetShowArtifacts(!showArtifacts)}
            className={cn(workspaceTabButton(showArtifacts), "ml-1")}
          >
            {showArtifacts ? (
              <PanelRightClose className={`${ICON_MD} mr-1`} />
            ) : (
              <PanelRightOpen className={`${ICON_MD} mr-1`} />
            )}
            ARTIFACTS
            {artifacts.length > 0 ? (
              <Badge
                variant="outline"
                className="ml-1 rounded-[0.2rem] border-primary/25 px-1.5 py-0.5 font-mono text-ui-2xs"
              >
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
              className={workspaceTabButton(false)}
              title="Export conversation as Markdown"
            >
              <Download className={`${ICON_MD} mr-1`} />
              EXPORT
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSetShowEndConfirm(true)}
              className={workspaceTabButton(false, "danger")}
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
