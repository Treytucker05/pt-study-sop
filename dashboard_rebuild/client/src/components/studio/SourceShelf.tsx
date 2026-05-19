import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Folder,
  FolderSync,
  FolderTree,
  Loader2,
  Plus,
  Search,
  Upload,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import type { Material } from "@/lib/api";
import { materialFolderSegments } from "@/lib/materialFolder";
import { basenameFromPath as sharedBasenameFromPath, splitPath as sharedSplitPath } from "@/lib/pathDisplay";
import type { StudioWorkspaceObject } from "@/lib/studioWorkspaceObjects";

type SourceShelfFilter = "all" | "current_run" | "library" | "vault";

export interface SourceShelfCourseOption {
  id: number;
  name: string;
}

export interface SourceShelfProps {
  courseId?: number | null;
  courseName: string | null;
  studyUnit: string | null;
  topic: string | null;
  materials: Material[];
  selectedMaterialIds: number[];
  selectedMaterialCount: number;
  selectedPaths: string[];
  vaultFolder: string | null;
  courseOptions?: SourceShelfCourseOption[];
  workspaceObjectIds?: string[];
  onSelectedMaterialIdsChange?: (ids: number[]) => void;
  onSelectedPathsChange?: (paths: string[]) => void;
  onUploadFiles?: (files: File[]) => Promise<void> | void;
  isUploading?: boolean;
  onAddToWorkspace?: (
    object: Extract<StudioWorkspaceObject, { kind: "material" | "vault_path" }>,
  ) => void;
  onOpenInDocumentDock?: (
    object: Extract<StudioWorkspaceObject, { kind: "material" | "vault_path" }>,
  ) => void;
}

type SourceLeafNode = {
  id: string;
  kind: "leaf";
  sourceType: "material" | "vault";
  label: string;
  detail: string;
  badge: string;
  checked: boolean;
  workspaceObject: Extract<
    StudioWorkspaceObject,
    { kind: "material" | "vault_path" }
  >;
};

type SourceFolderNode = {
  id: string;
  kind: "folder";
  label: string;
  folderType: "course" | "source" | "path";
  children: SourceTreeNode[];
};

type SourceTreeNode = SourceFolderNode | SourceLeafNode;

const SOURCE_FILTERS: Array<[SourceShelfFilter, string]> = [
  ["all", "All"],
  ["current_run", "Current Run"],
  ["library", "Library"],
  ["vault", "Vault"],
];

const SOURCE_FOLDER_ORDER: Record<string, number> = {
  Library: 0,
  Vault: 1,
};
const VAULT_ROOT_SEGMENTS = new Set(["courses", "course", "school"]);

function normalizeText(value: string | null | undefined): string {
  return String(value || "").trim();
}

function normalizeKey(value: string | null | undefined): string {
  return normalizeText(value).toLowerCase();
}

function uniqueNumbers(values: number[]): number[] {
  return Array.from(new Set(values.filter((value) => Number.isFinite(value))));
}

function uniqueStrings(values: string[]): string[] {
  const next = new Set<string>();
  values.forEach((value) => {
    const trimmed = normalizeText(value);
    if (trimmed) {
      next.add(trimmed);
    }
  });
  return Array.from(next);
}

function formatFileType(value: string | null | undefined): string {
  const normalized = normalizeText(value);
  return normalized ? normalized.toUpperCase() : "FILE";
}

function createMaterialWorkspaceObject(
  material: Material,
): Extract<StudioWorkspaceObject, { kind: "material" }> {
  return {
    id: `material:${material.id}`,
    kind: "material",
    title: normalizeText(material.title) || `Material #${material.id}`,
    detail: normalizeText(material.source_path) || "Source path unavailable",
    badge: formatFileType(material.file_type),
  };
}

function createVaultWorkspaceObject(
  path: string,
): Extract<StudioWorkspaceObject, { kind: "vault_path" }> {
  return {
    id: `vault:${path}`,
    kind: "vault_path",
    title: path,
    detail: "Linked vault reference",
    badge: "VAULT",
  };
}

const splitPath = sharedSplitPath;

function basenameFromPath(path: string): string {
  const base = sharedBasenameFromPath(path);
  return base || normalizeText(path);
}

function trimVaultRootSegments(segments: string[]): string[] {
  if (segments.length <= 1) {
    return segments;
  }

  let next = [...segments];
  while (
    next.length > 1 &&
    VAULT_ROOT_SEGMENTS.has(normalizeKey(next[0]))
  ) {
    next = next.slice(1);
  }
  return next;
}

function normalizeVaultPath(path: string): string {
  return splitPath(path).join("/");
}

function normalizeVaultSelectionKey(path: string): string {
  return trimVaultRootSegments(splitPath(path)).join("/").toLowerCase();
}

