import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const pendingImport = new Promise<never>(() => {});

vi.mock("@/components/studio/StudioTldrawWorkspace", () => ({
  StudioTldrawWorkspace: () => {
    throw pendingImport;
  },
}));

import { StudioTldrawWorkspaceLazy } from "@/components/studio/StudioTldrawWorkspaceLazy";

describe("StudioTldrawWorkspaceLazy", () => {
  it("shows a loading fallback while the workspace chunk is still resolving", async () => {
    render(
      <StudioTldrawWorkspaceLazy
        canvasObjects={[]}
        courseName={null}
        currentRunObjects={[]}
        promotedPrimeObjectIds={[]}
        selectedMaterialCount={0}
        onPromoteExcerptToPrime={() => {}}
        onPromoteTextNoteToPrime={() => {}}
      />,
    );

    expect(await screen.findByTestId("studio-workspace-loading")).toHaveTextContent(
      "Loading workspace",
    );
  });
});
