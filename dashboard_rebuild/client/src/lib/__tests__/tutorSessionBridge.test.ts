import { describe, expect, it, vi } from "vitest";
import type { MutableRefObject } from "react";

import { createLiveSessionBridge } from "../tutorSessionBridge";
import type { TutorWorkflowSessionBridge } from "@/hooks/useTutorWorkflow";

function makeStub(
  overrides: Partial<TutorWorkflowSessionBridge> = {},
): TutorWorkflowSessionBridge {
  return {
    startSession: async () => undefined,
    resumeSession: async () => undefined,
    clearActiveSessionState: () => undefined,
    checkpointWorkflowStudyTimer: async () => 0,
    latestCommittedAssistantMessage: null,
    artifacts: [],
    ...overrides,
  } as TutorWorkflowSessionBridge;
}

describe("createLiveSessionBridge (audit F1)", () => {
  it("returns a stable-reference bridge that reflects ref mutations live", () => {
    const ref: MutableRefObject<TutorWorkflowSessionBridge> = {
      current: makeStub(),
    };
    const bridge = createLiveSessionBridge(ref);

    expect(bridge.artifacts).toEqual([]);
    expect(bridge.latestCommittedAssistantMessage).toBeNull();

    // Simulate the post-commit useEffect replacing the ref with the real
    // session.
    const startSpy = vi.fn(async () => ({ session_id: "real-session" }));
    ref.current = makeStub({
      // @ts-expect-error -- startSession return shape is narrowed in prod types
      startSession: startSpy,
      artifacts: [{ type: "note", title: "live" }] as never,
      latestCommittedAssistantMessage: {
        id: "msg-1",
        content: "live read",
      } as never,
    });

    // Bridge identity must not change (useCallback deps rely on it).
    expect(bridge).toBeDefined();

    // Property access must read the updated ref.
    expect(bridge.startSession).toBe(startSpy);
    expect(bridge.artifacts).toHaveLength(1);
    expect(
      (bridge.artifacts[0] as unknown as { title: string }).title,
    ).toBe("live");
    expect(bridge.latestCommittedAssistantMessage?.content).toBe("live read");
  });

  it("preserves bridge identity across multiple ref swaps", () => {
    const ref: MutableRefObject<TutorWorkflowSessionBridge> = {
      current: makeStub(),
    };
    const bridge = createLiveSessionBridge(ref);
    const initialRef = bridge;

    ref.current = makeStub({ artifacts: [{ a: 1 } as never] });
    ref.current = makeStub({ artifacts: [{ a: 2 } as never] });

    expect(bridge).toBe(initialRef);
    expect(bridge.artifacts).toHaveLength(1);
    expect((bridge.artifacts[0] as unknown as { a: number }).a).toBe(2);
  });
});