function uniqueVaultPaths(values: string[]): string[] {
  const next = new Map<string, string>();

  values.forEach((value) => {
    const normalizedPath = normalizeVaultPath(value);
    const normalizedKey = normalizeVaultSelectionKey(normalizedPath);
    if (!normalizedKey || next.has(normalizedKey)) {
      return;
    }
    next.set(normalizedKey, normalizedPath);
  });

  return Array.from(next.values());
}

function joinVaultPath(basePath: string, entry: string): string {
  const normalizedBasePath = normalizeVaultPath(basePath);
  const normalizedEntryPath = normalizeVaultPath(entry.replace(/\/$/, ""));
  if (!normalizedBasePath) {
    return normalizedEntryPath;
  }
  if (
    normalizedEntryPath.toLowerCase() === normalizedBasePath.toLowerCase() ||
    normalizedEntryPath
      .toLowerCase()
      .startsWith(`${normalizedBasePath.toLowerCase()}/`)
  ) {
    return normalizedEntryPath;
  }
  return `${normalizedBasePath}/${normalizedEntryPath}`;
}

async function listVaultFiles(folder: string): Promise<string[]> {
  const normalizedFolder = normalizeVaultPath(folder);
  if (!normalizedFolder) {
    return [];
  }

  const seenFolders = new Set<string>();

  const walk = async (folderPath: string): Promise<string[]> => {
    const normalized = normalizeVaultPath(folderPath);
    if (!normalized || seenFolders.has(normalized)) {
      return [];
    }
    seenFolders.add(normalized);

    const result = await api.obsidian.getFiles(normalized);
    const entries = Array.isArray(result?.files) ? result.files : [];
    const files: string[] = [];

    for (const rawEntry of entries) {
      const trimmedEntry = normalizeText(rawEntry);
      if (!trimmedEntry) {
        continue;
      }

      if (trimmedEntry.endsWith("/")) {
        files.push(...(await walk(joinVaultPath(normalized, trimmedEntry))));
        continue;
      }

      files.push(joinVaultPath(normalized, trimmedEntry));
    }

    return files;
  };

  return uniqueStrings(await walk(normalizedFolder));
}

function collectLeafNodes(node: SourceTreeNode): SourceLeafNode[] {
  if (node.kind === "leaf") {
    return [node];
  }

  return node.children.flatMap((child) => collectLeafNodes(child));
}

function nodeHasCheckedDescendant(node: SourceTreeNode): boolean {
  return collectLeafNodes(node).some((leaf) => leaf.checked);
}

function leafMatchesFilter(
  leaf: SourceLeafNode,
  filter: SourceShelfFilter,
): boolean {
  switch (filter) {
    case "all":
      return true;
    case "current_run":
      return leaf.checked;
    case "library":
      return leaf.sourceType === "material";
    case "vault":
      return leaf.sourceType === "vault";
    default:
      return true;
  }
}

function leafMatchesSearch(leaf: SourceLeafNode, query: string): boolean {
  if (!query) return true;
  const haystack = [leaf.label, leaf.detail, leaf.badge].join(" ").toLowerCase();
  return haystack.includes(query);
}

function filterTreeNode(
  node: SourceTreeNode,
  filter: SourceShelfFilter,
  query: string,
  forceInclude = false,
): SourceTreeNode | null {
  if (node.kind === "leaf") {
    if (!leafMatchesFilter(node, filter)) {
      return null;
    }
    if (!forceInclude && !leafMatchesSearch(node, query)) {
      return null;
    }
    return node;
  }

  const folderMatchesQuery = query
    ? node.label.toLowerCase().includes(query)
    : false;
  const children = node.children
    .map((child) =>
      filterTreeNode(child, filter, query, forceInclude || folderMatchesQuery),
    )
    .filter((child): child is SourceTreeNode => child !== null);

  if (children.length === 0) {
    return null;
  }

  return {
    ...node,
    children,
  };
}

function sortTreeNodes(nodes: SourceTreeNode[]): SourceTreeNode[] {
  return [...nodes]
    .map((node) =>
      node.kind === "folder"
        ? { ...node, children: sortTreeNodes(node.children) }
        : node,
    )
    .sort((left, right) => {
      if (left.kind === "folder" && right.kind === "leaf") return -1;
      if (left.kind === "leaf" && right.kind === "folder") return 1;

      if (left.kind === "folder" && right.kind === "folder") {
        const leftOrder = SOURCE_FOLDER_ORDER[left.label] ?? 100;
        const rightOrder = SOURCE_FOLDER_ORDER[right.label] ?? 100;
        if (leftOrder !== rightOrder) {
          return leftOrder - rightOrder;
        }
      }

      return left.label.localeCompare(right.label, undefined, {
        numeric: true,
        sensitivity: "base",
      });
    });
}

function collectDefaultExpandedNodeIds(
  nodes: SourceTreeNode[],
  depth = 0,
): string[] {
  return nodes.flatMap((node) => {
    if (node.kind === "leaf") {
      return [];
    }

    const shouldExpand = depth < 3 || nodeHasCheckedDescendant(node);
    const next = collectDefaultExpandedNodeIds(node.children, depth + 1);
    return shouldExpand ? [node.id, ...next] : next;
  });
}

