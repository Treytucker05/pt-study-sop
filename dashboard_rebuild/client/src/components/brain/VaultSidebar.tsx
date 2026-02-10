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
      className={`w-full flex items-center gap-1.5 py-1.5 font-terminal text-sm text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${
        isActive
          ? "bg-primary/20 text-primary border-l-2 border-primary"
          : "border-l-2 border-transparent hover:bg-primary/10 text-foreground"
      }`}
      style={{ paddingLeft: `${depth * 14 + 10}px` }}
    >
      {isFolder ? (
        <>
          {isExpanded ? (
            <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" aria-hidden="true" />
          ) : (
            <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" aria-hidden="true" />
          )}
          <Folder className="w-3.5 h-3.5 text-yellow-500 shrink-0" aria-hidden="true" />
        </>
      ) : (
        <>
          <span className="w-3 shrink-0" />
          <File className="w-3.5 h-3.5 text-blue-400 shrink-0" aria-hidden="true" />
        </>
      )}
      <span className="truncate">{name}</span>
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
      <div className="flex flex-col h-full min-h-0 p-4">
        <div className="font-arcade text-xs text-primary tracking-widest border-b-2 border-primary/50 pb-2 mb-3">
          VAULT
        </div>
        <div className="flex-1 flex flex-col items-center justify-center border-2 border-primary/50 bg-black/40 p-6 rounded-sm">
          <FolderOpen className="w-8 h-8 text-primary mb-3" aria-hidden="true" />
          <p className="font-arcade text-sm text-primary text-center">
            OBSIDIAN OFFLINE
          </p>
          <p className="font-terminal text-xs text-muted-foreground text-center mt-2">
            Open Obsidian with Local REST API enabled
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b-2 border-primary/50 pb-2 px-2 pt-1">
        <h2 className="font-arcade text-xs text-primary tracking-widest">
          VAULT
        </h2>
      </div>

      {/* Search + New Note */}
      <div className="p-2 space-y-2 border-b-2 border-primary/30 bg-black/30 shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" aria-hidden="true" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search files..."
            className="h-8 pl-8 pr-2 text-sm font-terminal rounded-none border-2 border-primary/40 bg-black/50 focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Search files"
          />
        </div>
        <Button
          size="sm"
          variant="outline"
          className="w-full h-8 text-xs font-terminal rounded-none border-2 border-primary/50 hover:bg-primary/10 hover:border-primary hover:text-primary"
          onClick={createNewNote}
        >
          <FileText className="w-3 h-3 mr-1.5" aria-hidden="true" />
          New Note
        </Button>
      </div>

      {/* Course quick-nav */}
      <div className="flex flex-col gap-1.5 p-2 border-b-2 border-primary/30 shrink-0">
        <h3 className="font-arcade text-xs text-primary tracking-widest px-1">
          COURSES
        </h3>
        <div className="flex flex-wrap gap-1">
          {COURSE_FOLDERS.map((course) => {
            const isActive = currentFolder === course.path;
            return (
              <button
                key={course.path}
                type="button"
                onClick={() => navigateToFolder(course.path)}
                className={`px-2.5 py-1.5 font-terminal text-xs rounded-none border-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-black ${
                  isActive
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-primary/40 bg-black/40 text-muted-foreground hover:border-primary/70 hover:text-foreground"
                }`}
                aria-pressed={isActive}
              >
                {course.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Breadcrumb */}
      {currentFolder && (
        <div className="flex items-center gap-1 px-2 py-1.5 font-terminal text-xs border-b-2 border-primary/30 bg-black/20 shrink-0 min-h-[2rem]">
          {hasParent && (
            <button
              type="button"
              onClick={navigateToParent}
              className="p-0.5 rounded-sm hover:bg-primary/20 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0"
              title="Go to parent folder"
              aria-label="Go to parent folder"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}
          <nav aria-label="Folder breadcrumb" className="flex items-center gap-0.5 flex-wrap text-muted-foreground">
            {breadcrumbSegments.map((part, i, arr) => (
              <span key={i} className="flex items-center gap-0.5">
                {i > 0 && <span aria-hidden="true">/</span>}
                <button
                  type="button"
                  onClick={() =>
                    navigateToFolder(arr.slice(0, i + 1).join("/"))
                  }
                  className="hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset rounded-sm px-0.5"
                >
                  {part}
                </button>
              </span>
            ))}
          </nav>
        </div>
      )}

      {/* File list */}
      <div className="flex-1 min-h-0 flex flex-col border-t border-primary/20">
        <div className="shrink-0 px-2 py-1 border-b border-primary/20 bg-black/20">
          <span className="font-arcade text-xs text-primary/80 tracking-wider">
            FILES
          </span>
        </div>
        <ErrorBoundary
          key={`filetree-${errorKey}`}
          fallback={<SidebarErrorFallback onReset={() => setErrorKey((k) => k + 1)} />}
        >
          <ScrollArea className="flex-1 min-h-0">
            <div className="py-1">
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
