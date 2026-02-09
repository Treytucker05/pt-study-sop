import Layout from "@/components/layout";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Material } from "@/lib/api";
import {
  TEXT_PAGE_TITLE,
  TEXT_PANEL_TITLE,
  TEXT_BODY,
  TEXT_MUTED,
  TEXT_BADGE,
  INPUT_BASE,
  BTN_PRIMARY,
  BTN_OUTLINE,
  ICON_SM,
  ICON_MD,
  PANEL_PADDING,
} from "@/lib/theme";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MaterialUploader } from "@/components/MaterialUploader";
import {
  FileText,
  Trash2,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Pencil,
  Check,
  X,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";

const FILE_TYPE_LABEL: Record<string, string> = {
  pdf: "PDF",
  docx: "DOCX",
  pptx: "PPTX",
  md: "MD",
  txt: "TXT",
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export default function Library() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const { data: materials = [], isLoading } = useQuery<Material[]>({
    queryKey: ["tutor-materials"],
    queryFn: () => api.tutor.getMaterials(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<{ title: string; enabled: boolean }> }) =>
      api.tutor.updateMaterial(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tutor-materials"] });
      setEditingId(null);
      toast.success("Material updated");
    },
    onError: (err) => {
      toast.error(`Update failed: ${err instanceof Error ? err.message : "Unknown"}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.tutor.deleteMaterial(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tutor-materials"] });
      queryClient.invalidateQueries({ queryKey: ["tutor-content-sources"] });
      setDeleteConfirm(null);
      toast.success("Material deleted");
    },
    onError: (err) => {
      toast.error(`Delete failed: ${err instanceof Error ? err.message : "Unknown"}`);
    },
  });

  const startEdit = (mat: Material) => {
    setEditingId(mat.id);
    setEditTitle(mat.title);
  };

  const saveEdit = () => {
    if (editingId === null || !editTitle.trim()) return;
    updateMutation.mutate({ id: editingId, data: { title: editTitle.trim() } });
  };

  const toggleEnabled = (mat: Material) => {
    updateMutation.mutate({ id: mat.id, data: { enabled: !mat.enabled } });
  };

  return (
    <Layout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className={ICON_MD} />
            <h1 className={TEXT_PAGE_TITLE}>MATERIALS LIBRARY</h1>
          </div>
          <Badge variant="outline" className={`${TEXT_BADGE} h-5 px-2`}>
            {materials.length} files
          </Badge>
        </div>

        {/* Upload section */}
        <Card className="bg-black/40 border-2 border-primary rounded-none">
          <div className={PANEL_PADDING}>
            <div className={`${TEXT_PANEL_TITLE} mb-3`}>UPLOAD MATERIALS</div>
            <MaterialUploader />
          </div>
        </Card>

        {/* Materials table */}
        <Card className="bg-black/40 border-2 border-primary rounded-none">
          <div className={PANEL_PADDING}>
            <div className={`${TEXT_PANEL_TITLE} mb-3`}>YOUR MATERIALS</div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className={`${ICON_MD} animate-spin text-muted-foreground`} />
              </div>
            ) : materials.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <div className={TEXT_MUTED}>No materials uploaded yet</div>
                <div className={`${TEXT_MUTED} opacity-60`}>
                  Upload PDF, DOCX, PPTX, MD, or TXT files above
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                {/* Table header */}
                <div className="grid grid-cols-[1fr_60px_70px_80px_90px] gap-2 px-2 py-1 border-b border-primary/20">
                  <div className={TEXT_MUTED}>Title</div>
                  <div className={TEXT_MUTED}>Type</div>
                  <div className={TEXT_MUTED}>Size</div>
                  <div className={TEXT_MUTED}>Status</div>
                  <div className={`${TEXT_MUTED} text-right`}>Actions</div>
                </div>

                {/* Rows */}
                {materials.map((mat) => (
                  <div
                    key={mat.id}
                    className={`grid grid-cols-[1fr_60px_70px_80px_90px] gap-2 px-2 py-1.5 items-center border-b border-primary/10 hover:bg-primary/5 transition-colors ${
                      !mat.enabled ? "opacity-50" : ""
                    }`}
                  >
                    {/* Title */}
                    <div className="min-w-0">
                      {editingId === mat.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className={`${INPUT_BASE} flex-1 h-9 py-1 text-base`}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveEdit();
                              if (e.key === "Escape") setEditingId(null);
                            }}
                          />
                          <button onClick={saveEdit} className="text-primary hover:text-primary/80">
                            <Check className={ICON_SM} />
                          </button>
                          <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:text-foreground">
                            <X className={ICON_SM} />
                          </button>
                        </div>
                      ) : (
                        <div className={`${TEXT_BODY} truncate`} title={mat.title}>
                          {mat.title}
                          {mat.extraction_error && (
                            <span className="text-red-400 ml-1" title={mat.extraction_error}>
                              [ERR]
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Type */}
                    <Badge variant="outline" className={`${TEXT_BADGE} h-4 px-1 w-fit`}>
                      {FILE_TYPE_LABEL[mat.file_type] || mat.file_type.toUpperCase()}
                    </Badge>

                    {/* Size */}
                    <div className={TEXT_MUTED}>{formatSize(mat.file_size)}</div>

                    {/* Enabled toggle */}
                    <button
                      onClick={() => toggleEnabled(mat)}
                      className={`flex items-center gap-1 ${TEXT_MUTED} hover:text-foreground transition-colors`}
                    >
                      {mat.enabled ? (
                        <>
                          <ToggleRight className={`${ICON_SM} text-primary`} />
                          <span>On</span>
                        </>
                      ) : (
                        <>
                          <ToggleLeft className={ICON_SM} />
                          <span>Off</span>
                        </>
                      )}
                    </button>

                    {/* Actions */}
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => startEdit(mat)}
                        className="text-muted-foreground hover:text-primary transition-colors p-0.5"
                        title="Edit title"
                      >
                        <Pencil className={ICON_SM} />
                      </button>

                      {deleteConfirm === mat.id ? (
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={() => deleteMutation.mutate(mat.id)}
                            className="text-red-400 hover:text-red-300 p-0.5"
                            title="Confirm delete"
                          >
                            <Check className={ICON_SM} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="text-muted-foreground hover:text-foreground p-0.5"
                            title="Cancel"
                          >
                            <X className={ICON_SM} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(mat.id)}
                          className="text-muted-foreground hover:text-red-400 transition-colors p-0.5"
                          title="Delete"
                        >
                          <Trash2 className={ICON_SM} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </Layout>
  );
}
