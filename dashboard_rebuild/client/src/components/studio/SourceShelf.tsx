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
  FolderTree,
  Plus,
  Search,
  Upload,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import type { Material } from "@/lib/api";
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

    const libraryFolder = ensureFolder(
      courseFolder.children,
      `${courseFolder.id}:library`,
      "Library",
      "source",
    );

    const workspaceObject = createMaterialWorkspaceObject(material);
    libraryFolder.children.push({
      id: workspaceObject.id,
      kind: "leaf",
      sourceType: "material",
      label: workspaceObject.title,
      detail: basenameFromPath(workspaceObject.detail),
      badge: workspaceObject.badge,
      checked: selectedMaterialIdSet.has(material.id),
      workspaceObject,
    });
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

    return (
      <div
        className="rounded-md border border-primary/12 bg-black/15 px-2 py-1.5"
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
                className="shrink-0 rounded-full border-primary/20 px-1.5 py-0 text-[9px] uppercase tracking-[0.16em] text-primary"
              >
                {node.badge}
              </Badge>
              {node.sourceType === "vault" ? (
                <Badge
                  variant="outline"
                  className="shrink-0 rounded-full border-primary/12 px-1.5 py-0 text-[9px] uppercase tracking-[0.16em] text-foreground/75"
                >
                  Vault
                </Badge>
              ) : null}
            </div>
            <div
              className="truncate text-[11px] text-foreground/60"
              title={node.workspaceObject.detail}
            >
              {node.detail}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenInDocumentDock?.(node.workspaceObject)}
              aria-label={`Open ${node.label} in Document Dock`}
              title="Open in Document Dock"
              className="h-6 w-6 rounded-full border-primary/18 bg-black/20 p-0 text-white/82 hover:bg-black/30 hover:text-white"
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
                className="h-6 w-6 rounded-full border-primary/18 bg-black/20 p-0 text-white/82 hover:bg-black/30 hover:text-white disabled:cursor-default disabled:opacity-100 disabled:text-foreground/82"
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
      <div className="flex items-center gap-2 border-l border-primary/20 py-0.5 pl-2">
        <TreeCheckbox
          checked={allChecked}
          indeterminate={partiallyChecked}
          ariaLabel={`Include all ${node.label} in current run`}
          onChange={() => onToggleFolder(node)}
          className="h-3.5 w-3.5 shrink-0 accent-red-500"
        />
        <button
          type="button"
          onClick={() => onToggleExpanded(node.id)}
          className="flex min-w-0 flex-1 items-center gap-1.5 rounded-sm bg-transparent px-1 py-0.5 text-left transition-colors hover:bg-white/5"
        >
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-primary/78" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-primary/78" />
          )}
          {node.folderType === "course" ? (
            <FolderTree className="h-3.5 w-3.5 shrink-0 text-primary/78" />
          ) : (
            <Folder className="h-3.5 w-3.5 shrink-0 text-primary/78" />
          )}
          <span className="min-w-0 flex-1 truncate text-sm text-white">
            {node.label}
          </span>
          <span className="shrink-0 text-[10px] text-foreground/70">
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
  const defaultExpandedIds = useMemo(
    () => collectDefaultExpandedNodeIds(fullTree),
    [fullTree],
  );
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
      className="flex h-full min-h-0 flex-col gap-4 font-mono text-sm text-foreground/82"
    >
      <div className="space-y-3 rounded-[0.95rem] border border-primary/15 bg-black/15 p-3">
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
                    ? "h-8 rounded-full border-primary/30 bg-black/20 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-white"
                    : "h-8 rounded-full border-primary/20 bg-transparent px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-foreground/82"
                }
              >
                {label}
              </Button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2">
          <label className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/48" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search sources..."
              className="h-10 w-full rounded-full border border-primary/18 bg-black/20 pl-10 pr-4 font-mono text-sm text-foreground outline-none placeholder:text-foreground/40 focus:border-primary/32"
            />
          </label>

          <Button
            type="button"
            variant="outline"
            onClick={() => uploadInputRef.current?.click()}
            disabled={isUploading}
            className="h-10 rounded-full border-primary/20 bg-black/20 px-4 font-mono text-[10px] uppercase tracking-[0.18em] text-white/82 hover:bg-black/30 hover:text-white"
          >
            <Upload className="mr-2 h-3.5 w-3.5" />
            {isUploading ? "Uploading..." : "Upload"}
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
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-[0.95rem] border border-primary/15 bg-black/15 p-3">
          <div className="text-[10px] uppercase tracking-[0.18em] text-primary">
            Course
          </div>
          <div className="mt-1 text-sm text-white">
            {courseName || "No course selected"}
          </div>
          <div className="mt-3 text-[10px] uppercase tracking-[0.18em] text-primary">
            Study Unit
          </div>
          <div className="mt-1 text-sm text-white">
            {studyUnit || "No study unit selected"}
          </div>
          <div className="mt-3 text-[10px] uppercase tracking-[0.18em] text-primary">
            Topic
          </div>
          <div className="mt-1 text-sm text-white">
            {topic || "Broad module scope"}
          </div>
        </div>

        <div className="rounded-[0.95rem] border border-primary/15 bg-black/15 p-3">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-primary">
            <BookOpen className="h-3.5 w-3.5" />
            Current Run
          </div>
          <div className="mt-2 text-sm text-foreground/90">
            {runMaterialCount} material{runMaterialCount === 1 ? "" : "s"} loaded
          </div>
          <div className="mt-1 text-sm text-foreground/90">
            {runVaultCount} vault link{runVaultCount === 1 ? "" : "s"} loaded
          </div>
          <div className="mt-3 break-all text-xs text-foreground/75">
            {normalizedVaultFolder || "Vault path not derived yet"}
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col rounded-[1rem] border border-primary/14 bg-black/10 p-3">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="text-[10px] uppercase tracking-[0.18em] text-primary">
            Unified Source Tree
          </div>
          <div className="text-xs text-foreground/75">
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
            <div className="rounded-[0.95rem] border border-dashed border-primary/16 bg-black/15 px-4 py-6 text-sm text-foreground/56">
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
