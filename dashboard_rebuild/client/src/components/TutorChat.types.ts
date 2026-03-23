import type {
  TutorCitation,
  TutorRetrievalDebug,
  TutorVerdict,
  TeachBackRubric,
  TutorAccuracyProfile,
  BehaviorOverride,
  Material,
} from "@/lib/api";
import { getMethodControlStage } from "@/lib/controlStages";
import { FileText, BookOpen, StickyNote, CreditCard } from "lucide-react";

export interface ToolAction {
  tool: string;
  success: boolean;
  message: string;
}

export interface ChatMessage {
  messageId?: string;
  turnId?: number | string;
  createdAt?: string;
  sessionTurnNumber?: number;
  role: "user" | "assistant";
  content: string;
  citations?: TutorCitation[];
  model?: string;
  retrievalDebug?: TutorRetrievalDebug;
  isStreaming?: boolean;
  toolActions?: ToolAction[];
  verdict?: TutorVerdict;
  teachBackRubric?: TeachBackRubric;
}

export interface TutorChatProps {
  sessionId: string | null;
  courseId?: number;
  availableMaterials: Material[];
  selectedMaterialIds: number[];
  defaultMaterialsOn?: boolean;
  accuracyProfile: TutorAccuracyProfile;
  onAccuracyProfileChange: (profile: TutorAccuracyProfile) => void;
  onSelectedMaterialIdsChange: (ids: number[]) => void;
  onMaterialsChanged?: () => Promise<void> | void;
  onArtifactCreated: (artifact: { type: string; content: string; title?: string }) => void;
  onStudioCapture?: (capture: {
    content: string;
    title?: string;
    itemType?: string;
    target: "note" | "summary_board";
    sourceKind?: string;
    sourcePath?: string;
    sourceLocator?: Record<string, unknown>;
  }) => void;
  onCaptureNote?: (payload: {
    mode: "exact" | "editable";
    message: ChatMessage;
    index: number;
  }) => void;
  onFeedback?: (payload: {
    sentiment: "liked" | "disliked";
    message: ChatMessage;
    index: number;
  }) => void;
  onSaveGist?: (content: string) => void;
  onSaveExact?: (content: string) => void;
  onLike?: (content: string) => void;
  onDislike?: (content: string) => void;
  onCompact?: () => void;
  timerState?: {
    elapsedSeconds: number;
    paused: boolean;
  };
  onToggleTimer?: () => void;
  onAssistantTurnCommitted?: (payload: {
    userMessage: string;
    assistantMessage: ChatMessage;
  }) => void;
  onTurnComplete?: (masteryUpdate?: { skill_id: string; new_mastery: number; correct: boolean }) => void;
  initialTurns?: { question: string; answer: string | null }[];
}

type ArtifactType = "note" | "card" | "map";
export type SourceTab = "materials" | "vault" | "map_of_contents";

export interface NorthStarSummary {
  path?: string;
  status?: string;
  module_name?: string;
  course_name?: string;
  subtopic_name?: string;
  objective_ids?: string[];
  reference_targets?: string[];
}

export type TutorTeachRuntimeStatus =
  | "live"
  | "available"
  | "pending"
  | "locked"
  | "complete"
  | "skipped"
  | "fallback";

export interface TutorTeachRuntimeField {
  label: string;
  value: string;
  status: TutorTeachRuntimeStatus;
}

export interface TutorTeachRuntimeViewModel {
  packetSource: "backend" | "mixed" | "inferred";
  stage: TutorTeachRuntimeField;
  conceptType: TutorTeachRuntimeField;
  bridge: TutorTeachRuntimeField;
  depth: TutorTeachRuntimeField & {
    current: string;
    start: string;
    ceiling: string;
  };
  requiredArtifact: TutorTeachRuntimeField;
  functionConfirmation: TutorTeachRuntimeField & {
    confirmed: boolean;
  };
  l4Unlock: TutorTeachRuntimeField & {
    unlocked: boolean;
  };
  mnemonic: TutorTeachRuntimeField;
  note: string;
  missingBackendFields: string[];
}

