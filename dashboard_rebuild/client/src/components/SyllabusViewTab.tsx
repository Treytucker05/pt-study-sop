import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Module, LearningObjective, ScheduleEvent, Course } from "@shared/schema";

export function SyllabusViewTab() {
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);

  // Fetch courses
  const { data: courses = [] } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const response = await fetch("/api/courses");
      if (!response.ok) throw new Error("Failed to fetch courses");
      return response.json();
    },
  });

  // Fetch modules for selected course
  const { data: modules = [], isLoading: modulesLoading } = useQuery({
    queryKey: ["modules", selectedCourseId],
    queryFn: () => selectedCourseId ? api.modules.getByCourse(selectedCourseId) : Promise.resolve([]),
    enabled: !!selectedCourseId,
  });

  // Fetch learning objectives for selected course
  const { data: objectives = [] } = useQuery({
    queryKey: ["learningObjectives", selectedCourseId],
    queryFn: () => selectedCourseId ? api.learningObjectives.getByCourse(selectedCourseId) : Promise.resolve([]),
    enabled: !!selectedCourseId,
  });

  // Fetch schedule events for selected course
  const { data: events = [] } = useQuery({
    queryKey: ["scheduleEvents", selectedCourseId],
    queryFn: () => selectedCourseId ? api.scheduleEvents.getByCourse(selectedCourseId) : Promise.resolve([]),
    enabled: !!selectedCourseId,
  });

  // Group modules by week (orderIndex)
  const modulesByWeek = modules.reduce((acc: Record<number, Module[]>, module) => {
    const week = module.orderIndex || 0;
    if (!acc[week]) acc[week] = [];
    acc[week].push(module);
    return acc;
  }, {});

  // Group objectives by module
  const objectivesByModule = objectives.reduce((acc: Record<number, LearningObjective[]>, obj) => {
    const moduleId = obj.moduleId || 0;
    if (!acc[moduleId]) acc[moduleId] = [];
    acc[moduleId].push(obj);
    return acc;
  }, {});

  // Group events by module
  const eventsByModule = events.reduce((acc: Record<number, ScheduleEvent[]>, event) => {
    const moduleId = event.linkedModuleId || 0;
    if (!acc[moduleId]) acc[moduleId] = [];
    acc[moduleId].push(event);
    return acc;
  }, {});

  const hasData = modules.length > 0 || objectives.length > 0 || events.length > 0;

  return (
    <div className="space-y-4 p-4">
      {/* Course Selector */}
      <Card className="brain-card rounded-none">
        <CardHeader className="border-b border-secondary/50 p-3">
          <CardTitle className="font-arcade text-sm">SELECT COURSE</CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          <Select
            value={selectedCourseId?.toString() || ""}
            onValueChange={(value) => setSelectedCourseId(value ? parseInt(value) : null)}
          >
            <SelectTrigger className="rounded-none border-primary">
              <SelectValue placeholder="Choose a course..." />
            </SelectTrigger>
            <SelectContent>
              {courses.map((course: Course) => (
                <SelectItem key={course.id} value={course.id.toString()}>
                  {course.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Syllabus Content */}
      {!selectedCourseId ? (
        <Card className="brain-card rounded-none">
          <CardContent className="p-8 text-center">
            <p className="font-terminal text-xs text-muted-foreground">Select a course to view syllabus</p>
          </CardContent>
        </Card>
      ) : modulesLoading ? (
        <Card className="brain-card rounded-none">
          <CardContent className="p-8 text-center">
            <p className="font-terminal text-xs text-muted-foreground">Loading syllabus...</p>
          </CardContent>
        </Card>
      ) : !hasData ? (
        <Card className="brain-card rounded-none">
          <CardContent className="p-8 text-center">
            <p className="font-terminal text-xs text-muted-foreground">No syllabus imported</p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[600px]">
          <div className="space-y-4 pr-4">
            {Object.entries(modulesByWeek)
              .sort(([weekA], [weekB]) => parseInt(weekA) - parseInt(weekB))
              .map(([week, weekModules]) => (
                <Card key={week} className="brain-card rounded-none">
                  <CardHeader className="border-b border-secondary/50 p-3">
                    <CardTitle className="font-arcade text-sm">WEEK {week}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 space-y-3">
                    {weekModules.map((module) => (
                      <div key={module.id} className="space-y-2 border-l-2 border-secondary/40 pl-3">
                        <div className="font-arcade text-xs text-primary">{module.name}</div>

                        {/* Learning Objectives */}
                        {objectivesByModule[module.id] && objectivesByModule[module.id].length > 0 && (
                          <div className="space-y-1">
                            <div className="font-terminal text-[10px] text-muted-foreground uppercase">Objectives</div>
                            <div className="space-y-1">
                              {objectivesByModule[module.id].map((obj) => (
                                <div key={obj.id} className="font-terminal text-xs text-secondary">
                                  • {obj.loCode}: {obj.title}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Events */}
                        {eventsByModule[module.id] && eventsByModule[module.id].length > 0 && (
                          <div className="space-y-1">
                            <div className="font-terminal text-[10px] text-muted-foreground uppercase">Events</div>
                            <div className="space-y-1">
                              {eventsByModule[module.id].map((event) => (
                                <div key={event.id} className="flex items-center gap-2">
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] font-terminal ${
                                      event.type === "quiz"
                                        ? "border-yellow-500/50 text-yellow-400"
                                        : event.type === "exam"
                                        ? "border-red-500/50 text-red-400"
                                        : "border-blue-500/50 text-blue-400"
                                    }`}
                                  >
                                    {event.type?.toUpperCase()}
                                  </Badge>
                                  <span className="font-terminal text-xs text-muted-foreground">{event.title}</span>
                                  {event.dueDate && (
                                    <span className="font-terminal text-[10px] text-secondary ml-auto">
                                      {new Date(event.dueDate).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
