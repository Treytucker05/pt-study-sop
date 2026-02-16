import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Trash2, ChevronLeft, ChevronRight, Check, X } from "lucide-react";

const PAGE_SIZE = 100;

interface EditingCell {
  rowid: number;
  column: string;
  value: string;
}

export function DataEditor() {
  const queryClient = useQueryClient();
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
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (rowid: number) => api.data.deleteRow(selectedTable!, rowid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["data", "rows", selectedTable] });
      queryClient.invalidateQueries({ queryKey: ["data", "schema", selectedTable] });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: number[]) => api.data.deleteRows(selectedTable!, ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["data", "rows", selectedTable] });
      queryClient.invalidateQueries({ queryKey: ["data", "schema", selectedTable] });
      setSelected(new Set());
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

  return (
    <div className="flex flex-col h-full p-3 gap-3">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={selectedTable ?? ""}
          onChange={(e) => handleTableChange(e.target.value)}
          className="bg-black border-2 border-primary text-primary font-terminal text-sm px-2 py-1 rounded-none focus:outline-none focus:border-secondary"
        >
          <option value="" disabled>Select table...</option>
          {tables.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        {selectedTable && (
          <span className="text-muted-foreground font-terminal text-xs">
            {total} rows
          </span>
        )}

        {selected.size > 0 && (
          <button
            onClick={() => bulkDeleteMutation.mutate(Array.from(selected))}
            disabled={bulkDeleteMutation.isPending}
            className="ml-auto flex items-center gap-1 px-2 py-1 border-2 border-destructive text-destructive font-terminal text-xs hover:bg-destructive hover:text-destructive-foreground transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            Delete {selected.size} row{selected.size > 1 ? "s" : ""}
          </button>
        )}
      </div>

      {/* Data Grid */}
      {selectedTable && (
        <div className="flex-1 min-h-0 overflow-auto border-2 border-primary/30">
          {isLoading ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground font-terminal text-sm">
              Loading...
            </div>
          ) : (
            <table className="w-full text-xs font-terminal border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-primary/10 border-b-2 border-primary/30">
                  <th className="px-2 py-1.5 text-left w-8">
                    <input
                      type="checkbox"
                      checked={rows.length > 0 && selected.size === rows.length}
                      onChange={toggleSelectAll}
                      className="accent-secondary"
                    />
                  </th>
                  <th className="px-2 py-1.5 text-left text-muted-foreground">rowid</th>
                  {columns.map((col) => (
                    <th
                      key={col.name}
                      className="px-2 py-1.5 text-left text-primary"
                      title={`${col.type}${col.pk ? " PK" : ""}${col.notnull ? " NOT NULL" : ""}`}
                    >
                      {col.name}
                      {col.pk ? <span className="text-secondary ml-1">PK</span> : null}
                    </th>
                  ))}
                  <th className="px-2 py-1.5 w-8" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const rowid = row.rowid as number;
                  return (
                    <tr
                      key={rowid}
                      className={cn(
                        "border-b border-primary/10 hover:bg-primary/5 transition-colors",
                        selected.has(rowid) && "bg-secondary/10"
                      )}
                    >
                      <td className="px-2 py-1">
                        <input
                          type="checkbox"
                          checked={selected.has(rowid)}
                          onChange={() => toggleSelect(rowid)}
                          className="accent-secondary"
                        />
                      </td>
                      <td className="px-2 py-1 text-muted-foreground">{rowid}</td>
                      {columns.map((col) => {
                        const isEditing = editing?.rowid === rowid && editing?.column === col.name;
                        const cellVal = row[col.name];
                        return (
                          <td
                            key={col.name}
                            className="px-2 py-1 cursor-pointer hover:bg-primary/10 max-w-[300px]"
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
                                  className="bg-black border border-secondary text-secondary px-1 py-0.5 w-full font-terminal text-xs rounded-none focus:outline-none"
                                />
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleCellSave(); }}
                                  className="text-success hover:text-success/80 shrink-0"
                                  title="Save"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleCellCancel(); }}
                                  className="text-destructive hover:text-destructive/80 shrink-0"
                                  title="Cancel"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <span className="block truncate" title={cellVal == null ? "NULL" : String(cellVal)}>
                                {cellVal == null ? (
                                  <span className="text-muted-foreground/50 italic">NULL</span>
                                ) : (
                                  String(cellVal)
                                )}
                              </span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-2 py-1">
                        <button
                          onClick={() => deleteMutation.mutate(rowid)}
                          disabled={deleteMutation.isPending}
                          className="text-destructive/60 hover:text-destructive transition-colors"
                          title="Delete row"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={columns.length + 3}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      No rows in this table
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Pagination */}
      {selectedTable && total > PAGE_SIZE && (
        <div className="flex items-center justify-between font-terminal text-xs text-muted-foreground">
          <span>
            Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              disabled={!hasPrev}
              className="flex items-center gap-1 px-2 py-1 border border-primary/30 hover:border-primary disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-3 h-3" /> Prev
            </button>
            <button
              onClick={() => setOffset(offset + PAGE_SIZE)}
              disabled={!hasNext}
              className="flex items-center gap-1 px-2 py-1 border border-primary/30 hover:border-primary disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {!selectedTable && (
        <div className="flex-1 flex items-center justify-center text-muted-foreground font-terminal text-sm">
          Select a table to view and edit data
        </div>
      )}
    </div>
  );
}
