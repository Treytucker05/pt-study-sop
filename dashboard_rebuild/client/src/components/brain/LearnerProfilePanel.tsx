import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BrainCircuit,
  Clock3,
  MessageSquareQuote,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { useToast } from "@/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CONTROL_COPY,
  CONTROL_DECK_SECTION,
  CONTROL_KICKER,
} from "@/components/shell/controlStyles";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { BrainWorkspace } from "./useBrainWorkspace";

interface LearnerProfilePanelProps {
  workspace: BrainWorkspace;
}

type LearnerProfile = NonNullable<BrainWorkspace["learnerProfile"]>;
type LearnerProfileClaim = BrainWorkspace["learnerProfileClaims"][number];
type LearnerProfileQuestion = BrainWorkspace["learnerProfileQuestions"][number];
type LearnerProfileHistoryItem =
  BrainWorkspace["learnerProfileHistory"][number];

function formatFreshness(days: number | null | undefined): string {
  if (days === null || days === undefined) return "no fresh signal";
  if (days <= 1) return "fresh";
  if (days <= 7) return `${days.toFixed(1)}d old`;
  return `${Math.round(days)}d old`;
}

function signalTone(
  signalDirection: "strength" | "watchout",
  score: number,
): string {
  if (signalDirection === "watchout" && score >= 0.55)
    return "border-destructive/70 text-destructive";
  if (signalDirection === "strength" && score >= 0.6)
    return "border-success/70 text-success";
  return "border-primary/40 text-primary";
}

const PROFILE_CARD = CONTROL_DECK_SECTION;
const PROFILE_HEADER = "border-b border-primary/15 px-4 pb-3 pt-3";
const PROFILE_TITLE =
  "font-arcade text-sm uppercase tracking-[0.18em] text-primary";
const PROFILE_DESCRIPTION = "font-mono text-sm leading-6 text-foreground/68";
const PROFILE_META = "font-mono text-sm leading-6 text-foreground/68";
const PROFILE_BADGE = "rounded-full px-2.5 py-1 text-ui-2xs tracking-[0.14em]";

