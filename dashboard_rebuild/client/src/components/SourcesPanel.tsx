import { useState, useRef, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Upload, FolderPlus, RefreshCw, RotateCcw, Target, Pencil, Trash2, X,
  ChevronRight, ChevronDown,
  FileText as FileTextIcon, Folder as FolderIcon,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Material } from "@/lib/api";
import { toast } from "sonner";
import type { SourceTab, NorthStarSummary, VaultEditorState } from "./TutorChat.types";
import { _basename, _parentPath, _defaultNoteContent } from "./TutorChat.types";
import { AnkiIntegration } from "./AnkiIntegration";

const VAULT_TREE_INDENT = 16;

interface VaultTreeRowProps {
  fullPath: string;
  name: string;
  isFolder: boolean;
  depth: number;
  checked: boolean;
  expanded: boolean;
  onTogglePath: (path: string) => void;
  onToggleFolder: (path: string) => void;
}

function VaultTreeRow({
  fullPath,
  name,
  isFolder,
  depth,
  checked,
  expanded,
  onTogglePath,
  onToggleFolder,
}: VaultTreeRowProps) {
  return (
    <div
      className={`flex items-center gap-2 py-1 pr-2 border text-xs font-terminal ${
        checked
          ? "border-primary/60 bg-primary/10 text-foreground"
          : "border-secondary/30 text-muted-foreground hover:border-secondary/60 hover:text-foreground"
      }`}
      style={{ paddingLeft: `${8 + depth * VAULT_TREE_INDENT}px` }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={() => onTogglePath(fullPath)}
        className="h-3.5 w-3.5 accent-red-500 shrink-0"
      />
      {isFolder ? (
        <button
          type="button"
          onClick={() => onToggleFolder(fullPath)}
          className="flex items-center gap-1 min-w-0 flex-1"
        >
          {expanded ? (
            <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
          )}
          <FolderIcon className="w-3.5 h-3.5 text-primary/70 shrink-0" />
          <span className="truncate">{name}</span>
        </button>
      ) : (
        <>
          <span className="w-3 shrink-0" />
          <FileTextIcon className="w-3.5 h-3.5 text-primary/70 shrink-0" />
          <span className="truncate">{name}</span>
        </>
      )}
    </div>
  );
}

interface VaultTreeChildrenProps {
  folderPath: string;
  depth: number;
  selectedPaths: string[];
  expandedFolders: Set<string>;
  onTogglePath: (path: string) => void;
  onToggleFolder: (path: string) => void;
  searchQuery: string;
  refreshToken: number;
  enabled: boolean;
}

function VaultTreeChildren({
  folderPath,
  depth,
  selectedPaths,
  expandedFolders,
  onTogglePath,
  onToggleFolder,
  searchQuery,
  refreshToken,
  enabled,
}: VaultTreeChildrenProps) {
  const { data } = useQuery({
    queryKey: ["tutor", "obsidian", "files", folderPath, refreshToken],
    queryFn: () => api.obsidian.getFiles(folderPath),
    enabled,
  });

  const entries = Array.isArray(data?.files) ? data.files : [];
  const q = searchQuery.trim().toLowerCase();

  return (
    <>
      {entries.map((entry) => {
        const trimmed = String(entry || "").trim();
        if (!trimmed) return null;
        const isFolder = trimmed.endsWith("/");
        const cleaned = trimmed.replace(/\/$/, "");
        const name = _basename(cleaned);
        const fullPath = folderPath ? `${folderPath}/${name}` : name;
        if (q && !fullPath.toLowerCase().includes(q)) return null;
        const expanded = isFolder ? expandedFolders.has(fullPath) : false;

        return (
          <div key={fullPath}>
            <VaultTreeRow
              fullPath={fullPath}
              name={name}
              isFolder={isFolder}
              depth={depth}
              checked={selectedPaths.includes(fullPath)}
              expanded={expanded}
              onTogglePath={onTogglePath}
              onToggleFolder={onToggleFolder}
            />
            {isFolder && expanded && (
              <VaultTreeChildren
                folderPath={fullPath}
                depth={depth + 1}
                selectedPaths={selectedPaths}
                expandedFolders={expandedFolders}
                onTogglePath={onTogglePath}
                onToggleFolder={onToggleFolder}
                searchQuery={searchQuery}
                refreshToken={refreshToken}
                enabled={enabled}
              />
            )}
          </div>
        );
      })}
    </>
  );
}

interface SourcesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  availableMaterials: Material[];
  selectedMaterialIds: number[];
  onSelectedMaterialIdsChange: (ids: number[]) => void;
  onUploadFiles: (files: FileList | null) => Promise<void>;
  isUploadingMaterial: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  selectedVaultPaths: string[];
  onSelectedVaultPathsChange: (paths: string[]) => void;
  northStarSummary: NorthStarSummary | null;
  isStreaming: boolean;
}

