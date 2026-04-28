import type { TutorAccuracyProfile, TutorObjectiveScope } from "@/lib/api";

export const TUTOR_SELECTED_MATERIAL_IDS_KEY = "tutor.selected_material_ids.v2";
export const TUTOR_SELECTED_MATERIAL_IDS_LEGACY_KEY =
  "tutor.selected_material_ids.v1";
export const TUTOR_START_STATE_KEY = "tutor.start.state.v2";
export const TUTOR_START_STATE_LEGACY_KEY = "tutor.wizard.state.v1";
export const TUTOR_ACCURACY_PROFILE_KEY = "tutor.accuracy_profile.v1";
export const TUTOR_OBJECTIVE_SCOPE_KEY = "tutor.objective_scope.v1";
export const TUTOR_ACTIVE_SESSION_KEY = "tutor.active_session.v1";
export const TUTOR_ENTRY_CARD_DISMISSED_KEY = "tutor.entry_card_dismissed.v1";
export const TUTOR_WORKSPACE_DRAFT_OBJECTS_KEY = "tutor.workspace_draft_objects.v1";
export const TUTOR_LIBRARY_HANDOFF_KEY = "tutor.open_from_library.v1";
export const TUTOR_BRAIN_HANDOFF_KEY = "tutor.open_from_brain.v1";
export const TUTOR_VAULT_FOLDER_KEY = "tutor.vault_folder.v1";
export const LIBRARY_TUTOR_HANDOFF_KEY = "library.open_from_tutor.v1";

export type TutorBrainLaunchContext = {
  source?: string;
  itemId?: string;
  title?: string;
  reason?: string;
  courseName?: string;
  dueDate?: string;
  investigationId?: string;
  questionId?: string;
};

export type LibraryTutorLaunchContext = {
  source?: string;
  courseId?: number;
  courseName?: string;
  courseEventId?: number;
  eventType?: string | null;
  target?: "load_materials";
};

export type TutorPersistedStartState = {
  courseId?: number;
  topic: string;
  selectedMaterials: number[];
  chainId?: number;
  customBlockIds: number[];
  accuracyProfile: TutorAccuracyProfile;
  objectiveScope: TutorObjectiveScope;
  selectedObjectiveId: string;
  selectedObjectiveGroup: string;
  selectedPaths: string[];
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
  return values.filter((value): value is string => typeof value === "string");
}

function readStoredJson(
  storage: Pick<Storage, "getItem">,
  key: string,
): { exists: boolean; value: unknown } {
  const raw = storage.getItem(key);
  if (raw === null) {
    return { exists: false, value: null };
  }
  try {
    return { exists: true, value: JSON.parse(raw) };
  } catch {
    return { exists: true, value: null };
  }
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

export function normalizeTutorObjectiveScope(
  value: unknown,
): TutorObjectiveScope {
  if (value === "module_all" || value === "single_focus") {
    return value;
  }
  return "module_all";
}

function normalizeTutorBrainLaunchContext(
  value: unknown,
): TutorBrainLaunchContext | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const next: TutorBrainLaunchContext = {};
  if (typeof record.source === "string") next.source = record.source;
  if (typeof record.itemId === "string") next.itemId = record.itemId;
  if (typeof record.title === "string") next.title = record.title;
  if (typeof record.reason === "string") next.reason = record.reason;
  if (typeof record.courseName === "string") next.courseName = record.courseName;
  if (typeof record.dueDate === "string") next.dueDate = record.dueDate;
  if (typeof record.investigationId === "string") {
    next.investigationId = record.investigationId;
  }
  if (typeof record.questionId === "string") next.questionId = record.questionId;
  return Object.keys(next).length > 0 ? next : null;
}

function normalizeLibraryTutorLaunchContext(
  value: unknown,
): LibraryTutorLaunchContext | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const next: LibraryTutorLaunchContext = {};
  if (typeof record.source === "string") next.source = record.source;
  if (
    typeof record.courseId === "number" &&
    Number.isInteger(record.courseId) &&
    record.courseId > 0
  ) {
    next.courseId = record.courseId;
  }
  if (typeof record.courseName === "string") next.courseName = record.courseName;
  if (
    typeof record.courseEventId === "number" &&
    Number.isInteger(record.courseEventId) &&
    record.courseEventId > 0
  ) {
    next.courseEventId = record.courseEventId;
  }
  if (typeof record.eventType === "string") next.eventType = record.eventType;
  if (record.target === "load_materials") next.target = "load_materials";
  return Object.keys(next).length > 0 ? next : null;
}

