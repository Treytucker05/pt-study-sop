import type {
  TutorCapturedNote,
  TutorPrimingMethodRun,
  TutorPrimingSourceInventoryItem,
} from "@/api.types";
import type { TutorArtifact } from "@/components/TutorArtifacts";
import type { StudioWorkspaceObject } from "@/lib/studioWorkspaceObjects";
import type { StudioPolishPromotedNote } from "@/lib/studioPacketSections";

export type PrimePromotedWorkspaceObject = Extract<
  StudioWorkspaceObject,
  { kind: "excerpt" | "text_note" }
>;

export type SessionMaterialLearningObjective = {
  loCode: string | null;
  title: string;
  materialId: number | null;
  sourceTitle: string | null;
};

export type SessionMaterialConcept = {
  concept: string;
  materialId: number | null;
  sourceTitle: string | null;
};

export type SessionMaterialTerm = {
  term: string;
  definition: string | null;
  materialId: number | null;
  sourceTitle: string | null;
};

export type SessionMaterialTextItem = {
  text: string;
  materialId: number | null;
  sourceTitle: string | null;
};

export type SessionMaterialNote = {
  id: number | string;
  mode: "exact" | "editable";
  title: string | null;
  content: string;
};

export type SessionMaterialArtifact = {
  type: TutorArtifact["type"];
  title: string;
  content: string;
};

export type SessionMaterialBundle = {
  isReady: boolean;
  sessionKey: string;
  topic: string | null;
  studyUnit: string | null;
  courseId: number | null;
  courseName: string | null;
  learningObjectives: SessionMaterialLearningObjective[];
  concepts: SessionMaterialConcept[];
  terms: SessionMaterialTerm[];
  summaries: SessionMaterialTextItem[];
  rootExplanations: SessionMaterialTextItem[];
  gaps: SessionMaterialTextItem[];
  artifacts: SessionMaterialArtifact[];
  turnCount: number;
  primePacket: PrimePromotedWorkspaceObject[];
  polishPacket: StudioPolishPromotedNote[];
  notes: SessionMaterialNote[];
};

export type SessionMaterialBundleInput = {
  workflowId: string | null;
  tutorSessionId: string | null;
  topic: string | null;
  studyUnit: string | null;
  courseId: number | null;
  courseName: string | null;
  sourceInventory: readonly TutorPrimingSourceInventoryItem[];
  primingMethodRuns: readonly TutorPrimingMethodRun[];
  artifacts: readonly TutorArtifact[];
  turnCount: number;
  capturedNotes: readonly TutorCapturedNote[];
  primePacket: readonly PrimePromotedWorkspaceObject[];
  polishPacket: readonly StudioPolishPromotedNote[];
  hasWorkflowDetail: boolean;
};

