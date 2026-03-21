import type {
  TutorHubResponse,
  TutorWorkflowStage,
  TutorWorkflowStatus,
  TutorWorkflowSummary,
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { INPUT_BASE, SELECT_BASE, TEXT_MUTED } from "@/lib/theme";
import { formatWorkflowStatus } from "@/lib/workflowStatus";
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
  onOpenWorkflow: (workflow: TutorWorkflowSummary) => void;
  onDeleteWorkflow: (workflow: TutorWorkflowSummary) => void;
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
    return "Open Priming";
  }
  if (workflow.current_stage === "launch") {
    return "Continue";
  }
  if (workflow.current_stage === "polish") {
    return "Review Workflow";
  }
  if (workflow.current_stage === "final_sync") {
    return "View Sync";
  }
  return "Open Workflow";
}

function stageBadgeColor(stage: string): string {
  switch (stage) {
    case "priming":
      return "border-amber-500/40 bg-amber-500/10 text-amber-300";
    case "tutor":
      return "border-blue-500/40 bg-blue-500/10 text-blue-300";
    case "polish":
      return "border-purple-500/40 bg-purple-500/10 text-purple-300";
    case "final_sync":
      return "border-green-500/40 bg-green-500/10 text-green-300";
    case "stored":
      return "border-zinc-500/40 bg-zinc-500/10 text-zinc-300";
    default:
      return "border-primary/30 bg-primary/10 text-primary";
  }
}

