import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import { PendingProposalsBadge } from "@/components/brain/PendingProposalsBadge";
import type { ScholarProposal } from "@/lib/api";

const setLocationMock = vi.fn<(path: string) => void>();

vi.mock("wouter", () => ({
  useLocation: () => ["/brain", setLocationMock] as const,
}));

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
      },
    },
  };
});

function makeProposal(id: number): ScholarProposal {
  return {
    id,
    title: `Proposal ${id}`,
    proposal_type: "method_block_edit",
    status: "pending",
    proposal_kind: "structured",
  };
}

function renderBadge() {
  setLocationMock.mockClear();
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }
  return render(<PendingProposalsBadge />, { wrapper: Wrapper });
}

describe("PendingProposalsBadge", () => {
  it("hides when no pending proposals", async () => {
    const { api } = await import("@/lib/api");
    vi.mocked(api.scholar.getProposals).mockResolvedValueOnce([]);
    renderBadge();
    // Should never render the badge testid; wait briefly to be sure no
    // initial render flashes the badge.
    await waitFor(() => {
      expect(api.scholar.getProposals).toHaveBeenCalled();
    });
    expect(
      screen.queryByTestId("brain-pending-proposals-badge"),
    ).not.toBeInTheDocument();
  });

  it("shows the count when proposals are pending", async () => {
    const { api } = await import("@/lib/api");
    vi.mocked(api.scholar.getProposals).mockResolvedValueOnce([
      makeProposal(1),
      makeProposal(2),
      makeProposal(3),
    ]);
    renderBadge();
    const badge = await screen.findByTestId("brain-pending-proposals-badge");
    expect(badge).toBeInTheDocument();
    expect(badge.textContent).toMatch(/3 pending/i);
  });

  it("clicking the badge navigates to /scholar?tab=proposals", async () => {
    const { api } = await import("@/lib/api");
    vi.mocked(api.scholar.getProposals).mockResolvedValueOnce([
      makeProposal(7),
    ]);
    renderBadge();
    const badge = await screen.findByTestId("brain-pending-proposals-badge");
    fireEvent.click(badge);
    await waitFor(() => {
      expect(setLocationMock).toHaveBeenCalledWith("/scholar?tab=proposals");
    });
  });
});
