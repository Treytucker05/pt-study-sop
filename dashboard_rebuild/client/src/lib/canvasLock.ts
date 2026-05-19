import { useSyncExternalStore } from "react";

/**
 * User-controlled "lock the canvas" mode for the Tutor workspace.
 *
 * UNLOCKED (default): the page behaves exactly as before — a normal
 * scrollable document; you scroll down to the canvas.
 *
 * LOCKED: the Tutor route becomes a viewport-locked, full-bleed canvas
 * workspace (global header / page hero / footer hidden, no page
 * scroll) so the canvas fills the screen — toggled back off any time.
 *
 * Deliberately a tiny module store (not context) so both `layout.tsx`
 * and the Studio toolbar can read/flip it without prop-drilling
 * through PageScaffold → TutorShell → StudioShell.
 */

const STORAGE_KEY = "tutor-canvas-locked";

let locked = ((): boolean => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
})();

const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}

export function getCanvasLocked(): boolean {
  return locked;
}

export function setCanvasLocked(next: boolean): void {
  if (next === locked) return;
  locked = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
  } catch {
    /* localStorage unavailable — in-memory only */
  }
  emit();
}

export function toggleCanvasLocked(): void {
  setCanvasLocked(!locked);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** React binding. Returns the current locked flag, re-renders on change. */
export function useCanvasLocked(): boolean {
  return useSyncExternalStore(
    subscribe,
    getCanvasLocked,
    () => false, // server snapshot (SPA — never SSR'd, but safe)
  );
}
