import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { TutorChat } from "@/components/TutorChat";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

/** Build a fresh SSE Response each call — Response bodies are single-use. */
function makeSseResponse(chunks: Array<Record<string, unknown>>): Response {
  const encoder = new TextEncoder();
  const payload =
    chunks.map((c) => `data: ${JSON.stringify(c)}\n`).join("") +
    "data: [DONE]\n";

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(payload));
      controller.close();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  });
}

/**
 * Mock fetch so every call gets a FRESH Response:
 *  - /turn  → SSE stream
 *  - others → empty JSON (session load, obsidian, etc.)
 *
 * Returns the spy so callers can assert on it.
 */
function mockFetchForTutor(sseChunks: Array<Record<string, unknown>>) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : (input as Request).url;

    if (url.includes("/turn")) {
      return makeSseResponse(sseChunks);
    }

    // Session load, obsidian, or any other API call
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });
}

describe("TutorChat", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("creates artifact from slash command after stream completes", async () => {
    const onArtifactCreated = vi.fn();
    const onTurnComplete = vi.fn();
    mockFetchForTutor([
      { type: "token", content: "Here is your card content." },
      { type: "done", model: "codex" },
    ]);

    render(
      <TutorChat
        sessionId="sess-1"
        availableMaterials={[]}
        selectedMaterialIds={[]}
        accuracyProfile="balanced"
        onAccuracyProfileChange={vi.fn()}
        onSelectedMaterialIdsChange={vi.fn()}
        onArtifactCreated={onArtifactCreated}
        onTurnComplete={onTurnComplete}
      />,
      { wrapper: createWrapper() },
    );

    fireEvent.change(screen.getByPlaceholderText("Ask a question..."), {
      target: { value: "/card ATP synthesis" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => {
      expect(onArtifactCreated).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "card",
          title: "ATP synthesis",
          content: "Here is your card content.",
        }),
      );
    });
  });

  it("provides action buttons including Create Map for assistant replies", async () => {
    const onArtifactCreated = vi.fn();
    const onTurnComplete = vi.fn();
    mockFetchForTutor([
      { type: "token", content: "This is the tutor response." },
      { type: "done", model: "codex" },
    ]);

    render(
      <TutorChat
        sessionId="sess-2"
        availableMaterials={[]}
        selectedMaterialIds={[]}
        accuracyProfile="balanced"
        onAccuracyProfileChange={vi.fn()}
        onSelectedMaterialIdsChange={vi.fn()}
        onArtifactCreated={onArtifactCreated}
        onTurnComplete={onTurnComplete}
      />,
      { wrapper: createWrapper() },
    );

    fireEvent.change(screen.getByPlaceholderText("Ask a question..."), {
      target: { value: "Explain this pathway" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));

    const createMapButton = await screen.findByRole("button", {
      name: /create map/i,
    });
    fireEvent.click(createMapButton);

    expect(onArtifactCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "map",
        content: "This is the tutor response.",
      }),
    );
  });

  it("sends active accuracy profile in turn content filter", async () => {
    const fetchSpy = mockFetchForTutor([
      { type: "token", content: "ok" },
      { type: "done", model: "codex" },
    ]);

    render(
      <TutorChat
        sessionId="sess-3"
        availableMaterials={[]}
        selectedMaterialIds={[11, 12]}
        accuracyProfile="strict"
        onAccuracyProfileChange={vi.fn()}
        onSelectedMaterialIdsChange={vi.fn()}
        onArtifactCreated={vi.fn()}
        onTurnComplete={vi.fn()}
      />,
      { wrapper: createWrapper() },
    );

    fireEvent.change(screen.getByPlaceholderText("Ask a question..."), {
      target: { value: "Teach me from selected files" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => {
      const turnCall = fetchSpy.mock.calls.find(([url]) =>
        String(url).includes("/turn"),
      );
      expect(turnCall).toBeDefined();
      const [, init] = turnCall!;
      const body = JSON.parse(String((init as RequestInit).body));
      expect(body.content_filter.accuracy_profile).toBe("strict");
      expect(body.content_filter.material_ids).toEqual([11, 12]);
    });
  });
});
