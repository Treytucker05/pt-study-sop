import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/use-toast";

interface StudyTask {
  id: number;
  course_name?: string;
  anchor_text?: string;
  scheduled_date?: string;
  planned_minutes?: number;
  status: string;
  source?: string;
  review_number?: number;
  priority?: number;
  notes?: string;
}

interface PlannerSettings {
  spacing_strategy: string;
  default_session_minutes: number;
  calendar_source: string;
  auto_schedule_reviews: number;
}

interface NextActionsProps {
  /** "today" shows only due-today tasks inline; "all" shows full planner (default) */
  filter?: "today" | "all";
}

export function NextActions({ filter = "all" }: NextActionsProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: queue = [], isLoading } = useQuery<StudyTask[]>({
    queryKey: ["planner", "queue"],
    queryFn: api.planner.getQueue as () => Promise<StudyTask[]>,
  });

  const { data: settings } = useQuery<PlannerSettings>({
    queryKey: ["planner", "settings"],
    queryFn: api.planner.getSettings as () => Promise<PlannerSettings>,
  });

  const generateMutation = useMutation({
    mutationFn: api.planner.generate,
    onSuccess: (data) => {
      toast({ title: "Tasks generated", description: `${data.tasks_created} review tasks created` });
      queryClient.invalidateQueries({ queryKey: ["planner", "queue"] });
    },
    onError: (err: Error) => {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    },
  });

  const completeMutation = useMutation({
    mutationFn: (id: number) => api.planner.updateTask(id, { status: "completed" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planner", "queue"] });
    },
  });

  const deferMutation = useMutation({
    mutationFn: (id: number) => api.planner.updateTask(id, { status: "deferred" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planner", "queue"] });
    },
  });

  const settingsMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.planner.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planner", "settings"] });
      toast({ title: "Settings saved" });
    },
  });

  const today = new Date().toISOString().slice(0, 10);
  const todayTasks = queue.filter(t => t.scheduled_date && t.scheduled_date <= today);
  const upcomingTasks = queue.filter(t => !t.scheduled_date || t.scheduled_date > today);

  return (
    <Card className="bg-black/40 border-[3px] border-double border-primary rounded-none">
      <CardHeader className="border-b border-primary/50 p-4">
        <div className="flex items-center justify-between">
          <CardTitle className="font-arcade text-sm flex items-center gap-2">
            <div className="w-4 h-4 bg-primary inline-block" />
            NEXT_ACTIONS
          </CardTitle>
          {filter === "all" && (
            <div className="flex items-center gap-2">
              <span className="font-terminal text-xs text-muted-foreground">
                Source: {settings?.calendar_source === "google" ? "Google" : "Local"}
              </span>
              <button
                onClick={() => settingsMutation.mutate({
                  calendar_source: settings?.calendar_source === "google" ? "local" : "google"
                })}
                className="px-2 py-1 border border-primary/30 text-xs font-arcade text-muted-foreground hover:text-white rounded-none"
              >
                TOGGLE
              </button>
              <button
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
                className="px-3 py-1 bg-primary text-black font-arcade text-xs rounded-none hover:bg-primary/80 disabled:opacity-50"
              >
                {generateMutation.isPending ? "..." : "GENERATE"}
              </button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {isLoading && (
          <div className="font-terminal text-xs text-muted-foreground">Loading queue...</div>
        )}

        {!isLoading && queue.length === 0 && (
          <div className="font-terminal text-xs text-muted-foreground text-center py-4">
            No pending tasks. {filter === "all" ? "Click GENERATE to create review tasks from weak anchors." : ""}
          </div>
        )}

        {!isLoading && filter === "today" && queue.length > 0 && todayTasks.length === 0 && (
          <div className="font-terminal text-xs text-muted-foreground text-center py-4">
            No tasks due today. {upcomingTasks.length} upcoming.
          </div>
        )}

        {/* Today's tasks */}
        {todayTasks.length > 0 && (
          <div>
            <div className="font-arcade text-xs text-primary mb-2">TODAY ({todayTasks.length})</div>
            <div className="space-y-2">
              {todayTasks.map(task => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onComplete={() => completeMutation.mutate(task.id)}
                  onDefer={() => deferMutation.mutate(task.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Upcoming */}
        {filter === "all" && upcomingTasks.length > 0 && (
          <div>
            <div className="font-arcade text-xs text-muted-foreground mb-2">
              UPCOMING ({upcomingTasks.length})
            </div>
            <div className="space-y-2">
              {upcomingTasks.slice(0, 10).map(task => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onComplete={() => completeMutation.mutate(task.id)}
                  onDefer={() => deferMutation.mutate(task.id)}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TaskRow({ task, onComplete, onDefer }: {
  task: StudyTask;
  onComplete: () => void;
  onDefer: () => void;
}) {
  return (
    <div className="flex items-center justify-between border border-primary/20 bg-black/30 p-2">
      <div className="flex-1 min-w-0">
        <div className="font-terminal text-xs text-white truncate">
          {task.review_number ? `R${task.review_number}` : ""}{" "}
          {task.anchor_text || task.notes || "Untitled"}
        </div>
        <div className="font-terminal text-xs text-muted-foreground flex gap-3">
          {task.course_name && <span>{task.course_name}</span>}
          {task.scheduled_date && <span>{task.scheduled_date}</span>}
          {task.planned_minutes && <span>{task.planned_minutes}m</span>}
        </div>
      </div>
      <div className="flex gap-1 ml-2">
        <button
          onClick={onComplete}
          className="px-2 py-1 text-xs font-arcade bg-green-900/50 text-green-400 border border-green-500/30 hover:bg-green-900 rounded-none"
        >
          DONE
        </button>
        <button
          onClick={onDefer}
          className="px-2 py-1 text-xs font-arcade bg-yellow-900/50 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-900 rounded-none"
        >
          DEFER
        </button>
      </div>
    </div>
  );
}
