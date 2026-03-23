import { useState, useCallback, useRef, useEffect, type ReactElement, type ReactNode } from "react";
import { WorkspaceTopBar, type WorkspaceMode } from "@/components/workspace/WorkspaceTopBar";
import { WorkspaceCanvas } from "@/components/WorkspaceCanvas";
import { useWorkspaceLayout } from "@/hooks/useWorkspaceLayout";
import type { PacketItem } from "@/components/workspace/PacketPanel";

// ── Props ────────────────────────────────────────────────────────────

export interface WorkspaceStudioProps {
  courseId: number | null;
  courseName: string | null;
  courses: Array<{ id: number; name: string }>;
  onCourseChange: (courseId: number) => void;
  selectedMaterialIds: number[];
  activeSessionId: string | null;
  workflowId: string | null;
  /** Slot for injecting the TutorChat component */
  tutorChatSlot?: ReactNode;
}

// ── Helpers ──────────────────────────────────────────────────────────

let _packetIdCounter = 0;
function nextPacketId(): string {
  _packetIdCounter += 1;
  return `pkt-${_packetIdCounter}`;
}

// ── Component ────────────────────────────────────────────────────────

export function WorkspaceStudio({
  courseId: _courseId,
  courseName,
  courses,
  onCourseChange,
  selectedMaterialIds: _selectedMaterialIds,
  activeSessionId: _activeSessionId,
  workflowId: _workflowId,
  tutorChatSlot: _tutorChatSlot,
}: WorkspaceStudioProps): ReactElement {
  // ── Workspace mode ───────────────────────────────────────────────
  const [mode, setMode] = useState<WorkspaceMode>("prep");

  // ── Workspace name ───────────────────────────────────────────────
  const [workspaceName, setWorkspaceName] = useState("Untitled workspace");

  // ── Packet items ─────────────────────────────────────────────────
  const [packetItems, setPacketItems] = useState<PacketItem[]>([]);

  const addPacketItem = useCallback(
    (item: Omit<PacketItem, "id" | "addedAt">) => {
      const full: PacketItem = {
        ...item,
        id: nextPacketId(),
        addedAt: new Date().toISOString(),
      };
      setPacketItems((prev) => [...prev, full]);
    },
    [],
  );

  const removePacketItem = useCallback((id: string) => {
    setPacketItems((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // ── Timer ────────────────────────────────────────────────────────
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerPaused, setTimerPaused] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (timerPaused) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    timerRef.current = setInterval(() => {
      setTimerSeconds((s) => s + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerPaused]);

  const handleToggleTimer = useCallback(() => {
    setTimerPaused((p) => !p);
  }, []);

  // ── Layout save/load ─────────────────────────────────────────────
  const { saveLayout, loadLayout } = useWorkspaceLayout();

  const handleSaveLayout = useCallback(
    (slot: number) => {
      // WorkspaceCanvas manages its own panels internally for now;
      // we save a stub so the slot shows as occupied.
      saveLayout(slot, [], workspaceName);
    },
    [saveLayout, workspaceName],
  );

  const handleLoadLayout = useCallback(
    (slot: number) => {
      const _layout = loadLayout(slot);
      // Future: apply loaded layout to WorkspaceCanvas panels
    },
    [loadLayout],
  );

  // ── Start Tutor handler ──────────────────────────────────────────
  const handleStartTutor = useCallback(() => {
    setMode("tutor");
  }, []);

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div data-testid="workspace-studio" className="flex flex-1 flex-col min-h-0">
      <WorkspaceTopBar
        mode={mode}
        onModeChange={setMode}
        courseName={courseName}
        courses={courses}
        onCourseChange={onCourseChange}
        workspaceName={workspaceName}
        onWorkspaceNameChange={setWorkspaceName}
        onStartTutor={handleStartTutor}
        timerSeconds={timerSeconds}
        timerPaused={timerPaused}
        onToggleTimer={handleToggleTimer}
        onSaveLayout={handleSaveLayout}
        onLoadLayout={handleLoadLayout}
      />
      <WorkspaceCanvas />
    </div>
  );
}

// Re-export types consumers may need
export type { WorkspaceMode } from "@/components/workspace/WorkspaceTopBar";
export type { PacketItem } from "@/components/workspace/PacketPanel";
