import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckSquare2, Loader2, Play, SendHorizontal, Sparkles, Square } from "lucide-react";
import { toast } from "sonner";

import type {
  ChainRunResult,
  MethodBlock,
  TutorPrimingConversationTurn,
  TutorPrimingDisplayedRun,
  TutorPrimingMethodRun,
  TutorPrimingResultBlock,
  TutorPrimingResultBlockKind,
  TutorPrimingSourceInventoryItem,
} from "@/api.types";
import { ConceptMapStructured } from "@/components/brain/ConceptMapStructured";
import { ObsidianRenderer } from "@/components/ObsidianRenderer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { StudioWorkspaceObject } from "@/lib/studioWorkspaceObjects";
import { createStudioPrimingResultWorkspaceObject } from "@/lib/studioWorkspaceObjects";
import { cn } from "@/lib/utils";
import type {
  AppLearningObjective,
  TutorContentSources,
  TutorObjectiveScope,
  TutorTemplateChain,
  TutorWorkflowSummary,
} from "@/lib/api";
import { api } from "@/lib/api";
import { extractMermaidBlock, formatPrimeArtifactMarkdown } from "@/lib/tutorUtils";

type StudyUnitOption = {
  value: string;
  objectiveCount: number;
  materialCount: number;
};

const PRIME_METHOD_DISPLAY_ORDER = [
  "M-PRE-002",
  "M-PRE-004",
  "M-PRE-005",
  "M-PRE-006",
  "M-PRE-008",
  "M-PRE-009",
  "M-PRE-010",
  "M-PRE-012",
  "M-PRE-013",
  "M-PRE-014",
] as const;

type ResultBlockKind = TutorPrimingResultBlockKind;
type ResultBlock = TutorPrimingResultBlock;
type PanelRunResult = TutorPrimingDisplayedRun;

type PrimingChatTurn = {
  id: string;
  role: "user" | "assistant";
  message: string;
  updatedRun?: PanelRunResult | null;
  applied?: boolean;
};

type RunOption =
  | {
      value: `method:${string}`;
      label: string;
      kind: "method";
      methodId: string;
      helperText: string;
    }
  | {
      value: `chain:${number}`;
      label: string;
      kind: "chain";
      chainId: number;
      helperText: string;
    };

type MethodWindowState = {
  methodId: string;
  block: MethodBlock | null;
  run: TutorPrimingMethodRun | null;
  entries: Record<string, unknown>[];
};

const PRIME_METHOD_CARD_TONES = [
  {
    surface: "border-sky-400/28 bg-sky-500/10 hover:bg-sky-500/16",
    bar: "bg-sky-400",
    selected: "ring-1 ring-sky-300/60 shadow-[0_0_24px_rgba(56,189,248,0.18)]",
    checkbox: "border-sky-300/40 bg-sky-400/18 text-sky-50",
  },
  {
    surface: "border-cyan-400/28 bg-cyan-500/10 hover:bg-cyan-500/16",
    bar: "bg-cyan-400",
    selected: "ring-1 ring-cyan-300/60 shadow-[0_0_24px_rgba(34,211,238,0.18)]",
    checkbox: "border-cyan-300/40 bg-cyan-400/18 text-cyan-50",
  },
  {
    surface: "border-emerald-400/28 bg-emerald-500/10 hover:bg-emerald-500/16",
    bar: "bg-emerald-400",
    selected: "ring-1 ring-emerald-300/60 shadow-[0_0_24px_rgba(52,211,153,0.18)]",
    checkbox: "border-emerald-300/40 bg-emerald-400/18 text-emerald-50",
  },
  {
    surface: "border-lime-400/28 bg-lime-500/10 hover:bg-lime-500/16",
    bar: "bg-lime-400",
    selected: "ring-1 ring-lime-300/60 shadow-[0_0_24px_rgba(163,230,53,0.18)]",
    checkbox: "border-lime-300/40 bg-lime-400/18 text-lime-50",
  },
  {
    surface: "border-amber-400/28 bg-amber-500/10 hover:bg-amber-500/16",
    bar: "bg-amber-400",
    selected: "ring-1 ring-amber-300/60 shadow-[0_0_24px_rgba(251,191,36,0.18)]",
    checkbox: "border-amber-300/40 bg-amber-400/18 text-amber-50",
  },
  {
    surface: "border-orange-400/28 bg-orange-500/10 hover:bg-orange-500/16",
    bar: "bg-orange-400",
    selected: "ring-1 ring-orange-300/60 shadow-[0_0_24px_rgba(251,146,60,0.18)]",
    checkbox: "border-orange-300/40 bg-orange-400/18 text-orange-50",
  },
  {
    surface: "border-rose-400/28 bg-rose-500/10 hover:bg-rose-500/16",
    bar: "bg-rose-400",
    selected: "ring-1 ring-rose-300/60 shadow-[0_0_24px_rgba(251,113,133,0.18)]",
    checkbox: "border-rose-300/40 bg-rose-400/18 text-rose-50",
  },
  {
    surface: "border-pink-400/28 bg-pink-500/10 hover:bg-pink-500/16",
    bar: "bg-pink-400",
    selected: "ring-1 ring-pink-300/60 shadow-[0_0_24px_rgba(244,114,182,0.18)]",
    checkbox: "border-pink-300/40 bg-pink-400/18 text-pink-50",
  },
  {
    surface: "border-violet-400/28 bg-violet-500/10 hover:bg-violet-500/16",
    bar: "bg-violet-400",
    selected: "ring-1 ring-violet-300/60 shadow-[0_0_24px_rgba(167,139,250,0.18)]",
    checkbox: "border-violet-300/40 bg-violet-400/18 text-violet-50",
  },
  {
    surface: "border-fuchsia-400/28 bg-fuchsia-500/10 hover:bg-fuchsia-500/16",
    bar: "bg-fuchsia-400",
    selected: "ring-1 ring-fuchsia-300/60 shadow-[0_0_24px_rgba(217,70,239,0.18)]",
    checkbox: "border-fuchsia-300/40 bg-fuchsia-400/18 text-fuchsia-50",
  },
] as const;

