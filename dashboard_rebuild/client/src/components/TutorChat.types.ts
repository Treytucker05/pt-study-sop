import type {
  TutorCitation,
  TutorRetrievalDebug,
  TutorVerdict,
  TeachBackRubric,
  TutorAccuracyProfile,
  BehaviorOverride,
  Material,
} from "@/lib/api";
import { FileText, BookOpen, StickyNote, CreditCard } from "lucide-react";

export interface ToolAction {
  tool: string;
  success: boolean;
  message: string;
}

export interface ChatMessage {
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

export interface ChainBlock {
  id: number;
  name: string;
  category: string;
  description?: string;
  duration: number;
  facilitation_prompt?: string;
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
  onTurnComplete?: (masteryUpdate?: { skill_id: string; new_mastery: number; correct: boolean }) => void;
  initialTurns?: { question: string; answer: string | null }[];
}

export type ArtifactType = "note" | "card" | "map";
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

export type ProvenanceTone = "source" | "notes" | "mixed" | "general";
export type ConfidenceTone = "high" | "medium" | "low";

export interface ProvenanceSummary {
  label: string;
  tone: ProvenanceTone;
  details: string[];
}

export interface ConfidenceSummary {
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

export function isNoteLikeSource(source: string): boolean {
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
