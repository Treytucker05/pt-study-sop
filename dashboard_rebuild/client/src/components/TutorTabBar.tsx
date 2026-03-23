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
import type { TutorPageMode, TutorStudioView } from "@/lib/tutorUtils";
import type { TutorArtifact } from "@/components/TutorArtifacts";
import { toast } from "sonner";

export type StudioSubTab = {
  key: TutorStudioView;
  label: string;
  available: boolean;
};

export interface TutorTabBarProps {
  shellMode: TutorPageMode;
  activeSessionId: string | null;
  showArtifacts: boolean;
  artifacts: TutorArtifact[];
  studioSubTabs?: StudioSubTab[];
  studioView?: TutorStudioView;
  onSetShellMode: (mode: TutorPageMode) => void;
  onOpenStudioHome: () => void;
  onStudioSubTabClick?: (key: TutorStudioView) => void;
  onSetShowArtifacts: (show: boolean) => void;
  onSetShowEndConfirm: (show: boolean) => void;
  onOpenSettings: () => void;
  onSetStudioEntryRequest: (req: null) => void;
  onSetScheduleLaunchIntent: (intent: null) => void;
}

const TUTOR_TAB_BASE = "shrink-0 uppercase tracking-[0.16em]";
const TUTOR_TAB_PATTERN = "tutor-pattern-button";
const TUTOR_TAB_PATTERN_SIZE = "h-auto min-h-[70px] px-5 py-[20px] leading-none";

function studioSubButton(active: boolean, available: boolean) {
  return cn(
    "min-h-[36px] whitespace-nowrap rounded-[0.22rem] border px-2.5 py-1.5 font-mono text-ui-2xs uppercase tracking-[0.14em] transition-all duration-150 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/55 focus-visible:ring-offset-1 focus-visible:ring-offset-black",
    !available && "cursor-not-allowed opacity-40",
    active
      ? "border-[rgba(255,112,138,0.40)] bg-[linear-gradient(180deg,rgba(255,72,104,0.18),rgba(12,2,5,0.94)_52%,rgba(0,0,0,0.98)_100%)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05),inset_0_0_0_1px_rgba(255,84,116,0.08)]"
      : "border-[rgba(255,70,104,0.12)] bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(0,0,0,0.14)_26%,rgba(0,0,0,0.36)_100%),linear-gradient(135deg,rgba(66,10,18,0.14),rgba(8,2,4,0.96)_64%,rgba(0,0,0,0.98)_100%)] text-[#ffd4dc]/80 hover:border-[rgba(255,108,136,0.26)] hover:text-white",
  );
}

export function TutorTabBar({
  shellMode,
  activeSessionId,
  showArtifacts,
  artifacts,
  studioSubTabs,
  studioView,
  onSetShellMode,
  onOpenStudioHome,
  onStudioSubTabClick,
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

  const isStudioActive = shellMode === "studio";

  return (
    <div
      role="tablist"
      aria-label="Tutor workspace navigation"
      data-testid="workspace-tab-bar"
      className="flex flex-wrap items-center gap-2 overflow-x-auto py-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-primary/30"
    >
      <Button
        role="tab"
        id="tutor-tab-studio"
        aria-selected={shellMode === "studio"}
        variant="ghost"
        size="default"
        onClick={() => {
          clearNavIntents();
          onOpenStudioHome();
        }}
        className={cn(TUTOR_TAB_BASE, TUTOR_TAB_PATTERN, TUTOR_TAB_PATTERN_SIZE)}
      >
        <PenTool className={`${ICON_MD} mr-1`} />
        STUDIO
      </Button>
      <Button
        role="tab"
        id="tutor-tab-tutor"
        aria-selected={shellMode === "tutor"}
        variant="ghost"
        size="default"
        onClick={() => {
          clearNavIntents();
          onSetShellMode("tutor");
        }}
        className={cn(TUTOR_TAB_BASE, TUTOR_TAB_PATTERN, TUTOR_TAB_PATTERN_SIZE)}
      >
        <MessageSquare className={`${ICON_MD} mr-1`} />
        TUTOR
      </Button>
      <Button
        role="tab"
        id="tutor-tab-schedule"
        aria-selected={shellMode === "schedule"}
        variant="ghost"
        size="default"
        onClick={() => {
          clearNavIntents();
          onSetShellMode("schedule");
        }}
        className={cn(TUTOR_TAB_BASE, TUTOR_TAB_PATTERN, TUTOR_TAB_PATTERN_SIZE)}
      >
        <Clock className={`${ICON_MD} mr-1`} />
        SCHEDULE
      </Button>
      <Button
        role="tab"
        id="tutor-tab-settings"
        aria-selected={false}
        variant="ghost"
        size="default"
        onClick={onOpenSettings}
        className={cn(TUTOR_TAB_BASE, TUTOR_TAB_PATTERN, TUTOR_TAB_PATTERN_SIZE)}
      >
        <SlidersHorizontal className={`${ICON_MD} mr-1`} />
        SETTINGS
      </Button>

      {activeSessionId && shellMode === "tutor" ? (
        <>
          <Button
            variant="ghost"
            size="default"
            onClick={() => onSetShowArtifacts(!showArtifacts)}
            aria-pressed={showArtifacts}
            className={cn(
              TUTOR_TAB_BASE,
              TUTOR_TAB_PATTERN,
              TUTOR_TAB_PATTERN_SIZE,
              "ml-1",
            )}
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
          <Button
            variant="ghost"
            size="default"
            onClick={() => {
              if (activeSessionId) {
                api.tutor.exportSession(activeSessionId).catch(() => {
                  toast.error("Failed to export session");
                });
              }
            }}
            className={cn(
              TUTOR_TAB_BASE,
              TUTOR_TAB_PATTERN,
              TUTOR_TAB_PATTERN_SIZE,
              "ml-auto",
            )}
            title="Export conversation as Markdown"
          >
            <Download className={`${ICON_MD} mr-1`} />
            EXPORT
          </Button>
          <Button
            variant="ghost"
            size="default"
            onClick={() => onSetShowEndConfirm(true)}
            className={cn(TUTOR_TAB_BASE, TUTOR_TAB_PATTERN, TUTOR_TAB_PATTERN_SIZE)}
            title="End session"
          >
            <Square className={`${ICON_MD} mr-1`} />
            END
          </Button>
        </>
      ) : null}
    </div>
  );
}
