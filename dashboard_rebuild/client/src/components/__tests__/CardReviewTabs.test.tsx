import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CardReviewTabs } from "@/components/CardReviewTabs";

const drafts = [
  {
    id: 1,
    front: "What is ATP?",
    back: "Adenosine triphosphate — the primary energy currency of the cell (contains high-energy phosphate bonds)",
    status: "high_confidence",
    source_citation: "Guyton Ch. 2",
    tags: "biochem",
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: 2,
    front: "Define sarcomere",
    back: "Basic contractile unit of muscle",
    status: "high_confidence",
    tags: "anatomy",
    created_at: "2026-01-02T00:00:00Z",
  },
  {
    id: 3,
    front: "What is proprioception?",
    back: "Sense of body position",
    status: "low_confidence",
    tags: "neuro",
    created_at: "2026-01-03T00:00:00Z",
  },
  {
    id: 4,
    front: "Name the rotator cuff muscles",
    back: "SITS: Supraspinatus, Infraspinatus, Teres minor, Subscapularis",
    status: "draft",
    tags: "anatomy",
    created_at: "2026-01-04T00:00:00Z",
  },
];

describe("CardReviewTabs", () => {
  let onApprove: any;
  let onReject: any;
  let onEdit: any;

  beforeEach(() => {
    vi.clearAllMocks();
    onApprove = vi.fn();
    onReject = vi.fn();
    onEdit = vi.fn();
  });

  function renderTabs() {
    return render(
      <CardReviewTabs
        drafts={drafts}
        onApprove={onApprove}
        onReject={onReject}
        onEdit={onEdit}
      />
    );
  }

  it("renders tab counts correctly", () => {
    renderTabs();
    expect(screen.getByText("HIGH (2)")).toBeInTheDocument();
    expect(screen.getByText("LOW (1)")).toBeInTheDocument();
    expect(screen.getByText("DRAFT (1)")).toBeInTheDocument();
  });

  it("shows high-confidence cards by default", () => {
    renderTabs();
    expect(screen.getByText("What is ATP?")).toBeInTheDocument();
    expect(screen.getByText("Define sarcomere")).toBeInTheDocument();
  });

  it("shows confidence badge on high-confidence cards", () => {
    renderTabs();
    // ATP card has citation + long front + long back + numbers → high score
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("shows source citation when present", () => {
    renderTabs();
    expect(screen.getByText("Source: Guyton Ch. 2")).toBeInTheDocument();
  });

  it("truncates long back text to 100 characters with ellipsis", () => {
    renderTabs();
    // ATP card back is >100 chars, should be truncated
    expect(screen.getByText(/Adenosine triphosphate/)).toBeInTheDocument();
    expect(screen.getByText(/\.\.\.$/)).toBeInTheDocument();
  });

  it("toggles select-all button between All and None", () => {
    renderTabs();
    const allBtn = screen.getByRole("button", { name: "All" });
    expect(allBtn).toBeInTheDocument();

    // Click "All" to select all high-confidence drafts
    fireEvent.click(allBtn);

    // After selecting all, button should say "None"
    expect(screen.getByRole("button", { name: "None" })).toBeInTheDocument();
  });

  it("calls onEdit when edit button is clicked", () => {
    const { container } = renderTabs();
    // Edit buttons have a pencil icon (Pencil from lucide) with class w-3 h-3
    // They're the small ghost-variant buttons next to each card
    const editButtons = container.querySelectorAll('button.h-6.w-6');
    expect(editButtons.length).toBeGreaterThan(0);
    fireEvent.click(editButtons[0]);
    expect(onEdit).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, front: "What is ATP?" })
    );
  });

  it("renders empty state when no cards in a category", () => {
    render(
      <CardReviewTabs
        drafts={[]}
        onApprove={onApprove}
        onReject={onReject}
        onEdit={onEdit}
      />
    );
    expect(screen.getByText("No high confidence cards")).toBeInTheDocument();
  });
});
