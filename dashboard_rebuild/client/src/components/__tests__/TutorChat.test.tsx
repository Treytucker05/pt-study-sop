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
         onSelectedMaterialIdsChange={vi.fn()}
         onArtifactCreated={onArtifactCreated}
         onTurnComplete={onTurnComplete}
       />
     );

    fireEvent.change(screen.getByPlaceholderText("Ask a question..."), {
      target: { value: "/card ATP synthesis" },
    });
    fireEvent.click(screen.getByRole("button"));

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
         onSelectedMaterialIdsChange={vi.fn()}
         onArtifactCreated={onArtifactCreated}
         onTurnComplete={onTurnComplete}
       />
     );

    fireEvent.change(screen.getByPlaceholderText("Ask a question..."), {
      target: { value: "Explain this pathway" },
    });
    fireEvent.click(screen.getByRole("button"));

    const createMapButton = await screen.findByRole("button", { name: /create map/i });
    fireEvent.click(createMapButton);

    expect(onArtifactCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "map",
        content: "This is the tutor response.",
      })
    );
  });
});