function buildMethodRunLabel(labels: string[]): string {
  if (labels.length === 0) return "Selected PRIME Methods";
  if (labels.length === 1) return labels[0];
  return `${labels[0]} + ${labels.length - 1} more`;
}

function buildMethodWindowStates(
  sourceInventory: TutorPrimingSourceInventoryItem[],
  methodIds: string[],
  primeMethods: MethodBlock[],
  fallbackRuns: TutorPrimingMethodRun[],
): MethodWindowState[] {
  return methodIds.map((methodId) => {
    const block = primeMethods.find((entry) => entry.method_id === methodId) || null;
    const fallbackRun = fallbackRuns.find((entry) => entry.method_id === methodId) || null;
    const sourceEntries = sourceInventory
      .flatMap((item) =>
        (item.method_outputs || [])
          .filter((run) => run.method_id === methodId)
          .map((run) => ({
            material_id: item.id,
            title: item.title,
            source_path: item.source_path ?? null,
            ...(run.outputs || {}),
          })),
      )
      .filter(
        (
          entry,
        ): entry is {
          material_id: number;
          title: string;
          source_path: string | null;
        } =>
          Boolean(entry) &&
          typeof entry === "object" &&
          "material_id" in entry &&
          "title" in entry,
      );
    const fallbackEntries =
      fallbackRun?.outputs &&
      typeof fallbackRun.outputs === "object" &&
      Array.isArray(fallbackRun.outputs.entries)
        ? fallbackRun.outputs.entries.filter(
            (
              entry,
            ): entry is {
              material_id: number;
              title: string;
              source_path: string | null;
            } =>
              Boolean(entry) &&
              typeof entry === "object" &&
              "material_id" in entry &&
              "title" in entry,
          )
        : [];

    return {
      methodId,
      block,
      run: fallbackRun,
      entries: sourceEntries.length > 0 ? sourceEntries : fallbackEntries,
    };
  });
}

function makeBlockId(parts: Array<string | number>) {
  return parts
    .map((part) => String(part).trim())
    .filter(Boolean)
    .join("::")
    .replace(/\s+/g, "-")
    .toLowerCase();
}

function normalizeSourceLabel(entry: Record<string, unknown>) {
  const title = typeof entry.title === "string" ? entry.title.trim() : "";
  return title || "Loaded material";
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((entry) => typeof entry === "string" && entry.trim().length > 0)
  );
}

function parseTermEntries(lines: string[]) {
  return lines.map((raw) => {
    const cleaned = raw.trim();
    const doubleColonParts = cleaned.split(/\s*::\s*/);
    if (doubleColonParts.length >= 2) {
      return {
        term: doubleColonParts[0] || cleaned,
        definition: doubleColonParts.slice(1).join(" :: ").trim() || null,
        raw: cleaned,
      };
    }

    const colonIndex = cleaned.indexOf(":");
    if (colonIndex > 0) {
      const term = cleaned.slice(0, colonIndex).trim();
      const definition = cleaned.slice(colonIndex + 1).trim();
      if (term && definition) {
        return { term, definition, raw: cleaned };
      }
    }

    return {
      term: cleaned,
      definition: null,
      raw: cleaned,
    };
  });
}

function buildBlockMarkdown(block: ResultBlock): string {
  if (block.kind === "objectives") {
    const objectiveText = (block.objectives || [])
      .map((item) => {
        const code = item.lo_code?.trim();
        const title = item.title?.trim() || "";
        return code ? `${code} — ${title}` : title;
      })
      .filter(Boolean)
      .join("\n");
    return formatPrimeArtifactMarkdown("objectives", objectiveText);
  }

  if (block.kind === "concept_map") {
    return formatPrimeArtifactMarkdown("map", block.content);
  }

  if (block.kind === "summary") {
    return formatPrimeArtifactMarkdown("summary", block.content);
  }

  if (block.kind === "terms") {
    const termText = (block.terms || []).map((entry) => entry.raw).join("\n");
    return formatPrimeArtifactMarkdown("terms", termText);
  }

  return block.content.trim();
}

function buildBulletListContent(lines: string[]) {
  return lines.map((line) => `- ${line}`).join("\n");
}

