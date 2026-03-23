import { useState, useCallback, useRef, useEffect, type ReactElement, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { WorkspaceTopBar, type WorkspaceMode } from "@/components/workspace/WorkspaceTopBar";
import { WorkspaceCanvas } from "@/components/WorkspaceCanvas";
import { useWorkspaceLayout } from "@/hooks/useWorkspaceLayout";
import type { PacketItem } from "@/components/workspace/PacketPanel";
import type { ChainMode } from "@/components/workspace/TutorChatPanel";

// ── Chain selection payload ──────────────────────────────────────────

export interface ChainSelection {
  chainMode: ChainMode;
  /** Template chain id (template mode) */
  chainId: number | null;
  /** Solo method id (solo mode) */
  methodId: string | null;
}

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
  /** Called when the user clicks "Start Tutor". Receives the chain selection from the picker. */
  onStartTutorSession?: (chain: ChainSelection) => Promise<void>;
  /** Available chain templates for the template-mode picker */
  availableChains?: Array<{ id: number; title: string; block_count: number }>;
  /** Available methods for the solo-mode picker */
  availableMethods?: Array<{ id: number; method_id: string; title: string }>;
  /** Called when the user ends the tutor session */
  onEndSession?: () => Promise<void>;
}

// ── Helpers ──────────────────────────────────────────────────────────

function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

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
  onStartTutorSession,
  availableChains = [],
  availableMethods = [],
  onEndSession,
}: WorkspaceStudioProps): ReactElement {
  // ── Workspace mode ───────────────────────────────────────────────
  const [mode, setMode] = useState<WorkspaceMode>("prep");

  // ── Chain picker state ─────────────────────────────────────────
  const [chainMode, setChainMode] = useState<ChainMode>("solo");
  const [selectedChainId, setSelectedChainId] = useState<number | null>(null);
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);

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
  const { saveLayout, loadLayout, getSlotInfo, clearSlot } = useWorkspaceLayout();

  const [slotInfo, setSlotInfo] = useState(getSlotInfo());

  const refreshSlotInfo = useCallback(() => {
    setSlotInfo(getSlotInfo());
  }, [getSlotInfo]);

  const handleSaveLayout = useCallback(
    (slot: number, name: string) => {
      // WorkspaceCanvas manages its own panels internally for now;
      // we save a stub so the slot shows as occupied.
      saveLayout(slot, [], name);
      refreshSlotInfo();
    },
    [saveLayout, refreshSlotInfo],
  );

  const handleLoadLayout = useCallback(
    (slot: number) => {
      const _layout = loadLayout(slot);
      // Future: apply loaded layout to WorkspaceCanvas panels
    },
    [loadLayout],
  );

  const handleClearSlot = useCallback(
    (slot: number) => {
      clearSlot(slot);
      refreshSlotInfo();
    },
    [clearSlot, refreshSlotInfo],
  );

  // ── Start Tutor handler ──────────────────────────────────────────
  const [startingTutor, setStartingTutor] = useState(false);

  const handleStartTutor = useCallback(async () => {
    if (onStartTutorSession) {
      setStartingTutor(true);
      try {
        await onStartTutorSession({
          chainMode,
          chainId: selectedChainId,
          methodId: selectedMethodId,
        });
        setMode("tutor");
      } catch (err) {
        toast.error(
          `Failed to start tutor: ${err instanceof Error ? err.message : "Unknown error"}`,
        );
      } finally {
        setStartingTutor(false);
      }
    } else {
      // Fallback: just switch mode without session creation
      setMode("tutor");
    }
  }, [onStartTutorSession, chainMode, selectedChainId, selectedMethodId]);

  // ── End Session + summary modal ─────────────────────────────────
  const [endingSession, setEndingSession] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [finalDuration, setFinalDuration] = useState(0);

  const handleEndSession = useCallback(async () => {
    setEndingSession(true);
    try {
      if (onEndSession) {
        await onEndSession();
      }
      // Capture the timer value at time of ending
      setFinalDuration(timerSeconds);
      // Pause the timer
      setTimerPaused(true);
      setShowEndModal(true);
    } catch (err) {
      toast.error(
        `Failed to end session: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    } finally {
      setEndingSession(false);
    }
  }, [onEndSession, timerSeconds]);

  const handleGoToPolish = useCallback(() => {
    setShowEndModal(false);
    setMode("polish");
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
        startingTutor={startingTutor}
        timerSeconds={timerSeconds}
        timerPaused={timerPaused}
        onToggleTimer={handleToggleTimer}
        slotInfo={slotInfo}
        onSaveLayout={handleSaveLayout}
        onLoadLayout={handleLoadLayout}
        onClearSlot={handleClearSlot}
        onEndSession={onEndSession ? handleEndSession : undefined}
        endingSession={endingSession}
      />
      <WorkspaceCanvas courseId={_courseId} selectedMaterialIds={_selectedMaterialIds} />

      {/* End Session Summary Modal */}
      <Dialog open={showEndModal} onOpenChange={setShowEndModal}>
        <DialogContent className="sm:max-w-md font-terminal">
          <DialogTitle className="font-arcade text-lg uppercase tracking-wide">
            Session Complete
          </DialogTitle>
          <DialogDescription className="sr-only">
            Summary of your completed tutor session
          </DialogDescription>
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between rounded-md border border-primary/20 px-4 py-3">
              <span className="text-sm text-muted-foreground">Duration</span>
              <span className="font-arcade text-lg tabular-nums text-primary">
                {formatDuration(finalDuration)}
              </span>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowEndModal(false)}
            >
              Close
            </Button>
            <Button
              data-testid="go-to-polish-btn"
              variant="default"
              size="sm"
              className="font-arcade text-xs uppercase"
              onClick={handleGoToPolish}
            >
              Go to Polish
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Re-export types consumers may need
export type { WorkspaceMode } from "@/components/workspace/WorkspaceTopBar";
export type { PacketItem } from "@/components/workspace/PacketPanel";
export type { ChainMode } from "@/components/workspace/TutorChatPanel";
