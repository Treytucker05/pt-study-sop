import { useMemo, useState, type ReactNode } from "react";
import {
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

type UpcomingEventsSectionProps = {
  emptyState: string;
  events: TutorHubEventSummary[];
  hub?: TutorHubResponse;
  hubLoading: boolean;
  manageCourseId: number | null;
  manageKind: "manage_event" | "manage_exam";
  primaryLabel: string;
  sectionTitle: string;
  sectionSubtitle: string;
  sectionIcon: typeof Clock3;
  onLoadMaterials: TutorCommandDeckProps["onLoadMaterials"];
  onOpenScheduleCourse: TutorCommandDeckProps["onOpenScheduleCourse"];
  onOpenScheduleEvent: TutorCommandDeckProps["onOpenScheduleEvent"];
  source: "assignment" | "exam";
};

type StudyNowCardProps = {
  action: TutorHubRecommendedAction | null;
  onRunRecommendedAction: (action: TutorHubRecommendedAction) => void;
};

type ResumeCardProps = {
  candidate: TutorHubResumeCandidate | null;
  onResumeCandidate: (candidate: TutorHubResumeCandidate) => void;
};

type StudyWheelSnapshotCardProps = {
  studyWheel: TutorHubResponse["study_wheel"] | null;
};

type ClassProjectsCardProps = {
  projects: TutorHubClassProject[];
  onLoadMaterials: TutorCommandDeckProps["onLoadMaterials"];
  onOpenProject: (courseId: number) => void;
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

function StudyNowCard({ action, onRunRecommendedAction }: StudyNowCardProps) {
  return (
    <Card className="rounded-none border-2 border-primary bg-black/40">
      <CardHeader className="border-b border-primary/30 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <div className={TEXT_SECTION_LABEL}>STUDY NOW</div>
            <CardTitle className="font-arcade text-sm text-primary">
              {action?.title || "No urgent study action queued"}
            </CardTitle>
            <div className={`${TEXT_MUTED} text-xs`}>
              {action?.reason ||
                "Tutor is ready. Pick a class project or open launch settings to scope the next session."}
            </div>
          </div>
          {action?.course_code ? (
            <Badge variant="outline" className={`${TEXT_BADGE} rounded-none border-primary/40`}>
              {action.course_code}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-4">
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="font-terminal text-sm text-white">
            {action ? "Tutor has a recommended next move ready." : "No recommendation yet."}
          </div>
          <Button
            type="button"
            className={`${BTN_PRIMARY} min-h-11 w-full sm:w-auto`}
            disabled={!action}
            onClick={() => {
              if (action) onRunRecommendedAction(action);
            }}
          >
            <Play className="mr-1.5 h-4 w-4" />
            {action?.action_label || "OPEN"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ResumeCard({ candidate, onResumeCandidate }: ResumeCardProps) {
  return (
    <Card className="rounded-none border-2 border-primary bg-black/40">
      <CardHeader className="border-b border-primary/30 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <div className={TEXT_SECTION_LABEL}>RESUME</div>
            <CardTitle className="font-arcade text-sm text-primary">
              {candidate?.topic || "Resume where you left off"}
            </CardTitle>
            <div className={`${TEXT_MUTED} text-xs`}>
              {candidate?.course_id
                ? formatResumePath(candidate)
                : "No saved Tutor location yet."}
            </div>
          </div>
          <History className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-4">
        <div className="font-terminal text-sm text-white">
          {candidate?.can_resume
            ? "Jump back into the live session exactly where it stopped."
            : candidate?.course_id
              ? "Re-open the last useful Tutor surface for this course."
              : "No saved session or workspace to resume yet."}
        </div>
        <Button
          type="button"
          className={`${BTN_PRIMARY} min-h-11 w-full sm:w-auto`}
          disabled={!candidate?.course_id}
          onClick={() => {
            if (candidate) onResumeCandidate(candidate);
          }}
        >
          <MessageSquare className="mr-1.5 h-4 w-4" />
          {candidate?.can_resume ? "RESUME WHERE I LEFT OFF" : "REOPEN LAST PLACE"}
        </Button>
      </CardContent>
    </Card>
  );
}

function StudyWheelSnapshotCard({ studyWheel }: StudyWheelSnapshotCardProps) {
  return (
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
          <MetricStat label="Current" value={studyWheel?.current_course_code || studyWheel?.current_course_name || "None"} />
          <MetricStat label="Next" value={studyWheel?.next_course_code || studyWheel?.next_course_name || "None"} />
          <MetricStat label="Active Courses" value={studyWheel?.total_active_courses ?? 0} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <MetricStat label="Wheel Sessions" value={studyWheel?.total_sessions ?? 0} />
          <MetricStat label="Wheel Minutes" value={studyWheel?.total_minutes ?? 0} />
        </div>
      </CardContent>
    </Card>
  );
}

function MetricStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border border-primary/20 bg-black/35 p-3">
      <div className="font-terminal text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 font-terminal text-sm text-white">{value}</div>
    </div>
  );
}

function UpcomingEventsSection({
  emptyState,
  events,
  hub,
  hubLoading,
  manageCourseId,
  manageKind,
  primaryLabel,
  sectionTitle,
  sectionSubtitle,
  sectionIcon: SectionIcon,
  onLoadMaterials,
  onOpenScheduleCourse,
  onOpenScheduleEvent,
  source,
}: UpcomingEventsSectionProps) {
  return (
    <Card className="rounded-none border-2 border-primary bg-black/40">
      <CardHeader className="border-b border-primary/30 pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className={TEXT_SECTION_LABEL}>{sectionTitle}</div>
            <CardTitle className="font-arcade text-sm text-primary">{sectionSubtitle}</CardTitle>
          </div>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 rounded-none border-primary/30 font-arcade text-xs"
            disabled={!manageCourseId}
            onClick={() => {
              if (manageCourseId) {
                onOpenScheduleCourse(manageCourseId, manageKind);
              }
            }}
          >
            <SectionIcon className="mr-1.5 h-4 w-4" />
            {manageKind === "manage_exam" ? "MANAGE EXAMS" : "MANAGE EVENTS"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-4">
        {hubLoading && !hub ? (
          <div className="flex items-center gap-2 font-terminal text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading Tutor hub...
          </div>
        ) : events.length === 0 ? (
          <div className="font-terminal text-sm text-muted-foreground">{emptyState}</div>
        ) : (
          events.map((event) => (
            <EventRow
              key={event.id}
              event={event}
              primaryLabel={primaryLabel}
              onPrimary={() => onOpenScheduleEvent(event, "open_event")}
              onLoadMaterials={() =>
                onLoadMaterials({
                  source,
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
  );
}

function ClassProjectsCard({
  projects,
  onLoadMaterials,
  onOpenProject,
}: ClassProjectsCardProps) {
  return (
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
        {projects.length === 0 ? (
          <div className="font-terminal text-sm text-muted-foreground">
            No class projects are available yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <ClassProjectCard
                key={project.course_id}
                project={project}
                onOpenProject={onOpenProject}
                onLoadMaterials={onLoadMaterials}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ClassProjectCard({
  project,
  onOpenProject,
  onLoadMaterials,
}: {
  project: TutorHubClassProject;
  onOpenProject: (courseId: number) => void;
  onLoadMaterials: TutorCommandDeckProps["onLoadMaterials"];
}) {
  return (
    <div className="border border-primary/20 bg-black/35 p-3">
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
        <MetricStat label="Materials" value={project.material_count} />
        <MetricStat label="Sessions" value={project.recent_session_count} />
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
  );
}

function LaunchSettingsCard({
  isOpen,
  launchSettings,
  onToggle,
}: {
  isOpen: boolean;
  launchSettings: ReactNode;
  onToggle: () => void;
}) {
  return (
    <Card className="rounded-none border-2 border-primary bg-black/40">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 border-b border-primary/30 px-4 py-3 text-left"
        onClick={onToggle}
      >
        <div className="space-y-2">
          <div className={TEXT_SECTION_LABEL}>LAUNCH SETTINGS</div>
          <div className="font-terminal text-sm text-muted-foreground">
            Advanced setup stays available, but it no longer dominates Page 1.
          </div>
        </div>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-primary" />
        ) : (
          <ChevronRight className="h-4 w-4 text-primary" />
        )}
      </button>
      {isOpen ? <CardContent className="p-4">{launchSettings}</CardContent> : null}
    </Card>
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
          <StudyNowCard
            action={recommendedAction}
            onRunRecommendedAction={onRunRecommendedAction}
          />
          <ResumeCard
            candidate={resumeCandidate}
            onResumeCandidate={onResumeCandidate}
          />
        </div>
        <StudyWheelSnapshotCard studyWheel={studyWheel} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <UpcomingEventsSection
          emptyState="No pending assignments or projects right now."
          events={assignments}
          hub={hub}
          hubLoading={hubLoading}
          manageCourseId={manageAssignmentsCourseId}
          manageKind="manage_event"
          primaryLabel="OPEN EVENT"
          sectionTitle="UPCOMING ASSIGNMENTS"
          sectionSubtitle="Event pressure you should handle first"
          sectionIcon={ListChecks}
          onLoadMaterials={onLoadMaterials}
          onOpenScheduleCourse={onOpenScheduleCourse}
          onOpenScheduleEvent={onOpenScheduleEvent}
          source="assignment"
        />
        <UpcomingEventsSection
          emptyState="No pending quizzes or exams right now."
          events={tests}
          hub={hub}
          hubLoading={hubLoading}
          manageCourseId={manageTestsCourseId}
          manageKind="manage_exam"
          primaryLabel="STUDY"
          sectionTitle="UPCOMING TESTS"
          sectionSubtitle="Assessments that need focused prep"
          sectionIcon={Clock3}
          onLoadMaterials={onLoadMaterials}
          onOpenScheduleCourse={onOpenScheduleCourse}
          onOpenScheduleEvent={onOpenScheduleEvent}
          source="exam"
        />
      </div>

      <ClassProjectsCard
        projects={classProjects}
        onLoadMaterials={onLoadMaterials}
        onOpenProject={onOpenProject}
      />

      <LaunchSettingsCard
        isOpen={showLaunchSettings}
        launchSettings={launchSettings}
        onToggle={() => setShowLaunchSettings((prev) => !prev)}
      />
    </div>
  );
}
