import type { ReactNode } from "react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import { ProposalsTab } from "@/components/scholar/ProposalsTab";
import type { ScholarProposal } from "@/lib/api";

vi.mock("@/lib/api", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    api: {
      ...actual.api,
      scholar: {
        ...actual.api.scholar,
        getProposals: vi.fn(),
        decideProposal: vi.fn(),
      },
    },
  };
});

function makeProposal(overrides: Partial<ScholarProposal> = {}): ScholarProposal {
  return {
    id: 1,
    title: "Cardio Drill review",
    proposal_type: "method_block_edit",
    status: "pending",
    proposal_kind: "structured",
    rationale: "auto-flagged for review",
    content: "auto-flagged for review",
    cluster_id: "scan_1_abc",
    structured_changes: {
      target_table: "method_blocks",
      target_id: 7,
      field_changes: {
        facilitation_prompt: "<auto-flagged for review>",
      },
    },
    created_at: "2026-05-07T00:00:00Z",
    reviewed_at: null,
    apply_status: null,
    ...overrides,
  };
}

function renderTab() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  }
  return render(<ProposalsTab />, { wrapper: Wrapper });
}

describe("ProposalsTab", () => {
  it("renders the empty state when no proposals are pending", async () => {
    const { api } = await import("@/lib/api");
    vi.mocked(api.scholar.getProposals).mockResolvedValueOnce([]);
    renderTab();
    expect(
      await screen.findByTestId("proposals-tab-empty"),
    ).toBeInTheDocument();
  });

  it("renders one row per proposal with title and field changes", async () => {
    const { api } = await import("@/lib/api");
    vi.mocked(api.scholar.getProposals).mockResolvedValueOnce([
      makeProposal({ id: 7, title: "Cardio review" }),
      makeProposal({ id: 8, title: "Renal review" }),
    ]);
    renderTab();
    expect(await screen.findByTestId("proposal-row-7")).toBeInTheDocument();
    expect(screen.getByTestId("proposal-row-8")).toBeInTheDocument();
    expect(screen.getByText("Cardio review")).toBeInTheDocument();
    expect(screen.getByText("Renal review")).toBeInTheDocument();
    // Field-changes diff key + value rendered
    expect(
      screen.getAllByText("facilitation_prompt").length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("clicking Approve fires the decideProposal mutation with approve", async () => {
    const { api } = await import("@/lib/api");
    vi.mocked(api.scholar.getProposals).mockResolvedValueOnce([
      makeProposal({ id: 42 }),
    ]);
    const decideMock = vi.mocked(api.scholar.decideProposal);
    decideMock.mockResolvedValueOnce(makeProposal({ id: 42, status: "approved" }));

    renderTab();

    const approveBtn = await screen.findByTestId("proposal-approve-42");
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(decideMock).toHaveBeenCalledWith(42, "approve");
    });
  });

  it("clicking Reject fires the decideProposal mutation with reject", async () => {
    const { api } = await import("@/lib/api");
    vi.mocked(api.scholar.getProposals).mockResolvedValueOnce([
      makeProposal({ id: 99 }),
    ]);
    const decideMock = vi.mocked(api.scholar.decideProposal);
    decideMock.mockResolvedValueOnce(makeProposal({ id: 99, status: "rejected" }));

    renderTab();

    const rejectBtn = await screen.findByTestId("proposal-reject-99");
    fireEvent.click(rejectBtn);

    await waitFor(() => {
      expect(decideMock).toHaveBeenCalledWith(99, "reject");
    });
  });
});
