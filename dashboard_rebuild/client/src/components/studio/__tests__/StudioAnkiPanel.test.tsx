import type { ComponentProps } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { StudioAnkiPanel } from "@/components/studio/StudioAnkiPanel";

const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();
const clipboardWriteTextMock = vi.fn();
const useQueryMock = vi.fn();
let draftQueryData: Array<{
  id: number;
  sessionId: string;
  deckName: string;
  cardType: string;
  front: string;
  back: string;
  tags: string;
  status: string;
  createdAt: string;
}> = [];

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}));

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>(
    "@tanstack/react-query",
  );

  return {
    ...actual,
    useQuery: (...args: unknown[]) => useQueryMock(...args),
  };
});

vi.mock("@/lib/api", () => ({
  api: {
    anki: {
      getDrafts: vi.fn(),
    },
  },
}));

function renderPanel(overrides: Partial<ComponentProps<typeof StudioAnkiPanel>> = {}) {
  return render(
    <StudioAnkiPanel
      activeSessionId="sess-123"
      workflowId="wf-456"
      sessionName="Basal Ganglia Review"
      draftCardRequestText={"Front from queue :: Back from queue\nIncomplete card"}
      {...overrides}
    />,
  );
}

describe("StudioAnkiPanel", () => {
  beforeEach(() => {
    draftQueryData = [
      {
        id: 1,
        sessionId: "sess-123",
        courseId: 3,
        deckName: "Neuro::Week 9",
        cardType: "basic",
        front: "What is the direct pathway?",
        back: "It facilitates intended movement.",
        tags: "neuro basal-ganglia",
        status: "approved",
        createdAt: "2026-03-29T10:00:00",
      },
      {
        id: 2,
        sessionId: "other-session",
        courseId: 9,
        deckName: "Other",
        cardType: "basic",
        front: "Ignore me",
        back: "Out of scope",
        tags: "",
        status: "approved",
        createdAt: "2026-03-29T10:01:00",
      },
    ];
    useQueryMock.mockReset().mockReturnValue({
      data: draftQueryData,
      isLoading: false,
    });
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
    clipboardWriteTextMock.mockReset().mockResolvedValue(undefined);

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: clipboardWriteTextMock,
      },
    });

    URL.createObjectURL = vi.fn().mockReturnValue("blob:anki-export");
    URL.revokeObjectURL = vi.fn();
  });

  it("shows session-scoped drafts and card queue previews", () => {
    renderPanel();

    expect(screen.getByDisplayValue("What is the direct pathway?")).toBeInTheDocument();
    expect(screen.getByDisplayValue("It facilitates intended movement.")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Front from queue")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Back from queue")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("Ignore me")).not.toBeInTheDocument();
  });

  it("falls back to course-scoped drafts when no session is active yet", () => {
    renderPanel({
      activeSessionId: null,
      courseId: 3,
      draftCardRequestText: "",
    });

    expect(screen.getByDisplayValue("What is the direct pathway?")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("Ignore me")).not.toBeInTheDocument();
  });

  it("lets the user edit cards before export", async () => {
    const user = userEvent.setup();
    renderPanel();

    const queueFront = screen.getByDisplayValue("Front from queue");
    await user.clear(queueFront);
    await user.type(queueFront, "Edited front");

    expect(screen.getByDisplayValue("Edited front")).toBeInTheDocument();
  });

  it("copies an individual card to the clipboard", async () => {
    renderPanel();

    fireEvent.click(screen.getAllByRole("button", { name: /copy/i })[0]);

    await waitFor(() => {
      expect(clipboardWriteTextMock).toHaveBeenCalledWith(
        "What is the direct pathway?\tIt facilitates intended movement.",
      );
    });
  });

  it("exports the edited cards as CSV", async () => {
    const user = userEvent.setup();
    const appendSpy = vi.spyOn(document.body, "appendChild");
    const removeSpy = vi.spyOn(HTMLElement.prototype, "remove");
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);

    renderPanel({ draftCardRequestText: "Front from queue :: Back from queue" });

    await user.click(screen.getByRole("button", { name: /export csv/i }));

    await waitFor(() => {
      expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:anki-export");
    });

    expect(appendSpy).toHaveBeenCalledWith(expect.any(HTMLAnchorElement));
    expect(removeSpy).toHaveBeenCalled();
    expect(toastSuccessMock).toHaveBeenCalledWith("Exported 2 card(s) to CSV.");
  });
});