function normalizeTutorStartState(
  value: unknown,
): TutorPersistedStartState | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  return {
    courseId:
      typeof record.courseId === "number" &&
      Number.isInteger(record.courseId) &&
      record.courseId > 0
        ? record.courseId
        : undefined,
    topic: typeof record.topic === "string" ? record.topic : "",
    selectedMaterials: normalizeMaterialIds(record.selectedMaterials),
    chainId:
      typeof record.chainId === "number" &&
      Number.isInteger(record.chainId) &&
      record.chainId > 0
        ? record.chainId
        : undefined,
    customBlockIds: normalizeMaterialIds(record.customBlockIds),
    accuracyProfile: normalizeTutorAccuracyProfile(record.accuracyProfile),
    objectiveScope: normalizeTutorObjectiveScope(record.objectiveScope),
    selectedObjectiveId:
      typeof record.selectedObjectiveId === "string"
        ? record.selectedObjectiveId
        : "",
    selectedObjectiveGroup:
      typeof record.selectedObjectiveGroup === "string"
        ? record.selectedObjectiveGroup
        : "",
    selectedPaths: normalizeStringArray(record.selectedPaths),
  };
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

export function readTutorAccuracyProfile(
  storage: Pick<Storage, "getItem"> = window.localStorage,
): TutorAccuracyProfile {
  return normalizeTutorAccuracyProfile(storage.getItem(TUTOR_ACCURACY_PROFILE_KEY));
}

export function writeTutorAccuracyProfile(
  value: TutorAccuracyProfile,
  storage: Pick<Storage, "setItem"> = window.localStorage,
): TutorAccuracyProfile {
  const normalized = normalizeTutorAccuracyProfile(value);
  try {
    storage.setItem(TUTOR_ACCURACY_PROFILE_KEY, normalized);
  } catch {
    // Ignore storage failures; callers still receive the normalized value.
  }
  return normalized;
}

export function readTutorObjectiveScope(
  storage: Pick<Storage, "getItem"> = window.localStorage,
): TutorObjectiveScope {
  return normalizeTutorObjectiveScope(storage.getItem(TUTOR_OBJECTIVE_SCOPE_KEY));
}

export function writeTutorObjectiveScope(
  value: TutorObjectiveScope,
  storage: Pick<Storage, "setItem"> = window.localStorage,
): TutorObjectiveScope {
  const normalized = normalizeTutorObjectiveScope(value);
  try {
    storage.setItem(TUTOR_OBJECTIVE_SCOPE_KEY, normalized);
  } catch {
    // Ignore storage failures; callers still receive the normalized value.
  }
  return normalized;
}

export function readTutorStoredStartState(
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> = window.localStorage,
): TutorPersistedStartState | null {
  const current = readStoredJson(storage, TUTOR_START_STATE_KEY);
  if (current.exists) {
    return normalizeTutorStartState(current.value);
  }

  const legacy = readStoredJson(storage, TUTOR_START_STATE_LEGACY_KEY);
  if (!legacy.exists) {
    return null;
  }

  const normalized = normalizeTutorStartState(legacy.value);
  if (!normalized) {
    return null;
  }

  try {
    storage.setItem(TUTOR_START_STATE_KEY, JSON.stringify(normalized));
    storage.removeItem(TUTOR_START_STATE_LEGACY_KEY);
  } catch {
    // Ignore storage failures and still return the migrated values in memory.
  }
  return normalized;
}

export function writeTutorStoredStartState(
  value: TutorPersistedStartState,
  storage: Pick<Storage, "setItem" | "removeItem"> = window.localStorage,
): TutorPersistedStartState {
  const normalized =
    normalizeTutorStartState(value) || {
      courseId: undefined,
      topic: "",
      selectedMaterials: [],
      chainId: undefined,
      customBlockIds: [],
      accuracyProfile: "strict",
      objectiveScope: "module_all",
      selectedObjectiveId: "",
      selectedObjectiveGroup: "",
      selectedPaths: [],
    };
  try {
    storage.setItem(TUTOR_START_STATE_KEY, JSON.stringify(normalized));
    storage.removeItem(TUTOR_START_STATE_LEGACY_KEY);
  } catch {
    // Ignore storage failures; callers still receive the normalized state.
  }
  return normalized;
}

export function readTutorActiveSessionId(
  storage: Pick<Storage, "getItem"> = window.localStorage,
): string | null {
  const raw = storage.getItem(TUTOR_ACTIVE_SESSION_KEY);
  return typeof raw === "string" && raw.trim().length > 0 ? raw : null;
}

export function writeTutorActiveSessionId(
  sessionId: string,
  storage: Pick<Storage, "setItem"> = window.localStorage,
): string {
  try {
    storage.setItem(TUTOR_ACTIVE_SESSION_KEY, sessionId);
  } catch {
    // Ignore storage failures; callers still receive the session id.
  }
  return sessionId;
}

export function clearTutorActiveSessionId(
  storage: Pick<Storage, "removeItem"> = window.localStorage,
) {
  try {
    storage.removeItem(TUTOR_ACTIVE_SESSION_KEY);
  } catch {
    // Ignore storage failures.
  }
}

