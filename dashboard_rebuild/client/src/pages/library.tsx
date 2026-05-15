import { PageScaffold } from "@/components/PageScaffold";
import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  type ComponentPropsWithoutRef,
} from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  consumeLibraryLaunchFromTutor,
} from "@/lib/tutorClientState";
import type {
  Material,
  MaterialContent,
  TutorEmbedStatus,
  TutorContentSources,
  TutorSyncPreviewNode,
  TutorSyncPreviewResult,
} from "@/lib/api";
import type { Course } from "@shared/schema";
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
} from "lucide-react";
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
const LIBRARY_PANEL_SURFACE = "library-panel-surface";
const LIBRARY_PANEL_INSET = "library-panel-inset";
const LIBRARY_ACTION_BUTTON = "library-action-button";
const LIBRARY_SELECT = `${SELECT_BASE} library-field h-10 min-h-[40px] rounded-[0.75rem] px-3`;
const LIBRARY_SECTION_LABEL = "library-section-label";
const LIBRARY_MAIN_TITLE =
  "font-arcade text-base uppercase tracking-[0.16em] text-white";
const LIBRARY_PANEL_TITLE = "library-panel-title";
const LIBRARY_HELP_TEXT = "library-help-text";
const MATERIAL_TABLE_GRID_TEMPLATE =
  "40px minmax(340px,1.35fr) minmax(220px,0.9fr) minmax(240px,0.85fr) 92px 96px 132px";
const MATERIAL_READER_MARKDOWN_CLASS = `
  library-material-markdown prose prose-invert prose-base mx-auto max-w-[86ch] font-sans text-[16px] leading-8 tracking-normal sm:text-[17px]
  prose-headings:font-sans prose-headings:font-semibold prose-headings:tracking-normal prose-headings:normal-case prose-headings:text-primary prose-headings:border-b prose-headings:border-primary/20 prose-headings:pb-2
  prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg
  prose-p:text-foreground/90 prose-p:leading-7
  prose-li:text-foreground/90 prose-li:leading-7
  prose-strong:text-primary/90
  prose-table:border-collapse prose-table:text-sm prose-th:border prose-th:border-primary/30 prose-th:bg-primary/10 prose-th:px-3 prose-th:py-2
  prose-td:border prose-td:border-primary/20 prose-td:px-3 prose-td:py-2
  prose-code:text-primary/80 prose-code:bg-primary/10 prose-code:px-1 prose-code:rounded-none
  prose-pre:bg-black/60 prose-pre:border prose-pre:border-primary/20 prose-pre:text-sm
`;
type LibraryWorkflowTab = "upload" | "materials";
type MaterialRole = "study" | "reference" | "setup";

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

