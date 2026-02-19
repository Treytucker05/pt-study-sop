import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TutorChat } from "@/components/TutorChat";

function makeSseResponse(chunks: Array<Record<string, unknown>>) {
  const encoder = new TextEncoder();
  const payload = chunks
    .map((chunk) => `data: ${JSON.stringify(chunk)}\n`)
    .join("") + "data: [DONE]\n";

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

describe("TutorChat", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

   it("creates artifact from slash command after stream completes", async () => {
     const onArtifactCreated = vi.fn();
     const onTurnComplete = vi.fn();
     vi.spyOn(globalThis, "fetch").mockResolvedValue(
       makeSseResponse([
         { type: "token", content: "Here is your card content." },
         { type: "done", model: "codex" },
       ])
     );

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
       />
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
        })
      );
    });
  });

   it("provides action buttons including Create Map for assistant replies", async () => {
     const onArtifactCreated = vi.fn();
     const onTurnComplete = vi.fn();
     vi.spyOn(globalThis, "fetch").mockResolvedValue(
       makeSseResponse([
         { type: "token", content: "This is the tutor response." },
         { type: "done", model: "codex" },
       ])
     );

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
       />
     );

    fireEvent.change(screen.getByPlaceholderText("Ask a question..."), {
      target: { value: "Explain this pathway" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));

    const createMapButton = await screen.findByRole("button", { name: /create map/i });
    fireEvent.click(createMapButton);

    expect(onArtifactCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "map",
        content: "This is the tutor response.",
      })
    );
  });

  it("sends active accuracy profile in turn content filter", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      makeSseResponse([
        { type: "token", content: "ok" },
        { type: "done", model: "codex" },
      ])
    );

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
      />
    );

    fireEvent.change(screen.getByPlaceholderText("Ask a question..."), {
      target: { value: "Teach me from selected files" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    const [, init] = fetchSpy.mock.calls[0];
    const body = JSON.parse(String((init as RequestInit).body));
    expect(body.content_filter.accuracy_profile).toBe("strict");
    expect(body.content_filter.material_ids).toEqual([11, 12]);
  });
});
