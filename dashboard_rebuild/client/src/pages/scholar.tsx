import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Link2,
  RefreshCw,
  Search,
  Send,
} from "lucide-react";

import { CoreWorkspaceFrame } from "@/components/CoreWorkspaceFrame";
import Layout from "@/components/layout";
import { PageScaffold } from "@/components/PageScaffold";
import { ScholarRunStatus } from "@/components/ScholarRunStatus";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { api, type ScholarInvestigation, type ScholarQuestion } from "@/lib/api";
import { useToast } from "@/use-toast";

type ScholarBrainProfile = Awaited<ReturnType<typeof api.brain.getProfileSummary>> & {
  hybridArchetype?: {
    confidence?: string;
    label?: string;
    summary?: string;
  } | null;
};

type ScholarBrainLaunchContext = {
  source?: string;
  itemId?: string;
  title?: string;
  reason?: string;
  investigationId?: string;
  questionId?: string;
};

function statusTone(status?: string) {
  switch (status) {
    case "running":
      return "border-primary/60 text-primary";
    case "blocked":
      return "border-yellow-500/60 text-yellow-400";
    case "completed":
      return "border-emerald-500/60 text-emerald-400";
    case "failed":
      return "border-destructive/60 text-destructive";
    default:
      return "border-muted-foreground/40 text-muted-foreground";
  }
}

function confidenceTone(confidence?: string) {
  switch (confidence) {
    case "high":
      return "border-emerald-500/60 text-emerald-400";
    case "medium":
      return "border-primary/60 text-primary";
    default:
      return "border-yellow-500/60 text-yellow-400";
  }
}