type TeachRuntimeSource = {
  workflowDetail?: unknown;
  workflowStage?: string | null;
  currentBlock?:
    | {
        name?: string | null;
        category?: string | null;
        control_stage?: string | null;
        description?: string | null;
        facilitation_prompt?: string | null;
        knobs?: Record<string, unknown> | null;
        constraints?: Record<string, unknown> | null;
        teach_packet?: Record<string, unknown> | null;
        teach_context?: Record<string, unknown> | null;
        runtime_profile?: Record<string, unknown> | null;
      }
    | null
    | undefined;
  runtimeProfile?: Record<string, unknown> | null;
};

type UnknownRecord = Record<string, unknown>;

const TEACH_BACKEND_FIELDS = [
  "teach_packet.concept_type",
  "teach_packet.current_bridge",
  "teach_packet.current_depth",
  "teach_packet.required_close_artifact",
  "teach_packet.function_confirmation",
  "teach_packet.l4_unlocked",
  "teach_packet.mnemonic_state",
] as const;

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function getNestedRecord(record: UnknownRecord | null, key: string): UnknownRecord | null {
  return asRecord(record?.[key]);
}

function firstRecord(...records: Array<UnknownRecord | null | undefined>): UnknownRecord | null {
  return records.find((record): record is UnknownRecord => Boolean(record)) ?? null;
}

function getStringFromRecords(
  records: Array<UnknownRecord | null | undefined>,
  keys: string[],
): string | null {
  for (const record of records) {
    if (!record) continue;
    for (const key of keys) {
      const value = record[key];
      if (typeof value === "string" && value.trim().length > 0) {
        return value.trim();
      }
    }
  }
  return null;
}

function getBooleanFromRecords(
  records: Array<UnknownRecord | null | undefined>,
  keys: string[],
): boolean | null {
  for (const record of records) {
    if (!record) continue;
    for (const key of keys) {
      const value = record[key];
      if (typeof value === "boolean") return value;
      if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (["true", "yes", "confirmed", "unlocked", "complete", "completed"].includes(normalized)) {
          return true;
        }
        if (["false", "no", "locked", "pending", "incomplete", "blocked"].includes(normalized)) {
          return false;
        }
      }
    }
  }
  return null;
}

function humanizeToken(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\bkwik\b/gi, "KWIK")
    .replace(/\bl0\b/gi, "L0")
    .replace(/\bl1\b/gi, "L1")
    .replace(/\bl2\b/gi, "L2")
    .replace(/\bl3\b/gi, "L3")
    .replace(/\bl4\b/gi, "L4")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function normalizeToken(value: string | null | undefined): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ");
}

function inferConceptType(text: string): string | null {
  const normalized = normalizeToken(text);
  if (!normalized) return null;
  if (/(compare|contrast|confus|versus|vs\b)/.test(normalized)) return "Compare / contrast";
  if (/(procedure|sequence|step|flow|process|pathway|cascade)/.test(normalized)) return "Procedure";
  if (/(mechanism|pump|force|signal|feedback|physiology)/.test(normalized)) return "Mechanism";
  if (/(spatial|anatomy|landmark|map|region|orientation|draw)/.test(normalized)) return "Spatial";
  if (/(definition|term|vocabulary|meaning)/.test(normalized)) return "Definition";
  if (/(clinical|case|reasoning|decision|triage)/.test(normalized)) return "Clinical reasoning";
  return null;
}

