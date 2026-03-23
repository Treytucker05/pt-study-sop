/**
 * Hook to submit like/dislike feedback on tutor messages
 * to the Brain profile feedback endpoint.
 *
 * Maps sentiment ("liked" | "disliked") to the Brain profile's
 * responseType ("confirm" | "challenge") so the learner profile
 * can track which claims the student agrees or disagrees with.
 */

import { useCallback, useRef } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { ChatMessage } from "@/components/TutorChat.types";

export interface BrainFeedbackPayload {
  sentiment: "liked" | "disliked";
  message: ChatMessage;
  index: number;
  sessionId?: string | null;
}

export function useBrainFeedback(): {
  submitBrainFeedback: (payload: BrainFeedbackPayload) => Promise<void>;
} {
  // Prevent duplicate submissions for the same message
  const inflightRef = useRef<Set<string>>(new Set());

  const submitBrainFeedback = useCallback(
    async (payload: BrainFeedbackPayload) => {
      const messageKey =
        payload.message.messageId || `msg-${payload.index}`;

      if (inflightRef.current.has(messageKey)) return;
      inflightRef.current.add(messageKey);

      const responseType =
        payload.sentiment === "liked" ? "confirm" : "challenge";

      // Build a concise summary of the message for the profile engine
      const snippet = payload.message.content.slice(0, 300);
      const turnLabel =
        payload.message.sessionTurnNumber ?? payload.index + 1;
      const responseText = `[${payload.sentiment}] Turn ${turnLabel}: ${snippet}`;

      try {
        await api.brain.submitProfileFeedback({
          responseType,
          responseText,
          source: payload.sessionId
            ? `tutor:${payload.sessionId}`
            : "tutor",
        });
      } catch (err) {
        // Surface a non-blocking toast -- don't prevent the workflow
        // feedback from completing successfully.
        const detail =
          err instanceof Error ? err.message : "Unknown error";
        toast.error(`Brain feedback failed: ${detail}`);
      } finally {
        inflightRef.current.delete(messageKey);
      }
    },
    [],
  );

  return { submitBrainFeedback };
}
