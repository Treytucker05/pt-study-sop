import { useCallback } from "react";

// ── Types ─────────────────────────────────────────────────────────────

export interface PanelLayout {
  type: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  collapsed: boolean;
}

export interface CanvasLayout {
  panels: PanelLayout[];
  savedAt: string;
  name?: string;
}

export interface UseWorkspaceLayoutReturn {
  saveLayout: (slot: number, panels: PanelLayout[], name?: string) => void;
  loadLayout: (slot: number) => CanvasLayout | null;
  getSlotInfo: () => Array<{ slot: number; savedAt: string | null; name?: string }>;
  clearSlot: (slot: number) => void;
}

// ── Constants ─────────────────────────────────────────────────────────

const STORAGE_KEY = "workspace-layouts";
const MIN_SLOT = 1;
const MAX_SLOT = 5;

// ── Default layout (fallback) ─────────────────────────────────────────

export const DEFAULT_LAYOUT: PanelLayout[] = [
  {
    type: "material-viewer",
    position: { x: 20, y: 20 },
    size: { width: 400, height: 500 },
    collapsed: false,
  },
  {
    type: "method-runner",
    position: { x: 440, y: 20 },
    size: { width: 400, height: 500 },
    collapsed: false,
  },
  {
    type: "packet",
    position: { x: 860, y: 20 },
    size: { width: 350, height: 600 },
    collapsed: false,
  },
];

// ── Helpers ───────────────────────────────────────────────────────────

type SlotMap = Record<string, CanvasLayout>;

function isValidSlot(slot: number): boolean {
  return Number.isInteger(slot) && slot >= MIN_SLOT && slot <= MAX_SLOT;
}

function readSlotMap(): SlotMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as SlotMap;
  } catch {
    return {};
  }
}

function writeSlotMap(map: SlotMap): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

// ── Hook ──────────────────────────────────────────────────────────────

export function useWorkspaceLayout(): UseWorkspaceLayoutReturn {
  const saveLayout = useCallback(
    (slot: number, panels: PanelLayout[], name?: string): void => {
      if (!isValidSlot(slot)) return;

      const map = readSlotMap();
      const layout: CanvasLayout = {
        panels,
        savedAt: new Date().toISOString(),
      };
      if (name) layout.name = name;

      map[String(slot)] = layout;
      writeSlotMap(map);
    },
    [],
  );

  const loadLayout = useCallback((slot: number): CanvasLayout | null => {
    if (!isValidSlot(slot)) return null;

    const map = readSlotMap();
    return map[String(slot)] ?? null;
  }, []);

  const getSlotInfo = useCallback(
    (): Array<{ slot: number; savedAt: string | null; name?: string }> => {
      const map = readSlotMap();
      return Array.from({ length: MAX_SLOT }, (_, i) => {
        const slot = i + MIN_SLOT;
        const entry = map[String(slot)];
        return {
          slot,
          savedAt: entry?.savedAt ?? null,
          name: entry?.name,
        };
      });
    },
    [],
  );

  const clearSlot = useCallback((slot: number): void => {
    if (!isValidSlot(slot)) return;

    const map = readSlotMap();
    delete map[String(slot)];
    writeSlotMap(map);
  }, []);

  return { saveLayout, loadLayout, getSlotInfo, clearSlot };
}