function getMaterialMarkdownComponents(materialId: number) {
  return {
    table: ({
      node: _node,
      children,
      ...props
    }: ComponentPropsWithoutRef<"table"> & { node?: unknown }) => (
      <div
        className="library-material-table-scroll"
        data-testid="library-material-table-scroll"
      >
        <table {...props}>{children}</table>
      </div>
    ),
    img: ({
      node: _node,
      src,
      alt,
    }: ComponentPropsWithoutRef<"img"> & { node?: unknown }) => {
      const resolvedSrc = resolveMaterialAssetUrl(src, materialId);
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
  };
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

function getMaterialContentTitle(material: MaterialContent | undefined): string {
  const title = (material?.title || "").trim();
  if (title) return title;
  const rawPath = (material?.source_path || "").replace(/\\/g, "/").trim();
  const fallback = rawPath.split("/").filter(Boolean).pop();
  return fallback || "Material Content";
}

function getMaterialSize(mat: Material): number {
  const candidate = Number(mat.file_size);
  return Number.isFinite(candidate) && candidate >= 0
    ? Math.floor(candidate)
    : 0;
}

function materialMatchesLibrarySearch(mat: Material, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const haystack = [
    getMaterialTitle(mat),
    getMaterialFolder(mat),
    mat.source_path || "",
    mat.file_type || "",
    getMaterialRole(mat),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
}

function pluralizeCount(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
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
  const explicitRole = String(mat.material_role || "").toLowerCase().trim();
  if (explicitRole === "setup" || String(mat.corpus || "").toLowerCase() === "course_setup") {
    return "setup";
  }
  const explicitDocType = String(mat.doc_type || "").toLowerCase().trim();
  if (explicitDocType === "course_setup" || explicitDocType === "syllabus" || explicitDocType === "schedule") {
    return "setup";
  }
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

function countPreviewFiles(node: TutorSyncPreviewNode | undefined): number {
  if (!node?.children?.length) return 0;
  return node.children.reduce((total, child) => {
    if (child.type === "file") return total + 1;
    return total + countPreviewFiles(child);
  }, 0);
}

function flattenPreviewFolders(
  node: TutorSyncPreviewNode | undefined,
  depth = 0,
): FolderListItem[] {
  if (!node?.children?.length) return [];
  const items: FolderListItem[] = [];
  const folderChildren = node.children.filter((child) => child.type === "folder");

  for (const child of folderChildren) {
    const path = (child.path || child.name).replace(/^\/+|\/+$/g, "");
    items.push({
      path,
      name: child.name,
      depth,
      filesCount: countPreviewFiles(child),
      hasChildren: Boolean(
        child.children?.some((grandchild) => grandchild.type === "folder"),
      ),
    });
    items.push(...flattenPreviewFolders(child, depth + 1));
  }

  return items;
}

function materialIsInFolder(mat: Material, folderPath: string): boolean {
  if (!folderPath) return true;
  const normalizedFolder = folderPath.replace(/^\/+|\/+$/g, "");
  const materialFolder = getMaterialFolder(mat).replace(/^\/+|\/+$/g, "");
  return (
    materialFolder === normalizedFolder ||
    materialFolder.startsWith(`${normalizedFolder}/`)
  );
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

type InitialLibraryLaunchState = {
  sidebarMode: "folders" | "courses";
  selectedCourseId: number | "unlinked" | null;
  uploadCourseTarget: string;
  selectedFolderPath: string;
};

function readInitialLibraryLaunchState(): InitialLibraryLaunchState {
  const handoff = consumeLibraryLaunchFromTutor();
  if (!handoff || typeof handoff.courseId !== "number") {
    return {
      sidebarMode: "courses",
      selectedCourseId: null,
      uploadCourseTarget: "",
      selectedFolderPath: ALL_FOLDERS_KEY,
    };
  }
  const courseId = String(handoff.courseId);
  return {
    sidebarMode: "courses",
    selectedCourseId: handoff.courseId,
    uploadCourseTarget: courseId,
    selectedFolderPath: ALL_FOLDERS_KEY,
  };
}

function renderMaterialRow(
  mat: Material,
  isDuplicate: boolean,
  editingId: number | null,
  editTitle: string,
  setEditTitle: (value: string) => void,
  setEditingId: (id: number | null) => void,
  saveEdit: () => void,
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
        gridTemplateColumns: MATERIAL_TABLE_GRID_TEMPLATE,
      }}
    >
      <div className="flex items-center justify-center">
        <FileText className={`${ICON_SM} text-primary/70`} />
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
      <div className="flex min-w-0 flex-wrap items-center gap-1.5 overflow-visible">
        {isDuplicate ? (
          <Badge
            variant="outline"
            className={`${TEXT_BADGE} h-4 shrink-0 px-1 w-fit border-yellow-500/50 text-yellow-400`}
          >
            DUPE
          </Badge>
        ) : null}
        <Badge
          variant="outline"
          className={`${TEXT_BADGE} h-4 shrink-0 px-1 w-fit`}
        >
          {getFileTypeLabel(mat.file_type)}
        </Badge>
        {materialRole === "reference" ? (
          <Badge
            variant="outline"
            className={`${TEXT_BADGE} h-4 shrink-0 px-1 w-fit border-sky-500/50 text-sky-300`}
            title="Course reference; manually selectable for Tutor"
          >
            COURSE REF
          </Badge>
        ) : null}
        {materialRole === "setup" ? (
          <Badge
            variant="outline"
            className={`${TEXT_BADGE} h-4 shrink-0 px-1 w-fit border-emerald-500/50 text-emerald-300`}
            title="Course setup file"
          >
            SETUP
          </Badge>
        ) : null}
        {canReextract ? (
          <Badge
            variant="outline"
            className={`${TEXT_BADGE} h-4 shrink-0 px-1 w-fit ${hasDoclingAssets ? "border-green-500/60 text-green-300" : "border-yellow-500/60 text-yellow-300"}`}
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
          onClick={() => viewContent(mat.id)}
          className="text-muted-foreground hover:text-primary transition-colors p-0.5"
          title="View content"
          aria-label="View content"
        >
          <Eye className={ICON_SM} />
        </button>
        {canReextract ? (
          <button
            onClick={() => reextractContent(mat.id)}
            disabled={isReextracting}
            className="text-muted-foreground hover:text-primary transition-colors p-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Re-extract with Docling"
            aria-label="Re-extract with Docling"
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
          aria-label="Edit title"
        >
          <Pencil className={ICON_SM} />
        </button>

        {deleteConfirm === mat.id ? (
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => deleteMutation.mutate(mat.id)}
              className="text-red-400 hover:text-red-300 p-0.5"
              title="Confirm delete"
              aria-label="Confirm delete"
            >
              <Check className={ICON_SM} />
            </button>
            <button
              onClick={() => setDeleteConfirm(null)}
              className="text-muted-foreground hover:text-foreground p-0.5"
              title="Cancel"
              aria-label="Cancel delete"
            >
              <X className={ICON_SM} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setDeleteConfirm(mat.id)}
            className="text-muted-foreground hover:text-red-400 transition-colors p-0.5"
            title="Delete"
            aria-label="Delete"
          >
            <Trash2 className={ICON_SM} />
          </button>
        )}
      </div>
    </div>
  );
}

function useLibraryPageController() {
  const queryClient = useQueryClient();
  const initialLaunchState = useMemo(() => readInitialLibraryLaunchState(), []);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [activeLibraryTab, setActiveLibraryTab] =
    useState<LibraryWorkflowTab>("materials");
  const [librarySearchQuery, setLibrarySearchQuery] = useState("");
  const [uploadCourseTarget, setUploadCourseTarget] = useState<string>(
    initialLaunchState.uploadCourseTarget,
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
  const [sidebarMode, setSidebarMode] = useState<"folders" | "courses">(
    initialLaunchState.sidebarMode,
  );
  const [selectedCourseId, setSelectedCourseId] = useState<
    number | "unlinked" | null
  >(initialLaunchState.selectedCourseId);
  const [viewingMaterialId, setViewingMaterialId] = useState<number | null>(
    null,
  );

  const { data: materials = [], isLoading } = useQuery<Material[]>({
    queryKey: ["tutor-materials", "include-setup"],
    queryFn: () => api.tutor.getMaterials({ include_setup: true }),
  });
  const {
    data: sourceFolderPreview,
    error: sourceFolderPreviewError,
    isFetching: isSourceFolderFetching,
    refetch: refetchSourceFolderPreview,
  } = useQuery<TutorSyncPreviewResult>({
    queryKey: ["library-source-folder-preview"],
    queryFn: () => api.tutor.previewSyncMaterialsFolder({}),
    staleTime: 15_000,
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

  const uploadedFolderTree = useMemo(() => buildFolderTree(materials), [materials]);
  const uploadedFolderItems = useMemo(
    () => flattenFolders(uploadedFolderTree),
    [uploadedFolderTree],
  );
  const sourceFolderItems = useMemo(
    () => flattenPreviewFolders(sourceFolderPreview?.tree),
    [sourceFolderPreview],
  );
  const hasLiveSourceFolders = sourceFolderItems.length > 0;
  const folderItems = hasLiveSourceFolders
    ? sourceFolderItems
    : uploadedFolderItems;
  const sourceFolderFileCount = sourceFolderPreview?.counts?.files;
  const sourceFolderRoot = sourceFolderPreview?.folder || "";
  const activeFolderPathSet = useMemo(
    () => new Set(folderItems.map((item) => item.path)),
    [folderItems],
  );
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
    return materials
      .filter((material) => materialIsInFolder(material, selectedFolderPath))
      .sort((a, b) =>
        getMaterialTitle(a).localeCompare(getMaterialTitle(b)),
      );
  }, [
    selectedFolderPath,
    selectedCourseId,
    sidebarMode,
    materials,
  ]);
  const visibleCatalogMaterials = useMemo(
    () =>
      visibleMaterials.filter((material) =>
        materialMatchesLibrarySearch(material, librarySearchQuery),
      ),
    [librarySearchQuery, visibleMaterials],
  );
  const selectedFolderLabel = useMemo(() => {
    if (sidebarMode === "courses") {
      if (selectedCourseId === null) return "All Materials";
      if (selectedCourseId === "unlinked") return "Unlinked";
      const course = contentSources?.courses.find(
        (c) => c.id === selectedCourseId,
      );
      return course ? course.name || course.code : "All Materials";
    }
    if (selectedFolderPath) return selectedFolderPath;
    return hasLiveSourceFolders ? "All PT School folders" : "All Materials";
  }, [
    sidebarMode,
    selectedCourseId,
    contentSources,
    selectedFolderPath,
    hasLiveSourceFolders,
  ]);
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

  const handleSidebarModeChange = (mode: "folders" | "courses") => {
    setSidebarMode(mode);
    if (mode === "folders") {
      setSelectedCourseId(null);
    } else {
      selectFolderPath(ALL_FOLDERS_KEY);
    }
  };

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
  useEffect(() => {
    if (isLoading) return;
    if (
      selectedFolderPath !== ALL_FOLDERS_KEY &&
      !activeFolderPathSet.has(selectedFolderPath) &&
      !materials.some((material) => materialIsInFolder(material, selectedFolderPath))
    ) {
      selectFolderPath(ALL_FOLDERS_KEY);
    }
  }, [
    activeFolderPathSet,
    isLoading,
    materials,
    selectedFolderPath,
  ]);

  useEffect(() => {
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
    if (!initializedFolderExpansion) setInitializedFolderExpansion(true);
  }, [folderItems, initializedFolderExpansion]);

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

  const showSourceTab = activeLibraryTab === "upload";
  const showMaterialsTab = activeLibraryTab === "materials";
  const materialSectionTitle = "LIBRARY FILES";
  const visibleTabFileCount = visibleCatalogMaterials.length;
  const visibleTabFileLabel = "file";

  return (
    <PageScaffold
      eyebrow="Library Support System"
      title="Materials Library"
      subtitle="A searchable catalog of uploaded course files. Upload, find, rename, view, and organize coursework in one place."
      className="flex h-full min-h-[72vh] flex-col"
      contentClassName="flex-1 min-h-0"
      heroClassName="library-page-hero library-page-hero--compact"
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
      <div className="brain-workspace brain-workspace--ready app-workspace-shell library-ops-workspace library-ops-workspace--calm relative flex-1 min-h-[70vh] w-full overflow-hidden">
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
                {sidebarMode === "folders" ? (
                  <div className="mt-3 rounded-[0.85rem] border border-primary/15 bg-black/35 p-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className={LIBRARY_SECTION_LABEL}>FOLDERS</div>
                        <div className={`${LIBRARY_HELP_TEXT} mt-1`}>
                          {hasLiveSourceFolders
                            ? "Shows the live PT School source tree. Counts are source files; rows are uploaded Library files."
                            : "Shows folders from uploaded Library files until the PT School source scan is available."}
                        </div>
                        {sourceFolderRoot ? (
                          <div
                            className={`${LIBRARY_HELP_TEXT} mt-2 truncate text-primary/70`}
                            title={sourceFolderRoot}
                          >
                            Source: {sourceFolderRoot}
                          </div>
                        ) : null}
                        {sourceFolderPreviewError ? (
                          <div className="mt-2 text-ui-xs text-amber-300">
                            Source scan unavailable.
                          </div>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        aria-label="Refresh source folders"
                        title="Refresh source folders"
                        className="library-icon-button shrink-0"
                        onClick={() => void refetchSourceFolderPreview()}
                        disabled={isSourceFolderFetching}
                      >
                        <RefreshCw
                          className={`${ICON_SM} ${isSourceFolderFetching ? "animate-spin" : ""}`}
                        />
                      </button>
                    </div>
                    {hasLiveSourceFolders && sourceFolderFileCount !== undefined ? (
                      <div className={`${TEXT_MUTED} mt-2 text-ui-xs`}>
                        {sourceFolderFileCount} source files detected.
                      </div>
                    ) : null}
                  </div>
                ) : null}
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
                      <span className="truncate flex-1">
                        {hasLiveSourceFolders ? "All PT School" : "All Materials"}
                      </span>
                      <span className="text-sm">
                        {sourceFolderFileCount ?? materials.length}
                      </span>
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
                        Upload files or refresh the PT School source scan to populate this rail.
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
                              onClick={() => {
                                const nextId = course.id!;
                                setSelectedCourseId(nextId);
                                setUploadCourseTarget(String(nextId));
                              }}
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
              <div className={`${PANEL_PADDING} border-b border-primary/10 bg-black/25`}>
                <div
                  className="library-segmented-control library-workflow-tabs grid grid-cols-2 gap-1 p-1"
                  aria-label="Library workflow"
                  role="tablist"
                >
                  {[
                    ["materials", "ALL FILES"],
                    ["upload", "UPLOAD"],
                  ].map(([tab, label]) => (
                    <HudButton
                      key={tab}
                      type="button"
                      role="tab"
                      aria-selected={activeLibraryTab === tab}
                      variant={
                        activeLibraryTab === tab ? "primary" : "outline"
                      }
                      className={cn(
                        "min-h-[38px] px-3",
                        activeLibraryTab === tab
                          ? "bg-primary/20 text-primary"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                      onClick={() =>
                        setActiveLibraryTab(tab as LibraryWorkflowTab)
                      }
                    >
                      {label}
                    </HudButton>
                  ))}
                </div>
              </div>
              <div className="border-b border-primary/10 bg-transparent">
                <div
                  className={`${PANEL_PADDING} space-y-3`}
                >
                  {showSourceTab ? (
                  <HudPanel
                    variant="b"
                    className={`${LIBRARY_PANEL_SURFACE} p-3`}
                  >
                    <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
                      <div className="min-w-0">
                        <div className={LIBRARY_SECTION_LABEL}>UPLOAD FILES</div>
                        <div className={`${LIBRARY_HELP_TEXT} mt-1`}>
                          Add one-off files from Downloads, email, Blackboard,
                          or your course folders. Library stores and extracts
                          each file so it stays searchable.
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 md:grid-cols-3">
                      {[
                        ["CATALOG", "Uploaded files become searchable Library records."],
                        ["COURSE LINK", "Choose a course when you know where a file belongs."],
                        ["AVAILABLE LATER", "Keep the file organized here for future study."],
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
                  ) : null}

                  {showSourceTab ? (
                  <HudPanel
                    variant="b"
                    className={`${LIBRARY_PANEL_SURFACE} space-y-2 p-3`}
                  >
                    <div className="flex items-center gap-2">
                      <Upload className={ICON_SM} />
                      <div className={LIBRARY_PANEL_TITLE}>UPLOAD FILES</div>
                    </div>
                    <div className={LIBRARY_HELP_TEXT}>
                      Upload files into the Library catalog. Syllabus,
                      schedule, slides, readings, notes, and recordings all
                      land here as searchable file records.
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
                      role="study"
                    />
                  </HudPanel>
                  ) : null}
	                </div>
	              </div>

		              {showMaterialsTab ? (
		              <div
		                className={`${PANEL_PADDING} flex-1 min-h-0 flex flex-col gap-3`}
		              >
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-1">
                    <div className={LIBRARY_PANEL_TITLE}>
                      {materialSectionTitle}
                    </div>
                    <div className={TEXT_MUTED}>
                      {sidebarMode === "courses" ? "Course" : "Folder"}:{" "}
                      <span className="!text-white font-terminal">
                        {selectedFolderLabel}
                      </span>{" "}
                      • showing {visibleTabFileCount} {visibleTabFileLabel}
                      {visibleTabFileCount === 1 ? "" : "s"}
                    </div>
                  </div>
                  <div className="grid gap-2 lg:grid-cols-[minmax(260px,420px)_auto]">
                    {showMaterialsTab ? (
                      <input
                        aria-label="Search Library files"
                        className={INPUT_BASE}
                        placeholder="Search Library files"
                        value={librarySearchQuery}
                        onChange={(event) =>
                          setLibrarySearchQuery(event.target.value)
                        }
                      />
                    ) : null}

	                  </div>
	                </div>

	                {showMaterialsTab ? (
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
                  ) : visibleCatalogMaterials.length === 0 ? (
                    <div className="text-center py-10">
                      <FileText className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                      <div className={TEXT_MUTED}>
                        No materials found in this Library view.
                      </div>
                    </div>
                  ) : (
                    <div className="h-full min-h-0 overflow-auto">
                      <div className="min-w-[1240px]">
                        <div
                          className="grid gap-3 px-3 py-2 border-b border-primary/15 bg-black/80 sticky top-0 z-10"
                          style={{
                            gridTemplateColumns: MATERIAL_TABLE_GRID_TEMPLATE,
                          }}
                        >
                          <div aria-hidden="true" />
                          <div className={TEXT_MUTED}>Title</div>
                          <div className={TEXT_MUTED}>Folder</div>
                          <div className={TEXT_MUTED}>Type</div>
                          <div className={TEXT_MUTED}>Size</div>
                          <div className={TEXT_MUTED}>Status</div>
                          <div className={`${TEXT_MUTED} text-right`}>
                            Actions
                          </div>
                        </div>
                        {visibleCatalogMaterials.map((mat) =>
                          renderMaterialRow(
                            mat,
                            Boolean(
                              mat.checksum && dupeChecksums.has(mat.checksum),
                            ),
                            editingId,
                            editTitle,
                            setEditTitle,
                            setEditingId,
                            saveEdit,
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
	                ) : null}
	              </div>
	              ) : null}
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
              Creates a course record. Upload materials afterward when files
              belong with this class.
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
        <DialogContent className="flex h-[88vh] max-h-[88vh] max-w-6xl flex-col gap-0 overflow-hidden border-primary/35 bg-[#050506] p-0">
          <DialogHeader className="shrink-0 border-b border-primary/15 bg-black/70 px-5 py-4">
            <DialogTitle className="library-material-dialog-title flex items-start gap-2 pr-8">
              <FileText className={`${ICON_SM} mt-1 shrink-0 text-primary/80`} />
              <span className="min-w-0 truncate">
                {getMaterialContentTitle(materialContent)}
              </span>
            </DialogTitle>
            <DialogDescription asChild>
              <div className="mt-2 flex items-center gap-2 font-sans text-sm text-muted-foreground">
                {materialContent?.file_type && (
                  <Badge variant="outline" className="h-6 rounded-full px-2 font-mono text-xs uppercase tracking-normal">
                    {getFileTypeLabel(materialContent.file_type)}
                  </Badge>
                )}
                {materialContent?.char_count !== undefined && (
                  <span>
                    {materialContent.char_count.toLocaleString()} characters
                  </span>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <HudPanel
            variant="b"
            className="min-h-0 flex-1 bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(0,0,0,0.86))] p-0"
          >
            <div
              className="library-material-reader-shell relative z-10 h-full min-h-0 overflow-y-auto overscroll-contain px-5 py-7 sm:px-8"
              data-testid="library-material-reader"
              tabIndex={0}
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
                        {Math.round(materialContent.replacement_ratio * 100)}%
                        of this PDF could not be decoded — it may use scanned
                        images or an embedded font. The readable portions are
                        shown below. Consider re-uploading with an OCR-processed
                        version.
                      </div>
                    </div>
                  </div>
                  {materialContent.content ? (
                    <div
                      className={MATERIAL_READER_MARKDOWN_CLASS}
                      data-testid="library-material-markdown"
                    >
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={getMaterialMarkdownComponents(
                          materialContent.id,
                        )}
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
                  className={MATERIAL_READER_MARKDOWN_CLASS}
                  data-testid="library-material-markdown"
                >
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={getMaterialMarkdownComponents(materialContent.id)}
                  >
                    {materialContent.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className={`${TEXT_MUTED} text-center py-8`}>
                  No extracted content available for this material.
                </div>
              )}
            </div>
          </HudPanel>
        </DialogContent>
      </Dialog>
    </PageScaffold>
  );
}

export default function Library() {
  return useLibraryPageController();
}
