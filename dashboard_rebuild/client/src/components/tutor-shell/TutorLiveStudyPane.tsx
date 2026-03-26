import type { QueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ListChecks, MessageSquare, PenTool } from "lucide-react";

import { TutorChat } from "@/components/TutorChat";
import { TutorEmptyState } from "@/components/TutorEmptyState";
import { TutorEndSessionDialog } from "@/components/tutor-shell/TutorEndSessionDialog";
import { UseTutorHubReturn } from "@/hooks/useTutorHub";
import { UseTutorSessionReturn } from "@/hooks/useTutorSession";
import { UseTutorWorkflowReturn } from "@/hooks/useTutorWorkflow";
import { INPUT_BASE, SELECT_BASE, formatElapsedDuration } from "@/lib/tutorUtils";
import { CONTROL_KICKER } from "@/components/shell/controlStyles";
import { cn } from "@/lib/utils";
import {
  TUTOR_FIELD_SURFACE,
  TUTOR_GLASS_PANEL_SOFT,
} from "@/components/tutor-shell/tutorShellStyles";

interface TutorLiveStudyPaneProps {
  activeSessionId: string | null;
  hub: UseTutorHubReturn;
  session: UseTutorSessionReturn;
  workflow: UseTutorWorkflowReturn;
  restoredTurns: { question: string; answer: string | null }[] | undefined;
  queryClient: QueryClient;
  setShellMode: (mode: "studio" | "tutor") => void;
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
  submitBrainFeedback: (payload: Record<string, unknown>) => void | Promise<void>;
}

