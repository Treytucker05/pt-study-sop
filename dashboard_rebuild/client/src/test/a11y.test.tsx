import { render } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { axe, toHaveNoViolations } from "jest-axe";
import RatingDialog from "@/components/RatingDialog";

expect.extend(toHaveNoViolations);

// Mock theme constants used by many components
vi.mock("@/lib/theme", () => ({
  TEXT_SECTION_LABEL: "font-arcade text-sm",
  TEXT_BODY: "font-terminal text-lg",
  TEXT_MUTED: "font-terminal text-xs text-muted-foreground",
  BTN_OUTLINE: "rounded-none font-terminal text-xs",
  ICON_SM: "w-3 h-3",
}));

describe("Accessibility (jest-axe)", () => {
  it("RatingDialog has no critical a11y violations", async () => {
    const { container } = render(
      <RatingDialog
        open={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        targetName="Active Recall"
        targetType="method"
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