function inferBridge(text: string): string | null {
  const normalized = normalizeToken(text);
  if (!normalized) return null;
  if (/(analogy|metaphor)/.test(normalized)) return "Analogy";
  if (/(story|narrative|spine)/.test(normalized)) return "Story";
  if (/(kwik|mnemonic|memory|hook)/.test(normalized)) return "Memory hook";
  if (/(jingle|rhyme)/.test(normalized)) return "Jingle / rhyme";
  if (/(comparison table|compare|contrast|versus|vs\b)/.test(normalized)) return "Comparison table";
  if (/(hand draw|hand-draw|sketch|map|diagram)/.test(normalized)) return "Hand-draw map";
  if (/(clinical|case)/.test(normalized)) return "Clinical anchor";
  return null;
}

function inferArtifact(conceptType: string, text: string): string {
  const normalizedConcept = normalizeToken(conceptType);
  const normalizedText = normalizeToken(text);
  if (/(compare|contrast|versus|vs\b)/.test(normalizedConcept) || /(comparison table)/.test(normalizedText)) {
    return "Comparison table";
  }
  if (/(spatial|anatomy|map|draw)/.test(normalizedConcept) || /(hand draw|sketch|diagram)/.test(normalizedText)) {
    return "Hand-draw map";
  }
  if (/(procedure|sequence|process|pathway)/.test(normalizedConcept)) {
    return "Mini process flow";
  }
  if (/(clinical reasoning|clinical|case)/.test(normalizedConcept)) {
    return "Clinical anchor mini-case";
  }
  return "One-page anchor";
}

function inferStageLabel(source: TeachRuntimeSource): string {
  const normalizedStage =
    getMethodControlStage(source.currentBlock) ||
    getMethodControlStage({ control_stage: source.workflowStage });
  if (normalizedStage) return normalizedStage;
  const fallback = normalizeToken(source.workflowStage);
  if (fallback.includes("teach")) return "TEACH";
  if (fallback.includes("calibrate")) return "CALIBRATE";
  if (fallback.includes("prime")) return "PRIME";
  if (fallback.includes("retrieve")) return "RETRIEVE";
  if (fallback.includes("overlearn")) return "OVERLEARN";
  return "TUTOR";
}