function ProfileOverviewCard({
  profile,
  refreshing,
  onRefresh,
}: {
  profile: LearnerProfile;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  return (
    <Card className={PROFILE_CARD}>
      <CardHeader className={PROFILE_HEADER}>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <BrainCircuit className="h-4 w-4 text-primary" />
              <CardTitle className={PROFILE_TITLE}>Brain Profile</CardTitle>
            </div>
            <CardDescription className={PROFILE_DESCRIPTION}>
              {profile.profileSummary.headline}
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            className="rounded-[1rem] font-arcade text-sm tracking-[0.14em]"
            onClick={onRefresh}
            disabled={refreshing}
          >
            <RefreshCw
              className={cn("mr-2 h-3.5 w-3.5", refreshing && "animate-spin")}
            />
            REFRESH
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className={`${PROFILE_BADGE} border-primary/60 text-primary`}
          >
            {profile.hybridArchetype.label}
          </Badge>
          <Badge
            variant="outline"
            className={`${PROFILE_BADGE} border-primary/30 text-foreground/68`}
          >
            {profile.claimsOverview.highConfidence} strong claim
            {profile.claimsOverview.highConfidence === 1 ? "" : "s"}
          </Badge>
          <Badge
            variant="outline"
            className={`${PROFILE_BADGE} border-destructive/40 text-destructive`}
          >
            {profile.claimsOverview.needsCalibration} need calibration
          </Badge>
          <Badge
            variant="outline"
            className={`${PROFILE_BADGE} border-yellow-400/50 text-yellow-300`}
          >
            {profile.claimsOverview.watchouts} active watchout
            {profile.claimsOverview.watchouts === 1 ? "" : "s"}
          </Badge>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-2">
            <div className={CONTROL_KICKER}>Strengths</div>
            <ul className="space-y-1.5 font-mono text-sm leading-6 text-foreground/68">
              {profile.profileSummary.strengths.length > 0 ? (
                profile.profileSummary.strengths.map((item) => (
                  <li key={item}>- {item}</li>
                ))
              ) : (
                <li>- Brain needs more stable evidence.</li>
              )}
            </ul>
          </div>
          <div className="space-y-2">
            <div className="font-arcade text-ui-xs uppercase tracking-[0.22em] text-destructive">
              Watchouts
            </div>
            <ul className="space-y-1.5 font-mono text-sm leading-6 text-foreground/68">
              {profile.profileSummary.watchouts.length > 0 ? (
                profile.profileSummary.watchouts.map((item) => (
                  <li key={item}>- {item}</li>
                ))
              ) : (
                <li>- No major watchouts surfaced yet.</li>
              )}
            </ul>
          </div>
          <div className="space-y-2">
            <div className="font-arcade text-ui-xs uppercase tracking-[0.22em] text-secondary">
              Next Actions
            </div>
            <ul className="space-y-1.5 font-mono text-sm leading-6 text-foreground/68">
              {profile.profileSummary.nextBestActions.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {profile.hybridArchetype.supportingTraits.map((trait) => (
            <Badge
              key={trait}
              variant="outline"
              className={`${PROFILE_BADGE} border-primary/30 text-foreground/68`}
            >
              {trait}
            </Badge>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-[1rem] border border-primary/20 bg-black/30 p-3">
            <div className={CONTROL_KICKER}>Generated</div>
            <div className={PROFILE_META}>{profile.generatedAt}</div>
          </div>
          <div className="rounded-[1rem] border border-primary/20 bg-black/30 p-3">
            <div className={CONTROL_KICKER}>Source Window</div>
            <div className={PROFILE_META}>
              {profile.sourceWindow.start || "n/a"} {"->"}{" "}
              {profile.sourceWindow.end || "n/a"}
            </div>
          </div>
          <div className="rounded-[1rem] border border-primary/20 bg-black/30 p-3">
            <div className={CONTROL_KICKER}>Backfill</div>
            <div className={PROFILE_META}>{profile.backfillMode}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EvidenceOwnershipCard({ profile }: { profile: LearnerProfile }) {
  return (
    <Card className={PROFILE_CARD}>
      <CardHeader className={PROFILE_HEADER}>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <CardTitle className={PROFILE_TITLE}>Evidence Ownership</CardTitle>
        </div>
        <CardDescription className={PROFILE_DESCRIPTION}>
          Brain confidence is tiered by signal ownership and quality.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        {profile.reliabilityTiers.map((tier) => (
          <div
            key={tier.tier}
            className="rounded-[1rem] border border-primary/20 bg-black/30 p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className={CONTROL_KICKER}>
                Tier {tier.tier}: {tier.label}
              </span>
            </div>
            <p className="mt-2 font-mono text-sm leading-6 text-foreground/68">
              {tier.description}
            </p>
          </div>
        ))}
        <div className="rounded-[1rem] border border-primary/20 bg-black/30 p-3">
          <div className={CONTROL_KICKER}>Evidence Summary</div>
          <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-sm leading-6 text-foreground/68">
            {JSON.stringify(profile.evidenceSummary, null, 2)}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}

function ClaimCard({
  claim,
  draft,
  submitting,
  onDraftChange,
  onSubmit,
}: {
  claim: LearnerProfileClaim;
  draft: string;
  submitting: boolean;
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <Card
      key={claim.claimKey}
      className={cn(
        "rounded-[1rem] border-2 bg-black/30",
        signalTone(claim.signalDirection, claim.score),
      )}
      data-testid={`claim-card-${claim.claimKey}`}
    >
      <CardHeader className="border-b border-current/20">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className={PROFILE_TITLE}>{claim.label}</CardTitle>
            <CardDescription className={PROFILE_DESCRIPTION}>
              {claim.explanation}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge
              variant="outline"
              className={`${PROFILE_BADGE} border-current/40 text-current`}
            >
              {claim.valueBand}
            </Badge>
            <Badge
              variant="outline"
              className={`${PROFILE_BADGE} border-current/30 text-current`}
            >
              {claim.confidenceBand}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        <div className="grid gap-3 font-mono text-sm leading-6 text-foreground/68 sm:grid-cols-3">
          <div>
            <div className={CONTROL_KICKER}>Score</div>
            <div>{claim.score.toFixed(2)}</div>
          </div>
          <div>
            <div className={CONTROL_KICKER}>Freshness</div>
            <div className="flex items-center gap-1">
              <Clock3 className="h-3 w-3" />
              {formatFreshness(claim.freshnessDays)}
            </div>
          </div>
          <div>
            <div className={CONTROL_KICKER}>Contradiction</div>
            <div>{claim.contradictionState}</div>
          </div>
        </div>

        <div className="rounded-[1rem] border border-primary/20 bg-black/20 p-3">
          <div className={CONTROL_KICKER}>Recommended Strategy</div>
          <div className={PROFILE_META}>{claim.recommendedStrategy}</div>
        </div>

        <div className="rounded-[1rem] border border-primary/20 bg-black/20 p-3">
          <div className={CONTROL_KICKER}>Evidence</div>
          <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-sm leading-6 text-foreground/68">
            {JSON.stringify(claim.evidence, null, 2)}
          </pre>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 font-arcade text-ui-xs uppercase tracking-[0.22em] text-primary">
            <AlertTriangle className="h-3 w-3" />
            Challenge This Claim
          </div>
          <Textarea
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            placeholder="Tell Brain what it is missing, overstating, or interpreting incorrectly."
            className="min-h-[96px] rounded-[1rem] border-primary/30 bg-black/40 font-mono text-sm leading-6"
            data-testid={`claim-challenge-${claim.claimKey}`}
          />
          <Button
            type="button"
            variant="outline"
            className="rounded-[1rem] font-arcade text-sm tracking-[0.14em]"
            disabled={submitting || !draft.trim()}
            onClick={onSubmit}
          >
            Submit Challenge
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ProfileClaimsSection({
  claims,
  claimDrafts,
  submittingKeys,
  onDraftChange,
  onSubmit,
}: {
  claims: LearnerProfileClaim[];
  claimDrafts: Record<string, string>;
  submittingKeys: Record<string, boolean>;
  onDraftChange: (claimKey: string, value: string) => void;
  onSubmit: (claimKey: string) => void;
}) {
  return (
    <Card className={PROFILE_CARD}>
      <CardHeader className={PROFILE_HEADER}>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <CardTitle className={PROFILE_TITLE}>Profile Claims</CardTitle>
        </div>
        <CardDescription className={PROFILE_DESCRIPTION}>
          These are the factual learner-model claims Brain is currently making.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 pt-4 lg:grid-cols-2">
        {claims.map((claim) => (
          <ClaimCard
            key={claim.claimKey}
            claim={claim}
            draft={claimDrafts[claim.claimKey] || ""}
            submitting={submittingKeys[`claim:${claim.claimKey}`] || false}
            onDraftChange={(value) => onDraftChange(claim.claimKey, value)}
            onSubmit={() => onSubmit(claim.claimKey)}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function CalibrationQuestionsCard({
  questions,
  questionDrafts,
  submittingKeys,
  onDraftChange,
  onSubmit,
}: {
  questions: LearnerProfileQuestion[];
  questionDrafts: Record<number, string>;
  submittingKeys: Record<string, boolean>;
  onDraftChange: (questionId: number, value: string) => void;
  onSubmit: (questionId: number) => void;
}) {
  return (
    <Card className={PROFILE_CARD}>
      <CardHeader className={PROFILE_HEADER}>
        <div className="flex items-center gap-2">
          <MessageSquareQuote className="h-4 w-4 text-primary" />
          <CardTitle className={PROFILE_TITLE}>Calibration Questions</CardTitle>
        </div>
        <CardDescription className={PROFILE_DESCRIPTION}>
          Brain asks these when evidence is weak, mixed, or contradicted.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {questions.length > 0 ? (
          questions.map((question) => (
            <div
              key={question.id}
              className="space-y-3 rounded-[1rem] border border-primary/20 bg-black/30 p-3"
              data-testid={`question-card-${question.id}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className={`${PROFILE_BADGE} border-primary/40 text-primary`}
                >
                  {question.questionType}
                </Badge>
                <Badge
                  variant="outline"
                  className={`${PROFILE_BADGE} border-primary/20 text-foreground/68`}
                >
                  {question.claimKey}
                </Badge>
              </div>
              <div className={CONTROL_COPY}>{question.questionText}</div>
              <div className={PROFILE_META}>{question.rationale}</div>
              <Textarea
                value={questionDrafts[question.id] || ""}
                onChange={(event) =>
                  onDraftChange(question.id, event.target.value)
                }
                placeholder="Answer to calibrate Brain's learner model."
                className="min-h-[96px] rounded-[1rem] border-primary/30 bg-black/40 font-mono text-sm leading-6"
                data-testid={`question-answer-${question.id}`}
              />
              <Button
                type="button"
                variant="outline"
                className="rounded-[1rem] font-arcade text-sm tracking-[0.14em]"
                disabled={
                  submittingKeys[`question:${question.id}`] ||
                  !(questionDrafts[question.id] || "").trim()
                }
                onClick={() => onSubmit(question.id)}
              >
                Save Answer
              </Button>
            </div>
          ))
        ) : (
          <div className={PROFILE_META}>
            No open calibration questions. Brain has enough stable evidence for
            the current profile snapshot.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ProfileTimelineCard({
  history,
}: {
  history: LearnerProfileHistoryItem[];
}) {
  return (
    <Card className={PROFILE_CARD}>
      <CardHeader className={PROFILE_HEADER}>
        <div className="flex items-center gap-2">
          <Clock3 className="h-4 w-4 text-primary" />
          <CardTitle className={PROFILE_TITLE}>Profile Timeline</CardTitle>
        </div>
        <CardDescription className={PROFILE_DESCRIPTION}>
          Wave 1 keeps a visible history of Brain profile snapshots.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        {history.length > 0 ? (
          history.map((item) => (
            <div
              key={item.snapshotId}
              className="rounded-[1rem] border border-primary/20 bg-black/30 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className={CONTROL_KICKER}>{item.archetypeLabel}</div>
                <Badge
                  variant="outline"
                  className={`${PROFILE_BADGE} border-primary/20 text-foreground/68`}
                >
                  snapshot {item.snapshotId}
                </Badge>
              </div>
              <div className="mt-2 font-mono text-sm leading-6 text-foreground/68">
                {item.archetypeSummary}
              </div>
              <div className="mt-2 font-mono text-sm leading-6 text-foreground/56">
                {item.generatedAt}
              </div>
            </div>
          ))
        ) : (
          <div className={PROFILE_META}>No profile history recorded yet.</div>
        )}
      </CardContent>
    </Card>
  );
}

export function LearnerProfilePanel({ workspace }: LearnerProfilePanelProps) {
  const { toast } = useToast();
  const [questionDrafts, setQuestionDrafts] = useState<Record<number, string>>(
    {},
  );
  const [claimDrafts, setClaimDrafts] = useState<Record<string, string>>({});
  const [submittingKeys, setSubmittingKeys] = useState<Record<string, boolean>>(
    {},
  );
  const [refreshing, setRefreshing] = useState(false);

  const profile = workspace.learnerProfile;
  const claims = workspace.learnerProfileClaims;
  const questions = workspace.learnerProfileQuestions;
  const history = workspace.learnerProfileHistory;

  const primaryClaims = useMemo(
    () => [...claims].sort((a, b) => b.confidence - a.confidence),
    [claims],
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await workspace.refreshLearnerProfile();
      toast({
        title: "Brain Profile Refreshed",
        description:
          "Brain recomputed the learner model from current telemetry.",
      });
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description:
          error instanceof Error
            ? error.message
            : "Could not refresh the Brain profile.",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const submitQuestionAnswer = async (questionId: number) => {
    const responseText = (questionDrafts[questionId] || "").trim();
    if (!responseText) return;
    const key = `question:${questionId}`;
    setSubmittingKeys((prev) => ({ ...prev, [key]: true }));
    try {
      await workspace.submitProfileFeedback({
        questionId,
        responseType: "answer",
        responseText,
        source: "ui",
      });
      setQuestionDrafts((prev) => ({ ...prev, [questionId]: "" }));
      toast({
        title: "Calibration Saved",
        description:
          "Brain recorded the answer and updated the learner-profile feedback log.",
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description:
          error instanceof Error
            ? error.message
            : "Could not submit the calibration answer.",
        variant: "destructive",
      });
    } finally {
      setSubmittingKeys((prev) => ({ ...prev, [key]: false }));
    }
  };

  const submitClaimChallenge = async (claimKey: string) => {
    const responseText = (claimDrafts[claimKey] || "").trim();
    if (!responseText) return;
    const key = `claim:${claimKey}`;
    setSubmittingKeys((prev) => ({ ...prev, [key]: true }));
    try {
      await workspace.submitProfileFeedback({
        claimKey,
        responseType: "challenge",
        responseText,
        source: "ui",
      });
      setClaimDrafts((prev) => ({ ...prev, [claimKey]: "" }));
      toast({
        title: "Challenge Recorded",
        description:
          "Brain stored the learner challenge for Scholar and later profile recalibration.",
      });
    } catch (error) {
      toast({
        title: "Challenge Failed",
        description:
          error instanceof Error
            ? error.message
            : "Could not record the claim challenge.",
        variant: "destructive",
      });
    } finally {
      setSubmittingKeys((prev) => ({ ...prev, [key]: false }));
    }
  };

  if (workspace.learnerProfileLoading) {
    return (
      <div
        className="flex h-full items-center justify-center"
        data-testid="learner-profile-loading"
      >
        <div className="font-terminal text-sm text-muted-foreground">
          Loading Brain profile...
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div
        className="flex h-full items-center justify-center"
        data-testid="learner-profile-empty"
      >
        <div className="font-terminal text-sm text-muted-foreground">
          Brain has not generated a learner profile yet.
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex-1 space-y-4 overflow-auto p-4 md:p-5"
      data-testid="learner-profile-panel"
    >
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <ProfileOverviewCard
          profile={profile}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
        <EvidenceOwnershipCard profile={profile} />
      </div>

      <ProfileClaimsSection
        claims={primaryClaims}
        claimDrafts={claimDrafts}
        submittingKeys={submittingKeys}
        onDraftChange={(claimKey, value) =>
          setClaimDrafts((prev) => ({ ...prev, [claimKey]: value }))
        }
        onSubmit={submitClaimChallenge}
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        <CalibrationQuestionsCard
          questions={questions}
          questionDrafts={questionDrafts}
          submittingKeys={submittingKeys}
          onDraftChange={(questionId, value) =>
            setQuestionDrafts((prev) => ({ ...prev, [questionId]: value }))
          }
          onSubmit={submitQuestionAnswer}
        />
        <ProfileTimelineCard history={history} />
      </div>
    </div>
  );
}
