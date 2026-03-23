import { useEffect, useMemo, useReducer } from "react";
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

import { PageScaffold } from "@/components/PageScaffold";
import { ScholarRunStatus } from "@/components/ScholarRunStatus";
import {
  CONTROL_CHIP,
  CONTROL_COPY,
  CONTROL_DECK_SECTION,
  CONTROL_KICKER,
} from "@/components/shell/controlStyles";
import { Badge } from "@/components/ui/badge";
import { HudButton } from "@/components/ui/HudButton";
import { HudPanel } from "@/components/ui/HudPanel";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  api,
  type ScholarInvestigation,
  type ScholarQuestion,
} from "@/lib/api";
import {
  INPUT_BASE,
  SELECT_BASE,
  STATUS_ERROR,
  STATUS_INFO,
  STATUS_SUCCESS,
  STATUS_WARNING,
  TEXT_BADGE,
  TEXT_BODY,
  TEXT_MUTED,
  TEXT_PANEL_TITLE,
  TEXT_SECTION_LABEL,
} from "@/lib/theme";
import { cn } from "@/lib/utils";
import { useToast } from "@/use-toast";

type ScholarBrainProfile = Awaited<
  ReturnType<typeof api.brain.getProfileSummary>
> & {
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

type ScholarPageState = {
  activeTab: string;
  selectedInvestigationId: string;
  brainLaunchContext: ScholarBrainLaunchContext | null;
  queryText: string;
  rationale: string;
  audienceType: "learner" | "operator" | "system";
  questionAnswers: Record<string, string>;
  submittingQuestionIds: Record<string, boolean>;
};

type ScholarFinding = Awaited<
  ReturnType<typeof api.scholar.getFindings>
>[number];
type ScholarInvestigationDetail = Awaited<
  ReturnType<typeof api.scholar.getInvestigation>
>;
type ScholarProfileCard = {
  key: string;
  label: string;
  value: string;
  helper: string;
};

type ScholarPagePatch =
  | Partial<ScholarPageState>
  | ((state: ScholarPageState) => Partial<ScholarPageState>);

function createScholarPageState(): ScholarPageState {
  return {
    activeTab: "workspace",
    selectedInvestigationId: "",
    brainLaunchContext: null,
    queryText: "",
    rationale: "",
    audienceType: "system",
    questionAnswers: {},
    submittingQuestionIds: {},
  };
}

function scholarPageReducer(
  state: ScholarPageState,
  patch: ScholarPagePatch,
): ScholarPageState {
  const nextPatch = typeof patch === "function" ? patch(state) : patch;
  return { ...state, ...nextPatch };
}

function statusTone(status?: string) {
  switch (status) {
    case "running":
      return "border-primary/60 text-primary";
    case "blocked":
      return STATUS_WARNING;
    case "completed":
      return STATUS_SUCCESS;
    case "failed":
      return STATUS_ERROR;
    default:
      return "border-muted-foreground/40 text-muted-foreground";
  }
}

function confidenceTone(confidence?: string) {
  switch (confidence) {
    case "high":
      return STATUS_SUCCESS;
    case "medium":
      return STATUS_INFO;
    default:
      return STATUS_WARNING;
  }
}

const SCHOLAR_PANEL_HEADER =
  "border-b border-primary/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.01)_70%)]";
const SCHOLAR_PANEL_SURFACE =
  "overflow-hidden bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.01)_18%,rgba(0,0,0,0.16)_100%),linear-gradient(135deg,rgba(118,10,34,0.18),rgba(10,4,8,0.18)_58%,rgba(0,0,0,0.1)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_16px_30px_rgba(0,0,0,0.16)] backdrop-blur-xl";
const SCHOLAR_PANEL_TITLE = TEXT_PANEL_TITLE;
const SCHOLAR_FIELD_LABEL = `${TEXT_SECTION_LABEL} text-primary/84`;
const SCHOLAR_COPY = `${TEXT_BODY} text-base leading-7 text-foreground/82`;
const SCHOLAR_META = `${TEXT_MUTED} text-sm leading-6 text-foreground/68`;
const SCHOLAR_BADGE = `${TEXT_BADGE} px-2.5 py-1 text-ui-2xs`;
const SCHOLAR_TEXTAREA = `${INPUT_BASE} rounded-[1rem] border-primary/40 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02)_38%,rgba(0,0,0,0.2)_100%)] text-base leading-7`;
const SCHOLAR_SELECT = `${SELECT_BASE} rounded-[1rem] border-primary/40 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02)_38%,rgba(0,0,0,0.2)_100%)] text-base`;
const SCHOLAR_INSET = "rounded-[1rem] border border-primary/15 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(0,0,0,0.04)_18%,rgba(0,0,0,0.12)_100%)] p-3 backdrop-blur-lg";

function ScholarSidebar({
  brainLaunchContext,
  detail,
  profile,
  profileCards,
  profileConfidence,
}: {
  brainLaunchContext: ScholarBrainLaunchContext | null;
  detail: ScholarInvestigationDetail | undefined;
  profile: ScholarBrainProfile | undefined;
  profileCards: ScholarProfileCard[];
  profileConfidence?: string;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-auto p-3 md:p-4">
      <TabsList className="grid h-auto gap-2">
        <TabsTrigger value="workspace" className="justify-start">
          WORKSPACE
        </TabsTrigger>
        <TabsTrigger value="questions" className="justify-start">
          QUESTIONS
        </TabsTrigger>
        <TabsTrigger value="findings" className="justify-start">
          FINDINGS
        </TabsTrigger>
        <TabsTrigger value="history" className="justify-start">
          HISTORY
        </TabsTrigger>
      </TabsList>

      {brainLaunchContext?.title ? (
        <div
          data-testid="scholar-brain-handoff"
          className={cn(CONTROL_DECK_SECTION, "space-y-2")}
        >
          <div className={CONTROL_KICKER}>Opened From Brain</div>
          <div className={CONTROL_COPY}>{brainLaunchContext.title}</div>
          {brainLaunchContext.reason ? (
            <div className={SCHOLAR_META}>{brainLaunchContext.reason}</div>
          ) : null}
        </div>
      ) : null}

      <div className={cn(CONTROL_DECK_SECTION, "space-y-3")}>
        <div className={CONTROL_KICKER}>Brain Context</div>
        {profile ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={`${SCHOLAR_BADGE} ${confidenceTone(profileConfidence)}`}
              >
                {profileConfidence?.toUpperCase() || "LOW"} CONFIDENCE
              </Badge>
              <span className={SCHOLAR_COPY}>
                {profile.hybridArchetype?.label ||
                  "No active Brain archetype yet"}
              </span>
            </div>
            <div className={SCHOLAR_META}>
              {profile.hybridArchetype?.summary ||
                "Brain has not derived a stable learner-pattern summary yet."}
            </div>
            <div className="space-y-2">
              {profileCards.map((card) => (
                <div key={card.key} className={SCHOLAR_INSET}>
                  <div className={SCHOLAR_FIELD_LABEL}>{card.label}</div>
                  <div className={SCHOLAR_COPY}>{card.value}</div>
                  <div className={SCHOLAR_META}>{card.helper}</div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className={SCHOLAR_META}>Brain context is still loading.</p>
        )}
      </div>

      <div className={cn(CONTROL_DECK_SECTION, "space-y-3")}>
        <div className={CONTROL_KICKER}>Selected Investigation</div>
        {detail ? (
          <>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant="outline"
                className={`${SCHOLAR_BADGE} ${statusTone(detail.status)}`}
              >
                {detail.status.toUpperCase()}
              </Badge>
              <Badge
                variant="outline"
                className={`${SCHOLAR_BADGE} ${confidenceTone(detail.confidence)}`}
              >
                {(detail.confidence || "low").toUpperCase()} CONFIDENCE
              </Badge>
            </div>
            <div className={SCHOLAR_COPY}>{detail.title}</div>
            <div className={SCHOLAR_META}>{detail.rationale}</div>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-[0.85rem] border border-primary/15 bg-black/20 p-2.5">
                <div className={SCHOLAR_FIELD_LABEL}>Findings</div>
                <div className="font-mono text-base leading-7 text-foreground">
                  {detail.findings_count ?? 0}
                </div>
              </div>
              <div className="rounded-[0.85rem] border border-primary/15 bg-black/20 p-2.5">
                <div className={SCHOLAR_FIELD_LABEL}>Open Qs</div>
                <div className="font-mono text-base leading-7 text-foreground">
                  {detail.open_question_count ?? 0}
                </div>
              </div>
              <div className="rounded-[0.85rem] border border-primary/15 bg-black/20 p-2.5">
                <div className={SCHOLAR_FIELD_LABEL}>Sources</div>
                <div className="font-mono text-base leading-7 text-foreground">
                  {detail.sources?.length ?? 0}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className={SCHOLAR_META}>
            Start or select an investigation to make the active research goal,
            findings count, and uncertainty visible here.
          </div>
        )}
      </div>

      <ScholarRunStatus />
    </div>
  );
}

function ScholarWorkspaceTab({
  audienceType,
  createInvestigation,
  investigations,
  patchPageState,
  queryText,
  rationale,
  selectedInvestigationId,
}: {
  audienceType: "learner" | "operator" | "system";
  createInvestigation: {
    isPending: boolean;
    mutate: () => void;
  };
  investigations: ScholarInvestigation[];
  patchPageState: (patch: ScholarPagePatch) => void;
  queryText: string;
  rationale: string;
  selectedInvestigationId?: string;
}) {
  return (
    <TabsContent value="workspace" className="mt-0">
      <div className="grid gap-4 xl:grid-cols-[430px_minmax(0,1fr)]">
        <HudPanel variant="b" className={SCHOLAR_PANEL_SURFACE}>
          <div className={cn(SCHOLAR_PANEL_HEADER, "p-4")}>
            <div className={SCHOLAR_PANEL_TITLE}>Start Investigation</div>
          </div>
          <div className="space-y-4 p-4">
            <div className="space-y-2">
              <div className={SCHOLAR_FIELD_LABEL}>Investigation Question</div>
              <Textarea
                value={queryText}
                onChange={(event) =>
                  patchPageState({ queryText: event.target.value })
                }
                placeholder="Example: Why does Brain keep classifying me as scaffold-dependent during retrieval-heavy sessions?"
                className={cn(SCHOLAR_TEXTAREA, "min-h-[96px]")}
                data-testid="scholar-investigation-query"
              />
            </div>

            <div className="space-y-2">
              <div className={SCHOLAR_FIELD_LABEL}>Why This Matters</div>
              <Textarea
                value={rationale}
                onChange={(event) =>
                  patchPageState({ rationale: event.target.value })
                }
                placeholder="Explain what Scholar should improve, validate, or challenge."
                className={cn(SCHOLAR_TEXTAREA, "min-h-[96px]")}
                data-testid="scholar-investigation-rationale"
              />
            </div>

            <div className="space-y-2">
              <div className={SCHOLAR_FIELD_LABEL}>Primary Target</div>
              <Select
                value={audienceType}
                onValueChange={(value) =>
                  patchPageState({
                    audienceType: value as "learner" | "operator" | "system",
                  })
                }
              >
                <SelectTrigger className={SCHOLAR_SELECT}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-[1rem] border-primary/40 bg-black/95">
                  <SelectItem
                    value="learner"
                    className="rounded-[0.85rem] font-mono text-sm"
                  >
                    Learner
                  </SelectItem>
                  <SelectItem
                    value="operator"
                    className="rounded-[0.85rem] font-mono text-sm"
                  >
                    Operator
                  </SelectItem>
                  <SelectItem
                    value="system"
                    className="rounded-[0.85rem] font-mono text-sm"
                  >
                    System
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <HudButton
              className="tracking-[0.14em]"
              onClick={() => createInvestigation.mutate()}
              disabled={
                createInvestigation.isPending ||
                !queryText.trim() ||
                !rationale.trim()
              }
              data-testid="button-start-investigation"
            >
              <Search className="w-3 h-3 mr-2" />
              {createInvestigation.isPending
                ? "STARTING..."
                : "START INVESTIGATION"}
            </HudButton>

            <div className={SCHOLAR_INSET}>
              <div className={SCHOLAR_FIELD_LABEL}>Current Contract</div>
              <ul className="mt-2 space-y-1.5 font-mono text-sm leading-6 text-foreground/68">
                <li>
                  1. Scholar investigates Brain, Tutor, and support-system
                  questions with source-backed research.
                </li>
                <li>
                  2. Scholar keeps findings, uncertainty, and blocked questions
                  visible instead of hidden.
                </li>
                <li>
                  3. Scholar can challenge the current Brain read without
                  becoming the long-term evidence home.
                </li>
                <li>
                  4. Scholar stays non-teaching and does not replace Tutor's
                  live execution role.
                </li>
              </ul>
            </div>
          </div>
        </HudPanel>

        <HudPanel variant="b" className={SCHOLAR_PANEL_SURFACE}>
          <div className={cn(SCHOLAR_PANEL_HEADER, "p-4")}>
            <div className={SCHOLAR_PANEL_TITLE}>Active Investigations</div>
          </div>
          <div className="p-0">
            <ScrollArea className="h-[620px]">
              <div className="space-y-3 p-4">
                {investigations.length === 0 ? (
                  <p className={SCHOLAR_META}>
                    No investigations yet. Start one from the panel on the left.
                  </p>
                ) : (
                  investigations.map((investigation) => {
                    const isSelected =
                      investigation.investigation_id ===
                      selectedInvestigationId;
                    return (
                      <button
                        key={investigation.investigation_id}
                        type="button"
                        className={`w-full rounded-[1rem] text-left border p-4 bg-black/30 transition ${
                          isSelected
                            ? "border-primary shadow-[0_0_0_1px_rgba(255,94,126,0.18)]"
                            : "border-primary/20 hover:border-primary/60"
                        }`}
                        onClick={() =>
                          patchPageState({
                            selectedInvestigationId:
                              investigation.investigation_id,
                          })
                        }
                        data-testid={`investigation-card-${investigation.investigation_id}`}
                      >
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <Badge
                            variant="outline"
                            className={`${SCHOLAR_BADGE} ${statusTone(investigation.status)}`}
                          >
                            {investigation.status.toUpperCase()}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`${SCHOLAR_BADGE} ${confidenceTone(investigation.confidence)}`}
                          >
                            {(investigation.confidence || "low").toUpperCase()}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`${SCHOLAR_BADGE} border-primary/20 text-primary/80`}
                          >
                            {(
                              investigation.audience_type || "learner"
                            ).toUpperCase()}
                          </Badge>
                        </div>
                        <div className={SCHOLAR_COPY}>
                          {investigation.title}
                        </div>
                        <div className={cn(SCHOLAR_META, "mt-1")}>
                          {investigation.rationale}
                        </div>
                        <div className="grid grid-cols-3 gap-2 mt-3">
                          <div className="rounded-[0.85rem] border border-primary/20 bg-black/20 p-2.5">
                            <div className={SCHOLAR_FIELD_LABEL}>Findings</div>
                            <div className="font-mono text-sm leading-6 text-foreground">
                              {investigation.findings_count ?? 0}
                            </div>
                          </div>
                          <div className="rounded-[0.85rem] border border-primary/20 bg-black/20 p-2.5">
                            <div className={SCHOLAR_FIELD_LABEL}>Open Qs</div>
                            <div className="font-mono text-sm leading-6 text-foreground">
                              {investigation.open_question_count ?? 0}
                            </div>
                          </div>
                          <div className="rounded-[0.85rem] border border-primary/20 bg-black/20 p-2.5">
                            <div className={SCHOLAR_FIELD_LABEL}>Updated</div>
                            <div className="font-mono text-sm leading-6 text-foreground">
                              {investigation.updated_at
                                ? new Date(
                                    investigation.updated_at,
                                  ).toLocaleDateString()
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
          </div>
        </HudPanel>
      </div>
    </TabsContent>
  );
}

function ScholarQuestionsTab({
  openQuestionsCount,
  patchPageState,
  questionAnswers,
  questions,
  submitAnswer,
  submittingQuestionIds,
}: {
  openQuestionsCount: number;
  patchPageState: (patch: ScholarPagePatch) => void;
  questionAnswers: Record<string, string>;
  questions: ScholarQuestion[];
  submitAnswer: (question: ScholarQuestion) => Promise<void>;
  submittingQuestionIds: Record<string, boolean>;
}) {
  return (
    <TabsContent value="questions" className="mt-6">
      <HudPanel variant="b" className={SCHOLAR_PANEL_SURFACE}>
        <div className={cn(SCHOLAR_PANEL_HEADER, "p-4")}>
          <div className={cn(SCHOLAR_PANEL_TITLE, "flex items-center gap-2")}>
            <HelpCircle className="w-4 h-4" /> QUESTION INBOX
          </div>
        </div>
        <div className="space-y-4 p-4">
          {questions.length === 0 ? (
            <p className={SCHOLAR_META}>
              Scholar has not produced any learner questions yet.
            </p>
          ) : (
            questions.map((question) => {
              const questionId = question.question_id || String(question.id);
              const answered = question.status === "answered";
              return (
                <div
                  key={questionId}
                  className="rounded-[1rem] border border-primary/20 bg-black/30 p-4"
                  data-testid={`question-card-${questionId}`}
                >
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Badge
                      variant="outline"
                      className={`${SCHOLAR_BADGE} ${
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
                        className={`${SCHOLAR_BADGE} border-yellow-500/60 text-yellow-400`}
                      >
                        BLOCKING
                      </Badge>
                    ) : null}
                    {question.linked_investigation_id ? (
                      <Badge
                        variant="outline"
                        className={`${SCHOLAR_BADGE} border-primary/20 text-primary/80`}
                      >
                        {question.linked_investigation_id}
                      </Badge>
                    ) : null}
                  </div>
                  <div className={SCHOLAR_COPY}>
                    {question.question_text || question.question}
                  </div>
                  {question.rationale ? (
                    <p className={cn(SCHOLAR_META, "mt-2")}>
                      {question.rationale}
                    </p>
                  ) : null}
                  {question.evidence_needed ? (
                    <div className="mt-2 rounded-[0.85rem] border border-primary/10 bg-black/20 p-2.5">
                      <div className={SCHOLAR_FIELD_LABEL}>Evidence Needed</div>
                      <div className={cn(SCHOLAR_META, "mt-1")}>
                        {question.evidence_needed}
                      </div>
                    </div>
                  ) : null}

                  {answered ? (
                    <div
                      className="mt-3 rounded-[0.85rem] border border-emerald-500/20 bg-emerald-500/5 p-3"
                      data-testid={`saved-answer-${questionId}`}
                    >
                      <div
                        className={cn(SCHOLAR_FIELD_LABEL, "text-emerald-400")}
                      >
                        Saved Answer
                      </div>
                      <div className={cn(SCHOLAR_META, "mt-1")}>
                        {question.answer_text}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 flex flex-col gap-3">
                      <Textarea
                        value={questionAnswers[questionId] || ""}
                        onChange={(event) =>
                          patchPageState((prev) => ({
                            questionAnswers: {
                              ...prev.questionAnswers,
                              [questionId]: event.target.value,
                            },
                          }))
                        }
                        placeholder="Write the learner answer Scholar should incorporate..."
                        className={cn(SCHOLAR_TEXTAREA, "min-h-[88px]")}
                      />
                      <div className="flex justify-end">
                        <HudButton
                          className="w-auto px-4 tracking-[0.14em]"
                          onClick={() => void submitAnswer(question)}
                          disabled={
                            !(questionAnswers[questionId] || "").trim() ||
                            submittingQuestionIds[questionId]
                          }
                          data-testid={`button-submit-answer-${questionId}`}
                        >
                          <Send className="w-3 h-3 mr-2" />
                          {submittingQuestionIds[questionId]
                            ? "SAVING..."
                            : "SAVE ANSWER"}
                        </HudButton>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}

          {openQuestionsCount > 0 ? (
            <div className="rounded-[0.95rem] border border-yellow-500/20 bg-yellow-500/5 p-3">
              <div className={cn(SCHOLAR_FIELD_LABEL, "text-yellow-300")}>
                Why these questions matter
              </div>
              <p className={cn(SCHOLAR_META, "mt-1")}>
                Scholar only asks when the current evidence is weak,
                conflicting, or still needs learner-specific context.
              </p>
            </div>
          ) : null}
        </div>
      </HudPanel>
    </TabsContent>
  );
}

function ScholarFindingsTab({ findings }: { findings: ScholarFinding[] }) {
  return (
    <TabsContent value="findings" className="mt-6">
      <HudPanel variant="b" className={SCHOLAR_PANEL_SURFACE}>
        <div className={cn(SCHOLAR_PANEL_HEADER, "p-4")}>
          <div className={cn(SCHOLAR_PANEL_TITLE, "flex items-center gap-2")}>
            <Link2 className="w-4 h-4" /> CITED FINDINGS
          </div>
        </div>
        <div className="space-y-4 p-4">
          {findings.length === 0 ? (
            <p className={SCHOLAR_META}>
              No research findings yet. Start an investigation and Scholar will
              populate this lane with cited findings.
            </p>
          ) : (
            findings.map((finding, index) => (
              <div
                key={finding.finding_id || `${finding.title}-${index}`}
                className="rounded-[1rem] border border-primary/20 bg-black/30 p-4"
              >
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Badge
                    variant="outline"
                    className={`${SCHOLAR_BADGE} ${confidenceTone(finding.confidence)}`}
                  >
                    {(finding.confidence || "low").toUpperCase()} CONFIDENCE
                  </Badge>
                  {finding.investigation_id ? (
                    <Badge
                      variant="outline"
                      className={`${SCHOLAR_BADGE} border-primary/20 text-primary/80`}
                    >
                      {finding.investigation_id}
                    </Badge>
                  ) : null}
                </div>
                <div className={SCHOLAR_COPY}>{finding.title}</div>
                <p className={cn(SCHOLAR_META, "mt-2")}>
                  {finding.summary ||
                    finding.content ||
                    "Scholar recorded this finding without a summary yet."}
                </p>
                {finding.relevance ? (
                  <div className="mt-2 font-mono text-sm leading-6 text-primary">
                    Why it matters: {finding.relevance}
                  </div>
                ) : null}
                {finding.uncertainty ? (
                  <div className="mt-2 rounded-[0.85rem] border border-yellow-500/20 bg-yellow-500/5 p-2.5">
                    <div className={cn(SCHOLAR_FIELD_LABEL, "text-yellow-300")}>
                      Uncertainty
                    </div>
                    <div className={cn(SCHOLAR_META, "mt-1")}>
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
                        className="block rounded-[0.95rem] border border-primary/15 bg-black/20 p-3 hover:border-primary/40"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant="outline"
                            className={`${SCHOLAR_BADGE} ${confidenceTone(source.trust_tier)}`}
                          >
                            {(source.trust_tier || "general").toUpperCase()}
                          </Badge>
                          <span className="font-mono text-sm leading-6 text-foreground">
                            {source.title || source.url}
                          </span>
                        </div>
                        <div className={cn(SCHOLAR_META, "mt-1")}>
                          {source.publisher || source.domain || source.url}
                          {source.published_at
                            ? ` • ${source.published_at}`
                            : ""}
                        </div>
                        {source.snippet ? (
                          <p className={cn(SCHOLAR_META, "mt-2")}>
                            {source.snippet}
                          </p>
                        ) : null}
                      </a>
                    ))
                  ) : (
                    <div className={SCHOLAR_META}>
                      No citations attached to this finding yet.
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </HudPanel>
    </TabsContent>
  );
}

function ScholarHistoryTab({
  investigations,
}: {
  investigations: ScholarInvestigation[];
}) {
  return (
    <TabsContent value="history" className="mt-6">
      <HudPanel variant="b" className={SCHOLAR_PANEL_SURFACE}>
        <div className={cn(SCHOLAR_PANEL_HEADER, "p-4")}>
          <div className={cn(SCHOLAR_PANEL_TITLE, "flex items-center gap-2")}>
            <CheckCircle2 className="w-4 h-4" /> INVESTIGATION HISTORY
          </div>
        </div>
        <div className="space-y-4 p-4">
          {investigations.length === 0 ? (
            <p className={SCHOLAR_META}>No Scholar history yet.</p>
          ) : (
            investigations.map((investigation) => (
              <div
                key={investigation.investigation_id}
                className="rounded-[1rem] border border-primary/20 bg-black/30 p-4"
              >
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Badge
                    variant="outline"
                    className={`${SCHOLAR_BADGE} ${statusTone(investigation.status)}`}
                  >
                    {investigation.status.toUpperCase()}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`${SCHOLAR_BADGE} ${confidenceTone(investigation.confidence)}`}
                  >
                    {(investigation.confidence || "low").toUpperCase()}
                  </Badge>
                </div>
                <div className={SCHOLAR_COPY}>{investigation.title}</div>
                <p className={cn(SCHOLAR_META, "mt-1")}>
                  {investigation.rationale}
                </p>
                {investigation.error_message ? (
                  <div className="mt-3 rounded-[0.85rem] border border-destructive/20 bg-destructive/5 p-2.5">
                    <div
                      className={cn(
                        SCHOLAR_FIELD_LABEL,
                        "flex items-center gap-2 text-destructive",
                      )}
                    >
                      <AlertCircle className="w-3 h-3" /> Failure
                    </div>
                    <div className={cn(SCHOLAR_META, "mt-1")}>
                      {investigation.error_message}
                    </div>
                  </div>
                ) : null}
                {investigation.run_notes ? (
                  <div className="mt-3 rounded-[0.85rem] border border-primary/10 bg-black/20 p-2.5">
                    <div className={SCHOLAR_FIELD_LABEL}>Run Notes</div>
                    <div className={cn(SCHOLAR_META, "mt-1")}>
                      {investigation.run_notes}
                    </div>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      </HudPanel>
    </TabsContent>
  );
}

export default function ScholarPage() {
  const [location] = useLocation();
  const isScholarRoute = location === "/scholar";
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [pageState, patchPageState] = useReducer(
    scholarPageReducer,
    undefined,
    createScholarPageState,
  );
  const {
    activeTab,
    selectedInvestigationId,
    brainLaunchContext,
    queryText,
    rationale,
    audienceType,
    questionAnswers,
    submittingQuestionIds,
  } = pageState;

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("scholar.open_from_brain.v1");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        patchPageState({
          brainLaunchContext: parsed as ScholarBrainLaunchContext,
          selectedInvestigationId:
            typeof parsed.investigationId === "string"
              ? parsed.investigationId
              : "",
        });
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
      const rows =
        (query.state.data as ScholarInvestigation[] | undefined) ?? [];
      return rows.some(
        (row) => row.status === "queued" || row.status === "running",
      )
        ? 2500
        : false;
    },
  });

  const investigations = investigationsQuery.data ?? [];
  const selectedInvestigation = useMemo(
    () =>
      investigations.find(
        (row) => row.investigation_id === selectedInvestigationId,
      ) ??
      investigations[0] ??
      null,
    [investigations, selectedInvestigationId],
  );

  useEffect(() => {
    if (
      selectedInvestigation &&
      selectedInvestigation.investigation_id !== selectedInvestigationId
    ) {
      patchPageState({
        selectedInvestigationId: selectedInvestigation.investigation_id,
      });
    }
  }, [patchPageState, selectedInvestigation, selectedInvestigationId]);

  const detailQuery = useQuery({
    queryKey: [
      "scholar-investigation",
      selectedInvestigation?.investigation_id,
    ],
    queryFn: () =>
      api.scholar.getInvestigation(selectedInvestigation!.investigation_id),
    enabled: isScholarRoute && Boolean(selectedInvestigation?.investigation_id),
    refetchInterval:
      isScholarRoute &&
      (selectedInvestigation?.status === "queued" ||
        selectedInvestigation?.status === "running")
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
    queryKey: [
      "scholar-research-findings",
      selectedInvestigation?.investigation_id ?? "all",
    ],
    queryFn: () =>
      api.scholar.getFindings(selectedInvestigation?.investigation_id, 60),
    enabled: isScholarRoute,
    refetchInterval:
      isScholarRoute &&
      (selectedInvestigation?.status === "queued" ||
        selectedInvestigation?.status === "running")
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
      patchPageState({
        queryText: "",
        rationale: "",
        selectedInvestigationId: created.investigation_id,
        activeTab: "workspace",
      });
      queryClient.invalidateQueries({ queryKey: ["scholar-investigations"] });
      queryClient.invalidateQueries({
        queryKey: ["scholar-research-findings"],
      });
      queryClient.invalidateQueries({
        queryKey: ["scholar-research-questions"],
      });
      toast({
        title: "Investigation started",
        description:
          "Scholar is collecting sources, citations, and system-facing findings.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not start investigation",
        description:
          error.message || "Scholar could not start the research run.",
        variant: "destructive",
      });
    },
  });

  const answerQuestionMutation = useMutation({
    mutationFn: ({
      questionId,
      answer,
    }: {
      questionId: string;
      answer: string;
    }) => api.scholar.answerQuestion(questionId, answer, "ui"),
    onSuccess: (_, variables) => {
      patchPageState((prev) => ({
        questionAnswers: {
          ...prev.questionAnswers,
          [variables.questionId]: "",
        },
      }));
      queryClient.invalidateQueries({
        queryKey: ["scholar-research-questions"],
      });
      queryClient.invalidateQueries({ queryKey: ["scholar-investigation"] });
      toast({
        title: "Answer saved",
        description:
          "Scholar stored the answer and queued a refresh on the linked investigation.",
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
    patchPageState((prev) => ({
      submittingQuestionIds: {
        ...prev.submittingQuestionIds,
        [questionId]: true,
      },
    }));
    try {
      await answerQuestionMutation.mutateAsync({ questionId, answer });
    } finally {
      patchPageState((prev) => ({
        submittingQuestionIds: {
          ...prev.submittingQuestionIds,
          [questionId]: false,
        },
      }));
    }
  };

  const questions = questionsQuery.data ?? [];
  const openQuestions = questions.filter(
    (question) => question.status !== "answered",
  );
  const findings = findingsQuery.data ?? [];
  const profile = brainProfileQuery.data as ScholarBrainProfile | undefined;
  const detail = detailQuery.data;
  const profileConfidence = profile?.hybridArchetype?.confidence;
  const profileCards = profile
    ? [
        {
          key: "headline",
          label: "Headline",
          value:
            profile.profileSummary?.headline || "No active Brain headline yet.",
          helper: "Current top-level Brain interpretation.",
        },
        {
          key: "strength",
          label: "Strength",
          value:
            profile.profileSummary?.strengths?.[0] ||
            "No stable strength identified yet.",
          helper: "Strongest recurring pattern Brain sees.",
        },
        {
          key: "watchout",
          label: "Watchout",
          value:
            profile.profileSummary?.watchouts?.[0] ||
            "No major watchout identified yet.",
          helper: "Highest-risk drift Brain sees right now.",
        },
      ]
    : [];
  const scholarSidebar = (
    <ScholarSidebar
      brainLaunchContext={brainLaunchContext}
      detail={detail}
      profile={profile}
      profileCards={profileCards}
      profileConfidence={profileConfidence}
    />
  );
  const scholarCommandBand = (
    <div className="flex flex-col gap-3">
      <div className="space-y-1">
        <div className={CONTROL_KICKER}>Scholar Research Console</div>
        <div className={cn(CONTROL_COPY, "text-sm")}>
          {detail
            ? `Focused on ${detail.title}. Keep the current question, findings, and uncertainty visible while Scholar runs.`
            : "Start an investigation, answer blocking questions, and keep the cited research lane visible."}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs font-terminal text-muted-foreground">
        <span className={cn(CONTROL_CHIP, "min-h-[40px] px-3 text-xs")}>
          {investigations.length} investigations
        </span>
        <span className={cn(CONTROL_CHIP, "min-h-[40px] px-3 text-xs")}>
          {openQuestions.length} open questions
        </span>
        <span className={cn(CONTROL_CHIP, "min-h-[40px] px-3 text-xs")}>
          {findings.length} findings
        </span>
        {selectedInvestigation ? (
          <span className={cn(CONTROL_CHIP, "min-h-[40px] px-3 text-xs")}>
            Active: {selectedInvestigation.title}
          </span>
        ) : null}
      </div>
    </div>
  );

  return (
    <PageScaffold
      eyebrow="System Research Console"
      title="Scholar"
      subtitle="Investigate assumptions, gather external evidence, and record questions, findings, and uncertainty without turning this route into a teaching surface."
      className="min-h-[calc(100vh-140px)]"
      contentClassName="gap-6"
      stats={[
        { label: "Investigations", value: String(investigations.length) },
        {
          label: "Open Questions",
          value: String(openQuestions.length),
          tone: "warn",
        },
        { label: "Findings", value: String(findings.length), tone: "info" },
      ]}
      actions={
        <HudButton
          variant="outline"
          className="w-auto px-4 text-xs"
          onClick={() => {
            queryClient.invalidateQueries({
              queryKey: ["scholar-investigations"],
            });
            queryClient.invalidateQueries({
              queryKey: ["scholar-investigation"],
            });
            queryClient.invalidateQueries({
              queryKey: ["scholar-research-findings"],
            });
            queryClient.invalidateQueries({
              queryKey: ["scholar-research-questions"],
            });
            queryClient.invalidateQueries({
              queryKey: ["brain", "profile", "scholar-bridge"],
            });
          }}
        >
          <RefreshCw className="w-3 h-3 mr-2" /> REFRESH
        </HudButton>
      }
    >
      <Tabs
        value={activeTab}
        onValueChange={(value) => patchPageState({ activeTab: value })}
        className="min-h-[70vh]"
      >
        <CoreWorkspaceFrame
          sidebar={scholarSidebar}
          topBar={scholarCommandBand}
          contentClassName="gap-4 p-3 md:p-4"
        >
          <ScholarWorkspaceTab
            audienceType={audienceType}
            createInvestigation={createInvestigationMutation}
            investigations={investigations}
            patchPageState={patchPageState}
            queryText={queryText}
            rationale={rationale}
            selectedInvestigationId={selectedInvestigation?.investigation_id}
          />
          <ScholarQuestionsTab
            openQuestionsCount={openQuestions.length}
            patchPageState={patchPageState}
            questionAnswers={questionAnswers}
            questions={questions}
            submitAnswer={submitAnswer}
            submittingQuestionIds={submittingQuestionIds}
          />
          <ScholarFindingsTab findings={findings} />
          <ScholarHistoryTab investigations={investigations} />
        </CoreWorkspaceFrame>
      </Tabs>
    </PageScaffold>
  );
}
