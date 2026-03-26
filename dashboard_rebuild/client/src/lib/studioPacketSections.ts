import type {
  Material,
  TutorCapturedNote,
  TutorPolishBundle,
  TutorPrimingBundle,
  TutorPublishResult,
} from "@/lib/api";
import type { StudioWorkspaceObject } from "@/lib/studioWorkspaceObjects";

export interface StudioPacketEntry {
  id: string;
  title: string;
  detail: string;
  badge?: string;
}

export interface StudioPacketSection {
  id: string;
  title: string;
  description: string;
  emptyMessage: string;
  entries: StudioPacketEntry[];
}

export interface StudioPolishPromotedNote {
  id: string;
  title: string;
  content: string;
  badge: string;
}

export function normalizeStudioPolishPromotedNotes(
  value: unknown,
): StudioPolishPromotedNote[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const id =
        typeof record.id === "string" && record.id.trim().length > 0
          ? record.id.trim()
          : null;
      const title =
        typeof record.title === "string" && record.title.trim().length > 0
          ? record.title.trim()
          : null;
      const content =
        typeof record.content === "string" && record.content.trim().length > 0
          ? record.content.trim()
          : null;
      const badge =
        typeof record.badge === "string" && record.badge.trim().length > 0
          ? record.badge.trim()
          : null;

      if (!id || !title || !content || !badge) return null;

      return {
        id,
        title,
        content,
        badge,
      };
    })
    .filter((note): note is StudioPolishPromotedNote => note !== null);
}

interface BuildPrimePacketSectionsArgs {
  materials: Material[];
  selectedMaterialIds: number[];
  selectedPaths: string[];
  primingBundle?: TutorPrimingBundle | null;
  primingSummaryText: string;
  primingConceptsText: string;
  primingTerminologyText: string;
  primingRootExplanationText: string;
  primingGapsText: string;
  primingStrategyText: string;
  promotedExcerptObjects?: StudioWorkspaceObject[];
  promotedNoteObjects?: StudioWorkspaceObject[];
}

interface BuildPolishPacketSectionsArgs {
  promotedNotes?: StudioPolishPromotedNote[];
  capturedNotes: TutorCapturedNote[];
  polishBundle?: TutorPolishBundle | null;
  publishResults?: TutorPublishResult[];
}

function trimText(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function summarizeText(value: string, fallback: string): string {
  const trimmed = trimText(value);
  if (!trimmed) return fallback;
  const firstLine = trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);

  if (!firstLine) return fallback;
  return firstLine.length > 96 ? `${firstLine.slice(0, 93)}...` : firstLine;
}

function countNonEmptyLines(value: string): number {
  return trimText(value)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean).length;
}

