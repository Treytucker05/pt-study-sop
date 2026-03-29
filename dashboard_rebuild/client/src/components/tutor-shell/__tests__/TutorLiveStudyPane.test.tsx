import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

import { TutorLiveStudyPane } from "@/components/tutor-shell/TutorLiveStudyPane";

vi.mock("@/components/TutorChat", () => ({
  TutorChat: ({
    onTurnComplete,
  }: {
    onTurnComplete?: (payload?: {
      masteryUpdate?: { skill_id: string; new_mastery: number; correct: boolean };
      compactionTelemetry?: Record<string, unknown> | null;
    }) => void;
  }) => (
    <button
      type="button"
      onClick={() =>
        onTurnComplete?.({
          masteryUpdate: {
            skill_id: "cardio-preload",
            new_mastery: 0.82,
            correct: true,
          },
          compactionTelemetry: {
            pressureLevel: "medium",
          },
        })
      }
    >
      Complete Tutor turn
    </button>
  ),
}));

vi.mock("@/components/TutorEmptyState", () => ({
  TutorEmptyState: () => <div data-testid="tutor-empty-state" />,
}));

vi.mock("@/components/tutor-shell/TutorEndSessionDialog", () => ({
  TutorEndSessionDialog: () => null,
}));

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("TutorLiveStudyPane", () => {
  it("invalidates mastery data when a Tutor turn returns a mastery update", async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    });
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
    const session = {
      handleArtifactCreated: vi.fn(),
      handleStudioCapture: vi.fn(),
      stageTimerDisplaySeconds: 0,
      stageTimerRunning: false,
      toggleWorkflowStudyTimer: vi.fn(),
      commitAssistantMessage: vi.fn(),
      setTurnCount: vi.fn(),
    };
    const onCompactionTelemetry = vi.fn();

    render(
      <TutorLiveStudyPane
        activeSessionId="sess-study-004"
        hub={
          {
            courseId: 1,
            chatMaterials: [],
            selectedMaterials: [],
            accuracyProfile: "balanced",
            setAccuracyProfile: vi.fn(),
            setSelectedMaterials: vi.fn(),
            refreshChatMaterials: vi.fn(),
          } as never
        }
        session={session as never}
        workflow={
          {
            captureWorkflowMessageNote: vi.fn(),
            saveWorkflowMessageFeedback: vi.fn(),
            saveWorkflowNoteToVault: vi.fn(),
            quickCompactWorkflowMemory: vi.fn(),
            createWorkflowMemoryCapsule: vi.fn(),
            openWorkflowPolish: vi.fn(),
            activeWorkflowId: null,
            savingRuntimeEvent: false,
          } as never
        }
        restoredTurns={undefined}
        onStartSession={vi.fn()}
        onSaveGist={vi.fn()}
        onPromoteTutorReplyToPolish={vi.fn()}
        onCompactionTelemetry={onCompactionTelemetry}
        submitBrainFeedback={vi.fn()}
      />,
      { wrapper: createWrapper(queryClient) },
    );

    fireEvent.click(screen.getByRole("button", { name: /complete tutor turn/i }));

    await waitFor(() => {
      expect(session.setTurnCount).toHaveBeenCalledTimes(1);
      expect(onCompactionTelemetry).toHaveBeenCalledWith({
        pressureLevel: "medium",
      });
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["mastery-dashboard"],
      });
    });
  });
});
