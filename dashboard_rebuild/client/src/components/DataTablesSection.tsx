import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Database, Layers } from "lucide-react";
import type { Course, Module, ScheduleEvent } from "@shared/schema";

export function DataTablesSection() {
  const queryClient = useQueryClient();
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [moduleEdits, setModuleEdits] = useState<Record<number, Partial<Module>>>({});
  const [scheduleEdits, setScheduleEdits] = useState<Record<number, Partial<ScheduleEvent>>>({});
  const [selectedModuleIds, setSelectedModuleIds] = useState<Set<number>>(new Set());
  const [selectedScheduleIds, setSelectedScheduleIds] = useState<Set<number>>(new Set());
  const [bulkDelete, setBulkDelete] = useState<{
    type: "modules" | "schedule";
    ids: number[];
    label: string;
  } | null>(null);
  const bulkDeleteRef = useRef<typeof bulkDelete>(null);

  const { data: courses = [] } = useQuery({
    queryKey: ["courses"],
    queryFn: () => api.courses.getActive(),
  });

  const { data: modules = [] } = useQuery({
    queryKey: ["modules", selectedCourseId],
    queryFn: () => selectedCourseId ? api.modules.getByCourse(selectedCourseId) : Promise.resolve([]),
    enabled: !!selectedCourseId,
  });

  const { data: scheduleEvents = [] } = useQuery({
    queryKey: ["scheduleEvents", selectedCourseId],
    queryFn: () => selectedCourseId ? api.scheduleEvents.getByCourse(selectedCourseId) : Promise.resolve([]),
    enabled: !!selectedCourseId,
  });

  const updateModuleMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Module> }) =>
      api.modules.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["modules"] });
    },
  });

  const deleteModuleMutation = useMutation({
    mutationFn: (id: number) => api.modules.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["modules"] });
    },
  });

  const deleteModulesMutation = useMutation({
    mutationFn: (ids: number[]) => api.modules.deleteMany(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["modules"] });
      setSelectedModuleIds(new Set());
    },
  });

  const updateScheduleMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ScheduleEvent> }) =>
      api.scheduleEvents.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduleEvents"] });
    },
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: (id: number) => api.scheduleEvents.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduleEvents"] });
    },
  });

  const deleteSchedulesMutation = useMutation({
    mutationFn: (ids: number[]) => api.scheduleEvents.deleteMany(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduleEvents"] });
      setSelectedScheduleIds(new Set());
    },
  });

  const openBulkDelete = (type: "modules" | "schedule", ids: number[], label: string) => {
    if (!ids.length) return;
    const payload = { type, ids, label };
    bulkDeleteRef.current = payload;
    setBulkDelete(payload);
  };

  return (
    <div className="space-y-6 p-4">
      <div>
        <label className="block text-sm mb-1 font-terminal text-muted-foreground">Select Course</label>
        <select
          className="w-full bg-black border border-secondary rounded-none p-2 font-terminal"
          value={selectedCourseId || ""}
          onChange={(e) => {
            setSelectedCourseId(e.target.value ? parseInt(e.target.value) : null);
          }}
        >
          <option value="">-- Select Course --</option>
          {courses.map((c: Course) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {selectedCourseId && (
        <div className="space-y-6">
          {/* Modules Table */}
          <Card className="bg-black/40 border-[3px] border-double border-primary rounded-none">
            <CardHeader className="border-b border-primary/50">
              <CardTitle className="font-arcade text-sm flex items-center gap-2">
                <Database className="w-4 h-4" />
                MODULES ({modules.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {modules.length === 0 ? (
                <p className="text-xs text-muted-foreground font-terminal p-4">No modules yet. Import a syllabus to add modules.</p>
              ) : (
                <div className="p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      className="bg-secondary hover:bg-secondary/80 px-2 py-1 rounded-none text-xs font-terminal"
                      type="button"
                      onClick={() => {
                        const next = new Set<number>();
                        if (selectedModuleIds.size !== modules.length) {
                          modules.forEach((m: Module) => next.add(m.id));
                        }
                        setSelectedModuleIds(next);
                      }}
                    >
                      {selectedModuleIds.size === modules.length ? "Uncheck All" : "Check All"}
                    </button>
                    <button
                      className="bg-destructive hover:bg-destructive/80 px-2 py-1 rounded-none text-xs font-terminal"
                      type="button"
                      disabled={selectedModuleIds.size === 0}
                      onClick={() => {
                        openBulkDelete("modules", Array.from(selectedModuleIds), `Delete ${selectedModuleIds.size} module(s)? This cannot be undone.`);
                      }}
                    >
                      Delete
                    </button>
                    <button
                      className="bg-secondary hover:bg-secondary/80 px-2 py-1 rounded-none text-xs font-terminal"
                      type="button"
                      disabled={selectedModuleIds.size === 0}
                      onClick={() => {
                        selectedModuleIds.forEach((id) => {
                          const edit = moduleEdits[id];
                          if (edit) {
                            updateModuleMutation.mutate({ id, data: edit });
                          }
                        });
                        setModuleEdits((prev) => {
                          const next = { ...prev };
                          selectedModuleIds.forEach((id) => {
                            delete next[id];
                          });
                          return next;
                        });
                      }}
                    >
                      Save
                    </button>
                  </div>
                  <ScrollArea className="h-[280px]">
                    <table className="w-full text-sm font-terminal">
                      <thead>
                        <tr className="border-b border-secondary/50">
                          <th className="text-center p-2 w-8">Select</th>
                          <th className="text-left p-2">Module</th>
                          <th className="text-center p-2">Order</th>
                          <th className="text-center p-2">Files</th>
                          <th className="text-center p-2">NotebookLM</th>
                          <th className="text-center p-2">Status</th>
                          <th className="text-center p-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {modules.map((m: Module) => (
                          <tr key={m.id} className="border-b border-secondary/30">
                            <td className="text-center p-2">
                              <Checkbox
                                checked={selectedModuleIds.has(m.id)}
                                onCheckedChange={(checked) =>
                                  setSelectedModuleIds((prev) => {
                                    const next = new Set(prev);
                                    if (checked) next.add(m.id);
                                    else next.delete(m.id);
                                    return next;
                                  })
                                }
                                className="rounded-none border-secondary data-[state=checked]:bg-secondary w-4 h-4"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                className="w-full bg-black border border-secondary rounded-none p-1 text-xs font-terminal"
                                value={moduleEdits[m.id]?.name ?? m.name}
                                onChange={(e) =>
                                  setModuleEdits((prev) => ({
                                    ...prev,
                                    [m.id]: { ...prev[m.id], name: e.target.value },
                                  }))
                                }
                              />
                            </td>
                            <td className="text-center p-2">
                              <input
                                type="number"
                                className="w-16 bg-black border border-secondary rounded-none p-1 text-xs font-terminal text-center"
                                value={moduleEdits[m.id]?.orderIndex ?? m.orderIndex ?? 0}
                                onChange={(e) =>
                                  setModuleEdits((prev) => ({
                                    ...prev,
                                    [m.id]: { ...prev[m.id], orderIndex: parseInt(e.target.value || "0", 10) },
                                  }))
                                }
                              />
                            </td>
                            <td className="text-center p-2">
                              <Checkbox
                                checked={m.filesDownloaded}
                                onCheckedChange={(checked) => updateModuleMutation.mutate({
                                  id: m.id,
                                  data: { filesDownloaded: !!checked }
                                })}
                                className="rounded-none border-secondary data-[state=checked]:bg-secondary w-4 h-4"
                              />
                            </td>
                            <td className="text-center p-2">
                              <Checkbox
                                checked={m.notebooklmLoaded}
                                onCheckedChange={(checked) => updateModuleMutation.mutate({
                                  id: m.id,
                                  data: { notebooklmLoaded: !!checked }
                                })}
                                className="rounded-none border-secondary data-[state=checked]:bg-secondary w-4 h-4"
                              />
                            </td>
                            <td className="text-center p-2">
                              {m.filesDownloaded && m.notebooklmLoaded ? (
                                <span className="text-success">Ready</span>
                              ) : (
                                <span className="text-warning">Pending</span>
                              )}
                            </td>
                            <td className="text-center p-2 space-x-2">
                              <button
                                className="bg-secondary hover:bg-secondary/80 px-2 py-1 rounded-none text-xs font-terminal"
                                type="button"
                                disabled={!moduleEdits[m.id]}
                                onClick={() => {
                                  const edit = moduleEdits[m.id];
                                  if (!edit) return;
                                  updateModuleMutation.mutate({ id: m.id, data: edit });
                                  setModuleEdits((prev) => {
                                    const next = { ...prev };
                                    delete next[m.id];
                                    return next;
                                  });
                                }}
                              >
                                Save
                              </button>
                              <button
                                className="bg-destructive hover:bg-destructive/80 px-2 py-1 rounded-none text-xs font-terminal"
                                type="button"
                                onClick={() => deleteModuleMutation.mutate(m.id)}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </ScrollArea>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Schedule Items Table */}
          <Card className="bg-black/40 border-[3px] border-double border-primary rounded-none">
            <CardHeader className="border-b border-primary/50">
              <CardTitle className="font-arcade text-sm flex items-center gap-2">
                <Layers className="w-4 h-4" />
                SCHEDULE ITEMS ({scheduleEvents.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {scheduleEvents.length === 0 ? (
                <p className="text-xs text-muted-foreground font-terminal p-4">No schedule items yet. Import a syllabus to add events.</p>
              ) : (
                <div className="p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      className="bg-secondary hover:bg-secondary/80 px-2 py-1 rounded-none text-xs font-terminal"
                      type="button"
                      onClick={() => {
                        const next = new Set<number>();
                        if (selectedScheduleIds.size !== scheduleEvents.length) {
                          scheduleEvents.forEach((ev: ScheduleEvent) => next.add(ev.id));
                        }
                        setSelectedScheduleIds(next);
                      }}
                    >
                      {selectedScheduleIds.size === scheduleEvents.length ? "Uncheck All" : "Check All"}
                    </button>
                    <button
                      className="bg-destructive hover:bg-destructive/80 px-2 py-1 rounded-none text-xs font-terminal"
                      type="button"
                      disabled={selectedScheduleIds.size === 0}
                      onClick={() => {
                        openBulkDelete("schedule", Array.from(selectedScheduleIds), `Delete ${selectedScheduleIds.size} schedule item(s)? This cannot be undone.`);
                      }}
                    >
                      Delete
                    </button>
                    <button
                      className="bg-secondary hover:bg-secondary/80 px-2 py-1 rounded-none text-xs font-terminal"
                      type="button"
                      disabled={selectedScheduleIds.size === 0}
                      onClick={() => {
                        selectedScheduleIds.forEach((id) => {
                          const edit = scheduleEdits[id];
                          if (edit) {
                            updateScheduleMutation.mutate({ id, data: edit });
                          }
                        });
                        setScheduleEdits((prev) => {
                          const next = { ...prev };
                          selectedScheduleIds.forEach((id) => {
                            delete next[id];
                          });
                          return next;
                        });
                      }}
                    >
                      Save
                    </button>
                  </div>
                  <ScrollArea className="h-[280px]">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs font-terminal">
                        <thead>
                          <tr className="border-b border-secondary/50">
                            <th className="text-center p-2 w-8">Select</th>
                            <th className="text-left p-2">Type</th>
                            <th className="text-left p-2">Title</th>
                            <th className="text-center p-2">Date</th>
                            <th className="text-center p-2">Start</th>
                            <th className="text-center p-2">End</th>
                            <th className="text-center p-2">Due</th>
                            <th className="text-left p-2">Notes</th>
                            <th className="text-center p-2">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {scheduleEvents.map((ev: ScheduleEvent) => {
                            const edit = scheduleEdits[ev.id] || {};
                            const type = edit.type ?? ev.type ?? "";
                            // delivery removed
                            const title = edit.title ?? ev.title ?? "";
                            const date = edit.date ?? ev.date ?? "";
                            const startTime = edit.startTime ?? ev.startTime ?? "";
                            const endTime = edit.endTime ?? ev.endTime ?? "";
                            const dueDate = edit.dueDate ?? ev.dueDate ?? "";
                            const notes = edit.notes ?? ev.notes ?? "";
                            const hasEdits = !!scheduleEdits[ev.id];

                            return (
                              <tr key={ev.id} className="border-b border-secondary/30 align-top">
                                <td className="text-center p-2">
                                  <Checkbox
                                    checked={selectedScheduleIds.has(ev.id)}
                                    onCheckedChange={(checked) =>
                                      setSelectedScheduleIds((prev) => {
                                        const next = new Set(prev);
                                        if (checked) next.add(ev.id);
                                        else next.delete(ev.id);
                                        return next;
                                      })
                                    }
                                    className="rounded-none border-secondary data-[state=checked]:bg-secondary w-4 h-4"
                                  />
                                </td>
                                <td className="p-2">
                                  <select
                                    className="bg-black border border-secondary rounded-none p-1 text-xs font-terminal"
                                    value={type}
                                    onChange={(e) =>
                                      setScheduleEdits((prev) => ({
                                        ...prev,
                                        [ev.id]: { ...prev[ev.id], type: e.target.value },
                                      }))
                                    }
                                  >
                                    {["class", "lecture", "reading", "topic", "assignment", "quiz", "exam", "assessment", "other"].map((opt) => (
                                      <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                  </select>
                                </td>

                                <td className="p-2">
                                  <input
                                    className="w-full bg-black border border-secondary rounded-none p-1 text-xs font-terminal"
                                    value={title}
                                    onChange={(e) =>
                                      setScheduleEdits((prev) => ({
                                        ...prev,
                                        [ev.id]: { ...prev[ev.id], title: e.target.value },
                                      }))
                                    }
                                  />
                                </td>
                                <td className="text-center p-2">
                                  <input
                                    type="date"
                                    className="bg-black border border-secondary rounded-none p-1 text-xs font-terminal"
                                    value={date || ""}
                                    onChange={(e) =>
                                      setScheduleEdits((prev) => ({
                                        ...prev,
                                        [ev.id]: { ...prev[ev.id], date: e.target.value },
                                      }))
                                    }
                                  />
                                </td>
                                <td className="text-center p-2">
                                  <input
                                    type="time"
                                    className="bg-black border border-secondary rounded-none p-1 text-xs font-terminal"
                                    value={startTime || ""}
                                    onChange={(e) =>
                                      setScheduleEdits((prev) => ({
                                        ...prev,
                                        [ev.id]: { ...prev[ev.id], startTime: e.target.value },
                                      }))
                                    }
                                  />
                                </td>
                                <td className="text-center p-2">
                                  <input
                                    type="time"
                                    className="bg-black border border-secondary rounded-none p-1 text-xs font-terminal"
                                    value={endTime || ""}
                                    onChange={(e) =>
                                      setScheduleEdits((prev) => ({
                                        ...prev,
                                        [ev.id]: { ...prev[ev.id], endTime: e.target.value },
                                      }))
                                    }
                                  />
                                </td>
                                <td className="text-center p-2">
                                  <input
                                    type="date"
                                    className="bg-black border border-secondary rounded-none p-1 text-xs font-terminal"
                                    value={dueDate || ""}
                                    onChange={(e) =>
                                      setScheduleEdits((prev) => ({
                                        ...prev,
                                        [ev.id]: { ...prev[ev.id], dueDate: e.target.value },
                                      }))
                                    }
                                  />
                                </td>
                                <td className="p-2">
                                  <input
                                    className="w-full bg-black border border-secondary rounded-none p-1 text-xs font-terminal"
                                    value={notes || ""}
                                    onChange={(e) =>
                                      setScheduleEdits((prev) => ({
                                        ...prev,
                                        [ev.id]: { ...prev[ev.id], notes: e.target.value },
                                      }))
                                    }
                                  />
                                </td>
                                <td className="text-center p-2 space-x-2">
                                  <button
                                    className="bg-secondary hover:bg-secondary/80 px-2 py-1 rounded-none text-xs font-terminal"
                                    type="button"
                                    disabled={!hasEdits}
                                    onClick={() => {
                                      updateScheduleMutation.mutate({
                                        id: ev.id,
                                        data: { type, title, date, startTime, endTime, dueDate, notes },
                                      });
                                      setScheduleEdits((prev) => {
                                        const next = { ...prev };
                                        delete next[ev.id];
                                        return next;
                                      });
                                    }}
                                  >
                                    Save
                                  </button>
                                  <button
                                    className="bg-destructive hover:bg-destructive/80 px-2 py-1 rounded-none text-xs font-terminal"
                                    type="button"
                                    onClick={() => deleteScheduleMutation.mutate(ev.id)}
                                  >
                                    Delete
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </ScrollArea>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <AlertDialog open={!!bulkDelete} onOpenChange={(open) => !open && setBulkDelete(null)}>
        <AlertDialogContent
          className="bg-black border-[3px] border-double border-primary rounded-none font-terminal text-primary shadow-none max-w-md translate-y-0"
          style={{ zIndex: 100005, top: "6rem", left: "50%", transform: "translate(-50%, 0)" }}
        >
          <AlertDialogHeader className="text-left">
            <AlertDialogTitle className="font-arcade text-destructive">CONFIRM_DELETE</AlertDialogTitle>
            <AlertDialogDescription className="font-terminal text-muted-foreground">
              {bulkDelete?.label}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-end">
            <AlertDialogCancel
              className="rounded-none border-secondary font-terminal text-xs hover:bg-secondary/20"
              onClick={() => {
                bulkDeleteRef.current = null;
                setBulkDelete(null);
              }}
            >
              CANCEL
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-none bg-destructive text-destructive-foreground font-arcade text-xs hover:bg-destructive/80"
              type="button"
              onClick={() => {
                const payload = bulkDeleteRef.current;
                if (!payload) return;
                if (payload.type === "modules") {
                  deleteModulesMutation.mutate(payload.ids);
                } else {
                  deleteSchedulesMutation.mutate(payload.ids);
                }
                bulkDeleteRef.current = null;
                setBulkDelete(null);
              }}
            >
              DELETE
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
