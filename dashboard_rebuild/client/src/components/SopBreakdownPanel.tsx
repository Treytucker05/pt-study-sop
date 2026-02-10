import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type OutlineNode = {
  id: string;
  level: number;
  title: string;
  startLine: number;
  endLine: number;
};

type ExplainResult =
  | { ok: true; cached: boolean; explanation: any }
  | { ok: false; message?: string; error?: string; raw?: string };

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

function buildOutline(markdown: string): OutlineNode[] {
  const lines = (markdown || "").split("\n");
  const headingRegex = /^(#{1,6})\s+(.+?)\s*$/;
  const nodes: Omit<OutlineNode, "endLine">[] = [];

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(headingRegex);
    if (!m) continue;
    const level = m[1].length;
    const title = m[2].trim();
    const id = `${level}-${slugify(title)}-${i + 1}`;
    nodes.push({ id, level, title, startLine: i + 1 });
  }

  const withEnd: OutlineNode[] = nodes.map((n, idx) => {
    const next = nodes[idx + 1];
    const endLine = next ? next.startLine - 1 : lines.length;
    return { ...n, endLine };
  });

  return withEnd;
}

function extractExcerpt(markdown: string, node: OutlineNode): string {
  const lines = (markdown || "").split("\n");
  const startIdx = Math.max(0, node.startLine - 1);
  const endIdx = Math.min(lines.length, node.endLine);
  return lines.slice(startIdx, endIdx).join("\n").trim();
}

