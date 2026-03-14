import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { useChromiumDictation } from "@/lib/useChromiumDictation";

class MockSpeechRecognition {
  continuous = true;
  interimResults = true;
  lang = "en-US";
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((event: { error?: string }) => void) | null = null;
  onresult: ((event: unknown) => void) | null = null;

  start() {
    this.onstart?.();
  }

  stop() {
    this.onend?.();
  }

  abort() {
    this.onend?.();
  }
}

describe("useChromiumDictation failure paths", () => {
  afterEach(() => {
    delete window.webkitSpeechRecognition;
    delete window.SpeechRecognition;
  });

  it("reports not-allowed when the user denies microphone permission", () => {
    const recognition = new MockSpeechRecognition();
    class RecognitionCtor {
      constructor() {
        return recognition;
      }
    }
    window.webkitSpeechRecognition =
      RecognitionCtor as unknown as typeof window.webkitSpeechRecognition;

    const { result } = renderHook(() => useChromiumDictation());

    act(() => {
      result.current.start();
    });
    expect(result.current.isListening).toBe(true);

    act(() => {
      recognition.onerror?.({ error: "not-allowed" });
    });

    expect(result.current.error).toBe("not-allowed");
    expect(result.current.isListening).toBe(false);
  });

  it("reports audio-capture when the microphone is unavailable", () => {
    const recognition = new MockSpeechRecognition();
    class RecognitionCtor {
      constructor() {
        return recognition;
      }
    }
    window.webkitSpeechRecognition =
      RecognitionCtor as unknown as typeof window.webkitSpeechRecognition;

    const { result } = renderHook(() => useChromiumDictation());

    act(() => {
      result.current.start();
    });

    act(() => {
      recognition.onerror?.({ error: "audio-capture" });
    });

    expect(result.current.error).toBe("audio-capture");
    expect(result.current.isListening).toBe(false);
  });

  it("reports network error when speech service is unreachable", () => {
    const recognition = new MockSpeechRecognition();
    class RecognitionCtor {
      constructor() {
        return recognition;
      }
    }
    window.webkitSpeechRecognition =
      RecognitionCtor as unknown as typeof window.webkitSpeechRecognition;

    const { result } = renderHook(() => useChromiumDictation());

    act(() => {
      result.current.start();
    });

    act(() => {
      recognition.onerror?.({ error: "network" });
    });

    expect(result.current.error).toBe("network");
    expect(result.current.isListening).toBe(false);
  });

  it("normalizes unknown error codes to 'unknown'", () => {
    const recognition = new MockSpeechRecognition();
    class RecognitionCtor {
      constructor() {
        return recognition;
      }
    }
    window.webkitSpeechRecognition =
      RecognitionCtor as unknown as typeof window.webkitSpeechRecognition;

    const { result } = renderHook(() => useChromiumDictation());

    act(() => {
      result.current.start();
    });

    act(() => {
      recognition.onerror?.({ error: "some-future-error-code" });
    });

    expect(result.current.error).toBe("unknown");
    expect(result.current.isListening).toBe(false);
  });

  it("clears error state when clear() is called", () => {
    const { result } = renderHook(() => useChromiumDictation());

    act(() => {
      result.current.start();
    });
    expect(result.current.error).toBe("unsupported");

    act(() => {
      result.current.clear();
    });
    expect(result.current.error).toBeNull();
  });
});