export function SourcesPanel(props: SourcesPanelProps) {
  const [sourcesTab, setSourcesTab] = useState<SourceTab | "objectives" | "flashcards">("materials");
  const [isDragActive, setIsDragActive] = useState(false);
  const [vaultSearch, setVaultSearch] = useState("");
  const [vaultRefreshToken, setVaultRefreshToken] = useState(0);
  const [expandedVaultFolders, setExpandedVaultFolders] = useState<Set<string>>(new Set());
  const [checkedObjectives, setCheckedObjectives] = useState<Set<string>>(new Set());
  const [vaultEditor, setVaultEditor] = useState<VaultEditorState>({
    open: false,
    path: "",
    content: "",
    saving: false,
  });

  const {
    data: vaultRootData,
    isFetching: isLoadingVault,
    error: vaultLoadError,
  } = useQuery({
    queryKey: ["tutor", "obsidian", "files", "root", vaultRefreshToken],
    queryFn: () => api.obsidian.getFiles(""),
    enabled: props.isOpen && sourcesTab === "vault",
  });

  const vaultRootEntries = useMemo(() => {
    return Array.isArray(vaultRootData?.files) ? vaultRootData.files : [];
  }, [vaultRootData]);

  const filteredVaultRootEntries = useMemo(() => {
    const q = vaultSearch.trim().toLowerCase();
    if (!q) return vaultRootEntries;
    return vaultRootEntries.filter((entry) => {
      const raw = String(entry || "").trim();
      if (!raw) return false;
      if (raw.endsWith("/")) return true;
      return raw.toLowerCase().includes(q);
    });
  }, [vaultRootEntries, vaultSearch]);

  const { data: ankiDrafts = [] } = useQuery({
    queryKey: ["anki", "drafts"],
    queryFn: api.anki.getDrafts,
    enabled: props.isOpen && sourcesTab === "flashcards",
  });

  const toggleMaterial = useCallback(
    (materialId: number) => {
      if (props.selectedMaterialIds.includes(materialId)) {
        props.onSelectedMaterialIdsChange(props.selectedMaterialIds.filter((id) => id !== materialId));
        return;
      }
      props.onSelectedMaterialIdsChange([...props.selectedMaterialIds, materialId]);
    },
    [props.onSelectedMaterialIdsChange, props.selectedMaterialIds],
  );

  const selectAllMaterials = useCallback(() => {
    props.onSelectedMaterialIdsChange(props.availableMaterials.map((m) => m.id));
  }, [props.availableMaterials, props.onSelectedMaterialIdsChange]);

  const clearSelectedMaterials = useCallback(() => {
    props.onSelectedMaterialIdsChange([]);
  }, [props.onSelectedMaterialIdsChange]);

  const toggleObjectiveCheck = useCallback((objectiveId: string) => {
    setCheckedObjectives((prev) => {
      const next = new Set(prev);
      if (next.has(objectiveId)) {
        next.delete(objectiveId);
      } else {
        next.add(objectiveId);
      }
      return next;
    });
  }, []);

  const toggleVaultPath = useCallback((path: string) => {
    const prev = props.selectedVaultPaths;
    props.onSelectedVaultPathsChange(
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path],
    );
  }, [props.selectedVaultPaths, props.onSelectedVaultPathsChange]);

  const toggleVaultFolder = useCallback((path: string) => {
    setExpandedVaultFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const refreshVaultTree = useCallback(() => {
    setExpandedVaultFolders(new Set());
    setVaultRefreshToken((prev) => prev + 1);
  }, []);

  const openVaultEditor = useCallback(async (path: string, initialContent?: string) => {
    const normalized = String(path || "").trim();
    if (!normalized) return;
    if (typeof initialContent === "string") {
      setVaultEditor({ open: true, path: normalized, content: initialContent, saving: false });
      return;
    }
    try {
      const res = await api.obsidian.getFile(normalized);
      if (!res.success) {
        toast.error(res.error || "Failed to load file");
        return;
      }
      setVaultEditor({
        open: true,
        path: normalized,
        content: String(res.content || ""),
        saving: false,
      });
    } catch (err) {
      toast.error(`Failed to load note: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }, []);

  const handleCreateVaultFolder = useCallback(async () => {
    const base =
      props.selectedVaultPaths.length === 1 && !props.selectedVaultPaths[0].toLowerCase().endsWith(".md")
        ? props.selectedVaultPaths[0]
        : "";
    const suggestion = base ? `${base}/New Folder` : "Study notes/New Folder";
    const inputPath = window.prompt("Create folder path:", suggestion);
    if (!inputPath) return;
    try {
      const res = await api.obsidian.createFolder(inputPath);
      if (!res.success) {
        toast.error(res.error || "Failed to create folder");
        return;
      }
      toast.success(`Folder created: ${res.path || inputPath}`);
      refreshVaultTree();
    } catch (err) {
      toast.error(`Create folder failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }, [refreshVaultTree, props.selectedVaultPaths]);

  const handleCreateVaultNote = useCallback(async () => {
    const base =
      props.selectedVaultPaths.length === 1 && !props.selectedVaultPaths[0].toLowerCase().endsWith(".md")
        ? props.selectedVaultPaths[0]
        : props.selectedVaultPaths.length === 1
          ? _parentPath(props.selectedVaultPaths[0])
          : "";
    const suggestion = base ? `${base}/New_Note.md` : "Study notes/New_Note.md";
    const inputPath = window.prompt("Create note path (.md):", suggestion);
    if (!inputPath) return;
    const normalized = inputPath.trim().endsWith(".md") ? inputPath.trim() : `${inputPath.trim()}.md`;
    const content = _defaultNoteContent(normalized);
    try {
      const res = await api.obsidian.saveFile(normalized, content);
      if (!res.success) {
        toast.error(res.error || "Failed to create note");
        return;
      }
      props.onSelectedVaultPathsChange([normalized]);
      toast.success(`Note created: ${normalized}`);
      refreshVaultTree();
      await openVaultEditor(normalized, content);
    } catch (err) {
      toast.error(`Create note failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }, [openVaultEditor, refreshVaultTree, props.selectedVaultPaths, props.onSelectedVaultPathsChange]);

  const handleEditSelectedVaultNote = useCallback(async () => {
    if (props.selectedVaultPaths.length !== 1) {
      toast.error("Select exactly one note to edit.");
      return;
    }
    const path = props.selectedVaultPaths[0];
    if (!path.toLowerCase().endsWith(".md")) {
      toast.error("Only markdown notes can be edited.");
      return;
    }
    await openVaultEditor(path);
  }, [openVaultEditor, props.selectedVaultPaths]);

  const handleRenameSelectedVaultPath = useCallback(async () => {
    if (props.selectedVaultPaths.length !== 1) {
      toast.error("Select exactly one file or folder to rename.");
      return;
    }
    const currentPath = props.selectedVaultPaths[0];
    const nextPath = window.prompt("Rename/move to:", currentPath);
    if (!nextPath || nextPath.trim() === currentPath) return;
    try {
      const res = await api.obsidian.movePath(currentPath, nextPath.trim());
      if (!res.success) {
        toast.error(res.error || "Move failed");
        return;
      }
      props.onSelectedVaultPathsChange([nextPath.trim()]);
      toast.success("Path updated.");
      refreshVaultTree();
    } catch (err) {
      toast.error(`Move failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }, [refreshVaultTree, props.selectedVaultPaths, props.onSelectedVaultPathsChange]);

  const handleDeleteSelectedVaultPaths = useCallback(async () => {
    if (props.selectedVaultPaths.length === 0) {
      toast.error("Select at least one path to delete.");
      return;
    }
    const confirmDelete = window.confirm(
      `Delete ${props.selectedVaultPaths.length} selected path(s)? This cannot be undone.`,
    );
    if (!confirmDelete) return;

    const failures: string[] = [];
    for (const path of props.selectedVaultPaths) {
      try {
        const isNote = path.toLowerCase().endsWith(".md");
        const res = isNote
          ? await api.obsidian.deleteFile(path)
          : await api.obsidian.deleteFolder(path, true);
        if (!res.success) failures.push(`${path}: ${res.error || "delete failed"}`);
      } catch (err) {
        failures.push(`${path}: ${err instanceof Error ? err.message : "delete failed"}`);
      }
    }

    if (failures.length > 0) {
      toast.error(`Some deletes failed (${failures.length}).`);
    } else {
      toast.success("Selected paths deleted.");
    }
    props.onSelectedVaultPathsChange([]);
    refreshVaultTree();
  }, [refreshVaultTree, props.selectedVaultPaths, props.onSelectedVaultPathsChange]);

  const handleSaveVaultEditor = useCallback(async () => {
    if (!vaultEditor.path.trim()) return;
    setVaultEditor((prev) => ({ ...prev, saving: true }));
    try {
      const res = await api.obsidian.saveFile(vaultEditor.path, vaultEditor.content);
      if (!res.success) {
        toast.error(res.error || "Failed to save note");
        setVaultEditor((prev) => ({ ...prev, saving: false }));
        return;
      }
      toast.success("Note saved.");
      props.onSelectedVaultPathsChange([vaultEditor.path]);
      setVaultEditor((prev) => ({ ...prev, saving: false, open: false }));
      refreshVaultTree();
    } catch (err) {
      toast.error(`Save failed: ${err instanceof Error ? err.message : "Unknown error"}`);
      setVaultEditor((prev) => ({ ...prev, saving: false }));
    }
  }, [refreshVaultTree, vaultEditor.content, vaultEditor.path, props.onSelectedVaultPathsChange]);

  if (!props.isOpen) return null;

  return (
    <div className="absolute inset-0 z-40 bg-black/50">
      <aside className="absolute left-0 top-0 h-full w-full max-w-md border-r-2 border-primary bg-black/95 flex flex-col">
        <div className="flex items-center gap-2 p-3 border-b border-primary/30">
          <div className="font-arcade text-xs text-primary tracking-wider">SOURCES</div>
          <Badge variant="outline" className="rounded-none h-5 px-1.5 text-[10px] border-primary/40">
            {sourcesTab.toUpperCase()}
          </Badge>
          <Button
            type="button"
            variant="ghost"
            onClick={props.onClose}
            className="ml-auto h-8 w-8 p-0 rounded-none border-2 border-secondary/40 text-muted-foreground hover:border-secondary hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="grid grid-cols-5 gap-1 p-2 border-b border-primary/20">
          <button
            type="button"
            onClick={() => setSourcesTab("materials")}
            className={`h-8 px-2 font-arcade text-[10px] border-2 ${
              sourcesTab === "materials"
                ? "border-primary text-primary bg-primary/10"
                : "border-secondary/40 text-muted-foreground hover:border-secondary hover:text-foreground"
            }`}
          >
            MATERIALS
          </button>
          <button
            type="button"
            onClick={() => setSourcesTab("vault")}
            className={`h-8 px-2 font-arcade text-[10px] border-2 ${
              sourcesTab === "vault"
                ? "border-primary text-primary bg-primary/10"
                : "border-secondary/40 text-muted-foreground hover:border-secondary hover:text-foreground"
            }`}
          >
            VAULT
          </button>
          <button
            type="button"
            onClick={() => setSourcesTab("objectives")}
            className={`h-8 px-1 font-arcade text-[9px] border-2 ${
              sourcesTab === "objectives"
                ? "border-primary text-primary bg-primary/10"
                : "border-secondary/40 text-muted-foreground hover:border-secondary hover:text-foreground"
            }`}
          >
            OBJECTIVES
          </button>
          <button
            type="button"
            onClick={() => setSourcesTab("flashcards")}
            className={`h-8 px-1 font-arcade text-[9px] border-2 ${
              sourcesTab === "flashcards"
                ? "border-primary text-primary bg-primary/10"
                : "border-secondary/40 text-muted-foreground hover:border-secondary hover:text-foreground"
            }`}
          >
            FLASHCARDS
          </button>
          <button
            type="button"
            onClick={() => setSourcesTab("map_of_contents")}
            className={`h-8 px-2 font-arcade text-[10px] border-2 ${
              sourcesTab === "map_of_contents"
                ? "border-primary text-primary bg-primary/10"
                : "border-secondary/40 text-muted-foreground hover:border-secondary hover:text-foreground"
            }`}
          >
            MAP
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
          {sourcesTab === "materials" && (
            <>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragActive(true);
                }}
                onDragLeave={() => setIsDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragActive(false);
                  void props.onUploadFiles(e.dataTransfer.files);
                }}
                className={`border-2 border-dashed px-3 py-2 text-xs font-terminal ${
                  isDragActive ? "border-primary text-primary bg-primary/10" : "border-secondary/40 text-muted-foreground"
                }`}
              >
                <Upload className="w-3.5 h-3.5 inline mr-1.5" />
                Drag file here to add to chat + library.
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => props.fileInputRef.current?.click()}
                  disabled={props.isUploadingMaterial}
                  className="h-8 rounded-none px-3 font-arcade text-[10px] gap-1.5 border-2 border-primary/60 bg-primary/10 hover:bg-primary/20"
                >
                  {props.isUploadingMaterial ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FolderPlus className="w-3.5 h-3.5" />
                  )}
                  ADD FILE
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={selectAllMaterials}
                  className="h-8 rounded-none px-3 font-arcade text-[10px] border-2 border-secondary/40 text-muted-foreground hover:border-secondary hover:text-foreground"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1" />
                  ALL
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={clearSelectedMaterials}
                  className="h-8 rounded-none px-3 font-arcade text-[10px] border-2 border-secondary/40 text-muted-foreground hover:border-secondary hover:text-foreground"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  NONE
                </Button>
              </div>
              <div className="max-h-[48vh] overflow-y-auto space-y-1 pr-1">
                {props.availableMaterials.map((material) => {
                  const checked = props.selectedMaterialIds.includes(material.id);
                  return (
                    <label
                      key={material.id}
                      className={`flex items-center gap-2 px-2 py-1 border text-xs font-terminal cursor-pointer ${
                        checked
                          ? "border-primary/60 bg-primary/10 text-foreground"
                          : "border-secondary/30 text-muted-foreground hover:border-secondary/60 hover:text-foreground"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleMaterial(material.id)}
                        className="h-3.5 w-3.5 accent-red-500"
                      />
                      <span className="truncate">
                        {material.title || `Material ${material.id}`}{" "}
                        <span className="opacity-60">({material.file_type || "file"})</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </>
          )}

          {sourcesTab === "vault" && (
            <>
              <div className="flex gap-2">
                <input
                  value={vaultSearch}
                  onChange={(e) => setVaultSearch(e.target.value)}
                  placeholder="Search vault paths..."
                  className="flex-1 h-9 bg-black border-2 border-secondary px-2 text-xs font-terminal text-foreground focus:border-primary focus:outline-none"
                />
                <Button
                  type="button"
                  variant="ghost"
                  onClick={refreshVaultTree}
                  disabled={isLoadingVault}
                  className="h-9 rounded-none px-3 font-arcade text-[10px] border-2 border-secondary/40 text-muted-foreground hover:border-secondary hover:text-foreground"
                >
                  {isLoadingVault ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => void handleCreateVaultFolder()}
                  className="h-8 rounded-none px-3 font-arcade text-[10px] border-2 border-secondary/40 text-muted-foreground hover:border-secondary hover:text-foreground"
                >
                  <FolderPlus className="w-3.5 h-3.5 mr-1" />
                  NEW FOLDER
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => void handleCreateVaultNote()}
                  className="h-8 rounded-none px-3 font-arcade text-[10px] border-2 border-secondary/40 text-muted-foreground hover:border-secondary hover:text-foreground"
                >
                  <FileTextIcon className="w-3.5 h-3.5 mr-1" />
                  NEW NOTE
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => void handleEditSelectedVaultNote()}
                  className="h-8 rounded-none px-3 font-arcade text-[10px] border-2 border-secondary/40 text-muted-foreground hover:border-secondary hover:text-foreground"
                >
                  <Pencil className="w-3.5 h-3.5 mr-1" />
                  EDIT
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => void handleRenameSelectedVaultPath()}
                  className="h-8 rounded-none px-3 font-arcade text-[10px] border-2 border-secondary/40 text-muted-foreground hover:border-secondary hover:text-foreground"
                >
                  RENAME
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => props.onSelectedVaultPathsChange([])}
                  className="h-8 rounded-none px-3 font-arcade text-[10px] border-2 border-secondary/40 text-muted-foreground hover:border-secondary hover:text-foreground"
                >
                  CLEAR SELECTED
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => void handleDeleteSelectedVaultPaths()}
                  className="h-8 rounded-none px-3 font-arcade text-[10px] border-2 border-red-500/50 text-red-300 hover:border-red-400 hover:text-red-200"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  DELETE
                </Button>
              </div>
              {vaultEditor.open ? (
                <div className="border border-primary/30 p-2 space-y-2">
                  <div className="font-arcade text-[10px] text-primary">EDIT NOTE</div>
                  <input
                    value={vaultEditor.path}
                    onChange={(e) =>
                      setVaultEditor((prev) => ({ ...prev, path: e.target.value }))
                    }
                    className="w-full h-8 bg-black border border-secondary px-2 text-xs font-terminal text-foreground focus:border-primary focus:outline-none"
                  />
                  <textarea
                    value={vaultEditor.content}
                    onChange={(e) =>
                      setVaultEditor((prev) => ({ ...prev, content: e.target.value }))
                    }
                    className="w-full min-h-[220px] bg-black border border-secondary px-2 py-2 text-xs font-terminal text-foreground focus:border-primary focus:outline-none resize-y"
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={() => void handleSaveVaultEditor()}
                      disabled={vaultEditor.saving}
                      className="h-8 rounded-none px-3 font-arcade text-[10px] border-2 border-primary/70 bg-primary/10 hover:bg-primary/20"
                    >
                      {vaultEditor.saving ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                      ) : null}
                      SAVE
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() =>
                        setVaultEditor((prev) => ({ ...prev, open: false, saving: false }))
                      }
                      className="h-8 rounded-none px-3 font-arcade text-[10px] border-2 border-secondary/40 text-muted-foreground hover:border-secondary hover:text-foreground"
                    >
                      CANCEL
                    </Button>
                  </div>
                </div>
              ) : null}
              <div className="max-h-[52vh] overflow-y-auto space-y-1 pr-1">
                {filteredVaultRootEntries.map((entry) => {
                  const trimmed = String(entry || "").trim();
                  if (!trimmed) return null;
                  const isFolder = trimmed.endsWith("/");
                  const cleaned = trimmed.replace(/\/$/, "");
                  const name = _basename(cleaned);
                  const fullPath = cleaned;
                  const expanded = isFolder ? expandedVaultFolders.has(fullPath) : false;

                  return (
                    <div key={fullPath}>
                      <VaultTreeRow
                        fullPath={fullPath}
                        name={name}
                        isFolder={isFolder}
                        depth={0}
                        checked={props.selectedVaultPaths.includes(fullPath)}
                        expanded={expanded}
                        onTogglePath={toggleVaultPath}
                        onToggleFolder={toggleVaultFolder}
                      />
                      {isFolder && expanded && (
                        <VaultTreeChildren
                          folderPath={fullPath}
                          depth={1}
                          selectedPaths={props.selectedVaultPaths}
                          expandedFolders={expandedVaultFolders}
                          onTogglePath={toggleVaultPath}
                          onToggleFolder={toggleVaultFolder}
                          searchQuery={vaultSearch}
                          refreshToken={vaultRefreshToken}
                          enabled={props.isOpen && sourcesTab === "vault"}
                        />
                      )}
                    </div>
                  );
                })}
                {vaultLoadError ? (
                  <div className="text-xs font-terminal text-red-400 border border-red-500/40 p-2">
                    Vault load failed: {vaultLoadError instanceof Error ? vaultLoadError.message : "Unknown error"}
                  </div>
                ) : null}
                {!isLoadingVault && filteredVaultRootEntries.length === 0 && (
                  <div className="text-xs font-terminal text-muted-foreground border border-secondary/30 p-2">
                    No vault items found.
                  </div>
                )}
              </div>
            </>
          )}

          {sourcesTab === "objectives" && (
            <div className="space-y-3">
              <div className="border border-primary/30 p-2">
                <div className="font-arcade text-[10px] text-primary mb-2">LEARNING OBJECTIVES</div>
                <div className="text-xs font-terminal text-muted-foreground space-y-1">
                  <div><span className="text-foreground">Course:</span> {props.northStarSummary?.course_name || "N/A"}</div>
                  <div><span className="text-foreground">Module:</span> {props.northStarSummary?.module_name || "N/A"}</div>
                  <div><span className="text-foreground">Checked:</span> {checkedObjectives.size}/{props.northStarSummary?.objective_ids?.length || 0}</div>
                </div>
              </div>
              <div className="space-y-1 max-h-[52vh] overflow-y-auto pr-1">
                {(props.northStarSummary?.objective_ids || []).map((objectiveId) => {
                  const checked = checkedObjectives.has(objectiveId);
                  return (
                    <button
                      key={objectiveId}
                      type="button"
                      onClick={() => toggleObjectiveCheck(objectiveId)}
                      className={`w-full flex items-center gap-2 px-2 py-2 border text-left text-xs font-terminal ${
                        checked
                          ? "border-primary/60 bg-primary/10 text-foreground"
                          : "border-secondary/30 text-muted-foreground hover:border-secondary/60 hover:text-foreground"
                      }`}
                    >
                      <span className={`inline-flex h-4 w-4 items-center justify-center border text-[10px] ${checked ? "border-primary text-primary" : "border-secondary/50 text-muted-foreground"}`}>
                        {checked ? "✓" : ""}
                      </span>
                      <span className="truncate">{objectiveId}</span>
                    </button>
                  );
                })}
                {(!props.northStarSummary?.objective_ids || props.northStarSummary.objective_ids.length === 0) && (
                  <div className="text-xs font-terminal text-muted-foreground border border-secondary/30 px-2 py-2">
                    No learning objectives loaded.
                  </div>
                )}
              </div>
            </div>
          )}

          {sourcesTab === "flashcards" && (
            <div className="space-y-3">
              <div className="border border-primary/30 p-2">
                <div className="font-arcade text-[10px] text-primary mb-2">FLASHCARDS</div>
                <div className="text-xs font-terminal text-muted-foreground">
                  Review, approve, and sync card drafts without leaving Tutor.
                </div>
              </div>
              <div className="border border-primary/20 min-h-[320px]">
                <AnkiIntegration totalCards={ankiDrafts.length} compact />
              </div>
            </div>
          )}

          {sourcesTab === "map_of_contents" && (
            <div className="space-y-2">
              <div className="border border-primary/30 p-2">
                <div className="font-arcade text-[10px] text-primary mb-2">MAP OF CONTENTS</div>
                <div className="text-xs font-terminal text-muted-foreground space-y-1">
                  <div><span className="text-foreground">Course:</span> {props.northStarSummary?.course_name || "N/A"}</div>
                  <div><span className="text-foreground">Module:</span> {props.northStarSummary?.module_name || "N/A"}</div>
                  <div><span className="text-foreground">Subtopic:</span> {props.northStarSummary?.subtopic_name || "N/A"}</div>
                  <div><span className="text-foreground">Status:</span> {props.northStarSummary?.status || "unknown"}</div>
                  <div><span className="text-foreground">Path:</span> {props.northStarSummary?.path || "N/A"}</div>
                </div>
              </div>
              <div className="border border-primary/20 p-2">
                <div className="font-arcade text-[10px] text-primary mb-2">OBJECTIVES</div>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {(props.northStarSummary?.objective_ids || []).slice(0, 80).map((oid) => (
                    <div key={oid} className="text-xs font-terminal text-muted-foreground border border-secondary/30 px-2 py-1">
                      {oid}
                    </div>
                  ))}
                  {(!props.northStarSummary?.objective_ids || props.northStarSummary.objective_ids.length === 0) && (
                    <div className="text-xs font-terminal text-muted-foreground">No objective IDs loaded.</div>
                  )}
                </div>
              </div>
              <div className="border border-primary/20 p-2">
                <div className="font-arcade text-[10px] text-primary mb-2 flex items-center gap-1">
                  <Target className="w-3.5 h-3.5" /> REFERENCE TARGETS
                </div>
                <div className="max-h-56 overflow-y-auto space-y-1">
                  {(props.northStarSummary?.reference_targets || []).slice(0, 80).map((ref) => (
                    <div key={ref} className="text-xs font-terminal text-muted-foreground border border-secondary/30 px-2 py-1">
                      {ref}
                    </div>
                  ))}
                  {(!props.northStarSummary?.reference_targets || props.northStarSummary.reference_targets.length === 0) && (
                    <div className="text-xs font-terminal text-muted-foreground">No active reference targets.</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
