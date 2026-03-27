import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Play, Sparkles } from "lucide-react";
import { toast } from "sonner";

import type {
  ChainRunResult,
  MethodBlock,
  TutorPrimingMethodRun,
  TutorPrimingSourceInventoryItem,
} from "@/api.types";
import { ConceptMapStructured } from "@/components/brain/ConceptMapStructured";
import { ObsidianRenderer } from "@/components/ObsidianRenderer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { StudioWorkspaceObject } from "@/lib/studioWorkspaceObjects";
import { createStudioPrimingResultWorkspaceObject } from "@/lib/studioWorkspaceObjects";
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

type ResultBlockKind =
  | "objectives"
  | "concept_map"
  | "summary"
  | "terms"
  | "generic";

type ResultBlock = {
  id: string;
  title: string;
  badge: string;
  kind: ResultBlockKind;
  sourceLabel: string;
  content: string;
  objectives?: Array<{ lo_code?: string; title?: string }>;
  terms?: Array<{ term: string; definition: string | null; raw: string }>;
};

type PanelRunResult = {
  key: string;
  label: string;
  kind: "method" | "chain";
  blocks: ResultBlock[];
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

function buildMethodResultBlocks(
  methodLabel: string,
  entries: Record<string, unknown>[],
): ResultBlock[] {
  const blocks: ResultBlock[] = [];

  entries.forEach((entry, index) => {
    const sourceLabel = normalizeSourceLabel(entry);
    const blockSuffix = entries.length > 1 ? ` · ${sourceLabel}` : "";
    const objectives = Array.isArray(entry.learning_objectives)
      ? (entry.learning_objectives as Array<{ lo_code?: string; title?: string }>).filter(
          (item) => typeof item?.title === "string" && item.title.trim().length > 0,
        )
      : [];
    if (objectives.length > 0) {
      blocks.push({
        id: makeBlockId([methodLabel, sourceLabel, "objectives", index]),
        title: `Learning Objectives${blockSuffix}`,
        badge: "OBJECTIVES",
        kind: "objectives",
        sourceLabel,
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
        id: makeBlockId([methodLabel, sourceLabel, "map", index]),
        title: `Concept Map${blockSuffix}`,
        badge: "MAP",
        kind: "concept_map",
        sourceLabel,
        content: map,
      });
    }

    const summary = typeof entry.summary === "string" ? entry.summary.trim() : "";
    if (summary) {
      blocks.push({
        id: makeBlockId([methodLabel, sourceLabel, "summary", index]),
        title: `Summary${blockSuffix}`,
        badge: "SUMMARY",
        kind: "summary",
        sourceLabel,
        content: summary,
      });
    }

    const terminology = isStringArray(entry.terminology) ? parseTermEntries(entry.terminology) : [];
    if (terminology.length > 0) {
      blocks.push({
        id: makeBlockId([methodLabel, sourceLabel, "terms", index]),
        title: `Terms${blockSuffix}`,
        badge: "TERMS",
        kind: "terms",
        sourceLabel,
        content: terminology.map((term) => term.raw).join("\n"),
        terms: terminology,
      });
    }

    const concepts = isStringArray(entry.concepts) ? entry.concepts : [];
    if (concepts.length > 0) {
      blocks.push({
        id: makeBlockId([methodLabel, sourceLabel, "concepts", index]),
        title: `Key Concepts${blockSuffix}`,
        badge: "CONCEPTS",
        kind: "generic",
        sourceLabel,
        content: concepts.map((concept) => `- ${concept}`).join("\n"),
      });
    }

    const gaps = isStringArray(entry.gaps) ? entry.gaps : [];
    if (gaps.length > 0) {
      blocks.push({
        id: makeBlockId([methodLabel, sourceLabel, "gaps", index]),
        title: `Open Questions${blockSuffix}`,
        badge: "GAPS",
        kind: "generic",
        sourceLabel,
        content: gaps.map((gap) => `- ${gap}`).join("\n"),
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

function renderObjectives(objectives: Array<{ lo_code?: string; title?: string }>) {
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
  isRunningAssist,
}: TutorWorkflowPrimingPanelProps) {
  const [pendingMethodResult, setPendingMethodResult] = useState<{
    methodId: string;
    label: string;
  } | null>(null);
  const [displayedRun, setDisplayedRun] = useState<PanelRunResult | null>(null);
  const [runningChain, setRunningChain] = useState(false);
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

  const runOptions = useMemo<RunOption[]>(() => {
    const methodOptions = primeMethods
      .filter((method): method is MethodBlock & { method_id: string } => Boolean(method.method_id))
      .map((method) => ({
        value: `method:${method.method_id}` as const,
        label: method.name,
        kind: "method" as const,
        methodId: method.method_id,
        helperText:
          method.description?.trim() ||
          "Run this PRIME method against the loaded materials.",
      }));
    const chainOptions = templateChains.map((chain) => ({
      value: `chain:${chain.id}` as const,
      label: chain.name || `Chain #${chain.id}`,
      kind: "chain" as const,
      chainId: chain.id,
      helperText:
        chain.description?.trim() ||
        "Run this template chain against the loaded materials.",
    }));

    return [...methodOptions, ...chainOptions];
  }, [primeMethods, templateChains]);

  const selectionValue =
    typeof chainId === "number"
      ? (`chain:${chainId}` as const)
      : primingMethods[0]
        ? (`method:${primingMethods[0]}` as const)
        : "";
  const selectedRunOption =
    runOptions.find((option) => option.value === selectionValue) || null;
  const runDisabled =
    materialChips.length === 0 ||
    !selectedRunOption ||
    primeMethodsLoading ||
    runningChain ||
    isRunningAssist;

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
    const wasRunning = previousAssistRunningRef.current;
    if (!wasRunning || isRunningAssist) {
      previousAssistRunningRef.current = isRunningAssist;
      return;
    }

    if (!pendingMethodResult) {
      previousAssistRunningRef.current = isRunningAssist;
      return;
    }

    const methodState = buildMethodWindowStates(
      selectedSourceInventory,
      [pendingMethodResult.methodId],
      primeMethods,
      primingMethodRuns,
    )[0];
    const methodLabel =
      methodState?.block?.name ||
      methodState?.run?.method_name ||
      pendingMethodResult.label;
    const blocks = methodState
      ? buildMethodResultBlocks(methodLabel, methodState.entries)
      : [];

    setDisplayedRun({
      key: `method:${pendingMethodResult.methodId}:${Date.now()}`,
      label: methodLabel,
      kind: "method",
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

  const handleSelectionChange = (value: string) => {
    if (!value) {
      setPrimingMethods([]);
      setChainId(undefined);
      setCustomBlockIds([]);
      return;
    }

    if (value.startsWith("method:")) {
      const methodId = value.replace("method:", "");
      setPrimingMethods(methodId ? [methodId] : []);
      setChainId(undefined);
      setCustomBlockIds([]);
      return;
    }

    if (value.startsWith("chain:")) {
      const parsedChainId = Number.parseInt(value.replace("chain:", ""), 10);
      if (Number.isFinite(parsedChainId)) {
        setPrimingMethods([]);
        setChainId(parsedChainId);
        setCustomBlockIds([]);
      }
    }
  };

  const handleRun = async () => {
    if (!selectedRunOption || materialChips.length === 0) {
      return;
    }

    if (selectedRunOption.kind === "method") {
      setPendingMethodResult({
        methodId: selectedRunOption.methodId,
        label: selectedRunOption.label,
      });
      onRunAssistForSelected(selectedRunOption.methodId);
      return;
    }

    setRunningChain(true);
    try {
      const result = await api.chainRun.start({
        chain_id: selectedRunOption.chainId,
        topic: runTopic,
        course_id: courseId,
        source_doc_ids: selectedMaterials,
        options: {
          write_obsidian: false,
          draft_cards: false,
        },
      });
      setDisplayedRun({
        key: `chain:${selectedRunOption.chainId}:${result.run_id}`,
        label: result.chain_name,
        kind: "chain",
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
              Loaded materials come from Source Shelf and Workspace. Pick one method or one chain, then run extraction here.
            </p>
          </div>
          {selectedRunOption ? (
            <Badge
              variant="outline"
              className="rounded-full border-[rgba(255,118,144,0.18)] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[#ffb9c7]"
            >
              {selectedRunOption.kind === "method" ? "Method" : "Chain"}
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

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <label className="block">
              <div className="text-[10px] uppercase tracking-[0.18em] text-[#ffb9c7]/76">
                Method / Chain
              </div>
              <select
                aria-label="Priming method or chain"
                data-testid="priming-run-selector"
                value={selectionValue}
                onChange={(event) => handleSelectionChange(event.target.value)}
                disabled={primeMethodsLoading || templateChainsLoading}
                className="mt-2 h-11 w-full rounded-[0.85rem] border border-[rgba(255,118,144,0.18)] bg-black/30 px-3 text-sm text-white outline-none"
              >
                <option value="">
                  {primeMethodsLoading ? "Loading methods..." : "Select a method or chain"}
                </option>
                <optgroup label="— Methods —">
                  {primeMethods.map((method) =>
                    method.method_id ? (
                      <option key={method.id} value={`method:${method.method_id}`}>
                        {method.name}
                      </option>
                    ) : null,
                  )}
                </optgroup>
                <optgroup label="— Chains —">
                  {templateChains.map((chain) => (
                    <option key={chain.id} value={`chain:${chain.id}`}>
                      {chain.name || `Chain #${chain.id}`}
                    </option>
                  ))}
                </optgroup>
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

          {selectedRunOption ? (
            <div className="rounded-[0.75rem] border border-[rgba(255,118,144,0.14)] bg-black/15 px-3 py-2 text-sm leading-6 text-[#ffd9e1]/66">
              {selectedRunOption.helperText}
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
              {displayedRun.kind === "method" ? "Method Result" : "Chain Result"}
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

      <section className="rounded-[0.95rem] border border-[rgba(255,118,144,0.16)] bg-black/20 p-4">
        <div className="text-[10px] uppercase tracking-[0.18em] text-[#ffb9c7]">
          Priming Chat
        </div>
        <p className="mt-1 text-sm leading-6 text-[#ffd9e1]/70">
          Phase 2 will add chat-based refinement on top of these extraction results.
        </p>
        <input
          type="text"
          disabled
          placeholder="Chat with priming results coming soon"
          className="mt-3 h-11 w-full rounded-[0.85rem] border border-[rgba(255,118,144,0.14)] bg-black/25 px-3 text-sm text-[#ffd9e1]/48 outline-none placeholder:text-[#ffd9e1]/38"
        />
      </section>
    </div>
  );
}
