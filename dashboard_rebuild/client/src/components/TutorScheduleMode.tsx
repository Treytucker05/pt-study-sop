import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { CalendarDays, Clock3, RefreshCw, Sparkles } from "lucide-react";

import { PlannerKanban } from "@/components/PlannerKanban";
import { SyllabusViewTab } from "@/components/SyllabusViewTab";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, type PlannerTask } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useToast } from "@/use-toast";
import type { ScheduleEvent } from "@shared/schema";

interface TutorScheduleModeProps {
  courseId?: number | null;
  courseName?: string | null;
  focusTopic?: string | null;
  className?: string;
  launchIntent?: TutorScheduleLaunchIntent | null;
}

export type TutorScheduleLaunchIntent = {
  token: number;
  kind: "manage_event" | "manage_exam" | "open_event";
  courseId: number;
  courseEventId?: number | null;
};

type EventHighlight = {
  eventId: number | null;
  eventType: string | null;
};

interface ScheduleOverviewCardProps {
  calendarSource: "google" | "local";
  displayCourse: string | null;
  focusTopic: string | null;
  launchIntent: TutorScheduleLaunchIntent | null;
  pendingEventCount: number;
  queueCount: number;
  sessionCount: number;
  isGenerating: boolean;
  isUpdatingSource: boolean;
  onGenerateReviewTasks: () => void;
  onToggleSource: () => void;
  onRefresh: () => void;
}

interface UpcomingEventsCardProps {
  events: ScheduleEvent[];
  highlightedEventId: number | null;
  highlightedEventType: string | null;
  isLoading: boolean;
}

interface PlannerQueueCardProps {
  isLoading: boolean;
  queue: PlannerTask[];
}

function formatEventDate(value?: string | null): string {
  if (!value) return "Unscheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function eventTone(type?: string | null): string {
  if (type === "exam") return "border-red-500/40 bg-red-500/10 text-red-300";
  if (type === "quiz") return "border-amber-500/40 bg-amber-500/10 text-amber-200";
  return "border-cyan-500/40 bg-cyan-500/10 text-cyan-200";
}

function deriveEventHighlight(
  courseId: number | null,
  launchIntent: TutorScheduleLaunchIntent | null,
): EventHighlight {
  if (!launchIntent || courseId !== launchIntent.courseId) {
    return { eventId: null, eventType: null };
  }
  if (launchIntent.kind === "open_event") {
    return { eventId: launchIntent.courseEventId ?? null, eventType: null };
  }
  return {
    eventId: null,
    eventType: launchIntent.kind === "manage_exam" ? "exam" : null,
  };
}

