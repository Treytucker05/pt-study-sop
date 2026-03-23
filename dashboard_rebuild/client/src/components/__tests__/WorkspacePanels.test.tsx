import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { NotesPanel } from "@/components/workspace/NotesPanel";
import { ObjectivesPanel } from "@/components/workspace/ObjectivesPanel";

// ── NotesPanel ──────────────────────────────────────────────────────────────

describe("NotesPanel", () => {
  it("renders with title 'NOTES'", () => {
    render(<NotesPanel />);
    expect(screen.getByText("NOTES")).toBeInTheDocument();
  });

  it("textarea accepts input", () => {
    const onContentChange = vi.fn();
    render(<NotesPanel onContentChange={onContentChange} />);
    const textarea = screen.getByLabelText("Note content");
    fireEvent.change(textarea, { target: { value: "Hello world" } });
    expect(onContentChange).toHaveBeenCalledWith("Hello world");
  });

  it("Send to Packet calls callback with title and content", () => {
    const onSendToPacket = vi.fn();
    render(<NotesPanel onSendToPacket={onSendToPacket} />);

    const titleInput = screen.getByLabelText("Note title");
    const textarea = screen.getByLabelText("Note content");

    fireEvent.change(titleInput, { target: { value: "My Note" } });
    fireEvent.change(textarea, { target: { value: "Some content" } });

    const sendBtn = screen.getByRole("button", { name: /send to packet/i });
    fireEvent.click(sendBtn);

    expect(onSendToPacket).toHaveBeenCalledWith({
      type: "note",
      title: "My Note",
      content: "Some content",
    });
  });
});

// ── ObjectivesPanel ─────────────────────────────────────────────────────────

const MOCK_OBJECTIVES = [
  { id: 1, code: "PTA-101", title: "Understand anatomy", mastered: false },
  { id: 2, code: "PTA-102", title: "Apply kinesiology", mastered: true },
];

describe("ObjectivesPanel", () => {
  it("renders with title 'OBJECTIVES'", () => {
    render(<ObjectivesPanel objectives={MOCK_OBJECTIVES} />);
    expect(screen.getByText("OBJECTIVES")).toBeInTheDocument();
  });

  it("shows objective list with codes and titles", () => {
    render(<ObjectivesPanel objectives={MOCK_OBJECTIVES} />);
    expect(screen.getByText("PTA-101")).toBeInTheDocument();
    expect(screen.getByText("Understand anatomy")).toBeInTheDocument();
    expect(screen.getByText("PTA-102")).toBeInTheDocument();
    expect(screen.getByText("Apply kinesiology")).toBeInTheDocument();
  });

  it("toggle mastered calls callback with objective id", () => {
    const onToggleMastered = vi.fn();
    render(
      <ObjectivesPanel
        objectives={MOCK_OBJECTIVES}
        onToggleMastered={onToggleMastered}
      />,
    );

    const checkbox = screen.getByLabelText("Mark PTA-101 as mastered");
    fireEvent.click(checkbox);
    expect(onToggleMastered).toHaveBeenCalledWith(1);
  });

  it("Send All to Packet calls callback with all objectives", () => {
    const onSendToPacket = vi.fn();
    render(
      <ObjectivesPanel
        objectives={MOCK_OBJECTIVES}
        onSendToPacket={onSendToPacket}
      />,
    );

    const sendBtn = screen.getByRole("button", { name: /send all to packet/i });
    fireEvent.click(sendBtn);

    expect(onSendToPacket).toHaveBeenCalledWith({
      type: "objectives",
      title: "Learning Objectives",
      content: "[ ] PTA-101 - Understand anatomy\n[x] PTA-102 - Apply kinesiology",
    });
  });
});
