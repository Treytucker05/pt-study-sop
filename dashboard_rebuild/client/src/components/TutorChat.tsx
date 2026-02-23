import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  Loader2,
  FileText,
  CreditCard,
  Map,
  Table2,
  Network,
  CheckCircle2,
  XCircle,
  BookOpen,
  StickyNote,
  Upload,
  FolderPlus,
  RefreshCw,
  RotateCcw,
  Target,
  Pencil,
  Trash2,
  X,
  ChevronRight,
  ChevronDown,
  FileText as FileTextIcon,
  Folder as FolderIcon,
  SlidersHorizontal,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useQuery } from "@tanstack/react-query";
import {
  api,
  type BehaviorOverride,
  type Material,
  type TeachBackRubric,
  type TutorAccuracyProfile,
  type TutorCitation,
  type TutorRetrievalDebug,
  type TutorSSEChunk,
  type TutorVerdict,
} from "@/lib/api";
import { toast } from "sonner";

interface ToolAction {
  tool: string;
  success: boolean;
  message: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  citations?: TutorCitation[];
  model?: string;
  retrievalDebug?: TutorRetrievalDebug;
  isStreaming?: boolean;
  toolActions?: ToolAction[];
  verdict?: TutorVerdict;
  teachBackRubric?: TeachBackRubric;
}

export interface ChainBlock {
  id: number;
  name: string;
  category: string;
  description?: string;
  duration: number;
  facilitation_prompt?: string;
}

interface TutorChatProps {
  sessionId: string | null;
  courseId?: number;
  availableMaterials: Material[];
  selectedMaterialIds: number[];
  accuracyProfile: TutorAccuracyProfile;
  onAccuracyProfileChange: (profile: TutorAccuracyProfile) => void;
  onSelectedMaterialIdsChange: (ids: number[]) => void;
  onMaterialsChanged?: () => Promise<void> | void;
  onArtifactCreated: (artifact: { type: string; content: string; title?: string }) => void;
  onTurnComplete?: (masteryUpdate?: { skill_id: string; new_mastery: number; correct: boolean }) => void;
  initialTurns?: { question: string; answer: string | null }[];
}

type ArtifactType = "note" | "card" | "map" | "table" | "structured_map";
type SourceTab = "materials" | "vault" | "north_star";

interface NorthStarSummary {
  path?: string;
  status?: string;
  module_name?: string;
  course_name?: string;
  subtopic_name?: string;
  objective_ids?: string[];
  reference_targets?: string[];
}

interface VaultEditorState {
  open: boolean;
  path: string;
  content: string;
  saving: boolean;
}

function _basename(path: string): string {
  return String(path || "").split(/[\\/]/).pop() || path;
}

function _parentPath(path: string): string {
  const normalized = String(path || "").replace(/\\/g, "/").replace(/\/+$/, "");
  const idx = normalized.lastIndexOf("/");
  if (idx <= 0) return "";
  return normalized.slice(0, idx);
}

function _defaultNoteContent(notePath: string): string {
  const title = _basename(notePath).replace(/\.md$/i, "") || "New Note";
  const timestamp = new Date().toISOString();
  return `---
note_type: study_note
created_at: ${timestamp}
updated_at: ${timestamp}
---

# ${title}

## Summary

## Key Points
- 

## Questions
- 
`;
}

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

function parseArtifactCommand(message: string): { type: ArtifactType | null; title: string } {
  const trimmed = message.trim();
  if (/^\/(note|save)\b/i.test(trimmed)) {
    return {
      type: "note",
      title: trimmed.replace(/^\/(note|save)\s*/i, "").trim(),
    };
  }
  if (/^\/(card|flashcard)\b/i.test(trimmed)) {
    return {
      type: "card",
      title: trimmed.replace(/^\/(card|flashcard)\s*/i, "").trim(),
    };
  }
  if (/^\/(map|diagram)\b/i.test(trimmed)) {
    return {
      type: "map",
      title: trimmed.replace(/^\/(map|diagram)\s*/i, "").trim(),
    };
  }
  if (/^\/table\b/i.test(trimmed)) {
    return {
      type: "table",
      title: trimmed.replace(/^\/table\s*/i, "").trim(),
    };
  }
  if (/^\/(structured[_-]?map|smap)\b/i.test(trimmed)) {
    return {
      type: "structured_map",
      title: trimmed.replace(/^\/(structured[_-]?map|smap)\s*/i, "").trim(),
    };
  }
  return { type: null, title: "" };
}

/**
 * Detect markdown tables in LLM response text.
 * Returns the first table found (pipe-delimited with separator row).
 */
function detectMarkdownTable(text: string): string | null {
  const lines = text.split("\n");
  for (let i = 0; i < lines.length - 2; i++) {
    const headerLine = lines[i].trim();
    const sepLine = lines[i + 1].trim();
    // Header must have pipes, separator must be pipes + dashes
    if (
      headerLine.includes("|") &&
      /^[\s|:-]+$/.test(sepLine) &&
      sepLine.includes("-")
    ) {
      // Collect the full table
      const tableLines = [lines[i], lines[i + 1]];
      for (let j = i + 2; j < lines.length; j++) {
        if (lines[j].trim().includes("|")) {
          tableLines.push(lines[j]);
        } else {
          break;
        }
      }
      if (tableLines.length >= 3) return tableLines.join("\n");
    }
  }
  return null;
}

