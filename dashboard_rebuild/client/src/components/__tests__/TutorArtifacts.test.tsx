import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import type { ComponentProps } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TutorArtifacts, type TutorArtifact } from "@/components/TutorArtifacts";
import type { TutorSessionSummary } from "@/lib/api";

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
});