export function TutorLiveStudyPane({
  activeSessionId,
  hub,
  session,
  workflow,
  restoredTurns,
  queryClient,
  setShellMode,
  onSaveGist,
  onPromoteTutorReplyToPolish,
  submitBrainFeedback,
}: TutorLiveStudyPaneProps) {
  if (!activeSessionId) {
    return (
      <TutorEmptyState
        icon={MessageSquare}
        title="READY TO RUN A STUDY SESSION"
        description="Tutor is the live study surface. Start or resume from Studio, or switch into Studio to prepare notes and captures before studying."
        actions={[
          {
            label: "GO TO WORKSPACE HOME",
            icon: ListChecks,
            onClick: () => {
              workflow.setStudioView("home");
              setShellMode("studio");
            },
            variant: "primary",
          },
          {
            label: "OPEN WORKSPACE",
            icon: PenTool,
            onClick: () => {
              workflow.setStudioView("workspace");
              setShellMode("studio");
            },
            variant: "ghost",
          },
        ]}
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <Card className="overflow-hidden rounded-[1.15rem] border-[rgba(255,122,146,0.24)] bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02)_18%,rgba(0,0,0,0.22)_100%),linear-gradient(135deg,rgba(110,14,34,0.18),rgba(12,5,8,0.46)_58%,rgba(0,0,0,0.34)_100%)] backdrop-blur-[10px] shadow-[0_18px_36px_rgba(0,0,0,0.22),0_0_0_1px_rgba(255,86,118,0.12)]">
        <CardHeader className="border-b border-primary/15 pb-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className={CONTROL_KICKER}>Study Session</div>
              <div className="mt-2 max-w-3xl font-mono text-base leading-7 text-foreground/78">
                Your notes, feedback, and timer are connected to this study plan.
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant="outline"
                className="rounded-none border-primary/30 px-2 py-1 font-arcade text-ui-2xs tracking-[0.18em] text-primary/88"
              >
                {workflow.activeWorkflowId ? "STUDY PLAN ACTIVE" : "NO STUDY PLAN"}
              </Badge>
              {workflow.activeWorkflowDetail?.captured_notes ? (
                <Badge
                  variant="outline"
                  className="rounded-none border-primary/20 px-2 py-1 font-mono text-ui-2xs text-foreground/72"
                >
                  {workflow.activeWorkflowDetail.captured_notes.length} NOTES
                </Badge>
              ) : null}
              {workflow.activeWorkflowDetail?.feedback_events ? (
                <Badge
                  variant="outline"
                  className="rounded-none border-primary/20 px-2 py-1 font-mono text-ui-2xs text-foreground/72"
                >
                  {workflow.activeWorkflowDetail.feedback_events.length} FEEDBACK
                </Badge>
              ) : null}
              {workflow.activeWorkflowDetail?.memory_capsules ? (
                <Badge
                  variant="outline"
                  className="rounded-none border-primary/20 px-2 py-1 font-mono text-ui-2xs text-foreground/72"
                >
                  {workflow.activeWorkflowDetail.memory_capsules.length} CAPSULES
                </Badge>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 pt-4 xl:grid-cols-[0.92fr_1.08fr_1.02fr]">
          <div className="space-y-4">
            <div className={cn("p-3", TUTOR_GLASS_PANEL_SOFT)}>
              <div className="font-arcade text-ui-2xs text-primary/80">STUDY TIMER</div>
              <div className="mt-2 font-terminal text-2xl text-foreground">
                {formatElapsedDuration(session.stageTimerDisplaySeconds)}
              </div>
              <div className="mt-1 font-mono text-sm leading-6 text-foreground/72">
                Pause count {session.stageTimerPauseCount}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="rounded-none font-arcade text-ui-2xs"
                  onClick={() => {
                    void session.toggleWorkflowStudyTimer();
                  }}
                  disabled={!workflow.activeWorkflowId}
                >
                  {session.stageTimerRunning ? "PAUSE TIMER" : "RESUME TIMER"}
                </Button>
                <Button
                  variant="outline"
                  className="rounded-none font-arcade text-ui-2xs"
                  onClick={() => {
                    void (async () => {
                      try {
                        await session.persistStageTimeSlice("manual_save", [
                          {
                            kind: "study_timer",
                            session_id: activeSessionId,
                          },
                        ]);
                      } catch {
                        // toast handled in persistStageTimeSlice
                      }
                    })();
                  }}
                  disabled={!workflow.activeWorkflowId || !session.stageTimerRunning}
                >
                  SAVE SLICE
                </Button>
              </div>
            </div>

            <div className={cn("space-y-3 p-3", TUTOR_GLASS_PANEL_SOFT)}>
              <div className="font-arcade text-ui-2xs text-primary/80">SAVE EXACT NOTE</div>
              <input
                value={workflow.exactNoteTitle}
                onChange={(event) => workflow.setExactNoteTitle(event.target.value)}
                placeholder="Optional exact note title"
                className={INPUT_BASE}
              />
              <Textarea
                value={workflow.exactNoteContent}
                onChange={(event) => workflow.setExactNoteContent(event.target.value)}
                placeholder="Paste the exact wording you want preserved."
                className={cn("min-h-[110px]", TUTOR_FIELD_SURFACE)}
              />
              <Button
                variant="outline"
                className="rounded-none font-arcade text-ui-2xs"
                onClick={() => {
                  void workflow.saveWorkflowNoteCapture("exact");
                }}
                disabled={!workflow.activeWorkflowId || workflow.savingRuntimeEvent}
              >
                SAVE EXACT
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <div className={cn("space-y-3 p-3", TUTOR_GLASS_PANEL_SOFT)}>
              <div className="font-arcade text-ui-2xs text-primary/80">SAVE EDITABLE NOTE</div>
              <input
                value={workflow.editableNoteTitle}
                onChange={(event) => workflow.setEditableNoteTitle(event.target.value)}
                placeholder="Optional editable note title"
                className={INPUT_BASE}
              />
              <Textarea
                value={workflow.editableNoteContent}
                onChange={(event) => workflow.setEditableNoteContent(event.target.value)}
                placeholder="Save a revisable note for Polish and Obsidian."
                className={cn("min-h-[110px]", TUTOR_FIELD_SURFACE)}
              />
              <Button
                variant="outline"
                className="rounded-none font-arcade text-ui-2xs"
                onClick={() => {
                  void workflow.saveWorkflowNoteCapture("editable");
                }}
                disabled={!workflow.activeWorkflowId || workflow.savingRuntimeEvent}
              >
                SAVE EDITABLE
              </Button>
            </div>

            <div className={cn("space-y-3 p-3", TUTOR_GLASS_PANEL_SOFT)}>
              <div className="font-arcade text-ui-2xs text-primary/80">SESSION FEEDBACK</div>
              <div className="grid gap-3 md:grid-cols-2">
                <select
                  value={workflow.feedbackSentiment}
                  onChange={(event) =>
                    workflow.setFeedbackSentiment(event.target.value as "liked" | "disliked")
                  }
                  className={SELECT_BASE}
                >
                  <option value="liked">Liked</option>
                  <option value="disliked">Disliked</option>
                </select>
                <select
                  value={workflow.feedbackIssueType}
                  onChange={(event) => workflow.setFeedbackIssueType(event.target.value)}
                  className={SELECT_BASE}
                >
                  <option value="good">Good</option>
                  <option value="mistake">Mistake</option>
                  <option value="incorrect">Incorrect</option>
                  <option value="unclear">Unclear</option>
                  <option value="missing_context">Missing context</option>
                </select>
              </div>
              <Textarea
                value={workflow.feedbackMessage}
                onChange={(event) => workflow.setFeedbackMessage(event.target.value)}
                placeholder="What worked or failed in this tutor run?"
                className={cn("min-h-[100px]", TUTOR_FIELD_SURFACE)}
              />
              <Button
                variant="outline"
                className="rounded-none font-arcade text-ui-2xs"
                onClick={() => {
                  void workflow.saveWorkflowFeedbackEvent();
                }}
                disabled={!workflow.activeWorkflowId || workflow.savingRuntimeEvent}
              >
                SAVE FEEDBACK
              </Button>
            </div>
          </div>

          <div className={cn("space-y-3 p-3", TUTOR_GLASS_PANEL_SOFT)}>
            <div className="font-arcade text-ui-2xs text-primary/80">MEMORY CAPSULE</div>
            <Textarea
              value={workflow.memorySummaryText}
              onChange={(event) => workflow.setMemorySummaryText(event.target.value)}
              placeholder="Compaction summary for the finished portion of the session."
              className={cn("min-h-[90px]", TUTOR_FIELD_SURFACE)}
            />
            <Textarea
              value={workflow.memoryWeakPointsText}
              onChange={(event) => workflow.setMemoryWeakPointsText(event.target.value)}
              placeholder={"Weak points\nOne per line"}
              className={cn("min-h-[75px]", TUTOR_FIELD_SURFACE)}
            />
            <Textarea
              value={workflow.memoryUnresolvedText}
              onChange={(event) => workflow.setMemoryUnresolvedText(event.target.value)}
              placeholder={"Unresolved questions\nOne per line"}
              className={cn("min-h-[75px]", TUTOR_FIELD_SURFACE)}
            />
            <Textarea
              value={workflow.memoryCardRequestsText}
              onChange={(event) => workflow.setMemoryCardRequestsText(event.target.value)}
              placeholder={"Queued card requests\nOne per line"}
              className={cn("min-h-[75px]", TUTOR_FIELD_SURFACE)}
            />
            <Button
              variant="outline"
              className="rounded-none font-arcade text-ui-2xs"
              onClick={() => {
                void workflow.createWorkflowMemoryCapsule();
              }}
              disabled={!workflow.activeWorkflowId || workflow.savingRuntimeEvent}
            >
              CREATE CAPSULE
            </Button>
            <Button
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
        </CardContent>
      </Card>

      <div className="min-h-0 flex-1">
        <TutorChat
          sessionId={activeSessionId}
          courseId={hub.courseId}
          availableMaterials={hub.chatMaterials}
          selectedMaterialIds={hub.selectedMaterials}
          accuracyProfile={hub.accuracyProfile}
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
            void workflow.quickCompactWorkflowMemory();
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
          onTurnComplete={(masteryUpdate) => {
            session.setTurnCount((prev: number) => prev + 1);
            if (masteryUpdate) {
              queryClient.invalidateQueries({
                queryKey: ["mastery-dashboard"],
              });
            }
          }}
        />
      </div>

      <TutorEndSessionDialog hub={hub} session={session} />
    </div>
  );
}
