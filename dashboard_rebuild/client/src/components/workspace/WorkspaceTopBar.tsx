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
  onSaveLayout?: (slot: number) => void;
  onLoadLayout?: (slot: number) => void;
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
  onSaveLayout,
  onLoadLayout,
}: WorkspaceTopBarProps): React.ReactElement {
  const [localName, setLocalName] = React.useState(workspaceName);

  React.useEffect(() => {
    setLocalName(workspaceName);
  }, [workspaceName]);

  const handleBlur = (): void => {
    onWorkspaceNameChange(localName);
  };

  const handleSlotClick = (
    slot: number,
    e: React.MouseEvent,
  ): void => {
    if (e.shiftKey) {
      onSaveLayout?.(slot);
    } else {
      onLoadLayout?.(slot);
    }
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
        {Array.from({ length: layoutSlots }, (_, i) => i + 1).map((slot) => (
          <Button
            key={slot}
            data-testid={`layout-slot-${slot}`}
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 font-arcade text-xs"
            onClick={(e) => handleSlotClick(slot, e)}
            aria-label={`Layout slot ${slot}`}
          >
            {slot}
          </Button>
        ))}
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
