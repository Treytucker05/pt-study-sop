import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, setHours, setMinutes } from "date-fns";
import type { CalendarEvent } from "@shared/schema";
import { EVENT_COLOR_PALETTE } from "@/lib/colors";

export interface CalendarAttendee {
  email: string;
  responseStatus?: string;
  self?: boolean;
}

export interface CalendarReminders {
  useDefault?: boolean;
  overrides?: { method: string; minutes: number }[];
}

export type LocalCalendarEvent = Omit<
  CalendarEvent,
  "attendees" | "reminders" | "location" | "visibility" | "transparency" | "timeZone"
> & {
  location?: string | null;
  attendees?: CalendarAttendee[];
  visibility?: string | null;
  transparency?: string | null;
  reminders?: CalendarReminders | null;
  timeZone?: string | null;
  courseId?: number | null;
};

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

interface LocalEventEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: LocalCalendarEvent | null;
  onEventChange: (event: LocalCalendarEvent) => void;
  onSave: () => void;
  onDelete: () => void;
  courseOptions?: CourseOption[];
}

const COLOR_PALETTE = EVENT_COLOR_PALETTE;

const tabs: { id: Tab; label: string }[] = [
  { id: "details", label: "DETAILS" },
  { id: "time", label: "TIME" },
  { id: "recurrence", label: "REPEAT" },
  { id: "people", label: "PEOPLE" },
  { id: "settings", label: "SETTINGS" },
];

