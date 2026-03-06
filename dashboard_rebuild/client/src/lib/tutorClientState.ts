import type { TutorAccuracyProfile } from "@/lib/api";

export const TUTOR_SELECTED_MATERIAL_IDS_KEY = "tutor.selected_material_ids.v2";
export const TUTOR_SELECTED_MATERIAL_IDS_LEGACY_KEY =
  "tutor.selected_material_ids.v1";

function normalizeMaterialIds(values: unknown): number[] {
  if (!Array.isArray(values)) return [];
  const seen = new Set<number>();
  const ids: number[] = [];
  for (const raw of values) {
    if (typeof raw !== "number" || !Number.isInteger(raw) || raw <= 0) continue;
    if (seen.has(raw)) continue;
    seen.add(raw);
    ids.push(raw);
  }
  return ids;
}

function readStoredMaterialIds(
  storage: Pick<Storage, "getItem">,
  key: string,
): { exists: boolean; ids: number[] } {
  const raw = storage.getItem(key);
  if (raw === null) {
    return { exists: false, ids: [] };
  }
  try {
    return {
      exists: true,
      ids: normalizeMaterialIds(JSON.parse(raw)),
    };
  } catch {
    return { exists: true, ids: [] };
  }
}

export function normalizeTutorAccuracyProfile(
  value: unknown,
): TutorAccuracyProfile {
  if (value === "coverage" || value === "balanced" || value === "strict") {
    return value;
  }
  if (value === "standard") {
    return "strict";
  }
  return "strict";
}

export function readTutorSelectedMaterialIds(
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> = window.localStorage,
): number[] {
  const current = readStoredMaterialIds(storage, TUTOR_SELECTED_MATERIAL_IDS_KEY);
  if (current.exists) {
    return current.ids;
  }

  const legacy = readStoredMaterialIds(
    storage,
    TUTOR_SELECTED_MATERIAL_IDS_LEGACY_KEY,
  );
  if (!legacy.exists) {
    return [];
  }

  try {
    storage.setItem(
      TUTOR_SELECTED_MATERIAL_IDS_KEY,
      JSON.stringify(legacy.ids),
    );
    storage.removeItem(TUTOR_SELECTED_MATERIAL_IDS_LEGACY_KEY);
  } catch {
    // Ignore storage failures and still return the migrated values in memory.
  }
  return legacy.ids;
}

export function writeTutorSelectedMaterialIds(
  ids: number[],
  storage: Pick<Storage, "setItem" | "removeItem"> = window.localStorage,
): number[] {
  const normalized = normalizeMaterialIds(ids);
  try {
    storage.setItem(TUTOR_SELECTED_MATERIAL_IDS_KEY, JSON.stringify(normalized));
    storage.removeItem(TUTOR_SELECTED_MATERIAL_IDS_LEGACY_KEY);
  } catch {
    // Ignore storage failures; callers still receive the normalized ids.
  }
  return normalized;
}