function nonEmpty(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function sessionKeyFromInput(input: SessionMaterialBundleInput): string {
  if (input.workflowId) return `workflow:${input.workflowId}`;
  if (input.tutorSessionId) return `tutor-session:${input.tutorSessionId}`;
  return "project";
}

function parseTermEntry(raw: string): SessionMaterialTerm | null {
  const cleaned = raw.trim();
  if (!cleaned) return null;
  const dblIdx = cleaned.indexOf("::");
  if (dblIdx >= 0) {
    const term = cleaned.slice(0, dblIdx).trim();
    const definition = cleaned.slice(dblIdx + 2).trim();
    if (term) {
      return {
        term,
        definition: definition || null,
        materialId: null,
        sourceTitle: null,
      };
    }
  }
  const colonIdx = cleaned.indexOf(":");
  if (colonIdx > 0) {
    const term = cleaned.slice(0, colonIdx).trim();
    const definition = cleaned.slice(colonIdx + 1).trim();
    if (term && definition) {
      return { term, definition, materialId: null, sourceTitle: null };
    }
  }
  return { term: cleaned, definition: null, materialId: null, sourceTitle: null };
}

function dedupeBy<T>(items: T[], keyFn: (item: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const key = keyFn(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export function buildSessionMaterialBundle(
  input: SessionMaterialBundleInput,
): SessionMaterialBundle {
  const sessionKey = sessionKeyFromInput(input);

  const learningObjectives: SessionMaterialLearningObjective[] = [];
  const concepts: SessionMaterialConcept[] = [];
  const terms: SessionMaterialTerm[] = [];
  const summaries: SessionMaterialTextItem[] = [];
  const rootExplanations: SessionMaterialTextItem[] = [];
  const gaps: SessionMaterialTextItem[] = [];

  for (const item of input.sourceInventory) {
    const materialId = typeof item.id === "number" ? item.id : null;
    const sourceTitle = nonEmpty(item.title);
    const primingOutput = item.priming_output;
    if (!primingOutput) continue;

    for (const obj of primingOutput.learning_objectives || []) {
      const title = nonEmpty(obj?.title);
      if (!title) continue;
      learningObjectives.push({
        loCode: nonEmpty(obj?.lo_code),
        title,
        materialId,
        sourceTitle,
      });
    }
    for (const concept of primingOutput.concepts || []) {
      const normalized = nonEmpty(concept);
      if (!normalized) continue;
      concepts.push({ concept: normalized, materialId, sourceTitle });
    }
    for (const rawTerm of primingOutput.terminology || []) {
      const parsed = parseTermEntry(rawTerm);
      if (!parsed) continue;
      terms.push({ ...parsed, materialId, sourceTitle });
    }
    const summary = nonEmpty(primingOutput.summary);
    if (summary) summaries.push({ text: summary, materialId, sourceTitle });
    const root = nonEmpty(primingOutput.root_explanation);
    if (root) rootExplanations.push({ text: root, materialId, sourceTitle });
    for (const gap of primingOutput.gaps || []) {
      const normalized = nonEmpty(gap);
      if (!normalized) continue;
      gaps.push({ text: normalized, materialId, sourceTitle });
    }
  }

  // Method runs can carry objectives that didn't land in priming_output
  for (const run of input.primingMethodRuns) {
    const entries = Array.isArray((run.outputs as { entries?: unknown }).entries)
      ? ((run.outputs as { entries: unknown[] }).entries as Record<string, unknown>[])
      : [];
    for (const entry of entries) {
      const materialId = typeof entry.material_id === "number" ? entry.material_id : null;
      const sourceTitle = nonEmpty(entry.title as string | undefined);
      const entryObjectives = Array.isArray(entry.learning_objectives)
        ? (entry.learning_objectives as Array<{ lo_code?: string; title?: string }>)
        : [];
      for (const obj of entryObjectives) {
        const title = nonEmpty(obj?.title);
        if (!title) continue;
        learningObjectives.push({
          loCode: nonEmpty(obj?.lo_code),
          title,
          materialId,
          sourceTitle,
        });
      }
    }
  }

  const dedupedLOs = dedupeBy(
    learningObjectives,
    (lo) => `${lo.loCode ?? ""}::${lo.title.toLowerCase()}`,
  );
  const dedupedConcepts = dedupeBy(concepts, (c) => c.concept.toLowerCase());
  const dedupedTerms = dedupeBy(terms, (t) => t.term.toLowerCase());
  const dedupedSummaries = dedupeBy(summaries, (s) => s.text);
  const dedupedRoots = dedupeBy(rootExplanations, (r) => r.text);
  const dedupedGaps = dedupeBy(gaps, (g) => g.text.toLowerCase());

  const artifacts: SessionMaterialArtifact[] = input.artifacts.map((artifact) => ({
    type: artifact.type,
    title: artifact.title,
    content: artifact.content,
  }));

  const notes: SessionMaterialNote[] = input.capturedNotes
    .filter((note) => typeof note.content === "string" && note.content.trim().length > 0)
    .map((note) => ({
      id: note.id,
      mode: note.note_mode,
      title: nonEmpty(note.title),
      content: note.content.trim(),
    }));

  const hasAnyMaterial =
    dedupedLOs.length > 0 ||
    dedupedConcepts.length > 0 ||
    dedupedTerms.length > 0 ||
    dedupedSummaries.length > 0 ||
    dedupedRoots.length > 0 ||
    dedupedGaps.length > 0 ||
    artifacts.length > 0 ||
    notes.length > 0 ||
    input.primePacket.length > 0 ||
    input.polishPacket.length > 0;

  const isReady =
    (input.hasWorkflowDetail && Boolean(input.workflowId || input.tutorSessionId)) ||
    hasAnyMaterial;

  return {
    isReady,
    sessionKey,
    topic: nonEmpty(input.topic),
    studyUnit: nonEmpty(input.studyUnit),
    courseId: input.courseId,
    courseName: nonEmpty(input.courseName),
    learningObjectives: dedupedLOs,
    concepts: dedupedConcepts,
    terms: dedupedTerms,
    summaries: dedupedSummaries,
    rootExplanations: dedupedRoots,
    gaps: dedupedGaps,
    artifacts,
    turnCount: input.turnCount,
    primePacket: [...input.primePacket],
    polishPacket: [...input.polishPacket],
    notes,
  };
}

export function emptySessionMaterialBundle(sessionKey = "project"): SessionMaterialBundle {
  return {
    isReady: false,
    sessionKey,
    topic: null,
    studyUnit: null,
    courseId: null,
    courseName: null,
    learningObjectives: [],
    concepts: [],
    terms: [],
    summaries: [],
    rootExplanations: [],
    gaps: [],
    artifacts: [],
    turnCount: 0,
    primePacket: [],
    polishPacket: [],
    notes: [],
  };
}
