import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { StudioObsidianPanel } from "@/components/studio/StudioObsidianPanel";

const getFilesMock = vi.fn();
const getFileMock = vi.fn();
const saveFileMock = vi.fn();
const createFolderMock = vi.fn();

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/api", () => ({
  api: {
    obsidian: {
      getFiles: (...args: unknown[]) => getFilesMock(...args),
      getFile: (...args: unknown[]) => getFileMock(...args),
      saveFile: (...args: unknown[]) => saveFileMock(...args),
      createFolder: (...args: unknown[]) => createFolderMock(...args),
    },
  },
}));

function renderPanel() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={client}>
      <StudioObsidianPanel
        courseName="Neuro 101"
        vaultFolder="Neuro 101/Week 9"
        studyUnit="Week 9"
        sessionName="Basal Ganglia Review"
        sessionNotes={"Key notes\n\n- Recall loop"}
        activeSessionId="sess-123"
        workflowId="wf-456"
      />
    </QueryClientProvider>,
  );
}

describe("StudioObsidianPanel", () => {
  beforeEach(() => {
    getFilesMock.mockReset().mockImplementation(async (folder?: string) => {
      if (folder === "Neuro 101/Week 9") {
        return {
          success: true,
          files: ["Overview.md", "Lecture Notes/"],
        };
      }
      if (folder === "Neuro 101/Week 9/Lecture Notes") {
        return {
          success: true,
          files: ["Ganglia.md"],
        };
      }
      return { success: true, files: [] };
    });
    getFileMock.mockReset().mockResolvedValue({
      success: true,
      content: "# Overview\n\nVault note content",
    });
    saveFileMock.mockReset().mockResolvedValue({ success: true });
    createFolderMock.mockReset().mockResolvedValue({ success: true, created: true });
  });

  it("renders the current course vault tree and previews a clicked note", async () => {
    const user = userEvent.setup();
    renderPanel();

    expect(await screen.findByTestId("studio-obsidian-root-node")).toHaveTextContent("Week 9");
    expect(await screen.findByRole("button", { name: /overview\.md/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /lecture notes/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /overview\.md/i }));

    await waitFor(() => {
      expect(getFileMock).toHaveBeenCalledWith("Neuro 101/Week 9/Overview.md");
    });
    expect(await screen.findByText(/vault note content/i)).toBeInTheDocument();
  });

  it("creates a new markdown note in the current vault folder", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(await screen.findByTestId("studio-obsidian-create-note"));

    await waitFor(() => {
      expect(saveFileMock).toHaveBeenCalledWith(
        expect.stringMatching(/^Neuro 101\/Week 9\/Untitled Note .*\.md$/),
        "# New Note\n\n",
      );
    });
  });

  it("saves the current session notes into the course vault", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(await screen.findByTestId("studio-obsidian-save-session-notes"));

    await waitFor(() => {
      expect(createFolderMock).toHaveBeenCalledWith("Neuro 101/Week 9/Session Notes");
      expect(saveFileMock).toHaveBeenCalledWith(
        expect.stringMatching(
          /^Neuro 101\/Week 9\/Session Notes\/.*Basal Ganglia Review\.md$/,
        ),
        "Key notes\n\n- Recall loop\n",
      );
    });
  });
});
