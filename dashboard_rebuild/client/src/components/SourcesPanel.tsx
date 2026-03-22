import { useState, useRef, useCallback, useMemo, useReducer } from "react";
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

type SourcesPanelState = {
  sourcesTab: SourceTab | "objectives" | "flashcards";
  isDragActive: boolean;
  vaultSearch: string;
  vaultRefreshToken: number;
  expandedVaultFolders: Set<string>;
  checkedObjectives: Set<string>;
  vaultEditor: VaultEditorState;
};

type SourcesPanelPatch =
  | Partial<SourcesPanelState>
  | ((state: SourcesPanelState) => Partial<SourcesPanelState>);

function createSourcesPanelState(): SourcesPanelState {
  return {
    sourcesTab: "materials",
    isDragActive: false,
    vaultSearch: "",
    vaultRefreshToken: 0,
    expandedVaultFolders: new Set(),
    checkedObjectives: new Set(),
    vaultEditor: {
      open: false,
      path: "",
      content: "",
      saving: false,
    },
  };
}

function sourcesPanelReducer(state: SourcesPanelState, patch: SourcesPanelPatch): SourcesPanelState {
  const nextPatch = typeof patch === "function" ? patch(state) : patch;
  return { ...state, ...nextPatch };
}

function SourcesObjectivesTab({
  checkedObjectives,
  northStarSummary,
  onToggleObjective,
}: {
  checkedObjectives: Set<string>;
  northStarSummary: NorthStarSummary | null;
  onToggleObjective: (objectiveId: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="border border-primary/30 p-2">
        <div className="font-arcade text-ui-2xs text-primary mb-2">
          LEARNING OBJECTIVES
        </div>
        <div className="text-xs font-terminal text-muted-foreground space-y-1">
          <div>
            <span className="text-foreground">Course:</span>{" "}
            {northStarSummary?.course_name || "N/A"}
          </div>
          <div>
            <span className="text-foreground">Module:</span>{" "}
            {northStarSummary?.module_name || "N/A"}
          </div>
          <div>
            <span className="text-foreground">Checked:</span>{" "}
            {checkedObjectives.size}/{northStarSummary?.objective_ids?.length || 0}
          </div>
        </div>
      </div>
      <div className="space-y-1 max-h-[52vh] overflow-y-auto pr-1">
        {(northStarSummary?.objective_ids || []).map((objectiveId) => {
          const checked = checkedObjectives.has(objectiveId);
          return (
            <button
              key={objectiveId}
              type="button"
              onClick={() => onToggleObjective(objectiveId)}
              className={`w-full flex items-center gap-2 px-2 py-2 border text-left text-xs font-terminal ${
                checked
                  ? "border-primary/60 bg-primary/10 text-foreground"
                  : "border-secondary/30 text-muted-foreground hover:border-secondary/60 hover:text-foreground"
              }`}
            >
              <span
                className={`inline-flex h-4 w-4 items-center justify-center border text-ui-2xs ${
                  checked
                    ? "border-primary text-primary"
                    : "border-secondary/50 text-muted-foreground"
                }`}
              >
                {checked ? "✓" : ""}
              </span>
              <span className="truncate">{objectiveId}</span>
            </button>
          );
        })}
        {(!northStarSummary?.objective_ids ||
          northStarSummary.objective_ids.length === 0) && (
          <div className="text-xs font-terminal text-muted-foreground border border-secondary/30 px-2 py-2">
            No learning objectives loaded.
          </div>
        )}
      </div>
    </div>
  );
}

function SourcesFlashcardsTab({ draftCount }: { draftCount: number }) {
  return (
    <div className="space-y-3">
      <div className="border border-primary/30 p-2">
        <div className="font-arcade text-ui-2xs text-primary mb-2">FLASHCARDS</div>
        <div className="text-xs font-terminal text-muted-foreground">
          Review, approve, and sync card drafts without leaving Tutor.
        </div>
      </div>
      <div className="border border-primary/20 min-h-[320px]">
        <AnkiIntegration totalCards={draftCount} compact />
      </div>
    </div>
  );
}

function SourcesMapTab({
  northStarSummary,
}: {
  northStarSummary: NorthStarSummary | null;
}) {
  return (
    <div className="space-y-2">
      <div className="border border-primary/30 p-2">
        <div className="font-arcade text-ui-2xs text-primary mb-2">
          MAP OF CONTENTS
        </div>
        <div className="text-xs font-terminal text-muted-foreground space-y-1">
          <div>
            <span className="text-foreground">Course:</span>{" "}
            {northStarSummary?.course_name || "N/A"}
          </div>
          <div>
            <span className="text-foreground">Module:</span>{" "}
            {northStarSummary?.module_name || "N/A"}
          </div>
          <div>
            <span className="text-foreground">Subtopic:</span>{" "}
            {northStarSummary?.subtopic_name || "N/A"}
          </div>
          <div>
            <span className="text-foreground">Status:</span>{" "}
            {northStarSummary?.status || "unknown"}
          </div>
          <div>
            <span className="text-foreground">Path:</span>{" "}
            {northStarSummary?.path || "N/A"}
          </div>
        </div>
      </div>
      <div className="border border-primary/20 p-2">
        <div className="font-arcade text-ui-2xs text-primary mb-2">OBJECTIVES</div>
        <div className="max-h-32 overflow-y-auto space-y-1">
          {(northStarSummary?.objective_ids || []).slice(0, 80).map((objectiveId) => (
            <div
              key={objectiveId}
              className="text-xs font-terminal text-muted-foreground border border-secondary/30 px-2 py-1"
            >
              {objectiveId}
            </div>
          ))}
          {(!northStarSummary?.objective_ids ||
            northStarSummary.objective_ids.length === 0) && (
            <div className="text-xs font-terminal text-muted-foreground">
              No objective IDs loaded.
            </div>
          )}
        </div>
      </div>
      <div className="border border-primary/20 p-2">
        <div className="font-arcade text-ui-2xs text-primary mb-2 flex items-center gap-1">
          <Target className="w-3.5 h-3.5" /> REFERENCE TARGETS
        </div>
        <div className="max-h-56 overflow-y-auto space-y-1">
          {(northStarSummary?.reference_targets || []).slice(0, 80).map((reference) => (
            <div
              key={reference}
              className="text-xs font-terminal text-muted-foreground border border-secondary/30 px-2 py-1"
            >
              {reference}
            </div>
          ))}
          {(!northStarSummary?.reference_targets ||
            northStarSummary.reference_targets.length === 0) && (
            <div className="text-xs font-terminal text-muted-foreground">
              No active reference targets.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SourcesMaterialsTab({
  availableMaterials,
  fileInputRef,
  isDragActive,
  isUploadingMaterial,
  onClearSelected,
  onDropFiles,
  onSelectAll,
  onToggleDragActive,
  onToggleMaterial,
  selectedMaterialIds,
}: {
  availableMaterials: Material[];
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  isDragActive: boolean;
  isUploadingMaterial: boolean;
  onClearSelected: () => void;
  onDropFiles: (files: FileList | null) => void;
  onSelectAll: () => void;
  onToggleDragActive: (active: boolean) => void;
  onToggleMaterial: (materialId: number) => void;
  selectedMaterialIds: number[];
}) {
  return (
    <>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          onToggleDragActive(true);
        }}
        onDragLeave={() => onToggleDragActive(false)}
        onDrop={(event) => {
          event.preventDefault();
          onToggleDragActive(false);
          onDropFiles(event.dataTransfer.files);
        }}
        className={`border-2 border-dashed px-3 py-2 text-xs font-terminal ${
          isDragActive
            ? "border-primary text-primary bg-primary/10"
            : "border-secondary/40 text-muted-foreground"
        }`}
      >
        <Upload className="w-3.5 h-3.5 inline mr-1.5" />
        Drag file here to add to chat + library.
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploadingMaterial}
          className="h-8 rounded-none px-3 font-arcade text-ui-2xs gap-1.5 border-2 border-primary/60 bg-primary/10 hover:bg-primary/20"
        >
          {isUploadingMaterial ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <FolderPlus className="w-3.5 h-3.5" />
          )}
          ADD FILE
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onSelectAll}
          className="h-8 rounded-none px-3 font-arcade text-ui-2xs border-2 border-secondary/40 text-muted-foreground hover:border-secondary hover:text-foreground"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1" />
          ALL
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onClearSelected}
          className="h-8 rounded-none px-3 font-arcade text-ui-2xs border-2 border-secondary/40 text-muted-foreground hover:border-secondary hover:text-foreground"
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1" />
          NONE
        </Button>
      </div>
      <div className="max-h-[48vh] overflow-y-auto space-y-1 pr-1">
        {availableMaterials.map((material) => {
          const checked = selectedMaterialIds.includes(material.id);
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
                onChange={() => onToggleMaterial(material.id)}
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
  );
}

function SourcesVaultTab({
  expandedVaultFolders,
  isLoadingVault,
  isOpen,
  onClearSelected,
  onCreateFolder,
  onCreateNote,
  onDeleteSelected,
  onEditSelectedNote,
  onRenameSelected,
  onRefresh,
  onSaveEditor,
  onToggleFolder,
  onTogglePath,
  openVaultEditor,
  refreshToken,
  searchQuery,
  selectedVaultPaths,
  sourcesTab,
  vaultEditor,
  vaultLoadError,
  vaultRootEntries,
  onSearchChange,
  onEditorChange,
  onCloseEditor,
}: {
  expandedVaultFolders: Set<string>;
  isLoadingVault: boolean;
  isOpen: boolean;
  onClearSelected: () => void;
  onCreateFolder: () => Promise<void>;
  onCreateNote: () => Promise<void>;
  onDeleteSelected: () => Promise<void>;
  onEditSelectedNote: () => Promise<void>;
  onRenameSelected: () => Promise<void>;
  onRefresh: () => void;
  onSaveEditor: () => Promise<void>;
  onToggleFolder: (path: string) => void;
  onTogglePath: (path: string) => void;
  openVaultEditor: (path: string, initialContent?: string) => Promise<void>;
  refreshToken: number;
  searchQuery: string;
  selectedVaultPaths: string[];
  sourcesTab: SourceTab | "objectives" | "flashcards";
  vaultEditor: VaultEditorState;
  vaultLoadError: unknown;
  vaultRootEntries: string[];
  onSearchChange: (value: string) => void;
  onEditorChange: (value: Partial<VaultEditorState>) => void;
  onCloseEditor: () => void;
}) {
  return (
    <>
      <div className="flex gap-2">
        <input
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search vault paths..."
          className="flex-1 h-9 bg-black border-2 border-secondary px-2 text-xs font-terminal text-foreground focus:border-primary focus:outline-none"
        />
        <Button
          type="button"
          variant="ghost"
          onClick={onRefresh}
          disabled={isLoadingVault}
          className="h-9 rounded-none px-3 font-arcade text-ui-2xs border-2 border-secondary/40 text-muted-foreground hover:border-secondary hover:text-foreground"
        >
          {isLoadingVault ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => void onCreateFolder()}
          className="h-8 rounded-none px-3 font-arcade text-ui-2xs border-2 border-secondary/40 text-muted-foreground hover:border-secondary hover:text-foreground"
        >
          <FolderPlus className="w-3.5 h-3.5 mr-1" />
          NEW FOLDER
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => void onCreateNote()}
          className="h-8 rounded-none px-3 font-arcade text-ui-2xs border-2 border-secondary/40 text-muted-foreground hover:border-secondary hover:text-foreground"
        >
          <FileTextIcon className="w-3.5 h-3.5 mr-1" />
          NEW NOTE
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => void onEditSelectedNote()}
          className="h-8 rounded-none px-3 font-arcade text-ui-2xs border-2 border-secondary/40 text-muted-foreground hover:border-secondary hover:text-foreground"
        >
          <Pencil className="w-3.5 h-3.5 mr-1" />
          EDIT
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => void onRenameSelected()}
          className="h-8 rounded-none px-3 font-arcade text-ui-2xs border-2 border-secondary/40 text-muted-foreground hover:border-secondary hover:text-foreground"
        >
          RENAME
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onClearSelected}
          className="h-8 rounded-none px-3 font-arcade text-ui-2xs border-2 border-secondary/40 text-muted-foreground hover:border-secondary hover:text-foreground"
        >
          CLEAR SELECTED
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => void onDeleteSelected()}
          className="h-8 rounded-none px-3 font-arcade text-ui-2xs border-2 border-red-500/50 text-red-300 hover:border-red-400 hover:text-red-200"
        >
          <Trash2 className="w-3.5 h-3.5 mr-1" />
          DELETE
        </Button>
      </div>
      {vaultEditor.open ? (
        <div className="border border-primary/30 p-2 space-y-2">
          <div className="font-arcade text-ui-2xs text-primary">EDIT NOTE</div>
          <input
            value={vaultEditor.path}
            onChange={(event) => onEditorChange({ path: event.target.value })}
            className="w-full h-8 bg-black border border-secondary px-2 text-xs font-terminal text-foreground focus:border-primary focus:outline-none"
          />
          <textarea
            value={vaultEditor.content}
            onChange={(event) => onEditorChange({ content: event.target.value })}
            className="w-full min-h-[220px] bg-black border border-secondary px-2 py-2 text-xs font-terminal text-foreground focus:border-primary focus:outline-none resize-y"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => void onSaveEditor()}
              disabled={vaultEditor.saving}
              className="h-8 rounded-none px-3 font-arcade text-ui-2xs border-2 border-primary/70 bg-primary/10 hover:bg-primary/20"
            >
              {vaultEditor.saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
              ) : null}
              SAVE
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={onCloseEditor}
              className="h-8 rounded-none px-3 font-arcade text-ui-2xs border-2 border-secondary/40 text-muted-foreground hover:border-secondary hover:text-foreground"
            >
              CANCEL
            </Button>
          </div>
        </div>
      ) : null}
      <div className="max-h-[52vh] overflow-y-auto space-y-1 pr-1">
        {vaultRootEntries.map((entry) => {
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
                checked={selectedVaultPaths.includes(fullPath)}
                expanded={expanded}
                onTogglePath={onTogglePath}
                onToggleFolder={onToggleFolder}
              />
              {isFolder && expanded && (
                <VaultTreeChildren
                  folderPath={fullPath}
                  depth={1}
                  selectedPaths={selectedVaultPaths}
                  expandedFolders={expandedVaultFolders}
                  onTogglePath={onTogglePath}
                  onToggleFolder={onToggleFolder}
                  searchQuery={searchQuery}
                  refreshToken={refreshToken}
                  enabled={isOpen && sourcesTab === "vault"}
                />
              )}
            </div>
          );
        })}
        {vaultLoadError ? (
          <div className="text-xs font-terminal text-red-400 border border-red-500/40 p-2">
            Vault load failed:{" "}
            {vaultLoadError instanceof Error
              ? vaultLoadError.message
              : "Unknown error"}
          </div>
        ) : null}
        {!isLoadingVault && vaultRootEntries.length === 0 && (
          <div className="text-xs font-terminal text-muted-foreground border border-secondary/30 p-2">
            No vault items found.
          </div>
        )}
      </div>
    </>
  );
}

