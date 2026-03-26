import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
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

function makeRawSseResponse(payload: string): Response {
  const encoder = new TextEncoder();
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

  it("passes backend compaction telemetry through onTurnComplete", async () => {
    const onTurnComplete = vi.fn();
    mockFetchForTutor([
      { type: "token", content: "Compaction-aware answer" },
      {
        type: "done",
        model: "codex",
        compaction_telemetry: {
          inputTokens: 12_000,
          outputTokens: 3_600,
          tokenCount: 15_600,
          contextWindow: 24_000,
          pressureLevel: "high",
        },
      },
    ]);

    render(
      <TutorChat
        sessionId="sess-telemetry"
        availableMaterials={[]}
        selectedMaterialIds={[]}
        accuracyProfile="balanced"
        onAccuracyProfileChange={vi.fn()}
        onSelectedMaterialIdsChange={vi.fn()}
        onArtifactCreated={vi.fn()}
        onTurnComplete={onTurnComplete}
      />,
      { wrapper: createWrapper() },
    );

    fireEvent.change(screen.getByPlaceholderText("Ask a question..."), {
      target: { value: "Keep explaining preload" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => {
      expect(onTurnComplete).toHaveBeenCalledWith({
        compactionTelemetry: {
          inputTokens: 12_000,
          outputTokens: 3_600,
          tokenCount: 15_600,
          contextWindow: 24_000,
          pressureLevel: "high",
        },
        masteryUpdate: undefined,
      });
    });
  });

  it("sends active memory capsule context in turn content filter", async () => {
    const fetchSpy = mockFetchForTutor([
      { type: "token", content: "ok" },
      { type: "done", model: "codex" },
    ]);

    render(
      <TutorChat
        sessionId="sess-capsule"
        availableMaterials={[]}
        selectedMaterialIds={[]}
        accuracyProfile="balanced"
        memoryCapsuleContext={
          "Summary: Learner still mixes preload with heart-rate control.\n" +
          "Current objective: Differentiate preload determinants from chronotropy."
        }
        onAccuracyProfileChange={vi.fn()}
        onSelectedMaterialIdsChange={vi.fn()}
        onArtifactCreated={vi.fn()}
        onTurnComplete={vi.fn()}
      />,
      { wrapper: createWrapper() },
    );

    fireEvent.change(screen.getByPlaceholderText("Ask a question..."), {
      target: { value: "What should I review next?" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => {
      const turnCall = fetchSpy.mock.calls.find(([url]) =>
        String(url).includes("/turn"),
      );
      expect(turnCall).toBeDefined();
      const [, init] = turnCall!;
      const body = JSON.parse(String((init as RequestInit).body));
      expect(body.content_filter.memory_capsule_context).toContain(
        "Learner still mixes preload with heart-rate control.",
      );
      expect(body.content_filter.memory_capsule_context).toContain(
        "Differentiate preload determinants from chronotropy.",
      );
    });
  });

  it("preserves typed @path references and sends them as reference targets", async () => {
    const fetchSpy = mockFetchForTutor([
      { type: "token", content: "ok" },
      { type: "done", model: "codex" },
    ]);

    render(
      <TutorChat
        sessionId="sess-paths"
        availableMaterials={[]}
        selectedMaterialIds={[]}
        accuracyProfile="balanced"
        onAccuracyProfileChange={vi.fn()}
        onSelectedMaterialIdsChange={vi.fn()}
        onArtifactCreated={vi.fn()}
        onTurnComplete={vi.fn()}
      />,
      { wrapper: createWrapper() },
    );

    fireEvent.change(screen.getByPlaceholderText("Ask a question..."), {
      target: { value: "Compare @Courses/Cardio/Week-7.md with the selected files" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => {
      const turnCall = fetchSpy.mock.calls.find(([url]) =>
        String(url).includes("/turn"),
      );
      expect(turnCall).toBeDefined();
      const [, init] = turnCall!;
      const body = JSON.parse(String((init as RequestInit).body));
      expect(body.message).toBe(
        "Compare @Courses/Cardio/Week-7.md with the selected files",
      );
      expect(body.content_filter.reference_targets).toEqual([
        "Courses/Cardio/Week-7.md",
      ]);
    });
  });

  it("surfaces a retryable error when the stream ends with malformed chunks", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : (input as Request).url;

      if (url.includes("/turn")) {
        return makeRawSseResponse(
          'data: {"type":"token","content":"Partial"}\n' +
            "data: {bad json}\n",
        );
      }

      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    render(
      <TutorChat
        sessionId="sess-4"
        availableMaterials={[]}
        selectedMaterialIds={[]}
        accuracyProfile="balanced"
        onAccuracyProfileChange={vi.fn()}
        onSelectedMaterialIdsChange={vi.fn()}
        onArtifactCreated={vi.fn()}
        onTurnComplete={vi.fn()}
      />,
      { wrapper: createWrapper() },
    );

    fireEvent.change(screen.getByPlaceholderText("Ask a question..."), {
      target: { value: "Explain the gait cycle" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));

    expect(
      await screen.findByText(/Some stream chunks were malformed/i),
    ).toBeInTheDocument();
    expect(warnSpy).toHaveBeenCalled();
  });

  it("surfaces a retryable error when malformed chunks are followed by DONE", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : (input as Request).url;

      if (url.includes("/turn")) {
        return makeRawSseResponse(
          'data: {"type":"token","content":"Partial"}\n' +
            "data: {bad json}\n" +
            "data: [DONE]\n",
        );
      }

      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    render(
      <TutorChat
        sessionId="sess-5"
        availableMaterials={[]}
        selectedMaterialIds={[]}
        accuracyProfile="balanced"
        onAccuracyProfileChange={vi.fn()}
        onSelectedMaterialIdsChange={vi.fn()}
        onArtifactCreated={vi.fn()}
        onTurnComplete={vi.fn()}
      />,
      { wrapper: createWrapper() },
    );

    fireEvent.change(screen.getByPlaceholderText("Ask a question..."), {
      target: { value: "Explain the gait cycle" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));

    expect(
      await screen.findByText(/Some stream chunks were malformed/i),
    ).toBeInTheDocument();
    expect(warnSpy).toHaveBeenCalled();
  });

  it("fires onStudioCapture with note target when To Studio -> NOTE is clicked", async () => {
    const onStudioCapture = vi.fn();
    mockFetchForTutor([
      { type: "token", content: "This is important content about ATP." },
      { type: "done", model: "codex" },
    ]);

    render(
      <TutorChat
        sessionId="sess-capture-1"
        availableMaterials={[]}
        selectedMaterialIds={[]}
        accuracyProfile="balanced"
        onAccuracyProfileChange={vi.fn()}
        onSelectedMaterialIdsChange={vi.fn()}
        onArtifactCreated={vi.fn()}
        onTurnComplete={vi.fn()}
        onStudioCapture={onStudioCapture}
      />,
      { wrapper: createWrapper() },
    );

    fireEvent.change(screen.getByPlaceholderText("Ask a question..."), {
      target: { value: "Explain ATP synthesis" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));

    const studioBtn = await screen.findByRole("button", { name: /to studio/i });
    fireEvent.click(studioBtn);

    const noteBtn = await screen.findByText("NOTE");
    fireEvent.click(noteBtn);

    expect(onStudioCapture).toHaveBeenCalledWith(
      expect.objectContaining({
        target: "note",
        itemType: "note",
        sourceKind: "tutor_chat",
        content: "This is important content about ATP.",
      }),
    );
  });

  it("fires onStudioCapture with summary_board target when To Studio -> SUMMARY BOARD is clicked", async () => {
    const onStudioCapture = vi.fn();
    mockFetchForTutor([
      { type: "token", content: "Summary-worthy content here." },
      { type: "done", model: "codex" },
    ]);

    render(
      <TutorChat
        sessionId="sess-capture-2"
        availableMaterials={[]}
        selectedMaterialIds={[]}
        accuracyProfile="balanced"
        onAccuracyProfileChange={vi.fn()}
        onSelectedMaterialIdsChange={vi.fn()}
        onArtifactCreated={vi.fn()}
        onTurnComplete={vi.fn()}
        onStudioCapture={onStudioCapture}
      />,
      { wrapper: createWrapper() },
    );

    fireEvent.change(screen.getByPlaceholderText("Ask a question..."), {
      target: { value: "What are the key pathways?" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));

    const studioBtn = await screen.findByRole("button", { name: /to studio/i });
    fireEvent.click(studioBtn);

    const summaryBtn = await screen.findByText("SUMMARY BOARD");
    fireEvent.click(summaryBtn);

    expect(onStudioCapture).toHaveBeenCalledWith(
      expect.objectContaining({
        target: "summary_board",
        itemType: "summary",
        sourceKind: "tutor_chat",
        content: "Summary-worthy content here.",
      }),
    );
  });

  it("shows a qualitative provenance label for mixed-source teaching replies", async () => {
    mockFetchForTutor([
      { type: "token", content: "This explanation uses both sources and [From training knowledge — verify with your textbooks]." },
      {
        type: "done",
        model: "codex",
        citations: [{ source: "Lecture transcript.txt", index: 1 }],
      },
    ]);

    render(
      <TutorChat
        sessionId="sess-6"
        availableMaterials={[]}
        selectedMaterialIds={[]}
        accuracyProfile="balanced"
        onAccuracyProfileChange={vi.fn()}
        onSelectedMaterialIdsChange={vi.fn()}
        onArtifactCreated={vi.fn()}
        onTurnComplete={vi.fn()}
      />,
      { wrapper: createWrapper() },
    );

    fireEvent.change(screen.getByPlaceholderText("Ask a question..."), {
      target: { value: "Teach me with an analogy" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));

    expect(
      await screen.findByText(/partly grounded, partly general knowledge/i),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/mixed confidence - verify specifics/i),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /where from/i }));
    expect(await screen.findByText(/^Confidence$/i)).toBeInTheDocument();
    expect(await screen.findByText(/Cited source: Lecture transcript.txt/i)).toBeInTheDocument();
  });

  it("renders the live TEACH runtime strip with resilient fallback text", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : (input as Request).url;

      if (url.includes("/turn")) {
        return makeSseResponse([
          { type: "token", content: "Let's walk the mechanism." },
          { type: "done", model: "codex" },
        ]);
      }

      return new Response(
        JSON.stringify({
          session_id: "sess-runtime",
          current_block_index: 0,
          chain_blocks: [
            {
              id: 8,
              name: "Teach the sodium-potassium mechanism",
              category: "teach",
              description: "Explain the mechanism chunk before checking it.",
              default_duration_min: 12,
              facilitation_prompt: "Use analogy, then build a mini process flow.",
            },
          ],
          content_filter: {},
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    });

    render(
      <TutorChat
        sessionId="sess-runtime"
        availableMaterials={[]}
        selectedMaterialIds={[]}
        accuracyProfile="balanced"
        onAccuracyProfileChange={vi.fn()}
        onSelectedMaterialIdsChange={vi.fn()}
        onArtifactCreated={vi.fn()}
        onTurnComplete={vi.fn()}
      />,
      { wrapper: createWrapper() },
    );

    fireEvent.click(screen.getByRole("button", { name: /dev info/i }));
    const runtimeStrip = await screen.findByTestId("tutor-teach-runtime-strip");
    expect(runtimeStrip).toBeInTheDocument();
    expect(within(runtimeStrip).getByText(/Live TEACH Packet/i)).toBeInTheDocument();
    expect(within(runtimeStrip).getByText(/^Procedure$/i)).toBeInTheDocument();
    expect(within(runtimeStrip).getByText(/^Analogy$/i)).toBeInTheDocument();
    expect(within(runtimeStrip).getByText(/Mini Process Flow/i)).toBeInTheDocument();
    expect(within(runtimeStrip).getByText(/Waiting on backend fields/i)).toBeInTheDocument();
  });

  it("uses backend TEACH packet data without showing missing-field warnings", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : (input as Request).url;

      if (url.includes("/turn")) {
        return makeSseResponse([
          { type: "token", content: "Mechanism locked." },
          { type: "done", model: "codex" },
        ]);
      }

      return new Response(
        JSON.stringify({
          session_id: "sess-runtime-backend",
          current_block_index: 0,
          teach_packet: {
            concept_type: "mechanism",
            current_bridge: "analogy",
            current_depth: "L3",
            depth_start: "L0",
            depth_ceiling: "L4",
            required_close_artifact: "mini_process_flow",
            function_confirmation: "pending",
            function_confirmed: false,
            l4_unlocked: false,
            mnemonic_state: "locked_until_artifact",
          },
          chain_blocks: [
            {
              id: 8,
              name: "Teach the sodium-potassium mechanism",
              category: "teach",
              description: "Explain the mechanism chunk before checking it.",
              default_duration_min: 12,
              facilitation_prompt: "Use analogy, then build a mini process flow.",
              teach_packet: {
                concept_type: "mechanism",
                current_bridge: "analogy",
                current_depth: "L3",
                required_close_artifact: "mini_process_flow",
                function_confirmation: "pending",
                l4_unlocked: false,
                mnemonic_state: "locked_until_artifact",
              },
            },
          ],
          content_filter: {},
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    });

    render(
      <TutorChat
        sessionId="sess-runtime-backend"
        availableMaterials={[]}
        selectedMaterialIds={[]}
        accuracyProfile="balanced"
        onAccuracyProfileChange={vi.fn()}
        onSelectedMaterialIdsChange={vi.fn()}
        onArtifactCreated={vi.fn()}
        onTurnComplete={vi.fn()}
      />,
      { wrapper: createWrapper() },
    );

    fireEvent.click(screen.getByRole("button", { name: /dev info/i }));
    const runtimeStrip = await screen.findByTestId("tutor-teach-runtime-strip");
    expect(runtimeStrip).toBeInTheDocument();
    expect(within(runtimeStrip).getByText(/^Mechanism$/i)).toBeInTheDocument();
    expect(within(runtimeStrip).getByText(/^Analogy$/i)).toBeInTheDocument();
    expect(within(runtimeStrip).getByText(/Mini Process Flow/i)).toBeInTheDocument();
    expect(within(runtimeStrip).queryByText(/Waiting on backend fields/i)).not.toBeInTheDocument();
  });
});