function buildMethodResultBlocks(
  methodLabel: string,
  entries: Record<string, unknown>[],
): ResultBlock[] {
  const blocks: ResultBlock[] = [];

  entries.forEach((entry, index) => {
    const sourceTitle = normalizeSourceLabel(entry);
    const blockSuffix = sourceTitle ? ` · ${sourceTitle}` : "";
    const objectives = Array.isArray(entry.learning_objectives)
      ? (entry.learning_objectives as Array<{ lo_code?: string; title?: string }>).filter(
          (item) => typeof item?.title === "string" && item.title.trim().length > 0,
        )
      : [];
    if (objectives.length > 0) {
      blocks.push({
        id: makeBlockId([methodLabel, sourceTitle, "objectives", index]),
        title: `Learning Objectives${blockSuffix}`,
        badge: "OBJECTIVES",
        kind: "objectives",
        sourceLabel: methodLabel,
        ...(typeof entry.material_id === "number" ? { materialId: entry.material_id } : {}),
        content: objectives
          .map((item) => (item.lo_code ? `${item.lo_code} — ${item.title}` : item.title || ""))
          .filter(Boolean)
          .join("\n"),
        objectives,
      });
    }

    const map = typeof entry.map === "string" ? entry.map.trim() : "";
    if (map) {
      blocks.push({
        id: makeBlockId([methodLabel, sourceTitle, "map", index]),
        title: `Concept Map${blockSuffix}`,
        badge: "MAP",
        kind: "concept_map",
        sourceLabel: methodLabel,
        ...(typeof entry.material_id === "number" ? { materialId: entry.material_id } : {}),
        content: map,
      });
    }

    const questions = isStringArray(entry.questions) ? entry.questions : [];
    if (questions.length > 0) {
      blocks.push({
        id: makeBlockId([methodLabel, sourceTitle, "questions", index]),
        title: `Pre-Question Set${blockSuffix}`,
        badge: "QUESTIONS",
        kind: "generic",
        sourceLabel: methodLabel,
        ...(typeof entry.material_id === "number" ? { materialId: entry.material_id } : {}),
        content: buildBulletListContent(questions),
      });
    }

    const summary = typeof entry.summary === "string" ? entry.summary.trim() : "";
    if (summary) {
      blocks.push({
        id: makeBlockId([methodLabel, sourceTitle, "summary", index]),
        title: `Summary${blockSuffix}`,
        badge: "SUMMARY",
        kind: "summary",
        sourceLabel: methodLabel,
        ...(typeof entry.material_id === "number" ? { materialId: entry.material_id } : {}),
        content: summary,
      });
    }

    const majorSections = isStringArray(entry.major_sections) ? entry.major_sections : [];
    if (majorSections.length > 0) {
      blocks.push({
        id: makeBlockId([methodLabel, sourceTitle, "major-sections", index]),
        title: `Major Sections${blockSuffix}`,
        badge: "SECTIONS",
        kind: "generic",
        sourceLabel: methodLabel,
        ...(typeof entry.material_id === "number" ? { materialId: entry.material_id } : {}),
        content: buildBulletListContent(majorSections),
      });
    }

    const terminology = isStringArray(entry.terminology) ? parseTermEntries(entry.terminology) : [];
    if (terminology.length > 0) {
      blocks.push({
        id: makeBlockId([methodLabel, sourceTitle, "terms", index]),
        title: `Terms${blockSuffix}`,
        badge: "TERMS",
        kind: "terms",
        sourceLabel: methodLabel,
        ...(typeof entry.material_id === "number" ? { materialId: entry.material_id } : {}),
        content: terminology.map((term) => term.raw).join("\n"),
        terms: terminology,
      });
    }

    const drawingBrief = typeof entry.drawing_brief === "string" ? entry.drawing_brief.trim() : "";
    if (drawingBrief) {
      blocks.push({
        id: makeBlockId([methodLabel, sourceTitle, "drawing-brief", index]),
        title: `Hand-Draw Brief${blockSuffix}`,
        badge: "DRAW",
        kind: "generic",
        sourceLabel: methodLabel,
        ...(typeof entry.material_id === "number" ? { materialId: entry.material_id } : {}),
        content: drawingBrief,
      });
    }

    const concepts = isStringArray(entry.concepts) ? entry.concepts : [];
    if (concepts.length > 0) {
      blocks.push({
        id: makeBlockId([methodLabel, sourceTitle, "concepts", index]),
        title: `Key Concepts${blockSuffix}`,
        badge: "CONCEPTS",
        kind: "generic",
        sourceLabel: methodLabel,
        ...(typeof entry.material_id === "number" ? { materialId: entry.material_id } : {}),
        content: concepts.map((concept) => `- ${concept}`).join("\n"),
      });
    }

    const branchPoints = isStringArray(entry.branch_points) ? entry.branch_points : [];
    if (branchPoints.length > 0) {
      blocks.push({
        id: makeBlockId([methodLabel, sourceTitle, "branch-points", index]),
        title: `Branch Points${blockSuffix}`,
        badge: "BRANCHES",
        kind: "generic",
        sourceLabel: methodLabel,
        ...(typeof entry.material_id === "number" ? { materialId: entry.material_id } : {}),
        content: buildBulletListContent(branchPoints),
      });
    }

    const followUpTargets = isStringArray(entry.follow_up_targets) ? entry.follow_up_targets : [];
    if (followUpTargets.length > 0) {
      blocks.push({
        id: makeBlockId([methodLabel, sourceTitle, "follow-up-targets", index]),
        title: `Follow-Up Targets${blockSuffix}`,
        badge: "FOLLOW-UP",
        kind: "generic",
        sourceLabel: methodLabel,
        ...(typeof entry.material_id === "number" ? { materialId: entry.material_id } : {}),
        content: buildBulletListContent(followUpTargets),
      });
    }

    const gaps = isStringArray(entry.gaps) ? entry.gaps : [];
    if (gaps.length > 0) {
      blocks.push({
        id: makeBlockId([methodLabel, sourceTitle, "gaps", index]),
        title: `Open Questions${blockSuffix}`,
        badge: "GAPS",
        kind: "generic",
        sourceLabel: methodLabel,
        ...(typeof entry.material_id === "number" ? { materialId: entry.material_id } : {}),
        content: gaps.map((gap) => `- ${gap}`).join("\n"),
      });
    }

    const unsupportedJumps = isStringArray(entry.unsupported_jumps)
      ? entry.unsupported_jumps
      : [];
    if (unsupportedJumps.length > 0) {
      blocks.push({
        id: makeBlockId([methodLabel, sourceTitle, "unsupported-jumps", index]),
        title: `Unsupported Jumps${blockSuffix}`,
        badge: "JUMPS",
        kind: "generic",
        sourceLabel: methodLabel,
        ...(typeof entry.material_id === "number" ? { materialId: entry.material_id } : {}),
        content: buildBulletListContent(unsupportedJumps),
      });
    }
  });

  return blocks;
}

function inferChainResultKind(output: string): ResultBlockKind {
  const trimmed = output.trim();
  if (!trimmed) return "generic";
  if (extractMermaidBlock(trimmed)) return "concept_map";
  if (trimmed.includes("::")) return "terms";
  return "generic";
}

function buildChainResultBlocks(result: ChainRunResult): ResultBlock[] {
  return result.steps
    .filter((step) => step.output.trim().length > 0)
    .map((step) => {
      const kind = inferChainResultKind(step.output);
      return {
        id: makeBlockId([result.chain_name, step.step, step.method_name]),
        title: `${step.step}. ${step.method_name}`,
        badge: step.category.toUpperCase(),
        kind,
        sourceLabel: result.chain_name,
        content: step.output.trim(),
        terms:
          kind === "terms"
            ? parseTermEntries(step.output.split(/\r?\n/).filter(Boolean))
            : undefined,
      };
    });
}