export function resolveTutorTeachRuntime(source: TeachRuntimeSource): TutorTeachRuntimeViewModel {
  const detailRecord = asRecord(source.workflowDetail);
  const workflowRecord = getNestedRecord(detailRecord, "workflow");
  const blockRecord = asRecord(source.currentBlock);
  const packetRecord = firstRecord(
    getNestedRecord(blockRecord, "teach_packet"),
    getNestedRecord(blockRecord, "teach_context"),
    getNestedRecord(blockRecord, "runtime_profile"),
    getNestedRecord(detailRecord, "teach_packet"),
    getNestedRecord(detailRecord, "teach_context"),
    getNestedRecord(workflowRecord, "teach_packet"),
    getNestedRecord(workflowRecord, "teach_context"),
    getNestedRecord(detailRecord, "runtime_profile"),
    getNestedRecord(workflowRecord, "runtime_profile"),
    getNestedRecord(detailRecord, "runtime"),
    getNestedRecord(workflowRecord, "runtime"),
    source.runtimeProfile,
  );
  const knobRecord = asRecord(blockRecord?.knobs);
  const constraintRecord = asRecord(blockRecord?.constraints);
  const records = [packetRecord, source.runtimeProfile, knobRecord, constraintRecord, blockRecord, workflowRecord, detailRecord];

  const blockText = [
    source.currentBlock?.name,
    source.currentBlock?.description,
    source.currentBlock?.facilitation_prompt,
  ]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" ");

  const stageLabel = inferStageLabel(source);

  const conceptTypeRaw = getStringFromRecords(records, [
    "concept_type",
    "conceptType",
    "teaching_lane",
    "route_selector",
    "lane",
  ]);
  const bridgeRaw = getStringFromRecords(records, [
    "current_bridge",
    "bridge",
    "bridge_move",
    "bridgeMove",
    "first_bridge",
    "selected_bridge",
  ]);
  const currentDepthRaw = getStringFromRecords(records, [
    "current_depth",
    "currentDepth",
    "depth",
  ]);
  const depthStartRaw = getStringFromRecords(records, [
    "depth_start",
    "depthStart",
  ]);
  const depthCeilingRaw = getStringFromRecords(records, [
    "depth_ceiling",
    "depthCeiling",
  ]);
  const artifactRaw = getStringFromRecords(records, [
    "required_close_artifact",
    "requiredArtifact",
    "close_artifact",
    "artifact_target",
    "anchor_artifact",
  ]);
  const functionStateRaw = getStringFromRecords(records, [
    "function_confirmation",
    "function_confirmation_state",
    "function_gate",
    "function_check",
  ]);
  const mnemonicRaw = getStringFromRecords(records, [
    "mnemonic_state",
    "mnemonic_status",
    "mnemonic_slot",
    "kwik_lite_status",
    "kwik_state",
  ]);

  const functionConfirmed = getBooleanFromRecords(records, [
    "function_confirmed",
    "functionConfirmed",
    "function_confirmation_complete",
    "functionGatePassed",
  ]);
  const l4Unlocked = getBooleanFromRecords(records, [
    "l4_unlocked",
    "l4Unlocked",
    "unlock_l4",
    "depth_unlocked",
  ]);

  const inferredConceptType = inferConceptType([conceptTypeRaw, blockText].filter(Boolean).join(" "));
  const conceptType = humanizeToken(conceptTypeRaw || inferredConceptType || "awaiting concept type");
  const bridge = humanizeToken(
    bridgeRaw || inferBridge([bridgeRaw, blockText].filter(Boolean).join(" ")) || "awaiting first bridge",
  );

  const depthStart = humanizeToken(depthStartRaw || "L0 hook");
  const currentDepth = humanizeToken(currentDepthRaw || (functionConfirmed ? "L4 precision" : "L3 mechanism"));
  const depthCeiling = humanizeToken(depthCeilingRaw || "L4 precision");

  const requiredArtifact = humanizeToken(
    artifactRaw || inferArtifact(conceptType, blockText) || "awaiting close artifact",
  );

  const functionConfirmationValue =
    functionConfirmed === true
      ? "Function confirmed"
      : functionConfirmed === false
        ? "Function not confirmed"
        : functionStateRaw
          ? humanizeToken(functionStateRaw)
          : "Awaiting function confirmation";

  const l4UnlockValue =
    l4Unlocked === true
      ? "L4 unlocked"
      : l4Unlocked === false
        ? "L4 locked"
        : functionConfirmed === true
          ? "L4 ready to unlock"
          : "Locks on function confirmation";

  const mnemonicValue = humanizeToken(
    mnemonicRaw
      || (stageLabel === "CALIBRATE"
        ? "KWIK Lite available"
        : stageLabel === "TEACH"
          ? "Unlocks after close artifact"
          : "Not in mnemonic slot"),
  );

  const explicitFieldCount = [
    conceptTypeRaw,
    bridgeRaw,
    currentDepthRaw,
    depthStartRaw,
    depthCeilingRaw,
    artifactRaw,
    functionStateRaw,
    mnemonicRaw,
    functionConfirmed,
    l4Unlocked,
  ].filter((value) => value !== null && value !== undefined).length;

  const missingBackendFields = TEACH_BACKEND_FIELDS.filter((field) => {
    if (field.endsWith("concept_type")) return !conceptTypeRaw;
    if (field.endsWith("current_bridge")) return !bridgeRaw;
    if (field.endsWith("current_depth")) return !currentDepthRaw;
    if (field.endsWith("required_close_artifact")) return !artifactRaw;
    if (field.endsWith("function_confirmation")) {
      return !functionStateRaw && functionConfirmed === null;
    }
    if (field.endsWith("l4_unlocked")) return l4Unlocked === null;
    if (field.endsWith("mnemonic_state")) return !mnemonicRaw;
    return false;
  });

  const packetSource: TutorTeachRuntimeViewModel["packetSource"] =
    explicitFieldCount === 0
      ? "inferred"
      : missingBackendFields.length === 0
        ? "backend"
        : "mixed";

  return {
    packetSource,
    stage: {
      label: "Current stage",
      value: stageLabel,
      status: packetSource === "inferred" ? "fallback" : "live",
    },
    conceptType: {
      label: "Concept type",
      value: conceptType,
      status: conceptTypeRaw ? "live" : "fallback",
    },
    bridge: {
      label: "Current bridge",
      value: bridge,
      status: bridgeRaw ? "live" : "fallback",
    },
    depth: {
      label: "Depth lane",
      value: `${currentDepth} live`,
      current: currentDepth,
      start: depthStart,
      ceiling: depthCeiling,
      status: currentDepthRaw ? "live" : "fallback",
    },
    requiredArtifact: {
      label: "Close artifact",
      value: requiredArtifact,
      status: artifactRaw ? "live" : "fallback",
    },
    functionConfirmation: {
      label: "Function confirmation",
      value: functionConfirmationValue,
      confirmed: functionConfirmed === true,
      status:
        functionConfirmed === true
          ? "complete"
          : functionConfirmed === false || functionStateRaw
            ? "pending"
            : "fallback",
    },
    l4Unlock: {
      label: "L4 unlock",
      value: l4UnlockValue,
      unlocked: l4Unlocked === true,
      status:
        l4Unlocked === true
          ? "available"
          : l4Unlocked === false || functionConfirmed === false
            ? "locked"
            : "fallback",
    },
    mnemonic: {
      label: "Mnemonic slot",
      value: mnemonicValue,
      status:
        /complete/i.test(mnemonicValue)
          ? "complete"
          : /skip/i.test(mnemonicValue)
            ? "skipped"
            : /available|ready/i.test(mnemonicValue)
              ? "available"
              : /not in/i.test(mnemonicValue)
                ? "locked"
                : mnemonicRaw
                  ? "pending"
                  : "fallback",
    },
    note:
      packetSource === "backend"
        ? "Live TEACH packet is coming from runtime metadata."
        : packetSource === "mixed"
          ? "Some TEACH packet fields are live, and the rest are inferred from the active block."
          : "Backend TEACH packet fields are still missing, so the UI is showing resilient inferred defaults.",
    missingBackendFields,
  };
}

