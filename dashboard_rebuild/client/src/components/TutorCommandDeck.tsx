import { useMemo, useState, type ReactNode } from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Clock3,
  FolderOpen,
  History,
  ListChecks,
  Loader2,
  MessageSquare,
  Play,
  Target,
  Upload,
} from "lucide-react";

import type {
  TutorHubClassProject,
  TutorHubEventSummary,
  TutorHubRecommendedAction,
  TutorHubResponse,
  TutorHubResumeCandidate,
} from "@/lib/api";
import {
  BTN_PRIMARY,
  BTN_TOOLBAR,
  TEXT_BADGE,
  TEXT_MUTED,
  TEXT_SECTION_LABEL,
} from "@/lib/theme";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type TutorCommandDeckProps = {
  hub?: TutorHubResponse;
  hubLoading?: boolean;
  launchSettings: ReactNode;
  onRunRecommendedAction: (action: TutorHubRecommendedAction) => void;
  onResumeCandidate: (candidate: TutorHubResumeCandidate) => void;
  onOpenProject: (courseId: number) => void;
  onOpenScheduleCourse: (
    courseId: number,
    kind: "manage_event" | "manage_exam",
  ) => void;
  onOpenScheduleEvent: (
    event: TutorHubEventSummary,
    kind: "open_event",
  ) => void;
  onLoadMaterials: (params: {
    source: "assignment" | "exam" | "course";
    courseId: number;
    courseName?: string | null;
    courseEventId?: number;
    eventType?: string | null;
  }) => void;
};

