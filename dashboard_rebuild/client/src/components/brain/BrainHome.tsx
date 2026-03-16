import { useEffect, useId, useMemo, useReducer } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { differenceInCalendarDays, format, isToday, isTomorrow } from "date-fns";
import {
  ArrowRight,
  Blocks,
  BookOpen,
  Brain,
  Calendar,
  GraduationCap,
  Shield,
  TrendingUp,
} from "lucide-react";

import { api } from "@/lib/api";
import type {
  AcademicDeadline,
  PlannerTask,
  ProductPrivacySettings,
  ScholarInvestigation,
  ScholarQuestion,
} from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

import type { BrainWorkspace, MainMode } from "./useBrainWorkspace";

type BrainQueueItem = {
  id: string;
  title: string;
  reason: string;
  destination: "/" | "/tutor" | "/calendar" | "/scholar";
  buttonLabel: string;
  rank: number;
  courseName?: string;
  dueDate?: string;
  investigationId?: string;
  questionId?: string;
};

type BrainCourseMetrics = {
  course: string;
  count: number;
  minutes: number;
};

type DateLike = string | Date;
type TutorLaunchMode = "studio" | "tutor" | "schedule" | "publish";

type BrainLaunchContext = {
  source: "brain-home";
  itemId: string;
  title: string;
  reason: string;
  courseName?: string;
  dueDate?: string;
  investigationId?: string;
  questionId?: string;
};

const TUTOR_BRAIN_HANDOFF_KEY = "tutor.open_from_brain.v1";
const SCHOLAR_BRAIN_HANDOFF_KEY = "scholar.open_from_brain.v1";
const CALENDAR_BRAIN_HANDOFF_KEY = "calendar.open_from_brain.v1";

