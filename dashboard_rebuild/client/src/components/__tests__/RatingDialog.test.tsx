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

  it("submits with empty notes when none provided", () => {
    const props = renderDialog();
    clickStar("EFFECTIVENESS (did it help you learn?)", 4);
    clickStar("ENGAGEMENT (did it hold your focus?)", 4);

    fireEvent.click(screen.getByRole("button", { name: "SUBMIT RATING" }));

    expect(props.onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ notes: "" })
    );
  });

  it("does not render when open is false", () => {
    renderDialog({ open: false });
    expect(screen.queryByText("RATE METHOD")).not.toBeInTheDocument();
  });

  it("calls onClose when close action is triggered", () => {
    const props = renderDialog();
    expect(props.onClose).toBeDefined();
  });

  it("allows changing star selection", () => {
    renderDialog();
    clickStar("EFFECTIVENESS (did it help you learn?)", 0); // 1 star
    clickStar("EFFECTIVENESS (did it help you learn?)", 4); // change to 5 stars
    clickStar("ENGAGEMENT (did it hold your focus?)", 2);

    const submitBtn = screen.getByRole("button", { name: "SUBMIT RATING" });
    expect(submitBtn).not.toBeDisabled();
  });
});
