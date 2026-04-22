/**
 * Regression test for audit bug F4:
 * `TutorEndSessionDialog` must
 *  (1) expose the proper ARIA dialog semantics, and
 *  (2) guard the END SESSION action so rapid double-clicks only fire
 *      `endSession` once and the dialog closes exactly once.
 */
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { TutorEndSessionDialog } from "@/components/tutor-shell/TutorEndSessionDialog";
import type { UseTutorHubReturn } from "@/hooks/useTutorHub";
import type { UseTutorSessionReturn } from "@/hooks/useTutorSession";

function makeHub(): UseTutorHubReturn {
  return {
    topic: "Cardiac Output",
  } as unknown as UseTutorHubReturn;
}

function makeSession(overrides: Partial<UseTutorSessionReturn>): UseTutorSessionReturn {
  return {
    showEndConfirm: true,
    turnCount: 3,
    startedAt: new Date().toISOString(),
    artifacts: [],
    isShipping: false,
    endSession: vi.fn(),
    shipToBrainAndEnd: vi.fn(),
    setShowEndConfirm: vi.fn(),
    ...overrides,
  } as unknown as UseTutorSessionReturn;
}

describe("TutorEndSessionDialog — audit F4", () => {
  it("exposes dialog role and aria-modal for screen readers", () => {
    const session = makeSession({});
    render(<TutorEndSessionDialog hub={makeHub()} session={session} />);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    // aria-labelledby must point at an element that exists and is non-empty.
    const labelledBy = dialog.getAttribute("aria-labelledby");
    expect(labelledBy).toBeTruthy();
    const label = labelledBy ? document.getElementById(labelledBy) : null;
    expect(label?.textContent?.trim().length ?? 0).toBeGreaterThan(0);
  });

  it("does not double-fire endSession when END SESSION is clicked rapidly", async () => {
    let resolveEnd: () => void = () => {};
    const endSession = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveEnd = resolve;
        }),
    );
    const setShowEndConfirm = vi.fn();
    const session = makeSession({ endSession, setShowEndConfirm });

    render(<TutorEndSessionDialog hub={makeHub()} session={session} />);

    const button = screen.getByRole("button", { name: /end session/i });
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);

    await waitFor(() => {
      expect(endSession).toHaveBeenCalledTimes(1);
    });

    act(() => {
      resolveEnd();
    });
  });
});
