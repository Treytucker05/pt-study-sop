import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ComponentProps } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TutorArtifacts, type TutorArtifact } from "@/components/TutorArtifacts";
import type { TutorSessionSummary } from "@/lib/api";

const { getSessionSummaryMock } = vi.hoisted(() => ({
  getSessionSummaryMock: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  api: {
    tutor: {
      getSessionSummary: getSessionSummaryMock,
    },
  },
}));

function renderArtifacts(props?: Partial<ComponentProps<typeof TutorArtifacts>>) {
  const queryClient = new QueryClient();

  const defaultRecentSessions: TutorSessionSummary[] = [
    {
      id: 1,
      session_id: "sess-1",
      course_id: 1,
      phase: "first_pass",
      mode: "Core",
      topic: "Hip flexors",
      status: "active",
      turn_count: 3,
      started_at: new Date("2026-01-01T10:00:00Z").toISOString(),
      ended_at: null,
    },
  ];

  const defaultProps: ComponentProps<typeof TutorArtifacts> = {
    sessionId: "sess-active",
    artifacts: [] as TutorArtifact[],
    turnCount: 0,
    topic: "Topic",
    startedAt: new Date("2026-01-01T10:00:00Z").toISOString(),
    onCreateArtifact: vi.fn(),
    recentSessions: defaultRecentSessions,
    onResumeSession: vi.fn(),
  };

  const merged = { ...defaultProps, ...props };

  render(
    <QueryClientProvider client={queryClient}>
      <TutorArtifacts {...merged} />
    </QueryClientProvider>
  );

  return merged;
}

describe("TutorArtifacts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionSummaryMock.mockResolvedValue({
      session_id: "sess-active",
      topic: "Topic",
      duration_seconds: 600,
      turn_count: 3,
      artifact_count: 2,
      objectives_covered: [],
      chain_progress: null,
    });
  });

  it("does not resume session when row checkbox is toggled", () => {
    const onResumeSession = vi.fn();
    renderArtifacts({ onResumeSession });

    const checkboxes = screen.getAllByRole("checkbox");
    // Last checkbox corresponds to the row selector for the visible session.
    fireEvent.click(checkboxes[checkboxes.length - 1]);

    expect(onResumeSession).not.toHaveBeenCalled();
  });

  it("does not resume session when row checkbox is toggled by keyboard", () => {
    const onResumeSession = vi.fn();
    renderArtifacts({ onResumeSession });

    const checkboxes = screen.getAllByRole("checkbox");
    const rowCheckbox = checkboxes[checkboxes.length - 1];
    fireEvent.keyDown(rowCheckbox, { key: " " });

    expect(onResumeSession).not.toHaveBeenCalled();
  });

  it("resumes session when session row is clicked", () => {
    const onResumeSession = vi.fn();
    renderArtifacts({ onResumeSession });

    fireEvent.click(screen.getByText("Hip flexors"));

    expect(onResumeSession).toHaveBeenCalledWith("sess-1");
  });

  it("shows partial artifact delete details when the API skips indexes", async () => {
    const onDeleteArtifacts = vi.fn().mockResolvedValue({
      request_id: "req-123",
      requested_count: 2,
      applied_count: 1,
      skipped_indexes: [1],
    });

    renderArtifacts({
      sessionId: "sess-active",
      artifacts: [
        {
          type: "note",
          title: "Artifact 1",
          content: "one",
          createdAt: new Date("2026-01-01T10:00:00Z").toISOString(),
        },
        {
          type: "note",
          title: "Artifact 2",
          content: "two",
          createdAt: new Date("2026-01-01T10:01:00Z").toISOString(),
        },
      ],
      recentSessions: [],
      onDeleteArtifacts,
    });

    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]);
    fireEvent.click(screen.getByText(/^Delete$/));
    const confirmModal = screen.getByText(/confirm delete/i).closest("div")?.parentElement;
    expect(confirmModal).not.toBeNull();
    fireEvent.click(within(confirmModal as HTMLElement).getByRole("button", { name: /^delete$/i }));

    await waitFor(() => {
      expect(screen.getByText(/request_id req-123/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/skipped indexes 1/i)).toBeInTheDocument();
  });

  it("renders the session wrap panel when a completed session is open", async () => {
    getSessionSummaryMock.mockResolvedValue({
      session_id: "sess-active",
      topic: "Topic",
      duration_seconds: 900,
      turn_count: 4,
      artifact_count: 1,
      objectives_covered: [{ id: "OBJ-1", name: "Hip flexion", status: "covered" }],
      chain_progress: { current_block: 2, total_blocks: 4, chain_name: "Prime Chain" },
    });

    renderArtifacts({
      sessionId: "sess-active",
      isSessionCompleted: true,
      recentSessions: [],
    });

    expect(await screen.findByText(/session wrap/i)).toBeInTheDocument();
    expect(screen.getByText(/hip flexion/i)).toBeInTheDocument();
    expect(screen.getByText(/prime chain/i)).toBeInTheDocument();
  });
});
