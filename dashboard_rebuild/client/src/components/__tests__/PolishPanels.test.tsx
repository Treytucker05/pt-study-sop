import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import {
  PolishAssistPanel,
  type AssistResults,
  type PolishAssistPanelProps,
} from "@/components/workspace/PolishAssistPanel";
import {
  FlaggedRepliesPanel,
  type FlaggedReply,
  type FlaggedRepliesPanelProps,
} from "@/components/workspace/FlaggedRepliesPanel";
import {
  AnkiPanel,
  type AnkiCardDraft,
  type AnkiPanelProps,
} from "@/components/workspace/AnkiPanel";

// ── Fixtures ───────────────────────────────────────────────────────────

const ASSIST_RESULTS: AssistResults = {
  cardRequests: [
    { title: "Muscle Groups", front: "Name the quads", back: "Rectus femoris..." },
  ],
  rePrimeRequests: [
    { topic: "Gait Cycle", reason: "Missed stance phase details" },
  ],
  artifacts: [
    { type: "summary", content: "Session covered lower extremity anatomy" },
  ],
};

const FLAGGED: FlaggedReply[] = [
  {
    messageId: "msg-1",
    content: "The answer about gait was incorrect",
    sentiment: "disliked",
    category: "accuracy",
    comment: "Wrong phase listed",
  },
  {
    messageId: "msg-2",
    content: "Too vague on biomechanics",
    sentiment: "disliked",
  },
];

const CARD_DRAFTS: AnkiCardDraft[] = [
  { id: 1, front: "What is the gait cycle?", back: "Sequence of events...", status: "pending" },
  { id: 2, front: "Name hip flexors", back: "Iliopsoas, rectus femoris...", status: "pending" },
];

// ── Helpers ────────────────────────────────────────────────────────────

function renderPolish(overrides: Partial<PolishAssistPanelProps> = {}) {
  const props: PolishAssistPanelProps = {
    workflowId: "wf-123",
    ...overrides,
  };
  return { ...render(<PolishAssistPanel {...props} />), props };
}

function renderFlagged(overrides: Partial<FlaggedRepliesPanelProps> = {}) {
  const props: FlaggedRepliesPanelProps = {
    flaggedReplies: [],
    ...overrides,
  };
  return { ...render(<FlaggedRepliesPanel {...props} />), props };
}

function renderAnki(overrides: Partial<AnkiPanelProps> = {}) {
  const props: AnkiPanelProps = {
    cardDrafts: [],
    ...overrides,
  };
  return { ...render(<AnkiPanel {...props} />), props };
}

// ── PolishAssistPanel ──────────────────────────────────────────────────

describe("PolishAssistPanel", () => {
  it("renders with title", () => {
    renderPolish();
    expect(screen.getByText("POLISH ASSIST")).toBeInTheDocument();
  });

  it("Run Assist button calls onRunAssist", () => {
    const onRunAssist = vi.fn();
    renderPolish({ onRunAssist });

    fireEvent.click(screen.getByText("Run Polish Assist"));
    expect(onRunAssist).toHaveBeenCalledOnce();
  });

  it("shows spinner when running", () => {
    renderPolish({ assistRunning: true });

    expect(screen.getByText("Running...")).toBeInTheDocument();
    const btn = screen.getByRole("button", { name: /running/i });
    expect(btn).toBeDisabled();
  });

  it("shows result counts when results provided", () => {
    renderPolish({ assistResults: ASSIST_RESULTS });

    expect(screen.getByText(/Card Requests \(1\)/)).toBeInTheDocument();
    expect(screen.getByText(/Re-Prime Requests \(1\)/)).toBeInTheDocument();
    expect(screen.getByText(/Artifacts \(1\)/)).toBeInTheDocument();
  });

  it("shows empty state when no results and not running", () => {
    renderPolish();
    expect(
      screen.getByText(/Run Polish Assist to generate/),
    ).toBeInTheDocument();
  });
});

// ── FlaggedRepliesPanel ────────────────────────────────────────────────

describe("FlaggedRepliesPanel", () => {
  it("renders with title and count", () => {
    renderFlagged({ flaggedReplies: FLAGGED });
    expect(screen.getByText("FLAGGED REPLIES (2)")).toBeInTheDocument();
  });

  it("shows flagged messages", () => {
    renderFlagged({ flaggedReplies: FLAGGED });
    expect(screen.getByText(/gait was incorrect/)).toBeInTheDocument();
    expect(screen.getByText(/Too vague on biomechanics/)).toBeInTheDocument();
  });

  it("action buttons call onReviewComplete", () => {
    const onReviewComplete = vi.fn();
    renderFlagged({ flaggedReplies: FLAGGED, onReviewComplete });

    const keepButtons = screen.getAllByText("Keep");
    fireEvent.click(keepButtons[0]);

    expect(onReviewComplete).toHaveBeenCalledWith("msg-1", "keep");
  });

  it("shows discard and revise buttons", () => {
    const onReviewComplete = vi.fn();
    renderFlagged({ flaggedReplies: FLAGGED, onReviewComplete });

    const discardButtons = screen.getAllByText("Discard");
    fireEvent.click(discardButtons[1]);
    expect(onReviewComplete).toHaveBeenCalledWith("msg-2", "discard");

    const reviseButtons = screen.getAllByText("Revise");
    fireEvent.click(reviseButtons[0]);
    expect(onReviewComplete).toHaveBeenCalledWith("msg-1", "revise");
  });

  it("shows empty state when no flagged replies", () => {
    renderFlagged();
    expect(screen.getByText("No flagged replies")).toBeInTheDocument();
  });

  it("shows category badge and comment", () => {
    renderFlagged({ flaggedReplies: FLAGGED });
    expect(screen.getByText("accuracy")).toBeInTheDocument();
    expect(screen.getByText(/Wrong phase listed/)).toBeInTheDocument();
  });
});

// ── AnkiPanel ──────────────────────────────────────────────────────────

describe("AnkiPanel", () => {
  it("renders with title and count", () => {
    renderAnki({ cardDrafts: CARD_DRAFTS });
    expect(screen.getByText("ANKI CARDS (2)")).toBeInTheDocument();
  });

  it("shows card drafts with front/back", () => {
    renderAnki({ cardDrafts: CARD_DRAFTS });
    expect(screen.getByText(/What is the gait cycle/)).toBeInTheDocument();
    expect(screen.getByText(/Sequence of events/)).toBeInTheDocument();
    expect(screen.getByText(/Name hip flexors/)).toBeInTheDocument();
  });

  it("approve button calls onApproveDraft", () => {
    const onApproveDraft = vi.fn();
    renderAnki({ cardDrafts: CARD_DRAFTS, onApproveDraft });

    const approveButtons = screen.getAllByLabelText(/approve card/i);
    fireEvent.click(approveButtons[0]);
    expect(onApproveDraft).toHaveBeenCalledWith(1);
  });

  it("reject button calls onRejectDraft", () => {
    const onRejectDraft = vi.fn();
    renderAnki({ cardDrafts: CARD_DRAFTS, onRejectDraft });

    const rejectButtons = screen.getAllByLabelText(/reject card/i);
    fireEvent.click(rejectButtons[1]);
    expect(onRejectDraft).toHaveBeenCalledWith(2);
  });

  it("shows empty state when no card drafts", () => {
    renderAnki();
    expect(screen.getByText("No card drafts")).toBeInTheDocument();
  });
});
