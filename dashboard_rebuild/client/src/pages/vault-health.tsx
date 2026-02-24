import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Shield, AlertTriangle, Link2, Copy, FolderOpen, FileWarning, Wrench, Sparkles, ChevronDown, ChevronRight, Loader2, X, Zap } from "lucide-react";
import Layout from "@/components/layout";
import { api } from "@/lib/api";
import type { JanitorIssue, JanitorHealthResponse, JanitorScanResponse, JanitorOptions, AiFieldSuggestion, AiResolveResponse } from "@/api";
import { cn } from "@/lib/utils";
import { useToast } from "@/use-toast";

const ISSUE_CONFIG: Record<string, { label: string; color: string; Icon: typeof AlertTriangle }> = {
  missing_frontmatter: { label: "MISSING FRONTMATTER", color: "text-yellow-400", Icon: FileWarning },
  orphan: { label: "ORPHAN NOTES", color: "text-blue-400", Icon: FolderOpen },
  broken_link: { label: "BROKEN LINKS", color: "text-red-400", Icon: Link2 },
  casing_mismatch: { label: "CASING CONFLICTS", color: "text-orange-400", Icon: AlertTriangle },
  duplicate: { label: "DUPLICATES", color: "text-purple-400", Icon: Copy },
};

/** Map frontmatter field names to the options key they draw from. */
const FIELD_OPTIONS_KEY: Record<string, keyof JanitorOptions> = {
  course: "course",
  course_code: "course_code",
  unit_type: "unit_type",
  note_type: "note_type",
};

const CONFIDENCE_STYLE: Record<string, { border: string; text: string; label: string }> = {
  high: { border: "border-green-400", text: "text-green-400", label: "HIGH" },
  medium: { border: "border-yellow-400", text: "text-yellow-400", label: "MED" },
  low: { border: "border-red-400", text: "text-red-400", label: "LOW" },
};

function getOptionsForField(field: string, options: JanitorOptions | undefined): { label: string; value: string }[] {
  if (!options) return [];
  if (field === "course_code") {
    return Object.entries(options.course_code).map(([course, code]) => ({
      label: `${course} (${code})`,
      value: code,
    }));
  }
  const key = FIELD_OPTIONS_KEY[field];
  if (!key) return [];
  const val = options[key];
  if (Array.isArray(val)) return val.map((v) => ({ label: v, value: v }));
  return [];
}

// ---------------------------------------------------------------------------
// ManualFixModal
// ---------------------------------------------------------------------------

