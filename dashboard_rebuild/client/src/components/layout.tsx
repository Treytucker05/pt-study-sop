import { useLocation } from "wouter";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from "react";
import {
  BookOpen,
  Save,
  Trash2,
  GripVertical,
  Pencil,
  X,
  Check,
  Menu,
  Palette,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import brainBackground from "@assets/BrainBackground.jpg";
import navShellBackground from "@assets/Dashboard Background image.png";
import navShellFrame from "@assets/Dashboard finished.png";
import logoImg from "@assets/StudyBrainIMAGE_1768640444498.jpg";
import navBrainLogo from "@assets/Brain by title.png";
import navBrainCustom from "@assets/nav-brain-custom.png";
import navScholarCustom from "@assets/nav-scholar-custom.png";
import navTutorCustom from "@assets/nav-tutor-custom.png";
import navLibraryCustom from "@assets/nav-library-custom.png";
import navMasteryCustom from "@assets/nav-mastery-custom.png";
import navCalendarCustom from "@assets/nav-calendar-custom.png";
import navMethodsCustom from "@assets/nav-methods-custom.png";
import navVaultCustom from "@assets/nav-vault-custom.png";
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

const NAV_REFERENCE_WIDTH = 1536;
const NAV_REFERENCE_HEIGHT = 1024;

const navGuidePlacementStyle = (
  x: number,
  y: number,
  width: number,
  height: number,
): CSSProperties => ({
  left: `${(x / NAV_REFERENCE_WIDTH) * 100}%`,
  top: `${(y / NAV_REFERENCE_HEIGHT) * 100}%`,
  width: `${(width / NAV_REFERENCE_WIDTH) * 100}%`,
  height: `${(height / NAV_REFERENCE_HEIGHT) * 100}%`,
});

// Playground export: 1440w × 325h hero
// CSS width% = % of parent width, height% = % of parent height
// widthPct from export is correct (% of 1440). heightPct must be recalculated as px/325.
type NavItem = {
  path: string;
  label: string;
  testId: string;
  tier: "primary" | "support";
  imageSrc: string;
  accentClass?: string;
  shellStyle: CSSProperties;
};

const PRIMARY_NAV_ITEMS: NavItem[] = [
  {
    path: "/",
    label: "BRAIN",
    testId: "brain",
    tier: "primary",
    imageSrc: navBrainCustom,
    accentClass: "drop-shadow-[0_0_18px_rgba(255,74,74,0.34)]",
    shellStyle: {
      left: "17.65%",
      top: "32.68%",
      width: "19.97%",
      height: "15.02%",
    } as CSSProperties,
  },
  {
    path: "/scholar",
    label: "SCHOLAR",
    testId: "scholar",
    tier: "primary",
    imageSrc: navScholarCustom,
    accentClass:
      "brightness-[1.02] saturate-[1.08] drop-shadow-[0_0_18px_rgba(255,164,92,0.34)]",
    shellStyle: {
      left: "39.99%",
      top: "31.60%",
      width: "19.97%",
      height: "15.02%",
    } as CSSProperties,
  },
  {
    path: "/tutor",
    label: "TUTOR",
    testId: "tutor",
    tier: "primary",
    imageSrc: navTutorCustom,
    accentClass:
      "brightness-[1.02] saturate-[1.08] drop-shadow-[0_0_18px_rgba(255,98,98,0.38)]",
    shellStyle: {
      left: "61.54%",
      top: "31.93%",
      width: "19.97%",
      height: "15.02%",
    } as CSSProperties,
  },
];

const SUPPORT_NAV_ITEMS: NavItem[] = [
  {
    path: "/library",
    label: "LIBRARY",
    testId: "library",
    tier: "support",
    imageSrc: navLibraryCustom,
    shellStyle: {
      left: "21.22%",
      top: "45.06%",
      width: "10.42%",
      height: "11.81%",
    } as CSSProperties,
  },
  {
    path: "/mastery",
    label: "MASTERY",
    testId: "mastery",
    tier: "support",
    imageSrc: navMasteryCustom,
    shellStyle: {
      left: "33.68%",
      top: "44.74%",
      width: "10.42%",
      height: "11.81%",
    } as CSSProperties,
  },
  {
    path: "/calendar",
    label: "CALENDAR",
    testId: "calendar",
    tier: "support",
    imageSrc: navCalendarCustom,
    shellStyle: {
      left: "45.04%",
      top: "44.95%",
      width: "10.42%",
      height: "11.81%",
    } as CSSProperties,
  },
  {
    path: "/methods",
    label: "METHODS",
    testId: "methods",
    tier: "support",
    imageSrc: navMethodsCustom,
    shellStyle: {
      left: "56.82%",
      top: "44.95%",
      width: "10.42%",
      height: "11.81%",
    } as CSSProperties,
  },
  {
    path: "/vault-health",
    label: "VAULT",
    testId: "vault",
    tier: "support",
    imageSrc: navVaultCustom,
    shellStyle: {
      left: "68.87%",
      top: "44.74%",
      width: "10.42%",
      height: "11.81%",
    } as CSSProperties,
  },
];

type NoteCategory = "notes" | "planned" | "ideas";

const NOTE_CATEGORIES: {
  value: NoteCategory;
  label: string;
  tabLabel: string;
}[] = [
  { value: "notes", label: "NOTES", tabLabel: "NOTES" },
  { value: "planned", label: "PLANNED IMPLEMENTATIONS", tabLabel: "PLANNED" },
  { value: "ideas", label: "IDEAS", tabLabel: "IDEAS" },
];

const NOTES_DOCK_STORAGE_KEY = "layout.notesDockTop.v1";
const NOTES_DOCK_MARGIN = 16;
const NOTES_DOCK_MIN_TOP = 96;
const NAV_BUILD_MARKER = "NAV 317.3";
const resolveNoteType = (note: Note): NoteCategory => {
  const raw = (note as Note & { noteType?: string }).noteType;
  if (raw === "planned" || raw === "ideas" || raw === "notes") {
    return raw;
  }
  return "notes";
};

const navButtonImageClass = (item: NavItem, isActive: boolean) =>
  cn(
    "pointer-events-none h-full w-full object-contain transition-[filter,opacity] duration-200 motion-reduce:transition-none",
    item.tier === "primary"
      ? isActive
        ? "brightness-[1.1] saturate-[1.2] drop-shadow-[0_0_24px_rgba(255,74,74,0.42)] group-hover:brightness-[1.14] group-hover:saturate-[1.24] group-hover:drop-shadow-[0_0_28px_rgba(255,74,74,0.5)]"
        : "opacity-[0.98] brightness-[0.97] saturate-[1.06] group-hover:opacity-100 group-hover:brightness-[1.07] group-hover:saturate-[1.14] group-hover:drop-shadow-[0_0_18px_rgba(255,96,96,0.3)]"
      : isActive
        ? "brightness-[1.08] saturate-[1.18] drop-shadow-[0_0_22px_rgba(255,74,74,0.42)] group-hover:brightness-[1.12] group-hover:saturate-[1.22] group-hover:drop-shadow-[0_0_24px_rgba(255,74,74,0.46)]"
        : "opacity-[0.92] brightness-[0.78] saturate-[0.84] group-hover:opacity-100 group-hover:brightness-100 group-hover:saturate-[1.08] group-hover:drop-shadow-[0_0_14px_rgba(255,74,74,0.28)]",
    item.accentClass,
  );

const navShellLinkClass = (item: NavItem, isActive: boolean) =>
  cn(
    "group absolute z-10 flex cursor-pointer items-center justify-center rounded-[1.4rem] pointer-events-auto",
    "after:pointer-events-none after:absolute after:inset-[8%] after:rounded-[1.2rem] after:border-0 after:transition-[border-color,box-shadow,opacity] after:duration-200",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
    item.tier === "primary"
      ? isActive
        ? "after:border-red-300/55 after:shadow-[0_0_16px_rgba(255,82,82,0.32)]"
        : "hover:after:border-red-300/35 hover:after:shadow-[0_0_14px_rgba(255,82,82,0.22)]"
      : isActive
        ? "after:border-red-300/45 after:shadow-[0_0_12px_rgba(255,82,82,0.24)]"
        : "hover:after:border-red-300/28 hover:after:shadow-[0_0_10px_rgba(255,82,82,0.18)]",
  );

const notesDockStyle = (top: number | null): CSSProperties => ({
  top: top === null ? "34%" : `${top}px`,
});

function BrainTitleChip({
  className = "h-12 w-12",
  imageClassName = "h-8 w-8",
}: {
  className?: string;
  imageClassName?: string;
}) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-full border border-red-500/60 bg-[radial-gradient(circle_at_35%_35%,rgba(255,255,255,0.18),rgba(0,0,0,0.82)_72%)] shadow-[0_0_18px_rgba(255,82,82,0.34),0_10px_20px_rgba(0,0,0,0.45)] backdrop-blur-md",
        className,
      )}
    >
      <img
        src={logoImg}
        alt=""
        aria-hidden="true"
        className={cn(
          "rounded-full object-cover grayscale-[0.08] saturate-[1.15]",
          imageClassName,
        )}
      />
    </span>
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
  const backdropImageClassName = isTutorPage
    ? "absolute inset-0 scale-[1.02] opacity-[0.56]"
    : "absolute inset-0 scale-[1.08] blur-[10px] opacity-[0.16]";
  const backdropImagePosition = isTutorPage
    ? "center center"
    : "center calc(60% + 76px)";
  const backdropGlowClassName = isTutorPage
    ? "absolute inset-0 bg-[radial-gradient(circle_at_50%_58%,rgba(255,92,120,0.08),transparent_18%),radial-gradient(circle_at_50%_72%,rgba(255,70,112,0.08),transparent_28%),linear-gradient(180deg,rgba(0,0,0,0.12),rgba(0,0,0,0.06)_24%,rgba(0,0,0,0.18)_64%,rgba(0,0,0,0.48)_100%)]"
    : "absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(255,78,116,0.08),transparent_16%),radial-gradient(circle_at_50%_64%,rgba(255,64,105,0.05),transparent_24%),linear-gradient(180deg,rgba(0,0,0,0.82),rgba(0,0,0,0.56)_18%,rgba(0,0,0,0.64)_60%,rgba(0,0,0,0.92)_100%)]";
  const backdropToneClassName = isTutorPage
    ? "absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.18),rgba(0,0,0,0.06)_22%,rgba(0,0,0,0.12)_54%,rgba(0,0,0,0.36)_100%)]"
    : "absolute inset-0 bg-[linear-gradient(180deg,rgba(5,5,8,0.86),rgba(5,5,8,0.4)_24%,rgba(5,5,8,0.58)_72%,rgba(5,5,8,0.9)_100%)]";
  const backdropTextureClassName = isTutorPage
    ? "absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,rgba(255,255,255,0.02),transparent_18%),linear-gradient(90deg,rgba(255,70,102,0.03),transparent_20%,transparent_80%,rgba(255,70,102,0.03))]"
    : "absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(255,255,255,0.02),transparent_18%),linear-gradient(90deg,rgba(255,70,102,0.03),transparent_24%,transparent_76%,rgba(255,70,102,0.03))]";
  const [newNote, setNewNote] = useState("");
  const [newNoteType, setNewNoteType] = useState<NoteCategory>("notes");
  const [activeTab, setActiveTab] = useState<"all" | NoteCategory>("all");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const editingInputRef = useRef<HTMLInputElement>(null);
  const [draggedNote, setDraggedNote] = useState<{
    id: number;
    type: NoteCategory;
  } | null>(null);
  const [dragOverNote, setDragOverNote] = useState<{
    id: number;
    type: NoteCategory;
  } | null>(null);
  const [dragOverCategory, setDragOverCategory] = useState<NoteCategory | null>(
    null,
  );
  const [notesOpen, setNotesOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [notesDockTop, setNotesDockTop] = useState<number | null>(null);
  const [isDraggingNotesDock, setIsDraggingNotesDock] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const notesDockRef = useRef<HTMLButtonElement | null>(null);
  const notesDockDragRef = useRef<{
    pointerId: number;
    offsetY: number;
    moved: boolean;
  } | null>(null);

  const clampNotesDockTop = useCallback((top: number) => {
    if (typeof window === "undefined") {
      return top;
    }
    const dockHeight = notesDockRef.current?.offsetHeight ?? 64;
    const maxTop = Math.max(
      NOTES_DOCK_MIN_TOP,
      window.innerHeight - dockHeight - NOTES_DOCK_MARGIN,
    );
    return Math.min(Math.max(top, NOTES_DOCK_MIN_TOP), maxTop);
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
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
      window.localStorage.setItem(
        NOTES_DOCK_STORAGE_KEY,
        String(Math.round(notesDockTop)),
      );
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
    (window as typeof window & { openTutor?: () => void }).openTutor = () =>
      setLocation("/tutor");
    return () => {
      delete (window as typeof window & { openTutor?: () => void }).openTutor;
    };
  }, [setLocation]);

  useEffect(() => {
    setMobileNavOpen(false);

    const main = document.querySelector("main");
    if (main) {
      main.scrollTop = 0;
    }
    window.scrollTo(0, 0);
  }, [currentPath]);

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
    notes: [...notesByType.notes].sort(
      (a, b) => (a.position ?? 0) - (b.position ?? 0),
    ),
    planned: [...notesByType.planned].sort(
      (a, b) => (a.position ?? 0) - (b.position ?? 0),
    ),
    ideas: [...notesByType.ideas].sort(
      (a, b) => (a.position ?? 0) - (b.position ?? 0),
    ),
  };

  const createNoteMutation = useMutation({
    mutationFn: api.notes.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      setNewNote("");
      toast({ title: "Note Saved" });
    },
    onError: (error: Error) => {
      toast({
        title: "Save failed",
        description: error.message || "Could not save note.",
        variant: "destructive",
      });
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
      toast({
        title: "Update failed",
        description: error.message || "Could not update note.",
        variant: "destructive",
      });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: api.notes.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      toast({ title: "Note Deleted" });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message || "Could not delete note.",
        variant: "destructive",
      });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: api.notes.reorder,
    onMutate: async (
      updates: { id: number; position: number; noteType?: NoteCategory }[],
    ) => {
      await queryClient.cancelQueries({ queryKey: ["notes"] });
      const previous = queryClient.getQueryData<Note[]>(["notes"]);
      if (!previous) return { previous };

      const updateMap = new Map(
        updates.map((item) => [
          item.id,
          { position: item.position, noteType: item.noteType },
        ]),
      );
      const next = previous.map((note) => {
        if (!updateMap.has(note.id)) return note;
        const update = updateMap.get(note.id);
        return {
          ...note,
          position: update?.position ?? note.position,
          noteType:
            update?.noteType ?? (note as Note & { noteType?: string }).noteType,
        };
      });

      const typeOrder: Record<NoteCategory, number> = {
        notes: 0,
        planned: 1,
        ideas: 2,
      };
      const resolvedType = (note: Note) => resolveNoteType(note);
      next.sort((a, b) => {
        const typeDiff =
          typeOrder[resolvedType(a)] - typeOrder[resolvedType(b)];
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

  const handleDragStart = (
    e: React.DragEvent,
    id: number,
    type: NoteCategory,
  ) => {
    setDraggedNote({ id, type });
    try {
      e.dataTransfer.setData("text/plain", String(id));
    } catch {
      // noop: some browsers restrict dataTransfer in certain contexts
    }
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (
    e: React.DragEvent,
    targetId: number,
    targetType: NoteCategory,
  ) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (draggedNote !== null && draggedNote.id !== targetId) {
      setDragOverNote({ id: targetId, type: targetType });
    }
  };

  const handleDropCore = (
    targetType: NoteCategory,
    targetId?: number | null,
  ) => {
    if (!draggedNote) return;

    const sourceType = draggedNote.type;
    const sourceNotes = [...sortedNotesByType[sourceType]];
    const draggedIndex = sourceNotes.findIndex((n) => n.id === draggedNote.id);
    if (draggedIndex === -1) return;

    const [draggedItem] = sourceNotes.splice(draggedIndex, 1);
    const targetNotes =
      sourceType === targetType
        ? sourceNotes
        : [...sortedNotesByType[targetType]];

    let insertIndex = targetNotes.length;
    if (typeof targetId === "number") {
      const targetIndex = targetNotes.findIndex((n) => n.id === targetId);
      if (targetIndex !== -1) insertIndex = targetIndex;
    }
    targetNotes.splice(insertIndex, 0, draggedItem);

    const updates: { id: number; position: number; noteType?: NoteCategory }[] =
      [];
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

  const handleDropOnNote = (
    e: React.DragEvent,
    targetId: number,
    targetType: NoteCategory,
  ) => {
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

  const handleDropOnCategory = (
    e: React.DragEvent,
    targetType: NoteCategory,
  ) => {
    e.preventDefault();
    if (!draggedNote) return;
    handleDropCore(targetType, null);
    setDraggedNote(null);
    setDragOverNote(null);
    setDragOverCategory(null);
  };

  const handleCategoryDragOver = (
    e: React.DragEvent,
    _targetType: NoteCategory,
  ) => {
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

  const handleNotesDockPointerDown = (
    event: React.PointerEvent<HTMLButtonElement>,
  ) => {
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

  const handleNotesDockPointerMove = (
    event: React.PointerEvent<HTMLButtonElement>,
  ) => {
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

  const handleNotesDockPointerUp = (
    event: React.PointerEvent<HTMLButtonElement>,
  ) => {
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
        "relative flex min-h-[100dvh] flex-col bg-transparent font-terminal text-foreground",
      )}
    >
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div
          className={backdropImageClassName}
          style={{
            backgroundImage: `url(${brainBackground})`,
            backgroundPosition: backdropImagePosition,
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
          }}
          aria-hidden="true"
        />
        <div className={backdropGlowClassName} />
        <div className={backdropToneClassName} />
        <div className={backdropTextureClassName} />
      </div>
      <div className="fixed inset-0 z-10 crt-overlay pointer-events-none" />

      {/* CRT Scanlines */}
      <div className="crt-scanlines" />

      {!isTutorPage ? (
        <a
          href="/theme-lab/index.html"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "pointer-events-auto fixed right-3 z-[60] min-h-0 gap-1.5 border-primary/45 bg-black/55 px-2.5 py-1.5 text-ui-xs uppercase tracking-[0.14em] shadow-[0_8px_24px_rgba(0,0,0,0.45)] backdrop-blur-sm max-lg:top-[4.75rem] lg:top-4 lg:px-3 lg:text-sm",
          )}
          aria-label="Open Theme Lab — HUD and token test page"
          data-testid="theme-lab-link"
        >
          <Palette className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
          <span className="hidden min-[420px]:inline" aria-hidden="true">
            Theme lab
          </span>
          <span className="inline min-[420px]:hidden" aria-hidden="true">
            Lab
          </span>
        </a>
      ) : null}

      {/* Top Nav — static header attached to normal page flow */}
      <header
        data-header-shell
        className="relative z-20 border-b-4 border-red-700 shadow-[0_10px_30px_rgba(220,38,38,0.4)]"
        data-header-state="expanded"
      >
        {/* Banner Image Background */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <img
            src={navShellBackground}
            alt="Nav Banner"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(220,38,38,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(220,38,38,0.05)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />
        </div>

        <div
          className={cn(
            "relative z-10 w-full px-2 pb-1 pt-2 sm:px-3 sm:pt-2.5 md:px-4",
          )}
        >
          <div className="flex min-w-0 justify-center lg:hidden">
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <div className="mx-auto w-full max-w-[42rem]">
                <div className="flex items-center gap-3 rounded-[1.2rem] border border-red-500/28 bg-[linear-gradient(180deg,rgba(18,0,0,0.92),rgba(6,0,0,0.96))] px-3 py-2.5 shadow-[0_0_18px_rgba(220,38,38,0.18),0_18px_36px_rgba(0,0,0,0.35)]">
                  <a
                    href="/"
                    onClick={(event) => handleNavActivate(event, "/")}
                    className="flex min-w-0 flex-1 items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                    aria-label="Trey's Study System"
                  >
                    <BrainTitleChip
                      className="h-10 w-10"
                      imageClassName="h-7 w-7"
                    />
                    <div className="min-w-0">
                      <div className="truncate font-arcade text-ui-sm uppercase tracking-[0.12em] text-[#fff4ed] [text-shadow:0_0_12px_rgba(255,108,108,0.42)]">
                        TREY&apos;S STUDY SYSTEM
                      </div>
                    </div>
                  </a>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 rounded-[0.95rem] border-red-500/45 bg-black/40 px-3 font-arcade text-ui-xs uppercase tracking-[0.16em] text-[#fff4ed] hover:bg-red-900/30"
                    onClick={() => setMobileNavOpen(true)}
                    data-testid="mobile-nav-trigger"
                    aria-label="Open study navigation"
                  >
                    <Menu className="mr-1.5 h-3.5 w-3.5" />
                    Menu
                  </Button>
                </div>
              </div>

              <SheetContent
                side="right"
                className="w-[min(88vw,22rem)] border-l-4 border-double border-primary bg-black/95 px-4 py-5 sm:px-5 lg:hidden"
              >
                <SheetTitle
                  className={cn(CONTROL_KICKER, "text-sm text-primary")}
                >
                  SYSTEM NAVIGATION
                </SheetTitle>
                <SheetDescription
                  className={cn(
                    CONTROL_COPY,
                    "mt-2 max-w-[18rem] text-sm leading-6 text-foreground/70",
                  )}
                >
                  Compact mobile command access while the desktop shell stays
                  reserved for larger screens.
                </SheetDescription>

                <div className="mt-5 space-y-5">
                  <div>
                    <div
                      className={cn(
                        CONTROL_KICKER,
                        "mb-2 text-ui-xs text-emerald-300/86",
                      )}
                    >
                      Core
                    </div>
                    <div className="space-y-2">
                      {PRIMARY_NAV_ITEMS.map((item) => {
                        const isActive = currentPath === item.path;
                        return (
                          <a
                            key={`mobile-${item.path}`}
                            href={item.path}
                            aria-current={isActive ? "page" : undefined}
                            onClick={(event) => {
                              handleNavActivate(event, item.path);
                              setMobileNavOpen(false);
                            }}
                            className={cn(
                              "flex items-center justify-between rounded-[1rem] border px-3 py-3 font-arcade text-ui-xs uppercase tracking-[0.16em] transition-colors",
                              isActive
                                ? "border-red-400/65 bg-red-900/30 text-white shadow-[0_0_14px_rgba(255,74,74,0.24)]"
                                : "border-red-900/45 bg-black/45 text-red-100/86 hover:border-red-500/55 hover:bg-red-950/35",
                            )}
                          >
                            <span>{item.label}</span>
                            <span className="font-mono text-xs uppercase tracking-[0.18em] text-emerald-300/80">
                              GO
                            </span>
                          </a>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div
                      className={cn(
                        CONTROL_KICKER,
                        "mb-2 text-ui-xs text-emerald-300/86",
                      )}
                    >
                      Support
                    </div>
                    <div className="space-y-2">
                      {SUPPORT_NAV_ITEMS.map((item) => {
                        const isActive = currentPath === item.path;
                        return (
                          <a
                            key={`mobile-${item.path}`}
                            href={item.path}
                            aria-current={isActive ? "page" : undefined}
                            onClick={(event) => {
                              handleNavActivate(event, item.path);
                              setMobileNavOpen(false);
                            }}
                            className={cn(
                              "flex items-center justify-between rounded-[1rem] border px-3 py-3 font-arcade text-ui-xs uppercase tracking-[0.16em] transition-colors",
                              isActive
                                ? "border-red-400/60 bg-red-900/28 text-white shadow-[0_0_12px_rgba(255,74,74,0.2)]"
                                : "border-red-900/40 bg-black/40 text-red-100/84 hover:border-red-500/50 hover:bg-red-950/30",
                            )}
                          >
                            <span>{item.label}</span>
                            <span className="font-mono text-xs uppercase tracking-[0.18em] text-emerald-300/75">
                              OPEN
                            </span>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <div
            className="hidden min-w-0 justify-center lg:flex"
            data-testid="nav-desktop-groups"
          >
            <div className="mx-auto w-full max-w-[1440px]">
              <div className="relative overflow-visible">
                {/* Brains — decorative, absolute, z-5 behind cockpit, no layout impact */}
                <a
                  href="/"
                  onClick={(event) => handleNavActivate(event, "/")}
                  aria-label="Home"
                  className="absolute z-[5] pointer-events-auto"
                  style={{
                    left: "-11%",
                    top: "-2rem",
                    width: "clamp(14rem, 24.28vw, 27.31rem)",
                    height: "clamp(14rem, 24.28vw, 27.31rem)",
                  }}
                >
                  <img
                    src={navBrainLogo}
                    alt=""
                    aria-hidden="true"
                    className="h-full w-full object-contain drop-shadow-[0_0_24px_rgba(255,82,82,0.6)]"
                  />
                </a>
                <a
                  href="/"
                  onClick={(event) => handleNavActivate(event, "/")}
                  aria-label="Home"
                  className="absolute z-[5] pointer-events-auto"
                  style={{
                    right: "-11%",
                    top: "-2rem",
                    width: "clamp(14rem, 24.28vw, 27.31rem)",
                    height: "clamp(14rem, 24.28vw, 27.31rem)",
                  }}
                >
                  <img
                    src={navBrainLogo}
                    alt=""
                    aria-hidden="true"
                    className="h-full w-full object-contain drop-shadow-[0_0_24px_rgba(255,82,82,0.6)]"
                  />
                </a>

                {/* Title text — in flow, centered, z-30 on top of everything */}
                <div className="relative z-30 flex justify-center pt-2 pb-0">
                  <a
                    href="/"
                    onClick={(event) => handleNavActivate(event, "/")}
                    aria-label="Trey's Study System"
                  >
                    <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[4.8rem] w-[50rem] rounded-full bg-[radial-gradient(circle,rgba(255,84,84,0.46),transparent_72%)] blur-3xl" />
                    <span
                      className="relative font-arcade uppercase leading-none whitespace-nowrap text-[#fff4ed] [text-shadow:0_0_18px_rgba(255,108,108,0.7),0_0_34px_rgba(255,92,92,0.28),0_5px_0_rgba(36,10,10,0.98)]"
                      style={{
                        fontSize: "clamp(2.06rem,3.42vw,3.18rem)",
                        letterSpacing: "0.11em",
                      }}
                    >
                      TREY&apos;S STUDY SYSTEM
                    </span>
                  </a>
                </div>

                {/* Cockpit shell — right below title, z-15 in front of brains */}
                <div
                  className="pointer-events-none relative z-[15] w-full h-[370px]"
                  style={{ marginTop: "-8rem" }}
                >
                  <div
                    className="absolute z-[5] left-1/2 -translate-x-1/2"
                    style={{
                      top: "-19.95%",
                      width: "90.42%",
                      height: "207.69%",
                    }}
                  >
                    <img
                      src={navShellFrame}
                      alt=""
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 h-full w-full object-contain select-none"
                    />

                    {[...PRIMARY_NAV_ITEMS, ...SUPPORT_NAV_ITEMS].map(
                      (item) => {
                        const isActive = currentPath === item.path;
                        return (
                          <a
                            key={item.path}
                            href={item.path}
                            onClick={(event) =>
                              handleNavActivate(event, item.path)
                            }
                            aria-current={isActive ? "page" : undefined}
                            data-testid={`nav-${item.testId}`}
                            className={navShellLinkClass(item, isActive)}
                            style={item.shellStyle}
                          >
                            <img
                              src={item.imageSrc}
                              alt={item.label}
                              className={navButtonImageClass(item, isActive)}
                            />
                          </a>
                        );
                      },
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <Sheet open={notesOpen} onOpenChange={setNotesOpen}>
        <SheetContent
          side="left"
          className="bg-black border-r-4 border-t-[3px] border-b-[3px] border-double border-primary w-[min(92vw,32rem)] sm:w-[30rem] lg:w-[34rem] shadow-2xl overflow-y-auto z-[100001] inset-y-3 h-auto [&>button]:hidden"
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
              <SheetTitle
                className={cn(CONTROL_KICKER, "text-sm text-primary")}
              >
                QUICK_NOTES
              </SheetTitle>
              <div
                className={cn(
                  CONTROL_COPY,
                  "text-sm leading-6 text-foreground/72",
                )}
              >
                Capture live notes, implementation ideas, and follow-ups without
                leaving the active route.
              </div>
            </div>
          </div>
          <SheetDescription className="sr-only">
            Quick notes panel
          </SheetDescription>
          <div className="flex flex-col gap-4">
            <div className={cn(CONTROL_DECK_SECTION, "space-y-3")}>
              <div className={CONTROL_KICKER}>Capture</div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className={controlToggleButton(
                    activeTab === "all",
                    "primary",
                    true,
                  )}
                  onClick={() => setActiveTab("all")}
                >
                  ALL
                </Button>
                {NOTE_CATEGORIES.map((category) => (
                  <Button
                    key={category.value}
                    size="sm"
                    variant="ghost"
                    className={controlToggleButton(
                      activeTab === category.value,
                      "secondary",
                      true,
                    )}
                    onClick={() => {
                      setActiveTab(category.value);
                      setNewNoteType(category.value);
                    }}
                  >
                    {category.tabLabel}
                  </Button>
                ))}
              </div>
              <Textarea
                placeholder="TYPE_NOTE_HERE..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="h-24 resize-none rounded-[1rem] border-primary/30 bg-black/45 font-mono text-sm leading-6 focus-visible:ring-primary"
                data-testid="input-note-content"
              />
              <Button
                className="w-full rounded-[1rem] font-arcade text-ui-xs"
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
                <div
                  className={cn(
                    CONTROL_COPY,
                    "text-sm leading-6 text-foreground/68",
                  )}
                >
                  {notes.length} total
                </div>
              </div>
              <ScrollArea className="h-[calc(100vh-280px)]">
                <div className="space-y-6 pr-2">
                  {NOTE_CATEGORIES.filter(
                    (c) => activeTab === "all" || c.value === activeTab,
                  ).map((category) => {
                    const sectionNotes = sortedNotesByType[category.value];
                    return (
                      <div
                        key={category.value}
                        className={cn(
                          "space-y-2 rounded-none border border-transparent p-1",
                          dragOverCategory === category.value &&
                            "border-primary/70 bg-primary/5",
                        )}
                        onDragOver={(e) =>
                          handleCategoryDragOver(e, category.value)
                        }
                        onDragEnter={() =>
                          handleCategoryDragEnter(category.value)
                        }
                        onDragLeave={() =>
                          handleCategoryDragLeave(category.value)
                        }
                        onDrop={(e) => handleDropOnCategory(e, category.value)}
                      >
                        <div
                          className={cn(
                            CONTROL_KICKER,
                            "text-ui-xs text-foreground/66",
                          )}
                        >
                          {category.label} ({sectionNotes.length})
                        </div>
                        <div
                          className={cn(
                            "space-y-2 min-h-[72px] rounded-[1rem] border border-transparent p-1",
                            dragOverCategory === category.value &&
                              "border-primary/40",
                          )}
                          onDragOver={(e) =>
                            handleCategoryDragOver(e, category.value)
                          }
                          onDragEnter={() =>
                            handleCategoryDragEnter(category.value)
                          }
                          onDragLeave={() =>
                            handleCategoryDragLeave(category.value)
                          }
                          onDrop={(e) =>
                            handleDropOnCategory(e, category.value)
                          }
                        >
                          {sectionNotes.map((note) => (
                            <div
                              key={note.id}
                              draggable
                              onDragStart={(e) =>
                                handleDragStart(e, note.id, category.value)
                              }
                              onDragOver={(e) =>
                                handleDragOver(e, note.id, category.value)
                              }
                              onDrop={(e) =>
                                handleDropOnNote(e, note.id, category.value)
                              }
                              onDragEnd={handleDragEnd}
                              data-testid={`card-note-${note.id}`}
                              className={cn(
                                "cursor-move rounded-[0.95rem] border border-[rgba(255,122,146,0.18)] bg-black/40 p-3 shadow-[0_10px_20px_rgba(0,0,0,0.18)] transition-all",
                                draggedNote?.id === note.id && "opacity-50",
                                dragOverNote?.id === note.id &&
                                  dragOverNote?.type === category.value &&
                                  "border-primary border-2",
                              )}
                            >
                              {editingId === note.id ? (
                                <div className="space-y-2">
                                  <Input
                                    ref={editingInputRef}
                                    value={editingContent}
                                    onChange={(e) =>
                                      setEditingContent(e.target.value)
                                    }
                                    className="rounded-[0.85rem] border-primary bg-black/60 font-mono text-sm"
                                  />
                                  <div className="flex gap-1">
                                    <Button
                                      size="sm"
                                      className="h-8 flex-1 rounded-[0.85rem] font-arcade text-ui-xs"
                                      onClick={() =>
                                        updateNoteMutation.mutate({
                                          id: note.id,
                                          data: { content: editingContent },
                                        })
                                      }
                                    >
                                      <Check className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 rounded-[0.85rem] font-arcade text-ui-xs"
                                      onClick={() => setEditingId(null)}
                                    >
                                      <X className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-start gap-2">
                                  <GripVertical className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                                  <div className="flex-1 font-mono text-sm leading-6 whitespace-pre-wrap break-words text-foreground/88">
                                    {note.content}
                                  </div>
                                  <div className="flex gap-1 shrink-0">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 w-8 rounded-[0.85rem] p-0 hover:bg-primary/20"
                                      onClick={() => {
                                        setEditingId(note.id);
                                        setEditingContent(note.content);
                                      }}
                                      data-testid={`button-edit-note-${note.id}`}
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 w-8 rounded-[0.85rem] p-0 text-red-400 hover:bg-red-500/20"
                                      onClick={() =>
                                        deleteNoteMutation.mutate(note.id)
                                      }
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
                            <div className="py-4 text-center font-mono text-sm leading-6 text-foreground/62">
                              No {category.value} yet
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {notes.length === 0 && (
                    <div className="py-4 text-center font-mono text-sm leading-6 text-foreground/62">
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
          "fixed left-0 z-40 flex h-[3.75rem] w-[2.65rem] -translate-y-1/2 items-center justify-center overflow-hidden rounded-r-[1rem] border border-l-0 border-[rgba(255,122,146,0.28)] px-1 py-1.5 text-[#ffd6dd] shadow-[0_14px_28px_rgba(0,0,0,0.48),0_0_0_1px_rgba(255,108,138,0.2)] transition-all duration-200 ease-out",
          "before:absolute before:inset-[1px_0_1px_1px] before:rounded-r-[0.9rem] before:border before:border-[rgba(255,184,204,0.12)] before:bg-[linear-gradient(180deg,rgba(8,6,7,0.8),rgba(0,0,0,0.86)_100%)] before:content-['']",
          "after:pointer-events-none after:absolute after:inset-y-2 after:right-1 after:w-[2px] after:rounded-full after:bg-[linear-gradient(180deg,transparent,rgba(255,122,146,0.8),transparent)] after:shadow-[0_0_10px_rgba(255,102,132,0.42)] after:content-['']",
          "hover:text-white hover:translate-x-0.5 hover:shadow-[0_18px_32px_rgba(0,0,0,0.56),0_0_12px_rgba(255,102,132,0.16)]",
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
        <div className="relative z-10 flex items-center justify-center">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.9rem] border border-[rgba(255,164,184,0.42)] bg-[radial-gradient(circle_at_30%_0%,rgba(255,255,255,0.22),transparent_40%),linear-gradient(180deg,rgba(255,112,140,0.2),rgba(12,4,6,0.96))] shadow-[inset_0_0_0_1px_rgba(255,214,224,0.08),0_0_12px_rgba(255,96,128,0.16)]">
            <BookOpen className="h-4 w-4 shrink-0 text-[#fff2f5] drop-shadow-[0_0_4px_rgba(255,120,132,0.42)]" />
          </span>
        </div>
      </button>

      {/* Hero portal — PageScaffold renders the page hero here, outside main */}
      <div id="page-hero-portal" className="relative z-10" />

      <main
        className={cn(
          "relative z-10 w-full flex-1",
          isWorkspaceRoute ? "" : "px-2 py-3 sm:px-3 md:px-5 md:py-4",
        )}
      >
        <div
          className={cn(
            "page-enter",
            isWorkspaceRoute
              ? "min-h-full flex flex-col"
              : "app-route-shell min-h-full",
          )}
        >
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="z-20 border-t border-secondary bg-black/95 py-2">
        <div className="container mx-auto px-4 flex justify-between items-center text-xs text-muted-foreground font-terminal">
          <div className="flex gap-4">
            <span>
              STATUS: <span className="text-primary">ONLINE</span>
            </span>
            <span>
              SYNC: <span className="text-white">{currentTime}</span>
            </span>
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
