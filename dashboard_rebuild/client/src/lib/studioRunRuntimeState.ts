export interface StudioRunRuntimeState {
  activeMemoryCapsuleId: number | null;
  compactionTelemetry: Record<string, unknown> | null;
  directNoteSaveStatus: Record<string, unknown> | null;
  primingMethodIds: string[];
  primingChainId: number | null;
  primingCustomBlockIds: number[];
}

function getDefaultStudioRunRuntimeState(): StudioRunRuntimeState {
  return {
    activeMemoryCapsuleId: null,
    compactionTelemetry: null,
    directNoteSaveStatus: null,
    primingMethodIds: [],
    primingChainId: null,
    primingCustomBlockIds: [],
  };
}

export function normalizeStudioRunRuntimeState(
  value: unknown,
): StudioRunRuntimeState {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return getDefaultStudioRunRuntimeState();
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

  const primingMethodIds = Array.isArray(record.priming_method_ids)
    ? record.priming_method_ids.filter(
        (value): value is string =>
          typeof value === "string" && value.trim().length > 0,
      )
    : [];

  const rawPrimingChainId = record.priming_chain_id;
  const primingChainId =
    typeof rawPrimingChainId === "number" &&
    Number.isFinite(rawPrimingChainId)
      ? rawPrimingChainId
      : null;

  const primingCustomBlockIds = Array.isArray(record.priming_custom_block_ids)
    ? record.priming_custom_block_ids.filter(
        (value): value is number => typeof value === "number" && Number.isFinite(value),
      )
    : [];

  return {
    activeMemoryCapsuleId,
    compactionTelemetry,
    directNoteSaveStatus,
    primingMethodIds,
    primingChainId,
    primingCustomBlockIds,
  };
}

export function serializeStudioRunRuntimeState(
  value: StudioRunRuntimeState,
): {
  active_memory_capsule_id: number | null;
  compaction_telemetry: Record<string, unknown> | null;
  direct_note_save_status: Record<string, unknown> | null;
  priming_method_ids: string[];
  priming_chain_id: number | null;
  priming_custom_block_ids: number[];
} {
  return {
    active_memory_capsule_id: value.activeMemoryCapsuleId,
    compaction_telemetry: value.compactionTelemetry,
    direct_note_save_status: value.directNoteSaveStatus,
    priming_method_ids: value.primingMethodIds,
    priming_chain_id: value.primingChainId,
    priming_custom_block_ids: value.primingCustomBlockIds,
  };
}
