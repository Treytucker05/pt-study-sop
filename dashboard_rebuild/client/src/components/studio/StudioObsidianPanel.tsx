import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, ChevronDown, ChevronRight, ExternalLink, FilePlus2, FolderTree, Pencil, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface StudioObsidianPanelProps {
  courseName: string | null;
  vaultFolder: string | null;
  studyUnit: string | null;
  sessionName: string;
  sessionNotes: string;
  activeSessionId: string | null;
  workflowId?: string | null;
}

function normalizeVaultPath(value: string | null | undefined): string {
  return String(value || "")
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "")
    .replace(/\/{2,}/g, "/")
    .trim();
}

function normalizeVaultEntry(value: string | null | undefined): string {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }
  const isFolder = raw.endsWith("/");
  const normalized = normalizeVaultPath(raw);
  if (!normalized) {
    return "";
  }
  return isFolder ? `${normalized}/` : normalized;
}

function joinVaultPath(basePath: string, entry: string): string {
  const normalizedBasePath = normalizeVaultPath(basePath);
  const normalizedEntryPath = normalizeVaultPath(entry.replace(/\/$/, ""));
  if (!normalizedBasePath) {
    return normalizedEntryPath;
  }
  if (
    normalizedEntryPath.toLowerCase() === normalizedBasePath.toLowerCase() ||
    normalizedEntryPath.toLowerCase().startsWith(`${normalizedBasePath.toLowerCase()}/`)
  ) {
    return normalizedEntryPath;
  }
  return `${normalizedBasePath}/${normalizedEntryPath}`;
}

function sanitizeNoteName(value: string): string {
  return value.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim();
}

function formatTimestampStamp(date: Date): string {
  return date.toISOString().slice(0, 16).replace("T", " ").replace(/:/g, "-");
}

function buildUntitledNotePath(rootFolder: string): string {
  const stamp = formatTimestampStamp(new Date());
  return `${normalizeVaultPath(rootFolder)}/Untitled Note ${stamp}.md`;
}

function buildSessionNotesPath(params: {
  rootFolder: string;
  sessionName: string;
  studyUnit: string | null;
  courseName: string | null;
  activeSessionId: string | null;
  workflowId?: string | null;
}): { folderPath: string; filePath: string } {
  const folderPath = `${normalizeVaultPath(params.rootFolder)}/Session Notes`;
  const titleSeed =
    sanitizeNoteName(params.sessionName) ||
    sanitizeNoteName(params.studyUnit || "") ||
    sanitizeNoteName(params.courseName || "") ||
    (params.activeSessionId ? `Tutor Session ${params.activeSessionId}` : "") ||
    (params.workflowId ? `Workflow ${params.workflowId}` : "") ||
    "Tutor Session Notes";
  const fileName = `${formatTimestampStamp(new Date())} ${titleSeed}.md`;
  return {
    folderPath,
    filePath: `${folderPath}/${fileName}`,
  };
}

function sortVaultEntries(entries: string[]): string[] {
  return [...entries].sort((left, right) => {
    const leftIsFolder = left.endsWith("/");
    const rightIsFolder = right.endsWith("/");
    if (leftIsFolder !== rightIsFolder) {
      return leftIsFolder ? -1 : 1;
    }
    return left.localeCompare(right, undefined, { sensitivity: "base" });
  });
}

interface VaultTreeProps {
  folderPath: string;
  depth: number;
  selectedPath: string | null;
  expandedFolders: Set<string>;
  refreshToken: number;
  onSelectFile: (path: string) => void;
  onToggleFolder: (path: string) => void;
}