function renderObjectives(objectives: Array<{ lo_code?: string | null; title?: string | null }>) {
  return (
    <ol className="space-y-2">
      {objectives.map((item, index) => (
        <li
          key={`${item.lo_code || "objective"}-${item.title || index}-${index}`}
          className="rounded-[0.75rem] border border-[rgba(255,118,144,0.14)] bg-black/25 px-3 py-2.5"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[rgba(255,118,144,0.18)] bg-black/35 text-[11px] text-[#ffb9c7]">
              {index + 1}
            </div>
            <div className="min-w-0 space-y-1">
              {item.lo_code ? (
                <div className="text-[10px] uppercase tracking-[0.18em] text-[#ffb9c7]/82">
                  {item.lo_code}
                </div>
              ) : null}
              <div className="text-sm leading-6 text-white">{item.title}</div>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

function renderTerms(terms: Array<{ term: string; definition: string | null; raw: string }>) {
  return (
    <dl className="space-y-3">
      {terms.map((entry, index) => (
        <div
          key={`${entry.term}-${index}`}
          className="rounded-[0.75rem] border border-[rgba(255,118,144,0.14)] bg-black/25 px-3 py-2.5"
        >
          <dt className="text-[11px] uppercase tracking-[0.18em] text-[#ffb9c7]">
            {entry.term}
          </dt>
          <dd className="mt-1 text-sm leading-6 text-[#ffe7ec]/80">
            {entry.definition || entry.raw}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function renderResultBody(block: ResultBlock) {
  if (block.kind === "objectives" && block.objectives) {
    return renderObjectives(block.objectives);
  }

  if (block.kind === "concept_map") {
    const mermaid = extractMermaidBlock(block.content);
    if (mermaid) {
      return (
        <div className="h-[260px] overflow-hidden rounded-[0.8rem] border border-[rgba(255,118,144,0.16)] bg-black/35">
          <ConceptMapStructured initialMermaid={mermaid} hideToolbar className="h-full" />
        </div>
      );
    }
  }

  if (block.kind === "terms" && block.terms) {
    return renderTerms(block.terms);
  }

  return (
    <div className="rounded-[0.8rem] border border-[rgba(255,118,144,0.14)] bg-black/25 p-3">
      <ObsidianRenderer content={buildBlockMarkdown(block)} />
    </div>
  );
}

export type TutorPrimingReadinessItem = {
  label: string;
  ready: boolean;
  detail: string;
  warning?: boolean;
};

interface TutorWorkflowPrimingPanelProps {
  workflow: TutorWorkflowSummary | null;
  courses: TutorContentSources["courses"];
  courseId: number | undefined;
  setCourseId: (id: number | undefined) => void;
  selectedMaterials: number[];
  setSelectedMaterials: (ids: number[]) => void;
  topic: string;
  setTopic: (topic: string) => void;
  objectiveScope: TutorObjectiveScope;
  setObjectiveScope: (scope: TutorObjectiveScope) => void;
  selectedObjectiveId: string;
  setSelectedObjectiveId: (value: string) => void;
  selectedObjectiveGroup: string;
  setSelectedObjectiveGroup: (value: string) => void;
  availableObjectives: AppLearningObjective[];
  studyUnitOptions: StudyUnitOption[];
  primingMethods: string[];
  setPrimingMethods: (value: string[]) => void;
  primingMethodRuns: TutorPrimingMethodRun[];
  chainId: number | undefined;
  setChainId: (value: number | undefined) => void;
  customBlockIds: number[];
  setCustomBlockIds: (ids: number[]) => void;
  templateChains: TutorTemplateChain[];
  templateChainsLoading: boolean;
  summaryText: string;
  setSummaryText: (value: string) => void;
  conceptsText: string;
  setConceptsText: (value: string) => void;
  terminologyText: string;
  setTerminologyText: (value: string) => void;
  rootExplanationText: string;
  setRootExplanationText: (value: string) => void;
  gapsText: string;
  setGapsText: (value: string) => void;
  recommendedStrategyText: string;
  setRecommendedStrategyText: (value: string) => void;
  sourceInventory: TutorPrimingSourceInventoryItem[];
  vaultFolderPreview: string;
  readinessItems: TutorPrimingReadinessItem[];
  preflightBlockers: { code?: string; message: string }[];
  preflightLoading: boolean;
  preflightError: string | null;
  onBackToStudio: () => void;
  onSaveDraft: () => void;
  onMarkReady: () => void;
  onStartTutor: () => void;
  onRunAssistForSelected: (methodIdOverride?: string) => void;
  onRunAssistForMaterial: (materialId: number, methodIdOverride?: string) => void;
  onPromoteResultToPrimePacket?: (
    workspaceObject: Extract<StudioWorkspaceObject, { kind: "text_note" }>,
  ) => void;
  onSendResultToWorkspace?: (
    workspaceObject: Extract<StudioWorkspaceObject, { kind: "text_note" }>,
  ) => void;
  onApplyRefinedResults?: (run: TutorPrimingDisplayedRun) => void;
  isSaving: boolean;
  isStartingTutor: boolean;
  isRunningAssist: boolean;
  assistTargetMaterialId: number | null;
}

export function TutorWorkflowPrimingPanel({
  workflow,
  courseId,
  selectedMaterials,
  topic,
  selectedObjectiveGroup,
  primingMethods,
  setPrimingMethods,
  primingMethodRuns,
  chainId,
  setChainId,
  customBlockIds,
  setCustomBlockIds,
  templateChains,
  templateChainsLoading,
  sourceInventory,
  onRunAssistForSelected,
  onPromoteResultToPrimePacket,
  onSendResultToWorkspace,
  onApplyRefinedResults,
  isRunningAssist,
}: TutorWorkflowPrimingPanelProps) {
  const [pendingMethodResult, setPendingMethodResult] = useState<{
    methodIds: string[];
    label: string;
  } | null>(null);
  const [displayedRun, setDisplayedRun] = useState<PanelRunResult | null>(null);
  const [runningChain, setRunningChain] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatTurns, setChatTurns] = useState<PrimingChatTurn[]>([]);
  const [sendingChat, setSendingChat] = useState(false);
  const previousAssistRunningRef = useRef(isRunningAssist);

  const {
    data: primeMethodResponse = [],
    isLoading: primeMethodsLoading,
    error: primeMethodsError,
  } = useQuery<MethodBlock[]>({
    queryKey: ["methods", "PRIME"],
    queryFn: () => api.methods.getAll("PRIME"),
    staleTime: 60_000,
  });

  const primeMethods = useMemo(() => {
    return primeMethodResponse
      .filter(
        (block) =>
          String(block.control_stage || "").toUpperCase() === "PRIME" &&
          Boolean(block.method_id),
      )
      .sort((a, b) => {
        const aIndex = PRIME_METHOD_DISPLAY_ORDER.indexOf(
          (a.method_id || "") as (typeof PRIME_METHOD_DISPLAY_ORDER)[number],
        );
        const bIndex = PRIME_METHOD_DISPLAY_ORDER.indexOf(
          (b.method_id || "") as (typeof PRIME_METHOD_DISPLAY_ORDER)[number],
        );
        if (aIndex === -1 && bIndex === -1) return a.name.localeCompare(b.name);
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });
  }, [primeMethodResponse]);

  const selectedSourceInventory = useMemo(
    () => sourceInventory.filter((item) => selectedMaterials.includes(item.id)),
    [selectedMaterials, sourceInventory],
  );

  const materialChips = useMemo(() => {
    if (selectedSourceInventory.length > 0) {
      return selectedSourceInventory.map((item) => ({
        id: item.id,
        label: item.title,
      }));
    }

    return selectedMaterials.map((materialId) => ({
      id: materialId,
      label: `Material #${materialId}`,
    }));
  }, [selectedMaterials, selectedSourceInventory]);

  const selectedMethodCards = useMemo(
    () =>
      primeMethods.filter(
        (method): method is MethodBlock & { method_id: string } =>
          Boolean(method.method_id) && primingMethods.includes(method.method_id),
      ),
    [primeMethods, primingMethods],
  );
  const selectedMethodLabels = useMemo(
    () => selectedMethodCards.map((method) => method.name),
    [selectedMethodCards],
  );
  const selectedChain = useMemo(
    () => templateChains.find((chain) => chain.id === chainId) || null,
    [chainId, templateChains],
  );
  const runDisabled =
    materialChips.length === 0 ||
    (!selectedChain && selectedMethodCards.length === 0) ||
    primeMethodsLoading ||
    runningChain ||
    isRunningAssist;
  const selectionMode: RunOption["kind"] | null = selectedChain
    ? "chain"
    : selectedMethodCards.length > 0
      ? "method"
      : null;
  const selectionHelperText = useMemo(() => {
    if (selectedChain) {
      return (
        selectedChain.description?.trim() ||
        "Run this template chain against the loaded materials."
      );
    }
    if (selectedMethodCards.length === 1) {
      return (
        selectedMethodCards[0]?.description?.trim() ||
        "Run this PRIME method against the loaded materials."
      );
    }
    if (selectedMethodCards.length > 1) {
      return `RUN executes all ${selectedMethodCards.length} selected PRIME methods against the loaded materials.`;
    }
    return null;
  }, [selectedChain, selectedMethodCards]);

  const runTopic = useMemo(() => {
    const normalizedTopic = topic.trim();
    if (normalizedTopic) return normalizedTopic;
    const studyUnit = selectedObjectiveGroup.trim();
    if (studyUnit) return studyUnit;
    const workflowTopic = workflow?.topic?.trim();
    if (workflowTopic) return workflowTopic;
    return materialChips.map((chip) => chip.label).join(", ") || "Priming Study Run";
  }, [materialChips, selectedObjectiveGroup, topic, workflow?.topic]);

  useEffect(() => {
    if (customBlockIds.length === 0 || typeof chainId === "number") {
      return;
    }
    setCustomBlockIds([]);
  }, [chainId, customBlockIds.length, setCustomBlockIds]);

  useEffect(() => {
    if (typeof chainId !== "number" || primingMethods.length === 0) {
      return;
    }
    setPrimingMethods([]);
  }, [chainId, primingMethods, setPrimingMethods]);

  useEffect(() => {
    const wasRunning = previousAssistRunningRef.current;
    if (!wasRunning || isRunningAssist) {
      previousAssistRunningRef.current = isRunningAssist;
      return;
    }

    if (!pendingMethodResult) {
      previousAssistRunningRef.current = isRunningAssist;
      return;
    }

    const methodStates = buildMethodWindowStates(
      selectedSourceInventory,
      pendingMethodResult.methodIds,
      primeMethods,
      primingMethodRuns,
    );
    const methodLabels = methodStates.map(
      (state) => state.block?.name || state.run?.method_name || state.methodId,
    );
    const blocks = methodStates.flatMap((state) =>
      buildMethodResultBlocks(
        state.block?.name || state.run?.method_name || state.methodId,
        state.entries,
      ),
    );
    const resolvedMethodIds = pendingMethodResult.methodIds.filter(
      (value, index, items) => value.trim().length > 0 && items.indexOf(value) === index,
    );

    setDisplayedRun({
      key: `method:${resolvedMethodIds.join(",")}:${Date.now()}`,
      label:
        methodLabels.length > 0 ? buildMethodRunLabel(methodLabels) : pendingMethodResult.label,
      kind: "method",
      methodId: resolvedMethodIds.length === 1 ? resolvedMethodIds[0] : null,
      blocks,
    });
    setPendingMethodResult(null);
    previousAssistRunningRef.current = isRunningAssist;
  }, [
    isRunningAssist,
    pendingMethodResult,
    primeMethods,
    primingMethodRuns,
    selectedSourceInventory,
  ]);

  const handleToggleMethod = (methodId: string) => {
    const nextSelected = primingMethods.includes(methodId)
      ? primingMethods.filter((value) => value !== methodId)
      : [...primingMethods, methodId];
    const orderedSelection = primeMethods
      .filter((method): method is MethodBlock & { method_id: string } => Boolean(method.method_id))
      .map((method) => method.method_id)
      .filter((candidate) => nextSelected.includes(candidate));
    setChainId(undefined);
    setCustomBlockIds([]);
    setPrimingMethods(orderedSelection);
  };

  const handleChainSelectionChange = (value: string) => {
    if (!value) {
      setChainId(undefined);
      setCustomBlockIds([]);
      return;
    }
    const parsedChainId = Number.parseInt(value, 10);
    if (!Number.isFinite(parsedChainId)) {
      return;
    }
    setPrimingMethods([]);
    setChainId(parsedChainId);
    setCustomBlockIds([]);
  };

  const handleRun = async () => {
    if (!selectionMode || materialChips.length === 0) {
      return;
    }

    setChatTurns([]);
    setChatInput("");

    if (selectionMode === "method") {
      const selectedMethodIds = selectedMethodCards
        .map((method) => method.method_id)
        .filter((value): value is string => Boolean(value));
      if (selectedMethodIds.length === 0) {
        return;
      }
      setPendingMethodResult({
        methodIds: selectedMethodIds,
        label: buildMethodRunLabel(selectedMethodLabels),
      });
      onRunAssistForSelected();
      return;
    }

    if (!selectedChain) {
      return;
    }

    setRunningChain(true);
    try {
      const result = await api.chainRun.start({
        chain_id: selectedChain.id,
        topic: runTopic,
        course_id: courseId,
        source_doc_ids: selectedMaterials,
        options: {
          write_obsidian: false,
          draft_cards: false,
        },
      });
      setDisplayedRun({
        key: `chain:${selectedChain.id}:${result.run_id}`,
        label: result.chain_name,
        kind: "chain",
        chainId: selectedChain.id,
        blocks: buildChainResultBlocks(result),
      });
      toast.success(`${result.chain_name} completed`);
    } catch (error) {
      toast.error(
        `Failed to run chain: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setRunningChain(false);
    }
  };

  const handlePromote = (block: ResultBlock) => {
    const workspaceObject = createStudioPrimingResultWorkspaceObject({
      resultKey: block.id,
      title: block.title,
      detail: buildBlockMarkdown(block),
      badge: block.badge,
      sourceLabel: block.sourceLabel,
    }) as Extract<StudioWorkspaceObject, { kind: "text_note" }>;
    onPromoteResultToPrimePacket?.(workspaceObject);
  };

  const handleSendToWorkspace = (block: ResultBlock) => {
    const workspaceObject = createStudioPrimingResultWorkspaceObject({
      resultKey: block.id,
      title: block.title,
      detail: buildBlockMarkdown(block),
      badge: block.badge,
      sourceLabel: block.sourceLabel,
    }) as Extract<StudioWorkspaceObject, { kind: "text_note" }>;
    onSendResultToWorkspace?.(workspaceObject);
  };

  const handleApplyRefinedResults = (turnId: string, run: PanelRunResult) => {
    setDisplayedRun(run);
    onApplyRefinedResults?.(run);
    setChatTurns((current) =>
      current.map((turn) => (turn.id === turnId ? { ...turn, applied: true } : turn)),
    );
    toast.success("Priming results updated");
  };

  const handleSendChat = async () => {
    const message = chatInput.trim();
    if (!displayedRun || displayedRun.blocks.length === 0 || !message || sendingChat) {
      return;
    }

    const userTurnId = `priming-user-${Date.now()}`;
    const userTurn: PrimingChatTurn = {
      id: userTurnId,
      role: "user",
      message,
    };
    const conversationHistory: TutorPrimingConversationTurn[] = chatTurns.map((turn) => ({
      role: turn.role,
      message: turn.message,
      ...(turn.updatedRun ? { updatedResults: turn.updatedRun } : {}),
    }));

    setChatTurns((current) => [...current, userTurn]);
    setChatInput("");
    setSendingChat(true);
    try {
      const response = await api.tutor.refinePrimingAssist({
        message,
        material_ids: selectedMaterials,
        extraction_results: displayedRun,
        conversation_history: conversationHistory,
      });
      setChatTurns((current) => [
        ...current,
        {
          id: `priming-assistant-${Date.now()}`,
          role: "assistant",
          message: response.assistant_message,
          updatedRun: response.updated_results || null,
          applied: false,
        },
      ]);
    } catch (error) {
      setChatTurns((current) => current.filter((turn) => turn.id !== userTurnId));
      setChatInput(message);
      toast.error(
        `Priming chat failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setSendingChat(false);
    }
  };

  const chatDisabled = !displayedRun || displayedRun.blocks.length === 0;

  return (
    <div
      data-testid="priming-tool-panel"
      className="flex min-h-0 flex-col gap-4 font-mono text-sm text-foreground/78"
    >
      <section className="rounded-[0.95rem] border border-[rgba(255,118,144,0.16)] bg-black/20 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-[#ffb9c7]">
              Material + Method
            </div>
            <p className="mt-1 text-sm leading-6 text-[#ffd9e1]/70">
              Loaded materials come from Source Shelf and Workspace. Pick one or more methods, or switch into chain mode, then run extraction here.
            </p>
          </div>
          {selectionMode ? (
            <Badge
              variant="outline"
              className="rounded-full border-[rgba(255,118,144,0.18)] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[#ffb9c7]"
            >
              {selectionMode === "method" ? "Methods" : "Chain"}
            </Badge>
          ) : null}
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-[#ffb9c7]/76">
              Loaded Materials
            </div>
            {materialChips.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {materialChips.map((chip) => (
                  <span
                    key={chip.id}
                    className="rounded-full border border-[rgba(255,118,144,0.18)] bg-[rgba(255,68,104,0.1)] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[#ffe1e8]"
                  >
                    {chip.label}
                  </span>
                ))}
              </div>
            ) : (
              <div className="mt-2 rounded-[0.75rem] border border-dashed border-[rgba(255,118,144,0.18)] bg-black/15 px-3 py-2.5 text-sm leading-6 text-[#ffd9e1]/62">
                No materials loaded — open Source Shelf to add.
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-[#ffb9c7]/76">
                  PRIME Methods
                </div>
                <p className="mt-1 text-sm leading-6 text-[#ffd9e1]/66">
                  Pick one or more methods. Each selected card stays active until you clear it or switch into chain mode.
                </p>
              </div>
              <Badge
                variant="outline"
                className="rounded-full border-[rgba(255,118,144,0.18)] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[#ffb9c7]"
              >
                {selectedMethodCards.length > 0
                  ? `${selectedMethodCards.length} selected`
                  : "Select methods"}
              </Badge>
            </div>

            {primeMethodsLoading ? (
              <div className="rounded-[0.85rem] border border-dashed border-[rgba(255,118,144,0.18)] bg-black/15 px-4 py-5 text-sm leading-6 text-[#ffd9e1]/62">
                Loading PRIME methods...
              </div>
            ) : primeMethods.length > 0 ? (
              <div
                data-testid="priming-method-card-grid"
                className="grid gap-3 xl:grid-cols-2"
              >
                {primeMethods.map((method, index) => {
                  if (!method.method_id) {
                    return null;
                  }
                  const tone =
                    PRIME_METHOD_CARD_TONES[index % PRIME_METHOD_CARD_TONES.length];
                  const isSelected = primingMethods.includes(method.method_id);
                  const description =
                    method.description?.trim() ||
                    "Run this PRIME method against the loaded materials.";
                  return (
                    <button
                      key={method.method_id}
                      type="button"
                      role="checkbox"
                      aria-checked={isSelected}
                      aria-label={method.name}
                      data-testid="priming-method-card"
                      data-method-id={method.method_id}
                      data-selected={isSelected ? "true" : "false"}
                      onClick={() => handleToggleMethod(method.method_id!)}
                      className={cn(
                        "group relative overflow-hidden rounded-[0.95rem] border text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd6de]",
                        tone.surface,
                        isSelected ? tone.selected : "opacity-92",
                      )}
                    >
                      <span
                        className={cn(
                          "absolute inset-y-0 left-0 w-1.5",
                          tone.bar,
                        )}
                        aria-hidden="true"
                      />
                      <div className="space-y-2.5 px-4 py-3 pl-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-[10px] uppercase tracking-[0.18em] text-[#ffe1e8]/60">
                              {method.method_id}
                            </div>
                            <div className="mt-1 font-semibold text-white">
                              {method.name}
                            </div>
                          </div>
                          <span
                            className={cn(
                              "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition",
                              isSelected
                                ? tone.checkbox
                                : "border-white/12 bg-black/25 text-[#ffd9e1]/50",
                            )}
                            aria-hidden="true"
                          >
                            {isSelected ? (
                              <CheckSquare2 className="h-4 w-4" />
                            ) : (
                              <Square className="h-4 w-4" />
                            )}
                          </span>
                        </div>
                        <p
                          data-testid="priming-method-card-description"
                          title={description}
                          className="line-clamp-1 text-sm leading-6 text-[#ffe6ec]/74"
                        >
                          {description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-[0.85rem] border border-dashed border-[rgba(255,118,144,0.18)] bg-black/15 px-4 py-5 text-sm leading-6 text-[#ffd9e1]/62">
                No PRIME methods are available right now.
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-[11px] leading-5 text-[#ffd9e1]/60">
                {selectedMethodCards.length > 0
                  ? `${selectedMethodCards.length} method${selectedMethodCards.length === 1 ? "" : "s"} selected`
                  : "Select one or more PRIME methods to run."}
              </div>
              {selectedMethodCards.length > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPrimingMethods([])}
                  className="rounded-full border-[rgba(255,118,144,0.18)] bg-black/20 px-4 font-mono text-[10px] uppercase tracking-[0.18em] text-[#ffd9e1]"
                >
                  Clear Methods
                </Button>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <label className="block">
              <div className="text-[10px] uppercase tracking-[0.18em] text-[#ffb9c7]/76">
                Optional Chain Mode
              </div>
              <select
                aria-label="Priming chain"
                data-testid="priming-chain-selector"
                value={typeof chainId === "number" ? String(chainId) : ""}
                onChange={(event) => handleChainSelectionChange(event.target.value)}
                disabled={templateChainsLoading}
                className="mt-2 h-11 w-full rounded-[0.85rem] border border-[rgba(255,118,144,0.18)] bg-black/30 px-3 text-sm text-white outline-none"
              >
                <option value="">
                  {templateChainsLoading ? "Loading chains..." : "Select a chain instead of method cards"}
                </option>
                {templateChains.map((chain) => (
                  <option key={chain.id} value={chain.id}>
                    {chain.name || `Chain #${chain.id}`}
                  </option>
                ))}
              </select>
            </label>

            <Button
              type="button"
              data-testid="priming-run-button"
              onClick={() => {
                void handleRun();
              }}
              disabled={runDisabled}
              className="h-11 rounded-full border border-[rgba(255,118,144,0.22)] bg-[rgba(255,68,104,0.18)] px-5 font-mono text-[11px] uppercase tracking-[0.18em] text-white hover:bg-[rgba(255,68,104,0.28)]"
            >
              {runningChain || isRunningAssist ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              RUN
            </Button>
          </div>

          {selectionMode ? (
            <div className="rounded-[0.75rem] border border-[rgba(255,118,144,0.14)] bg-black/15 px-3 py-2 text-sm leading-6 text-[#ffd9e1]/66">
              {selectionHelperText}
            </div>
          ) : null}
          {primeMethodsError ? (
            <div className="rounded-[0.75rem] border border-[rgba(255,82,82,0.24)] bg-[rgba(80,0,0,0.18)] px-3 py-2 text-sm text-[#ffb9b9]">
              Failed to load PRIME methods.
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-[0.95rem] border border-[rgba(255,118,144,0.16)] bg-black/20 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-[#ffb9c7]">
              Output Area
            </div>
          <p className="mt-1 text-sm leading-6 text-[#ffd9e1]/70">
            {displayedRun
              ? `${displayedRun.label} results stay here until the next run replaces them.`
                : "Select a method and click RUN to extract study artifacts."}
            </p>
          </div>
          {displayedRun ? (
            <Badge
              variant="outline"
              className="rounded-full border-[rgba(255,118,144,0.18)] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[#ffb9c7]"
            >
              {displayedRun.kind === "method" && !displayedRun.methodId
                ? "Method Results"
                : displayedRun.kind === "method"
                  ? "Method Result"
                  : "Chain Result"}
            </Badge>
          ) : null}
        </div>

        <div className="mt-4">
          {!displayedRun ? (
            <div className="rounded-[0.85rem] border border-dashed border-[rgba(255,118,144,0.18)] bg-black/15 px-4 py-8 text-center text-sm leading-6 text-[#ffd9e1]/62">
              Select a method and click RUN to extract study artifacts.
            </div>
          ) : displayedRun.blocks.length === 0 ? (
            <div className="rounded-[0.85rem] border border-dashed border-[rgba(255,118,144,0.18)] bg-black/15 px-4 py-8 text-center text-sm leading-6 text-[#ffd9e1]/62">
              This run completed, but no study artifacts were returned for the selected output format.
            </div>
          ) : (
            <div className="space-y-4">
              {displayedRun.blocks.map((block) => (
                <article
                  key={block.id}
                  data-testid="priming-result-block"
                  className="rounded-[0.9rem] border border-[rgba(255,118,144,0.14)] bg-black/18 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.18em] text-[#ffb9c7]/76">
                        {block.sourceLabel}
                      </div>
                      <div className="mt-1 text-base text-white">{block.title}</div>
                    </div>
                    <Badge
                      variant="outline"
                      className="rounded-full border-[rgba(255,118,144,0.18)] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[#ffb9c7]"
                    >
                      {block.badge}
                    </Badge>
                  </div>

                  <div className="mt-4">{renderResultBody(block)}</div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handlePromote(block)}
                      className="rounded-full border-[rgba(255,118,144,0.18)] bg-black/20 px-4 font-mono text-[10px] uppercase tracking-[0.18em] text-[#ffd9e1]"
                    >
                      <Sparkles className="mr-2 h-3.5 w-3.5" />
                      Send to Prime Packet
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleSendToWorkspace(block)}
                      className="rounded-full border-[rgba(255,118,144,0.18)] bg-black/20 px-4 font-mono text-[10px] uppercase tracking-[0.18em] text-[#ffd9e1]"
                    >
                      Send to Workspace
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="flex min-h-[260px] flex-col rounded-[0.95rem] border border-[rgba(255,118,144,0.16)] bg-black/20 p-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-[#ffb9c7]">
            Priming Chat
          </div>
          <p className="mt-1 text-sm leading-6 text-[#ffd9e1]/70">
            {chatDisabled
              ? "Run a method or chain first, then use chat to expand, revise, or source-check the current Priming results."
              : "Use chat to refine the current Priming results. Apply changes only when you want the output area replaced."}
          </p>
        </div>

        <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
          {chatTurns.length === 0 ? (
            <div className="rounded-[0.85rem] border border-dashed border-[rgba(255,118,144,0.18)] bg-black/15 px-4 py-5 text-sm leading-6 text-[#ffd9e1]/62">
              {chatDisabled
                ? "Run a method or chain first to unlock chat with the current Priming results."
                : "Ask Priming to expand a specific objective, cite a claim, or rewrite the current output."}
            </div>
          ) : (
            chatTurns.map((turn) => (
              <article
                key={turn.id}
                data-testid={`priming-chat-turn-${turn.role}`}
                className={`rounded-[0.85rem] border px-4 py-3 ${
                  turn.role === "assistant"
                    ? "border-[rgba(255,118,144,0.16)] bg-black/22"
                    : "border-[rgba(255,118,144,0.12)] bg-[rgba(255,68,104,0.08)]"
                }`}
              >
                <div className="text-[10px] uppercase tracking-[0.18em] text-[#ffb9c7]/76">
                  {turn.role === "assistant" ? "Priming Assist" : "You"}
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#ffe6ec]">
                  {turn.message}
                </p>
                {turn.role === "assistant" && turn.updatedRun ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleApplyRefinedResults(turn.id, turn.updatedRun!)}
                      disabled={Boolean(turn.applied)}
                      className="rounded-full border-[rgba(255,118,144,0.18)] bg-black/20 px-4 font-mono text-[10px] uppercase tracking-[0.18em] text-[#ffd9e1]"
                    >
                      {turn.applied ? "Applied" : "Apply changes"}
                    </Button>
                    <span className="text-[11px] text-[#ffd9e1]/60">
                      This assistant turn includes a replacement result set.
                    </span>
                  </div>
                ) : null}
              </article>
            ))
          )}
        </div>

        <div className="mt-4 border-t border-[rgba(255,118,144,0.12)] pt-4">
          <div className="flex flex-col gap-3">
            <textarea
              data-testid="priming-chat-input"
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void handleSendChat();
                }
              }}
              disabled={chatDisabled || sendingChat}
              placeholder={
                chatDisabled
                  ? "Run a method first to chat with Priming results"
                  : "Ask Priming to refine the current results"
              }
              className="min-h-[86px] w-full rounded-[0.85rem] border border-[rgba(255,118,144,0.14)] bg-black/25 px-3 py-3 text-sm text-[#ffe6ec] outline-none placeholder:text-[#ffd9e1]/38 disabled:text-[#ffd9e1]/48"
            />
            <div className="flex items-center justify-between gap-3">
              <div className="text-[11px] leading-5 text-[#ffd9e1]/56">
                {chatDisabled
                  ? "Chat unlocks after the current run produces results."
                  : "Chat history stays here until the next RUN replaces the current result set."}
              </div>
              <Button
                type="button"
                data-testid="priming-chat-send"
                onClick={() => {
                  void handleSendChat();
                }}
                disabled={chatDisabled || sendingChat || !chatInput.trim()}
                className="rounded-full border border-[rgba(255,118,144,0.22)] bg-[rgba(255,68,104,0.18)] px-5 font-mono text-[10px] uppercase tracking-[0.18em] text-white hover:bg-[rgba(255,68,104,0.28)]"
              >
                {sendingChat ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <SendHorizontal className="mr-2 h-4 w-4" />
                )}
                Send
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
