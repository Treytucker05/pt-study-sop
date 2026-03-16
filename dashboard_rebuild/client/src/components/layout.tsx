import { useLocation } from "wouter";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { Brain, Calendar, GraduationCap, Bot, Blocks, TrendingUp, BookOpen, Shield, Save, Trash2, GripVertical, Pencil, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import brainBackground from "@assets/BrainBackground.jpg";
import logoImg from "@assets/StudyBrainIMAGE_1768640444498.jpg";
import {
  CONTROL_COPY,
  CONTROL_DECK_SECTION,
  CONTROL_KICKER,
  controlToggleButton,
} from "@/components/shell/controlStyles";
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

type NavTier = "primary" | "support";

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

const railShellClass = (tier: NavTier, headerExpanded: boolean) =>
  cn(
    "relative overflow-hidden border backdrop-blur-xl shadow-[0_18px_36px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,86,118,0.12)]",
    "before:pointer-events-none before:absolute before:inset-[1px] before:rounded-[inherit] before:border before:border-[rgba(255,190,206,0.08)] before:content-['']",
    "after:pointer-events-none after:absolute after:inset-x-5 after:top-0 after:h-[2px] after:bg-gradient-to-r after:from-transparent after:via-[rgba(255,106,136,0.6)] after:to-transparent after:content-['']",
    tier === "primary"
      ? cn(
          "rounded-[1.9rem] border-[rgba(255,118,146,0.3)] bg-[linear-gradient(180deg,rgba(18,12,14,0.92),rgba(6,6,8,0.96)_100%)]",
          headerExpanded ? "px-3 py-3" : "px-2.5 py-2.5",
        )
      : cn(
          "rounded-[1.45rem] border-[rgba(255,118,146,0.22)] bg-[linear-gradient(180deg,rgba(16,10,12,0.92),rgba(6,6,8,0.95)_100%)]",
          headerExpanded ? "px-2.5 py-2" : "px-2 py-1.5",
        ),
  );

const railCoreClass = (tier: NavTier) =>
  cn(
    "relative z-10 grid items-stretch",
    tier === "primary" ? "grid-cols-3 gap-2.5" : "min-w-[34rem] grid-cols-5 gap-1.5 sm:min-w-0",
  );

const navLinkClass = (tier: NavTier, isActive: boolean, headerExpanded: boolean) =>
  cn(
    "group relative flex min-w-0 overflow-hidden border text-[#f7dbe2] transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-0 motion-reduce:transition-none",
    "before:pointer-events-none before:absolute before:inset-[1px] before:rounded-[inherit] before:border before:border-[rgba(255,214,224,0.08)] before:content-['']",
    "after:pointer-events-none after:absolute after:inset-x-3 after:bottom-[5px] after:h-[2px] after:rounded-full after:bg-gradient-to-r after:from-transparent after:via-[rgba(255,110,140,0.9)] after:to-transparent after:opacity-0 after:transition-opacity after:duration-200 after:content-['']",
    tier === "primary"
      ? cn(
          "items-center gap-3 rounded-[1.35rem] px-4 text-left",
          headerExpanded ? "h-[4.15rem]" : "h-[3.55rem]",
          "border-[rgba(255,132,160,0.28)] bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.01)_18%,rgba(8,8,10,0.92)_100%),linear-gradient(135deg,rgba(118,18,34,0.56),rgba(10,8,12,0.96)_60%,rgba(0,0,0,0.98)_100%)]",
          "shadow-[0_10px_22px_rgba(0,0,0,0.34),inset_0_0_0_1px_rgba(255,62,94,0.12)]",
        )
      : cn(
          "items-center justify-center rounded-[1rem] px-2 text-center",
          headerExpanded ? "h-[2.95rem]" : "h-[2.55rem]",
          "border-[rgba(255,132,160,0.18)] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(10,8,10,0.96)_100%)] shadow-[0_8px_18px_rgba(0,0,0,0.28)]",
        ),
    "hover:-translate-y-[1px] hover:border-[rgba(255,162,184,0.42)] hover:text-white hover:after:opacity-80",
    "active:translate-y-[1px]",
    isActive &&
      (tier === "primary"
        ? "border-[rgba(255,186,204,0.56)] text-white shadow-[0_14px_28px_rgba(0,0,0,0.45),0_0_18px_rgba(255,92,120,0.18),inset_0_0_0_1px_rgba(255,126,156,0.22)] after:opacity-100"
        : "border-[rgba(255,170,192,0.36)] text-white shadow-[0_10px_20px_rgba(0,0,0,0.34),0_0_14px_rgba(255,82,110,0.12)] after:opacity-100"),
  );

const navIconWrapClass = (isActive: boolean, headerExpanded: boolean) =>
  cn(
    "relative z-10 flex shrink-0 items-center justify-center rounded-[0.95rem] border border-[rgba(255,138,166,0.24)] bg-[radial-gradient(circle_at_30%_0%,rgba(255,255,255,0.18),transparent_42%),linear-gradient(180deg,rgba(255,108,136,0.18),rgba(10,6,8,0.95))] shadow-[inset_0_0_0_1px_rgba(255,214,224,0.06)]",
    headerExpanded ? "h-9.5 w-9.5" : "h-8 w-8",
    isActive && "border-[rgba(255,196,208,0.48)] shadow-[inset_0_0_0_1px_rgba(255,214,224,0.12),0_0_10px_rgba(255,94,122,0.16)]",
  );

const navLabelClass = (tier: NavTier, headerExpanded: boolean) =>
  cn(
    "relative z-10 font-arcade uppercase text-[#ffeef2] [text-shadow:0_1px_2px_rgba(0,0,0,0.8)]",
    tier === "primary"
      ? headerExpanded
        ? "text-[0.76rem] tracking-[0.16em]"
        : "text-[0.68rem] tracking-[0.14em]"
      : headerExpanded
        ? "text-[0.62rem] tracking-[0.14em] sm:text-[0.68rem]"
        : "text-[0.56rem] tracking-[0.12em] sm:text-[0.62rem]",
  );

const notesDockStyle = (top: number | null): CSSProperties => ({
  top: top === null ? "34%" : `${top}px`,
});

function ShellNavLink({
  item,
  isActive,
  headerExpanded,
  tier,
  onNavigate,
}: {
  item: NavItem;
  isActive: boolean;
  headerExpanded: boolean;
  tier: NavTier;
  onNavigate: (event: MouseEvent<HTMLAnchorElement>, path: string) => void;
}) {
  const showIcon = tier === "primary";
  return (
    <a
      href={item.path}
      data-testid={`nav-${item.testId}`}
      className={navLinkClass(tier, isActive, headerExpanded)}
      aria-current={isActive ? "page" : undefined}
      onClick={(event) => onNavigate(event, item.path)}
    >
      <span className="pointer-events-none absolute inset-x-4 top-[2px] h-px bg-gradient-to-r from-transparent via-[rgba(255,208,216,0.28)] to-transparent" />
      <span
        className={cn(
          "pointer-events-none absolute inset-x-4 bottom-[4px] h-[1px] bg-gradient-to-r from-transparent via-[rgba(255,88,118,0.5)] to-transparent",
          isActive
            ? "opacity-100 shadow-[0_0_10px_rgba(255,110,140,0.42)]"
            : "opacity-35 group-hover:opacity-65",
        )}
      />
      {showIcon ? (
        <span className={navIconWrapClass(isActive, headerExpanded)}>
          <item.icon
            className={cn(
              "shrink-0 text-[#fff3f6] drop-shadow-[0_0_6px_rgba(255,120,132,0.42)]",
              headerExpanded ? "h-4.5 w-4.5" : "h-4 w-4",
            )}
          />
        </span>
      ) : null}
      <span
        className={cn(
          navLabelClass(tier, headerExpanded),
          tier === "primary" ? "text-left" : "text-center",
        )}
      >
        {item.label}
      </span>
    </a>
  );
}

function useLayoutContent({ children }: { children: React.ReactNode }) {
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
  const editingInputRef = useRef<HTMLInputElement>(null);
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

  useEffect(() => {
    if (editingId === null) return;
    const frame = requestAnimationFrame(() => {
      editingInputRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [editingId]);

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

  const handleNavActivate = useCallback(
    (event: MouseEvent<HTMLAnchorElement>, path: string) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      event.preventDefault();
      setLocation(path);
    },
    [setLocation],
  );

  return (
    <div
      className={cn(
        "relative h-[100dvh] overflow-hidden bg-transparent font-terminal text-foreground",
        "grid grid-rows-[auto_1fr_auto]",
      )}
    >
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div
          className="absolute inset-0 scale-[1.04] blur-[2px] opacity-30"
          style={{
            backgroundImage: `url(${brainBackground})`,
            backgroundPosition: "center calc(56% + 56px)",
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
          }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,78,116,0.1),transparent_18%),radial-gradient(circle_at_50%_62%,rgba(255,64,105,0.08),transparent_28%),linear-gradient(180deg,rgba(0,0,0,0.7),rgba(0,0,0,0.42)_18%,rgba(0,0,0,0.58)_60%,rgba(0,0,0,0.88)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,5,8,0.76),rgba(5,5,8,0.22)_24%,rgba(5,5,8,0.48)_72%,rgba(5,5,8,0.84)_100%)]" />
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
          <div className="grid gap-3 lg:grid-cols-[minmax(15rem,22rem)_minmax(0,1fr)] lg:items-start lg:gap-5">
            <a
              href="/"
              onClick={(event) => handleNavActivate(event, "/")}
              className="group flex min-w-0 items-center gap-3 rounded-[1.35rem] border border-[rgba(255,122,146,0.24)] bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.01)_20%,rgba(0,0,0,0.28)_100%),linear-gradient(135deg,rgba(18,12,14,0.96),rgba(8,8,10,0.96))] px-3 py-2 shadow-[0_16px_30px_rgba(0,0,0,0.28)] backdrop-blur-sm"
            >
              <img
                src={logoImg}
                alt="Logo"
                className={cn(
                  "rounded-full border border-primary/30 object-cover transition-all duration-300 ease-out motion-reduce:transition-none",
                  headerExpanded ? "h-14 w-14 sm:h-15 sm:w-15" : "h-10 w-10 sm:h-11 sm:w-11",
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
                  neural command deck
                </span>
              </div>
            </a>

            <div className="flex min-w-0 flex-col gap-2.5" data-testid="nav-desktop-groups">
              <nav
                className={cn("mx-auto w-full max-w-[60rem]", railShellClass("primary", headerExpanded))}
                aria-label="Primary study navigation"
                data-testid="nav-primary-rail"
              >
                <div className="pointer-events-none absolute inset-x-6 top-[10px] h-[1px] bg-gradient-to-r from-transparent via-[rgba(255,84,118,0.8)] to-transparent" />
                <div
                  className={railCoreClass("primary")}
                  data-testid="nav-core-group"
                  aria-label="Core triad navigation"
                >
                  {PRIMARY_NAV_ITEMS.map((item) => {
                    const isActive = currentPath === item.path;
                    return (
                      <ShellNavLink
                        key={item.path}
                        item={item}
                        isActive={isActive}
                        headerExpanded={headerExpanded}
                        tier="primary"
                        onNavigate={handleNavActivate}
                      />
                    );
                  })}
                </div>
              </nav>

              <div className="mx-auto w-full max-w-[52rem] overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <nav
                  className={railShellClass("support", headerExpanded)}
                  aria-label="Secondary study navigation"
                  data-testid="nav-secondary-rail"
                >
                  <div className="pointer-events-none absolute inset-x-7 top-[7px] h-[1px] bg-gradient-to-r from-transparent via-[rgba(255,84,118,0.42)] to-transparent" />
                  <div
                    className={railCoreClass("support")}
                    data-testid="nav-support-group"
                    aria-label="Support systems navigation"
                  >
                    {SUPPORT_NAV_ITEMS.map((item) => {
                      const isActive = currentPath === item.path;
                      return (
                        <ShellNavLink
                          key={item.path}
                          item={item}
                          isActive={isActive}
                          headerExpanded={headerExpanded}
                          tier="support"
                          onNavigate={handleNavActivate}
                        />
                      );
                    })}
                  </div>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </header>

      <Sheet open={notesOpen} onOpenChange={setNotesOpen}>
        <SheetContent
          className="bg-black border-l-4 border-t-[3px] border-b-[3px] border-double border-primary w-[min(92vw,32rem)] sm:w-[30rem] lg:w-[34rem] shadow-2xl overflow-y-auto z-[100001] inset-y-3 h-auto [&>button]:hidden"
          style={{ zIndex: 100001 }}
        >
                <div className="mb-4 flex items-center gap-2">
                  <SheetClose asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 rounded-[0.95rem] border-primary/40 text-primary hover:bg-primary/20 hover:text-primary"
                      aria-label="Close notes"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </SheetClose>
                  <div className="min-w-0">
                    <SheetTitle className="font-arcade text-primary">QUICK_NOTES</SheetTitle>
                    <div className={cn(CONTROL_COPY, "text-[11px]")}>
                      Capture live notes, implementation ideas, and follow-ups without leaving the active route.
                    </div>
                  </div>
                </div>
                <SheetDescription className="sr-only">Quick notes panel</SheetDescription>
                <div className="flex flex-col gap-4">
                  <div className={cn(CONTROL_DECK_SECTION, "space-y-3")}>
                    <div className={CONTROL_KICKER}>Capture</div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className={controlToggleButton(activeTab === "all", "primary", true)}
                        onClick={() => setActiveTab("all")}
                      >
                        ALL
                      </Button>
                      {NOTE_CATEGORIES.map((category) => (
                        <Button
                          key={category.value}
                          size="sm"
                          variant="ghost"
                          className={controlToggleButton(activeTab === category.value, "secondary", true)}
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
                      className="h-24 resize-none rounded-[1rem] border-primary/30 bg-black/45 font-terminal text-sm focus-visible:ring-primary"
                      data-testid="input-note-content"
                    />
                    <Button
                      className="w-full rounded-[1rem] font-arcade text-xs"
                      size="sm"
                      onClick={handleSaveNote}
                      disabled={!newNote.trim() || createNoteMutation.isPending}
                      data-testid="button-add-note"
                    >
                      <Save className="w-3 h-3 mr-2" /> ADD NOTE
                    </Button>
                  </div>

                  <div className={cn(CONTROL_DECK_SECTION, "border-t-0")}>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className={CONTROL_KICKER}>Saved Notes</div>
                      <div className={cn(CONTROL_COPY, "text-[11px]")}>{notes.length} total</div>
                    </div>
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
                                          ref={editingInputRef}
                                          value={editingContent}
                                          onChange={(e) => setEditingContent(e.target.value)}
                                          className="bg-black border-primary rounded-none text-sm font-terminal"
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
          "fixed right-0 z-40 flex min-h-[96px] min-w-[52px] w-[3.35rem] -translate-y-1/2 items-center justify-center overflow-hidden rounded-l-[1.15rem] border border-r-0 border-[rgba(255,122,146,0.28)] px-1.5 py-2 font-arcade text-[#ffd6dd] shadow-[0_14px_28px_rgba(0,0,0,0.48),0_0_0_1px_rgba(255,108,138,0.2)] transition-all duration-200 ease-out",
          "before:absolute before:inset-[1px_1px_1px_0] before:rounded-l-[1rem] before:border before:border-[rgba(255,184,204,0.12)] before:bg-[linear-gradient(180deg,rgba(8,6,7,0.74),rgba(0,0,0,0.76)_100%)] before:content-['']",
          "after:pointer-events-none after:absolute after:inset-x-2 after:bottom-2 after:h-[2px] after:rounded-full after:bg-[linear-gradient(90deg,transparent,rgba(255,122,146,0.8),transparent)] after:shadow-[0_0_10px_rgba(255,102,132,0.42)] after:content-['']",
          "hover:text-white hover:shadow-[0_18px_32px_rgba(0,0,0,0.56),0_0_12px_rgba(255,102,132,0.16)]",
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
          <span className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-[0.95rem] border border-[rgba(255,164,184,0.42)] bg-[radial-gradient(circle_at_30%_0%,rgba(255,255,255,0.22),transparent_40%),linear-gradient(180deg,rgba(255,112,140,0.2),rgba(12,4,6,0.96))] shadow-[inset_0_0_0_1px_rgba(255,214,224,0.08),0_0_12px_rgba(255,96,128,0.16)]">
            <BookOpen className="h-4 w-4 shrink-0 text-[#fff2f5] drop-shadow-[0_0_4px_rgba(255,120,132,0.42)]" />
          </span>
          <span className="[writing-mode:vertical-rl] rotate-180 text-[0.6rem] tracking-[0.26em] [text-shadow:0_1px_2px_rgba(0,0,0,0.8),0_0_4px_rgba(255,80,110,0.4)]">
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

export default function Layout({ children }: { children: React.ReactNode }) {
  const content = useLayoutContent({ children });
  return content;
}
