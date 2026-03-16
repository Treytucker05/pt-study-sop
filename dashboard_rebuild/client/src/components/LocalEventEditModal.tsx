import { useMemo, useState, type ReactNode } from "react";
import { format, setHours, setMinutes } from "date-fns";
import { Trash2 } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EVENT_COLOR_PALETTE } from "@/lib/colors";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "@shared/schema";

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
  reminders?: CalendarReminders;
  timeZone?: string | null;
  courseId?: number | null;
};

type Tab = "details" | "time" | "recurrence" | "people" | "settings";

interface CourseOption {
  id: number;
  name: string;
  code?: string | null;
}

interface LocalEventEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: LocalCalendarEvent | null;
  onEventChange: (event: LocalCalendarEvent) => void;
  onSave: () => void;
  onDelete: () => void;
  courseOptions?: CourseOption[];
}

type LocalEventFieldSetter = <K extends keyof LocalCalendarEvent>(
  key: K,
  value: LocalCalendarEvent[K]
) => void;

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

const COLOR_PALETTE = EVENT_COLOR_PALETTE;
const EMPTY_COURSE_OPTIONS: CourseOption[] = [];
const STANDARD_RECURRENCE = [
  "RRULE:FREQ=DAILY",
  "RRULE:FREQ=WEEKLY",
  "RRULE:FREQ=MONTHLY",
  "RRULE:FREQ=YEARLY",
];
const TABS: { id: Tab; label: string }[] = [
  { id: "details", label: "DETAILS" },
  { id: "time", label: "TIME" },
  { id: "recurrence", label: "REPEAT" },
  { id: "people", label: "PEOPLE" },
  { id: "settings", label: "SETTINGS" },
];

