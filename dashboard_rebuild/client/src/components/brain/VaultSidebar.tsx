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
      onClick={onClick}
      className={`w-full flex items-center gap-1.5 py-1 hover:bg-secondary/20 font-terminal text-sm ${
        isActive ? "bg-primary/20 text-primary" : ""
      }`}
      style={{ paddingLeft: `${depth * 12 + 8}px` }}
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
      <div className="flex flex-col items-center justify-center h-full p-4">
        <FolderOpen className="w-6 h-6 text-red-500 mb-2" aria-hidden="true" />
        <p className="font-terminal text-sm text-red-400 text-center">
          Obsidian Offline
        </p>
        <p className="font-terminal text-xs text-muted-foreground text-center mt-1">
          Open Obsidian with Local REST API
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search + New Note */}
      <div className="p-2 space-y-1.5 border-b border-primary/30">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search files..."
            className="h-6 pl-7 text-sm font-terminal rounded-none border-secondary/50 bg-black/40"
            aria-label="Search files"
          />
        </div>
        <Button
          size="sm"
          variant="outline"
          className="w-full h-5 text-xs font-terminal rounded-none border-primary/50"
          onClick={createNewNote}
        >
          <FileText className="w-2.5 h-2.5 mr-1" aria-hidden="true" />
          New Note
        </Button>
      </div>

      {/* Course quick-nav */}
      <div className="flex flex-col gap-0.5 p-1.5 border-b border-primary/30">
        {COURSE_FOLDERS.map((course) => (
          <button
            key={course.path}
            onClick={() => navigateToFolder(course.path)}
            className={`text-left px-2 py-1 text-xs font-terminal rounded-none transition-colors ${
              currentFolder === course.path
                ? "bg-primary/20 text-primary border-l-2 border-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/20"
            }`}
            aria-pressed={currentFolder === course.path}
          >
            {course.name}
          </button>
        ))}
      </div>

      {/* Breadcrumb with back arrow */}
      {currentFolder && (
        <div className="flex items-center gap-1 px-2 py-1 font-terminal text-xs text-muted-foreground border-b border-secondary/20 flex-wrap">
          {hasParent && (
            <button
              onClick={navigateToParent}
              className="hover:text-primary shrink-0"
              title="Go to parent folder"
              aria-label="Go to parent folder"
            >
              <ArrowLeft className="w-3 h-3" aria-hidden="true" />
            </button>
          )}
          {breadcrumbSegments.map((part, i, arr) => (
            <span key={i} className="flex items-center gap-0.5">
              {i > 0 && <span className="text-muted-foreground">/</span>}
              <button
                onClick={() =>
                  navigateToFolder(arr.slice(0, i + 1).join("/"))
                }
                className="hover:text-primary"
              >
                {part}
              </button>
            </span>
          ))}
        </div>
      )}

      {/* File tree with error boundary */}
      <ErrorBoundary
        key={`filetree-${errorKey}`}
        fallback={<SidebarErrorFallback onReset={() => setErrorKey((k) => k + 1)} />}
      >
        <ScrollArea className="flex-1">
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
  );
}
