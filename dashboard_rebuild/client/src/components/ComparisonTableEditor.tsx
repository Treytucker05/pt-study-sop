import { useCallback, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus, Trash2, Download, Copy, Save,
  Columns, Rows, Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface TableRow {
  feature: string;
  values: string[];
  isKey: boolean;
}

interface ComparisonTable {
  title: string;
  columns: string[];
  rows: TableRow[];
}

const DEFAULT_TABLE: ComparisonTable = {
  title: "Untitled Comparison",
  columns: ["Concept A", "Concept B"],
  rows: [
    { feature: "Feature 1", values: ["", ""], isKey: false },
    { feature: "Feature 2", values: ["", ""], isKey: false },
    { feature: "Feature 3", values: ["", ""], isKey: false },
  ],
};

function toMarkdown(table: ComparisonTable): string {
  const header = `| Feature | ${table.columns.join(" | ")} |`;
  const sep = `|${"----|".repeat(table.columns.length + 1)}`;
  const rows = table.rows.map((r) => {
    const feat = r.isKey ? `**${r.feature}**` : r.feature;
    return `| ${feat} | ${r.values.join(" | ")} |`;
  });
  return [header, sep, ...rows].join("\n");
}

export function ComparisonTableEditor({ className }: { className?: string }) {
  const [table, setTable] = useState<ComparisonTable>(() => ({
    ...DEFAULT_TABLE,
    columns: [...DEFAULT_TABLE.columns],
    rows: DEFAULT_TABLE.rows.map((r) => ({ ...r, values: [...r.values] })),
  }));
  const tableRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const updateTitle = useCallback((title: string) => {
    setTable((t) => ({ ...t, title }));
  }, []);

  const updateColumn = useCallback((idx: number, name: string) => {
    setTable((t) => {
      const columns = [...t.columns];
      columns[idx] = name;
      return { ...t, columns };
    });
  }, []);

  const updateFeature = useCallback((rowIdx: number, feature: string) => {
    setTable((t) => {
      const rows = t.rows.map((r, i) =>
        i === rowIdx ? { ...r, feature } : r
      );
      return { ...t, rows };
    });
  }, []);

  const updateCell = useCallback((rowIdx: number, colIdx: number, value: string) => {
    setTable((t) => {
      const rows = t.rows.map((r, i) => {
        if (i !== rowIdx) return r;
        const values = [...r.values];
        values[colIdx] = value;
        return { ...r, values };
      });
      return { ...t, rows };
    });
  }, []);

  const toggleKey = useCallback((rowIdx: number) => {
    setTable((t) => {
      const rows = t.rows.map((r, i) =>
        i === rowIdx ? { ...r, isKey: !r.isKey } : r
      );
      return { ...t, rows };
    });
  }, []);

  const addColumn = useCallback(() => {
    setTable((t) => {
      if (t.columns.length >= 4) return t;
      const columns = [...t.columns, `Concept ${t.columns.length + 1}`];
      const rows = t.rows.map((r) => ({ ...r, values: [...r.values, ""] }));
      return { ...t, columns, rows };
    });
  }, []);

  const removeColumn = useCallback((idx: number) => {
    setTable((t) => {
      if (t.columns.length <= 2) return t;
      const columns = t.columns.filter((_, i) => i !== idx);
      const rows = t.rows.map((r) => ({
        ...r,
        values: r.values.filter((_, i) => i !== idx),
      }));
      return { ...t, columns, rows };
    });
  }, []);

  const addRow = useCallback(() => {
    setTable((t) => ({
      ...t,
      rows: [
        ...t.rows,
        {
          feature: `Feature ${t.rows.length + 1}`,
          values: t.columns.map(() => ""),
          isKey: false,
        },
      ],
    }));
  }, []);

  const removeRow = useCallback((idx: number) => {
    setTable((t) => {
      if (t.rows.length <= 1) return t;
      return { ...t, rows: t.rows.filter((_, i) => i !== idx) };
    });
  }, []);

  const copyMarkdown = useCallback(() => {
    const md = toMarkdown(table);
    navigator.clipboard.writeText(md);
    toast({ title: "Markdown copied to clipboard" });
  }, [table, toast]);

  const exportPng = useCallback(async () => {
    if (!tableRef.current) return;
    try {
      const dataUrl = await toPng(tableRef.current, {
        backgroundColor: "#000",
        quality: 1,
      });
      const link = document.createElement("a");
      link.download = `${table.title.replace(/[/\\?%*:|"<>]/g, "-")}.png`;
      link.href = dataUrl;
      link.click();
      toast({ title: "PNG exported" });
    } catch (err) {
      toast({ title: "Export failed", description: String(err), variant: "destructive" });
    }
  }, [table.title, toast]);

  const saveToVault = useCallback(async () => {
    const md = toMarkdown(table);
    const safeName = table.title.replace(/[/\\?%*:|"<>]/g, "-");
    const content = `---\ntype: comparison-table\ncreated: ${new Date().toISOString()}\n---\n\n# ${table.title}\n\n${md}\n`;
    const path = `Comparison Tables/${safeName}.md`;
    try {
      await api.obsidian.saveFile(path, content);
      toast({ title: "Saved to vault", description: path });
    } catch (err) {
      toast({ title: "Save failed", description: String(err), variant: "destructive" });
    }
  }, [table, toast]);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 py-1 border-b border-secondary/30 bg-black/40 shrink-0 flex-wrap">
        <Button size="sm" variant="ghost" className="h-6 px-1.5 text-xs font-terminal" onClick={addColumn} disabled={table.columns.length >= 4} title="Add column">
          <Columns className="w-3 h-3" />
          <Plus className="w-2 h-2" />
        </Button>
        <Button size="sm" variant="ghost" className="h-6 px-1.5 text-xs font-terminal" onClick={addRow} title="Add row">
          <Rows className="w-3 h-3" />
          <Plus className="w-2 h-2" />
        </Button>
        <div className="w-px h-4 bg-secondary/30" />
        <Button size="sm" variant="ghost" className="h-6 px-1.5 text-xs font-terminal" onClick={copyMarkdown} title="Copy markdown">
          <Copy className="w-3 h-3" />
        </Button>
        <Button size="sm" variant="ghost" className="h-6 px-1.5 text-xs font-terminal" onClick={exportPng} title="Export PNG">
          <Download className="w-3 h-3" />
        </Button>
        <Button size="sm" variant="ghost" className="h-6 px-1.5 text-xs font-terminal" onClick={saveToVault} title="Save to vault">
          <Save className="w-3 h-3" />
        </Button>
        <span className="ml-auto text-xs font-terminal text-muted-foreground">
          {table.columns.length}C / {table.rows.length}R
        </span>
      </div>

      {/* Title */}
      <div className="px-2 py-1 border-b border-secondary/20">
        <Input
          value={table.title}
          onChange={(e) => updateTitle(e.target.value)}
          className="h-6 text-xs font-arcade bg-transparent border-none px-1 text-primary focus-visible:ring-0"
          placeholder="Table title..."
        />
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-2">
        <div ref={tableRef} className="bg-black/80 border-2 border-primary/50">
          {/* Header row */}
          <div className="flex border-b-2 border-primary/50">
            <div className="w-28 shrink-0 p-1 border-r border-secondary/30 bg-black/60">
              <span className="font-arcade text-xs text-muted-foreground">FEATURE</span>
            </div>
            {table.columns.map((col, i) => (
              <div key={i} className="flex-1 min-w-[100px] p-1 border-r border-secondary/30 bg-black/60 flex items-center gap-1">
                <Input
                  value={col}
                  onChange={(e) => updateColumn(i, e.target.value)}
                  className="h-5 text-xs font-arcade bg-transparent border-none px-0 text-primary focus-visible:ring-0 flex-1"
                />
                {table.columns.length > 2 && (
                  <button
                    onClick={() => removeColumn(i)}
                    className="text-muted-foreground hover:text-destructive shrink-0"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Data rows */}
          {table.rows.map((row, ri) => (
            <div
              key={ri}
              className={cn(
                "flex border-b border-secondary/20",
                row.isKey && "border-l-2 border-l-primary"
              )}
            >
              <div className="w-28 shrink-0 p-1 border-r border-secondary/30 flex items-center gap-1">
                <button
                  onClick={() => toggleKey(ri)}
                  className={cn(
                    "shrink-0",
                    row.isKey ? "text-primary" : "text-muted-foreground/40 hover:text-muted-foreground"
                  )}
                  title="Toggle key feature"
                >
                  <Star className="w-2.5 h-2.5" fill={row.isKey ? "currentColor" : "none"} />
                </button>
                <Input
                  value={row.feature}
                  onChange={(e) => updateFeature(ri, e.target.value)}
                  className={cn(
                    "h-5 text-xs font-terminal bg-transparent border-none px-0 focus-visible:ring-0 flex-1",
                    row.isKey ? "text-primary font-bold" : "text-secondary-foreground"
                  )}
                />
                {table.rows.length > 1 && (
                  <button
                    onClick={() => removeRow(ri)}
                    className="text-muted-foreground hover:text-destructive shrink-0"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
              {row.values.map((val, ci) => (
                <div key={ci} className="flex-1 min-w-[100px] p-1 border-r border-secondary/30">
                  <Input
                    value={val}
                    onChange={(e) => updateCell(ri, ci, e.target.value)}
                    className="h-5 text-xs font-terminal bg-transparent border-none px-0 text-secondary-foreground focus-visible:ring-0"
                    placeholder="..."
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
