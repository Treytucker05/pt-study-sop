import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createBroadcastChannelTransport,
  createEditRequest,
  createNoteHello,
  createNotePatch,
} from "@/lib/popoutSync";
import { TUTOR_WORKSPACE_NOTE_POPOUT_CHANNEL } from "@/lib/tutorWorkspacePopout";

const getConfigMock = vi.fn();
const getVaultIndexMock = vi.fn();
const getFileMock = vi.fn();
const saveFileMock = vi.fn();

class MockSpeechRecognition {
  continuous = true;
  interimResults = true;
  lang = "en-US";
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((event: { error?: string }) => void) | null = null;
  onresult:
    | ((
        event: {
          resultIndex: number;
          results: ArrayLike<{
            isFinal: boolean;
            0: { transcript: string };
            length: number;
            item: (index: number) => { transcript: string };
          }>;
        },
      ) => void)
    | null = null;

  start() {
    this.onstart?.();
  }

  stop() {
    this.onend?.();
  }

  emitResult(transcript: string, isFinal: boolean) {
    this.onresult?.({
      resultIndex: 0,
      results: [
        {
          isFinal,
          0: { transcript },
          length: 1,
          item: () => ({ transcript }),
        },
      ],
    });
  }
}

class FakeBroadcastChannel {
  static registry = new Map<string, Set<FakeBroadcastChannel>>();

  private listeners = new Set<(event: MessageEvent) => void>();

  constructor(private readonly name: string) {
    const bucket = FakeBroadcastChannel.registry.get(name) || new Set();
    bucket.add(this);
    FakeBroadcastChannel.registry.set(name, bucket);
  }

  postMessage(data: unknown) {
    const bucket = FakeBroadcastChannel.registry.get(this.name) || new Set();
    for (const peer of bucket) {
      if (peer === this) continue;
      for (const listener of peer.listeners) {
        listener({ data } as MessageEvent);
      }
    }
  }

  addEventListener(_type: string, listener: (event: MessageEvent) => void) {
    this.listeners.add(listener);
  }

  removeEventListener(_type: string, listener: (event: MessageEvent) => void) {
    this.listeners.delete(listener);
  }

  close() {
    const bucket = FakeBroadcastChannel.registry.get(this.name);
    bucket?.delete(this);
  }
}

vi.mock("@/lib/api", () => ({
  api: {
    obsidian: {
      getConfig: (...args: unknown[]) => getConfigMock(...args),
      getVaultIndex: (...args: unknown[]) => getVaultIndexMock(...args),
      getFile: (...args: unknown[]) => getFileMock(...args),
      saveFile: (...args: unknown[]) => saveFileMock(...args),
    },
  },
}));

vi.mock("@/components/brain/GraphPanel", () => ({
  GraphPanel: () => <div data-testid="workspace-graph-mock" />,
}));

vi.mock("@/components/ComparisonTableEditor", () => ({
  ComparisonTableEditor: () => <div data-testid="workspace-table-mock" />,
}));

import { TutorWorkspaceSurface } from "@/components/TutorWorkspaceSurface";

function renderSurface() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={client}>
      <TutorWorkspaceSurface />
    </QueryClientProvider>,
  );
}

describe("TutorWorkspaceSurface note wiring", () => {
  let recognition: MockSpeechRecognition;

  beforeEach(() => {
    vi.clearAllMocks();
    FakeBroadcastChannel.registry.clear();
    getConfigMock.mockResolvedValue({ vaultName: "Treys School" });
    getVaultIndexMock.mockResolvedValue({
      paths: {
        "Tutor Workspace/Tutor Note.md": "Tutor Workspace/Tutor Note.md",
      },
    });
    getFileMock.mockResolvedValue({ success: true, content: "# Tutor note body" });
    saveFileMock.mockResolvedValue({ success: true, path: "Tutor Workspace/Tutor Note.md" });

    recognition = new MockSpeechRecognition();
    class RecognitionCtor {
      constructor() {
        return recognition;
      }
    }
    window.webkitSpeechRecognition =
      RecognitionCtor as unknown as typeof window.webkitSpeechRecognition;
    globalThis.BroadcastChannel =
      FakeBroadcastChannel as unknown as typeof BroadcastChannel;

    window.open = vi.fn(() => ({
      closed: false,
      focus: vi.fn(),
      close: vi.fn(),
      document: {
        write: vi.fn(),
        close: vi.fn(),
      },
    })) as unknown as typeof window.open;
  });

  afterEach(() => {
    Reflect.deleteProperty(
      window as Window & {
        webkitSpeechRecognition?: typeof window.webkitSpeechRecognition;
      },
      "webkitSpeechRecognition",
    );
    Reflect.deleteProperty(
      globalThis as typeof globalThis & {
        BroadcastChannel?: typeof BroadcastChannel;
      },
      "BroadcastChannel",
    );
  });

  it("appends dictated text into the active note", async () => {
    renderSurface();

    fireEvent.click(await screen.findByRole("button", { name: /tutor note\.md/i }));
    expect(await screen.findByDisplayValue("# Tutor note body")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /dictate/i }));

    act(() => {
      recognition.emitResult("New dictated sentence.", true);
    });

    await waitFor(() => {
      expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toContain(
        "New dictated sentence.",
      );
    });
  });

  it("applies note-popout edits after the host grants the edit handshake", async () => {
    renderSurface();

    fireEvent.click(await screen.findByRole("button", { name: /tutor note\.md/i }));
    expect(await screen.findByDisplayValue("# Tutor note body")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /popout note/i }));

    const child = createBroadcastChannelTransport(
      TUTOR_WORKSPACE_NOTE_POPOUT_CHANNEL,
      FakeBroadcastChannel as unknown as typeof BroadcastChannel,
    );
    const received: unknown[] = [];
    const unsubscribe = child.subscribe((message) => {
      received.push(message);
    });

    act(() => {
      child.postMessage(createNoteHello("child-note"));
      child.postMessage(createEditRequest("child-note"));
    });

    await waitFor(() => {
      expect(
        received.some(
          (message) =>
            typeof message === "object" &&
            message !== null &&
            "type" in message &&
            (message as { type: string }).type === "note.edit.granted",
        ),
      ).toBe(true);
    });

    const grant = received.find(
      (message): message is { type: "note.edit.granted"; token: string } =>
        typeof message === "object" &&
        message !== null &&
        "type" in message &&
        (message as { type: string }).type === "note.edit.granted",
    );
    if (!grant) {
      throw new Error("Expected note.edit.granted message");
    }

    act(() => {
      child.postMessage(
        createNotePatch(
          "child-note",
          grant.token,
          "# Tutor note body\n\nEdited from popout",
          8,
        ),
      );
    });

    await waitFor(() => {
      expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toContain(
        "Edited from popout",
      );
    });

    unsubscribe();
    child.close();
  });
});