function LocalEventTabRow({
  activeTab,
  setActiveTab,
}: {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}) {
  return (
    <div className="flex shrink-0 border-b border-primary/30">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          className={cn(
            "flex-1 py-2 text-xs font-arcade transition-colors",
            activeTab === tab.id
              ? "border-b-2 border-primary bg-primary/10 text-primary"
              : "text-zinc-500 hover:text-zinc-300"
          )}
          onClick={() => setActiveTab(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function EventDetailsTab({
  event,
  setField,
  courseIdValue,
  updateCourseSelection,
  courseOptions,
}: {
  event: LocalCalendarEvent;
  setField: LocalEventFieldSetter;
  courseIdValue: string;
  updateCourseSelection: (value: string) => void;
  courseOptions: CourseOption[];
}) {
  return (
    <>
      <div className="space-y-2">
        <Label className="text-xs text-primary/80">TITLE_</Label>
        <Input
          value={event.title}
          onChange={(eventTarget) => setField("title", eventTarget.target.value)}
          className="h-12 rounded-none border-primary/50 bg-black font-terminal text-lg text-primary focus:border-primary"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs text-primary/80">DESCRIPTION_</Label>
        <Textarea
          value={event.notes || ""}
          onChange={(eventTarget) => setField("notes", eventTarget.target.value)}
          className="min-h-[80px] resize-none rounded-none border-primary/50 bg-black font-terminal text-primary"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs text-primary/80">LOCATION_</Label>
        <Input
          value={event.location || ""}
          onChange={(eventTarget) => setField("location", eventTarget.target.value || null)}
          className="rounded-none border-primary/50 bg-black font-terminal text-primary"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs text-primary/80">EVENT_TYPE_</Label>
          <Select value={event.eventType || "study"} onValueChange={(value) => setField("eventType", value)}>
            <SelectTrigger className="h-8 rounded-none border-primary/50 bg-black font-terminal text-xs text-primary">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[100010] border-primary bg-black font-terminal text-primary">
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
          <Select value={courseIdValue} onValueChange={updateCourseSelection}>
            <SelectTrigger className="h-8 rounded-none border-primary/50 bg-black font-terminal text-xs text-primary">
              <SelectValue placeholder="Select course" />
            </SelectTrigger>
            <SelectContent className="z-[100010] border-primary bg-black font-terminal text-primary">
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
            onChange={(eventTarget) => setField("weight", eventTarget.target.value || null)}
            placeholder="e.g. High, Medium, Low"
            className="rounded-none border-primary/50 bg-black font-terminal text-primary"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-primary/80">COLOR_</Label>
          <div className="flex flex-wrap gap-2">
            {COLOR_PALETTE.map((color) => (
              <button
                key={color.value}
                className={cn(
                  "h-7 w-7 rounded-sm border-2 transition-all",
                  event.color === color.value
                    ? "scale-110 border-white"
                    : "border-transparent hover:border-white/30"
                )}
                style={{ backgroundColor: color.value }}
                onClick={() => setField("color", color.value)}
                title={color.label}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function EventTimeTab({
  event,
  eventDate,
  endDate,
  timeZoneOptions,
  timeZoneValue,
  setField,
}: {
  event: LocalCalendarEvent;
  eventDate: Date;
  endDate: Date | null;
  timeZoneOptions: string[];
  timeZoneValue: string;
  setField: LocalEventFieldSetter;
}) {
  return (
    <>
      <div className="mb-4 flex items-center gap-3">
        <Checkbox
          id="local-all-day"
          checked={event.allDay ?? false}
          onCheckedChange={(checked) => setField("allDay", !!checked)}
          className="border-primary/50 data-[state=checked]:bg-primary"
        />
        <Label htmlFor="local-all-day" className="cursor-pointer text-xs text-primary/80">
          ALL DAY EVENT
        </Label>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs text-primary/80">START_DATE_</Label>
          <Input
            type="date"
            value={format(eventDate, "yyyy-MM-dd")}
            onChange={(eventTarget) => {
              const [hours, minutes] = [eventDate.getHours(), eventDate.getMinutes()];
              setField("date", setMinutes(setHours(new Date(eventTarget.target.value), hours), minutes));
            }}
            className="rounded-none border-primary/50 bg-black font-terminal text-primary"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-primary/80">END_DATE_</Label>
          <Input
            type="date"
            value={endDate ? format(endDate, "yyyy-MM-dd") : ""}
            onChange={(eventTarget) => setField("endDate", eventTarget.target.value ? new Date(eventTarget.target.value) : null)}
            className="rounded-none border-primary/50 bg-black font-terminal text-primary"
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
              onChange={(eventTarget) => {
                const [hours, minutes] = eventTarget.target.value.split(":").map(Number);
                setField("date", setMinutes(setHours(eventDate, hours), minutes));
              }}
              className="rounded-none border-primary/50 bg-black font-terminal text-primary"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-primary/80">END_TIME_</Label>
            <Input
              type="time"
              value={endDate ? format(endDate, "HH:mm") : ""}
              onChange={(eventTarget) => {
                if (!eventTarget.target.value) return;
                const [hours, minutes] = eventTarget.target.value.split(":").map(Number);
                const base = endDate || eventDate;
                setField("endDate", setMinutes(setHours(base, hours), minutes));
              }}
              className="rounded-none border-primary/50 bg-black font-terminal text-primary"
            />
          </div>
        </div>
      )}
      <div className="space-y-2">
        <Label className="text-xs text-primary/80">TIMEZONE_</Label>
        <Select value={timeZoneValue} onValueChange={(value) => setField("timeZone", value)}>
          <SelectTrigger className="h-8 rounded-none border-primary/50 bg-black font-terminal text-xs text-primary">
            <SelectValue placeholder="Select timezone" />
          </SelectTrigger>
          <SelectContent className="z-[100010] border-primary bg-black font-terminal text-primary">
            {timeZoneOptions.map((timeZone) => (
              <SelectItem key={timeZone} value={timeZone}>
                {timeZone}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}

function EventRecurrenceTab({
  event,
  recurrenceValue,
  setField,
}: {
  event: LocalCalendarEvent;
  recurrenceValue: string;
  setField: LocalEventFieldSetter;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs text-primary/80">PATTERN_</Label>
        <Select
          value={recurrenceValue}
          onValueChange={(value) => setField("recurrence", value === "none" ? null : value)}
        >
          <SelectTrigger className="h-8 rounded-none border-primary/50 bg-black font-terminal text-xs text-primary">
            <SelectValue placeholder="No Recurrence" />
          </SelectTrigger>
          <SelectContent className="z-[100010] border-primary bg-black font-terminal text-primary">
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="RRULE:FREQ=DAILY">Daily</SelectItem>
            <SelectItem value="RRULE:FREQ=WEEKLY">Weekly</SelectItem>
            <SelectItem value="RRULE:FREQ=MONTHLY">Monthly</SelectItem>
            <SelectItem value="RRULE:FREQ=YEARLY">Yearly</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {event.recurrence &&
        !STANDARD_RECURRENCE.includes(recurrenceValue) &&
        recurrenceValue !== "none" && (
          <div className="space-y-2">
            <Label className="text-xs text-primary/80">CUSTOM_RRULE_</Label>
            <Textarea
              value={event.recurrence}
              onChange={(eventTarget) => setField("recurrence", eventTarget.target.value)}
              className="h-12 rounded-none border-primary/30 bg-black font-terminal text-xs text-primary"
              placeholder="RRULE:FREQ=WEEKLY;BYDAY=MO,WE"
            />
          </div>
        )}
    </div>
  );
}

function EventPeopleTab({
  attendees,
  newAttendee,
  setNewAttendee,
  addAttendee,
  removeAttendee,
}: {
  attendees: CalendarAttendee[];
  newAttendee: string;
  setNewAttendee: (value: string) => void;
  addAttendee: () => void;
  removeAttendee: (email: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs text-primary/80">ATTENDEES_</Label>
        <div className="flex gap-2">
          <Input
            value={newAttendee}
            onChange={(eventTarget) => setNewAttendee(eventTarget.target.value)}
            onKeyDown={(eventTarget) => eventTarget.key === "Enter" && addAttendee()}
            placeholder="email@example.com"
            className="flex-1 rounded-none border-primary/50 bg-black font-terminal text-xs text-primary"
          />
          <Button
            size="sm"
            onClick={addAttendee}
            className="h-9 rounded-none bg-primary px-3 text-black hover:bg-primary/90"
          >
            ADD
          </Button>
        </div>
      </div>
      <div className="space-y-1">
        {attendees.map((attendee) => (
          <div
            key={attendee.email}
            className="flex items-center justify-between border border-secondary p-2 font-terminal text-xs"
          >
            <span className="text-primary">{attendee.email}</span>
            <div className="flex items-center gap-2">
              {attendee.responseStatus && (
                <span
                  className={cn(
                    "text-xs",
                    attendee.responseStatus === "accepted"
                      ? "text-green-400"
                      : attendee.responseStatus === "declined"
                        ? "text-red-400"
                        : "text-yellow-400"
                  )}
                >
                  {attendee.responseStatus.toUpperCase()}
                </span>
              )}
              {!attendee.self && (
                <button
                  onClick={() => removeAttendee(attendee.email)}
                  className="text-red-500 hover:text-red-400"
                >
                  X
                </button>
              )}
            </div>
          </div>
        ))}
        {attendees.length === 0 && (
          <p className="font-terminal text-xs text-zinc-500">No attendees</p>
        )}
      </div>
    </div>
  );
}

function EventSettingsTab({
  event,
  setField,
}: {
  event: LocalCalendarEvent;
  setField: LocalEventFieldSetter;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs text-primary/80">VISIBILITY_</Label>
        <Select
          value={event.visibility || "default"}
          onValueChange={(value) => setField("visibility", value === "default" ? null : value)}
        >
          <SelectTrigger className="h-8 rounded-none border-primary/50 bg-black font-terminal text-xs text-primary">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="z-[100010] border-primary bg-black font-terminal text-primary">
            <SelectItem value="default">Default</SelectItem>
            <SelectItem value="public">Public</SelectItem>
            <SelectItem value="private">Private</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label className="text-xs text-primary/80">AVAILABILITY_</Label>
        <Select
          value={event.transparency || "opaque"}
          onValueChange={(value) => setField("transparency", value)}
        >
          <SelectTrigger className="h-8 rounded-none border-primary/50 bg-black font-terminal text-xs text-primary">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="z-[100010] border-primary bg-black font-terminal text-primary">
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
          <Label htmlFor="use-default-reminders-local" className="cursor-pointer text-xs text-primary/80">
            Use default reminders
          </Label>
        </div>
      </div>
    </div>
  );
}

export function LocalEventEditModal({
  open,
  onOpenChange,
  event,
  onEventChange,
  onSave,
  onDelete,
  courseOptions = EMPTY_COURSE_OPTIONS,
}: LocalEventEditModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>("details");
  const [newAttendee, setNewAttendee] = useState("");

  const timeZoneOptions = useMemo(() => {
    if (typeof Intl === "undefined") return FALLBACK_TIME_ZONES;
    const intl = Intl as typeof Intl & {
      supportedValuesOf?: (type: string) => string[];
    };
    if (typeof intl.supportedValuesOf === "function") {
      try {
        const zones = intl
          .supportedValuesOf("timeZone")
          .filter((timeZone) => timeZone.startsWith("America/") || timeZone === "Pacific/Honolulu")
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
      const match = courseOptions.find((course) => course.name === event.course);
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

  const setField: LocalEventFieldSetter = (key, value) => {
    onEventChange({ ...event, [key]: value });
  };

  const updateCourseSelection = (value: string) => {
    if (value === "__none__") {
      onEventChange({ ...event, course: null, courseId: null });
      return;
    }
    const selected = courseOptions.find((course) => String(course.id) === value);
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
    const attendees = event.attendees || [];
    if (attendees.some((attendee) => attendee.email === email)) return;
    setField("attendees", [...attendees, { email }]);
    setNewAttendee("");
  };

  const removeAttendee = (email: string) => {
    setField(
      "attendees",
      (event.attendees || []).filter((attendee) => attendee.email !== email)
    );
  };

  let tabContent: ReactNode;
  switch (activeTab) {
    case "details":
      tabContent = (
        <EventDetailsTab
          event={event}
          setField={setField}
          courseIdValue={courseIdValue}
          updateCourseSelection={updateCourseSelection}
          courseOptions={courseOptions}
        />
      );
      break;
    case "time":
      tabContent = (
        <EventTimeTab
          event={event}
          eventDate={eventDate}
          endDate={endDate}
          timeZoneOptions={timeZoneOptions}
          timeZoneValue={timeZoneValue}
          setField={setField}
        />
      );
      break;
    case "recurrence":
      tabContent = (
        <EventRecurrenceTab
          event={event}
          recurrenceValue={recurrenceValue}
          setField={setField}
        />
      );
      break;
    case "people":
      tabContent = (
        <EventPeopleTab
          attendees={event.attendees || []}
          newAttendee={newAttendee}
          setNewAttendee={setNewAttendee}
          addAttendee={addAttendee}
          removeAttendee={removeAttendee}
        />
      );
      break;
    case "settings":
      tabContent = <EventSettingsTab event={event} setField={setField} />;
      break;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-modal="calendar-edit-local"
        className="max-h-[calc(100vh-4rem)] max-w-lg overflow-hidden rounded-none border-[3px] border-double border-primary bg-black p-0 font-arcade"
      >
        <DialogTitle className="sr-only">Edit Event</DialogTitle>
        <DialogDescription className="sr-only">
          Make changes to your event here. Click save when you're done.
        </DialogDescription>
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex shrink-0 items-center gap-2 border-b border-primary bg-primary/20 p-4">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="font-bold tracking-wider text-primary">EDIT_EVENT</span>
          </div>

          <LocalEventTabRow activeTab={activeTab} setActiveTab={setActiveTab} />

          <div className="flex-1 min-h-0 space-y-4 overflow-y-auto p-5">{tabContent}</div>

          <div className="flex shrink-0 items-center justify-between gap-4 border-t border-primary/20 p-4">
            <Button
              variant="destructive"
              size="sm"
              onClick={onDelete}
              className="rounded-none border border-red-900/50 bg-red-900/20 font-arcade text-xs text-red-500 hover:bg-red-900/40"
            >
              <Trash2 className="mr-2 h-4 w-4" /> DELETE
            </Button>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                className="rounded-none border border-primary/50 bg-transparent font-arcade text-xs text-primary hover:bg-primary/10"
                onClick={() => onOpenChange(false)}
              >
                CANCEL
              </Button>
              <Button
                className="rounded-none bg-primary px-6 font-arcade text-xs text-black hover:bg-primary/90"
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
