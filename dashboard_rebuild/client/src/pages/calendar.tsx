import Layout from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useMemo, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, Circle, Plus, ChevronLeft, ChevronRight, RefreshCw, Calendar as CalendarIcon, Trash2, Search, ExternalLink, Pin, PinOff, ChevronDown, GripVertical } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type GoogleTask } from "@/lib/api";
import { useToast } from "@/use-toast";
import { SortableTaskItem, TaskListContainer, TaskDialog } from "@/components/GoogleTasksComponents";
import { CalendarAssistant, CalendarAssistantButton } from "@/components/CalendarAssistant";
import { EventEditModal } from "@/components/EventEditModal";
import { LocalEventEditModal, type LocalCalendarEvent } from "@/components/LocalEventEditModal";
import type { InsertCalendarEvent, CalendarEvent, Course } from "@shared/schema";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis, restrictToWindowEdges } from '@dnd-kit/modifiers';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay,
  addMonths, subMonths, startOfWeek, endOfWeek, isToday, addDays, subDays,
  addWeeks, subWeeks, setHours, setMinutes, differenceInMinutes, addHours, startOfDay
} from "date-fns";
import { cn } from "@/lib/utils";

type ViewMode = "month" | "week" | "day" | "tasks";

interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: { dateTime?: string; date?: string; timeZone?: string };
  end?: { dateTime?: string; date?: string; timeZone?: string };
  recurrence?: string[];
  recurringEventId?: string;
  colorId?: string;
  calendarId?: string;
  calendarSummary?: string;
  calendarColor?: string;
  htmlLink?: string;
  eventType?: string;
  course?: string;
  courseId?: number;
  courseCode?: string;
  weight?: string;
  extendedProperties?: { private?: Record<string, string> };
  conferenceData?: { entryPoints?: { uri?: string; entryPointType?: string }[]; conferenceSolution?: { name?: string } };
  hangoutLink?: string;
  attendees?: { email: string; responseStatus?: string; self?: boolean }[];
  visibility?: string;
  transparency?: string;
  reminders?: { useDefault?: boolean; overrides?: { method: string; minutes: number }[] };
}

interface NormalizedEvent {
  id: string | number;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  isGoogle: boolean;
  eventType?: string;
  calendarColor?: string;
  calendarName?: string;
  originalEvent: CalendarEvent | GoogleCalendarEvent;
}

interface CourseOption {
  id: number;
  name: string;
  code?: string | null;
}

