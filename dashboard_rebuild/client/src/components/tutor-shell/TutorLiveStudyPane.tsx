import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { type ReactNode } from "react";

import { TutorChat } from "@/components/TutorChat";
import { TutorEmptyState } from "@/components/TutorEmptyState";
import { TutorEndSessionDialog } from "@/components/tutor-shell/TutorEndSessionDialog";
import type { BrainFeedbackPayload } from "@/hooks/useBrainFeedback";
import type { UseTutorHubReturn } from "@/hooks/useTutorHub";
import type { UseTutorSessionReturn } from "@/hooks/useTutorSession";
import type { UseTutorWorkflowReturn } from "@/hooks/useTutorWorkflow";

interface TutorLiveStudyPaneProps {
  activeSessionId: string | null;
  hub: UseTutorHubReturn;
  session: UseTutorSessionReturn;
  workflow: UseTutorWorkflowReturn;
  restoredTurns: { question: string; answer: string | null }[] | undefined;
  onStartSession: () => void | Promise<void>;
  onStartGeneralSession?: () => void | Promise<void>;
  activeMemoryCapsuleContext?: string | null;
  sessionRules?: string[];
  headerContent?: ReactNode;
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
  submitBrainFeedback: (payload: BrainFeedbackPayload) => void | Promise<void>;
}

export function TutorLiveStudyPane({
  activeSessionId,
  hub,
  session,
  workflow,
  restoredTurns,
  onStartSession,
  onStartGeneralSession,
  activeMemoryCapsuleContext,
  sessionRules,
  headerContent,
  onActivateMemoryCapsule,
  onDirectNoteSaveStatus,
  onSaveGist,
  onPromoteTutorReplyToPolish,
  onCompactionTelemetry,
  submitBrainFeedback,
}: TutorLiveStudyPaneProps) {
  const queryClient = useQueryClient();

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
            label: "GENERAL Q&A",
            testId: "tutor-start-general-qa",
            icon: MessageSquare,
            onClick: () => {
              void onStartGeneralSession?.();
            },
            variant: "ghost",
          },
          {
            label: "START TUTOR",
            testId: "tutor-start-teach",
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
                  testId: "tutor-resume-session",
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
      {headerContent ? (
        <div className="border-b border-primary/14 bg-black/22 px-4 py-3">
          {headerContent}
        </div>
      ) : null}
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
            if (payload.message.role !== "assistant") {
              return;
            }
            onPromoteTutorReplyToPolish({
              message: {
                messageId: payload.message.messageId,
                sessionTurnNumber: payload.message.sessionTurnNumber,
                role: "assistant",
                content: payload.message.content,
              },
              index: payload.index,
            });
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
          title="Save the assistant's reply verbatim to your vault as a read-only-style note"
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
          title="Save a rewriteable copy of the reply to your vault notes for editing"
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
