import { Pencil, Network, Table2, Layers } from "lucide-react";
import { COURSE_FOLDERS } from "@/config/courses";
import { cn } from "@/lib/utils";
import type { BrainWorkspace, MainMode } from "./useBrainWorkspace";

const MODES: { id: MainMode; label: string; icon: typeof Pencil }[] = [
 { id: "edit", label: "EDIT", icon: Pencil },
 { id: "graph", label: "GRAPH", icon: Network },
 { id: "table", label: "TABLE", icon: Table2 },
 { id: "anki", label: "ANKI", icon: Layers },
];

interface BrainToolbarProps {
 workspace: BrainWorkspace;
 currentFolder: string;
 onFolderChange: (folder: string) => void;
}

export function BrainToolbar({ workspace, currentFolder, onFolderChange }: BrainToolbarProps) {
 const segments = currentFolder ? currentFolder.split("/") : [];

 return (
  <div className="brain-workspace__top-bar h-12 px-3 flex items-center gap-4 border-b shrink-0 z-10" style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-1)', backdropFilter: 'blur(12px)' }}>
   <div className="flex items-center gap-1 shrink-0">
    {COURSE_FOLDERS.map((course) => {
     const isActive = currentFolder === course.path;
     return (
      <button
       key={course.id}
       type="button"
       onClick={() => onFolderChange(course.path)}
       className={cn(
        "h-7 px-2.5 text-xs font-[var(--font-clean)] rounded-none border-[3px] border-double transition-all duration-150",
        isActive
         ? "bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] border-[hsl(var(--primary)/0.3)]"
         : "border-[var(--border-subtle)] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[var(--surface-2)] hover:border-[var(--border-muted)]"
       )}
      >
       {course.name}
      </button>
     );
    })}
   </div>

   <div className="flex items-center gap-0.5 shrink-0 rounded-none p-0.5" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-subtle)' }}>
    {MODES.map((mode) => {
     const Icon = mode.icon;
     const isActive = workspace.mainMode === mode.id;
     return (
      <button
       key={mode.id}
       type="button"
       onClick={() => workspace.setMainMode(mode.id)}
       className={cn(
        "h-7 px-2.5 flex items-center gap-1.5 text-xs font-[var(--font-clean)] rounded-none transition-all duration-150",
        isActive
         ? "bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]"
         : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[var(--surface-3)]"
       )}
      >
       <Icon className="w-3.5 h-3.5 shrink-0" />
       <span className="hidden lg:inline">{mode.label}</span>
       {mode.id === "anki" && workspace.pendingDrafts.length > 0 && (
        <span className="ml-0.5 px-1 text-[10px] bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))] rounded-none">
         {workspace.pendingDrafts.length}
        </span>
       )}
      </button>
     );
    })}
   </div>

   <div className="flex items-center gap-1 min-w-0 overflow-hidden ml-auto">
    {segments.length > 0 && (
     <nav className="flex items-center gap-0.5 min-w-0 text-sm font-[var(--font-clean)]">
      {segments.map((seg, i) => (
       <span key={i} className="flex items-center gap-0.5 shrink-0">
        {i > 0 && <span className="text-[hsl(var(--muted-foreground))] opacity-40">/</span>}
        <button
         type="button"
         onClick={() => onFolderChange(segments.slice(0, i + 1).join("/"))}
         className={cn(
          "px-1 hover:text-[hsl(var(--primary))] transition-colors truncate max-w-[120px]",
          i === segments.length - 1 ? "text-[hsl(var(--foreground))]" : "text-[hsl(var(--muted-foreground))]"
         )}
        >
         {seg}
        </button>
       </span>
      ))}
     </nav>
    )}

    <div className="flex items-center gap-3 ml-4 shrink-0">
     <span className="flex items-center gap-1.5">
      <span
       className={cn(
        "w-1.5 h-1.5 rounded-full",
        workspace.obsidianStatus?.connected ? "bg-green-500" : "bg-red-500"
       )}
      />
      <span className="text-xs text-[hsl(var(--muted-foreground))] hidden sm:inline">Obsidian</span>
     </span>
     <span className="flex items-center gap-1.5">
      <span
       className={cn(
        "w-1.5 h-1.5 rounded-full",
        workspace.ankiStatus?.connected ? "bg-green-500" : "bg-red-500"
       )}
      />
      <span className="text-xs text-[hsl(var(--muted-foreground))] hidden sm:inline">Anki</span>
     </span>
    </div>
   </div>
  </div>
 );
}
