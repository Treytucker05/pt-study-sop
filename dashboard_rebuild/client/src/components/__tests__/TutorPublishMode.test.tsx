import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getStatusMock = vi.fn();
const getConfigMock = vi.fn();
const appendMock = vi.fn();
const getDraftsMock = vi.fn();
const getSessionMock = vi.fn();
const mockToast = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    obsidian: {
      getStatus: (...args: unknown[]) => getStatusMock(...args),
      getConfig: (...args: unknown[]) => getConfigMock(...args),
      append: (...args: unknown[]) => appendMock(...args),
    },
    anki: {
      getDrafts: (...args: unknown[]) => getDraftsMock(...args),
    },
    tutor: {
      getSession: (...args: unknown[]) => getSessionMock(...args),
    },
  },
}));

vi.mock("@/components/AnkiIntegration", () => ({
  AnkiIntegration: ({ totalCards }: { totalCards: number }) => (
    <div data-testid="anki-integration">cards:{totalCards}</div>
  ),
}));

vi.mock("@/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

import { TutorPublishMode } from "@/components/TutorPublishMode";

function renderMode(ui: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  getStatusMock.mockResolvedValue({ connected: true });
  getConfigMock.mockResolvedValue({ vaultName: "Treys School" });
  appendMock.mockResolvedValue({ success: true, path: "Courses/Neuro/Tutor Exports/Brainstem.md" });
  getDraftsMock.mockResolvedValue([
    { id: 1, status: "pending", front: "Q1", back: "A1", deckName: "Neuro" },
    { id: 2, status: "approved", front: "Q2", back: "A2", deckName: "Neuro" },
  ]);
  getSessionMock.mockResolvedValue({
    topic: "Brainstem",
    started_at: "2026-03-13T10:00:00Z",
    turn_count: 1,
    turns: [{ turn_number: 1, question: "What is the medulla?", answer: "Lower brainstem." }],
  });
});

describe("TutorPublishMode", () => {
  it("shows publish controls with pending Anki draft count", async () => {
    renderMode(<TutorPublishMode courseName="Neuro" topic="Brainstem" />);

    expect(await screen.findByText("PUBLISH MODE")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Courses/Neuro/Tutor Exports/Brainstem.md")).toBeInTheDocument();
    expect(screen.getByText("Obsidian ready")).toBeInTheDocument();
    expect(screen.getByTestId("anki-integration")).toHaveTextContent("cards:1");
  });

  it("loads the active session into the markdown draft and publishes it to Obsidian", async () => {
    const onPublished = vi.fn();
    renderMode(
      <TutorPublishMode
        activeSessionId="session-7"
        courseName="Neuro"
        topic="Brainstem"
        onPublished={onPublished}
      />
    );

    fireEvent.click(await screen.findByText("Load Current Session"));

    await waitFor(() => {
      expect(getSessionMock).toHaveBeenCalledWith("session-7");
      expect(screen.getByDisplayValue(/What is the medulla\?/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Publish to Obsidian"));

    await waitFor(() => {
      expect(appendMock).toHaveBeenCalledWith(
        "Courses/Neuro/Tutor Exports/Brainstem.md",
        expect.stringContaining("What is the medulla?")
      );
      expect(onPublished).toHaveBeenCalledWith({
        path: "Courses/Neuro/Tutor Exports/Brainstem.md",
        sessionId: "session-7",
      });
    });
  });

  it("shows destructive toast when Obsidian publish fails", async () => {
    appendMock.mockRejectedValueOnce(new Error("vault write error"));

    renderMode(
      <TutorPublishMode
        activeSessionId="session-fail"
        courseName="Neuro"
        topic="Brainstem"
        noteMarkdown="Some markdown content"
      />
    );

    expect(await screen.findByText("PUBLISH MODE")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Publish to Obsidian"));

    await waitFor(() => {
      expect(appendMock).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Publish failed",
          variant: "destructive",
        })
      );
    });
  });

  it("shows destructive toast when session load fails", async () => {
    getSessionMock.mockRejectedValueOnce(new Error("session not found"));

    renderMode(
      <TutorPublishMode
        activeSessionId="session-missing"
        courseName="Neuro"
        topic="Brainstem"
      />
    );

    fireEvent.click(await screen.findByText("Load Current Session"));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Session load failed",
          variant: "destructive",
        })
      );
    });
  });

  it("disables publish button when Obsidian is offline", async () => {
    getStatusMock.mockResolvedValue({ connected: false });

    renderMode(<TutorPublishMode courseName="Neuro" topic="Brainstem" noteMarkdown="Content" />);

    expect(await screen.findByText("Obsidian offline")).toBeInTheDocument();
    expect(screen.getByText("Publish to Obsidian").closest("button")).toBeDisabled();
  });
});
