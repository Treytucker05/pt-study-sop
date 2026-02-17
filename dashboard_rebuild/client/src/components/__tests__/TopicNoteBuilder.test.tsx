import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TopicNoteBuilder } from "@/components/TopicNoteBuilder";

// Mock useToast
const mockToast = vi.fn();
vi.mock("@/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("TopicNoteBuilder", () => {
  it("renders the title and description", () => {
    render(<TopicNoteBuilder />);
    expect(screen.getByText("SIX-PHASE TOPIC NOTE BUILDER")).toBeInTheDocument();
    expect(screen.getByText(/Generate an Obsidian-ready topic note/)).toBeInTheDocument();
  });

  it("renders input fields", () => {
    render(<TopicNoteBuilder />);
    expect(screen.getByPlaceholderText("e.g., Anatomy")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("e.g., Brachial Plexus")).toBeInTheDocument();
    expect(screen.getByText("GENERATE NOTE")).toBeInTheDocument();
  });

  it("shows error toast when topic is empty", () => {
    render(<TopicNoteBuilder />);
    fireEvent.click(screen.getByText("GENERATE NOTE"));
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Topic required", variant: "destructive" })
    );
  });

  it("generates note with correct structure", () => {
    render(<TopicNoteBuilder />);

    fireEvent.change(screen.getByPlaceholderText("e.g., Anatomy"), {
      target: { value: "Anatomy" },
    });
    fireEvent.change(screen.getByPlaceholderText("e.g., Brachial Plexus"), {
      target: { value: "Brachial Plexus" },
    });
    fireEvent.change(
      screen.getByPlaceholderText(/Identify the roots/),
      { target: { value: "Identify roots\nDescribe trunks" } }
    );

    fireEvent.click(screen.getByText("GENERATE NOTE"));

    // Output should appear
    expect(screen.getByText("OUTPUT")).toBeInTheDocument();
    expect(screen.getByText("COPY TO CLIPBOARD")).toBeInTheDocument();

    // Check generated content — raw markdown in <pre>, so ** markers are literal
    const pre = screen.getByText(/# Brachial Plexus/);
    expect(pre.textContent).toMatch(/Course:.*Anatomy/);
    expect(pre.textContent).toContain("Identify roots");
    expect(pre.textContent).toContain("Describe trunks");
    expect(pre.textContent).toContain("Cluster 1");
    expect(pre.textContent).toContain("mermaid");
    expect(pre.textContent).toContain("Retrieval Practice");

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Note generated" })
    );
  });

  it("generates note with source excerpt", () => {
    render(<TopicNoteBuilder />);
    fireEvent.change(screen.getByPlaceholderText("e.g., Brachial Plexus"), {
      target: { value: "ATP" },
    });
    fireEvent.change(
      screen.getByPlaceholderText("Paste relevant source material here..."),
      { target: { value: "ATP is the primary energy currency" } }
    );
    fireEvent.click(screen.getByText("GENERATE NOTE"));

    const pre = screen.getByText(/# ATP/);
    expect(pre.textContent).toContain("ATP is the primary energy currency");
  });

  it("generates note with no LOs shows placeholder", () => {
    render(<TopicNoteBuilder />);
    fireEvent.change(screen.getByPlaceholderText("e.g., Brachial Plexus"), {
      target: { value: "Test Topic" },
    });
    fireEvent.click(screen.getByText("GENERATE NOTE"));

    const pre = screen.getByText(/# Test Topic/);
    expect(pre.textContent).toContain("(add LOs here)");
  });

  it("copies output to clipboard", async () => {
    render(<TopicNoteBuilder />);

    // Generate first
    fireEvent.change(screen.getByPlaceholderText("e.g., Brachial Plexus"), {
      target: { value: "Topic" },
    });
    fireEvent.click(screen.getByText("GENERATE NOTE"));

    // Copy (async — handleCopy awaits clipboard.writeText)
    fireEvent.click(screen.getByText("COPY TO CLIPBOARD"));
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Copied to clipboard" })
      );
    });
  });

  it("shows unspecified course when course is empty", () => {
    render(<TopicNoteBuilder />);
    fireEvent.change(screen.getByPlaceholderText("e.g., Brachial Plexus"), {
      target: { value: "Topic" },
    });
    fireEvent.click(screen.getByText("GENERATE NOTE"));
    const pre = screen.getByText(/# Topic/);
    expect(pre.textContent).toContain("(unspecified)");
  });

  it("caps clusters at MAX_CLUSTERS (5)", () => {
    render(<TopicNoteBuilder />);
    fireEvent.change(screen.getByPlaceholderText("e.g., Brachial Plexus"), {
      target: { value: "Topic" },
    });
    // cluster input has min=3, max=5
    const clusterInput = screen.getByDisplayValue("4");
    fireEvent.change(clusterInput, { target: { value: "5" } });
    fireEvent.click(screen.getByText("GENERATE NOTE"));

    const pre = screen.getByText(/# Topic/);
    expect(pre.textContent).toContain("Clusters (5)");
    expect(pre.textContent).toContain("Cluster 5");
  });
});
