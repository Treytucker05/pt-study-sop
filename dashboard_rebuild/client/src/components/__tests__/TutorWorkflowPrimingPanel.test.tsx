import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TutorWorkflowPrimingPanel } from "@/components/TutorWorkflowPrimingPanel";

vi.mock("@/components/MaterialSelector", () => ({
  MaterialSelector: () => <div data-testid="material-selector">material selector</div>,
}));

vi.mock("@/components/priming/PrimingMaterialReader", () => ({
  PrimingMaterialReader: () => <div data-testid="priming-material-reader">material reader</div>,
}));

vi.mock("@/components/ObsidianRenderer", () => ({
  ObsidianRenderer: ({ content }: { content: string }) => <div>{content}</div>,
}));

vi.mock("@/components/brain/ConceptMapStructured", () => ({
  ConceptMapStructured: () => <div data-testid="structured-map-preview">structured map</div>,
}));

describe("TutorWorkflowPrimingPanel", () => {
  it("keeps chain and workflow context inside advanced controls by default", () => {
    render(
      <TutorWorkflowPrimingPanel
        workflow={
          {
            workflow_id: "wf-123",
            updated_at: "2026-03-20T12:00:00Z",
            status: "priming",
            assignment_title: "Week 7",
            course_name: "Exercise Phys",
            topic: "VO2 max",
          } as never
        }
        courses={[{ id: 1, name: "Exercise Phys", code: "EXPH" }] as never}
        courseId={1}
        setCourseId={vi.fn()}
        selectedMaterials={[101]}
        setSelectedMaterials={vi.fn()}
        topic=""
        setTopic={vi.fn()}
        objectiveScope="module_all"
        setObjectiveScope={vi.fn()}
        selectedObjectiveId=""
        setSelectedObjectiveId={vi.fn()}
        selectedObjectiveGroup=""
        setSelectedObjectiveGroup={vi.fn()}
        availableObjectives={[]}
        studyUnitOptions={[]}
        primingMethod="summary_first"
        setPrimingMethod={vi.fn()}
        primingChainId="ingest_objectives_concepts_summary_gaps"
        setPrimingChainId={vi.fn()}
        summaryText="Summary output"
        setSummaryText={vi.fn()}
        conceptsText="Concept A"
        setConceptsText={vi.fn()}
        terminologyText="Term :: definition"
        setTerminologyText={vi.fn()}
        rootExplanationText="Root map"
        setRootExplanationText={vi.fn()}
        gapsText=""
        setGapsText={vi.fn()}
        recommendedStrategyText=""
        setRecommendedStrategyText={vi.fn()}
        sourceInventory={[]}
        vaultFolderPreview="Courses/Exercise Phys/Week 7"
        readinessItems={[
          { label: "Artifacts", ready: true, detail: "Core PRIME artifacts generated." },
          { label: "Handoff notes", ready: false, detail: "Still needs final note review." },
        ]}
        onBackToLaunch={vi.fn()}
        onSaveDraft={vi.fn()}
        onMarkReady={vi.fn()}
        onStartTutor={vi.fn()}
        onRunAssistForSelected={vi.fn()}
        onRunAssistForMaterial={vi.fn()}
        isSaving={false}
        isStartingTutor={false}
        isRunningAssist={false}
        assistTargetMaterialId={null}
      />,
    );

    expect(screen.getByText("SETUP")).toBeInTheDocument();
    expect(screen.getByText("MATERIALS IN SCOPE")).toBeInTheDocument();
    expect(screen.getByText("SOURCE VIEWER")).toBeInTheDocument();
    expect(screen.getByText("PRIME ARTIFACT WORKSPACE")).toBeInTheDocument();
    expect(screen.getAllByText("TUTOR HANDOFF").length).toBeGreaterThan(0);
    expect(screen.getByText("ADVANCED PRIME CONTROLS")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /extract prime/i })).toBeInTheDocument();

    expect(screen.queryByText("PRIME CHAIN")).not.toBeInTheDocument();
    expect(screen.queryByText("WORKFLOW CONTEXT")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /show advanced/i }));

    expect(screen.getByText("PRIME CHAIN")).toBeInTheDocument();
    expect(screen.getByText("WORKFLOW CONTEXT")).toBeInTheDocument();
    expect(screen.getByText("CHAIN PREVIEW")).toBeInTheDocument();
  });
});
