/**
 * Regression test for audit bug F2:
 * `useSSEStream` must abort any in-flight SSE request and refuse to issue
 * further React state updates after the hosting component unmounts.
 *
 * Pre-remediation: the hook had no unmount cleanup, so `fetch` kept reading
 * the stream after unmount and `setMessages` calls produced "state update on
 * unmounted component" warnings in the console.
 */
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useSSEStream } from "@/components/useSSEStream";

describe("useSSEStream — unmount cleanup (audit F2)", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("aborts the in-flight stream when the hosting component unmounts", async () => {
    let capturedSignal: AbortSignal | undefined;
    const fetchSpy = vi.fn(
      async (_url: string, init?: RequestInit): Promise<Response> => {
        capturedSignal = init?.signal ?? undefined;
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("aborted", "AbortError"));
          });
        });
      },
    );
    global.fetch = fetchSpy as unknown as typeof fetch;

    const { result, unmount } = renderHook(() =>
      useSSEStream({
        sessionId: "sess-1",
        selectedMaterialIds: [],
        selectedVaultPaths: [],
        accuracyProfile: "core" as never,
        behaviorOverride: null,
        onBehaviorOverrideReset: () => {},
        onArtifactCreated: () => {},
        materialsOn: true,
        obsidianOn: false,
        webSearchOn: false,
        deepThinkOn: false,
        geminiVisionOn: false,
      }),
    );

    act(() => {
      result.current.setInput("hello");
    });
    act(() => {
      result.current.sendMessage();
    });

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
    expect(capturedSignal).toBeDefined();
    expect(capturedSignal?.aborted).toBe(false);

    const abortRef = result.current.streamAbortRef;

    unmount();

    await waitFor(() => {
      expect(capturedSignal?.aborted).toBe(true);
    });
    expect(abortRef.current).toBeNull();
  });
});
