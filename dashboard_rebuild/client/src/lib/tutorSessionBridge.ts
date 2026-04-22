import type { MutableRefObject } from "react";

import type { TutorWorkflowSessionBridge } from "@/hooks/useTutorWorkflow";

/**
 * Build a stable-identity `TutorWorkflowSessionBridge` whose property reads
 * are forwarded live to `sessionRef.current`.
 *
 * Audit F1 remediation: `useTutorWorkflow` runs BEFORE `useTutorSession`
 * inside `tutor.tsx`, so on the first render it only sees the default
 * `sessionBridgeRef.current` stub. Pre-fix we passed `sessionBridgeRef.current`
 * directly as the `session` prop, which captured whatever value lived in
 * the ref at render time -- meaning any `useCallback` inside
 * `useTutorWorkflow` closed over the stub, not the real session.
 *
 * Post-fix we wrap the ref in a getter-based object with a stable
 * reference. Callbacks inside `useTutorWorkflow` can still close over
 * `session`, but each property access (`session.startSession`,
 * `session.artifacts`, etc.) reads `sessionRef.current.<prop>` live,
 * so once the post-commit effect sets the ref to the real hook return,
 * subsequent callback invocations see the fresh session instead of the
 * frozen stub.
 */
export function createLiveSessionBridge(
  sessionRef: MutableRefObject<TutorWorkflowSessionBridge>,
): TutorWorkflowSessionBridge {
  const bridge = {} as TutorWorkflowSessionBridge;
  Object.defineProperties(bridge, {
    startSession: {
      enumerable: true,
      get: () => sessionRef.current.startSession,
    },
    resumeSession: {
      enumerable: true,
      get: () => sessionRef.current.resumeSession,
    },
    clearActiveSessionState: {
      enumerable: true,
      get: () => sessionRef.current.clearActiveSessionState,
    },
    checkpointWorkflowStudyTimer: {
      enumerable: true,
      get: () => sessionRef.current.checkpointWorkflowStudyTimer,
    },
    latestCommittedAssistantMessage: {
      enumerable: true,
      get: () => sessionRef.current.latestCommittedAssistantMessage,
    },
    artifacts: {
      enumerable: true,
      get: () => sessionRef.current.artifacts,
    },
  });
  return bridge;
}