export function normalizeArtifactType(rawType: string | undefined): ArtifactType | null {
  if (rawType === "table") return "note";
  if (rawType === "structured_map") return "map";
  if (rawType === "note" || rawType === "card" || rawType === "map") {
    return rawType;
  }
  return null;
}

export interface VaultEditorState {
  open: boolean;
  path: string;
  content: string;
  saving: boolean;
}

type ProvenanceTone = "source" | "notes" | "mixed" | "general";
type ConfidenceTone = "high" | "medium" | "low";

interface ProvenanceSummary {
  label: string;
  tone: ProvenanceTone;
  details: string[];
}

interface ConfidenceSummary {
  label: string;
  tone: ConfidenceTone;
  details: string[];
}

export function _basename(path: string): string {
  return String(path || "").split(/[\\/]/).pop() || path;
}

export function _parentPath(path: string): string {
  const normalized = String(path || "").replace(/\\/g, "/").replace(/\/+$/, "");
  const idx = normalized.lastIndexOf("/");
  if (idx <= 0) return "";
  return normalized.slice(0, idx);
}

export function _defaultNoteContent(notePath: string): string {
  const title = _basename(notePath).replace(/\.md$/i, "") || "New Note";
  const timestamp = new Date().toISOString();
  return `---
note_type: study_note
created_at: ${timestamp}
updated_at: ${timestamp}
---

# ${title}

## Summary

## Key Points
-

## Questions
-
`;
}

