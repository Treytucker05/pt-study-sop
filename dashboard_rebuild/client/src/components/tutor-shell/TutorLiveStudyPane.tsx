import type { QueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";

import { TutorChat } from "@/components/TutorChat";
import { TutorEmptyState } from "@/components/TutorEmptyState";
import { TutorEndSessionDialog } from "@/components/tutor-shell/TutorEndSessionDialog";
import { UseTutorHubReturn } from "@/hooks/useTutorHub";
import { UseTutorSessionReturn } from "@/hooks/useTutorSession";
import { UseTutorWorkflowReturn } from "@/hooks/useTutorWorkflow";

interface TutorLiveStudyPaneProps {
  activeSessionId: string | null;
  hub: UseTutorHubReturn;
  session: UseTutorSessionReturn;
  workflow: UseTutorWorkflowReturn;
  restoredTurns: { question: string; answer: string | null }[] | undefined;
  queryClient: QueryClient;
  onStartSession: () => void | Promise<void>;
  activeMemoryCapsuleContext?: string | null;
  sessionRules?: string[];
  onActivateMemoryCapsule?: (capsuleId: number | null) => void;
  onDirectNoteSaveStatus?: (status: Record<string, unknown> | null) => void;
  onSaveGist: (content: string) => void;
  onPromoteTutorReplyToPolish: (payload: {
    message: {
      messageId?: string;
      sessionTurnNumber?: number;
      role: "assistant";
      content: string;
    };
    index: number;
  }) => void;
  onCompactionTelemetry: (telemetry: Record<string, unknown> | null) => void;
  submitBrainFeedback: (payload: Record<string, unknown>) => void | Promise<void>;
}

export function TutorLiveStudyPane({
  activeSessionId,
  hub,
  session,
  workflow,
  restoredTurns,
  queryClient,
  onStartSession,
  activeMemoryCapsuleContext,
  sessionRules,
  onActivateMemoryCapsule,
  onDirectNoteSaveStatus,
  onSaveGist,
  onPromoteTutorReplyToPolish,
  onCompactionTelemetry,
  submitBrainFeedback,
}: TutorLiveStudyPaneProps) {
  const handleActivateCapsule = async (
    action: () => Promise<{ id?: number } | null | undefined> | { id?: number } | null | undefined,
  ) => {
    const capsule = await action();
    if (typeof capsule?.id === "number") {
      onActivateMemoryCapsule?.(capsule.id);
    }
  };

  const handleSaveNoteToVault = async (mode: "exact" | "editable") => {
    onDirectNoteSaveStatus?.({
      state: "saving",
      mode,
      savedAt: new Date().toISOString(),
    });
    const result = await workflow.saveWorkflowNoteToVault(mode);
    if (result) {
      onDirectNoteSaveStatus?.(result);
    }
  };

  if (!activeSessionId) {
    const resumeCandidate = hub.tutorHub?.resume_candidate ?? null;
    const canResume =
      Boolean(resumeCandidate?.can_resume) &&
      typeof resumeCandidate?.session_id === "string";

    return (
      <TutorEmptyState
        icon={MessageSquare}
        title="READY TO RUN A STUDY SESSION"
        description="Tutor starts and resumes directly inside this panel. Prime Packet context, repair notes, and memory capsules feed the session here without redirecting you into another shell."
        actions={[
          {
            label: "START SESSION",
            icon: MessageSquare,
            onClick: () => {
              void onStartSession();
            },
            variant: "primary",
          },
          ...(canResume
            ? [
                {
                  label: "RESUME SESSION",
                  icon: MessageSquare,
                  onClick: () => {
                    void session.resumeSession(resumeCandidate!.session_id!);
                  },
                  variant: "ghost" as const,
                },
              ]
            : []),
        ]}
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1">
        <TutorChat
          sessionId={activeSessionId}
          courseId={hub.courseId}
          availableMaterials={hub.chatMaterials}
          selectedMaterialIds={hub.selectedMaterials}
          accuracyProfile={hub.accuracyProfile}
          memoryCapsuleContext={activeMemoryCapsuleContext}
          sessionRules={sessionRules}
          onAccuracyProfileChange={hub.setAccuracyProfile}
          onSelectedMaterialIdsChange={hub.setSelectedMaterials}
          onMaterialsChanged={hub.refreshChatMaterials}
          onArtifactCreated={session.handleArtifactCreated}
          onStudioCapture={session.handleStudioCapture}
          onCaptureNote={(payload) => {
            void workflow.captureWorkflowMessageNote(payload);
          }}
          onSaveGist={(content) => {
            void onSaveGist(content);
          }}
          onPromoteToPolishPacket={(payload) => {
            onPromoteTutorReplyToPolish(payload);
          }}
          onFeedback={(payload) => {
            void workflow.saveWorkflowMessageFeedback(payload);
            void submitBrainFeedback({
              ...payload,
              sessionId: activeSessionId,
            });
          }}
          onCompact={() => {
            void handleActivateCapsule(() => workflow.quickCompactWorkflowMemory());
          }}
          timerState={{
            elapsedSeconds: session.stageTimerDisplaySeconds,
            paused: !session.stageTimerRunning,
          }}
          onToggleTimer={() => {
            void session.toggleWorkflowStudyTimer();
          }}
          onAssistantTurnCommitted={({ assistantMessage }) => {
            session.commitAssistantMessage(assistantMessage);
          }}
          initialTurns={restoredTurns}
          onTurnComplete={(payload) => {
            session.setTurnCount((prev: number) => prev + 1);
            onCompactionTelemetry(payload?.compactionTelemetry ?? null);
            if (payload?.masteryUpdate) {
              queryClient.invalidateQueries({
                queryKey: ["mastery-dashboard"],
              });
            }
          }}
        />
      </div>
      <div className="flex flex-wrap gap-2 border-t border-primary/14 bg-black/20 px-4 py-3">
        <Button
          type="button"
          variant="outline"
          className="rounded-none font-arcade text-ui-2xs"
          onClick={() => {
            void handleSaveNoteToVault("exact");
          }}
          disabled={!workflow.activeWorkflowId || workflow.savingRuntimeEvent}
        >
          SAVE EXACT TO VAULT
        </Button>
        <Button
          type="button"
          variant="outline"
          className="rounded-none font-arcade text-ui-2xs"
          onClick={() => {
            void handleSaveNoteToVault("editable");
          }}
          disabled={!workflow.activeWorkflowId || workflow.savingRuntimeEvent}
        >
          SAVE EDITABLE TO VAULT
        </Button>
        <Button
          type="button"
          variant="outline"
          className="rounded-none font-arcade text-ui-2xs"
          onClick={() => {
            void handleActivateCapsule(() => workflow.createWorkflowMemoryCapsule());
          }}
          disabled={!workflow.activeWorkflowId || workflow.savingRuntimeEvent}
        >
          CREATE CAPSULE
        </Button>
        <Button
          type="button"
          variant="outline"
          className="rounded-none font-arcade text-ui-2xs"
          onClick={() => {
            void workflow.openWorkflowPolish();
          }}
          disabled={!workflow.activeWorkflowId}
        >
          OPEN POLISH
        </Button>
      </div>

      <TutorEndSessionDialog hub={hub} session={session} />
    </div>
  );
}
