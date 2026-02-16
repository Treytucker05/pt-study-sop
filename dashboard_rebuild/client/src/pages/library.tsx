import Layout from "@/components/layout";
import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Material, TutorSyncJobStatus, AutoLinkResult } from "@/lib/api";
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
  Link2,
  Folder,
  FolderOpen,
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
const ALL_FOLDERS_KEY = "";

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

interface FolderListItem {
  path: string;
  name: string;
  depth: number;
  filesCount: number;
}

function getFolderNode(root: FolderNode, folderPath: string): FolderNode | null {
  if (!folderPath) return root;
  const parts = folderPath.split("/").filter(Boolean);
  let node: FolderNode | undefined = root;
  for (const part of parts) {
    node = node?.children[part];
    if (!node) return null;
  }
  return node;
}

function collectFolderMaterials(node: FolderNode): Material[] {
  const collected = [...node.files];
  for (const child of Object.values(node.children)) {
    collected.push(...collectFolderMaterials(child));
  }
  return collected;
}

function flattenFolders(
  node: FolderNode,
  depth = 0,
  pathPrefix = "",
): FolderListItem[] {
  const names = Object.keys(node.children).sort((a, b) => a.localeCompare(b));
  const items: FolderListItem[] = [];
  for (const name of names) {
    const child = node.children[name];
    const path = pathPrefix ? `${pathPrefix}/${name}` : name;
    items.push({
      path,
      name,
      depth,
      filesCount: countFolderFiles(child),
    });
    items.push(...flattenFolders(child, depth + 1, path));
  }
  return items;
}