function readRecordString(
  record: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function buildFallbackSourceEntries(
  primingBundle?: TutorPrimingBundle | null,
): StudioPacketEntry[] {
  if (!primingBundle?.source_inventory?.length) return [];

  return primingBundle.source_inventory.map((item) => ({
    id: `bundle-source:${item.id}`,
    title: item.title,
    detail: item.source_path || item.folder_path || "Priming bundle source",
    badge: item.content_type?.toUpperCase() || "SOURCE",
  }));
}

export function buildPrimePacketSections({
  materials,
  selectedMaterialIds,
  selectedPaths,
  primingBundle,
  primingSummaryText,
  primingConceptsText,
  primingTerminologyText,
  primingRootExplanationText,
  primingGapsText,
  primingStrategyText,
  promotedExcerptObjects = [],
  promotedNoteObjects = [],
}: BuildPrimePacketSectionsArgs): StudioPacketSection[] {
  const selectedMaterialIdSet = new Set(selectedMaterialIds);
  const sourceEntries: StudioPacketEntry[] = materials
    .filter((material) => selectedMaterialIdSet.has(material.id))
    .map((material) => ({
      id: `material:${material.id}`,
      title: material.title,
      detail:
        material.source_path ||
        `${material.file_type?.toUpperCase() || "SOURCE"} material linked into this run`,
      badge: material.file_type?.toUpperCase() || "SOURCE",
    }));

  if (sourceEntries.length === 0) {
    sourceEntries.push(...buildFallbackSourceEntries(primingBundle));
  }

  sourceEntries.push(
    ...selectedPaths.map((sourcePath, index) => ({
      id: `vault:${sourcePath}:${index}`,
      title: sourcePath,
      detail: "Linked vault reference",
      badge: "VAULT",
    })),
  );

  const primedArtifactEntries: StudioPacketEntry[] = [];
  const pushArtifact = (
    id: string,
    title: string,
    text: string,
    badge: string,
    emptyFallback: string,
  ) => {
    const trimmed = trimText(text);
    if (!trimmed) return;
    const lineCount = countNonEmptyLines(trimmed);
    primedArtifactEntries.push({
      id,
      title,
      detail:
        lineCount > 1
          ? `${lineCount} lines captured • ${summarizeText(trimmed, emptyFallback)}`
          : summarizeText(trimmed, emptyFallback),
      badge,
    });
  };

  pushArtifact(
    "summary",
    "Summary",
    primingSummaryText,
    "SUMMARY",
    "Priming summary saved",
  );
  pushArtifact(
    "concepts",
    "Concepts",
    primingConceptsText,
    "CONCEPTS",
    "Concept list saved",
  );
  pushArtifact(
    "terminology",
    "Terminology",
    primingTerminologyText,
    "TERMS",
    "Terminology saved",
  );
  pushArtifact(
    "root-explanations",
    "Root Explanations",
    primingRootExplanationText,
    "ROOT",
    "Root explanation saved",
  );
  pushArtifact(
    "identified-gaps",
    "Identified Gaps",
    primingGapsText,
    "GAPS",
    "Gap list saved",
  );
  pushArtifact(
    "tutor-strategy",
    "Tutor Strategy",
    primingStrategyText,
    "STRATEGY",
    "Tutor strategy saved",
  );

  const learningObjectiveCount = primingBundle?.learning_objectives?.length ?? 0;
  if (learningObjectiveCount > 0) {
    primedArtifactEntries.push({
      id: "learning-objectives",
      title: "Learning Objectives",
      detail: `${learningObjectiveCount} objectives approved for Tutor`,
      badge: "OBJECTIVES",
    });
  }

  primedArtifactEntries.push(
    ...promotedExcerptObjects
      .filter(
        (
          workspaceObject,
        ): workspaceObject is Extract<StudioWorkspaceObject, { kind: "excerpt" }> =>
          workspaceObject.kind === "excerpt",
      )
      .map((workspaceObject) => ({
        id: `workspace-excerpt:${workspaceObject.id}`,
        title: "Workspace Excerpt",
        detail:
          workspaceObject.provenance.selectionLabel?.trim()
            ? `${workspaceObject.provenance.selectionLabel} • ${workspaceObject.detail}`
            : workspaceObject.detail,
        badge: workspaceObject.badge,
      })),
  );
  primedArtifactEntries.push(
    ...promotedNoteObjects
      .filter(
        (
          workspaceObject,
        ): workspaceObject is Extract<StudioWorkspaceObject, { kind: "text_note" }> =>
          workspaceObject.kind === "text_note",
      )
      .map((workspaceObject) => ({
        id: `workspace-note:${workspaceObject.id}`,
        title: workspaceObject.title,
        detail: workspaceObject.detail,
        badge: workspaceObject.badge,
      })),
  );

  return [
    {
      id: "source-context",
      title: "Source Context",
      description: "Tutor-bound sources selected for this study run.",
      emptyMessage: "No source context linked into the Prime Packet yet.",
      entries: sourceEntries,
    },
    {
      id: "primed-artifacts",
      title: "Primed Artifacts",
      description: "Approved priming outputs prepared for Tutor.",
      emptyMessage: "No primed artifacts have been staged yet.",
      entries: primedArtifactEntries,
    },
  ];
}

function buildPolishBundleRecordEntries(
  records: Record<string, unknown>[] | undefined,
  sectionPrefix: string,
  titleFallback: string,
  badge: string,
): StudioPacketEntry[] {
  if (!Array.isArray(records)) return [];

  return records.map((record, index) => ({
    id: `${sectionPrefix}:${index}`,
    title:
      readRecordString(record, ["title", "front", "name", "path"]) ||
      `${titleFallback} ${index + 1}`,
    detail:
      readRecordString(record, ["summary", "text", "back", "status"]) ||
      `${titleFallback} staged in Polish Packet`,
    badge,
  }));
}

export function buildPolishPacketSections({
  promotedNotes = [],
  capturedNotes,
  polishBundle,
  publishResults = [],
}: BuildPolishPacketSectionsArgs): StudioPacketSection[] {
  const promotedNoteEntries: StudioPacketEntry[] = promotedNotes.map((note) => ({
    id: `promoted-note:${note.id}`,
    title: note.title,
    detail: summarizeText(note.content, "Tutor note promoted to Polish Packet"),
    badge: note.badge,
  }));

  const noteEntries: StudioPacketEntry[] = [
    ...promotedNoteEntries,
    ...(capturedNotes.length > 0
      ? capturedNotes.map((note) => ({
          id: `note:${note.id}`,
          title:
            trimText(note.title) ||
            `${note.note_mode === "exact" ? "Exact" : "Editable"} note ${note.id}`,
          detail: summarizeText(note.content, "Captured note staged for polish"),
          badge: note.note_mode.toUpperCase(),
        }))
      : [
          ...buildPolishBundleRecordEntries(
            polishBundle?.exact_notes,
            "exact-note",
            "Exact note",
            "EXACT",
          ),
          ...buildPolishBundleRecordEntries(
            polishBundle?.editable_notes,
            "editable-note",
            "Editable note",
            "EDITABLE",
          ),
        ]),
  ];

  const summaryEntries = buildPolishBundleRecordEntries(
    polishBundle?.summaries,
    "summary",
    "Summary",
    "SUMMARY",
  );
  const cardEntries = buildPolishBundleRecordEntries(
    polishBundle?.card_requests,
    "card",
    "Card request",
    "CARD",
  );
  const assetEntries: StudioPacketEntry[] = publishResults.flatMap((result) => {
    const obsidianEntries = Array.isArray(result.obsidian_results)
      ? result.obsidian_results.map((entry, index) => ({
          id: `publish:${result.id}:obsidian:${index}`,
          title:
            readRecordString(entry, ["path", "title", "name"]) ||
            `Obsidian export ${index + 1}`,
          detail: `Publish result • ${result.status}`,
          badge: "OBSIDIAN",
        }))
      : [];
    const ankiEntries = Array.isArray(result.anki_results)
      ? result.anki_results.map((entry, index) => ({
          id: `publish:${result.id}:anki:${index}`,
          title:
            readRecordString(entry, ["deck", "title", "name"]) ||
            `Anki export ${index + 1}`,
          detail: `Publish result • ${result.status}`,
          badge: "ANKI",
        }))
      : [];

    return [...obsidianEntries, ...ankiEntries];
  });

  return [
    {
      id: "notes",
      title: "Notes",
      description: "Captured notes waiting for refinement.",
      emptyMessage: "No captured notes staged for polish yet.",
      entries: noteEntries,
    },
    {
      id: "summaries",
      title: "Summaries",
      description: "Study summaries prepared for final refinement.",
      emptyMessage: "No summaries have been staged yet.",
      entries: summaryEntries,
    },
    {
      id: "cards",
      title: "Cards",
      description: "Card requests ready for packaging.",
      emptyMessage: "No card requests have been staged yet.",
      entries: cardEntries,
    },
    {
      id: "assets",
      title: "Assets",
      description: "Published or exported packet outputs.",
      emptyMessage: "No packet assets or publish outputs yet.",
      entries: assetEntries,
    },
  ];
}
