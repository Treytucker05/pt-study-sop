import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { MasteryDashboardResponse, WhyLockedResponse } from "@/api";

const mockDashboard: MasteryDashboardResponse = {
  skills: [
    { skill_id: "anatomy-101", name: "Anatomy Basics", effective_mastery: 0.92, status: "mastered" },
    { skill_id: "neuro-201", name: "Neuroanatomy", effective_mastery: 0.55, status: "available" },
    { skill_id: "cardio-301", name: "Cardiac Rehab", effective_mastery: 0.15, status: "locked" },
  ],
  count: 3,
};

const mockWhyLocked: WhyLockedResponse = {
  skill_id: "cardio-301",
  status: "locked",
  missing_prereqs: [
    { skill_id: "neuro-201", effective_mastery: 0.55, status: "available", needed: 0.8 },
  ],
  flagged_prereqs: [],
  recent_error_flags: [
    { error_type: "concept_confusion", severity: "high", edge_id: null, evidence_ref: "session-42", created_at: "2026-02-20T12:00:00Z" },
  ],
  remediation_path: ["Review Neuroanatomy basics", "Complete cardiac physiology module"],
};

const mockGetDashboard = vi.fn();
const mockGetWhyLocked = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    mastery: {
      getDashboard: (...args: unknown[]) => mockGetDashboard(...args),
      getWhyLocked: (...args: unknown[]) => mockGetWhyLocked(...args),
    },
    notes: { getAll: () => Promise.resolve([]) },
  },
}));

vi.mock("@/components/layout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div>,
}));

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("MasteryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDashboard.mockResolvedValue(mockDashboard);
    mockGetWhyLocked.mockResolvedValue(mockWhyLocked);
  });

  it("renders skill cards with names and mastery percentages", async () => {
    const { default: MasteryPage } = await import("@/pages/mastery");
    renderWithClient(<MasteryPage />);

    expect(await screen.findByText("Anatomy Basics")).toBeInTheDocument();
    expect(screen.getByText("Neuroanatomy")).toBeInTheDocument();
    expect(screen.getByText("Cardiac Rehab")).toBeInTheDocument();

    expect(screen.getByText("92%")).toBeInTheDocument();
    expect(screen.getByText("55%")).toBeInTheDocument();
    expect(screen.getByText("15%")).toBeInTheDocument();
  });

  it("shows correct status badges", async () => {
    const { default: MasteryPage } = await import("@/pages/mastery");
    renderWithClient(<MasteryPage />);

    expect(await screen.findByText("MASTERED")).toBeInTheDocument();
    expect(screen.getByText("AVAILABLE")).toBeInTheDocument();
    expect(screen.getByText("LOCKED")).toBeInTheDocument();
  });

  it("clicking locked skill shows why-locked panel", async () => {
    const { default: MasteryPage } = await import("@/pages/mastery");
    renderWithClient(<MasteryPage />);

    const lockedCard = await screen.findByTestId("skill-card-cardio-301");
    fireEvent.click(lockedCard);

    expect(await screen.findByTestId("why-locked-panel")).toBeInTheDocument();
    expect(screen.getByText("MISSING PREREQUISITES")).toBeInTheDocument();
    expect(screen.getByText("neuro-201")).toBeInTheDocument();
    expect(screen.getByText("concept_confusion")).toBeInTheDocument();
    expect(screen.getByText("Review Neuroanatomy basics")).toBeInTheDocument();
  });

  it("shows empty state when no skills", async () => {
    mockGetDashboard.mockResolvedValue({ skills: [], count: 0 });
    const { default: MasteryPage } = await import("@/pages/mastery");
    renderWithClient(<MasteryPage />);

    expect(await screen.findByTestId("mastery-empty")).toBeInTheDocument();
    expect(screen.getByText("NO SKILLS TRACKED YET")).toBeInTheDocument();
  });
});