export function TutorWorkflowLaunchHub({
  workflows,
  totalCount,
  courses,
  filters,
  onFiltersChange,
  onStartNew,
  onOpenWorkflow,
  onDeleteWorkflow,
  tutorHub,
  tutorHubLoading = false,
  activeWorkflowId,
  isCreating = false,
  deletingWorkflowId = null,
}: TutorWorkflowLaunchHubProps) {
  return (
    <div className="mx-auto grid w-full max-w-7xl gap-4 xl:grid-cols-[0.95fr_1.35fr]">
      <div className="space-y-4">
        <Card className="rounded-none border-2 border-primary/30 bg-black/45">
          <CardHeader className="border-b border-primary/15 pb-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="font-arcade text-xs text-primary">LAUNCH HUB</CardTitle>
                <p className={`${TEXT_MUTED} mt-2 text-xs`}>
                  Resume the correct workflow stage or start a fresh priming run.
                </p>
              </div>
              <Button
                className="rounded-none font-arcade text-xs"
                onClick={onStartNew}
                disabled={isCreating}
              >
                <Sparkles className="mr-2 h-3.5 w-3.5" />
                {isCreating ? "CREATING..." : "START NEW"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="border border-primary/20 bg-black/35 p-3">
                <div className="font-arcade text-[10px] text-primary/80">WORKFLOWS</div>
                <div className="mt-2 font-terminal text-2xl text-foreground">{totalCount}</div>
                <div className={`${TEXT_MUTED} mt-1 text-xs`}>Tracked staged workflows</div>
              </div>
              <div className="border border-primary/20 bg-black/35 p-3">
                <div className="font-arcade text-[10px] text-primary/80">ACTIVE COURSE</div>
                <div className="mt-2 font-terminal text-sm text-foreground break-words">
                  {tutorHub?.study_wheel.current_course_name || "Not set"}
                </div>
                <div className={`${TEXT_MUTED} mt-1 text-xs`}>
                  Study wheel position {tutorHub?.study_wheel.current_position ?? "-"}
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="border border-primary/20 bg-black/35 p-3">
                <div className="flex items-center gap-2 font-arcade text-[10px] text-primary/80">
                  <RotateCcw className="h-3.5 w-3.5" />
                  NEXT RECOMMENDED
                </div>
                <div className="mt-2 font-terminal text-sm text-foreground break-words">
                  {tutorHubLoading
                    ? "Loading..."
                    : tutorHub?.recommended_action?.title || "No recommendation available."}
                </div>
                {tutorHub?.recommended_action?.action_label ? (
                  <div className={`${TEXT_MUTED} mt-2 text-xs`}>
                    {tutorHub.recommended_action.action_label}
                  </div>
                ) : null}
              </div>

              <div className="border border-primary/20 bg-black/35 p-3">
                <div className="flex items-center gap-2 font-arcade text-[10px] text-primary/80">
                  <Clock3 className="h-3.5 w-3.5" />
                  UPCOMING DUE
                </div>
                {tutorHub?.upcoming_assignments?.length ? (
                  <div className="mt-2 space-y-2">
                    {tutorHub.upcoming_assignments.slice(0, 3).map((item) => (
                      <div key={item.id} className="border border-primary/15 bg-black/40 px-2 py-2">
                        <div className="font-terminal text-sm text-foreground">{item.title}</div>
                        <div className={`${TEXT_MUTED} mt-1 text-xs`}>
                          {item.course_name} • {formatDateLabel(item.scheduled_date)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={`${TEXT_MUTED} mt-2 text-xs`}>
                    No upcoming assignments in the hub.
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-none border-2 border-primary/20 bg-black/40">
          <CardHeader className="border-b border-primary/15 pb-3">
            <div className="flex items-center gap-2">
              <FolderClock className="h-4 w-4 text-primary/80" />
              <CardTitle className="font-arcade text-xs text-primary">STUDY WHEEL</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {(tutorHub?.study_wheel.total_sessions ?? 0) === 0 &&
            (tutorHub?.study_wheel.total_minutes ?? 0) === 0 ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <FolderClock className="h-8 w-8 text-primary/40" />
                <p className="font-terminal text-xs text-muted-foreground text-center">
                  Start a tutor session to build your study wheel
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="border border-primary/20 bg-black/35 p-3">
                  <div className="font-arcade text-[10px] text-primary/80">TOTAL SESSIONS</div>
                  <div className="mt-2 font-terminal text-xl text-foreground">
                    {tutorHub?.study_wheel.total_sessions ?? 0}
                  </div>
                </div>
                <div className="border border-primary/20 bg-black/35 p-3">
                  <div className="font-arcade text-[10px] text-primary/80">TOTAL MINUTES</div>
                  <div className="mt-2 font-terminal text-xl text-foreground">
                    {tutorHub?.study_wheel.total_minutes ?? 0}
                  </div>
                </div>
                <div className="border border-primary/20 bg-black/35 p-3">
                  <div className="font-arcade text-[10px] text-primary/80">NEXT COURSE</div>
                  <div className="mt-2 font-terminal text-sm text-foreground break-words">
                    {tutorHub?.study_wheel.next_course_name || "Not set"}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-none border-2 border-primary/30 bg-black/45">
        <CardHeader className="border-b border-primary/15 pb-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <CardTitle className="font-arcade text-xs text-primary">RECENT WORKFLOWS</CardTitle>
              <p className={`${TEXT_MUTED} mt-2 text-xs`}>
                Filter by class, stage, status, assignment text, or due bucket.
              </p>
            </div>
            <div className="flex items-center gap-2 text-primary/70">
              <Filter className="h-4 w-4" />
              <span className="font-arcade text-[10px]">FILTERS</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <input
              value={filters.search}
              onChange={(event) => onFiltersChange({ ...filters, search: event.target.value })}
              placeholder="Search class, assignment, topic"
              className={`${INPUT_BASE} xl:col-span-2`}
            />
            <select
              value={filters.courseId}
              onChange={(event) =>
                onFiltersChange({
                  ...filters,
                  courseId: event.target.value === "all" ? "all" : Number(event.target.value),
                })
              }
              className={SELECT_BASE}
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
              className={SELECT_BASE}
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
              className={SELECT_BASE}
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
                variant="outline"
                className="rounded-none font-arcade text-[10px]"
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

          <div className="overflow-x-auto border border-primary/15">
            <table className="min-w-full divide-y divide-primary/10">
              <thead className="bg-black/45">
                <tr className="text-left font-arcade text-[10px] text-primary/75">
                  <th className="px-3 py-2">Class</th>
                  <th className="px-3 py-2">Assignment / Scope</th>
                  <th className="px-3 py-2">Due</th>
                  <th className="px-3 py-2">Updated</th>
                  <th className="px-3 py-2">Stage</th>
                  <th className="px-3 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/10 bg-black/20 font-terminal text-sm">
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
                        className={active ? "bg-primary/10" : "hover:bg-black/35"}
                      >
                        <td className="px-3 py-3 align-top">
                          <div className="font-terminal text-foreground">
                            {workflow.course_name || "Unassigned class"}
                          </div>
                          <div className={`${TEXT_MUTED} mt-1 text-xs`}>
                            {workflow.course_code || "No class code"}
                          </div>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <div className="text-foreground">
                            {workflow.assignment_title || workflow.topic || "Untitled workflow"}
                          </div>
                          <div className={`${TEXT_MUTED} mt-1 text-xs`}>
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
                              className={`rounded-none ${stageBadgeColor(workflow.current_stage)}`}
                            >
                              {workflow.current_stage.replace(/_/g, " ").toUpperCase()}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="rounded-none border-primary/20 text-muted-foreground"
                            >
                              {formatWorkflowStatus(workflow.status)}
                            </Badge>
                          </div>
                        </td>
                        <td className="px-3 py-3 align-top text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              className="rounded-none font-arcade text-[10px]"
                              onClick={() => onOpenWorkflow(workflow)}
                              disabled={isDeleting}
                            >
                              {actionLabelForWorkflow(workflow)}
                            </Button>
                            <Button
                              variant="destructive"
                              className="rounded-none font-arcade text-[10px]"
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
