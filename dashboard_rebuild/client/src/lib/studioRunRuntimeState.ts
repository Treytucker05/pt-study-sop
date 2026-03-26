export interface StudioRunRuntimeState {
  activeMemoryCapsuleId: number | null;
  compactionTelemetry: Record<string, unknown> | null;
  directNoteSaveStatus: Record<string, unknown> | null;
}

export function normalizeStudioRunRuntimeState(
  value: unknown,
): StudioRunRuntimeState {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      activeMemoryCapsuleId: null,
      compactionTelemetry: null,
      directNoteSaveStatus: null,
    };
  }

  const record = value as Record<string, unknown>;
  const rawActiveMemoryCapsuleId = record.active_memory_capsule_id;
  const activeMemoryCapsuleId =
    typeof rawActiveMemoryCapsuleId === "number" &&
    Number.isFinite(rawActiveMemoryCapsuleId)
      ? rawActiveMemoryCapsuleId
      : null;

  const compactionTelemetry =
    record.compaction_telemetry &&
    typeof record.compaction_telemetry === "object" &&
    !Array.isArray(record.compaction_telemetry)
      ? (record.compaction_telemetry as Record<string, unknown>)
      : null;

  const directNoteSaveStatus =
    record.direct_note_save_status &&
    typeof record.direct_note_save_status === "object" &&
    !Array.isArray(record.direct_note_save_status)
      ? (record.direct_note_save_status as Record<string, unknown>)
      : null;

  return {
    activeMemoryCapsuleId,
    compactionTelemetry,
    directNoteSaveStatus,
  };
}

export function serializeStudioRunRuntimeState(
  value: StudioRunRuntimeState,
): {
  active_memory_capsule_id: number | null;
  compaction_telemetry: Record<string, unknown> | null;
  direct_note_save_status: Record<string, unknown> | null;
} {
  return {
    active_memory_capsule_id: value.activeMemoryCapsuleId,
    compaction_telemetry: value.compactionTelemetry,
    direct_note_save_status: value.directNoteSaveStatus,
  };
}