type SourcesPanelController = {
  ankiDrafts: unknown[];
  checkedObjectives: Set<string>;
  expandedVaultFolders: Set<string>;
  filteredVaultRootEntries: string[];
  isDragActive: boolean;
  isLoadingVault: boolean;
  onClearSelectedMaterials: () => void;
  onCloseEditor: () => void;
  onCreateVaultFolder: () => Promise<void>;
  onCreateVaultNote: () => Promise<void>;
  onDeleteSelectedVaultPaths: () => Promise<void>;
  onDropFiles: (files: FileList | null) => void;
  onEditSelectedVaultNote: () => Promise<void>;
  onEditorChange: (value: Partial<VaultEditorState>) => void;
  onOpenUploadPanel: (active: boolean) => void;
  onRefreshVaultTree: () => void;
  onRenameSelectedVaultPath: () => Promise<void>;
  onSaveVaultEditor: () => Promise<void>;
  onSearchChange: (value: string) => void;
  onSelectAllMaterials: () => void;
  onSetSourcesTab: (value: SourcesPanelState["sourcesTab"]) => void;
  onToggleMaterial: (materialId: number) => void;
  onToggleObjectiveCheck: (objectiveId: string) => void;
  onToggleVaultFolder: (path: string) => void;
  onToggleVaultPath: (path: string) => void;
  openVaultEditor: (path: string, initialContent?: string) => Promise<void>;
  sourcesTab: SourcesPanelState["sourcesTab"];
  vaultEditor: VaultEditorState;
  vaultLoadError: unknown;
  vaultRefreshToken: number;
  vaultSearch: string;
};

