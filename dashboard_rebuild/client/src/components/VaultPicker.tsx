import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { COURSE_FOLDERS } from "@/config/courses";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Folder,
  File,
  ChevronRight,
  ChevronDown,
  Search,
  FolderOpen,
  X,
} from "lucide-react";
import {
  TEXT_SECTION_LABEL,
  TEXT_MUTED,
  TEXT_BADGE,
  ICON_SM,
} from "@/lib/theme";

const LS_KEY = "tutor.vault_selected.v1";
const TREE_INDENT = 24;

interface VaultPickerProps {
  selectedPaths: string[];
  onSelectedPathsChange: (paths: string[]) => void;
}

function togglePath(paths: string[], path: string): string[] {
  return paths.includes(path)
    ? paths.filter((p) => p !== path)
    : [...paths, path];
}

// --- Recursive tree item ---

function TreeItem({
  name,
  fullPath,
  isFolder,
  depth,
  selected,
  onToggle,
  expandedFolders,
  toggleFolder,
  connected,
  searchFilter,
}: {
  name: string;
  fullPath: string;
  isFolder: boolean;
  depth: number;
  selected: boolean;
  onToggle: (path: string) => void;
  expandedFolders: Set<string>;
  toggleFolder: (path: string) => void;
  connected: boolean;
  searchFilter: string;
}) {
  const isExpanded = expandedFolders.has(fullPath);

  return (
    <div>
      <div
        className="flex items-center gap-1.5 py-1 hover:bg-primary/10 transition-colors cursor-pointer min-h-[28px]"
        style={{ paddingLeft: `${8 + depth * TREE_INDENT}px` }}
      >
        <Checkbox
          checked={selected}
          onCheckedChange={() => onToggle(fullPath)}
          className="w-3.5 h-3.5 shrink-0"
        />
        {isFolder ? (
          <button
            type="button"
            onClick={() => toggleFolder(fullPath)}
            className="flex items-center gap-1 min-w-0 flex-1"
          >
            {isExpanded ? (
              <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
            ) : (
              <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
            )}
            <Folder className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
            <span className="font-terminal text-sm truncate">{name}</span>
          </button>
        ) : (
          <span className="flex items-center gap-1 min-w-0 flex-1">
            <span className="w-3 shrink-0" />
            <File className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="font-terminal text-sm truncate">{name}</span>
          </span>
        )}
      </div>

      {isFolder && isExpanded && (
        <FolderChildren
          folderPath={fullPath}
          depth={depth + 1}
          selectedPaths={[]}
          onToggle={onToggle}
          expandedFolders={expandedFolders}
          toggleFolder={toggleFolder}
          connected={connected}
          searchFilter={searchFilter}
          isSelected={(p) => selected || false}
        />
      )}
    </div>
  );
}

// --- Recursive folder children ---

function FolderChildren({
  folderPath,
  depth,
  selectedPaths: _sp,
  onToggle,
  expandedFolders,
  toggleFolder,
  connected,
  searchFilter,
  isSelected,
}: {
  folderPath: string;
  depth: number;
  selectedPaths: string[];
  onToggle: (path: string) => void;
  expandedFolders: Set<string>;
  toggleFolder: (path: string) => void;
  connected: boolean;
  searchFilter: string;
  isSelected: (path: string) => boolean;
}) {
  const { data } = useQuery({
    queryKey: ["obsidian", "files", folderPath],
    queryFn: () => api.obsidian.getFiles(folderPath),
    enabled: connected,
  });

  const files = data?.files || [];
  const q = searchFilter.toLowerCase();

  return (
    <>
      {files.map((file: string | { path: string }) => {
        const filePath = typeof file === "string" ? file : file.path;
        const isFolder = filePath.endsWith("/");
        const name = filePath.replace(/\/$/, "").split("/").pop() || filePath;
        const fullPath = `${folderPath}/${name}`;

        if (q && !name.toLowerCase().includes(q)) return null;

        return (
          <TreeItem
            key={filePath}
            name={name}
            fullPath={fullPath}
            isFolder={isFolder}
            depth={depth}
            selected={isSelected(fullPath)}
            onToggle={onToggle}
            expandedFolders={expandedFolders}
            toggleFolder={toggleFolder}
            connected={connected}
            searchFilter={searchFilter}
          />
        );
      })}
    </>
  );
}

// --- Main component ---

