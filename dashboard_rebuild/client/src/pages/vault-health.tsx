import { useMemo, useReducer, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  FileWarning,
  FolderOpen,
  Info,
  Link2,
  Loader2,
  Shield,
  Sparkles,
  Wrench,
  Zap,
} from "lucide-react";

import { PageScaffold } from "@/components/PageScaffold";
import { SupportWorkspaceFrame } from "@/components/SupportWorkspaceFrame";
import { api } from "@/lib/api";
import type {
  AiFieldSuggestion,
  AiResolveResponse,
  BatchEnrichResponse,
  JanitorIssue,
  JanitorNoteSummary,
  JanitorOptions,
  JanitorScanResponse,
} from "@/api";
import { cn } from "@/lib/utils";
import { useToast } from "@/use-toast";

const ISSUE_CONFIG: Record<string, { label: string; Icon: typeof AlertTriangle; color: string }> = {
  missing_frontmatter: { label: "Metadata", Icon: FileWarning, color: "text-yellow-300" },
  broken_link: { label: "Missing Link Target", Icon: Link2, color: "text-red-300" },
  orphan: { label: "Unlinked Note", Icon: FolderOpen, color: "text-info" },
  routing_drift: { label: "Routing Drift", Icon: AlertTriangle, color: "text-orange-300" },
  casing_mismatch: { label: "Casing Drift", Icon: AlertTriangle, color: "text-orange-300" },
  duplicate: { label: "Duplicate Content", Icon: AlertTriangle, color: "text-warning" },
};

const ISSUE_CLASS_COPY: Record<string, { label: string; className: string }> = {
  real_breakage: { label: "Real breakage", className: "border-red-400/40 text-red-300" },
  content_gap: { label: "Content gap", className: "border-info/40 text-info" },
  routing_drift: { label: "Routing drift", className: "border-orange-400/40 text-orange-300" },
  "advisory/system": { label: "Advisory / system", className: "border-primary/30 text-primary/80" },
};

const SEVERITY_CLASS: Record<string, string> = {
  high: "border-red-400/40 text-red-300",
  medium: "border-yellow-400/40 text-yellow-300",
  low: "border-primary/30 text-primary/70",
};

const CONFIDENCE_CLASS: Record<string, string> = {
  high: "border-green-400/40 text-green-300",
  medium: "border-yellow-400/40 text-yellow-300",
  low: "border-red-400/40 text-red-300",
};

const FIELD_OPTIONS_KEY: Record<string, keyof JanitorOptions> = {
  course: "course",
  course_name: "course_name",
  course_code: "course_code",
  module_name: "module_name",
  unit_type: "unit_type",
  note_type: "note_type",
};

function getOptionsForField(field: string, options: JanitorOptions | undefined): { label: string; value: string }[] {
  if (!options) return [];
  if (field === "course_code") {
    return Object.entries(options.course_code).map(([courseName, code]) => ({
      label: `${courseName} (${code})`,
      value: code,
    }));
  }
  const key = FIELD_OPTIONS_KEY[field];
  if (!key) return [];
  const value = options[key];
  return Array.isArray(value) ? value.map((item) => ({ label: item, value: item })) : [];
}

function StatCard({ label, value, tone = "default" }: { label: string; value: number | string; tone?: "default" | "warn" | "danger" | "info" }) {
  const toneClass =
    tone === "danger"
      ? "border-red-400/30 text-red-300"
      : tone === "warn"
        ? "border-yellow-400/30 text-yellow-300"
        : tone === "info"
          ? "border-cyan-400/30 text-cyan-300"
          : "border-primary/30 text-primary";

  return (
    <div className={cn("border-2 bg-black/30 p-3 font-terminal", toneClass)}>
      <div className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">{label}</div>
      <div className="mt-2 font-arcade text-lg">{value}</div>
    </div>
  );
}

