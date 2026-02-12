import Layout from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useMemo, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, Circle, Plus, ChevronLeft, ChevronRight, RefreshCw, Calendar as CalendarIcon, Trash2, Search, ExternalLink, Bot, ChevronDown } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { InsertCalendarEvent, CalendarEvent } from "@shared/schema";
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
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  colorId?: string;
  calendarId?: string;
  calendarSummary?: string;
  calendarColor?: string;
  location?: string;
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

export default function CalendarPage() {
  const queryClient = useQueryClient();
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
    recurrence: "none" as "none" | "daily" | "weekly" | "monthly" | "yearly",
    calendarId: "",
  });
  const [selectedCalendars, setSelectedCalendars] = useState<Set<string>>(new Set());
  const [showLocalEvents, setShowLocalEvents] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGoogleEvent, setSelectedGoogleEvent] = useState<GoogleCalendarEvent | null>(null);
  const [showGoogleEditModal, setShowGoogleEditModal] = useState(false);
  const [calendarsCollapsed, setCalendarsCollapsed] = useState(true);
  const [pinnedCalendars, setPinnedCalendars] = useState<Set<string>>(new Set());
  const [hideCompleted, setHideCompleted] = useState(false);

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

  interface GoogleTask {
    id: string;
    title: string;
    notes?: string;
    status: 'needsAction' | 'completed';
    due?: string;
  }

  interface GoogleTaskList {
    id: string;
    title: string;
  }

  interface TaskListWithTasks {
    list: GoogleTaskList;
    tasks: GoogleTask[];
  }

  const { data: googleTaskLists = [], isLoading: isLoadingTaskLists, refetch: refetchTaskLists } = useQuery({
    queryKey: ["google-task-lists"],
    queryFn: async () => {
      const res = await fetch("/api/google-tasks/lists");
      if (!res.ok) {
        console.error("Failed to fetch Google Task Lists");
        return [];
      }
      return res.json() as Promise<GoogleTaskList[]>;
    },
    retry: false,
  });

  const { data: allGoogleTasks = [], isLoading: isLoadingTasks, refetch: refetchTasks } = useQuery({
    queryKey: ["google-tasks-all", googleTaskLists],
    queryFn: async () => {
      if (googleTaskLists.length === 0) return [];
      const results: TaskListWithTasks[] = [];
      for (const list of googleTaskLists) {
        try {
          const res = await fetch(`/api/google-tasks/${encodeURIComponent(list.id)}`);
          if (res.ok) {
            const tasks = await res.json() as GoogleTask[];
            results.push({ list, tasks });
          }
        } catch (err) {
          console.error(`Failed to fetch tasks for list ${list.title}:`, err);
        }
      }
      return results;
    },
    enabled: googleTaskLists.length > 0,
    retry: false,
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

  const { data: googleStatus, refetch: refetchGoogleStatus } = useQuery({
    queryKey: ["google-status"],
    queryFn: api.google.getStatus,
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

  const createGoogleEventMutation = useMutation({
    mutationFn: async (data: { calendarId: string; summary: string; start: any; end: any; description?: string }) => {
      const res = await fetch("/api/google-calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create Google event");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["google-calendar"] });
      setShowEventModal(false);
      resetNewEvent();
    },
  });

  const updateGoogleEventMutation = useMutation({
    mutationFn: async ({ calendarId, eventId, data }: { calendarId: string; eventId: string; data: any }) => {
      const res = await fetch(`/api/google-calendar/events/${encodeURIComponent(calendarId)}/${encodeURIComponent(eventId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update Google event");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["google-calendar"] });
      setShowGoogleEditModal(false);
      setSelectedGoogleEvent(null);
    },
  });

  const deleteGoogleEventMutation = useMutation({
    mutationFn: async ({ calendarId, eventId }: { calendarId: string; eventId: string }) => {
      const res = await fetch(`/api/google-calendar/events/${encodeURIComponent(calendarId)}/${encodeURIComponent(eventId)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete Google event");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["google-calendar"] });
      setShowGoogleEditModal(false);
      setSelectedGoogleEvent(null);
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
    mutationFn: async ({ title, listId }: { title: string; listId: string }) => {
      const res = await fetch(`/api/google-tasks/${encodeURIComponent(listId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error("Failed to create task");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["google-tasks-all"] });
    },
  });

  const toggleGoogleTaskMutation = useMutation({
    mutationFn: async ({ taskId, listId, completed }: { taskId: string; listId: string; completed: boolean }) => {
      const res = await fetch(`/api/google-tasks/${encodeURIComponent(listId)}/${taskId}/toggle`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      });
      if (!res.ok) throw new Error("Failed to toggle task");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["google-tasks-all"] });
    },
  });

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
      recurrence: "none",
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
      // Parse date as local timezone by using year/month/day components
      const [year, month, day] = newEvent.date.split('-').map(Number);
      const baseDate = new Date(year, month - 1, day); // month is 0-indexed
      const startDate = setMinutes(setHours(baseDate, startHours), startMinutes);
      
      let endDateTime: Date;
      if (newEvent.allDay) {
        const endDateStr = newEvent.endDate || newEvent.date;
        const [ey, em, ed] = endDateStr.split('-').map(Number);
        const baseEndDate = new Date(ey, em - 1, ed);
        endDateTime = addDays(baseEndDate, 1);
      } else {
        const endDateStr = newEvent.endDate || newEvent.date;
        const [ey, em, ed] = endDateStr.split('-').map(Number);
        const endBaseDate = new Date(ey, em - 1, ed);
        endDateTime = setMinutes(setHours(endBaseDate, endHours), endMinutes);
      }
      
      // If a Google calendar is selected, create on Google Calendar (two-way sync)
      if (newEvent.calendarId && newEvent.calendarId !== "local") {
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        createGoogleEventMutation.mutate({
          calendarId: newEvent.calendarId,
          summary: newEvent.title,
          start: newEvent.allDay 
            ? { date: format(new Date(newEvent.date), 'yyyy-MM-dd') }
            : { dateTime: startDate.toISOString(), timeZone },
          end: newEvent.allDay
            ? { date: format(endDateTime, 'yyyy-MM-dd') }
            : { dateTime: endDateTime.toISOString(), timeZone },
        });
      } else {
        // Create locally
        createEventMutation.mutate({
          title: newEvent.title,
          date: startDate,
          endDate: endDateTime,
          allDay: newEvent.allDay,
          eventType: newEvent.eventType,
          color: newEvent.color,
          recurrence: newEvent.recurrence === "none" ? null : newEvent.recurrence || null,
          calendarId: null,
        });
      }
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
  const pendingGoogleTasks = allGoogleTasks.reduce((acc, list) => acc + list.tasks.filter(t => t.status === "needsAction").length, 0);
  const totalPendingTasks = pendingLocalTasks + pendingGoogleTasks;

  const getHeaderTitle = () => {
    if (viewMode === 'month') return format(currentDate, 'MMMM yyyy').toUpperCase();
    if (viewMode === 'week') return `${format(weekStart, 'MMM d')} - ${format(addDays(weekStart, 6), 'MMM d, yyyy')}`.toUpperCase();
    return format(currentDate, 'EEEE, MMMM d, yyyy').toUpperCase();
  };

  const getEventColor = (event: NormalizedEvent): string => {
    if (event.isGoogle) {
      return "text-white font-medium shadow-sm";
    }
    switch (event.eventType) {
      case 'study': return "bg-red-500 text-white shadow-sm";
      case 'lecture': return "bg-cyan-500 text-white shadow-sm";
      case 'exam': return "bg-amber-500 text-white shadow-sm";
      default: return "bg-red-500 text-white shadow-sm";
    }
  };

  const getEventInlineStyle = (event: NormalizedEvent): React.CSSProperties => {
    if (event.isGoogle && event.calendarColor) {
      return {
        backgroundColor: event.calendarColor,
        borderLeft: `3px solid ${event.calendarColor}`,
        boxShadow: `0 1px 2px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(255,255,255,0.15)`,
      };
    }
    return {
      borderLeft: '3px solid currentColor',
      boxShadow: '0 1px 2px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(255,255,255,0.15)',
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
      <div className="grid lg:grid-cols-4 gap-4 h-[calc(100vh-180px)]">
        
        {/* Main Calendar */}
        <div className="lg:col-span-3 flex flex-col min-h-0">
          <Card className="bg-black/40 border-[3px] border-double border-primary rounded-none flex-1 flex flex-col overflow-hidden min-h-0">
            {/* Header */}
            <CardHeader className="border-b border-primary/30 p-2 md:p-3 flex flex-row justify-between items-center shrink-0 flex-wrap gap-2">
              <div className="flex items-center gap-2 md:gap-3">
                <Button size="sm" variant="outline" className="rounded-none border-primary text-primary hover:bg-primary hover:text-black font-arcade text-xs h-7 px-2" onClick={goToToday} data-testid="button-today">TODAY</Button>
                <div className="flex items-center">
                  <Button size="icon" variant="ghost" className="h-7 w-7 rounded-none hover:bg-primary/20" onClick={() => navigate('prev')} data-testid="button-prev"><ChevronLeft className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 rounded-none hover:bg-primary/20" onClick={() => navigate('next')} data-testid="button-next"><ChevronRight className="h-4 w-4" /></Button>
                </div>
                <h2 className="font-arcade text-xs md:text-sm text-primary" data-testid="text-header-title">{getHeaderTitle()}</h2>
              </div>
              <div className="flex items-center gap-1 md:gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="rounded-none border-primary text-primary hover:bg-primary hover:text-black font-arcade text-[8px] px-1.5 h-7"
                  onClick={() => (window as any).openTutor?.()}
                >
                  <Bot className="h-3 w-3 md:mr-1" /> <span className="hidden md:inline">AI</span>
                </Button>
                <Button size="sm" variant="ghost" className="rounded-none hover:bg-primary/20 h-7 w-7 p-0" onClick={() => refetchGoogle()} disabled={isLoadingGoogle} data-testid="button-sync">
                  <RefreshCw className={cn("h-3 w-3", isLoadingGoogle && "animate-spin")} />
                </Button>
                <div className="flex border border-secondary rounded-none shrink-0">
                  {(['month', 'week', 'day', 'tasks'] as ViewMode[]).map((mode) => (
                    <Button 
                      key={mode} 
                      size="sm" 
                      variant={viewMode === mode ? "default" : "ghost"} 
                      className={cn(
                        "rounded-none font-arcade text-xs px-2 md:px-3 h-8", 
                        viewMode === mode ? "bg-primary text-black" : "text-muted-foreground"
                      )} 
                      onClick={() => setViewMode(mode)} 
                      data-testid={`button-${mode}-view`}
                    >
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
                  <div className="grid grid-cols-7 border-b border-zinc-800 bg-zinc-900/80 shrink-0">
                    {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day) => (
                      <div key={day} className="p-2 text-center font-arcade text-xs text-zinc-400 border-r border-zinc-800 last:border-r-0">{day}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 flex-1 overflow-auto auto-rows-fr">
                    {calendarDays.map((day, index) => {
                      const dayEvents = getEventsForDay(day);
                      const isCurrentMonth = isSameMonth(day, currentDate);
                      const isTodayDate = isToday(day);
                      return (
                        <div key={index} onClick={() => goToDay(day)} className={cn("min-h-[90px] border-r border-b border-zinc-800 p-1.5 cursor-pointer transition-colors hover:bg-zinc-800/50", !isCurrentMonth && "bg-zinc-900/60 text-zinc-600", index % 7 === 6 && "border-r-0")} data-testid={`day-cell-${format(day, 'yyyy-MM-dd')}`}>
                          <div className={cn("text-right font-mono text-sm w-6 h-6 flex items-center justify-center ml-auto", isTodayDate && "bg-red-500 text-white rounded-full font-bold")}>{format(day, 'd')}</div>
                          <div className="space-y-0.5 mt-1">
                            {dayEvents.slice(0, 3).map((event, i) => (
                              <div key={`${event.id}-${i}`} className={cn("text-xs font-mono truncate px-1.5 py-0.5 rounded", getEventColor(event))} style={getEventInlineStyle(event)} title={event.title}>
                                {event.title}
                              </div>
                            ))}
                            {dayEvents.length > 3 && <div className="text-xs font-mono text-zinc-400 px-1 mt-0.5">+{dayEvents.length - 3} more</div>}
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
                            <div key={i} className={cn("text-xs font-mono truncate px-1.5 py-0.5 rounded", getEventColor(event))} style={getEventInlineStyle(event)}>{event.title}</div>
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
                          <div key={hour} className="border-b border-zinc-800/50 text-right pr-2 font-mono text-sm text-zinc-500" style={{ height: `${HOUR_HEIGHT}px` }}>
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
                                  <div className="text-xs font-mono font-medium truncate">{event.title}</div>
                                  <div className="text-xs opacity-80 font-mono">{format(event.start, 'h:mma')}</div>
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
                          <div key={i} className={cn("text-sm font-mono px-3 py-1 rounded", getEventColor(event))} style={getEventInlineStyle(event)}>{event.title}</div>
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
                      
                      {/* Positioned events with overlap handling */}
                      {(() => {
                        const dayStart = setHours(setMinutes(currentDate, 0), 0);
                        const timedEvents = getEventsForDay(currentDate).filter(e => !e.allDay);
                        const eventColumns = calculateEventColumns(timedEvents);
                        return (
                          <div className="absolute top-0 left-20 right-4">
                            {timedEvents.map((event, i) => {
                              const colInfo = eventColumns.get(event.id) || { column: 0, totalColumns: 1 };
                              const style = { ...getEventStyle(event, dayStart, colInfo.column, colInfo.totalColumns), ...getEventInlineStyle(event) };
                              return (
                                <div key={i} className={cn("absolute rounded p-2 cursor-pointer", getEventColor(event))} style={style} onClick={(e) => { e.stopPropagation(); handleEventClick(event); }}>
                                  <div className="font-mono font-medium text-sm truncate">{event.title}</div>
                                  <div className="text-xs opacity-80 font-mono">{format(event.start, 'h:mm a')} - {format(event.end, 'h:mm a')}</div>
                                  {event.isGoogle && event.calendarName && <div className="text-xs opacity-60 mt-1 font-mono truncate">{event.calendarName}</div>}
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
              {/* TASKS VIEW */}
              {viewMode === 'tasks' && (
                <div className="flex-1 overflow-hidden flex flex-col p-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-arcade text-sm text-primary">TASK MANAGEMENT</h3>
                    <div className="flex gap-2 items-center">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <Checkbox checked={hideCompleted} onCheckedChange={(checked) => setHideCompleted(!!checked)} className="rounded-none border-secondary data-[state=checked]:bg-secondary w-3 h-3" />
                        <span className="font-terminal text-xs text-muted-foreground">Hide done</span>
                      </label>
                      <Button variant="outline" size="sm" className="font-arcade text-xs border-secondary text-muted-foreground rounded-none" onClick={() => { refetchTaskLists(); refetchTasks(); }}><RefreshCw className="w-3 h-3 mr-1" /> SYNC</Button>
                      <Button variant="outline" size="sm" className="font-arcade text-xs border-primary text-primary rounded-none" onClick={() => { const title = prompt("Local task title:"); if (title) createTaskMutation.mutate({ title, status: "pending" }); }}>+ LOCAL</Button>
                    </div>
                  </div>
                  <ScrollArea className="flex-1">
                    <div className="space-y-6">
                      {allGoogleTasks.map((listData) => {
                        const visibleTasks = hideCompleted ? listData.tasks.filter(t => t.status !== 'completed') : listData.tasks;
                        return (
                          <div key={listData.list.id}>
                            <div className="flex items-center justify-between mb-2 border-b border-secondary/30 pb-1">
                              <div className="font-arcade text-xs text-primary flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-primary" />
                                {listData.list.title.toUpperCase()}
                                <span className="font-terminal text-xs text-muted-foreground">({visibleTasks.length})</span>
                              </div>
                              <Button variant="ghost" size="sm" className="h-6 px-2 font-arcade text-[8px] text-muted-foreground hover:text-primary" onClick={() => { const title = prompt(`Add task to "${listData.list.title}":`); if (title) createGoogleTaskMutation.mutate({ title, listId: listData.list.id }); }}>
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                            <div className="space-y-1">
                              {visibleTasks.length === 0 ? (
                                <div className="text-center py-2 text-muted-foreground/50 font-terminal text-xs">{hideCompleted ? 'All done!' : 'No tasks'}</div>
                              ) : (
                                visibleTasks.map((task) => (
                                  <div key={task.id} className="flex items-center gap-3 p-2 bg-secondary/10 border border-secondary/30 hover:bg-secondary/20 cursor-pointer" onClick={() => toggleGoogleTaskMutation.mutate({ taskId: task.id, listId: listData.list.id, completed: task.status !== 'completed' })} data-testid={`google-task-${task.id}`}>
                                    {task.status === 'completed' ? <CheckCircle2 className="w-4 h-4 text-primary" /> : <Circle className="w-4 h-4 text-muted-foreground" />}
                                    <div className="flex-1 min-w-0">
                                      <div className={cn("font-terminal text-sm truncate", task.status === 'completed' && "line-through text-muted-foreground")}>{task.title}</div>
                                      {task.due && <div className="text-xs font-terminal text-muted-foreground">DUE: {format(new Date(task.due), 'MMM dd')}</div>}
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {allGoogleTasks.length === 0 && !isLoadingTasks && !isLoadingTaskLists && (
                        <div className="text-center py-8 text-muted-foreground font-terminal text-sm border border-dashed border-secondary/50 rounded-none">
                          <div className="mb-2">No Google Task lists found.</div>
                          <div className="text-xs">Make sure Google Tasks is accessible.</div>
                        </div>
                      )}
                      {(isLoadingTasks || isLoadingTaskLists) && (
                        <div className="text-center py-8 text-muted-foreground font-terminal text-sm animate-pulse">Loading Google Tasks...</div>
                      )}
                      <div className="border-t border-secondary/30 pt-4">
                        <div className="font-arcade text-xs text-secondary mb-2 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-secondary" />
                          LOCAL TASKS
                          <span className="font-terminal text-xs text-muted-foreground">({(hideCompleted ? tasks.filter(t => t.status !== 'completed') : tasks).length})</span>
                        </div>
                        <div className="space-y-1">
                          {(() => {
                            const visibleLocalTasks = hideCompleted ? tasks.filter(t => t.status !== 'completed') : tasks;
                            return visibleLocalTasks.length === 0 ? (
                              <div className="text-center py-2 text-muted-foreground/50 font-terminal text-xs">{hideCompleted ? 'All done!' : 'No local tasks'}</div>
                            ) : (
                              visibleLocalTasks.map((task) => (
                                <div key={task.id} className="flex items-center gap-3 p-2 bg-secondary/10 border border-secondary/30 hover:bg-secondary/20 cursor-pointer" onClick={() => toggleTaskMutation.mutate({ id: task.id, status: task.status })} data-testid={`task-${task.id}`}>
                                  {task.status === 'completed' ? <CheckCircle2 className="w-4 h-4 text-secondary" /> : <Circle className="w-4 h-4 text-muted-foreground" />}
                                  <div className={cn("font-terminal text-sm flex-1 truncate", task.status === 'completed' && "line-through text-muted-foreground")}>{task.title}</div>
                                </div>
                              ))
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-2 flex flex-col overflow-auto">
          <Card className="bg-black/40 border-[3px] border-double border-secondary rounded-none shrink-0">
            <CardContent className="p-1.5">
              <div className="grid grid-cols-7 gap-0.5 text-center">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (<div key={i} className="font-arcade text-[7px] text-muted-foreground p-0.5">{d}</div>))}
                {eachDayOfInterval({ start: startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 }), end: endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 }) }).slice(0, 35).map((day, i) => (
                  <button key={i} onClick={() => goToDay(day)} className={cn("font-terminal text-xs p-0.5 hover:bg-primary/20 transition-colors", !isSameMonth(day, currentDate) && "text-muted-foreground/50", isToday(day) && "bg-primary text-black", isSameDay(day, currentDate) && !isToday(day) && "ring-1 ring-primary")}>{format(day, 'd')}</button>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="relative shrink-0">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <Input 
              className="rounded-none bg-black border-secondary pl-7 font-terminal text-xs h-8" 
              placeholder="Search..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              data-testid="input-search-events"
            />
          </div>
          
          {searchQuery && filteredEvents.length > 0 && (
            <Card className="bg-black/40 border-[3px] border-double border-secondary rounded-none max-h-[200px] overflow-auto">
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
                      <div className="text-xs text-muted-foreground">{format(event.start, 'MMM d, yyyy h:mm a')}</div>
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

          <Button className="w-full rounded-none font-arcade text-xs bg-primary text-black hover:bg-primary/90 h-10 shrink-0" onClick={() => openCreateModal(currentDate)} data-testid="button-quick-create">
            <Plus className="w-4 h-4 mr-2" /> CREATE EVENT
          </Button>

          <Card className="bg-black/40 border-[3px] border-double border-primary/50 rounded-none shrink-0">
            <CardHeader className="p-3 border-b border-primary/50">
              <CardTitle className="font-arcade text-sm text-primary">GOOGLE</CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2">
              {googleStatus?.connected ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                    <span className="font-terminal text-sm text-green-400">Connected</span>
                  </div>
                  <Button 
                    variant="ghost"
                    size="sm"
                    className="h-8 px-3 rounded-none font-arcade text-xs text-muted-foreground hover:text-primary"
                    onClick={() => disconnectGoogleMutation.mutate()}
                    data-testid="button-disconnect-google"
                  >
                    Disconnect
                  </Button>
                </div>
              ) : (
                <div className="text-center space-y-2">
                  <div className="font-terminal text-sm text-muted-foreground">Not connected</div>
                  <Button 
                    variant="outline"
                    size="sm"
                    className="w-full rounded-none font-arcade text-xs border-primary text-primary hover:bg-primary/10 h-10"
                    onClick={() => connectGoogleMutation.mutate()}
                    data-testid="button-connect-google"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" /> CONNECT GOOGLE
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-black/40 border-[3px] border-double border-secondary rounded-none shrink-0">
            <CardHeader className="p-3 border-b border-secondary flex flex-row justify-between items-center cursor-pointer" onClick={() => setCalendarsCollapsed(!calendarsCollapsed)}>
              <CardTitle className="font-arcade text-sm">CALENDARS</CardTitle>
              {calendarsCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </CardHeader>
            <CardContent className={cn("p-3 space-y-2 transition-all", calendarsCollapsed ? "h-0 overflow-hidden p-0 border-0" : "")}>
              <div className="flex items-center gap-3 p-2 hover:bg-white/5 cursor-pointer" onClick={() => setShowLocalEvents(!showLocalEvents)} data-testid="toggle-local-events">
                <Checkbox checked={showLocalEvents} className="rounded-none border-primary data-[state=checked]:bg-primary w-5 h-5" />
                <div className="w-4 h-4 rounded-sm bg-primary" />
                <span className="font-terminal text-base">Local Events</span>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className={cn("h-5 w-5 ml-auto", pinnedCalendars.has('local') ? "text-primary" : "text-muted-foreground")}
                  onClick={(e) => {
                    e.stopPropagation();
                    setPinnedCalendars(prev => {
                      const next = new Set(prev);
                      if (next.has('local')) next.delete('local');
                      else next.add('local');
                      return next;
                    });
                  }}
                >
                  <Search className="w-4 h-4" />
                </Button>
              </div>
              {availableCalendars.map((cal) => (
                <div key={cal.id} className="flex items-center gap-3 p-2 hover:bg-white/5 cursor-pointer" onClick={() => toggleCalendar(cal.id)} data-testid={`toggle-calendar-${cal.name}`}>
                  <Checkbox checked={selectedCalendars.has(cal.id)} className="rounded-none border-secondary data-[state=checked]:bg-secondary w-5 h-5" />
                  <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: cal.color }} />
                  <span className="font-terminal text-base truncate">{cal.name}</span>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className={cn("h-5 w-5 ml-auto", pinnedCalendars.has(cal.id) ? "text-primary" : "text-muted-foreground")}
                    onClick={(e) => {
                      e.stopPropagation();
                      setPinnedCalendars(prev => {
                        const next = new Set(prev);
                        if (next.has(cal.id)) next.delete(cal.id);
                        else next.add(cal.id);
                        return next;
                      });
                    }}
                  >
                    <Search className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
            {/* Pinned Calendars always visible at top when collapsed */}
            {calendarsCollapsed && pinnedCalendars.size > 0 && (
              <div className="p-3 space-y-2 border-t border-secondary">
                {pinnedCalendars.has('local') && (
                  <div className="flex items-center gap-2 p-1">
                    <div className="w-3 h-3 rounded-sm bg-primary" />
                    <span className="font-terminal text-sm truncate">Local</span>
                  </div>
                )}
                {availableCalendars.filter(c => pinnedCalendars.has(c.id)).map(cal => (
                  <div key={cal.id} className="flex items-center gap-2 p-1">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: cal.color }} />
                    <span className="font-terminal text-sm truncate">{cal.name}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="bg-black/40 border-[3px] border-double border-secondary rounded-none flex-1">
            <CardHeader className="p-3 border-b border-secondary flex flex-row justify-between items-center">
              <CardTitle className="font-arcade text-sm">TASKS</CardTitle>
              <Badge variant="secondary" className="rounded-none font-terminal text-sm" data-testid="badge-pending-tasks">{totalPendingTasks}</Badge>
            </CardHeader>
            <ScrollArea className="h-[220px]">
              <CardContent className="p-3 space-y-3">
                {allGoogleTasks.slice(0, 3).map((listData) => (
                  <div key={listData.list.id}>
                    <div className="font-arcade text-xs text-primary/70 mb-2 truncate">{listData.list.title.toUpperCase()}</div>
                    {listData.tasks.slice(0, 3).map((task) => (
                      <div key={task.id} className="flex items-center gap-2 p-1.5 hover:bg-white/5 cursor-pointer group" onClick={() => toggleGoogleTaskMutation.mutate({ taskId: task.id, listId: listData.list.id, completed: task.status !== 'completed' })}>
                        {task.status === 'completed' ? <CheckCircle2 className="w-4 h-4 text-primary shrink-0" /> : <Circle className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0" />}
                        <span className={cn("font-terminal text-sm flex-1 truncate", task.status === 'completed' && 'line-through text-muted-foreground')}>{task.title}</span>
                      </div>
                    ))}
                    {listData.tasks.length > 3 && <div className="text-xs text-muted-foreground font-terminal ml-6">+{listData.tasks.length - 3} more</div>}
                  </div>
                ))}
                {allGoogleTasks.length === 0 && tasks.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground font-terminal text-sm">No tasks</div>
                )}
                {tasks.length > 0 && (
                  <div className="border-t border-secondary/30 pt-2 mt-2">
                    <div className="font-arcade text-xs text-secondary/70 mb-2">LOCAL</div>
                    {tasks.slice(0, 3).map((task) => (
                      <div key={task.id} className="flex items-center gap-2 p-1.5 hover:bg-white/5 cursor-pointer group" onClick={() => toggleTaskMutation.mutate({ id: task.id, status: task.status })} data-testid={`task-${task.id}`}>
                        {task.status === 'completed' ? <CheckCircle2 className="w-4 h-4 text-secondary shrink-0" /> : <Circle className="w-4 h-4 text-muted-foreground group-hover:text-secondary shrink-0" />}
                        <span className={cn("font-terminal text-sm flex-1 truncate", task.status === 'completed' && 'line-through text-muted-foreground')}>{task.title}</span>
                      </div>
                    ))}
                    {tasks.length > 3 && <div className="text-xs text-muted-foreground font-terminal ml-6">+{tasks.length - 3} more</div>}
                  </div>
                )}
                <Button variant="ghost" size="sm" className="w-full font-arcade text-xs text-muted-foreground hover:text-primary" onClick={() => setViewMode('tasks')} data-testid="button-view-all-tasks">
                  VIEW ALL TASKS
                </Button>
              </CardContent>
            </ScrollArea>
          </Card>
        </div>
      </div>

      {/* Create Modal */}
      <Dialog open={showEventModal} onOpenChange={setShowEventModal}>
        <DialogContent className="bg-black border-[3px] border-double border-primary rounded-none max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-arcade text-primary">CREATE EVENT</DialogTitle></DialogHeader>
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
        <DialogContent className="bg-black border-[3px] border-double border-primary rounded-none max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-arcade text-primary">EDIT EVENT</DialogTitle></DialogHeader>
          {selectedEvent && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="font-arcade text-xs">TITLE</Label>
                <Input className="rounded-none bg-black border-secondary focus-visible:ring-primary" value={selectedEvent.title} onChange={(e) => setSelectedEvent({ ...selectedEvent, title: e.target.value })} data-testid="input-edit-title" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-arcade text-xs">START DATE</Label>
                  <Input type="date" className="rounded-none bg-black border-secondary" value={format(new Date(selectedEvent.date), 'yyyy-MM-dd')} onChange={(e) => { 
                    const [y, m, d] = e.target.value.split('-').map(Number);
                    const oldDate = new Date(selectedEvent.date);
                    const newDate = new Date(y, m - 1, d, oldDate.getHours(), oldDate.getMinutes());
                    setSelectedEvent({ ...selectedEvent, date: newDate }); 
                  }} data-testid="input-edit-date" />
                </div>
                <div className="space-y-2">
                  <Label className="font-arcade text-xs">END DATE</Label>
                  <Input type="date" className="rounded-none bg-black border-secondary" value={selectedEvent.endDate ? format(new Date(selectedEvent.endDate), 'yyyy-MM-dd') : format(new Date(selectedEvent.date), 'yyyy-MM-dd')} onChange={(e) => { 
                    const [y, m, d] = e.target.value.split('-').map(Number);
                    const oldEnd = selectedEvent.endDate ? new Date(selectedEvent.endDate) : new Date(selectedEvent.date);
                    const newEnd = new Date(y, m - 1, d, oldEnd.getHours(), oldEnd.getMinutes());
                    setSelectedEvent({ ...selectedEvent, endDate: newEnd }); 
                  }} data-testid="input-edit-end-date" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="editAllDay" checked={selectedEvent.allDay || false} onCheckedChange={(checked) => setSelectedEvent({ ...selectedEvent, allDay: !!checked })} />
                <Label htmlFor="editAllDay" className="font-terminal text-sm cursor-pointer">All day</Label>
              </div>
              {!selectedEvent.allDay && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-arcade text-xs">START TIME</Label>
                    <Input type="time" className="rounded-none bg-black border-secondary" value={format(new Date(selectedEvent.date), 'HH:mm')} onChange={(e) => { 
                      const [hours, minutes] = e.target.value.split(':').map(Number); 
                      const newDate = new Date(selectedEvent.date);
                      newDate.setHours(hours, minutes);
                      setSelectedEvent({ ...selectedEvent, date: newDate }); 
                    }} data-testid="input-edit-start-time" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-arcade text-xs">END TIME</Label>
                    <Input type="time" className="rounded-none bg-black border-secondary" value={selectedEvent.endDate ? format(new Date(selectedEvent.endDate), 'HH:mm') : format(addHours(new Date(selectedEvent.date), 1), 'HH:mm')} onChange={(e) => { 
                      const [hours, minutes] = e.target.value.split(':').map(Number); 
                      const endDate = selectedEvent.endDate ? new Date(selectedEvent.endDate) : new Date(selectedEvent.date);
                      endDate.setHours(hours, minutes);
                      setSelectedEvent({ ...selectedEvent, endDate: endDate }); 
                    }} data-testid="input-edit-end-time" />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
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
                <div className="space-y-2">
                  <Label className="font-arcade text-xs">COLOR</Label>
                  <div className="flex gap-1 flex-wrap">
                    {["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#6b7280"].map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={cn("w-6 h-6 rounded-sm border-2 transition-all", (selectedEvent.color || "#ef4444") === color ? "border-white scale-110" : "border-transparent")}
                        style={{ backgroundColor: color }}
                        onClick={() => setSelectedEvent({ ...selectedEvent, color })}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="font-arcade text-xs">REPEAT</Label>
                <Select value={selectedEvent.recurrence || 'none'} onValueChange={(v) => setSelectedEvent({ ...selectedEvent, recurrence: v === 'none' ? null : v })}>
                  <SelectTrigger className="rounded-none bg-black border-secondary" data-testid="select-edit-recurrence"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-none bg-black border-primary">
                    <SelectItem value="none">NO REPEAT</SelectItem>
                    <SelectItem value="daily">DAILY</SelectItem>
                    <SelectItem value="weekly">WEEKLY</SelectItem>
                    <SelectItem value="monthly">MONTHLY</SelectItem>
                    <SelectItem value="yearly">YEARLY</SelectItem>
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
              <Button className="rounded-none font-arcade text-xs bg-primary text-black hover:bg-primary/90" onClick={() => selectedEvent && updateEventMutation.mutate({ 
                id: selectedEvent.id, 
                data: { 
                  title: selectedEvent.title, 
                  date: selectedEvent.date, 
                  endDate: selectedEvent.endDate,
                  allDay: selectedEvent.allDay,
                  eventType: selectedEvent.eventType,
                  color: selectedEvent.color,
                  recurrence: selectedEvent.recurrence
                } 
              })} data-testid="button-update-event">UPDATE</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Google Event View Modal */}
      <Dialog open={showGoogleEditModal} onOpenChange={setShowGoogleEditModal}>
        <DialogContent className="bg-black border-[3px] border-double border-primary rounded-none max-w-md">
          <DialogHeader>
            <DialogTitle className="font-arcade text-primary flex items-center gap-2">
              GOOGLE_EVENT
              <Badge variant="outline" className="text-xs rounded-none">READ ONLY</Badge>
            </DialogTitle>
          </DialogHeader>
          {selectedGoogleEvent && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="font-arcade text-xs">TITLE</Label>
                <div className="font-terminal text-sm p-2 bg-black/50 border border-secondary">{selectedGoogleEvent.summary || 'Untitled'}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-arcade text-xs">DATE</Label>
                  <div className="font-terminal text-sm p-2 bg-black/50 border border-secondary">
                    {selectedGoogleEvent.start?.dateTime 
                      ? format(new Date(selectedGoogleEvent.start.dateTime), 'MMM d, yyyy')
                      : selectedGoogleEvent.start?.date || 'N/A'}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="font-arcade text-xs">TIME</Label>
                  <div className="font-terminal text-sm p-2 bg-black/50 border border-secondary">
                    {selectedGoogleEvent.start?.dateTime 
                      ? format(new Date(selectedGoogleEvent.start.dateTime), 'h:mm a')
                      : 'All Day'}
                  </div>
                </div>
              </div>
              {selectedGoogleEvent.location && (
                <div className="space-y-2">
                  <Label className="font-arcade text-xs">LOCATION</Label>
                  <div className="font-terminal text-sm p-2 bg-black/50 border border-secondary">{selectedGoogleEvent.location}</div>
                </div>
              )}
              <div className="space-y-2">
                <Label className="font-arcade text-xs">CALENDAR</Label>
                <div className="font-terminal text-sm p-2 bg-black/50 border border-secondary flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: selectedGoogleEvent.calendarColor || '#ff0000' }} />
                  {selectedGoogleEvent.calendarSummary || 'Google Calendar'}
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="flex justify-between">
            {selectedGoogleEvent?.htmlLink && (
              <Button variant="ghost" className="rounded-none font-arcade text-xs text-primary hover:text-primary hover:bg-primary/10" onClick={() => window.open(selectedGoogleEvent.htmlLink, '_blank')}>
                <ExternalLink className="w-4 h-4 mr-1" /> OPEN IN GOOGLE
              </Button>
            )}
            <Button variant="ghost" className="rounded-none font-arcade text-xs" onClick={() => setShowGoogleEditModal(false)}>CLOSE</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
