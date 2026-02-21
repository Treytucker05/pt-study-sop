import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Trash2, ChevronLeft, ChevronRight, Check, X, Database } from "lucide-react";
import { useToast } from "@/use-toast";

const PAGE_SIZE = 100;

interface EditingCell {
  rowid: number;
  column: string;
  value: string;
}

export function DataEditor() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [editing, setEditing] = useState<EditingCell | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: tables = [] } = useQuery({
    queryKey: ["data", "tables"],
    queryFn: api.data.getTables,
  });

  const { data: schema } = useQuery({
    queryKey: ["data", "schema", selectedTable],
    queryFn: () => api.data.getSchema(selectedTable!),
    enabled: !!selectedTable,
  });

  const { data: rowsData, isLoading } = useQuery({
    queryKey: ["data", "rows", selectedTable, offset],
    queryFn: () => api.data.getRows(selectedTable!, PAGE_SIZE, offset),
    enabled: !!selectedTable,
  });

  const updateMutation = useMutation({
    mutationFn: ({ rowid, data }: { rowid: number; data: Record<string, unknown> }) =>
      api.data.updateRow(selectedTable!, rowid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["data", "rows", selectedTable] });
      setEditing(null);
      toast({ title: "Row updated", description: "Database record saved." });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (rowid: number) => api.data.deleteRow(selectedTable!, rowid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["data", "rows", selectedTable] });
      queryClient.invalidateQueries({ queryKey: ["data", "schema", selectedTable] });
      toast({ title: "Row deleted", description: "Record removed from database." });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: number[]) => api.data.deleteRows(selectedTable!, ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["data", "rows", selectedTable] });
      queryClient.invalidateQueries({ queryKey: ["data", "schema", selectedTable] });
      setSelected(new Set());
      toast({ title: "Rows deleted", description: "Records removed from database." });
    },
  });

  const handleTableChange = useCallback((table: string) => {
    setSelectedTable(table);
    setOffset(0);
    setSelected(new Set());
    setEditing(null);
  }, []);

  const handleCellClick = useCallback((rowid: number, column: string, value: unknown) => {
    if (column === "rowid") return;
    setEditing({ rowid, column, value: value == null ? "" : String(value) });
  }, []);

  const handleCellSave = useCallback(() => {
    if (!editing) return;
    updateMutation.mutate({ rowid: editing.rowid, data: { [editing.column]: editing.value } });
  }, [editing, updateMutation]);

  const handleCellCancel = useCallback(() => {
    setEditing(null);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleCellSave();
    if (e.key === "Escape") handleCellCancel();
  }, [handleCellSave, handleCellCancel]);

  const toggleSelect = useCallback((rowid: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(rowid)) next.delete(rowid);
      else next.add(rowid);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (!rowsData?.rows) return;
    const allIds = rowsData.rows.map(r => r.rowid as number);
    setSelected(prev => {
      if (prev.size === allIds.length) return new Set();
      return new Set(allIds);
    });
  }, [rowsData]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const columns = schema?.columns ?? [];
  const rows = rowsData?.rows ?? [];
  const total = rowsData?.total ?? schema?.row_count ?? 0;
  const hasNext = offset + PAGE_SIZE < total;
  const hasPrev = offset > 0;

  const [searchQuery, setSearchQuery] = useState("");

  const filteredTables = tables.filter(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="flex h-full p-4 gap-4">
      {/* Left Sidebar - Table List */}
      <div className="w-64 flex flex-col gap-3 min-h-0 border-r-2 border-primary/20 pr-4 shrink-0">
        <div className="relative">
          <input
            type="text"
            placeholder="Search tables..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/40 border-2 border-primary/50 text-foreground font-terminal text-xs px-3 py-2 focus:outline-none focus:border-primary placeholder:text-muted-foreground/50 transition-colors"
          />
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 space-y-0.5 pr-1 custom-scrollbar">
          {filteredTables.map((t) => (
            <button
              key={t}
              onClick={() => handleTableChange(t)}
              className={cn(
                "w-full text-left px-3 py-2 font-terminal text-xs transition-colors truncate border-l-2",
                selectedTable === t
                  ? "border-primary bg-primary/20 text-primary font-bold"
                  : "border-transparent text-muted-foreground hover:bg-primary/10 hover:text-foreground hover:border-primary/50"
              )}
            >
              {t}
            </button>
          ))}
          {filteredTables.length === 0 && tables.length > 0 && (
            <div className="text-muted-foreground text-xs font-terminal italic p-2 text-center mt-4">
              No tables match "{searchQuery}"
            </div>
          )}
          {tables.length === 0 && !isLoading && (
            <div className="text-muted-foreground text-xs font-terminal italic p-2 text-center mt-4">
              Loading tables...
            </div>
          )}
        </div>
      </div>

      {/* Right Pane - Data Grid */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 gap-3">
        {/* Header Actions */}
        <div className="flex items-center justify-between flex-wrap gap-3 h-8 shrink-0">
          <div className="flex items-center gap-3">
            {selectedTable ? (
              <span className="text-primary font-arcade text-sm">
                {selectedTable.toUpperCase()}
                <span className="text-muted-foreground font-terminal text-xs ml-3 normal-case tracking-normal">
                  {total} rows
                </span>
              </span>
            ) : (
              <span className="text-muted-foreground font-terminal text-sm">Select a table to edit data</span>
            )}
          </div>

          {selected.size > 0 && (
            <button
              onClick={() => bulkDeleteMutation.mutate(Array.from(selected))}
              disabled={bulkDeleteMutation.isPending}
              className="flex items-center gap-2 px-3 py-1 border-2 border-destructive text-destructive font-terminal text-xs hover:bg-destructive hover:text-destructive-foreground transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete {selected.size} row{selected.size > 1 ? "s" : ""}
            </button>
          )}
        </div>

        {/* Data Grid Area */}
        {selectedTable ? (
          <div className="flex-1 min-h-0 flex flex-col border-2 border-primary/30">
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground font-terminal text-sm">
                Loading data...
              </div>
            ) : (
              <div className="flex-1 overflow-auto bg-black/20 custom-scrollbar">
                <table className="w-full text-xs font-terminal border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-black border-b-2 border-primary/30 shadow-sm shadow-black/50">
                      <th className="px-3 py-2 text-left w-10">
                        <input
                          type="checkbox"
                          checked={rows.length > 0 && selected.size === rows.length}
                          onChange={toggleSelectAll}
                          className="accent-secondary scale-110 cursor-pointer"
                        />
                      </th>
                      <th className="px-3 py-2 text-left text-muted-foreground whitespace-nowrap">rowid</th>
                      {columns.map((col) => (
                        <th
                          key={col.name}
                          className="px-3 py-2 text-left text-primary whitespace-nowrap"
                          title={`${col.type}${col.pk ? " PK" : ""}${col.notnull ? " NOT NULL" : ""}`}
                        >
                          {col.name}
                          {col.pk ? <span className="text-secondary ml-1 bg-secondary/10 px-1 py-0.5 rounded text-[10px]">PK</span> : null}
                        </th>
                      ))}
                      <th className="px-3 py-2 w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const rowid = row.rowid as number;
                      return (
                        <tr
                          key={rowid}
                          className={cn(
                            "border-b border-primary/10 hover:bg-primary/10 transition-colors group",
                            selected.has(rowid) && "bg-secondary/10 hover:bg-secondary/20"
                          )}
                        >
                          <td className="px-3 py-1.5">
                            <input
                              type="checkbox"
                              checked={selected.has(rowid)}
                              onChange={() => toggleSelect(rowid)}
                              className="accent-secondary scale-110 cursor-pointer"
                            />
                          </td>
                          <td className="px-3 py-1.5 text-muted-foreground">{rowid}</td>
                          {columns.map((col) => {
                            const isEditing = editing?.rowid === rowid && editing?.column === col.name;
                            const cellVal = row[col.name];
                            return (
                              <td
                                key={col.name}
                                className="px-3 py-1.5 cursor-pointer max-w-[300px]"
                                onClick={() => !isEditing && handleCellClick(rowid, col.name, cellVal)}
                              >
                                {isEditing ? (
                                  <div className="flex items-center gap-1">
                                    <input
                                      ref={inputRef}
                                      type="text"
                                      value={editing.value}
                                      onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                                      onKeyDown={handleKeyDown}
                                      className="bg-black/90 border border-secondary text-foreground px-2 py-1 w-full font-terminal text-xs focus:outline-none focus:ring-1 focus:ring-secondary/50"
                                    />
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleCellSave(); }}
                                      className="text-success hover:text-success/80 shrink-0 p-1"
                                      title="Save"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleCellCancel(); }}
                                      className="text-destructive hover:text-destructive/80 shrink-0 p-1"
                                      title="Cancel"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <span className="block truncate" title={cellVal == null ? "NULL" : String(cellVal)}>
                                    {cellVal == null ? (
                                      <span className="text-muted-foreground/40 italic text-[11px]">NULL</span>
                                    ) : (
                                      String(cellVal)
                                    )}
                                  </span>
                                )}
                              </td>
                            );
                          })}
                          <td className="px-3 py-1.5 text-right">
                            <button
                              onClick={() => deleteMutation.mutate(rowid)}
                              disabled={deleteMutation.isPending}
                              className="text-destructive/40 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                              title="Delete row"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {rows.length === 0 && (
                      <tr>
                        <td
                          colSpan={columns.length + 3}
                          className="px-4 py-12 text-center text-muted-foreground"
                        >
                          <span className="font-arcade text-sm">NO DATA FOUND</span>
                          <p className="mt-2 text-xs">This table is currently empty.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination inside the grid container */}
            {total > PAGE_SIZE && (
              <div className="flex items-center justify-between px-4 py-2 bg-black/40 border-t-2 border-primary/30 font-terminal text-xs text-muted-foreground shrink-0">
                <span>
                  Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of <span className="text-secondary">{total}</span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                    disabled={!hasPrev}
                    className="flex items-center gap-1 px-3 py-1 border-2 border-primary/30 hover:border-primary hover:text-primary disabled:opacity-30 disabled:hover:border-primary/30 disabled:hover:text-muted-foreground transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> PREV
                  </button>
                  <button
                    onClick={() => setOffset(offset + PAGE_SIZE)}
                    disabled={!hasNext}
                    className="flex items-center gap-1 px-3 py-1 border-2 border-primary/30 hover:border-primary hover:text-primary disabled:opacity-30 disabled:hover:border-primary/30 disabled:hover:text-muted-foreground transition-colors"
                  >
                    NEXT <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground/50 border-2 border-primary/10 border-dashed bg-black/20">
            <Database className="w-12 h-12 mb-4 opacity-50" />
            <span className="font-arcade text-sm">DATA BROWSER</span>
            <span className="font-terminal text-xs mt-2 text-muted-foreground/70">Select a table from the sidebar to view records</span>
          </div>
        )}
      </div>
    </div>
  );
}
