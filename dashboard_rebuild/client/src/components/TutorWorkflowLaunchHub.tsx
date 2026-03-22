import type {
  TutorHubResumeCandidate,
  TutorHubResponse,
  TutorWorkflowStage,
  TutorWorkflowStatus,
  TutorWorkflowSummary,
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StudyWheel } from "@/components/StudyWheel";
import { INPUT_BASE, SELECT_BASE } from "@/lib/theme";
import { formatWorkflowStatus } from "@/lib/workflowStatus";
import { cn } from "@/lib/utils";
import { Clock3, Filter, FolderClock, RotateCcw, Sparkles, Trash2 } from "lucide-react";

export type TutorWorkflowLaunchFilters = {
  search: string;
  courseId: number | "all";
  stage: TutorWorkflowStage | "all";
  status: TutorWorkflowStatus | "all";
  dueBucket: "all" | "upcoming" | "overdue" | "undated";
};

type CourseOption = {
  id: number | null;
  name: string;
  code?: string | null;
};

interface TutorWorkflowLaunchHubProps {
  workflows: TutorWorkflowSummary[];
  totalCount: number;
  courses: CourseOption[];
  filters: TutorWorkflowLaunchFilters;
  onFiltersChange: (next: TutorWorkflowLaunchFilters) => void;
  onStartNew: () => void;
  onResumeCandidate?: (candidate: TutorHubResumeCandidate) => void;
  onOpenWorkflow: (workflow: TutorWorkflowSummary) => void;
  onDeleteWorkflow: (workflow: TutorWorkflowSummary) => void;
  resumeCandidate?: TutorHubResumeCandidate | null;
  tutorHub?: TutorHubResponse;
  tutorHubLoading?: boolean;
  activeWorkflowId?: string | null;
  isCreating?: boolean;
  deletingWorkflowId?: string | null;
}

function formatDateLabel(value: string | null | undefined) {
  if (!value) return "No date";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "No date";
  return parsed.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: parsed.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
}

function actionLabelForWorkflow(workflow: TutorWorkflowSummary) {
  if (workflow.current_stage === "tutor" && workflow.active_tutor_session_id) {
    return "Resume Tutor";
  }
  if (workflow.current_stage === "priming") {
    return "Open Priming in Studio";
  }
  if (workflow.current_stage === "launch") {
    return "Open in Studio";
  }
  if (workflow.current_stage === "polish") {
    return "Open Polish in Studio";
  }
  if (workflow.current_stage === "final_sync") {
    return "Open Final Sync";
  }
  return "Open Workflow";
}

function stageBadgeColor(stage: string): string {
  switch (stage) {
    case "priming":
      return "border-primary/55 bg-[linear-gradient(135deg,rgba(255,76,112,0.22),rgba(24,6,12,0.92))] text-[#ffe3e8]";
    case "tutor":
      return "border-white/35 bg-[linear-gradient(135deg,rgba(255,255,255,0.14),rgba(34,38,46,0.92))] text-white";
    case "polish":
      return "border-white/25 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(30,22,30,0.92))] text-[#f7dce2]";
    case "final_sync":
      return "border-white/30 bg-[linear-gradient(135deg,rgba(255,255,255,0.1),rgba(18,21,28,0.92))] text-[#f5f7fb]";
    case "stored":
      return "border-white/20 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(16,18,24,0.92))] text-[#d9dde6]";
    default:
      return "border-primary/40 bg-[linear-gradient(135deg,rgba(255,70,104,0.14),rgba(20,5,10,0.94))] text-[#ffd3db]";
  }
}

