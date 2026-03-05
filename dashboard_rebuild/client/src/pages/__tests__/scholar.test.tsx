import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ScholarQuestion } from "@/lib/api";

const mockSessionsGetAll = vi.fn();
const mockCoursesGetAll = vi.fn();
const mockProposalsGetAll = vi.fn();

const mockScholarGetQuestions = vi.fn();
const mockScholarGetFindings = vi.fn();
const mockScholarGetTutorAudit = vi.fn();
const mockScholarGetClusters = vi.fn();
const mockScholarRunStatus = vi.fn();
const mockScholarRunHistory = vi.fn();
const mockScholarAnswerQuestion = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    sessions: {
      getAll: (...args: unknown[]) => mockSessionsGetAll(...args),
    },
    courses: {
      getAll: (...args: unknown[]) => mockCoursesGetAll(...args),
    },
    proposals: {
      getAll: (...args: unknown[]) => mockProposalsGetAll(...args),
    },
    scholar: {
      getQuestions: (...args: unknown[]) => mockScholarGetQuestions(...args),
      getFindings: (...args: unknown[]) => mockScholarGetFindings(...args),
      getTutorAudit: (...args: unknown[]) => mockScholarGetTutorAudit(...args),
      getClusters: (...args: unknown[]) => mockScholarGetClusters(...args),
      runStatus: (...args: unknown[]) => mockScholarRunStatus(...args),
      runHistory: (...args: unknown[]) => mockScholarRunHistory(...args),
      answerQuestion: (...args: unknown[]) => mockScholarAnswerQuestion(...args),
      run: vi.fn(),
      chat: vi.fn(),
      runClustering: vi.fn(),
    },
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

describe("ScholarPage question answers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window.HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });
    mockSessionsGetAll.mockResolvedValue([]);
    mockCoursesGetAll.mockResolvedValue([]);
    mockProposalsGetAll.mockResolvedValue([]);
    mockScholarGetFindings.mockResolvedValue([]);
    mockScholarGetTutorAudit.mockResolvedValue([]);
    mockScholarGetClusters.mockResolvedValue({ clusters: [] });
    mockScholarRunStatus.mockResolvedValue({ running: false, status: "idle" });
    mockScholarRunHistory.mockResolvedValue([]);
    mockScholarAnswerQuestion.mockResolvedValue({ status: "answered" });
  });

  it("shows ANSWERED badge and one Saved Answer block for answered question", async () => {
    const user = userEvent.setup();
    const answeredQuestion = {
      id: 1,
      question_id: "q-answered-1",
      question: "What is ATP?",
      question_text: "What is ATP?",
      status: "answered",
      context: "Biochem",
      source: "ui",
      answer_text: "ATP is cellular energy currency.",
      answered_at: "2026-03-04T12:00:00Z",
      created_at: "2026-03-04T11:00:00Z",
    } as ScholarQuestion;

    mockScholarGetQuestions.mockResolvedValue([answeredQuestion]);

    const { default: ScholarPage } = await import("@/pages/scholar");
    renderWithClient(<ScholarPage />);

    await user.click(await screen.findByTestId("tab-analysis"));
    await screen.findByText("OPEN QUESTIONS");

    expect(await screen.findByTestId("saved-answer-q-answered-1")).toHaveTextContent("ATP is cellular energy currency.");
    expect(screen.getByText("ANSWERED")).toBeInTheDocument();
    expect(screen.getAllByText("Saved Answer")).toHaveLength(1);
  });

  it("prevents duplicate answer submit calls on rapid double click", async () => {
    const user = userEvent.setup();
    const pendingQuestion = {
      id: 2,
      question_id: "q-pending-1",
      question: "What does ATP do?",
      question_text: "What does ATP do?",
      status: "open",
      context: "Biochem",
      source: "ui",
      created_at: "2026-03-04T11:00:00Z",
    } as ScholarQuestion;

    mockScholarGetQuestions.mockResolvedValue([pendingQuestion]);

    const { default: ScholarPage } = await import("@/pages/scholar");
    renderWithClient(<ScholarPage />);

    await user.click(await screen.findByTestId("tab-analysis"));
    await screen.findByText("OPEN QUESTIONS");

    const answerInput = await screen.findByPlaceholderText("Write answer for this question...");
    fireEvent.change(answerInput, { target: { value: "ATP stores immediate cellular energy." } });

    const submitButton = await screen.findByTestId("button-submit-answer-q-pending-1");
    fireEvent.click(submitButton);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockScholarAnswerQuestion).toHaveBeenCalledTimes(1);
    });
    expect(mockScholarAnswerQuestion).toHaveBeenCalledWith(
      "q-pending-1",
      "ATP stores immediate cellular energy.",
      "ui",
    );
  });
});