const parseDateOnly = (value?: string) => {
  if (!value) return new Date();
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return new Date(value);
  return new Date(year, month - 1, day);
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_HEIGHT = 60;

// -----------------------------------------------------------------------------
// Google Tasks Board
// -----------------------------------------------------------------------------
function GoogleTasksBoard({ tasks, taskLists }: { tasks: GoogleTask[], taskLists: { id: string, title: string }[] }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<GoogleTask | null>(null);
  const [currentListIndex, setCurrentListIndex] = useState(0);
  const [creatingListId, setCreatingListId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const moveMutation = useMutation({
    mutationFn: (vars: any) => api.googleTasks.move(vars.taskId, vars.listId, vars.destListId, vars.previous, vars.parent),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["google-tasks"] }),
    onError: () => toast({ title: "Move Failed", variant: "destructive" })
  });

  const updateMutation = useMutation({
    mutationFn: (vars: { id: string, listId: string, data: any }) => api.googleTasks.update(vars.id, vars.listId, vars.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["google-tasks"] });
      setEditingTask(null);
    }
  });

  const createMutation = useMutation({
    mutationFn: (vars: { listId: string, title: string }) => api.googleTasks.create(vars.listId, { title: vars.title, status: 'needsAction' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["google-tasks"] })
  });

  const deleteMutation = useMutation({
    mutationFn: (vars: { id: string, listId: string }) => api.googleTasks.delete(vars.id, vars.listId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["google-tasks"] })
  });

  const toggleMutation = useMutation({
    mutationFn: (task: GoogleTask) => api.googleTasks.update(task.id, task.listId, {
      status: task.status === 'completed' ? 'needsAction' : 'completed'
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["google-tasks"] })
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeTask = tasks.find(t => t.id === active.id);
    if (!activeTask) return;

    // Resolve destination
    let destListId = null;
    if (over.data.current?.listId) {
      destListId = over.data.current.listId;
    } else if (over.data.current?.type === 'Container') {
      destListId = over.id;
    } else {
      // Fallback find task
      const overTask = tasks.find(t => t.id === over.id);
      if (overTask) destListId = overTask.listId;
    }

    if (!destListId) return; // Should not happen

    if (active.id !== over.id || activeTask.listId !== destListId) {
      // Calculate Previous ID
      // Get tasks in dest list, sorted
      const destTasks = tasks.filter(t => t.listId === destListId).sort((a, b) => (a.position || '').localeCompare(b.position || ''));

      // Calculate new index
      // If dropping on container (empty), index 0
      // If dropping on task, dnd-kit uses arrayMove usually logic
      // But we are managing manually.

      let previousId = undefined;

      if (active.id !== over.id) {
        const oldIndex = tasks.findIndex(t => t.id === active.id); // Valid if same list
        const newIndex = destTasks.findIndex(t => t.id === over.id);

        // If moving cross list, oldIndex is -1 in destTasks context
        // Simple approximation: If dropping ON 'over', we place it AFTER 'over'? Or BEFORE?
        // Sortable usually swaps.

        // We will simply treat 'over' as the target position.
        // Ideally we calculate using arrayMove simulation.
        // For now: Insert BEFORE 'over' (so previous is over's previous).
        // IF accessing 'over' index.

        if (newIndex !== -1) {
          if (newIndex > 0) previousId = destTasks[newIndex - 1].id;
        }
      }

      moveMutation.mutate({
        taskId: activeTask.id,
        listId: activeTask.listId,
        destListId: destListId,
        previous: previousId
      });
    }
  };

  const targetLists = ['Reclaim', 'Workouts', 'To Do'];

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      onDragStart={(e) => setActiveId(e.active.id as string)}
    >
      <div className="flex h-full items-start justify-center gap-4 pt-4">

        {/* Prev Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentListIndex(prev => (prev - 1 + taskLists.length) % taskLists.length)}
          className="h-10 w-10 mt-3 rounded-none border border-secondary hover:bg-primary/10 hover:text-primary shrink-0"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        {/* Active List */}
        {taskLists.length > 0 && (() => {
          const list = taskLists[currentListIndex];
          const listTasks = tasks
            .filter(t => t.listId === list.id)
            .sort((a, b) => (a.position || '').localeCompare(b.position || ''));

          return (
            <div className="h-full w-[320px] shrink-0">
              <TaskListContainer
                key={list.id}
                listId={list.id}
                title={list.title}
                tasks={listTasks}
                onAddTask={(lid) => setCreatingListId(lid)}
                onEdit={(t) => setEditingTask(t)}
                onToggle={(t) => toggleMutation.mutate(t as GoogleTask)}
                onDelete={(id, lid) => {
                  if (confirm("Delete task?")) deleteMutation.mutate({ id, listId: lid });
                }}
              />
            </div>
          );
        })()}

        {/* Next Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentListIndex(prev => (prev + 1) % taskLists.length)}
          className="h-10 w-10 mt-3 rounded-none border border-secondary hover:bg-primary/10 hover:text-primary shrink-0"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <DragOverlay>
        {activeId ? (
          <div className="opacity-80 rotate-2 cursor-grabbing">
            <div className="p-2 border bg-card text-primary font-arcade text-xs border-primary">
              {tasks.find(t => t.id === activeId)?.title || "Task"}
            </div>
          </div>
        ) : null}
      </DragOverlay>

      <TaskDialog
        task={editingTask}
        isOpen={!!editingTask}
        onClose={() => setEditingTask(null)}
        onSave={(data) => {
          // Ensure data is Partial<GoogleTask>
          if (editingTask) updateMutation.mutate({ id: editingTask.id, listId: editingTask.listId, data });
        }}
        onDelete={(id, lid) => deleteMutation.mutate({ id, listId: lid })}
        availableLists={taskLists}
      />

      <TaskDialog
        task={null}
        isOpen={!!creatingListId}
        isCreating={true}
        activeListId={creatingListId || undefined}
        availableLists={taskLists}
        onClose={() => setCreatingListId(null)}
        onSave={(data) => {
          if (creatingListId && data.title) createMutation.mutate({ listId: creatingListId, title: data.title, ...data });
        }}
        onDelete={() => { }}
      />
    </DndContext>
  );
}

function SortableCalendarRow({ cal, isHidden, onToggle }: { cal: { id: string; name: string; color: string }; isHidden: boolean; onToggle: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: cal.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 p-2 border border-secondary hover:bg-secondary/30 transition-colors",
        isHidden && "opacity-50"
      )}
    >
      <div {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground">
        <GripVertical className="w-4 h-4" />
      </div>
      <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: cal.color }} />
      <span className="font-terminal text-sm flex-1 cursor-pointer" onClick={onToggle}>{cal.name}</span>
      <span
        className={cn("font-arcade text-[10px] px-2 py-0.5 cursor-pointer", isHidden ? "text-red-500" : "text-green-500")}
        onClick={onToggle}
      >
        {isHidden ? 'HIDDEN' : 'VISIBLE'}
      </span>
    </div>
  );
}

export default function CalendarPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [showEventModal, setShowEventModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<LocalCalendarEvent | null>(null);
  const [newEvent, setNewEvent] = useState({
    title: "",
    date: "",
    endDate: "",
    startTime: "09:00",
    endTime: "10:00",
    allDay: false,
    eventType: "study" as "study" | "lecture" | "exam" | "synchronous" | "online",
    color: "#ef4444",
    recurrence: "" as "" | "daily" | "weekly" | "monthly" | "yearly",
    calendarId: "",
  });
  const [selectedCalendars, setSelectedCalendars] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("selectedCalendars");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return new Set(parsed);
      }
    } catch { /* corrupted localStorage — fall through to empty */ }
    return new Set();
  });
  const [showLocalEvents, setShowLocalEvents] = useState(true);
  const [calendarSelectionDirty, setCalendarSelectionDirty] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGoogleEvent, setSelectedGoogleEvent] = useState<GoogleCalendarEvent | null>(null);
  const [showGoogleEditModal, setShowGoogleEditModal] = useState(false);
  const [googleEditMode, setGoogleEditMode] = useState<"instance" | "series">("series");
  const [showAssistant, setShowAssistant] = useState(false);
  const [showMiniCalendar, setShowMiniCalendar] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const debugModals =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("debugModals");

  // Calendar Organization State
  const [pinnedCalendars, setPinnedCalendars] = useState<string[]>(() => {
    const saved = localStorage.getItem("pinnedCalendars");
    return saved ? JSON.parse(saved) : [];
  });
  const [hiddenCalendars, setHiddenCalendars] = useState<string[]>(() => {
    const saved = localStorage.getItem("hiddenCalendars");
    return saved ? JSON.parse(saved) : [];
  });
  const [showCalendarSettings, setShowCalendarSettings] = useState(false);
  const calendarOrderSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [isOthersOpen, setIsOthersOpen] = useState(false);

  useEffect(() => {
    if (showEditModal && !selectedEvent) {
      if (debugModals) {
        console.warn("[ModalDebug][Calendar] Edit modal open without event; closing.");
      }
      setShowEditModal(false);
    }
  }, [debugModals, selectedEvent, showEditModal]);

  useEffect(() => {
    if (showGoogleEditModal && !selectedGoogleEvent) {
      if (debugModals) {
        console.warn("[ModalDebug][Calendar] Google edit modal open without event; closing.");
      }
      setShowGoogleEditModal(false);
    }
  }, [debugModals, selectedGoogleEvent, showGoogleEditModal]);

  useEffect(() => {
    if (!debugModals) return;
    console.info("[ModalDebug][Calendar] state", {
      showEditModal,
      selectedEvent: selectedEvent?.id ?? null,
      showGoogleEditModal,
      selectedGoogleEvent: selectedGoogleEvent?.id ?? null,
      googleEditMode,
      showCalendarSettings,
      showEventModal,
    });
  }, [
    debugModals,
    selectedEvent,
    selectedGoogleEvent,
    googleEditMode,
    showCalendarSettings,
    showEditModal,
    showEventModal,
    showGoogleEditModal,
  ]);

  const toggleHideCalendar = (calId: string) => {
    setHiddenCalendars(prev => {
      const isHidden = prev.includes(calId);
      const next = isHidden ? prev.filter(h => h !== calId) : [...prev, calId];
      localStorage.setItem("hiddenCalendars", JSON.stringify(next));
      // Also hide from selected when hiding
      if (!isHidden) {
        setSelectedCalendars(sel => {
          const newSet = new Set(sel);
          newSet.delete(calId);
          return newSet;
        });
      }
      return next;
    });
  };

  const togglePin = (calId: string) => {
    setPinnedCalendars(prev => {
      const isPinned = prev.includes(calId);
      const next = isPinned ? prev.filter(p => p !== calId) : [...prev, calId];
      localStorage.setItem("pinnedCalendars", JSON.stringify(next));

      // Auto-show when pinning, auto-hide when unpinning
      setSelectedCalendars(sel => {
        const newSet = new Set(sel);
        if (isPinned) {
          newSet.delete(calId);
        } else {
          newSet.add(calId);
        }
        return newSet;
      });

      return next;
    });
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });

  const { data: rawLocalEvents = [] } = useQuery({
    queryKey: ["events"],
    queryFn: api.events.getAll,
  });
  
  const localEvents: LocalCalendarEvent[] = rawLocalEvents.map((e) => ({
    ...e,
    date: new Date(e.date),
    endDate: e.endDate ? new Date(e.endDate) : null,
    createdAt: new Date(e.createdAt),
  }));

  const { data: googleEvents = [], isLoading: isLoadingGoogle, refetch: refetchGoogle } = useQuery({
    queryKey: ["google-calendar", currentDate.getFullYear(), currentDate.getMonth()],
    queryFn: async () => {
      const timeMin = startOfMonth(subMonths(currentDate, 1)).toISOString();
      const timeMax = endOfMonth(addMonths(currentDate, 1)).toISOString();
      const res = await fetch(`/api/google-calendar/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json() as Promise<GoogleCalendarEvent[]>;
    },
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: api.tasks.getAll,
  });


  const { data: googleTasks = [], isLoading: isLoadingTasks, isError: isTasksError, refetch: refetchTasks } = useQuery({
    queryKey: ["google-tasks"],
    queryFn: api.googleTasks.getAll,
    retry: 1,
  });

  const { data: studyWheelCourses = [] } = useQuery<Course[]>({
    queryKey: ["courses"],
    queryFn: api.courses.getActive,
  });

  const { data: googleTaskLists = [] } = useQuery({
    queryKey: ["google-task-lists"],
    queryFn: api.googleTasks.getLists
  });


  interface GoogleCalendarInfo {
    id: string;
    summary: string;
    backgroundColor?: string;
  }

  const { data: calendarList = [], refetch: refetchCalendarList } = useQuery({
    queryKey: ["google-calendar-list"],
    queryFn: async () => {
      const res = await fetch("/api/google-calendar/calendars");
      if (!res.ok) throw new Error("Failed to fetch calendar list");
      return res.json() as Promise<GoogleCalendarInfo[]>;
    },
  });

  const { data: googleStatus, refetch: refetchGoogleStatus, isLoading: isGoogleStatusLoading, error: googleStatusError } = useQuery({
    queryKey: ["google-status"],
    queryFn: api.google.getStatus,
    retry: 1,
  });
  const googleConnected = !!googleStatus?.connected;

  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const statusResult = await refetchGoogleStatus();
      if (statusResult.data && !statusResult.data.connected) {
        toast({ title: "SYNC_FAILED", description: "Google is not connected.", variant: "destructive" });
        return;
      }

      const calendarResult = await refetchCalendarList();
      const calendars = calendarResult.data || [];
      const calendarIds = calendars.map((cal) => cal.id).filter(Boolean);

      let syncSummary: { imported?: number; updated?: number; pushed?: number; deleted?: number; skipped?: number; errors?: string[] } | null = null;
      if (calendarIds.length > 0) {
        const syncRes = await fetch("/api/gcal/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ calendar_ids: calendarIds }),
        });
        if (!syncRes.ok) throw new Error("Failed to sync with Google.");
        const payload = await syncRes.json();
        if (payload?.success === false) {
          throw new Error(payload.error || "Sync failed.");
        }
        syncSummary = payload || null;
      }

      if (calendarIds.length > 0) {
        const next = new Set(calendarIds);
        setSelectedCalendars(next);
        setHiddenCalendars([]);
        if (typeof window !== "undefined") {
          localStorage.setItem("selectedCalendars", JSON.stringify(calendarIds));
          localStorage.setItem("hiddenCalendars", JSON.stringify([]));
        }
        setCalendarSelectionDirty(false);
      }

      queryClient.invalidateQueries({ queryKey: ["events"] });
      await refetchGoogle();
      if (syncSummary) {
        const counts = [
          typeof syncSummary.imported === "number" ? `${syncSummary.imported} imported` : null,
          typeof syncSummary.updated === "number" ? `${syncSummary.updated} updated` : null,
          typeof syncSummary.pushed === "number" ? `${syncSummary.pushed} pushed` : null,
        ].filter(Boolean).join(", ");
        const suffix = syncSummary.errors?.length ? ` (${syncSummary.errors.length} errors)` : "";
        toast({ title: "SYNCED", description: `Google sync complete${counts ? `: ${counts}` : ""}${suffix}.` });
      } else {
        toast({ title: "SYNCED", description: "Google calendars refreshed." });
      }
    } catch (err) {
      toast({
        title: "SYNC_FAILED",
        description: err instanceof Error ? err.message : "Unable to sync Google calendars.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const connectGoogleMutation = useMutation({
    mutationFn: async () => {
      const { authUrl } = await api.google.getAuthUrl();
      window.location.href = authUrl;
    },
  });

  const disconnectGoogleMutation = useMutation({
    mutationFn: api.google.disconnect,
    onSuccess: () => {
      refetchGoogleStatus();
      queryClient.invalidateQueries({ queryKey: ["google-calendar-events"] });
      queryClient.invalidateQueries({ queryKey: ["google-calendar-list"] });
      queryClient.invalidateQueries({ queryKey: ["google-tasks"] });
    },
  });

  const { data: savedCalendarOrder = [] } = useQuery({
    queryKey: ["calendar-order"],
    queryFn: async () => {
      const res = await fetch("/api/calendar-order?userId=default");
      if (!res.ok) return [];
      return res.json() as Promise<string[]>;
    },
  });

  const saveCalendarOrderMutation = useMutation({
    mutationFn: async (order: string[]) => {
      const res = await fetch("/api/calendar-order", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "default", order }),
      });
      if (!res.ok) throw new Error("Failed to save calendar order");
    },
    onMutate: async (order) => {
      await queryClient.cancelQueries({ queryKey: ["calendar-order"] });
      queryClient.setQueryData(["calendar-order"], order);
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-order"] });
    },
  });

  const availableCalendars = useMemo(() => {
    const cals = calendarList.map(cal => ({
      id: cal.id,
      name: cal.summary,
      color: cal.backgroundColor || '#888888',
    }));
    if (savedCalendarOrder.length > 0) {
      const orderMap = new Map(savedCalendarOrder.map((id, i) => [id, i]));
      cals.sort((a, b) => {
        const aIdx = orderMap.get(a.id) ?? 999;
        const bIdx = orderMap.get(b.id) ?? 999;
        return aIdx - bIdx;
      });
    }
    return cals;
  }, [calendarList, savedCalendarOrder]);

  // Filter out hidden calendars from display
  const visibleCalendars = useMemo(() => {
    return availableCalendars.filter(cal => !hiddenCalendars.includes(cal.id));
  }, [availableCalendars, hiddenCalendars]);

  const courseOptions = useMemo<CourseOption[]>(() => {
    const mapped = studyWheelCourses
      .map((course) => ({
        id: course.id,
        name: course.name,
        code: (course as Course & { code?: string | null }).code ?? null,
      }))
      .filter((course) => !!course.name);
    const byId = new Map<number, CourseOption>();
    mapped.forEach((course) => {
      if (!byId.has(course.id)) {
        byId.set(course.id, course);
      }
    });
    return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [studyWheelCourses]);

  useEffect(() => {
    if (availableCalendars.length > 0 && selectedCalendars.size === 0
        && !localStorage.getItem("selectedCalendars")) {
      const pinnedIds = pinnedCalendars.length > 0
        ? pinnedCalendars
        : availableCalendars.slice(0, 2).map(c => c.id);
      setSelectedCalendars(new Set(pinnedIds));
    }
  }, [availableCalendars, pinnedCalendars]);

  // Ensure default calendars are pinned initially if empty
  useEffect(() => {
    if (availableCalendars.length > 0 && pinnedCalendars.length === 0 && !localStorage.getItem("pinnedCalendars")) {
      // Pin first 2 by default
      const defaults = availableCalendars.slice(0, 2).map(c => c.id);
      setPinnedCalendars(defaults);
      localStorage.setItem("pinnedCalendars", JSON.stringify(defaults));
    }
  }, [availableCalendars, pinnedCalendars]);

  const toggleCalendar = (calendarId: string) => {
    setSelectedCalendars(prev => {
      const newSet = new Set(prev);
      if (newSet.has(calendarId)) {
        newSet.delete(calendarId);
      } else {
        newSet.add(calendarId);
      }
      return newSet;
    });
    setCalendarSelectionDirty(true);
  };

  const createEventMutation = useMutation({
    mutationFn: api.events.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      setShowEventModal(false);
      resetNewEvent();
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertCalendarEvent> & { courseId?: number | null } }) =>
      api.events.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      setShowEditModal(false);
      setSelectedEvent(null);
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: api.events.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      setShowEditModal(false);
      setSelectedEvent(null);
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: api.tasks.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const toggleTaskMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.tasks.update(id, { status: status === "completed" ? "pending" : "completed" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const createGoogleTaskMutation = useMutation({
    mutationFn: async (title: string) => {
      const res = await fetch("/api/google-tasks/@default", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error("Failed to create task");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["google-tasks"] });
    },
  });

  const toggleGoogleTaskMutation = useMutation({
    mutationFn: async ({ taskId, completed }: { taskId: string; completed: boolean }) => {
      const res = await fetch(`/api/google-tasks/@default/${taskId}/toggle`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      });
      if (!res.ok) throw new Error("Failed to toggle task");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["google-tasks"] });
    },
  });

  const deleteGoogleEventMutation = useMutation({
    mutationFn: async ({ eventId, calendarId }: { eventId: string; calendarId: string }) => {
      const res = await fetch(`/api/google-calendar/events/${encodeURIComponent(eventId)}?calendarId=${encodeURIComponent(calendarId)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete event");
      if (res.status === 204) return null;
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["google-calendar"] });
      refetchGoogle();
      toast({ title: "EVENT_DELETED", description: "Event removed from Google Calendar" });
      setShowGoogleEditModal(false);
      setSelectedGoogleEvent(null);
    },
    onError: (err) => {
      toast({ title: "DELETE_FAILED", description: err.message, variant: "destructive" });
    }
  });

  const updateGoogleEventMutation = useMutation({
    mutationFn: async (event: GoogleCalendarEvent) => {
      if (!event.calendarId) throw new Error('Missing calendarId');
      const privateProps: Record<string, string> = {
        ...(event.extendedProperties?.private || {}),
      };
      if (event.eventType !== undefined) {
        privateProps.eventType = event.eventType;
      } else {
        delete privateProps.eventType;
      }
      if (event.course !== undefined) {
        privateProps.course = event.course;
      } else {
        delete privateProps.course;
      }
      if (event.courseId !== undefined) {
        privateProps.courseId = String(event.courseId);
      } else {
        delete privateProps.courseId;
      }
      if (event.courseCode !== undefined) {
        privateProps.courseCode = event.courseCode;
      } else {
        delete privateProps.courseCode;
      }
      if (event.weight !== undefined) {
        privateProps.weight = event.weight;
      } else {
        delete privateProps.weight;
      }
      const timeZoneProp = event.extendedProperties?.private?.timeZone || event.start?.timeZone;
      if (timeZoneProp) privateProps.timeZone = timeZoneProp;
      const extendedProperties = Object.keys(privateProps).length ? { private: privateProps } : undefined;

      const res = await fetch(`/api/google-calendar/events/${encodeURIComponent(event.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calendarId: event.calendarId,
          summary: event.summary,
          description: event.description,
          location: event.location,
          start: event.start,
          end: event.end,
          recurrence: event.recurringEventId ? undefined : event.recurrence,
          attendees: event.attendees,
          visibility: event.visibility,
          transparency: event.transparency,
          colorId: event.colorId,
          reminders: event.reminders,
          extendedProperties,
        }),
      });
      if (!res.ok) throw new Error('Failed to update google event');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["google-calendar"] });
      refetchGoogle();
      toast({ title: "EVENT_UPDATED", description: "Changes synced to Google Calendar" });
      setShowGoogleEditModal(false);
    },
    onError: (err) => {
      toast({ title: "SYNC_FAILED", description: err.message, variant: "destructive" });
    }
  });

  const createGoogleEventMutation = useMutation({
    mutationFn: async (payload: {
      calendarId: string;
      title: string;
      date: Date;
      endDate: Date | null;
      allDay: boolean;
      recurrence?: string | null;
    }) => {
      const res = await fetch("/api/google-calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to create Google event");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["google-calendar"] });
      refetchGoogle();
      setShowEventModal(false);
      resetNewEvent();
      toast({ title: "EVENT_CREATED", description: "Saved to Google Calendar" });
    },
    onError: (err) => {
      toast({ title: "CREATE_FAILED", description: err.message, variant: "destructive" });
    }
  });

  const handleGoogleDeleteInstance = () => {
    if (!selectedGoogleEvent || !selectedGoogleEvent.calendarId) return;
    if (!confirm("Delete this single occurrence?")) return;
    deleteGoogleEventMutation.mutate({
      eventId: selectedGoogleEvent.id,
      calendarId: selectedGoogleEvent.calendarId,
    });
  };

  const handleGoogleDeleteSeries = () => {
    if (!selectedGoogleEvent || !selectedGoogleEvent.calendarId) return;
    const seriesId = selectedGoogleEvent.recurringEventId || selectedGoogleEvent.id;
    if (!confirm("Delete the ENTIRE series? This cannot be undone.")) return;
    deleteGoogleEventMutation.mutate({
      eventId: seriesId,
      calendarId: selectedGoogleEvent.calendarId,
    });
  };

  const handleGoogleSave = () => {
    if (selectedGoogleEvent) {
      updateGoogleEventMutation.mutate(selectedGoogleEvent);
    }
  };

  const resetNewEvent = () => {
    setNewEvent({
      title: "",
      date: "",
      endDate: "",
      startTime: "09:00",
      endTime: "10:00",
      allDay: false,
      eventType: "study",
      color: "#ef4444",
      recurrence: "",
      calendarId: "",
    });
  };

  const normalizeRecurrence = (value: string) => {
    if (!value || value === "none") return null;
    if (value.startsWith("RRULE:")) return value;
    switch (value) {
      case "daily":
        return "RRULE:FREQ=DAILY";
      case "weekly":
        return "RRULE:FREQ=WEEKLY";
      case "monthly":
        return "RRULE:FREQ=MONTHLY";
      case "yearly":
        return "RRULE:FREQ=YEARLY";
      default:
        return value;
    }
  };

  const isGoogleEvent = (event: CalendarEvent | GoogleCalendarEvent): event is GoogleCalendarEvent => {
    return 'summary' in event;
  };

  const normalizeEvent = (event: CalendarEvent | GoogleCalendarEvent): NormalizedEvent => {
    if (isGoogleEvent(event)) {
      const isAllDay = !!event.start?.date && !event.start?.dateTime;
      const startStr = event.start?.dateTime || event.start?.date || new Date().toISOString();
      const endStr = event.end?.dateTime || event.end?.date || startStr;
      const start = isAllDay && event.start?.date ? parseDateOnly(event.start.date) : new Date(startStr);
      let end = isAllDay && event.end?.date ? parseDateOnly(event.end.date) : new Date(endStr);
      if (isAllDay && event.start?.date && event.end?.date && event.end.date > event.start.date) {
        end = addDays(parseDateOnly(event.end.date), -1);
      }
      const isOnline = !!(event.conferenceData || event.hangoutLink);
      const storedEventType = event.eventType || event.extendedProperties?.private?.eventType;
      return {
        id: event.id,
        title: event.summary || 'Untitled',
        start,
        end,
        allDay: isAllDay,
        isGoogle: true,
        eventType: storedEventType || (isOnline ? 'online' : 'synchronous'),
        calendarColor: event.calendarColor,
        calendarName: event.calendarSummary,
        originalEvent: event,
      };
    } else {
      const localEvent = event;
      const start = new Date(localEvent.date);
      const end = localEvent.endDate ? new Date(localEvent.endDate) : addHours(start, 1);
      return {
        id: localEvent.id,
        title: localEvent.title,
        start,
        end,
        allDay: localEvent.allDay || false,
        isGoogle: false,
        eventType: localEvent.eventType,
        calendarColor: localEvent.color || undefined,
        originalEvent: event,
      };
    }
  };

  const isLocalOnlyEvent = (event: LocalCalendarEvent) =>
    !event.calendarId || event.calendarId === "local";

  const handleCreateEvent = () => {
    if (newEvent.title && newEvent.date) {
      const [startHours, startMinutes] = newEvent.startTime.split(':').map(Number);
      const [endHours, endMinutes] = newEvent.endTime.split(':').map(Number);
      const startDate = setMinutes(setHours(new Date(newEvent.date), startHours), startMinutes);

      let endDateTime: Date | null = null;
      if (!newEvent.allDay) {
        const endDateStr = newEvent.endDate || newEvent.date;
        endDateTime = setMinutes(setHours(new Date(endDateStr), endHours), endMinutes);
      } else if (newEvent.endDate) {
        endDateTime = new Date(newEvent.endDate);
      }

      const recurrence = normalizeRecurrence(newEvent.recurrence);

      if (newEvent.calendarId && newEvent.calendarId !== "local") {
        if (!googleConnected) {
          toast({ title: "SYNC_FAILED", description: "Google is not connected.", variant: "destructive" });
          return;
        }
        const googleEndDate =
          newEvent.allDay && newEvent.endDate
            ? addDays(new Date(newEvent.endDate), 1)
            : endDateTime;
        createGoogleEventMutation.mutate({
          calendarId: newEvent.calendarId,
          title: newEvent.title,
          date: startDate,
          endDate: googleEndDate,
          allDay: newEvent.allDay,
          recurrence,
        });
        return;
      }

      createEventMutation.mutate({
        title: newEvent.title,
        date: startDate,
        endDate: endDateTime,
        allDay: newEvent.allDay,
        eventType: newEvent.eventType,
        color: newEvent.color,
        recurrence,
        calendarId: "local",
      });
    }
  };

  const openCreateModal = (date: Date, hour?: number) => {
    const startHour = hour ?? 9;
    setNewEvent({
      title: "",
      date: format(date, 'yyyy-MM-dd'),
      endDate: "",
      startTime: `${startHour.toString().padStart(2, '0')}:00`,
      endTime: `${(startHour + 1).toString().padStart(2, '0')}:00`,
      allDay: false,
      eventType: "study",
      color: "#ef4444",
      recurrence: "",
      calendarId: "local",
    });
    setShowEventModal(true);
  };

  const openEditModal = (event?: LocalCalendarEvent | null) => {
    if (!event) return;
    setSelectedEvent(event);
    setShowEditModal(true);
  };

  const hydrateGoogleEvent = (event: GoogleCalendarEvent, fallback?: GoogleCalendarEvent): GoogleCalendarEvent => {
    const extras = event.extendedProperties?.private || {};
    const parsedCourseId = extras.courseId ? Number.parseInt(extras.courseId, 10) : undefined;
    const extrasCourseId = Number.isFinite(parsedCourseId) ? parsedCourseId : undefined;
    return {
      ...event,
      calendarId: event.calendarId ?? fallback?.calendarId,
      calendarSummary: event.calendarSummary ?? fallback?.calendarSummary,
      calendarColor: event.calendarColor ?? fallback?.calendarColor,
      eventType: event.eventType || extras.eventType || fallback?.eventType,
      course: event.course || extras.course || fallback?.course,
      courseId: event.courseId ?? extrasCourseId ?? fallback?.courseId,
      courseCode: event.courseCode || extras.courseCode || fallback?.courseCode,
      weight: event.weight || extras.weight || fallback?.weight,
    };
  };

  const openGoogleEditModal = (event?: GoogleCalendarEvent | null, modeOverride?: "instance" | "series") => {
    if (!event) return;
    const nextMode = modeOverride || (event.recurringEventId ? "instance" : "series");
    setGoogleEditMode(nextMode);
    setSelectedGoogleEvent(hydrateGoogleEvent(event));
    setShowGoogleEditModal(true);
  };

  const handleEditSeries = async () => {
    if (!selectedGoogleEvent?.recurringEventId || !selectedGoogleEvent.calendarId) return;
    try {
      const res = await fetch(
        `/api/google-calendar/events/${encodeURIComponent(selectedGoogleEvent.recurringEventId)}?calendarId=${encodeURIComponent(selectedGoogleEvent.calendarId)}`
      );
      if (!res.ok) throw new Error("Failed to load series");
      const data = await res.json();
      const nextEvent = hydrateGoogleEvent(
        {
          ...data,
          calendarId: selectedGoogleEvent.calendarId,
          calendarSummary: selectedGoogleEvent.calendarSummary,
          calendarColor: selectedGoogleEvent.calendarColor,
        },
        selectedGoogleEvent
      );
      setSelectedGoogleEvent(nextEvent);
      setGoogleEditMode("series");
    } catch (err: any) {
      toast({ title: "LOAD_FAILED", description: err?.message || "Unknown error", variant: "destructive" });
    }
  };

  const handleEventClick = (event: NormalizedEvent) => {
    if (event.isGoogle) {
      openGoogleEditModal(event.originalEvent as GoogleCalendarEvent);
    } else {
      openEditModal(event.originalEvent as LocalCalendarEvent);
    }
  };

  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    const results: NormalizedEvent[] = [];

    if (showLocalEvents) {
      localEvents.forEach(event => {
        if (googleConnected && !isLocalOnlyEvent(event)) return;
        if (event.title.toLowerCase().includes(query)) {
          results.push(normalizeEvent(event));
        }
      });
    }

    googleEvents.forEach(event => {
      if (!selectedCalendars.has(event.calendarId || '')) return;
      if (event.summary?.toLowerCase().includes(query)) {
        results.push(normalizeEvent(event));
      }
    });

    return results.sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [searchQuery, localEvents, googleEvents, showLocalEvents, selectedCalendars]);

  const eventSpansDay = (event: NormalizedEvent, day: Date): boolean => {
    const dayStart = setHours(setMinutes(day, 0), 0);
    const dayEnd = setHours(setMinutes(day, 59), 23);
    return event.start <= dayEnd && event.end >= dayStart;
  };

  const allNormalizedEvents = useMemo(() => {
    const results: NormalizedEvent[] = [];
    if (showLocalEvents) {
      localEvents.forEach(event => {
         if (googleConnected && !isLocalOnlyEvent(event)) return;
         results.push(normalizeEvent(event));
      });
    }
    googleEvents.forEach(event => {
      if (!selectedCalendars.has(event.calendarId || '')) return;
      results.push(normalizeEvent(event));
    });
    return results;
  }, [localEvents, googleEvents, showLocalEvents, selectedCalendars, googleConnected]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, NormalizedEvent[]>();
    
    allNormalizedEvents.forEach(event => {
      // For each event, find all days it spans
      const startDay = startOfDay(event.start);
      const endDay = startOfDay(event.end);
      
      let current = startDay;
      while (current <= endDay) {
        const key = format(current, 'yyyy-MM-dd');
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(event);
        current = addDays(current, 1);
      }
    });

    // Sort each day's events once
    map.forEach(events => {
      events.sort((a, b) => {
        if (a.allDay && !b.allDay) return -1;
        if (!a.allDay && b.allDay) return 1;
        return a.start.getTime() - b.start.getTime();
      });
    });

    return map;
  }, [allNormalizedEvents]);

  const getEventsForDay = (day: Date): NormalizedEvent[] => {
    const key = format(day, 'yyyy-MM-dd');
    return eventsByDay.get(key) || [];
  };

  const navigate = (direction: 'prev' | 'next') => {
    if (viewMode === 'month') {
      setCurrentDate(direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
    } else if (viewMode === 'week') {
      setCurrentDate(direction === 'prev' ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1));
    } else {
      setCurrentDate(direction === 'prev' ? subDays(currentDate, 1) : addDays(currentDate, 1));
    }
  };

  const goToToday = () => setCurrentDate(new Date());

  const goToDay = (day: Date) => {
    setCurrentDate(day);
    setViewMode('day');
  };

  const pendingLocalTasks = tasks.filter(t => t.status === "pending").length;
  const pendingGoogleTasks = googleTasks.filter(t => t.status === "needsAction").length;
  const pendingTasks = pendingLocalTasks + pendingGoogleTasks;

  const getHeaderTitle = () => {
    if (viewMode === 'month') return format(currentDate, 'MMMM yyyy').toUpperCase();
    if (viewMode === 'week') return `${format(weekStart, 'MMM d')} - ${format(addDays(weekStart, 6), 'MMM d, yyyy')}`.toUpperCase();
    return format(currentDate, 'EEEE, MMMM d, yyyy').toUpperCase();
  };

  const getEventColor = (event: NormalizedEvent): string => {
    // Glassmorphism base with hover animation
    const base = "backdrop-blur-sm shadow-sm transition-all duration-200 hover:scale-[1.02] hover:z-50 hover:shadow-lg";

    if (event.calendarColor) {
      return `${base} text-white font-medium border-l-4`;
    }
    if (event.isGoogle) {
      return `${base} text-white font-medium border-l-4`;
    }
    switch (event.eventType) {
      case 'study': return `${base} bg-red-500/30 text-white border-l-4 border-red-500`;
      case 'lecture': return `${base} bg-cyan-500/30 text-white border-l-4 border-cyan-500`;
      case 'exam': return `${base} bg-amber-500/30 text-white border-l-4 border-amber-500`;
      default: return `${base} bg-red-500/30 text-white border-l-4 border-red-500`;
    }
  };

  const getEventInlineStyle = (event: NormalizedEvent): React.CSSProperties => {
    if (event.calendarColor) {
      // Convert hex to rgba for glass effect
      const hex = event.calendarColor.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return {
        backgroundColor: `rgba(${r}, ${g}, ${b}, 0.35)`,
        borderLeftColor: event.calendarColor,
        boxShadow: `0 4px 6px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)`,
      };
    }
    return {
      boxShadow: `0 4px 6px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)`,
    };
  };

  const getEventStyle = (event: NormalizedEvent, dayStart: Date, columnIndex: number = 0, totalColumns: number = 1) => {
    const startMinutes = differenceInMinutes(event.start, dayStart);
    const duration = differenceInMinutes(event.end, event.start);
    const top = (startMinutes / 60) * HOUR_HEIGHT;
    const height = Math.max((duration / 60) * HOUR_HEIGHT, 24);
    const width = totalColumns > 1 ? `${100 / totalColumns}%` : 'calc(100% - 4px)';
    const left = totalColumns > 1 ? `${(columnIndex / totalColumns) * 100}%` : '0';
    const style: React.CSSProperties = {
      top: `${top}px`,
      height: `${height}px`,
      width,
      left,
    };
    if (event.calendarColor) {
      style.backgroundColor = event.calendarColor;
      style.borderLeftColor = event.calendarColor;
    }
    return style;
  };

  // Calculate overlapping event columns for proper layout
  const calculateEventColumns = (events: NormalizedEvent[]): Map<string | number, { column: number; totalColumns: number }> => {
    const result = new Map<string | number, { column: number; totalColumns: number }>();
    if (events.length === 0) return result;

    // Sort events by start time
    const sorted = [...events].sort((a, b) => a.start.getTime() - b.start.getTime());

    // Track columns and their end times
    const columns: Date[] = [];

    for (const event of sorted) {
      // Find a column where this event fits (no overlap)
      let column = -1;
      for (let i = 0; i < columns.length; i++) {
        if (event.start >= columns[i]) {
          column = i;
          break;
        }
      }

      if (column === -1) {
        column = columns.length;
        columns.push(event.end);
      } else {
        columns[column] = event.end;
      }

      result.set(event.id, { column, totalColumns: 1 });
    }

    // Calculate total columns for each event (max columns in its time range)
    for (const event of sorted) {
      let maxCols = 1;
      for (const other of sorted) {
        if (event.id === other.id) continue;
        // Check if they overlap
        if (event.start < other.end && event.end > other.start) {
          const thisCol = result.get(event.id)?.column || 0;
          const otherCol = result.get(other.id)?.column || 0;
          maxCols = Math.max(maxCols, thisCol + 1, otherCol + 1);
        }
      }
      const current = result.get(event.id);
      if (current) {
        result.set(event.id, { ...current, totalColumns: maxCols });
      }
    }

    return result;
  };

  return (
    <Layout>
      {debugModals && (
        <div className="fixed bottom-12 right-4 z-[70] bg-black/80 border border-primary text-primary font-terminal text-[10px] px-2 py-1 rounded-none">
          <div>Calendar modals</div>
          <div>Edit event: {showEditModal ? "open" : "closed"}</div>
          <div>Selected event: {selectedEvent?.id ?? "none"}</div>
          <div>Google edit: {showGoogleEditModal ? "open" : "closed"}</div>
          <div>Google event: {selectedGoogleEvent?.id ?? "none"}</div>
          <div>Manage calendars: {showCalendarSettings ? "open" : "closed"}</div>
          <div>Create event: {showEventModal ? "open" : "closed"}</div>
        </div>
      )}

      <div className="h-[calc(100vh-80px)]">

        {/* Main Calendar - Full Width */}
        <div className="flex flex-col h-full">
          <Card className="bg-black/40 border-2 border-primary rounded-none flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <CardHeader className="border-b border-primary/30 p-4 flex flex-row justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <Button size="sm" variant="outline" className="rounded-none border-primary text-primary hover:bg-primary hover:text-black font-arcade text-xs" onClick={goToToday} data-testid="button-today">TODAY</Button>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8 rounded-none hover:bg-primary/20" onClick={() => navigate('prev')} data-testid="button-prev"><ChevronLeft className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 rounded-none hover:bg-primary/20" onClick={() => navigate('next')} data-testid="button-next"><ChevronRight className="h-4 w-4" /></Button>
                </div>
                {/* Clickable Title with Mini-Calendar Dropdown */}
                <div className="relative">
                  <button
                    className="font-arcade text-sm md:text-lg text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
                    onClick={() => setShowMiniCalendar(!showMiniCalendar)}
                    data-testid="text-header-title"
                  >
                    {getHeaderTitle()}
                    <ChevronDown className={cn("w-4 h-4 transition-transform", showMiniCalendar && "rotate-180")} />
                  </button>
                  {showMiniCalendar && (
                    <div className="absolute top-full left-0 mt-2 z-50 bg-black border-2 border-primary p-2 shadow-lg">
                      <div className="grid grid-cols-7 gap-1 text-center min-w-[200px]">
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (<div key={i} className="font-arcade text-[8px] text-muted-foreground p-1">{d}</div>))}
                        {eachDayOfInterval({ start: startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 }), end: endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 }) }).slice(0, 42).map((day, i) => (
                          <button key={i} onClick={() => { goToDay(day); setShowMiniCalendar(false); }} className={cn("font-terminal text-[10px] p-1 hover:bg-primary/20 transition-colors", !isSameMonth(day, currentDate) && "text-muted-foreground/50", isToday(day) && "bg-primary text-black", isSameDay(day, currentDate) && !isToday(day) && "ring-1 ring-primary")}>{format(day, 'd')}</button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Search in header */}
                <div className="relative hidden md:block">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                  <Input
                    className="rounded-none bg-black/60 border-secondary pl-7 pr-2 font-terminal text-xs h-8 w-40"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    data-testid="input-search-events"
                  />
                </div>
                <CalendarAssistantButton onClick={() => setShowAssistant(true)} />
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-none hover:bg-primary/20"
                  onClick={handleSync}
                  disabled={isLoadingGoogle || isSyncing}
                  data-testid="button-sync"
                >
                  <RefreshCw className={cn("h-4 w-4", (isLoadingGoogle || isSyncing) && "animate-spin")} />
                </Button>
                <div className="flex border border-secondary rounded-none">
                  {(['month', 'week', 'day', 'tasks'] as ViewMode[]).map((mode) => (
                    <Button key={mode} size="sm" variant={viewMode === mode ? "default" : "ghost"} className={cn("rounded-none font-arcade text-xs px-3", viewMode === mode ? "bg-primary text-black" : "")} onClick={() => setViewMode(mode)} data-testid={`button-${mode}-view`}>
                      {mode.toUpperCase()}
                    </Button>
                  ))}
                </div>
                {/* CREATE_EVENT button in header */}
                <Button size="sm" className="rounded-none font-arcade text-xs bg-primary text-black hover:bg-primary/90" onClick={() => openCreateModal(currentDate)} data-testid="button-create-event-header">
                  <Plus className="w-4 h-4 mr-1" /> CREATE
                </Button>
              </div>
            </CardHeader>

            {/* Calendar Legend - Compact inline */}
            <div className="px-4 py-1.5 border-b border-primary/20 bg-black/60 flex items-center gap-3 shrink-0">
              {/* Left: Scrollable calendar list */}
              <div className="flex items-center gap-4 overflow-x-auto flex-1 min-w-0">
                <span className="font-arcade text-xs text-muted-foreground shrink-0">CALENDARS:</span>
                <div
                  className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity shrink-0"
                  onClick={() => setShowLocalEvents(!showLocalEvents)}
                >
                  <div className={cn("w-3 h-3 rounded-sm", showLocalEvents ? "bg-primary" : "bg-muted-foreground/30")} />
                  <span className={cn("font-terminal text-sm", showLocalEvents ? "text-primary" : "text-muted-foreground")}>Local</span>
                </div>
                {visibleCalendars.map((cal) => (
                  <div
                    key={cal.id}
                    className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity shrink-0"
                    onClick={() => toggleCalendar(cal.id)}
                  >
                    <div
                      className="w-3 h-3 rounded-sm"
                      style={{ backgroundColor: selectedCalendars.has(cal.id) ? cal.color : 'rgba(100,100,100,0.3)' }}
                    />
                    <span className={cn("font-terminal text-sm truncate max-w-[100px]", selectedCalendars.has(cal.id) ? "" : "text-muted-foreground")}>{cal.name}</span>
                  </div>
                ))}
                {hiddenCalendars.length > 0 && (
                  <span className="font-terminal text-[10px] text-muted-foreground shrink-0">+{hiddenCalendars.length} hidden</span>
                )}
              </div>
              {/* Right: Fixed buttons - always visible */}
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 rounded-none hover:bg-primary/20 font-arcade text-[9px] flex items-center gap-1.5"
                  onClick={() => {
                    localStorage.setItem("selectedCalendars", JSON.stringify(Array.from(selectedCalendars)));
                    setCalendarSelectionDirty(false);
                    toast({ title: "SAVED", description: `${selectedCalendars.size} calendar(s) saved` });
                  }}
                >
                  <div className={cn("w-2 h-2 rounded-full", calendarSelectionDirty ? "bg-red-500" : "bg-green-500")} />
                  SAVE
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 rounded-none hover:bg-primary/20 font-arcade text-[9px]"
                  onClick={() => {
                    if (debugModals) {
                      console.info("[ModalDebug][Calendar] MANAGE click");
                    }
                    setShowCalendarSettings(true);
                  }}
                >
                  MANAGE
                </Button>
                {googleStatus?.connected ? (
                  <div className="flex items-center gap-1 text-green-500">
                    <div className="w-2 h-2 rounded-full bg-current" />
                    <span className="font-terminal text-[10px]">SYNCED</span>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 px-2 rounded-none border-yellow-500 text-yellow-500 hover:bg-yellow-500/20 font-arcade text-[9px]"
                    onClick={() => connectGoogleMutation.mutate()}
                    disabled={connectGoogleMutation.isPending}
                  >
                    {connectGoogleMutation.isPending ? 'CONNECTING...' : 'CONNECT GOOGLE'}
                  </Button>
                )}
              </div>
            </div>

            {/* Calendar Settings Modal */}
            <Dialog
              open={showCalendarSettings}
              onOpenChange={setShowCalendarSettings}
              modal={false}
            >
              <DialogContent
                data-modal="calendar-manage"
                className="bg-black border-2 border-primary rounded-none max-w-md pointer-events-auto translate-y-0 data-[state=open]:animate-none data-[state=closed]:animate-none"
                style={{ zIndex: 100005, top: "6rem", left: "50%", transform: "translate(-50%, 0)" }}
              >
                <DialogHeader>
                  <DialogTitle className="font-arcade text-primary">MANAGE CALENDARS</DialogTitle>
                  <DialogDescription className="sr-only">Reorder or hide calendars.</DialogDescription>
                </DialogHeader>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  <p className="font-terminal text-xs text-muted-foreground mb-4">Drag to reorder. Click to show/hide.</p>
                  <DndContext
                    sensors={calendarOrderSensors}
                    collisionDetection={closestCenter}
                    modifiers={[restrictToVerticalAxis]}
                    onDragEnd={(event: DragEndEvent) => {
                      const { active, over } = event;
                      if (!over || active.id === over.id) return;
                      const oldIndex = availableCalendars.findIndex(c => c.id === active.id);
                      const newIndex = availableCalendars.findIndex(c => c.id === over.id);
                      if (oldIndex === -1 || newIndex === -1) return;
                      const reordered = arrayMove(availableCalendars, oldIndex, newIndex);
                      saveCalendarOrderMutation.mutate(reordered.map(c => c.id));
                    }}
                  >
                    <SortableContext items={availableCalendars.map(c => c.id)} strategy={verticalListSortingStrategy}>
                      {availableCalendars.map((cal) => (
                        <SortableCalendarRow
                          key={cal.id}
                          cal={cal}
                          isHidden={hiddenCalendars.includes(cal.id)}
                          onToggle={() => toggleHideCalendar(cal.id)}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    className="rounded-none border-primary font-arcade text-xs"
                    onClick={() => setShowCalendarSettings(false)}
                  >
                    CLOSE
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Content */}
            <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
              {/* MONTH VIEW */}
              {viewMode === 'month' && (
                <>
                  <div className="grid grid-cols-7 border-b border-secondary bg-secondary/20 shrink-0">
                    {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day) => (
                      <div key={day} className="p-2 text-center font-arcade text-xs text-zinc-400 border-r border-secondary last:border-r-0">{day}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 flex-1 overflow-auto">
                    {calendarDays.map((day, index) => {
                      const dayEvents = getEventsForDay(day);
                      const isCurrentMonth = isSameMonth(day, currentDate);
                      const isTodayDate = isToday(day);
                      return (
                        <div key={index} onClick={() => goToDay(day)} className={cn("min-h-[180px] border-r border-b border-secondary p-1.5 cursor-pointer transition-colors hover:bg-secondary/30", !isCurrentMonth && "bg-secondary/10 text-muted-foreground", index % 7 === 6 && "border-r-0")} data-testid={`day-cell-${format(day, 'yyyy-MM-dd')}`}>
                          <div className={cn("text-right font-mono text-sm w-6 h-6 flex items-center justify-center ml-auto", isTodayDate && "bg-red-500 text-white rounded-none font-bold")}>{format(day, 'd')}</div>
                          <div className="space-y-0.5 mt-1">
                            {dayEvents.slice(0, 3).map((event, i) => (
                              <div key={`${event.id}-${i}`} className={cn("text-xs font-mono truncate px-1.5 py-1 rounded cursor-pointer hover:brightness-110", getEventColor(event))} style={getEventInlineStyle(event)} title={event.title} onClick={(e) => { e.stopPropagation(); handleEventClick(event); }}>
                                {event.eventType === 'online' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary/60 mr-1 align-middle" title="Online" />}
                                {event.title}
                              </div>
                            ))}
                            {dayEvents.length > 3 && <div className="text-[10px] font-mono text-zinc-400 px-1 mt-0.5">+{dayEvents.length - 3} more</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* WEEK VIEW */}
              {viewMode === 'week' && (
                <>
                  <div className="grid grid-cols-8 border-b border-secondary bg-secondary/20 shrink-0">
                    <div className="p-2 w-16 border-r border-secondary"></div>
                    {weekDays.map((day) => (
                      <div key={day.toISOString()} className="p-2 text-center border-r border-secondary last:border-r-0 cursor-pointer hover:bg-secondary/30" onClick={() => goToDay(day)}>
                        <div className="font-arcade text-xs text-zinc-400">{format(day, 'EEE').toUpperCase()}</div>
                        <div className={cn("font-mono text-lg mt-1 w-8 h-8 flex items-center justify-center mx-auto", isToday(day) && "bg-red-500 text-white rounded-none font-bold")}>{format(day, 'd')}</div>
                      </div>
                    ))}
                  </div>

                  {/* All-day events row */}
                  <div className="grid grid-cols-8 border-b border-secondary bg-secondary/10 shrink-0">
                    <div className="p-1 w-16 border-r border-secondary text-xs font-mono text-muted-foreground text-right pr-2">ALL DAY</div>
                    {weekDays.map((day) => {
                      const allDayEvents = getEventsForDay(day).filter(e => e.allDay);
                      return (
                        <div key={`allday-${day.toISOString()}`} className="border-r border-secondary last:border-r-0 p-0.5 min-h-[28px]">
                          {allDayEvents.map((event, i) => (
                            <div key={i} className={cn("text-[10px] font-mono truncate px-1.5 py-0.5 rounded cursor-pointer hover:brightness-110", getEventColor(event))} style={getEventInlineStyle(event)} onClick={(e) => { e.stopPropagation(); handleEventClick(event); }}>{event.title}</div>
                          ))}
                        </div>
                      );
                    })}
                  </div>

                  <ScrollArea className="flex-1">
                    <div className="grid grid-cols-8 relative" style={{ height: `${24 * HOUR_HEIGHT}px` }}>
                      {/* Time column */}
                      <div className="w-16 border-r border-secondary">
                        {HOURS.map((hour) => (
                          <div key={hour} className="border-b border-secondary/50 text-right pr-2 font-mono text-[11px] text-muted-foreground" style={{ height: `${HOUR_HEIGHT}px` }}>
                            {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                          </div>
                        ))}
                      </div>

                      {/* Day columns */}
                      {weekDays.map((day) => {
                        const dayStart = setHours(setMinutes(day, 0), 0);
                        const timedEvents = getEventsForDay(day).filter(e => !e.allDay);
                        const eventColumns = calculateEventColumns(timedEvents);
                        return (
                          <div key={day.toISOString()} className="relative border-r border-secondary/50 last:border-r-0">
                            {HOURS.map((hour) => (
                              <div key={hour} className="border-b border-secondary/30 cursor-pointer hover:bg-secondary/20" style={{ height: `${HOUR_HEIGHT}px` }} onClick={() => openCreateModal(day, hour)}></div>
                            ))}
                            {timedEvents.map((event, i) => {
                              const colInfo = eventColumns.get(event.id) || { column: 0, totalColumns: 1 };
                              const style = { ...getEventStyle(event, dayStart, colInfo.column, colInfo.totalColumns), ...getEventInlineStyle(event) };
                              return (
                                <div key={i} className={cn("absolute rounded p-1 cursor-pointer overflow-hidden", getEventColor(event))} style={style} onClick={(e) => { e.stopPropagation(); handleEventClick(event); }}>
                                  <div className="text-xs font-mono font-medium truncate">{event.title}</div>
                                  <div className="text-[10px] opacity-80 font-mono">{format(event.start, 'h:mma')}</div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </>
              )}

              {/* DAY VIEW */}
              {viewMode === 'day' && (
                <>
                  <div className="p-4 border-b border-secondary bg-secondary/20 shrink-0 flex items-center justify-between">
                    <div>
                      <div className="font-arcade text-xs text-zinc-400">{format(currentDate, 'EEEE').toUpperCase()}</div>
                      <div className={cn("font-mono text-2xl font-bold", isToday(currentDate) && "text-red-500")}>{format(currentDate, 'd')}</div>
                    </div>
                    <Button size="sm" className="rounded-none font-arcade text-xs bg-red-500 text-white hover:bg-red-600" onClick={() => openCreateModal(currentDate)} data-testid="button-create-event">
                      <Plus className="w-4 h-4 mr-1" /> CREATE
                    </Button>
                  </div>

                  {/* All-day events */}
                  {(() => {
                    const allDayEvents = getEventsForDay(currentDate).filter(e => e.allDay);
                    if (allDayEvents.length === 0) return null;
                    return (
                      <div className="p-3 border-b border-secondary/50 bg-black/40 shrink-0 flex gap-2 flex-wrap items-center">
                        <span className="font-mono text-sm text-muted-foreground">ALL DAY:</span>
                        {allDayEvents.map((event, i) => (
                          <div key={i} className={cn("text-sm font-mono px-3 py-1 rounded cursor-pointer hover:brightness-110", getEventColor(event))} style={getEventInlineStyle(event)} onClick={(e) => { e.stopPropagation(); handleEventClick(event); }}>{event.title}</div>
                        ))}
                      </div>
                    );
                  })()}

                  <ScrollArea className="flex-1">
                    <div className="relative" style={{ height: `${24 * HOUR_HEIGHT}px` }}>
                      {HOURS.map((hour) => (
                        <div key={hour} className="flex border-b border-secondary/30 cursor-pointer hover:bg-secondary/20" style={{ height: `${HOUR_HEIGHT}px` }} onClick={() => openCreateModal(currentDate, hour)}>
                          <div className="w-20 text-right pr-2 font-mono text-xs text-muted-foreground shrink-0 pt-1">
                            {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                          </div>
                          <div className="flex-1 border-l border-secondary/50"></div>
                        </div>
                      ))}

                      {/* Positioned events */}
                      {(() => {
                        const timedEvents = getEventsForDay(currentDate).filter(e => !e.allDay);
                        const eventColumns = calculateEventColumns(timedEvents);
                        const dayStart = setHours(setMinutes(currentDate, 0), 0);
                        return (
                          <div className="absolute top-0 left-20 right-0">
                            {timedEvents.map((event, i) => {
                              const colInfo = eventColumns.get(event.id) || { column: 0, totalColumns: 1 };
                              const style = { ...getEventStyle(event, dayStart, colInfo.column, colInfo.totalColumns), ...getEventInlineStyle(event) };
                              return (
                                <div key={i} className={cn("absolute rounded p-2 cursor-pointer", getEventColor(event))} style={style} onClick={(e) => { e.stopPropagation(); handleEventClick(event); }}>
                                  <div className="font-bold text-sm font-mono truncate">{event.title}</div>
                                  <div className="text-xs font-mono opacity-80">{format(event.start, 'h:mm a')} - {format(event.end, 'h:mm a')}</div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  </ScrollArea>
                </>
              )}

              {viewMode === 'tasks' && (
                <div className="flex-1 overflow-hidden bg-black/40 p-4">
                  <GoogleTasksBoard tasks={googleTasks} taskLists={googleTaskLists} />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create Modal */}
      <Dialog open={showEventModal} onOpenChange={setShowEventModal}>
        <DialogContent
          data-modal="calendar-create"
          className="bg-black border-2 border-primary rounded-none max-w-lg max-h-[90vh] overflow-y-auto translate-y-0"
          style={{ zIndex: 100005, top: "6rem", left: "50%", transform: "translate(-50%, 0)" }}
        >
          <DialogHeader>
            <DialogTitle className="font-arcade text-primary">CREATE_EVENT</DialogTitle>
            <DialogDescription className="sr-only">Create a new event.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="font-arcade text-sm">TITLE</Label>
              <Input className="rounded-none bg-black border-secondary focus-visible:ring-primary" placeholder="Event title..." value={newEvent.title} onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })} data-testid="input-modal-title" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-arcade text-sm">START DATE</Label>
                <Input type="date" className="rounded-none bg-black border-secondary" value={newEvent.date} onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })} data-testid="input-modal-date" />
              </div>
              <div className="space-y-2">
                <Label className="font-arcade text-sm">END DATE</Label>
                <Input type="date" className="rounded-none bg-black border-secondary" value={newEvent.endDate} onChange={(e) => setNewEvent({ ...newEvent, endDate: e.target.value })} placeholder={newEvent.date} data-testid="input-modal-end-date" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="allDay" checked={newEvent.allDay} onCheckedChange={(checked) => setNewEvent({ ...newEvent, allDay: !!checked })} />
              <Label htmlFor="allDay" className="font-terminal text-sm">All day</Label>
            </div>

            {!newEvent.allDay && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-arcade text-sm">START TIME</Label>
                  <Input type="time" className="rounded-none bg-black border-secondary" value={newEvent.startTime} onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })} data-testid="input-modal-start" />
                </div>
                <div className="space-y-2">
                  <Label className="font-arcade text-sm">END TIME</Label>
                  <Input type="time" className="rounded-none bg-black border-secondary" value={newEvent.endTime} onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })} data-testid="input-modal-end" />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-arcade text-sm">TYPE</Label>
                <Select value={newEvent.eventType} onValueChange={(v) => setNewEvent({ ...newEvent, eventType: v as typeof newEvent.eventType })}>
                  <SelectTrigger className="rounded-none bg-black border-secondary" data-testid="select-event-type"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-none bg-black border-primary z-[100010]">
                    <SelectItem value="study">STUDY</SelectItem>
                    <SelectItem value="lecture">LECTURE</SelectItem>
                    <SelectItem value="exam">EXAM</SelectItem>
                    <SelectItem value="synchronous">SYNCHRONOUS</SelectItem>
                    <SelectItem value="online">ONLINE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-arcade text-sm">COLOR</Label>
                <div className="flex gap-2 flex-wrap">
                  {["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#6b7280"].map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={cn("w-6 h-6 rounded-sm border-2", newEvent.color === color ? "border-white" : "border-transparent")}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewEvent({ ...newEvent, color })}
                      data-testid={`color-${color}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-arcade text-sm">REPEAT</Label>
                <Select value={newEvent.recurrence} onValueChange={(v) => setNewEvent({ ...newEvent, recurrence: v as typeof newEvent.recurrence })}>
                  <SelectTrigger className="rounded-none bg-black border-secondary" data-testid="select-recurrence"><SelectValue placeholder="No repeat" /></SelectTrigger>
                  <SelectContent className="rounded-none bg-black border-primary z-[100010]">
                    <SelectItem value="none">NO REPEAT</SelectItem>
                    <SelectItem value="daily">DAILY</SelectItem>
                    <SelectItem value="weekly">WEEKLY</SelectItem>
                    <SelectItem value="monthly">MONTHLY</SelectItem>
                    <SelectItem value="yearly">YEARLY</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-arcade text-sm">CALENDAR</Label>
                <Select value={newEvent.calendarId} onValueChange={(v) => setNewEvent({ ...newEvent, calendarId: v })}>
                  <SelectTrigger className="rounded-none bg-black border-secondary" data-testid="select-calendar"><SelectValue placeholder="Local" /></SelectTrigger>
                  <SelectContent className="rounded-none bg-black border-primary z-[100010]">
                    <SelectItem value="local">LOCAL</SelectItem>
                    {availableCalendars.map((cal) => (
                      <SelectItem key={cal.id} value={cal.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: cal.color }} />
                          {cal.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" className="rounded-none font-arcade text-xs" onClick={() => setShowEventModal(false)}>CANCEL</Button>
            <Button className="rounded-none font-arcade text-xs bg-primary text-black hover:bg-primary/90" onClick={handleCreateEvent} disabled={!newEvent.title || !newEvent.date} data-testid="button-save-event">SAVE</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      {selectedEvent && (
        <LocalEventEditModal
          open={showEditModal}
          onOpenChange={(open) => {
            setShowEditModal(open);
            if (!open) setSelectedEvent(null);
          }}
          event={selectedEvent}
          onEventChange={setSelectedEvent}
          courseOptions={courseOptions}
          onSave={() => {
            if (!selectedEvent) return;
            updateEventMutation.mutate({
              id: selectedEvent.id,
              data: {
                title: selectedEvent.title,
                date: selectedEvent.date,
                endDate: selectedEvent.endDate,
                allDay: selectedEvent.allDay,
                eventType: selectedEvent.eventType,
                courseId: selectedEvent.courseId ?? null,
                course: selectedEvent.course,
                weight: selectedEvent.weight,
                notes: selectedEvent.notes,
                color: selectedEvent.color,
                recurrence: selectedEvent.recurrence,
                location: selectedEvent.location,
                attendees: selectedEvent.attendees,
                visibility: selectedEvent.visibility,
                transparency: selectedEvent.transparency,
                reminders: selectedEvent.reminders,
                timeZone: selectedEvent.timeZone,
              },
            });
          }}
          onDelete={() => {
            if (selectedEvent) deleteEventMutation.mutate(selectedEvent.id);
          }}
        />
      )}

      {/* Edit Google Event Modal */}
      {selectedGoogleEvent && (
        <EventEditModal
          open={showGoogleEditModal}
          onOpenChange={(open) => {
            setShowGoogleEditModal(open);
            if (!open) {
              setSelectedGoogleEvent(null);
              setGoogleEditMode("series");
            }
          }}
          event={selectedGoogleEvent}
          onEventChange={setSelectedGoogleEvent}
          courseOptions={courseOptions}
          onSave={handleGoogleSave}
          onDeleteInstance={handleGoogleDeleteInstance}
          onDeleteSeries={handleGoogleDeleteSeries}
          onEditSeries={handleEditSeries}
          mode={googleEditMode}
        />
      )}
      <CalendarAssistant isOpen={showAssistant} onClose={() => setShowAssistant(false)} />
    </Layout>
  );
}