export function readTutorEntryCardDismissed(
  storage: Pick<Storage, "getItem"> = window.localStorage,
): boolean {
  try {
    return storage.getItem(TUTOR_ENTRY_CARD_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeTutorEntryCardDismissed(
  dismissed: boolean,
  storage: Pick<Storage, "setItem" | "removeItem"> = window.localStorage,
): void {
  try {
    if (dismissed) {
      storage.setItem(TUTOR_ENTRY_CARD_DISMISSED_KEY, "1");
    } else {
      storage.removeItem(TUTOR_ENTRY_CARD_DISMISSED_KEY);
    }
  } catch {
    // Ignore storage failures.
  }
}

function workspaceDraftObjectsStorageKey(courseId: number): string {
  return `${TUTOR_WORKSPACE_DRAFT_OBJECTS_KEY}:${courseId}`;
}

export function readTutorWorkspaceDraftObjects(
  courseId: number | null | undefined,
  storage: Pick<Storage, "getItem"> = window.localStorage,
): unknown[] {
  if (typeof courseId !== "number") return [];
  try {
    const raw = storage.getItem(workspaceDraftObjectsStorageKey(courseId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeTutorWorkspaceDraftObjects(
  courseId: number | null | undefined,
  objects: unknown[],
  storage: Pick<Storage, "setItem" | "removeItem"> = window.localStorage,
): void {
  if (typeof courseId !== "number") return;
  const key = workspaceDraftObjectsStorageKey(courseId);
  try {
    if (!Array.isArray(objects) || objects.length === 0) {
      storage.removeItem(key);
    } else {
      storage.setItem(key, JSON.stringify(objects));
    }
  } catch {
    // Ignore storage failures.
  }
}

export function readTutorVaultFolder(
  storage: Pick<Storage, "getItem"> = window.localStorage,
): string {
  const raw = storage.getItem(TUTOR_VAULT_FOLDER_KEY);
  return typeof raw === "string" ? raw : "";
}

export function writeTutorVaultFolder(
  folder: string,
  storage: Pick<Storage, "setItem"> = window.localStorage,
): string {
  const normalized = typeof folder === "string" ? folder : "";
  try {
    storage.setItem(TUTOR_VAULT_FOLDER_KEY, normalized);
  } catch {
    // Ignore storage failures; callers still receive the normalized value.
  }
  return normalized;
}

export function consumeTutorLaunchHandoff(
  storage: Pick<Storage, "getItem" | "removeItem"> = window.sessionStorage,
): {
  fromLibraryHandoff: boolean;
  brainLaunchContext: TutorBrainLaunchContext | null;
} {
  const fromLibraryHandoff = storage.getItem(TUTOR_LIBRARY_HANDOFF_KEY) === "1";
  if (fromLibraryHandoff) {
    try {
      storage.removeItem(TUTOR_LIBRARY_HANDOFF_KEY);
    } catch {
      // Ignore storage failures.
    }
  }

  const rawBrainHandoff = storage.getItem(TUTOR_BRAIN_HANDOFF_KEY);
  let brainLaunchContext: TutorBrainLaunchContext | null = null;
  if (rawBrainHandoff !== null) {
    try {
      brainLaunchContext = normalizeTutorBrainLaunchContext(
        JSON.parse(rawBrainHandoff),
      );
    } catch {
      brainLaunchContext = null;
    }
    try {
      storage.removeItem(TUTOR_BRAIN_HANDOFF_KEY);
    } catch {
      // Ignore storage failures.
    }
  }

  return { fromLibraryHandoff, brainLaunchContext };
}

export function peekTutorLaunchHandoff(
  storage: Pick<Storage, "getItem"> = window.sessionStorage,
): {
  fromLibraryHandoff: boolean;
  brainLaunchContext: TutorBrainLaunchContext | null;
} {
  const fromLibraryHandoff = storage.getItem(TUTOR_LIBRARY_HANDOFF_KEY) === "1";
  const rawBrainHandoff = storage.getItem(TUTOR_BRAIN_HANDOFF_KEY);
  let brainLaunchContext: TutorBrainLaunchContext | null = null;
  if (rawBrainHandoff !== null) {
    try {
      brainLaunchContext = normalizeTutorBrainLaunchContext(
        JSON.parse(rawBrainHandoff),
      );
    } catch {
      brainLaunchContext = null;
    }
  }
  return { fromLibraryHandoff, brainLaunchContext };
}

export function writeLibraryLaunchFromTutor(
  value: LibraryTutorLaunchContext,
  storage: Pick<Storage, "setItem"> = window.sessionStorage,
): LibraryTutorLaunchContext {
  const normalized = normalizeLibraryTutorLaunchContext(value) || {
    source: "tutor-page1",
    target: "load_materials",
  };
  try {
    storage.setItem(LIBRARY_TUTOR_HANDOFF_KEY, JSON.stringify(normalized));
  } catch {
    // Ignore storage failures; callers still receive the normalized state.
  }
  return normalized;
}

export function consumeLibraryLaunchFromTutor(
  storage: Pick<Storage, "getItem" | "removeItem"> = window.sessionStorage,
): LibraryTutorLaunchContext | null {
  const raw = storage.getItem(LIBRARY_TUTOR_HANDOFF_KEY);
  if (raw === null) return null;

  let parsed: LibraryTutorLaunchContext | null = null;
  try {
    parsed = normalizeLibraryTutorLaunchContext(JSON.parse(raw));
  } catch {
    parsed = null;
  }

  try {
    storage.removeItem(LIBRARY_TUTOR_HANDOFF_KEY);
  } catch {
    // Ignore storage failures.
  }
  return parsed;
}
