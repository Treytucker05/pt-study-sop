import { describe, it, expect } from "vitest";
import type { TutorSSEChunk } from "@/api";

/**
 * SSE streaming tests — validates TutorSSEChunk parsing logic
 * that components (BrainChat, TutorChat) rely on when reading
 * ReadableStream responses from the server.
 */

function parseSSELine(line: string): TutorSSEChunk | null {
  if (!line.startsWith("data: ")) return null;
  const raw = line.slice(6).trim();
  if (raw === "[DONE]") return null;
  return JSON.parse(raw) as TutorSSEChunk;
}

function parseSSEStream(text: string): TutorSSEChunk[] {
  return text
    .split("\n")
    .map(parseSSELine)
    .filter((c): c is TutorSSEChunk => c !== null);
}

describe("SSE chunk parsing", () => {
  it("parses a token chunk", () => {
    const chunk = parseSSELine('data: {"type":"token","content":"Hello"}');
    expect(chunk).toEqual({ type: "token", content: "Hello" });
  });

  it("parses a done chunk", () => {
    const chunk = parseSSELine('data: {"type":"done","summary":"Answer complete"}');
    expect(chunk).toEqual({ type: "done", summary: "Answer complete" });
  });

  it("parses an error chunk", () => {
    const chunk = parseSSELine('data: {"type":"error","content":"Rate limit exceeded"}');
    expect(chunk).toEqual({ type: "error", content: "Rate limit exceeded" });
  });

  it("returns null for [DONE] sentinel", () => {
    expect(parseSSELine("data: [DONE]")).toBeNull();
  });

  it("returns null for non-data lines", () => {
    expect(parseSSELine("")).toBeNull();
    expect(parseSSELine(": keep-alive")).toBeNull();
    expect(parseSSELine("event: ping")).toBeNull();
  });

  it("throws on malformed JSON after data: prefix", () => {
    expect(() => parseSSELine("data: {broken")).toThrow();
  });

  it("parses chunk with citations array", () => {
    const line = 'data: {"type":"token","content":"See ","citations":[{"title":"ATP","source":"notes.pdf"}]}';
    const chunk = parseSSELine(line);
    expect(chunk?.citations).toHaveLength(1);
    expect(chunk?.citations?.[0]).toEqual({ title: "ATP", source: "notes.pdf" });
  });

  it("parses chunk with verdict", () => {
    const line = 'data: {"type":"done","verdict":{"correct":true,"feedback":"Good"}}';
    const chunk = parseSSELine(line);
    expect(chunk?.verdict).toEqual({ correct: true, feedback: "Good" });
  });

  it("parses web_search_searching type", () => {
    const chunk = parseSSELine('data: {"type":"web_search_searching"}');
    expect(chunk?.type).toBe("web_search_searching");
  });

  it("parses tool_call type", () => {
    const chunk = parseSSELine('data: {"type":"tool_call","content":"Searching notes..."}');
    expect(chunk?.type).toBe("tool_call");
    expect(chunk?.content).toBe("Searching notes...");
  });

  it("parses mastery_update in done chunk", () => {
    const line = 'data: {"type":"done","mastery_update":{"skill_id":"atp-cycle","new_mastery":0.85,"correct":true}}';
    const chunk = parseSSELine(line);
    expect(chunk?.mastery_update).toEqual({
      skill_id: "atp-cycle",
      new_mastery: 0.85,
      correct: true,
    });
  });
});

describe("SSE stream parsing", () => {
  it("parses a full multi-line stream", () => {
    const stream = [
      'data: {"type":"token","content":"The "}',
      'data: {"type":"token","content":"answer"}',
      'data: {"type":"done","summary":"Complete"}',
      "data: [DONE]",
    ].join("\n");

    const chunks = parseSSEStream(stream);
    expect(chunks).toHaveLength(3);
    expect(chunks[0].content).toBe("The ");
    expect(chunks[1].content).toBe("answer");
    expect(chunks[2].type).toBe("done");
  });

  it("skips blank lines and comments", () => {
    const stream = [
      ": keep-alive",
      "",
      'data: {"type":"token","content":"Hi"}',
      "",
      "data: [DONE]",
    ].join("\n");

    const chunks = parseSSEStream(stream);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].content).toBe("Hi");
  });

  it("handles empty stream", () => {
    expect(parseSSEStream("")).toEqual([]);
  });

  it("handles stream with only [DONE]", () => {
    expect(parseSSEStream("data: [DONE]")).toEqual([]);
  });

  it("concatenates token content correctly", () => {
    const stream = [
      'data: {"type":"token","content":"ATP "}',
      'data: {"type":"token","content":"is the "}',
      'data: {"type":"token","content":"energy currency."}',
      'data: {"type":"done"}',
    ].join("\n");

    const chunks = parseSSEStream(stream);
    const tokens = chunks.filter((c) => c.type === "token");
    const fullText = tokens.map((c) => c.content).join("");
    expect(fullText).toBe("ATP is the energy currency.");
  });
});