/**
 * Detect mermaid code blocks in LLM response text.
 * Returns the mermaid content (without fences) if found.
 */
function detectMermaidBlock(text: string): string | null {
  const match = text.match(/```mermaid\s*\n([\s\S]*?)```/);
  return match ? match[1].trim() : null;
}

const TOOL_LABELS: Record<string, string> = {
  save_to_obsidian: "Obsidian",
  create_note: "Notes",
  create_anki_card: "Anki",
};

const TOOL_ICONS: Record<string, typeof FileText> = {
  save_to_obsidian: BookOpen,
  create_note: StickyNote,
  create_anki_card: CreditCard,
};

function VerdictBadge({ verdict }: { verdict: TutorVerdict }) {
  const [expanded, setExpanded] = useState(false);
  const color =
    verdict.verdict === "pass"
      ? "border-green-600 text-green-400 bg-green-950/30"
      : verdict.verdict === "fail"
        ? "border-red-600 text-red-400 bg-red-950/30"
        : "border-yellow-600 text-yellow-400 bg-yellow-950/30";
  const label =
    verdict.verdict === "pass"
      ? "PASS"
      : verdict.verdict === "fail"
        ? "FAIL"
        : "PARTIAL";

  return (
    <div className={`mt-2 pt-2 border-t border-primary/20`}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className={`inline-flex items-center gap-2 px-3 py-1.5 font-arcade text-xs border-2 ${color}`}
      >
        {verdict.verdict === "pass" ? (
          <CheckCircle2 className="w-4 h-4" />
        ) : (
          <XCircle className="w-4 h-4" />
        )}
        {label}
        {verdict.confidence != null && (
          <span className="font-terminal text-[10px] opacity-70">
            ({Math.round(verdict.confidence * 100)}%)
          </span>
        )}
      </button>
      {expanded && (
        <div className="mt-2 space-y-1 font-terminal text-xs text-zinc-300">
          {verdict.why_wrong && (
            <p>
              <span className="text-red-400">Why wrong:</span> {verdict.why_wrong}
            </p>
          )}
          {verdict.error_location?.node && (
            <p>
              <span className="text-yellow-400">Error at:</span>{" "}
              {verdict.error_location.node}
              {verdict.error_location.prereq_from &&
                ` (prereq: ${verdict.error_location.prereq_from} → ${verdict.error_location.prereq_to})`}
            </p>
          )}
          {verdict.next_hint && (
            <p>
              <span className="text-blue-400">Hint:</span> {verdict.next_hint}
            </p>
          )}
          {verdict.next_question && (
            <p>
              <span className="text-primary">Next Q:</span> {verdict.next_question}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function TeachBackBadge({ rubric }: { rubric: TeachBackRubric }) {
  const [expanded, setExpanded] = useState(false);
  const color =
    rubric.overall_rating === "pass"
      ? "border-green-600 text-green-400 bg-green-950/30"
      : rubric.overall_rating === "fail"
        ? "border-red-600 text-red-400 bg-red-950/30"
        : "border-yellow-600 text-yellow-400 bg-yellow-950/30";
  const label =
    rubric.overall_rating === "pass"
      ? "TEACH-BACK PASS"
      : rubric.overall_rating === "fail"
        ? "TEACH-BACK FAIL"
        : "TEACH-BACK PARTIAL";

  return (
    <div className="mt-2 pt-2 border-t border-primary/20">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className={`inline-flex items-center gap-2 px-3 py-1.5 font-arcade text-xs border-2 ${color}`}
      >
        {rubric.overall_rating === "pass" ? (
          <CheckCircle2 className="w-4 h-4" />
        ) : (
          <XCircle className="w-4 h-4" />
        )}
        {label}
        <span className="font-terminal text-[10px] opacity-70">
          A:{rubric.accuracy_score} B:{rubric.breadth_score} S:{rubric.synthesis_score}
        </span>
      </button>
      {expanded && (
        <div className="mt-2 space-y-1 font-terminal text-xs text-zinc-300">
          {rubric._mastery_blocked && (
            <p className="text-red-400">Mastery blocked — improve teach-back to unlock</p>
          )}
          {rubric.strengths && rubric.strengths.length > 0 && (
            <p>
              <span className="text-green-400">Strengths:</span> {rubric.strengths.join(", ")}
            </p>
          )}
          {rubric.misconceptions && rubric.misconceptions.length > 0 && (
            <p>
              <span className="text-red-400">Misconceptions:</span> {rubric.misconceptions.join(", ")}
            </p>
          )}
          {rubric.gaps && rubric.gaps.length > 0 && (
            <p>
              <span className="text-yellow-400">Gaps:</span>{" "}
              {rubric.gaps.map((g) => g.skill_id).join(", ")}
            </p>
          )}
          {rubric.next_focus && (
            <p>
              <span className="text-primary">Next focus:</span> {rubric.next_focus}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function TutorChat({
  sessionId,
  courseId,
  availableMaterials,
  selectedMaterialIds,
  accuracyProfile,
  onAccuracyProfileChange,
  onSelectedMaterialIdsChange,
  onMaterialsChanged,
  onArtifactCreated,
  onTurnComplete,
  initialTurns,
}: TutorChatProps) {
  const vaultSelectionKey = "tutor.chat.selected_vault_paths.v1";
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [behaviorOverride, setBehaviorOverride] = useState<BehaviorOverride | null>(null);
  const [isSourcesOpen, setIsSourcesOpen] = useState(false);
  const [sourcesTab, setSourcesTab] = useState<SourceTab>("materials");
  const [isUploadingMaterial, setIsUploadingMaterial] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [vaultSearch, setVaultSearch] = useState("");
  const [vaultRefreshToken, setVaultRefreshToken] = useState(0);
  const [expandedVaultFolders, setExpandedVaultFolders] = useState<Set<string>>(new Set());
  const [selectedVaultPaths, setSelectedVaultPaths] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(vaultSelectionKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
    } catch {
      return [];
    }
  });
  const [northStarSummary, setNorthStarSummary] = useState<NorthStarSummary | null>(null);
  const [vaultEditor, setVaultEditor] = useState<VaultEditorState>({
    open: false,
    path: "",
    content: "",
    saving: false,
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamAbortRef = useRef<AbortController | null>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, [sessionId]);

  // Reset transient chat state when session context changes.
  // If initialTurns are provided (session restore), hydrate messages from them.
  useEffect(() => {
    streamAbortRef.current?.abort();
    streamAbortRef.current = null;
    setInput("");
    setIsStreaming(false);
    if (initialTurns && initialTurns.length > 0) {
      const restored: ChatMessage[] = [];
      for (const turn of initialTurns) {
        restored.push({ role: "user", content: turn.question });
        if (turn.answer) {
          restored.push({ role: "assistant", content: turn.answer });
        }
      }
      setMessages(restored);
    } else {
      setMessages([]);
    }
  }, [sessionId, initialTurns]);

  useEffect(() => {
    try {
      localStorage.setItem(vaultSelectionKey, JSON.stringify(selectedVaultPaths));
    } catch {
      /* ignore localStorage write errors */
    }
  }, [selectedVaultPaths]);

  const {
    data: vaultRootData,
    isFetching: isLoadingVault,
    error: vaultLoadError,
  } = useQuery({
    queryKey: ["tutor", "obsidian", "files", "root", vaultRefreshToken],
    queryFn: () => api.obsidian.getFiles(""),
    enabled: isSourcesOpen && sourcesTab === "vault",
  });

  useEffect(() => {
    if (!sessionId) return;
    let alive = true;
    const loadSessionContext = async () => {
      try {
        const session = await api.tutor.getSession(sessionId);
        const filter = (session.content_filter || {}) as Record<string, unknown>;
        const folders = Array.isArray(filter.folders)
          ? filter.folders.filter((v): v is string => typeof v === "string")
          : [];
        if (alive && folders.length > 0) {
          setSelectedVaultPaths((prev) => (prev.length > 0 ? prev : folders));
        }
        const northStar = filter.north_star;
        const refs = Array.isArray(filter.reference_targets)
          ? filter.reference_targets.filter((v): v is string => typeof v === "string")
          : [];
        if (alive && northStar && typeof northStar === "object") {
          const rec = northStar as Record<string, unknown>;
          setNorthStarSummary({
            path: typeof rec.path === "string" ? rec.path : undefined,
            status: typeof rec.status === "string" ? rec.status : undefined,
            module_name: typeof rec.module_name === "string" ? rec.module_name : undefined,
            course_name: typeof rec.course_name === "string" ? rec.course_name : undefined,
            subtopic_name: typeof rec.subtopic_name === "string" ? rec.subtopic_name : undefined,
            objective_ids: Array.isArray(rec.objective_ids)
              ? rec.objective_ids.filter((v): v is string => typeof v === "string")
              : [],
            reference_targets: refs,
          });
        } else if (alive) {
          setNorthStarSummary(null);
        }
      } catch {
        if (alive) setNorthStarSummary(null);
      }
    };
    void loadSessionContext();
    return () => {
      alive = false;
    };
  }, [sessionId]);

  const toggleVaultPath = useCallback((path: string) => {
    setSelectedVaultPaths((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path],
    );
  }, []);

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
      selectedVaultPaths.length === 1 && !selectedVaultPaths[0].toLowerCase().endsWith(".md")
        ? selectedVaultPaths[0]
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
  }, [refreshVaultTree, selectedVaultPaths]);

  const handleCreateVaultNote = useCallback(async () => {
    const base =
      selectedVaultPaths.length === 1 && !selectedVaultPaths[0].toLowerCase().endsWith(".md")
        ? selectedVaultPaths[0]
        : selectedVaultPaths.length === 1
          ? _parentPath(selectedVaultPaths[0])
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
      setSelectedVaultPaths([normalized]);
      toast.success(`Note created: ${normalized}`);
      refreshVaultTree();
      await openVaultEditor(normalized, content);
    } catch (err) {
      toast.error(`Create note failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }, [openVaultEditor, refreshVaultTree, selectedVaultPaths]);

  const handleEditSelectedVaultNote = useCallback(async () => {
    if (selectedVaultPaths.length !== 1) {
      toast.error("Select exactly one note to edit.");
      return;
    }
    const path = selectedVaultPaths[0];
    if (!path.toLowerCase().endsWith(".md")) {
      toast.error("Only markdown notes can be edited.");
      return;
    }
    await openVaultEditor(path);
  }, [openVaultEditor, selectedVaultPaths]);

  const handleRenameSelectedVaultPath = useCallback(async () => {
    if (selectedVaultPaths.length !== 1) {
      toast.error("Select exactly one file or folder to rename.");
      return;
    }
    const currentPath = selectedVaultPaths[0];
    const nextPath = window.prompt("Rename/move to:", currentPath);
    if (!nextPath || nextPath.trim() === currentPath) return;
    try {
      const res = await api.obsidian.movePath(currentPath, nextPath.trim());
      if (!res.success) {
        toast.error(res.error || "Move failed");
        return;
      }
      setSelectedVaultPaths([nextPath.trim()]);
      toast.success("Path updated.");
      refreshVaultTree();
    } catch (err) {
      toast.error(`Move failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }, [refreshVaultTree, selectedVaultPaths]);

  const handleDeleteSelectedVaultPaths = useCallback(async () => {
    if (selectedVaultPaths.length === 0) {
      toast.error("Select at least one path to delete.");
      return;
    }
    const confirmDelete = window.confirm(
      `Delete ${selectedVaultPaths.length} selected path(s)? This cannot be undone.`,
    );
    if (!confirmDelete) return;

    const failures: string[] = [];
    for (const path of selectedVaultPaths) {
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
    setSelectedVaultPaths([]);
    refreshVaultTree();
  }, [refreshVaultTree, selectedVaultPaths]);

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
      setSelectedVaultPaths([vaultEditor.path]);
      setVaultEditor((prev) => ({ ...prev, saving: false, open: false }));
      refreshVaultTree();
    } catch (err) {
      toast.error(`Save failed: ${err instanceof Error ? err.message : "Unknown error"}`);
      setVaultEditor((prev) => ({ ...prev, saving: false }));
    }
  }, [refreshVaultTree, vaultEditor.content, vaultEditor.path]);

  const toggleMaterial = useCallback(
    (materialId: number) => {
      if (selectedMaterialIds.includes(materialId)) {
        onSelectedMaterialIdsChange(selectedMaterialIds.filter((id) => id !== materialId));
        return;
      }
      onSelectedMaterialIdsChange([...selectedMaterialIds, materialId]);
    },
    [onSelectedMaterialIdsChange, selectedMaterialIds],
  );

  const selectAllMaterials = useCallback(() => {
    onSelectedMaterialIdsChange(availableMaterials.map((m) => m.id));
  }, [availableMaterials, onSelectedMaterialIdsChange]);

  const clearSelectedMaterials = useCallback(() => {
    onSelectedMaterialIdsChange([]);
  }, [onSelectedMaterialIdsChange]);

  const handleUploadFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setIsUploadingMaterial(true);
      try {
        const uploadedIds: number[] = [];
        for (const file of Array.from(files)) {
          const result = await api.tutor.uploadMaterial(file, { course_id: courseId });
          uploadedIds.push(result.duplicate_of?.id ?? result.id);
        }
        if (onMaterialsChanged) {
          await onMaterialsChanged();
        }
        const merged = Array.from(new Set([...selectedMaterialIds, ...uploadedIds]));
        onSelectedMaterialIdsChange(merged);
        toast.success(
          uploadedIds.length === 1
            ? "Material uploaded and added to this chat"
            : `${uploadedIds.length} materials uploaded and added to this chat`,
        );
      } catch (err) {
        toast.error(`Upload failed: ${err instanceof Error ? err.message : "Unknown error"}`);
      } finally {
        setIsUploadingMaterial(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [courseId, onMaterialsChanged, onSelectedMaterialIdsChange, selectedMaterialIds],
  );

  const sendMessage = useCallback(async () => {
    if (!input.trim() || !sessionId || isStreaming) return;

    const userMessage = input.trim();
    const command = parseArtifactCommand(userMessage);
    setInput("");
    const abortController = new AbortController();
    streamAbortRef.current = abortController;

    // Add user message and placeholder assistant message in one atomic update.
    setMessages((prev) => [
      ...prev,
      { role: "user", content: userMessage },
      { role: "assistant", content: "", isStreaming: true },
    ]);
    setIsStreaming(true);
    const activeBehavior = behaviorOverride;
    setBehaviorOverride(null);

    try {
      const response = await fetch(`/api/tutor/session/${sessionId}/turn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          content_filter: {
            material_ids: selectedMaterialIds,
            accuracy_profile: accuracyProfile,
            ...(selectedVaultPaths.length > 0 ? { folders: selectedVaultPaths } : {}),
          },
          behavior_override: activeBehavior,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        let message = `HTTP ${response.status} ${response.statusText}`;
        try {
          const text = await response.text();
          if (text) {
            try {
              const parsed = JSON.parse(text) as { error?: string };
              message = parsed.error || text;
            } catch {
              message = text;
            }
          }
        } catch {
          // ignore parse failures and keep status text
        }
        throw new Error(message);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No response body from tutor stream");

      let buffer = "";
      let fullText = "";
      let citations: TutorCitation[] = [];
      let modelId: string | undefined;
      let retrievalDebug: TutorRetrievalDebug | undefined;
      let serverArtifactCmd: { type?: string; raw?: string } | null = null;
      let verdictData: TutorVerdict | undefined;
      let teachBackData: TeachBackRubric | undefined;
      let masteryUpdateData: { skill_id: string; new_mastery: number; correct: boolean } | undefined;
      let streamErrored = false;
      let doneSignal = false;
      const toolActions: ToolAction[] = [];

      while (!doneSignal) {
        const { done, value } = await reader.read();
        if (done) {
          buffer += decoder.decode();
          doneSignal = true;
        } else {
          buffer += decoder.decode(value, { stream: true });
        }

        const lines = buffer.split("\n");
        if (!doneSignal) {
          buffer = lines.pop() ?? "";
        } else {
          buffer = "";
        }

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") {
            doneSignal = true;
            break;
          }

          try {
            const parsed: TutorSSEChunk = JSON.parse(data);

            if (parsed.type === "error") {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (!last || last.role !== "assistant") return prev;
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: `Error: ${parsed.content}`,
                };
                return updated;
              });
              streamErrored = true;
              setIsStreaming(false);
              doneSignal = true;
              break;
            }

            if (parsed.type === "web_search_searching") {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (!last || last.role !== "assistant") return prev;
                updated[updated.length - 1] = {
                  ...last,
                  content: "Searching the web...\n\n",
                  isStreaming: true,
                };
                return updated;
              });
            }

            if (parsed.type === "web_search_completed") {
              fullText = "";
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (!last || last.role !== "assistant") return prev;
                updated[updated.length - 1] = {
                  ...last,
                  content: "",
                  isStreaming: true,
                };
                return updated;
              });
            }

            if (parsed.type === "tool_call" && parsed.content) {
              try {
                const tc = JSON.parse(parsed.content) as { tool?: string };
                const toolLabel = TOOL_LABELS[tc.tool ?? ""] ?? tc.tool ?? "tool";
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (!last || last.role !== "assistant") return prev;
                  updated[updated.length - 1] = {
                    ...last,
                    content: last.content + `\n\n> *Using ${toolLabel}...*\n\n`,
                    isStreaming: true,
                  };
                  return updated;
                });
              } catch { /* ignore malformed */ }
            }

            if (parsed.type === "tool_result" && parsed.content) {
              try {
                const tr = JSON.parse(parsed.content) as { tool?: string; success?: boolean; message?: string };
                toolActions.push({
                  tool: tr.tool ?? "unknown",
                  success: tr.success ?? false,
                  message: tr.message ?? "",
                });
              } catch { /* ignore malformed */ }
            }

            if (parsed.type === "token" && parsed.content) {
              fullText += parsed.content;
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (!last || last.role !== "assistant") return prev;
                updated[updated.length - 1] = {
                  ...last,
                  content: last.content + parsed.content!,
                  isStreaming: true,
                };
                return updated;
              });
            }

            if (parsed.type === "done") {
              citations = parsed.citations ?? [];
              modelId = parsed.model;
              retrievalDebug = parsed.retrieval_debug;
              verdictData = parsed.verdict;
              teachBackData = parsed.teach_back_rubric;
              masteryUpdateData = parsed.mastery_update;
              // Backend detected natural language artifact command
              if (parsed.artifacts?.length) {
                const cmd = parsed.artifacts[0] as { type?: string; raw?: string };
                if (cmd.type && !command.type) {
                  serverArtifactCmd = cmd;
                }
              }
            }
          } catch {
            /* skip malformed */
          }
        }
      }

      if (streamErrored) {
        return;
      }

      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (!last || last.role !== "assistant") return prev;
        updated[updated.length - 1] = {
          role: "assistant",
          content: fullText,
          citations,
          model: modelId,
          retrievalDebug,
          isStreaming: false,
          toolActions: toolActions.length > 0 ? toolActions : undefined,
          verdict: verdictData,
          teachBackRubric: teachBackData,
        };
        return updated;
      });

      // Notify turn completion (with mastery update if present)
      onTurnComplete?.(masteryUpdateData);

      // Handle artifact slash commands after response
      if (command.type) {
        const fallbackTitle = `Tutor ${command.type}`;
        onArtifactCreated({
          type: command.type,
          content: fullText,
          title: command.title || fallbackTitle,
        });
      } else if (
        serverArtifactCmd?.type &&
        ["note", "card", "map", "table", "structured_map"].includes(serverArtifactCmd.type)
      ) {
        // Backend detected natural language artifact command
        onArtifactCreated({
          type: serverArtifactCmd.type,
          content: fullText,
          title: userMessage.slice(0, 80).trim(),
        });
      } else {
        // Auto-detect tables and structured maps in the response
        const detectedTable = detectMarkdownTable(fullText);
        if (detectedTable) {
          onArtifactCreated({
            type: "table",
            content: detectedTable,
            title: `Table from turn`,
          });
        }
        const detectedMermaid = detectMermaidBlock(fullText);
        if (detectedMermaid) {
          onArtifactCreated({
            type: "structured_map",
            content: "```mermaid\n" + detectedMermaid + "\n```",
            title: `Structured map from turn`,
          });
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (!last || last.role !== "assistant") return prev;
        updated[updated.length - 1] = {
          role: "assistant",
          content: `Connection error: ${err instanceof Error ? err.message : "Unknown"}`,
        };
        return updated;
      });
    } finally {
      if (streamAbortRef.current === abortController) {
        streamAbortRef.current = null;
      }
      setIsStreaming(false);
    }
  }, [
    input,
    sessionId,
    isStreaming,
    behaviorOverride,
    onArtifactCreated,
    onTurnComplete,
    selectedMaterialIds,
    selectedVaultPaths,
    accuracyProfile,
  ]);



  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const selectedMaterialLabels = useMemo(
    () =>
      availableMaterials
        .filter((m) => selectedMaterialIds.includes(m.id))
        .map((m) => m.title || `Material ${m.id}`),
    [availableMaterials, selectedMaterialIds],
  );

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

  if (!sessionId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-2">
          <div className="font-arcade text-sm text-muted-foreground">
            NO ACTIVE SESSION
          </div>
          <div className="font-terminal text-lg text-muted-foreground/70">
            Configure content filter and start a session
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-0">
      <div className="flex flex-col h-full min-h-0 flex-1">
        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto space-y-4 bg-black/40 p-4 lg:p-6"
        >
          {messages.length === 0 && (
            <div className="text-center py-8 space-y-2">
              <div className="font-arcade text-sm text-primary">
                SESSION STARTED
              </div>
              <div className="font-terminal text-lg text-muted-foreground leading-7">
                Ask a question to begin learning. Use /note, /card, /map, /table, or /smap for artifacts.
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`px-3 py-2 text-[17px] leading-7 font-terminal overflow-hidden ${msg.role === "user"
                  ? "max-w-[72%]"
                  : "max-w-[96%]"
                  } ${msg.role === "user"
                    ? "bg-primary/15 border-2 border-primary/40 text-foreground"
                    : "bg-black/40 border-2 border-secondary text-foreground"
                  }`}
              >
                {msg.role === "assistant" ? (
                  <div className="prose prose-invert prose-lg max-w-none font-terminal [&_p]:my-2 [&_li]:my-1 [&_p]:leading-7 [&_li]:leading-7 [&_code]:text-base [&_pre]:text-base [&_pre]:overflow-x-auto [&_code]:break-words [&_a]:break-all">
                    {msg.content ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    ) : msg.isStreaming ? (
                      <div className="flex items-center gap-1.5 py-1">
                        <span className="inline-block w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="inline-block w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="inline-block w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    ) : null}
                    {msg.isStreaming && msg.content && (
                      <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-0.5" />
                    )}
                  </div>
                ) : (
                  <div>{msg.content}</div>
                )}

                {msg.role === "assistant" && msg.toolActions?.length ? (
                  <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-primary/20">
                    {msg.toolActions.map((ta, j) => {
                      const Icon = TOOL_ICONS[ta.tool] ?? FileText;
                      return (
                        <div
                          key={j}
                          className={`flex items-center gap-1.5 px-2 py-1 text-xs font-terminal border ${ta.success
                            ? "border-green-600/50 text-green-400 bg-green-950/30"
                            : "border-red-600/50 text-red-400 bg-red-950/30"
                            }`}
                        >
                          {ta.success ? (
                            <CheckCircle2 className="w-3 h-3 shrink-0" />
                          ) : (
                            <XCircle className="w-3 h-3 shrink-0" />
                          )}
                          <Icon className="w-3 h-3 shrink-0" />
                          <span className="truncate max-w-[200px]">{ta.message}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                {msg.verdict && !msg.isStreaming && (
                  <VerdictBadge verdict={msg.verdict} />
                )}

                {msg.teachBackRubric && !msg.isStreaming && (
                  <TeachBackBadge rubric={msg.teachBackRubric} />
                )}

                {msg.role === "assistant" && msg.content && !msg.isStreaming && (
                  <div className="flex items-center gap-1 mt-2 pt-2 border-t border-primary/20">
                    <button
                      onClick={() =>
                        onArtifactCreated({
                          type: "note",
                          content: msg.content,
                          title: `Tutor note ${i}`,
                        })
                      }
                      className="flex items-center gap-1 px-2 py-1 text-xs font-arcade text-muted-foreground hover:text-primary hover:bg-primary/10 border-2 border-primary/20 hover:border-primary/50 transition-colors shadow-none"
                    >
                      <FileText className="w-3 h-3 text-primary/60" /> Save Note
                    </button>
                    <button
                      onClick={() =>
                        onArtifactCreated({
                          type: "card",
                          content: msg.content,
                          title: `Tutor card ${i}`,
                        })
                      }
                      className="flex items-center gap-1 px-2 py-1 text-xs font-arcade text-muted-foreground hover:text-primary hover:bg-primary/10 border-2 border-primary/20 hover:border-primary/50 transition-colors shadow-none"
                    >
                      <CreditCard className="w-3 h-3 text-primary/60" /> Create Card
                    </button>
                    <button
                      onClick={() => {
                        onArtifactCreated({
                          type: "map",
                          content: msg.content,
                          title: `Tutor map ${i}`,
                        });
                      }}
                      className="flex items-center gap-1 px-2 py-1 text-xs font-arcade text-muted-foreground hover:text-primary hover:bg-primary/10 border-2 border-primary/20 hover:border-primary/50 transition-colors shadow-none"
                    >
                      <Map className="w-3 h-3 text-primary/60" /> Create Map
                    </button>
                    {detectMarkdownTable(msg.content) && (
                      <button
                        onClick={() => {
                          const table = detectMarkdownTable(msg.content);
                          if (table) {
                            onArtifactCreated({
                              type: "table",
                              content: table,
                              title: `Table ${i}`,
                            });
                          }
                        }}
                        className="flex items-center gap-1 px-2 py-1 text-xs font-arcade text-muted-foreground hover:text-primary hover:bg-primary/10 border-2 border-primary/20 hover:border-primary/50 transition-colors shadow-none"
                      >
                        <Table2 className="w-3 h-3 text-primary/60" /> Save Table
                      </button>
                    )}
                    {detectMermaidBlock(msg.content) && (
                      <button
                        onClick={() => {
                          const mermaid = detectMermaidBlock(msg.content);
                          if (mermaid) {
                            onArtifactCreated({
                              type: "structured_map",
                              content: "```mermaid\n" + mermaid + "\n```",
                              title: `Structured map ${i}`,
                            });
                          }
                        }}
                        className="flex items-center gap-1 px-2 py-1 text-xs font-arcade text-muted-foreground hover:text-primary hover:bg-primary/10 border-2 border-primary/20 hover:border-primary/50 transition-colors shadow-none"
                      >
                        <Network className="w-3 h-3 text-primary/60" /> Save Map
                      </button>
                    )}
                  </div>
                )}

                {/* Citations + Model */}
                {(msg.citations?.length || msg.model || msg.retrievalDebug) && !msg.isStreaming ? (
                  <div className="flex flex-wrap items-center gap-1 mt-2 pt-2 border-t border-primary/20">
                    {msg.retrievalDebug ? (
                      <Badge variant="outline" className="text-[11px] rounded-none text-muted-foreground/80">
                        RAG {msg.retrievalDebug.effective_accuracy_profile ?? msg.retrievalDebug.accuracy_profile ?? "strict"}{msg.retrievalDebug.profile_escalated ? " (escalated)" : ""} | conf {(msg.retrievalDebug.retrieval_confidence ?? 0).toFixed(2)} ({msg.retrievalDebug.retrieval_confidence_tier ?? "low"}) | uniq {msg.retrievalDebug.retrieved_material_unique_sources ?? 0} | top {Math.round((msg.retrievalDebug.material_top_source_share ?? 0) * 100)}% | dropped {msg.retrievalDebug.material_dropped_by_cap ?? 0}
                      </Badge>
                    ) : null}
                    {msg.citations?.map((c) =>
                      c.url ? (
                        <a
                          key={c.index}
                          href={c.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Badge
                            variant="outline"
                            className="text-sm rounded-none cursor-pointer hover:bg-primary/10"
                          >
                            [{c.index}] {c.source}
                          </Badge>
                        </a>
                      ) : (
                        <Badge
                          key={c.index}
                          variant="outline"
                          className="text-sm rounded-none"
                        >
                          [{c.index}] {c.source}
                        </Badge>
                      )
                    )}
                    {msg.model && (
                      <Badge variant="outline" className="text-sm rounded-none text-muted-foreground/60 ml-auto">
                        {msg.model}
                      </Badge>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 p-4 lg:p-5 border-t-2 border-primary/20 bg-black/50">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => void handleUploadFiles(e.target.files)}
          />

          <div className="flex flex-wrap items-center gap-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsSourcesOpen((prev) => !prev)}
              className={`h-9 rounded-none px-3 font-arcade text-[10px] border-2 ${
                isSourcesOpen
                  ? "border-primary text-primary bg-primary/15"
                  : "border-secondary/40 text-muted-foreground hover:border-secondary hover:text-foreground"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5" />
              SOURCES
            </Button>
            <div className="flex items-center gap-2 min-w-0">
              <label
                htmlFor="accuracy-profile-select"
                className="font-terminal text-xs text-muted-foreground whitespace-nowrap"
              >
                Profile
              </label>
              <select
                id="accuracy-profile-select"
                value={accuracyProfile}
                onChange={(e) => onAccuracyProfileChange(e.target.value as TutorAccuracyProfile)}
                disabled={isStreaming}
                className="h-9 bg-black border-2 border-secondary px-2 text-xs font-terminal text-foreground focus:border-primary focus:outline-none disabled:opacity-50"
              >
                <option value="balanced">Balanced</option>
                <option value="strict">Strict</option>
                <option value="coverage">Coverage</option>
              </select>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(["socratic", "evaluate", "concept_map", "teach_back"] as const).map((mode) => {
                const active = behaviorOverride === mode;
                const labels: Record<BehaviorOverride, string> = {
                  socratic: "ASK / SOCRATIC",
                  evaluate: "EVALUATE",
                  concept_map: "CONCEPT MAP",
                  teach_back: "TEACH-BACK",
                };
                const titles: Record<BehaviorOverride, string> = {
                  socratic: "Socratic — respond with questions only",
                  evaluate: "Evaluate — assess your answer",
                  concept_map: "Concept Map — generate Mermaid diagram",
                  teach_back: "Teach-Back — explain as if teaching a novice",
                };
                return (
                  <button
                    key={mode}
                    type="button"
                    title={titles[mode]}
                    onClick={() => setBehaviorOverride(active ? null : mode)}
                    disabled={isStreaming}
                    className={`h-8 px-3 font-arcade text-[10px] tracking-wider border-2 transition-colors disabled:opacity-50 ${active
                      ? "bg-primary/20 border-primary text-primary"
                      : "border-secondary/40 text-muted-foreground hover:border-secondary hover:text-foreground"
                      }`}
                  >
                    {labels[mode]}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex md:flex-row flex-col items-stretch md:items-center gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question..."
              disabled={isStreaming}
              className="flex-1 min-w-[180px] bg-black/40 border-2 border-primary rounded-none px-3 py-2 text-[17px] leading-7 font-terminal text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none disabled:opacity-50 shadow-none"
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || isStreaming}
              aria-label="Send message"
              className="rounded-none border-[3px] border-double border-primary h-11 w-full md:w-11 p-0 shrink-0"
            >
              {isStreaming ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              ) : (
                <Send className="w-5 h-5 mx-auto" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {isSourcesOpen && (
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
                onClick={() => setIsSourcesOpen(false)}
                className="ml-auto h-8 w-8 p-0 rounded-none border-2 border-secondary/40 text-muted-foreground hover:border-secondary hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-1 p-2 border-b border-primary/20">
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
                onClick={() => setSourcesTab("north_star")}
                className={`h-8 px-2 font-arcade text-[10px] border-2 ${
                  sourcesTab === "north_star"
                    ? "border-primary text-primary bg-primary/10"
                    : "border-secondary/40 text-muted-foreground hover:border-secondary hover:text-foreground"
                }`}
              >
                NORTH STAR
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
                      void handleUploadFiles(e.dataTransfer.files);
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
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingMaterial}
                      className="h-8 rounded-none px-3 font-arcade text-[10px] gap-1.5 border-2 border-primary/60 bg-primary/10 hover:bg-primary/20"
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
                      onClick={() => setSelectedVaultPaths([])}
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
                            checked={selectedVaultPaths.includes(fullPath)}
                            expanded={expanded}
                            onTogglePath={toggleVaultPath}
                            onToggleFolder={toggleVaultFolder}
                          />
                          {isFolder && expanded && (
                            <VaultTreeChildren
                              folderPath={fullPath}
                              depth={1}
                              selectedPaths={selectedVaultPaths}
                              expandedFolders={expandedVaultFolders}
                              onTogglePath={toggleVaultPath}
                              onToggleFolder={toggleVaultFolder}
                              searchQuery={vaultSearch}
                              refreshToken={vaultRefreshToken}
                              enabled={isSourcesOpen && sourcesTab === "vault"}
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

              {sourcesTab === "north_star" && (
                <div className="space-y-2">
                  <div className="border border-primary/30 p-2">
                    <div className="font-arcade text-[10px] text-primary mb-2">NORTH STAR CONTEXT</div>
                    <div className="text-xs font-terminal text-muted-foreground space-y-1">
                      <div><span className="text-foreground">Course:</span> {northStarSummary?.course_name || "N/A"}</div>
                      <div><span className="text-foreground">Module:</span> {northStarSummary?.module_name || "N/A"}</div>
                      <div><span className="text-foreground">Subtopic:</span> {northStarSummary?.subtopic_name || "N/A"}</div>
                      <div><span className="text-foreground">Status:</span> {northStarSummary?.status || "unknown"}</div>
                      <div><span className="text-foreground">Path:</span> {northStarSummary?.path || "N/A"}</div>
                    </div>
                  </div>
                  <div className="border border-primary/20 p-2">
                    <div className="font-arcade text-[10px] text-primary mb-2">OBJECTIVES</div>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {(northStarSummary?.objective_ids || []).slice(0, 80).map((oid) => (
                        <div key={oid} className="text-xs font-terminal text-muted-foreground border border-secondary/30 px-2 py-1">
                          {oid}
                        </div>
                      ))}
                      {(!northStarSummary?.objective_ids || northStarSummary.objective_ids.length === 0) && (
                        <div className="text-xs font-terminal text-muted-foreground">No objective IDs loaded.</div>
                      )}
                    </div>
                  </div>
                  <div className="border border-primary/20 p-2">
                    <div className="font-arcade text-[10px] text-primary mb-2 flex items-center gap-1">
                      <Target className="w-3.5 h-3.5" /> REFERENCE TARGETS
                    </div>
                    <div className="max-h-56 overflow-y-auto space-y-1">
                      {(northStarSummary?.reference_targets || []).slice(0, 80).map((ref) => (
                        <div key={ref} className="text-xs font-terminal text-muted-foreground border border-secondary/30 px-2 py-1">
                          {ref}
                        </div>
                      ))}
                      {(!northStarSummary?.reference_targets || northStarSummary.reference_targets.length === 0) && (
                        <div className="text-xs font-terminal text-muted-foreground">No active reference targets.</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