export function TutorWorkflowLaunchHub({
  workflows,
  totalCount,
  courses,
  filters,
  onFiltersChange,
  onStartNew,
  onResumeCandidate,
  onOpenWorkflow,
  onDeleteWorkflow,
  resumeCandidate = null,
  tutorHub,
  tutorHubLoading = false,
  activeWorkflowId,
  isCreating = false,
  deletingWorkflowId = null,
}: TutorWorkflowLaunchHubProps) {
  const wheelCourses = [...(tutorHub?.class_projects ?? [])]
    .filter(
      (project) =>
        project.wheel_linked || project.wheel_active || project.wheel_position !== null,
    )
    .sort((left, right) => {
      const leftPosition = left.wheel_position ?? Number.MAX_SAFE_INTEGER;
      const rightPosition = right.wheel_position ?? Number.MAX_SAFE_INTEGER;
      if (leftPosition !== rightPosition) return leftPosition - rightPosition;
      return left.course_name.localeCompare(right.course_name);
    });
  const linkedCourseCount = Math.max(
    tutorHub?.study_wheel.total_active_courses ?? 0,
    wheelCourses.length,
  );
  const hasWheelContent =
    Boolean(tutorHub) && (
      wheelCourses.length > 0 ||
      linkedCourseCount > 0 ||
      tutorHub!.study_wheel.current_course_id !== null ||
      tutorHub!.study_wheel.next_course_id !== null
    );
  const canResumeRecent = Boolean(
    onResumeCandidate &&
    resumeCandidate &&
      (resumeCandidate.session_id || typeof resumeCandidate.course_id === "number"),
  );

  return (
    <div className="tutor-launch-hud mx-auto w-full max-w-7xl space-y-4" data-testid="tutor-launch-hub">
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="tutor-launch-hud__panel tutor-launch-hud__panel--accent">
          <CardHeader className="tutor-launch-hud__header border-b border-primary/15 pb-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle className="tutor-launch-hud__title">LAUNCH HUB</CardTitle>
                <p className="tutor-launch-hud__subcopy mt-2">
                  Resume the correct study surface or start a fresh Studio priming run.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  className="rounded-none font-arcade text-xs"
                  onClick={() => {
                    if (!resumeCandidate || !onResumeCandidate) return;
                    onResumeCandidate(resumeCandidate);
                  }}
                  disabled={!canResumeRecent}
                >
                  <RotateCcw className="mr-2 h-3.5 w-3.5" />
                  RESUME
                </Button>
                <Button
                  className="rounded-none font-arcade text-xs"
                  onClick={onStartNew}
                  disabled={isCreating}
                >
                  <Sparkles className="mr-2 h-3.5 w-3.5" />
                  {isCreating ? "CREATING..." : "START NEW"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="tutor-launch-hud__metric">
                <div className="tutor-launch-hud__eyebrow">WORKFLOWS</div>
                <div className="tutor-launch-hud__metric-value mt-2">{totalCount}</div>
                <div className="tutor-launch-hud__meta mt-1">Tracked staged workflows</div>
              </div>
              <div className="tutor-launch-hud__metric tutor-launch-hud__metric--signal">
                <div className="tutor-launch-hud__eyebrow">MOST RECENT</div>
                <div className="tutor-launch-hud__metric-copy mt-2 break-words">
                  {resumeCandidate?.action_label || "No recent Tutor activity"}
                </div>
                <div className="tutor-launch-hud__meta mt-1">
                  {resumeCandidate?.course_name || "No recent course context"}
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="tutor-launch-hud__module">
                <div className="tutor-launch-hud__eyebrow-row">
                  <RotateCcw className="h-3.5 w-3.5" />
                  NEXT RECOMMENDED
                </div>
                <div className="tutor-launch-hud__metric-copy mt-2 break-words">
                  {tutorHubLoading
                    ? "Loading..."
                    : tutorHub?.recommended_action?.title || "No recommendation available."}
                </div>
                {tutorHub?.recommended_action?.action_label ? (
                  <div className="tutor-launch-hud__meta mt-2">
                    {tutorHub.recommended_action.action_label}
                  </div>
                ) : null}
              </div>

              <div className="tutor-launch-hud__module">
                <div className="tutor-launch-hud__eyebrow-row">
                  <Clock3 className="h-3.5 w-3.5" />
                  UPCOMING DUE
                </div>
                {tutorHub?.upcoming_assignments?.length ? (
                  <div className="mt-2 space-y-2">
                    {tutorHub.upcoming_assignments.slice(0, 3).map((item) => (
                      <div key={item.id} className="tutor-launch-hud__list-item">
                        <div className="tutor-launch-hud__metric-copy">{item.title}</div>
                        <div className="tutor-launch-hud__meta mt-1">
                          {item.course_name} • {formatDateLabel(item.scheduled_date)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="tutor-launch-hud__meta mt-2">
                    No upcoming assignments in the hub.
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="tutor-launch-hud__panel tutor-launch-hud__panel--neutral">
          <CardHeader className="tutor-launch-hud__header border-b border-primary/15 pb-3">
            <div className="flex items-center gap-2">
              <FolderClock className="h-4 w-4 text-primary/80" />
              <CardTitle className="tutor-launch-hud__title">STUDY WHEEL</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {!hasWheelContent ? (
              <div className="tutor-launch-hud__empty flex flex-col items-center gap-3 py-6">
                <FolderClock className="h-8 w-8 text-primary/40" />
                <p className="tutor-launch-hud__meta text-center">
                  Link courses into the study wheel to see the current rotation.
                </p>
              </div>
            ) : (
              <StudyWheel
                courses={wheelCourses}
                wheelSnapshot={tutorHub!.study_wheel}
                loading={tutorHubLoading}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="tutor-launch-hud__panel tutor-launch-hud__panel--table">
        <CardHeader className="tutor-launch-hud__header border-b border-primary/15 pb-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <CardTitle className="tutor-launch-hud__title">RECENT WORKFLOWS</CardTitle>
              <p className="tutor-launch-hud__subcopy mt-2">
                Filter by class, stage, status, assignment text, or due bucket.
              </p>
            </div>
            <div className="tutor-launch-hud__filters-label">
              <Filter className="h-4 w-4" />
              <span>FILTERS</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <input
              value={filters.search}
              onChange={(event) => onFiltersChange({ ...filters, search: event.target.value })}
              placeholder="Search class, assignment, topic"
              className={`${INPUT_BASE} tutor-launch-hud__field xl:col-span-2`}
            />
            <select
              value={filters.courseId}
              onChange={(event) =>
                onFiltersChange({
                  ...filters,
                  courseId: event.target.value === "all" ? "all" : Number(event.target.value),
                })
              }
              className={`${SELECT_BASE} tutor-launch-hud__field`}
            >
              <option value="all">All classes</option>
              {courses
                .filter(
                  (course, idx, arr) =>
                    typeof course.id === "number" &&
                    arr.findIndex((c) => c.id === course.id) === idx,
                )
                .map((course) => (
                  <option key={course.id} value={course.id ?? ""}>
                    {course.code ? `${course.code} - ` : ""}
                    {course.name}
                  </option>
                ))}
            </select>
            <select
              value={filters.stage}
              onChange={(event) =>
                onFiltersChange({
                  ...filters,
                  stage: event.target.value as TutorWorkflowStage | "all",
                })
              }
              className={`${SELECT_BASE} tutor-launch-hud__field`}
            >
              <option value="all">All stages</option>
              <option value="launch">Launch</option>
              <option value="priming">Priming</option>
              <option value="tutor">Tutor</option>
              <option value="polish">Polish</option>
              <option value="final_sync">Final sync</option>
            </select>
            <select
              value={filters.status}
              onChange={(event) =>
                onFiltersChange({
                  ...filters,
                  status: event.target.value as TutorWorkflowStatus | "all",
                })
              }
              className={`${SELECT_BASE} tutor-launch-hud__field`}
            >
              <option value="all">All statuses</option>
              <option value="launch_ready">Launch ready</option>
              <option value="priming_in_progress">Priming in progress</option>
              <option value="priming_complete">Priming complete</option>
              <option value="tutor_in_progress">Tutor in progress</option>
              <option value="tutor_complete">Tutor complete</option>
              <option value="polish_in_progress">Polish in progress</option>
              <option value="polish_complete">Polish complete</option>
              <option value="stored">Stored</option>
              <option value="abandoned">Abandoned</option>
              <option value="error">Error</option>
            </select>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { value: "all", label: "All due" },
              { value: "upcoming", label: "Upcoming" },
              { value: "overdue", label: "Overdue" },
              { value: "undated", label: "No due date" },
            ].map((option) => (
              <Button
                key={option.value}
                variant={filters.dueBucket === option.value ? "default" : "outline"}
                className="rounded-none font-arcade text-ui-2xs"
                onClick={() =>
                  onFiltersChange({
                    ...filters,
                    dueBucket: option.value as TutorWorkflowLaunchFilters["dueBucket"],
                  })
                }
              >
                {option.label}
              </Button>
            ))}
          </div>

          <div className="tutor-launch-hud__table-shell overflow-x-auto">
            <table className="tutor-launch-hud__table min-w-full divide-y divide-primary/10">
              <thead className="tutor-launch-hud__table-head">
                <tr className="text-left font-arcade text-ui-2xs text-primary/75">
                  <th className="px-3 py-2">Class</th>
                  <th className="px-3 py-2">Assignment / Scope</th>
                  <th className="px-3 py-2">Due</th>
                  <th className="px-3 py-2">Updated</th>
                  <th className="px-3 py-2">Stage</th>
                  <th className="px-3 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="tutor-launch-hud__table-body divide-y divide-primary/10 font-terminal text-sm">
                {workflows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                      No workflows match the current filters.
                    </td>
                  </tr>
                ) : (
                  workflows.map((workflow) => {
                    const active = workflow.workflow_id === activeWorkflowId;
                    const isDeleting = workflow.workflow_id === deletingWorkflowId;
                    const workflowLabel =
                      workflow.assignment_title ||
                      workflow.topic ||
                      workflow.study_unit ||
                      workflow.workflow_id;
                    return (
                      <tr
                        key={workflow.workflow_id}
                        className={cn(
                          "tutor-launch-hud__row",
                          active && "tutor-launch-hud__row--active",
                        )}
                      >
                        <td className="px-3 py-3 align-top">
                          <div className="tutor-launch-hud__row-title">
                            {workflow.course_name || "Unassigned class"}
                          </div>
                          <div className="tutor-launch-hud__meta mt-1">
                            {workflow.course_code || "No class code"}
                          </div>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <div className="tutor-launch-hud__row-title">
                            {workflow.assignment_title || workflow.topic || "Untitled workflow"}
                          </div>
                          <div className="tutor-launch-hud__meta mt-1">
                            {workflow.study_unit || "No study unit set"}
                          </div>
                        </td>
                        <td className="px-3 py-3 align-top text-muted-foreground">
                          {formatDateLabel(workflow.due_date)}
                        </td>
                        <td className="px-3 py-3 align-top text-muted-foreground">
                          {formatDateLabel(workflow.updated_at)}
                        </td>
                        <td className="px-3 py-3 align-top">
                          <div className="flex flex-wrap gap-2">
                            <Badge
                              variant="outline"
                              className={cn(
                                "tutor-launch-hud__badge tutor-launch-hud__badge--stage",
                                stageBadgeColor(workflow.current_stage),
                              )}
                            >
                              {workflow.current_stage.replace(/_/g, " ").toUpperCase()}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="tutor-launch-hud__badge tutor-launch-hud__badge--status"
                            >
                              {formatWorkflowStatus(workflow.status)}
                            </Badge>
                          </div>
                        </td>
                        <td className="px-3 py-3 align-top text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              className="rounded-none font-arcade text-ui-2xs"
                              onClick={() => onOpenWorkflow(workflow)}
                              disabled={isDeleting}
                            >
                              {actionLabelForWorkflow(workflow)}
                            </Button>
                            <Button
                              variant="destructive"
                              className="rounded-none font-arcade text-ui-2xs"
                              aria-label={`Delete workflow ${workflowLabel}`}
                              disabled={isDeleting}
                              onClick={() => {
                                const confirmed = window.confirm(
                                  `Delete study plan "${workflowLabel}"? This cannot be undone.`,
                                );
                                if (!confirmed) return;
                                onDeleteWorkflow(workflow);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              {isDeleting ? "DELETING..." : "DELETE"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
