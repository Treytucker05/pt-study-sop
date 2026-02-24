import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Shield, AlertTriangle, Link2, Copy, FolderOpen, FileWarning, Wrench, Sparkles, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import Layout from "@/components/layout";
import { api } from "@/lib/api";
import type { JanitorIssue, JanitorHealthResponse, JanitorScanResponse } from "@/api";
import { cn } from "@/lib/utils";
import { useToast } from "@/use-toast";

const ISSUE_CONFIG: Record<string, { label: string; color: string; Icon: typeof AlertTriangle }> = {
  missing_frontmatter: { label: "MISSING FRONTMATTER", color: "text-yellow-400", Icon: FileWarning },
  orphan: { label: "ORPHAN NOTES", color: "text-blue-400", Icon: FolderOpen },
  broken_link: { label: "BROKEN LINKS", color: "text-red-400", Icon: Link2 },
  casing_mismatch: { label: "CASING CONFLICTS", color: "text-orange-400", Icon: AlertTriangle },
  duplicate: { label: "DUPLICATES", color: "text-purple-400", Icon: Copy },
};

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
  onEnrich,
  fixing,
  enriching,
}: {
  issue: JanitorIssue;
  onFix: () => void;
  onEnrich: () => void;
  fixing: boolean;
  enriching: boolean;
}) {
  const cfg = ISSUE_CONFIG[issue.issue_type] || { color: "text-muted-foreground" };
  return (
    <div className="flex items-center justify-between gap-2 border border-primary/10 px-3 py-2 font-terminal text-xs">
      <div className="flex-1 min-w-0">
        <div className={cn("truncate", cfg.color)}>{issue.path}</div>
        <div className="text-muted-foreground truncate">{issue.detail}</div>
      </div>
      <div className="flex gap-1.5 shrink-0">
        {issue.fixable && (
          <button
            type="button"
            onClick={onFix}
            disabled={fixing}
            className="flex items-center gap-1 border border-green-400/40 px-2 py-1 text-green-400 hover:bg-green-400/10 disabled:opacity-50"
          >
            {fixing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wrench className="w-3 h-3" />}
            FIX
          </button>
        )}
        {issue.issue_type === "orphan" && (
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
      </div>
    </div>
  );
}

function IssueGroup({
  type,
  issues,
  onFix,
  onEnrich,
  fixingPaths,
  enrichingPaths,
}: {
  type: string;
  issues: JanitorIssue[];
  onFix: (issue: JanitorIssue) => void;
  onEnrich: (path: string) => void;
  fixingPaths: Set<string>;
  enrichingPaths: Set<string>;
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
          {issues.map((issue, i) => (
            <IssueRow
              key={`${issue.path}-${issue.field}-${i}`}
              issue={issue}
              onFix={() => onFix(issue)}
              onEnrich={() => onEnrich(issue.path)}
              fixing={fixingPaths.has(`${issue.path}:${issue.field}`)}
              enriching={enrichingPaths.has(issue.path)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function VaultHealth() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [scanData, setScanData] = useState<JanitorScanResponse | null>(null);
  const [fixingPaths, setFixingPaths] = useState<Set<string>>(new Set());
  const [enrichingPaths, setEnrichingPaths] = useState<Set<string>>(new Set());

  const healthQuery = useQuery({
    queryKey: ["janitor-health"],
    queryFn: api.janitor.getHealth,
    refetchInterval: 60_000,
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
      const r = data.results[0];
      if (r?.success) {
        toast({ title: "Fixed", description: r.detail });
        // Remove fixed issue from scan data
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

        {/* Health summary */}
        {healthQuery.data && <HealthSummaryBar data={healthQuery.data} />}
        {healthQuery.isLoading && (
          <div className="flex items-center gap-2 font-terminal text-xs text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Loading health status...
          </div>
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
                onFix={(issue) => fixMutation.mutate(issue)}
                onEnrich={(path) => enrichMutation.mutate(path)}
                fixingPaths={fixingPaths}
                enrichingPaths={enrichingPaths}
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
