import Layout from "@/components/layout";
import { Card } from "@/components/ui/card";
import { useState, useEffect, useMemo } from "react";
import type { JSX } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Material, TutorSyncJobStatus } from "@/lib/api";
import { Link } from "wouter";
import {
  TEXT_PAGE_TITLE,
  TEXT_PANEL_TITLE,
  TEXT_BODY,
  TEXT_MUTED,
  TEXT_BADGE,
  INPUT_BASE,
  BTN_PRIMARY,
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
  RefreshCw,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

const FILE_TYPE_LABEL: Record<string, string> = {
  pdf: "PDF",
  docx: "DOCX",
  pptx: "PPTX",
  md: "MD",
  txt: "TXT",
};

function getFileTypeLabel(fileType: string | null | undefined): string {
  const normalizedRaw = (fileType || "").toLowerCase().trim();
  const normalized = ["", "null", "none"].includes(normalizedRaw) ? "" : normalizedRaw;
  return FILE_TYPE_LABEL[normalized] || (normalized ? normalized.toUpperCase() : "FILE");
}

function formatSize(bytes: number | null | undefined): string {
  const safeBytes = Number(bytes ?? 0);
  if (!Number.isFinite(safeBytes) || safeBytes < 0) return "0B";
  if (safeBytes < 1024) return `${safeBytes}B`;
  if (safeBytes < 1024 * 1024) return `${(safeBytes / 1024).toFixed(0)}KB`;
  return `${(safeBytes / (1024 * 1024)).toFixed(1)}MB`;
}

function getMaterialTitle(mat: Material): string {
  const toBaseName = (value: string): string => {
    const normalized = (value || "").replace(/\\/g, "/").trim();
    const lastSlash = normalized.lastIndexOf("/");
    return lastSlash >= 0 ? normalized.slice(lastSlash + 1) : normalized;
  };

  const title = (mat.title || "").trim();
  if (title) {
    const looksLikePath = /[\\/]/.test(title) || /^[a-zA-Z]:/.test(title);
    return looksLikePath ? toBaseName(title) : title;
  }

  const sourcePath = (mat.source_path || "").trim();
  if (sourcePath) return toBaseName(sourcePath);

  return `Material ${mat.id}`;
}

function getMaterialSize(mat: Material): number {
  const candidate = Number(mat.file_size);
  return Number.isFinite(candidate) && candidate >= 0 ? Math.floor(candidate) : 0;
}

interface FolderNode {
  name: string;
  files: Material[];
  children: Record<string, FolderNode>;
}

function countFolderFiles(node: FolderNode): number {
  let count = node.files.length;
  for (const child of Object.values(node.children)) {
    count += countFolderFiles(child);
  }
  return count;
}

interface MutateDeleteLike {
  mutate: (id: number) => void;
}

function getMaterialFolder(mat: Material): string {
  const rawFolder = (mat.folder_path || "").replace(/\\/g, "/").trim().replace(/^\/+|\/+$/g, "");
  if (rawFolder) return rawFolder;

  const sourcePath = (mat.source_path || "").replace(/\\/g, "/").trim();
  if (!sourcePath) return "Unsorted";

  const protocolIndex = sourcePath.indexOf("://");
  if (protocolIndex > 0) {
    const protocol = sourcePath.slice(0, protocolIndex);
    const afterProtocol = sourcePath.slice(protocolIndex + 3);
    const lastSlash = afterProtocol.lastIndexOf("/");
    if (lastSlash <= 0) return protocol;
    return `${protocol}/${afterProtocol.slice(0, lastSlash)}`;
  }

  const normalizedSource = sourcePath.toLowerCase();
  if (normalizedSource.includes("/uploads/") || normalizedSource.includes("\\uploads\\")) return "Uploaded Files";

  const lastSlash = sourcePath.lastIndexOf("/");
  if (lastSlash <= 0) return "Unsorted";

  const folders = sourcePath.slice(0, lastSlash).split("/").filter(Boolean);
  if (folders.length > 2) return folders.slice(-2).join("/");
  return folders.join("/");
}

function buildFolderTree(materials: Material[]): FolderNode {
  const root: FolderNode = { name: "root", files: [], children: {} };

  for (const mat of materials) {
    const folder = getMaterialFolder(mat);
    const parts = folder
      .split("/")
      .map((part) => part.trim())
      .filter(Boolean);

    let node = root;
    for (const part of parts) {
      if (!node.children[part]) node.children[part] = { name: part, files: [], children: {} };
      node = node.children[part];
    }
    node.files.push(mat);
  }

  return root;
}

function renderMaterialRow(
  mat: Material,
  depth: number,
  selectedForTutor: number[],
  editingId: number | null,
  editTitle: string,
  setEditTitle: (value: string) => void,
  setEditingId: (id: number | null) => void,
  saveEdit: () => void,
  toggleMaterialForTutor: (id: number) => void,
  toggleEnabled: (mat: Material) => void,
  deleteMutation: MutateDeleteLike,
  startEdit: (mat: Material) => void,
  deleteConfirm: number | null,
  setDeleteConfirm: (id: number | null) => void,
) {
  const displayTitle = getMaterialTitle(mat);

  return (
    <div
      key={mat.id}
      className={`grid grid-cols-[28px_1fr_60px_70px_80px_90px] gap-2 px-2 py-1.5 items-center border-b border-primary/10 hover:bg-primary/5 transition-colors ${!mat.enabled ? "opacity-50" : ""}`}
      style={{ paddingLeft: `${depth * 1.1}rem` }}
    >
      <label className="flex items-center justify-center">
        <Checkbox
          checked={selectedForTutor.includes(mat.id)}
          onCheckedChange={() => toggleMaterialForTutor(mat.id)}
          disabled={!mat.enabled}
        />
      </label>

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
          <div className={`${TEXT_BODY} truncate`} title={displayTitle}>
            {displayTitle}
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
        {getFileTypeLabel(mat.file_type)}
      </Badge>

      {/* Size */}
      <div className={TEXT_MUTED}>{formatSize(getMaterialSize(mat))}</div>

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
  );
}

function renderFolderNode(
  node: FolderNode,
  depth: number,
  pathPrefix: string,
  selectedForTutor: number[],
  editingId: number | null,
  editTitle: string,
  setEditTitle: (value: string) => void,
  setEditingId: (id: number | null) => void,
  saveEdit: () => void,
  toggleMaterialForTutor: (id: number) => void,
  toggleEnabled: (mat: Material) => void,
  deleteMutation: MutateDeleteLike,
  startEdit: (mat: Material) => void,
  deleteConfirm: number | null,
  setDeleteConfirm: (id: number | null) => void,
): JSX.Element[] {
  const childNames = Object.keys(node.children).sort((a, b) => a.localeCompare(b));
  const elements: JSX.Element[] = [];

  for (const folderName of childNames) {
    const child = node.children[folderName];
    const folderPath = pathPrefix ? `${pathPrefix}/${folderName}` : folderName;
    const nestedFilesCount = countFolderFiles(child);

    elements.push(
      <details key={folderPath} className="group" open={depth === 0}>
        <summary className={`${TEXT_BODY} px-2 py-1 border-b border-primary/15 text-muted-foreground hover:text-foreground cursor-pointer`}>
          <span className="inline-flex items-center gap-1">
            <span
              className="inline-block transition-transform duration-150 group-open:rotate-90"
              style={{ paddingLeft: `${(depth) * 0.9}rem` }}
            >
              ▸
            </span>
            <span className="font-terminal">{folderName}</span>
            <span className={TEXT_MUTED}>({nestedFilesCount})</span>
          </span>
        </summary>
        <div>{renderFolderNode(child, depth + 1, folderPath, selectedForTutor, editingId, editTitle, setEditTitle, setEditingId, saveEdit, toggleMaterialForTutor, toggleEnabled, deleteMutation, startEdit, deleteConfirm, setDeleteConfirm)}</div>
      </details>,
    );
  }

  for (const mat of node.files.sort((a, b) => getMaterialTitle(a).localeCompare(getMaterialTitle(b)))) {
    elements.push(
      renderMaterialRow(mat, depth, selectedForTutor, editingId, editTitle, setEditTitle, setEditingId, saveEdit, toggleMaterialForTutor, toggleEnabled, deleteMutation, startEdit, deleteConfirm, setDeleteConfirm)
    );
  }

  if (!elements.length && depth === 0) {
    elements.push(
      <div key="no-materials" className="text-center py-8">
        <FileText className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
        <div className={TEXT_MUTED}>No materials uploaded yet</div>
      </div>
    );
  }

  return elements;
}

export default function Library() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [materialsFolder, setMaterialsFolder] = useState("C:\\Users\\treyt\\OneDrive\\Desktop\\PT School");
  const [syncJobId, setSyncJobId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<TutorSyncJobStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [selectedForTutor, setSelectedForTutor] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem("tutor.selected_material_ids.v1");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.filter((v) => typeof v === "number");
      }
    } catch { /* ignore */ }
    return [];
  });

  const { data: materials = [], isLoading } = useQuery<Material[]>({
    queryKey: ["tutor-materials"],
    queryFn: () => api.tutor.getMaterials(),
  });

  const selectableMaterialIds = materials.filter((m) => m.enabled).map((m) => m.id);
  const allTutorMaterialsSelected = selectableMaterialIds.length > 0 &&
    selectableMaterialIds.every((id) => selectedForTutor.includes(id));

  useEffect(() => {
    try {
      localStorage.setItem("tutor.selected_material_ids.v1", JSON.stringify(selectedForTutor));
    } catch { /* ignore */ }
  }, [selectedForTutor]);

  useEffect(() => {
    if (!materials.length) return;
    setSelectedForTutor((ids) => ids.filter((id) => materials.some((m) => m.id === id)));
  }, [materials]);

  useEffect(() => {
    if (!syncJobId) return;

    let cancelled = false;
    let transientFailures = 0;

    const pollSyncStatus = async () => {
      try {
        const status = await api.tutor.getSyncMaterialsStatus(syncJobId);
        if (cancelled) return;
        transientFailures = 0;
        setSyncStatus(status);

        if (status.status === "completed" || status.status === "failed") {
          setSyncing(false);
          setSyncJobId(null);
          queryClient.invalidateQueries({ queryKey: ["tutor-materials"] });
          queryClient.invalidateQueries({ queryKey: ["tutor-content-sources"] });

          if (status.status === "completed") {
            const syncCount = Number(status.sync_result?.processed ?? status.processed ?? 0);
            const failedCount = Number(status.sync_result?.failed ?? status.errors ?? 0);
            const embedResult = status.embed_result as { embedded?: number } | null | undefined;
            const embedCount = Number(embedResult?.embedded ?? 0);
            const embedErrorResult = status.embed_result as { error?: string } | null | undefined;
            const embedError = (embedErrorResult?.error || "").trim();
            if (embedError) {
              toast.warning(
                `Sync complete: ${syncCount} processed, ${failedCount} failed. Embedding error: ${embedError}`,
              );
            } else if (failedCount > 0) {
              toast.warning(
                `Sync complete: ${syncCount} processed, ${failedCount} failed${embedCount > 0 ? `, ${embedCount} embedded` : ""}`,
              );
            } else {
              toast.success(`Synced ${syncCount} materials, embedded ${embedCount}`);
            }
          } else {
            toast.error(`Sync failed: ${status.last_error || "Unknown error"}`);
          }
          return;
        }
      } catch (err) {
        if (cancelled) return;
        transientFailures += 1;
        if (transientFailures < 5) {
          window.setTimeout(pollSyncStatus, 1500);
          return;
        }
        setSyncing(false);
        setSyncJobId(null);
        toast.error(`Sync status failed after retries: ${err instanceof Error ? err.message : "Unknown"}`);
        return;
      }

      if (!cancelled) {
        window.setTimeout(pollSyncStatus, 1500);
      }
    };

    pollSyncStatus();

    return () => {
      cancelled = true;
    };
  }, [syncJobId, queryClient]);

  const toggleMaterialForTutor = (id: number) => {
    setSelectedForTutor((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      return [...prev, id];
    });
  };

  const toggleAllMaterialsForTutor = () => {
    setSelectedForTutor(allTutorMaterialsSelected ? [] : selectableMaterialIds);
  };

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

  const clearMaterialsMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const results = await Promise.allSettled(ids.map((id) => api.tutor.deleteMaterial(id)));
      const failed = results.filter((r) => r.status === "rejected").length;
      return {
        deleted: ids.length - failed,
        failed,
        total: ids.length,
      };
    },
    onSuccess: ({ deleted, failed, total }) => {
      queryClient.invalidateQueries({ queryKey: ["tutor-materials"] });
      queryClient.invalidateQueries({ queryKey: ["tutor-content-sources"] });
      setSelectedForTutor([]);
      try {
        localStorage.setItem("tutor.selected_material_ids.v1", JSON.stringify([]));
      } catch { /* ignore */ }
      if (failed > 0) {
        toast.warning(`${deleted}/${total} materials deleted; ${failed} failed. Some files may still remain.`);
      } else {
        toast.success(`Deleted ${deleted} materials`);
      }
    },
    onError: (err) => {
      toast.error(`Clear failed: ${err instanceof Error ? err.message : "Unknown"}`);
    },
  });

  const startEdit = (mat: Material) => {
    setEditingId(mat.id);
    setEditTitle(getMaterialTitle(mat));
  };

  const saveEdit = () => {
    if (editingId === null || !editTitle.trim()) return;
    updateMutation.mutate({ id: editingId, data: { title: editTitle.trim() } });
  };

  const toggleEnabled = (mat: Material) => {
    updateMutation.mutate({ id: mat.id, data: { enabled: !mat.enabled } });
  };

  const startSync = async () => {
    const trimmedFolder = materialsFolder.trim();
    if (!trimmedFolder || syncing) return;

    setSyncing(true);
    setSyncStatus({
      job_id: "pending",
      status: "pending",
      phase: "pending",
      processed: 0,
      total: 0,
      index: 0,
      current_file: null,
      errors: 0,
      started_at: new Date().toISOString(),
    });

    try {
      const started = await api.tutor.startSyncMaterialsFolder({ folder_path: trimmedFolder });
      setSyncJobId(started.job_id);
      setSyncStatus((prev) => (prev ? { ...prev, job_id: started.job_id, folder: started.folder } : prev));
      toast.success("Sync started");
    } catch (err) {
      setSyncing(false);
      setSyncJobId(null);
      setSyncStatus(null);
      toast.error(`Sync failed: ${err instanceof Error ? err.message : "Unknown"}`);
    }
  };

  const syncProgressPercent = useMemo(() => {
    if (!syncStatus) return 0;
    const total = Number(syncStatus.total ?? 0);
    const indexed = Number(syncStatus.index ?? syncStatus.processed ?? 0);
    if (!Number.isFinite(total) || total <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((indexed / total) * 100)));
  }, [syncStatus]);

  const folderTree = useMemo(() => buildFolderTree(materials), [materials]);

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
        <Card className="bg-black/40 border-[3px] border-double border-primary rounded-none">
          <div className={PANEL_PADDING}>
            <div className={`${TEXT_PANEL_TITLE} mb-3`}>UPLOAD MATERIALS</div>
            <MaterialUploader />
          </div>
        </Card>

        <Card className="bg-black/40 border-[3px] border-double border-primary rounded-none">
          <div className={PANEL_PADDING}>
            <div className={`${TEXT_PANEL_TITLE} mb-3`}>SYNC STUDY FOLDER</div>
            <div className="grid gap-2">
              <input
                value={materialsFolder}
                onChange={(e) => setMaterialsFolder(e.target.value)}
                className={`${INPUT_BASE} border-[3px] border-double border-primary/30`}
                placeholder="C:\\Users\\...\\PT School"
              />
              <Button
                onClick={startSync}
                disabled={syncing || !materialsFolder.trim()}
                className={`w-fit ${BTN_PRIMARY} !text-white`}
              >
                {syncing ? (
                  <Loader2 className={`${ICON_SM} animate-spin mr-1`} />
                ) : (
                  <RefreshCw className={`${ICON_SM} mr-1`} />
                )}
                SYNC FOLDER TO TUTOR
              </Button>
              {(syncing || syncStatus) && (
                <div className="mt-2 border border-primary/20 bg-black/30 p-2 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className={TEXT_MUTED}>Status</span>
                    <span className="font-terminal !text-white uppercase">
                      {syncStatus?.status || (syncing ? "running" : "idle")}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-primary/15 overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${syncProgressPercent}%` }}
                    />
                  </div>
                  <div className={TEXT_MUTED}>
                    Processed {syncStatus?.processed ?? 0} / {syncStatus?.total ?? 0} files
                    {typeof syncStatus?.errors === "number" ? ` • errors ${syncStatus.errors}` : ""}
                  </div>
                  <div className={`${TEXT_MUTED} break-all`}>
                    Current:{" "}
                    <span className="!text-white">
                      {syncStatus?.current_file || (syncing ? "Scanning files..." : "Idle")}
                    </span>
                  </div>
                  {syncStatus?.last_error ? (
                    <div className="text-red-300 break-all">{syncStatus.last_error}</div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Materials table */}
        <Card className="bg-black/40 border-[3px] border-double border-primary rounded-none">
          <div className={PANEL_PADDING}>
            <div className={`${TEXT_PANEL_TITLE} mb-3`}>YOUR MATERIALS</div>
        <div className="flex items-center justify-between mb-3">
              <div className={TEXT_MUTED}>
                Tutor selected: {selectedForTutor.length} file{selectedForTutor.length === 1 ? "" : "s"}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  className="rounded-none h-7 px-3 font-terminal text-xs"
                  disabled={selectedForTutor.length === 0 || clearMaterialsMutation.isPending}
                  onClick={() => {
                    if (!selectedForTutor.length) return;
                    if (!window.confirm(`Delete ${selectedForTutor.length} selected materials from tutor library? This will not delete your local PT School files.`)) return;
                    clearMaterialsMutation.mutate([...selectedForTutor]);
                  }}
                >
                  {clearMaterialsMutation.isPending ? (
                    <Loader2 className={`${ICON_SM} animate-spin mr-1`} />
                  ) : (
                    <Trash2 className={`${ICON_SM} mr-1`} />
                  )}
                  CLEAR SELECTED
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="rounded-none h-7 px-3 font-terminal text-xs"
                  disabled={materials.length === 0 || clearMaterialsMutation.isPending}
                  onClick={() => {
                    const safeCount = materials.length;
                    if (!safeCount) return;
                    if (!window.confirm(`Delete all ${safeCount} materials from tutor library? This will not delete your local PT School files.`)) return;
                    clearMaterialsMutation.mutate(materials.map((m) => m.id));
                  }}
                >
                  {clearMaterialsMutation.isPending ? (
                    <Loader2 className={`${ICON_SM} animate-spin mr-1`} />
                  ) : (
                    <Trash2 className={`${ICON_SM} mr-1`} />
                  )}
                  CLEAR ALL MATERIALS
                </Button>
                <Link href="/tutor">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-none h-7 px-3 font-terminal text-xs"
                  >
                    OPEN TUTOR
                  </Button>
                </Link>
              </div>
            </div>

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
                <div className="grid grid-cols-[28px_1fr_60px_70px_80px_90px] gap-2 px-2 py-1 border-b border-primary/20">
                  <label
                    className="flex items-center justify-center cursor-pointer"
                    onClick={toggleAllMaterialsForTutor}
                    title={
                      allTutorMaterialsSelected ? "Unselect all tutor materials" : "Select all tutor materials"
                    }
                  >
                    <Checkbox
                      checked={allTutorMaterialsSelected}
                      onCheckedChange={toggleAllMaterialsForTutor}
                      disabled={selectableMaterialIds.length === 0}
                    />
                  </label>
                  <div className={TEXT_MUTED}>Title</div>
                  <div className={TEXT_MUTED}>Type</div>
                  <div className={TEXT_MUTED}>Size</div>
                  <div className={TEXT_MUTED}>Status</div>
                  <div className={`${TEXT_MUTED} text-right`}>Actions</div>
                </div>
                {renderFolderNode(
                  folderTree,
                  0,
                  "",
                  selectedForTutor,
                  editingId,
                  editTitle,
                  setEditTitle,
                  setEditingId,
                  saveEdit,
                  toggleMaterialForTutor,
                  toggleEnabled,
                  deleteMutation,
                  startEdit,
                  deleteConfirm,
                  setDeleteConfirm,
                )}
              </div>
            )}
          </div>
        </Card>
      </div>
    </Layout>
  );
}