function formatDate(value: string | null | undefined): string {
  if (!value) return "No due date";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatResumePath(candidate: TutorHubResumeCandidate): string {
  const mode = candidate.last_mode ? candidate.last_mode.toUpperCase() : "TUTOR";
  if (candidate.can_resume) {
    return `${candidate.course_code || candidate.course_name || "Tutor"} / ${mode}`;
  }
  return `${candidate.course_code || candidate.course_name || "Tutor"} / ${mode}`;
}

function sessionStatusLabel(project: TutorHubClassProject): string {
  if (project.active_session) return "ACTIVE SESSION";
  return `${project.recent_session_count} SESSION${project.recent_session_count === 1 ? "" : "S"}`;
}

function EventRow({
  event,
  primaryLabel,
  onPrimary,
  onLoadMaterials,
}: {
  event: TutorHubEventSummary;
  primaryLabel: string;
  onPrimary: () => void;
  onLoadMaterials: () => void;
}) {
  return (
    <div className="border border-primary/20 bg-black/35 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="rounded-none border-primary/40 text-[10px]">
              {event.course_code || event.course_name}
            </Badge>
            <Badge variant="outline" className="rounded-none border-secondary/30 text-[10px]">
              {event.type.toUpperCase()}
            </Badge>
          </div>
          <div className="font-terminal text-sm text-white">{event.title}</div>
          <div className="font-terminal text-xs text-muted-foreground">
            Due {formatDate(event.scheduled_date)}
          </div>
        </div>
        <div className="grid w-full gap-2 sm:w-auto sm:min-w-[11rem]">
          <Button type="button" className={`${BTN_PRIMARY} min-h-11 w-full`} onClick={onPrimary}>
            {primaryLabel}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 rounded-none border-primary/30 font-arcade text-xs"
            onClick={onLoadMaterials}
          >
            <Upload className="mr-1.5 h-4 w-4" />
            LOAD MATERIALS
          </Button>
        </div>
      </div>
    </div>
  );
}

export function TutorCommandDeck({
  hub,
  hubLoading = false,
  launchSettings,
  onRunRecommendedAction,
  onResumeCandidate,
  onOpenProject,
  onOpenScheduleCourse,
  onOpenScheduleEvent,
  onLoadMaterials,
}: TutorCommandDeckProps) {
  const [showLaunchSettings, setShowLaunchSettings] = useState(false);

  const assignments = hub?.upcoming_assignments ?? [];
  const tests = hub?.upcoming_tests ?? [];
  const classProjects = hub?.class_projects ?? [];
  const resumeCandidate = hub?.resume_candidate ?? null;
  const recommendedAction = hub?.recommended_action ?? null;
  const studyWheel = hub?.study_wheel ?? null;

  const manageAssignmentsCourseId = useMemo(
    () =>
      assignments[0]?.course_id ??
      studyWheel?.current_course_id ??
      classProjects[0]?.course_id ??
      null,
    [assignments, classProjects, studyWheel?.current_course_id],
  );
  const manageTestsCourseId = useMemo(
    () =>
      tests[0]?.course_id ??
      studyWheel?.current_course_id ??
      classProjects[0]?.course_id ??
      null,
    [classProjects, studyWheel?.current_course_id, tests],
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-4">
          <Card className="rounded-none border-2 border-primary bg-black/40">
            <CardHeader className="border-b border-primary/30 pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className={TEXT_SECTION_LABEL}>STUDY NOW</div>
                  <CardTitle className="font-arcade text-sm text-primary">
                    {recommendedAction?.title || "No urgent study action queued"}
                  </CardTitle>
                  <div className={`${TEXT_MUTED} text-xs`}>
                    {recommendedAction?.reason ||
                      "Tutor is ready. Pick a class project or open launch settings to scope the next session."}
                  </div>
                </div>
                {recommendedAction?.course_code ? (
                  <Badge variant="outline" className={`${TEXT_BADGE} rounded-none border-primary/40`}>
                    {recommendedAction.course_code}
                  </Badge>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="space-y-3 p-4">
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div className="font-terminal text-sm text-white">
                  {recommendedAction ? "Tutor has a recommended next move ready." : "No recommendation yet."}
                </div>
                <Button
                  type="button"
                  className={`${BTN_PRIMARY} min-h-11 w-full sm:w-auto`}
                  disabled={!recommendedAction}
                  onClick={() => {
                    if (recommendedAction) onRunRecommendedAction(recommendedAction);
                  }}
                >
                  <Play className="mr-1.5 h-4 w-4" />
                  {recommendedAction?.action_label || "OPEN"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-none border-2 border-primary bg-black/40">
            <CardHeader className="border-b border-primary/30 pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className={TEXT_SECTION_LABEL}>RESUME</div>
                  <CardTitle className="font-arcade text-sm text-primary">
                    {resumeCandidate?.topic || "Resume where you left off"}
                  </CardTitle>
                  <div className={`${TEXT_MUTED} text-xs`}>
                    {resumeCandidate?.course_id
                      ? formatResumePath(resumeCandidate)
                      : "No saved Tutor location yet."}
                  </div>
                </div>
                <History className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3 p-4">
              <div className="font-terminal text-sm text-white">
                {resumeCandidate?.can_resume
                  ? "Jump back into the live session exactly where it stopped."
                  : resumeCandidate?.course_id
                    ? "Re-open the last useful Tutor surface for this course."
                    : "No saved session or workspace to resume yet."}
              </div>
              <Button
                type="button"
                className={`${BTN_PRIMARY} min-h-11 w-full sm:w-auto`}
                disabled={!resumeCandidate?.course_id}
                onClick={() => {
                  if (resumeCandidate) onResumeCandidate(resumeCandidate);
                }}
              >
                <MessageSquare className="mr-1.5 h-4 w-4" />
                {resumeCandidate?.can_resume ? "RESUME WHERE I LEFT OFF" : "REOPEN LAST PLACE"}
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-none border-2 border-primary bg-black/40">
          <CardHeader className="border-b border-primary/30 pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <div className={TEXT_SECTION_LABEL}>STUDY WHEEL SNAPSHOT</div>
                <CardTitle className="font-arcade text-sm text-primary">
                  {studyWheel?.current_course_name || "No active wheel course"}
                </CardTitle>
                <div className={`${TEXT_MUTED} text-xs`}>
                  Compact Page 1 snapshot of the wheel, not the full analytic view.
                </div>
              </div>
              <Target className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3 p-4">
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              <div className="border border-primary/20 bg-black/35 p-3">
                <div className="font-terminal text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Current
                </div>
                <div className="mt-2 font-terminal text-sm text-white">
                  {studyWheel?.current_course_code || studyWheel?.current_course_name || "None"}
                </div>
              </div>
              <div className="border border-primary/20 bg-black/35 p-3">
                <div className="font-terminal text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Next
                </div>
                <div className="mt-2 font-terminal text-sm text-white">
                  {studyWheel?.next_course_code || studyWheel?.next_course_name || "None"}
                </div>
              </div>
              <div className="border border-primary/20 bg-black/35 p-3">
                <div className="font-terminal text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Active Courses
                </div>
                <div className="mt-2 font-terminal text-sm text-white">
                  {studyWheel?.total_active_courses ?? 0}
                </div>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="border border-primary/20 bg-black/35 p-3">
                <div className="font-terminal text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Wheel Sessions
                </div>
                <div className="mt-2 font-terminal text-sm text-white">
                  {studyWheel?.total_sessions ?? 0}
                </div>
              </div>
              <div className="border border-primary/20 bg-black/35 p-3">
                <div className="font-terminal text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Wheel Minutes
                </div>
                <div className="mt-2 font-terminal text-sm text-white">
                  {studyWheel?.total_minutes ?? 0}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="rounded-none border-2 border-primary bg-black/40">
          <CardHeader className="border-b border-primary/30 pb-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2">
                <div className={TEXT_SECTION_LABEL}>UPCOMING ASSIGNMENTS</div>
                <CardTitle className="font-arcade text-sm text-primary">Event pressure you should handle first</CardTitle>
              </div>
              <Button
                type="button"
                variant="outline"
                className="min-h-11 rounded-none border-primary/30 font-arcade text-xs"
                disabled={!manageAssignmentsCourseId}
                onClick={() => {
                  if (manageAssignmentsCourseId) {
                    onOpenScheduleCourse(manageAssignmentsCourseId, "manage_event");
                  }
                }}
              >
                <ListChecks className="mr-1.5 h-4 w-4" />
                MANAGE EVENTS
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 p-4">
            {hubLoading && !hub ? (
              <div className="flex items-center gap-2 font-terminal text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading Tutor hub...
              </div>
            ) : assignments.length === 0 ? (
              <div className="font-terminal text-sm text-muted-foreground">
                No pending assignments or projects right now.
              </div>
            ) : (
              assignments.map((event) => (
                <EventRow
                  key={event.id}
                  event={event}
                  primaryLabel="OPEN EVENT"
                  onPrimary={() => onOpenScheduleEvent(event, "open_event")}
                  onLoadMaterials={() =>
                    onLoadMaterials({
                      source: "assignment",
                      courseId: event.course_id,
                      courseName: event.course_name,
                      courseEventId: event.id,
                      eventType: event.type,
                    })
                  }
                />
              ))
            )}
          </CardContent>
        </Card>

        <Card className="rounded-none border-2 border-primary bg-black/40">
          <CardHeader className="border-b border-primary/30 pb-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2">
                <div className={TEXT_SECTION_LABEL}>UPCOMING TESTS</div>
                <CardTitle className="font-arcade text-sm text-primary">Assessments that need focused prep</CardTitle>
              </div>
              <Button
                type="button"
                variant="outline"
                className="min-h-11 rounded-none border-primary/30 font-arcade text-xs"
                disabled={!manageTestsCourseId}
                onClick={() => {
                  if (manageTestsCourseId) {
                    onOpenScheduleCourse(manageTestsCourseId, "manage_exam");
                  }
                }}
              >
                <Clock3 className="mr-1.5 h-4 w-4" />
                MANAGE EXAMS
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 p-4">
            {hubLoading && !hub ? (
              <div className="flex items-center gap-2 font-terminal text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading Tutor hub...
              </div>
            ) : tests.length === 0 ? (
              <div className="font-terminal text-sm text-muted-foreground">
                No pending quizzes or exams right now.
              </div>
            ) : (
              tests.map((event) => (
                <EventRow
                  key={event.id}
                  event={event}
                  primaryLabel="STUDY"
                  onPrimary={() => onOpenScheduleEvent(event, "open_event")}
                  onLoadMaterials={() =>
                    onLoadMaterials({
                      source: "exam",
                      courseId: event.course_id,
                      courseName: event.course_name,
                      courseEventId: event.id,
                      eventType: event.type,
                    })
                  }
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-none border-2 border-primary bg-black/40">
        <CardHeader className="border-b border-primary/30 pb-3">
          <div className="space-y-2">
            <div className={TEXT_SECTION_LABEL}>CLASS PROJECTS</div>
            <CardTitle className="font-arcade text-sm text-primary">
              Open the right class, then go one level deeper
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {classProjects.length === 0 ? (
            <div className="font-terminal text-sm text-muted-foreground">
              No class projects are available yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {classProjects.map((project) => (
                <div key={project.course_id} className="border border-primary/20 bg-black/35 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-arcade text-xs text-primary">
                        {project.course_code || project.course_name}
                      </div>
                      <div className="mt-1 font-terminal text-sm text-white">{project.course_name}</div>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-none text-[10px]",
                        project.active_session
                          ? "border-primary/50 text-primary"
                          : "border-secondary/30 text-muted-foreground",
                      )}
                    >
                      {sessionStatusLabel(project)}
                    </Badge>
                  </div>

                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <div className="border border-primary/15 bg-black/30 p-2">
                      <div className="font-terminal text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                        Materials
                      </div>
                      <div className="mt-1 font-terminal text-sm text-white">{project.material_count}</div>
                    </div>
                    <div className="border border-primary/15 bg-black/30 p-2">
                      <div className="font-terminal text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                        Sessions
                      </div>
                      <div className="mt-1 font-terminal text-sm text-white">{project.recent_session_count}</div>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1 font-terminal text-xs text-muted-foreground">
                    {project.next_due_event ? (
                      <div>
                        Next due: {project.next_due_event.title} ({formatDate(project.next_due_event.scheduled_date)})
                      </div>
                    ) : (
                      <div>No pending event linked to this class.</div>
                    )}
                    {project.active_session?.topic ? (
                      <div>Active session: {project.active_session.topic}</div>
                    ) : null}
                  </div>

                  <div className="mt-3 grid gap-2">
                    <Button
                      type="button"
                      className={`${BTN_PRIMARY} min-h-11 w-full`}
                      onClick={() => onOpenProject(project.course_id)}
                    >
                      <FolderOpen className="mr-1.5 h-4 w-4" />
                      OPEN PROJECT
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-11 rounded-none border-primary/30 font-arcade text-xs"
                      onClick={() =>
                        onLoadMaterials({
                          source: "course",
                          courseId: project.course_id,
                          courseName: project.course_name,
                        })
                      }
                    >
                      <Upload className="mr-1.5 h-4 w-4" />
                      LOAD MATERIALS
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-none border-2 border-primary bg-black/40">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 border-b border-primary/30 px-4 py-3 text-left"
          onClick={() => setShowLaunchSettings((prev) => !prev)}
        >
          <div className="space-y-2">
            <div className={TEXT_SECTION_LABEL}>LAUNCH SETTINGS</div>
            <div className="font-terminal text-sm text-muted-foreground">
              Advanced setup stays available, but it no longer dominates Page 1.
            </div>
          </div>
          {showLaunchSettings ? (
            <ChevronDown className="h-4 w-4 text-primary" />
          ) : (
            <ChevronRight className="h-4 w-4 text-primary" />
          )}
        </button>
        {showLaunchSettings ? (
          <CardContent className="p-4">{launchSettings}</CardContent>
        ) : null}
      </Card>
    </div>
  );
}