function parseLocalDate(raw: DateLike | null | undefined): Date | null {
  if (!raw) return null;

  if (raw instanceof Date) {
    return Number.isNaN(raw.getTime()) ? null : raw;
  }

  if (typeof raw !== "string") return null;

  const trimmed = raw.trim();
  const dateOnlyMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (dateOnlyMatch) {
    const year = Number.parseInt(dateOnlyMatch[1], 10);
    const monthIndex = Number.parseInt(dateOnlyMatch[2], 10) - 1;
    const day = Number.parseInt(dateOnlyMatch[3], 10);
    return new Date(year, monthIndex, day);
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

const SUPPORT_LINKS = [
  {
    id: "library",
    title: "Library",
    description: "Brain-owned content scope. Choose what Tutor can load.",
    destination: "/library" as const,
    icon: BookOpen,
  },
  {
    id: "mastery",
    title: "Mastery",
    description: "Brain-owned skill state fed by Tutor and study history.",
    destination: "/mastery" as const,
    icon: TrendingUp,
  },
  {
    id: "calendar",
    title: "Calendar",
    description: "Brain-owned obligations and timing pressure.",
    destination: "/calendar" as const,
    icon: Calendar,
  },
  {
    id: "methods",
    title: "Methods",
    description: "Tutor's method library and chain configuration support.",
    destination: "/methods" as const,
    icon: Blocks,
  },
  {
    id: "vault",
    title: "Vault Health",
    description: "Support system for the Brain-owned Obsidian knowledge base.",
    destination: "/vault-health" as const,
    icon: Shield,
  },
] as const;

function formatJsonDownload(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function destinationButtonLabel(destination: BrainQueueItem["destination"]): string {
  switch (destination) {
    case "/tutor":
      return "Open Tutor";
    case "/calendar":
      return "Open Calendar";
    case "/scholar":
      return "Open Scholar";
    default:
      return "Open Brain";
  }
}

function computeDeadlineRank(date: Date | null): number {
  if (!date) return 100;
  if (isToday(date)) return 10;
  const distance = differenceInCalendarDays(date, new Date());
  if (distance < 0) return 5;
  if (distance === 1) return 70;
  return 80;
}

function deadlineReason(date: Date | null): string {
  if (!date) return "Reason: no valid due date.";
  if (isToday(date)) return "Reason: due today.";
  if (differenceInCalendarDays(date, new Date()) < 0) return "Reason: overdue.";
  if (isTomorrow(date)) return "Reason: due tomorrow.";
  return `Reason: due ${format(date, "MMM d")}.`;
}

function plannerReason(date: Date | null): string {
  if (!date) return "Reason: no valid planned date.";
  if (isToday(date)) return "Reason: scheduled for today.";
  if (differenceInCalendarDays(date, new Date()) < 0) return "Reason: past its planned date.";
  if (isTomorrow(date)) return "Reason: scheduled for tomorrow.";
  return `Reason: scheduled for ${format(date, "MMM d")}.`;
}

function getScholarBlocker(
  investigations: ScholarInvestigation[],
  questions: ScholarQuestion[],
): BrainQueueItem | null {
  const openQuestion = questions.find((question) => question.status !== "answered");
  if (openQuestion) {
    return {
      id: `scholar-question-${openQuestion.question_id || openQuestion.id}`,
      title: openQuestion.question_text || openQuestion.question || "Scholar needs input",
      reason: "Reason: Scholar is blocked on learner input.",
      destination: "/scholar",
      buttonLabel: "Open Scholar",
      rank: 60,
      investigationId: openQuestion.linked_investigation_id || undefined,
      questionId: openQuestion.question_id || String(openQuestion.id),
    };
  }

  const blockedInvestigation = investigations.find(
    (investigation) => investigation.status === "blocked",
  );
  if (!blockedInvestigation) return null;

  return {
    id: `scholar-investigation-${blockedInvestigation.investigation_id}`,
    title: blockedInvestigation.title,
    reason: "Reason: Scholar has an unresolved system investigation.",
    destination: "/scholar",
    buttonLabel: "Open Scholar",
    rank: 60,
    investigationId: blockedInvestigation.investigation_id,
  };
}

function getDeadlinePressure(deadlines: AcademicDeadline[]): string {
  const activeDeadlines = deadlines.filter((deadline) => !deadline.completed);
  const urgent = activeDeadlines.filter((deadline) => {
    const date = parseLocalDate(deadline.dueDate);
    if (!date) return false;
    return isToday(date) || differenceInCalendarDays(date, new Date()) < 0;
  }).length;
  if (!activeDeadlines.length) return "clear";
  if (urgent > 0) return `${urgent} urgent`;
  return `${activeDeadlines.length} queued`;
}

function getMasterySnapshot(skills: Array<{ status: string }>): string {
  if (!skills.length) return "no skills tracked";
  const counts = {
    locked: skills.filter((skill) => skill.status === "locked").length,
    available: skills.filter((skill) => skill.status === "available").length,
    mastered: skills.filter((skill) => skill.status === "mastered").length,
  };
  return `${counts.locked} locked / ${counts.available} available / ${counts.mastered} mastered`;
}

function normalizeQueueKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function dedupeQueueItems(items: BrainQueueItem[]): BrainQueueItem[] {
  const deduped = new Map<string, BrainQueueItem>();

  items.forEach((item) => {
    const key = normalizeQueueKey(item.title);
    const existing = deduped.get(key);
    if (!existing || item.rank < existing.rank) {
      deduped.set(key, item);
    }
  });

  return [...deduped.values()].sort((left, right) => {
    if (left.rank !== right.rank) return left.rank - right.rank;
    return left.title.localeCompare(right.title);
  });
}

function buildCourseActionLabel(course: BrainCourseMetrics): string {
  if (course.count <= 1) return "Start next Tutor block";
  if (course.minutes < 180) return "Add another Tutor pass";
  return "Keep the Tutor cadence";
}

function buildTutorPath(courseId?: number | null, mode?: TutorLaunchMode): string {
  const params = new URLSearchParams();
  if (typeof courseId === "number") {
    params.set("course_id", String(courseId));
  }
  if (mode) {
    params.set("mode", mode);
  }
  const query = params.toString();
  return query ? `/tutor?${query}` : "/tutor";
}

type BrainHomeUiState = {
  showOnboarding: boolean;
  showDataRights: boolean;
  onboardingGoal: string;
  onboardingFriction: string;
  onboardingTools: string;
  onboardingBusy: boolean;
  privacyDraft: ProductPrivacySettings;
};

type BrainHomeUiPatch =
  | Partial<BrainHomeUiState>
  | ((state: BrainHomeUiState) => Partial<BrainHomeUiState>);

function createBrainHomeUiState(): BrainHomeUiState {
  return {
    showOnboarding: false,
    showDataRights: false,
    onboardingGoal: "",
    onboardingFriction: "",
    onboardingTools: "",
    onboardingBusy: false,
    privacyDraft: {
      userId: "trey",
      workspaceId: "default",
      retentionDays: 180,
      allowTier2Signals: true,
      allowVaultSignals: true,
      allowCalendarSignals: true,
      allowScholarPersonalization: true,
      allowOutcomeReports: true,
      updatedAt: new Date().toISOString(),
    },
  };
}

function brainHomeUiReducer(
  state: BrainHomeUiState,
  patch: BrainHomeUiPatch,
): BrainHomeUiState {
  const nextPatch = typeof patch === "function" ? patch(state) : patch;
  return { ...state, ...nextPatch };
}

function useBrainHomeContent({ workspace }: { workspace: BrainWorkspace }) {
  const idBase = useId();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [uiState, patchUiState] = useReducer(
    brainHomeUiReducer,
    undefined,
    createBrainHomeUiState,
  );
  const {
    showOnboarding,
    showDataRights,
    onboardingGoal,
    onboardingFriction,
    onboardingTools,
    onboardingBusy,
    privacyDraft,
  } = uiState;

  const { data: currentCourseData } = useQuery({
    queryKey: ["brain-home", "study-wheel"],
    queryFn: () => api.studyWheel.getCurrentCourse(),
    staleTime: 60 * 1000,
  });

  const { data: todaySessions = [] } = useQuery({
    queryKey: ["brain-home", "today-sessions"],
    queryFn: () => api.todaySessions.get(),
    staleTime: 60 * 1000,
  });

  const { data: streakData } = useQuery({
    queryKey: ["brain-home", "streak"],
    queryFn: () => api.streak.get(),
    staleTime: 60 * 1000,
  });

  const { data: plannerQueue = [] } = useQuery({
    queryKey: ["brain-home", "planner-queue"],
    queryFn: () => api.planner.getQueue(),
    staleTime: 60 * 1000,
  });

  const { data: deadlines = [] } = useQuery({
    queryKey: ["brain-home", "academic-deadlines"],
    queryFn: () => api.academicDeadlines.getAll(),
    staleTime: 60 * 1000,
  });

  const { data: weaknessQueue = [] } = useQuery({
    queryKey: ["brain-home", "weakness-queue"],
    queryFn: () => api.weaknessQueue.get(),
    staleTime: 60 * 1000,
  });

  const { data: scholarInvestigations = [] } = useQuery({
    queryKey: ["brain-home", "scholar-investigations"],
    queryFn: () => api.scholar.getInvestigations(20),
    staleTime: 60 * 1000,
  });

  const { data: scholarQuestions = [] } = useQuery({
    queryKey: ["brain-home", "scholar-questions"],
    queryFn: () => api.scholar.getQuestions("all", 50),
    staleTime: 60 * 1000,
  });

  const { data: productAnalytics } = useQuery({
    queryKey: ["brain-home", "product-analytics"],
    queryFn: () => api.product.getAnalytics(),
    staleTime: 60 * 1000,
  });

  const { data: privacySettings } = useQuery({
    queryKey: ["brain-home", "product-privacy"],
    queryFn: () => api.product.getPrivacySettings(),
    staleTime: 60 * 1000,
  });

  const {
    data: masteryDashboard,
    isLoading: masteryLoading,
    isError: masteryHasError,
  } = useQuery({
    queryKey: ["brain-home", "mastery-dashboard"],
    queryFn: () => api.mastery.getDashboard(),
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem("tss.onboarding.v1");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      patchUiState({
        onboardingGoal: parsed.goal || "",
        onboardingFriction: parsed.friction || "",
        onboardingTools: parsed.tools || "",
      });
    } catch {
      // ignore corrupted onboarding cache
    }
  }, []);

  useEffect(() => {
    if (!privacySettings) return;
    patchUiState({ privacyDraft: privacySettings });
  }, [privacySettings]);

  const updatePrivacyMutation = useMutation({
    mutationFn: () => api.product.updatePrivacySettings(privacyDraft),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brain-home", "product-privacy"] });
      toast.success("Privacy settings saved");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Could not save privacy settings.");
    },
  });

  const resetPersonalizationMutation = useMutation({
    mutationFn: () => api.product.resetPersonalization(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brain-home", "product-analytics"] });
      queryClient.invalidateQueries({ queryKey: ["brain-home", "product-privacy"] });
      toast.success("Personalization reset");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Could not reset personalization.");
    },
  });

  const learnerProfile = workspace.learnerProfile;
  const learnerProfileWithConfidence = learnerProfile as typeof learnerProfile & {
    hybridArchetype?: { confidence?: string };
  };
  const todayMinutes = todaySessions.reduce((sum, session) => sum + (session.minutes || 0), 0);
  const hasStudiedToday = todaySessions.length > 0;
  const currentCourse = currentCourseData?.currentCourse;
  const masterySkills = masteryDashboard?.skills || [];
  const courseIdByName = useMemo(() => {
    const mapping = new Map<string, number>();

    if (currentCourse?.name && typeof currentCourse.id === "number") {
      mapping.set(normalizeQueueKey(currentCourse.name), currentCourse.id);
    }

    plannerQueue.forEach((task: PlannerTask) => {
      if (task.course_name && typeof task.course_id === "number") {
        const key = normalizeQueueKey(task.course_name);
        if (!mapping.has(key)) {
          mapping.set(key, task.course_id);
        }
      }
    });

    return mapping;
  }, [currentCourse?.id, currentCourse?.name, plannerQueue]);

  const queueItems = useMemo<BrainQueueItem[]>(() => {
    const items: BrainQueueItem[] = [];

    deadlines
      .filter((deadline) => !deadline.completed)
      .forEach((deadline) => {
        const date = parseLocalDate(deadline.dueDate);
        items.push({
          id: `deadline-${deadline.id}`,
          title: deadline.title,
          reason: deadlineReason(date),
          destination: "/calendar",
          buttonLabel: destinationButtonLabel("/calendar"),
          rank: computeDeadlineRank(date),
          courseName: deadline.course ?? undefined,
          dueDate: deadline.dueDate,
        });
      });

    plannerQueue.forEach((task: PlannerTask) => {
      if (!task.scheduled_date || task.status === "completed") return;
      const date = parseLocalDate(task.scheduled_date);
      items.push({
        id: `planner-${task.id}`,
        title: task.anchor_text || task.notes || "Planned study task",
        reason: plannerReason(date),
        destination: "/tutor",
        buttonLabel: destinationButtonLabel("/tutor"),
        rank: computeDeadlineRank(date) + 10,
        courseName: task.course_name ?? undefined,
        dueDate: task.scheduled_date || undefined,
      });
    });

    if (!hasStudiedToday) {
      const streak = streakData?.currentStreak || 0;
      items.push({
        id: "study-today",
        title: `Keep your ${streak}-day streak alive`,
        reason: "Reason: no study session has been logged today.",
        destination: "/tutor",
        buttonLabel: destinationButtonLabel("/tutor"),
        rank: 30,
        courseName: currentCourse?.name,
      });
    }

    const nextBestAction = learnerProfile?.profileSummary?.nextBestActions?.[0];
    if (nextBestAction) {
      items.push({
        id: "brain-next-action",
        title: nextBestAction,
        reason: "Reason: Brain marked this as the highest-leverage next move.",
        destination: "/tutor",
        buttonLabel: destinationButtonLabel("/tutor"),
        rank: 40,
        courseName: currentCourse?.name,
      });
    }

    if (weaknessQueue[0]) {
      items.push({
        id: `weakness-${weaknessQueue[0].id}`,
        title: weaknessQueue[0].topic,
        reason: `Reason: ${weaknessQueue[0].reason || "Brain flagged this as a weak point."}`,
        destination: "/tutor",
        buttonLabel: destinationButtonLabel("/tutor"),
        rank: 50,
        courseName: currentCourse?.name,
      });
    }

    const scholarBlocker = getScholarBlocker(scholarInvestigations, scholarQuestions);
    if (scholarBlocker) {
      items.push(scholarBlocker);
    }

    return dedupeQueueItems(items);
  }, [
    deadlines,
    hasStudiedToday,
    learnerProfile?.profileSummary?.nextBestActions,
    plannerQueue,
    currentCourse?.name,
    scholarInvestigations,
    scholarQuestions,
    streakData?.currentStreak,
    weaknessQueue,
  ]);

  const courseBreakdown = workspace.metrics?.sessionsPerCourse || [];
  const topCourse = courseBreakdown[0];
  const plannerProject = useMemo(() => {
    const nextPlannedTask = plannerQueue.find((task: PlannerTask) => {
      if (task.status === "completed") return false;
      if (!task.scheduled_date) return false;

      const courseId =
        typeof task.course_id === "number"
          ? task.course_id
          : task.course_name
            ? courseIdByName.get(normalizeQueueKey(task.course_name))
            : undefined;

      return typeof courseId === "number";
    });

    if (!nextPlannedTask) return null;

    const courseId =
      typeof nextPlannedTask.course_id === "number"
        ? nextPlannedTask.course_id
        : nextPlannedTask.course_name
          ? courseIdByName.get(normalizeQueueKey(nextPlannedTask.course_name))
          : undefined;

    if (typeof courseId !== "number") return null;

    return {
      courseId,
      courseName: nextPlannedTask.course_name || currentCourse?.name || "Planned course",
      scheduledDate: nextPlannedTask.scheduled_date || undefined,
      title: nextPlannedTask.anchor_text || nextPlannedTask.notes || "Next planned study block",
    };
  }, [courseIdByName, currentCourse?.name, plannerQueue]);
  const deadlineProject = useMemo(() => {
    const upcomingDeadline = deadlines
      .filter((deadline) => !deadline.completed)
      .map((deadline) => {
        const date = parseLocalDate(deadline.dueDate);
        const courseId = deadline.course ? courseIdByName.get(normalizeQueueKey(deadline.course)) : undefined;
        return { deadline, date, courseId };
      })
      .filter((entry) => typeof entry.courseId === "number")
      .sort((left, right) => {
        const leftRank = computeDeadlineRank(left.date);
        const rightRank = computeDeadlineRank(right.date);
        if (leftRank !== rightRank) return leftRank - rightRank;
        return left.deadline.title.localeCompare(right.deadline.title);
      })[0];

    if (!upcomingDeadline || typeof upcomingDeadline.courseId !== "number") return null;

    return {
      courseId: upcomingDeadline.courseId,
      courseName: upcomingDeadline.deadline.course || currentCourse?.name || "Deadline course",
      dueDate: upcomingDeadline.deadline.dueDate,
      title: upcomingDeadline.deadline.title,
    };
  }, [courseIdByName, currentCourse?.name, deadlines]);
  const studyRotationSummary = topCourse
    ? `Stay on ${topCourse.course} until the next block is complete.`
    : "Launch Tutor from your last saved scope";
  const masteryHeadline = masteryLoading
    ? "Loading mastery state..."
    : masteryHasError
      ? "Mastery state unavailable right now"
      : getMasterySnapshot(masterySkills);
  const masteryDetail = masteryLoading
    ? "Brain is waiting on the mastery dashboard response."
    : masteryHasError
      ? "Brain kept the home layout stable while the mastery API failed."
      : `${masteryDashboard?.count || 0} tracked skill(s)`;

async function handleDownloadJson(
    filename: string,
    fetcher: () => Promise<unknown>,
  ) {
    try {
      const payload = await fetcher();
      formatJsonDownload(filename, payload);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed.");
    }
  }

  async function completeOnboarding() {
    if (!onboardingGoal.trim() || !onboardingFriction.trim()) {
      toast.error("Add your goal and biggest friction first.");
      return;
    }
    patchUiState({ onboardingBusy: true });
    try {
      const payload = {
        goal: onboardingGoal.trim(),
        friction: onboardingFriction.trim(),
        tools: onboardingTools.trim(),
        completedAt: new Date().toISOString(),
      };
      localStorage.setItem("tss.onboarding.v1", JSON.stringify(payload));
      await api.product.logEvent({
        eventType: "onboarding_completed",
        source: "brain.home",
        metadata: payload,
      });
      await api.scholar.createInvestigation({
        query_text: `Research a study strategy for a learner whose main goal is "${payload.goal}" and whose biggest friction is "${payload.friction}". Current tools/workflow: ${payload.tools || "not specified"}.`,
        rationale: "First-run setup should give Scholar a grounded starting investigation for this learner.",
        audience_type: "system",
        mode: "brain",
        requested_by: "brain_home",
      });
      queryClient.invalidateQueries({ queryKey: ["brain-home", "product-analytics"] });
      queryClient.invalidateQueries({ queryKey: ["brain-home", "scholar-investigations"] });
      patchUiState({ showOnboarding: false });
      toast.success("Setup saved and Scholar started an investigation.");
    } catch (error) {
      toast.warning(
        error instanceof Error
          ? error.message
          : "Setup saved locally, but Scholar could not start the investigation.",
      );
      patchUiState({ showOnboarding: false });
    } finally {
      patchUiState({ onboardingBusy: false });
    }
  }

  function buildLaunchContext(item: BrainQueueItem): BrainLaunchContext {
    return {
      source: "brain-home",
      itemId: item.id,
      title: item.title,
      reason: item.reason,
      courseName: item.courseName,
      dueDate: item.dueDate,
      investigationId: item.investigationId,
      questionId: item.questionId,
    };
  }

  function openSupportPage(path: string, handoffContext?: BrainLaunchContext) {
    const destination = path.split("?")[0] || path;
    try {
      sessionStorage.removeItem(TUTOR_BRAIN_HANDOFF_KEY);
      sessionStorage.removeItem(SCHOLAR_BRAIN_HANDOFF_KEY);
      sessionStorage.removeItem(CALENDAR_BRAIN_HANDOFF_KEY);
      if (handoffContext) {
        if (destination === "/tutor") {
          sessionStorage.setItem(TUTOR_BRAIN_HANDOFF_KEY, JSON.stringify(handoffContext));
        } else if (destination === "/scholar") {
          sessionStorage.setItem(SCHOLAR_BRAIN_HANDOFF_KEY, JSON.stringify(handoffContext));
        } else if (destination === "/calendar") {
          sessionStorage.setItem(CALENDAR_BRAIN_HANDOFF_KEY, JSON.stringify(handoffContext));
        }
      }
    } catch {
      // ignore sessionStorage failures
    }
    setLocation(path);
  }

  function openBrainTool(mode: MainMode) {
    workspace.setMainMode(mode);
  }

  return (
    <div data-testid="brain-home" className="h-full overflow-y-auto px-4 py-4 md:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <Card className="rounded-none border-primary/30 bg-black/45">
          <CardHeader className="border-b border-primary/20">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <div className="font-arcade text-xs text-primary/80">BRAIN HOME</div>
                <CardTitle className="font-arcade text-lg text-white">
                  Brain runs the dashboard. Tutor runs the live work.
                </CardTitle>
                <p className="max-w-3xl font-terminal text-sm text-muted-foreground">
                  Start from obligations and study risk, then move straight into Tutor. Scholar stays visible here
                  only when a blocked investigation directly affects Brain or Tutor.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  data-testid="brain-open-tutor-primary"
                  className="rounded-none font-arcade text-xs"
                  onClick={() =>
                    openSupportPage(buildTutorPath(currentCourse?.id), {
                      source: "brain-home",
                      itemId: "brain-primary-tutor",
                      title: currentCourse?.name
                        ? `Start ${currentCourse.name} in Tutor`
                        : "Start Tutor session",
                      reason: "Reason: Brain is handing you into the live study surface.",
                      courseName: currentCourse?.name,
                    })
                  }
                >
                  OPEN TUTOR
                </Button>
                <Button
                  type="button"
                  data-testid="brain-open-profile-primary"
                  variant="outline"
                  className="rounded-none border-primary/40 font-arcade text-xs"
                  onClick={() => openBrainTool("profile")}
                >
                  OPEN PROFILE
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 p-4 md:grid-cols-3">
            <div className="border border-primary/20 bg-black/35 p-3">
              <div className="font-arcade text-[11px] text-primary">CURRENT COURSE</div>
              <div className="mt-2 font-terminal text-sm text-white">
                {currentCourse?.name || "No course selected"}
              </div>
              <div className="mt-1 font-terminal text-[11px] text-muted-foreground">
                {currentCourse?.code || "Tutor will still launch with your saved materials."}
              </div>
            </div>
            <div className="border border-primary/20 bg-black/35 p-3">
              <div className="font-arcade text-[11px] text-primary">LEARNER STATE</div>
              <div className="mt-2 font-terminal text-sm text-white">
                {learnerProfile?.hybridArchetype?.label || "No stable Brain archetype yet"}
              </div>
              <div className="mt-1 font-terminal text-[11px] text-muted-foreground">
                {learnerProfile?.profileSummary?.headline || "Brain is still building a stable learner summary."}
              </div>
            </div>
            <div className="border border-primary/20 bg-black/35 p-3">
              <div className="font-arcade text-[11px] text-primary">SCHOLAR STATUS</div>
              <div className="mt-2 font-terminal text-sm text-white">
                {scholarInvestigations[0]?.title || "No active investigation"}
              </div>
              <div className="mt-1 font-terminal text-[11px] text-muted-foreground">
                {scholarQuestions.length > 0
                  ? `${scholarQuestions.length} question(s) waiting on input.`
                  : "No direct Scholar blockers right now."}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="brain-attention-queue" className="rounded-none border-primary/30 bg-black/45">
          <CardHeader className="border-b border-primary/20">
            <CardTitle className="font-arcade text-sm text-primary">WHAT NEEDS ATTENTION NOW</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4">
            {queueItems.length === 0 ? (
              <div className="border border-primary/15 bg-black/30 p-4 font-terminal text-sm text-muted-foreground">
                No urgent obligations or study-risk triggers right now.
              </div>
            ) : (
              queueItems.map((item) => (
                <div
                  key={item.id}
                  data-testid="brain-queue-item"
                  className="flex flex-col gap-3 border border-primary/15 bg-black/30 p-4 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="space-y-1">
                    <div className="font-terminal text-sm text-white">{item.title}</div>
                    <div className="font-terminal text-xs text-muted-foreground">{item.reason}</div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-none border-primary/40 font-arcade text-xs"
                    data-testid={`brain-queue-action-${item.id}`}
                    onClick={() => openSupportPage(item.destination, buildLaunchContext(item))}
                  >
                    {item.buttonLabel}
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 xl:grid-cols-2">
          <Card data-testid="brain-stats-performance" className="rounded-none border-primary/30 bg-black/45">
            <CardHeader className="border-b border-primary/20">
              <CardTitle className="font-arcade text-sm text-primary">PERFORMANCE / HEALTH</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 p-4 md:grid-cols-2">
              <div className="border border-primary/15 bg-black/30 p-3">
                <div className="font-arcade text-[11px] text-primary">BRAIN CONFIDENCE</div>
                <div className="mt-2 font-terminal text-sm text-white">
                  {learnerProfileWithConfidence?.hybridArchetype?.confidence || "low"}
                </div>
                <div className="mt-1 font-terminal text-[11px] text-muted-foreground">
                  {learnerProfile?.hybridArchetype?.label || "No active archetype"}
                </div>
              </div>
              <div className="border border-primary/15 bg-black/30 p-3">
                <div className="font-arcade text-[11px] text-primary">WEAK POINTS</div>
                <div className="mt-2 font-terminal text-sm text-white">
                  {weaknessQueue.length} active weak points
                </div>
                <div className="mt-1 font-terminal text-[11px] text-muted-foreground">
                  {weaknessQueue[0]?.topic || "No flagged topics right now."}
                </div>
              </div>
              <div className="border border-primary/15 bg-black/30 p-3">
                <div className="font-arcade text-[11px] text-primary">DEADLINE PRESSURE</div>
                <div className="mt-2 font-terminal text-sm text-white">{getDeadlinePressure(deadlines)}</div>
                <div className="mt-1 font-terminal text-[11px] text-muted-foreground">
                  {deadlines.filter((deadline) => !deadline.completed).length} active deadline(s)
                </div>
              </div>
              <div className="border border-primary/15 bg-black/30 p-3">
                <div className="font-arcade text-[11px] text-primary">MASTERY SNAPSHOT</div>
                <div data-testid="brain-mastery-headline" className="mt-2 font-terminal text-sm text-white">
                  {masteryHeadline}
                </div>
                <div
                  data-testid="brain-mastery-detail"
                  className="mt-1 font-terminal text-[11px] text-muted-foreground"
                >
                  {masteryDetail}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="brain-stats-activity" className="rounded-none border-primary/30 bg-black/45">
            <CardHeader className="border-b border-primary/20">
              <CardTitle className="font-arcade text-sm text-primary">ACTIVITY / OUTPUT</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 p-4 md:grid-cols-2">
              <div className="border border-primary/15 bg-black/30 p-3">
                <div className="font-arcade text-[11px] text-primary">TODAY</div>
                <div className="mt-2 font-terminal text-sm text-white">{todaySessions.length} sessions</div>
                <div className="mt-1 font-terminal text-[11px] text-muted-foreground">
                  {hasStudiedToday ? `${todayMinutes} minutes logged today.` : "No session logged today yet."}
                </div>
              </div>
              <div className="border border-primary/15 bg-black/30 p-3">
                <div className="font-arcade text-[11px] text-primary">STREAK</div>
                <div className="mt-2 font-terminal text-sm text-white">
                  {streakData?.currentStreak || 0} day streak
                </div>
                <div className="mt-1 font-terminal text-[11px] text-muted-foreground">
                  Longest: {streakData?.longestStreak || 0}
                </div>
              </div>
              <div className="border border-primary/15 bg-black/30 p-3">
                <div className="font-arcade text-[11px] text-primary">SESSIONS</div>
                <div className="mt-2 font-terminal text-sm text-white">
                  {workspace.metrics?.totalSessions || 0} total sessions
                </div>
                <div className="mt-1 font-terminal text-[11px] text-muted-foreground">
                  {workspace.metrics?.totalMinutes || 0} total minutes logged
                </div>
              </div>
              <div className="border border-primary/15 bg-black/30 p-3">
                <div className="font-arcade text-[11px] text-primary">OUTPUTS</div>
                <div className="mt-2 font-terminal text-sm text-white">
                  {workspace.metrics?.totalCards || 0} cards captured
                </div>
                <div className="mt-1 font-terminal text-[11px] text-muted-foreground">
                  {productAnalytics?.engagement?.tutorSessionsCompleted30d || 0} Tutor completions in 30 days
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <Card data-testid="brain-course-breakdown" className="rounded-none border-primary/30 bg-black/45">
            <CardHeader className="border-b border-primary/20">
              <CardTitle className="font-arcade text-sm text-primary">COURSE BREAKDOWN</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4">
              {courseBreakdown.length ? (
                courseBreakdown.map((course) => (
                  <div
                    key={course.course}
                    data-testid="brain-course-breakdown-item"
                    className="flex flex-col gap-3 border border-primary/15 bg-black/30 px-3 py-3 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <div className="font-terminal text-sm text-white">{course.course}</div>
                      <div className="mt-1 font-terminal text-[11px] text-muted-foreground">
                        {course.count} sessions / {course.minutes} min
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="font-terminal text-[11px] text-muted-foreground">
                        {buildCourseActionLabel(course)}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-none border-primary/40 font-arcade text-[10px]"
                        onClick={() =>
                          openSupportPage(
                            buildTutorPath(courseIdByName.get(normalizeQueueKey(course.course))),
                            {
                              source: "brain-home",
                              itemId: `course-breakdown-${normalizeQueueKey(course.course).replace(/\s+/g, "-")}`,
                              title: `Open ${course.course} from Brain`,
                              reason: "Reason: Brain is routing your next live block from course history.",
                              courseName: course.course,
                            },
                          )
                        }
                      >
                        OPEN TUTOR
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="border border-primary/15 bg-black/30 p-4 font-terminal text-sm text-muted-foreground">
                  Brain does not have course session history yet.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-none border-primary/30 bg-black/45">
            <CardHeader className="border-b border-primary/20">
              <CardTitle className="font-arcade text-sm text-primary">LEARNER STATE</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="rounded-none border-primary/40 text-[10px]">
                    {learnerProfileWithConfidence?.hybridArchetype?.confidence || "low"} confidence
                  </Badge>
                  <div className="font-terminal text-sm text-white">
                    {learnerProfile?.hybridArchetype?.label || "No active learner pattern"}
                  </div>
                </div>
                <p className="font-terminal text-xs text-muted-foreground">
                  {learnerProfile?.hybridArchetype?.summary || "Brain is still learning your pattern."}
                </p>
              </div>
              <div className="space-y-2">
                <div className="font-arcade text-[11px] text-primary">STRENGTHS</div>
                <div className="font-terminal text-xs text-muted-foreground">
                  {learnerProfile?.profileSummary?.strengths?.[0] || "No stable strengths identified yet."}
                </div>
              </div>
              <div className="space-y-2">
                <div className="font-arcade text-[11px] text-primary">WATCHOUTS</div>
                <div className="font-terminal text-xs text-muted-foreground">
                  {learnerProfile?.profileSummary?.watchouts?.[0] || "No major watchouts reported yet."}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  data-testid="brain-open-profile-tool"
                  variant="outline"
                  className="rounded-none border-primary/40 font-arcade text-xs"
                  onClick={() => openBrainTool("profile")}
                >
                  OPEN PROFILE
                </Button>
                <Button
                  type="button"
                  data-testid="brain-open-tutor-from-state"
                  variant="outline"
                  className="rounded-none border-primary/40 font-arcade text-xs"
                  onClick={() =>
                    openSupportPage(buildTutorPath(currentCourse?.id), {
                      source: "brain-home",
                      itemId: "brain-state-tutor",
                      title: learnerProfile?.profileSummary?.nextBestActions?.[0] || "Open Tutor workspace",
                      reason: "Reason: Brain hands live note, canvas, and graph work off to Tutor.",
                      courseName: currentCourse?.name,
                    })
                  }
                >
                  OPEN TUTOR WORKSPACE
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <Card data-testid="brain-study-rotation" className="rounded-none border-primary/30 bg-black/45">
            <CardHeader className="border-b border-primary/20">
              <CardTitle className="font-arcade text-sm text-primary">PROJECTS DASHBOARD</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4">
              <div className="border border-primary/15 bg-black/30 p-3">
                <div className="font-arcade text-[11px] text-primary">UP NEXT</div>
                <div className="mt-2 font-terminal text-sm text-white">
                  {currentCourse?.name || "Launch Tutor from your last saved scope"}
                </div>
                <div className="mt-1 font-terminal text-[11px] text-muted-foreground">
                  {studyRotationSummary}
                </div>
              </div>
              <div className="grid gap-3">
                <div
                  data-testid="brain-project-launch-item-current-course"
                  className="border border-primary/15 bg-black/30 p-3"
                >
                  <div className="font-arcade text-[11px] text-primary">CURRENT COURSE SHELL</div>
                  <div className="mt-2 font-terminal text-sm text-white">
                    {currentCourse?.name || "Last saved Tutor scope"}
                  </div>
                  <div className="mt-1 font-terminal text-[11px] text-muted-foreground">
                    {currentCourse?.code
                      ? `Launch the course-keyed Tutor shell for ${currentCourse.code}.`
                      : "Launch Tutor with the most recent saved scope if no course is active."}
                  </div>
                  <Button
                    type="button"
                    data-testid="brain-project-launch-action-current-course"
                    className="mt-3 rounded-none font-arcade text-xs"
                    onClick={() =>
                      openSupportPage(buildTutorPath(currentCourse?.id), {
                        source: "brain-home",
                        itemId: "project-current-course",
                        title: currentCourse?.name
                          ? `Open ${currentCourse.name} course shell`
                          : "Open Tutor from Brain projects",
                        reason: "Reason: Brain is opening the course-backed Tutor shell.",
                        courseName: currentCourse?.name,
                      })
                    }
                  >
                    OPEN COURSE SHELL
                  </Button>
                </div>

                {plannerProject ? (
                  <div
                    data-testid="brain-project-launch-item-planner"
                    className="border border-primary/15 bg-black/30 p-3"
                  >
                    <div className="font-arcade text-[11px] text-primary">PLANNER FOLLOW-THROUGH</div>
                    <div className="mt-2 font-terminal text-sm text-white">{plannerProject.title}</div>
                    <div className="mt-1 font-terminal text-[11px] text-muted-foreground">
                      {plannerProject.courseName}
                      {plannerProject.scheduledDate ? ` · ${plannerReason(parseLocalDate(plannerProject.scheduledDate))}` : ""}
                    </div>
                    <Button
                      type="button"
                      data-testid="brain-project-launch-action-planner"
                      variant="outline"
                      className="mt-3 rounded-none border-primary/40 font-arcade text-xs"
                      onClick={() =>
                        openSupportPage(buildTutorPath(plannerProject.courseId, "tutor"), {
                          source: "brain-home",
                          itemId: "project-planner-follow-through",
                          title: plannerProject.title,
                          reason: "Reason: Brain is converting the planner queue into a live Tutor launch.",
                          courseName: plannerProject.courseName,
                          dueDate: plannerProject.scheduledDate,
                        })
                      }
                    >
                      OPEN PLANNER VIEW
                    </Button>
                  </div>
                ) : null}

                {deadlineProject ? (
                  <div
                    data-testid="brain-project-launch-item-deadline"
                    className="border border-primary/15 bg-black/30 p-3"
                  >
                    <div className="font-arcade text-[11px] text-primary">DEADLINE PRESSURE</div>
                    <div className="mt-2 font-terminal text-sm text-white">{deadlineProject.title}</div>
                    <div className="mt-1 font-terminal text-[11px] text-muted-foreground">
                      {deadlineProject.courseName}
                      {deadlineProject.dueDate ? ` · ${deadlineReason(parseLocalDate(deadlineProject.dueDate))}` : ""}
                    </div>
                    <Button
                      type="button"
                      data-testid="brain-project-launch-action-deadline"
                      variant="outline"
                      className="mt-3 rounded-none border-primary/40 font-arcade text-xs"
                      onClick={() =>
                        openSupportPage(buildTutorPath(deadlineProject.courseId, "schedule"), {
                          source: "brain-home",
                          itemId: "project-deadline-pressure",
                          title: deadlineProject.title,
                          reason: "Reason: Brain is routing deadline pressure into the live Tutor shell.",
                          courseName: deadlineProject.courseName,
                          dueDate: deadlineProject.dueDate,
                        })
                      }
                    >
                      OPEN DEADLINE VIEW
                    </Button>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card data-testid="brain-support-launches" className="rounded-none border-primary/30 bg-black/45">
            <CardHeader className="border-b border-primary/20">
              <CardTitle className="font-arcade text-sm text-primary">SUPPORT SYSTEMS</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
              {SUPPORT_LINKS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="border border-primary/15 bg-black/30 p-3 text-left transition-colors hover:border-primary/40 hover:bg-black/40"
                  data-testid={`brain-support-open-${item.id}`}
                  onClick={() => openSupportPage(item.destination)}
                >
                  <div className="flex items-center gap-2">
                    <item.icon className="h-4 w-4 text-primary" />
                    <div className="font-arcade text-xs text-white">{item.title}</div>
                  </div>
                  <div className="mt-2 font-terminal text-[11px] text-muted-foreground">
                    {item.description}
                  </div>
                  <div className="mt-3 flex items-center gap-1 font-arcade text-[10px] text-primary">
                    OPEN {item.title.toUpperCase()}
                    <ArrowRight className="h-3 w-3" />
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card data-testid="brain-system-setup" className="rounded-none border-primary/30 bg-black/45">
          <CardHeader className="border-b border-primary/20">
            <CardTitle className="font-arcade text-sm text-primary">SYSTEM / SETUP</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 p-4 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-3">
              <div className="border border-primary/15 bg-black/30 p-3">
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-primary" />
                  <div className="font-arcade text-xs text-primary">FIRST-RUN SETUP</div>
                </div>
                <div className="mt-2 font-terminal text-xs text-muted-foreground">
                  Capture your goal and current friction so Scholar starts from a grounded hypothesis.
                </div>
                <div className="mt-2 font-terminal text-[11px] text-white">
                  {productAnalytics?.activation?.onboardingCompleted
                    ? "Setup completed."
                    : "Setup still needs a first pass."}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3 rounded-none border-primary/40 font-arcade text-xs"
                  onClick={() => patchUiState({ showOnboarding: true })}
                >
                  OPEN SETUP
                </Button>
              </div>
              <div className="border border-primary/15 bg-black/30 p-3">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-primary" />
                  <div className="font-arcade text-xs text-primary">DATA RIGHTS + PRIVACY</div>
                </div>
                <div className="mt-2 font-terminal text-xs text-muted-foreground">
                  Export Brain/Scholar data and control what signals shape personalization.
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3 rounded-none border-primary/40 font-arcade text-xs"
                  onClick={() => patchUiState({ showDataRights: true })}
                >
                  OPEN DATA RIGHTS
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="border border-primary/15 bg-black/30 p-3">
                <div className="font-arcade text-xs text-primary">HOW THE TRIAD WORKS</div>
                <ul className="mt-2 space-y-1 font-terminal text-xs text-muted-foreground">
                  <li>- Brain owns the dashboard, learner model, and support systems.</li>
                  <li>- Tutor owns the live study workspace and artifact output.</li>
                  <li>- Scholar investigates system questions and only surfaces here when it directly applies.</li>
                </ul>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="border border-primary/15 bg-black/30 p-3">
                  <div className="font-arcade text-[11px] text-primary">BRAIN EXPORT</div>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-3 rounded-none border-primary/40 font-arcade text-xs"
                    onClick={() => void handleDownloadJson("brain-profile-export.json", api.brain.exportProfile)}
                  >
                    EXPORT BRAIN
                  </Button>
                </div>
                <div className="border border-primary/15 bg-black/30 p-3">
                  <div className="font-arcade text-[11px] text-primary">SCHOLAR EXPORT</div>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-3 rounded-none border-primary/40 font-arcade text-xs"
                    onClick={() => void handleDownloadJson("scholar-research-export.json", api.scholar.exportResearch)}
                  >
                    EXPORT SCHOLAR
                  </Button>
                </div>
                <div className="border border-primary/15 bg-black/30 p-3">
                  <div className="font-arcade text-[11px] text-primary">OUTCOME REPORT</div>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!privacyDraft.allowOutcomeReports}
                    className="mt-3 rounded-none border-primary/40 font-arcade text-xs"
                    onClick={() =>
                      void handleDownloadJson(
                        "brain-scholar-tutor-outcome-report.json",
                        api.product.getOutcomeReport,
                      )
                    }
                  >
                    EXPORT OUTCOME
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showOnboarding} onOpenChange={(open) => patchUiState({ showOnboarding: open })}>
        <DialogContent className="rounded-none border-2 border-primary bg-black">
          <DialogHeader>
            <DialogTitle className="font-arcade text-primary">FIRST-RUN SETUP</DialogTitle>
            <DialogDescription className="font-terminal text-xs text-muted-foreground">
              Give Brain and Scholar enough context to start from your real goal instead of guessing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label htmlFor={`${idBase}-onboarding-goal`} className="mb-1 block font-terminal text-xs text-muted-foreground">Main goal</label>
              <Input
                id={`${idBase}-onboarding-goal`}
                value={onboardingGoal}
                onChange={(event) => patchUiState({ onboardingGoal: event.target.value })}
                placeholder="What are you trying to get better at right now?"
                className="rounded-none border-secondary bg-black font-terminal"
              />
            </div>
            <div>
              <label htmlFor={`${idBase}-onboarding-friction`} className="mb-1 block font-terminal text-xs text-muted-foreground">Biggest friction</label>
              <Textarea
                id={`${idBase}-onboarding-friction`}
                value={onboardingFriction}
                onChange={(event) => patchUiState({ onboardingFriction: event.target.value })}
                placeholder="What usually breaks your learning loop?"
                className="min-h-[96px] rounded-none border-secondary bg-black font-terminal"
              />
            </div>
            <div>
              <label htmlFor={`${idBase}-onboarding-tools`} className="mb-1 block font-terminal text-xs text-muted-foreground">
                Current tools / workflow
              </label>
              <Input
                id={`${idBase}-onboarding-tools`}
                value={onboardingTools}
                onChange={(event) => patchUiState({ onboardingTools: event.target.value })}
                placeholder="Obsidian, Anki, lecture PDFs, Blackboard, handwritten notes..."
                className="rounded-none border-secondary bg-black font-terminal"
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="font-terminal text-[11px] text-muted-foreground">
                Completing setup saves these answers locally and starts a Scholar investigation.
              </div>
              <Button
                type="button"
                className="rounded-none font-arcade text-xs"
                disabled={onboardingBusy}
                onClick={() => {
                  void completeOnboarding();
                }}
              >
                {onboardingBusy ? "INITIALIZING..." : "INITIALIZE SYSTEM"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDataRights} onOpenChange={(open) => patchUiState({ showDataRights: open })}>
        <DialogContent className="max-w-2xl rounded-none border-2 border-primary bg-black">
          <DialogHeader>
            <DialogTitle className="font-arcade text-primary">DATA RIGHTS</DialogTitle>
            <DialogDescription className="font-terminal text-xs text-muted-foreground">
              Export what Brain and Scholar know, and control how much supporting evidence shapes personalization.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid gap-3 md:grid-cols-2">
              <label htmlFor={`${idBase}-tier2-signals`} className="flex items-center justify-between gap-3 border border-primary/10 bg-black/30 p-3">
                <div className="space-y-1">
                  <div className="font-terminal text-xs text-white">Tier 2 personalization</div>
                  <div className="font-terminal text-[11px] text-muted-foreground">
                    Allow Brain to use supporting vault, library, and calendar signals.
                  </div>
                </div>
                <Switch
                  id={`${idBase}-tier2-signals`}
                  checked={privacyDraft.allowTier2Signals}
                  onCheckedChange={(checked) =>
                    patchUiState((prev) => ({
                      privacyDraft: { ...prev.privacyDraft, allowTier2Signals: checked },
                    }))
                  }
                />
              </label>
              <label htmlFor={`${idBase}-vault-signals`} className="flex items-center justify-between gap-3 border border-primary/10 bg-black/30 p-3">
                <div className="space-y-1">
                  <div className="font-terminal text-xs text-white">Vault signals</div>
                  <div className="font-terminal text-[11px] text-muted-foreground">
                    Let Brain use note-quality and vault evidence as a secondary signal.
                  </div>
                </div>
                <Switch
                  id={`${idBase}-vault-signals`}
                  checked={privacyDraft.allowVaultSignals}
                  onCheckedChange={(checked) =>
                    patchUiState((prev) => ({
                      privacyDraft: { ...prev.privacyDraft, allowVaultSignals: checked },
                    }))
                  }
                />
              </label>
              <label htmlFor={`${idBase}-calendar-signals`} className="flex items-center justify-between gap-3 border border-primary/10 bg-black/30 p-3">
                <div className="space-y-1">
                  <div className="font-terminal text-xs text-white">Calendar signals</div>
                  <div className="font-terminal text-[11px] text-muted-foreground">
                    Let Brain use timing pressure and follow-through as context.
                  </div>
                </div>
                <Switch
                  id={`${idBase}-calendar-signals`}
                  checked={privacyDraft.allowCalendarSignals}
                  onCheckedChange={(checked) =>
                    patchUiState((prev) => ({
                      privacyDraft: { ...prev.privacyDraft, allowCalendarSignals: checked },
                    }))
                  }
                />
              </label>
              <label htmlFor={`${idBase}-scholar-personalization`} className="flex items-center justify-between gap-3 border border-primary/10 bg-black/30 p-3">
                <div className="space-y-1">
                  <div className="font-terminal text-xs text-white">Scholar personalization</div>
                  <div className="font-terminal text-[11px] text-muted-foreground">
                    Let Scholar use Brain evidence and learner answers for research strategy.
                  </div>
                </div>
                <Switch
                  id={`${idBase}-scholar-personalization`}
                  checked={privacyDraft.allowScholarPersonalization}
                  onCheckedChange={(checked) =>
                    patchUiState((prev) => ({
                      privacyDraft: { ...prev.privacyDraft, allowScholarPersonalization: checked },
                    }))
                  }
                />
              </label>
            </div>
            <div className="space-y-2">
              <label htmlFor={`${idBase}-retention-days`} className="block font-terminal text-xs text-white">Retention window (days)</label>
              <Input
                id={`${idBase}-retention-days`}
                type="number"
                min={30}
                max={3650}
                value={privacyDraft.retentionDays}
                onChange={(event) =>
                  patchUiState((prev) => ({
                    privacyDraft: {
                      ...prev.privacyDraft,
                      retentionDays: Math.max(30, Number(event.target.value || 180)),
                    },
                  }))
                }
                className="rounded-none border-secondary bg-black font-terminal"
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                className="rounded-none border-primary/40 font-arcade text-xs"
                disabled={updatePrivacyMutation.isPending}
                onClick={() => updatePrivacyMutation.mutate()}
              >
                {updatePrivacyMutation.isPending ? "SAVING..." : "SAVE SETTINGS"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-none border-destructive/40 font-arcade text-xs text-destructive"
                disabled={resetPersonalizationMutation.isPending}
                onClick={() => {
                  if (window.confirm("Reset Brain + Scholar personalization data for this workspace?")) {
                    resetPersonalizationMutation.mutate();
                  }
                }}
              >
                {resetPersonalizationMutation.isPending ? "RESETTING..." : "RESET PERSONALIZATION"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function BrainHome({ workspace }: { workspace: BrainWorkspace }) {
  const content = useBrainHomeContent({ workspace });
  return content;
}
