import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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

type Tab = "details" | "time" | "type" | "recurrence";

interface LocalEventEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: CalendarEvent | null;
  onEventChange: (event: CalendarEvent) => void;
  onSave: () => void;
  onDelete: () => void;
}

const COLOR_PALETTE = [
  { value: "#ef4444", label: "Red" },
  { value: "#f97316", label: "Orange" },
  { value: "#eab308", label: "Yellow" },
  { value: "#22c55e", label: "Green" },
  { value: "#06b6d4", label: "Cyan" },
  { value: "#3b82f6", label: "Blue" },
  { value: "#8b5cf6", label: "Purple" },
  { value: "#ec4899", label: "Pink" },
  { value: "#6b7280", label: "Gray" },
];

const tabs: { id: Tab; label: string }[] = [
  { id: "details", label: "DETAILS" },
  { id: "time", label: "TIME" },
  { id: "type", label: "TYPE" },
  { id: "recurrence", label: "REPEAT" },
];

export function LocalEventEditModal({ open, onOpenChange, event, onEventChange, onSave, onDelete }: LocalEventEditModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>("details");

  if (!event) return null;

  const eventDate = new Date(event.date);
  const endDate = event.endDate ? new Date(event.endDate) : null;

  const setField = <K extends keyof CalendarEvent>(key: K, value: CalendarEvent[K]) => {
    onEventChange({ ...event, [key]: value });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-modal="calendar-edit-local"
        className="font-arcade bg-black border-2 border-primary rounded-none max-w-lg p-0 overflow-hidden translate-y-0"
        style={{ zIndex: 100005, top: "4rem", left: "50%", transform: "translate(-50%, 0)" }}
      >
        <div className="flex flex-col h-full max-h-[80vh]">
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
                  "flex-1 py-2 text-[10px] font-arcade transition-colors",
                  activeTab === tab.id ? "text-primary border-b-2 border-primary bg-primary/10" : "text-zinc-500 hover:text-zinc-300"
                )}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-5 space-y-4 overflow-y-auto flex-1">
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
                  <Label className="text-xs text-primary/80">NOTES_</Label>
                  <Textarea
                    value={event.notes || ""}
                    onChange={(e) => setField("notes", e.target.value)}
                    className="bg-black border-primary/50 text-primary font-terminal min-h-[80px] rounded-none resize-none"
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
              </>
            )}

            {activeTab === "type" && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs text-primary/80">EVENT_TYPE_</Label>
                  <Select value={event.eventType || "study"} onValueChange={(v) => setField("eventType", v)}>
                    <SelectTrigger className="bg-black border-primary/50 text-primary rounded-none h-8 font-terminal text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-black border-primary text-primary font-terminal">
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
                  <Input
                    value={event.course || ""}
                    onChange={(e) => setField("course", e.target.value || null)}
                    placeholder="e.g. PHTH 5301"
                    className="bg-black border-primary/50 text-primary font-terminal rounded-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-primary/80">WEIGHT_</Label>
                  <Input
                    value={event.weight || ""}
                    onChange={(e) => setField("weight", e.target.value || null)}
                    placeholder="e.g. High, Medium, Low"
                    className="bg-black border-primary/50 text-primary font-terminal rounded-none"
                  />
                </div>
              </>
            )}

            {activeTab === "recurrence" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs text-primary/80">PATTERN_</Label>
                  <Select
                    value={event.recurrence || "none"}
                    onValueChange={(v) => setField("recurrence", v === "none" ? null : v)}
                  >
                    <SelectTrigger className="bg-black border-primary/50 text-primary rounded-none h-8 font-terminal text-xs">
                      <SelectValue placeholder="No Recurrence" />
                    </SelectTrigger>
                    <SelectContent className="bg-black border-primary text-primary font-terminal">
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
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