function useSourcesPanelController(props: SourcesPanelProps): SourcesPanelController {
  const [panelState, patchPanelState] = useReducer(
    sourcesPanelReducer,
    undefined,
    createSourcesPanelState,
  );
  const {
    sourcesTab,
    isDragActive,
    vaultSearch,
    vaultRefreshToken,
    expandedVaultFolders,
    checkedObjectives,
    vaultEditor,
  } = panelState;

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
    const query = vaultSearch.trim().toLowerCase();
    if (!query) return vaultRootEntries;
    return vaultRootEntries.filter((entry) => {
      const raw = String(entry || "").trim();
      if (!raw) return false;
      if (raw.endsWith("/")) return true;
      return raw.toLowerCase().includes(query);
    });
  }, [vaultRootEntries, vaultSearch]);

  const { data: ankiDrafts = [] } = useQuery({
    queryKey: ["anki", "drafts"],
    queryFn: api.anki.getDrafts,
    enabled: props.isOpen && sourcesTab === "flashcards",
  });

  const onToggleMaterial = useCallback(
    (materialId: number) => {
      if (props.selectedMaterialIds.includes(materialId)) {
        props.onSelectedMaterialIdsChange(props.selectedMaterialIds.filter((id) => id !== materialId));
        return;
      }
      props.onSelectedMaterialIdsChange([...props.selectedMaterialIds, materialId]);
    },
    [props.onSelectedMaterialIdsChange, props.selectedMaterialIds],
  );

  const onSelectAllMaterials = useCallback(() => {
    props.onSelectedMaterialIdsChange(props.availableMaterials.map((material) => material.id));
  }, [props.availableMaterials, props.onSelectedMaterialIdsChange]);

  const onClearSelectedMaterials = useCallback(() => {
    props.onSelectedMaterialIdsChange([]);
  }, [props.onSelectedMaterialIdsChange]);

  const onToggleObjectiveCheck = useCallback((objectiveId: string) => {
    patchPanelState((prev) => {
      const next = new Set(prev.checkedObjectives);
      if (next.has(objectiveId)) {
        next.delete(objectiveId);
      } else {
        next.add(objectiveId);
      }
      return { checkedObjectives: next };
    });
  }, []);

  const onToggleVaultPath = useCallback((path: string) => {
    const previous = props.selectedVaultPaths;
    props.onSelectedVaultPathsChange(
      previous.includes(path) ? previous.filter((entry) => entry !== path) : [...previous, path],
    );
  }, [props.onSelectedVaultPathsChange, props.selectedVaultPaths]);

  const onToggleVaultFolder = useCallback((path: string) => {
    patchPanelState((prev) => {
      const next = new Set(prev.expandedVaultFolders);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return { expandedVaultFolders: next };
    });
  }, []);

  const onRefreshVaultTree = useCallback(() => {
    patchPanelState((prev) => ({
      expandedVaultFolders: new Set(),
      vaultRefreshToken: prev.vaultRefreshToken + 1,
    }));
  }, []);

  const openVaultEditor = useCallback(async (path: string, initialContent?: string) => {
    const normalized = String(path || "").trim();
    if (!normalized) return;
    if (typeof initialContent === "string") {
      patchPanelState({
        vaultEditor: { open: true, path: normalized, content: initialContent, saving: false },
      });
      return;
    }
    try {
      const result = await api.obsidian.getFile(normalized);
      if (!result.success) {
        toast.error(result.error || "Failed to load file");
        return;
      }
      patchPanelState({
        vaultEditor: {
          open: true,
          path: normalized,
          content: String(result.content || ""),
          saving: false,
        },
      });
    } catch (error) {
      toast.error(`Failed to load note: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }, []);

  const onCreateVaultFolder = useCallback(async () => {
    const base =
      props.selectedVaultPaths.length === 1 && !props.selectedVaultPaths[0].toLowerCase().endsWith(".md")
        ? props.selectedVaultPaths[0]
        : "";
    const suggestion = base ? `${base}/New Folder` : "Study notes/New Folder";
    const inputPath = window.prompt("Create folder path:", suggestion);
    if (!inputPath) return;
    try {
      const result = await api.obsidian.createFolder(inputPath);
      if (!result.success) {
        toast.error(result.error || "Failed to create folder");
        return;
      }
      toast.success(`Folder created: ${result.path || inputPath}`);
      onRefreshVaultTree();
    } catch (error) {
      toast.error(`Create folder failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }, [onRefreshVaultTree, props.selectedVaultPaths]);

  const onCreateVaultNote = useCallback(async () => {
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
      const result = await api.obsidian.saveFile(normalized, content);
      if (!result.success) {
        toast.error(result.error || "Failed to create note");
        return;
      }
      props.onSelectedVaultPathsChange([normalized]);
      toast.success(`Note created: ${normalized}`);
      onRefreshVaultTree();
      await openVaultEditor(normalized, content);
    } catch (error) {
      toast.error(`Create note failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }, [onRefreshVaultTree, openVaultEditor, props.onSelectedVaultPathsChange, props.selectedVaultPaths]);

  const onEditSelectedVaultNote = useCallback(async () => {
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

  const onRenameSelectedVaultPath = useCallback(async () => {
    if (props.selectedVaultPaths.length !== 1) {
      toast.error("Select exactly one file or folder to rename.");
      return;
    }
    const currentPath = props.selectedVaultPaths[0];
    const nextPath = window.prompt("Rename/move to:", currentPath);
    if (!nextPath || nextPath.trim() === currentPath) return;
    try {
      const result = await api.obsidian.movePath(currentPath, nextPath.trim());
      if (!result.success) {
        toast.error(result.error || "Move failed");
        return;
      }
      props.onSelectedVaultPathsChange([nextPath.trim()]);
      toast.success("Path updated.");
      onRefreshVaultTree();
    } catch (error) {
      toast.error(`Move failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }, [onRefreshVaultTree, props.onSelectedVaultPathsChange, props.selectedVaultPaths]);

  const onDeleteSelectedVaultPaths = useCallback(async () => {
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
        const result = isNote
          ? await api.obsidian.deleteFile(path)
          : await api.obsidian.deleteFolder(path, true);
        if (!result.success) failures.push(`${path}: ${result.error || "delete failed"}`);
      } catch (error) {
        failures.push(`${path}: ${error instanceof Error ? error.message : "delete failed"}`);
      }
    }

    if (failures.length > 0) {
      toast.error(`Some deletes failed (${failures.length}).`);
    } else {
      toast.success("Selected paths deleted.");
    }
    props.onSelectedVaultPathsChange([]);
    onRefreshVaultTree();
  }, [onRefreshVaultTree, props.onSelectedVaultPathsChange, props.selectedVaultPaths]);

  const onSaveVaultEditor = useCallback(async () => {
    if (!vaultEditor.path.trim()) return;
    patchPanelState((prev) => ({
      vaultEditor: { ...prev.vaultEditor, saving: true },
    }));
    try {
      const result = await api.obsidian.saveFile(vaultEditor.path, vaultEditor.content);
      if (!result.success) {
        toast.error(result.error || "Failed to save note");
        patchPanelState((prev) => ({
          vaultEditor: { ...prev.vaultEditor, saving: false },
        }));
        return;
      }
      toast.success("Note saved.");
      props.onSelectedVaultPathsChange([vaultEditor.path]);
      patchPanelState((prev) => ({
        vaultEditor: { ...prev.vaultEditor, saving: false, open: false },
      }));
      onRefreshVaultTree();
    } catch (error) {
      toast.error(`Save failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      patchPanelState((prev) => ({
        vaultEditor: { ...prev.vaultEditor, saving: false },
      }));
    }
  }, [onRefreshVaultTree, props.onSelectedVaultPathsChange, vaultEditor.content, vaultEditor.path]);

  return {
    ankiDrafts,
    checkedObjectives,
    expandedVaultFolders,
    filteredVaultRootEntries,
    isDragActive,
    isLoadingVault,
    onClearSelectedMaterials,
    onCloseEditor: () =>
      patchPanelState((prev) => ({
        vaultEditor: { ...prev.vaultEditor, open: false, saving: false },
      })),
    onCreateVaultFolder,
    onCreateVaultNote,
    onDeleteSelectedVaultPaths,
    onDropFiles: (files) => {
      void props.onUploadFiles(files);
    },
    onEditSelectedVaultNote,
    onEditorChange: (value) =>
      patchPanelState((prev) => ({
        vaultEditor: { ...prev.vaultEditor, ...value },
      })),
    onOpenUploadPanel: (active) => patchPanelState({ isDragActive: active }),
    onRefreshVaultTree,
    onRenameSelectedVaultPath,
    onSaveVaultEditor,
    onSearchChange: (value) => patchPanelState({ vaultSearch: value }),
    onSelectAllMaterials,
    onSetSourcesTab: (value) => patchPanelState({ sourcesTab: value }),
    onToggleMaterial,
    onToggleObjectiveCheck,
    onToggleVaultFolder,
    onToggleVaultPath,
    openVaultEditor,
    sourcesTab,
    vaultEditor,
    vaultLoadError,
    vaultRefreshToken,
    vaultSearch,
  };
}

export function SourcesPanel(props: SourcesPanelProps) {
  const {
    ankiDrafts,
    checkedObjectives,
    expandedVaultFolders,
    filteredVaultRootEntries,
    isDragActive,
    isLoadingVault,
    onClearSelectedMaterials,
    onCloseEditor,
    onCreateVaultFolder,
    onCreateVaultNote,
    onDeleteSelectedVaultPaths,
    onDropFiles,
    onEditSelectedVaultNote,
    onEditorChange,
    onOpenUploadPanel,
    onRefreshVaultTree,
    onRenameSelectedVaultPath,
    onSaveVaultEditor,
    onSearchChange,
    onSelectAllMaterials,
    onSetSourcesTab,
    onToggleMaterial,
    onToggleObjectiveCheck,
    onToggleVaultFolder,
    onToggleVaultPath,
    openVaultEditor,
    sourcesTab,
    vaultEditor,
    vaultLoadError,
    vaultRefreshToken,
    vaultSearch,
  } = useSourcesPanelController(props);

  if (!props.isOpen) return null;

  return (
    <div className="absolute inset-0 z-40 bg-black/50">
      <aside className="absolute left-0 top-0 h-full w-full max-w-md border-r-2 border-primary bg-black/95 flex flex-col">
        <div className="flex items-center gap-2 p-3 border-b border-primary/30">
          <div className="font-arcade text-xs text-primary tracking-wider">SOURCES</div>
          <Badge variant="outline" className="rounded-none h-5 px-1.5 text-ui-2xs border-primary/40">
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
            onClick={() => onSetSourcesTab("materials")}
            className={`h-8 px-2 font-arcade text-ui-2xs border-2 ${
              sourcesTab === "materials"
                ? "border-primary text-primary bg-primary/10"
                : "border-secondary/40 text-muted-foreground hover:border-secondary hover:text-foreground"
            }`}
          >
            MATERIALS
          </button>
          <button
            type="button"
            onClick={() => onSetSourcesTab("vault")}
            className={`h-8 px-2 font-arcade text-ui-2xs border-2 ${
              sourcesTab === "vault"
                ? "border-primary text-primary bg-primary/10"
                : "border-secondary/40 text-muted-foreground hover:border-secondary hover:text-foreground"
            }`}
          >
            VAULT
          </button>
          <button
            type="button"
            onClick={() => onSetSourcesTab("objectives")}
            className={`h-8 px-1 font-arcade text-ui-3xs border-2 ${
              sourcesTab === "objectives"
                ? "border-primary text-primary bg-primary/10"
                : "border-secondary/40 text-muted-foreground hover:border-secondary hover:text-foreground"
            }`}
          >
            OBJECTIVES
          </button>
          <button
            type="button"
            onClick={() => onSetSourcesTab("flashcards")}
            className={`h-8 px-1 font-arcade text-ui-3xs border-2 ${
              sourcesTab === "flashcards"
                ? "border-primary text-primary bg-primary/10"
                : "border-secondary/40 text-muted-foreground hover:border-secondary hover:text-foreground"
            }`}
          >
            FLASHCARDS
          </button>
          <button
            type="button"
            onClick={() => onSetSourcesTab("map_of_contents")}
            className={`h-8 px-2 font-arcade text-ui-2xs border-2 ${
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
            <SourcesMaterialsTab
              availableMaterials={props.availableMaterials}
              fileInputRef={props.fileInputRef}
              isDragActive={isDragActive}
              isUploadingMaterial={props.isUploadingMaterial}
              onClearSelected={onClearSelectedMaterials}
              onDropFiles={onDropFiles}
              onSelectAll={onSelectAllMaterials}
              onToggleDragActive={onOpenUploadPanel}
              onToggleMaterial={onToggleMaterial}
              selectedMaterialIds={props.selectedMaterialIds}
            />
          )}

          {sourcesTab === "vault" && (
            <SourcesVaultTab
              expandedVaultFolders={expandedVaultFolders}
              isLoadingVault={isLoadingVault}
              isOpen={props.isOpen}
              onClearSelected={() => props.onSelectedVaultPathsChange([])}
              onCreateFolder={onCreateVaultFolder}
              onCreateNote={onCreateVaultNote}
              onDeleteSelected={onDeleteSelectedVaultPaths}
              onEditSelectedNote={onEditSelectedVaultNote}
              onRenameSelected={onRenameSelectedVaultPath}
              onRefresh={onRefreshVaultTree}
              onSaveEditor={onSaveVaultEditor}
              onToggleFolder={onToggleVaultFolder}
              onTogglePath={onToggleVaultPath}
              openVaultEditor={openVaultEditor}
              refreshToken={vaultRefreshToken}
              searchQuery={vaultSearch}
              selectedVaultPaths={props.selectedVaultPaths}
              sourcesTab={sourcesTab}
              vaultEditor={vaultEditor}
              vaultLoadError={vaultLoadError}
              vaultRootEntries={filteredVaultRootEntries}
              onSearchChange={onSearchChange}
              onEditorChange={onEditorChange}
              onCloseEditor={onCloseEditor}
            />
          )}

          {sourcesTab === "objectives" && (
            <SourcesObjectivesTab
              checkedObjectives={checkedObjectives}
              northStarSummary={props.northStarSummary}
              onToggleObjective={onToggleObjectiveCheck}
            />
          )}

          {sourcesTab === "flashcards" && (
            <SourcesFlashcardsTab draftCount={ankiDrafts.length} />
          )}

          {sourcesTab === "map_of_contents" && (
            <SourcesMapTab northStarSummary={props.northStarSummary} />
          )}
        </div>
      </aside>
    </div>
  );
}