export function parseArtifactCommand(message: string): { type: ArtifactType | null; title: string } {
  const trimmed = message.trim();
  if (/^\/(note|save)\b/i.test(trimmed)) {
    return {
      type: "note",
      title: trimmed.replace(/^\/(note|save)\s*/i, "").trim(),
    };
  }
  if (/^\/(card|flashcard)\b/i.test(trimmed)) {
    return {
      type: "card",
      title: trimmed.replace(/^\/(card|flashcard)\s*/i, "").trim(),
    };
  }
  if (/^\/(map|diagram)\b/i.test(trimmed)) {
    return {
      type: "map",
      title: trimmed.replace(/^\/(map|diagram)\s*/i, "").trim(),
    };
  }
  if (/^\/table\b/i.test(trimmed)) {
    return {
      type: "note",
      title: trimmed.replace(/^\/table\s*/i, "").trim(),
    };
  }
  if (/^\/(structured[_-]?map|smap)\b/i.test(trimmed)) {
    return {
      type: "map",
      title: trimmed.replace(/^\/(structured[_-]?map|smap)\s*/i, "").trim(),
    };
  }
  return { type: null, title: "" };
}

/**
 * Detect markdown tables in LLM response text.
 * Returns the first table found (pipe-delimited with separator row).
 */
export function detectMarkdownTable(text: string): string | null {
  const lines = text.split("\n");
  for (let i = 0; i < lines.length - 2; i++) {
    const headerLine = lines[i].trim();
    const sepLine = lines[i + 1].trim();
    // Header must have pipes, separator must be pipes + dashes
    if (
      headerLine.includes("|") &&
      /^[\s|:-]+$/.test(sepLine) &&
      sepLine.includes("-")
    ) {
      // Collect the full table
      const tableLines = [lines[i], lines[i + 1]];
      for (let j = i + 2; j < lines.length; j++) {
        if (lines[j].trim().includes("|")) {
          tableLines.push(lines[j]);
        } else {
          break;
        }
      }
      if (tableLines.length >= 3) return tableLines.join("\n");
    }
  }
  return null;
}

/**
 * Detect mermaid code blocks in LLM response text.
 * Returns the mermaid content (without fences) if found.
 */
export function detectMermaidBlock(text: string): string | null {
  const match = text.match(/```mermaid\s*\n([\s\S]*?)```/);
  return match ? match[1].trim() : null;
}

function isNoteLikeSource(source: string): boolean {
  const value = String(source || "").toLowerCase();
  return value.endsWith(".md") || value.includes("map of contents") || value.includes("learning objectives");
}