export function SopBreakdownPanel({
  path,
  content,
}: {
  path: string;
  content: string;
}) {
  const outline = useMemo(() => buildOutline(content), [content]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<"teach" | "drill">("teach");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExplainResult | null>(null);

  const selected = useMemo(
    () => outline.find((n) => n.id === selectedId) || null,
    [outline, selectedId]
  );

  const runExplain = async () => {
    if (!selected) return;
    setLoading(true);
    setResult(null);
    try {
      const excerpt = extractExcerpt(content, selected);
      const resp = await fetch("/api/sop/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path,
          heading: selected.title,
          level: selected.level,
          excerpt,
          mode,
        }),
      });
      const json = await resp.json().catch(() => ({ ok: false, message: resp.statusText }));
      if (!resp.ok) {
        setResult({ ok: false, ...(json || {}), message: json?.message || json?.error || resp.statusText });
      } else {
        setResult(json);
      }
    } catch (e) {
      setResult({ ok: false, message: (e as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <Card className="bg-black/40 border-2 border-primary rounded-none lg:col-span-1 flex flex-col">
        <CardHeader className="border-b border-secondary sticky top-0 bg-black/95 z-10">
          <CardTitle className="font-arcade text-sm text-primary">BREAKDOWN OUTLINE</CardTitle>
          <div className="flex gap-2 mt-2">
            <Button
              size="sm"
              variant={mode === "teach" ? "default" : "ghost"}
              className="rounded-none font-arcade text-xs h-7"
              onClick={() => setMode("teach")}
            >
              TEACH
            </Button>
            <Button
              size="sm"
              variant={mode === "drill" ? "default" : "ghost"}
              className="rounded-none font-arcade text-xs h-7"
              onClick={() => setMode("drill")}
            >
              DRILL
            </Button>
          </div>
        </CardHeader>
        <div className="flex-1">
          <div className="p-2 space-y-1">
            {outline.length === 0 ? (
              <div className="font-terminal text-xs text-muted-foreground p-3">
                No headings found. Add headings (`#`, `##`, `###`) to get a structured breakdown.
              </div>
            ) : (
              outline.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    setSelectedId(n.id);
                    setResult(null);
                  }}
                  className={cn(
                    "w-full text-left px-2 py-1.5 font-terminal text-xs flex items-center gap-2 border border-transparent hover:border-primary/40 hover:bg-primary/10",
                    selectedId === n.id && "border-primary/60 bg-primary/10"
                  )}
                >
                  <Badge variant="outline" className="rounded-none text-xs border-secondary">
                    H{n.level}
                  </Badge>
                  <span
                    className="truncate"
                    style={{ paddingLeft: Math.max(0, (n.level - 1) * 10) }}
                    title={n.title}
                  >
                    {n.title}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      </Card>

      <Card className="bg-black/60 border-2 border-primary rounded-none lg:col-span-2 flex flex-col">
        <CardHeader className="border-b border-secondary sticky top-0 bg-black/95 z-10">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="font-arcade text-sm text-primary">
              {selected ? "SECTION EXPLANATION" : "SELECT A HEADING"}
            </CardTitle>
            <Button
              size="sm"
              className="rounded-none font-arcade text-xs h-8"
              onClick={runExplain}
              disabled={!selected || loading}
              data-testid="button-sop-explain"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3 h-3 mr-2 animate-spin" /> EXPLAINING...
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3 mr-2" /> EXPLAIN THIS
                </>
              )}
            </Button>
          </div>
          {selected && (
            <div className="font-terminal text-xs text-muted-foreground mt-1">
              {selected.title} (H{selected.level}) • {path}
            </div>
          )}
        </CardHeader>
        <CardContent className="p-4 space-y-3">
            {!selected ? (
              <div className="font-terminal text-xs text-muted-foreground">
                Pick a heading on the left. This will generate a nested breakdown (groups → subgroups → concepts) and
                explain how each part operates.
              </div>
            ) : result?.ok === false ? (
              <div className="p-3 bg-red-900/20 border border-red-500/50 rounded-none">
                <div className="font-arcade text-xs text-red-300 mb-2">EXPLAIN FAILED</div>
                <div className="font-terminal text-xs text-red-200 whitespace-pre-wrap break-words">
                  {result.message || result.error || "Unknown error"}
                </div>
                {result.raw && (
                  <pre className="mt-2 p-2 bg-black/50 border border-secondary/40 font-mono text-xs overflow-auto">
                    {result.raw}
                  </pre>
                )}
              </div>
            ) : result?.ok === true ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="rounded-none border-secondary text-xs">
                    {result.cached ? "CACHED" : "FRESH"}
                  </Badge>
                  <div className="font-arcade text-xs text-primary">{result.explanation?.title || selected.title}</div>
                </div>

                {result.explanation?.summary && (
                  <div className="p-3 bg-black/40 border border-secondary/50 rounded-none">
                    <div className="font-terminal text-xs text-white">{result.explanation.summary}</div>
                  </div>
                )}

                {Array.isArray(result.explanation?.groups) && result.explanation.groups.length > 0 ? (
                  <div className="space-y-2">
                    {result.explanation.groups.map((g: any, idx: number) => (
                      <div key={idx} className="p-3 bg-black/40 border border-secondary/50 rounded-none">
                        <div className="flex items-center gap-2 mb-2">
                          <ChevronRight className="w-4 h-4 text-primary" />
                          <div className="font-arcade text-xs text-primary">{g?.name || `Group ${idx + 1}`}</div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <div className="font-terminal text-xs text-muted-foreground">What it is</div>
                            <div className="font-terminal text-xs">{g?.what_it_is}</div>
                          </div>
                          <div className="space-y-1">
                            <div className="font-terminal text-xs text-muted-foreground">How it works</div>
                            <div className="font-terminal text-xs">{g?.how_it_works}</div>
                          </div>
                          <div className="space-y-1">
                            <div className="font-terminal text-xs text-muted-foreground">Why it matters</div>
                            <div className="font-terminal text-xs">{g?.why_it_matters}</div>
                          </div>
                          <div className="space-y-1">
                            <div className="font-terminal text-xs text-muted-foreground">Example</div>
                            <div className="font-terminal text-xs">{g?.example}</div>
                          </div>
                        </div>

                        {Array.isArray(g?.failure_modes) && g.failure_modes.length > 0 && (
                          <div className="mt-3">
                            <div className="font-terminal text-xs text-muted-foreground mb-1">Failure modes</div>
                            <ul className="space-y-1 font-terminal text-xs">
                              {g.failure_modes.slice(0, 8).map((fm: string, j: number) => (
                                <li key={j} className="flex items-start gap-2">
                                  <span className="text-primary mt-[2px]">-</span>
                                  <span>{fm}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {Array.isArray(g?.children) && g.children.length > 0 && (
                          <div className="mt-3 p-2 bg-black/30 border border-secondary/40 rounded-none">
                            <div className="font-terminal text-xs text-muted-foreground mb-1">
                              Subgroups / Concepts
                            </div>
                            <ul className="space-y-1 font-terminal text-xs">
                              {g.children.slice(0, 12).map((c: any, j: number) => (
                                <li key={j} className="flex items-start gap-2">
                                  <ChevronRight className="w-3 h-3 text-primary mt-[2px]" />
                                  <span className="text-white">
                                    {c?.name || "Unnamed"}:{" "}
                                    <span className="text-muted-foreground">
                                      {(c?.what_it_is || "").slice(0, 160)}
                                      {(c?.what_it_is || "").length > 160 ? "…" : ""}
                                    </span>
                                  </span>
                                </li>
                              ))}
                            </ul>
                            <div className="font-terminal text-xs text-muted-foreground mt-2">
                              Tip: if you want deeper breakdown on a subgroup, we can add “click-to-expand” next.
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="font-terminal text-xs text-muted-foreground">
                    No groups returned. Try a different heading or add more detail under the heading.
                  </div>
                )}

                {Array.isArray(result.explanation?.next_actions) && result.explanation.next_actions.length > 0 && (
                  <div className="p-3 bg-black/40 border border-secondary/50 rounded-none">
                    <div className="font-arcade text-xs text-primary mb-2">NEXT ACTIONS</div>
                    <ul className="space-y-1 font-terminal text-xs">
                      {result.explanation.next_actions.slice(0, 10).map((a: string, i: number) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-primary mt-[2px]">-</span>
                          <span>{a}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="font-terminal text-xs text-muted-foreground">
                Click “EXPLAIN THIS” to generate a breakdown for the selected section.
              </div>
            )}
          </CardContent>
      </Card>
    </div>
  );
}

