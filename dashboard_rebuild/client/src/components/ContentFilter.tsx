import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { TutorContentSources, TutorMode } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Database, Folder, Loader2, Zap, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ContentFilterProps {
  courseId: number | undefined;
  setCourseId: (id: number | undefined) => void;
  selectedFolders: string[];
  setSelectedFolders: (folders: string[]) => void;
  mode: TutorMode;
  setMode: (mode: TutorMode) => void;
  topic: string;
  setTopic: (topic: string) => void;
  onStartSession: () => void;
  isStarting: boolean;
  hasActiveSession: boolean;
}

const MODES: { value: TutorMode; label: string; desc: string }[] = [
  { value: "Core", label: "CORE", desc: "Teach First — new material" },
  { value: "Sprint", label: "SPRINT", desc: "Test-First — find gaps" },
  { value: "Drill", label: "DRILL", desc: "Deep Practice — lock concepts" },
  { value: "Teaching Sprint", label: "TEACH", desc: "Quick focused lesson" },
  { value: "Diagnostic Sprint", label: "DIAG", desc: "Assess knowledge" },
];

const DEFAULT_VAULT_PATH = "C:\\Users\\treyt\\Desktop\\Treys School";

export function ContentFilter({
  courseId,
  setCourseId,
  selectedFolders,
  setSelectedFolders,
  mode,
  setMode,
  topic,
  setTopic,
  onStartSession,
  isStarting,
  hasActiveSession,
}: ContentFilterProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  const [vaultPath, setVaultPath] = useState(DEFAULT_VAULT_PATH);

  const { data: sources, isLoading } = useQuery<TutorContentSources>({
    queryKey: ["tutor-content-sources"],
    queryFn: () => api.tutor.getContentSources(),
  });

  const toggleFolder = (path: string) => {
    setSelectedFolders(
      selectedFolders.includes(path)
        ? selectedFolders.filter((f) => f !== path)
        : [...selectedFolders, path]
    );
  };

  const courseFolders = sources?.folders.filter(
    (f) => !courseId || f.course_id === courseId || (courseId === undefined && f.course_id === null)
  );

  const handleSyncVault = async () => {
    if (!vaultPath.trim()) return;
    setIsSyncing(true);
    try {
      const result = await api.tutor.syncVault({ vault_path: vaultPath });
      toast({
        title: "Vault synced",
        description: `${result.processed} files processed, ${result.embedded} newly embedded`,
      });
      queryClient.invalidateQueries({ queryKey: ["tutor-content-sources"] });
    } catch (err) {
      toast({
        title: "Sync failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex flex-col h-full gap-3 p-3">
      <div className="font-arcade text-xs text-primary tracking-wider">
        CONTENT FILTER
      </div>

      {/* Mode selector */}
      <div className="space-y-1">
        <div className="text-[10px] font-terminal text-muted-foreground uppercase tracking-wider">
          Phase: First Pass
        </div>
        <div className="grid grid-cols-1 gap-1">
          {MODES.map((m) => (
            <button
              key={m.value}
              onClick={() => setMode(m.value)}
              className={`text-left px-2 py-1.5 border-2 text-xs font-terminal transition-colors ${
                mode === m.value
                  ? "border-primary bg-primary/20 text-primary"
                  : "border-muted-foreground/30 hover:border-primary/50 text-muted-foreground"
              }`}
            >
              <span className="font-arcade text-[10px]">{m.label}</span>
              <span className="ml-2 text-[10px] opacity-70">{m.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Topic */}
      <div className="space-y-1">
        <label className="text-[10px] font-terminal text-muted-foreground uppercase tracking-wider">
          Topic
        </label>
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g. Hip Flexors"
          className="w-full bg-black/60 border-2 border-muted-foreground/30 px-2 py-1.5 text-xs font-terminal text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none"
        />
      </div>

      {/* Course selector */}
      <div className="space-y-1">
        <label className="text-[10px] font-terminal text-muted-foreground uppercase tracking-wider">
          Course
        </label>
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        ) : (
          <div className="space-y-1">
            <button
              onClick={() => setCourseId(undefined)}
              className={`w-full text-left px-2 py-1 text-xs font-terminal border-2 ${
                !courseId
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              All Courses
              <Badge variant="outline" className="ml-2 text-[10px] rounded-none">
                {sources?.total_docs ?? 0}
              </Badge>
            </button>
            {sources?.courses.map((c) => (
              <button
                key={c.id ?? "system"}
                onClick={() => setCourseId(c.id ?? undefined)}
                className={`w-full text-left px-2 py-1 text-xs font-terminal border-2 ${
                  courseId === c.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {c.name}
                <Badge variant="outline" className="ml-2 text-[10px] rounded-none">
                  {c.doc_count}
                </Badge>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Folder filter */}
      {courseFolders && courseFolders.length > 0 && (
        <div className="space-y-1 flex-1 min-h-0">
          <label className="text-[10px] font-terminal text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Folder className="w-3 h-3" />
            Folders
          </label>
          <ScrollArea className="flex-1 max-h-32">
            <div className="space-y-1">
              {courseFolders.map((f) => (
                <label
                  key={f.folder_path}
                  className="flex items-center gap-2 px-2 py-1 text-xs font-terminal text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <Checkbox
                    checked={selectedFolders.includes(f.folder_path)}
                    onCheckedChange={() => toggleFolder(f.folder_path)}
                  />
                  <span className="truncate flex-1">{f.folder_path}</span>
                  <Badge variant="outline" className="text-[10px] rounded-none">
                    {f.doc_count}
                  </Badge>
                </label>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Vault sync */}
      <div className="space-y-1">
        <label className="text-[10px] font-terminal text-muted-foreground uppercase tracking-wider">
          Vault Sync
        </label>
        <input
          value={vaultPath}
          onChange={(e) => setVaultPath(e.target.value)}
          placeholder="Path to Obsidian vault"
          className="w-full bg-black/60 border-2 border-muted-foreground/30 px-2 py-1 text-[10px] font-terminal text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none"
        />
        <Button
          onClick={handleSyncVault}
          disabled={isSyncing || !vaultPath.trim()}
          variant="outline"
          className="w-full rounded-none border-2 border-muted-foreground/30 font-arcade text-[10px] h-7"
        >
          {isSyncing ? (
            <Loader2 className="w-3 h-3 animate-spin mr-1" />
          ) : (
            <RefreshCw className="w-3 h-3 mr-1" />
          )}
          SYNC VAULT
        </Button>
      </div>

      {/* Start button */}
      <Button
        onClick={onStartSession}
        disabled={isStarting || hasActiveSession}
        className="w-full rounded-none border-2 border-primary font-arcade text-xs"
      >
        {isStarting ? (
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
        ) : (
          <Zap className="w-4 h-4 mr-2" />
        )}
        {hasActiveSession ? "SESSION ACTIVE" : "START SESSION"}
      </Button>

      {/* Doc stats */}
      <div className="flex items-center gap-1 text-[10px] font-terminal text-muted-foreground">
        <Database className="w-3 h-3" />
        {sources?.total_docs ?? 0} docs indexed
      </div>
    </div>
  );
}
