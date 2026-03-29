import { useEffect, useMemo, useState } from "react";
import {
  Brain,
  CheckCircle2,
  Layers3,
  ListTodo,
  MessageSquare,
  RefreshCw,
  Sparkles,
  StickyNote,
} from "lucide-react";
import { toast } from "sonner";

import type {
  TutorCapturedNote,
  TutorFeedbackEvent,
  TutorMemoryCapsule,
  TutorPolishBundle,
  TutorPolishBundleRequest,
  TutorWorkflowSummary,
} from "@/api.types";
import { api } from "@/lib/api";
import {
  CONTROL_COPY,
  CONTROL_DECK,
  CONTROL_DECK_BOTTOMLINE,
  CONTROL_DECK_INSET,
  CONTROL_DECK_SECTION,
  CONTROL_DECK_TOPLINE,
  CONTROL_KICKER,
  controlToggleButton,
} from "@/components/shell/controlStyles";
import { TutorWorkspaceSurface } from "@/components/TutorWorkspaceSurface";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  normalizeStudioPolishPromotedNotes,
  type StudioPolishPromotedNote,
} from "@/lib/studioPacketSections";
import { cn } from "@/lib/utils";

type ReviewQueueKey =
  | "tutor_replies"
  | "exact_notes"
  | "editable_notes"
  | "memory_capsules"
  | "feedback"
  | "studio_artifacts"
  | "card_requests"
  | "reprime";

type TutorWorkflowPolishStudioProps = {
  workflow: TutorWorkflowSummary | null;
  primingBundleId?: number | null;
  promotedNotes: StudioPolishPromotedNote[];
  capturedNotes: TutorCapturedNote[];
  feedbackEvents: TutorFeedbackEvent[];
  memoryCapsules: TutorMemoryCapsule[];
  existingBundle: TutorPolishBundle | null;
  isSaving: boolean;
  onBackToTutor: () => void;
  onSaveDraft: (payload: TutorPolishBundleRequest) => void;
  onFinalize: (payload: TutorPolishBundleRequest) => void;
  onDraftPreviewChange?: (preview: {
    summaryDraft: string;
    cardRequestText: string;
  }) => void;
};

function toLineItems(lines: string) {
  return lines
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => ({
      id: `line-${index}-${line}`,
      text: line,
    }));
}

function toArtifactItems(lines: string) {
  return lines
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [rawType, rawTitle, ...rest] = line
        .split("::")
        .map((part) => part.trim());
      const title = rawTitle || rawType || `Artifact ${index + 1}`;
      const content = rest.join(" :: ").trim();
      return {
        id: `artifact-${index}-${title}`,
        type: rawType || "board",
        title,
        content,
        text: line,
      };
    });
}

function artifactItemsToText(value: unknown) {
  if (!Array.isArray(value)) return "";
  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return "";
      const record = entry as Record<string, unknown>;
      const type = String(record.type || "board").trim();
      const title = String(record.title || "").trim();
      const content = String(record.content || "").trim();
      return [type, title, content].filter(Boolean).join(" :: ");
    })
    .filter(Boolean)
    .join("\n");
}

function noteBadgeVariant(noteMode: TutorCapturedNote["note_mode"]) {
  return noteMode === "exact" ? "default" : "secondary";
}

function feedbackLabel(event: TutorFeedbackEvent) {
  return (
    [event.sentiment, event.issue_type].filter(Boolean).join(" / ") ||
    "feedback"
  );
}

function buildAssistContext(
  summaryDraft: string,
  promotedNotes: StudioPolishPromotedNote[],
  exactNotes: TutorCapturedNote[],
  editableNotes: TutorCapturedNote[],
  memoryCapsules: TutorMemoryCapsule[],
) {
  const sections = [
    summaryDraft.trim() ? `CURRENT SUMMARY\n${summaryDraft.trim()}` : "",
    promotedNotes
      .slice(0, 8)
      .map(
        (note) => `TUTOR REPLY: ${note.title || "untitled"}\n${note.content}`,
      )
      .join("\n\n"),
    exactNotes
      .slice(0, 8)
      .map((note) => `EXACT NOTE: ${note.title || "untitled"}\n${note.content}`)
      .join("\n\n"),
    editableNotes
      .slice(0, 8)
      .map(
        (note) => `EDITABLE NOTE: ${note.title || "untitled"}\n${note.content}`,
      )
      .join("\n\n"),
    memoryCapsules
      .slice(0, 6)
      .map(
        (capsule) =>
          `MEMORY CAPSULE v${capsule.capsule_version}\n${capsule.summary_text || ""}`,
      )
      .join("\n\n"),
  ].filter(Boolean);
  return sections.join("\n\n");
}