function renderMaterialRow(
  mat: Material,
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
  const folderLabel = getMaterialFolder(mat);

  return (
    <div
      key={mat.id}
      className={`grid gap-2 px-2 py-1.5 items-center border-b border-primary/10 hover:bg-primary/5 transition-colors ${!mat.enabled ? "opacity-50" : ""}`}
      style={{ gridTemplateColumns: "28px minmax(210px,1.6fr) minmax(140px,1fr) 64px 72px 84px 92px" }}
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

      {/* Folder */}
      <div className={`${TEXT_MUTED} truncate`} title={folderLabel}>
        {folderLabel}
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

export default function Library() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [materialsFolder, setMaterialsFolder] = useState("C:\\Users\\treyt\\OneDrive\\Desktop\\PT School");
  const [syncJobId, setSyncJobId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<TutorSyncJobStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [selectedFolderPath, setSelectedFolderPath] = useState<string>(ALL_FOLDERS_KEY);
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

  const folderTree = useMemo(() => buildFolderTree(materials), [materials]);
  const folderItems = useMemo(() => flattenFolders(folderTree), [folderTree]);
  const selectedFolderNode = useMemo(
    () => getFolderNode(folderTree, selectedFolderPath),
    [folderTree, selectedFolderPath],
  );
  const visibleMaterials = useMemo(() => {
    if (!selectedFolderNode) return [];
    return collectFolderMaterials(selectedFolderNode).sort((a, b) =>
      getMaterialTitle(a).localeCompare(getMaterialTitle(b)),
    );
  }, [selectedFolderNode]);
  const selectedFolderLabel = selectedFolderPath || "All Materials";

  const selectedForTutorSet = useMemo(() => new Set(selectedForTutor), [selectedForTutor]);
  const selectableVisibleMaterialIds = useMemo(
    () => visibleMaterials.filter((m) => m.enabled).map((m) => m.id),
    [visibleMaterials],
  );
  const selectedVisibleMaterialIds = useMemo(
    () => visibleMaterials.filter((m) => selectedForTutorSet.has(m.id)).map((m) => m.id),
    [visibleMaterials, selectedForTutorSet],
  );
  const allTutorMaterialsSelected = selectableVisibleMaterialIds.length > 0 &&
    selectableVisibleMaterialIds.every((id) => selectedForTutorSet.has(id));

  useEffect(() => {
    try {
      localStorage.setItem("tutor.selected_material_ids.v1", JSON.stringify(selectedForTutor));
    } catch { /* ignore */ }
  }, [selectedForTutor]);

  useEffect(() => {
    if (isLoading) return;
    setSelectedForTutor((ids) => ids.filter((id) => materials.some((m) => m.id === id)));
    if (selectedFolderPath !== ALL_FOLDERS_KEY && !getFolderNode(folderTree, selectedFolderPath)) {
      setSelectedFolderPath(ALL_FOLDERS_KEY);
    }
  }, [isLoading, materials, selectedFolderPath, folderTree]);

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

          // Auto-link newly synced materials to courses
          if (status.status === "completed") {
            api.tutor.autoLinkMaterials().then(() => {
              queryClient.invalidateQueries({ queryKey: ["tutor-materials"] });
              queryClient.invalidateQueries({ queryKey: ["tutor-content-sources"] });
            }).catch(() => { /* silent — link button is available as fallback */ });
          }

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
    setSelectedForTutor((prev) => {
      if (!selectableVisibleMaterialIds.length) return prev;
      const next = new Set(prev);
      if (allTutorMaterialsSelected) {
        for (const id of selectableVisibleMaterialIds) next.delete(id);
      } else {
        for (const id of selectableVisibleMaterialIds) next.add(id);
      }
      return [...next];
    });
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
    onSuccess: ({ deleted, failed, total }, ids) => {
      queryClient.invalidateQueries({ queryKey: ["tutor-materials"] });
      queryClient.invalidateQueries({ queryKey: ["tutor-content-sources"] });
      setSelectedForTutor((prev) => prev.filter((id) => !ids.includes(id)));
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

  const autoLinkMutation = useMutation({
    mutationFn: () => api.tutor.autoLinkMaterials(),
    onSuccess: (result: AutoLinkResult) => {
      queryClient.invalidateQueries({ queryKey: ["tutor-materials"] });
      queryClient.invalidateQueries({ queryKey: ["tutor-content-sources"] });
      if (result.linked > 0) {
        const mappingStr = Object.entries(result.mappings)
          .map(([folder, course]) => `${folder} → ${course}`)
          .join(", ");
        toast.success(`Linked ${result.linked} materials to courses (${mappingStr})`);
      } else {
        toast.info("No unlinked materials to link");
      }
    },
    onError: (err) => {
      toast.error(`Auto-link failed: ${err instanceof Error ? err.message : "Unknown"}`);
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

  return (
    <Layout>
      <div className="space-y-3 h-full min-h-[72vh] flex flex-col">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className={ICON_MD} />
            <h1 className={TEXT_PAGE_TITLE}>MATERIALS LIBRARY</h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`${TEXT_BADGE} h-5 px-2`}>
              {materials.length} files
            </Badge>
            <Badge variant="outline" className={`${TEXT_BADGE} h-5 px-2`}>
              {folderItems.length} folders
            </Badge>
          </div>
        </div>

        <div className="brain-workspace brain-workspace--ready relative flex-1 min-h-[70vh] w-full overflow-hidden">
          <div className="flex flex-col lg:flex-row h-full min-h-0">
            <aside className="brain-workspace__sidebar-wrap w-full lg:w-80 shrink-0 border-b lg:border-b-0 lg:border-r border-primary/30 bg-black/40 flex flex-col min-h-0 max-h-[40vh] lg:max-h-none">
              <div className={`${PANEL_PADDING} border-b border-primary/20`}>
                <div className={`${TEXT_PANEL_TITLE} mb-2`}>VAULT FOLDERS</div>
                <div className={TEXT_MUTED}>Mirror your Obsidian-style folder tree.</div>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                <button
                  className={`w-full rounded-none border px-2 py-1.5 text-left text-sm font-terminal flex items-center gap-2 transition-colors ${
                    selectedFolderPath === ALL_FOLDERS_KEY
                      ? "border-primary/60 bg-primary/20 text-primary"
                      : "border-primary/15 text-muted-foreground hover:text-foreground hover:border-primary/40"
                  }`}
                  onClick={() => setSelectedFolderPath(ALL_FOLDERS_KEY)}
                  type="button"
                >
                  <FolderOpen className={ICON_SM} />
                  <span className="truncate flex-1">All Materials</span>
                  <span className="text-[11px]">{materials.length}</span>
                </button>
                {folderItems.map((folder) => {
                  const isSelected = selectedFolderPath === folder.path;
                  return (
                    <button
                      key={folder.path}
                      className={`w-full rounded-none border pr-2 py-1.5 text-left text-sm font-terminal flex items-center gap-2 transition-colors ${
                        isSelected
                          ? "border-primary/60 bg-primary/20 text-primary"
                          : "border-primary/15 text-muted-foreground hover:text-foreground hover:border-primary/40"
                      }`}
                      style={{ paddingLeft: `${0.65 + folder.depth * 0.85}rem` }}
                      onClick={() => setSelectedFolderPath(folder.path)}
                      type="button"
                      title={folder.path}
                    >
                      {isSelected ? <FolderOpen className={ICON_SM} /> : <Folder className={ICON_SM} />}
                      <span className="truncate flex-1">{folder.name}</span>
                      <span className="text-[11px]">{folder.filesCount}</span>
                    </button>
                  );
                })}
                {!folderItems.length && materials.length === 0 ? (
                  <div className={`${TEXT_MUTED} px-2 py-3 text-xs`}>Sync a folder or upload files to populate this rail.</div>
                ) : null}
              </div>
            </aside>

            <section className="brain-workspace__main-wrap brain-workspace__canvas flex-1 min-h-0 flex flex-col overflow-hidden">
              <div className="border-b border-primary/20 bg-black/30">
                <div className={`${PANEL_PADDING} grid gap-3 lg:grid-cols-[minmax(340px,1fr)_minmax(380px,1.2fr)]`}>
                  <div className="border border-primary/25 bg-black/30 p-3 space-y-2">
                    <div className={TEXT_PANEL_TITLE}>UPLOAD MATERIALS</div>
                    <MaterialUploader />
                  </div>

                  <div className="border border-primary/25 bg-black/30 p-3 space-y-2">
                    <div className={TEXT_PANEL_TITLE}>SYNC STUDY FOLDER</div>
                    <input
                      value={materialsFolder}
                      onChange={(e) => setMaterialsFolder(e.target.value)}
                      className={INPUT_BASE}
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
                      <div className="mt-1 border border-primary/20 bg-black/30 p-2 space-y-1 text-xs">
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
              </div>

              <div className={`${PANEL_PADDING} flex-1 min-h-0 flex flex-col gap-3`}>
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-1">
                    <div className={TEXT_PANEL_TITLE}>YOUR MATERIALS</div>
                    <div className={TEXT_MUTED}>
                      Folder: <span className="!text-white font-terminal">{selectedFolderLabel}</span> • showing {visibleMaterials.length} file{visibleMaterials.length === 1 ? "" : "s"}
                    </div>
                    <div className={TEXT_MUTED}>
                      Tutor selected in view: {selectedVisibleMaterialIds.length} file{selectedVisibleMaterialIds.length === 1 ? "" : "s"}
                      {selectedForTutor.length > selectedVisibleMaterialIds.length
                        ? ` • total selected ${selectedForTutor.length}`
                        : ""}
                    </div>
                  </div>
                  <div className="flex items-center flex-wrap gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      className="rounded-none h-7 px-3 font-terminal text-xs"
                      disabled={selectedVisibleMaterialIds.length === 0 || clearMaterialsMutation.isPending}
                      onClick={() => {
                        if (!selectedVisibleMaterialIds.length) return;
                        if (!window.confirm(`Delete ${selectedVisibleMaterialIds.length} selected materials from the current folder view? This will not delete your local PT School files.`)) return;
                        clearMaterialsMutation.mutate([...selectedVisibleMaterialIds]);
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
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-none h-7 px-3 font-terminal text-xs"
                      disabled={autoLinkMutation.isPending || materials.length === 0}
                      onClick={() => autoLinkMutation.mutate()}
                    >
                      {autoLinkMutation.isPending ? (
                        <Loader2 className={`${ICON_SM} animate-spin mr-1`} />
                      ) : (
                        <Link2 className={`${ICON_SM} mr-1`} />
                      )}
                      LINK TO COURSES
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

                <div className="flex-1 min-h-0 border border-primary/25 bg-black/30 overflow-hidden">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className={`${ICON_MD} animate-spin text-muted-foreground`} />
                    </div>
                  ) : materials.length === 0 ? (
                    <div className="text-center py-10">
                      <FileText className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                      <div className={TEXT_MUTED}>No materials uploaded yet</div>
                      <div className={`${TEXT_MUTED} opacity-60`}>
                        Upload PDF, DOCX, PPTX, MD, or TXT files above
                      </div>
                    </div>
                  ) : visibleMaterials.length === 0 ? (
                    <div className="text-center py-10">
                      <FileText className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                      <div className={TEXT_MUTED}>No materials found in this folder view.</div>
                    </div>
                  ) : (
                    <div className="h-full min-h-0 overflow-auto">
                      <div className="min-w-[900px]">
                        <div
                          className="grid gap-2 px-2 py-1 border-b border-primary/20 bg-black/60 sticky top-0 z-10"
                          style={{ gridTemplateColumns: "28px minmax(210px,1.6fr) minmax(140px,1fr) 64px 72px 84px 92px" }}
                        >
                          <label
                            className="flex items-center justify-center cursor-pointer"
                            onClick={toggleAllMaterialsForTutor}
                            title={
                              allTutorMaterialsSelected ? "Unselect all visible tutor materials" : "Select all visible tutor materials"
                            }
                          >
                            <Checkbox
                              checked={allTutorMaterialsSelected}
                              onCheckedChange={toggleAllMaterialsForTutor}
                              disabled={selectableVisibleMaterialIds.length === 0}
                            />
                          </label>
                          <div className={TEXT_MUTED}>Title</div>
                          <div className={TEXT_MUTED}>Folder</div>
                          <div className={TEXT_MUTED}>Type</div>
                          <div className={TEXT_MUTED}>Size</div>
                          <div className={TEXT_MUTED}>Status</div>
                          <div className={`${TEXT_MUTED} text-right`}>Actions</div>
                        </div>
                        {visibleMaterials.map((mat) => (
                          renderMaterialRow(
                            mat,
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
                          )
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </Layout>
  );
}
