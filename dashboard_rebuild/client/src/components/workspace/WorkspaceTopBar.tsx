import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type WorkspaceMode = "prep" | "tutor" | "polish";

export interface SlotInfo {
  slot: number;
  savedAt: string | null;
  name?: string;
}

export interface WorkspaceTopBarProps {
  mode: WorkspaceMode;
  onModeChange: (mode: WorkspaceMode) => void;
  courseName: string | null;
  courses: Array<{ id: number; name: string }>;
  onCourseChange: (courseId: number) => void;
  workspaceName: string;
  onWorkspaceNameChange: (name: string) => void;
  onStartTutor: () => void;
  timerSeconds: number;
  timerPaused: boolean;
  onToggleTimer: () => void;
  layoutSlots?: number;
  slotInfo?: SlotInfo[];
  onSaveLayout?: (slot: number, name: string) => void;
  onLoadLayout?: (slot: number) => void;
  onClearSlot?: (slot: number) => void;
}

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function WorkspaceTopBar({
  mode,
  onModeChange,
  courseName,
  courses,
  onCourseChange,
  workspaceName,
  onWorkspaceNameChange,
  onStartTutor,
  timerSeconds,
  timerPaused,
  onToggleTimer,
  layoutSlots = 5,
  slotInfo,
  onSaveLayout,
  onLoadLayout,
  onClearSlot,
}: WorkspaceTopBarProps): React.ReactElement {
  const [localName, setLocalName] = React.useState(workspaceName);

  React.useEffect(() => {
    setLocalName(workspaceName);
  }, [workspaceName]);

  const handleBlur = (): void => {
    onWorkspaceNameChange(localName);
  };

  const handleSlotClick = (slot: number): void => {
    const info = slotInfo?.find((s) => s.slot === slot);
    if (info?.savedAt) {
      onLoadLayout?.(slot);
    }
  };

  const handleSlotContextMenu = (
    slot: number,
    e: React.MouseEvent,
  ): void => {
    e.preventDefault();
    const name = window.prompt("Layout name:", workspaceName);
    if (name !== null) {
      onSaveLayout?.(slot, name || `Layout ${slot}`);
    }
  };

  const handleClearSlot = (
    slot: number,
    e: React.MouseEvent,
  ): void => {
    e.stopPropagation();
    onClearSlot?.(slot);
  };

  const selectedCourseId = courses.find((c) => c.name === courseName)?.id;

  return (
    <div className="flex items-center gap-3 border-b border-primary/20 bg-background/80 px-3 py-1.5 font-terminal">
      {/* Course selector */}
      <Select
        value={selectedCourseId != null ? String(selectedCourseId) : undefined}
        onValueChange={(val) => onCourseChange(Number(val))}
      >
        <SelectTrigger
          data-testid="course-selector"
          className="h-8 w-[180px] text-sm"
        >
          <SelectValue placeholder="Select course" />
        </SelectTrigger>
        <SelectContent>
          {courses.map((c) => (
            <SelectItem key={c.id} value={String(c.id)}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Workspace name */}
      <Input
        data-testid="workspace-name-input"
        value={localName}
        onChange={(e) => setLocalName(e.target.value)}
        onBlur={handleBlur}
        className="h-8 w-[160px] text-sm"
      />

      <div className="h-5 w-px bg-primary/20" />

      {/* Mode selector */}
      <Select
        value={mode}
        onValueChange={(val) => onModeChange(val as WorkspaceMode)}
      >
        <SelectTrigger
          data-testid="mode-selector"
          className="h-8 w-[120px] text-sm uppercase"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="prep">PREP</SelectItem>
          <SelectItem value="tutor">TUTOR</SelectItem>
          <SelectItem value="polish">POLISH</SelectItem>
        </SelectContent>
      </Select>

      <div className="h-5 w-px bg-primary/20" />

      {/* Timer */}
      <div className="flex items-center gap-1">
        <span
          data-testid="timer-display"
          className="font-arcade text-sm tabular-nums text-primary"
        >
          {formatTimer(timerSeconds)}
        </span>
        <Button
          data-testid="timer-toggle"
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-xs"
          onClick={onToggleTimer}
          aria-label={timerPaused ? "Resume timer" : "Pause timer"}
        >
          {timerPaused ? "\u25B6" : "\u23F8"}
        </Button>
      </div>

      <div className="h-5 w-px bg-primary/20" />

      {/* Layout slots */}
      <div className="flex items-center gap-1">
        {Array.from({ length: layoutSlots }, (_, i) => {
          const slot = i + 1;
          const info = slotInfo?.find((s) => s.slot === slot);
          const isEmpty = !info?.savedAt;
          const label = isEmpty ? "Empty" : (info?.name ?? `Layout ${slot}`);

          return (
            <div key={slot} className="relative group">
              <Button
                data-testid={`layout-slot-${slot}`}
                variant={isEmpty ? "ghost" : "outline"}
                size="sm"
                className={`h-7 min-w-[4rem] px-2 font-arcade text-xs truncate ${
                  isEmpty
                    ? "opacity-50 hover:opacity-80"
                    : "border-primary/40 text-primary hover:bg-primary/10"
                }`}
                onClick={() => handleSlotClick(slot)}
                onContextMenu={(e) => handleSlotContextMenu(slot, e)}
                aria-label={`Layout slot ${slot}: ${label}`}
                title={isEmpty ? "Right-click to save" : `${label} - Right-click to overwrite`}
              >
                {label}
              </Button>
              {!isEmpty && onClearSlot && (
                <button
                  data-testid={`layout-slot-${slot}-clear`}
                  type="button"
                  className="absolute -top-1 -right-1 hidden group-hover:flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] leading-none"
                  onClick={(e) => handleClearSlot(slot, e)}
                  aria-label={`Clear layout slot ${slot}`}
                >
                  x
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="h-5 w-px bg-primary/20" />

      {/* Start Tutor */}
      <Button
        data-testid="start-tutor-btn"
        variant="default"
        size="sm"
        className="h-8 font-arcade text-xs uppercase"
        onClick={onStartTutor}
      >
        Start Tutor &rarr;
      </Button>
    </div>
  );
}
