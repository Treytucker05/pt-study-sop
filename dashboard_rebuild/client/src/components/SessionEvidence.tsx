import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Database, Trash2, Pencil, X, Save } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { format, isValid } from "date-fns";
import type { Session } from "@shared/schema";

const safeFormatDate = (
  dateInput: string | number | Date | null | undefined,
  formatStr: string = "MM/dd"
): string => {
  if (!dateInput) return "-";
  try {
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (!isValid(date)) return "-";
    return format(date, formatStr);
  } catch {
    return "-";
  }
};

const parseStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === "string");
      }
    } catch {
      // fall through to comma split
    }
    return trimmed.split(",").map((item) => item.trim()).filter(Boolean);
  }
  return [];
};

export function SessionEvidence() {
  const [selectedSessions, setSelectedSessions] = useState<Set<number>>(new Set());
  const [editingSession, setEditingSession] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sessionsToDelete, setSessionsToDelete] = useState<number[]>([]);
  const [semesterFilter, setSemesterFilter] = useState<string>("all");
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [editFormData, setEditFormData] = useState({
    mode: "",
    minutes: "",
    cards: "",
    confusions: "",
    weakAnchors: "",
    concepts: "",
    issues: "",
    notes: "",
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSemesterFilter(params.get("semester") || "all");
    setStartDate(params.get("start") || "");
    setEndDate(params.get("end") || "");
  }, []);

  const { data: courses = [] } = useQuery({
    queryKey: ["courses"],
    queryFn: () => api.courses.getActive(),
  });

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ["sessions", semesterFilter, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (semesterFilter !== "all") params.append("semester", semesterFilter);
      if (startDate) params.append("start", startDate);
      if (endDate) params.append("end", endDate);
      const query = params.toString();
      const url = query ? `/sessions?${query}` : "/sessions";
      const response = await fetch(`/api${url}`);
      if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
      return response.json();
    },
  });

  const queryClient = useQueryClient();
  const visibleSessions = sessions.filter((s: any) => courseFilter === "all" || String(s.courseId) === courseFilter);
  const visibleSessionIds = visibleSessions.map((s: Session) => s.id);
  const selectedVisibleCount = visibleSessionIds.filter((id: number) => selectedSessions.has(id)).length;

  const deleteSessionsMutation = useMutation({
    mutationFn: (ids: number[]) => api.sessions.deleteMany(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["brain", "metrics"] });
      setSelectedSessions(new Set());
    },
  });

  const updateSessionMutation = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: any }) =>
      api.sessions.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["brain", "metrics"] });
      setEditingSession(null);
    },
  });

  const toggleSessionSelection = (id: number) => {
    setSelectedSessions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const toggleAllSessions = () => {
    if (selectedVisibleCount === visibleSessionIds.length && visibleSessionIds.length > 0) {
      setSelectedSessions(prev => {
        const next = new Set(prev);
        visibleSessionIds.forEach((id: number) => next.delete(id));
        return next;
      });
    } else {
      setSelectedSessions(prev => {
        const next = new Set(prev);
        visibleSessionIds.forEach((id: number) => next.add(id));
        return next;
      });
    }
  };

  const handleDeleteSelected = () => {
    if (selectedSessions.size === 0) return;
    setSessionsToDelete(Array.from(selectedSessions));
    setDeleteDialogOpen(true);
  };

  const handleDeleteAllVisible = () => {
    if (visibleSessionIds.length === 0) return;
    setSessionsToDelete(visibleSessionIds);
    setDeleteDialogOpen(true);
  };

  const handleDeleteSingle = (id: number) => {
    setSessionsToDelete([id]);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    deleteSessionsMutation.mutate(sessionsToDelete);
    setDeleteDialogOpen(false);
    setSessionsToDelete([]);
  };

  useEffect(() => {
    if (editingSession !== null) {
      const session = sessions.find((s: Session) => s.id === editingSession);
      if (session) {
        setEditFormData({
          mode: session.mode || "",
          minutes: session.minutes?.toString() || "",
          cards: session.cards?.toString() || "",
          confusions: parseStringArray(session.confusions).join(", "),
          weakAnchors: parseStringArray(session.weakAnchors).join(", "),
          concepts: parseStringArray(session.concepts).join(", "),
          issues: parseStringArray(session.issues).join(", "),
          notes: session.notes || "",
        });
      }
    }
  }, [editingSession, sessions]);

  const editingSessionData =
    editingSession !== null ? sessions.find((s: Session) => s.id === editingSession) : null;

  const debugModals =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("debugModals");

  useEffect(() => {
    if (editingSession !== null && !sessionsLoading && !editingSessionData) {
      if (debugModals) {
        console.warn("[ModalDebug][SessionEvidence] Missing session for edit; closing.", {
          editingSession,
          sessionsCount: sessions.length,
        });
      }
      setEditingSession(null);
    }
  }, [debugModals, editingSession, editingSessionData, sessions.length, sessionsLoading]);

  const handleSaveEdit = () => {
    if (editingSession === null) return;
    const parseList = (value: string) =>
      value ? value.split(",").map((item) => item.trim()).filter(Boolean) : [];
    const toJsonOrNull = (items: string[]) => (items.length ? JSON.stringify(items) : null);

    updateSessionMutation.mutate({
      id: editingSession,
      updates: {
        mode: editFormData.mode || "study",
        minutes: parseInt(editFormData.minutes) || 0,
        cards: parseInt(editFormData.cards) || 0,
        confusions: toJsonOrNull(parseList(editFormData.confusions)),
        weakAnchors: toJsonOrNull(parseList(editFormData.weakAnchors)),
        concepts: toJsonOrNull(parseList(editFormData.concepts)),
        issues: toJsonOrNull(parseList(editFormData.issues)),
        notes: editFormData.notes || null,
      },
    });
  };

  return (
    <>
      <div className="mt-8">
        <Card className="bg-black/40 border-[3px] border-double border-primary rounded-none">
          <CardHeader className="border-b border-primary/50 p-4">
            <CardTitle className="font-arcade text-sm flex items-center gap-2">
              <Database className="w-4 h-4" />
              SESSION_EVIDENCE
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-5 gap-4 mb-4">
              <div>
                <label className="text-sm font-arcade text-primary mb-2 block">Semester</label>
                <Select
                  value={semesterFilter}
                  onValueChange={(value) => {
                    setSemesterFilter(value);
                    const params = new URLSearchParams(window.location.search);
                    if (value === "all") params.delete("semester");
                    else params.set("semester", value);
                    window.history.replaceState({}, "", `?${params.toString()}`);
                  }}
                >
                  <SelectTrigger className="rounded-none border-primary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-black border-primary">
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="1">Semester 1 (Fall 2025)</SelectItem>
                    <SelectItem value="2">Semester 2 (Spring 2026)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-arcade text-primary mb-2 block">Course</label>
                <Select
                  value={courseFilter}
                  onValueChange={(value) => setCourseFilter(value)}
                >
                  <SelectTrigger className="rounded-none border-primary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-black border-primary">
                    <SelectItem value="all">All</SelectItem>
                    {courses.map((c: any) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-arcade text-primary mb-2 block">Start Date</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    const params = new URLSearchParams(window.location.search);
                    if (e.target.value) params.set("start", e.target.value);
                    else params.delete("start");
                    window.history.replaceState({}, "", `?${params.toString()}`);
                  }}
                  className="rounded-none border-primary"
                />
              </div>
              <div>
                <label className="text-sm font-arcade text-primary mb-2 block">End Date</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    const params = new URLSearchParams(window.location.search);
                    if (e.target.value) params.set("end", e.target.value);
                    else params.delete("end");
                    window.history.replaceState({}, "", `?${params.toString()}`);
                  }}
                  className="rounded-none border-primary"
                />
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSemesterFilter("all");
                    setCourseFilter("all");
                    setStartDate("");
                    setEndDate("");
                    window.history.replaceState({}, "", window.location.pathname);
                  }}
                  className="rounded-none border-primary w-full"
                >
                  Clear Filters
                </Button>
              </div>
            </div>

            {sessionsLoading ? (
              <div className="text-center py-8">
                <p className="font-terminal text-xs text-muted-foreground">Loading sessions...</p>
              </div>
            ) : visibleSessions.length === 0 ? (
              <div className="text-center py-8">
                <p className="font-terminal text-xs text-muted-foreground">No sessions found</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow className="border-secondary/30">
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedVisibleCount === visibleSessionIds.length && visibleSessionIds.length > 0}
                          onCheckedChange={toggleAllSessions}
                          className="border-secondary"
                        />
                      </TableHead>
                      <TableHead className="font-arcade text-xs text-primary">Date</TableHead>
                      <TableHead className="font-arcade text-xs text-primary">Course</TableHead>
                      <TableHead className="font-arcade text-xs text-primary">Mode</TableHead>
                      <TableHead className="font-arcade text-xs text-primary">Minutes</TableHead>
                      <TableHead className="font-arcade text-xs text-primary">Cards</TableHead>
                      <TableHead className="font-arcade text-xs text-primary">Concepts</TableHead>
                      <TableHead className="font-arcade text-xs text-primary">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleSessions.map((session: any) => (
                      <TableRow key={session.id} className="border-secondary/30 hover:bg-secondary/10">
                        <TableCell>
                          <Checkbox
                            checked={selectedSessions.has(session.id)}
                            onCheckedChange={() => toggleSessionSelection(session.id)}
                            className="border-secondary"
                          />
                        </TableCell>
                        <TableCell className="font-terminal text-xs">
                          {safeFormatDate(session.createdAt, "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell className="font-terminal text-xs text-muted-foreground">
                          {session.topic || "-"}
                        </TableCell>
                        <TableCell className="font-terminal text-xs text-muted-foreground">
                          {session.mode || "-"}
                        </TableCell>
                        <TableCell className="font-terminal text-xs text-muted-foreground">
                          {session.minutes || "-"}
                        </TableCell>
                        <TableCell className="font-terminal text-xs text-muted-foreground">
                          {session.cards || "-"}
                        </TableCell>
                        <TableCell className="font-terminal text-xs text-muted-foreground">
                          {Array.isArray(session.concepts) ? session.concepts.length : 0}
                        </TableCell>
                        <TableCell className="flex gap-1">
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-6 w-6 border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/20"
                            onClick={() => setEditingSession(session.id)}
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-6 w-6 border-red-500/50 text-red-400 hover:bg-red-500/20"
                            onClick={() => handleDeleteSingle(session.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}

            {visibleSessions.length > 0 && (
              <div className="flex gap-2 pt-4 border-t border-secondary/30">
                <Button
                  size="sm"
                  variant="outline"
                  className="font-terminal text-xs border-red-500/60 text-red-400 hover:bg-red-500/10"
                  onClick={handleDeleteAllVisible}
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Delete All Visible ({visibleSessions.length})
                </Button>
                {selectedSessions.size > 0 && (
                  <Button
                    size="sm"
                    className="flex-1 font-terminal text-xs bg-red-600 hover:bg-red-700"
                    onClick={handleDeleteSelected}
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Delete Selected ({selectedSessions.size})
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Session Dialog */}
      <Dialog
        open={!!editingSessionData}
        onOpenChange={(open) => {
          if (!open) setEditingSession(null);
        }}
      >
        <DialogContent
          data-modal="brain-edit-session"
          className="bg-black border-[3px] border-double border-primary rounded-none max-w-2xl translate-y-0"
          style={{ zIndex: 100005, top: "6rem", left: "50%", transform: "translate(-50%, 0)" }}
        >
          <DialogHeader>
            <DialogTitle className="font-arcade text-primary flex items-center gap-2">
              <Pencil className="w-5 h-5" />
              EDIT SESSION #{editingSession}
            </DialogTitle>
            <DialogDescription className="font-terminal text-muted-foreground">
              Update WRAP methodology fields for this study session
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 font-terminal">
            <div>
              <label className="text-sm text-muted-foreground">Mode</label>
              <Select
                value={editFormData.mode}
                onValueChange={(value) => setEditFormData(prev => ({ ...prev, mode: value }))}
              >
                <SelectTrigger className="rounded-none border-secondary">
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent className="rounded-none border-secondary bg-black">
                  <SelectItem value="Core">Core</SelectItem>
                  <SelectItem value="Sprint">Sprint</SelectItem>
                  <SelectItem value="Drill">Drill</SelectItem>
                  <SelectItem value="study">Study</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground">Minutes</label>
                <Input
                  type="number"
                  value={editFormData.minutes}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, minutes: e.target.value }))}
                  className="rounded-none border-secondary"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Cards</label>
                <Input
                  type="number"
                  value={editFormData.cards}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, cards: e.target.value }))}
                  className="rounded-none border-secondary"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Confusions (comma-separated)</label>
              <Textarea
                value={editFormData.confusions}
                onChange={(e) => setEditFormData(prev => ({ ...prev, confusions: e.target.value }))}
                placeholder="e.g., muscle insertion points, nerve pathways"
                className="rounded-none border-secondary min-h-[60px]"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Weak Anchors (comma-separated)</label>
              <Textarea
                value={editFormData.weakAnchors}
                onChange={(e) => setEditFormData(prev => ({ ...prev, weakAnchors: e.target.value }))}
                placeholder="e.g., brachial plexus diagram, ROM measurements"
                className="rounded-none border-secondary min-h-[60px]"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Concepts (comma-separated)</label>
              <Textarea
                value={editFormData.concepts}
                onChange={(e) => setEditFormData(prev => ({ ...prev, concepts: e.target.value }))}
                placeholder="e.g., upper extremity anatomy, peripheral nerves"
                className="rounded-none border-secondary min-h-[60px]"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Issues (comma-separated)</label>
              <Textarea
                value={editFormData.issues}
                onChange={(e) => setEditFormData(prev => ({ ...prev, issues: e.target.value }))}
                placeholder="e.g., interrupted by phone, lost focus after 30 min"
                className="rounded-none border-secondary min-h-[60px]"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Notes</label>
              <Textarea
                value={editFormData.notes}
                onChange={(e) => setEditFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Free-form observations about the session"
                className="rounded-none border-secondary min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setEditingSession(null)}
              className="font-terminal rounded-none border-secondary hover:bg-secondary/20"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              className="font-terminal rounded-none bg-primary hover:bg-primary/80"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteDialogOpen && sessionsToDelete.length > 0}
        onOpenChange={setDeleteDialogOpen}
      >
        <AlertDialogContent
          data-modal="brain-delete-session"
          className="bg-black border-2 border-destructive rounded-none translate-y-0"
          style={{ zIndex: 100005, top: "6rem", left: "50%", transform: "translate(-50%, 0)" }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="font-arcade text-destructive flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              CONFIRM DELETE
            </AlertDialogTitle>
            <AlertDialogDescription className="font-terminal text-muted-foreground">
              Are you sure you want to delete {sessionsToDelete.length} session{sessionsToDelete.length !== 1 ? 's' : ''}?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="font-terminal rounded-none border-secondary hover:bg-secondary/20">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="font-terminal rounded-none bg-destructive hover:bg-destructive/80 text-destructive-foreground"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
