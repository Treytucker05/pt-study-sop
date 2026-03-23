import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { usePacketCapture } from "@/hooks/usePacketCapture";
import type { PacketItem } from "@/components/workspace/PacketPanel";

type PartialPacketItem = Omit<PacketItem, "id" | "addedAt">;

describe("usePacketCapture", () => {
  const createMocks = () => ({
    onAddToPacket: vi.fn<[PartialPacketItem], void>(),
    onLogFeedback: vi.fn(),
  });

  // ── captureExactNote ──────────────────────────────────────────────────

  it("captureExactNote creates note item with [Exact] prefix", () => {
    const { onAddToPacket, onLogFeedback } = createMocks();
    const { result } = renderHook(() =>
      usePacketCapture(onAddToPacket, onLogFeedback),
    );

    const item = result.current.captureExactNote("AI Reply", "Some content");

    expect(onAddToPacket).toHaveBeenCalledOnce();
    const arg = onAddToPacket.mock.calls[0][0];
    expect(arg.type).toBe("note");
    expect(arg.title).toBe("[Exact] AI Reply");
    expect(arg.content).toBe("Some content");
    expect(item.type).toBe("note");
    expect(item.title).toBe("[Exact] AI Reply");
  });

  // ── captureEditableNote ───────────────────────────────────────────────

  it("captureEditableNote creates note item with [Editable] prefix", () => {
    const { onAddToPacket, onLogFeedback } = createMocks();
    const { result } = renderHook(() =>
      usePacketCapture(onAddToPacket, onLogFeedback),
    );

    const item = result.current.captureEditableNote("AI Reply", "Edit me");

    expect(onAddToPacket).toHaveBeenCalledOnce();
    const arg = onAddToPacket.mock.calls[0][0];
    expect(arg.type).toBe("note");
    expect(arg.title).toBe("[Editable] AI Reply");
    expect(arg.content).toBe("Edit me");
    expect(item.type).toBe("note");
    expect(item.title).toBe("[Editable] AI Reply");
  });

  // ── captureNote ───────────────────────────────────────────────────────

  it("captureNote creates plain note item", () => {
    const { onAddToPacket, onLogFeedback } = createMocks();
    const { result } = renderHook(() =>
      usePacketCapture(onAddToPacket, onLogFeedback),
    );

    const item = result.current.captureNote("My Note", "Note body");

    expect(onAddToPacket).toHaveBeenCalledOnce();
    const arg = onAddToPacket.mock.calls[0][0];
    expect(arg.type).toBe("note");
    expect(arg.title).toBe("My Note");
    expect(arg.content).toBe("Note body");
    expect(item.type).toBe("note");
    expect(item.title).toBe("My Note");
  });

  // ── captureCapsule ────────────────────────────────────────────────────

  it("captureCapsule formats all sections into content", () => {
    const { onAddToPacket, onLogFeedback } = createMocks();
    const { result } = renderHook(() =>
      usePacketCapture(onAddToPacket, onLogFeedback),
    );

    const item = result.current.captureCapsule(
      "Good session",
      ["weak1", "weak2"],
      ["question1"],
      ["card1", "card2"],
    );

    expect(onAddToPacket).toHaveBeenCalledOnce();
    const arg = onAddToPacket.mock.calls[0][0];
    expect(arg.type).toBe("note");
    expect(arg.content).toContain("Summary:\nGood session");
    expect(arg.content).toContain("Weak Points:\n- weak1\n- weak2");
    expect(arg.content).toContain("Unresolved:\n- question1");
    expect(arg.content).toContain("Card Requests:\n- card1\n- card2");
    expect(item.type).toBe("note");
  });

  it("captureCapsule handles empty arrays gracefully", () => {
    const { onAddToPacket, onLogFeedback } = createMocks();
    const { result } = renderHook(() =>
      usePacketCapture(onAddToPacket, onLogFeedback),
    );

    const item = result.current.captureCapsule("Summary only", [], [], []);

    const arg = onAddToPacket.mock.calls[0][0];
    expect(arg.content).toContain("Summary:\nSummary only");
    expect(arg.content).toContain("Weak Points:\n(none)");
    expect(arg.content).toContain("Unresolved:\n(none)");
    expect(arg.content).toContain("Card Requests:\n(none)");
    expect(item.type).toBe("note");
  });

  // ── captureCompactSummary ─────────────────────────────────────────────

  it("captureCompactSummary creates note with correct title", () => {
    const { onAddToPacket, onLogFeedback } = createMocks();
    const { result } = renderHook(() =>
      usePacketCapture(onAddToPacket, onLogFeedback),
    );

    const item = result.current.captureCompactSummary("Session went well...");

    expect(onAddToPacket).toHaveBeenCalledOnce();
    const arg = onAddToPacket.mock.calls[0][0];
    expect(arg.type).toBe("note");
    expect(arg.title).toBe("Session Compact Summary");
    expect(arg.content).toBe("Session went well...");
    expect(item.title).toBe("Session Compact Summary");
  });

  // ── logFeedback ───────────────────────────────────────────────────────

  it("logFeedback calls feedback callback, NOT packet callback", () => {
    const { onAddToPacket, onLogFeedback } = createMocks();
    const { result } = renderHook(() =>
      usePacketCapture(onAddToPacket, onLogFeedback),
    );

    result.current.logFeedback("msg-123", "liked", "helpful", "Great answer");

    expect(onLogFeedback).toHaveBeenCalledOnce();
    expect(onLogFeedback).toHaveBeenCalledWith({
      messageId: "msg-123",
      sentiment: "liked",
      category: "helpful",
      comment: "Great answer",
    });
    expect(onAddToPacket).not.toHaveBeenCalled();
  });

  it("logFeedback works without optional fields", () => {
    const { onAddToPacket, onLogFeedback } = createMocks();
    const { result } = renderHook(() =>
      usePacketCapture(onAddToPacket, onLogFeedback),
    );

    result.current.logFeedback("msg-456", "disliked");

    expect(onLogFeedback).toHaveBeenCalledWith({
      messageId: "msg-456",
      sentiment: "disliked",
      category: undefined,
      comment: undefined,
    });
    expect(onAddToPacket).not.toHaveBeenCalled();
  });

  it("logFeedback is a no-op when onLogFeedback is not provided", () => {
    const { onAddToPacket } = createMocks();
    const { result } = renderHook(() => usePacketCapture(onAddToPacket));

    // Should not throw
    result.current.logFeedback("msg-789", "liked");
    expect(onAddToPacket).not.toHaveBeenCalled();
  });

  // ── Return value ──────────────────────────────────────────────────────

  it("all capture functions return the created item", () => {
    const { onAddToPacket, onLogFeedback } = createMocks();
    const { result } = renderHook(() =>
      usePacketCapture(onAddToPacket, onLogFeedback),
    );

    const exact = result.current.captureExactNote("T", "C");
    const editable = result.current.captureEditableNote("T", "C");
    const note = result.current.captureNote("T", "C");
    const capsule = result.current.captureCapsule("S", [], [], []);
    const compact = result.current.captureCompactSummary("S");

    for (const item of [exact, editable, note, capsule, compact]) {
      expect(item).toHaveProperty("type", "note");
      expect(item).toHaveProperty("title");
      expect(item).toHaveProperty("content");
    }
  });
});