export default function ScholarPage() {
  const [location] = useLocation();
  const isScholarRoute = location === "/scholar";
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("workspace");
  const [selectedInvestigationId, setSelectedInvestigationId] = useState<string>("");
  const [brainLaunchContext, setBrainLaunchContext] = useState<ScholarBrainLaunchContext | null>(null);
  const [queryText, setQueryText] = useState("");
  const [rationale, setRationale] = useState("");
  const [audienceType, setAudienceType] = useState<"learner" | "operator" | "system">("system");
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({});
  const [submittingQuestionIds, setSubmittingQuestionIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("scholar.open_from_brain.v1");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        setBrainLaunchContext(parsed as ScholarBrainLaunchContext);
        if (typeof parsed.investigationId === "string") {
          setSelectedInvestigationId(parsed.investigationId);
        }
      }
      sessionStorage.removeItem("scholar.open_from_brain.v1");
    } catch {
      // ignore sessionStorage failures
    }
  }, []);

  const investigationsQuery = useQuery({
    queryKey: ["scholar-investigations"],
    queryFn: () => api.scholar.getInvestigations(30),
    enabled: isScholarRoute,
    refetchInterval: (query) => {
      if (!isScholarRoute) {
        return false;
      }
      const rows = (query.state.data as ScholarInvestigation[] | undefined) ?? [];
      return rows.some((row) => row.status === "queued" || row.status === "running") ? 2500 : false;
    },
  });

  const investigations = investigationsQuery.data ?? [];
  const selectedInvestigation = useMemo(
    () => investigations.find((row) => row.investigation_id === selectedInvestigationId) ?? investigations[0] ?? null,
    [investigations, selectedInvestigationId],
  );

  useEffect(() => {
    if (selectedInvestigation && selectedInvestigation.investigation_id !== selectedInvestigationId) {
      setSelectedInvestigationId(selectedInvestigation.investigation_id);
    }
  }, [selectedInvestigation, selectedInvestigationId]);

  const detailQuery = useQuery({
    queryKey: ["scholar-investigation", selectedInvestigation?.investigation_id],
    queryFn: () => api.scholar.getInvestigation(selectedInvestigation!.investigation_id),
    enabled: isScholarRoute && Boolean(selectedInvestigation?.investigation_id),
    refetchInterval:
      isScholarRoute &&
      (selectedInvestigation?.status === "queued" || selectedInvestigation?.status === "running")
        ? 2500
        : false,
  });

  const questionsQuery = useQuery({
    queryKey: ["scholar-research-questions"],
    queryFn: () => api.scholar.getQuestions("all", 100),
    enabled: isScholarRoute,
    refetchInterval: isScholarRoute ? 2500 : false,
  });

  const findingsQuery = useQuery({
    queryKey: ["scholar-research-findings", selectedInvestigation?.investigation_id ?? "all"],
    queryFn: () => api.scholar.getFindings(selectedInvestigation?.investigation_id, 60),
    enabled: isScholarRoute,
    refetchInterval:
      isScholarRoute &&
      (selectedInvestigation?.status === "queued" || selectedInvestigation?.status === "running")
        ? 2500
        : false,
  });

  const brainProfileQuery = useQuery({
    queryKey: ["brain", "profile", "scholar-bridge"],
    queryFn: () => api.brain.getProfileSummary(false),
  });

  const createInvestigationMutation = useMutation({
    mutationFn: () =>
      api.scholar.createInvestigation({
        title: queryText,
        query_text: queryText,
        rationale,
        audience_type: audienceType,
        mode: "brain",
        requested_by: "ui",
      }),
    onSuccess: (created) => {
      setQueryText("");
      setRationale("");
      setSelectedInvestigationId(created.investigation_id);
      queryClient.invalidateQueries({ queryKey: ["scholar-investigations"] });
      queryClient.invalidateQueries({ queryKey: ["scholar-research-findings"] });
      queryClient.invalidateQueries({ queryKey: ["scholar-research-questions"] });
      setActiveTab("workspace");
      toast({
        title: "Investigation started",
        description: "Scholar is collecting sources, citations, and system-facing findings.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not start investigation",
        description: error.message || "Scholar could not start the research run.",
        variant: "destructive",
      });
    },
  });

  const answerQuestionMutation = useMutation({
    mutationFn: ({ questionId, answer }: { questionId: string; answer: string }) =>
      api.scholar.answerQuestion(questionId, answer, "ui"),
    onSuccess: (_, variables) => {
      setQuestionAnswers((prev) => ({ ...prev, [variables.questionId]: "" }));
      queryClient.invalidateQueries({ queryKey: ["scholar-research-questions"] });
      queryClient.invalidateQueries({ queryKey: ["scholar-investigation"] });
      toast({
        title: "Answer saved",
        description: "Scholar stored the answer and queued a refresh on the linked investigation.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Answer failed",
        description: error.message || "Scholar could not save the answer.",
        variant: "destructive",
      });
    },
  });

  const submitAnswer = async (question: ScholarQuestion) => {
    const questionId = question.question_id || String(question.id);
    const answer = (questionAnswers[questionId] || "").trim();
    if (!answer || submittingQuestionIds[questionId]) {
      return;
    }
    setSubmittingQuestionIds((prev) => ({ ...prev, [questionId]: true }));
    try {
      await answerQuestionMutation.mutateAsync({ questionId, answer });
    } finally {
      setSubmittingQuestionIds((prev) => ({ ...prev, [questionId]: false }));
    }
  };

  const questions = questionsQuery.data ?? [];
  const openQuestions = questions.filter((question) => question.status !== "answered");
  const findings = findingsQuery.data ?? [];
  const profile = brainProfileQuery.data as ScholarBrainProfile | undefined;
  const detail = detailQuery.data;
  const profileConfidence = profile?.hybridArchetype?.confidence;
  const profileCards = profile
    ? [
        {
          key: "headline",
          label: "Headline",
          value: profile.profileSummary?.headline || "No active Brain headline yet.",
          helper: "Current top-level Brain interpretation.",
        },
        {
          key: "strength",
          label: "Strength",
          value: profile.profileSummary?.strengths?.[0] || "No stable strength identified yet.",
          helper: "Strongest recurring pattern Brain sees.",
        },
        {
          key: "watchout",
          label: "Watchout",
          value: profile.profileSummary?.watchouts?.[0] || "No major watchout identified yet.",
          helper: "Highest-risk drift Brain sees right now.",
        },
      ]
    : [];
  const scholarSidebar = (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-auto p-3 md:p-4">
      <TabsList className="grid h-auto gap-2 bg-transparent p-0">
        <TabsTrigger value="workspace" className="min-h-[44px] justify-start rounded-[1rem] border border-primary/15 bg-black/20 px-3 py-2 font-arcade text-xs text-muted-foreground data-[state=active]:border-primary/45 data-[state=active]:bg-primary/12 data-[state=active]:text-primary">
          WORKSPACE
        </TabsTrigger>
        <TabsTrigger value="questions" className="min-h-[44px] justify-start rounded-[1rem] border border-primary/15 bg-black/20 px-3 py-2 font-arcade text-xs text-muted-foreground data-[state=active]:border-primary/45 data-[state=active]:bg-primary/12 data-[state=active]:text-primary">
          QUESTIONS
        </TabsTrigger>
        <TabsTrigger value="findings" className="min-h-[44px] justify-start rounded-[1rem] border border-primary/15 bg-black/20 px-3 py-2 font-arcade text-xs text-muted-foreground data-[state=active]:border-primary/45 data-[state=active]:bg-primary/12 data-[state=active]:text-primary">
          FINDINGS
        </TabsTrigger>
        <TabsTrigger value="history" className="min-h-[44px] justify-start rounded-[1rem] border border-primary/15 bg-black/20 px-3 py-2 font-arcade text-xs text-muted-foreground data-[state=active]:border-primary/45 data-[state=active]:bg-primary/12 data-[state=active]:text-primary">
          HISTORY
        </TabsTrigger>
      </TabsList>

      {brainLaunchContext?.title ? (
        <div
          data-testid="scholar-brain-handoff"
          className="rounded-[1rem] border border-primary/20 bg-primary/10 px-3 py-3"
        >
          <div className="font-arcade text-[10px] text-primary">OPENED FROM BRAIN</div>
          <div className="font-terminal text-sm text-white">{brainLaunchContext.title}</div>
          {brainLaunchContext.reason ? (
            <div className="font-terminal text-[11px] text-muted-foreground">
              {brainLaunchContext.reason}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-3 rounded-[1rem] border border-primary/20 bg-black/20 p-3">
        <div className="font-arcade text-[11px] uppercase tracking-[0.24em] text-primary/80">
          Brain Context
        </div>
        {profile ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={`rounded-none text-[10px] ${confidenceTone(profileConfidence)}`}>
                {profileConfidence?.toUpperCase() || "LOW"} CONFIDENCE
              </Badge>
              <span className="font-terminal text-sm text-foreground">
                {profile.hybridArchetype?.label || "No active Brain archetype yet"}
              </span>
            </div>
            <div className="font-terminal text-xs text-muted-foreground">
              {profile.hybridArchetype?.summary || "Brain has not derived a stable learner-pattern summary yet."}
            </div>
            <div className="space-y-2">
              {profileCards.map((card) => (
                <div key={card.key} className="rounded-[0.95rem] border border-primary/15 bg-black/20 p-3">
                  <div className="font-terminal text-[11px] uppercase tracking-wide text-primary">{card.label}</div>
                  <div className="font-terminal text-sm text-foreground">{card.value}</div>
                  <div className="font-terminal text-[11px] text-muted-foreground">{card.helper}</div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="font-terminal text-xs text-muted-foreground">Brain context is still loading.</p>
        )}
      </div>

      <div className="space-y-3 rounded-[1rem] border border-primary/20 bg-black/20 p-3">
        <div className="font-arcade text-[11px] uppercase tracking-[0.24em] text-primary/80">
          Selected Investigation
        </div>
        {detail ? (
          <>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className={`rounded-none text-[10px] ${statusTone(detail.status)}`}>
                {detail.status.toUpperCase()}
              </Badge>
              <Badge variant="outline" className={`rounded-none text-[10px] ${confidenceTone(detail.confidence)}`}>
                {(detail.confidence || "low").toUpperCase()} CONFIDENCE
              </Badge>
            </div>
            <div className="font-terminal text-sm text-foreground">{detail.title}</div>
            <div className="font-terminal text-xs text-muted-foreground">{detail.rationale}</div>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-[0.85rem] border border-primary/15 bg-black/20 p-2">
                <div className="font-terminal text-[10px] text-primary">FINDINGS</div>
                <div className="font-terminal text-sm text-foreground">{detail.findings_count ?? 0}</div>
              </div>
              <div className="rounded-[0.85rem] border border-primary/15 bg-black/20 p-2">
                <div className="font-terminal text-[10px] text-primary">OPEN QS</div>
                <div className="font-terminal text-sm text-foreground">{detail.open_question_count ?? 0}</div>
              </div>
              <div className="rounded-[0.85rem] border border-primary/15 bg-black/20 p-2">
                <div className="font-terminal text-[10px] text-primary">SOURCES</div>
                <div className="font-terminal text-sm text-foreground">{detail.sources?.length ?? 0}</div>
              </div>
            </div>
          </>
        ) : (
          <div className="font-terminal text-xs text-muted-foreground">
            Start or select an investigation to make the active research goal, findings count, and uncertainty visible here.
          </div>
        )}
      </div>

      <ScholarRunStatus />
    </div>
  );
  const scholarCommandBand = (
    <div className="flex flex-col gap-3 p-3 md:p-4">
      <div className="space-y-1">
        <div className="font-arcade text-xs text-primary">Scholar Research Console</div>
        <div className="font-terminal text-sm text-muted-foreground">
          {detail
            ? `Focused on ${detail.title}. Keep the current question, findings, and uncertainty visible while Scholar runs.`
            : "Start an investigation, answer blocking questions, and keep the cited research lane visible."}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs font-terminal text-muted-foreground">
        <span className="rounded-full border border-primary/20 px-2 py-1">{investigations.length} investigations</span>
        <span className="rounded-full border border-primary/20 px-2 py-1">{openQuestions.length} open questions</span>
        <span className="rounded-full border border-primary/20 px-2 py-1">{findings.length} findings</span>
        {selectedInvestigation ? (
          <span className="rounded-full border border-primary/20 px-2 py-1">
            Active: {selectedInvestigation.title}
          </span>
        ) : null}
      </div>
    </div>
  );

  return (
    <Layout>
      <PageScaffold
        eyebrow="System Research Console"
        title="Scholar"
        subtitle="Investigate assumptions, gather external evidence, and record questions, findings, and uncertainty without turning this route into a teaching surface."
        className="min-h-[calc(100vh-140px)]"
        contentClassName="gap-6"
        stats={[
          { label: "Investigations", value: String(investigations.length) },
          { label: "Open Questions", value: String(openQuestions.length), tone: "warn" },
          { label: "Findings", value: String(findings.length), tone: "info" },
        ]}
        actions={
          <Button
            variant="outline"
            size="sm"
            className="font-arcade text-xs border-primary/40"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ["scholar-investigations"] });
              queryClient.invalidateQueries({ queryKey: ["scholar-investigation"] });
              queryClient.invalidateQueries({ queryKey: ["scholar-research-findings"] });
              queryClient.invalidateQueries({ queryKey: ["scholar-research-questions"] });
              queryClient.invalidateQueries({ queryKey: ["brain", "profile", "scholar-bridge"] });
            }}
          >
            <RefreshCw className="w-3 h-3 mr-2" /> REFRESH
          </Button>
        }
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="min-h-[70vh]">
          <CoreWorkspaceFrame
            sidebar={scholarSidebar}
            topBar={scholarCommandBand}
            contentClassName="gap-4 p-3 md:p-4"
          >
          <TabsContent value="workspace" className="mt-0">
            <div className="grid gap-4 xl:grid-cols-[430px_minmax(0,1fr)]">
              <Card className="bg-black/40 border border-primary/30">
                <CardHeader className="border-b border-primary/20">
                  <CardTitle className="font-arcade text-xs">START INVESTIGATION</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 p-4">
                  <div className="space-y-2">
                    <div className="font-terminal text-xs text-muted-foreground">Investigation question</div>
                    <Textarea
                      value={queryText}
                      onChange={(event) => setQueryText(event.target.value)}
                      placeholder="Example: Why does Brain keep classifying me as scaffold-dependent during retrieval-heavy sessions?"
                      className="min-h-[96px] rounded-none font-terminal text-xs border-primary/40"
                      data-testid="scholar-investigation-query"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="font-terminal text-xs text-muted-foreground">Why this matters</div>
                    <Textarea
                      value={rationale}
                      onChange={(event) => setRationale(event.target.value)}
                      placeholder="Explain what Scholar should improve, validate, or challenge."
                      className="min-h-[96px] rounded-none font-terminal text-xs border-primary/40"
                      data-testid="scholar-investigation-rationale"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="font-terminal text-xs text-muted-foreground">Primary target</div>
                    <Select value={audienceType} onValueChange={(value) => setAudienceType(value as "learner" | "operator" | "system")}>
                      <SelectTrigger className="rounded-none font-terminal text-xs border-primary/40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-none bg-black border-primary">
                        <SelectItem value="learner" className="font-terminal text-xs rounded-none">Learner</SelectItem>
                        <SelectItem value="operator" className="font-terminal text-xs rounded-none">Operator</SelectItem>
                        <SelectItem value="system" className="font-terminal text-xs rounded-none">System</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    className="w-full rounded-none font-terminal text-xs"
                    onClick={() => createInvestigationMutation.mutate()}
                    disabled={createInvestigationMutation.isPending || !queryText.trim() || !rationale.trim()}
                    data-testid="button-start-investigation"
                  >
                    <Search className="w-3 h-3 mr-2" />
                    {createInvestigationMutation.isPending ? "STARTING..." : "START INVESTIGATION"}
                  </Button>

                  <div className="border border-primary/20 bg-black/30 p-3">
                    <div className="font-terminal text-[11px] uppercase tracking-wide text-primary">Current contract</div>
                    <ul className="mt-2 space-y-1 font-terminal text-xs text-muted-foreground">
                      <li>1. Scholar investigates Brain, Tutor, and support-system questions with source-backed research.</li>
                      <li>2. Scholar keeps findings, uncertainty, and blocked questions visible instead of hidden.</li>
                      <li>3. Scholar can challenge the current Brain read without becoming the long-term evidence home.</li>
                      <li>4. Scholar stays non-teaching and does not replace Tutor's live execution role.</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-black/40 border border-primary/30">
                <CardHeader className="border-b border-primary/20">
                  <CardTitle className="font-arcade text-xs">ACTIVE INVESTIGATIONS</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[620px]">
                    <div className="space-y-3 p-4">
                      {investigations.length === 0 ? (
                        <p className="font-terminal text-xs text-muted-foreground">
                          No investigations yet. Start one from the panel on the left.
                        </p>
                      ) : (
                        investigations.map((investigation) => {
                          const isSelected =
                            investigation.investigation_id === selectedInvestigation?.investigation_id;
                          return (
                            <button
                              key={investigation.investigation_id}
                              type="button"
                              className={`w-full text-left border p-4 bg-black/30 transition ${
                                isSelected ? "border-primary" : "border-primary/20 hover:border-primary/60"
                              }`}
                              onClick={() => setSelectedInvestigationId(investigation.investigation_id)}
                              data-testid={`investigation-card-${investigation.investigation_id}`}
                            >
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <Badge variant="outline" className={`rounded-none text-[10px] ${statusTone(investigation.status)}`}>
                                  {investigation.status.toUpperCase()}
                                </Badge>
                                <Badge variant="outline" className={`rounded-none text-[10px] ${confidenceTone(investigation.confidence)}`}>
                                  {(investigation.confidence || "low").toUpperCase()}
                                </Badge>
                                <Badge variant="outline" className="rounded-none text-[10px] border-primary/20">
                                  {(investigation.audience_type || "learner").toUpperCase()}
                                </Badge>
                              </div>
                              <div className="font-terminal text-sm text-foreground">{investigation.title}</div>
                              <div className="font-terminal text-xs text-muted-foreground mt-1">
                                {investigation.rationale}
                              </div>
                              <div className="grid grid-cols-3 gap-2 mt-3">
                                <div className="border border-primary/20 bg-black/20 p-2">
                                  <div className="font-terminal text-[10px] text-primary">FINDINGS</div>
                                  <div className="font-terminal text-xs text-foreground">{investigation.findings_count ?? 0}</div>
                                </div>
                                <div className="border border-primary/20 bg-black/20 p-2">
                                  <div className="font-terminal text-[10px] text-primary">OPEN QS</div>
                                  <div className="font-terminal text-xs text-foreground">{investigation.open_question_count ?? 0}</div>
                                </div>
                                <div className="border border-primary/20 bg-black/20 p-2">
                                  <div className="font-terminal text-[10px] text-primary">UPDATED</div>
                                  <div className="font-terminal text-[11px] text-foreground">
                                    {investigation.updated_at
                                      ? new Date(investigation.updated_at).toLocaleDateString()
                                      : "n/a"}
                                  </div>
                                </div>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="questions" className="mt-6">
            <Card className="bg-black/40 border border-primary/30">
              <CardHeader className="border-b border-primary/20">
                <CardTitle className="font-arcade text-xs flex items-center gap-2">
                  <HelpCircle className="w-4 h-4" /> QUESTION INBOX
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-4">
                {questions.length === 0 ? (
                  <p className="font-terminal text-xs text-muted-foreground">
                    Scholar has not produced any learner questions yet.
                  </p>
                ) : (
                  questions.map((question) => {
                    const questionId = question.question_id || String(question.id);
                    const answered = question.status === "answered";
                    return (
                      <div
                        key={questionId}
                        className="border border-primary/20 bg-black/30 p-4"
                        data-testid={`question-card-${questionId}`}
                      >
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <Badge
                            variant="outline"
                            className={`rounded-none text-[10px] ${
                              answered
                                ? "border-emerald-500/60 text-emerald-400"
                                : "border-primary/60 text-primary"
                            }`}
                          >
                            {answered ? "ANSWERED" : "OPEN"}
                          </Badge>
                          {question.is_blocking ? (
                            <Badge
                              variant="outline"
                              className="rounded-none text-[10px] border-yellow-500/60 text-yellow-400"
                            >
                              BLOCKING
                            </Badge>
                          ) : null}
                          {question.linked_investigation_id ? (
                            <Badge
                              variant="outline"
                              className="rounded-none text-[10px] border-primary/20"
                            >
                              {question.linked_investigation_id}
                            </Badge>
                          ) : null}
                        </div>
                        <div className="font-terminal text-sm text-foreground">
                          {question.question_text || question.question}
                        </div>
                        {question.rationale ? (
                          <p className="font-terminal text-xs text-muted-foreground mt-2">
                            {question.rationale}
                          </p>
                        ) : null}
                        {question.evidence_needed ? (
                          <div className="mt-2 border border-primary/10 bg-black/20 p-2">
                            <div className="font-terminal text-[10px] uppercase tracking-wide text-primary">
                              Evidence Needed
                            </div>
                            <div className="font-terminal text-xs text-muted-foreground mt-1">
                              {question.evidence_needed}
                            </div>
                          </div>
                        ) : null}

                        {answered ? (
                          <div
                            className="mt-3 border border-emerald-500/20 bg-emerald-500/5 p-3"
                            data-testid={`saved-answer-${questionId}`}
                          >
                            <div className="font-terminal text-[10px] uppercase tracking-wide text-emerald-400">
                              Saved Answer
                            </div>
                            <div className="font-terminal text-xs text-muted-foreground mt-1">
                              {question.answer_text}
                            </div>
                          </div>
                        ) : (
                          <div className="mt-3 flex flex-col gap-3">
                            <Textarea
                              value={questionAnswers[questionId] || ""}
                              onChange={(event) =>
                                setQuestionAnswers((prev) => ({
                                  ...prev,
                                  [questionId]: event.target.value,
                                }))
                              }
                              placeholder="Write the learner answer Scholar should incorporate..."
                              className="min-h-[88px] rounded-none font-terminal text-xs border-primary/30"
                            />
                            <div className="flex justify-end">
                              <Button
                                size="sm"
                                className="rounded-none font-terminal text-xs"
                                onClick={() => submitAnswer(question)}
                                disabled={
                                  !((questionAnswers[questionId] || "").trim()) ||
                                  submittingQuestionIds[questionId]
                                }
                                data-testid={`button-submit-answer-${questionId}`}
                              >
                                <Send className="w-3 h-3 mr-2" />
                                {submittingQuestionIds[questionId] ? "SAVING..." : "SAVE ANSWER"}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}

                {openQuestions.length > 0 ? (
                  <div className="border border-yellow-500/20 bg-yellow-500/5 p-3">
                    <div className="font-terminal text-[11px] uppercase tracking-wide text-yellow-300">
                      Why these questions matter
                    </div>
                    <p className="font-terminal text-xs text-muted-foreground mt-1">
                      Scholar only asks when the current evidence is weak, conflicting, or still needs learner-specific context.
                    </p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="findings" className="mt-6">
            <Card className="bg-black/40 border border-primary/30">
              <CardHeader className="border-b border-primary/20">
                <CardTitle className="font-arcade text-xs flex items-center gap-2">
                  <Link2 className="w-4 h-4" /> CITED FINDINGS
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-4">
                {findings.length === 0 ? (
                  <p className="font-terminal text-xs text-muted-foreground">
                    No research findings yet. Start an investigation and Scholar will populate this lane with cited findings.
                  </p>
                ) : (
                  findings.map((finding, index) => (
                    <div
                      key={finding.finding_id || `${finding.title}-${index}`}
                      className="border border-primary/20 bg-black/30 p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Badge
                          variant="outline"
                          className={`rounded-none text-[10px] ${confidenceTone(finding.confidence)}`}
                        >
                          {(finding.confidence || "low").toUpperCase()} CONFIDENCE
                        </Badge>
                        {finding.investigation_id ? (
                          <Badge
                            variant="outline"
                            className="rounded-none text-[10px] border-primary/20"
                          >
                            {finding.investigation_id}
                          </Badge>
                        ) : null}
                      </div>
                      <div className="font-terminal text-sm text-foreground">{finding.title}</div>
                      <p className="font-terminal text-xs text-muted-foreground mt-2">
                        {finding.summary ||
                          finding.content ||
                          "Scholar recorded this finding without a summary yet."}
                      </p>
                      {finding.relevance ? (
                        <div className="mt-2 text-xs font-terminal text-primary">
                          Why it matters: {finding.relevance}
                        </div>
                      ) : null}
                      {finding.uncertainty ? (
                        <div className="mt-2 border border-yellow-500/20 bg-yellow-500/5 p-2">
                          <div className="font-terminal text-[10px] uppercase tracking-wide text-yellow-300">
                            Uncertainty
                          </div>
                          <div className="font-terminal text-xs text-muted-foreground mt-1">
                            {finding.uncertainty}
                          </div>
                        </div>
                      ) : null}
                      <div className="mt-3 space-y-2">
                        {(finding.sources || []).length > 0 ? (
                          (finding.sources || []).map((source) => (
                            <a
                              key={source.source_id}
                              href={source.url}
                              target="_blank"
                              rel="noreferrer"
                              className="block border border-primary/15 bg-black/20 p-3 hover:border-primary/40"
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className={`rounded-none text-[10px] ${confidenceTone(source.trust_tier)}`}
                                >
                                  {(source.trust_tier || "general").toUpperCase()}
                                </Badge>
                                <span className="font-terminal text-xs text-foreground">
                                  {source.title || source.url}
                                </span>
                              </div>
                              <div className="font-terminal text-[11px] text-muted-foreground mt-1">
                                {(source.publisher || source.domain) || source.url}
                                {source.published_at ? ` • ${source.published_at}` : ""}
                              </div>
                              {source.snippet ? (
                                <p className="font-terminal text-[11px] text-muted-foreground mt-2">
                                  {source.snippet}
                                </p>
                              ) : null}
                            </a>
                          ))
                        ) : (
                          <div className="font-terminal text-[11px] text-muted-foreground">
                            No citations attached to this finding yet.
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <Card className="bg-black/40 border border-primary/30">
              <CardHeader className="border-b border-primary/20">
                <CardTitle className="font-arcade text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> INVESTIGATION HISTORY
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-4">
                {investigations.length === 0 ? (
                  <p className="font-terminal text-xs text-muted-foreground">
                    No Scholar history yet.
                  </p>
                ) : (
                  investigations.map((investigation) => (
                    <div
                      key={investigation.investigation_id}
                      className="border border-primary/20 bg-black/30 p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Badge
                          variant="outline"
                          className={`rounded-none text-[10px] ${statusTone(investigation.status)}`}
                        >
                          {investigation.status.toUpperCase()}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`rounded-none text-[10px] ${confidenceTone(investigation.confidence)}`}
                        >
                          {(investigation.confidence || "low").toUpperCase()}
                        </Badge>
                      </div>
                      <div className="font-terminal text-sm text-foreground">
                        {investigation.title}
                      </div>
                      <p className="font-terminal text-xs text-muted-foreground mt-1">
                        {investigation.rationale}
                      </p>
                      {investigation.error_message ? (
                        <div className="mt-3 border border-destructive/20 bg-destructive/5 p-2">
                          <div className="font-terminal text-[10px] uppercase tracking-wide text-destructive flex items-center gap-2">
                            <AlertCircle className="w-3 h-3" /> Failure
                          </div>
                          <div className="font-terminal text-xs text-muted-foreground mt-1">
                            {investigation.error_message}
                          </div>
                        </div>
                      ) : null}
                      {investigation.run_notes ? (
                        <div className="mt-3 border border-primary/10 bg-black/20 p-2">
                          <div className="font-terminal text-[10px] uppercase tracking-wide text-primary">
                            Run Notes
                          </div>
                          <div className="font-terminal text-xs text-muted-foreground mt-1">
                            {investigation.run_notes}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
          </CoreWorkspaceFrame>
        </Tabs>
      </PageScaffold>
    </Layout>
  );
}
