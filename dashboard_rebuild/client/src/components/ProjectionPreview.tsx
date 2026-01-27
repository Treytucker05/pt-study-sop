import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface ProjectedEvent {
  id?: number;
  type: string;
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  moduleId?: number;
  moduleName?: string;
}

interface ProjectionPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  projectedEvents: ProjectedEvent[];
  onAccept: (events: ProjectedEvent[]) => Promise<void>;
  onDecline: () => void;
}

export function ProjectionPreview({
  isOpen,
  onClose,
  projectedEvents,
  onAccept,
  onDecline,
}: ProjectionPreviewProps) {
  const [events, setEvents] = useState<ProjectedEvent[]>(projectedEvents);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEdit = (index: number, field: keyof ProjectedEvent, value: string) => {
    const updated = [...events];
    updated[index] = { ...updated[index], [field]: value };
    setEvents(updated);
  };

  const handleAccept = async () => {
    setIsSubmitting(true);
    try {
      await onAccept(events);
      onClose();
    } catch (error) {
      console.error("Failed to accept projection:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecline = () => {
    onDecline();
    onClose();
  };

  const eventsByModule = events.reduce((acc, event, index) => {
    const moduleName = event.moduleName || "Unassigned";
    if (!acc[moduleName]) acc[moduleName] = [];
    acc[moduleName].push({ ...event, originalIndex: index });
    return acc;
  }, {} as Record<string, Array<ProjectedEvent & { originalIndex: number }>>);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="font-arcade text-primary">
            PROJECTION PREVIEW
          </DialogTitle>
          <p className="text-sm text-muted-foreground font-terminal">
            Review {events.length} projected events before committing to calendar
          </p>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-4">
            {Object.entries(eventsByModule).map(([moduleName, moduleEvents]) => (
              <Card key={moduleName} className="brain-card rounded-none">
                <CardHeader className="border-b border-secondary/50 p-3">
                  <CardTitle className="font-arcade text-sm text-primary">
                    {moduleName}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 space-y-2">
                  {moduleEvents.map((event) => (
                    <div
                      key={event.originalIndex}
                      className="border border-secondary/40 p-2 space-y-2"
                    >
                      {editingIndex === event.originalIndex ? (
                        <div className="space-y-2">
                          <Input
                            value={event.title}
                            onChange={(e) =>
                              handleEdit(event.originalIndex, "title", e.target.value)
                            }
                            className="rounded-none border-primary font-terminal text-xs"
                            placeholder="Event title"
                          />
                          <div className="grid grid-cols-3 gap-2">
                            <Input
                              type="date"
                              value={event.date}
                              onChange={(e) =>
                                handleEdit(event.originalIndex, "date", e.target.value)
                              }
                              className="rounded-none border-primary font-terminal text-xs"
                            />
                            <Input
                              type="time"
                              value={event.startTime || ""}
                              onChange={(e) =>
                                handleEdit(event.originalIndex, "startTime", e.target.value)
                              }
                              className="rounded-none border-primary font-terminal text-xs"
                              placeholder="Start"
                            />
                            <Input
                              type="time"
                              value={event.endTime || ""}
                              onChange={(e) =>
                                handleEdit(event.originalIndex, "endTime", e.target.value)
                              }
                              className="rounded-none border-primary font-terminal text-xs"
                              placeholder="End"
                            />
                          </div>
                          <Button
                            onClick={() => setEditingIndex(null)}
                            className="bg-primary hover:bg-primary/80 rounded-none text-xs font-terminal"
                            size="sm"
                          >
                            Done
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-terminal ${
                                  event.type === "quiz"
                                    ? "border-yellow-500/50 text-yellow-400"
                                    : event.type === "exam"
                                    ? "border-red-500/50 text-red-400"
                                    : event.type === "lecture" || event.type === "class"
                                    ? "border-blue-500/50 text-blue-400"
                                    : "border-green-500/50 text-green-400"
                                }`}
                              >
                                {event.type.toUpperCase()}
                              </Badge>
                              <span className="font-terminal text-xs text-primary">
                                {event.title}
                              </span>
                            </div>
                            <div className="font-terminal text-[10px] text-muted-foreground">
                              {new Date(event.date).toLocaleDateString()}
                              {event.startTime && ` • ${event.startTime}`}
                              {event.endTime && ` - ${event.endTime}`}
                            </div>
                          </div>
                          <Button
                            onClick={() => setEditingIndex(event.originalIndex)}
                            variant="outline"
                            className="rounded-none text-xs font-terminal"
                            size="sm"
                          >
                            Edit
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="flex gap-2">
          <Button
            onClick={handleDecline}
            variant="outline"
            className="rounded-none font-terminal"
            disabled={isSubmitting}
          >
            Decline
          </Button>
          <Button
            onClick={handleAccept}
            className="bg-primary hover:bg-primary/80 rounded-none font-terminal"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Accepting..." : "Accept All"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
