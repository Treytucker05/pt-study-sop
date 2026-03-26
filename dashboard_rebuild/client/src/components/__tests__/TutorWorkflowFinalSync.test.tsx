import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getObsidianStatusMock = vi.fn();
const getAnkiStatusMock = vi.fn();
const saveFileMock = vi.fn();
const createPublishResultMock = vi.fn();
const updateWorkflowStageMock = vi.fn();
const createWorkflowCardDraftsMock = vi.fn();
const ankiSyncMock = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    obsidian: {
      getStatus: (...args: unknown[]) => getObsidianStatusMock(...args),
      saveFile: (...args: unknown[]) => saveFileMock(...args),
    },
    anki: {
      getStatus: (...args: unknown[]) => getAnkiStatusMock(...args),
      sync: (...args: unknown[]) => ankiSyncMock(...args),
    },
    tutor: {
      createPublishResult: (...args: unknown[]) => createPublishResultMock(...args),
      updateWorkflowStage: (...args: unknown[]) => updateWorkflowStageMock(...args),
      createWorkflowCardDrafts: (...args: unknown[]) => createWorkflowCardDraftsMock(...args),
    },
  },
}));

import { TutorWorkflowFinalSync } from "@/components/TutorWorkflowFinalSync";
import type { TutorWorkflowDetailResponse } from "@/api.types";

function makeWorkflowDetail(): TutorWorkflowDetailResponse {
  return {
    workflow: {
      workflow_id: "workflow-123",
      course_id: 77,
      course_name: "Cardiology",
      assignment_title: "Cardiac Output",
      study_unit: "Hemodynamics",
      topic: "Cardiac Output",
      current_stage: "final_sync",
      status: "polish_complete",
    },
    priming_bundle: null,
    captured_notes: [],
    feedback_events: [],
    stage_time_logs: [],
    memory_capsules: [],
    publish_results: [],
    polish_bundle: {
      id: 901,
      summaries: [],
      exact_notes: [],
      editable_notes: [],
      card_requests: [],
      reprime_requests: [],
      publish_targets: {
        obsidian: true,
        anki: false,
      },
      studio_payload: {
        artifacts: [],
      },
    },
  } as TutorWorkflowDetailResponse;
}

function renderFinalSync() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  return render(
    <QueryClientProvider client={client}>
      <TutorWorkflowFinalSync
        workflowDetail={makeWorkflowDetail()}
        onBackToPolish={() => undefined}
      />
    </QueryClientProvider>,
  );
}

describe("TutorWorkflowFinalSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getObsidianStatusMock.mockResolvedValue({ connected: true });
    getAnkiStatusMock.mockResolvedValue({ connected: true });
    saveFileMock.mockResolvedValue({
      success: true,
      path: "Courses/Cardiology/Tutor Workflow/Cardiac Output.md",
    });
    createPublishResultMock.mockResolvedValue({ id: 1 });
    updateWorkflowStageMock.mockResolvedValue({ ok: true });
    createWorkflowCardDraftsMock.mockResolvedValue({ drafts: [], errors: [] });
    ankiSyncMock.mockResolvedValue({ output: "ok" });
  });

  it("requires explicit confirmation before final sync can run", async () => {
    renderFinalSync();

    const runButton = await screen.findByRole("button", { name: /run final sync/i });
    expect(runButton).toBeDisabled();
    expect(saveFileMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("checkbox", { name: /i confirm final sync/i }));

    expect(runButton).not.toBeDisabled();
  });

  it("runs final sync after confirmation is armed", async () => {
    renderFinalSync();

    fireEvent.click(await screen.findByRole("checkbox", { name: /i confirm final sync/i }));
    fireEvent.click(screen.getByRole("button", { name: /run final sync/i }));

    await waitFor(() => {
      expect(saveFileMock).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(createPublishResultMock).toHaveBeenCalledWith(
        "workflow-123",
        expect.objectContaining({
          polish_bundle_id: 901,
        }),
      );
    });
    await waitFor(() => {
      expect(updateWorkflowStageMock).toHaveBeenCalledWith("workflow-123", {
        current_stage: "final_sync",
        status: "stored",
      });
    });
  });
});
