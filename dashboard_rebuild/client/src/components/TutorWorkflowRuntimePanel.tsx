import {
  CONTROL_DECK,
  CONTROL_DECK_BOTTOMLINE,
  CONTROL_DECK_INSET,
  CONTROL_DECK_SECTION,
  CONTROL_DECK_TOPLINE,
  CONTROL_KICKER,
  controlToggleButton,
} from "@/components/shell/controlStyles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { INPUT_BASE, SELECT_BASE, TEXT_MUTED } from "@/lib/theme";
import { cn } from "@/lib/utils";
import {
  Clock3,
  Pause,
  Play,
  Save,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";

export type TutorWorkflowRuntimeFeedbackSentiment = "liked" | "disliked";

export type TutorWorkflowRuntimeFeedbackIssueType =
  | "good"
  | "mistake"
  | "incorrect"
  | "unclear"
  | "missing_context";

export interface TutorWorkflowRuntimeCounts {
  exactNotes?: number;
  editableNotes?: number;
  feedbackEvents?: number;
  memoryCapsules?: number;
}

export interface TutorWorkflowRuntimePanelProps {
  timerRunning: boolean;
  timerSeconds: number;
  timerLabel?: string | null;
  onToggleTimer: () => void;
  onSaveTimerSlice: () => void;
  exactNoteTitle: string;
  exactNoteContent: string;
  onExactNoteTitleChange: (value: string) => void;
  onExactNoteContentChange: (value: string) => void;
  onSaveExactNote: () => void;
  editableNoteTitle: string;
  editableNoteContent: string;
  onEditableNoteTitleChange: (value: string) => void;
  onEditableNoteContentChange: (value: string) => void;
  onSaveEditableNote: () => void;
  feedbackSentiment: TutorWorkflowRuntimeFeedbackSentiment;
  feedbackIssueType: TutorWorkflowRuntimeFeedbackIssueType;
  feedbackMessage: string;
  onFeedbackSentimentChange: (
    value: TutorWorkflowRuntimeFeedbackSentiment,
  ) => void;
  onFeedbackIssueTypeChange: (
    value: TutorWorkflowRuntimeFeedbackIssueType,
  ) => void;
  onFeedbackMessageChange: (value: string) => void;
  onSubmitFeedback: () => void;
  memorySummary: string;
  memoryWeakPoints: string;
  memoryUnresolvedQuestions: string;
  memoryCardRequests: string;
  onMemorySummaryChange: (value: string) => void;
  onMemoryWeakPointsChange: (value: string) => void;
  onMemoryUnresolvedQuestionsChange: (value: string) => void;
  onMemoryCardRequestsChange: (value: string) => void;
  onCreateMemoryCapsule: () => void;
  counts?: TutorWorkflowRuntimeCounts;
  disabled?: boolean;
}

function formatDuration(seconds: number) {
  const safe =
    Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  const ss = String(secs).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function RuntimeSectionHeader({
  title,
  badge,
}: {
  title: string;
  badge?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-primary/15 pb-2">
      <div className={CONTROL_KICKER}>{title}</div>
      {badge ? (
        <Badge
          variant="outline"
          className="rounded-full border-primary/30 px-3 py-1 font-terminal text-ui-2xs"
        >
          {badge}
        </Badge>
      ) : null}
    </div>
  );
}

export function TutorWorkflowRuntimePanel({
  timerRunning,
  timerSeconds,
  timerLabel,
  onToggleTimer,
  onSaveTimerSlice,
  exactNoteTitle,
  exactNoteContent,
  onExactNoteTitleChange,
  onExactNoteContentChange,
  onSaveExactNote,
  editableNoteTitle,
  editableNoteContent,
  onEditableNoteTitleChange,
  onEditableNoteContentChange,
  onSaveEditableNote,
  feedbackSentiment,
  feedbackIssueType,
  feedbackMessage,
  onFeedbackSentimentChange,
  onFeedbackIssueTypeChange,
  onFeedbackMessageChange,
  onSubmitFeedback,
  memorySummary,
  memoryWeakPoints,
  memoryUnresolvedQuestions,
  memoryCardRequests,
  onMemorySummaryChange,
  onMemoryWeakPointsChange,
  onMemoryUnresolvedQuestionsChange,
  onMemoryCardRequestsChange,
  onCreateMemoryCapsule,
  counts,
  disabled = false,
}: TutorWorkflowRuntimePanelProps) {
  return (
    <Card className={CONTROL_DECK}>
      <div className={CONTROL_DECK_INSET} />
      <div className={CONTROL_DECK_TOPLINE} />
      <div className={CONTROL_DECK_BOTTOMLINE} />
      <CardHeader className="relative z-10 border-b border-primary/15 pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="font-arcade text-xs text-primary">
            WORKFLOW RUNTIME
          </CardTitle>
          <Badge
            variant="outline"
            className="rounded-full border-primary/30 px-3 py-1 font-terminal text-ui-2xs"
          >
            TUTOR STAGE
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="relative z-10 space-y-4 pt-4">
        {counts ? (
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <div className={CONTROL_DECK_SECTION}>
              <div className={CONTROL_KICKER}>EXACT</div>
              <div className="mt-1 font-mono text-sm leading-6 text-foreground">
                {counts.exactNotes ?? 0}
              </div>
            </div>
            <div className={CONTROL_DECK_SECTION}>
              <div className={CONTROL_KICKER}>EDITABLE</div>
              <div className="mt-1 font-mono text-sm leading-6 text-foreground">
                {counts.editableNotes ?? 0}
              </div>
            </div>
            <div className={CONTROL_DECK_SECTION}>
              <div className={CONTROL_KICKER}>FEEDBACK</div>
              <div className="mt-1 font-mono text-sm leading-6 text-foreground">
                {counts.feedbackEvents ?? 0}
              </div>
            </div>
            <div className={CONTROL_DECK_SECTION}>
              <div className={CONTROL_KICKER}>CAPSULES</div>
              <div className="mt-1 font-mono text-sm leading-6 text-foreground">
                {counts.memoryCapsules ?? 0}
              </div>
            </div>
          </div>
        ) : null}

        <div className={cn(CONTROL_DECK_SECTION, "space-y-3")}>
          <RuntimeSectionHeader
            title="STUDY TIMER"
            badge={timerRunning ? "RUNNING" : "PAUSED"}
          />
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-mono text-2xl leading-8 text-foreground">
                {formatDuration(timerSeconds)}
              </div>
              <div className={`${TEXT_MUTED} mt-1 text-sm`}>
                {timerLabel || "Tutor stage time"}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className={controlToggleButton(false, "secondary", true)}
                onClick={onToggleTimer}
                disabled={disabled}
              >
                {timerRunning ? (
                  <>
                    <Pause className="mr-2 h-3.5 w-3.5" />
                    PAUSE
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-3.5 w-3.5" />
                    START
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                className={controlToggleButton(false, "secondary", true)}
                onClick={onSaveTimerSlice}
                disabled={disabled}
              >
                <Clock3 className="mr-2 h-3.5 w-3.5" />
                SAVE SLICE
              </Button>
            </div>
          </div>
        </div>

        <div className={cn(CONTROL_DECK_SECTION, "space-y-3")}>
          <RuntimeSectionHeader title="SAVE EXACT NOTE" />
          <input
            value={exactNoteTitle}
            onChange={(event) => onExactNoteTitleChange(event.target.value)}
            placeholder="Optional exact note title"
            className={INPUT_BASE}
            disabled={disabled}
          />
          <textarea
            value={exactNoteContent}
            onChange={(event) => onExactNoteContentChange(event.target.value)}
            placeholder="Store locked text exactly as written."
            className={`${INPUT_BASE} min-h-[92px] resize-y`}
            disabled={disabled}
          />
          <Button
            variant="outline"
            className={controlToggleButton(false, "secondary", true)}
            onClick={onSaveExactNote}
            disabled={disabled || !exactNoteContent.trim()}
          >
            <Save className="mr-2 h-3.5 w-3.5" />
            SAVE EXACT
          </Button>
        </div>

        <div className={cn(CONTROL_DECK_SECTION, "space-y-3")}>
          <RuntimeSectionHeader title="SAVE EDITABLE NOTE" />
          <input
            value={editableNoteTitle}
            onChange={(event) => onEditableNoteTitleChange(event.target.value)}
            placeholder="Optional editable note title"
            className={INPUT_BASE}
            disabled={disabled}
          />
          <textarea
            value={editableNoteContent}
            onChange={(event) =>
              onEditableNoteContentChange(event.target.value)
            }
            placeholder="Store a revisable note for Polish."
            className={`${INPUT_BASE} min-h-[92px] resize-y`}
            disabled={disabled}
          />
          <Button
            variant="outline"
            className={controlToggleButton(false, "secondary", true)}
            onClick={onSaveEditableNote}
            disabled={disabled || !editableNoteContent.trim()}
          >
            <Save className="mr-2 h-3.5 w-3.5" />
            SAVE EDITABLE
          </Button>
        </div>

        <div className={cn(CONTROL_DECK_SECTION, "space-y-3")}>
          <RuntimeSectionHeader title="FEEDBACK" />
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className={controlToggleButton(
                feedbackSentiment === "liked",
                "secondary",
                true,
              )}
              onClick={() => onFeedbackSentimentChange("liked")}
              disabled={disabled}
            >
              <ThumbsUp className="mr-2 h-3.5 w-3.5" />
              LIKE
            </Button>
            <Button
              variant="outline"
              className={controlToggleButton(
                feedbackSentiment === "disliked",
                "secondary",
                true,
              )}
              onClick={() => onFeedbackSentimentChange("disliked")}
              disabled={disabled}
            >
              <ThumbsDown className="mr-2 h-3.5 w-3.5" />
              DISLIKE
            </Button>
            <Badge
              variant="outline"
              className="rounded-full border-primary/30 px-3 py-1 font-terminal text-ui-2xs"
            >
              {feedbackSentiment.toUpperCase()}
            </Badge>
          </div>

          <select
            value={feedbackIssueType}
            onChange={(event) =>
              onFeedbackIssueTypeChange(
                event.target.value as TutorWorkflowRuntimeFeedbackIssueType,
              )
            }
            className={SELECT_BASE}
            disabled={disabled}
          >
            <option value="good">Good</option>
            <option value="mistake">Mistake</option>
            <option value="incorrect">Incorrect</option>
            <option value="unclear">Unclear</option>
            <option value="missing_context">Missing context</option>
          </select>

          <textarea
            value={feedbackMessage}
            onChange={(event) => onFeedbackMessageChange(event.target.value)}
            placeholder="What worked or what was wrong?"
            className={`${INPUT_BASE} min-h-[92px] resize-y`}
            disabled={disabled}
          />

          <Button
            variant="outline"
            className={controlToggleButton(false, "secondary", true)}
            onClick={onSubmitFeedback}
            disabled={disabled || !feedbackMessage.trim()}
          >
            <Save className="mr-2 h-3.5 w-3.5" />
            SAVE FEEDBACK
          </Button>
        </div>

        <div className={cn(CONTROL_DECK_SECTION, "space-y-3")}>
          <RuntimeSectionHeader title="MEMORY CAPSULE" />
          <textarea
            value={memorySummary}
            onChange={(event) => onMemorySummaryChange(event.target.value)}
            placeholder="Compact summary of the session state."
            className={`${INPUT_BASE} min-h-[92px] resize-y`}
            disabled={disabled}
          />
          <textarea
            value={memoryWeakPoints}
            onChange={(event) => onMemoryWeakPointsChange(event.target.value)}
            placeholder="Weak points, one per line."
            className={`${INPUT_BASE} min-h-[80px] resize-y`}
            disabled={disabled}
          />
          <textarea
            value={memoryUnresolvedQuestions}
            onChange={(event) =>
              onMemoryUnresolvedQuestionsChange(event.target.value)
            }
            placeholder="Unresolved questions, one per line."
            className={`${INPUT_BASE} min-h-[80px] resize-y`}
            disabled={disabled}
          />
          <textarea
            value={memoryCardRequests}
            onChange={(event) => onMemoryCardRequestsChange(event.target.value)}
            placeholder="Queued card requests, one per line."
            className={`${INPUT_BASE} min-h-[80px] resize-y`}
            disabled={disabled}
          />

          <Button
            className={controlToggleButton(true, "primary", true)}
            onClick={onCreateMemoryCapsule}
            disabled={disabled || !memorySummary.trim()}
          >
            <Sparkles className="mr-2 h-3.5 w-3.5" />
            CREATE CAPSULE
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
