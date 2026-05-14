import { PageScaffold } from "@/components/PageScaffold";
import { useState, useEffect, useMemo, useCallback, type ReactElement } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  consumeLibraryLaunchFromTutor,
  readTutorSelectedMaterialIds,
  writeTutorStoredStartState,
  writeTutorSelectedMaterialIds,
} from "@/lib/tutorClientState";
import type {
  Material,
  MaterialContent,
  TutorEmbedStatus,
  TutorSyncJobStatus,
  TutorContentSources,
  TutorSyncPreviewNode,
  TutorSyncPreviewResult,
  SemesterIntakePreviewResult,
} from "@/lib/api";
import type { Course } from "@shared/schema";
import { useLocation } from "wouter";
import {
  TEXT_PAGE_TITLE,
  TEXT_BODY,
  TEXT_MUTED,
  TEXT_BADGE,
  INPUT_BASE,
  ICON_SM,
  ICON_MD,
  PANEL_PADDING,
  SELECT_BASE,
} from "@/lib/theme";
import { Badge } from "@/components/ui/badge";
import { HudButton } from "@/components/ui/HudButton";
import { HudPanel } from "@/components/ui/HudPanel";
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
  ChevronRight,
  GraduationCap,
  Eye,
  AlertTriangle,
  Upload,
  Archive,
  ArchiveRestore,
  ChevronDown,
  Plus,
  Play,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const FILE_TYPE_LABEL: Record<string, string> = {
  pdf: "PDF",
  docx: "DOCX",
  pptx: "PPTX",
  md: "MD",
  txt: "TXT",
};
const ALL_FOLDERS_KEY = "";
const DEFAULT_SEMESTER_INTAKE_FOLDER =
  "/Users/fst/Library/CloudStorage/OneDrive-Personal/Desktop/PT School";
const LIBRARY_PANEL_SURFACE = "library-panel-surface";
const LIBRARY_PANEL_INSET = "library-panel-inset";
const LIBRARY_ACTION_BUTTON = "library-action-button";
const LIBRARY_COMPACT_BUTTON = `${LIBRARY_ACTION_BUTTON} w-auto h-9 min-h-[36px] px-4`;
const LIBRARY_INLINE_BUTTON = `${LIBRARY_ACTION_BUTTON} library-action-button--inline w-auto h-8 min-h-[32px] px-3`;
const LIBRARY_SELECT = `${SELECT_BASE} library-field h-10 min-h-[40px] rounded-[0.75rem] px-3`;
const LIBRARY_SECTION_LABEL = "library-section-label";
const LIBRARY_MAIN_TITLE =
  "font-arcade text-base uppercase tracking-[0.16em] text-white";
const LIBRARY_PANEL_TITLE = "library-panel-title";
const LIBRARY_HELP_TEXT = "library-help-text";
const LIBRARY_READY_BADGE =
  "rounded-[0.55rem] border border-emerald-400/35 bg-emerald-400/10 px-2 py-1 font-terminal text-sm uppercase tracking-[0.12em] text-emerald-200";
const LIBRARY_WARN_BADGE =
  "rounded-[0.55rem] border border-amber-400/35 bg-amber-400/10 px-2 py-1 font-terminal text-sm uppercase tracking-[0.12em] text-amber-200";
type AddCourseworkMode = "intake" | "sync" | "upload";
type MaterialRole = "study" | "reference" | "setup";
type SemesterPreviewCourse = SemesterIntakePreviewResult["courses"][number];

function collectSemesterMaterialFilePaths(
  preview: SemesterIntakePreviewResult | null | undefined,
): string[] {
  if (!preview) return [];
  return preview.courses.flatMap((course) =>
    course.material_files.map((file) => file.path),
  );
}

function getFileTypeLabel(fileType: string | null | undefined): string {
  const normalizedRaw = (fileType || "").toLowerCase().trim();
  const normalized = ["", "null", "none"].includes(normalizedRaw)
    ? ""
    : normalizedRaw;
  return (
    FILE_TYPE_LABEL[normalized] ||
    (normalized ? normalized.toUpperCase() : "FILE")
  );
}

function formatSize(bytes: number | null | undefined): string {
  const safeBytes = Number(bytes ?? 0);
  if (!Number.isFinite(safeBytes) || safeBytes < 0) return "0B";
  if (safeBytes < 1024) return `${safeBytes}B`;
  if (safeBytes < 1024 * 1024) return `${(safeBytes / 1024).toFixed(0)}KB`;
  return `${(safeBytes / (1024 * 1024)).toFixed(1)}MB`;
}

function resolveMaterialAssetUrl(
  src: string | undefined,
  materialId: number,
): string {
  const raw = String(src || "").trim();
  if (!raw) return "";
  if (/^(https?:|data:|blob:|\/)/i.test(raw)) return raw;
  const normalized = raw.replace(/\\/g, "/").replace(/^\.\/+/, "");
  const encodedPath = normalized
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");
  if (!encodedPath) return "";
  return `/api/tutor/materials/${materialId}/asset/${encodedPath}`;
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
  return Number.isFinite(candidate) && candidate >= 0
    ? Math.floor(candidate)
    : 0;
}

function pluralizeCount(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function getSemesterCourseReviewStatus(course: SemesterPreviewCourse): {
  label: string;
  tone: "ready" | "warn";
} {
  if (course.readiness.readyForTutor) {
    return { label: "Ready for Tutor", tone: "ready" };
  }
  if (
    course.syllabus_files.length > 0 ||
    course.schedule_files.length > 0 ||
    course.material_files.length > 0
  ) {
    return { label: "Ready to review", tone: "ready" };
  }
  return { label: "Needs files", tone: "warn" };
}

function formatCourseSecondaryLabel(course: {
  code?: string | null;
  term?: string | null;
}) {
  const parts = [course.code, course.term].filter(Boolean);
  return parts.length ? parts.join(" · ") : "No course code";
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

function normalizeRawFolderSegments(parts: string[]): string[] {
  return parts.map((part) => part.trim()).filter(Boolean);
}

function normalizeSourceFolderSegments(parts: string[]): string[] {
  const cleaned = normalizeRawFolderSegments(parts);
  const usersIndex = cleaned.findIndex(
    (part) => part.toLowerCase() === "users",
  );
  const desktopIndex = cleaned.findIndex(
    (part) => part.toLowerCase() === "desktop",
  );
  if (
    usersIndex >= 0 &&
    desktopIndex > usersIndex &&
    desktopIndex < cleaned.length - 1
  ) {
    // Absolute local paths should not expose machine roots in the vault-style rail.
    return cleaned.slice(desktopIndex + 1);
  }
  return cleaned;
}

function getMaterialFolder(mat: Material): string {
  const rawFolder = (mat.folder_path || "")
    .replace(/\\/g, "/")
    .trim()
    .replace(/^\/+|\/+$/g, "");
  if (rawFolder) {
    const normalizedRaw = normalizeRawFolderSegments(rawFolder.split("/"));
    return normalizedRaw.join("/") || "Unsorted";
  }

  const sourcePath = (mat.source_path || "").replace(/\\/g, "/").trim();
  if (!sourcePath) return "Unsorted";

  const protocolIndex = sourcePath.indexOf("://");
  if (protocolIndex > 0) {
    const protocol = sourcePath.slice(0, protocolIndex);
    const afterProtocol = sourcePath.slice(protocolIndex + 3);
    const lastSlash = afterProtocol.lastIndexOf("/");
    if (lastSlash <= 0) return protocol;
    const protocolParts = normalizeRawFolderSegments(
      afterProtocol.slice(0, lastSlash).split("/"),
    );
    return protocolParts.length
      ? `${protocol}/${protocolParts.join("/")}`
      : protocol;
  }

  const normalizedSource = sourcePath.toLowerCase();
  if (
    normalizedSource.includes("/uploads/") ||
    normalizedSource.includes("\\uploads\\")
  )
    return "Uploaded Files";

  const lastSlash = sourcePath.lastIndexOf("/");
  if (lastSlash <= 0) return "Unsorted";

  const folders = normalizeSourceFolderSegments(
    sourcePath.slice(0, lastSlash).split("/"),
  );
  if (folders.length > 2) return folders.slice(-2).join("/");
  return folders.join("/") || "Unsorted";
}

function getMaterialRole(mat: Material): MaterialRole {
  const segments = [
    mat.folder_path || "",
    mat.source_path || "",
    mat.title || "",
  ]
    .join("/")
    .replace(/\\/g, "/")
    .split("/")
    .map((part) => part.toLowerCase().trim())
    .filter(Boolean);
  const text = segments.join(" ");

  if (
    segments.some((segment) =>
      /^(0?1|textbook|textbooks|reference|references)[\s_-]*(textbook|textbooks|reference|references)?$/.test(
        segment,
      ),
    ) ||
    /\b(textbook|course reference|reference material|references)\b/.test(text)
  ) {
    return "reference";
  }

  if (
    segments.some((segment) =>
      /\b(syllabus|schedule|course calendar|course map)\b/.test(segment),
    )
  ) {
    return "setup";
  }

  return "study";
}

function isDefaultStudyMaterial(mat: Material): boolean {
  return mat.enabled && getMaterialRole(mat) === "study";
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
      if (!node.children[part])
        node.children[part] = { name: part, files: [], children: {} };
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
  hasChildren: boolean;
}

function getFolderNode(
  root: FolderNode,
  folderPath: string,
): FolderNode | null {
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
      hasChildren: Object.keys(child.children).length > 0,
    });
    items.push(...flattenFolders(child, depth + 1, path));
  }
  return items;
}

function getFolderAncestorPaths(path: string): string[] {
  if (!path) return [];
  const parts = path.split("/").filter(Boolean);
  const ancestors: string[] = [];
  for (let i = 0; i < parts.length; i += 1) {
    ancestors.push(parts.slice(0, i + 1).join("/"));
  }
  return ancestors;
}

function normalizePathForCompare(path: string): string {
  return path.replace(/\\/g, "/").replace(/\/+$/g, "").toLowerCase();
}

function collectSyncPreviewFilePaths(
  node: TutorSyncPreviewNode | null | undefined,
): string[] {
  if (!node) return [];
  if (node.type === "file") return [node.path];
  const children = Array.isArray(node.children) ? node.children : [];
  const files: string[] = [];
  for (const child of children) {
    files.push(...collectSyncPreviewFilePaths(child));
  }
  return files;
}

type InitialLibraryLaunchState = {
  sidebarMode: "folders" | "courses";
  selectedCourseId: number | "unlinked" | null;
  uploadCourseTarget: string;
  syncCourseTarget: string;
  selectedFolderPath: string;
};

function readInitialLibraryLaunchState(): InitialLibraryLaunchState {
  const handoff = consumeLibraryLaunchFromTutor();
  if (!handoff || typeof handoff.courseId !== "number") {
    return {
      sidebarMode: "courses",
      selectedCourseId: null,
      uploadCourseTarget: "",
      syncCourseTarget: "",
      selectedFolderPath: ALL_FOLDERS_KEY,
    };
  }
  const courseId = String(handoff.courseId);
  return {
    sidebarMode: "courses",
    selectedCourseId: handoff.courseId,
    uploadCourseTarget: courseId,
    syncCourseTarget: courseId,
    selectedFolderPath: ALL_FOLDERS_KEY,
  };
}

