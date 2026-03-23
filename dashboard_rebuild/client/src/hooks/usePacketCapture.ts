import { useCallback } from "react";
import type { PacketItem } from "@/components/workspace/PacketPanel";

type PartialPacketItem = Omit<PacketItem, "id" | "addedAt">;

interface FeedbackPayload {
  messageId: string;
  sentiment: string;
  category?: string;
  comment?: string;
}

export interface UsePacketCaptureReturn {
  /** Save exact AI reply as a Packet item */
  captureExactNote: (title: string, content: string) => PartialPacketItem;

  /** Save editable note as a Packet item */
  captureEditableNote: (title: string, content: string) => PartialPacketItem;

  /** Save generic note */
  captureNote: (title: string, content: string) => PartialPacketItem;

  /** Save memory capsule to Packet */
  captureCapsule: (
    summary: string,
    weakPoints: string[],
    unresolvedQuestions: string[],
    cardRequests: string[],
  ) => PartialPacketItem;

  /** Save compact summary to Packet */
  captureCompactSummary: (summary: string) => PartialPacketItem;

  /** Log feedback to Brain system (NOT to Packet) */
  logFeedback: (
    messageId: string,
    sentiment: "liked" | "disliked",
    category?: string,
    comment?: string,
  ) => void;
}

function formatList(items: string[]): string {
  if (items.length === 0) return "(none)";
  return items.map((item) => `- ${item}`).join("\n");
}

export function usePacketCapture(
  onAddToPacket: (item: PartialPacketItem) => void,
  onLogFeedback?: (feedback: FeedbackPayload) => void,
): UsePacketCaptureReturn {
  const captureExactNote = useCallback(
    (title: string, content: string): PartialPacketItem => {
      const item: PartialPacketItem = {
        type: "note",
        title: `[Exact] ${title}`,
        content,
      };
      onAddToPacket(item);
      return item;
    },
    [onAddToPacket],
  );

  const captureEditableNote = useCallback(
    (title: string, content: string): PartialPacketItem => {
      const item: PartialPacketItem = {
        type: "note",
        title: `[Editable] ${title}`,
        content,
      };
      onAddToPacket(item);
      return item;
    },
    [onAddToPacket],
  );

  const captureNote = useCallback(
    (title: string, content: string): PartialPacketItem => {
      const item: PartialPacketItem = {
        type: "note",
        title,
        content,
      };
      onAddToPacket(item);
      return item;
    },
    [onAddToPacket],
  );

  const captureCapsule = useCallback(
    (
      summary: string,
      weakPoints: string[],
      unresolvedQuestions: string[],
      cardRequests: string[],
    ): PartialPacketItem => {
      const content = [
        `Summary:\n${summary}`,
        `Weak Points:\n${formatList(weakPoints)}`,
        `Unresolved:\n${formatList(unresolvedQuestions)}`,
        `Card Requests:\n${formatList(cardRequests)}`,
      ].join("\n\n");

      const item: PartialPacketItem = {
        type: "note",
        title: "Memory Capsule",
        content,
      };
      onAddToPacket(item);
      return item;
    },
    [onAddToPacket],
  );

  const captureCompactSummary = useCallback(
    (summary: string): PartialPacketItem => {
      const item: PartialPacketItem = {
        type: "note",
        title: "Session Compact Summary",
        content: summary,
      };
      onAddToPacket(item);
      return item;
    },
    [onAddToPacket],
  );

  const logFeedback = useCallback(
    (
      messageId: string,
      sentiment: "liked" | "disliked",
      category?: string,
      comment?: string,
    ): void => {
      onLogFeedback?.({ messageId, sentiment, category, comment });
    },
    [onLogFeedback],
  );

  return {
    captureExactNote,
    captureEditableNote,
    captureNote,
    captureCapsule,
    captureCompactSummary,
    logFeedback,
  };
}
