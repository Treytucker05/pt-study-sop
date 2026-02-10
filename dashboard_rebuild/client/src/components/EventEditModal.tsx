import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, ExternalLink, RefreshCw, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

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

type Tab = "details" | "time" | "recurrence" | "people" | "settings";

interface CourseOption {
  id: number;
  name: string;
  code?: string | null;
}

const FALLBACK_TIME_ZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "America/Indiana/Indianapolis",
  "America/Detroit",
  "America/Boise",
  "America/Juneau",
  "Pacific/Honolulu",
];

interface EventEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: GoogleCalendarEvent | null;
  onEventChange: (event: GoogleCalendarEvent) => void;
  onSave: () => void;
  onDeleteInstance: () => void;
  onDeleteSeries: () => void;
  onEditSeries?: () => void;
  mode?: "instance" | "series";
  courseOptions?: CourseOption[];
}

export function EventEditModal({
  open,
  onOpenChange,
  event,
  onEventChange,
  onSave,
  onDeleteInstance,
  onDeleteSeries,
  onEditSeries,
  mode = "series",
  courseOptions = [],
}: EventEditModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>("details");
  const [newAttendee, setNewAttendee] = useState("");
  const isInstance = mode === "instance";
  const timeZoneOptions = useMemo(() => {
    if (typeof Intl !== "undefined" && "supportedValuesOf" in Intl) {
      try {
        const zones = (Intl.supportedValuesOf("timeZone") as string[])
          .filter((tz) => tz.startsWith("America/") || tz === "Pacific/Honolulu")
          .slice()
          .sort();
        return zones.length > 0 ? zones : FALLBACK_TIME_ZONES;
      } catch {
        return FALLBACK_TIME_ZONES;
      }
    }
    return FALLBACK_TIME_ZONES;
  }, []);

  useEffect(() => {
    if (!open || !event?.recurringEventId || !event.calendarId) return;
    if (event.recurrence && event.recurrence.length > 0) return;
    let cancelled = false;
    fetch(`/api/google-calendar/events/${encodeURIComponent(event.recurringEventId)}?calendarId=${encodeURIComponent(event.calendarId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.recurrence) return;
        onEventChange({ ...event, recurrence: data.recurrence });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [open, event?.recurringEventId, event?.calendarId, event?.recurrence, onEventChange]);

  const formatRecurrence = (rule?: string) => {
    switch (rule) {
      case "RRULE:FREQ=DAILY":
        return "Daily";
      case "RRULE:FREQ=WEEKLY":
        return "Weekly";
      case "RRULE:FREQ=MONTHLY":
        return "Monthly";
      case "RRULE:FREQ=YEARLY":
        return "Yearly";
      default:
        return rule || "Unavailable";
    }
  };
  const courseIdValue = useMemo(() => {
    if (!event) return "__none__";
    if (event.courseId) return String(event.courseId);
    if (event.course) {
      const match = courseOptions.find((c) => c.name === event.course);
      if (match) return String(match.id);
    }
    return "__none__";
  }, [event, courseOptions]);

  if (!event) return null;

  const isAllDay = !!event.start?.date && !event.start?.dateTime;
  const resolvedTimeZone =
    event.start?.timeZone ||
    event.extendedProperties?.private?.timeZone ||
    Intl.DateTimeFormat().resolvedOptions().timeZone ||
    "UTC";
  const fallbackTimeZone = timeZoneOptions[0] || "America/New_York";
  const timeZoneValue = timeZoneOptions.includes(resolvedTimeZone) ? resolvedTimeZone : fallbackTimeZone;

  const setField = <K extends keyof GoogleCalendarEvent>(key: K, value: GoogleCalendarEvent[K]) => {
    onEventChange({ ...event, [key]: value });
  };

  const updateCourseSelection = (value: string) => {
    if (value === "__none__") {
      onEventChange({ ...event, course: undefined, courseId: undefined, courseCode: undefined });
      return;
    }
    const selected = courseOptions.find((c) => String(c.id) === value);
    if (!selected) return;
    onEventChange({
      ...event,
      course: selected.name,
      courseId: selected.id,
      courseCode: selected.code || undefined,
    });
  };

  const toggleAllDay = (allDay: boolean) => {
    if (allDay) {
      const startDate = (event.start?.dateTime || "").substring(0, 10) || new Date().toISOString().substring(0, 10);
      const endDate = (event.end?.dateTime || "").substring(0, 10) || startDate;
      onEventChange({
        ...event,
        start: { date: startDate },
        end: { date: endDate },
      });
    } else {
      const startDate = event.start?.date || new Date().toISOString().substring(0, 10);
      onEventChange({
        ...event,
        start: { dateTime: `${startDate}T09:00` },
        end: { dateTime: `${startDate}T10:00` },
      });
    }
  };

  const updateTimeZone = (value: string) => {
    const nextExtended = {
      ...event.extendedProperties,
      private: {
        ...(event.extendedProperties?.private || {}),
        timeZone: value,
      },
    };
    const nextStart = event.start?.dateTime ? { ...event.start, timeZone: value } : event.start;
    const nextEnd = event.end?.dateTime ? { ...event.end, timeZone: value } : event.end;
    onEventChange({
      ...event,
      start: nextStart,
      end: nextEnd,
      extendedProperties: nextExtended,
    });
  };

  const addAttendee = () => {
    const email = newAttendee.trim();
    if (!email || !email.includes("@")) return;
    const current = event.attendees || [];
    if (current.some(a => a.email === email)) return;
    setField("attendees", [...current, { email }]);
    setNewAttendee("");
  };

  const removeAttendee = (email: string) => {
    setField("attendees", (event.attendees || []).filter(a => a.email !== email));
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "details", label: "DETAILS" },
    { id: "time", label: "TIME" },
    { id: "recurrence", label: "REPEAT" },
    { id: "people", label: "PEOPLE" },
    { id: "settings", label: "SETTINGS" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          data-modal="calendar-edit-google"
          className="font-arcade bg-black border-2 border-green-500 rounded-none max-w-none w-[min(96vw,42rem)] p-0 overflow-hidden translate-y-0 max-h-[calc(100vh-4rem)]"
          style={{ zIndex: 100005, top: "3rem", left: "50%", transform: "translate(-50%, 0)" }}
        >
        <DialogTitle className="sr-only">Edit Google Calendar event</DialogTitle>
        <DialogDescription className="sr-only">Update event details, time, recurrence, attendees, and settings.</DialogDescription>
        <div className="flex flex-col h-full min-h-0">
          {/* Header */}
          <div className="bg-green-500/20 border-b border-green-500 p-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 animate-pulse" />
              <span className="text-green-500 font-bold tracking-wider">EDIT_EVENT</span>
            </div>
            <div className="flex items-center gap-2">
              {isInstance && onEditSeries && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onEditSeries}
                  className="h-6 px-2 border border-green-500/50 text-green-500 hover:bg-green-500/10 rounded-none font-arcade text-xs"
                >
                  EDIT SERIES
                </Button>
              )}
              <div className="flex gap-1">
                {isInstance && (
                  <Badge variant="outline" className="text-xs border-green-500 text-green-500">
                    INSTANCE
                  </Badge>
                )}
                {mode === "series" && event.recurrence && (
                  <Badge variant="outline" className="text-xs border-green-500 text-green-500">
                    SERIES
                  </Badge>
                )}
                {(event.conferenceData || event.hangoutLink) && (
                  <Badge variant="outline" className="text-xs border-blue-400 text-blue-400">
                    ONLINE
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-green-500/30 shrink-0">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={cn(
                  "flex-1 py-2 text-xs font-arcade transition-colors",
                  activeTab === tab.id ? "text-green-500 border-b-2 border-green-500 bg-green-500/10" : "text-zinc-500 hover:text-zinc-300"
                )}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-5 space-y-4 overflow-y-auto flex-1 min-h-0">
            {activeTab === "details" && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs text-green-500/80">TITLE_</Label>
                  <Input
                    value={event.summary || ""}
                    onChange={(e) => setField("summary", e.target.value)}
                    className="bg-black border-green-500/50 focus:border-green-500 text-green-500 font-terminal text-lg h-12 rounded-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-green-500/80">DESCRIPTION_</Label>
                  <Textarea
                    value={event.description || ""}
                    onChange={(e) => setField("description", e.target.value)}
                    className="bg-black border-green-500/50 text-green-500 font-terminal min-h-[80px] rounded-none resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-green-500/80">LOCATION_</Label>
                  <Input
                    value={event.location || ""}
                    onChange={(e) => setField("location", e.target.value)}
                    className="bg-black border-green-500/50 text-green-500 font-terminal rounded-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-green-500/80">EVENT_TYPE_</Label>
                    <Select value={event.eventType || "study"} onValueChange={(v) => setField("eventType", v)}>
                      <SelectTrigger className="bg-black border-green-500/50 text-green-500 rounded-none h-8 font-terminal text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-black border-green-500 text-green-500 font-terminal rounded-none z-[100010]">
                        <SelectItem value="study">STUDY</SelectItem>
                        <SelectItem value="lecture">LECTURE</SelectItem>
                        <SelectItem value="exam">EXAM</SelectItem>
                        <SelectItem value="synchronous">SYNCHRONOUS</SelectItem>
                        <SelectItem value="online">ONLINE</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                <div className="space-y-2">
                  <Label className="text-xs text-green-500/80">COURSE_</Label>
                  <Select
                    value={courseIdValue}
                    onValueChange={updateCourseSelection}
                  >
                    <SelectTrigger className="bg-black border-green-500/50 text-green-500 rounded-none h-8 font-terminal text-xs">
                      <SelectValue placeholder="Select course" />
                    </SelectTrigger>
                    <SelectContent className="bg-black border-green-500 text-green-500 font-terminal z-[100010]">
                      <SelectItem value="__none__">None</SelectItem>
                      {courseOptions.length === 0 && (
                        <SelectItem value="__empty__" disabled>
                          No courses found
                        </SelectItem>
                      )}
                      {courseOptions.map((course) => (
                        <SelectItem key={course.id} value={String(course.id)}>
                          {course.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-green-500/80">WEIGHT_</Label>
                    <Input
                      value={event.weight || ""}
                      onChange={(e) => setField("weight", e.target.value)}
                      placeholder="e.g. High, Medium, Low"
                      className="bg-black border-green-500/50 text-green-500 font-terminal rounded-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-green-500/80">COLOR_ID_</Label>
                    <Select value={event.colorId || "0"} onValueChange={(v) => setField("colorId", v === "0" ? undefined : v)}>
                      <SelectTrigger className="bg-black border-green-500/50 text-green-500 rounded-none h-8 font-terminal text-xs">
                        <SelectValue placeholder="Default" />
                      </SelectTrigger>
                      <SelectContent className="bg-black border-green-500 text-green-500 font-terminal rounded-none z-[100010]">
                        <SelectItem value="0">Default</SelectItem>
                        <SelectItem value="1">Lavender</SelectItem>
                        <SelectItem value="2">Sage</SelectItem>
                        <SelectItem value="3">Grape</SelectItem>
                        <SelectItem value="4">Flamingo</SelectItem>
                        <SelectItem value="5">Banana</SelectItem>
                        <SelectItem value="6">Tangerine</SelectItem>
                        <SelectItem value="7">Peacock</SelectItem>
                        <SelectItem value="8">Graphite</SelectItem>
                        <SelectItem value="9">Blueberry</SelectItem>
                        <SelectItem value="10">Basil</SelectItem>
                        <SelectItem value="11">Tomato</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}

            {activeTab === "time" && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <Checkbox
                    id="all-day"
                    checked={isAllDay}
                    onCheckedChange={(checked) => toggleAllDay(!!checked)}
                    className="border-green-500/50 data-[state=checked]:bg-green-500"
                  />
                  <Label htmlFor="all-day" className="text-xs text-green-500/80 cursor-pointer">ALL DAY EVENT</Label>
                </div>
                {isAllDay ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-green-500/80">START_DATE_</Label>
                      <Input
                        type="date"
                        value={event.start?.date || ""}
                        onChange={(e) => onEventChange({ ...event, start: { date: e.target.value } })}
                        className="bg-black border-green-500/50 text-green-500 font-terminal rounded-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-green-500/80">END_DATE_</Label>
                      <Input
                        type="date"
                        value={event.end?.date || ""}
                        onChange={(e) => onEventChange({ ...event, end: { date: e.target.value } })}
                        className="bg-black border-green-500/50 text-green-500 font-terminal rounded-none"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-green-500/80">START_</Label>
                      <Input
                        type="datetime-local"
                        value={event.start?.dateTime?.substring(0, 16) || ""}
                        onChange={(e) => onEventChange({ ...event, start: { dateTime: e.target.value } })}
                        className="bg-black border-green-500/50 text-green-500 font-terminal rounded-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-green-500/80">END_</Label>
                      <Input
                        type="datetime-local"
                        value={event.end?.dateTime?.substring(0, 16) || ""}
                        onChange={(e) => onEventChange({ ...event, end: { dateTime: e.target.value } })}
                        className="bg-black border-green-500/50 text-green-500 font-terminal rounded-none"
                      />
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <Label className="text-xs text-green-500/80">TIMEZONE_</Label>
                  <Select value={timeZoneValue} onValueChange={updateTimeZone}>
                    <SelectTrigger className="bg-black border-green-500/50 text-green-500 rounded-none h-8 font-terminal text-xs">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent className="bg-black border-green-500 text-green-500 font-terminal z-[100010]">
                      {timeZoneOptions.map((tz) => (
                        <SelectItem key={tz} value={tz}>
                          {tz}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {activeTab === "recurrence" && (
              <>
                {event.recurringEventId ? (
                  <div className="space-y-2">
                    <p className="text-xs text-yellow-500 font-terminal">
                      This is a single instance of a recurring event. Recurrence can only be edited on the series.
                    </p>
                    <p className="text-xs text-green-300 font-terminal">
                      Series pattern: {formatRecurrence(event.recurrence?.[0])}
                    </p>
                    {isInstance && onEditSeries && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={onEditSeries}
                        className="mt-2 h-7 px-3 border border-green-500/50 text-green-500 hover:bg-green-500/10 rounded-none font-arcade text-xs"
                      >
                        EDIT SERIES
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-green-500/80 flex items-center gap-2">
                        PATTERN_ <RefreshCw className="w-3 h-3" />
                      </Label>
                      <Select
                        value={event.recurrence?.[0] || "none"}
                        onValueChange={(val) => setField("recurrence", val === "none" ? undefined : [val])}
                      >
                        <SelectTrigger className="bg-black border-green-500/50 text-green-500 rounded-none h-8 font-terminal text-xs">
                          <SelectValue placeholder="No Recurrence" />
                        </SelectTrigger>
                        <SelectContent className="bg-black border-green-500 text-green-500 font-terminal rounded-none z-[100010]">
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="RRULE:FREQ=DAILY">Daily</SelectItem>
                          <SelectItem value="RRULE:FREQ=WEEKLY">Weekly</SelectItem>
                          <SelectItem value="RRULE:FREQ=MONTHLY">Monthly</SelectItem>
                          <SelectItem value="RRULE:FREQ=YEARLY">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {event.recurrence &&
                      !["RRULE:FREQ=DAILY", "RRULE:FREQ=WEEKLY", "RRULE:FREQ=MONTHLY", "RRULE:FREQ=YEARLY"].includes(event.recurrence[0]) && (
                        <div className="space-y-2">
                          <Label className="text-xs text-green-500/80">CUSTOM_RRULE_</Label>
                          <Textarea
                            value={event.recurrence[0]}
                            onChange={(e) => setField("recurrence", [e.target.value])}
                            className="bg-black border-green-500/30 text-green-100/70 text-xs font-terminal h-12 rounded-none"
                            placeholder="RRULE:FREQ=WEEKLY;BYDAY=MO,WE"
                          />
                        </div>
                      )}
                  </div>
                )}
              </>
            )}

            {activeTab === "people" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs text-green-500/80">ATTENDEES_</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newAttendee}
                      onChange={(e) => setNewAttendee(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addAttendee()}
                      placeholder="email@example.com"
                      className="bg-black border-green-500/50 text-green-500 font-terminal rounded-none text-xs flex-1"
                    />
                    <Button size="sm" onClick={addAttendee} className="rounded-none bg-green-500 text-black hover:bg-green-400 h-9 px-3">
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1">
                  {(event.attendees || []).map((att) => (
                    <div key={att.email} className="flex items-center justify-between p-2 border border-zinc-800 text-xs font-terminal">
                      <span className="text-green-500">{att.email}</span>
                      <div className="flex items-center gap-2">
                        {att.responseStatus && (
                          <span className={cn("text-xs", att.responseStatus === "accepted" ? "text-green-400" : att.responseStatus === "declined" ? "text-red-400" : "text-yellow-400")}>
                            {att.responseStatus.toUpperCase()}
                          </span>
                        )}
                        {!att.self && (
                          <button onClick={() => removeAttendee(att.email)} className="text-red-500 hover:text-red-400">
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {(!event.attendees || event.attendees.length === 0) && (
                    <p className="text-xs text-zinc-500 font-terminal">No attendees</p>
                  )}
                </div>
              </div>
            )}

            {activeTab === "settings" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs text-green-500/80">VISIBILITY_</Label>
                  <Select value={event.visibility || "default"} onValueChange={(v) => setField("visibility", v === "default" ? undefined : v)}>
                    <SelectTrigger className="bg-black border-green-500/50 text-green-500 rounded-none h-8 font-terminal text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-black border-green-500 text-green-500 font-terminal z-[100010]">
                      <SelectItem value="default">Default</SelectItem>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-green-500/80">AVAILABILITY_</Label>
                  <Select value={event.transparency || "opaque"} onValueChange={(v) => setField("transparency", v)}>
                    <SelectTrigger className="bg-black border-green-500/50 text-green-500 rounded-none h-8 font-terminal text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-black border-green-500 text-green-500 font-terminal z-[100010]">
                      <SelectItem value="opaque">Busy</SelectItem>
                      <SelectItem value="transparent">Free</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(event.conferenceData || event.hangoutLink) && (
                  <div className="space-y-2">
                    <Label className="text-xs text-green-500/80">CONFERENCE_</Label>
                    <div className="p-2 border border-blue-500/30">
                      <p className="text-xs text-blue-400 font-terminal">
                        {event.conferenceData?.conferenceSolution?.name || "Google Meet"}
                      </p>
                      {event.conferenceData?.entryPoints?.map((ep, i) => (
                        <a key={i} href={ep.uri} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-300 hover:underline block mt-1 font-terminal">
                          {ep.uri}
                        </a>
                      ))}
                      {event.hangoutLink && !event.conferenceData && (
                        <a href={event.hangoutLink} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-300 hover:underline block mt-1 font-terminal">
                          {event.hangoutLink}
                        </a>
                      )}
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <Label className="text-xs text-green-500/80">REMINDERS_</Label>
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="use-default-reminders"
                      checked={event.reminders?.useDefault !== false}
                      onCheckedChange={(checked) => setField("reminders", checked ? { useDefault: true } : { useDefault: false, overrides: event.reminders?.overrides || [] })}
                      className="border-green-500/50 data-[state=checked]:bg-green-500"
                    />
                    <Label htmlFor="use-default-reminders" className="text-xs text-green-500/80 cursor-pointer">Use default reminders</Label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 flex items-center justify-between gap-4 border-t border-green-500/20 shrink-0">
            <div className="flex items-center gap-2">
              {isInstance ? (
                <>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={onDeleteInstance}
                    className="rounded-none bg-red-900/20 text-red-400 hover:bg-red-900/40 border border-red-900/50 font-arcade text-xs"
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> DELETE INSTANCE
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={onDeleteSeries}
                    className="rounded-none bg-red-900/10 text-red-500 hover:bg-red-900/30 border border-red-900/50 font-arcade text-xs"
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> DELETE SERIES
                  </Button>
                </>
              ) : (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={onDeleteSeries}
                  className="rounded-none bg-red-900/20 text-red-500 hover:bg-red-900/40 border border-red-900/50 font-arcade text-xs"
                >
                  <Trash2 className="w-4 h-4 mr-2" /> DELETE
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                className="bg-transparent border border-green-500/50 text-green-500 hover:bg-green-500/10 rounded-none font-arcade text-xs"
                onClick={() => event.htmlLink && window.open(event.htmlLink, '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" /> OPEN
              </Button>
              <Button
                className="bg-green-500 text-black hover:bg-green-400 rounded-none font-arcade text-xs px-6"
                onClick={onSave}
              >
                SAVE
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
