import type { ChangeEvent, ComponentType, ReactNode } from "react";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { AlertTriangle, Database, FileUp, NotebookPen, Sparkles, Workflow } from "lucide-react";

import { api } from "@/lib/api";
import type { BrainOrganizePreviewResponse, BrainWorkspace, Session } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

function safeDateLabel(raw: string) {
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? raw : format(parsed, "MMM d, yyyy");
}

function stringifyEntry(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return String(record.text || record.label || record.description || record.issue || record.issue_type || "");
  }
  return "";
}

function toList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(stringifyEntry).filter(Boolean);
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(stringifyEntry).filter(Boolean);
  } catch {
    // fall through to delimiter split for legacy free-text fields
  }
  return value
    .split(/\r?\n|;|,/)
    .map((item) => item.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);
}

function previewList(value: unknown, empty = "None logged") {
  const items = toList(value);
  if (!items.length) return empty;
  const preview = items.slice(0, 2).join(" • ");
  return items.length > 2 ? `${preview} +${items.length - 2}` : preview;
}

function buildLowYieldSessions(sessions: Session[]) {
  return sessions.filter((session) => {
    const friction =
      toList(session.confusions).length +
      toList(session.weakAnchors).length +
      toList(session.issues).length;
    return session.minutes >= 45 && session.cards === 0 && friction > 0;
  });
}

