import { Loader2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BTN_PRIMARY, BTN_TOOLBAR, ICON_MD, TEXT_MUTED } from "@/lib/theme";
import type { UseTutorHubReturn } from "@/hooks/useTutorHub";
import type { UseTutorSessionReturn } from "@/hooks/useTutorSession";

interface TutorEndSessionDialogProps {
  hub: UseTutorHubReturn;
  session: UseTutorSessionReturn;
}

export function TutorEndSessionDialog({
  hub,
  session,
}: TutorEndSessionDialogProps) {
  if (!session.showEndConfirm) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 animate-fade-slide-in">
      <div className="bg-black/95 border-2 border-primary/50 rounded-lg p-6 shadow-[0_0_60px_rgba(0,0,0,0.9)] max-w-md w-full mx-4 space-y-3">
        <div className="section-header">SESSION COMPLETE</div>
        <div className={`flex items-center gap-4 ${TEXT_MUTED} text-xs`}>
          <span className="text-foreground">{hub.topic || "No topic"}</span>
          <span>{session.turnCount} turns</span>
          {session.startedAt && (
            <span>
              {Math.round(
                (Date.now() - new Date(session.startedAt).getTime()) / 60000,
              )}{" "}
              min
            </span>
          )}
          {session.artifacts.length > 0 && <span>{session.artifacts.length} artifacts</span>}
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Button
            onClick={session.shipToBrainAndEnd}
            disabled={session.isShipping}
            className={`${BTN_PRIMARY} w-auto gap-1.5 h-9 px-4`}
          >
            {session.isShipping ? (
              <Loader2 className={`${ICON_MD} animate-spin`} />
            ) : (
              <Send className={ICON_MD} />
            )}
            {session.isShipping ? "SHIPPING..." : "SHIP TO BRAIN"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              void session.endSession();
              session.setShowEndConfirm(false);
            }}
            disabled={session.isShipping}
            className={BTN_TOOLBAR}
          >
            END SESSION
          </Button>
          <Button
            variant="ghost"
            onClick={() => session.setShowEndConfirm(false)}
            disabled={session.isShipping}
            className={`${BTN_TOOLBAR} ml-auto`}
          >
            CANCEL
          </Button>
        </div>
      </div>
    </div>
  );
}