function VaultTree({
  folderPath,
  depth,
  selectedPath,
  expandedFolders,
  refreshToken,
  onSelectFile,
  onToggleFolder,
}: VaultTreeProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["studio-obsidian", "files", folderPath, refreshToken],
    queryFn: () => api.obsidian.getFiles(folderPath),
    staleTime: 30 * 1000,
  });

  const entries = sortVaultEntries(
    Array.isArray(data?.files)
      ? data.files
          .map((entry) => normalizeVaultEntry(String(entry || "")))
          .filter(Boolean)
      : [],
  );

  if (isLoading && depth > 0) {
    return (
      <div className="pl-5 font-mono text-[11px] uppercase tracking-[0.18em] text-[#ffc8d3]/58">
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {entries.map((entry) => {
        const isFolder = entry.endsWith("/");
        const cleaned = entry.replace(/\/$/, "");
        const fullPath = joinVaultPath(folderPath, cleaned);
        const label = fullPath.split("/").pop() || fullPath;
        const expanded = isFolder ? expandedFolders.has(fullPath) : false;

        return (
          <div key={fullPath}>
            <button
              type="button"
              onClick={() => {
                if (isFolder) {
                  onToggleFolder(fullPath);
                  return;
                }
                onSelectFile(fullPath);
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-[0.75rem] px-2 py-1.5 text-left font-mono text-xs transition",
                isFolder
                  ? "text-[#ffd6de] hover:bg-black/20 hover:text-white"
                  : "text-[#ffc8d3]/72 hover:bg-black/20 hover:text-white",
                !isFolder &&
                  selectedPath?.toLowerCase() === fullPath.toLowerCase() &&
                  "bg-[rgba(255,68,104,0.16)] text-white",
              )}
              style={{ paddingLeft: `${depth * 16 + 8}px` }}
            >
              {isFolder ? (
                expanded ? (
                  <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                )
              ) : (
                <BookOpen className="h-3.5 w-3.5 shrink-0" />
              )}
              <span className="truncate">{label}</span>
            </button>
            {isFolder && expanded ? (
              <VaultTree
                folderPath={fullPath}
                depth={depth + 1}
                selectedPath={selectedPath}
                expandedFolders={expandedFolders}
                refreshToken={refreshToken}
                onSelectFile={onSelectFile}
                onToggleFolder={onToggleFolder}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function StudioObsidianPanel({
  courseName,
  vaultFolder,
  studyUnit,
  sessionName,
  sessionNotes,
  activeSessionId,
  workflowId = null,
}: StudioObsidianPanelProps) {
  const queryClient = useQueryClient();
  const rootFolder = useMemo(() => normalizeVaultPath(vaultFolder), [vaultFolder]);
  const rootLabel = useMemo(() => {
    if (!rootFolder) {
      return courseName || "No course selected";
    }
    return rootFolder.split("/").pop() || rootFolder;
  }, [courseName, rootFolder]);

  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    () => new Set(rootFolder ? [rootFolder] : []),
  );
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [isSavingSessionNotes, setIsSavingSessionNotes] = useState(false);
  const [editMode, setEditMode] = useState<"read" | "edit">("read");
  const [editorDraft, setEditorDraft] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  useEffect(() => {
    setEditMode("read");
    setEditorDraft("");
  }, [selectedPath]);

  useEffect(() => {
    setExpandedFolders(new Set(rootFolder ? [rootFolder] : []));
    setSelectedPath(null);
  }, [rootFolder]);

  const { data: previewResult, isLoading: previewLoading } = useQuery({
    queryKey: ["studio-obsidian", "preview", selectedPath],
    queryFn: () => api.obsidian.getFile(selectedPath!),
    enabled: Boolean(selectedPath),
    staleTime: 10 * 1000,
  });

  const selectedContent =
    previewResult?.success && typeof previewResult.content === "string"
      ? previewResult.content
      : "";

  const refreshTree = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: ["studio-obsidian", "files"],
    });
    setRefreshToken((current) => current + 1);
  }, [queryClient]);

  const toggleFolder = useCallback((path: string) => {
    setExpandedFolders((current) => {
      const next = new Set(current);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const handleCreateNote = useCallback(async () => {
    if (!rootFolder) {
      toast.error("Select a course before creating a vault note.");
      return;
    }

    setIsCreatingNote(true);
    try {
      const notePath = buildUntitledNotePath(rootFolder);
      const result = await api.obsidian.saveFile(notePath, "# New Note\n\n");
      if (!result.success) {
        throw new Error(result.error || "Obsidian save failed");
      }
      setExpandedFolders((current) => new Set(current).add(rootFolder));
      setSelectedPath(result.path || notePath);
      await refreshTree();
      toast.success("Created a new vault note.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error("Failed to create note", { description: message });
    } finally {
      setIsCreatingNote(false);
    }
  }, [refreshTree, rootFolder]);

  const handleStartEdit = useCallback(() => {
    setEditorDraft(selectedContent);
    setEditMode("edit");
  }, [selectedContent]);

  const handleCancelEdit = useCallback(() => {
    setEditMode("read");
    setEditorDraft("");
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!selectedPath) return;
    setIsSavingEdit(true);
    try {
      const result = await api.obsidian.saveFile(selectedPath, editorDraft);
      if (!result.success) {
        throw new Error(result.error || "Save failed");
      }
      await queryClient.invalidateQueries({
        queryKey: ["studio-obsidian", "preview", selectedPath],
      });
      setEditMode("read");
      toast.success("Saved note to the vault.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error("Failed to save note", { description: message });
    } finally {
      setIsSavingEdit(false);
    }
  }, [editorDraft, queryClient, selectedPath]);

  const handleSaveSessionNotes = useCallback(async () => {
    if (!rootFolder) {
      toast.error("Select a course before saving notes to the vault.");
      return;
    }
    if (!sessionNotes.trim()) {
      toast.error("Session notes are empty.");
      return;
    }

    setIsSavingSessionNotes(true);
    try {
      const target = buildSessionNotesPath({
        rootFolder,
        sessionName,
        studyUnit,
        courseName,
        activeSessionId,
        workflowId,
      });
      const folderResult = await api.obsidian.createFolder(target.folderPath);
      if (!folderResult.success) {
        throw new Error(folderResult.error || "Failed to create session notes folder");
      }
      const saveResult = await api.obsidian.saveFile(
        target.filePath,
        sessionNotes.trimEnd().concat("\n"),
      );
      if (!saveResult.success) {
        throw new Error(saveResult.error || "Failed to save session notes");
      }
      setExpandedFolders((current) => new Set(current).add(rootFolder).add(target.folderPath));
      setSelectedPath(saveResult.path || target.filePath);
      await refreshTree();
      toast.success("Saved current session notes to the vault.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error("Failed to save session notes", { description: message });
    } finally {
      setIsSavingSessionNotes(false);
    }
  }, [
    activeSessionId,
    courseName,
    refreshTree,
    rootFolder,
    sessionName,
    sessionNotes,
    studyUnit,
    workflowId,
  ]);

  if (!rootFolder) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 rounded-[0.9rem] border border-dashed border-[rgba(255,104,132,0.24)] bg-black/20 p-4 text-center">
        <FolderTree className="h-5 w-5 text-[#ffb9c7]" />
        <div className="font-mono text-sm uppercase tracking-[0.18em] text-[#ffd6de]">
          Obsidian Vault
        </div>
        <p className="max-w-sm font-mono text-xs leading-6 text-[#ffc8d3]/72">
          Pick a course first. The Obsidian panel scopes itself to that course folder inside the Treys School vault.
        </p>
      </div>
    );
  }

  return (
    <div
      data-testid="studio-obsidian-browser"
      className="grid h-full min-h-0 gap-3 p-3 lg:grid-cols-[280px_minmax(0,1fr)]"
    >
      <div className="flex min-h-0 flex-col gap-3 rounded-[0.9rem] border border-[rgba(255,118,144,0.18)] bg-black/25 p-3">
        <div className="space-y-1">
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#ffb9c7]">
            Vault Browser
          </div>
          <div className="font-mono text-sm text-white">{rootLabel}</div>
          <div className="font-mono text-[11px] leading-5 text-[#ffc8d3]/62">
            Treys School / {rootFolder}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            data-testid="studio-obsidian-launch"
            onClick={() => {
              api.obsidian
                .launch()
                .then((result) => {
                  if (result.success) {
                    toast.success("Launching Obsidian...");
                  } else {
                    toast.error("Could not launch Obsidian", {
                      description: result.error,
                    });
                  }
                })
                .catch((error: unknown) =>
                  toast.error(
                    error instanceof Error ? error.message : "Launch failed.",
                  ),
                );
            }}
            className="rounded-full border-[rgba(255,118,144,0.18)] bg-black/20 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[#ffd6de]"
          >
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
            Open Obsidian
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            data-testid="studio-obsidian-create-note"
            disabled={isCreatingNote}
            onClick={() => {
              void handleCreateNote();
            }}
            className="rounded-full border-[rgba(255,118,144,0.18)] bg-black/20 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[#ffd6de]"
          >
            <FilePlus2 className="mr-1.5 h-3.5 w-3.5" />
            {isCreatingNote ? "Creating..." : "Create Note"}
          </Button>
          <Button
            type="button"
            size="sm"
            data-testid="studio-obsidian-save-session-notes"
            disabled={isSavingSessionNotes || !sessionNotes.trim()}
            onClick={() => {
              void handleSaveSessionNotes();
            }}
            className="rounded-full border border-[rgba(255,118,144,0.22)] bg-[rgba(255,68,104,0.18)] px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-white hover:bg-[rgba(255,68,104,0.28)]"
          >
            <Save className="mr-1.5 h-3.5 w-3.5" />
            {isSavingSessionNotes ? "Saving..." : "Save to Vault"}
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto rounded-[0.9rem] border border-[rgba(255,118,144,0.14)] bg-black/20 p-2">
          <button
            type="button"
            data-testid="studio-obsidian-root-node"
            onClick={() => toggleFolder(rootFolder)}
            className="flex w-full items-center gap-2 rounded-[0.75rem] px-2 py-1.5 text-left font-mono text-xs text-white transition hover:bg-black/20"
          >
            {expandedFolders.has(rootFolder) ? (
              <ChevronDown className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 shrink-0" />
            )}
            <FolderTree className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{rootLabel}</span>
          </button>
          {expandedFolders.has(rootFolder) ? (
            <VaultTree
              folderPath={rootFolder}
              depth={1}
              selectedPath={selectedPath}
              expandedFolders={expandedFolders}
              refreshToken={refreshToken}
              onSelectFile={setSelectedPath}
              onToggleFolder={toggleFolder}
            />
          ) : null}
        </div>
      </div>

      <div className="flex min-h-0 flex-col rounded-[0.9rem] border border-[rgba(255,118,144,0.18)] bg-black/25 p-3">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#ffb9c7]">
              {editMode === "edit" ? "Editing" : "Preview"}
            </div>
            <div className="truncate font-mono text-sm text-white">
              {selectedPath ? selectedPath.split("/").pop() : "Select a note"}
            </div>
          </div>
          {selectedPath && previewResult?.success ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {editMode === "read" ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  data-testid="studio-obsidian-edit-note"
                  onClick={handleStartEdit}
                  className="rounded-full border-[rgba(255,118,144,0.18)] bg-black/20 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[#ffd6de]"
                >
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  Edit
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    data-testid="studio-obsidian-cancel-edit"
                    disabled={isSavingEdit}
                    onClick={handleCancelEdit}
                    className="rounded-full border-[rgba(255,118,144,0.18)] bg-black/20 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[#ffd6de]"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    data-testid="studio-obsidian-save-edit"
                    disabled={isSavingEdit}
                    onClick={() => {
                      void handleSaveEdit();
                    }}
                    className="rounded-full border border-[rgba(255,118,144,0.22)] bg-[rgba(255,68,104,0.18)] px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-white hover:bg-[rgba(255,68,104,0.28)]"
                  >
                    <Save className="mr-1.5 h-3.5 w-3.5" />
                    {isSavingEdit ? "Saving..." : "Save"}
                  </Button>
                </>
              )}
            </div>
          ) : null}
        </div>

        <div
          data-testid="studio-obsidian-preview"
          className="min-h-0 flex-1 overflow-y-auto rounded-[0.9rem] border border-[rgba(255,118,144,0.14)] bg-black/20 p-4"
        >
          {!selectedPath ? (
            <div className="font-mono text-xs leading-6 text-[#ffc8d3]/68">
              Click any markdown note in the course vault tree to preview it here.
            </div>
          ) : previewLoading ? (
            <div className="font-mono text-xs uppercase tracking-[0.18em] text-[#ffc8d3]/58">
              Loading note...
            </div>
          ) : previewResult?.success ? (
            editMode === "edit" ? (
              <textarea
                data-testid="studio-obsidian-editor"
                value={editorDraft}
                onChange={(event) => setEditorDraft(event.target.value)}
                aria-label="Edit vault note"
                className="h-full min-h-[240px] w-full resize-none rounded-[0.7rem] border border-[rgba(255,118,144,0.18)] bg-black/40 p-3 font-mono text-xs leading-6 text-[#fff3f6] outline-none"
              />
            ) : (
              <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-6 text-[#fff3f6]">
                {selectedContent}
              </pre>
            )
          ) : (
            <div className="font-mono text-xs leading-6 text-[#ffc8d3]/68">
              Unable to read this note from the vault.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
