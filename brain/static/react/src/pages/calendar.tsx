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
import { useToast } from "@/hooks/use-toast";
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

  // Calendar Organization State
  const [pinnedCalendars, setPinnedCalendars] = useState<string[]>(() => {
    const saved = localStorage.getItem("pinnedCalendars");
    return saved ? JSON.parse(saved) : [];
  });
  const [isOthersOpen, setIsOthersOpen] = useState(false);

  const togglePin = (calId: string) => {
    setPinnedCalendars(prev => {
      const next = prev.includes(calId) ? prev.filter(p => p !== calId) : [...prev, calId];
      localStorage.setItem("pinnedCalendars", JSON.stringify(next));
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
      const res = await fetch(`/api/google-calendar/events?timeMin=${timeMin}&timeMax=${timeMax}`);
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

  useEffect(() => {
    if (availableCalendars.length > 0 && selectedCalendars.size === 0) {
      setSelectedCalendars(new Set(availableCalendars.map(c => c.id)));
    }
  }, [availableCalendars]);

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
      const res = await fetch(`/api/google-calendar/events/${eventId}?calendarId=${calendarId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete event");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["google-calendar"] });
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
      const res = await fetch(`/api/google-calendar/events/${event.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calendarId: event.calendarId,
          title: event.summary,
          description: event.description,
          location: event.location,
          date: event.start?.dateTime || event.start?.date,
          endDate: event.end?.dateTime || event.end?.date,
          allDay: !event.start?.dateTime,
          recurrence: event.recurrence
        }),
      });
      if (!res.ok) throw new Error('Failed to update google event');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["google-calendar"] });
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
      recurrence: "none",
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

  const getEventColor = (event: NormalizedEvent) => {
    // Glassmorphism base styles
    const base = "backdrop-blur-sm shadow-sm transition-all hover:bg-opacity-90 hover:scale-[1.02] hover:z-50";

    if (event.isGoogle && event.calendarColor) {
      // Use calendar color but transparentize it in inline styles usually, 
      // but here we set border/text. Background is handled in getEventStyle.
      return `${base} text-white border-l-4`;
    }

    if (event.isGoogle) return `${base} bg-white/10 text-white border-l-4 border-white/50`;

    switch (event.eventType) {
      case 'study': return `${base} bg-primary/20 text-primary-foreground border-l-4 border-primary`;
      case 'lecture': return `${base} bg-blue-500/20 text-blue-100 border-l-4 border-blue-500`;
      case 'exam': return `${base} bg-red-600/20 text-red-100 border-l-4 border-red-600`;
      default: return `${base} bg-primary/20 text-primary-foreground border-l-4 border-primary`;
    }
  };

  const getEventStyle = (event: NormalizedEvent, dayStart: Date) => {
    const startMinutes = differenceInMinutes(event.start, dayStart);
    const duration = differenceInMinutes(event.end, event.start);
    const top = (startMinutes / 60) * HOUR_HEIGHT;
    const height = Math.max((duration / 60) * HOUR_HEIGHT, 24); // Min height slightly larger

    const style: React.CSSProperties = {
      top: `${top}px`,
      height: `${height}px`,
      left: '2px',
      right: '2px', // Add spacing sides
      marginBottom: '2px'
    };

    if (event.calendarColor) {
      // Convert hex to rgba for glass effect if possible, or just use opacity
      // Simple approach: set bg with opacity in style if it's a specific color
      style.background = `${event.calendarColor}40`; // 25% opacity hex
      style.borderLeftColor = event.calendarColor;
    }

    return style;
  };

  return (
    <Layout>
      <div className="grid lg:grid-cols-4 gap-6 h-[calc(100vh-220px)]">

        {/* Main Calendar */}
        <div className="lg:col-span-3 flex flex-col">
          <Card className="bg-black/40 border-2 border-primary rounded-none flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <CardHeader className="border-b border-primary/30 p-4 flex flex-row justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <Button size="sm" variant="outline" className="rounded-none border-primary text-primary hover:bg-primary hover:text-black font-arcade text-xs" onClick={goToToday} data-testid="button-today">TODAY</Button>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8 rounded-none hover:bg-primary/20" onClick={() => navigate('prev')} data-testid="button-prev"><ChevronLeft className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 rounded-none hover:bg-primary/20" onClick={() => navigate('next')} data-testid="button-next"><ChevronRight className="h-4 w-4" /></Button>
                </div>
                <h2 className="font-arcade text-sm md:text-lg text-primary" data-testid="text-header-title">{getHeaderTitle()}</h2>
              </div>
              <div className="flex items-center gap-2">
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
              </div>
            </CardHeader>

            {/* Content */}
            <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
              {/* MONTH VIEW */}
              {viewMode === 'month' && (
                <>
                  <div className="grid grid-cols-7 border-b border-secondary bg-black/60 shrink-0">
                    {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day) => (
                      <div key={day} className="p-2 text-center font-arcade text-[10px] text-muted-foreground border-r border-secondary last:border-r-0">{day}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 flex-1 overflow-auto">
                    {calendarDays.map((day, index) => {
                      const dayEvents = getEventsForDay(day);
                      const isCurrentMonth = isSameMonth(day, currentDate);
                      const isTodayDate = isToday(day);
                      return (
                        <div key={index} onClick={() => goToDay(day)} className={cn("min-h-[80px] border-r border-b border-secondary p-1 cursor-pointer transition-colors hover:bg-primary/10", !isCurrentMonth && "bg-black/40 text-muted-foreground", index % 7 === 6 && "border-r-0")} data-testid={`day-cell-${format(day, 'yyyy-MM-dd')}`}>
                          <div className={cn("text-right font-arcade text-xs mb-1 w-6 h-6 flex items-center justify-center ml-auto", isTodayDate && "bg-primary text-black rounded-full")}>{format(day, 'd')}</div>
                          <div className="space-y-1">
                            {dayEvents.slice(0, 4).map((event, i) => (
                              <div key={`${event.id}-${i}`} className={cn("text-[9px] font-terminal truncate px-1.5 py-0.5 rounded-sm flex items-center gap-1", getEventColor(event))} title={event.title}>
                                {event.isGoogle && <div className="w-1 h-1 rounded-full bg-current shrink-0 opacity-70" />}
                                {!event.allDay && <span className="opacity-70 tabular-nums tracking-tighter">{format(event.start, 'h:mm')}</span>}
                                <span className="truncate flex-1">{event.title}</span>
                              </div>
                            ))}
                            {dayEvents.length > 4 && <div className="text-[9px] font-arcade text-muted-foreground px-1">+{dayEvents.length - 4} MORE</div>}
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
                  <div className="grid grid-cols-8 border-b border-secondary bg-black/60 shrink-0">
                    <div className="p-2 w-16 border-r border-secondary"></div>
                    {weekDays.map((day) => (
                      <div key={day.toISOString()} className="p-2 text-center border-r border-secondary last:border-r-0 cursor-pointer hover:bg-primary/10" onClick={() => goToDay(day)}>
                        <div className="font-arcade text-[10px] text-muted-foreground">{format(day, 'EEE').toUpperCase()}</div>
                        <div className={cn("font-arcade text-sm mt-1 w-8 h-8 flex items-center justify-center mx-auto", isToday(day) && "bg-primary text-black rounded-full")}>{format(day, 'd')}</div>
                      </div>
                    ))}
                  </div>

                  {/* All-day events row */}
                  <div className="grid grid-cols-8 border-b border-secondary bg-black/40 shrink-0">
                    <div className="p-1 w-16 border-r border-secondary text-[9px] font-terminal text-muted-foreground text-right pr-2">ALL DAY</div>
                    {weekDays.map((day) => {
                      const allDayEvents = getEventsForDay(day).filter(e => e.allDay);
                      return (
                        <div key={`allday-${day.toISOString()}`} className="border-r border-secondary last:border-r-0 p-0.5 min-h-[24px]">
                          {allDayEvents.map((event, i) => (
                            <div key={i} className={cn("text-[8px] font-terminal truncate px-1 rounded-sm", getEventColor(event))}>{event.title}</div>
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
                          <div key={hour} className="border-b border-secondary/50 text-right pr-2 font-terminal text-[10px] text-muted-foreground" style={{ height: `${HOUR_HEIGHT}px` }}>
                            {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                          </div>
                        ))}
                      </div>

                      {/* Day columns */}
                      {weekDays.map((day) => {
                        const dayStart = setHours(setMinutes(day, 0), 0);
                        const timedEvents = getEventsForDay(day).filter(e => !e.allDay);
                        return (
                          <div key={day.toISOString()} className="relative border-r border-secondary/50 last:border-r-0">
                            {HOURS.map((hour) => (
                              <div key={hour} className="border-b border-secondary/30 cursor-pointer hover:bg-primary/5" style={{ height: `${HOUR_HEIGHT}px` }} onClick={() => openCreateModal(day, hour)}></div>
                            ))}
                            {timedEvents.map((event, i) => {
                              const style = getEventStyle(event, dayStart);
                              return (
                                <div
                                  key={`${event.id}-${i}`}
                                  className={cn("absolute left-0 right-1 mx-0.5 rounded-sm p-1.5 cursor-pointer overflow-hidden flex flex-col gap-0.5", getEventColor(event))}
                                  style={style}
                                  onClick={(e) => { e.stopPropagation(); handleEventClick(event); }}
                                >
                                  <div className="text-[10px] font-bold font-terminal truncate leading-tight">{event.title}</div>
                                  <div className="text-[8px] font-terminal opacity-80 truncate tabular-nums tracking-tighter">
                                    {format(event.start, 'h:mm')} - {format(event.end, 'h:mm a')}
                                  </div>
                                  {event.isGoogle && (
                                    <div className="absolute bottom-1 right-1 opacity-60">
                                      <div className="w-1.5 h-1.5 rounded-full bg-current" />
                                    </div>
                                  )}
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
                  <div className="p-4 border-b border-secondary bg-black/60 shrink-0 flex items-center justify-between">
                    <div>
                      <div className="font-arcade text-xs text-muted-foreground">{format(currentDate, 'EEEE').toUpperCase()}</div>
                      <div className={cn("font-arcade text-2xl", isToday(currentDate) && "text-primary")}>{format(currentDate, 'd')}</div>
                    </div>
                    <Button size="sm" className="rounded-none font-arcade text-xs bg-primary text-black hover:bg-primary/90" onClick={() => openCreateModal(currentDate)} data-testid="button-create-event">
                      <Plus className="w-4 h-4 mr-1" /> CREATE
                    </Button>
                  </div>

                  {/* All-day events */}
                  {(() => {
                    const allDayEvents = getEventsForDay(currentDate).filter(e => e.allDay);
                    if (allDayEvents.length === 0) return null;
                    return (
                      <div className="p-2 border-b border-secondary bg-black/40 shrink-0 flex gap-2 flex-wrap">
                        <span className="font-terminal text-[10px] text-muted-foreground">ALL DAY:</span>
                        {allDayEvents.map((event, i) => (
                          <div key={i} className={cn("text-[10px] font-terminal px-2 py-0.5 rounded-sm", getEventColor(event))}>{event.title}</div>
                        ))}
                      </div>
                    );
                  })()}

                  <ScrollArea className="flex-1">
                    <div className="relative" style={{ height: `${24 * HOUR_HEIGHT}px` }}>
                      {HOURS.map((hour) => (
                        <div key={hour} className="flex border-b border-secondary/30 cursor-pointer hover:bg-primary/5" style={{ height: `${HOUR_HEIGHT}px` }} onClick={() => openCreateModal(currentDate, hour)}>
                          <div className="w-20 text-right pr-2 font-terminal text-xs text-muted-foreground shrink-0 pt-1">
                            {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                          </div>
                          <div className="flex-1 border-l border-secondary/50"></div>
                        </div>
                      ))}

                      {/* Positioned events */}
                      <div className="absolute top-0 left-20 right-0">
                        {getEventsForDay(currentDate).filter(e => !e.allDay).map((event, i) => {
                          const dayStart = setHours(setMinutes(currentDate, 0), 0);
                          const style = getEventStyle(event, dayStart);
                          return (
                            <div
                              key={`${event.id}-${i}`}
                              className={cn("absolute left-1 right-4 rounded-sm p-3 cursor-pointer flex flex-col gap-1", getEventColor(event))}
                              style={style}
                              onClick={(e) => { e.stopPropagation(); handleEventClick(event); }}
                            >
                              <div className="font-bold text-sm font-terminal truncate leading-tight">{event.title}</div>
                              <div className="text-xs font-terminal opacity-80 truncate tabular-nums">
                                {format(event.start, 'h:mm a')} - {format(event.end, 'h:mm a')}
                              </div>
                              {event.location && <div className="text-[10px] opacity-70 truncate font-arcade">{event.location}</div>}
                              {event.isGoogle && (
                                <div className="absolute top-2 right-2 opacity-50">
                                  <div className="w-2 h-2 rounded-full bg-current" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
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

        {/* Sidebar */}
        <div className="space-y-4 flex flex-col">
          <Card className="bg-black/40 border-2 border-secondary rounded-none">
            <CardContent className="p-2">
              <div className="grid grid-cols-7 gap-1 text-center">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (<div key={i} className="font-arcade text-[8px] text-muted-foreground p-1">{d}</div>))}
                {eachDayOfInterval({ start: startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 }), end: endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 }) }).slice(0, 35).map((day, i) => (
                  <button key={i} onClick={() => goToDay(day)} className={cn("font-terminal text-[10px] p-1 hover:bg-primary/20 transition-colors", !isSameMonth(day, currentDate) && "text-muted-foreground/50", isToday(day) && "bg-primary text-black", isSameDay(day, currentDate) && !isToday(day) && "ring-1 ring-primary")}>{format(day, 'd')}</button>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="rounded-none bg-black border-secondary pl-10 font-terminal text-sm"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search-events"
            />
          </div>

          {searchQuery && filteredEvents.length > 0 && (
            <Card className="bg-black/40 border-2 border-secondary rounded-none max-h-[200px] overflow-auto">
              <CardContent className="p-2 space-y-1">
                {filteredEvents.map((event, i) => (
                  <div
                    key={`${event.id}-${i}`}
                    className="p-2 hover:bg-white/5 cursor-pointer flex items-center gap-2"
                    onClick={() => handleEventClick(event)}
                  >
                    <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: event.calendarColor || (event.isGoogle ? '#3b82f6' : '#ef4444') }} />
                    <div className="flex-1 min-w-0">
                      <div className="font-terminal text-sm truncate">{event.title}</div>
                      <div className="text-[10px] text-muted-foreground">{format(event.start, 'MMM d, yyyy h:mm a')}</div>
                    </div>
                    {event.isGoogle && <Badge variant="outline" className="text-[8px] rounded-none shrink-0">GOOGLE</Badge>}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {searchQuery && filteredEvents.length === 0 && (
            <div className="text-center text-muted-foreground font-terminal text-sm p-4">No events found</div>
          )}

          <Button className="w-full rounded-none font-arcade text-xs bg-primary text-black hover:bg-primary/90" onClick={() => openCreateModal(currentDate)} data-testid="button-quick-create">
            <Plus className="w-4 h-4 mr-2" /> CREATE_EVENT
          </Button>

          <Card className="bg-black/40 border-2 border-primary/50 rounded-none">
            <CardHeader className="p-3 border-b border-primary/50">
              <CardTitle className="font-arcade text-xs text-primary">GOOGLE CONNECTION</CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2">
              {isGoogleStatusLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                </div>
              ) : googleStatusError ? (
                <div className="text-center space-y-2">
                  <div className="font-terminal text-xs text-red-500">Connection Error</div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] text-muted-foreground"
                    onClick={() => refetchGoogleStatus()}
                  >
                    RETRY
                  </Button>
                </div>
              ) : !googleStatus?.configured ? (
                <div className="text-center space-y-2">
                  <div className="font-terminal text-xs text-muted-foreground">Set up your own Google OAuth</div>
                  <div className="text-[10px] text-muted-foreground">
                    Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Secrets
                  </div>
                </div>
              ) : googleStatus?.connected ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="font-terminal text-sm text-green-400 font-bold">Connected</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full rounded-none font-arcade text-[10px] border-red-500 text-red-500 hover:bg-red-500/10 hover:text-red-400"
                    onClick={() => disconnectGoogleMutation.mutate()}
                    disabled={disconnectGoogleMutation.isPending}
                    data-testid="button-disconnect-google"
                  >
                    DISCONNECT
                  </Button>
                </div>
              ) : (
                <Button
                  className="w-full rounded-none font-arcade text-xs bg-primary text-black hover:bg-primary/90"
                  onClick={() => connectGoogleMutation.mutate()}
                  disabled={connectGoogleMutation.isPending}
                  data-testid="button-connect-google"
                >
                  CONNECT GOOGLE
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="bg-black/40 border-2 border-secondary rounded-none">
            <CardHeader className="p-3 border-b border-secondary">
              <CardTitle className="font-arcade text-xs">MY CALENDARS</CardTitle>
            </CardHeader>
            <CardContent className="p-2 space-y-1">
              <div className="flex items-center gap-2 p-1.5 hover:bg-white/5 cursor-pointer" onClick={() => setShowLocalEvents(!showLocalEvents)} data-testid="toggle-local-events">
                <Checkbox checked={showLocalEvents} className="rounded-none border-primary data-[state=checked]:bg-primary" />
                <div className="w-3 h-3 rounded-sm bg-primary" />
                <span className="font-terminal text-sm flex-1">Local Events</span>
                <Pin className="w-3 h-3 text-muted-foreground opacity-50" />
              </div>

              {/* Separator */}
              <div className="h-px bg-secondary/30 my-2" />

              {/* Pinned Calendars */}
              {availableCalendars.filter(c => pinnedCalendars.includes(c.id)).map((cal) => (
                <div key={cal.id} className="flex items-center gap-2 p-1.5 hover:bg-white/5 cursor-pointer group" onClick={() => toggleCalendar(cal.id)}>
                  <Checkbox checked={selectedCalendars.has(cal.id)} className="rounded-none border-secondary data-[state=checked]:bg-secondary" id={`cb-${cal.id}`} />
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: cal.color }} />
                  <span className="font-terminal text-sm truncate flex-1">{cal.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 opacity-0 group-hover:opacity-100 hover:text-yellow-500"
                    onClick={(e) => { e.stopPropagation(); togglePin(cal.id); }}
                  >
                    <PinOff className="w-3 h-3" />
                  </Button>
                </div>
              ))}

              {/* Collapsible Other Calendars */}
              <Collapsible open={isOthersOpen} onOpenChange={setIsOthersOpen} className="mt-2">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between p-1 h-6 font-arcade text-[10px] text-muted-foreground hover:text-white">
                    OTHER CALENDARS
                    <ChevronDown className={cn("w-3 h-3 transition-transform", isOthersOpen ? "rotate-180" : "")} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1 mt-1">
                  {availableCalendars.filter(c => !pinnedCalendars.includes(c.id)).map((cal) => (
                    <div key={cal.id} className="flex items-center gap-2 p-1.5 hover:bg-white/5 cursor-pointer group" onClick={() => toggleCalendar(cal.id)}>
                      <Checkbox checked={selectedCalendars.has(cal.id)} className="rounded-none border-secondary data-[state=checked]:bg-secondary" id={`cb-${cal.id}`} />
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: cal.color }} />
                      <span className="font-terminal text-sm truncate flex-1 text-muted-foreground">{cal.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 opacity-0 group-hover:opacity-100 hover:text-primary"
                        onClick={(e) => { e.stopPropagation(); togglePin(cal.id); }}
                      >
                        <Pin className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                  {availableCalendars.filter(c => !pinnedCalendars.includes(c.id)).length === 0 && (
                    <div className="text-[9px] font-terminal text-muted-foreground px-2 py-4 text-center italic">
                      No other calendars
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>

          <Card className="bg-black/40 border-2 border-secondary rounded-none flex-1">
            <CardHeader className="p-3 border-b border-secondary flex flex-row justify-between items-center">
              <CardTitle className="font-arcade text-xs">TASKS</CardTitle>
              <Badge variant="secondary" className="rounded-none font-terminal text-[10px]" data-testid="badge-pending-tasks">{pendingTasks}</Badge>
            </CardHeader>
            <ScrollArea className="h-[200px]">
              <CardContent className="p-2 space-y-1">
                {googleTasks.length > 0 && (
                  <div className="text-[10px] font-arcade text-muted-foreground mb-1 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500" /> GOOGLE TASKS
                  </div>
                )}
                {googleTasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-2 p-2 hover:bg-white/5 cursor-pointer group" onClick={() => toggleGoogleTaskMutation.mutate({ taskId: task.id, completed: task.status !== 'completed' })} data-testid={`google-task-${task.id}`}>
                    {task.status === 'completed' ? <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" /> : <Circle className="w-4 h-4 text-muted-foreground group-hover:text-blue-500 shrink-0" />}
                    <span className={cn("font-terminal text-sm flex-1 truncate", task.status === 'completed' && 'line-through text-muted-foreground')}>{task.title}</span>
                  </div>
                ))}
                {tasks.length > 0 && (
                  <div className="text-[10px] font-arcade text-muted-foreground mb-1 mt-2 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-primary" /> LOCAL TASKS
                  </div>
                )}
                {tasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-2 p-2 hover:bg-white/5 cursor-pointer group" onClick={() => toggleTaskMutation.mutate({ id: task.id, status: task.status })} data-testid={`task-${task.id}`}>
                    {task.status === 'completed' ? <CheckCircle2 className="w-4 h-4 text-secondary shrink-0" /> : <Circle className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0" />}
                    <span className={cn("font-terminal text-sm flex-1 truncate", task.status === 'completed' && 'line-through text-muted-foreground')}>{task.title}</span>
                  </div>
                ))}
                <div className="flex gap-2 mt-2">
                  <Button variant="ghost" size="sm" className="flex-1 font-arcade text-[10px] text-blue-500 hover:text-blue-400" onClick={() => { const title = prompt("Google Task title:"); if (title) createGoogleTaskMutation.mutate(title); }} data-testid="button-add-google-task">
                    <Plus className="w-3 h-3 mr-1" /> GOOGLE
                  </Button>
                  <Button variant="ghost" size="sm" className="flex-1 font-arcade text-[10px] text-muted-foreground hover:text-primary" onClick={() => { const title = prompt("Local Task title:"); if (title) createTaskMutation.mutate({ title, status: "pending" }); }} data-testid="button-add-task">
                    <Plus className="w-3 h-3 mr-1" /> LOCAL
                  </Button>
                </div>
              </CardContent>
            </ScrollArea>
          </Card>

          <div className="text-center font-terminal text-[10px] text-muted-foreground p-2 border border-dashed border-secondary rounded-none">
            {isLoadingGoogle ? <span className="animate-pulse">SYNCING...</span> : <span>GOOGLE CONNECTED</span>}
          </div>
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