function buildCourseLookup(
  courseOptions: SourceShelfCourseOption[],
  courseId: number | null | undefined,
  courseName: string | null,
) {
  const byId = new Map<number, string>();
  const byName = new Map<string, string>();

  courseOptions.forEach((course) => {
    const normalizedName = normalizeText(course.name);
    if (!normalizedName) return;
    byId.set(course.id, normalizedName);
    byName.set(normalizeKey(normalizedName), normalizedName);
  });

  if (typeof courseId === "number" && normalizeText(courseName)) {
    byId.set(courseId, normalizeText(courseName));
  }
  if (normalizeText(courseName)) {
    byName.set(normalizeKey(courseName), normalizeText(courseName));
  }

  return { byId, byName };
}

function resolveMaterialCourseLabel(
  material: Material,
  lookup: ReturnType<typeof buildCourseLookup>,
): string {
  if (
    typeof material.course_id === "number" &&
    lookup.byId.has(material.course_id)
  ) {
    return lookup.byId.get(material.course_id)!;
  }

  if (typeof material.course_id === "number") {
    return `Course ${material.course_id}`;
  }

  return "Unassigned Library";
}

function resolveVaultCourseLabel(
  path: string,
  lookup: ReturnType<typeof buildCourseLookup>,
  fallbackCourseName: string | null,
): string {
  const segments = trimVaultRootSegments(splitPath(path));
  const firstSegment = segments[0];
  if (firstSegment && lookup.byName.has(normalizeKey(firstSegment))) {
    return lookup.byName.get(normalizeKey(firstSegment))!;
  }
  if (firstSegment) {
    return firstSegment;
  }
  if (normalizeText(fallbackCourseName)) {
    return normalizeText(fallbackCourseName);
  }
  return "Vault";
}

function buildSourceTree(args: {
  materials: Material[];
  selectedMaterialIds: number[];
  knownVaultPaths: string[];
  selectedPaths: string[];
  courseOptions: SourceShelfCourseOption[];
  courseId: number | null | undefined;
  courseName: string | null;
}): SourceTreeNode[] {
  const {
    materials,
    selectedMaterialIds,
    knownVaultPaths,
    selectedPaths,
    courseOptions,
    courseId,
    courseName,
  } = args;
  const courseLookup = buildCourseLookup(courseOptions, courseId, courseName);
  const selectedMaterialIdSet = new Set(selectedMaterialIds);
  const selectedPathSet = new Set(
    selectedPaths.map((path) => normalizeVaultSelectionKey(path)),
  );
  const rootMap = new Map<string, SourceFolderNode>();

  const ensureFolder = (
    collection: SourceTreeNode[],
    id: string,
    label: string,
    folderType: SourceFolderNode["folderType"],
  ): SourceFolderNode => {
    const existing = collection.find(
      (node): node is SourceFolderNode =>
        node.kind === "folder" && node.id === id,
    );
    if (existing) return existing;

    const next: SourceFolderNode = {
      id,
      kind: "folder",
      label,
      folderType,
      children: [],
    };
    collection.push(next);
    return next;
  };

  materials.forEach((material) => {
    const courseLabel = resolveMaterialCourseLabel(material, courseLookup);
    const courseKey = normalizeKey(courseLabel) || "library";
    const courseFolder =
      rootMap.get(courseKey) ||
      (() => {
        const next: SourceFolderNode = {
          id: `course:${courseKey}`,
          kind: "folder",
          label: courseLabel,
          folderType: "course",
          children: [],
        };
        rootMap.set(courseKey, next);
        return next;
      })();

    const workspaceObject = createMaterialWorkspaceObject(material);
    const leaf: SourceLeafNode = {
      id: workspaceObject.id,
      kind: "leaf",
      sourceType: "material",
      // Show only the file's basename, never a full filesystem path, even
      // when the material title is itself an absolute path (real data).
      label: basenameFromPath(workspaceObject.title),
      detail: basenameFromPath(workspaceObject.detail),
      badge: workspaceObject.badge,
      checked: selectedMaterialIdSet.has(material.id),
      workspaceObject,
    };

    // Nest the material by its real folder hierarchy (folder_path /
    // sanitized source_path) instead of one flat "Library" bucket — this
    // is the disconnect: synced materials already carry folder_path.
    const rawSegments = materialFolderSegments(material);
    const startsWithCourse =
      rawSegments.length > 0 &&
      normalizeKey(rawSegments[0]) === normalizeKey(courseLabel);
    const segments = startsWithCourse ? rawSegments.slice(1) : rawSegments;

    if (segments.length === 0) {
      // Unfoldered (e.g. uploaded files) — small bucket, not a giant catch-all.
      ensureFolder(
        courseFolder.children,
        `${courseFolder.id}:unsorted`,
        "Unsorted",
        "source",
      ).children.push(leaf);
      return;
    }

    let parentFolder = courseFolder;
    segments.forEach((segment, index) => {
      const segmentKey = normalizeKey(segment) || `segment-${index}`;
      parentFolder = ensureFolder(
        parentFolder.children,
        `${parentFolder.id}:m:${segmentKey}`,
        segment,
        "path",
      );
    });
    parentFolder.children.push(leaf);
  });

  knownVaultPaths.forEach((path) => {
    const courseLabel = resolveVaultCourseLabel(path, courseLookup, courseName);
    const courseKey = normalizeKey(courseLabel) || "vault";
    const courseFolder =
      rootMap.get(courseKey) ||
      (() => {
        const next: SourceFolderNode = {
          id: `course:${courseKey}`,
          kind: "folder",
          label: courseLabel,
          folderType: "course",
          children: [],
        };
        rootMap.set(courseKey, next);
        return next;
      })();

    const vaultFolder = ensureFolder(
      courseFolder.children,
      `${courseFolder.id}:vault`,
      "Vault",
      "source",
    );

    const workspaceObject = createVaultWorkspaceObject(path);
    const rawSegments = trimVaultRootSegments(splitPath(path));
    const startsWithCourse =
      rawSegments.length > 1 &&
      normalizeKey(rawSegments[0]) === normalizeKey(courseLabel);
    const segments = startsWithCourse ? rawSegments.slice(1) : rawSegments;
    if (segments.length === 0) {
      vaultFolder.children.push({
        id: workspaceObject.id,
        kind: "leaf",
        sourceType: "vault",
        label: workspaceObject.title,
        detail: workspaceObject.detail,
        badge: workspaceObject.badge,
        checked: selectedPathSet.has(normalizeVaultSelectionKey(path)),
        workspaceObject,
      });
      return;
    }

    let parentFolder = vaultFolder;
    segments.forEach((segment, index) => {
      const segmentKey = normalizeKey(segment) || `segment-${index}`;
      const isLeaf = index === segments.length - 1;
      if (isLeaf) {
        parentFolder.children.push({
          id: workspaceObject.id,
          kind: "leaf",
          sourceType: "vault",
          label: segment,
          detail: workspaceObject.title,
            badge: workspaceObject.badge,
            checked: selectedPathSet.has(normalizeVaultSelectionKey(path)),
            workspaceObject,
          });
          return;
      }

      parentFolder = ensureFolder(
        parentFolder.children,
        `${parentFolder.id}:${segmentKey}`,
        segment,
        "path",
      );
    });
  });

  return sortTreeNodes(Array.from(rootMap.values()));
}

