import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import RatingDialog from "@/components/RatingDialog";

function renderDialog(overrides?: Partial<Parameters<typeof RatingDialog>[0]>) {
  const props = {
    open: true,
    onClose: vi.fn(),
    onSubmit: vi.fn(),
    targetName: "Active Recall",
    targetType: "method" as const,
    ...overrides,
  };
  render(<RatingDialog {...props} />);
  return props;
}

function clickStar(label: string, starIndex: number) {
  const section = screen.getByText(label).closest("div")!;
  const buttons = section.querySelectorAll("button");
  fireEvent.click(buttons[starIndex]);
}

describe("RatingDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders dialog with target name and type", () => {
    renderDialog();
    expect(screen.getByText("RATE METHOD")).toBeInTheDocument();
    expect(screen.getByText("Active Recall")).toBeInTheDocument();
  });

  it("renders chain type label when targetType is chain", () => {
    renderDialog({ targetType: "chain" });
    expect(screen.getByText("RATE CHAIN")).toBeInTheDocument();
  });

  it("disables submit when no stars are selected", () => {
    renderDialog();
    const submitBtn = screen.getByRole("button", { name: "SUBMIT RATING" });
    expect(submitBtn).toBeDisabled();
  });

  it("enables submit after both ratings are selected", () => {
    renderDialog();
    clickStar("EFFECTIVENESS (did it help you learn?)", 3);
    clickStar("ENGAGEMENT (did it hold your focus?)", 2);
    const submitBtn = screen.getByRole("button", { name: "SUBMIT RATING" });
    expect(submitBtn).not.toBeDisabled();
  });

  it("calls onSubmit with ratings and notes on submit", () => {
    const props = renderDialog();
    clickStar("EFFECTIVENESS (did it help you learn?)", 4); // 5th star = value 5
    clickStar("ENGAGEMENT (did it hold your focus?)", 2); // 3rd star = value 3

    const notesInput = screen.getByPlaceholderText("What worked? What didn't?");
    fireEvent.change(notesInput, { target: { value: "Great method" } });

    fireEvent.click(screen.getByRole("button", { name: "SUBMIT RATING" }));

    expect(props.onSubmit).toHaveBeenCalledWith({
      effectiveness: 5,
      engagement: 3,
      notes: "Great method",
    });
    expect(props.onClose).toHaveBeenCalled();
  });

  it("does not submit when only one rating is selected", () => {
    const props = renderDialog();
    clickStar("EFFECTIVENESS (did it help you learn?)", 3);

    fireEvent.click(screen.getByRole("button", { name: "SUBMIT RATING" }));
    expect(props.onSubmit).not.toHaveBeenCalled();
  });
});