function ManualFixModal({
  issue,
  options,
  onApply,
  onCancel,
  applying,
}: {
  issue: JanitorIssue;
  options: JanitorOptions | undefined;
  onApply: (issue: JanitorIssue) => void;
  onCancel: () => void;
  applying: boolean;
}) {
  const [value, setValue] = useState("");
  const choices = getOptionsForField(issue.field, options);

  function handleApply() {
    if (!value) return;
    const fixData: Record<string, string> = { ...issue.fix_data, [issue.field]: value };

    if (issue.field === "course" && options?.course_code[value]) {
      fixData.course_code = options.course_code[value];
    }

    onApply({ ...issue, fixable: true, fix_data: fixData });
  }

  return (
    <div className="border-2 border-primary bg-background p-3 mt-1 space-y-3 font-terminal text-xs">
      <div className="flex items-center justify-between">
        <span className="text-primary">
          Set <span className="font-arcade">{issue.field}</span>
        </span>
        <button type="button" onClick={onCancel} className="text-muted-foreground hover:text-primary">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <select
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full border-2 border-primary bg-background px-2 py-1.5 font-terminal text-xs text-foreground"
      >
        <option value="">-- select --</option>
        {choices.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="border border-muted-foreground/40 px-3 py-1 text-muted-foreground hover:bg-muted-foreground/10"
        >
          CANCEL
        </button>
        <button
          type="button"
          onClick={handleApply}
          disabled={!value || applying}
          className="border-2 border-green-400 px-3 py-1 text-green-400 hover:bg-green-400/10 disabled:opacity-50"
        >
          {applying ? <Loader2 className="w-3 h-3 animate-spin inline mr-1" /> : null}
          APPLY
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AiSuggestionModal
// ---------------------------------------------------------------------------

function AiSuggestionModal({
  path,
  data,
  options,
  onApply,
  onCancel,
  applying,
}: {
  path: string;
  data: AiResolveResponse;
  options: JanitorOptions | undefined;
  onApply: (path: string, applyAction: string, suggestion: Record<string, AiFieldSuggestion>) => void;
  onCancel: () => void;
  applying: boolean;
}) {
  const [edits, setEdits] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const [field, s] of Object.entries(data.suggestion)) {
      init[field] = s.value;
    }
    return init;
  });

  const uncertain = new Set(data.uncertain_fields || []);

  function handleApply() {
    const suggestion: Record<string, AiFieldSuggestion> = {};
    for (const [field, s] of Object.entries(data.suggestion)) {
      suggestion[field] = { value: edits[field] ?? s.value, confidence: s.confidence };
    }
    onApply(path, data.apply_action, suggestion);
  }

  return (
    <div className="border-2 border-violet-400 bg-background p-4 space-y-4 font-terminal text-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <span className="font-arcade text-violet-400 text-xs">AI SUGGESTION</span>
        </div>
        <button type="button" onClick={onCancel} className="text-muted-foreground hover:text-primary">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {data.reasoning && (
        <div className="text-muted-foreground italic">{data.reasoning}</div>
      )}

      <div className="space-y-2">
        {Object.entries(data.suggestion).map(([field, s]) => {
          const conf = CONFIDENCE_STYLE[s.confidence] || CONFIDENCE_STYLE.low;
          const choices = getOptionsForField(field, options);
          return (
            <div key={field} className="flex items-center gap-2">
              <span className="w-24 text-muted-foreground">{field}</span>
              <select
                value={edits[field] ?? s.value}
                onChange={(e) => setEdits((prev) => ({ ...prev, [field]: e.target.value }))}
                className="flex-1 border border-primary/30 bg-background px-2 py-1 font-terminal text-xs text-foreground"
              >
                <option value={edits[field] ?? s.value}>{edits[field] ?? s.value}</option>
                {choices
                  .filter((c) => c.value !== (edits[field] ?? s.value))
                  .map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
              </select>
              <span className={cn("border px-1.5 py-0.5 text-[10px] font-arcade", conf.border, conf.text)}>
                {conf.label}
              </span>
              {uncertain.has(field) && <span className="text-red-400">*</span>}
            </div>
          );
        })}
      </div>

      {uncertain.size > 0 && (
        <div className="text-red-400 text-[10px]">* LOW confidence — please verify</div>
      )}

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="border border-muted-foreground/40 px-3 py-1 text-muted-foreground hover:bg-muted-foreground/10"
        >
          REJECT
        </button>
        <button
          type="button"
          onClick={handleApply}
          disabled={applying}
          className="border-2 border-violet-400 px-3 py-1 text-violet-400 hover:bg-violet-400/10 disabled:opacity-50"
        >
          {applying ? <Loader2 className="w-3 h-3 animate-spin inline mr-1" /> : null}
          APPLY ALL
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function HealthBadge({ type, count }: { type: string; count: number }) {
  const cfg = ISSUE_CONFIG[type] || { label: type.toUpperCase(), color: "text-muted-foreground", Icon: AlertTriangle };
  const Icon = cfg.Icon;
  return (
    <div className={cn("flex items-center gap-2 border-2 border-primary/20 px-3 py-1.5 font-terminal text-xs", cfg.color)}>
      <Icon className="w-3.5 h-3.5" />
      <span>{cfg.label}</span>
      <span className="font-arcade text-sm">{count}</span>
    </div>
  );
}

function HealthSummaryBar({ data }: { data: JanitorHealthResponse }) {
  if (!data.available) {
    return (
      <div className="border-2 border-red-400/30 bg-red-400/5 p-4 font-terminal text-xs text-red-400">
        Obsidian API unavailable — start Obsidian with Local REST API plugin enabled.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between font-terminal text-xs text-muted-foreground">
        <span>{data.notes_scanned} notes scanned</span>
        <span>{data.scan_time_ms}ms</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {Object.entries(data.counts).map(([type, count]) => (
          <HealthBadge key={type} type={type} count={count} />
        ))}
        {data.total_issues === 0 && (
          <div className="font-terminal text-xs text-green-400">All clear — no issues found.</div>
        )}
      </div>
    </div>
  );
}

function IssueRow({
  issue,
  onFix,
  onManualFix,
  onEnrich,
  onAiFix,
  fixing,
  enriching,
  aiFixing,
  manualFixOpen,
  options,
  onApplyManual,
  onCancelManual,
}: {
  issue: JanitorIssue;
  onFix: () => void;
  onManualFix: () => void;
  onEnrich: () => void;
  onAiFix: () => void;
  fixing: boolean;
  enriching: boolean;
  aiFixing: boolean;
  manualFixOpen: boolean;
  options: JanitorOptions | undefined;
  onApplyManual: (issue: JanitorIssue) => void;
  onCancelManual: () => void;
}) {
  const cfg = ISSUE_CONFIG[issue.issue_type] || { color: "text-muted-foreground" };
  const isFrontmatter = issue.issue_type === "missing_frontmatter";
  const isOrphan = issue.issue_type === "orphan";
  const isBrokenLink = issue.issue_type === "broken_link";
  const showAiFix = isFrontmatter || isOrphan || isBrokenLink;

  return (
    <div>
      <div className="flex items-center justify-between gap-2 border border-primary/10 px-3 py-2 font-terminal text-xs">
        <div className="flex-1 min-w-0">
          <div className={cn("truncate", cfg.color)}>{issue.path}</div>
          <div className="text-muted-foreground truncate">{issue.detail}</div>
        </div>
        <div className="flex gap-1.5 shrink-0">
          {isFrontmatter && (
            <button
              type="button"
              onClick={issue.fixable ? onFix : onManualFix}
              disabled={fixing}
              className="flex items-center gap-1 border border-green-400/40 px-2 py-1 text-green-400 hover:bg-green-400/10 disabled:opacity-50"
            >
              {fixing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wrench className="w-3 h-3" />}
              FIX
            </button>
          )}
          {isOrphan && !showAiFix && (
            <button
              type="button"
              onClick={onEnrich}
              disabled={enriching}
              className="flex items-center gap-1 border border-cyan-400/40 px-2 py-1 text-cyan-400 hover:bg-cyan-400/10 disabled:opacity-50"
            >
              {enriching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              ENRICH
            </button>
          )}
          {showAiFix && (
            <button
              type="button"
              onClick={onAiFix}
              disabled={aiFixing}
              className="flex items-center gap-1 border border-violet-400/40 px-2 py-1 text-violet-400 hover:bg-violet-400/10 disabled:opacity-50"
            >
              {aiFixing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              AI FIX
            </button>
          )}
        </div>
      </div>
      {manualFixOpen && (
        <ManualFixModal
          issue={issue}
          options={options}
          onApply={onApplyManual}
          onCancel={onCancelManual}
          applying={fixing}
        />
      )}
    </div>
  );
}

function IssueGroup({
  type,
  issues,
  onFix,
  onManualFix,
  onEnrich,
  onAiFix,
  fixingPaths,
  enrichingPaths,
  aiFixingPaths,
  manualFixKey,
  options,
  onApplyManual,
  onCancelManual,
}: {
  type: string;
  issues: JanitorIssue[];
  onFix: (issue: JanitorIssue) => void;
  onManualFix: (issue: JanitorIssue) => void;
  onEnrich: (path: string) => void;
  onAiFix: (issue: JanitorIssue) => void;
  fixingPaths: Set<string>;
  enrichingPaths: Set<string>;
  aiFixingPaths: Set<string>;
  manualFixKey: string | null;
  options: JanitorOptions | undefined;
  onApplyManual: (issue: JanitorIssue) => void;
  onCancelManual: () => void;
}) {
  const [open, setOpen] = useState(true);
  const cfg = ISSUE_CONFIG[type] || { label: type.toUpperCase(), color: "text-muted-foreground", Icon: AlertTriangle };
  const Icon = cfg.Icon;

  return (
    <div className="border-2 border-primary/20">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "flex w-full items-center gap-2 px-3 py-2 font-arcade text-xs hover:bg-primary/5",
          cfg.color,
        )}
      >
        {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        <Icon className="w-3.5 h-3.5" />
        <span>{cfg.label}</span>
        <span className="ml-auto font-terminal text-muted-foreground">{issues.length}</span>
      </button>
      {open && (
        <div className="space-y-px border-t border-primary/10">
          {issues.map((issue, i) => {
            const key = `${issue.path}:${issue.field}`;
            return (
              <IssueRow
                key={`${key}-${i}`}
                issue={issue}
                onFix={() => onFix(issue)}
                onManualFix={() => onManualFix(issue)}
                onEnrich={() => onEnrich(issue.path)}
                onAiFix={() => onAiFix(issue)}
                fixing={fixingPaths.has(key)}
                enriching={enrichingPaths.has(issue.path)}
                aiFixing={aiFixingPaths.has(issue.path)}
                manualFixOpen={manualFixKey === key}
                options={options}
                onApplyManual={onApplyManual}
                onCancelManual={onCancelManual}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function VaultHealth() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [scanData, setScanData] = useState<JanitorScanResponse | null>(null);
  const [fixingPaths, setFixingPaths] = useState<Set<string>>(new Set());
  const [enrichingPaths, setEnrichingPaths] = useState<Set<string>>(new Set());
  const [aiFixingPaths, setAiFixingPaths] = useState<Set<string>>(new Set());
  const [manualFixKey, setManualFixKey] = useState<string | null>(null);
  const [aiModal, setAiModal] = useState<{ path: string; data: AiResolveResponse } | null>(null);
  const [aiApplying, setAiApplying] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ running: boolean; processed: number; total: number; linksAdded: number } | null>(null);

  const healthQuery = useQuery({
    queryKey: ["janitor-health"],
    queryFn: api.janitor.getHealth,
    refetchInterval: 60_000,
  });

  const optionsQuery = useQuery({
    queryKey: ["janitor-options"],
    queryFn: api.janitor.getOptions,
    staleTime: 5 * 60_000,
  });

  const scanMutation = useMutation({
    mutationFn: () => api.janitor.scan(),
    onSuccess: (data) => {
      setScanData(data);
      qc.invalidateQueries({ queryKey: ["janitor-health"] });
      toast({ title: "Scan complete", description: `${data.issues.length} issues found` });
    },
    onError: (err: Error) => {
      toast({ title: "Scan failed", description: err.message, variant: "destructive" });
    },
  });

  const fixMutation = useMutation({
    mutationFn: (issue: JanitorIssue) => api.janitor.fix([issue]),
    onMutate: (issue) => {
      setFixingPaths((prev) => new Set([...prev, `${issue.path}:${issue.field}`]));
    },
    onSuccess: (data, issue) => {
      setFixingPaths((prev) => {
        const next = new Set(prev);
        next.delete(`${issue.path}:${issue.field}`);
        return next;
      });
      setManualFixKey(null);
      const r = data.results[0];
      if (r?.success) {
        toast({ title: "Fixed", description: r.detail });
        setScanData((prev) =>
          prev
            ? { ...prev, issues: prev.issues.filter((i) => !(i.path === issue.path && i.field === issue.field)) }
            : prev,
        );
        qc.invalidateQueries({ queryKey: ["janitor-health"] });
      } else {
        toast({ title: "Fix failed", description: r?.detail || "Unknown error", variant: "destructive" });
      }
    },
    onError: (err: Error, issue) => {
      setFixingPaths((prev) => {
        const next = new Set(prev);
        next.delete(`${issue.path}:${issue.field}`);
        return next;
      });
      toast({ title: "Fix failed", description: err.message, variant: "destructive" });
    },
  });

  const enrichMutation = useMutation({
    mutationFn: (path: string) => api.janitor.enrich(path),
    onMutate: (path) => {
      setEnrichingPaths((prev) => new Set([...prev, path]));
    },
    onSuccess: (data, path) => {
      setEnrichingPaths((prev) => {
        const next = new Set(prev);
        next.delete(path);
        return next;
      });
      if (data.success) {
        toast({ title: "Enriched", description: `${data.links_added} links added to ${path.split("/").pop()}` });
      }
    },
    onError: (err: Error, path) => {
      setEnrichingPaths((prev) => {
        const next = new Set(prev);
        next.delete(path);
        return next;
      });
      toast({ title: "Enrich failed", description: err.message, variant: "destructive" });
    },
  });

  function handleFix(issue: JanitorIssue) {
    if (issue.fixable) {
      fixMutation.mutate(issue);
    } else {
      setManualFixKey(`${issue.path}:${issue.field}`);
    }
  }

  function handleManualFix(issue: JanitorIssue) {
    setManualFixKey(`${issue.path}:${issue.field}`);
  }

  async function handleAiFix(issue: JanitorIssue) {
    const path = issue.path;
    setAiFixingPaths((prev) => new Set([...prev, path]));
    try {
      const context = issue.issue_type === "broken_link" ? { broken_target: issue.field } : undefined;
      const result = await api.janitor.aiResolve(path, issue.issue_type, context);
      setAiFixingPaths((prev) => {
        const next = new Set(prev);
        next.delete(path);
        return next;
      });

      if (!result.success) {
        toast({ title: "AI Fix failed", description: result.error || "Unknown error", variant: "destructive" });
        return;
      }

      // Orphan → apply immediately (enrich links)
      if (result.apply_action === "add_links") {
        enrichMutation.mutate(path);
        return;
      }

      setAiModal({ path, data: result });
    } catch (err) {
      setAiFixingPaths((prev) => {
        const next = new Set(prev);
        next.delete(path);
        return next;
      });
      toast({ title: "AI Fix failed", description: (err as Error).message, variant: "destructive" });
    }
  }

  async function handleAiApply(path: string, applyAction: string, suggestion: Record<string, AiFieldSuggestion>) {
    setAiApplying(true);
    try {
      const result = await api.janitor.aiApply(path, applyAction, suggestion);
      if (result.success) {
        toast({ title: "Applied", description: result.detail });
        // Remove all issues for this path from scan data
        setScanData((prev) =>
          prev ? { ...prev, issues: prev.issues.filter((i) => i.path !== path) } : prev,
        );
        qc.invalidateQueries({ queryKey: ["janitor-health"] });
      } else {
        toast({ title: "Apply failed", description: result.detail, variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Apply failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setAiApplying(false);
      setAiModal(null);
    }
  }

  async function handleBatchEnrich() {
    setBatchProgress({ running: true, processed: 0, total: 0, linksAdded: 0 });
    try {
      const result = await api.janitor.batchEnrich({ max_batch: 20 });
      setBatchProgress({
        running: false,
        processed: result.total_processed,
        total: result.total_processed,
        linksAdded: result.total_links_added,
      });
      toast({
        title: "Batch enrich complete",
        description: `${result.total_processed} notes processed, ${result.total_links_added} links added`,
      });
      qc.invalidateQueries({ queryKey: ["janitor-health"] });
    } catch (err) {
      setBatchProgress(null);
      toast({ title: "Batch enrich failed", description: (err as Error).message, variant: "destructive" });
    }
  }

  // Group issues by type
  const grouped: Record<string, JanitorIssue[]> = {};
  if (scanData?.issues) {
    for (const issue of scanData.issues) {
      if (!grouped[issue.issue_type]) grouped[issue.issue_type] = [];
      grouped[issue.issue_type].push(issue);
    }
  }

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-6 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-primary" />
            <h1 className="font-arcade text-lg text-primary tracking-wider">VAULT HEALTH</h1>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleBatchEnrich}
              disabled={batchProgress?.running}
              className="flex items-center gap-2 border-2 border-violet-400 px-4 py-2 font-arcade text-xs text-violet-400 hover:bg-violet-400/10 disabled:opacity-50"
            >
              {batchProgress?.running ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              BATCH ENRICH
            </button>
            <button
              type="button"
              onClick={() => scanMutation.mutate()}
              disabled={scanMutation.isPending}
              className="flex items-center gap-2 border-2 border-primary px-4 py-2 font-arcade text-xs text-primary hover:bg-primary/10 disabled:opacity-50"
            >
              {scanMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Shield className="w-4 h-4" />
              )}
              FULL SCAN
            </button>
          </div>
        </div>

        {/* Batch progress */}
        {batchProgress && !batchProgress.running && (
          <div className="border-2 border-violet-400/20 bg-violet-400/5 p-3 font-terminal text-xs text-violet-400 flex items-center justify-between">
            <span>{batchProgress.processed} notes processed</span>
            <span>{batchProgress.linksAdded} links added</span>
          </div>
        )}

        {/* Health summary */}
        {healthQuery.data && <HealthSummaryBar data={healthQuery.data} />}
        {healthQuery.isLoading && (
          <div className="flex items-center gap-2 font-terminal text-xs text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Loading health status...
          </div>
        )}

        {/* AI Suggestion Modal */}
        {aiModal && (
          <AiSuggestionModal
            path={aiModal.path}
            data={aiModal.data}
            options={optionsQuery.data}
            onApply={handleAiApply}
            onCancel={() => setAiModal(null)}
            applying={aiApplying}
          />
        )}

        {/* Scan results */}
        {scanData && (
          <div className="space-y-3">
            <div className="flex items-center justify-between font-terminal text-xs text-muted-foreground">
              <span>Scan: {scanData.notes_scanned} notes, {scanData.issues.length} issues</span>
              <span>{scanData.scan_time_ms}ms</span>
            </div>
            {Object.entries(grouped).map(([type, issues]) => (
              <IssueGroup
                key={type}
                type={type}
                issues={issues}
                onFix={handleFix}
                onManualFix={handleManualFix}
                onEnrich={(path) => enrichMutation.mutate(path)}
                onAiFix={handleAiFix}
                fixingPaths={fixingPaths}
                enrichingPaths={enrichingPaths}
                aiFixingPaths={aiFixingPaths}
                manualFixKey={manualFixKey}
                options={optionsQuery.data}
                onApplyManual={(patched) => fixMutation.mutate(patched)}
                onCancelManual={() => setManualFixKey(null)}
              />
            ))}
            {scanData.issues.length === 0 && (
              <div className="border-2 border-green-400/20 bg-green-400/5 p-6 text-center font-terminal text-xs text-green-400">
                Vault is clean — no issues detected.
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!scanData && !healthQuery.isLoading && healthQuery.data?.available && (
          <div className="border-2 border-primary/10 p-8 text-center space-y-2">
            <Shield className="w-8 h-8 text-primary/30 mx-auto" />
            <div className="font-terminal text-xs text-muted-foreground">
              Click "FULL SCAN" to check your vault for issues.
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
