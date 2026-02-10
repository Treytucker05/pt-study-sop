import { useMemo, useState, type ReactNode } from "react";
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, useDraggable, useDroppable, type DragEndEvent } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, GripVertical, Play, RefreshCw } from "lucide-react";
import { format, isPast, isToday, isTomorrow, parseISO, isValid } from "date-fns";

import { api, type PlannerTask } from "@/lib/api";
import { useToast } from "@/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PlannerKanbanColumnId = "pending" | "in_progress";

const COLUMNS: { id: PlannerKanbanColumnId; label: string; hint: string }[] = [
  { id: "pending", label: "Queue", hint: "Drop here to keep it pending" },
  { id: "in_progress", label: "In Progress", hint: "Drop here to mark in-progress" },
];

function formatDueLabel(d?: string | null) {
  if (!d) return null;
  try {
    const date = parseISO(d);
    if (!isValid(date)) return d;
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    if (isPast(date) && !isToday(date)) return "Overdue";
    return format(date, "MMM d");
  } catch {
    return d;
  }
}

function taskTitle(t: PlannerTask) {
  return (t.anchor_text || t.notes || "Untitled task").trim();
}

function KanbanColumn({
  id,
  label,
  hint,
  count,
  children,
}: {
  id: PlannerKanbanColumnId;
  label: string;
  hint: string;
  count: number;
  children: ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id,
    data: { type: "planner_column", status: id },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col h-[360px] sm:h-[420px] border border-secondary/40 bg-black/30 rounded-none",
        isOver && "border-primary/70 bg-primary/10"
      )}
      aria-label={label}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-secondary/30">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-arcade text-[10px] text-primary/90 tracking-widest uppercase truncate">
            {label}
          </span>
          <Badge variant="outline" className="rounded-none text-[9px] px-1.5 py-0">
            {count}
          </Badge>
        </div>
        <span className="font-terminal text-[9px] text-muted-foreground hidden sm:inline">
          {hint}
        </span>
      </div>

      <div className="flex-1 p-2 overflow-y-auto">
        <div className="space-y-2">{children}</div>
      </div>
    </div>
  );
}

