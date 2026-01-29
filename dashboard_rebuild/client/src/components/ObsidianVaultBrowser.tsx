import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ObsidianRenderer } from "@/components/ObsidianRenderer";
import {
  FolderOpen, FileText, Check, X, ChevronRight,
  File, Folder, ExternalLink, Save,
} from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

const COURSE_FOLDERS = [
  { name: "EBP", path: "School/Evidence Based Practice" },
  { name: "ExPhys", path: "School/Exercise Physiology" },
  { name: "MS1", path: "School/Movement Science 1" },
  { name: "Neuro", path: "School/Neuroscience" },
  { name: "TI", path: "School/Theraputic Intervention" },
];

interface ObsidianVaultBrowserProps {
  onWikilinkClick?: (noteName: string, shiftKey: boolean) => void;
}

export function ObsidianVaultBrowser({ onWikilinkClick }: ObsidianVaultBrowserProps) {
  const [currentFolder, setCurrentFolder] = useState("School");
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [syncToObsidian, setSyncToObsidian] = useState(false);

  const { data: obsidianStatus } = useQuery({
    queryKey: ["obsidian", "status"],
    queryFn: api.obsidian.getStatus,
    refetchInterval: 30000,
  });

  const { data: obsidianConfig } = useQuery({
    queryKey: ["obsidian", "config"],
    queryFn: api.obsidian.getConfig,
  });

  const { data: vaultIndex } = useQuery({
    queryKey: ["obsidian", "vault-index"],
    queryFn: () => api.obsidian.getVaultIndex(),
    enabled: obsidianStatus?.connected === true,
  });

  const { data: obsidianFiles } = useQuery({
    queryKey: ["obsidian", "files", currentFolder],
    queryFn: () => api.obsidian.getFiles(currentFolder),
    enabled: obsidianStatus?.connected === true,
  });

  const loadFile = async (path: string) => {
    try {
      const result = await api.obsidian.getFile(path);
      if (result.success && result.content !== undefined) {
        setCurrentFile(path);
        setFileContent(result.content);
        setHasChanges(false);
      }
    } catch (error) {
      console.error("Failed to load file:", error);
    }
  };

  const saveFile = async () => {
    if (!currentFile) return;
    setIsSaving(true);
    try {
      const result = await api.obsidian.saveFile(currentFile, fileContent);
      if (result.success) {
        setHasChanges(false);
      }
    } catch (error) {
      console.error("Failed to save file:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const navigateToFolder = (folder: string) => {
    setCurrentFolder(folder);
    setCurrentFile(null);
    setFileContent("");
  };

  const createNewNote = () => {
    const today = new Date().toISOString().split('T')[0];
    const newPath = currentFolder
      ? `${currentFolder}/Session-${today}.md`
      : `Session-${today}.md`;
    const template = `# Study Session - ${today}\n\n## Summary\n\n\n## Concepts Covered\n- \n\n## Strengths\n- \n\n## Areas to Review\n- \n\n## Notes\n\n`;
    setCurrentFile(newPath);
    setFileContent(template);
    setHasChanges(true);
  };

  const handleWikilinkClick = async (noteName: string, shiftKey: boolean) => {
    if (shiftKey) {
      const vaultName = obsidianConfig?.vaultName || "PT School Semester 2";
      window.open(`obsidian://open?vault=${encodeURIComponent(vaultName)}&file=${encodeURIComponent(noteName)}`, "_blank");
      return;
    }
    const fullPath = vaultIndex?.paths?.[noteName];
    if (fullPath) {
      await loadFile(fullPath);
      setPreviewMode(true);
      return;
    }
    for (const cf of COURSE_FOLDERS) {
      try {
        await loadFile(`${cf.path}/${noteName}.md`);
        setPreviewMode(true);
        return;
      } catch { /* continue */ }
    }
    console.warn(`Note not found: ${noteName}`);
    onWikilinkClick?.(noteName, shiftKey);
  };

  return (
    <Card className="bg-black/40 border-2 border-primary rounded-none">
      <CardHeader className="border-b border-primary/50 p-4">
        <div className="flex items-center justify-between">
          <CardTitle className="font-arcade text-sm flex items-center gap-3">
            <FolderOpen className="w-4 h-4" />
            OBSIDIAN VAULT
            {obsidianStatus?.connected ? (
              <Check className="w-3 h-3 text-green-500" />
            ) : (
              <X className="w-3 h-3 text-red-500" />
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-6 px-2 rounded-none font-terminal text-xs"
              onClick={createNewNote}
              disabled={!obsidianStatus?.connected}
            >
              <FileText className="w-3 h-3 mr-1" />
              New Note
            </Button>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={syncToObsidian}
                onChange={(e) => setSyncToObsidian(e.target.checked)}
                disabled={!obsidianStatus?.connected}
                className="w-4 h-4 accent-primary"
              />
              <span className="font-terminal text-xs">Auto-Sync</span>
            </label>
          </div>
        </div>
        <div className="flex items-center gap-1 mt-2 flex-wrap">
          {COURSE_FOLDERS.map((course) => (
            <Button
              key={course.path}
              size="sm"
              variant={currentFolder === course.path ? "default" : "outline"}
              className="h-6 px-2 rounded-none font-terminal text-xs"
              onClick={() => navigateToFolder(course.path)}
            >
              {course.name}
            </Button>
          ))}
        </div>
        {currentFolder && (
          <div className="flex items-center gap-1 mt-2 font-terminal text-xs text-muted-foreground">
            <button
              onClick={() => navigateToFolder("")}
              className="hover:text-primary"
            >
              vault
            </button>
            {currentFolder.split('/').map((part, i, arr) => (
              <span key={i} className="flex items-center gap-1">
                <ChevronRight className="w-3 h-3" />
                <button
                  onClick={() => navigateToFolder(arr.slice(0, i + 1).join('/'))}
                  className="hover:text-primary"
                >
                  {part}
                </button>
              </span>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {obsidianStatus?.connected ? (
          <div className="grid md:grid-cols-[200px_1fr] h-[400px] md:h-[500px]">
            <div className="border-r border-secondary/30">
              <ScrollArea className="h-[400px] md:h-[500px]">
                <div className="p-2 space-y-1">
                  {currentFolder && (
                    <button
                      onClick={() => {
                        const parts = currentFolder.split('/');
                        parts.pop();
                        navigateToFolder(parts.join('/'));
                      }}
                      className="w-full flex items-center gap-2 p-2 hover:bg-secondary/20 font-terminal text-xs text-muted-foreground"
                    >
                      <Folder className="w-3 h-3" />
                      ..
                    </button>
                  )}
                  {obsidianFiles?.files?.map((file: string | { path: string }) => {
                    const filePath = typeof file === 'string' ? file : file.path;
                    const isFolder = filePath.endsWith('/');
                    const name = filePath.replace(/\/$/, '').split('/').pop() || filePath;
                    return (
                      <button
                        key={filePath}
                        onClick={() => {
                          if (isFolder) {
                            const cleanName = name.replace(/\/$/, '');
                            navigateToFolder(currentFolder ? `${currentFolder}/${cleanName}` : cleanName);
                          } else {
                            const fullPath = currentFolder ? `${currentFolder}/${name}` : name;
                            loadFile(fullPath);
                          }
                        }}
                        className={`w-full flex items-center gap-2 p-2 hover:bg-secondary/20 font-terminal text-xs ${currentFile?.endsWith(name) ? 'bg-primary/20 text-primary' : ''}`}
                      >
                        {isFolder ? (
                          <Folder className="w-3 h-3 text-yellow-500" />
                        ) : (
                          <File className="w-3 h-3 text-blue-400" />
                        )}
                        {name}
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
            <div className="flex flex-col h-[400px] md:h-[500px]">
              {currentFile ? (
                <>
                  <div className="flex items-center justify-between p-2 border-b border-secondary/30">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-terminal text-xs text-primary truncate">
                        {currentFile.split('/').pop()}
                        {hasChanges && <span className="text-yellow-500 ml-1">*</span>}
                      </span>
                      <button
                        onClick={() => {
                          const vaultName = obsidianConfig?.vaultName || "PT School Semester 2";
                          const fp = currentFile.replace(/\.md$/, "");
                          window.open(`obsidian://open?vault=${encodeURIComponent(vaultName)}&file=${encodeURIComponent(fp)}`, "_blank");
                        }}
                        className="text-muted-foreground hover:text-primary shrink-0"
                        title="Open in Obsidian app"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-[10px]"
                        onClick={() => setPreviewMode(!previewMode)}
                      >
                        {previewMode ? "Edit" : "Preview"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={saveFile}
                        disabled={!hasChanges || isSaving}
                        className="h-6 px-2"
                      >
                        <Save className="w-3 h-3 mr-1" />
                        {isSaving ? 'Saving...' : 'Save'}
                      </Button>
                    </div>
                  </div>
                  {previewMode ? (
                    <div className="flex-1 w-full p-3 bg-black/60 font-terminal overflow-y-auto">
                      <ObsidianRenderer
                        content={fileContent}
                        onWikilinkClick={handleWikilinkClick}
                      />
                    </div>
                  ) : (
                    <textarea
                      value={fileContent}
                      onChange={(e) => {
                        setFileContent(e.target.value);
                        setHasChanges(true);
                      }}
                      className="flex-1 w-full p-3 bg-black/60 font-terminal text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary overflow-y-auto"
                      placeholder="File content..."
                    />
                  )}
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center font-terminal text-xs text-muted-foreground">
                  Select a file to edit
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-8 text-center">
            <p className="font-terminal text-xs text-red-400 mb-2">Obsidian Offline</p>
            <p className="font-terminal text-xs text-muted-foreground">
              Open Obsidian with Local REST API plugin enabled
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
