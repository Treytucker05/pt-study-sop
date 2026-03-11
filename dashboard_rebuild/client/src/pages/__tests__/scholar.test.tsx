import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockScholarGetInvestigations = vi.fn();
const mockScholarCreateInvestigation = vi.fn();
const mockScholarGetInvestigation = vi.fn();
const mockScholarGetQuestions = vi.fn();
const mockScholarGetFindings = vi.fn();
const mockScholarAnswerQuestion = vi.fn();
const mockBrainGetProfileSummary = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    scholar: {
      getInvestigations: (...args: unknown[]) => mockScholarGetInvestigations(...args),
      createInvestigation: (...args: unknown[]) => mockScholarCreateInvestigation(...args),
      getInvestigation: (...args: unknown[]) => mockScholarGetInvestigation(...args),
      getQuestions: (...args: unknown[]) => mockScholarGetQuestions(...args),
      getFindings: (...args: unknown[]) => mockScholarGetFindings(...args),
      answerQuestion: (...args: unknown[]) => mockScholarAnswerQuestion(...args),
    },
    brain: {
      getProfileSummary: (...args: unknown[]) => mockBrainGetProfileSummary(...args),
    },
  },
}));

vi.mock("@/components/layout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div>,
}));

vi.mock("@/components/ScholarRunStatus", () => ({
  ScholarRunStatus: () => <div data-testid="scholar-run-status">run-status</div>,
}));

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("ScholarPage research workspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window.HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });

    mockBrainGetProfileSummary.mockResolvedValue({
      hybridArchetype: {
        label: "Calibration Builder",
        confidence: "medium",
        summary: "Brain sees strong follow-through with some confidence drift.",
      },
      summaryCards: [
        { key: "consistency", label: "Consistency", value: "Stable", helper: "Recent sessions are regular." },
      ],
    });

    mockScholarGetInvestigations.mockResolvedValue([
      {
        investigation_id: "scholar-inv-1",
        title: "Scaffold dependence investigation",
        query_text: "Why do I rely on scaffolds during retrieval?",
        rationale: "Scholar should verify whether the current learner fit is still accurate.",
        audience_type: "learner",
        mode: "brain",
        status: "completed",
        confidence: "medium",
        findings_count: 1,
        open_question_count: 1,
        updated_at: "2026-03-11T12:00:00Z",
      },
    ]);

    mockScholarGetInvestigation.mockResolvedValue({
      investigation_id: "scholar-inv-1",
      title: "Scaffold dependence investigation",
      query_text: "Why do I rely on scaffolds during retrieval?",
      rationale: "Scholar should verify whether the current learner fit is still accurate.",
      audience_type: "learner",
      mode: "brain",
      status: "completed",
      confidence: "medium",
      uncertainty_summary: "The web sources are directionally aligned but still need learner-specific context.",
      findings_count: 1,
      open_question_count: 1,
      sources: [
        {
          source_id: "src-1",
          investigation_id: "scholar-inv-1",
          url: "https://example.edu/scaffolds",
          domain: "example.edu",
          title: "Scaffolded retrieval",
          trust_tier: "high",
          snippet: "A short citation snippet.",
        },
      ],
      findings: [],
      questions: [],
    });

    mockScholarGetQuestions.mockResolvedValue([
      {
        id: 1,
        question_id: "q-1",
        question_text: "Does this match how studying has felt this week?",
        question: "Does this match how studying has felt this week?",
        status: "pending",
        rationale: "Brain confidence is still moderate.",
        evidence_needed: "Direct learner confirmation or contradiction.",
        linked_investigation_id: "scholar-inv-1",
        is_blocking: false,
      },
    ]);

    mockScholarGetFindings.mockResolvedValue([
      {
        finding_id: "finding-1",
        investigation_id: "scholar-inv-1",
        title: "Scaffolds may still be compensating for calibration drift",
        summary: "The current sources suggest the learner needs fewer explanations but more retrieval checkpoints.",
        relevance: "This would change how Scholar tunes Tutor pacing later.",
        confidence: "medium",
        uncertainty: "Needs learner confirmation.",
        sources: [
          {
            source_id: "src-1",
            investigation_id: "scholar-inv-1",
            url: "https://example.edu/scaffolds",
            domain: "example.edu",
            title: "Scaffolded retrieval",
            trust_tier: "high",
            snippet: "A short citation snippet.",
          },
        ],
      },
    ]);

    mockScholarAnswerQuestion.mockResolvedValue({ success: true, status: "answered" });
    mockScholarCreateInvestigation.mockResolvedValue({
      investigation_id: "scholar-inv-new",
      title: "New investigation",
      query_text: "New investigation",
      rationale: "New rationale",
      audience_type: "learner",
      mode: "brain",
      status: "queued",
      confidence: "low",
    });
  });

  it("renders the new research-first Scholar workspace", async () => {
    const { default: ScholarPage } = await import("@/pages/scholar");
    renderWithClient(<ScholarPage />);

    expect(await screen.findByText("INTERACTIVE RESEARCH PARTNER")).toBeInTheDocument();
    expect(await screen.findByText("Calibration Builder")).toBeInTheDocument();
    expect((await screen.findAllByText("Scaffold dependence investigation")).length).toBeGreaterThan(0);
    expect(await screen.findByText("WHAT SCHOLAR IS RESEARCHING")).toBeInTheDocument();
    expect(screen.getByTestId("scholar-run-status")).toBeInTheDocument();
  });

  it("creates investigations and saves learner answers", async () => {
    const user = userEvent.setup();
    const { default: ScholarPage } = await import("@/pages/scholar");
    renderWithClient(<ScholarPage />);

    fireEvent.change(await screen.findByTestId("scholar-investigation-query"), {
      target: { value: "Why does Brain keep overestimating my retention?" },
    });
    fireEvent.change(await screen.findByTestId("scholar-investigation-rationale"), {
      target: { value: "I want Scholar to research whether the current calibration is wrong." },
    });

    await user.click(screen.getByTestId("button-start-investigation"));

    await waitFor(() => {
      expect(mockScholarCreateInvestigation).toHaveBeenCalledTimes(1);
    });
    expect(mockScholarCreateInvestigation).toHaveBeenCalledWith(
      expect.objectContaining({
        query_text: "Why does Brain keep overestimating my retention?",
        rationale: "I want Scholar to research whether the current calibration is wrong.",
        audience_type: "learner",
      }),
    );

    await user.click(screen.getByRole("tab", { name: "QUESTIONS" }));
    const answerInput = await screen.findByPlaceholderText(
      "Write the learner answer Scholar should incorporate...",
    );
    fireEvent.change(answerInput, { target: { value: "No, I still feel lost without guided checkpoints." } });

    await user.click(screen.getByTestId("button-submit-answer-q-1"));

    await waitFor(() => {
      expect(mockScholarAnswerQuestion).toHaveBeenCalledTimes(1);
    });
    expect(mockScholarAnswerQuestion).toHaveBeenCalledWith(
      "q-1",
      "No, I still feel lost without guided checkpoints.",
      "ui",
    );
  });
});
