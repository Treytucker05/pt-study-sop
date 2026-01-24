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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type GoogleTask } from "@/lib/api";
import { useToast } from "@/use-toast";
import { SortableTaskItem, TaskListContainer, TaskDialog } from "@/components/GoogleTasksComponents";
import { CalendarAssistant, CalendarAssistantButton } from "@/components/CalendarAssistant";
import type { InsertCalendarEvent, CalendarEvent } from "@shared/schema";
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
  addWeeks, subWeeks, setHours, setMinutes, differenceInMinutes, addHours
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
          className="h-10 w-10 mt-3 rounded-full border border-white/10 hover:bg-white/10 hover:text-white shrink-0"
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
          className="h-10 w-10 mt-3 rounded-full border border-white/10 hover:bg-white/10 hover:text-white shrink-0"
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

export default function CalendarPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [showEventModal, setShowEventModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [newEvent, setNewEvent] = useState({
    title: "",
    date: "",
    endDate: "",
    startTime: "09:00",
    endTime: "10:00",
    allDay: false,
    eventType: "study" as "study" | "lecture" | "exam",
    color: "#ef4444",
    recurrence: "" as "" | "daily" | "weekly" | "monthly" | "yearly",
    calendarId: "",
  });
  const [selectedCalendars, setSelectedCalendars] = useState<Set<string>>(new Set());
  const [showLocalEvents, setShowLocalEvents] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGoogleEvent, setSelectedGoogleEvent] = useState<GoogleCalendarEvent | null>(null);
  const [showGoogleEditModal, setShowGoogleEditModal] = useState(false);
  const [showAssistant, setShowAssistant] = useState(false);
  const [showMiniCalendar, setShowMiniCalendar] = useState(false);

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
  const [isOthersOpen, setIsOthersOpen] = useState(false);

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

  const { data: localEvents = [] } = useQuery({
    queryKey: ["events"],
    queryFn: api.events.getAll,
  });

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

  const { data: googleTaskLists = [] } = useQuery({
    queryKey: ["google-task-lists"],
    queryFn: api.googleTasks.getLists
  });


  interface GoogleCalendarInfo {
    id: string;
    summary: string;
    backgroundColor?: string;
  }

  const { data: calendarList = [] } = useQuery({
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

  const availableCalendars = useMemo(() => {
    return calendarList.map(cal => ({
      id: cal.id,
      name: cal.summary,
      color: cal.backgroundColor || '#888888',
    }));
  }, [calendarList]);

  // Filter out hidden calendars from display
  const visibleCalendars = useMemo(() => {
    return availableCalendars.filter(cal => !hiddenCalendars.includes(cal.id));
  }, [availableCalendars, hiddenCalendars]);

  useEffect(() => {
    if (availableCalendars.length > 0 && selectedCalendars.size === 0) {
      // Only show pinned calendars by default
      const pinnedIds = pinnedCalendars.length > 0 
        ? pinnedCalendars 
        : availableCalendars.slice(0, 2).map(c => c.id); // Fallback to first 2 if none pinned
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
  };

  const createEventMutation = useMutation({
    mutationFn: api.events.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      if (newEvent.calendarId && newEvent.calendarId !== "local") {
        queryClient.invalidateQueries({ queryKey: ["google-calendar"] });
        refetchGoogle();
      }
      setShowEventModal(false);
      resetNewEvent();
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertCalendarEvent> }) =>
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
      const res = await fetch(`/api/google-calendar/events/${encodeURIComponent(calendarId)}/${encodeURIComponent(eventId)}`, {
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
      const res = await fetch(`/api/google-calendar/events/${encodeURIComponent(event.calendarId)}/${encodeURIComponent(event.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: event.summary,
          description: event.description,
          location: event.location,
          start: event.start,
          end: event.end,
          recurrence: event.recurrence
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

  const handleGoogleDelete = () => {
    if (selectedGoogleEvent && selectedGoogleEvent.calendarId) {
      if (selectedGoogleEvent.recurringEventId) {
        if (confirm("Delete this single occurrence?")) {
          deleteGoogleEventMutation.mutate({
            eventId: selectedGoogleEvent.id,
            calendarId: selectedGoogleEvent.calendarId
          });
        }
      } else if (selectedGoogleEvent.recurrence && selectedGoogleEvent.recurrence.length > 0) {
        if (confirm("Delete the ENTIRE series? This cannot be undone.")) {
          deleteGoogleEventMutation.mutate({
            eventId: selectedGoogleEvent.id,
            calendarId: selectedGoogleEvent.calendarId
          });
        }
      } else {
        if (confirm("Delete this event?")) {
          deleteGoogleEventMutation.mutate({
            eventId: selectedGoogleEvent.id,
            calendarId: selectedGoogleEvent.calendarId
          });
        }
      }
    }
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

  const normalizeEvent = (event: CalendarEvent | GoogleCalendarEvent): NormalizedEvent => {
    if ('summary' in event) {
      const gEvent = event as GoogleCalendarEvent;
      const isAllDay = !!gEvent.start?.date && !gEvent.start?.dateTime;
      const startStr = gEvent.start?.dateTime || gEvent.start?.date || new Date().toISOString();
      const endStr = gEvent.end?.dateTime || gEvent.end?.date || startStr;
      return {
        id: gEvent.id,
        title: gEvent.summary || 'Untitled',
        start: new Date(startStr),
        end: new Date(endStr),
        allDay: isAllDay,
        isGoogle: true,
        calendarColor: gEvent.calendarColor,
        calendarName: gEvent.calendarSummary,
        originalEvent: event,
      };
    } else {
      const localEvent = event as CalendarEvent;
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
        originalEvent: event,
      };
    }
  };

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
        // For all-day events, add a day to make end date inclusive (calendar convention uses exclusive end)
        endDateTime = addDays(new Date(newEvent.endDate), 1);
      }

      createEventMutation.mutate({
        title: newEvent.title,
        date: startDate,
        endDate: endDateTime,
        allDay: newEvent.allDay,
        eventType: newEvent.eventType,
        color: newEvent.color,
        recurrence: newEvent.recurrence || null,
        calendarId: newEvent.calendarId || null,
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

  const openEditModal = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setShowEditModal(true);
  };

  const openGoogleEditModal = (event: GoogleCalendarEvent) => {
    setSelectedGoogleEvent(event);
    setShowGoogleEditModal(true);
  };

  const handleEventClick = (event: NormalizedEvent) => {
    if (event.isGoogle) {
      openGoogleEditModal(event.originalEvent as GoogleCalendarEvent);
    } else {
      openEditModal(event.originalEvent as CalendarEvent);
    }
  };

  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    const results: NormalizedEvent[] = [];

    if (showLocalEvents) {
      localEvents.forEach(event => {
        if (event.title.toLowerCase().includes(query)) {
          results.push(normalizeEvent(event));
        }
      });
    }

    googleEvents.forEach(event => {
      if (selectedCalendars.size > 0 && event.calendarId && !selectedCalendars.has(event.calendarId)) return;
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

  const getEventsForDay = (day: Date): NormalizedEvent[] => {
    const allEvents: NormalizedEvent[] = [];

    if (showLocalEvents) {
      localEvents.forEach(event => {
        const normalized = normalizeEvent(event);
        if (eventSpansDay(normalized, day)) {
          allEvents.push(normalized);
        }
      });
    }

    googleEvents.forEach(event => {
      if (selectedCalendars.size > 0 && event.calendarId && !selectedCalendars.has(event.calendarId)) return;
      const normalized = normalizeEvent(event);
      if (eventSpansDay(normalized, day)) {
        allEvents.push(normalized);
      }
    });

    return allEvents.sort((a, b) => {
      if (a.allDay && !b.allDay) return -1;
      if (!a.allDay && b.allDay) return 1;
      return a.start.getTime() - b.start.getTime();
    });
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
    if (event.isGoogle && event.calendarColor) {
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
                <Button size="sm" variant="ghost" className="rounded-none hover:bg-primary/20" onClick={() => refetchGoogle()} disabled={isLoadingGoogle} data-testid="button-sync">
                  <RefreshCw className={cn("h-4 w-4", isLoadingGoogle && "animate-spin")} />
                </Button>
                <div className="flex border border-secondary rounded-none">
                  {(['month', 'week', 'day', 'tasks'] as ViewMode[]).map((mode) => (
                    <Button key={mode} size="sm" variant={viewMode === mode ? "default" : "ghost"} className={cn("rounded-none font-arcade text-[10px] px-2", viewMode === mode ? "bg-primary text-black" : "")} onClick={() => setViewMode(mode)} data-testid={`button-${mode}-view`}>
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
              <div className="flex items-center gap-3 overflow-x-auto flex-1 min-w-0">
                <span className="font-arcade text-[10px] text-muted-foreground shrink-0">CALENDARS:</span>
                <div
                  className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity shrink-0"
                  onClick={() => setShowLocalEvents(!showLocalEvents)}
                >
                  <div className={cn("w-2.5 h-2.5 rounded-sm", showLocalEvents ? "bg-primary" : "bg-muted-foreground/30")} />
                  <span className={cn("font-terminal text-xs", showLocalEvents ? "text-primary" : "text-muted-foreground")}>Local</span>
                </div>
                {visibleCalendars.map((cal) => (
                  <div
                    key={cal.id}
                    className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity shrink-0"
                    onClick={() => toggleCalendar(cal.id)}
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-sm"
                      style={{ backgroundColor: selectedCalendars.has(cal.id) ? cal.color : 'rgba(100,100,100,0.3)' }}
                    />
                    <span className={cn("font-terminal text-xs truncate max-w-[80px]", selectedCalendars.has(cal.id) ? "" : "text-muted-foreground")}>{cal.name}</span>
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
                  className="h-6 px-2 rounded-none hover:bg-primary/20 font-arcade text-[9px]"
                  onClick={() => setShowCalendarSettings(true)}
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
            <Dialog open={showCalendarSettings} onOpenChange={setShowCalendarSettings}>
              <DialogContent className="bg-black border-2 border-primary rounded-none max-w-md">
                <DialogHeader>
                  <DialogTitle className="font-arcade text-primary">MANAGE CALENDARS</DialogTitle>
                </DialogHeader>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  <p className="font-terminal text-xs text-muted-foreground mb-4">Toggle calendars to show/hide them in the legend.</p>
                  {availableCalendars.map((cal) => (
                    <div 
                      key={cal.id} 
                      className={cn(
                        "flex items-center gap-3 p-2 border border-zinc-800 cursor-pointer hover:bg-zinc-900 transition-colors",
                        hiddenCalendars.includes(cal.id) && "opacity-50"
                      )}
                      onClick={() => toggleHideCalendar(cal.id)}
                    >
                      <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: cal.color }} />
                      <span className="font-terminal text-sm flex-1">{cal.name}</span>
                      <span className={cn(
                        "font-arcade text-[10px] px-2 py-0.5",
                        hiddenCalendars.includes(cal.id) ? "text-red-500" : "text-green-500"
                      )}>
                        {hiddenCalendars.includes(cal.id) ? 'HIDDEN' : 'VISIBLE'}
                      </span>
                    </div>
                  ))}
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
                  <div className="grid grid-cols-7 border-b border-zinc-800 bg-zinc-900/80 shrink-0">
                    {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day) => (
                      <div key={day} className="p-2 text-center font-arcade text-xs text-zinc-400 border-r border-zinc-800 last:border-r-0">{day}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 flex-1 overflow-auto">
                    {calendarDays.map((day, index) => {
                      const dayEvents = getEventsForDay(day);
                      const isCurrentMonth = isSameMonth(day, currentDate);
                      const isTodayDate = isToday(day);
                      return (
                        <div key={index} onClick={() => goToDay(day)} className={cn("min-h-[90px] border-r border-b border-zinc-800 p-1.5 cursor-pointer transition-colors hover:bg-zinc-800/50", !isCurrentMonth && "bg-zinc-900/60 text-zinc-600", index % 7 === 6 && "border-r-0")} data-testid={`day-cell-${format(day, 'yyyy-MM-dd')}`}>
                          <div className={cn("text-right font-mono text-sm w-6 h-6 flex items-center justify-center ml-auto", isTodayDate && "bg-red-500 text-white rounded-full font-bold")}>{format(day, 'd')}</div>
                          <div className="space-y-0.5 mt-1">
                            {dayEvents.slice(0, 3).map((event, i) => (
                              <div key={`${event.id}-${i}`} className={cn("text-[10px] font-mono truncate px-1.5 py-0.5 rounded cursor-pointer hover:brightness-110", getEventColor(event))} style={getEventInlineStyle(event)} title={event.title} onClick={(e) => { e.stopPropagation(); handleEventClick(event); }}>
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
                  <div className="grid grid-cols-8 border-b border-zinc-800 bg-zinc-900/80 shrink-0">
                    <div className="p-2 w-16 border-r border-zinc-800"></div>
                    {weekDays.map((day) => (
                      <div key={day.toISOString()} className="p-2 text-center border-r border-zinc-800 last:border-r-0 cursor-pointer hover:bg-zinc-800/50" onClick={() => goToDay(day)}>
                        <div className="font-arcade text-xs text-zinc-400">{format(day, 'EEE').toUpperCase()}</div>
                        <div className={cn("font-mono text-lg mt-1 w-8 h-8 flex items-center justify-center mx-auto", isToday(day) && "bg-red-500 text-white rounded-full font-bold")}>{format(day, 'd')}</div>
                      </div>
                    ))}
                  </div>

                  {/* All-day events row */}
                  <div className="grid grid-cols-8 border-b border-zinc-800 bg-zinc-900/60 shrink-0">
                    <div className="p-1 w-16 border-r border-zinc-800 text-xs font-mono text-zinc-500 text-right pr-2">ALL DAY</div>
                    {weekDays.map((day) => {
                      const allDayEvents = getEventsForDay(day).filter(e => e.allDay);
                      return (
                        <div key={`allday-${day.toISOString()}`} className="border-r border-zinc-800 last:border-r-0 p-0.5 min-h-[28px]">
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
                      <div className="w-16 border-r border-zinc-800">
                        {HOURS.map((hour) => (
                          <div key={hour} className="border-b border-zinc-800/50 text-right pr-2 font-mono text-[11px] text-zinc-500" style={{ height: `${HOUR_HEIGHT}px` }}>
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
                          <div key={day.toISOString()} className="relative border-r border-zinc-800/50 last:border-r-0">
                            {HOURS.map((hour) => (
                              <div key={hour} className="border-b border-zinc-800/30 cursor-pointer hover:bg-zinc-800/30" style={{ height: `${HOUR_HEIGHT}px` }} onClick={() => openCreateModal(day, hour)}></div>
                            ))}
                            {timedEvents.map((event, i) => {
                              const colInfo = eventColumns.get(event.id) || { column: 0, totalColumns: 1 };
                              const style = { ...getEventStyle(event, dayStart, colInfo.column, colInfo.totalColumns), ...getEventInlineStyle(event) };
                              return (
                                <div key={i} className={cn("absolute rounded p-1 cursor-pointer overflow-hidden", getEventColor(event))} style={style} onClick={(e) => { e.stopPropagation(); handleEventClick(event); }}>
                                  <div className="text-[10px] font-mono font-medium truncate">{event.title}</div>
                                  <div className="text-[9px] opacity-80 font-mono">{format(event.start, 'h:mma')}</div>
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
                  <div className="p-4 border-b border-zinc-800 bg-zinc-900/80 shrink-0 flex items-center justify-between">
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
                        <div key={hour} className="flex border-b border-zinc-800/30 cursor-pointer hover:bg-zinc-800/30" style={{ height: `${HOUR_HEIGHT}px` }} onClick={() => openCreateModal(currentDate, hour)}>
                          <div className="w-20 text-right pr-2 font-mono text-xs text-zinc-500 shrink-0 pt-1">
                            {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                          </div>
                          <div className="flex-1 border-l border-zinc-800/50"></div>
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
        <DialogContent className="bg-black border-2 border-primary rounded-none max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-arcade text-primary">CREATE_EVENT</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="font-arcade text-xs">TITLE</Label>
              <Input className="rounded-none bg-black border-secondary focus-visible:ring-primary" placeholder="Event title..." value={newEvent.title} onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })} data-testid="input-modal-title" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-arcade text-xs">START DATE</Label>
                <Input type="date" className="rounded-none bg-black border-secondary" value={newEvent.date} onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })} data-testid="input-modal-date" />
              </div>
              <div className="space-y-2">
                <Label className="font-arcade text-xs">END DATE</Label>
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
                  <Label className="font-arcade text-xs">START TIME</Label>
                  <Input type="time" className="rounded-none bg-black border-secondary" value={newEvent.startTime} onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })} data-testid="input-modal-start" />
                </div>
                <div className="space-y-2">
                  <Label className="font-arcade text-xs">END TIME</Label>
                  <Input type="time" className="rounded-none bg-black border-secondary" value={newEvent.endTime} onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })} data-testid="input-modal-end" />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-arcade text-xs">TYPE</Label>
                <Select value={newEvent.eventType} onValueChange={(v) => setNewEvent({ ...newEvent, eventType: v as typeof newEvent.eventType })}>
                  <SelectTrigger className="rounded-none bg-black border-secondary" data-testid="select-event-type"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-none bg-black border-primary">
                    <SelectItem value="study">STUDY</SelectItem>
                    <SelectItem value="lecture">LECTURE</SelectItem>
                    <SelectItem value="exam">EXAM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-arcade text-xs">COLOR</Label>
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
                <Label className="font-arcade text-xs">REPEAT</Label>
                <Select value={newEvent.recurrence} onValueChange={(v) => setNewEvent({ ...newEvent, recurrence: v as typeof newEvent.recurrence })}>
                  <SelectTrigger className="rounded-none bg-black border-secondary" data-testid="select-recurrence"><SelectValue placeholder="No repeat" /></SelectTrigger>
                  <SelectContent className="rounded-none bg-black border-primary">
                    <SelectItem value="none">NO REPEAT</SelectItem>
                    <SelectItem value="daily">DAILY</SelectItem>
                    <SelectItem value="weekly">WEEKLY</SelectItem>
                    <SelectItem value="monthly">MONTHLY</SelectItem>
                    <SelectItem value="yearly">YEARLY</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-arcade text-xs">CALENDAR</Label>
                <Select value={newEvent.calendarId} onValueChange={(v) => setNewEvent({ ...newEvent, calendarId: v })}>
                  <SelectTrigger className="rounded-none bg-black border-secondary" data-testid="select-calendar"><SelectValue placeholder="Local" /></SelectTrigger>
                  <SelectContent className="rounded-none bg-black border-primary">
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
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="bg-black border-2 border-primary rounded-none max-w-md">
          <DialogHeader><DialogTitle className="font-arcade text-primary">EDIT_EVENT</DialogTitle></DialogHeader>
          {selectedEvent && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="font-arcade text-xs">TITLE</Label>
                <Input className="rounded-none bg-black border-secondary focus-visible:ring-primary" value={selectedEvent.title} onChange={(e) => setSelectedEvent({ ...selectedEvent, title: e.target.value })} data-testid="input-edit-title" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-arcade text-xs">DATE</Label>
                  <Input type="date" className="rounded-none bg-black border-secondary" value={format(new Date(selectedEvent.date), 'yyyy-MM-dd')} onChange={(e) => { const [h, m] = [new Date(selectedEvent.date).getHours(), new Date(selectedEvent.date).getMinutes()]; setSelectedEvent({ ...selectedEvent, date: setMinutes(setHours(new Date(e.target.value), h), m) }); }} data-testid="input-edit-date" />
                </div>
                <div className="space-y-2">
                  <Label className="font-arcade text-xs">TIME</Label>
                  <Input type="time" className="rounded-none bg-black border-secondary" value={format(new Date(selectedEvent.date), 'HH:mm')} onChange={(e) => { const [hours, minutes] = e.target.value.split(':').map(Number); setSelectedEvent({ ...selectedEvent, date: setMinutes(setHours(new Date(selectedEvent.date), hours), minutes) }); }} data-testid="input-edit-time" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="font-arcade text-xs">TYPE</Label>
                <Select value={selectedEvent.eventType || 'study'} onValueChange={(v) => setSelectedEvent({ ...selectedEvent, eventType: v })}>
                  <SelectTrigger className="rounded-none bg-black border-secondary" data-testid="select-edit-type"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-none bg-black border-primary">
                    <SelectItem value="study">STUDY</SelectItem>
                    <SelectItem value="lecture">LECTURE</SelectItem>
                    <SelectItem value="exam">EXAM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter className="flex justify-between">
            <Button variant="ghost" className="rounded-none font-arcade text-xs text-red-500 hover:text-red-400 hover:bg-red-500/10" onClick={() => selectedEvent && deleteEventMutation.mutate(selectedEvent.id)} data-testid="button-delete-event">
              <Trash2 className="w-4 h-4 mr-1" /> DELETE
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" className="rounded-none font-arcade text-xs" onClick={() => setShowEditModal(false)}>CANCEL</Button>
              <Button className="rounded-none font-arcade text-xs bg-primary text-black hover:bg-primary/90" onClick={() => selectedEvent && updateEventMutation.mutate({ id: selectedEvent.id, data: { title: selectedEvent.title, date: selectedEvent.date, eventType: selectedEvent.eventType } })} data-testid="button-update-event">UPDATE</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Google Event Modal */}
      <Dialog open={showGoogleEditModal} onOpenChange={setShowGoogleEditModal}>
        <DialogContent className="font-arcade bg-black border-2 border-green-500 rounded-none max-w-md p-0 overflow-hidden">
          {selectedGoogleEvent && (
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="bg-green-500/20 border-b border-green-500 p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-green-500 font-bold tracking-wider">EDIT_GOOGLE_EVENT</span>
                </div>
                {selectedGoogleEvent.recurringEventId && <Badge variant="outline" className="text-[10px] border-green-500 text-green-500">INSTANCE</Badge>}
                {selectedGoogleEvent.recurrence && <Badge variant="outline" className="text-[10px] border-green-500 text-green-500">SERIES</Badge>}
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs text-green-500/80">EVENT_TITLE_</Label>
                  <Input
                    value={selectedGoogleEvent.summary || ""}
                    onChange={(e) => setSelectedGoogleEvent({ ...selectedGoogleEvent, summary: e.target.value })}
                    className="bg-black border-green-500/50 focus:border-green-500 text-green-500 font-terminal text-lg h-12 rounded-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-green-500/80">START_TIME_</Label>
                    <Input
                      type="datetime-local"
                      value={selectedGoogleEvent.start?.dateTime?.substring(0, 16) || selectedGoogleEvent.start?.date + "T00:00" || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedGoogleEvent({
                          ...selectedGoogleEvent,
                          start: { dateTime: val }
                        });
                      }}
                      disabled={!!selectedGoogleEvent.start?.date && !selectedGoogleEvent.start?.dateTime}
                      className="bg-black border-green-500/50 text-green-500 font-terminal rounded-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-green-500/80">END_TIME_</Label>
                    <Input
                      type="datetime-local"
                      value={selectedGoogleEvent.end?.dateTime?.substring(0, 16) || selectedGoogleEvent.end?.date + "T00:00" || ""}
                      onChange={(e) => setSelectedGoogleEvent({ ...selectedGoogleEvent, end: { dateTime: e.target.value } })}
                      disabled={!!selectedGoogleEvent.end?.date && !selectedGoogleEvent.end?.dateTime}
                      className="bg-black border-green-500/50 text-green-500 font-terminal rounded-none"
                    />
                  </div>
                </div>

                {/* Recurrence Simple UI */}
                {!selectedGoogleEvent.recurringEventId && (
                  <div className="space-y-2">
                    <Label className="text-xs text-green-500/80 flex items-center gap-2">
                      RECURRENCE_PATTERN_
                      <RefreshCw className="w-3 h-3" />
                    </Label>
                    <Select
                      value={selectedGoogleEvent.recurrence?.[0] || "none"}
                      onValueChange={(val) => {
                        const rrule = val === "none" ? undefined : [val];
                        setSelectedGoogleEvent({ ...selectedGoogleEvent, recurrence: rrule });
                      }}
                    >
                      <SelectTrigger className="bg-black border-green-500/50 text-green-500 rounded-none h-8 font-terminal text-xs">
                        <SelectValue placeholder="No Recurrence" />
                      </SelectTrigger>
                      <SelectContent className="bg-black border-green-500 text-green-500 font-terminal">
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="RRULE:FREQ=DAILY">Daily</SelectItem>
                        <SelectItem value="RRULE:FREQ=WEEKLY">Weekly</SelectItem>
                        <SelectItem value="RRULE:FREQ=MONTHLY">Monthly</SelectItem>
                        <SelectItem value="RRULE:FREQ=YEARLY">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                    {/* Advanced RRULE Textarea if Custom or existing complex rule */}
                    {selectedGoogleEvent.recurrence &&
                      !["RRULE:FREQ=DAILY", "RRULE:FREQ=WEEKLY", "RRULE:FREQ=MONTHLY", "RRULE:FREQ=YEARLY"].includes(selectedGoogleEvent.recurrence[0]) && (
                        <Textarea
                          value={selectedGoogleEvent.recurrence[0]}
                          onChange={(e) => setSelectedGoogleEvent({ ...selectedGoogleEvent, recurrence: [e.target.value] })}
                          className="bg-black border-green-500/30 text-green-100/70 text-[10px] font-mono h-12 rounded-none"
                          placeholder="RRULE:FREQ=WEEKLY;BYDAY=MO,WE"
                        />
                      )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-xs text-green-500/80">DESCRIPTION_</Label>
                  <Textarea
                    value={selectedGoogleEvent.description || ""}
                    onChange={(e) => setSelectedGoogleEvent({ ...selectedGoogleEvent, description: e.target.value })}
                    className="bg-black border-green-500/50 text-green-500 font-terminal min-h-[100px] rounded-none resize-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-between gap-4 border-t border-green-500/20 mt-4">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleGoogleDelete}
                    className="rounded-none bg-red-900/20 text-red-500 hover:bg-red-900/40 border border-red-900/50 font-arcade text-xs"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    DELETE
                  </Button>

                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      className="bg-transparent border border-green-500/50 text-green-500 hover:bg-green-500/10 rounded-none font-arcade text-xs"
                      onClick={() => window.open(selectedGoogleEvent.htmlLink, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" /> OPEN
                    </Button>
                    <Button
                      className="bg-green-500 text-black hover:bg-green-400 rounded-none font-arcade text-xs px-6"
                      onClick={handleGoogleSave}
                    >
                      SAVE CHANGES
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <CalendarAssistant isOpen={showAssistant} onClose={() => setShowAssistant(false)} />
    </Layout >
  );
}
