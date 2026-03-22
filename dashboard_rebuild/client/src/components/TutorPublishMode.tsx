import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpenCheck,
  FileUp,
  Loader2,
  NotebookPen,
  RefreshCw,
} from "lucide-react";

import { AnkiIntegration } from "@/components/AnkiIntegration";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useToast } from "@/use-toast";

interface TutorPublishModeProps {
  activeSessionId?: string | null;
  courseName?: string | null;
  topic?: string | null;
  noteMarkdown?: string | null;
  defaultVaultPath?: string | null;
  className?: string;
  onPublished?: (result: { path: string; sessionId: string | null }) => void;
}

function sanitizeSegment(value: string): string {
  return value
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildDefaultPublishPath(
  courseName?: string | null,
  topic?: string | null,
  defaultVaultPath?: string | null,
): string {
  if (defaultVaultPath) return defaultVaultPath;
  const safeTopic =
    sanitizeSegment(topic || "Tutor Session") || "Tutor Session";
  const safeCourse = sanitizeSegment(courseName || "General");
  return `Courses/${safeCourse}/Tutor Exports/${safeTopic}.md`;
}

function buildSessionMarkdown(session: {
  topic: string;
  started_at?: string | null;
  turn_count?: number | null;
  turns?: { turn_number: number; question: string; answer: string | null }[];
}): string {
  const lines: string[] = [
    `# Tutor: ${session.topic || "Session"}`,
    `**Date:** ${session.started_at ? new Date(session.started_at).toLocaleDateString() : new Date().toLocaleDateString()}`,
    `**Turns:** ${session.turn_count ?? session.turns?.length ?? 0}`,
    "",
    "---",
    "",
  ];

  for (const turn of session.turns || []) {
    lines.push(`## Q${turn.turn_number}`);
    lines.push(turn.question);
    lines.push("");
    if (turn.answer) {
      lines.push("**Answer:**");
      lines.push(turn.answer);
      lines.push("");
    }
  }

  return lines.join("\n");
}

export function TutorPublishMode({
  activeSessionId = null,
  courseName = null,
  topic = null,
  noteMarkdown = null,
  defaultVaultPath = null,
  className,
  onPublished,
}: TutorPublishModeProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [publishPath, setPublishPath] = useState(() =>
    buildDefaultPublishPath(courseName, topic, defaultVaultPath),
  );
  const [draftMarkdown, setDraftMarkdown] = useState(noteMarkdown || "");
  const [pathTouched, setPathTouched] = useState(false);
  const [draftTouched, setDraftTouched] = useState(Boolean(noteMarkdown));

  const suggestedPath = useMemo(
    () => buildDefaultPublishPath(courseName, topic, defaultVaultPath),
    [courseName, topic, defaultVaultPath],
  );

  useEffect(() => {
    if (!pathTouched) {
      setPublishPath(suggestedPath);
    }
  }, [pathTouched, suggestedPath]);

  useEffect(() => {
    if (!draftTouched && noteMarkdown) {
      setDraftMarkdown(noteMarkdown);
    }
  }, [draftTouched, noteMarkdown]);

  const { data: obsidianStatus } = useQuery({
    queryKey: ["obsidian", "status"],
    queryFn: api.obsidian.getStatus,
    refetchInterval: 30000,
  });

  const { data: obsidianConfig } = useQuery({
    queryKey: ["obsidian", "config"],
    queryFn: api.obsidian.getConfig,
  });

  const { data: drafts = [] } = useQuery({
    queryKey: ["anki", "drafts"],
    queryFn: api.anki.getDrafts,
  });

  const pendingDraftCount = drafts.filter(
    (draft) => draft.status === "pending",
  ).length;

  const loadSessionMutation = useMutation({
    mutationFn: (sessionId: string) => api.tutor.getSession(sessionId),
    onSuccess: (session) => {
      setDraftMarkdown(buildSessionMarkdown(session));
      setDraftTouched(true);
      if (!pathTouched) {
        setPublishPath(
          buildDefaultPublishPath(
            courseName,
            session.topic || topic,
            defaultVaultPath,
          ),
        );
      }
      toast({
        title: "Session loaded",
        description: "Current Tutor session staged for publishing.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Session load failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const publishMutation = useMutation({
    mutationFn: ({ path, markdown }: { path: string; markdown: string }) =>
      api.obsidian.append(path, markdown),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["obsidian"] });
      toast({
        title: "Published to Obsidian",
        description: variables.path,
      });
      onPublished?.({ path: variables.path, sessionId: activeSessionId });
    },
    onError: (error: Error) => {
      toast({
        title: "Publish failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const fieldClassName =
    "rounded-[1rem] border border-[rgba(255,122,146,0.18)] bg-black/40 font-mono text-base leading-6 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] placeholder:text-foreground/32 focus-visible:border-primary/45 focus-visible:ring-primary/45";

  return (
    <div
      className={cn("grid gap-4 xl:grid-cols-[1.15fr_1fr]", className)}
      data-testid="tutor-publish-mode"
    >
      <div className="space-y-4">
        <Card className={CONTROL_DECK}>
          <div className={CONTROL_DECK_INSET} />
          <div className={CONTROL_DECK_TOPLINE} />
          <div className={CONTROL_DECK_BOTTOMLINE} />
          <CardHeader className="relative z-10 border-b border-primary/15 pb-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <CardTitle className="flex items-center gap-2 font-arcade text-sm text-primary">
                  <NotebookPen className="h-4 w-4" />
                  PUBLISH MODE
                </CardTitle>
                <div className="max-w-2xl font-mono text-sm leading-6 text-foreground/72">
                  Stage a session summary or workspace note for the vault, then
                  clear pending Anki drafts.
                </div>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "rounded-full px-3 py-1 font-terminal text-ui-2xs",
                  obsidianStatus?.connected
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                    : "border-red-500/40 bg-red-500/10 text-red-300",
                )}
              >
                {obsidianStatus?.connected
                  ? "Obsidian ready"
                  : "Obsidian offline"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="relative z-10 space-y-4 p-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className={CONTROL_DECK_SECTION}>
                <div className={CONTROL_KICKER}>Active session</div>
                <div className="mt-2 break-all font-mono text-sm leading-6 text-foreground">
                  {activeSessionId || "No active session"}
                </div>
              </div>
              <div className={CONTROL_DECK_SECTION}>
                <div className={CONTROL_KICKER}>Pending Anki drafts</div>
                <div className="mt-2 font-mono text-lg leading-7 text-foreground">
                  {pendingDraftCount}
                </div>
              </div>
              <div className={CONTROL_DECK_SECTION}>
                <div className={CONTROL_KICKER}>Vault</div>
                <div className="mt-2 font-mono text-sm leading-6 text-foreground">
                  {obsidianConfig?.vaultName || "Treys School"}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className={controlToggleButton(false, "secondary", true)}
                onClick={() =>
                  activeSessionId && loadSessionMutation.mutate(activeSessionId)
                }
                disabled={!activeSessionId || loadSessionMutation.isPending}
              >
                {loadSessionMutation.isPending ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <BookOpenCheck className="mr-2 h-3.5 w-3.5" />
                )}
                Load Current Session
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className={controlToggleButton(false, "secondary", true)}
                onClick={() => {
                  setDraftMarkdown(noteMarkdown || "");
                  setDraftTouched(Boolean(noteMarkdown));
                  setPublishPath(suggestedPath);
                  setPathTouched(false);
                }}
              >
                <RefreshCw className="mr-2 h-3.5 w-3.5" />
                Reset Draft
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tutor-publish-path" className={CONTROL_KICKER}>
                Vault Path
              </Label>
              <Input
                id="tutor-publish-path"
                value={publishPath}
                onChange={(event) => {
                  setPublishPath(event.target.value);
                  setPathTouched(true);
                }}
                className={fieldClassName}
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="tutor-publish-markdown"
                className={CONTROL_KICKER}
              >
                Markdown Draft
              </Label>
              <Textarea
                id="tutor-publish-markdown"
                value={draftMarkdown}
                onChange={(event) => {
                  setDraftMarkdown(event.target.value);
                  setDraftTouched(true);
                }}
                placeholder="Stage the note or load the active session transcript before publishing."
                className={cn(fieldClassName, "min-h-[280px]")}
              />
            </div>

            <Button
              type="button"
              className={controlToggleButton(true, "primary")}
              onClick={() =>
                publishMutation.mutate({
                  path: publishPath.trim(),
                  markdown: draftMarkdown.trim(),
                })
              }
              disabled={
                !obsidianStatus?.connected ||
                publishMutation.isPending ||
                publishPath.trim().length === 0 ||
                draftMarkdown.trim().length === 0
              }
            >
              {publishMutation.isPending ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileUp className="mr-2 h-3.5 w-3.5" />
              )}
              Publish to Obsidian
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className={CONTROL_DECK}>
        <div className={CONTROL_DECK_INSET} />
        <div className={CONTROL_DECK_TOPLINE} />
        <div className={CONTROL_DECK_BOTTOMLINE} />
        <CardHeader className="relative z-10 border-b border-primary/15 pb-4">
          <div className="space-y-2">
            <CardTitle className="font-arcade text-sm text-primary">
              ANKI HANDOFF
            </CardTitle>
            <div className={CONTROL_COPY}>
              Review the pending card queue before you push the final study
              output downstream.
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative z-10 p-4">
          <AnkiIntegration totalCards={pendingDraftCount} />
        </CardContent>
      </Card>
    </div>
  );
}
