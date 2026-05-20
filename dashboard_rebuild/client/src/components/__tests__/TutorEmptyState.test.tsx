import { fireEvent, render, screen } from "@testing-library/react";
import { MessageSquare } from "lucide-react";
import { describe, expect, it, vi } from "vitest";

import { TutorEmptyState } from "@/components/TutorEmptyState";

describe("TutorEmptyState", () => {
  it("exposes automation test ids on container and actions", () => {
    const onGeneral = vi.fn();
    const onTeach = vi.fn();

    render(
      <TutorEmptyState
        icon={MessageSquare}
        title="READY TO RUN A STUDY SESSION"
        description="Test description"
        actions={[
          {
            label: "GENERAL Q&A",
            testId: "tutor-start-general-qa",
            onClick: onGeneral,
            variant: "ghost",
          },
          {
            label: "START TUTOR",
            testId: "tutor-start-teach",
            onClick: onTeach,
            variant: "primary",
          },
        ]}
      />,
    );

    expect(screen.getByTestId("tutor-empty-state")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("tutor-start-general-qa"));
    fireEvent.click(screen.getByTestId("tutor-start-teach"));
    expect(onGeneral).toHaveBeenCalledTimes(1);
    expect(onTeach).toHaveBeenCalledTimes(1);
  });
});
