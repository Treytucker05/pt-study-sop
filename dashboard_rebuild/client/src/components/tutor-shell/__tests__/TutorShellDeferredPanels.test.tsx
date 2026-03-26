import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const pendingImport = new Promise<never>(() => {});

vi.mock("@/components/TutorWorkflowFinalSync", () => ({
  TutorWorkflowFinalSync: () => {
    throw pendingImport;
  },
}));

import { TutorWorkflowFinalSyncLazy } from "@/components/tutor-shell/TutorShellDeferredPanels";

describe("TutorShellDeferredPanels", () => {
  it("shows a loading fallback while a legacy Studio panel chunk resolves", async () => {
    render(
      <TutorWorkflowFinalSyncLazy
        workflowDetail={null}
        onBackToPolish={() => {}}
      />,
    );

    expect(await screen.findByTestId("studio-panel-loading")).toHaveTextContent(
      "Loading panel",
    );
  });
});