function ManualFixPanel({
  issue,
  options,
  applying,
  onApply,
  onCancel,
}: {
  issue: JanitorIssue;
  options: JanitorOptions | undefined;
  applying: boolean;
  onApply: (issue: JanitorIssue) => void;
  onCancel: () => void;
}) {
  const choices = getOptionsForField(issue.field, options);
  const [value, setValue] = useState("");

  function handleApply() {
    if (!value.trim()) return;
    onApply({
      ...issue,
      fixable: true,
      fix_data: {
        ...issue.fix_data,
        [issue.field]: value.trim(),
      },
    });
  }

  return (
    <div className="mt-3 border border-primary/20 bg-black/40 p-3 font-terminal text-xs">
      <div className="mb-2 text-primary">Manual fix for `{issue.field}`</div>
      {choices.length > 0 ? (
        <select
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="w-full border border-primary/30 bg-background px-2 py-2 text-foreground"
        >
          <option value="">Select a value</option>
          {choices.map((choice) => (
            <option key={choice.value} value={choice.value}>
              {choice.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Enter a replacement value"
          className="w-full border border-primary/30 bg-background px-2 py-2 text-foreground"
        />
      )}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={handleApply}
          disabled={applying || !value.trim()}
          className="border border-green-400/40 px-3 py-1 text-green-300 hover:bg-green-400/10 disabled:opacity-50"
        >
          {applying ? <Loader2 className="mr-1 inline h-3 w-3 animate-spin" /> : <Wrench className="mr-1 inline h-3 w-3" />}
          Apply
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="border border-primary/20 px-3 py-1 text-muted-foreground hover:bg-primary/5"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function AiSuggestionPanel({
  path,
  data,
  options,
  applying,
  onApply,
  onCancel,
}: {
  path: string;
  data: AiResolveResponse;
  options: JanitorOptions | undefined;
  applying: boolean;
  onApply: (path: string, applyAction: string, suggestion: Record<string, AiFieldSuggestion>) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(Object.entries(data.suggestion).map(([field, suggestion]) => [field, suggestion.value])),
  );

  function handleApply() {
    const suggestion: Record<string, AiFieldSuggestion> = {};
    for (const [field, fieldData] of Object.entries(data.suggestion)) {
      suggestion[field] = {
        value: draft[field] ?? fieldData.value,
        confidence: fieldData.confidence,
      };
    }
    onApply(path, data.apply_action, suggestion);
  }

  return (
    <div className="border-2 border-info/40 bg-black/40 p-4 font-terminal text-xs">
      <div className="flex items-center justify-between gap-3">
        <div className="font-arcade text-info">AI fix proposal</div>
        <button type="button" onClick={onCancel} className="text-muted-foreground hover:text-primary">
          Close
        </button>
      </div>
      <div className="mt-2 text-muted-foreground">{data.reasoning}</div>
      <div className="mt-4 space-y-3">
        {Object.entries(data.suggestion).map(([field, suggestion]) => {
          const choices = getOptionsForField(field, options);
          return (
            <div key={field} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-primary">{field}</span>
                <span className={cn("border px-2 py-0.5 text-[10px] uppercase", CONFIDENCE_CLASS[suggestion.confidence] ?? CONFIDENCE_CLASS.low)}>
                  {suggestion.confidence}
                </span>
              </div>
              {choices.length > 0 ? (
                <select
                  value={draft[field] ?? suggestion.value}
                  onChange={(event) => setDraft((current) => ({ ...current, [field]: event.target.value }))}
                  className="w-full border border-primary/30 bg-background px-2 py-2 text-foreground"
                >
                  {[draft[field] ?? suggestion.value, ...choices.map((choice) => choice.value)]
                    .filter((value, index, items) => items.indexOf(value) === index)
                    .map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                </select>
              ) : (
                <input
                  value={draft[field] ?? suggestion.value}
                  onChange={(event) => setDraft((current) => ({ ...current, [field]: event.target.value }))}
                  className="w-full border border-primary/30 bg-background px-2 py-2 text-foreground"
                />
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={handleApply}
          disabled={applying}
          className="border border-info/40 px-3 py-1 text-info hover:bg-info/10 disabled:opacity-50"
        >
          {applying ? <Loader2 className="mr-1 inline h-3 w-3 animate-spin" /> : <Sparkles className="mr-1 inline h-3 w-3" />}
          Apply AI fix
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="border border-primary/20 px-3 py-1 text-muted-foreground hover:bg-primary/5"
        >
          Reject
        </button>
      </div>
    </div>
  );
}

function IssueLine({
  issue,
  options,
  onFix,
  onManualFix,
  onAiFix,
  onEnrich,
  fixing,
  enriching,
  aiFixing,
  manualFixOpen,
  onApplyManual,
  onCancelManual,
}: {
  issue: JanitorIssue;
  options: JanitorOptions | undefined;
  onFix: (issue: JanitorIssue) => void;
  onManualFix: (issue: JanitorIssue) => void;
  onAiFix: (issue: JanitorIssue) => void;
  onEnrich: (path: string) => void;
  fixing: boolean;
  enriching: boolean;
  aiFixing: boolean;
  manualFixOpen: boolean;
  onApplyManual: (issue: JanitorIssue) => void;
  onCancelManual: () => void;
}) {
  const issueConfig = ISSUE_CONFIG[issue.issue_type] ?? ISSUE_CONFIG.routing_drift;
  const canDeterministicallyFix = issue.issue_type === "missing_frontmatter";
  const canAiFix = issue.issue_type === "missing_frontmatter" || issue.issue_type === "broken_link" || issue.issue_type === "orphan";

  return (
    <div className="border border-primary/10 bg-black/20 p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <issueConfig.Icon className={cn("h-3.5 w-3.5", issueConfig.color)} />
            <span className={cn("font-arcade text-[11px] uppercase", issueConfig.color)}>{issueConfig.label}</span>
            <span className={cn("border px-2 py-0.5 text-[10px] uppercase", ISSUE_CLASS_COPY[issue.issue_class]?.className ?? ISSUE_CLASS_COPY["advisory/system"].className)}>
              {ISSUE_CLASS_COPY[issue.issue_class]?.label ?? issue.issue_class}
            </span>
            <span className={cn("border px-2 py-0.5 text-[10px] uppercase", SEVERITY_CLASS[issue.severity] ?? SEVERITY_CLASS.low)}>
              {issue.severity}
            </span>
            <span className={cn("border px-2 py-0.5 text-[10px] uppercase", CONFIDENCE_CLASS[issue.confidence] ?? CONFIDENCE_CLASS.low)}>
              confidence {issue.confidence}
            </span>
          </div>
          <div className="font-terminal text-xs text-foreground">{issue.detail}</div>
          <div className="text-xs text-muted-foreground">{issue.explanation}</div>
          {issue.fix_preview ? (
            <div className="border border-green-400/20 bg-green-400/5 px-2 py-1 text-xs text-green-300">
              Deterministic fix preview: {issue.fix_preview}
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {canDeterministicallyFix ? (
            <button
              type="button"
              onClick={() => (issue.fixable ? onFix(issue) : onManualFix(issue))}
              disabled={fixing}
              className="border border-green-400/40 px-3 py-1 font-arcade text-[11px] text-green-300 hover:bg-green-400/10 disabled:opacity-50"
            >
              {fixing ? <Loader2 className="mr-1 inline h-3 w-3 animate-spin" /> : <Wrench className="mr-1 inline h-3 w-3" />}
              Fix
            </button>
          ) : null}
          {issue.issue_type === "orphan" ? (
            <button
              type="button"
              onClick={() => onEnrich(issue.path)}
              disabled={enriching}
              className="border border-info/40 px-3 py-1 font-arcade text-[11px] text-info hover:bg-info/10 disabled:opacity-50"
            >
              {enriching ? <Loader2 className="mr-1 inline h-3 w-3 animate-spin" /> : <Zap className="mr-1 inline h-3 w-3" />}
              Enrich
            </button>
          ) : null}
          {canAiFix ? (
            <button
              type="button"
              onClick={() => onAiFix(issue)}
              disabled={aiFixing}
              className="border border-info/40 px-3 py-1 font-arcade text-[11px] text-info hover:bg-info/10 disabled:opacity-50"
            >
              {aiFixing ? <Loader2 className="mr-1 inline h-3 w-3 animate-spin" /> : <Sparkles className="mr-1 inline h-3 w-3" />}
              AI Fix
            </button>
          ) : null}
        </div>
      </div>
      {manualFixOpen ? (
        <ManualFixPanel
          issue={issue}
          options={options}
          applying={fixing}
          onApply={onApplyManual}
          onCancel={onCancelManual}
        />
      ) : null}
    </div>
  );
}

function NoteGroup({
  note,
  issues,
  options,
  onFix,
  onManualFix,
  onAiFix,
  onEnrich,
  fixingKeys,
  enrichingPaths,
  aiFixingPaths,
  manualFixKey,
  onApplyManual,
  onCancelManual,
}: {
  note: JanitorNoteSummary;
  issues: JanitorIssue[];
  options: JanitorOptions | undefined;
  onFix: (issue: JanitorIssue) => void;
  onManualFix: (issue: JanitorIssue) => void;
  onAiFix: (issue: JanitorIssue) => void;
  onEnrich: (path: string) => void;
  fixingKeys: Set<string>;
  enrichingPaths: Set<string>;
  aiFixingPaths: Set<string>;
  manualFixKey: string | null;
  onApplyManual: (issue: JanitorIssue) => void;
  onCancelManual: () => void;
}) {
  const [open, setOpen] = useState(true);
  const noteTone = note.counts_toward_health ? "border-primary/20" : "border-primary/10 opacity-90";

  return (
    <div className={cn("border-2 bg-black/25", noteTone)}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="min-w-0 space-y-1">
          <div className="truncate font-arcade text-xs text-primary">{note.path}</div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <span>{note.family.replace(/_/g, " ")}</span>
            <span className={cn("border px-2 py-0.5 uppercase", SEVERITY_CLASS[note.severity] ?? SEVERITY_CLASS.low)}>
              {note.severity}
            </span>
            {note.issue_classes.map((issueClass) => (
              <span
                key={issueClass}
                className={cn("border px-2 py-0.5 uppercase", ISSUE_CLASS_COPY[issueClass]?.className ?? ISSUE_CLASS_COPY["advisory/system"].className)}
              >
                {ISSUE_CLASS_COPY[issueClass]?.label ?? issueClass}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <div className="font-arcade text-sm text-primary">{note.issue_count}</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">issues</div>
          </div>
          {open ? <ChevronDown className="h-4 w-4 text-primary" /> : <ChevronRight className="h-4 w-4 text-primary" />}
        </div>
      </button>
      {open ? (
        <div className="space-y-3 border-t border-primary/10 px-4 py-4">
          {issues.map((issue, index) => {
            const issueKey = `${issue.path}:${issue.field || issue.issue_type}:${index}`;
            return (
              <IssueLine
                key={issueKey}
                issue={issue}
                options={options}
                onFix={onFix}
                onManualFix={onManualFix}
                onAiFix={onAiFix}
                onEnrich={onEnrich}
                fixing={fixingKeys.has(issueKey)}
                enriching={enrichingPaths.has(issue.path)}
                aiFixing={aiFixingPaths.has(issue.path)}
                manualFixOpen={manualFixKey === issueKey}
                onApplyManual={onApplyManual}
                onCancelManual={onCancelManual}
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

type VaultHealthConfigQuery = {
  data?: Awaited<ReturnType<typeof api.obsidian.getConfig>>;
};

function VaultHealthOverviewPanels({
  familyCounts,
  issueClassCounts,
  issueTypeCounts,
  obsidianConfigQuery,
  scanData,
}: {
  familyCounts: Array<[string, number]>;
  issueClassCounts: Array<[string, number]>;
  issueTypeCounts: Array<[string, number]>;
  obsidianConfigQuery: VaultHealthConfigQuery;
  scanData: JanitorScanResponse | undefined;
}) {
  return (
    <>
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Markdown files" value={scanData?.total_markdown_files ?? 0} />
        <StatCard label="Health-scanned notes" value={scanData?.notes_scanned ?? 0} />
        <StatCard
          label="Excluded system files"
          value={scanData?.excluded_system_files ?? 0}
          tone="info"
        />
        <StatCard
          label="Advisory-only notes"
          value={scanData?.advisory_only_files ?? 0}
          tone="info"
        />
        <StatCard label="Affected notes" value={scanData?.affected_notes ?? 0} tone="warn" />
        <StatCard
          label="Issue instances"
          value={scanData?.issue_instances ?? 0}
          tone="danger"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="border-2 border-primary/20 bg-black/25 p-4">
          <div className="mb-3 flex items-center gap-2 font-arcade text-xs text-primary">
            <Info className="h-4 w-4" />
            How this works
          </div>
          <div className="grid gap-3 md:grid-cols-2 font-terminal text-xs text-muted-foreground">
            <div className="border border-primary/10 bg-black/20 p-3">
              <div className="font-arcade text-[11px] text-primary">Full Scan</div>
              Checks live note files against metadata, routing, duplicate body
              content, and unresolved wikilinks.
            </div>
            <div className="border border-primary/10 bg-black/20 p-3">
              <div className="font-arcade text-[11px] text-info">Batch Enrich</div>
              Adds links only to low-link notes. It does not rewrite the whole vault
              or fix routing.
            </div>
            <div className="border border-primary/10 bg-black/20 p-3">
              <div className="font-arcade text-[11px] text-green-300">Fix</div>
              Applies a deterministic change when the backend already knows the
              exact patch.
            </div>
            <div className="border border-primary/10 bg-black/20 p-3">
              <div className="font-arcade text-[11px] text-info">AI Fix</div>
              Produces a proposed repair for review. Nothing is applied until you
              accept it.
            </div>
          </div>
        </div>

        <div className="border-2 border-primary/20 bg-black/25 p-4">
          <div className="mb-3 font-arcade text-xs text-primary">Scan breakdown</div>
          <div className="space-y-2">
            {issueTypeCounts.length === 0 ? (
              <div className="font-terminal text-xs text-muted-foreground">
                No issue counts available yet.
              </div>
            ) : (
              issueTypeCounts.map(([type, count]) => {
                const config = ISSUE_CONFIG[type] ?? ISSUE_CONFIG.routing_drift;
                return (
                  <div
                    key={type}
                    className="flex items-center justify-between border border-primary/10 px-3 py-2 font-terminal text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <config.Icon className={cn("h-3.5 w-3.5", config.color)} />
                      <span>{config.label}</span>
                    </div>
                    <span className="font-arcade text-primary">{count}</span>
                  </div>
                );
              })
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {issueClassCounts.map(([issueClass, count]) => (
              <span
                key={issueClass}
                className={cn(
                  "border px-2 py-1 font-terminal text-[11px] uppercase",
                  ISSUE_CLASS_COPY[issueClass]?.className ??
                    ISSUE_CLASS_COPY["advisory/system"].className,
                )}
              >
                {ISSUE_CLASS_COPY[issueClass]?.label ?? issueClass}: {count}
              </span>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {familyCounts.map(([family, count]) => (
              <span
                key={family}
                className="border border-primary/15 px-2 py-1 font-terminal text-[11px] uppercase text-primary/80"
              >
                {family.replace(/_/g, " ")}: {count}
              </span>
            ))}
          </div>
          <div className="mt-4 font-terminal text-[11px] text-muted-foreground">
            Scan time: {scanData?.scan_time_ms ?? 0} ms
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="border-2 border-primary/20 bg-black/25 p-4">
          <div className="mb-3 font-arcade text-xs text-primary">Vault contract</div>
          <div className="grid gap-3 md:grid-cols-2 font-terminal text-xs text-muted-foreground">
            <div className="border border-primary/10 bg-black/20 p-3">
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Canonical root
              </div>
              <div className="mt-2 font-arcade text-sm text-primary">
                {obsidianConfigQuery.data?.canonicalRoot ?? "Not reported"}
              </div>
            </div>
            <div className="border border-primary/10 bg-black/20 p-3">
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Deprecated roots
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(obsidianConfigQuery.data?.deprecatedRoots ?? []).length > 0 ? (
                  (obsidianConfigQuery.data?.deprecatedRoots ?? []).map((root) => (
                    <span
                      key={root}
                      className="border border-yellow-400/30 px-2 py-1 text-[11px] text-yellow-300"
                    >
                      {root}
                    </span>
                  ))
                ) : (
                  <span className="text-muted-foreground">None reported</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="border-2 border-primary/20 bg-black/25 p-4">
          <div className="mb-3 font-arcade text-xs text-primary">Reading the results</div>
          <div className="space-y-2 font-terminal text-xs text-muted-foreground">
            <div className="border border-red-400/15 bg-red-400/5 p-3">
              <span className="font-arcade text-[11px] text-red-300">Real breakage</span>
              <div className="mt-1">
                Counts toward health and should be fixed because a note, route, or
                link target is actually broken.
              </div>
            </div>
            <div className="border border-info/15 bg-info/5 p-3">
              <span className="font-arcade text-[11px] text-info">Content gap</span>
              <div className="mt-1">
                The vault structure is valid, but a reusable concept or target note
                is still missing.
              </div>
            </div>
            <div className="border border-primary/10 bg-black/20 p-3">
              <span className="font-arcade text-[11px] text-primary/80">
                Advisory / system
              </span>
              <div className="mt-1">
                These are templates, system docs, or warnings that do not count
                against the main health score.
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function VaultHealthScanResults({
  aiFixingPaths,
  batchResult,
  enrichingPaths,
  fixingKeys,
  handleAiFix,
  handleApplyAi,
  handleEnrich,
  handleFix,
  issuesByPath,
  manualFixKey,
  onCancelManualFix,
  onCloseAiModal,
  onOpenManualFix,
  options,
  scanData,
  scanQuery,
  aiApplying,
  aiModal,
}: {
  aiApplying: boolean;
  aiFixingPaths: Set<string>;
  batchResult: BatchEnrichResponse | null;
  enrichingPaths: Set<string>;
  fixingKeys: Set<string>;
  handleAiFix: (issue: JanitorIssue) => Promise<void>;
  handleApplyAi: (
    path: string,
    applyAction: string,
    suggestion: Record<string, AiFieldSuggestion>,
  ) => Promise<void>;
  handleEnrich: (path: string) => Promise<void>;
  handleFix: (issue: JanitorIssue, issueKey: string) => Promise<void>;
  issuesByPath: Map<string, JanitorIssue[]>;
  manualFixKey: string | null;
  onCancelManualFix: () => void;
  onCloseAiModal: () => void;
  onOpenManualFix: (issueKey: string) => void;
  options: JanitorOptions | undefined;
  scanData: JanitorScanResponse | undefined;
  scanQuery: ReturnType<typeof useQuery>;
  aiModal: { path: string; data: AiResolveResponse } | null;
}) {
  return (
    <>
      {batchResult ? (
        <div className="border-2 border-info/30 bg-info/5 p-4">
          <div className="font-arcade text-xs text-info">Last batch enrich run</div>
          <div className="mt-2 font-terminal text-xs text-muted-foreground">
            {batchResult.total_processed} notes processed, {batchResult.total_links_added}{" "}
            links added.
          </div>
          <div className="mt-3 space-y-2">
            {batchResult.results.map((result) => (
              <div
                key={result.path}
                className="border border-info/15 px-3 py-2 font-terminal text-xs"
              >
                <div className="text-info-foreground">{result.path}</div>
                <div className="text-muted-foreground">{result.selection_reason}</div>
                {result.error ? (
                  <div className="text-red-300">{result.error}</div>
                ) : (
                  <div className="text-green-300">{result.links_added} links added</div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {scanQuery.isLoading ? (
        <div className="border-2 border-primary/20 bg-black/25 p-6 text-center font-terminal text-sm text-muted-foreground">
          <Loader2 className="mr-2 inline h-4 w-4 animate-spin text-primary" />
          Running vault scan...
        </div>
      ) : scanQuery.error ? (
        <div className="border-2 border-red-400/30 bg-red-400/5 p-4 font-terminal text-xs text-red-300">
          Failed to load Vault Health: {(scanQuery.error as Error).message}
        </div>
      ) : (
        <div className="space-y-4">
          {(scanData?.note_summaries ?? []).map((note) => {
            const noteIssues = issuesByPath.get(note.path) ?? [];
            return (
              <NoteGroup
                key={note.path}
                note={note}
                issues={noteIssues}
                options={options}
                onFix={(issue) =>
                  void handleFix(
                    issue,
                    `${issue.path}:${issue.field || issue.issue_type}:${noteIssues.indexOf(issue)}`,
                  )
                }
                onManualFix={(issue) =>
                  onOpenManualFix(
                    `${issue.path}:${issue.field || issue.issue_type}:${noteIssues.indexOf(issue)}`,
                  )
                }
                onAiFix={(issue) => void handleAiFix(issue)}
                onEnrich={(path) => void handleEnrich(path)}
                fixingKeys={fixingKeys}
                enrichingPaths={enrichingPaths}
                aiFixingPaths={aiFixingPaths}
                manualFixKey={manualFixKey}
                onApplyManual={(issue) =>
                  void handleFix(issue, manualFixKey ?? `${issue.path}:${issue.field}`)
                }
                onCancelManual={onCancelManualFix}
              />
            );
          })}
          {(scanData?.note_summaries?.length ?? 0) === 0 ? (
            <div className="border-2 border-green-400/20 bg-green-400/5 p-5 font-terminal text-sm text-green-300">
              No note-level issues are currently being reported by the janitor.
            </div>
          ) : null}
        </div>
      )}

      {aiModal ? (
        <AiSuggestionPanel
          path={aiModal.path}
          data={aiModal.data}
          options={options}
          applying={aiApplying}
          onApply={(path, applyAction, suggestion) =>
            void handleApplyAi(path, applyAction, suggestion)
          }
          onCancel={onCloseAiModal}
        />
      ) : null}
    </>
  );
}

function VaultHealthBody({
  aiApplying,
  aiModal,
  aiFixingPaths,
  batchResult,
  enrichingPaths,
  familyCounts,
  fixingKeys,
  handleAiFix,
  handleApplyAi,
  handleBatchEnrich,
  handleEnrich,
  handleFix,
  issueClassCounts,
  issueTypeCounts,
  issuesByPath,
  manualFixKey,
  obsidianConfigQuery,
  onCancelManualFix,
  onCloseAiModal,
  onOpenManualFix,
  options,
  scanData,
  scanQuery,
}: {
  aiApplying: boolean;
  aiModal: { path: string; data: AiResolveResponse } | null;
  aiFixingPaths: Set<string>;
  batchResult: BatchEnrichResponse | null;
  enrichingPaths: Set<string>;
  familyCounts: Array<[string, number]>;
  fixingKeys: Set<string>;
  handleAiFix: (issue: JanitorIssue) => Promise<void>;
  handleApplyAi: (
    path: string,
    applyAction: string,
    suggestion: Record<string, AiFieldSuggestion>,
  ) => Promise<void>;
  handleBatchEnrich: () => Promise<void>;
  handleEnrich: (path: string) => Promise<void>;
  handleFix: (issue: JanitorIssue, issueKey: string) => Promise<void>;
  issueClassCounts: Array<[string, number]>;
  issueTypeCounts: Array<[string, number]>;
  issuesByPath: Map<string, JanitorIssue[]>;
  manualFixKey: string | null;
  obsidianConfigQuery: {
    data?: Awaited<ReturnType<typeof api.obsidian.getConfig>>;
  };
  onCancelManualFix: () => void;
  onCloseAiModal: () => void;
  onOpenManualFix: (issueKey: string) => void;
  options: JanitorOptions | undefined;
  scanData: JanitorScanResponse | undefined;
  scanQuery: ReturnType<typeof useQuery>;
}) {
  return (
    <>
      <VaultHealthOverviewPanels
        familyCounts={familyCounts}
        issueClassCounts={issueClassCounts}
        issueTypeCounts={issueTypeCounts}
        obsidianConfigQuery={obsidianConfigQuery}
        scanData={scanData}
      />
      <VaultHealthScanResults
        aiApplying={aiApplying}
        aiFixingPaths={aiFixingPaths}
        aiModal={aiModal}
        batchResult={batchResult}
        enrichingPaths={enrichingPaths}
        fixingKeys={fixingKeys}
        handleAiFix={handleAiFix}
        handleApplyAi={handleApplyAi}
        handleEnrich={handleEnrich}
        handleFix={handleFix}
        issuesByPath={issuesByPath}
        manualFixKey={manualFixKey}
        onCancelManualFix={onCancelManualFix}
        onCloseAiModal={onCloseAiModal}
        onOpenManualFix={onOpenManualFix}
        options={options}
        scanData={scanData}
        scanQuery={scanQuery}
      />
    </>
  );
}

type VaultHealthState = {
  manualFixKey: string | null;
  fixingKeys: Set<string>;
  enrichingPaths: Set<string>;
  aiFixingPaths: Set<string>;
  batchResult: BatchEnrichResponse | null;
  aiModal: { path: string; data: AiResolveResponse } | null;
  aiApplying: boolean;
};

type VaultHealthPatch =
  | Partial<VaultHealthState>
  | ((state: VaultHealthState) => Partial<VaultHealthState>);

function createVaultHealthState(): VaultHealthState {
  return {
    manualFixKey: null,
    fixingKeys: new Set(),
    enrichingPaths: new Set(),
    aiFixingPaths: new Set(),
    batchResult: null,
    aiModal: null,
    aiApplying: false,
  };
}

function vaultHealthReducer(state: VaultHealthState, patch: VaultHealthPatch): VaultHealthState {
  const nextPatch = typeof patch === "function" ? patch(state) : patch;
  return { ...state, ...nextPatch };
}

export default function VaultHealth() {
  const { toast } = useToast();
  const [vaultHealthState, patchVaultHealthState] = useReducer(
    vaultHealthReducer,
    undefined,
    createVaultHealthState,
  );
  const { manualFixKey, fixingKeys, enrichingPaths, aiFixingPaths, batchResult, aiModal, aiApplying } =
    vaultHealthState;

  const optionsQuery = useQuery({
    queryKey: ["janitor-options"],
    queryFn: api.janitor.getOptions,
    staleTime: 5 * 60_000,
  });

  const obsidianConfigQuery = useQuery({
    queryKey: ["obsidian-config"],
    queryFn: api.obsidian.getConfig,
    staleTime: 5 * 60_000,
  });

  const scanQuery = useQuery({
    queryKey: ["janitor-scan"],
    queryFn: () => api.janitor.scan(),
    refetchOnWindowFocus: false,
  });

  const issuesByPath = useMemo(() => {
    const grouped = new Map<string, JanitorIssue[]>();
    for (const issue of scanQuery.data?.issues ?? []) {
      const bucket = grouped.get(issue.path) ?? [];
      bucket.push(issue);
      grouped.set(issue.path, bucket);
    }
    return grouped;
  }, [scanQuery.data?.issues]);

  async function handleFix(issue: JanitorIssue, issueKey: string) {
    patchVaultHealthState((current) => ({ fixingKeys: new Set(current.fixingKeys).add(issueKey) }));
    try {
      const result = await api.janitor.fix([issue]);
      const fixResult = result.results[0];
      if (!fixResult?.success) throw new Error(fixResult?.detail || "Fix failed");
      toast({ title: "Fix applied", description: fixResult.detail });
      patchVaultHealthState({ manualFixKey: null });
      await scanQuery.refetch();
    } catch (error) {
      toast({ title: "Fix failed", description: (error as Error).message, variant: "destructive" });
    } finally {
      patchVaultHealthState((current) => {
        const next = new Set(current.fixingKeys);
        next.delete(issueKey);
        return { fixingKeys: next };
      });
    }
  }

  async function handleAiFix(issue: JanitorIssue) {
    patchVaultHealthState((current) => ({ aiFixingPaths: new Set(current.aiFixingPaths).add(issue.path) }));
    try {
      const context = issue.issue_type === "broken_link" ? { broken_target: issue.field } : undefined;
      const result = await api.janitor.aiResolve(issue.path, issue.issue_type, context);
      if (!result.success) throw new Error(result.error || "AI fix failed");
      if (result.apply_action === "add_links") {
        await handleEnrich(issue.path);
        return;
      }
      patchVaultHealthState({ aiModal: { path: issue.path, data: result } });
    } catch (error) {
      toast({ title: "AI fix failed", description: (error as Error).message, variant: "destructive" });
    } finally {
      patchVaultHealthState((current) => {
        const next = new Set(current.aiFixingPaths);
        next.delete(issue.path);
        return { aiFixingPaths: next };
      });
    }
  }

  async function handleEnrich(path: string) {
    patchVaultHealthState((current) => ({ enrichingPaths: new Set(current.enrichingPaths).add(path) }));
    try {
      const result = await api.janitor.enrich(path);
      if (!result.success) throw new Error("Enrich failed");
      toast({ title: "Links added", description: `${result.links_added} links added to ${path.split("/").pop()}` });
      await scanQuery.refetch();
    } catch (error) {
      toast({ title: "Enrich failed", description: (error as Error).message, variant: "destructive" });
    } finally {
      patchVaultHealthState((current) => {
        const next = new Set(current.enrichingPaths);
        next.delete(path);
        return { enrichingPaths: next };
      });
    }
  }

  async function handleBatchEnrich() {
    try {
      const result = await api.janitor.batchEnrich({ max_batch: 20 });
      patchVaultHealthState({ batchResult: result });
      toast({ title: "Batch enrich complete", description: `${result.total_processed} notes processed, ${result.total_links_added} links added` });
      await scanQuery.refetch();
    } catch (error) {
      toast({ title: "Batch enrich failed", description: (error as Error).message, variant: "destructive" });
    }
  }

  async function handleApplyAi(path: string, applyAction: string, suggestion: Record<string, AiFieldSuggestion>) {
    patchVaultHealthState({ aiApplying: true });
    try {
      const result = await api.janitor.aiApply(path, applyAction, suggestion);
      if (!result.success) throw new Error(result.detail || "AI apply failed");
      toast({ title: "AI fix applied", description: result.detail });
      patchVaultHealthState({ aiModal: null });
      await scanQuery.refetch();
    } catch (error) {
      toast({ title: "AI fix failed", description: (error as Error).message, variant: "destructive" });
    } finally {
      patchVaultHealthState({ aiApplying: false });
    }
  }

  const scanData: JanitorScanResponse | undefined = scanQuery.data;
  const issueTypeCounts = Object.entries(scanData?.counts ?? {});
  const issueClassCounts = Object.entries(scanData?.issueClassCounts ?? {});
  const familyCounts = Object.entries(scanData?.familyCounts ?? {});
  const vaultSidebar = (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-auto p-3 md:p-4">
      <div className="space-y-2">
        <div className="font-arcade text-[11px] uppercase tracking-[0.24em] text-primary/80">
          Actions
        </div>
        <button
          type="button"
          onClick={() => scanQuery.refetch()}
          disabled={scanQuery.isFetching}
          className="min-h-[44px] rounded-[1rem] border border-primary/40 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02)_38%,rgba(0,0,0,0.22)_100%)] px-4 py-2 text-left font-arcade text-xs text-primary hover:-translate-y-0.5 hover:bg-primary/10 disabled:opacity-50"
        >
          {scanQuery.isFetching ? <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> : <Shield className="mr-2 inline h-4 w-4" />}
          FULL SCAN
        </button>
        <button
          type="button"
          onClick={handleBatchEnrich}
          className="min-h-[44px] rounded-[1rem] border border-info/50 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02)_38%,rgba(0,0,0,0.22)_100%)] px-4 py-2 text-left font-arcade text-xs text-info hover:-translate-y-0.5 hover:bg-info/10"
        >
          <Zap className="mr-2 inline h-4 w-4" />
          BATCH ENRICH
        </button>
      </div>

      <div className="space-y-3 rounded-[1rem] border border-primary/20 bg-black/20 p-3">
        <div className="font-arcade text-[11px] uppercase tracking-[0.24em] text-primary/80">
          Health Snapshot
        </div>
        <div className="grid gap-2">
          <div className="rounded-[0.95rem] border border-primary/15 bg-black/20 p-3">
            <div className="font-terminal text-[11px] uppercase tracking-wide text-muted-foreground">Affected notes</div>
            <div className="font-arcade text-lg text-white">{scanData?.affected_notes ?? 0}</div>
          </div>
          <div className="rounded-[0.95rem] border border-primary/15 bg-black/20 p-3">
            <div className="font-terminal text-[11px] uppercase tracking-wide text-muted-foreground">Issue instances</div>
            <div className="font-arcade text-lg text-white">{scanData?.issue_instances ?? 0}</div>
          </div>
          <div className="rounded-[0.95rem] border border-primary/15 bg-black/20 p-3">
            <div className="font-terminal text-[11px] uppercase tracking-wide text-muted-foreground">Scan time</div>
            <div className="font-arcade text-lg text-white">{scanData?.scan_time_ms ?? 0} ms</div>
          </div>
        </div>
      </div>

      <div className="space-y-2 rounded-[1rem] border border-primary/20 bg-black/20 p-3">
        <div className="font-arcade text-[11px] uppercase tracking-[0.24em] text-primary/80">
          Issue Classes
        </div>
        <div className="flex flex-wrap gap-2">
          {issueClassCounts.length > 0 ? issueClassCounts.map(([issueClass, count]) => (
            <span key={issueClass} className={cn("border px-2 py-1 font-terminal text-[11px] uppercase", ISSUE_CLASS_COPY[issueClass]?.className ?? ISSUE_CLASS_COPY["advisory/system"].className)}>
              {ISSUE_CLASS_COPY[issueClass]?.label ?? issueClass}: {count}
            </span>
          )) : (
            <span className="font-terminal text-xs text-muted-foreground">No issue classes reported yet.</span>
          )}
        </div>
      </div>

      <div className="space-y-2 rounded-[1rem] border border-primary/20 bg-black/20 p-3">
        <div className="font-arcade text-[11px] uppercase tracking-[0.24em] text-primary/80">
          Vault Contract
        </div>
        <div className="font-terminal text-xs text-muted-foreground">
          Canonical root: <span className="text-white">{obsidianConfigQuery.data?.canonicalRoot ?? "Not reported"}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {(obsidianConfigQuery.data?.deprecatedRoots ?? []).length > 0 ? (
            (obsidianConfigQuery.data?.deprecatedRoots ?? []).map((root) => (
              <span key={root} className="border border-yellow-400/30 px-2 py-1 text-[11px] text-yellow-300">
                {root}
              </span>
            ))
          ) : (
            <span className="font-terminal text-xs text-muted-foreground">No deprecated roots reported.</span>
          )}
        </div>
      </div>
    </div>
  );
  const vaultCommandBand = (
    <div className="flex flex-col gap-3 p-3 md:p-4">
      <div className="space-y-1">
        <div className="font-arcade text-xs text-primary">Vault Janitor Console</div>
        <div className="font-terminal text-sm text-muted-foreground">
          Monitor note health, repair deterministic metadata drift, and keep low-link notes enriched without rewriting the vault blindly.
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs font-terminal text-muted-foreground">
        <span className="rounded-full border border-primary/20 px-2 py-1">{scanData?.notes_scanned ?? 0} scanned</span>
        <span className="rounded-full border border-primary/20 px-2 py-1">{scanData?.affected_notes ?? 0} affected</span>
        <span className="rounded-full border border-primary/20 px-2 py-1">{scanData?.issue_instances ?? 0} issues</span>
        <span className="rounded-full border border-primary/20 px-2 py-1">{scanData?.advisory_only_files ?? 0} advisory</span>
      </div>
    </div>
  );

  return (
      <PageScaffold
        eyebrow="Brain Support System"
        title="Vault Health"
        subtitle="Monitor the live Obsidian contract, find routing or metadata drift fast, and repair underlinked notes without losing control of the support system."
        className="mx-auto max-w-6xl"
        contentClassName="space-y-6"
      >
        <SupportWorkspaceFrame
          sidebar={vaultSidebar}
          commandBand={vaultCommandBand}
          contentClassName="gap-4"
        >
          <VaultHealthBody
            aiApplying={aiApplying}
            aiModal={aiModal}
            aiFixingPaths={aiFixingPaths}
            batchResult={batchResult}
            enrichingPaths={enrichingPaths}
            familyCounts={familyCounts}
            fixingKeys={fixingKeys}
            handleAiFix={handleAiFix}
            handleApplyAi={handleApplyAi}
            handleBatchEnrich={handleBatchEnrich}
            handleEnrich={handleEnrich}
            handleFix={handleFix}
            issueClassCounts={issueClassCounts}
            issueTypeCounts={issueTypeCounts}
            issuesByPath={issuesByPath}
            manualFixKey={manualFixKey}
            obsidianConfigQuery={obsidianConfigQuery}
            onCancelManualFix={() => patchVaultHealthState({ manualFixKey: null })}
            onCloseAiModal={() => patchVaultHealthState({ aiModal: null })}
            onOpenManualFix={(issueKey) => patchVaultHealthState({ manualFixKey: issueKey })}
            options={optionsQuery.data}
            scanData={scanData}
            scanQuery={scanQuery}
          />
        </SupportWorkspaceFrame>
      </PageScaffold>
  );
}