function PlannerTaskCard({
  task,
  primaryAction,
  onComplete,
}: {
  task: PlannerTask;
  primaryAction: { label: string; title: string; icon: ReactNode; onClick: () => void };
  onComplete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: String(task.id),
    data: { type: "planner_task", taskId: task.id, status: task.status ?? "pending" },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.6 : 1,
  };

  const dueLabel = formatDueLabel(task.scheduled_date);
  const isOverdue = dueLabel === "Overdue";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group border border-secondary/40 bg-black/40 hover:border-primary/40 transition-colors rounded-none px-2.5 py-2",
        isDragging && "ring-2 ring-primary/50 border-primary/60"
      )}
      data-task-id={task.id}
    >
      <div className="flex items-start gap-2">
        <div
          className="mt-0.5 text-muted-foreground hover:text-primary cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
          aria-label="Drag task"
        >
          <GripVertical className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <div className="font-terminal text-xs text-white leading-snug flex-1 min-w-0">
              <span className="block truncate">{taskTitle(task)}</span>
            </div>
            {dueLabel && (
              <span
                className={cn(
                  "font-terminal text-[10px] px-1.5 py-0.5 border rounded-none shrink-0",
                  isOverdue ? "text-red-400 border-red-500/40 bg-red-500/10" : "text-muted-foreground border-secondary/40"
                )}
                title={task.scheduled_date || undefined}
              >
                {dueLabel}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            {task.course_name && (
              <span className="font-terminal text-[10px] text-cyan-300 border border-cyan-500/30 bg-cyan-500/10 px-1.5 py-0.5 rounded-none">
                {task.course_name}
              </span>
            )}
            {typeof task.planned_minutes === "number" && task.planned_minutes > 0 && (
              <span className="font-terminal text-[10px] text-muted-foreground border border-secondary/30 bg-secondary/10 px-1.5 py-0.5 rounded-none">
                {task.planned_minutes}m
              </span>
            )}
            {typeof task.review_number === "number" && task.review_number > 0 && (
              <span className="font-terminal text-[10px] text-yellow-300 border border-yellow-500/30 bg-yellow-500/10 px-1.5 py-0.5 rounded-none">
                R{task.review_number}
              </span>
            )}
            {typeof task.priority === "number" && task.priority > 0 && (
              <span className="font-terminal text-[10px] text-orange-300 border border-orange-500/30 bg-orange-500/10 px-1.5 py-0.5 rounded-none">
                P{task.priority}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 rounded-none font-terminal text-[10px]"
            onClick={(e) => {
              e.stopPropagation();
              primaryAction.onClick();
            }}
            title={primaryAction.title}
          >
            {primaryAction.icon}
            {primaryAction.label}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 rounded-none font-terminal text-[10px] text-green-400 hover:text-green-300"
            onClick={(e) => {
              e.stopPropagation();
              onComplete();
            }}
            title="Complete"
          >
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}

export function PlannerKanban({ tasks }: { tasks: PlannerTask[] }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const updateTaskMutation = useMutation({
    mutationFn: (vars: { id: number; data: Record<string, unknown> }) =>
      api.planner.updateTask(vars.id, vars.data),
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: ["planner-queue"] });
      const previous = queryClient.getQueryData<PlannerTask[]>(["planner-queue"]);

      if (previous) {
        queryClient.setQueryData<PlannerTask[]>(["planner-queue"], () => {
          const next = previous.slice();
          const idx = next.findIndex((t) => t.id === vars.id);
          if (idx === -1) return next;
          const nextTask = { ...next[idx], ...(vars.data as Partial<PlannerTask>) };
          const nextStatus = (vars.data as Partial<PlannerTask>).status;
          if (nextStatus === "completed") {
            return next.filter((t) => t.id !== vars.id);
          }
          next[idx] = nextTask;
          return next;
        });
      }

      return { previous };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(["planner-queue"], ctx.previous);
      toast({ title: "Update failed", description: String(err), variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["planner-queue"] });
    },
  });

  const generateMutation = useMutation({
    mutationFn: () => api.planner.generate(),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["planner-queue"] });
      toast({ title: "Planner refreshed", description: `${res.tasks_created ?? 0} task(s) created` });
    },
    onError: (err) => {
      toast({ title: "Generate failed", description: String(err), variant: "destructive" });
    },
  });

  const tasksById = useMemo(() => {
    const map = new Map<string, PlannerTask>();
    for (const t of tasks) map.set(String(t.id), t);
    return map;
  }, [tasks]);

  const pending = useMemo(
    () => tasks.filter((t) => (t.status || "pending") === "pending"),
    [tasks]
  );
  const inProgress = useMemo(
    () => tasks.filter((t) => (t.status || "pending") === "in_progress"),
    [tasks]
  );

  const sortTasks = (arr: PlannerTask[]) =>
    [...arr].sort((a, b) => {
      const ad = a.scheduled_date || "";
      const bd = b.scheduled_date || "";
      if (ad !== bd) return ad.localeCompare(bd);
      const ap = typeof a.priority === "number" ? a.priority : 0;
      const bp = typeof b.priority === "number" ? b.priority : 0;
      return bp - ap;
    });

  const pendingSorted = useMemo(() => sortTasks(pending), [pending]);
  const inProgressSorted = useMemo(() => sortTasks(inProgress), [inProgress]);

  const handleMove = (taskId: number, status: PlannerKanbanColumnId) => {
    updateTaskMutation.mutate({ id: taskId, data: { status } });
  };

  const handleComplete = (taskId: number) => {
    updateTaskMutation.mutate({ id: taskId, data: { status: "completed" } });
  };

  const onDragEnd = (event: DragEndEvent) => {
    setActiveTaskId(null);
    const nextStatus = event.over?.data.current?.status as PlannerKanbanColumnId | undefined;
    const activeId = event.active?.id;
    if (!nextStatus || !activeId) return;
    if (!COLUMNS.some((c) => c.id === nextStatus)) return;

    const task = tasksById.get(String(activeId));
    if (!task) return;

    const currentStatus = (task.status || "pending") as PlannerKanbanColumnId;
    if (currentStatus === nextStatus) return;

    handleMove(task.id, nextStatus);
  };

  const activeTask = activeTaskId ? tasksById.get(activeTaskId) : null;

  return (
    <Card className="bg-black/40 border-2 border-primary rounded-none">
      <CardHeader className="border-b border-primary/50 p-4">
        <CardTitle className="font-arcade text-sm flex items-center justify-between gap-3">
          <span className="truncate">PLANNER_BOARD</span>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="rounded-none text-[9px]">
              {tasks.length} tasks
            </Badge>
            <Button
              size="sm"
              variant="outline"
              className="rounded-none font-arcade text-xs border-primary"
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              title="Generate tasks from recent weak anchors"
            >
              <RefreshCw className={cn("w-3.5 h-3.5 mr-2", generateMutation.isPending && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-4">
        <DndContext
          sensors={sensors}
          onDragStart={(e) => setActiveTaskId(String(e.active.id))}
          onDragCancel={() => setActiveTaskId(null)}
          onDragEnd={onDragEnd}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <KanbanColumn
              id="pending"
              label="Queue"
              hint="Drag to start"
              count={pending.length}
            >
              {pendingSorted.length === 0 ? (
                <div className="px-2 py-8 text-center font-terminal text-xs text-muted-foreground">
                  No pending tasks
                </div>
              ) : (
                pendingSorted.map((t) => (
                  <PlannerTaskCard
                    key={t.id}
                    task={t}
                    primaryAction={{
                      label: "Start",
                      title: "Start",
                      icon: <Play className="w-3 h-3 mr-1" />,
                      onClick: () => handleMove(t.id, "in_progress"),
                    }}
                    onComplete={() => handleComplete(t.id)}
                  />
                ))
              )}
            </KanbanColumn>

            <KanbanColumn
              id="in_progress"
              label="In Progress"
              hint="Drag back to queue"
              count={inProgress.length}
            >
              {inProgressSorted.length === 0 ? (
                <div className="px-2 py-8 text-center font-terminal text-xs text-muted-foreground">
                  Nothing in progress
                </div>
              ) : (
                inProgressSorted.map((t) => (
                  <PlannerTaskCard
                    key={t.id}
                    task={t}
                    primaryAction={{
                      label: "Queue",
                      title: "Move back to queue",
                      icon: <ArrowLeft className="w-3 h-3 mr-1" />,
                      onClick: () => handleMove(t.id, "pending"),
                    }}
                    onComplete={() => handleComplete(t.id)}
                  />
                ))
              )}
            </KanbanColumn>
          </div>

          <DragOverlay>
            {activeTask ? (
              <div className="opacity-90 rotate-1">
                <div className="border border-primary/60 bg-black/80 px-3 py-2 rounded-none shadow-2xl">
                  <div className="font-terminal text-xs text-white truncate">
                    {taskTitle(activeTask)}
                  </div>
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </CardContent>
    </Card>
  );
}