function SectionCard(props: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  testId: string;
  children: ReactNode;
  className?: string;
}) {
  const { icon: Icon, title, description, testId, children, className } = props;
  return (
    <Card data-testid={testId} className={cn("rounded-none border-primary/30 bg-black/45", className)}>
      <CardHeader className="border-b border-primary/20">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center border border-primary/20 bg-black/35">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <div className="space-y-1">
            <CardTitle className="font-arcade text-sm text-primary">{title}</CardTitle>
            <CardDescription className="font-terminal text-xs text-muted-foreground">
              {description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">{children}</CardContent>
    </Card>
  );
}

export function ContractBrainHome({ workspace }: { workspace: BrainWorkspace }) {
  const [courseHint, setCourseHint] = useState("");
  const [rawNotes, setRawNotes] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ["brain", "sessions", "evidence"],
    queryFn: () => api.sessions.getAll(),
    staleTime: 60_000,
  });
  const { data: ankiDue, isError: ankiDueUnavailable } = useQuery({
    queryKey: ["brain", "anki-due"],
    queryFn: () => api.anki.getDue(),
    staleTime: 60_000,
    retry: false,
  });
  const organizeMutation = useMutation({
    mutationFn: (payload: { rawNotes: string; course?: string }) =>
      api.brain.organizePreview(payload.rawNotes, payload.course),
  });

  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [sessions],
  );
  const metrics = workspace.metrics;
  const lowYieldSessions = useMemo(() => buildLowYieldSessions(sortedSessions).slice(0, 5), [sortedSessions]);
  const totalIssuePatterns = (metrics?.issuesLog || []).reduce((sum, item) => sum + (item.count || 0), 0);

  async function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadedFileName(file.name);
    setRawNotes(await file.text());
  }

  return (
    <div data-testid="brain-home" className="h-full overflow-y-auto px-4 py-4 md:px-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <Card className="rounded-none border-primary/30 bg-black/45">
          <CardHeader className="border-b border-primary/20">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="space-y-3">
                <div className="font-arcade text-xs text-primary/80">BRAIN EVIDENCE LEDGER</div>
                <CardTitle className="max-w-4xl font-arcade text-lg text-white">
                  Raw WRAP evidence, transparent metrics, failure patterns, and annotation support.
                </CardTitle>
                <CardDescription className="max-w-4xl font-terminal text-sm text-muted-foreground">
                  Brain is read-only here. No launch controls, no planning controls, no Scholar recommendations, and
                  no live-study actions.
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="rounded-none border-primary/35 text-[10px] text-primary">READ ONLY</Badge>
                <Badge variant="outline" className="rounded-none border-primary/35 text-[10px] text-primary">WRAP TRACEABLE</Badge>
                <Badge variant="outline" className="rounded-none border-primary/35 text-[10px] text-primary">ANNOTATION ONLY</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="border border-primary/15 bg-black/30 p-3"><div className="font-arcade text-[11px] text-primary/80">SESSIONS LOGGED</div><div className="mt-2 font-arcade text-lg text-white">{sortedSessions.length}</div><div className="mt-1 font-terminal text-[11px] text-muted-foreground">{sortedSessions[0] ? `Latest ${safeDateLabel(sortedSessions[0].date)}` : "No sessions recorded yet"}</div></div>
            <div className="border border-primary/15 bg-black/30 p-3"><div className="font-arcade text-[11px] text-primary/80">MINUTES CAPTURED</div><div className="mt-2 font-arcade text-lg text-white">{metrics?.totalMinutes || 0}</div><div className="mt-1 font-terminal text-[11px] text-muted-foreground">Derived from WRAP duration/minute fields</div></div>
            <div className="border border-primary/15 bg-black/30 p-3"><div className="font-arcade text-[11px] text-primary/80">CARDS DRAFTED</div><div className="mt-2 font-arcade text-lg text-white">{metrics?.totalCards || 0}</div><div className="mt-1 font-terminal text-[11px] text-muted-foreground">Captured at session closeout only</div></div>
            <div className="border border-primary/15 bg-black/30 p-3"><div className="font-arcade text-[11px] text-primary/80">ISSUE PATTERNS</div><div className="mt-2 font-arcade text-lg text-white">{totalIssuePatterns}</div><div className="mt-1 font-terminal text-[11px] text-muted-foreground">Workflow, source-lock, and interruption signals</div></div>
          </CardContent>
        </Card>

        <SectionCard icon={Database} title="SESSION EVIDENCE" description="One row per stored study session. Raw WRAP fields only." testId="brain-session-evidence">
          {sessionsLoading ? (
            <div className="border border-primary/15 bg-black/30 p-4 font-terminal text-sm text-muted-foreground">Loading session evidence...</div>
          ) : sortedSessions.length ? (
            <div className="overflow-x-auto border border-primary/15 bg-black/30">
              <table className="min-w-full border-collapse font-terminal text-xs">
                <thead className="bg-black/55 text-[11px] uppercase tracking-[0.18em] text-primary/80">
                  <tr>
                    <th className="border-b border-primary/15 px-3 py-2 text-left">Date</th><th className="border-b border-primary/15 px-3 py-2 text-left">Course</th><th className="border-b border-primary/15 px-3 py-2 text-left">Logged mode</th><th className="border-b border-primary/15 px-3 py-2 text-left">Minutes</th><th className="border-b border-primary/15 px-3 py-2 text-left">Confusions</th><th className="border-b border-primary/15 px-3 py-2 text-left">Weak anchors</th><th className="border-b border-primary/15 px-3 py-2 text-left">Concepts</th><th className="border-b border-primary/15 px-3 py-2 text-left">Cards</th><th className="border-b border-primary/15 px-3 py-2 text-left">Issues</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSessions.map((session) => (
                    <tr key={session.id} className="align-top text-white odd:bg-black/10">
                      <td className="border-b border-primary/10 px-3 py-2 whitespace-nowrap">{safeDateLabel(session.date)}</td>
                      <td className="border-b border-primary/10 px-3 py-2">{session.topic}</td>
                      <td className="border-b border-primary/10 px-3 py-2 text-muted-foreground">{session.mode || "Unknown"}</td>
                      <td className="border-b border-primary/10 px-3 py-2 whitespace-nowrap">{session.minutes || 0}</td>
                      <td className="border-b border-primary/10 px-3 py-2 text-muted-foreground">{previewList(session.confusions)}</td>
                      <td className="border-b border-primary/10 px-3 py-2 text-muted-foreground">{previewList(session.weakAnchors)}</td>
                      <td className="border-b border-primary/10 px-3 py-2 text-muted-foreground">{previewList(session.concepts)}</td>
                      <td className="border-b border-primary/10 px-3 py-2 whitespace-nowrap">{session.cards || 0}</td>
                      <td className="border-b border-primary/10 px-3 py-2 text-muted-foreground">{previewList(session.issues)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="border border-primary/15 bg-black/30 p-4 font-terminal text-sm text-muted-foreground">No stored sessions yet. Brain will populate once WRAP outputs are logged.</div>
          )}
        </SectionCard>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <SectionCard icon={Workflow} title="DERIVED METRICS" description="Rollups derived from the same WRAP fields shown above." testId="brain-derived-metrics">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="border border-primary/15 bg-black/30 p-3" data-testid="brain-course-rollup"><div className="font-arcade text-[11px] text-primary">SESSIONS / COURSE</div><div className="mt-3 space-y-2">{(metrics?.sessionsPerCourse || []).length ? metrics?.sessionsPerCourse.map((item) => <div key={item.course} className="border border-primary/10 bg-black/35 px-3 py-2"><div className="flex items-center justify-between gap-3"><div className="font-terminal text-xs text-white">{item.course}</div><Badge variant="outline" className="rounded-none border-primary/25 text-[10px] text-primary">{item.count}</Badge></div><div className="mt-1 font-terminal text-[11px] text-muted-foreground">{item.minutes} minute(s) logged</div></div>) : <div className="font-terminal text-xs text-muted-foreground">No course rollup yet.</div>}</div></div>
              <div className="border border-primary/15 bg-black/30 p-3" data-testid="brain-mode-rollup"><div className="font-arcade text-[11px] text-primary">LOGGED MODE VALUES</div><div className="mt-1 font-terminal text-[11px] text-muted-foreground">Frequency of the raw <code>session.mode</code> field as stored today.</div><div className="mt-3 space-y-2">{(metrics?.modeDistribution || []).length ? metrics?.modeDistribution.map((item) => <div key={item.mode} className="border border-primary/10 bg-black/35 px-3 py-2"><div className="flex items-center justify-between gap-3"><div className="font-terminal text-xs text-white">{item.mode}</div><Badge variant="outline" className="rounded-none border-primary/25 text-[10px] text-primary">{item.count}</Badge></div><div className="mt-1 font-terminal text-[11px] text-muted-foreground">{item.minutes} minute(s) logged</div></div>) : <div className="font-terminal text-xs text-muted-foreground">No logged mode values yet.</div>}</div></div>
              <div className="border border-primary/15 bg-black/30 p-3" data-testid="brain-concept-rollup"><div className="font-arcade text-[11px] text-primary">CONCEPT REVISITS</div><div className="mt-3 space-y-2">{(metrics?.conceptFrequency || []).length ? metrics?.conceptFrequency.map((item) => <div key={item.concept} className="flex items-center justify-between gap-3 border border-primary/10 bg-black/35 px-3 py-2"><div className="font-terminal text-xs text-white">{item.concept}</div><Badge variant="outline" className="rounded-none border-primary/25 text-[10px] text-primary">{item.count}</Badge></div>) : <div className="font-terminal text-xs text-muted-foreground">No concept revisit data yet.</div>}</div></div>
              <div className="border border-primary/15 bg-black/30 p-3" data-testid="brain-low-yield"><div className="font-arcade text-[11px] text-primary">HIGH-EFFORT / LOW-YIELD</div><div className="mt-3 space-y-2">{lowYieldSessions.length ? lowYieldSessions.map((session) => <div key={session.id} className="border border-primary/10 bg-black/35 px-3 py-2"><div className="font-terminal text-xs text-white">{session.topic} • {safeDateLabel(session.date)}</div><div className="mt-1 font-terminal text-[11px] text-muted-foreground">{session.minutes} minute(s) • {previewList(session.issues, "No issue text")}</div></div>) : <div className="font-terminal text-xs text-muted-foreground">No low-yield sessions detected from current WRAP evidence.</div>}</div></div>
            </div>
          </SectionCard>

          <SectionCard icon={AlertTriangle} title="ISSUES & FAILURES LOG" description="Repeated confusions, weak anchors, and system failures grouped by frequency." testId="brain-issues-log">
            <div className="grid gap-3">
              <div className="border border-primary/15 bg-black/30 p-3" data-testid="brain-confusions"><div className="font-arcade text-[11px] text-primary">REPEATED CONFUSIONS</div><div className="mt-3 space-y-2">{(metrics?.recentConfusions || []).length ? metrics?.recentConfusions.map((item) => <div key={`${item.course}-${item.text}`} className="border border-primary/10 bg-black/35 px-3 py-2"><div className="flex items-center justify-between gap-3"><div className="font-terminal text-xs text-white">{item.text}</div><Badge variant="outline" className="rounded-none border-primary/25 text-[10px] text-primary">{item.count}</Badge></div><div className="mt-1 font-terminal text-[11px] text-muted-foreground">{item.course}</div></div>) : <div className="font-terminal text-xs text-muted-foreground">No repeated confusions captured.</div>}</div></div>
              <div className="border border-primary/15 bg-black/30 p-3" data-testid="brain-weak-anchors"><div className="font-arcade text-[11px] text-primary">WEAK ANCHORS</div><div className="mt-3 space-y-2">{(metrics?.recentWeakAnchors || []).length ? metrics?.recentWeakAnchors.map((item) => <div key={`${item.course}-${item.text}`} className="border border-primary/10 bg-black/35 px-3 py-2"><div className="flex items-center justify-between gap-3"><div className="font-terminal text-xs text-white">{item.text}</div><Badge variant="outline" className="rounded-none border-primary/25 text-[10px] text-primary">{item.count}</Badge></div><div className="mt-1 font-terminal text-[11px] text-muted-foreground">{item.course}</div></div>) : <div className="font-terminal text-xs text-muted-foreground">No repeated weak anchors captured.</div>}</div></div>
              <div className="border border-primary/15 bg-black/30 p-3" data-testid="brain-issue-patterns"><div className="font-arcade text-[11px] text-primary">WORKFLOW / SYSTEM ISSUES</div><div className="mt-3 space-y-2">{(metrics?.issuesLog || []).length ? metrics?.issuesLog.map((item) => <div key={`${item.course}-${item.issue}`} className="border border-primary/10 bg-black/35 px-3 py-2"><div className="flex items-center justify-between gap-3"><div className="font-terminal text-xs text-white">{item.issue}</div><Badge variant="outline" className="rounded-none border-primary/25 text-[10px] text-primary">{item.count}</Badge></div><div className="mt-1 font-terminal text-[11px] text-muted-foreground">{item.course}</div></div>) : <div className="font-terminal text-xs text-muted-foreground">No issue patterns captured.</div>}</div></div>
            </div>
          </SectionCard>
        </div>

        <SectionCard icon={NotebookPen} title="EXTERNAL INTEGRATIONS" description="Display-only connection and evidence surfaces. No editing from Brain." testId="brain-integrations">
          <div className="grid gap-3 xl:grid-cols-2">
            <div className="border border-primary/15 bg-black/30 p-3" data-testid="brain-integration-obsidian"><div className="flex items-center justify-between gap-3"><div className="font-arcade text-[11px] text-primary">OBSIDIAN</div><Badge variant="outline" className={cn("rounded-none text-[10px]", workspace.obsidianStatus?.connected ? "border-emerald-500/40 text-emerald-300" : "border-amber-500/40 text-amber-200")}>{workspace.obsidianStatus?.connected ? "CONNECTED" : "OFFLINE"}</Badge></div><div className="mt-3 grid gap-2 font-terminal text-xs text-muted-foreground"><div className="border border-primary/10 px-3 py-2">Notes created per session: not yet modeled in Brain API</div><div className="border border-primary/10 px-3 py-2">Notes edited: not yet modeled in Brain API</div><div className="border border-primary/10 px-3 py-2">Concept links / orphan notes: stub until session-note linkage is exposed</div></div></div>
            <div className="border border-primary/15 bg-black/30 p-3" data-testid="brain-integration-anki"><div className="flex items-center justify-between gap-3"><div className="font-arcade text-[11px] text-primary">ANKI</div><Badge variant="outline" className={cn("rounded-none text-[10px]", workspace.ankiStatus?.connected ? "border-emerald-500/40 text-emerald-300" : "border-amber-500/40 text-amber-200")}>{workspace.ankiStatus?.connected ? "CONNECTED" : "OFFLINE"}</Badge></div><div className="mt-3 grid gap-2 font-terminal text-xs text-muted-foreground"><div className="border border-primary/10 px-3 py-2">Cards created from WRAP sessions: {metrics?.totalCards || 0}</div><div className="border border-primary/10 px-3 py-2">Pending drafts waiting on review: {workspace.pendingDrafts.length}</div><div className="border border-primary/10 px-3 py-2">Review load: {ankiDueUnavailable ? "unavailable" : `${ankiDue?.dueCount || 0} due card(s)`}</div><div className="border border-primary/10 px-3 py-2">Lapses: not yet modeled in Brain API</div></div></div>
          </div>
        </SectionCard>

        <SectionCard icon={Sparkles} title="LLM ANNOTATION WINDOW" description="Paste WRAP notes or upload a session file for organization, tags, and summaries. This surface never writes to stored Brain data." testId="brain-llm-organizer">
          <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-4">
              <Input value={courseHint} onChange={(event) => setCourseHint(event.target.value)} placeholder="Optional: course hint for organization" className="rounded-none border-secondary bg-black font-terminal" />
              <Textarea value={rawNotes} onChange={(event) => setRawNotes(event.target.value)} placeholder="Paste raw session evidence, WRAP notes, or free-text study notes here..." className="min-h-[220px] rounded-none border-secondary bg-black font-terminal" />
              <Input type="file" accept=".txt,.md,.json" className="rounded-none border-secondary bg-black font-terminal file:mr-3 file:rounded-none file:border-0 file:bg-primary file:px-3 file:py-2 file:font-arcade file:text-[10px] file:text-primary-foreground" onChange={handleFileUpload} />
              <div className="font-terminal text-[11px] text-muted-foreground">{uploadedFileName ? `Loaded ${uploadedFileName}` : "Accepted formats: .txt, .md, .json"}</div>
              <div className="border border-primary/15 bg-black/30 p-3 font-terminal text-xs text-muted-foreground">Annotation only. No save, no sync, no card creation, no workflow changes.</div>
              <Button type="button" className="w-full rounded-none font-arcade text-xs" disabled={!rawNotes.trim() || organizeMutation.isPending} onClick={() => organizeMutation.mutate({ rawNotes, course: courseHint.trim() || undefined })}><FileUp className="mr-2 h-3.5 w-3.5" />{organizeMutation.isPending ? "ANALYZING..." : "ORGANIZE + ANNOTATE"}</Button>
            </div>
            <div className="space-y-3">
              {organizeMutation.isError ? <div className="border border-destructive/35 bg-destructive/10 p-3 font-terminal text-xs text-destructive">{organizeMutation.error instanceof Error ? organizeMutation.error.message : "Could not organize this session input."}</div> : null}
              {organizeMutation.data?.organized ? <OrganizerPanel data={organizeMutation.data} /> : <div className="flex min-h-[260px] items-center justify-center border border-dashed border-primary/20 bg-black/20 p-6 text-center"><div className="space-y-2"><div className="font-arcade text-xs text-primary">ANNOTATION OUTPUT</div><div className="font-terminal text-xs text-muted-foreground">Run the organizer to preview tags, structure, and markdown without mutating stored Brain data.</div></div></div>}
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function OrganizerPanel({ data }: { data: BrainOrganizePreviewResponse }) {
  return (
    <div className="space-y-3">
      <div className="border border-primary/15 bg-black/30 p-3">
        <div className="font-arcade text-[11px] text-primary">ORGANIZED TITLE</div>
        <div className="mt-2 font-terminal text-sm text-white">{data.organized?.title}</div>
        {data.destination?.recommended_label ? <div className="mt-2 font-terminal text-[11px] text-muted-foreground">Suggested destination: {data.destination.recommended_label}</div> : null}
      </div>
      <div className="grid gap-3 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-3">
          <div className="border border-primary/15 bg-black/30 p-3"><div className="font-arcade text-[11px] text-primary">CHECKLIST</div><div className="mt-3 space-y-2">{(data.organized?.checklist || []).length ? data.organized?.checklist.map((item) => <div key={item} className="border border-primary/10 bg-black/35 px-3 py-2 font-terminal text-xs text-white">{item}</div>) : <div className="font-terminal text-xs text-muted-foreground">No checklist returned.</div>}</div></div>
          <div className="border border-primary/15 bg-black/30 p-3"><div className="font-arcade text-[11px] text-primary">SUGGESTED LINKS</div><div className="mt-3 space-y-2">{(data.organized?.suggested_links || []).length ? data.organized?.suggested_links.map((item) => <div key={item} className="border border-primary/10 bg-black/35 px-3 py-2 font-terminal text-xs text-white">{item}</div>) : <div className="font-terminal text-xs text-muted-foreground">No concept links suggested.</div>}</div></div>
        </div>
        <div className="border border-primary/15 bg-black/30 p-3"><div className="font-arcade text-[11px] text-primary">MARKDOWN PREVIEW</div><pre className="mt-3 max-h-[360px] overflow-auto whitespace-pre-wrap font-terminal text-xs text-muted-foreground">{data.organized?.markdown}</pre></div>
      </div>
    </div>
  );
}
