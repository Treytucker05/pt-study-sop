import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TutorWorkflowPolishStudio } from "@/components/TutorWorkflowPolishStudio";
import type {
  TutorCapturedNote,
  TutorFeedbackEvent,
  TutorMemoryCapsule,
  TutorPolishBundle,
  TutorWorkflowSummary,
} from "@/api.types";
import type { StudioPolishPromotedNote } from "@/lib/studioPacketSections";

const runPolishAssistMock = vi.fn();

vi.mock("@/components/TutorWorkspaceSurface", () => ({
  TutorWorkspaceSurface: () => (
    <div data-testid="tutor-workspace-surface">workspace tools</div>
  ),
}));

vi.mock("@/lib/api", () => ({
  api: {
    tutor: {
      runPolishAssist: (...args: unknown[]) => runPolishAssistMock(...args),
    },
  },
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

function renderPolishStudio({
  promotedNotes = [],
  capturedNotes = [],
  feedbackEvents = [],
  memoryCapsules = [],
  existingBundle = null,
  onSaveDraft = vi.fn(),
}: {
  promotedNotes?: StudioPolishPromotedNote[];
  capturedNotes?: TutorCapturedNote[];
  feedbackEvents?: TutorFeedbackEvent[];
  memoryCapsules?: TutorMemoryCapsule[];
  existingBundle?: TutorPolishBundle | null;
  onSaveDraft?: ReturnType<typeof vi.fn>;
} = {}) {
  const workflow = {
    workflow_id: "wf-polish",
    course_name: "Exercise Physiology",
    assignment_title: "Hemodynamics",
    active_tutor_session_id: "sess-polish",
  } as unknown as TutorWorkflowSummary;

  return {
    onSaveDraft,
    ...render(
      <TutorWorkflowPolishStudio
        workflow={workflow}
        primingBundleId={12}
        promotedNotes={promotedNotes}
        capturedNotes={capturedNotes}
        feedbackEvents={feedbackEvents}
        memoryCapsules={memoryCapsules}
        existingBundle={existingBundle}
        isSaving={false}
        onBackToTutor={vi.fn()}
        onSaveDraft={onSaveDraft}
        onFinalize={vi.fn()}
      />,
    ),
  };
}

describe("TutorWorkflowPolishStudio", () => {
  beforeEach(() => {
    runPolishAssistMock.mockReset();
  });

  it("shows promoted tutor replies in the review queue and uses them as the summary fallback", async () => {
    renderPolishStudio({
      promotedNotes: [
        {
          id: "assistant-1",
          title: "Tutor Reply 1",
          content: "Venous return drives preload during the session.",
          badge: "TUTOR",
        },
      ],
    });

    expect(await screen.findByText("Tutor Reply 1")).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("Venous return drives preload during the session."),
    ).toBeInTheDocument();
  });

  it("restores persisted promoted tutor replies from the saved polish bundle and keeps them in save payloads", async () => {
    const user = userEvent.setup();
    const onSaveDraft = vi.fn();

    renderPolishStudio({
      existingBundle: {
        id: 44,
        workflow_id: "wf-polish",
        tutor_session_id: "sess-polish",
        priming_bundle_id: 12,
        exact_notes: [],
        editable_notes: [],
        summaries: [],
        feedback_queue: [],
        card_requests: [],
        reprime_requests: [],
        studio_payload: {
          promoted_notes: [
            {
              id: "assistant-7",
              title: "Tutor Reply 7",
              content: "Cardiac output equals stroke volume times heart rate.",
              badge: "TUTOR",
            },
          ],
        },
        publish_targets: {},
        status: "draft",
        created_at: "2026-03-29T00:00:00Z",
        updated_at: "2026-03-29T00:00:00Z",
      } as TutorPolishBundle,
      onSaveDraft,
    });

    expect(await screen.findByText("Tutor Reply 7")).toBeInTheDocument();
    expect(
      screen.getByDisplayValue(
        "Cardiac output equals stroke volume times heart rate.",
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /save polish draft/i }));

    expect(onSaveDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        studio_payload: expect.objectContaining({
          promoted_notes: [
            expect.objectContaining({
              id: "assistant-7",
              title: "Tutor Reply 7",
              content: "Cardiac output equals stroke volume times heart rate.",
            }),
          ],
        }),
      }),
    );
  });
});
