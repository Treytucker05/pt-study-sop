import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useChromiumDictation } from "@/lib/useChromiumDictation";

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

describe("useChromiumDictation", () => {
  afterEach(() => {
    delete window.webkitSpeechRecognition;
    delete window.SpeechRecognition;
  });

  it("degrades cleanly when speech recognition is unsupported", () => {
    const { result } = renderHook(() => useChromiumDictation());

    expect(result.current.supported).toBe(false);
    expect(result.current.unsupportedReason).toMatch(/Chromium-based browsers/);

    act(() => {
      const started = result.current.start();
      expect(started).toBe(false);
    });

    expect(result.current.error).toBe("unsupported");
  });

  it("captures final dictated text when webkit speech recognition is available", () => {
    const recognition = new MockSpeechRecognition();
    class RecognitionCtor {
      constructor() {
        return recognition;
      }
    }
    window.webkitSpeechRecognition =
      RecognitionCtor as unknown as typeof window.webkitSpeechRecognition;

    const onText = vi.fn();
    const { result } = renderHook(() =>
      useChromiumDictation({ onText, interimResults: true }),
    );

    act(() => {
      const started = result.current.start();
      expect(started).toBe(true);
    });

    expect(result.current.isListening).toBe(true);

    act(() => {
      recognition.emitResult("draft thought", false);
    });
    expect(result.current.interimTranscript).toBe("draft thought");

    act(() => {
      recognition.emitResult("final note sentence", true);
    });

    expect(result.current.lastTranscript).toBe("final note sentence");
    expect(onText).toHaveBeenCalledWith("final note sentence");

    act(() => {
      result.current.stop();
    });

    expect(result.current.isListening).toBe(false);
  });
});
