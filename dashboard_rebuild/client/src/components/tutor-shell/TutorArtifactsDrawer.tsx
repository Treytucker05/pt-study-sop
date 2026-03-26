import { X } from "lucide-react";

import { TutorArtifacts } from "@/components/TutorArtifacts";
import { Button } from "@/components/ui/button";
import type { UseTutorHubReturn } from "@/hooks/useTutorHub";
import type { UseTutorSessionReturn } from "@/hooks/useTutorSession";

interface TutorArtifactsDrawerProps {
  activeSessionId: string | null;
  shellMode: "studio" | "tutor" | "schedule";
  hub: UseTutorHubReturn;
  session: UseTutorSessionReturn;
}

export function TutorArtifactsDrawer({
  activeSessionId,
  shellMode,
  hub,
  session,
}: TutorArtifactsDrawerProps) {
  if (!(activeSessionId && shellMode === "tutor" && session.showArtifacts)) {
    return null;
  }

  return (
    <>
      <div
        className="fixed inset-0 z-20 bg-black/60 lg:hidden"
        onClick={() => session.setShowArtifacts(false)}
        aria-hidden="true"
      />
      <div className="absolute lg:static right-0 inset-y-0 z-30 w-[320px] shrink-0 border-l-2 border-primary/30 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(0,0,0,0.16)_18%,rgba(0,0,0,0.52)_100%)] backdrop-blur-md flex flex-col shadow-[-10px_0_20px_rgba(0,0,0,0.36)] lg:shadow-none animate-fade-slide-in">
        <div className="flex items-center justify-between p-2 border-b-2 border-primary/20 bg-primary/5">
          <span className="section-header px-2">ARTIFACTS</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-primary rounded-none"
            onClick={() => session.setShowArtifacts(false)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">
          <TutorArtifacts
            sessionId={activeSessionId}
            artifacts={session.artifacts}
            turnCount={session.turnCount}
            topic={hub.topic}
            startedAt={session.startedAt}
            onCreateArtifact={session.handleArtifactCreated}
            recentSessions={hub.recentSessions}
            onResumeSession={session.resumeSession}
            onDeleteArtifacts={session.handleDeleteArtifacts}
            onEndSession={session.endSessionById}
            onClearActiveSession={session.clearActiveSessionState}
          />
        </div>
      </div>
    </>
  );
}
