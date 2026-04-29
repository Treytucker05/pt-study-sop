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
  revealedConceptMapBlockIds: string[];
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
    revealedConceptMapBlockIds: [],
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

/**
 * Read a panel state without subscribing — used during a key change to migrate
 * pending state from the old key to the new key. Without this, kicking off a
 * priming run before a workflow exists silently loses the in-flight
 * `pendingMethodResult` (and the just-finished display) because the panel
 * re-keys from `course:...` to `workflow:<id>` mid-run, and the new key starts
 * at the default empty state.
 */
export function peekPrimingPanelSessionState(
  key: string,
): PrimingPanelSessionState {
  return ensurePrimingPanelSessionState(key);
}

function isDefaultPrimingPanelSessionState(
  state: PrimingPanelSessionState,
): boolean {
  return (
    state.pendingMethodResult === null &&
    state.displayedRun === null &&
    state.runningChain === false &&
    state.chatInput === "" &&
    state.chatTurns.length === 0 &&
    state.sendingChat === false &&
    state.revealedConceptMapBlockIds.length === 0
  );
}

/**
 * Move panel state from one key to another. Only migrates when the destination
 * key is still at default — never clobbers an existing state.
 */
export function migratePrimingPanelSessionState(
  fromKey: string,
  toKey: string,
): boolean {
  if (fromKey === toKey) return false;
  const fromState = primingPanelStateByKey.get(fromKey);
  if (!fromState) return false;
  if (isDefaultPrimingPanelSessionState(fromState)) return false;
  const toState = primingPanelStateByKey.get(toKey);
  if (toState && !isDefaultPrimingPanelSessionState(toState)) return false;
  primingPanelStateByKey.set(toKey, fromState);
  primingPanelStateByKey.delete(fromKey);
  emitPrimingPanelSessionChange(toKey);
  emitPrimingPanelSessionChange(fromKey);
  return true;
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
