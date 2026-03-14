import type { TutorAccuracyProfile, TutorObjectiveScope } from "@/lib/api";

export const TUTOR_SELECTED_MATERIAL_IDS_KEY = "tutor.selected_material_ids.v2";
export const TUTOR_SELECTED_MATERIAL_IDS_LEGACY_KEY =
  "tutor.selected_material_ids.v1";
export const TUTOR_START_STATE_KEY = "tutor.start_state.v1";
export const TUTOR_WIZARD_STATE_KEY = "tutor.wizard.state.v1";
export const TUTOR_WIZARD_PROGRESS_KEY = "tutor.wizard.progress.v1";

export type TutorStartState = {
  topic: string;
  selectedMaterialIds: number[];
  chainId?: number;
  customBlockIds: number[];
  accuracyProfile: TutorAccuracyProfile;
  objectiveScope: TutorObjectiveScope;
  selectedPaths: string[];
};

type StoredTutorStartState = {
  last_course_id?: number;
  courses?: Record<string, Partial<TutorStartState>>;
};

const DEFAULT_TUTOR_START_STATE: TutorStartState = {
  topic: "",
  selectedMaterialIds: [],
  customBlockIds: [],
  accuracyProfile: "strict",
  objectiveScope: "module_all",
  selectedPaths: [],
};

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

function normalizeStringArray(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>();
  const next: string[] = [];
  for (const raw of values) {
    if (typeof raw !== "string") continue;
    const normalized = raw.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    next.push(normalized);
  }
  return next;
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

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readStoredTutorStartState(
  storage: Pick<Storage, "getItem">,
): StoredTutorStartState {
  const raw = storage.getItem(TUTOR_START_STATE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return {
      last_course_id:
        typeof parsed.last_course_id === "number" &&
        Number.isInteger(parsed.last_course_id)
          ? parsed.last_course_id
          : undefined,
      courses:
        parsed.courses && typeof parsed.courses === "object" ? parsed.courses : {},
    };
  } catch {
    return {};
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

export function normalizeTutorObjectiveScope(
  value: unknown,
): TutorObjectiveScope {
  if (value === "module_all" || value === "single_focus") {
    return value;
  }
  return "module_all";
}

function normalizeTutorStartState(value: unknown): TutorStartState {
  const raw =
    value && typeof value === "object"
      ? (value as Partial<TutorStartState>)
      : {};
  return {
    topic: normalizeString(raw.topic),
    selectedMaterialIds: normalizeMaterialIds(raw.selectedMaterialIds),
    chainId:
      typeof raw.chainId === "number" &&
      Number.isInteger(raw.chainId) &&
      raw.chainId > 0
        ? raw.chainId
        : undefined,
    customBlockIds: normalizeMaterialIds(raw.customBlockIds),
    accuracyProfile: normalizeTutorAccuracyProfile(raw.accuracyProfile),
    objectiveScope: normalizeTutorObjectiveScope(raw.objectiveScope),
    selectedPaths: normalizeStringArray(raw.selectedPaths),
  };
}

function maybeMigrateLegacyTutorStartState(
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem">,
): StoredTutorStartState {
  const current = readStoredTutorStartState(storage);
  if (current.courses && Object.keys(current.courses).length > 0) {
    clearTutorWizardProgress(storage);
    return current;
  }

  const rawLegacy = storage.getItem(TUTOR_WIZARD_STATE_KEY);
  if (!rawLegacy) return current;

  try {
    const parsed = JSON.parse(rawLegacy);
    const courseId =
      typeof parsed?.courseId === "number" && Number.isInteger(parsed.courseId)
        ? parsed.courseId
        : undefined;
    if (typeof courseId !== "number") {
      clearTutorWizardProgress(storage);
      return current;
    }
    const migratedState = normalizeTutorStartState({
      ...parsed,
      selectedMaterialIds:
        parsed?.selectedMaterialIds ?? parsed?.selectedMaterials,
    });
    const next: StoredTutorStartState = {
      last_course_id: courseId,
      courses: {
        [String(courseId)]: migratedState,
      },
    };
    storage.setItem(TUTOR_START_STATE_KEY, JSON.stringify(next));
    storage.removeItem(TUTOR_WIZARD_STATE_KEY);
    clearTutorWizardProgress(storage);
    return next;
  } catch {
    clearTutorWizardProgress(storage);
    return current;
  }
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

export function readTutorStartState(
  courseId: number | undefined,
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> = window.localStorage,
): TutorStartState {
  const stored = maybeMigrateLegacyTutorStartState(storage);
  if (typeof courseId !== "number") return DEFAULT_TUTOR_START_STATE;
  const value = stored.courses?.[String(courseId)];
  return value ? normalizeTutorStartState(value) : DEFAULT_TUTOR_START_STATE;
}

export function writeTutorStartState(
  courseId: number,
  state: Partial<TutorStartState>,
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> = window.localStorage,
): TutorStartState {
  const stored = maybeMigrateLegacyTutorStartState(storage);
  const current = normalizeTutorStartState(stored.courses?.[String(courseId)]);
  const next = normalizeTutorStartState({
    ...current,
    ...state,
  });
  try {
    storage.setItem(
      TUTOR_START_STATE_KEY,
      JSON.stringify({
        last_course_id: courseId,
        courses: {
          ...(stored.courses || {}),
          [String(courseId)]: next,
        },
      } satisfies StoredTutorStartState),
    );
  } catch {
    // Ignore storage failures and still return the normalized state.
  }
  return next;
}

export function clearTutorWizardProgress(
  storage: Pick<Storage, "removeItem"> = window.localStorage,
) {
  try {
    storage.removeItem(TUTOR_WIZARD_PROGRESS_KEY);
  } catch {
    // Ignore storage failures.
  }
}

export function parseTutorCourseIdFromSearch(
  search: string,
): number | undefined {
  const params = new URLSearchParams(search);
  const raw = params.get("course_id");
  if (!raw) return undefined;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) return undefined;
  return parsed;
}
