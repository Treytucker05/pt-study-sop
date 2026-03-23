import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TutorTopBar } from "@/components/TutorTopBar";
import type { TutorTeachRuntimeViewModel } from "@/components/TutorChat.types";

const teachRuntime: TutorTeachRuntimeViewModel = {
  packetSource: "mixed",
  stage: { label: "Current stage", value: "TEACH", status: "live" },
  conceptType: {
    label: "Concept type",
    value: "Mechanism",
    status: "fallback",
  },
  bridge: { label: "Current bridge", value: "Analogy", status: "live" },
  depth: {
    label: "Depth lane",
    value: "L3 mechanism live",
    current: "L3 mechanism",
    start: "L0 hook",
    ceiling: "L4 precision",
    status: "fallback",
  },
  requiredArtifact: {
    label: "Close artifact",
    value: "Mini process flow",
    status: "live",
  },
  functionConfirmation: {
    label: "Function confirmation",
    value: "Function not confirmed",
    confirmed: false,
    status: "pending",
  },
  l4Unlock: {
    label: "L4 unlock",
    value: "L4 locked",
    unlocked: false,
    status: "locked",
  },
  mnemonic: {
    label: "Mnemonic slot",
    value: "KWIK Lite available",
    status: "available",
  },
  note: "Some TEACH packet fields are live, and the rest are inferred from the active block.",
  missingBackendFields: [
    "teach_packet.concept_type",
    "teach_packet.current_depth",
  ],
};

describe("TutorTopBar", () => {
  it("renders the live TEACH runtime rail", () => {
    render(
      <TutorTopBar
        shellMode="tutor"
        isTutorSessionView
        brainLaunchContext={null}
        topic="Neuro"
        turnCount={3}
        startedAt="2026-03-20T15:00:00Z"
        hasChain
        currentBlock={{
          id: 9,
          name: "Teach the corticospinal mechanism",
          category: "TEACH",
          control_stage: "TEACH",
          description: "Explain one mechanism chunk.",
          duration: 12,
          facilitation_prompt: "Use analogy then process flow.",
        }}
        isChainComplete={false}
        blockTimerSeconds={420}
        timerPaused={false}
        progressCount={2}
        chainBlocksLength={5}
        formatTimer={(seconds) => `${seconds}s`}
        onSetTimerPaused={vi.fn()}
        onAdvanceBlock={vi.fn()}
        activeWorkflowId="wf-1"
        activeWorkflowDetail={undefined}
        studioView="priming"
        activeSessionId="sess-1"
        teachRuntime={teachRuntime}
      />,
    );

    const runtime = screen.getByTestId("tutor-teach-runtime");
    expect(runtime).toBeInTheDocument();
    expect(
      within(runtime).getByText(/Live TEACH Runtime/i),
    ).toBeInTheDocument();
    expect(within(runtime).getByText(/Concept type/i)).toBeInTheDocument();
    expect(within(runtime).getByText(/^Mechanism$/i)).toBeInTheDocument();
    expect(
      within(runtime).getAllByText(/KWIK Lite available/i).length,
    ).toBeGreaterThan(0);
    expect(
      within(runtime).getByText(
        /Waiting on backend fields: teach_packet\.concept_type, teach_packet\.current_depth/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("workspace-tab-bar"),
    ).not.toBeInTheDocument();
  });
});
