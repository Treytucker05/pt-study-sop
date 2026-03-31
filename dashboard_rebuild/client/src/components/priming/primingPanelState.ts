import { useSyncExternalStore } from "react";

import type { TutorPrimingDisplayedRun } from "@/api.types";

export type PrimingPendingMethodResult = {
  methodIds: string[];
  label: string;
} | null;

export type PrimingChatTurn = {
  id: string;
  role: "user" | "assistant";
  message: string;
  updatedRun?: TutorPrimingDisplayedRun | null;
  applied?: boolean;
};

export type PrimingPanelSessionState = {
  pendingMethodResult: PrimingPendingMethodResult;
  displayedRun: TutorPrimingDisplayedRun | null;
  runningChain: boolean;
  chatInput: string;
  chatTurns: PrimingChatTurn[];
  sendingChat: boolean;
};

type PrimingPanelSessionUpdater =
  | PrimingPanelSessionState
  | ((current: PrimingPanelSessionState) => PrimingPanelSessionState);

const primingPanelStateByKey = new Map<string, PrimingPanelSessionState>();
const primingPanelListenersByKey = new Map<string, Set<() => void>>();

function createDefaultPrimingPanelSessionState(): PrimingPanelSessionState {
  return {
    pendingMethodResult: null,
    displayedRun: null,
    runningChain: false,
    chatInput: "",
    chatTurns: [],
    sendingChat: false,
  };
}

function ensurePrimingPanelSessionState(
  key: string,
): PrimingPanelSessionState {
  const existing = primingPanelStateByKey.get(key);
  if (existing) return existing;

  const created = createDefaultPrimingPanelSessionState();
  primingPanelStateByKey.set(key, created);
  return created;
}

function emitPrimingPanelSessionChange(key: string) {
  const listeners = primingPanelListenersByKey.get(key);
  if (!listeners) return;
  for (const listener of listeners) {
    listener();
  }
}

export function usePrimingPanelSessionState(
  key: string,
): PrimingPanelSessionState {
  return useSyncExternalStore(
    (listener) => {
      const listeners = primingPanelListenersByKey.get(key) ?? new Set<() => void>();
      listeners.add(listener);
      primingPanelListenersByKey.set(key, listeners);

      return () => {
        const currentListeners = primingPanelListenersByKey.get(key);
        if (!currentListeners) return;
        currentListeners.delete(listener);
        if (currentListeners.size === 0) {
          primingPanelListenersByKey.delete(key);
        }
      };
    },
    () => ensurePrimingPanelSessionState(key),
    () => ensurePrimingPanelSessionState(key),
  );
}

export function setPrimingPanelSessionState(
  key: string,
  nextState: PrimingPanelSessionUpdater,
) {
  const current = ensurePrimingPanelSessionState(key);
  const resolved =
    typeof nextState === "function"
      ? nextState(current)
      : nextState;

  if (Object.is(resolved, current)) {
    return;
  }

  primingPanelStateByKey.set(key, resolved);
  emitPrimingPanelSessionChange(key);
}

export function resetPrimingPanelSessionState(key?: string) {
  if (typeof key === "string" && key.trim().length > 0) {
    primingPanelStateByKey.delete(key);
    emitPrimingPanelSessionChange(key);
    return;
  }

  const keys = [...primingPanelStateByKey.keys(), ...primingPanelListenersByKey.keys()];
  primingPanelStateByKey.clear();
  for (const stateKey of keys) {
    emitPrimingPanelSessionChange(stateKey);
  }
}