function TreeCheckbox({
  checked,
  indeterminate = false,
  ariaLabel,
  onChange,
  className,
}: {
  checked: boolean;
  indeterminate?: boolean;
  ariaLabel: string;
  onChange: () => void;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!inputRef.current) return;
    inputRef.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <input
      ref={inputRef}
      type="checkbox"
      checked={checked}
      aria-label={ariaLabel}
      onChange={onChange}
      className={className ?? "mt-1 h-4 w-4 shrink-0 accent-red-500"}
    />
  );
}

function SourceShelfTreeNode({
  node,
  depth,
  expandedNodeIds,
  onToggleExpanded,
  onToggleLeaf,
  onToggleFolder,
  workspaceObjectIds,
  onAddToWorkspace,
  onOpenInDocumentDock,
  searchActive,
}: {
  node: SourceTreeNode;
  depth: number;
  expandedNodeIds: Set<string>;
  onToggleExpanded: (nodeId: string) => void;
  onToggleLeaf: (leaf: SourceLeafNode) => void;
  onToggleFolder: (folder: SourceFolderNode) => void;
  workspaceObjectIds: string[];
  onAddToWorkspace?: (
    object: Extract<StudioWorkspaceObject, { kind: "material" | "vault_path" }>,
  ) => void;
  onOpenInDocumentDock?: (
    object: Extract<StudioWorkspaceObject, { kind: "material" | "vault_path" }>,
  ) => void;
  searchActive: boolean;
}) {
  if (node.kind === "leaf") {
    const isInWorkspace = workspaceObjectIds.includes(node.workspaceObject.id);
    const shouldShowDetail = normalizeKey(node.detail) !== normalizeKey(node.label);

    return (
      <div
        className="rounded-md border border-white/[0.08] bg-black/15 px-2 py-1.5"
        style={{ marginLeft: `${depth * 10}px` }}
      >
        <div className="flex items-center gap-2">
          <TreeCheckbox
            checked={node.checked}
            ariaLabel={`Include ${node.label} in current run`}
            onChange={() => onToggleLeaf(node)}
            className="h-3.5 w-3.5 shrink-0 accent-red-500"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span
                className="min-w-0 flex-1 truncate text-sm text-white"
                title={node.label}
              >
                {node.label}
              </span>
              <Badge
                variant="outline"
                className="shrink-0 rounded-full border-white/10 px-1.5 py-0 text-[9px] uppercase tracking-[0.16em] text-zinc-400"
              >
                {node.badge}
              </Badge>
              {node.sourceType === "vault" ? (
                <Badge
                  variant="outline"
                  className="shrink-0 rounded-full border-white/[0.08] px-1.5 py-0 text-[10px] font-semibold uppercase tracking-wider text-zinc-500"
                >
                  Vault
                </Badge>
              ) : null}
            </div>
            {shouldShowDetail ? (
              <div
                className="truncate text-[11px] text-zinc-500"
                title={node.workspaceObject.detail}
              >
                {node.detail}
              </div>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenInDocumentDock?.(node.workspaceObject)}
              aria-label={`Open ${node.label} in Document Dock`}
              title="Open in Document Dock"
              className="h-6 w-6 rounded-full border-white/10 bg-black/20 p-0 text-zinc-200 hover:bg-black/30 hover:text-white"
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
            {onAddToWorkspace ? (
              <Button
                type="button"
                variant="outline"
                disabled={isInWorkspace}
                onClick={() => onAddToWorkspace(node.workspaceObject)}
                aria-label={
                  isInWorkspace
                    ? `${node.label} already in workspace`
                    : `Add ${node.label} to workspace`
                }
                title={
                  isInWorkspace ? "Already in workspace" : "Add to workspace"
                }
                className="h-6 w-6 rounded-full border-white/10 bg-black/20 p-0 text-zinc-200 hover:bg-black/30 hover:text-white disabled:cursor-default disabled:opacity-100 disabled:text-zinc-300"
              >
                <Plus className="h-3 w-3" />
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  const leafNodes = collectLeafNodes(node);
  const checkedLeafCount = leafNodes.filter((leaf) => leaf.checked).length;
  const allChecked = leafNodes.length > 0 && checkedLeafCount === leafNodes.length;
  const partiallyChecked = checkedLeafCount > 0 && checkedLeafCount < leafNodes.length;
  const isExpanded = searchActive || expandedNodeIds.has(node.id);

  return (
    <div className="space-y-1" style={{ marginLeft: `${depth * 10}px` }}>
      <div className="flex items-center gap-2 border-l border-white/10 py-0.5 pl-2">
        <TreeCheckbox
          checked={allChecked}
          indeterminate={partiallyChecked}
          ariaLabel={`Include all ${node.label} in current run`}
          onChange={() => onToggleFolder(node)}
          className="h-3.5 w-3.5 shrink-0 accent-red-500"
        />
        <button
          type="button"
          aria-label={`${node.label} ${checkedLeafCount}/${leafNodes.length} loaded`}
          onClick={() => onToggleExpanded(node.id)}
          className="flex min-w-0 flex-1 items-center gap-1.5 rounded-sm bg-transparent px-1 py-0.5 text-left transition-colors hover:bg-white/5"
        >
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
          )}
          {node.folderType === "course" ? (
            <FolderTree className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
          ) : (
            <Folder className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
          )}
          <span className="min-w-0 flex-1 truncate text-sm text-white">
            {node.label}
          </span>
          <span className="shrink-0 text-[11px] text-zinc-400">
            {checkedLeafCount}/{leafNodes.length} loaded
          </span>
        </button>
      </div>

      {isExpanded ? (
        <div className="space-y-1">
          {node.children.map((child) => (
            <SourceShelfTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              expandedNodeIds={expandedNodeIds}
              onToggleExpanded={onToggleExpanded}
              onToggleLeaf={onToggleLeaf}
              onToggleFolder={onToggleFolder}
              workspaceObjectIds={workspaceObjectIds}
              onAddToWorkspace={onAddToWorkspace}
              onOpenInDocumentDock={onOpenInDocumentDock}
              searchActive={searchActive}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Poll a Root-Folder sync job to completion. The in-place sync re-indexes
 * the configured Root Folder by folder structure WITHOUT re-uploading each
 * file (that is the Root-Folder ↔ Uploaded-Files reconciliation the user
 * asked for). Mirrors library.tsx waitForMaterialSyncJob.
 */
async function waitForSourceSyncJob(
  jobId: string,
  onProgress?: (
    status: Awaited<ReturnType<typeof api.tutor.getSyncMaterialsStatus>>,
  ) => void,
) {
  let lastStatus: Awaited<
    ReturnType<typeof api.tutor.getSyncMaterialsStatus>
  > | null = null;
  // 112 files + embeddings can run for several minutes; cap generously
  // (~10 min) and surface progress so the tree can fill in live.
  for (let attempt = 0; attempt < 1000; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    lastStatus = await api.tutor.getSyncMaterialsStatus(jobId);
    onProgress?.(lastStatus);
    if (lastStatus.status === "completed" || lastStatus.status === "failed") {
      return lastStatus;
    }
  }
  return lastStatus;
}

export function SourceShelf({
  courseId,
  courseName,
  studyUnit,
  topic,
  materials,
  selectedMaterialIds,
  selectedMaterialCount,
  selectedPaths,
  vaultFolder,
  courseOptions = [],
  workspaceObjectIds = [],
  onSelectedMaterialIdsChange,
  onSelectedPathsChange,
  onUploadFiles,
  isUploading = false,
  onAddToWorkspace,
  onOpenInDocumentDock,
}: SourceShelfProps) {
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  // Resolve the configured Root Folder (TUTOR_MATERIALS_DIR /
  // PT_SCHOOL_MATERIALS_DIR / brain/.env) so the user can SEE exactly
  // which folder a sync will read, and so we pass it explicitly rather
  // than relying on a silent server-side env fallback.
  const { data: rootFolderPreview, error: rootFolderError } = useQuery({
    queryKey: ["studio-root-folder-preview"],
    queryFn: () => api.tutor.previewSyncMaterialsFolder({}),
    staleTime: 5 * 60_000,
    retry: false,
  });
  const resolvedRootFolder = rootFolderPreview?.folder ?? null;
  const rootFolderFileCount = rootFolderPreview?.counts?.files ?? null;
  const rootFolderErrorMessage =
    rootFolderError instanceof Error ? rootFolderError.message : null;
  const [activeFilter, setActiveFilter] = useState<SourceShelfFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [listedVaultPaths, setListedVaultPaths] = useState<string[]>([]);
  const [vaultListingLoading, setVaultListingLoading] = useState(false);
  const normalizedVaultFolder = normalizeText(vaultFolder);

  useEffect(() => {
    let cancelled = false;

    if (!normalizedVaultFolder) {
      setListedVaultPaths([]);
      setVaultListingLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setVaultListingLoading(true);
    setListedVaultPaths([]);

    void listVaultFiles(normalizedVaultFolder)
      .then((paths) => {
        if (cancelled) {
          return;
        }
        setListedVaultPaths(paths);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setListedVaultPaths([]);
      })
      .finally(() => {
        if (cancelled) {
          return;
        }
        setVaultListingLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [normalizedVaultFolder]);

  const knownVaultPaths = useMemo(
    () => uniqueVaultPaths([...selectedPaths, ...listedVaultPaths]),
    [listedVaultPaths, selectedPaths],
  );

  const fullTree = useMemo(
    () =>
      buildSourceTree({
        materials,
        selectedMaterialIds,
        knownVaultPaths,
        selectedPaths,
        courseOptions,
        courseId,
        courseName,
      }),
    [
      courseId,
      courseName,
      courseOptions,
      knownVaultPaths,
      materials,
      selectedMaterialIds,
      selectedPaths,
    ],
  );
  // Source Shelf opens with every folder collapsed (user preference). The
  // re-add effect below then becomes a no-op, so manual expand/collapse
  // persists across tree rebuilds instead of being forced back open.
  const defaultExpandedIds = useMemo<string[]>(() => [], []);
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(
    () => new Set(defaultExpandedIds),
  );

  useEffect(() => {
    setExpandedNodeIds((current) => {
      const next = new Set(current);
      defaultExpandedIds.forEach((nodeId) => next.add(nodeId));
      return next;
    });
  }, [defaultExpandedIds]);

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const visibleTree = useMemo(
    () =>
      fullTree
        .map((node) => filterTreeNode(node, activeFilter, normalizedSearch))
        .filter((node): node is SourceTreeNode => node !== null),
    [activeFilter, fullTree, normalizedSearch],
  );

  const runMaterialCount = selectedMaterialIds.length || selectedMaterialCount;
  const runVaultCount = uniqueVaultPaths(selectedPaths).length;

  const toggleExpandedNode = (nodeId: string) => {
    if (normalizedSearch) {
      return;
    }
    setExpandedNodeIds((current) => {
      const next = new Set(current);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const toggleLeafNode = (leaf: SourceLeafNode) => {
    if (leaf.sourceType === "material") {
      const materialId =
        typeof leaf.workspaceObject.id === "string"
          ? Number.parseInt(leaf.workspaceObject.id.replace(/^material:/, ""), 10)
          : NaN;
      if (!Number.isFinite(materialId)) return;

      const nextIds = leaf.checked
        ? selectedMaterialIds.filter((id) => id !== materialId)
        : uniqueNumbers([...selectedMaterialIds, materialId]);
      onSelectedMaterialIdsChange?.(nextIds);
      return;
    }

    const path = leaf.workspaceObject.title;
    const normalizedPathKey = normalizeVaultSelectionKey(path);
    const nextPaths = leaf.checked
      ? selectedPaths.filter(
          (entry) => normalizeVaultSelectionKey(entry) !== normalizedPathKey,
        )
      : uniqueVaultPaths([...selectedPaths, path]);
    onSelectedPathsChange?.(nextPaths);
  };

  const toggleFolderNode = (folder: SourceFolderNode) => {
    const leafNodes = collectLeafNodes(folder);
    const materialIds = leafNodes
      .filter((leaf) => leaf.sourceType === "material")
      .map((leaf) =>
        Number.parseInt(leaf.workspaceObject.id.replace(/^material:/, ""), 10),
      )
      .filter((value) => Number.isFinite(value));
    const vaultPaths = leafNodes
      .filter((leaf) => leaf.sourceType === "vault")
      .map((leaf) => leaf.workspaceObject.title);
    const allChecked = leafNodes.length > 0 && leafNodes.every((leaf) => leaf.checked);

    if (materialIds.length > 0) {
      onSelectedMaterialIdsChange?.(
        allChecked
          ? selectedMaterialIds.filter((id) => !materialIds.includes(id))
          : uniqueNumbers([...selectedMaterialIds, ...materialIds]),
      );
    }

    if (vaultPaths.length > 0) {
      const normalizedVaultPathSet = new Set(
        vaultPaths.map((path) => normalizeVaultSelectionKey(path)),
      );
      onSelectedPathsChange?.(
        allChecked
          ? selectedPaths.filter(
              (entry) =>
                !normalizedVaultPathSet.has(normalizeVaultSelectionKey(entry)),
            )
          : uniqueVaultPaths([...selectedPaths, ...vaultPaths]),
      );
    }
  };

  const invalidateMaterialQueries = () =>
    Promise.all(
      [
        "tutor-materials",
        "tutor-chat-materials-all-enabled",
        "tutor-content-sources",
        "tutor-embed-status",
      ].map((key) => queryClient.invalidateQueries({ queryKey: [key] })),
    );

  // Reconcile the WHOLE configured Root Folder into Library in place — no
  // re-upload. course_id is intentionally NOT pinned to the open course:
  // the root spans many classes, so the backend must auto-link each file
  // to its own course by folder name (it only does so when course_id is
  // null — passing a course force-assigns every file to that one class,
  // which is the disconnect that collapsed everything into one course).
  const handleSyncRootFolder = async () => {
    if (syncing) return;
    setSyncing(true);
    const pending = toast.loading("Syncing Root Folder…");
    try {
      const start = await api.tutor.startSyncMaterialsFolder({
        // Explicit folder beats the server env fallback so the sync
        // provably targets the folder shown in the UI.
        folder_path: resolvedRootFolder || undefined,
        // null => backend auto-links each file to its class by folder.
        course_id: null,
      });
      // Long job (extract + embed across the whole root). Refresh the
      // tree periodically so classes appear as they stream in, not only
      // at the very end.
      let tick = 0;
      const status = start.job_id
        ? await waitForSourceSyncJob(start.job_id, () => {
            tick += 1;
            if (tick % 5 === 0) void invalidateMaterialQueries();
          })
        : null;
      if (status?.status === "failed") {
        throw new Error(status.last_error || "Root Folder sync failed.");
      }
      await invalidateMaterialQueries();
      const processed = Number(status?.sync_result?.processed || 0);
      if (status && status.status !== "completed") {
        toast.message(
          `Root Folder sync still running (${processed} file${
            processed === 1 ? "" : "s"
          } so far). Classes will keep filling in.`,
          { id: pending },
        );
      } else {
        toast.success(
          processed > 0
            ? `Synced ${processed} file${
                processed === 1 ? "" : "s"
              } from the Root Folder across their classes.`
            : "Root Folder is already in sync.",
          { id: pending },
        );
      }
    } catch (err) {
      toast.error(
        `Root Folder sync failed: ${
          err instanceof Error ? err.message : "Unknown error"
        }`,
        { id: pending },
      );
    } finally {
      setSyncing(false);
    }
  };

  const handleUploadChange = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }

    try {
      await onUploadFiles?.(Array.from(event.target.files));
    } finally {
      event.target.value = "";
    }
  };

  return (
    <div
      data-testid="source-shelf-content"
      className="flex h-full min-h-0 flex-col gap-4 text-[13px] text-zinc-300"
    >
      <div className="space-y-3 rounded-lg border border-white/[0.06] bg-zinc-950/40 p-3">
        <div className="flex flex-wrap gap-2">
          {SOURCE_FILTERS.map(([filterId, label]) => {
            const isActive = activeFilter === filterId;
            return (
              <Button
                key={filterId}
                type="button"
                variant="outline"
                onClick={() => setActiveFilter(filterId)}
                aria-pressed={isActive}
                className={
                  isActive
                    ? "h-8 rounded-full border-white/15 bg-black/20 px-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-200"
                    : "h-8 rounded-full border-white/10 bg-transparent px-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400"
                }
              >
                {label}
              </Button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2">
          <label className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search sources..."
              className="h-10 w-full rounded-full border border-white/10 bg-black/20 pl-10 pr-4 text-[13px] text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-white/15"
            />
          </label>

          <Button
            type="button"
            variant="outline"
            onClick={handleSyncRootFolder}
            disabled={syncing || !resolvedRootFolder}
            title={
              resolvedRootFolder
                ? `Re-index ${resolvedRootFolder} into Library by its folder structure — no re-upload needed.`
                : "Root Folder not resolved — set TUTOR_MATERIALS_DIR / PT_SCHOOL_MATERIALS_DIR (brain/.env)."
            }
            className="h-10 rounded-full border-white/10 bg-black/20 px-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-200/82 hover:bg-black/30 hover:text-white"
          >
            {syncing ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : (
              <FolderSync className="mr-2 h-3.5 w-3.5" />
            )}
            {syncing ? "Syncing..." : "Sync Root Folder"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => uploadInputRef.current?.click()}
            disabled={isUploading}
            className="h-10 rounded-full border-white/10 bg-black/20 px-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-200/82 hover:bg-black/30 hover:text-white"
          >
            <Upload className="mr-2 h-3.5 w-3.5" />
            {isUploading ? "Uploading..." : "Upload to Current Run"}
          </Button>
          <input
            ref={uploadInputRef}
            data-testid="source-shelf-upload-input"
            type="file"
            accept=".pdf,.md,.docx,.pptx,.txt,.mp4"
            multiple
            className="hidden"
            onChange={handleUploadChange}
          />
        </div>

        <div
          data-testid="source-shelf-root-folder"
          className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500"
        >
          <span className="text-zinc-400">Root Folder</span>
          {resolvedRootFolder ? (
            <>
              <span
                title={resolvedRootFolder}
                className="max-w-full truncate font-mono normal-case tracking-normal text-zinc-300"
              >
                {resolvedRootFolder}
              </span>
              {typeof rootFolderFileCount === "number" ? (
                <span className="text-zinc-500">
                  · {rootFolderFileCount} file
                  {rootFolderFileCount === 1 ? "" : "s"}
                </span>
              ) : null}
            </>
          ) : (
            <span
              title={rootFolderErrorMessage ?? undefined}
              className="font-mono normal-case tracking-normal text-amber-300/80"
            >
              {rootFolderErrorMessage
                ? `Not resolved — ${rootFolderErrorMessage}`
                : "Resolving…"}
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-white/[0.06] bg-zinc-950/40 p-3">
          <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-400">
            Course
          </div>
          <div className="mt-1 text-sm text-white">
            {courseName || "No course selected"}
          </div>
          <div className="mt-3 text-[10px] uppercase tracking-[0.18em] text-zinc-400">
            Study Unit
          </div>
          <div className="mt-1 text-sm text-white">
            {studyUnit || "No study unit selected"}
          </div>
          <div className="mt-3 text-[10px] uppercase tracking-[0.18em] text-zinc-400">
            Topic
          </div>
          <div className="mt-1 text-sm text-white">
            {topic || "Broad module scope"}
          </div>
        </div>

        <div className="rounded-lg border border-white/[0.06] bg-zinc-950/40 p-3">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-zinc-400">
            <BookOpen className="h-3.5 w-3.5" />
            Current Run
          </div>
          <div className="mt-2 text-sm text-foreground/90">
            {runMaterialCount} material{runMaterialCount === 1 ? "" : "s"} loaded
          </div>
          <div className="sr-only">{runMaterialCount} materials in run</div>
          <div className="mt-1 text-sm text-foreground/90">
            {runVaultCount} vault link{runVaultCount === 1 ? "" : "s"} loaded
          </div>
          <div className="mt-3 break-all text-xs text-zinc-400">
            {normalizedVaultFolder || "Vault path not derived yet"}
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-white/[0.06] bg-black/10 p-3">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-400">
            Unified Source Tree
          </div>
          <div className="text-xs text-zinc-400">
            {activeFilter === "current_run"
              ? "Showing loaded sources"
              : activeFilter === "library"
                ? "Showing library materials"
                : activeFilter === "vault"
                  ? "Showing vault links"
                  : "Showing all source surfaces"}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {visibleTree.length > 0 ? (
            <div className="space-y-3">
              {visibleTree.map((node) => (
                <SourceShelfTreeNode
                  key={node.id}
                  node={node}
                  depth={0}
                  expandedNodeIds={expandedNodeIds}
                  onToggleExpanded={toggleExpandedNode}
                  onToggleLeaf={toggleLeafNode}
                  onToggleFolder={toggleFolderNode}
                  workspaceObjectIds={workspaceObjectIds}
                  onAddToWorkspace={onAddToWorkspace}
                  onOpenInDocumentDock={onOpenInDocumentDock}
                  searchActive={Boolean(normalizedSearch)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-[var(--ds-r-095)] border border-dashed border-primary/16 bg-black/15 px-4 py-6 text-sm text-foreground/56">
              {vaultListingLoading && activeFilter === "vault"
                ? "Loading vault notes..."
                : "No sources match the current filter."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