export function summarizeProvenance(msg: ChatMessage): ProvenanceSummary {
  const sources = (msg.citations || []).map((citation) => String(citation.source || "").trim()).filter(Boolean);
  const hasTrainingKnowledge = /\[From training knowledge/i.test(msg.content);
  const noteSources = sources.filter(isNoteLikeSource);
  const nonNoteSources = sources.filter((source) => !isNoteLikeSource(source));

  if (hasTrainingKnowledge && sources.length > 0) {
    return {
      label: "partly grounded, partly general knowledge",
      tone: "mixed",
      details: [
        "The answer mixes cited session sources with broader teaching knowledge.",
        ...sources.slice(0, 6).map((source) => `Cited source: ${source}`),
      ],
    };
  }
  if (hasTrainingKnowledge) {
    return {
      label: "mostly general teaching knowledge",
      tone: "general",
      details: [
        "The tutor explicitly marked part of this answer as training knowledge.",
        "Treat the explanation as useful teaching support, not as a source citation.",
      ],
    };
  }
  if (sources.length === 0) {
    return {
      label: "general teaching knowledge",
      tone: "general",
      details: ["No direct citations were attached to this reply."],
    };
  }
  if (noteSources.length > 0 && nonNoteSources.length === 0) {
    return {
      label: "grounded in notes",
      tone: "notes",
      details: noteSources.slice(0, 6).map((source) => `Note-backed: ${source}`),
    };
  }
  if (noteSources.length > 0 && nonNoteSources.length > 0) {
    return {
      label: "mixed note and material grounding",
      tone: "mixed",
      details: [
        ...noteSources.slice(0, 3).map((source) => `Note-backed: ${source}`),
        ...nonNoteSources.slice(0, 3).map((source) => `Source-backed: ${source}`),
      ],
    };
  }
  return {
    label: "well-grounded in selected materials",
    tone: "source",
    details: nonNoteSources.slice(0, 6).map((source) => `Source-backed: ${source}`),
  };
}

export function summarizeConfidence(msg: ChatMessage): ConfidenceSummary {
  const retrieval = msg.retrievalDebug;
  const sources = (msg.citations || []).map((citation) => String(citation.source || "").trim()).filter(Boolean);
  const hasTrainingKnowledge = /\[From training knowledge/i.test(msg.content);
  const uniqueSources =
    retrieval?.retrieved_material_unique_sources ?? new Set(sources).size;
  const topSourceShare = Math.round((retrieval?.material_top_source_share ?? 0) * 100);
  const profile =
    retrieval?.effective_accuracy_profile ?? retrieval?.accuracy_profile ?? "balanced";

  if (hasTrainingKnowledge && sources.length === 0) {
    return {
      label: "teaching support only - verify specifics",
      tone: "low",
      details: [
        "This reply leans on broader teaching knowledge instead of direct course citations.",
        "Use it for explanation and intuition, then verify specific medical claims against your materials.",
      ],
    };
  }

  if (hasTrainingKnowledge && sources.length > 0) {
    return {
      label: "mixed confidence - verify specifics",
      tone: "medium",
      details: [
        "This reply mixes grounded course material with broader teaching knowledge.",
        `Cited sources attached: ${sources.length}.`,
        "Good for study flow, but verify the most specific claims before memorizing them.",
      ],
    };
  }

  if (sources.length === 0 && !retrieval) {
    return {
      label: "unverified reply - ask for a reference",
      tone: "low",
      details: [
        "No retrieval or citation metadata was attached to this reply.",
        "Ask 'Where did that come from?' if you want explicit grounding before trusting the details.",
      ],
    };
  }

  if (retrieval?.retrieval_confidence_tier === "high" && uniqueSources > 0) {
    return {
      label: "high confidence in grounding",
      tone: "high",
      details: [
        `Grounded in ${uniqueSources} selected source${uniqueSources === 1 ? "" : "s"} using the ${profile} retrieval profile.`,
        topSourceShare > 0 ? `Top source concentration: ${topSourceShare}%.` : "Evidence is distributed across retrieved sources.",
      ],
    };
  }

  if ((retrieval?.retrieval_confidence_tier === "medium" || sources.length > 0) && uniqueSources > 0) {
    return {
      label: "moderate confidence - grounded but check specifics",
      tone: "medium",
      details: [
        `Grounded in ${uniqueSources} selected source${uniqueSources === 1 ? "" : "s"} with partial evidence coverage.`,
        "Good for study flow, but double-check the most detailed claims if they matter for recall or cards.",
      ],
    };
  }

  return {
    label: "limited confidence - inspect sources",
    tone: "low",
    details: [
      "The system did not find enough stable retrieval evidence to rate this reply highly.",
      "Use the attached citations or ask for a tighter source-backed answer before relying on specifics.",
    ],
  };
}

export const TOOL_LABELS: Record<string, string> = {
  save_to_obsidian: "Obsidian",
  create_note: "Notes",
  create_anki_card: "Anki",
};

export const TOOL_ICONS: Record<string, typeof FileText> = {
  save_to_obsidian: BookOpen,
  create_note: StickyNote,
  create_anki_card: CreditCard,
};
