import { useEffect, useEffectEvent, useRef, useState } from "react";

type DictationErrorCode =
  | "unsupported"
  | "not-allowed"
  | "audio-capture"
  | "network"
  | "aborted"
  | "service-not-allowed"
  | "unknown";

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternativeLike;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionErrorEventLike {
  error?: string;
  message?: string;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  start(): void;
  stop(): void;
  abort?(): void;
}

interface SpeechRecognitionConstructorLike {
  new (): SpeechRecognitionLike;
}

declare global {
  interface Window {
    webkitSpeechRecognition?: SpeechRecognitionConstructorLike;
    SpeechRecognition?: SpeechRecognitionConstructorLike;
  }
}

export interface ChromiumDictationOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onText?: (text: string) => void;
}

export interface ChromiumDictationState {
  supported: boolean;
  isListening: boolean;
  unsupportedReason: string | null;
  error: DictationErrorCode | null;
  lastTranscript: string;
  interimTranscript: string;
  start: () => boolean;
  stop: () => void;
  toggle: () => boolean;
  clear: () => void;
}

const UNSUPPORTED_REASON =
  "Speech dictation is unavailable in this browser. Chromium-based browsers are required for v1.";

function getSpeechRecognitionConstructor():
  | SpeechRecognitionConstructorLike
  | null {
  if (typeof window === "undefined") return null;
  return window.webkitSpeechRecognition || window.SpeechRecognition || null;
}

function normalizeErrorCode(raw: string | undefined): DictationErrorCode {
  switch (raw) {
    case "not-allowed":
    case "audio-capture":
    case "network":
    case "aborted":
    case "service-not-allowed":
      return raw;
    default:
      return "unknown";
  }
}

export function useChromiumDictation(
  options: ChromiumDictationOptions = {},
): ChromiumDictationState {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<DictationErrorCode | null>(null);
  const [lastTranscript, setLastTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const constructorRef = useRef<SpeechRecognitionConstructorLike | null>(
    getSpeechRecognitionConstructor(),
  );

  const supported = constructorRef.current !== null;
  const unsupportedReason = supported ? null : UNSUPPORTED_REASON;

  const onText = useEffectEvent((text: string) => {
    options.onText?.(text);
  });

  const stop = useEffectEvent(() => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      setIsListening(false);
      return;
    }
    try {
      recognition.stop();
    } catch {
      recognition.abort?.();
    }
    setIsListening(false);
  });

  const start = useEffectEvent(() => {
    const RecognitionCtor = constructorRef.current;
    if (!RecognitionCtor) {
      setError("unsupported");
      setIsListening(false);
      return false;
    }

    let recognition = recognitionRef.current;
    if (!recognition) {
      recognition = new RecognitionCtor();
      recognition.continuous = options.continuous ?? true;
      recognition.interimResults = options.interimResults ?? true;
      recognition.lang = options.lang || "en-US";
      recognition.onstart = () => {
        setError(null);
        setIsListening(true);
      };
      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript("");
      };
      recognition.onerror = (event) => {
        setError(normalizeErrorCode(event.error));
        setIsListening(false);
      };
      recognition.onresult = (event) => {
        let finalTranscript = "";
        let interim = "";

        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          const alternative = result?.[0] || result?.item?.(0);
          const chunk = String(alternative?.transcript || "");
          if (!chunk) continue;
          if (result.isFinal) {
            finalTranscript += chunk;
          } else {
            interim += chunk;
          }
        }

        if (interim) {
          setInterimTranscript(interim.trim());
        } else {
          setInterimTranscript("");
        }

        const normalizedFinal = finalTranscript.trim();
        if (normalizedFinal) {
          setLastTranscript(normalizedFinal);
          onText(normalizedFinal);
        }
      };
      recognitionRef.current = recognition;
    }

    try {
      recognition.start();
      return true;
    } catch {
      setError("unknown");
      setIsListening(false);
      return false;
    }
  });

  useEffect(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    recognition.continuous = options.continuous ?? true;
    recognition.interimResults = options.interimResults ?? true;
    recognition.lang = options.lang || "en-US";
  }, [options.continuous, options.interimResults, options.lang]);

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.abort?.();
      } catch {
        // Ignore teardown failures from browser speech APIs.
      }
      recognitionRef.current = null;
    };
  }, []);

  return {
    supported,
    isListening,
    unsupportedReason,
    error,
    lastTranscript,
    interimTranscript,
    start,
    stop,
    toggle: () => {
      if (isListening) {
        stop();
        return false;
      }
      return start();
    },
    clear: () => {
      setLastTranscript("");
      setInterimTranscript("");
      setError(null);
    },
  };
}
