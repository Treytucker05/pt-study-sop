import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { StudioClassDetail } from "@/components/StudioClassDetail";

const { getStudioOverviewMock, getAllChainsMock } = vi.hoisted(() => ({
  getStudioOverviewMock: vi.fn(),
  getAllChainsMock: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  api: {
    tutor: {
      getStudioOverview: getStudioOverviewMock,
    },
    chains: {
      getAll: getAllChainsMock,
    },
  },
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}));

function renderDetail(props?: Partial<React.ComponentProps<typeof StudioClassDetail>>) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <StudioClassDetail
        courseId={201}
        onLaunchSession={vi.fn()}
        onDrillToWorkspace={vi.fn()}
        {...props}
      />
    </QueryClientProvider>,
  );
}

describe("StudioClassDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getStudioOverviewMock.mockResolvedValue({
      course: {
        id: 201,
        name: "Neuro",
        code: "DPT-720",
        term: "Spring 2026",
        instructor: null,
        default_study_mode: null,
        delivery_format: null,
      },
      shell: {
        workspace_state: {
          active_tutor_session_id: null,
          last_mode: "studio",
          active_board_scope: "project",
          active_board_id: null,
          viewer_state: null,
          selected_material_ids: [11],
          revision: 3,
          updated_at: "2026-03-15T12:00:00Z",
        },
        continuation: {
          can_resume: false,
          active_tutor_session_id: null,
          last_mode: "studio",
        },
        active_session: null,
        recent_sessions: [
          {
            id: 1,
            session_id: "tutor-neuro-1",
            course_id: 201,
            phase: "first_pass",
            topic: "Brainstem Review",
            status: "active",
            turn_count: 4,
            started_at: "2026-03-15T12:00:00Z",
            ended_at: null,
          },
        ],
        counts: {
          active_sessions: 1,
          session_count: 3,
          studio_total_items: 5,
          studio_captured_items: 2,
          studio_promoted_items: 1,
          pending_schedule_events: 2,
        },
      },
      materials: [
        {
          id: 11,
          title: "A Notes",
          source_path: "/tmp/a-notes.txt",
          folder_path: null,
          file_type: "txt",
          file_size: 100,
          course_id: 201,
          enabled: true,
          extraction_error: null,
          checksum: null,
          created_at: "2026-03-10T00:00:00Z",
          updated_at: null,
        },
        {
          id: 22,
          title: "Z Slides",
          source_path: "/tmp/z-slides.pdf",
          folder_path: null,
          file_type: "pdf",
          file_size: 200,
          course_id: 201,
          enabled: true,
          extraction_error: null,
          checksum: null,
          created_at: "2026-03-11T00:00:00Z",
          updated_at: null,
        },
      ],
      objectives: [
        {
          id: 301,
          courseId: 201,
          moduleId: null,
          loCode: "LO-1",
          title: "Explain brainstem pathways",
          status: "in_progress",
          lastSessionId: null,
          lastSessionDate: null,
          nextAction: null,
          groupName: "Unit 1",
          managedByTutor: true,
          createdAt: "2026-03-10T00:00:00Z",
          updatedAt: "2026-03-10T00:00:00Z",
        },
      ],
      card_drafts: {
        items: [
          {
            id: 401,
            sessionId: "legacy-session",
            tutorSessionId: null,
            courseId: 201,
            deckName: "Deck Alpha",
            cardType: "basic",
            front: "Direct course draft",
            back: "Back",
            tags: "",
            status: "draft",
            createdAt: "2026-03-15T11:00:00Z",
          },
        ],
        counts: {
          total: 1,
          draft: 1,
          approved: 0,
          synced: 0,
          rejected: 0,
        },
      },
      vault_resources: {
        items: [
          {
            id: 501,
            course_id: 201,
            tutor_session_id: null,
            scope: "project",
            item_type: "note",
            source_kind: "studio",
            title: "Promoted Note",
            body_markdown: "Saved note",
            source_path: null,
            source_locator: null,
            payload: null,
            status: "promoted",
            promoted_from_id: 400,
            version: 1,
            deleted_at: null,
            created_at: "2026-03-15T10:00:00Z",
            updated_at: "2026-03-15T10:00:00Z",
          },
        ],
        counts: { total: 1 },
      },
      recent_activity: [
        {
          id: "action:601",
          kind: "studio_action",
          title: "PROMOTE",
          subtitle: "project",
          status: "completed",
          created_at: "2026-03-15T10:30:00Z",
          tutor_session_id: "tutor-neuro-1",
        },
        {
          id: "session:tutor-neuro-1",
          kind: "session",
          title: "Brainstem Review",
          subtitle: "FIRST PASS",
          status: "active",
          created_at: "2026-03-15T09:00:00Z",
          tutor_session_id: "tutor-neuro-1",
        },
      ],
    });
    getAllChainsMock.mockResolvedValue([
      {
        id: 1,
        name: "Top-Down Narrative",
        description: "Narrative chain",
        block_ids: [10, 20],
        context_tags: {},
        created_at: "2026-03-15T00:00:00Z",
        is_template: 1,
      },
    ]);
  });

  it("renders the overview-backed header and material tab", async () => {
    const onLaunchSession = vi.fn();
    const onDrillToWorkspace = vi.fn();

    renderDetail({ onLaunchSession, onDrillToWorkspace });

    expect(await screen.findByText("DPT-720 — Neuro")).toBeInTheDocument();
    expect(screen.getByText("2 materials · 1 cards")).toBeInTheDocument();
    expect(screen.getByText("A Notes")).toBeInTheDocument();
    expect(screen.getByText("Z Slides")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /workspace/i }));
    fireEvent.click(screen.getByRole("button", { name: /launch session/i }));

    expect(onDrillToWorkspace).toHaveBeenCalledOnce();
    expect(onLaunchSession).toHaveBeenCalledOnce();
  });

  it("renders objectives, cards, and vault from the overview contract", async () => {
    renderDetail();

    expect(await screen.findByText("DPT-720 — Neuro")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /objectives/i }));
    expect(await screen.findByText(/LO-1 — Explain brainstem pathways/i)).toBeInTheDocument();
    expect(screen.getByText("Unit 1")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /cards & tests/i }));
    expect(await screen.findByText("Direct course draft")).toBeInTheDocument();
    expect(screen.getByText(/Deck Alpha/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /vault/i }));
    expect(await screen.findByText("Promoted Note")).toBeInTheDocument();
    expect(screen.queryByText(/Coming soon/i)).not.toBeInTheDocument();
  });

  it("renders chains and stats with recent activity", async () => {
    renderDetail();

    expect(await screen.findByText("DPT-720 — Neuro")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /chains/i }));
    expect(await screen.findByText("Top-Down Narrative")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /stats/i }));
    expect(await screen.findByText("CARD DRAFTS")).toBeInTheDocument();
    expect(screen.getByText("RECENT ACTIVITY")).toBeInTheDocument();
    expect(screen.getByText("PROMOTE")).toBeInTheDocument();
    expect(screen.getByText("Brainstem Review")).toBeInTheDocument();
  });
});