export function TutorWorkflowPolishStudio({
  workflow,
  primingBundleId,
  promotedNotes,
  capturedNotes,
  feedbackEvents,
  memoryCapsules,
  existingBundle,
  isSaving,
  onBackToTutor,
  onSaveDraft,
  onFinalize,
  onDraftPreviewChange,
}: TutorWorkflowPolishStudioProps) {
  const exactNotes = useMemo(
    () => capturedNotes.filter((note) => note.note_mode === "exact"),
    [capturedNotes],
  );
  const editableNotes = useMemo(
    () => capturedNotes.filter((note) => note.note_mode === "editable"),
    [capturedNotes],
  );
  const persistedPromotedNotes = useMemo(
    () =>
      normalizeStudioPolishPromotedNotes(
        existingBundle?.studio_payload?.promoted_notes,
      ),
    [existingBundle?.studio_payload?.promoted_notes],
  );
  const reviewablePromotedNotes = useMemo(
    () =>
      promotedNotes.length > 0 ? promotedNotes : persistedPromotedNotes,
    [persistedPromotedNotes, promotedNotes],
  );
  const feedbackQueue = useMemo(
    () => feedbackEvents.filter((event) => event.handoff_to_polish),
    [feedbackEvents],
  );
  const defaultSummary = useMemo(() => {
    const latestCapsuleSummary =
      [...memoryCapsules]
        .reverse()
        .find(
          (capsule) =>
            typeof capsule.summary_text === "string" &&
            capsule.summary_text.trim().length > 0,
        )
        ?.summary_text?.trim() || "";
    if (latestCapsuleSummary) return latestCapsuleSummary;
    return (
      editableNotes[0]?.content ||
      exactNotes[0]?.content ||
      reviewablePromotedNotes[0]?.content ||
      ""
    );
  }, [editableNotes, exactNotes, memoryCapsules, reviewablePromotedNotes]);
  const defaultQuestion = useMemo(() => {
    const unresolved = [...memoryCapsules]
      .reverse()
      .flatMap((capsule) => capsule.unresolved_questions || [])
      .map((entry) =>
        String((entry as Record<string, unknown>).text || "").trim(),
      )
      .filter(Boolean);
    return unresolved[0] || "";
  }, [memoryCapsules]);
  const defaultCards = useMemo(() => {
    const bundledCards =
      (existingBundle?.card_requests || [])
        .map((entry) =>
          String((entry as Record<string, unknown>).text || "").trim(),
        )
        .filter(Boolean)
        .join("\n") || "";
    if (bundledCards) return bundledCards;
    return [...memoryCapsules]
      .reverse()
      .flatMap((capsule) => capsule.card_requests || [])
      .map((entry) =>
        String((entry as Record<string, unknown>).text || "").trim(),
      )
      .filter(Boolean)
      .join("\n");
  }, [existingBundle?.card_requests, memoryCapsules]);
  const defaultReprime = useMemo(() => {
    const bundledReprime =
      (existingBundle?.reprime_requests || [])
        .map((entry) =>
          String((entry as Record<string, unknown>).text || "").trim(),
        )
        .filter(Boolean)
        .join("\n") || "";
    if (bundledReprime) return bundledReprime;
    return feedbackQueue
      .filter((event) => event.sentiment === "disliked")
      .map((event) => event.message?.trim() || event.issue_type?.trim() || "")
      .filter(Boolean)
      .join("\n");
  }, [existingBundle?.reprime_requests, feedbackQueue]);

  const [selectedQueue, setSelectedQueue] =
    useState<ReviewQueueKey>("exact_notes");
  const [summaryDraft, setSummaryDraft] = useState("");
  const [assistantQuestion, setAssistantQuestion] = useState("");
  const [studioArtifactText, setStudioArtifactText] = useState("");
  const [cardRequestText, setCardRequestText] = useState("");
  const [reprimeText, setReprimeText] = useState("");
  const [publishToObsidian, setPublishToObsidian] = useState(true);
  const [publishToAnki, setPublishToAnki] = useState(false);
  const [indexInBrain, setIndexInBrain] = useState(true);
  const [classificationNote, setClassificationNote] = useState("");
  const [assistResponse, setAssistResponse] = useState("");
  const [assistBusy, setAssistBusy] = useState(false);

  useEffect(() => {
    if (
      selectedQueue === "exact_notes" &&
      exactNotes.length === 0 &&
      editableNotes.length === 0 &&
      reviewablePromotedNotes.length > 0
    ) {
      setSelectedQueue("tutor_replies");
    }
  }, [
    editableNotes.length,
    exactNotes.length,
    reviewablePromotedNotes.length,
    selectedQueue,
  ]);

  useEffect(() => {
    setSummaryDraft(
      String(
        existingBundle?.summaries?.[0] &&
          typeof existingBundle.summaries[0] === "object" &&
          existingBundle.summaries[0] !== null
          ? (existingBundle.summaries[0] as Record<string, unknown>).content ||
              defaultSummary
          : defaultSummary,
      ),
    );
    setAssistantQuestion(
      String(
        existingBundle?.studio_payload?.polish_question ||
          defaultQuestion ||
          "",
      ),
    );
    setStudioArtifactText(
      artifactItemsToText(existingBundle?.studio_payload?.artifacts),
    );
    setCardRequestText(defaultCards);
    setReprimeText(defaultReprime);
    setPublishToObsidian(existingBundle?.publish_targets?.obsidian !== false);
    setPublishToAnki(
      Boolean(existingBundle?.publish_targets?.anki || defaultCards.trim()),
    );
    setIndexInBrain(existingBundle?.publish_targets?.brain !== false);
    setClassificationNote(
      String(existingBundle?.studio_payload?.classification_note || ""),
    );
  }, [
    defaultCards,
    defaultQuestion,
    defaultReprime,
    defaultSummary,
    existingBundle?.publish_targets,
    existingBundle?.studio_payload,
    existingBundle?.summaries,
    workflow?.workflow_id,
  ]);

  useEffect(() => {
    onDraftPreviewChange?.({
      summaryDraft,
      cardRequestText,
    });
  }, [cardRequestText, onDraftPreviewChange, summaryDraft]);

  const queueCounts = {
    tutor_replies: reviewablePromotedNotes.length,
    exact_notes: exactNotes.length,
    editable_notes: editableNotes.length,
    memory_capsules: memoryCapsules.length,
    feedback: feedbackQueue.length,
    studio_artifacts: toArtifactItems(studioArtifactText).length,
    card_requests: toLineItems(cardRequestText).length,
    reprime: toLineItems(reprimeText).length,
  } satisfies Record<ReviewQueueKey, number>;

  const buildPayload = (status: string): TutorPolishBundleRequest => ({
    tutor_session_id: workflow?.active_tutor_session_id || null,
    priming_bundle_id: primingBundleId ?? null,
    exact_notes: exactNotes.map((note) => ({
      id: note.id,
      title: note.title,
      content: note.content,
      status: note.status,
      source_turn_id: note.source_turn_id,
      created_at: note.created_at,
    })),
    editable_notes: editableNotes.map((note) => ({
      id: note.id,
      title: note.title,
      content: note.content,
      status: note.status,
      source_turn_id: note.source_turn_id,
      created_at: note.created_at,
    })),
    summaries: summaryDraft.trim()
      ? [
          {
            id: existingBundle?.summaries?.[0]
              ? (existingBundle.summaries[0] as Record<string, unknown>).id ||
                "summary-0"
              : "summary-0",
            title: "Polish final summary draft",
            content: summaryDraft.trim(),
          },
        ]
      : [],
    feedback_queue: feedbackQueue.map((event) => ({
      id: event.id,
      sentiment: event.sentiment,
      issue_type: event.issue_type,
      message: event.message,
      source_type: event.source_type,
      source_id: event.source_id,
    })),
    card_requests: toLineItems(cardRequestText).map((item) => ({
      id: item.id,
      text: item.text,
    })),
    reprime_requests: toLineItems(reprimeText).map((item) => ({
      id: item.id,
      text: item.text,
    })),
      studio_payload: {
        embedded_surface: "TutorWorkspaceSurface",
        selected_queue: selectedQueue,
        polish_question: assistantQuestion.trim(),
        classification_note: classificationNote.trim(),
        artifacts: toArtifactItems(studioArtifactText),
        promoted_notes: reviewablePromotedNotes,
      },
      publish_targets: {
        obsidian: publishToObsidian,
        anki: publishToAnki,
      brain: indexInBrain,
      studio_artifacts: toArtifactItems(studioArtifactText).length > 0,
    },
    status,
  });

  const runAssist = async (
    action: "summarize" | "qa" | "rewrite_note" | "draft_cards",
  ) => {
    if (!workflow?.workflow_id) {
      toast.error("Workflow context is required for Polish Assist.");
      return;
    }
    setAssistBusy(true);
    try {
      const result = await api.tutor.runPolishAssist(workflow.workflow_id, {
        action,
        input_text: buildAssistContext(
          summaryDraft,
          reviewablePromotedNotes,
          exactNotes,
          editableNotes,
          memoryCapsules,
        ),
        question: action === "qa" ? assistantQuestion.trim() : undefined,
        max_cards: 8,
      });
      const text = String(result.result.text || "").trim();
      const cards = result.result.cards || [];
      if (action === "summarize" || action === "rewrite_note") {
        setSummaryDraft(text || summaryDraft);
      } else if (action === "qa") {
        setAssistResponse(text);
      } else if (action === "draft_cards") {
        const cardLines = cards
          .map((card) => `${card.front} :: ${card.back}`)
          .join("\n");
        setCardRequestText(cardLines || text || cardRequestText);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Polish Assist failed");
    } finally {
      setAssistBusy(false);
    }
  };

  const queueButtons: Array<{
    key: ReviewQueueKey;
    label: string;
    icon: typeof StickyNote;
  }> = [
    { key: "tutor_replies", label: "Tutor replies", icon: MessageSquare },
    { key: "exact_notes", label: "Exact notes", icon: StickyNote },
    { key: "editable_notes", label: "Editable notes", icon: ListTodo },
    { key: "memory_capsules", label: "Memory capsules", icon: Layers3 },
    { key: "feedback", label: "Feedback", icon: RefreshCw },
    { key: "studio_artifacts", label: "Studio artifacts", icon: Layers3 },
    { key: "card_requests", label: "Card queue", icon: Sparkles },
    { key: "reprime", label: "Re-prime", icon: Brain },
  ];

  const fieldClassName =
    "rounded-[1rem] border border-[rgba(255,122,146,0.18)] bg-black/40 font-mono text-base leading-6 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] placeholder:text-foreground/32 focus-visible:border-primary/45 focus-visible:ring-primary/45";

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_340px]">
        <Card className={CONTROL_DECK}>
          <div className={CONTROL_DECK_INSET} />
          <div className={CONTROL_DECK_TOPLINE} />
          <div className={CONTROL_DECK_BOTTOMLINE} />
          <CardHeader className="relative z-10 pb-3">
            <div className="space-y-2">
              <CardTitle className="font-arcade text-sm text-primary">
                REVIEW QUEUE
              </CardTitle>
              <div className="font-mono text-sm leading-6 text-foreground/72">
                Hydrate the exact notes, editable notes, feedback, and handoff
                queues before final polish.
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative z-10 space-y-2">
            {queueButtons.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setSelectedQueue(item.key)}
                  className={cn(
                    controlToggleButton(
                      selectedQueue === item.key,
                      "primary",
                      true,
                    ),
                    "w-full justify-between text-left",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </span>
                  <Badge
                    variant="outline"
                    className="rounded-full border-primary/30 px-2.5 py-1 font-terminal text-ui-2xs"
                  >
                    {queueCounts[item.key]}
                  </Badge>
                </button>
              );
            })}
            <div className={cn(CONTROL_DECK_SECTION, "space-y-1.5")}>
              <div className={CONTROL_KICKER}>Workflow</div>
              <div className="font-mono text-sm leading-6 text-foreground">
                {workflow?.course_name || "Unassigned course"}
              </div>
              <div className="font-mono text-sm leading-6 text-foreground/72">
                {workflow?.assignment_title || "No assignment linked"}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex min-h-0 flex-col gap-4">
          <Card className={CONTROL_DECK}>
            <div className={CONTROL_DECK_INSET} />
            <div className={CONTROL_DECK_TOPLINE} />
            <div className={CONTROL_DECK_BOTTOMLINE} />
            <CardHeader className="relative z-10 pb-3">
              <div className="space-y-2">
                <CardTitle className="font-arcade text-sm text-primary">
                  POLISH STUDIO
                </CardTitle>
                <div className="font-mono text-sm leading-6 text-foreground/72">
                  Keep the Studio board live while you package the final summary
                  and downstream artifacts.
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative z-10 min-h-[520px]">
              <TutorWorkspaceSurface />
            </CardContent>
          </Card>
          <Card className={CONTROL_DECK}>
            <div className={CONTROL_DECK_INSET} />
            <div className={CONTROL_DECK_TOPLINE} />
            <div className={CONTROL_DECK_BOTTOMLINE} />
            <CardHeader className="relative z-10 pb-3">
              <div className="space-y-2">
                <CardTitle className="font-arcade text-sm text-primary">
                  FINAL SUMMARY
                </CardTitle>
                <div className="font-mono text-sm leading-6 text-foreground/72">
                  Capture the publish-ready narrative and a short rationale for
                  classification.
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative z-10 space-y-3">
              <Textarea
                value={summaryDraft}
                onChange={(event) => setSummaryDraft(event.target.value)}
                placeholder="Final summary draft for Obsidian and Brain indexing"
                className={cn(fieldClassName, "min-h-[140px]")}
              />
              <Input
                value={classificationNote}
                onChange={(event) => setClassificationNote(event.target.value)}
                placeholder="Classification note / publish rationale"
                className={fieldClassName}
              />
            </CardContent>
          </Card>
        </div>

        <Card className={CONTROL_DECK}>
          <div className={CONTROL_DECK_INSET} />
          <div className={CONTROL_DECK_TOPLINE} />
          <div className={CONTROL_DECK_BOTTOMLINE} />
          <CardHeader className="relative z-10 pb-3">
            <div className="space-y-2">
              <CardTitle className="font-arcade text-sm text-primary">
                POLISH ASSIST
              </CardTitle>
              <div className="font-mono text-sm leading-6 text-foreground/72">
                Ask focused questions over the current study output, then decide
                what should publish.
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative z-10 space-y-4">
            <div className="space-y-2">
              <div className={CONTROL_KICKER}>Assist prompt</div>
              <Input
                value={assistantQuestion}
                onChange={(event) => setAssistantQuestion(event.target.value)}
                placeholder="Question to answer over the current study output"
                className={fieldClassName}
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                variant="outline"
                className={controlToggleButton(false, "secondary", true)}
                onClick={() => {
                  setSummaryDraft(defaultSummary);
                }}
              >
                Draft from capsules
              </Button>
              <Button
                variant="outline"
                className={controlToggleButton(false, "secondary", true)}
                onClick={() => {
                  setReprimeText(defaultReprime);
                }}
              >
                Pull re-prime queue
              </Button>
              <Button
                variant="outline"
                className={controlToggleButton(false, "secondary", true)}
                onClick={() => {
                  void runAssist("summarize");
                }}
                disabled={assistBusy}
              >
                {assistBusy ? "Running..." : "LLM summarize"}
              </Button>
              <Button
                variant="outline"
                className={controlToggleButton(false, "secondary", true)}
                onClick={() => {
                  void runAssist("rewrite_note");
                }}
                disabled={assistBusy}
              >
                Rewrite notes
              </Button>
              <Button
                variant="outline"
                className={controlToggleButton(false, "secondary", true)}
                onClick={() => {
                  void runAssist("draft_cards");
                }}
                disabled={assistBusy}
              >
                Generate cards
              </Button>
              <Button
                variant="outline"
                className={controlToggleButton(false, "secondary", true)}
                onClick={() => {
                  void runAssist("qa");
                }}
                disabled={assistBusy || !assistantQuestion.trim()}
              >
                Answer question
              </Button>
            </div>
            <div className="space-y-2">
              <div className={CONTROL_KICKER}>Studio artifact package</div>
              <Textarea
                value={studioArtifactText}
                onChange={(event) => setStudioArtifactText(event.target.value)}
                placeholder="One per line: board :: Cardiology concept board :: Link symptoms, preload, afterload"
                className={cn(fieldClassName, "min-h-[110px]")}
              />
            </div>
            <div className="space-y-2">
              <div className={CONTROL_KICKER}>Card requests</div>
              <Textarea
                value={cardRequestText}
                onChange={(event) => setCardRequestText(event.target.value)}
                placeholder="One flashcard request per line"
                className={cn(fieldClassName, "min-h-[110px]")}
              />
            </div>
            <div className="space-y-2">
              <div className={CONTROL_KICKER}>Re-prime requests</div>
              <Textarea
                value={reprimeText}
                onChange={(event) => setReprimeText(event.target.value)}
                placeholder="One re-prime request per line"
                className={cn(fieldClassName, "min-h-[110px]")}
              />
            </div>
            <div className={cn(CONTROL_DECK_SECTION, "space-y-2")}>
              <div className={CONTROL_KICKER}>Assist response</div>
              <Textarea
                value={assistResponse}
                onChange={(event) => setAssistResponse(event.target.value)}
                placeholder="LLM output lands here for QA and note rewrite actions"
                className={cn(fieldClassName, "min-h-[90px] bg-black/25")}
              />
            </div>
            <div className={cn(CONTROL_DECK_SECTION, "space-y-2")}>
              <div className={CONTROL_KICKER}>Publish targets</div>
              <label className="flex items-center justify-between gap-3 font-mono text-sm leading-6 text-foreground/84">
                <span>Obsidian notes</span>
                <input
                  type="checkbox"
                  checked={publishToObsidian}
                  onChange={(event) =>
                    setPublishToObsidian(event.target.checked)
                  }
                />
              </label>
              <label className="flex items-center justify-between gap-3 font-mono text-sm leading-6 text-foreground/84">
                <span>Anki cards</span>
                <input
                  type="checkbox"
                  checked={publishToAnki}
                  onChange={(event) => setPublishToAnki(event.target.checked)}
                />
              </label>
              <label className="flex items-center justify-between gap-3 font-mono text-sm leading-6 text-foreground/84">
                <span>Brain index + telemetry</span>
                <input
                  type="checkbox"
                  checked={indexInBrain}
                  onChange={(event) => setIndexInBrain(event.target.checked)}
                />
              </label>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className={CONTROL_DECK}>
        <div className={CONTROL_DECK_INSET} />
        <div className={CONTROL_DECK_TOPLINE} />
        <div className={CONTROL_DECK_BOTTOMLINE} />
        <CardHeader className="relative z-10 pb-3">
          <div className="space-y-2">
            <CardTitle className="font-arcade text-sm text-primary">
              QUEUE DETAIL
            </CardTitle>
            <div className={CONTROL_COPY}>
              Inspect the currently selected queue before you finalize the
              handoff package.
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative z-10">
          <ScrollArea className="h-[220px]">
            <div className="space-y-3 pr-3">
              {selectedQueue === "tutor_replies" &&
                reviewablePromotedNotes.map((note) => (
                  <div key={note.id} className={CONTROL_DECK_SECTION}>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="font-mono text-sm leading-6 text-foreground">
                        {note.title || `Tutor reply ${note.id}`}
                      </div>
                      <Badge
                        variant="outline"
                        className="rounded-full px-2.5 py-1 font-terminal text-ui-2xs"
                      >
                        {note.badge}
                      </Badge>
                    </div>
                    <div className="font-mono text-sm leading-6 text-foreground/72">
                      {note.content}
                    </div>
                  </div>
                ))}
              {selectedQueue === "exact_notes" &&
                exactNotes.map((note) => (
                  <div key={note.id} className={CONTROL_DECK_SECTION}>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="font-mono text-sm leading-6 text-foreground">
                        {note.title || `Exact note ${note.id}`}
                      </div>
                      <Badge
                        variant={noteBadgeVariant(note.note_mode)}
                        className="rounded-full px-2.5 py-1 font-terminal text-ui-2xs"
                      >
                        {note.note_mode}
                      </Badge>
                    </div>
                    <div className="font-mono text-sm leading-6 text-foreground/72">
                      {note.content}
                    </div>
                  </div>
                ))}
              {selectedQueue === "editable_notes" &&
                editableNotes.map((note) => (
                  <div key={note.id} className={CONTROL_DECK_SECTION}>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="font-mono text-sm leading-6 text-foreground">
                        {note.title || `Editable note ${note.id}`}
                      </div>
                      <Badge
                        variant={noteBadgeVariant(note.note_mode)}
                        className="rounded-full px-2.5 py-1 font-terminal text-ui-2xs"
                      >
                        {note.status}
                      </Badge>
                    </div>
                    <div className="font-mono text-sm leading-6 text-foreground/72">
                      {note.content}
                    </div>
                  </div>
                ))}
              {selectedQueue === "memory_capsules" &&
                memoryCapsules.map((capsule) => (
                  <div key={capsule.id} className={CONTROL_DECK_SECTION}>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="font-mono text-sm leading-6 text-foreground">
                        Capsule v{capsule.capsule_version}
                      </div>
                      <Badge
                        variant="outline"
                        className="rounded-full px-2.5 py-1 font-terminal text-ui-2xs"
                      >
                        {capsule.study_unit || "session"}
                      </Badge>
                    </div>
                    <div className="font-mono text-sm leading-6 text-foreground/72">
                      {capsule.summary_text || "No summary text captured yet."}
                    </div>
                  </div>
                ))}
              {selectedQueue === "feedback" &&
                feedbackQueue.map((event) => (
                  <div key={event.id} className={CONTROL_DECK_SECTION}>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="font-mono text-sm leading-6 text-foreground">
                        {feedbackLabel(event)}
                      </div>
                      <Badge
                        variant="outline"
                        className="rounded-full px-2.5 py-1 font-terminal text-ui-2xs"
                      >
                        {event.source_type}
                      </Badge>
                    </div>
                    <div className="font-mono text-sm leading-6 text-foreground/72">
                      {event.message || "No freeform message captured."}
                    </div>
                  </div>
                ))}
              {selectedQueue === "studio_artifacts" &&
                toArtifactItems(studioArtifactText).map((item) => (
                  <div key={item.id} className={CONTROL_DECK_SECTION}>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="font-mono text-sm leading-6 text-foreground">
                        {item.title}
                      </div>
                      <Badge
                        variant="outline"
                        className="rounded-full px-2.5 py-1 font-terminal text-ui-2xs"
                      >
                        {item.type}
                      </Badge>
                    </div>
                    <div className="font-mono text-sm leading-6 text-foreground/72">
                      {item.content || item.text}
                    </div>
                  </div>
                ))}
              {selectedQueue === "card_requests" &&
                toLineItems(cardRequestText).map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      CONTROL_DECK_SECTION,
                      "font-mono text-sm leading-6 text-foreground/72",
                    )}
                  >
                    {item.text}
                  </div>
                ))}
              {selectedQueue === "reprime" &&
                toLineItems(reprimeText).map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      CONTROL_DECK_SECTION,
                      "font-mono text-sm leading-6 text-foreground/72",
                    )}
                  >
                    {item.text}
                  </div>
                ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <div
        className={cn(
          CONTROL_DECK_SECTION,
          "flex flex-wrap items-center justify-between gap-3",
        )}
      >
        <div className="flex flex-wrap items-center gap-2 font-mono text-sm leading-6 text-foreground/72">
          <Badge
            variant="outline"
            className="rounded-full border-primary/30 px-2.5 py-1 font-terminal text-ui-2xs"
          >
            Stage 4
          </Badge>
          <span>Queue hydrated from workflow detail</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            className={controlToggleButton(false, "secondary", true)}
            onClick={onBackToTutor}
          >
            Back to Tutor
          </Button>
          <Button
            variant="outline"
            className={controlToggleButton(false, "secondary", true)}
            onClick={() => onSaveDraft(buildPayload("draft"))}
            disabled={isSaving}
          >
            SAVE POLISH DRAFT
          </Button>
          <Button
            className={controlToggleButton(true, "primary", true)}
            onClick={() => onFinalize(buildPayload("finalized"))}
            disabled={isSaving}
          >
            <CheckCircle2 className="mr-1 h-4 w-4" />
            FINALIZE FOR SYNC
          </Button>
        </div>
      </div>
    </div>
  );
}
