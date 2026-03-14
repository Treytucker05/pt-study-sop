import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LearnerProfilePanel } from "../LearnerProfilePanel";
import type { BrainWorkspace } from "../useBrainWorkspace";

const mockToast = vi.fn();

vi.mock("@/use-toast", () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

function createWorkspace(overrides: Partial<BrainWorkspace> = {}): BrainWorkspace {
  return {
    mainMode: "profile",
    setMainMode: vi.fn(),
    currentFile: null,
    setCurrentFile: vi.fn(),
    fileContent: "",
    setFileContent: vi.fn(),
    hasChanges: false,
    setHasChanges: vi.fn(),
    previewMode: false,
    setPreviewMode: vi.fn(),
    isSaving: false,
    openFile: vi.fn(),
    saveFile: vi.fn(),
    sidebarExpanded: true,
    setSidebarExpanded: vi.fn(),
    toggleSidebar: vi.fn(),
    chatExpanded: true,
    setChatExpanded: vi.fn(),
    toggleChat: vi.fn(),
    isFullscreen: false,
    toggleFullscreen: vi.fn(),
    importOpen: false,
    setImportOpen: vi.fn(),
    handleWikilinkClick: vi.fn(),
    obsidianStatus: undefined,
    obsidianConfig: undefined,
    vaultIndex: undefined,
    ankiStatus: undefined,
    metrics: undefined,
    ankiDrafts: [],
    pendingDrafts: [],
    learnerProfile: {
      userId: "default",
      snapshotId: 4,
      generatedAt: "2026-03-11T12:00:00Z",
      modelVersion: "brain-profile-v1",
      hybridArchetype: {
        slug: "calibration-builder",
        label: "Calibration Builder",
        summary: "Brain sees the biggest unlock in tightening confidence calibration.",
        supportingTraits: ["needs-calibration-checks"],
      },
      profileSummary: {
        headline: "Brain sees the biggest unlock in tightening confidence calibration.",
        strengths: ["Retrieval Resilience"],
        watchouts: ["Scaffold Dependence"],
        nextBestActions: ["Add more explicit confidence checks before Tutor advances."],
        backfillMode: "single_snapshot_seed",
      },
      claimsOverview: {
        count: 5,
        highConfidence: 2,
        needsCalibration: 2,
        watchouts: 1,
      },
      sourceWindow: {
        start: "2026-03-01T08:00:00Z",
        end: "2026-03-11T11:55:00Z",
      },
      backfillMode: "single_snapshot_seed",
      reliabilityTiers: [
        { tier: 1, label: "Trusted", description: "Trusted telemetry" },
      ],
      evidenceSummary: { claimCount: 5 },
    },
    learnerProfileClaims: [
      {
        claimKey: "calibration_accuracy",
        label: "Calibration Accuracy",
        score: 0.42,
        valueBand: "moderate",
        confidence: 0.61,
        confidenceBand: "moderate",
        freshnessDays: 1.2,
        contradictionState: "mixed",
        evidenceTier: 1,
        evidenceLabel: "Tier 1 trusted telemetry",
        signalDirection: "strength",
        observedCount: 8,
        explanation: "Brain compares confidence with what actually happened.",
        recommendedStrategy: "Add more explicit confidence checks before Tutor advances.",
        evidence: { confidencePairCount: 8 },
      },
    ],
    learnerProfileQuestions: [
      {
        id: 11,
        snapshotId: 4,
        questionKey: "calibration_accuracy:calibration",
        questionText:
          "When you feel confident and still miss, is it usually because you recognized the idea but could not explain it under pressure?",
        claimKey: "calibration_accuracy",
        rationale: "Brain is checking confidence drift.",
        questionType: "calibration",
        status: "pending",
        blocking: false,
        evidenceNeeded: "confidence_failure_pattern",
        answerText: null,
        createdAt: "2026-03-11T12:00:00Z",
        updatedAt: "2026-03-11T12:00:00Z",
      },
    ],
    learnerProfileHistory: [
      {
        snapshotId: 4,
        generatedAt: "2026-03-11T12:00:00Z",
        modelVersion: "brain-profile-v1",
        archetypeLabel: "Calibration Builder",
        archetypeSummary: "Brain sees the biggest unlock in tightening confidence calibration.",
        topSignals: [],
        sourceWindow: { start: "2026-03-01T08:00:00Z", end: "2026-03-11T11:55:00Z" },
      },
    ],
    learnerProfileLoading: false,
    refreshLearnerProfile: vi.fn().mockResolvedValue(undefined),
    submitProfileFeedback: vi.fn().mockResolvedValue({ ok: true }),
    ...overrides,
  } as unknown as BrainWorkspace;
}

describe("LearnerProfilePanel", () => {
  it("renders the hybrid archetype and profile claims", () => {
    render(<LearnerProfilePanel workspace={createWorkspace()} />);

    expect(screen.getByTestId("learner-profile-panel")).toBeInTheDocument();
    expect(screen.getAllByText("Calibration Builder").length).toBeGreaterThan(0);
    expect(screen.getByTestId("claim-card-calibration_accuracy")).toBeInTheDocument();
    expect(screen.getByTestId("question-card-11")).toBeInTheDocument();
  });

  it("submits question answers and claim challenges through the workspace contract", async () => {
    const workspace = createWorkspace();
    render(<LearnerProfilePanel workspace={workspace} />);

    fireEvent.change(screen.getByTestId("question-answer-11"), {
      target: { value: "I usually recognize the term but fail when I have to explain it out loud." },
    });
    fireEvent.click(screen.getByText("Save Answer"));

    fireEvent.change(screen.getByTestId("claim-challenge-calibration_accuracy"), {
      target: { value: "This overstates how often I miscalibrate when the source material is unfamiliar." },
    });
    fireEvent.click(screen.getByText("Submit Challenge"));

    await waitFor(() => {
      expect(workspace.submitProfileFeedback).toHaveBeenCalledWith(
        expect.objectContaining({
          questionId: 11,
          responseType: "answer",
        })
      );
    });
    await waitFor(() => {
      expect(workspace.submitProfileFeedback).toHaveBeenCalledWith(
        expect.objectContaining({
          claimKey: "calibration_accuracy",
          responseType: "challenge",
        })
      );
    });
  });
});