export function LocalEventEditModal({
  open,
  onOpenChange,
  event,
  onEventChange,
  onSave,
  onDelete,
  courseOptions = [],
}: LocalEventEditModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>("details");
  const [newAttendee, setNewAttendee] = useState("");
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

  const eventDate = new Date(event.date);
  const endDate = event.endDate ? new Date(event.endDate) : null;
  const resolvedTimeZone =
    event.timeZone ||
    Intl.DateTimeFormat().resolvedOptions().timeZone ||
    "UTC";
  const fallbackTimeZone = timeZoneOptions[0] || "America/New_York";
  const timeZoneValue = timeZoneOptions.includes(resolvedTimeZone) ? resolvedTimeZone : fallbackTimeZone;
  const recurrenceValue = (() => {
    const raw = event.recurrence || "none";
    if (raw === "daily") return "RRULE:FREQ=DAILY";
    if (raw === "weekly") return "RRULE:FREQ=WEEKLY";
    if (raw === "monthly") return "RRULE:FREQ=MONTHLY";
    if (raw === "yearly") return "RRULE:FREQ=YEARLY";
    return raw;
  })();
  const standardRecurrence = [
    "RRULE:FREQ=DAILY",
    "RRULE:FREQ=WEEKLY",
    "RRULE:FREQ=MONTHLY",
    "RRULE:FREQ=YEARLY",
  ];

  const setField = <K extends keyof LocalCalendarEvent>(key: K, value: LocalCalendarEvent[K]) => {
    onEventChange({ ...event, [key]: value });
  };

  const updateCourseSelection = (value: string) => {
    if (value === "__none__") {
      onEventChange({ ...event, course: null, courseId: null });
      return;
    }
    const selected = courseOptions.find((c) => String(c.id) === value);
    if (!selected) return;
    onEventChange({
      ...event,
      course: selected.name,
      courseId: selected.id,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-modal="calendar-edit-local"
        className="font-arcade bg-black border-2 border-primary rounded-none max-w-lg p-0 overflow-hidden translate-y-0 max-h-[calc(100vh-4rem)]"
        style={{ zIndex: 100005, top: "3rem", left: "50%", transform: "translate(-50%, 0)" }}
      >
        <DialogTitle className="sr-only">Edit Event</DialogTitle>
        <DialogDescription className="sr-only">Make changes to your event here. Click save when you're done.</DialogDescription>
        <div className="flex flex-col h-full min-h-0">
          {/* Header */}
          <div className="bg-primary/20 border-b border-primary p-4 flex items-center gap-2 shrink-0">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-primary font-bold tracking-wider">EDIT_EVENT</span>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-primary/30 shrink-0">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={cn(
                  "flex-1 py-2 text-xs font-arcade transition-colors",
                  activeTab === tab.id ? "text-primary border-b-2 border-primary bg-primary/10" : "text-zinc-500 hover:text-zinc-300"
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
                  <Label className="text-xs text-primary/80">TITLE_</Label>
                  <Input
                    value={event.title}
                    onChange={(e) => setField("title", e.target.value)}
                    className="bg-black border-primary/50 focus:border-primary text-primary font-terminal text-lg h-12 rounded-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-primary/80">DESCRIPTION_</Label>
                  <Textarea
                    value={event.notes || ""}
                    onChange={(e) => setField("notes", e.target.value)}
                    className="bg-black border-primary/50 text-primary font-terminal min-h-[80px] rounded-none resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-primary/80">LOCATION_</Label>
                  <Input
                    value={event.location || ""}
                    onChange={(e) => setField("location", e.target.value || null)}
                    className="bg-black border-primary/50 text-primary font-terminal rounded-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-primary/80">EVENT_TYPE_</Label>
                    <Select value={event.eventType || "study"} onValueChange={(v) => setField("eventType", v)}>
                      <SelectTrigger className="bg-black border-primary/50 text-primary rounded-none h-8 font-terminal text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-black border-primary text-primary font-terminal z-[100010]">
                        <SelectItem value="study">STUDY</SelectItem>
                        <SelectItem value="lecture">LECTURE</SelectItem>
                        <SelectItem value="exam">EXAM</SelectItem>
                        <SelectItem value="synchronous">SYNCHRONOUS</SelectItem>
                        <SelectItem value="online">ONLINE</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                <div className="space-y-2">
                  <Label className="text-xs text-primary/80">COURSE_</Label>
                  <Select
                    value={courseIdValue}
                    onValueChange={updateCourseSelection}
                  >
                    <SelectTrigger className="bg-black border-primary/50 text-primary rounded-none h-8 font-terminal text-xs">
                      <SelectValue placeholder="Select course" />
                    </SelectTrigger>
                    <SelectContent className="bg-black border-primary text-primary font-terminal z-[100010]">
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
                    <Label className="text-xs text-primary/80">WEIGHT_</Label>
                    <Input
                      value={event.weight || ""}
                      onChange={(e) => setField("weight", e.target.value || null)}
                      placeholder="e.g. High, Medium, Low"
                      className="bg-black border-primary/50 text-primary font-terminal rounded-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-primary/80">COLOR_</Label>
                    <div className="flex gap-2 flex-wrap">
                      {COLOR_PALETTE.map(c => (
                        <button
                          key={c.value}
                          className={cn(
                            "w-7 h-7 rounded-sm border-2 transition-all",
                            event.color === c.value ? "border-white scale-110" : "border-transparent hover:border-white/30"
                          )}
                          style={{ backgroundColor: c.value }}
                          onClick={() => setField("color", c.value)}
                          title={c.label}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === "time" && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <Checkbox
                    id="local-all-day"
                    checked={event.allDay ?? false}
                    onCheckedChange={(checked) => setField("allDay", !!checked)}
                    className="border-primary/50 data-[state=checked]:bg-primary"
                  />
                  <Label htmlFor="local-all-day" className="text-xs text-primary/80 cursor-pointer">ALL DAY EVENT</Label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-primary/80">START_DATE_</Label>
                    <Input
                      type="date"
                      value={format(eventDate, "yyyy-MM-dd")}
                      onChange={(e) => {
                        const [h, m] = [eventDate.getHours(), eventDate.getMinutes()];
                        setField("date", setMinutes(setHours(new Date(e.target.value), h), m));
                      }}
                      className="bg-black border-primary/50 text-primary font-terminal rounded-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-primary/80">END_DATE_</Label>
                    <Input
                      type="date"
                      value={endDate ? format(endDate, "yyyy-MM-dd") : ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setField("endDate", val ? new Date(val) : null);
                      }}
                      className="bg-black border-primary/50 text-primary font-terminal rounded-none"
                    />
                  </div>
                </div>
                {!event.allDay && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-primary/80">START_TIME_</Label>
                      <Input
                        type="time"
                        value={format(eventDate, "HH:mm")}
                        onChange={(e) => {
                          const [hours, minutes] = e.target.value.split(":").map(Number);
                          setField("date", setMinutes(setHours(eventDate, hours), minutes));
                        }}
                        className="bg-black border-primary/50 text-primary font-terminal rounded-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-primary/80">END_TIME_</Label>
                      <Input
                        type="time"
                        value={endDate ? format(endDate, "HH:mm") : ""}
                        onChange={(e) => {
                          if (!e.target.value) return;
                          const [hours, minutes] = e.target.value.split(":").map(Number);
                          const base = endDate || eventDate;
                          setField("endDate", setMinutes(setHours(base, hours), minutes));
                        }}
                        className="bg-black border-primary/50 text-primary font-terminal rounded-none"
                      />
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <Label className="text-xs text-primary/80">TIMEZONE_</Label>
                  <Select value={timeZoneValue} onValueChange={(v) => setField("timeZone", v)}>
                    <SelectTrigger className="bg-black border-primary/50 text-primary rounded-none h-8 font-terminal text-xs">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent className="bg-black border-primary text-primary font-terminal z-[100010]">
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
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs text-primary/80">PATTERN_</Label>
                  <Select
                    value={recurrenceValue}
                    onValueChange={(v) => setField("recurrence", v === "none" ? null : v)}
                  >
                    <SelectTrigger className="bg-black border-primary/50 text-primary rounded-none h-8 font-terminal text-xs">
                      <SelectValue placeholder="No Recurrence" />
                    </SelectTrigger>
                    <SelectContent className="bg-black border-primary text-primary font-terminal z-[100010]">
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="RRULE:FREQ=DAILY">Daily</SelectItem>
                      <SelectItem value="RRULE:FREQ=WEEKLY">Weekly</SelectItem>
                      <SelectItem value="RRULE:FREQ=MONTHLY">Monthly</SelectItem>
                      <SelectItem value="RRULE:FREQ=YEARLY">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {event.recurrence &&
                  !standardRecurrence.includes(recurrenceValue) &&
                  recurrenceValue !== "none" && (
                    <div className="space-y-2">
                      <Label className="text-xs text-primary/80">CUSTOM_RRULE_</Label>
                      <Textarea
                        value={event.recurrence}
                        onChange={(e) => setField("recurrence", e.target.value)}
                        className="bg-black border-primary/30 text-primary text-xs font-mono h-12 rounded-none"
                        placeholder="RRULE:FREQ=WEEKLY;BYDAY=MO,WE"
                      />
                    </div>
                  )}
              </div>
            )}

            {activeTab === "people" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs text-primary/80">ATTENDEES_</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newAttendee}
                      onChange={(e) => setNewAttendee(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addAttendee()}
                      placeholder="email@example.com"
                      className="bg-black border-primary/50 text-primary font-terminal rounded-none text-xs flex-1"
                    />
                    <Button size="sm" onClick={addAttendee} className="rounded-none bg-primary text-black hover:bg-primary/90 h-9 px-3">
                      ADD
                    </Button>
                  </div>
                </div>
                <div className="space-y-1">
                  {(event.attendees || []).map((att) => (
                    <div key={att.email} className="flex items-center justify-between p-2 border border-zinc-800 text-xs font-terminal">
                      <span className="text-primary">{att.email}</span>
                      <div className="flex items-center gap-2">
                        {att.responseStatus && (
                          <span
                            className={cn(
                              "text-xs",
                              att.responseStatus === "accepted"
                                ? "text-green-400"
                                : att.responseStatus === "declined"
                                  ? "text-red-400"
                                  : "text-yellow-400"
                            )}
                          >
                            {att.responseStatus.toUpperCase()}
                          </span>
                        )}
                        {!att.self && (
                          <button onClick={() => removeAttendee(att.email)} className="text-red-500 hover:text-red-400">
                            X
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
                  <Label className="text-xs text-primary/80">VISIBILITY_</Label>
                  <Select value={event.visibility || "default"} onValueChange={(v) => setField("visibility", v === "default" ? null : v)}>
                    <SelectTrigger className="bg-black border-primary/50 text-primary rounded-none h-8 font-terminal text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-black border-primary text-primary font-terminal z-[100010]">
                      <SelectItem value="default">Default</SelectItem>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-primary/80">AVAILABILITY_</Label>
                  <Select value={event.transparency || "opaque"} onValueChange={(v) => setField("transparency", v)}>
                    <SelectTrigger className="bg-black border-primary/50 text-primary rounded-none h-8 font-terminal text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-black border-primary text-primary font-terminal z-[100010]">
                      <SelectItem value="opaque">Busy</SelectItem>
                      <SelectItem value="transparent">Free</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-primary/80">REMINDERS_</Label>
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="use-default-reminders-local"
                      checked={event.reminders?.useDefault !== false}
                      onCheckedChange={(checked) =>
                        setField(
                          "reminders",
                          checked
                            ? { useDefault: true }
                            : { useDefault: false, overrides: event.reminders?.overrides || [] }
                        )
                      }
                      className="border-primary/50 data-[state=checked]:bg-primary"
                    />
                    <Label htmlFor="use-default-reminders-local" className="text-xs text-primary/80 cursor-pointer">Use default reminders</Label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 flex items-center justify-between gap-4 border-t border-primary/20 shrink-0">
            <Button
              variant="destructive"
              size="sm"
              onClick={onDelete}
              className="rounded-none bg-red-900/20 text-red-500 hover:bg-red-900/40 border border-red-900/50 font-arcade text-xs"
            >
              <Trash2 className="w-4 h-4 mr-2" /> DELETE
            </Button>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                className="bg-transparent border border-primary/50 text-primary hover:bg-primary/10 rounded-none font-arcade text-xs"
                onClick={() => onOpenChange(false)}
              >
                CANCEL
              </Button>
              <Button
                className="bg-primary text-black hover:bg-primary/90 rounded-none font-arcade text-xs px-6"
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