export function VaultPicker({ selectedPaths, onSelectedPathsChange }: VaultPickerProps) {
  const [search, setSearch] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const { data: statusData } = useQuery({
    queryKey: ["obsidian", "status"],
    queryFn: () => api.obsidian.getStatus(),
    refetchInterval: 30_000,
  });

  const connected = statusData?.connected === true;

  const { data: rootFiles } = useQuery({
    queryKey: ["obsidian", "files", "School"],
    queryFn: () => api.obsidian.getFiles("School"),
    enabled: connected,
  });

  const toggleFolder = useCallback((path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const handleToggle = useCallback(
    (path: string) => {
      onSelectedPathsChange(togglePath(selectedPaths, path));
    },
    [selectedPaths, onSelectedPathsChange],
  );

  const isSelected = useCallback(
    (path: string) => selectedPaths.includes(path),
    [selectedPaths],
  );

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(selectedPaths));
    } catch { /* ignore */ }
  }, [selectedPaths]);

  const folderCount = selectedPaths.filter((p) =>
    rootFiles?.files?.some((f: string | { path: string }) => {
      const fp = typeof f === "string" ? f : f.path;
      return fp.endsWith("/") && `School/${fp.replace(/\/$/, "").split("/").pop()}` === p;
    }) || p.endsWith("/")
  ).length;

  const summary = useMemo(() => {
    const folders = selectedPaths.filter((p) => {
      // A path is a "folder" if it matches a course folder or was a folder in the tree
      return COURSE_FOLDERS.some((c) => c.path === p) ||
        (!p.includes(".") && !p.endsWith(".md"));
    });
    const files = selectedPaths.length - folders.length;
    const parts: string[] = [];
    if (folders.length) parts.push(`${folders.length} folder${folders.length > 1 ? "s" : ""}`);
    if (files) parts.push(`${files} file${files > 1 ? "s" : ""}`);
    return parts.join(", ") || "Nothing selected";
  }, [selectedPaths]);

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <FolderOpen className="w-8 h-8 text-primary/80 mb-3" />
        <p className="font-arcade text-sm text-primary/90 text-center">
          Obsidian offline
        </p>
        <p className="font-terminal text-sm text-muted-foreground text-center mt-2">
          Open Obsidian with Local REST API enabled
        </p>
      </div>
    );
  }

  const files = rootFiles?.files || [];
  const q = search.toLowerCase();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Course chips + search — single compact row */}
      <div className="shrink-0 px-3 py-2 flex items-center gap-2 border-b border-primary/10">
        {COURSE_FOLDERS.map((course) => {
          const active = selectedPaths.includes(course.path);
          return (
            <button
              key={course.id}
              type="button"
              onClick={() => handleToggle(course.path)}
              className={`px-2.5 py-1 font-arcade text-xs tracking-wider border-2 shrink-0 transition-colors ${
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-primary/40 bg-black/50 text-primary/80 hover:bg-primary/20 hover:border-primary/60"
              }`}
            >
              {course.name}
            </button>
          );
        })}
        <div className="relative flex-1 min-w-[120px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter..."
            className="h-7 pl-8 pr-3 text-sm font-terminal rounded-none border border-primary/20 bg-black/40 placeholder:text-muted-foreground/80 focus-visible:ring-1 focus-visible:ring-primary/60"
          />
        </div>
      </div>

      {/* File tree */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="px-1 py-1">
          {files.map((file: string | { path: string }) => {
            const filePath = typeof file === "string" ? file : file.path;
            const isFolder = filePath.endsWith("/");
            const name = filePath.replace(/\/$/, "").split("/").pop() || filePath;
            const fullPath = `School/${name}`;

            if (q && !name.toLowerCase().includes(q)) return null;

            return (
              <TreeItem
                key={filePath}
                name={name}
                fullPath={fullPath}
                isFolder={isFolder}
                depth={0}
                selected={isSelected(fullPath)}
                onToggle={handleToggle}
                expandedFolders={expandedFolders}
                toggleFolder={toggleFolder}
                connected={connected}
                searchFilter={search}
              />
            );
          })}
        </div>
      </ScrollArea>

      {/* Selection summary footer */}
      <div className="shrink-0 px-3 py-2 border-t border-primary/20 flex items-center justify-between">
        <span className={`${TEXT_MUTED} text-xs`}>{summary}</span>
        {selectedPaths.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSelectedPathsChange([])}
            className="h-6 px-2 rounded-none font-terminal text-xs text-muted-foreground hover:text-primary gap-1"
          >
            <X className={ICON_SM} />
            CLEAR
          </Button>
        )}
      </div>
    </div>
  );
}
