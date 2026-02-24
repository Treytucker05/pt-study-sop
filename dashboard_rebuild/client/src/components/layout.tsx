import { Link, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { LayoutDashboard, Brain, Calendar, GraduationCap, Bot, Blocks, TrendingUp, BookOpen, Shield, Save, Trash2, GripVertical, Pencil, X, Check, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import arcadeBg from "@assets/generated_images/arcade_tutor_chat_interface.png";
import logoImg from "@assets/StudyBrainIMAGE_1768640444498.jpg";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/use-toast";
import type { Note } from "@shared/schema";

const NAV_ITEMS = [
  { path: "/", label: "DASHBOARD", icon: LayoutDashboard },
  { path: "/brain", label: "BRAIN", icon: Brain },
  { path: "/calendar", label: "CALENDAR", icon: Calendar },
  { path: "/scholar", label: "SCHOLAR", icon: GraduationCap },
  { path: "/tutor", label: "TUTOR", icon: Bot },
  { path: "/methods", label: "METHODS", icon: Blocks },
  { path: "/mastery", label: "MASTERY", icon: TrendingUp },
  { path: "/library", label: "LIBRARY", icon: BookOpen },
  { path: "/vault-health", label: "VAULT", icon: Shield },
];

type NoteCategory = "notes" | "planned" | "ideas";

const NOTE_CATEGORIES: { value: NoteCategory; label: string; tabLabel: string }[] = [
  { value: "notes", label: "NOTES", tabLabel: "NOTES" },
  { value: "planned", label: "PLANNED IMPLEMENTATIONS", tabLabel: "PLANNED" },
  { value: "ideas", label: "IDEAS", tabLabel: "IDEAS" },
];

const resolveNoteType = (note: Note): NoteCategory => {
  const raw = (note as Note & { noteType?: string }).noteType;
  if (raw === "planned" || raw === "ideas" || raw === "notes") {
    return raw;
  }
  return "notes";
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { toast } = useToast();
  const currentPath = location === "/" ? "/" : "/" + location.split("/")[1];
  const isBrainPage = currentPath === "/brain";
  const isTutorPage = currentPath === "/tutor";
  const [newNote, setNewNote] = useState("");
  const [newNoteType, setNewNoteType] = useState<NoteCategory>("notes");
  const [activeTab, setActiveTab] = useState<"all" | NoteCategory>("all");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [draggedNote, setDraggedNote] = useState<{ id: number; type: NoteCategory } | null>(null);
  const [dragOverNote, setDragOverNote] = useState<{ id: number; type: NoteCategory } | null>(null);
  const [dragOverCategory, setDragOverCategory] = useState<NoteCategory | null>(null);
  const [showTutor, setShowTutor] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const queryClient = useQueryClient();

  // Expose tutor toggle to window for integration
  (window as any).openTutor = () => setShowTutor(true);

  const { data: notes = [], isLoading: notesLoading } = useQuery({
    queryKey: ["notes"],
    queryFn: api.notes.getAll,
  });

  const notesByType: Record<NoteCategory, Note[]> = {
    notes: notes.filter((note) => resolveNoteType(note) === "notes"),
    planned: notes.filter((note) => resolveNoteType(note) === "planned"),
    ideas: notes.filter((note) => resolveNoteType(note) === "ideas"),
  };

  const sortedNotesByType: Record<NoteCategory, Note[]> = {
    notes: [...notesByType.notes].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
    planned: [...notesByType.planned].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
    ideas: [...notesByType.ideas].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
  };

  const createNoteMutation = useMutation({
    mutationFn: api.notes.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      setNewNote("");
      toast({ title: "Note Saved" });
    },
    onError: (error: Error) => {
      toast({ title: "Save failed", description: error.message || "Could not save note.", variant: "destructive" });
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Note> }) =>
      api.notes.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      setEditingId(null);
      toast({ title: "Note Updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Update failed", description: error.message || "Could not update note.", variant: "destructive" });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: api.notes.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      toast({ title: "Note Deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Delete failed", description: error.message || "Could not delete note.", variant: "destructive" });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: api.notes.reorder,
    onMutate: async (updates: { id: number; position: number; noteType?: NoteCategory }[]) => {
      await queryClient.cancelQueries({ queryKey: ["notes"] });
      const previous = queryClient.getQueryData<Note[]>(["notes"]);
      if (!previous) return { previous };

      const updateMap = new Map(
        updates.map((item) => [item.id, { position: item.position, noteType: item.noteType }])
      );
      const next = previous.map((note) => {
        if (!updateMap.has(note.id)) return note;
        const update = updateMap.get(note.id);
        return {
          ...note,
          position: update?.position ?? note.position,
          noteType: update?.noteType ?? (note as Note & { noteType?: string }).noteType,
        };
      });

      const typeOrder: Record<NoteCategory, number> = { notes: 0, planned: 1, ideas: 2 };
      const resolvedType = (note: Note) => resolveNoteType(note);
      next.sort((a, b) => {
        const typeDiff = typeOrder[resolvedType(a)] - typeOrder[resolvedType(b)];
        if (typeDiff !== 0) return typeDiff;
        const posDiff = (a.position ?? 0) - (b.position ?? 0);
        if (posDiff !== 0) return posDiff;
        return (a.createdAt ?? 0) > (b.createdAt ?? 0) ? 1 : -1;
      });

      queryClient.setQueryData(["notes"], next);
      return { previous };
    },
    onError: (_err, _updates, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["notes"], context.previous);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      toast({ title: "Notes Reordered" });
    },
  });


  const handleSaveNote = () => {
    if (newNote.trim()) {
      createNoteMutation.mutate({
        content: newNote.trim(),
        position: notesByType[newNoteType].length,
        noteType: newNoteType,
      });
    }
  };

  const handleDragStart = (e: React.DragEvent, id: number, type: NoteCategory) => {
    setDraggedNote({ id, type });
    try {
      e.dataTransfer.setData("text/plain", String(id));
    } catch {
      // noop: some browsers restrict dataTransfer in certain contexts
    }
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, targetId: number, targetType: NoteCategory) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (draggedNote !== null && draggedNote.id !== targetId) {
      setDragOverNote({ id: targetId, type: targetType });
    }
  };

  const handleDropCore = (targetType: NoteCategory, targetId?: number | null) => {
    if (!draggedNote) return;

    const sourceType = draggedNote.type;
    const sourceNotes = [...sortedNotesByType[sourceType]];
    const draggedIndex = sourceNotes.findIndex((n) => n.id === draggedNote.id);
    if (draggedIndex === -1) return;

    const [draggedItem] = sourceNotes.splice(draggedIndex, 1);
    const targetNotes =
      sourceType === targetType ? sourceNotes : [...sortedNotesByType[targetType]];

    let insertIndex = targetNotes.length;
    if (typeof targetId === "number") {
      const targetIndex = targetNotes.findIndex((n) => n.id === targetId);
      if (targetIndex !== -1) insertIndex = targetIndex;
    }
    targetNotes.splice(insertIndex, 0, draggedItem);

    const updates: { id: number; position: number; noteType?: NoteCategory }[] = [];
    if (sourceType === targetType) {
      targetNotes.forEach((note, index) => {
        updates.push({ id: note.id, position: index });
      });
    } else {
      sourceNotes.forEach((note, index) => {
        updates.push({ id: note.id, position: index });
      });
      targetNotes.forEach((note, index) => {
        if (note.id === draggedItem.id) {
          updates.push({ id: note.id, position: index, noteType: targetType });
        } else {
          updates.push({ id: note.id, position: index });
        }
      });
    }

    reorderMutation.mutate(updates);
  };

  const handleDropOnNote = (e: React.DragEvent, targetId: number, targetType: NoteCategory) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedNote || draggedNote.id === targetId) {
      setDraggedNote(null);
      setDragOverNote(null);
      setDragOverCategory(null);
      return;
    }
    handleDropCore(targetType, targetId);
    setDraggedNote(null);
    setDragOverNote(null);
    setDragOverCategory(null);
  };

  const handleDropOnCategory = (e: React.DragEvent, targetType: NoteCategory) => {
    e.preventDefault();
    if (!draggedNote) return;
    handleDropCore(targetType, null);
    setDraggedNote(null);
    setDragOverNote(null);
    setDragOverCategory(null);
  };

  const handleCategoryDragOver = (e: React.DragEvent, _targetType: NoteCategory) => {
    if (!draggedNote) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleCategoryDragEnter = (targetType: NoteCategory) => {
    if (!draggedNote) return;
    setDragOverCategory(targetType);
  };

  const handleCategoryDragLeave = (targetType: NoteCategory) => {
    if (dragOverCategory === targetType) {
      setDragOverCategory(null);
    }
  };

  const handleDragEnd = () => {
    setDraggedNote(null);
    setDragOverNote(null);
    setDragOverCategory(null);
  };

  return (
    <div
      className={cn(
        "h-[100dvh] bg-background text-foreground relative font-terminal overflow-hidden",
        "grid grid-rows-[auto_1fr_auto]",
      )}
    >
      {/* Background with overlay */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(10, 10, 10, 0.25), rgba(10, 10, 10, 0.25)), url(${arcadeBg})`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
          backgroundSize: "cover",
          opacity: 0.55,
        }}
      />
      <div className="fixed inset-0 z-10 crt-overlay pointer-events-none" />

      {/* CRT Scanlines */}
      <div className="crt-scanlines" />

      {/* Top Nav */}
      <header className="relative z-20 bg-black/80 backdrop-blur-sm sticky top-0" style={{ borderBottom: '4px double hsl(350 63% 49%)' }}>
        <div className="w-full px-3 h-12 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden nav-btn p-1"
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              aria-label="Toggle navigation"
            >
              <Menu className="w-5 h-5" />
            </Button>

            <Link href="/">
              <div className="flex items-center gap-2 cursor-pointer group">
                <img src={logoImg} alt="Logo" className="w-8 h-8 object-cover" />
                <span className="hidden lg:block font-arcade text-xs text-white group-hover:text-primary transition-colors whitespace-nowrap phosphor-flicker">TREY'S STUDY SYSTEM</span>
              </div>
            </Link>

            <nav className="hidden md:flex gap-1">
              {NAV_ITEMS.map((item) => {
                const isActive = currentPath === item.path;
                return (
                  <Link key={item.path} href={item.path}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn("nav-btn font-arcade", isActive && "active")}
                    >
                      <item.icon className="w-3 h-3 lg:mr-1" />
                      <span className="hidden lg:inline">{item.label}</span>
                    </Button>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="nav-btn font-arcade border-primary/40 text-xs px-3">
                  NOTES
                </Button>
              </SheetTrigger>
              <SheetContent
                className="bg-black border-l-4 border-t-[3px] border-b-[3px] border-double border-primary w-[340px] sm:w-[480px] lg:w-[520px] shadow-2xl overflow-y-auto z-[100001] inset-y-3 h-auto [&>button]:hidden"
                style={{ zIndex: 100001 }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <SheetClose asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 rounded-none border-2 border-primary text-primary hover:bg-primary/20 hover:text-primary"
                      aria-label="Close notes"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </SheetClose>
                  <SheetTitle className="font-arcade text-primary">QUICK_NOTES</SheetTitle>
                </div>
                <SheetDescription className="sr-only">Quick notes panel</SheetDescription>
                <div className="flex flex-col gap-4">
                  <div className="space-y-2">
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant={activeTab === "all" ? "default" : "ghost"}
                        className={cn(
                          "font-arcade rounded-none text-xs h-7 px-3 whitespace-nowrap",
                          activeTab === "all"
                            ? "bg-primary text-primary-foreground"
                            : "border border-secondary text-muted-foreground hover:text-primary"
                        )}
                        onClick={() => setActiveTab("all")}
                      >
                        ALL
                      </Button>
                      {NOTE_CATEGORIES.map((category) => (
                        <Button
                          key={category.value}
                          size="sm"
                          variant={activeTab === category.value ? "default" : "ghost"}
                          className={cn(
                            "font-arcade rounded-none text-xs h-7 px-3 whitespace-nowrap",
                            activeTab === category.value
                              ? "bg-primary text-primary-foreground"
                              : "border border-secondary text-muted-foreground hover:text-primary"
                          )}
                          onClick={() => { setActiveTab(category.value); setNewNoteType(category.value); }}
                        >
                          {category.tabLabel}
                        </Button>
                      ))}
                    </div>
                    <Textarea
                      placeholder="TYPE_NOTE_HERE..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      className="h-20 bg-secondary/20 border-2 border-secondary font-terminal text-sm rounded-none resize-none focus-visible:ring-primary"
                      data-testid="input-note-content"
                    />
                    <Button
                      className="w-full font-arcade rounded-none text-xs"
                      size="sm"
                      onClick={handleSaveNote}
                      disabled={!newNote.trim() || createNoteMutation.isPending}
                      data-testid="button-add-note"
                    >
                      <Save className="w-3 h-3 mr-2" /> ADD NOTE
                    </Button>
                  </div>

                  <div className="border-t border-secondary pt-2">
                    <div className="font-arcade text-xs text-muted-foreground mb-2">SAVED NOTES ({notes.length})</div>
                    <ScrollArea className="h-[calc(100vh-280px)]">
                      <div className="space-y-6 pr-2">
                        {NOTE_CATEGORIES.filter((c) => activeTab === "all" || c.value === activeTab).map((category) => {
                          const sectionNotes = sortedNotesByType[category.value];
                          return (
                            <div
                              key={category.value}
                              className={cn(
                                "space-y-2 rounded-none border border-transparent p-1",
                                dragOverCategory === category.value && "border-primary/70 bg-primary/5"
                              )}
                              onDragOver={(e) => handleCategoryDragOver(e, category.value)}
                              onDragEnter={() => handleCategoryDragEnter(category.value)}
                              onDragLeave={() => handleCategoryDragLeave(category.value)}
                              onDrop={(e) => handleDropOnCategory(e, category.value)}
                            >
                              <div className="font-arcade text-xs text-muted-foreground">
                                {category.label} ({sectionNotes.length})
                              </div>
                              <div
                                className={cn(
                                  "space-y-2 min-h-[72px] rounded-none border border-transparent p-1",
                                  dragOverCategory === category.value && "border-primary/40"
                                )}
                                onDragOver={(e) => handleCategoryDragOver(e, category.value)}
                                onDragEnter={() => handleCategoryDragEnter(category.value)}
                                onDragLeave={() => handleCategoryDragLeave(category.value)}
                                onDrop={(e) => handleDropOnCategory(e, category.value)}
                              >
                                {sectionNotes.map((note) => (
                                  <div
                                    key={note.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, note.id, category.value)}
                                    onDragOver={(e) => handleDragOver(e, note.id, category.value)}
                                    onDrop={(e) => handleDropOnNote(e, note.id, category.value)}
                                    onDragEnd={handleDragEnd}
                                    data-testid={`card-note-${note.id}`}
                                    className={cn(
                                      "bg-secondary/20 border border-secondary p-2 rounded-none cursor-move transition-all",
                                      draggedNote?.id === note.id && "opacity-50",
                                      dragOverNote?.id === note.id && dragOverNote?.type === category.value && "border-primary border-2"
                                    )}
                                  >
                                    {editingId === note.id ? (
                                      <div className="space-y-2">
                                        <Input
                                          value={editingContent}
                                          onChange={(e) => setEditingContent(e.target.value)}
                                          className="bg-black border-primary rounded-none text-sm font-terminal"
                                          autoFocus
                                        />
                                        <div className="flex gap-1">
                                          <Button
                                            size="sm"
                                            className="flex-1 rounded-none text-xs h-6"
                                            onClick={() => updateNoteMutation.mutate({ id: note.id, data: { content: editingContent } })}
                                          >
                                            <Check className="w-3 h-3" />
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="rounded-none text-xs h-6"
                                            onClick={() => setEditingId(null)}
                                          >
                                            <X className="w-3 h-3" />
                                          </Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex items-start gap-2">
                                        <GripVertical className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                                        <div className="flex-1 font-terminal text-sm whitespace-pre-wrap break-words">{note.content}</div>
                                        <div className="flex gap-1 shrink-0">
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 w-6 p-0 rounded-none hover:bg-primary/20"
                                            onClick={() => { setEditingId(note.id); setEditingContent(note.content); }}
                                            data-testid={`button-edit-note-${note.id}`}
                                          >
                                            <Pencil className="w-3 h-3" />
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 w-6 p-0 rounded-none hover:bg-red-500/20 text-red-400"
                                            onClick={() => deleteNoteMutation.mutate(note.id)}
                                            data-testid={`button-delete-note-${note.id}`}
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                                {sectionNotes.length === 0 && (
                                  <div className="text-center text-muted-foreground font-terminal text-xs py-4">
                                    No {category.value} yet
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        {notes.length === 0 && (
                          <div className="text-center text-muted-foreground font-terminal text-sm py-4">
                            No notes yet
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Mobile nav dropdown */}
        {mobileNavOpen && (
          <nav className="md:hidden border-t border-primary/30 bg-black/95 px-3 py-2 flex flex-wrap gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = currentPath === item.path;
              return (
                <Link key={item.path} href={item.path}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn("nav-btn font-arcade", isActive && "active")}
                    onClick={() => setMobileNavOpen(false)}
                  >
                    <item.icon className="w-3 h-3 mr-1" />
                    <span className="text-xs">{item.label}</span>
                  </Button>
                </Link>
              );
            })}
          </nav>
        )}
      </header>

      <main
        className={cn(
          "relative z-10 w-full bg-grid h-full min-h-0",
          isBrainPage || isTutorPage
            ? "overflow-hidden"
            : "overflow-y-auto px-3 md:px-6 py-3"
        )}
      >
        <div className={cn("page-enter", (isBrainPage || isTutorPage) && "h-full")}>{children}</div>
      </main>

      {/* Tutor Modal Integration */}
      <Dialog open={showTutor} onOpenChange={setShowTutor}>
        <DialogContent className="bg-black border-2 border-primary rounded-none max-w-2xl h-[80vh] flex flex-col p-0">
          <div className="flex justify-between items-center p-4 border-b border-primary">
            <DialogTitle className="font-arcade text-primary flex items-center gap-2">
              <Bot className="h-5 w-5" />
              AI_STUDY_ASSISTANT
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={() => setShowTutor(false)} className="rounded-none">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <iframe src="/tutor" className="flex-1 w-full border-0" />
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="z-20 border-t border-secondary bg-black/95 py-2">
        <div className="container mx-auto px-4 flex justify-between items-center text-xs text-muted-foreground font-terminal">
          <div className="flex gap-4">
            <span>STATUS: <span className="text-primary">ONLINE</span></span>
            <span>SYNC: <span className="text-white">{currentTime}</span></span>
          </div>
          <div>v2.0.25 [BETA]</div>
        </div>
      </footer>
    </div>
  );
}