function renderMaterialRow(
  mat: Material,
  isDuplicate: boolean,
  selectedForTutor: number[],
  editingId: number | null,
  editTitle: string,
  setEditTitle: (value: string) => void,
  setEditingId: (id: number | null) => void,
  saveEdit: () => void,
  toggleMaterialForTutor: (id: number) => void,
  studyMaterialInTutor: (id: number) => void,
  toggleEnabled: (mat: Material) => void,
  deleteMutation: MutateDeleteLike,
  startEdit: (mat: Material) => void,
  deleteConfirm: number | null,
  setDeleteConfirm: (id: number | null) => void,
  viewContent: (id: number) => void,
  reextractContent: (id: number) => void,
  isReextracting: boolean,
) {
  const displayTitle = getMaterialTitle(mat);
  const folderLabel = getMaterialFolder(mat);
  const normalizedType = (mat.file_type || "").toLowerCase();
  const canReextract = ["pdf", "docx", "pptx", "powerpoint"].includes(
    normalizedType,
  );
  const materialRole = getMaterialRole(mat);
  const hasDoclingAssets = Boolean(mat.has_docling_assets);
  const doclingAssetCount = Number(mat.docling_asset_count || 0);

  return (
    <div
      key={mat.id}
      className={`grid gap-3 px-3 py-2.5 items-center border-b border-primary/10 hover:bg-primary/5 transition-colors ${!mat.enabled ? "opacity-50" : ""}`}
      style={{
        gridTemplateColumns:
          "32px minmax(250px,1.55fr) minmax(180px,1fr) 78px 84px 92px 126px",
      }}
    >
      <div className="flex items-center justify-center">
        <Checkbox
          checked={selectedForTutor.includes(mat.id)}
          onCheckedChange={() => toggleMaterialForTutor(mat.id)}
          disabled={!mat.enabled}
          aria-label={`Select ${displayTitle} for tutor`}
        />
      </div>

      {/* Title */}
      <div className="min-w-0">
        {editingId === mat.id ? (
          <div className="flex items-center gap-1">
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className={`${INPUT_BASE} flex-1 h-9 py-1 text-base`}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveEdit();
                if (e.key === "Escape") setEditingId(null);
              }}
            />
            <button
              onClick={saveEdit}
              className="text-primary hover:text-primary/80"
            >
              <Check className={ICON_SM} />
            </button>
            <button
              onClick={() => setEditingId(null)}
              className="text-muted-foreground hover:text-foreground"
            >
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
      <div className="flex items-center gap-1">
        {isDuplicate ? (
          <Badge
            variant="outline"
            className={`${TEXT_BADGE} h-4 px-1 w-fit border-yellow-500/50 text-yellow-400`}
          >
            DUPE
          </Badge>
        ) : null}
        <Badge variant="outline" className={`${TEXT_BADGE} h-4 px-1 w-fit`}>
          {getFileTypeLabel(mat.file_type)}
        </Badge>
        {materialRole === "reference" ? (
          <Badge
            variant="outline"
            className={`${TEXT_BADGE} h-4 px-1 w-fit border-sky-500/50 text-sky-300`}
            title="Course reference; manually selectable for Current Run"
          >
            COURSE REF
          </Badge>
        ) : null}
        {materialRole === "setup" ? (
          <Badge
            variant="outline"
            className={`${TEXT_BADGE} h-4 px-1 w-fit border-emerald-500/50 text-emerald-300`}
            title="Course setup file"
          >
            SETUP
          </Badge>
        ) : null}
        {canReextract ? (
          <Badge
            variant="outline"
            className={`${TEXT_BADGE} h-4 px-1 w-fit ${hasDoclingAssets ? "border-green-500/60 text-green-300" : "border-yellow-500/60 text-yellow-300"}`}
            title={
              hasDoclingAssets
                ? `${doclingAssetCount} Docling asset${doclingAssetCount === 1 ? "" : "s"} detected`
                : "No Docling image assets detected"
            }
          >
            D:{doclingAssetCount}
          </Badge>
        ) : null}
      </div>

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
          onClick={() => studyMaterialInTutor(mat.id)}
          disabled={!mat.enabled}
          className="text-muted-foreground hover:text-primary transition-colors p-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
          title="Study this file"
          aria-label={`Study ${displayTitle} in Tutor`}
        >
          <Play className={ICON_SM} />
        </button>
        <button
          onClick={() => viewContent(mat.id)}
          className="text-muted-foreground hover:text-primary transition-colors p-0.5"
          title="View content"
        >
          <Eye className={ICON_SM} />
        </button>
        {canReextract ? (
          <button
            onClick={() => reextractContent(mat.id)}
            disabled={isReextracting}
            className="text-muted-foreground hover:text-primary transition-colors p-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Re-extract with Docling"
          >
            <RefreshCw
              className={`${ICON_SM} ${isReextracting ? "animate-spin" : ""}`}
            />
          </button>
        ) : null}
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

function SyncPreviewTreeNode({
  node,
  depth = 0,
  selectedSyncFiles,
  expandedSyncFolders,
  onToggleFile,
  onToggleFolder,
}: {
  node: TutorSyncPreviewNode;
  depth?: number;
  selectedSyncFiles: Set<string>;
  expandedSyncFolders: Set<string>;
  onToggleFile: (path: string) => void;
  onToggleFolder: (path: string) => void;
}): ReactElement | null {
  if (node.type === "file") {
    const isChecked = selectedSyncFiles.has(node.path);
    return (
      <div
        className="w-full rounded-none border border-primary/10 px-2 py-1.5 text-left text-sm font-terminal flex items-center gap-2 text-muted-foreground hover:text-foreground"
        style={{ paddingLeft: `${0.6 + depth * 0.8}rem` }}
        title={node.path}
      >
        <Checkbox
          aria-label={`Sync ${node.name}`}
          checked={isChecked}
          onCheckedChange={() => onToggleFile(node.path)}
        />
        <FileText className={`${ICON_SM} shrink-0`} />
        <span className="truncate flex-1">{node.name}</span>
        <span className="text-sm">{formatSize(node.size)}</span>
      </div>
    );
  }

  const children = Array.isArray(node.children) ? node.children : [];
  const isRoot = node.path === "";
  const isExpanded = isRoot || expandedSyncFolders.has(node.path);

  return (
    <div>
      {!isRoot && (
        <div
          className="w-full rounded-none border border-primary/15 pr-2 py-1.5 text-left text-sm font-terminal flex items-center gap-1 text-muted-foreground hover:text-foreground"
          style={{ paddingLeft: `${0.45 + depth * 0.8}rem` }}
          title={node.path}
        >
          {children.length > 0 ? (
            <button
              type="button"
              className="p-0.5 hover:text-primary transition-colors"
              onClick={() => onToggleFolder(node.path)}
              aria-label={isExpanded ? "Collapse folder" : "Expand folder"}
            >
              <ChevronRight
                className={`${ICON_SM} transition-transform ${isExpanded ? "rotate-90" : "rotate-0"}`}
              />
            </button>
          ) : (
            <span className="w-4" />
          )}
          {isExpanded ? (
            <FolderOpen className={`${ICON_SM} shrink-0`} />
          ) : (
            <Folder className={`${ICON_SM} shrink-0`} />
          )}
          <span className="truncate flex-1">{node.name}</span>
          <span className="text-sm">{children.length}</span>
        </div>
      )}
      {isExpanded &&
        children.map((child) => (
          <SyncPreviewTreeNode
            key={child.path}
            node={child}
            depth={isRoot ? depth : depth + 1}
            selectedSyncFiles={selectedSyncFiles}
            expandedSyncFolders={expandedSyncFolders}
            onToggleFile={onToggleFile}
            onToggleFolder={onToggleFolder}
          />
        ))}
    </div>
  );
}

function useLibraryPageController() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const initialLaunchState = useMemo(() => readInitialLibraryLaunchState(), []);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [materialsFolder, setMaterialsFolder] = useState("");
  const [semesterIntakeFolder, setSemesterIntakeFolder] = useState(
    DEFAULT_SEMESTER_INTAKE_FOLDER,
  );
  const [semesterPreview, setSemesterPreview] =
    useState<SemesterIntakePreviewResult | null>(null);
  const [selectedSemesterMaterialFiles, setSelectedSemesterMaterialFiles] =
    useState<Set<string>>(() => new Set());
  const [semesterScanLoading, setSemesterScanLoading] = useState(false);
  const [semesterApplyLoading, setSemesterApplyLoading] = useState(false);
  const [semesterIntakeError, setSemesterIntakeError] = useState<string | null>(
    null,
  );
  const [addCourseworkMode, setAddCourseworkMode] =
    useState<AddCourseworkMode>("intake");
  const [uploadCourseTarget, setUploadCourseTarget] = useState<string>(
    initialLaunchState.uploadCourseTarget,
  );
  const [syncCourseTarget, setSyncCourseTarget] = useState<string>(
    initialLaunchState.syncCourseTarget,
  );
  const [syncJobId, setSyncJobId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<TutorSyncJobStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncPreview, setSyncPreview] = useState<TutorSyncPreviewResult | null>(
    null,
  );
  const [syncPreviewLoading, setSyncPreviewLoading] = useState(false);
  const [syncPreviewError, setSyncPreviewError] = useState<string | null>(null);
  const [selectedSyncFiles, setSelectedSyncFiles] = useState<Set<string>>(
    new Set(),
  );
  const [expandedSyncFolders, setExpandedSyncFolders] = useState<Set<string>>(
    new Set([""]),
  );
  const [reextractingMaterialIds, setReextractingMaterialIds] = useState<
    number[]
  >([]);
  const [selectedFolderPath, setSelectedFolderPath] = useState<string>(
    initialLaunchState.selectedFolderPath,
  );
  const [expandedFolderPaths, setExpandedFolderPaths] = useState<Set<string>>(
    new Set(),
  );
  const [initializedFolderExpansion, setInitializedFolderExpansion] =
    useState(false);
  const [courseLinkTarget, setCourseLinkTarget] = useState<string>("");
  const [sidebarMode, setSidebarMode] = useState<"folders" | "courses">(
    initialLaunchState.sidebarMode,
  );
  const [selectedCourseId, setSelectedCourseId] = useState<
    number | "unlinked" | null
  >(initialLaunchState.selectedCourseId);
  const [viewingMaterialId, setViewingMaterialId] = useState<number | null>(
    null,
  );
  const [selectedForTutor, setSelectedForTutor] = useState<number[]>(() =>
    readTutorSelectedMaterialIds(),
  );

  const { data: materials = [], isLoading } = useQuery<Material[]>({
    queryKey: ["tutor-materials"],
    queryFn: () => api.tutor.getMaterials(),
  });
  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ["courses-active"],
    queryFn: () => api.courses.getActive(),
  });
  const { data: contentSources } = useQuery<TutorContentSources>({
    queryKey: ["tutor-content-sources"],
    queryFn: () => api.tutor.getContentSources(),
    enabled: sidebarMode === "courses",
  });
  const { data: materialContent, isLoading: isContentLoading } =
    useQuery<MaterialContent>({
      queryKey: ["material-content", viewingMaterialId],
      queryFn: () => api.tutor.getMaterialContent(viewingMaterialId!),
      enabled: viewingMaterialId !== null,
    });
  const { data: embedStatus } = useQuery<TutorEmbedStatus>({
    queryKey: ["tutor-embed-status"],
    queryFn: () => api.tutor.embedStatus(),
  });
  // Archived courses live in a separate query so the active rail stays
  // unaware of them. /api/courses/all returns both; we filter to archived.
  const { data: allCoursesWithArchived = [] } = useQuery<Course[]>({
    queryKey: ["courses-all"],
    queryFn: () => api.courses.getEvery(),
    enabled: sidebarMode === "courses",
  });
  const archivedCourses = useMemo(
    () => allCoursesWithArchived.filter((c) => c.archived === true),
    [allCoursesWithArchived],
  );
  const [archivedExpanded, setArchivedExpanded] = useState(false);
  const [addCourseDialogOpen, setAddCourseDialogOpen] = useState(false);
  const [newCourseName, setNewCourseName] = useState("");
  const [newCourseCode, setNewCourseCode] = useState("");
  const [newCourseTerm, setNewCourseTerm] = useState("");
  const [creatingCourse, setCreatingCourse] = useState(false);

  const handleCreateCourse = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      const trimmedName = newCourseName.trim();
      if (!trimmedName) {
        toast.error("Course name is required.");
        return;
      }
      setCreatingCourse(true);
      try {
        const created = await api.courses.create({
          name: trimmedName,
          code: newCourseCode.trim() || null,
          term: newCourseTerm.trim() || null,
          active: true,
        } as never);
        toast.success(`Created ${trimmedName}`);
        setAddCourseDialogOpen(false);
        setNewCourseName("");
        setNewCourseCode("");
        setNewCourseTerm("");
        queryClient.invalidateQueries({ queryKey: ["tutor-content-sources"] });
        queryClient.invalidateQueries({ queryKey: ["courses-active"] });
        queryClient.invalidateQueries({ queryKey: ["courses-all"] });
        queryClient.invalidateQueries({ queryKey: ["tutor-hub"] });
        if (typeof created?.id === "number") {
          setSelectedCourseId(created.id);
        }
      } catch (err) {
        toast.error(
          `Failed to create course: ${err instanceof Error ? err.message : "Unknown"}`,
        );
      } finally {
        setCreatingCourse(false);
      }
    },
    [newCourseName, newCourseCode, newCourseTerm, queryClient],
  );

  const handleArchiveCourse = useCallback(
    async (courseId: number, courseName: string) => {
      if (
        !window.confirm(
          `Archive "${courseName}"? It'll disappear from active dropdowns and the study wheel. Vault notes are kept and you can unarchive any time.`,
        )
      ) {
        return;
      }
      try {
        await api.courses.archive(courseId);
        toast.success(`Archived ${courseName}`);
        queryClient.invalidateQueries({ queryKey: ["tutor-content-sources"] });
        queryClient.invalidateQueries({ queryKey: ["courses-active"] });
        queryClient.invalidateQueries({ queryKey: ["courses-all"] });
        queryClient.invalidateQueries({ queryKey: ["tutor-hub"] });
      } catch (err) {
        toast.error(
          `Failed to archive: ${err instanceof Error ? err.message : "Unknown"}`,
        );
      }
    },
    [queryClient],
  );

  const handleUnarchiveCourse = useCallback(
    async (courseId: number, courseName: string) => {
      try {
        await api.courses.unarchive(courseId);
        toast.success(
          `Unarchived ${courseName}. Re-add it to the study wheel if you want it spinning again.`,
        );
        queryClient.invalidateQueries({ queryKey: ["tutor-content-sources"] });
        queryClient.invalidateQueries({ queryKey: ["courses-active"] });
        queryClient.invalidateQueries({ queryKey: ["courses-all"] });
        queryClient.invalidateQueries({ queryKey: ["tutor-hub"] });
      } catch (err) {
        toast.error(
          `Failed to unarchive: ${err instanceof Error ? err.message : "Unknown"}`,
        );
      }
    },
    [queryClient],
  );

  const folderTree = useMemo(() => buildFolderTree(materials), [materials]);
  const folderItems = useMemo(() => flattenFolders(folderTree), [folderTree]);
  const visibleFolderItems = useMemo(
    () =>
      folderItems.filter((item) => {
        if (item.depth === 0) return true;
        const ancestorPaths = getFolderAncestorPaths(item.path).slice(0, -1);
        return ancestorPaths.every((ancestor) =>
          expandedFolderPaths.has(ancestor),
        );
      }),
    [folderItems, expandedFolderPaths],
  );
  const selectedFolderNode = useMemo(
    () => getFolderNode(folderTree, selectedFolderPath),
    [folderTree, selectedFolderPath],
  );
  const unlinkedCount = materials.filter((m) => m.course_id === null).length;
  const visibleMaterials = useMemo(() => {
    if (sidebarMode === "courses") {
      let filtered: Material[];
      if (selectedCourseId === null) {
        filtered = materials;
      } else if (selectedCourseId === "unlinked") {
        filtered = materials.filter((m) => m.course_id === null);
      } else {
        filtered = materials.filter((m) => m.course_id === selectedCourseId);
      }
      return filtered.sort((a, b) =>
        getMaterialTitle(a).localeCompare(getMaterialTitle(b)),
      );
    }
    if (!selectedFolderNode) return [];
    return collectFolderMaterials(selectedFolderNode).sort((a, b) =>
      getMaterialTitle(a).localeCompare(getMaterialTitle(b)),
    );
  }, [sidebarMode, selectedCourseId, materials, selectedFolderNode]);
  const selectedFolderLabel = useMemo(() => {
    if (sidebarMode === "courses") {
      if (selectedCourseId === null) return "All Materials";
      if (selectedCourseId === "unlinked") return "Unlinked";
      const course = contentSources?.courses.find(
        (c) => c.id === selectedCourseId,
      );
      return course ? course.name || course.code : "All Materials";
    }
    return selectedFolderPath || "All Materials";
  }, [sidebarMode, selectedCourseId, contentSources, selectedFolderPath]);

  const selectFolderPath = (path: string) => {
    setSelectedFolderPath(path);
    const ancestors = getFolderAncestorPaths(path);
    if (!ancestors.length) return;
    setExpandedFolderPaths((prev) => {
      const next = new Set(prev);
      for (const ancestor of ancestors) next.add(ancestor);
      return next;
    });
  };

  const resetSyncPreviewState = (errorMessage: string | null) => {
    setSyncPreview(null);
    setSelectedSyncFiles(new Set());
    setExpandedSyncFolders(new Set([""]));
    setSyncPreviewError(errorMessage);
  };

  const handleSidebarModeChange = (mode: "folders" | "courses") => {
    setSidebarMode(mode);
    if (mode === "folders") {
      setSelectedCourseId(null);
    } else {
      selectFolderPath(ALL_FOLDERS_KEY);
    }
  };

  const selectedForTutorSet = useMemo(
    () => new Set(selectedForTutor),
    [selectedForTutor],
  );
  const dupeChecksums = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of materials) {
      const cs = m.checksum;
      if (cs) counts.set(cs, (counts.get(cs) || 0) + 1);
    }
    const dupes = new Set<string>();
    for (const [cs, count] of counts) {
      if (count > 1) dupes.add(cs);
    }
    return dupes;
  }, [materials]);
  const defaultVisibleStudyMaterialIds = useMemo(
    () => visibleMaterials.filter(isDefaultStudyMaterial).map((m) => m.id),
    [visibleMaterials],
  );
  const selectedVisibleMaterialIds = useMemo(
    () =>
      visibleMaterials
        .filter((m) => m.enabled && selectedForTutorSet.has(m.id))
        .map((m) => m.id),
    [visibleMaterials, selectedForTutorSet],
  );
  const hiddenTutorSelectionCount = Math.max(
    0,
    selectedForTutor.length - selectedVisibleMaterialIds.length,
  );
  const allTutorMaterialsSelected =
    defaultVisibleStudyMaterialIds.length > 0 &&
    defaultVisibleStudyMaterialIds.every((id) => selectedForTutorSet.has(id));
  const syncPreviewFiles = useMemo(
    () => collectSyncPreviewFilePaths(syncPreview?.tree),
    [syncPreview],
  );
  const semesterMaterialFiles = useMemo(
    () => collectSemesterMaterialFilePaths(semesterPreview),
    [semesterPreview],
  );
  const selectedSyncCount = selectedSyncFiles.size;
  const selectedSemesterMaterialCount = semesterMaterialFiles.filter((path) =>
    selectedSemesterMaterialFiles.has(path),
  ).length;
  const allSyncFilesSelected =
    syncPreviewFiles.length > 0 &&
    syncPreviewFiles.every((path) => selectedSyncFiles.has(path));
  const allSemesterMaterialFilesSelected =
    semesterMaterialFiles.length > 0 &&
    semesterMaterialFiles.every((path) =>
      selectedSemesterMaterialFiles.has(path),
    );

  useEffect(() => {
    writeTutorSelectedMaterialIds(selectedForTutor);
  }, [selectedForTutor]);

  const openTutorWithMaterialIds = (materialIds: number[]) => {
    if (!materialIds.length) {
      toast.error("Choose a file for the Current Run before opening Tutor.");
      return;
    }
    const selectedTutorMaterials = materials.filter((material) =>
      materialIds.includes(material.id),
    );
    const selectedCourseIds = Array.from(
      new Set(
        selectedTutorMaterials
          .map((material) => material.course_id)
          .filter((value): value is number => typeof value === "number" && value > 0),
      ),
    );
    const handoffCourseId =
      selectedCourseIds.length === 1
        ? selectedCourseIds[0]
        : typeof selectedCourseId === "number"
          ? selectedCourseId
          : undefined;

    writeTutorSelectedMaterialIds(materialIds);
    writeTutorStoredStartState({
      courseId: handoffCourseId,
      topic: "",
      selectedMaterials: materialIds,
      chainId: undefined,
      customBlockIds: [],
      accuracyProfile: "strict",
      objectiveScope: "module_all",
      selectedObjectiveId: "",
      selectedObjectiveGroup: "",
      selectedPaths: [],
    });
    try {
      localStorage.removeItem("tutor.wizard.progress.v1");
      localStorage.setItem("tutor-studio-last-tab", "workspace");
    } catch {
      /* localStorage unavailable — ignore */
    }
    try {
      sessionStorage.setItem("tutor.open_from_library.v1", "1");
    } catch {
      /* sessionStorage unavailable — ignore */
    }
    setLocation(
      handoffCourseId
        ? `/tutor?course_id=${handoffCourseId}`
        : "/tutor",
    );
  };

  const handleOpenTutor = () => {
    openTutorWithMaterialIds(selectedForTutor);
  };

  const studyMaterialInTutor = (id: number) => {
    setSelectedForTutor([id]);
    openTutorWithMaterialIds([id]);
  };

  const replaceTutorQueueWithVisible = () => {
    if (!defaultVisibleStudyMaterialIds.length) {
      toast.error("No enabled study files are visible in this view.");
      return;
    }
    setSelectedForTutor([...defaultVisibleStudyMaterialIds]);
    toast.success(
      `Current Run replaced with ${defaultVisibleStudyMaterialIds.length} study file${defaultVisibleStudyMaterialIds.length === 1 ? "" : "s"}.`,
    );
  };

  const addVisibleToTutorQueue = () => {
    if (!defaultVisibleStudyMaterialIds.length) {
      toast.error("No enabled study files are visible in this view.");
      return;
    }
    setSelectedForTutor((prev) => {
      const next = new Set(prev);
      for (const id of defaultVisibleStudyMaterialIds) next.add(id);
      return [...next];
    });
    toast.success(
      `Added ${defaultVisibleStudyMaterialIds.length} study file${defaultVisibleStudyMaterialIds.length === 1 ? "" : "s"} to the Current Run.`,
    );
  };

  const clearTutorQueue = () => {
    if (!selectedForTutor.length) return;
    setSelectedForTutor([]);
    toast.success("Current Run cleared.");
  };

  useEffect(() => {
    if (isLoading) return;
    setSelectedForTutor((ids) =>
      ids.filter((id) => materials.some((m) => m.id === id)),
    );
    if (
      selectedFolderPath !== ALL_FOLDERS_KEY &&
      !getFolderNode(folderTree, selectedFolderPath)
    ) {
      selectFolderPath(ALL_FOLDERS_KEY);
    }
  }, [isLoading, materials, selectedFolderPath, folderTree]);

  useEffect(() => {
    if (initializedFolderExpansion) return;
    // Start with top-level folders expanded so first interaction is not empty.
    const topLevelPaths = folderItems
      .filter((item) => item.depth === 0)
      .map((item) => item.path);
    if (!topLevelPaths.length) return;
    setExpandedFolderPaths((prev) => {
      const next = new Set(prev);
      for (const path of topLevelPaths) next.add(path);
      return next;
    });
    setInitializedFolderExpansion(true);
  }, [folderItems, initializedFolderExpansion]);

  const handleMaterialsFolderChange = (value: string) => {
    setMaterialsFolder(value);
    if (!syncPreview) return;
    const normalizedPreview = normalizePathForCompare(syncPreview.folder || "");
    const normalizedCurrent = normalizePathForCompare(value.trim());
    if (!normalizedCurrent || normalizedPreview === normalizedCurrent) return;
    resetSyncPreviewState("Folder path changed. Scan the folder again.");
  };

  const handleSemesterIntakeFolderChange = (value: string) => {
    setSemesterIntakeFolder(value);
    if (!semesterPreview) return;
    const normalizedPreview = normalizePathForCompare(
      semesterPreview.folder || "",
    );
    const normalizedCurrent = normalizePathForCompare(value.trim());
    if (!normalizedCurrent || normalizedPreview === normalizedCurrent) return;
    setSelectedSemesterMaterialFiles(new Set());
  };

  const finalizeSyncStatus = (status: TutorSyncJobStatus) => {
    setSyncing(false);
    setSyncJobId(null);
    queryClient.invalidateQueries({ queryKey: ["tutor-materials"] });
    queryClient.invalidateQueries({ queryKey: ["tutor-content-sources"] });

    if (status.status === "completed") {
      const syncCount = Number(
        status.sync_result?.processed ?? status.processed ?? 0,
      );
      const failedCount = Number(
        status.sync_result?.failed ?? status.errors ?? 0,
      );
      const embedResult = status.embed_result as
        | { embedded?: number }
        | null
        | undefined;
      const embedCount = Number(embedResult?.embedded ?? 0);
      const embedErrorResult = status.embed_result as
        | { error?: string }
        | null
        | undefined;
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
      return;
    }

    toast.error(`Sync failed: ${status.last_error || "Unknown error"}`);
  };

  const handleSyncPollingFailure = (errorMessage: string) => {
    setSyncing(false);
    setSyncJobId(null);
    toast.error(`Sync status failed after retries: ${errorMessage}`);
  };

  useEffect(() => {
    if (!syncJobId) return;

    let cancelled = false;
    let transientFailures = 0;
    let pollTimeoutId: number | null = null;

    const scheduleNextPoll = () => {
      if (cancelled) return;
      if (pollTimeoutId !== null) {
        window.clearTimeout(pollTimeoutId);
      }
      pollTimeoutId = window.setTimeout(pollSyncStatus, 1500);
    };

    const pollSyncStatus = async () => {
      try {
        const status = await api.tutor.getSyncMaterialsStatus(syncJobId);
        if (cancelled) return;
        transientFailures = 0;
        setSyncStatus(status);

        if (status.status === "completed" || status.status === "failed") {
          finalizeSyncStatus(status);
          return;
        }
      } catch (err) {
        if (cancelled) return;
        transientFailures += 1;
        if (transientFailures < 5) {
          scheduleNextPoll();
          return;
        }
        handleSyncPollingFailure(
          err instanceof Error ? err.message : "Unknown",
        );
        return;
      }

      scheduleNextPoll();
    };

    pollSyncStatus();

    return () => {
      cancelled = true;
      if (pollTimeoutId !== null) {
        window.clearTimeout(pollTimeoutId);
      }
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
      if (!defaultVisibleStudyMaterialIds.length) return prev;
      const next = new Set(prev);
      if (allTutorMaterialsSelected) {
        for (const id of defaultVisibleStudyMaterialIds) next.delete(id);
      } else {
        for (const id of defaultVisibleStudyMaterialIds) next.add(id);
      }
      return [...next];
    });
  };

  const toggleFolderExpanded = (path: string) => {
    const isCollapsing = expandedFolderPaths.has(path);
    setExpandedFolderPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        for (const expandedPath of Array.from(next)) {
          if (expandedPath === path || expandedPath.startsWith(`${path}/`)) {
            next.delete(expandedPath);
          }
        }
      } else {
        next.add(path);
      }
      return next;
    });
    if (
      isCollapsing &&
      (selectedFolderPath === path || selectedFolderPath.startsWith(`${path}/`))
    ) {
      selectFolderPath(ALL_FOLDERS_KEY);
    }
  };

  const handleLinkSelectedToCourse = () => {
    const targetCourseId = Number(courseLinkTarget);
    if (
      !targetCourseId ||
      !selectedVisibleMaterialIds.length ||
      courseLinkMutation.isPending
    )
      return;
    courseLinkMutation.mutate({
      ids: [...selectedVisibleMaterialIds],
      courseId: targetCourseId,
    });
  };

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: Partial<{ title: string; enabled: boolean }>;
    }) => api.tutor.updateMaterial(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tutor-materials"] });
      setEditingId(null);
      toast.success("Material updated");
    },
    onError: (err) => {
      toast.error(
        `Update failed: ${err instanceof Error ? err.message : "Unknown"}`,
      );
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
      toast.error(
        `Delete failed: ${err instanceof Error ? err.message : "Unknown"}`,
      );
    },
  });

  const clearMaterialsMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const results = await Promise.allSettled(
        ids.map((id) => api.tutor.deleteMaterial(id)),
      );
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
        toast.warning(
          `${deleted}/${total} materials deleted; ${failed} failed. Some files may still remain.`,
        );
      } else {
        toast.success(`Deleted ${deleted} materials`);
      }
    },
    onError: (err) => {
      toast.error(
        `Clear failed: ${err instanceof Error ? err.message : "Unknown"}`,
      );
    },
  });

  const courseLinkMutation = useMutation({
    mutationFn: async ({
      ids,
      courseId,
    }: {
      ids: number[];
      courseId: number;
    }) => {
      let failed = 0;
      for (const id of ids) {
        try {
          await api.tutor.updateMaterial(id, { course_id: courseId });
        } catch {
          failed += 1;
        }
      }
      return {
        linked: ids.length - failed,
        failed,
        total: ids.length,
        courseId,
      };
    },
    onSuccess: ({ linked, failed, total, courseId }) => {
      const targetCourse = courses.find((course) => course.id === courseId);
      const courseLabel =
        targetCourse?.code || targetCourse?.name || `Course ${courseId}`;
      queryClient.invalidateQueries({ queryKey: ["tutor-materials"] });
      queryClient.invalidateQueries({ queryKey: ["tutor-content-sources"] });
      setCourseLinkTarget("");
      if (failed > 0) {
        toast.warning(
          `${linked}/${total} materials linked to ${courseLabel}; ${failed} failed.`,
        );
      } else {
        toast.success(`Linked ${linked} materials to ${courseLabel}`);
      }
    },
    onError: (err) => {
      toast.error(
        `Course link failed: ${err instanceof Error ? err.message : "Unknown"}`,
      );
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

  const toggleSyncFolderExpanded = (path: string) => {
    if (!path) return;
    setExpandedSyncFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        for (const expandedPath of Array.from(next)) {
          if (expandedPath === path || expandedPath.startsWith(`${path}/`)) {
            next.delete(expandedPath);
          }
        }
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const toggleSyncFile = (path: string) => {
    setSelectedSyncFiles((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const selectAllSyncFiles = (selectAll: boolean) => {
    setSelectedSyncFiles(selectAll ? new Set(syncPreviewFiles) : new Set());
  };

  const toggleSemesterMaterialFile = (path: string) => {
    setSelectedSemesterMaterialFiles((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const selectAllSemesterMaterialFiles = (selectAll: boolean) => {
    setSelectedSemesterMaterialFiles(
      selectAll ? new Set(semesterMaterialFiles) : new Set(),
    );
  };

  const scanSemesterIntakeFolder = async () => {
    const trimmedFolder = semesterIntakeFolder.trim();
    if (!trimmedFolder || semesterScanLoading || semesterApplyLoading) return;

    setSemesterScanLoading(true);
    setSemesterIntakeError(null);
    try {
      const preview = await api.semesterIntake.preview({
        folder_path: trimmedFolder,
      });
      setSemesterPreview(preview);
      setSelectedSemesterMaterialFiles(new Set());
      if (!preview.courses.length) {
        toast.warning("Semester intake found no course folders.");
      } else {
        toast.success(`Found ${preview.courses.length} course folders.`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown";
      setSemesterPreview(null);
      setSelectedSemesterMaterialFiles(new Set());
      setSemesterIntakeError(message);
      toast.error(`Semester intake scan failed: ${message}`);
    } finally {
      setSemesterScanLoading(false);
    }
  };

  const applySemesterIntake = async () => {
    const trimmedFolder = semesterIntakeFolder.trim();
    if (!trimmedFolder || semesterApplyLoading || semesterScanLoading) return;
    if (!semesterPreview) {
      toast.error("Scan the semester folder first.");
      return;
    }
    if (
      normalizePathForCompare(semesterPreview.folder) !==
      normalizePathForCompare(trimmedFolder)
    ) {
      toast.error("Folder path changed. Re-scan before applying setup.");
      return;
    }

    const coursesToApply = semesterPreview.courses.map((course) => ({
      name: course.name,
      code: course.code ?? null,
      folder_path: course.folder_path,
      syllabus_files: course.syllabus_files.map((file) => file.path),
      schedule_files: course.schedule_files.map((file) => file.path),
      material_files: course.material_files
        .filter((file) => selectedSemesterMaterialFiles.has(file.path))
        .map((file) => file.path),
      syllabus: { modules: [] },
      schedule: { events: [] },
    }));
    if (!coursesToApply.length) {
      toast.error("No course folders are ready to apply.");
      return;
    }

    setSemesterApplyLoading(true);
    setSemesterIntakeError(null);
    try {
      const result = await api.semesterIntake.apply({
        folder_path: trimmedFolder,
        courses: coursesToApply,
      });
      queryClient.invalidateQueries({ queryKey: ["courses-active"] });
      queryClient.invalidateQueries({ queryKey: ["courses-all"] });
      queryClient.invalidateQueries({ queryKey: ["tutor-materials"] });
      queryClient.invalidateQueries({ queryKey: ["tutor-content-sources"] });
      queryClient.invalidateQueries({ queryKey: ["tutor-embed-status"] });
      queryClient.invalidateQueries({ queryKey: ["tutor-hub"] });
      toast.success(
        `Semester setup applied: ${result.coursesCreated} created, ${result.coursesUpdated} updated, ${result.modulesCreated} modules, ${result.eventsCreated} events, ${result.materialSyncJobs.length} sync job${result.materialSyncJobs.length === 1 ? "" : "s"} started.`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown";
      setSemesterIntakeError(message);
      toast.error(`Semester setup failed: ${message}`);
    } finally {
      setSemesterApplyLoading(false);
    }
  };

  const scanSyncFolder = async () => {
    const trimmedFolder = materialsFolder.trim();
    if (!trimmedFolder || syncPreviewLoading || syncing) return;

    setSyncPreviewLoading(true);
    setSyncPreviewError(null);

    try {
      const preview = await api.tutor.previewSyncMaterialsFolder({
        folder_path: trimmedFolder,
      });
      const discoveredFiles = collectSyncPreviewFilePaths(preview.tree);
      const topLevelFolderPaths = (preview.tree.children || [])
        .filter((child) => child.type === "folder")
        .map((child) => child.path);
      setSyncPreview(preview);
      setSelectedSyncFiles(new Set());
      setExpandedSyncFolders(new Set(["", ...topLevelFolderPaths]));
      if (!discoveredFiles.length) {
        setSyncPreviewError("No supported files found in this folder.");
        toast.warning("Folder scanned: no supported files found.");
      } else if (preview.truncated) {
        setSyncPreviewError(
          `Preview limited to first ${preview.max_files || 5000} files. Select from displayed files.`,
        );
        toast.warning(
          `Preview loaded with ${discoveredFiles.length} files (truncated).`,
        );
      } else {
        setSyncPreviewError(null);
        toast.success(`Scanned ${discoveredFiles.length} files.`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown";
      setSyncPreview(null);
      setSelectedSyncFiles(new Set());
      setExpandedSyncFolders(new Set([""]));
      setSyncPreviewError(message);
      toast.error(`Folder scan failed: ${message}`);
    } finally {
      setSyncPreviewLoading(false);
    }
  };

  const startSync = async () => {
    const trimmedFolder = materialsFolder.trim();
    if (!trimmedFolder || syncing || syncPreviewLoading) return;
    if (!syncPreview) {
      toast.error("Scan the folder first so you can choose files.");
      return;
    }
    if (
      normalizePathForCompare(syncPreview.folder) !==
      normalizePathForCompare(trimmedFolder)
    ) {
      toast.error("Folder path changed. Re-scan before syncing.");
      return;
    }
    const selectedFiles = syncPreviewFiles.filter((path) =>
      selectedSyncFiles.has(path),
    );
    if (!selectedFiles.length) {
      toast.error("Choose at least one file to sync.");
      return;
    }
    const parsedCourseId = syncCourseTarget ? Number(syncCourseTarget) : null;
    const courseId =
      parsedCourseId && Number.isFinite(parsedCourseId) ? parsedCourseId : null;

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
      const started = await api.tutor.startSyncMaterialsFolder({
        folder_path: trimmedFolder,
        selected_files: selectedFiles,
        course_id: courseId,
      });
      setSyncJobId(started.job_id);
      setSyncStatus((prev) =>
        prev
          ? { ...prev, job_id: started.job_id, folder: started.folder }
          : prev,
      );
      toast.success(
        `Sync started for ${selectedFiles.length} file${selectedFiles.length === 1 ? "" : "s"}`,
      );
    } catch (err) {
      setSyncing(false);
      setSyncJobId(null);
      setSyncStatus(null);
      toast.error(
        `Sync failed: ${err instanceof Error ? err.message : "Unknown"}`,
      );
    }
  };

  const reextractMaterial = async (materialId: number) => {
    if (reextractingMaterialIds.includes(materialId)) return;
    setReextractingMaterialIds((prev) => [...prev, materialId]);
    try {
      const result = await api.tutor.reextractMaterial(materialId);
      queryClient.invalidateQueries({ queryKey: ["tutor-materials"] });
      queryClient.invalidateQueries({
        queryKey: ["material-content", materialId],
      });
      if (result.has_docling_assets) {
        toast.success(
          `Re-extracted with Docling (${result.docling_asset_count} assets)`,
        );
      } else {
        toast.warning(
          "Re-extracted with Docling, but no image assets were produced.",
        );
      }
    } catch (err) {
      toast.error(
        `Re-extract failed: ${err instanceof Error ? err.message : "Unknown"}`,
      );
    } finally {
      setReextractingMaterialIds((prev) =>
        prev.filter((id) => id !== materialId),
      );
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
    <PageScaffold
      eyebrow="Library Support System"
      title="Materials Library"
      subtitle="Brain-owned study materials, Tutor scope, and clean handoff into live study all run through one intake surface."
      className="flex h-full min-h-[72vh] flex-col"
      contentClassName="flex-1 min-h-0"
      heroClassName="library-page-hero"
      stats={[
        {
          label: "Embeddings",
          value: `${(embedStatus?.provider || "unknown").toUpperCase()} · ${embedStatus?.model || "unknown"}`,
          tone: "info",
        },
        { label: "Materials", value: `${materials.length} files` },
        { label: "Folders", value: `${folderItems.length} folders` },
        {
          label: "Re-embed",
          value:
            (embedStatus?.stale ?? 0) > 0
              ? `${embedStatus?.stale} pending`
              : "None",
          tone: (embedStatus?.stale ?? 0) > 0 ? "warn" : "success",
        },
      ]}
    >
      <div className="brain-workspace brain-workspace--ready app-workspace-shell library-ops-workspace relative flex-1 min-h-[70vh] w-full overflow-hidden">
        <div className="flex flex-col lg:flex-row h-full min-h-0">
          <aside className="brain-workspace__sidebar-wrap w-full lg:w-80 shrink-0 min-h-0 max-h-[40vh] lg:max-h-none lg:pr-3">
            <HudPanel
              variant="b"
              className="library-rail-panel flex h-full min-h-0 flex-col overflow-hidden"
            >
              <div className={`${PANEL_PADDING} border-b border-white/10`}>
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className={LIBRARY_SECTION_LABEL}>COURSE RAIL</div>
                    <div className={`${LIBRARY_HELP_TEXT} mt-1`}>
                      Course names are the primary way to browse; folders are a
                      secondary filter.
                    </div>
                  </div>
                  {sidebarMode === "courses" ? (
                    <button
                      type="button"
                      aria-label="Add new course"
                      title="Create a new course"
                      onClick={() => setAddCourseDialogOpen(true)}
                      className="library-icon-button shrink-0"
                    >
                      <Plus className={ICON_SM} />
                    </button>
                  ) : null}
                </div>
                <div className="library-segmented-control flex items-center gap-1 p-1">
                  <HudButton
                    type="button"
                    variant={sidebarMode === "folders" ? "primary" : "outline"}
                    className={cn(
                      "flex-1 min-h-[38px] px-3",
                      sidebarMode === "folders"
                        ? "bg-primary/20 text-primary"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    onClick={() => handleSidebarModeChange("folders")}
                  >
                    FOLDERS
                  </HudButton>
                  <HudButton
                    type="button"
                    variant={sidebarMode === "courses" ? "primary" : "outline"}
                    className={cn(
                      "flex-1 min-h-[38px] px-3",
                      sidebarMode === "courses"
                        ? "bg-primary/20 text-primary"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    onClick={() => handleSidebarModeChange("courses")}
                  >
                    COURSES
                  </HudButton>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {sidebarMode === "folders" ? (
                  <>
                    <button
                      className={`library-course-nav-row w-full rounded-none border px-3 py-2 text-left font-terminal flex items-center gap-2 transition-colors ${
                        selectedFolderPath === ALL_FOLDERS_KEY
                          ? "border-primary/60 bg-primary/20 text-primary"
                          : "border-primary/15 text-muted-foreground hover:text-foreground hover:border-primary/40"
                      }`}
                      onClick={() => selectFolderPath(ALL_FOLDERS_KEY)}
                      type="button"
                    >
                      <FolderOpen className={ICON_SM} />
                      <span className="truncate flex-1">All Materials</span>
                      <span className="text-sm">{materials.length}</span>
                    </button>
                    {visibleFolderItems.map((folder) => {
                      const isSelected = selectedFolderPath === folder.path;
                      const isExpanded = expandedFolderPaths.has(folder.path);
                      const hasChildren = folder.hasChildren;
                      return (
                        <div key={folder.path}>
                          <div
                            className={`library-course-nav-row w-full rounded-none border pr-3 py-2 text-left font-terminal flex items-center gap-1 transition-colors ${
                              isSelected
                                ? "border-primary/60 bg-primary/20 text-primary"
                                : "border-primary/15 text-muted-foreground hover:text-foreground hover:border-primary/40"
                            }`}
                            style={{
                              paddingLeft: `${0.45 + folder.depth * 0.85}rem`,
                            }}
                            title={folder.path}
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              selectFolderPath(folder.path);
                              if (hasChildren && !isExpanded)
                                toggleFolderExpanded(folder.path);
                            }}
                            onKeyDown={(e) => {
                              if (e.target !== e.currentTarget) return;
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                selectFolderPath(folder.path);
                                if (hasChildren && !isExpanded)
                                  toggleFolderExpanded(folder.path);
                              }
                            }}
                          >
                            {hasChildren ? (
                              <button
                                type="button"
                                className="p-0.5 hover:text-primary transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleFolderExpanded(folder.path);
                                }}
                                aria-label={
                                  isExpanded
                                    ? "Collapse folder"
                                    : "Expand folder"
                                }
                              >
                                <ChevronRight
                                  className={`${ICON_SM} transition-transform ${isExpanded ? "rotate-90" : "rotate-0"}`}
                                />
                              </button>
                            ) : (
                              <span className="w-4" />
                            )}
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              {isSelected ? (
                                <FolderOpen className={ICON_SM} />
                              ) : (
                                <Folder className={ICON_SM} />
                              )}
                              <span className="truncate flex-1">
                                {folder.name}
                              </span>
                            </div>
                            <span className="text-sm">
                              {folder.filesCount}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    {!folderItems.length && materials.length === 0 ? (
                      <div className={`${TEXT_MUTED} px-2 py-3 text-sm`}>
                        Sync a folder or upload files to populate this rail.
                      </div>
                    ) : null}
                  </>
                ) : (
                  <>
                    <button
                      className={`library-course-nav-row w-full rounded-none border px-3 py-2 text-left font-terminal flex items-center gap-2 transition-colors ${
                        selectedCourseId === null
                          ? "border-primary/60 bg-primary/20 text-primary"
                          : "border-primary/15 text-muted-foreground hover:text-foreground hover:border-primary/40"
                      }`}
                      onClick={() => setSelectedCourseId(null)}
                      type="button"
                    >
                      <BookOpen className={ICON_SM} />
                      <span className="truncate flex-1">All Materials</span>
                      <span className="text-sm">{materials.length}</span>
                    </button>
                    {contentSources?.courses
                      .filter((c) => c.id !== null)
                      .map((course) => {
                        const isSelected = selectedCourseId === course.id;
                        return (
                          <div
                            key={course.id}
                            className={`group relative flex w-full items-stretch rounded-none border transition-colors ${
                              isSelected
                                ? "border-primary/60 bg-primary/20"
                                : "border-primary/15 hover:border-primary/40"
                            }`}
                          >
                            <button
                              className={`flex flex-1 items-center gap-2 px-3 py-2.5 text-left font-terminal transition-colors ${
                                isSelected
                                  ? "text-primary"
                                  : "text-muted-foreground hover:text-foreground"
                              }`}
                              onClick={() => setSelectedCourseId(course.id!)}
                              type="button"
                            >
                              <GraduationCap className={ICON_SM} />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-base text-foreground">
                                  {course.name || course.code}
                                </span>
                                {course.code ? (
                                  <span className="block truncate text-sm text-muted-foreground">
                                    {course.code}
                                  </span>
                                ) : null}
                              </span>
                              <span className="text-sm">
                                {course.doc_count}
                              </span>
                            </button>
                            <button
                              type="button"
                              aria-label={`Archive ${course.name || course.code}`}
                              title="Archive this course (hides from dropdowns; reversible)"
                              onClick={(event) => {
                                event.stopPropagation();
                                if (typeof course.id === "number") {
                                  void handleArchiveCourse(
                                    course.id,
                                    course.name || course.code || `Course ${course.id}`,
                                  );
                                }
                              }}
                              className="hidden items-center justify-center px-1.5 text-muted-foreground/60 transition-colors hover:text-foreground group-hover:flex"
                            >
                              <Archive className={ICON_SM} />
                            </button>
                          </div>
                        );
                      })}
                    <button
                      className={`w-full rounded-none border px-2 py-1.5 text-left text-sm font-terminal flex items-center gap-2 transition-colors ${
                        selectedCourseId === "unlinked"
                          ? "border-primary/60 bg-primary/20 text-primary"
                          : "border-primary/15 text-muted-foreground hover:text-foreground hover:border-primary/40"
                      }`}
                      onClick={() => setSelectedCourseId("unlinked")}
                      type="button"
                    >
                      <FileText className={`${ICON_SM} opacity-50`} />
                      <span className="truncate flex-1">Unlinked</span>
                      <span className="text-sm">{unlinkedCount}</span>
                    </button>
                    {archivedCourses.length > 0 ? (
                      <div className="mt-2 border-t border-primary/10 pt-2">
                        <button
                          type="button"
                          aria-expanded={archivedExpanded}
                          aria-controls="library-archived-courses"
                          onClick={() => setArchivedExpanded((v) => !v)}
                          className="flex w-full items-center gap-1.5 px-2 py-1.5 text-left text-sm font-terminal uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
                        >
                          {archivedExpanded ? (
                            <ChevronDown className={ICON_SM} />
                          ) : (
                            <ChevronRight className={ICON_SM} />
                          )}
                          <span className="flex-1">Archived</span>
                          <span className="text-ui-xs">
                            {archivedCourses.length}
                          </span>
                        </button>
                        {archivedExpanded ? (
                          <div
                            id="library-archived-courses"
                            className="mt-1 space-y-1"
                          >
                            {archivedCourses.map((course) => (
                              <div
                                key={course.id}
                                className="group flex w-full items-stretch rounded-none border border-primary/10 bg-black/10 transition-colors hover:border-primary/30"
                              >
                                <div className="flex flex-1 items-center gap-2 px-2 py-1.5 text-left text-sm font-terminal text-muted-foreground/70">
                                  <Archive className={`${ICON_SM} opacity-60`} />
                                  <span className="truncate flex-1">
                                    {course.name || course.code}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  aria-label={`Unarchive ${course.name || course.code}`}
                                  title="Unarchive this course (it'll come back to active dropdowns; you'll need to re-add it to the study wheel manually)"
                                  onClick={() => {
                                    if (typeof course.id === "number") {
                                      void handleUnarchiveCourse(
                                        course.id,
                                        course.name ||
                                          course.code ||
                                          `Course ${course.id}`,
                                      );
                                    }
                                  }}
                                  className="flex items-center justify-center px-1.5 text-muted-foreground/60 transition-colors hover:text-foreground"
                                >
                                  <ArchiveRestore className={ICON_SM} />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            </HudPanel>
          </aside>

              <section className="brain-workspace__main-wrap brain-workspace__canvas flex-1 min-h-0 flex flex-col overflow-hidden">
            <HudPanel className="library-main-panel flex h-full min-h-0 flex-col overflow-hidden">
              <div className="border-b border-primary/10 bg-transparent">
                <div
                  className={`${PANEL_PADDING} space-y-3`}
                >
                  <HudPanel
                    variant="b"
                    className={`${LIBRARY_PANEL_SURFACE} p-3`}
                  >
                    <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
                      <div className="min-w-0">
                        <div className={LIBRARY_SECTION_LABEL}>ADD COURSEWORK</div>
                        <div className={`${LIBRARY_HELP_TEXT} mt-1`}>
                          Choose one source path at a time. Scans classify
                          files; only checked materials are loaded.
                        </div>
                      </div>
                      <div className="library-segmented-control grid grid-cols-3 gap-1 p-1">
                        {[
                          ["intake", "SEMESTER INTAKE"],
                          ["sync", "FOLDER SYNC"],
                          ["upload", "DIRECT UPLOAD"],
                        ].map(([mode, label]) => (
                          <HudButton
                            key={mode}
                            type="button"
                            variant={
                              addCourseworkMode === mode ? "primary" : "outline"
                            }
                            className={cn(
                              "min-h-[38px] px-3",
                              addCourseworkMode === mode
                                ? "bg-primary/20 text-primary"
                                : "text-muted-foreground hover:text-foreground",
                            )}
                            onClick={() =>
                              setAddCourseworkMode(mode as AddCourseworkMode)
                            }
                          >
                            {label}
                          </HudButton>
                        ))}
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 md:grid-cols-3">
                      {[
                        ["COURSE SETUP", "Syllabus and schedule readiness."],
                        ["STUDY MATERIALS", "Pick weekly files manually."],
                        ["CURRENT RUN", "Study one file or a small set."],
                      ].map(([label, copy]) => (
                        <div
                          key={label}
                            className="library-step-card rounded-[0.75rem] p-3"
                        >
                          <div className="font-arcade text-base uppercase tracking-[0.14em] text-primary/85">
                            {label}
                          </div>
                          <div className={`${LIBRARY_HELP_TEXT} mt-1`}>
                            {copy}
                          </div>
                        </div>
                      ))}
                    </div>
                  </HudPanel>

                  <div className="grid gap-3 2xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.42fr)]">
                  {addCourseworkMode === "intake" ? (
                  <HudPanel
                    variant="b"
                    className={`${LIBRARY_PANEL_SURFACE} space-y-2 p-3`}
                  >
                    <div className="flex items-center gap-2">
                      <GraduationCap className={ICON_SM} />
                      <div className={LIBRARY_PANEL_TITLE}>SEMESTER INTAKE</div>
                    </div>
                    <div className={LIBRARY_HELP_TEXT}>
                      Start from one PT School folder, separate course setup
                      files from study materials, then create the Study courses.
                    </div>
                    <input
                      aria-label="Semester intake folder"
                      value={semesterIntakeFolder}
                      onChange={(e) =>
                        handleSemesterIntakeFolderChange(e.target.value)
                      }
                      className={INPUT_BASE}
                      placeholder="Paste the semester folder path"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <HudButton
                        variant="outline"
                        onClick={scanSemesterIntakeFolder}
                        disabled={
                          semesterScanLoading ||
                          semesterApplyLoading ||
                          !semesterIntakeFolder.trim()
                        }
                        className={LIBRARY_COMPACT_BUTTON}
                      >
                        {semesterScanLoading ? (
                          <Loader2 className={`${ICON_SM} animate-spin mr-1`} />
                        ) : (
                          <RefreshCw className={`${ICON_SM} mr-1`} />
                        )}
                        {semesterScanLoading ? "SCANNING..." : "SCAN INTAKE"}
                      </HudButton>
                      <HudButton
                        onClick={applySemesterIntake}
                        disabled={
                          semesterScanLoading ||
                          semesterApplyLoading ||
                          !semesterPreview ||
                          !semesterIntakeFolder.trim()
                        }
                        className={LIBRARY_COMPACT_BUTTON}
                      >
                        {semesterApplyLoading ? (
                          <Loader2 className={`${ICON_SM} animate-spin mr-1`} />
                        ) : (
                          <Check className={`${ICON_SM} mr-1`} />
                        )}
                        APPLY SETUP + SELECTED FILES
                      </HudButton>
                    </div>
                    {semesterPreview ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="border border-primary/15 bg-black/30 p-2">
                            <div className={TEXT_MUTED}>Courses</div>
                            <div className="font-terminal text-base text-foreground">
                              {semesterPreview.counts.courses}
                            </div>
                          </div>
                          <div className="border border-primary/15 bg-black/30 p-2">
                            <div className={TEXT_MUTED}>Materials</div>
                            <div className="font-terminal text-base text-foreground">
                              {semesterPreview.counts.material_files}
                            </div>
                          </div>
                          <div className="border border-primary/15 bg-black/30 p-2">
                            <div className={TEXT_MUTED}>Syllabus</div>
                            <div className="font-terminal text-base text-foreground">
                              {semesterPreview.counts.syllabus_files}
                            </div>
                          </div>
                          <div className="border border-primary/15 bg-black/30 p-2">
                            <div className={TEXT_MUTED}>Schedule</div>
                            <div className="font-terminal text-base text-foreground">
                              {semesterPreview.counts.schedule_files}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2 border border-primary/10 bg-black/45 p-2 text-sm">
                          <div className={TEXT_MUTED}>
                            {selectedSemesterMaterialCount} selected for
                            Library
                            {semesterMaterialFiles.length
                              ? ` / ${semesterMaterialFiles.length} found`
                              : ""}
                          </div>
                          <HudButton
                            variant="outline"
                            className={LIBRARY_INLINE_BUTTON}
                            disabled={!semesterMaterialFiles.length}
                            onClick={() =>
                              selectAllSemesterMaterialFiles(
                                !allSemesterMaterialFilesSelected,
                              )
                            }
                          >
                            {allSemesterMaterialFilesSelected
                              ? "CLEAR MATERIALS"
                              : "SELECT MATERIALS"}
                          </HudButton>
                        </div>
                        <div className="max-h-40 overflow-auto border border-primary/15 bg-black/30 p-2 space-y-1">
                          {semesterPreview.courses.map((course) => (
                            <div
                              key={course.folder_path}
                              className="border border-primary/10 bg-black/35 p-2 text-sm"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="truncate font-terminal text-base text-foreground">
                                    {course.name}
                                  </div>
                                  <div className={TEXT_MUTED}>
                                    {course.syllabus_files.length} syllabus /{" "}
                                    {course.schedule_files.length} schedule /{" "}
                                    {course.material_files.length} material
                                  </div>
                                </div>
                                <Badge
                                  variant="outline"
                                  className="shrink-0 rounded-none border-primary/25 bg-primary/10 text-sm uppercase"
                                >
                                  {course.readiness.course}
                                </Badge>
                              </div>
                              {course.material_files.length ? (
                                <div className="mt-2 space-y-1">
                                  {course.material_files.map((file) => {
                                    const checked =
                                      selectedSemesterMaterialFiles.has(
                                        file.path,
                                      );
                                    return (
                                      <div
                                        key={file.path}
                                        className="flex items-center gap-2 border border-primary/10 bg-black/35 px-2 py-1.5 font-terminal text-sm text-muted-foreground"
                                        title={file.path}
                                      >
                                        <Checkbox
                                          aria-label={`Load ${file.name} from ${course.name}`}
                                          checked={checked}
                                          onCheckedChange={() =>
                                            toggleSemesterMaterialFile(
                                              file.path,
                                            )
                                          }
                                        />
                                        <FileText
                                          className={`${ICON_SM} shrink-0`}
                                        />
                                        <span className="min-w-0 flex-1 truncate">
                                          {file.name}
                                        </span>
                                        <span className="text-ui-xs">
                                          {formatSize(file.size)}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                        {semesterPreview.global_schedule_files.length ||
                        semesterPreview.ignored_files.length ? (
                          <div className={LIBRARY_HELP_TEXT}>
                            Global schedules:{" "}
                            {semesterPreview.global_schedule_files.length} /
                            ignored: {semesterPreview.ignored_files.length}
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div
                        className={`${LIBRARY_HELP_TEXT} border border-primary/10 bg-black/45 p-3`}
                      >
                        Scan the semester folder before applying setup.
                      </div>
                    )}
                    {semesterIntakeError ? (
                      <div className="text-sm text-yellow-300 break-all">
                        <AlertTriangle className={`${ICON_SM} inline mr-1`} />
                        {semesterIntakeError}
                      </div>
                    ) : null}
                  </HudPanel>
                  ) : null}

                  {addCourseworkMode === "upload" ? (
                  <HudPanel
                    variant="b"
                    className={`${LIBRARY_PANEL_SURFACE} space-y-2 p-3`}
                  >
                    <div className="flex items-center gap-2">
                      <Upload className={ICON_SM} />
                      <div className={LIBRARY_PANEL_TITLE}>UPLOAD MATERIALS</div>
                    </div>
                    <div className={LIBRARY_HELP_TEXT}>
                      Use this for one-off files from Downloads, email, or
                      Blackboard. Upload puts the file into the Tutor library
                      immediately.
                    </div>
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor="library-upload-course-target"
                        className={`${LIBRARY_HELP_TEXT} whitespace-nowrap`}
                      >
                        Link uploads to course
                      </label>
                      <select
                        id="library-upload-course-target"
                        aria-label="Upload course"
                        value={uploadCourseTarget}
                        onChange={(e) => setUploadCourseTarget(e.target.value)}
                        className={cn(LIBRARY_SELECT, "flex-1")}
                      >
                        <option value="">No class</option>
                        {courses.map((course) => (
                          <option key={course.id} value={String(course.id)}>
                            {course.name}
                            {course.code ? ` (${course.code})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                    <MaterialUploader
                      courseId={
                        uploadCourseTarget
                          ? Number(uploadCourseTarget)
                          : undefined
                        }
                    />
                  </HudPanel>
                  ) : null}

                  {addCourseworkMode === "sync" ? (
                  <HudPanel
                    variant="b"
                    className={`${LIBRARY_PANEL_SURFACE} space-y-2 p-3`}
                  >
                    <div className="flex items-center gap-2">
                      <FolderOpen className={ICON_SM} />
                      <div className={LIBRARY_PANEL_TITLE}>SYNC STUDY FOLDER</div>
                    </div>
                    <div className={LIBRARY_HELP_TEXT}>
                      Use this for a whole course or week folder. Scan first,
                      choose files, then sync only the files you want in the
                      Tutor library.
                    </div>
                    <input
                      value={materialsFolder}
                      onChange={(e) =>
                        handleMaterialsFolderChange(e.target.value)
                      }
                      className={INPUT_BASE}
                      placeholder="Paste the local PT School folder path"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <HudButton
                        variant="outline"
                        onClick={scanSyncFolder}
                        disabled={
                          syncPreviewLoading ||
                          syncing ||
                          !materialsFolder.trim()
                        }
                        className={LIBRARY_COMPACT_BUTTON}
                      >
                        {syncPreviewLoading ? (
                          <Loader2 className={`${ICON_SM} animate-spin mr-1`} />
                        ) : (
                          <RefreshCw className={`${ICON_SM} mr-1`} />
                        )}
                        {syncPreviewLoading
                          ? "SCANNING..."
                          : "SCAN FOLDER TREE"}
                      </HudButton>
                      <HudButton
                        onClick={startSync}
                        disabled={
                          syncing ||
                          syncPreviewLoading ||
                          !materialsFolder.trim() ||
                          selectedSyncCount === 0
                        }
                        className={LIBRARY_COMPACT_BUTTON}
                      >
                        {syncing ? (
                          <Loader2 className={`${ICON_SM} animate-spin mr-1`} />
                        ) : (
                          <RefreshCw className={`${ICON_SM} mr-1`} />
                        )}
                        SYNC SELECTED FILES
                      </HudButton>
                    </div>
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor="library-sync-course-target"
                        className={`${LIBRARY_HELP_TEXT} whitespace-nowrap`}
                      >
                        Link synced files to course
                      </label>
                      <select
                        id="library-sync-course-target"
                        aria-label="Sync course"
                        value={syncCourseTarget}
                        onChange={(e) => setSyncCourseTarget(e.target.value)}
                        className={cn(LIBRARY_SELECT, "flex-1")}
                      >
                        <option value="">No class</option>
                        {courses.map((course) => (
                          <option key={course.id} value={String(course.id)}>
                            {course.name}
                            {course.code ? ` (${course.code})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                    {syncPreview ? (
                      <HudPanel
                        variant="b"
                        className="space-y-2 bg-black/35 p-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className={TEXT_MUTED}>
                            {syncPreview.counts.files} file
                            {syncPreview.counts.files === 1 ? "" : "s"} found •{" "}
                            {selectedSyncCount} selected
                          </div>
                          <div className="flex items-center gap-1">
                            <HudButton
                              variant="outline"
                              className={LIBRARY_INLINE_BUTTON}
                              disabled={!syncPreviewFiles.length}
                              onClick={() =>
                                selectAllSyncFiles(!allSyncFilesSelected)
                              }
                            >
                              {allSyncFilesSelected
                                ? "CLEAR ALL"
                                : "SELECT ALL"}
                            </HudButton>
                          </div>
                        </div>
                        <div className="max-h-48 overflow-auto border border-primary/15 bg-black/30 p-1 space-y-1">
                          <SyncPreviewTreeNode
                            node={syncPreview.tree}
                            selectedSyncFiles={selectedSyncFiles}
                            expandedSyncFolders={expandedSyncFolders}
                            onToggleFile={toggleSyncFile}
                            onToggleFolder={toggleSyncFolderExpanded}
                          />
                        </div>
                      </HudPanel>
                    ) : (
                      <HudPanel
                        variant="b"
                        className={`${LIBRARY_HELP_TEXT} bg-black/45 p-3`}
                      >
                        <div>0 selected</div>
                        <div>
                          Scan the folder to browse your structure and choose
                          files.
                        </div>
                      </HudPanel>
                    )}
                    {syncPreviewError ? (
                      <div className="text-sm text-yellow-300 break-all">
                        <AlertTriangle className={`${ICON_SM} inline mr-1`} />
                        {syncPreviewError}
                      </div>
                    ) : null}
                    {(syncing || syncStatus) && (
                      <div className="mt-1 border border-primary/10 bg-black/45 p-3 space-y-1 text-sm">
                        <div className="flex items-center justify-between">
                          <span className={TEXT_MUTED}>Status</span>
                          <span className="font-terminal !text-white uppercase">
                            {syncStatus?.status ||
                              (syncing ? "running" : "idle")}
                          </span>
                        </div>
                        <div className="h-2 w-full bg-primary/15 overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all duration-300"
                            style={{ width: `${syncProgressPercent}%` }}
                          />
                        </div>
                        <div className={TEXT_MUTED}>
                          Processed {syncStatus?.processed ?? 0} /{" "}
                          {syncStatus?.total ?? 0} files
                          {typeof syncStatus?.errors === "number"
                            ? ` • errors ${syncStatus.errors}`
                            : ""}
                        </div>
                        <div className={`${TEXT_MUTED} break-all`}>
                          Current:{" "}
                          <span className="!text-white">
                            {syncStatus?.current_file ||
                              (syncing ? "Scanning files..." : "Idle")}
                          </span>
                        </div>
                        {syncStatus?.last_error ? (
                          <div className="text-red-300 break-all">
                            {syncStatus.last_error}
                          </div>
                        ) : null}
                        {(
                          syncStatus?.sync_result?.errors as
                            | string[]
                            | undefined
                        )?.length ? (
                          <details className="mt-1">
                            <summary className="text-red-400 cursor-pointer text-sm font-terminal">
                              {
                                (syncStatus!.sync_result!.errors as string[])
                                  .length
                              }{" "}
                              file error
                              {(syncStatus!.sync_result!.errors as string[])
                                .length > 1
                                ? "s"
                                : ""}{" "}
                              — click to expand
                            </summary>
                            <ul className="mt-1 text-red-300 text-sm font-terminal list-disc pl-4 max-h-32 overflow-y-auto">
                              {(
                                syncStatus!.sync_result!.errors as string[]
                              ).map((err: string) => (
                                <li key={err} className="break-all">
                                  {err}
                                </li>
                              ))}
                            </ul>
                            {Number(
                              (
                                syncStatus?.sync_result as
                                  | { errors_total?: number }
                                  | undefined
                              )?.errors_total || 0,
                            ) >
                            (syncStatus!.sync_result!.errors as string[])
                              .length ? (
                              <div className="mt-1 text-red-300">
                                Showing first{" "}
                                {
                                  (syncStatus!.sync_result!.errors as string[])
                                    .length
                                }{" "}
                                of{" "}
                                {Number(
                                  (
                                    syncStatus!.sync_result as {
                                      errors_total?: number;
                                    }
                                  ).errors_total,
                                )}{" "}
                                errors.
                              </div>
                            ) : null}
                          </details>
                        ) : null}
                      </div>
                    )}
                  </HudPanel>
                  ) : null}

                  <HudPanel
                    variant="b"
                    className={`${LIBRARY_PANEL_SURFACE} space-y-3 p-3`}
                  >
                    <div className="flex items-center gap-2">
                      <BookOpen className={ICON_SM} />
                      <div className={LIBRARY_PANEL_TITLE}>STUDY READINESS</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className={LIBRARY_PANEL_INSET + " p-2"}>
                        <div className={TEXT_MUTED}>Visible files</div>
                        <div className="font-terminal text-lg text-foreground">
                          {visibleMaterials.length}
                        </div>
                      </div>
                      <div className={LIBRARY_PANEL_INSET + " p-2"}>
                        <div className={TEXT_MUTED}>Current Run</div>
                        <div className="font-terminal text-lg text-foreground">
                          {selectedForTutor.length}
                        </div>
                      </div>
                      <div className={LIBRARY_PANEL_INSET + " p-2"}>
                        <div className={TEXT_MUTED}>Embedded</div>
                        <div className="font-terminal text-lg text-foreground">
                          {embedStatus?.embedded ?? 0}
                        </div>
                      </div>
                      <div className={LIBRARY_PANEL_INSET + " p-2"}>
                        <div className={TEXT_MUTED}>Needs work</div>
                        <div className="font-terminal text-lg text-foreground">
                          {(embedStatus?.pending ?? 0) + (embedStatus?.stale ?? 0)}
                        </div>
                      </div>
                    </div>
                    <div className={LIBRARY_HELP_TEXT}>
                      {selectedForTutor.length
                        ? `${selectedForTutor.length} file${selectedForTutor.length === 1 ? "" : "s"} in Current Run for Tutor handoff.`
                        : "Use Study on a row or select files below to build the Current Run."}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <HudButton
                        variant="outline"
                        className={LIBRARY_COMPACT_BUTTON}
                        disabled={!defaultVisibleStudyMaterialIds.length}
                        onClick={replaceTutorQueueWithVisible}
                      >
                        REPLACE RUN
                      </HudButton>
                      <HudButton
                        variant="outline"
                        className={LIBRARY_COMPACT_BUTTON}
                        disabled={!defaultVisibleStudyMaterialIds.length}
                        onClick={addVisibleToTutorQueue}
                      >
                        ADD STUDY FILES
                      </HudButton>
                      <HudButton
                        variant="outline"
                        className={LIBRARY_COMPACT_BUTTON}
                        disabled={!selectedForTutor.length}
                        onClick={clearTutorQueue}
                      >
                        CLEAR RUN
                      </HudButton>
                      <HudButton
                        className={LIBRARY_COMPACT_BUTTON}
                        disabled={!selectedForTutor.length}
                        onClick={handleOpenTutor}
                      >
                        OPEN TUTOR ({selectedForTutor.length})
                      </HudButton>
                    </div>
                  </HudPanel>
                  </div>
                </div>
              </div>

              <div
                className={`${PANEL_PADDING} flex-1 min-h-0 flex flex-col gap-3`}
              >
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-1">
                    <div className={LIBRARY_PANEL_TITLE}>YOUR MATERIALS</div>
                    <div className={TEXT_MUTED}>
                      {sidebarMode === "courses" ? "Course" : "Folder"}:{" "}
                      <span className="!text-white font-terminal">
                        {selectedFolderLabel}
                      </span>{" "}
                      • showing {visibleMaterials.length} file
                      {visibleMaterials.length === 1 ? "" : "s"}
                    </div>
                    <div className={TEXT_MUTED}>
                      Current Run: {selectedForTutor.length} file
                      {selectedForTutor.length === 1 ? "" : "s"} total •{" "}
                      {selectedVisibleMaterialIds.length} in this view
                      {hiddenTutorSelectionCount > 0
                        ? ` • ${hiddenTutorSelectionCount} from other views`
                        : ""}
                    </div>
                  </div>
                  <div className="grid gap-2 lg:grid-cols-[auto_auto_auto]">
                    <HudPanel
                      variant="b"
                      className={`${LIBRARY_PANEL_INSET} space-y-2 p-2`}
                    >
                      <div
                        className={`${TEXT_MUTED} text-ui-xs uppercase tracking-wide`}
                      >
                        Course Linking
                      </div>
                      <div className="flex items-center gap-1">
                        <select
                          value={courseLinkTarget}
                          onChange={(e) => setCourseLinkTarget(e.target.value)}
                          className={LIBRARY_SELECT}
                          disabled={
                            courses.length === 0 || courseLinkMutation.isPending
                          }
                        >
                          <option value="">Select course</option>
                          {courses.map((course) => (
                            <option key={course.id} value={String(course.id)}>
                              {course.name}
                              {course.code ? ` (${course.code})` : ""}
                            </option>
                          ))}
                        </select>
                        <HudButton
                          variant="outline"
                          className={LIBRARY_COMPACT_BUTTON}
                          disabled={
                            courseLinkMutation.isPending ||
                            !selectedVisibleMaterialIds.length ||
                            !courseLinkTarget
                          }
                          onClick={handleLinkSelectedToCourse}
                        >
                          {courseLinkMutation.isPending ? (
                            <Loader2
                              className={`${ICON_SM} animate-spin mr-1`}
                            />
                          ) : (
                            <Link2 className={`${ICON_SM} mr-1`} />
                          )}
                          LINK VIEW
                        </HudButton>
                      </div>
                    </HudPanel>

                    <HudPanel
                      variant="b"
                      className="space-y-2 border-destructive/30 bg-destructive/5 p-2"
                    >
                      <div className="text-ui-xs uppercase tracking-wide text-red-200">
                        Library Cleanup
                      </div>
                      <div className="flex items-center flex-wrap gap-2">
                        <HudButton
                          variant="outline"
                          className="w-auto min-h-[34px] rounded-none border-destructive/50 px-3 text-sm text-destructive hover:bg-destructive/10"
                          disabled={
                            selectedVisibleMaterialIds.length === 0 ||
                            clearMaterialsMutation.isPending
                          }
                          onClick={() => {
                            if (!selectedVisibleMaterialIds.length) return;
                            if (
                              !window.confirm(
                                `Delete ${selectedVisibleMaterialIds.length} selected materials from the current folder view? This will not delete your local PT School files.`,
                              )
                            )
                              return;
                            clearMaterialsMutation.mutate([
                              ...selectedVisibleMaterialIds,
                            ]);
                          }}
                        >
                          {clearMaterialsMutation.isPending ? (
                            <Loader2
                              className={`${ICON_SM} animate-spin mr-1`}
                            />
                          ) : (
                            <Trash2 className={`${ICON_SM} mr-1`} />
                          )}
                          DELETE VIEW SELECTION
                        </HudButton>
                        <HudButton
                          variant="outline"
                          className="w-auto min-h-[34px] rounded-none border-destructive/50 px-3 text-sm text-destructive hover:bg-destructive/10"
                          disabled={
                            materials.length === 0 ||
                            clearMaterialsMutation.isPending
                          }
                          onClick={() => {
                            const safeCount = materials.length;
                            if (!safeCount) return;
                            if (
                              !window.confirm(
                                `Delete all ${safeCount} materials from tutor library? This will not delete your local PT School files.`,
                              )
                            )
                              return;
                            clearMaterialsMutation.mutate(
                              materials.map((m) => m.id),
                            );
                          }}
                        >
                          {clearMaterialsMutation.isPending ? (
                            <Loader2
                              className={`${ICON_SM} animate-spin mr-1`}
                            />
                          ) : (
                            <Trash2 className={`${ICON_SM} mr-1`} />
                          )}
                          DELETE ALL LIBRARY FILES
                        </HudButton>
                      </div>
                    </HudPanel>
                  </div>
                </div>

                {hiddenTutorSelectionCount > 0 ? (
                  <div className="border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-sm font-terminal text-yellow-100">
                    The Current Run still includes {hiddenTutorSelectionCount}{" "}
                    file{hiddenTutorSelectionCount === 1 ? "" : "s"} from other
                    views. Use{" "}
                    <span className="text-white">REPLACE RUN</span> if you
                    want Tutor to use only visible study files right now.
                  </div>
                ) : null}

                <HudPanel
                  variant="b"
                  className="flex-1 min-h-0 overflow-hidden bg-transparent backdrop-blur-lg"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2
                        className={`${ICON_MD} animate-spin text-muted-foreground`}
                      />
                    </div>
                  ) : materials.length === 0 ? (
                    <div className="text-center py-10">
                      <FileText className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                      <div className={TEXT_MUTED}>
                        No materials uploaded yet
                      </div>
                      <div className={`${TEXT_MUTED} opacity-60`}>
                        Upload PDF, DOCX, PPTX, MD, or TXT files above
                      </div>
                    </div>
                  ) : visibleMaterials.length === 0 ? (
                    <div className="text-center py-10">
                      <FileText className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                      <div className={TEXT_MUTED}>
                        No materials found in this folder view.
                      </div>
                    </div>
                  ) : (
                    <div className="h-full min-h-0 overflow-auto">
                      <div className="min-w-[1040px]">
                        <div
                          className="grid gap-3 px-3 py-2 border-b border-primary/15 bg-black/80 sticky top-0 z-10"
                          style={{
                            gridTemplateColumns:
                              "32px minmax(250px,1.55fr) minmax(180px,1fr) 78px 84px 92px 126px",
                          }}
                        >
                          <div
                            className="flex items-center justify-center"
                            title={
                              allTutorMaterialsSelected
                                ? "Unselect all visible study files"
                                : "Select all visible study files"
                            }
                          >
                            <Checkbox
                              checked={allTutorMaterialsSelected}
                              onCheckedChange={toggleAllMaterialsForTutor}
                              disabled={
                                defaultVisibleStudyMaterialIds.length === 0
                              }
                              aria-label={
                                allTutorMaterialsSelected
                                  ? "Unselect all visible study files"
                                  : "Select all visible study files"
                              }
                            />
                          </div>
                          <div className={TEXT_MUTED}>Title</div>
                          <div className={TEXT_MUTED}>Folder</div>
                          <div className={TEXT_MUTED}>Type</div>
                          <div className={TEXT_MUTED}>Size</div>
                          <div className={TEXT_MUTED}>Status</div>
                          <div className={`${TEXT_MUTED} text-right`}>
                            Actions
                          </div>
                        </div>
                        {visibleMaterials.map((mat) =>
                          renderMaterialRow(
                            mat,
                            Boolean(
                              mat.checksum && dupeChecksums.has(mat.checksum),
                            ),
                            selectedForTutor,
                            editingId,
                            editTitle,
                            setEditTitle,
                            setEditingId,
                            saveEdit,
                            toggleMaterialForTutor,
                            studyMaterialInTutor,
                            toggleEnabled,
                            deleteMutation,
                            startEdit,
                            deleteConfirm,
                            setDeleteConfirm,
                            setViewingMaterialId,
                            reextractMaterial,
                            reextractingMaterialIds.includes(mat.id),
                          ),
                        )}
                      </div>
                    </div>
                  )}
                </HudPanel>
              </div>
            </HudPanel>
          </section>
        </div>
      </div>

      <Dialog
        open={addCourseDialogOpen}
        onOpenChange={(open) => {
          if (!open) setAddCourseDialogOpen(false);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className={ICON_SM} />
              New Course
            </DialogTitle>
            <DialogDescription>
              Creates a course record. Upload materials and create the
              Obsidian folder afterward.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={handleCreateCourse}
            className="space-y-3"
            data-testid="library-add-course-form"
          >
            <label className="block">
              <span className="block text-sm font-terminal uppercase tracking-[0.16em] text-muted-foreground">
                Name <span className="text-primary">*</span>
              </span>
              <input
                type="text"
                value={newCourseName}
                onChange={(e) => setNewCourseName(e.target.value)}
                placeholder="e.g. Musculoskeletal Physical Therapy"
                autoFocus
                required
                className="mt-1 h-10 w-full rounded-none border border-primary/20 bg-black/30 px-3 font-mono text-sm text-foreground outline-none focus:border-primary/60"
              />
            </label>
            <label className="block">
              <span className="block text-sm font-terminal uppercase tracking-[0.16em] text-muted-foreground">
                Code
              </span>
              <input
                type="text"
                value={newCourseCode}
                onChange={(e) => setNewCourseCode(e.target.value)}
                placeholder="e.g. MSKPT 612"
                className="mt-1 h-10 w-full rounded-none border border-primary/20 bg-black/30 px-3 font-mono text-sm text-foreground outline-none focus:border-primary/60"
              />
            </label>
            <label className="block">
              <span className="block text-sm font-terminal uppercase tracking-[0.16em] text-muted-foreground">
                Term
              </span>
              <input
                type="text"
                value={newCourseTerm}
                onChange={(e) => setNewCourseTerm(e.target.value)}
                placeholder="e.g. Fall 2026"
                className="mt-1 h-10 w-full rounded-none border border-primary/20 bg-black/30 px-3 font-mono text-sm text-foreground outline-none focus:border-primary/60"
              />
            </label>
            <div className="flex gap-2 pt-2">
              <HudButton
                type="submit"
                variant="primary"
                disabled={creatingCourse || !newCourseName.trim()}
                className="flex-1"
              >
                {creatingCourse ? "Creating..." : "Create Course"}
              </HudButton>
              <HudButton
                type="button"
                variant="outline"
                onClick={() => setAddCourseDialogOpen(false)}
                disabled={creatingCourse}
              >
                Cancel
              </HudButton>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={viewingMaterialId !== null}
        onOpenChange={(open) => {
          if (!open) setViewingMaterialId(null);
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col gap-0">
          <DialogHeader className="shrink-0 pb-3">
            <DialogTitle className="flex items-center gap-2">
              <FileText className={ICON_SM} />
              {materialContent?.title || "Material Content"}
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2">
              {materialContent?.file_type && (
                <Badge variant="outline" className={`${TEXT_BADGE} h-4 px-1`}>
                  {getFileTypeLabel(materialContent.file_type)}
                </Badge>
              )}
              {materialContent?.char_count !== undefined && (
                <span>
                  {materialContent.char_count.toLocaleString()} characters
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <HudPanel
            variant="b"
            className="flex-1 min-h-0 overflow-y-auto bg-black/40 p-5"
          >
            {isContentLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2
                  className={`${ICON_MD} animate-spin text-muted-foreground`}
                />
              </div>
            ) : materialContent?.extraction_lossy ? (
              <div className="space-y-4">
                <div className="flex items-start gap-2 border border-yellow-500/40 bg-yellow-500/10 p-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-arcade text-sm text-yellow-400">
                      EXTRACTION INCOMPLETE
                    </div>
                    <div className={`${TEXT_MUTED} text-sm mt-1`}>
                      {Math.round(materialContent.replacement_ratio * 100)}% of
                      this PDF could not be decoded — it may use scanned images
                      or an embedded font. The readable portions are shown
                      below. Consider re-uploading with an OCR-processed
                      version.
                    </div>
                  </div>
                </div>
                {materialContent.content ? (
                  <div
                    className="prose prose-invert prose-sm max-w-none font-terminal
                    prose-headings:font-arcade prose-headings:text-primary prose-headings:border-b prose-headings:border-primary/20 prose-headings:pb-1
                    prose-h1:text-lg prose-h2:text-base prose-h3:text-sm
                    prose-p:text-foreground/90 prose-p:leading-relaxed
                    prose-li:text-foreground/90
                    prose-strong:text-primary/90
                    prose-table:border-collapse prose-th:border prose-th:border-primary/30 prose-th:bg-primary/10 prose-th:px-2 prose-th:py-1
                    prose-td:border prose-td:border-primary/20 prose-td:px-2 prose-td:py-1
                    prose-code:text-primary/80 prose-code:bg-primary/10 prose-code:px-1 prose-code:rounded-none
                    prose-pre:bg-black/60 prose-pre:border prose-pre:border-primary/20"
                  >
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        img: ({ src, alt }: { src?: string; alt?: string }) => {
                          const resolvedSrc = resolveMaterialAssetUrl(
                            src,
                            materialContent.id,
                          );
                          if (!resolvedSrc) return null;
                          return (
                            <img
                              src={resolvedSrc}
                              alt={alt || "Extracted figure"}
                              loading="lazy"
                              className="max-w-full h-auto border border-primary/30 bg-black/20"
                            />
                          );
                        },
                      }}
                    >
                      {materialContent.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className={`${TEXT_MUTED} text-center py-4`}>
                    No readable text could be recovered.
                  </div>
                )}
              </div>
            ) : materialContent?.content ? (
              <div
                className="prose prose-invert prose-sm max-w-none font-terminal
                prose-headings:font-arcade prose-headings:text-primary prose-headings:border-b prose-headings:border-primary/20 prose-headings:pb-1
                prose-h1:text-lg prose-h2:text-base prose-h3:text-sm
                prose-p:text-foreground/90 prose-p:leading-relaxed
                prose-li:text-foreground/90
                prose-strong:text-primary/90
                prose-table:border-collapse prose-th:border prose-th:border-primary/30 prose-th:bg-primary/10 prose-th:px-2 prose-th:py-1
                prose-td:border prose-td:border-primary/20 prose-td:px-2 prose-td:py-1
                prose-code:text-primary/80 prose-code:bg-primary/10 prose-code:px-1 prose-code:rounded-none
                prose-pre:bg-black/60 prose-pre:border prose-pre:border-primary/20"
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    img: ({ src, alt }: { src?: string; alt?: string }) => {
                      const resolvedSrc = resolveMaterialAssetUrl(
                        src,
                        materialContent.id,
                      );
                      if (!resolvedSrc) return null;
                      return (
                        <img
                          src={resolvedSrc}
                          alt={alt || "Extracted figure"}
                          loading="lazy"
                          className="max-w-full h-auto border border-primary/30 bg-black/20"
                        />
                      );
                    },
                  }}
                >
                  {materialContent.content}
                </ReactMarkdown>
              </div>
            ) : (
              <div className={`${TEXT_MUTED} text-center py-8`}>
                No extracted content available for this material.
              </div>
            )}
          </HudPanel>
        </DialogContent>
      </Dialog>
    </PageScaffold>
  );
}

export default function Library() {
  return useLibraryPageController();
}
