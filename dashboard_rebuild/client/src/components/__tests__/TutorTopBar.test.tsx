import type { ComponentProps, ReactNode } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import { TutorTopBar } from "@/components/TutorTopBar";
import type { TutorTeachRuntimeViewModel } from "@/components/TutorChat.types";

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    api: {
      ...actual.api,
      tutor: {
        ...actual.api.tutor,
        getSession: vi.fn(),
      },
    },
  };
});

const teachRuntime: TutorTeachRuntimeViewModel = {
  packetSource: "mixed",
  stage: { label: "Current stage", value: "TEACH", status: "live" },
  conceptType: {
    label: "Concept type",
    value: "Mechanism",
    status: "fallback",
  },
  bridge: { label: "Current bridge", value: "Analogy", status: "live" },
  depth: {
    label: "Depth lane",
    value: "L3 mechanism live",
    current: "L3 mechanism",
    start: "L0 hook",
    ceiling: "L4 precision",
    status: "fallback",
  },
  requiredArtifact: {
    label: "Close artifact",
    value: "Mini process flow",
    status: "live",
  },
  functionConfirmation: {
    label: "Function confirmation",
    value: "Function not confirmed",
    confirmed: false,
    status: "pending",
  },
  l4Unlock: {
    label: "L4 unlock",
    value: "L4 locked",
    unlocked: false,
    status: "locked",
  },
  mnemonic: {
    label: "Mnemonic slot",
    value: "KWIK Lite available",
    status: "available",
  },
  note: "Some TEACH packet fields are live, and the rest are inferred from the active block.",
  missingBackendFields: [
    "teach_packet.concept_type",
    "teach_packet.current_depth",
  ],
};

const previousSessions = [
  {
    id: 2,
    session_id: "sess-recent",
    course_id: 7,
    phase: "first_pass" as const,
    topic: "Renal Review",
    status: "active" as const,
    turn_count: 6,
    started_at: "2026-03-20T15:15:00Z",
    ended_at: null,
  },
  {
    id: 1,
    session_id: "sess-complete",
    course_id: 8,
    phase: "first_pass" as const,
    topic: "Cardio Drill",
    status: "completed" as const,
    turn_count: 3,
    started_at: "2026-03-18T13:00:00Z",
    ended_at: "2026-03-18T13:35:00Z",
  },
  {
    id: 3,
    session_id: "sess-abandoned",
    course_id: 8,
    phase: "first_pass" as const,
    topic: "Abandoned Mechanics",
    status: "abandoned" as const,
    turn_count: 1,
    started_at: "2026-03-17T11:00:00Z",
    ended_at: "2026-03-17T11:10:00Z",
  },
];

const courses = [
  { id: 7, name: "Neuro" },
  { id: 8, name: "Cardio" },
];

const courseMap: Record<number, string> = {
  7: "Neuro",
  8: "Cardio",
};

function renderTutorTopBar(
  overrides: Partial<ComponentProps<typeof TutorTopBar>> = {},
) {
  const onResumeSession = overrides.onResumeSession ?? vi.fn();
  const onDeleteSession = overrides.onDeleteSession ?? vi.fn();
  const props: ComponentProps<typeof TutorTopBar> = {
    isTutorSessionView: false,
    brainLaunchContext: null,
    topic: "Neuro",
    turnCount: 3,
    startedAt: "2026-03-20T15:00:00Z",
    hasChain: false,
    currentBlock: null,
    isChainComplete: false,
    blockTimerSeconds: null,
    timerPaused: false,
    progressCount: 0,
    chainBlocksLength: 0,
    formatTimer: (seconds) => `${seconds}s`,
    onSetTimerPaused: vi.fn(),
    onAdvanceBlock: vi.fn(),
    activeWorkflowDetail: undefined,
    teachRuntime: null,
    previousSessions,
    previousSessionsLoading: false,
    courses,
    courseMap,
    onResumeSession,
    onDeleteSession,
    ...overrides,
  };

  function TestWrapper({ children }: { children: ReactNode }) {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    });
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }

  return {
    onDeleteSession,
    onResumeSession,
    ...render(<TutorTopBar {...props} />, { wrapper: TestWrapper }),
  };
}

