import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookMarked, Brain, CheckCircle2, RefreshCw, Send, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import type {
  TutorMemoryCapsule,
  TutorPolishBundle,
  TutorPublishResult,
  TutorWorkflowDetailResponse,
} from "@/api.types";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";

type TutorWorkflowFinalSyncProps = {
  workflowDetail: TutorWorkflowDetailResponse | null;
  onBackToPolish: () => void;
};

type FinalSyncCardCandidate = {
  front: string;
  back: string;
  deck_name: string;
  tags: string;
  card_type: string;
};

type FinalSyncStudioArtifact = {
  id: string;
  type: string;
  title: string;
  content: string;
};

function sanitizeSegment(value: string) {
  return value.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim();
}

function buildDefaultVaultPath(detail: TutorWorkflowDetailResponse | null) {
  const workflow = detail?.workflow;
  const courseName = sanitizeSegment(workflow?.course_name || "General");
  const topic =
    sanitizeSegment(
      workflow?.assignment_title || workflow?.study_unit || workflow?.topic || "Tutor Workflow Summary",
    ) || "Tutor Workflow Summary";
  return `Courses/${courseName}/Tutor Workflow/${topic}.md`;
}

function extractCardCandidates(polishBundle: TutorPolishBundle | null): FinalSyncCardCandidate[] {
  const queue = polishBundle?.card_requests || [];
  const cards: FinalSyncCardCandidate[] = [];
  for (const item of queue) {
    if (typeof item === "object" && item && "front" in item && "back" in item) {
      const record = item as Record<string, unknown>;
      const front = String(record.front || "").trim();
      const back = String(record.back || "").trim();
      if (!front || !back) continue;
      cards.push({
        front,
        back,
        deck_name: String(record.deck_name || "Trey::Tutor Workflow").trim() || "Trey::Tutor Workflow",
        tags: String(record.tags || "tutor workflow").trim() || "tutor workflow",
        card_type: String(record.card_type || "basic").trim() || "basic",
      });
      continue;
    }

    const raw = typeof item === "string" ? item : JSON.stringify(item);
    const parts = raw.split("::").map((part) => part.trim());
    if (parts.length < 2) continue;
    cards.push({
      front: parts[0],
      back: parts.slice(1).join(" :: "),
      deck_name: "Trey::Tutor Workflow",
      tags: "tutor workflow",
      card_type: "basic",
    });
  }
  return cards;
}

function extractStudioArtifacts(polishBundle: TutorPolishBundle | null | undefined): FinalSyncStudioArtifact[] {
  const raw = (polishBundle?.studio_payload?.artifacts || []) as unknown[];
  return raw
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const type = String(record.type || "board").trim() || "board";
      const title = String(record.title || `Artifact ${index + 1}`).trim() || `Artifact ${index + 1}`;
      const content = String(record.content || record.text || "").trim();
      return {
        id: String(record.id || `artifact-${index}`),
        type,
        title,
        content,
      };
    })
    .filter((item): item is FinalSyncStudioArtifact => Boolean(item));
}

