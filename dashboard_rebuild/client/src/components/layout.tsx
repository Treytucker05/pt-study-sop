import { Link, useLocation } from "wouter";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { Brain, Calendar, GraduationCap, Bot, Blocks, TrendingUp, BookOpen, Shield, Save, Trash2, GripVertical, Pencil, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import brainBackground from "@assets/BrainBackground.jpg";
import brainButton from "@assets/BrainButton.jpg";
import logoImg from "@assets/StudyBrainIMAGE_1768640444498.jpg";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/use-toast";
import type { Note } from "@shared/schema";

const PRIMARY_NAV_ITEMS = [
  { path: "/", label: "BRAIN", icon: Brain, testId: "brain" },
  { path: "/scholar", label: "SCHOLAR", icon: GraduationCap, testId: "scholar" },
  { path: "/tutor", label: "TUTOR", icon: Bot, testId: "tutor" },
];

const SUPPORT_NAV_ITEMS = [
  { path: "/library", label: "LIBRARY", icon: BookOpen, testId: "library" },
  { path: "/mastery", label: "MASTERY", icon: TrendingUp, testId: "mastery" },
  { path: "/calendar", label: "CALENDAR", icon: Calendar, testId: "calendar" },
  { path: "/methods", label: "METHODS", icon: Blocks, testId: "methods" },
  { path: "/vault-health", label: "VAULT", icon: Shield, testId: "vault" },
];

type NoteCategory = "notes" | "planned" | "ideas";

const NOTE_CATEGORIES: { value: NoteCategory; label: string; tabLabel: string }[] = [
  { value: "notes", label: "NOTES", tabLabel: "NOTES" },
  { value: "planned", label: "PLANNED IMPLEMENTATIONS", tabLabel: "PLANNED" },
  { value: "ideas", label: "IDEAS", tabLabel: "IDEAS" },
];

type NavItem = {
  path: string;
  label: string;
  icon: typeof Brain;
  testId: string;
};

const NOTES_DOCK_STORAGE_KEY = "layout.notesDockTop.v1";
const NOTES_DOCK_MARGIN = 16;
const NOTES_DOCK_MIN_TOP = 96;

const resolveNoteType = (note: Note): NoteCategory => {
  const raw = (note as Note & { noteType?: string }).noteType;
  if (raw === "planned" || raw === "ideas" || raw === "notes") {
    return raw;
  }
  return "notes";
};

/* Shared chrome: same frame + inner glow for all nav buttons; active only brightens */
const NAV_CHROME_BEFORE =
  "before:absolute before:inset-[1px] before:rounded-[1.4rem] before:border before:border-[#4f141e] before:bg-[radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.18),transparent_32%),radial-gradient(circle_at_80%_120%,rgba(0,0,0,0.9),rgba(0,0,0,1)_78%)] before:content-['']";
const NAV_CHROME_AFTER_BASE =
  "after:pointer-events-none after:absolute after:inset-[3px] after:rounded-[1.3rem] after:border after:border-[rgba(255,96,128,0.5)] after:shadow-[0_0_12px_rgba(255,96,128,0.45),inset_0_0_14px_rgba(255,60,108,0.4)] after:content-['']";
const NAV_CHROME_AFTER_ACTIVE =
  "after:border-[rgba(255,118,146,0.85)] after:shadow-[0_0_18px_rgba(255,118,146,0.7),inset_0_0_20px_rgba(255,74,120,0.7)]";

const navButtonClass = (isActive: boolean, headerExpanded: boolean) =>
  cn(
    "nav-btn group relative isolate flex h-[3.5rem] min-w-[9.75rem] items-center justify-start overflow-hidden px-3 py-0 font-arcade uppercase tracking-[0.24em] text-[#ff9caa]",
    "rounded-[1.5rem] border border-transparent transition-all duration-200 ease-out motion-reduce:transition-none",
    NAV_CHROME_BEFORE,
    NAV_CHROME_AFTER_BASE,
    "shadow-[0_12px_28px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,100,120,0.4)]",
    "text-[0.78rem] sm:text-[0.8rem] [text-shadow:0_1px_2px_rgba(0,0,0,0.85),0_0_6px_rgba(255,80,110,0.45)]",
    "hover:-translate-y-0.5 hover:shadow-[0_16px_32px_rgba(0,0,0,0.65),0_0_0_1px_rgba(255,140,155,0.55)] hover:text-[#ffdfe5]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-0",
    "active:translate-y-[1px] active:shadow-[0_8px_18px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,100,120,0.5)]",
    isActive &&
      "text-[#ffeef2] shadow-[0_14px_30px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,160,175,0.55)] " + NAV_CHROME_AFTER_ACTIVE +
      " [text-shadow:0_1px_2px_rgba(0,0,0,0.8),0_0_10px_rgba(255,90,120,0.6)]",
    !headerExpanded && "h-[3.2rem] min-w-[8.85rem] px-2.5",
  );

const navIconPadClass = (_testId: string, isActive: boolean) =>
  cn(
    "relative z-10 mr-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[rgba(255,120,140,0.65)]",
    "bg-[radial-gradient(circle_at_30%_0%,rgba(255,255,255,0.35),transparent_40%),radial-gradient(circle_at_80%_110%,rgba(40,4,12,0.95),rgba(4,0,2,1)_80%)]",
    "shadow-[0_0_12px_rgba(255,120,140,0.6),inset_0_0_14px_rgba(255,80,120,0.7)] transition-all duration-200 ease-out motion-reduce:transition-none",
    "group-hover:scale-[1.05] group-hover:shadow-[0_0_18px_rgba(255,140,158,0.75),inset_0_0_18px_rgba(255,96,132,0.8)]",
    isActive &&
      "border-[rgba(255,200,212,0.9)] shadow-[0_0_20px_rgba(255,180,200,0.8),inset_0_0_22px_rgba(255,110,150,0.85)]",
  );

const navButtonStyle = (_testId: string, isActive: boolean): CSSProperties => ({
  borderRadius: "1.5rem",
  backgroundImage:
    "linear-gradient(135deg, rgba(255,128,148,0.24) 0%, rgba(72,10,22,0.96) 38%, rgba(4,0,4,1) 100%)",
  backgroundPosition: "center center",
  backgroundRepeat: "no-repeat",
  backgroundSize: "cover",
});

const notesDockStyle = (top: number | null): CSSProperties => ({
  top: top === null ? "34%" : `${top}px`,
  borderRadius: "1rem 0 0 1rem",
  backgroundImage:
    "linear-gradient(135deg, rgba(255,128,148,0.22) 0%, rgba(72,10,22,0.96) 38%, rgba(4,0,4,1) 100%)",
  backgroundPosition: "center center",
  backgroundRepeat: "no-repeat",
  backgroundSize: "cover",
});

function ShellNavButton({
  item,
  isActive,
  headerExpanded,
}: {
  item: NavItem;
  isActive: boolean;
  headerExpanded: boolean;
}) {
  return (
    <Button
      data-testid={`nav-${item.testId}`}
      variant="ghost"
      size="sm"
      className={navButtonClass(isActive, headerExpanded)}
      style={navButtonStyle(item.testId, isActive)}
    >
      <span className={navIconPadClass(item.testId, isActive)}>
        <item.icon
          className={cn(
            "h-4.5 w-4.5 shrink-0 text-[#ffe8ec] drop-shadow-[0_0_6px_rgba(255,120,132,0.5)] transition-all duration-200 ease-out motion-reduce:transition-none",
            !headerExpanded && "h-4 w-4",
          )}
        />
      </span>
      <span
        className={cn(
          "relative z-10 mt-px text-[0.78rem] tracking-[0.24em]",
          !headerExpanded && "text-[0.68rem]",
        )}
      >
        {item.label}
      </span>
    </Button>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const currentPath =
    location === "/" || location.startsWith("/brain")
      ? "/"
      : "/" + location.split("/")[1];
  const isBrainPage = currentPath === "/";
  const isTutorPage = currentPath === "/tutor";
  const isWorkspaceRoute = isBrainPage || isTutorPage;
  const [newNote, setNewNote] = useState("");
  const [newNoteType, setNewNoteType] = useState<NoteCategory>("notes");
  const [activeTab, setActiveTab] = useState<"all" | NoteCategory>("all");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [draggedNote, setDraggedNote] = useState<{ id: number; type: NoteCategory } | null>(null);
  const [dragOverNote, setDragOverNote] = useState<{ id: number; type: NoteCategory } | null>(null);
  const [dragOverCategory, setDragOverCategory] = useState<NoteCategory | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notesDockTop, setNotesDockTop] = useState<number | null>(null);
  const [isDraggingNotesDock, setIsDraggingNotesDock] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const notesDockRef = useRef<HTMLButtonElement | null>(null);
  const notesDockDragRef = useRef<{ pointerId: number; offsetY: number; moved: boolean } | null>(null);
  // ─── Adaptive header state ───
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const lastScrollY = useRef(0);
  const lastScrollSource = useRef<EventTarget | null>(null);
  const scrollAccumulator = useRef(0);
  const SCROLL_DOWN_THRESHOLD = 40;
  const SCROLL_UP_THRESHOLD = 20;
  const TOP_ZONE = 80;

  const clampNotesDockTop = useCallback((top: number) => {
    if (typeof window === "undefined") {
      return top;
    }
    const dockHeight = notesDockRef.current?.offsetHeight ?? 88;
    const maxTop = Math.max(NOTES_DOCK_MIN_TOP, window.innerHeight - dockHeight - NOTES_DOCK_MARGIN);
    return Math.min(Math.max(top, NOTES_DOCK_MIN_TOP), maxTop);
  }, []);

  const resolveScrollPosition = useCallback((target?: EventTarget | null) => {
    if (target instanceof HTMLElement) {
      if (target === document.body || target === document.documentElement) {
        return { source: window, y: window.scrollY || document.documentElement.scrollTop || 0 };
      }
      return { source: target, y: target.scrollTop };
    }

    const main = document.querySelector("main");
    if (main instanceof HTMLElement) {
      return { source: main, y: main.scrollTop };
    }

    return { source: window, y: window.scrollY || document.documentElement.scrollTop || 0 };
  }, []);

  const handleScroll = useCallback((event?: Event) => {
    const { source, y } = resolveScrollPosition(event?.target ?? null);

    if (lastScrollSource.current !== source) {
      lastScrollSource.current = source;
      lastScrollY.current = y;
      scrollAccumulator.current = 0;
      if (y <= TOP_ZONE) {
        setHeaderCollapsed(false);
      }
      return;
    }

    const delta = y - lastScrollY.current;
    lastScrollY.current = y;

    // Near the top — always expand
    if (y <= TOP_ZONE) {
      setHeaderCollapsed(false);
      scrollAccumulator.current = 0;
      return;
    }

    // Accumulate scroll in the current direction; reset on direction change
    if (delta > 0) {
      scrollAccumulator.current = Math.max(0, scrollAccumulator.current) + delta;
      if (scrollAccumulator.current > SCROLL_DOWN_THRESHOLD) {
        setHeaderCollapsed(true);
      }
    } else if (delta < 0) {
      scrollAccumulator.current = Math.min(0, scrollAccumulator.current) + delta;
      if (scrollAccumulator.current < -SCROLL_UP_THRESHOLD) {
        setHeaderCollapsed(false);
        scrollAccumulator.current = 0;
      }
    }
  }, [resolveScrollPosition]);

  useEffect(() => {
    document.addEventListener("scroll", handleScroll, { passive: true, capture: true });
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => {
      document.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [handleScroll]);

  const headerExpanded = !headerCollapsed;

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

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const defaultTop = Math.round(window.innerHeight * 0.34);
    let storedTop = defaultTop;
    try {
      const raw = window.localStorage.getItem(NOTES_DOCK_STORAGE_KEY);
      if (raw !== null) {
        const parsed = Number(raw);
        if (Number.isFinite(parsed)) {
          storedTop = parsed;
        }
      }
    } catch {
      storedTop = defaultTop;
    }
    setNotesDockTop(clampNotesDockTop(storedTop));
  }, [clampNotesDockTop]);

  useEffect(() => {
    if (typeof window === "undefined" || notesDockTop === null) {
      return;
    }
    try {
      window.localStorage.setItem(NOTES_DOCK_STORAGE_KEY, String(Math.round(notesDockTop)));
    } catch {
      // ignore localStorage write failures
    }
  }, [notesDockTop]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const handleResize = () => {
      setNotesDockTop((current) => {
        if (current === null) {
          return current;
        }
        return clampNotesDockTop(current);
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [clampNotesDockTop]);

  useEffect(() => {
    (window as typeof window & { openTutor?: () => void }).openTutor = () => setLocation("/tutor");
    return () => {
      delete (window as typeof window & { openTutor?: () => void }).openTutor;
    };
  }, [setLocation]);

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

  const handleNotesDockPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (notesDockTop === null) {
      return;
    }
    const nextOffset = event.clientY - notesDockTop;
    notesDockDragRef.current = {
      pointerId: event.pointerId,
      offsetY: nextOffset,
      moved: false,
    };
    if (typeof event.currentTarget.setPointerCapture === "function") {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    setIsDraggingNotesDock(true);
  };

  const handleNotesDockPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const dragState = notesDockDragRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }
    const nextTop = clampNotesDockTop(event.clientY - dragState.offsetY);
    if (notesDockTop !== null && Math.abs(nextTop - notesDockTop) > 3) {
      dragState.moved = true;
    }
    setNotesDockTop(nextTop);
  };

  const handleNotesDockPointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    const dragState = notesDockDragRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }
    notesDockDragRef.current = dragState;
    if (typeof event.currentTarget.releasePointerCapture === "function") {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setIsDraggingNotesDock(false);
  };

  const handleNotesDockClick = () => {
    const dragState = notesDockDragRef.current;
    if (dragState?.moved) {
      notesDockDragRef.current = null;
      return;
    }
    notesDockDragRef.current = null;
    setNotesOpen(true);
  };

  return (
    <div
      className={cn(
        "relative h-[100dvh] overflow-hidden bg-transparent font-terminal text-foreground",
        "grid grid-rows-[auto_1fr_auto]",
      )}
    >
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(0, 0, 0, 0.44) 0%, rgba(0, 0, 0, 0.18) 22%, rgba(0, 0, 0, 0.38) 58%, rgba(0, 0, 0, 0.84) 100%), url(${brainBackground})`,
            backgroundPosition: "center calc(50% + 48px)",
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
          }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_16%,rgba(255,78,116,0.16),transparent_22%),radial-gradient(circle_at_50%_60%,rgba(255,64,105,0.12),transparent_36%),linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.38)_68%,rgba(0,0,0,0.66)_100%)]" />
      </div>
      <div className="fixed inset-0 z-10 crt-overlay pointer-events-none" />

      {/* CRT Scanlines */}
      <div className="crt-scanlines" />

      {/* Top Nav — adaptive header */}
      <header
        className={cn(
          "relative z-20 sticky top-0 transition-[padding,box-shadow,background-color,opacity] duration-300 ease-out will-change-transform",
          "bg-[linear-gradient(180deg,rgba(5,5,5,0.92),rgba(12,6,8,0.82)_100%)] backdrop-blur-xl shadow-[0_14px_32px_rgba(0,0,0,0.35)]",
          "motion-reduce:transition-none",
          headerExpanded
            ? "opacity-100 shadow-[0_14px_32px_rgba(0,0,0,0.35)]"
            : "opacity-100 shadow-[0_10px_22px_rgba(0,0,0,0.28)]",
        )}
        style={{ borderBottom: "1px solid rgba(255, 67, 102, 0.35)" }}
        data-header-state={headerExpanded ? "expanded" : "compact"}
      >
        <div
          className={cn(
            "w-full px-2 sm:px-3 md:px-4 transition-all duration-300 ease-out motion-reduce:transition-none",
            headerExpanded ? "py-3.5" : "py-2.5",
          )}
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <Link href="/">
                <div className="group flex cursor-pointer items-center gap-3 rounded-[1.25rem] border border-primary/20 bg-black/30 px-3 py-2 shadow-[0_12px_26px_rgba(0,0,0,0.24)] backdrop-blur-sm">
                  <img
                    src={logoImg}
                    alt="Logo"
                    className={cn(
                      "rounded-full border border-primary/30 object-cover transition-all duration-300 ease-out motion-reduce:transition-none",
                      headerExpanded ? "h-14 w-14 sm:h-16 sm:w-16" : "h-10 w-10 sm:h-11 sm:w-11",
                    )}
                  />
                  <div className="min-w-0">
                    <span
                      className={cn(
                        "block whitespace-nowrap font-arcade text-white transition-all duration-300 ease-out group-hover:text-primary phosphor-flicker motion-reduce:transition-none",
                        headerExpanded ? "text-[0.72rem] sm:text-[0.8rem]" : "text-[0.62rem] sm:text-[0.68rem] text-white/80",
                      )}
                    >
                      TREY'S STUDY SYSTEM
                    </span>
                    <span className="block font-terminal text-[0.68rem] text-primary/80 sm:text-sm">
                      Neural command deck
                    </span>
                  </div>
                </div>
              </Link>
            </div>

            <nav
              className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 sm:gap-2 md:justify-end"
              data-testid="nav-desktop-groups"
            >
              <div
                className={cn(
                  "flex min-w-0 flex-wrap items-center gap-1.5 sm:gap-2 transition-all duration-300 ease-out motion-reduce:transition-none",
                  !headerExpanded && "gap-1",
                )}
                data-testid="nav-core-group"
                aria-label="Core triad navigation"
              >
                {PRIMARY_NAV_ITEMS.map((item) => {
                  const isActive = currentPath === item.path;
                  return (
                    <Link key={item.path} href={item.path}>
                      <ShellNavButton item={item} isActive={isActive} headerExpanded={headerExpanded} />
                    </Link>
                  );
                })}
              </div>

              <div
                className={cn(
                  "flex min-w-0 flex-wrap items-center gap-1.5 border-l border-primary/25 pl-2 sm:gap-2 md:pl-3 transition-all duration-300 ease-out motion-reduce:transition-none",
                  !headerExpanded && "gap-1",
                )}
                data-testid="nav-support-group"
                aria-label="Support systems navigation"
              >
                {SUPPORT_NAV_ITEMS.map((item) => {
                  const isActive = currentPath === item.path;
                  return (
                    <Link key={item.path} href={item.path}>
                      <ShellNavButton item={item} isActive={isActive} headerExpanded={headerExpanded} />
                    </Link>
                  );
                })}
              </div>
            </nav>
          </div>
        </div>
      </header>

      <Sheet open={notesOpen} onOpenChange={setNotesOpen}>
        <SheetContent
          className="bg-black border-l-4 border-t-[3px] border-b-[3px] border-double border-primary w-[min(92vw,32rem)] sm:w-[30rem] lg:w-[34rem] shadow-2xl overflow-y-auto z-[100001] inset-y-3 h-auto [&>button]:hidden"
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

      <button
        ref={notesDockRef}
        type="button"
        className={cn(
          "fixed right-0 z-40 flex min-h-[88px] min-w-[40px] w-10 -translate-y-1/2 items-center justify-center overflow-hidden rounded-l-xl border border-r-0 border-transparent px-1.5 py-2 font-arcade text-[#ff9caa] shadow-[0_10px_24px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,100,120,0.35)] transition-all duration-200 ease-out",
          "before:absolute before:inset-[1px_1px_1px_0] before:rounded-l-[0.85rem] before:border before:border-[#4f141e] before:bg-[radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.18),transparent_32%),radial-gradient(circle_at_80%_120%,rgba(0,0,0,0.9),rgba(0,0,0,1)_78%)] before:content-['']",
          "after:pointer-events-none after:absolute after:inset-[3px_3px_3px_0] after:rounded-l-[0.7rem] after:border after:border-[rgba(255,96,128,0.5)] after:shadow-[0_0_10px_rgba(255,96,128,0.4),inset_0_0_12px_rgba(255,60,108,0.35)] after:content-['']",
          "hover:text-[#ffdfe5] hover:shadow-[0_12px_28px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,140,155,0.5)]",
          notesOpen && "pointer-events-none opacity-0",
          isDraggingNotesDock && "cursor-grabbing",
        )}
        style={notesDockStyle(notesDockTop)}
        onPointerDown={handleNotesDockPointerDown}
        onPointerMove={handleNotesDockPointerMove}
        onPointerUp={handleNotesDockPointerUp}
        onPointerCancel={handleNotesDockPointerUp}
        onClick={handleNotesDockClick}
        data-testid="notes-dock"
        aria-label="Open notes panel"
      >
        <div className="relative z-10 flex flex-col items-center gap-1.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[rgba(255,120,140,0.6)] bg-[radial-gradient(circle_at_30%_0%,rgba(255,255,255,0.35),transparent_40%),radial-gradient(circle_at_80%_110%,rgba(40,4,12,0.95),rgba(4,0,2,1)_80%)] shadow-[0_0_8px_rgba(255,120,140,0.5),inset_0_0_10px_rgba(255,80,120,0.6)]">
            <BookOpen className="h-3.5 w-3.5 shrink-0 text-[#ffe8ec] drop-shadow-[0_0_4px_rgba(255,120,132,0.5)]" />
          </span>
          <span className="[writing-mode:vertical-rl] rotate-180 text-[0.6rem] tracking-[0.2em] [text-shadow:0_1px_2px_rgba(0,0,0,0.8),0_0_4px_rgba(255,80,110,0.4)]">
            NOTES
          </span>
        </div>
      </button>

      <main
        className={cn(
          "relative z-10 h-full min-h-0 w-full",
          isWorkspaceRoute
            ? "overflow-y-auto overscroll-y-contain"
            : "overflow-y-auto px-2 py-3 sm:px-3 md:px-5 md:py-4"
        )}
      >
        <div
          className={cn(
            "page-enter",
            isWorkspaceRoute ? "min-h-full" : "app-route-shell min-h-full",
          )}
        >
          {children}
        </div>
      </main>

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