function ScheduleOverviewCard({
  calendarSource,
  displayCourse,
  focusTopic,
  launchIntent,
  pendingEventCount,
  queueCount,
  sessionCount,
  isGenerating,
  isUpdatingSource,
  onGenerateReviewTasks,
  onToggleSource,
  onRefresh,
}: ScheduleOverviewCardProps) {
  return (
    <Card className="bg-black/40 border-[3px] border-double border-primary rounded-none">
      <CardHeader className="border-b border-primary/40">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <CardTitle className="font-arcade text-sm flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              SCHEDULE MODE
            </CardTitle>
            <div className="font-terminal text-xs text-muted-foreground">
              {displayCourse || "Course schedule"}
            </div>
          </div>
          <Badge variant="outline" className="rounded-none border-primary/40 text-primary">
            {calendarSource === "google" ? "Google calendar" : "Local planner"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="border border-secondary/30 bg-black/30 p-3">
            <div className="font-terminal text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Pending events
            </div>
            <div className="mt-2 font-arcade text-lg text-primary">{pendingEventCount}</div>
          </div>
          <div className="border border-secondary/30 bg-black/30 p-3">
            <div className="font-terminal text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Planner queue
            </div>
            <div className="mt-2 font-arcade text-lg text-primary">{queueCount}</div>
          </div>
          <div className="border border-secondary/30 bg-black/30 p-3">
            <div className="font-terminal text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Recent sessions
            </div>
            <div className="mt-2 font-arcade text-lg text-primary">{sessionCount}</div>
          </div>
        </div>

        {focusTopic ? (
          <div className="border border-primary/30 bg-primary/10 p-3">
            <div className="font-terminal text-[11px] uppercase tracking-[0.18em] text-primary/80">
              Current focus
            </div>
            <div className="mt-1 font-terminal text-sm text-foreground">{focusTopic}</div>
          </div>
        ) : null}

        {launchIntent ? (
          <div className="border border-primary/30 bg-primary/10 p-3">
            <div className="font-terminal text-[11px] uppercase tracking-[0.18em] text-primary/80">
              Launch focus
            </div>
            <div className="mt-1 font-terminal text-sm text-foreground">
              {launchIntent.kind === "manage_exam"
                ? "Exam management focus"
                : launchIntent.kind === "manage_event"
                  ? "Course event management focus"
                  : "Focused event opened from Tutor Page 1"}
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            className="rounded-none font-arcade text-xs"
            onClick={onGenerateReviewTasks}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-3.5 w-3.5" />
            )}
            Generate Review Tasks
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-none font-terminal text-xs"
            onClick={onToggleSource}
            disabled={isUpdatingSource}
          >
            Toggle Source
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="rounded-none font-terminal text-xs"
            onClick={onRefresh}
          >
            Refresh
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function UpcomingEventsCard({
  events,
  highlightedEventId,
  highlightedEventType,
  isLoading,
}: UpcomingEventsCardProps) {
  return (
    <Card className="bg-black/40 border-[3px] border-double border-primary rounded-none">
      <CardHeader className="border-b border-primary/40">
        <CardTitle className="font-arcade text-sm flex items-center gap-2">
          <Clock3 className="h-4 w-4" />
          UPCOMING COURSE EVENTS
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {isLoading ? (
          <div className="font-terminal text-xs text-muted-foreground">Loading course events...</div>
        ) : events.length === 0 ? (
          <div className="font-terminal text-xs text-muted-foreground">
            No linked schedule events yet for this course.
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((event) => (
              <div
                key={event.id}
                className={cn(
                  "flex items-start justify-between gap-3 border bg-black/30 p-3",
                  highlightedEventId === event.id
                    ? "border-primary/50 bg-primary/10"
                    : highlightedEventType && event.type === highlightedEventType
                      ? "border-primary/30"
                      : "border-secondary/30",
                )}
              >
                <div className="min-w-0">
                  <div className="font-terminal text-sm text-foreground">{event.title}</div>
                  <div className="mt-1 font-terminal text-xs text-muted-foreground">
                    {formatEventDate(event.dueDate)}
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={cn("rounded-none text-[11px] uppercase", eventTone(event.type))}
                >
                  {event.type}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PlannerQueueCard({ isLoading, queue }: PlannerQueueCardProps) {
  return (
    <Card className="bg-black/40 border-[3px] border-double border-primary rounded-none min-w-0 overflow-hidden">
      <CardHeader className="border-b border-primary/40">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="font-arcade text-sm">PLANNER QUEUE</CardTitle>
          <Badge variant="outline" className="rounded-none border-secondary/40 text-muted-foreground">
            {isLoading ? "Loading..." : `${queue.length} task${queue.length === 1 ? "" : "s"}`}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {isLoading ? (
          <div className="font-terminal text-xs text-muted-foreground">Loading planner queue...</div>
        ) : queue.length === 0 ? (
          <div className="font-terminal text-xs text-muted-foreground">
            No pending planner tasks for this course yet.
          </div>
        ) : (
          <PlannerKanban tasks={queue} />
        )}
      </CardContent>
    </Card>
  );
}

export function TutorScheduleMode({
  courseId = null,
  courseName = null,
  focusTopic = null,
  className,
  launchIntent = null,
}: TutorScheduleModeProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: shell } = useQuery({
    queryKey: ["tutor", "project-shell", courseId],
    queryFn: () => api.tutor.getProjectShell({ course_id: courseId as number }),
    enabled: courseId !== null && courseId !== undefined,
  });

  const { data: events = [], isLoading: eventsLoading } = useQuery<ScheduleEvent[]>({
    queryKey: ["schedule-events", courseId],
    queryFn: () => api.scheduleEvents.getByCourse(courseId as number),
    enabled: courseId !== null && courseId !== undefined,
  });

  const { data: queue = [], isLoading: queueLoading } = useQuery<PlannerTask[]>({
    queryKey: ["planner-queue"],
    queryFn: api.planner.getQueue,
  });

  const { data: settings } = useQuery<Record<string, unknown>>({
    queryKey: ["planner", "settings"],
    queryFn: api.planner.getSettings,
  });

  const generateMutation = useMutation({
    mutationFn: api.planner.generate,
    onSuccess: (result) => {
      toast({
        title: "Planner refreshed",
        description: `${result.tasks_created} review task${result.tasks_created === 1 ? "" : "s"} created.`,
      });
      queryClient.invalidateQueries({ queryKey: ["planner-queue"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Planner generation failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const settingsMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.planner.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planner", "settings"] });
      toast({ title: "Planner source updated" });
    },
    onError: (error: Error) => {
      toast({
        title: "Planner settings failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredQueue = queue.filter((task) =>
    courseId === null || courseId === undefined ? true : task.course_id === courseId,
  );

  const highlight = useMemo(
    () => deriveEventHighlight(courseId, launchIntent),
    [courseId, launchIntent],
  );

  const upcomingEvents = useMemo(
    () =>
      [...events]
        .sort((a, b) => {
          const aFocused = highlight.eventId !== null && a.id === highlight.eventId ? 0 : 1;
          const bFocused = highlight.eventId !== null && b.id === highlight.eventId ? 0 : 1;
          if (aFocused !== bFocused) return aFocused - bFocused;
          const aType = highlight.eventType && a.type === highlight.eventType ? 0 : 1;
          const bType = highlight.eventType && b.type === highlight.eventType ? 0 : 1;
          if (aType !== bType) return aType - bType;
          return String(a.dueDate || "").localeCompare(String(b.dueDate || ""));
        })
        .slice(0, 6),
    [events, highlight.eventId, highlight.eventType],
  );

  const calendarSource = settings?.calendar_source === "google" ? "google" : "local";
  const displayCourse = courseName || shell?.course?.name || (courseId ? `Course ${courseId}` : null);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["planner-queue"] });
    queryClient.invalidateQueries({ queryKey: ["schedule-events", courseId] });
    queryClient.invalidateQueries({ queryKey: ["tutor", "project-shell", courseId] });
  };

  if (courseId === null || courseId === undefined) {
    return (
      <Card className={cn("bg-black/40 border-[3px] border-double border-primary rounded-none", className)}>
        <CardHeader className="border-b border-primary/40">
          <CardTitle className="font-arcade text-sm">SCHEDULE MODE</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-2">
          <p className="font-terminal text-sm text-foreground">
            Pick a course in the Tutor shell before opening Schedule mode.
          </p>
          <p className="font-terminal text-xs text-muted-foreground">
            This mode is course-keyed and reuses the planner queue, schedule events, and syllabus context for one course at a time.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("grid gap-4 xl:grid-cols-[1.05fr_1.45fr] w-full min-w-0 overflow-hidden", className)} data-testid="tutor-schedule-mode">
      <div className="space-y-4 min-w-0 overflow-hidden">
        <ScheduleOverviewCard
          calendarSource={calendarSource}
          displayCourse={displayCourse}
          focusTopic={focusTopic}
          launchIntent={launchIntent}
          pendingEventCount={shell?.counts.pending_schedule_events ?? upcomingEvents.length}
          queueCount={filteredQueue.length}
          sessionCount={shell?.counts.session_count ?? 0}
          isGenerating={generateMutation.isPending}
          isUpdatingSource={settingsMutation.isPending}
          onGenerateReviewTasks={() => generateMutation.mutate()}
          onToggleSource={() =>
            settingsMutation.mutate({
              calendar_source: calendarSource === "google" ? "local" : "google",
            })
          }
          onRefresh={handleRefresh}
        />
        <UpcomingEventsCard
          events={upcomingEvents}
          highlightedEventId={highlight.eventId}
          highlightedEventType={highlight.eventType}
          isLoading={eventsLoading}
        />
        <SyllabusViewTab lockedCourseId={courseId} />
      </div>

      <PlannerQueueCard isLoading={queueLoading} queue={filteredQueue} />
    </div>
  );
}