describe("TutorTopBar", () => {
  it("renders the live TEACH runtime rail", () => {
    renderTutorTopBar({
      isTutorSessionView: true,
      hasChain: true,
      currentBlock: {
        id: 9,
        name: "Teach the corticospinal mechanism",
        category: "TEACH",
        control_stage: "TEACH",
        description: "Explain one mechanism chunk.",
        duration: 12,
        facilitation_prompt: "Use analogy then process flow.",
      },
      isChainComplete: false,
      blockTimerSeconds: 420,
      timerPaused: false,
      progressCount: 2,
      chainBlocksLength: 5,
      teachRuntime,
    });

    const runtime = screen.getByTestId("tutor-teach-runtime");
    expect(runtime).toBeInTheDocument();
    expect(
      within(runtime).getByText(/Live TEACH Runtime/i),
    ).toBeInTheDocument();
    expect(within(runtime).getByText(/Concept type/i)).toBeInTheDocument();
    expect(within(runtime).getByText(/^Mechanism$/i)).toBeInTheDocument();
    expect(
      within(runtime).getAllByText(/KWIK Lite available/i).length,
    ).toBeGreaterThan(0);
    expect(
      within(runtime).getByText(
        /Waiting on backend fields: teach_packet\.concept_type, teach_packet\.current_depth/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("workspace-tab-bar"),
    ).not.toBeInTheDocument();
  });

  it("does not show the live-session badge when the backend session is not validated active", () => {
    renderTutorTopBar();

    expect(screen.queryByText("LIVE SESSION")).not.toBeInTheDocument();
  });

  it("renders the previous sessions toggle", () => {
    renderTutorTopBar();

    expect(
      screen.getByRole("button", { name: /previous sessions/i }),
    ).toBeInTheDocument();
  });

  it("expands the accordion and shows session rows", () => {
    renderTutorTopBar();

    fireEvent.click(screen.getByRole("button", { name: /previous sessions/i }));

    expect(screen.getByTestId("tutor-previous-sessions")).toBeInTheDocument();
    expect(screen.getByText("Renal Review")).toBeInTheDocument();
    expect(screen.getByText("Cardio Drill")).toBeInTheDocument();
  });

  it("calls onResumeSession with the selected session id", () => {
    const onResumeSession = vi.fn();
    renderTutorTopBar({ onResumeSession });

    fireEvent.click(screen.getByRole("button", { name: /previous sessions/i }));
    fireEvent.click(
      screen.getByRole("button", {
        name: /resume previous session renal review neuro/i,
      }),
    );

    expect(onResumeSession).toHaveBeenCalledWith("sess-recent");
  });

  it("collapses the accordion on a second toggle click", () => {
    renderTutorTopBar();

    const toggle = screen.getByRole("button", { name: /previous sessions/i });
    fireEvent.click(toggle);
    expect(screen.getByTestId("tutor-previous-sessions")).toBeInTheDocument();

    fireEvent.click(toggle);

    expect(
      screen.queryByTestId("tutor-previous-sessions"),
    ).not.toBeInTheDocument();
  });

  it("filters previous sessions by search text", () => {
    renderTutorTopBar();

    fireEvent.click(screen.getByRole("button", { name: /previous sessions/i }));
    fireEvent.change(screen.getByRole("textbox", { name: /search previous sessions/i }), {
      target: { value: "renal" },
    });

    expect(screen.getByText("Renal Review")).toBeInTheDocument();
    expect(screen.queryByText("Cardio Drill")).not.toBeInTheDocument();
    expect(screen.queryByText("Abandoned Mechanics")).not.toBeInTheDocument();
  });

  it("filters previous sessions by course", () => {
    renderTutorTopBar();

    fireEvent.click(screen.getByRole("button", { name: /previous sessions/i }));
    fireEvent.change(screen.getByRole("combobox", { name: /filter previous sessions by course/i }), {
      target: { value: "8" },
    });

    expect(screen.queryByText("Renal Review")).not.toBeInTheDocument();
    expect(screen.getByText("Cardio Drill")).toBeInTheDocument();
    expect(screen.getByText("Abandoned Mechanics")).toBeInTheDocument();
  });

  it("filters previous sessions by status", () => {
    renderTutorTopBar();

    fireEvent.click(screen.getByRole("button", { name: /previous sessions/i }));
    fireEvent.change(screen.getByRole("combobox", { name: /filter previous sessions by status/i }), {
      target: { value: "abandoned" },
    });

    expect(screen.queryByText("Renal Review")).not.toBeInTheDocument();
    expect(screen.queryByText("Cardio Drill")).not.toBeInTheDocument();
    expect(screen.getByText("Abandoned Mechanics")).toBeInTheDocument();
  });

  it("shows the course name in each session row", () => {
    renderTutorTopBar();

    fireEvent.click(screen.getByRole("button", { name: /previous sessions/i }));

    // active session → Resume label
    expect(
      screen.getByRole("button", {
        name: /resume previous session renal review neuro/i,
      }),
    ).toBeInTheDocument();
    // completed session → View label (not Resume)
    expect(
      screen.getByRole("button", {
        name: /view previous session cardio drill cardio/i,
      }),
    ).toBeInTheDocument();
  });

  it("confirms and deletes the selected session without resuming it", () => {
    const onDeleteSession = vi.fn();
    const onResumeSession = vi.fn();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderTutorTopBar({ onDeleteSession, onResumeSession });

    fireEvent.click(screen.getByRole("button", { name: /previous sessions/i }));
    fireEvent.click(
      screen.getByRole("button", {
        name: /delete previous session renal review/i,
      }),
    );

    expect(confirmSpy).toHaveBeenCalled();
    expect(onDeleteSession).toHaveBeenCalledWith("sess-recent");
    expect(onResumeSession).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  // ─── View mode tests ───

  it("shows VIEW button on completed session row, not RESUME", () => {
    renderTutorTopBar();

    fireEvent.click(screen.getByRole("button", { name: /previous sessions/i }));

    expect(
      screen.getByRole("button", { name: /view previous session cardio drill cardio/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /resume previous session cardio drill cardio/i }),
    ).not.toBeInTheDocument();
  });

  it("shows RESUME button on active session row", () => {
    renderTutorTopBar();

    fireEvent.click(screen.getByRole("button", { name: /previous sessions/i }));

    expect(
      screen.getByRole("button", { name: /resume previous session renal review neuro/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /view previous session renal review neuro/i }),
    ).not.toBeInTheDocument();
  });

  it("shows VIEW button on abandoned session row, not RESUME", () => {
    renderTutorTopBar();

    fireEvent.click(screen.getByRole("button", { name: /previous sessions/i }));

    expect(
      screen.getByRole("button", { name: /view previous session abandoned mechanics cardio/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /resume previous session abandoned mechanics cardio/i }),
    ).not.toBeInTheDocument();
  });

  it("clicking VIEW on completed session does not call onResumeSession", () => {
    const onResumeSession = vi.fn();
    renderTutorTopBar({ onResumeSession });

    fireEvent.click(screen.getByRole("button", { name: /previous sessions/i }));
    fireEvent.click(
      screen.getByRole("button", { name: /view previous session cardio drill cardio/i }),
    );

    expect(onResumeSession).not.toHaveBeenCalled();
  });

  it("clicking VIEW on completed session opens a dialog with the topic", () => {
    renderTutorTopBar();

    fireEvent.click(screen.getByRole("button", { name: /previous sessions/i }));
    fireEvent.click(
      screen.getByRole("button", { name: /view previous session cardio drill cardio/i }),
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText(/cardio drill/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/3 turns/i)).toBeInTheDocument();
  });

  it("VIEW dialog fetches the session transcript and renders question + answer pairs", async () => {
    const { api } = await import("@/lib/api");
    const getSessionMock = vi.mocked(api.tutor.getSession);
    getSessionMock.mockResolvedValueOnce({
      session_id: "sess-complete",
      id: 1,
      brain_session_id: null,
      course_id: 8,
      content_filter_json: null,
      content_filter: { material_ids: [] },
      status: "completed",
      phase: "first_pass",
      topic: "Cardio Drill",
      turn_count: 2,
      started_at: "2026-03-18T13:00:00Z",
      ended_at: "2026-03-18T13:35:00Z",
      method_chain_id: null,
      current_block_index: 0,
      chain_blocks: [],
      artifacts_json: "[]",
      turns: [
        {
          id: 1,
          turn_number: 1,
          question: "What's the primary determinant of cardiac output?",
          answer: "Stroke volume times heart rate.",
          citations_json: null,
          phase: "first_pass",
          artifacts_json: null,
          created_at: "2026-03-18T13:01:00Z",
        },
        {
          id: 2,
          turn_number: 2,
          question: "How does preload affect stroke volume?",
          answer: "Higher preload stretches sarcomeres, increasing contractile force.",
          citations_json: null,
          phase: "first_pass",
          artifacts_json: null,
          created_at: "2026-03-18T13:05:00Z",
        },
      ],
    } as never);

    renderTutorTopBar();

    fireEvent.click(screen.getByRole("button", { name: /previous sessions/i }));
    fireEvent.click(
      screen.getByRole("button", { name: /view previous session cardio drill cardio/i }),
    );

    await waitFor(() => {
      expect(getSessionMock).toHaveBeenCalledWith("sess-complete");
    });

    const dialog = await screen.findByRole("dialog");
    await waitFor(() => {
      expect(within(dialog).getByText(/primary determinant of cardiac output/i)).toBeInTheDocument();
    });
    expect(within(dialog).getByText(/stroke volume times heart rate/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/preload affect stroke volume/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/sarcomeres/i)).toBeInTheDocument();
  });
});