function textFromUnknown(value: unknown) {
  if (typeof value === "string") {
    return value.trim();
  }
  if (value == null) {
    return "";
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function buildMarkdown(detail: TutorWorkflowDetailResponse | null) {
  const workflow = detail?.workflow;
  const polishBundle = detail?.polish_bundle;
  const studioArtifacts = extractStudioArtifacts(polishBundle)
    .map((item) => `### ${item.title} (${item.type})\n\n${item.content || "No artifact notes provided."}`)
    .join("\n\n");
  const summaryBlock = (polishBundle?.summaries || [])
    .map((item) => {
      const record = item as Record<string, unknown>;
      const title = textFromUnknown(record.title) || "Summary";
      const content = textFromUnknown(record.content || item);
      return `## ${title}\n\n${content}`;
    })
    .filter(Boolean)
    .join("\n\n");
  const exactNotes = (polishBundle?.exact_notes || [])
    .map((item) => {
      const record = item as Record<string, unknown>;
      const title = textFromUnknown(record.title) || "Exact Note";
      const content = textFromUnknown(record.content || item);
      return `### ${title}\n\n${content}`;
    })
    .filter(Boolean)
    .join("\n\n");
  const editableNotes = (polishBundle?.editable_notes || [])
    .map((item) => {
      const record = item as Record<string, unknown>;
      const title = textFromUnknown(record.title) || "Editable Note";
      const content = textFromUnknown(record.content || item);
      return `### ${title}\n\n${content}`;
    })
    .filter(Boolean)
    .join("\n\n");

  const heading =
    workflow?.assignment_title || workflow?.study_unit || workflow?.topic || "Tutor Workflow Export";
  return [
    `# ${heading}`,
    `- Course: ${workflow?.course_name || "General"}`,
    `- Workflow ID: ${workflow?.workflow_id || "unknown"}`,
    `- Generated: ${new Date().toISOString()}`,
    "",
    summaryBlock || "## Summary\n\nNo polished summary available yet.",
    exactNotes ? `## Exact Notes\n\n${exactNotes}` : "",
    editableNotes ? `## Editable Notes\n\n${editableNotes}` : "",
    studioArtifacts ? `## Studio Artifacts\n\n${studioArtifacts}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function deriveLearnerSnapshot(detail: TutorWorkflowDetailResponse | null, cards: FinalSyncCardCandidate[]) {
  const stageLogs = detail?.stage_time_logs || [];
  const noteCount = detail?.captured_notes.length || 0;
  const memoryCount = detail?.memory_capsules.length || 0;
  const dislikedCount = (detail?.feedback_events || []).filter((event) => event.sentiment === "disliked").length;
  const tutorSeconds = stageLogs
    .filter((log) => log.stage === "tutor")
    .reduce((total, log) => total + (log.seconds_active || 0), 0);

  if (cards.length >= 5) {
    return {
      label: "retrieval-driven",
      confidence: 0.68,
      evidence: ["High flashcard volume", "Workflow produced multiple card candidates"],
    };
  }
  if (memoryCount >= 2 && noteCount >= 4) {
    return {
      label: "synthesis-driven",
      confidence: 0.62,
      evidence: ["Multiple memory capsules preserved", "High note capture volume"],
    };
  }
  if (dislikedCount >= 3 || tutorSeconds >= 3600) {
    return {
      label: "coaching-intensive",
      confidence: 0.57,
      evidence: ["High correction/feedback load", "Long tutor-session duration"],
    };
  }
  return {
    label: "balanced",
    confidence: 0.45,
    evidence: ["No dominant pattern yet"],
  };
}

function buildBrainIndexPayload(
  detail: TutorWorkflowDetailResponse | null,
  cards: FinalSyncCardCandidate[],
  studioArtifacts: FinalSyncStudioArtifact[],
  obsidianResults: Record<string, unknown>[],
  ankiResults: Record<string, unknown>[],
) {
  const workflow = detail?.workflow;
  const primingBundle = detail?.priming_bundle;
  const stageSeconds = Object.fromEntries(
    (detail?.stage_time_logs || []).map((log) => [log.stage, log.seconds_active || 0]),
  );
  return {
    workflow_id: workflow?.workflow_id || null,
    course_id: workflow?.course_id || null,
    course_name: workflow?.course_name || null,
    assignment_title: workflow?.assignment_title || null,
    study_unit: workflow?.study_unit || null,
    priming_method: primingBundle?.priming_method || null,
    priming_chain_id: primingBundle?.priming_chain_id || null,
    note_counts: {
      exact: (detail?.captured_notes || []).filter((note) => note.note_mode === "exact").length,
      editable: (detail?.captured_notes || []).filter((note) => note.note_mode === "editable").length,
    },
    feedback_counts: {
      liked: (detail?.feedback_events || []).filter((event) => event.sentiment === "liked").length,
      disliked: (detail?.feedback_events || []).filter((event) => event.sentiment === "disliked").length,
    },
    memory_capsule_count: detail?.memory_capsules.length || 0,
    card_candidate_count: cards.length,
    studio_artifact_count: studioArtifacts.length,
    studio_artifacts: studioArtifacts.map((item) => ({
      id: item.id,
      type: item.type,
      title: item.title,
    })),
    publish_targets: detail?.polish_bundle?.publish_targets || {},
    publish_results_snapshot: {
      obsidian: obsidianResults,
      anki: ankiResults,
    },
    stage_time_seconds: stageSeconds,
    learner_archetype_snapshot: deriveLearnerSnapshot(detail, cards),
    generated_at: new Date().toISOString(),
  };
}

function targetEnabled(polishBundle: TutorPolishBundle | null, key: string) {
  const targets = (polishBundle?.publish_targets || {}) as Record<string, unknown>;
  return targets[key] !== false;
}

export function TutorWorkflowFinalSync({
  workflowDetail,
  onBackToPolish,
}: TutorWorkflowFinalSyncProps) {
  const queryClient = useQueryClient();
  const workflow = workflowDetail?.workflow || null;
  const polishBundle = workflowDetail?.polish_bundle || null;
  const publishResults = workflowDetail?.publish_results || [];
  const [vaultPath, setVaultPath] = useState(() => buildDefaultVaultPath(workflowDetail));
  const [pathTouched, setPathTouched] = useState(false);
  const [markdownDraft, setMarkdownDraft] = useState(() => buildMarkdown(workflowDetail));
  const [isRunning, setIsRunning] = useState(false);

  const { data: obsidianStatus } = useQuery({
    queryKey: ["obsidian", "status"],
    queryFn: api.obsidian.getStatus,
  });
  const { data: ankiStatus } = useQuery({
    queryKey: ["anki", "status"],
    queryFn: api.anki.getStatus,
  });

  const cardCandidates = useMemo(() => extractCardCandidates(polishBundle), [polishBundle]);
  const studioArtifacts = useMemo(() => extractStudioArtifacts(polishBundle), [polishBundle]);
  const defaultVaultPath = useMemo(() => buildDefaultVaultPath(workflowDetail), [workflowDetail]);

  useEffect(() => {
    if (!pathTouched) {
      setVaultPath(defaultVaultPath);
    }
  }, [defaultVaultPath, pathTouched]);

  useEffect(() => {
    setMarkdownDraft(buildMarkdown(workflowDetail));
  }, [workflowDetail]);

  const runFinalSync = async () => {
    if (!workflow?.workflow_id || !polishBundle) {
      toast.error("Polish bundle is required before final sync.");
      return;
    }

    setIsRunning(true);
    const obsidianResults: Record<string, unknown>[] = [];
    const ankiResults: Record<string, unknown>[] = [];
    try {
      if (targetEnabled(polishBundle, "obsidian")) {
        try {
          const saveResult = await api.obsidian.saveFile(vaultPath, markdownDraft);
          obsidianResults.push({
            target: "obsidian",
            path: saveResult.path || vaultPath,
            success: Boolean(saveResult.success),
            error: saveResult.error || null,
          });
        } catch (err) {
          obsidianResults.push({
            target: "obsidian",
            path: vaultPath,
            success: false,
            error: err instanceof Error ? err.message : "Unknown Obsidian publish error",
          });
        }
      }

      if (targetEnabled(polishBundle, "anki")) {
        if (cardCandidates.length === 0) {
          ankiResults.push({
            target: "anki",
            success: false,
            error: "No valid card candidates available for Anki sync.",
          });
        } else {
          try {
            const draftResult = await api.tutor.createWorkflowCardDrafts(workflow.workflow_id, {
              cards: cardCandidates.map((card) => ({
                front: card.front,
                back: card.back,
                deck_name: card.deck_name,
                tags: card.tags,
                card_type: card.card_type,
                status: "approved",
              })),
            });
            let syncSuccess = false;
            let syncOutput = "";
            let syncError: string | null = null;
            try {
              const syncResult = await api.anki.sync();
              syncSuccess = true;
              syncOutput = syncResult.output || "";
            } catch (err) {
              syncError = err instanceof Error ? err.message : "Unknown Anki sync error";
            }
            ankiResults.push({
              target: "anki",
              success: syncSuccess,
              drafts_created: draftResult.drafts.length,
              draft_errors: draftResult.errors || [],
              sync_output: syncOutput,
              error: syncError,
            });
          } catch (err) {
            ankiResults.push({
              target: "anki",
              success: false,
              error: err instanceof Error ? err.message : "Unknown Anki publish error",
            });
          }
        }
      }

      const brainIndexPayload = buildBrainIndexPayload(
        workflowDetail,
        cardCandidates,
        studioArtifacts,
        obsidianResults,
        ankiResults,
      );
      const enabledTargetFailures = [...obsidianResults, ...ankiResults].some(
        (result) => result.success === false,
      );
      const finalStatus = enabledTargetFailures ? "partial_failure" : "stored";

      await api.tutor.createPublishResult(workflow.workflow_id, {
        polish_bundle_id: polishBundle.id,
        obsidian_results: obsidianResults,
        anki_results: ankiResults,
        brain_index_payload: brainIndexPayload,
        status: finalStatus,
      });

      await api.tutor.updateWorkflowStage(workflow.workflow_id, {
        current_stage: "final_sync",
        status: enabledTargetFailures ? "polish_complete" : "stored",
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tutor-workflows"] }),
        queryClient.invalidateQueries({ queryKey: ["tutor-workflow-detail", workflow.workflow_id] }),
        queryClient.invalidateQueries({ queryKey: ["anki"] }),
        queryClient.invalidateQueries({ queryKey: ["obsidian"] }),
      ]);

      toast.success(
        enabledTargetFailures
          ? "Final sync finished with retryable publish failures."
          : "Final sync completed and workflow stored.",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Final sync failed");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-arcade text-sm text-primary">FINAL SYNC</div>
          <div className="font-terminal text-xs text-muted-foreground">
            Publish approved Polish outputs, persist publish results, and close the workflow safely.
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            className="rounded-none font-arcade text-[10px]"
            onClick={onBackToPolish}
          >
            BACK TO POLISH
          </Button>
          <Button
            variant="outline"
            className="rounded-none font-arcade text-[10px]"
            onClick={() => {
              setMarkdownDraft(buildMarkdown(workflowDetail));
              setVaultPath(buildDefaultVaultPath(workflowDetail));
              setPathTouched(false);
            }}
          >
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            RESET PREVIEW
          </Button>
          <Button
            className="rounded-none font-arcade text-[10px]"
            onClick={() => {
              void runFinalSync();
            }}
            disabled={isRunning || !workflow || !polishBundle}
          >
            <Send className="mr-2 h-3.5 w-3.5" />
            {isRunning ? "RUNNING..." : "RUN FINAL SYNC"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <Card className="rounded-none border-primary/30 bg-black/40">
            <CardHeader className="pb-2">
              <CardTitle className="font-arcade text-xs text-primary">TARGET HEALTH</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-[10px] font-terminal">
              <Badge variant="outline" className="w-full justify-center rounded-none">
                Obsidian: {obsidianStatus?.connected ? "ready" : "offline"}
              </Badge>
              <Badge variant="outline" className="w-full justify-center rounded-none">
                Anki: {ankiStatus?.connected ? "ready" : "offline"}
              </Badge>
              <Badge variant="outline" className="w-full justify-center rounded-none">
                Brain index: always on
              </Badge>
              <div className="border border-primary/20 bg-black/30 p-2">
                <div className="font-arcade text-[10px] text-primary">Enabled targets</div>
                <div className="mt-2 space-y-1 text-muted-foreground">
                  <div>Obsidian: {targetEnabled(polishBundle, "obsidian") ? "enabled" : "disabled"}</div>
                  <div>Anki: {targetEnabled(polishBundle, "anki") ? "enabled" : "disabled"}</div>
                  <div>Brain index: recorded</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-none border-primary/30 bg-black/40">
            <CardHeader className="pb-2">
              <CardTitle className="font-arcade text-xs text-primary">CARD CANDIDATES</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[320px] pr-2">
                <div className="space-y-2">
                  {cardCandidates.length === 0 ? (
                    <div className="border border-primary/20 bg-black/30 p-2 text-[10px] font-terminal text-muted-foreground">
                      No structured card candidates yet. Use Polish Assist to draft `front :: back` cards.
                    </div>
                  ) : (
                    cardCandidates.map((card, index) => (
                      <div key={`${card.front}-${index}`} className="border border-primary/20 bg-black/30 p-2 text-[10px] font-terminal">
                        <div className="font-bold text-primary">{card.front}</div>
                        <div className="mt-1 text-muted-foreground">{card.back}</div>
                        <div className="mt-2 text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                          {card.deck_name} / {card.card_type}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
          <Card className="rounded-none border-primary/30 bg-black/40">
            <CardHeader className="pb-2">
              <CardTitle className="font-arcade text-xs text-primary">STUDIO ARTIFACTS</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[220px] pr-2">
                <div className="space-y-2">
                  {studioArtifacts.length === 0 ? (
                    <div className="border border-primary/20 bg-black/30 p-2 text-[10px] font-terminal text-muted-foreground">
                      No richer Studio artifacts are staged yet.
                    </div>
                  ) : (
                    studioArtifacts.map((item) => (
                      <div
                        key={item.id}
                        className="border border-primary/20 bg-black/30 p-2 text-[10px] font-terminal"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-bold text-primary">{item.title}</div>
                          <Badge variant="outline" className="rounded-none text-[9px] uppercase">
                            {item.type}
                          </Badge>
                        </div>
                        <div className="mt-1 text-muted-foreground">
                          {item.content || "No artifact notes provided."}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="rounded-none border-primary/30 bg-black/40">
            <CardHeader className="pb-2">
              <CardTitle className="font-arcade text-xs text-primary">OBSIDIAN EXPORT</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                value={vaultPath}
                onChange={(event) => {
                  setPathTouched(true);
                  setVaultPath(event.target.value);
                }}
                className="rounded-none border-primary/20 bg-black/40"
                placeholder="Vault path"
              />
              <Textarea
                value={markdownDraft}
                onChange={(event) => setMarkdownDraft(event.target.value)}
                className="min-h-[420px] rounded-none border-primary/20 bg-black/40"
                placeholder="Final Obsidian markdown preview"
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="rounded-none border-primary/30 bg-black/40">
            <CardHeader className="pb-2">
              <CardTitle className="font-arcade text-xs text-primary">PUBLISH HISTORY</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[260px] pr-2">
                <div className="space-y-2">
                  {publishResults.length === 0 ? (
                    <div className="border border-primary/20 bg-black/30 p-2 text-[10px] font-terminal text-muted-foreground">
                      No publish attempts recorded yet.
                    </div>
                  ) : (
                    publishResults.map((result: TutorPublishResult) => (
                      <div key={result.id} className="border border-primary/20 bg-black/30 p-2 text-[10px] font-terminal">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-primary">Attempt #{result.id}</span>
                          <Badge variant="outline" className="rounded-none">{result.status}</Badge>
                        </div>
                        <div className="mt-1 text-muted-foreground">{result.created_at}</div>
                        <div className="mt-2 text-muted-foreground">
                          Obsidian results: {result.obsidian_results.length} / Anki results: {result.anki_results.length}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="rounded-none border-primary/30 bg-black/40">
            <CardHeader className="pb-2">
              <CardTitle className="font-arcade text-xs text-primary">CLOSEOUT SIGNALS</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-[10px] font-terminal">
              <div className="flex items-center gap-2">
                <Brain className="h-3.5 w-3.5 text-primary" />
                Learner snapshot will be stored in the Brain payload.
              </div>
              <div className="flex items-center gap-2">
                <BookMarked className="h-3.5 w-3.5 text-primary" />
                Priming method + chain usage will be carried into the Brain payload.
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                Workflow transitions to `stored` only when enabled targets succeed.
              </div>
              <div className="flex items-center gap-2">
                <TriangleAlert className="h-3.5 w-3.5 text-primary" />
                Partial failure remains in `final_sync` and can be retried.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
