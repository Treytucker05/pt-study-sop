import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Folder, File, ChevronRight, ChevronDown, FileText,
  FolderOpen, Search, ArrowLeft,
} from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ErrorBoundary, SidebarErrorFallback } from "@/components/ErrorBoundary";
import { COURSE_FOLDERS } from "@/config/courses";
import type { BrainWorkspace } from "./useBrainWorkspace";

// --- Sub-components for recursive tree rendering ---

/**
 * Sidebar spacing (Vercel-style 8px grid):
 * - Section padding: px-3 (12px) py-3 (12px)
 * - In-section gap: gap-2 (8px)
 * - Control height: h-9 (36px) or min-h-[36px] for tap targets
 * - Section titles: font-arcade text-xs uppercase
 * - Body/chips: font-terminal text-sm
 */
const SIDEBAR_PX = 12;
const TREE_INDENT = 16;

function FileItem({ name, isFolder, isExpanded, isActive, depth, onClick }: {
  name: string;
  isFolder: boolean;
  isExpanded?: boolean;
  isActive: boolean;
  depth: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2 py-2 font-terminal text-sm text-left transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:ring-inset min-h-[36px] ${
        isActive
          ? "bg-primary/15 text-primary border-l-2 border-primary/60"
          : "border-l-2 border-transparent hover:bg-primary/10 text-foreground"
      }`}
      style={{ paddingLeft: `${SIDEBAR_PX + depth * TREE_INDENT}px` }}
    >
      {isFolder ? (
        <>
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
          )}
          <Folder className="w-4 h-4 text-yellow-500 shrink-0" aria-hidden="true" />
        </>
      ) : (
        <>
          <span className="w-3.5 shrink-0" />
          <File className="w-4 h-4 text-blue-400 shrink-0" aria-hidden="true" />
        </>
      )}
      <span className="truncate min-w-0">{name}</span>
    </button>
  );
}

function FolderChildren({
  folderPath,
  depth,
  expandedFolders,
  toggleFolder,
  workspace,
  connected,
}: {
  folderPath: string;
  depth: number;
  expandedFolders: Set<string>;
  toggleFolder: (path: string) => void;
  workspace: BrainWorkspace;
  connected: boolean;
}) {
  const { data } = useQuery({
    queryKey: ["obsidian", "files", folderPath],
    queryFn: () => api.obsidian.getFiles(folderPath),
    enabled: connected,
  });

  const files = data?.files || [];

  return (
    <>
      {files.map((file: string | { path: string }) => {
        const filePath = typeof file === "string" ? file : file.path;
        const isFolder = filePath.endsWith("/");
        const name = filePath.replace(/\/$/, "").split("/").pop() || filePath;
        const fullPath = `${folderPath}/${name}`;
        const isExpanded = expandedFolders.has(fullPath);

        return (
          <div key={filePath}>
            <FileItem
              name={name}
              isFolder={isFolder}
              isExpanded={isExpanded}
              isActive={workspace.currentFile?.endsWith(name) || false}
              depth={depth}
              onClick={() => {
                if (isFolder) {
                  toggleFolder(fullPath);
                } else {
                  workspace.openFile(fullPath);
                }
              }}
            />
            {isFolder && isExpanded && (
              <FolderChildren
                folderPath={fullPath}
                depth={depth + 1}
                expandedFolders={expandedFolders}
                toggleFolder={toggleFolder}
                workspace={workspace}
                connected={connected}
              />
            )}
          </div>
        );
      })}
    </>
  );
}

// --- Main component ---

interface VaultSidebarProps {
  workspace: BrainWorkspace;
}

export function VaultSidebar({ workspace }: VaultSidebarProps) {
  const [currentFolder, setCurrentFolder] = useState("School");
  const [search, setSearch] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set()
  );
  const [errorKey, setErrorKey] = useState(0);

  const connected = workspace.obsidianStatus?.connected === true;

  const { data: obsidianFiles } = useQuery({
    queryKey: ["obsidian", "files", currentFolder],
    queryFn: () => api.obsidian.getFiles(currentFolder),
    enabled: connected,
  });

  const navigateToFolder = useCallback((folder: string) => {
    setCurrentFolder(folder);
    setExpandedFolders(new Set());
  }, []);

  const navigateToParent = useCallback(() => {
    const parts = currentFolder.split("/");
    parts.pop();
    navigateToFolder(parts.join("/"));
  }, [currentFolder, navigateToFolder]);

  const toggleFolder = useCallback((path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const createNewNote = useCallback(() => {
    const today = new Date().toISOString().split("T")[0];
    const newPath = currentFolder
      ? `${currentFolder}/Session-${today}.md`
      : `Session-${today}.md`;
    const template = `# Study Session - ${today}\n\n## Summary\n\n\n## Concepts Covered\n- \n\n## Notes\n\n`;
    workspace.setCurrentFile(newPath);
    workspace.setFileContent(template);
    workspace.setHasChanges(true);
  }, [currentFolder, workspace]);

  const filteredFiles = useMemo(() => {
    const files = obsidianFiles?.files || [];
    if (!search.trim()) return files;
    const q = search.toLowerCase();
    return files.filter((file: string | { path: string }) => {
      const filePath = typeof file === "string" ? file : file.path;
      return filePath.toLowerCase().includes(q);
    });
  }, [obsidianFiles, search]);

  const hasParent = currentFolder.includes("/");

  const breadcrumbSegments = useMemo(() => {
    if (!currentFolder) return [];
    return currentFolder.split("/");
  }, [currentFolder]);

  if (!connected) {
    return (
      <div className="flex flex-col h-full min-h-0">
        <div className="section-block border-primary/30">
          <h2 className="section-header">Vault</h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-3 py-6 border border-primary/30 bg-black/30 m-3">
          <FolderOpen className="w-8 h-8 text-primary/80 mb-3" aria-hidden="true" />
          <p className="font-arcade text-sm text-primary/90 text-center">
            Obsidian offline
          </p>
          <p className="font-terminal text-sm text-muted-foreground text-center mt-2">
            Open Obsidian with Local REST API enabled
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {/* Header — global section-block + section-header */}
      <div className="section-block border-primary/30">
        <h2 className="section-header">Vault</h2>
      </div>

      {/* Search + New Note — subtle borders, no “warning” look */}
      <div className="section-block section-block-gap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" aria-hidden="true" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search files…"
            className="h-9 pl-9 pr-3 text-sm font-terminal rounded-none border border-primary/20 bg-black/40 placeholder:text-muted-foreground/80 focus-visible:ring-1 focus-visible:ring-primary/60 focus-visible:border-primary/40"
            aria-label="Search files"
          />
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="w-full h-9 text-sm font-terminal rounded-none border border-primary/20 bg-black/30 text-foreground hover:bg-primary/10 hover:border-primary/40 hover:text-primary justify-start gap-2"
          onClick={createNewNote}
        >
          <FileText className="w-4 h-4 shrink-0" aria-hidden="true" />
          New Note
        </Button>
      </div>

      {/* Courses — section-block + gap */}
      <div className="section-block section-block-gap">
        <h3 className="section-header">Courses</h3>
        <div className="flex flex-wrap gap-2">
          {COURSE_FOLDERS.map((course) => {
            const isActive = currentFolder === course.path;
            return (
              <button
                key={course.path}
                type="button"
                onClick={() => navigateToFolder(course.path)}
                className={`min-h-[36px] px-3 py-2 font-terminal text-sm rounded-none border transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black ${
                  isActive
                    ? "bg-primary/20 text-primary border-primary/50"
                    : "border-primary/20 bg-black/30 text-muted-foreground hover:bg-black/50 hover:border-primary/40 hover:text-foreground"
                }`}
                aria-pressed={isActive}
              >
                {course.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Breadcrumb — same horizontal padding as sections */}
      {currentFolder && (
        <div className="flex items-center gap-2 px-3 py-2 font-terminal text-sm border-b border-primary/20 shrink-0 min-h-[40px]">
          {hasParent && (
            <button
              type="button"
              onClick={navigateToParent}
              className="size-8 flex items-center justify-center rounded-sm hover:bg-primary/20 hover:text-primary focus:outline-none focus-visible:ring-1 focus-visible:ring-primary shrink-0"
              title="Go to parent folder"
              aria-label="Go to parent folder"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
          <nav aria-label="Folder breadcrumb" className="flex items-center gap-1 flex-wrap text-muted-foreground min-w-0">
            {breadcrumbSegments.map((part, i, arr) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <span aria-hidden="true">/</span>}
                <button
                  type="button"
                  onClick={() =>
                    navigateToFolder(arr.slice(0, i + 1).join("/"))
                  }
                  className="hover:text-primary focus:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-inset rounded-sm px-1 py-0.5 min-h-[28px] flex items-center"
                >
                  {part}
                </button>
              </span>
            ))}
          </nav>
        </div>
      )}

      {/* File list — section-header for label */}
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="shrink-0 px-3 py-2 border-b border-primary/20">
          <span className="section-header text-primary/90">Files</span>
        </div>
        <ErrorBoundary
          key={`filetree-${errorKey}`}
          fallback={<SidebarErrorFallback onReset={() => setErrorKey((k) => k + 1)} />}
        >
          <ScrollArea className="flex-1 min-h-0">
            <div className="py-2">
            {filteredFiles.map((file: string | { path: string }) => {
              const filePath = typeof file === "string" ? file : file.path;
              const isFolder = filePath.endsWith("/");
              const name =
                filePath.replace(/\/$/, "").split("/").pop() || filePath;
              const fullPath = currentFolder
                ? `${currentFolder}/${name}`
                : name;
              const isExpanded = expandedFolders.has(fullPath);
              const isActive =
                workspace.currentFile?.endsWith(name) || false;

              return (
                <div key={filePath}>
                  <FileItem
                    name={name}
                    isFolder={isFolder}
                    isExpanded={isExpanded}
                    isActive={isActive}
                    depth={0}
                    onClick={() => {
                      if (isFolder) {
                        toggleFolder(fullPath);
                      } else {
                        workspace.openFile(fullPath);
                      }
                    }}
                  />
                  {isFolder && isExpanded && (
                    <FolderChildren
                      folderPath={fullPath}
                      depth={1}
                      expandedFolders={expandedFolders}
                      toggleFolder={toggleFolder}
                      workspace={workspace}
                      connected={connected}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </ErrorBoundary>
      </div>
    </div>
  );
}
