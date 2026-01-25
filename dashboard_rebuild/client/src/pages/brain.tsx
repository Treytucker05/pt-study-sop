import Layout from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { IngestionTab } from "@/components/IngestionTab";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Database, Brain as BrainIcon, AlertTriangle, BookOpen, Layers, 
  FileText, Paperclip, Send, BarChart3, MessageCircle, RefreshCw, Check, X,
  Trash2, Pencil, FolderOpen, Save, ChevronRight, File, Folder
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { format, isValid } from "date-fns";

// Helper to safely format dates
const safeFormatDate = (
  dateInput: string | number | Date | null | undefined,
  formatStr: string = "MM/dd"
): string => {
  if (!dateInput) return "-";
  try {
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (!isValid(date)) return "-";
    return format(date, formatStr);
  } catch {
    return "-";
  }
};

const parseStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === "string");
      }
    } catch {
      // fall through to comma split
    }
    return trimmed.split(",").map((item) => item.trim()).filter(Boolean);
  }
  return [];
};

export default function Brain() {
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [wrapSummary, setWrapSummary] = useState<{
    cardsCreated: number;
    issuesLogged: number;
    obsidianSynced: boolean;
    obsidianPath?: string;
    sessionId?: number | null;
    wrapSessionId?: string | null;
  } | null>(null);
  const [selectedSessions, setSelectedSessions] = useState<Set<number>>(new Set());
  const [editingSession, setEditingSession] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sessionsToDelete, setSessionsToDelete] = useState<number[]>([]);
  const [syncToObsidian, setSyncToObsidian] = useState(false);
  const [selectedDrafts, setSelectedDrafts] = useState<Set<number>>(new Set());
  const [editingDraft, setEditingDraft] = useState<number | null>(null);
  const [editDraftData, setEditDraftData] = useState({ front: "", back: "", deckName: "" });

  // Brain chat mode selector
  const [brainChatMode, setBrainChatMode] = useState<"all" | "obsidian" | "anki" | "metrics">("all");

  // Filter state for session evidence table
  const [dateFilter, setDateFilter] = useState<string>("");
  const [courseFilter, setCourseFilter] = useState<string>("all");

  // Edit form state
  const [editFormData, setEditFormData] = useState({
    mode: "",
    minutes: "",
    cards: "",
    confusions: "",
    weakAnchors: "",
    concepts: "",
    issues: "",
    notes: ""
  });
  
  // Obsidian editor state
  const [obsidianCurrentFolder, setObsidianCurrentFolder] = useState("School");
  const [obsidianCurrentFile, setObsidianCurrentFile] = useState<string | null>(null);
  const [obsidianFileContent, setObsidianFileContent] = useState("");
  const [obsidianIsSaving, setObsidianIsSaving] = useState(false);
  const [obsidianHasChanges, setObsidianHasChanges] = useState(false);

  // Quick access course folders
  const courseFolders = [
    { name: "EBP", path: "School/Evidence Based Practice" },
    { name: "ExPhys", path: "School/Exercise Physiology" },
    { name: "MS1", path: "School/Movement Science 1" },
    { name: "Neuro", path: "School/Neuroscience" },
    { name: "TI", path: "School/Theraputic Intervention" },
  ];
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ["sessions"],
    queryFn: api.sessions.getAll,
  });

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["brain", "metrics"],
    queryFn: api.brain.getMetrics,
  });

  const queryClient = useQueryClient();

  // Session delete mutation
  const deleteSessionsMutation = useMutation({
    mutationFn: (ids: number[]) => api.sessions.deleteMany(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["brain", "metrics"] });
      setSelectedSessions(new Set());
    },
  });

  // Session update mutation
  const updateSessionMutation = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: any }) =>
      api.sessions.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["brain", "metrics"] });
      setEditingSession(null);
    },
  });

  // Toggle single session selection
  const toggleSessionSelection = (id: number) => {
    setSelectedSessions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Toggle all sessions
  const toggleAllSessions = () => {
    if (selectedSessions.size === sessions.length) {
      setSelectedSessions(new Set());
    } else {
      setSelectedSessions(new Set(sessions.map(s => s.id)));
    }
  };

  // Open delete dialog for selected sessions
  const handleDeleteSelected = () => {
    if (selectedSessions.size === 0) return;
    setSessionsToDelete(Array.from(selectedSessions));
    setDeleteDialogOpen(true);
  };

  // Open delete dialog for single session
  const handleDeleteSingle = (id: number) => {
    setSessionsToDelete([id]);
    setDeleteDialogOpen(true);
  };

  // Confirm deletion
  const confirmDelete = () => {
    deleteSessionsMutation.mutate(sessionsToDelete);
    setDeleteDialogOpen(false);
    setSessionsToDelete([]);
  };

  // Handle edit session - populate form with session data
  useEffect(() => {
    if (editingSession !== null) {
      const session = sessions.find(s => s.id === editingSession);
      if (session) {
        setEditFormData({
          mode: session.mode || "",
          minutes: session.minutes?.toString() || "",
          cards: session.cards?.toString() || "",
          confusions: parseStringArray(session.confusions).join(", "),
          weakAnchors: parseStringArray(session.weakAnchors).join(", "),
          concepts: parseStringArray(session.concepts).join(", "),
          issues: parseStringArray(session.issues).join(", "),
          notes: session.notes || ""
        });
      }
    }
  }, [editingSession, sessions]);

  // Handle save edited session
  const handleSaveEdit = () => {
    if (editingSession === null) return;

    const parseList = (value: string) =>
      value ? value.split(",").map((item) => item.trim()).filter(Boolean) : [];
    const toJsonOrNull = (items: string[]) => (items.length ? JSON.stringify(items) : null);

    const updates = {
      mode: editFormData.mode || "study",
      minutes: parseInt(editFormData.minutes) || 0,
      cards: parseInt(editFormData.cards) || 0,
      confusions: toJsonOrNull(parseList(editFormData.confusions)),
      weakAnchors: toJsonOrNull(parseList(editFormData.weakAnchors)),
      concepts: toJsonOrNull(parseList(editFormData.concepts)),
      issues: toJsonOrNull(parseList(editFormData.issues)),
      notes: editFormData.notes || null
    };

    updateSessionMutation.mutate({ id: editingSession, updates });
  };

  // Obsidian query
  const { data: obsidianStatus } = useQuery({
    queryKey: ["obsidian", "status"],
    queryFn: api.obsidian.getStatus,
    refetchInterval: 30000,
  });

  // Obsidian files query
  const { data: obsidianFiles, refetch: refetchObsidianFiles } = useQuery({
    queryKey: ["obsidian", "files", obsidianCurrentFolder],
    queryFn: () => api.obsidian.getFiles(obsidianCurrentFolder),
    enabled: obsidianStatus?.connected === true,
  });

  // Load file content
  const loadObsidianFile = async (path: string) => {
    try {
      const result = await api.obsidian.getFile(path);
      if (result.success && result.content !== undefined) {
        setObsidianCurrentFile(path);
        setObsidianFileContent(result.content);
        setObsidianHasChanges(false);
      }
    } catch (error) {
      console.error("Failed to load file:", error);
    }
  };

  // Save file content
  const saveObsidianFile = async () => {
    if (!obsidianCurrentFile) return;
    setObsidianIsSaving(true);
    try {
      const result = await api.obsidian.saveFile(obsidianCurrentFile, obsidianFileContent);
      if (result.success) {
        setObsidianHasChanges(false);
      }
    } catch (error) {
      console.error("Failed to save file:", error);
    } finally {
      setObsidianIsSaving(false);
    }
  };

  // Navigate to folder
  const navigateToFolder = (folder: string) => {
    setObsidianCurrentFolder(folder);
    setObsidianCurrentFile(null);
    setObsidianFileContent("");
  };

  // Create new note in current folder
  const createNewNote = () => {
    const today = new Date().toISOString().split('T')[0];
    const newPath = obsidianCurrentFolder
      ? `${obsidianCurrentFolder}/Session-${today}.md`
      : `Session-${today}.md`;
    const template = `# Study Session - ${today}\n\n## Summary\n\n\n## Concepts Covered\n- \n\n## Strengths\n- \n\n## Areas to Review\n- \n\n## Notes\n\n`;
    setObsidianCurrentFile(newPath);
    setObsidianFileContent(template);
    setObsidianHasChanges(true);
  };

  // Anki queries
  const { data: ankiStatus, isLoading: ankiLoading, refetch: refetchAnki } = useQuery({
    queryKey: ["anki", "status"],
    queryFn: api.anki.getStatus,
    refetchInterval: 30000, // Auto-refresh every 30s
  });

  const { data: ankiDue } = useQuery({
    queryKey: ["anki", "due"],
    queryFn: api.anki.getDue,
    enabled: ankiStatus?.connected === true,
  });

  const { data: ankiDrafts = [], refetch: refetchDrafts } = useQuery({
    queryKey: ["anki", "drafts"],
    queryFn: api.anki.getDrafts,
  });

  const pendingDrafts = ankiDrafts.filter(d => d.status === "pending");

  const syncAnkiMutation = useMutation({
    mutationFn: api.anki.sync,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["anki"] });
      refetchDrafts();
    },
  });

  const approveDraftMutation = useMutation({
    mutationFn: (id: number) => api.anki.approveDraft(id),
    onSuccess: () => {
      refetchDrafts();
    },
  });

  const deleteDraftMutation = useMutation({
    mutationFn: (id: number) => api.anki.deleteDraft(id),
    onSuccess: () => {
      refetchDrafts();
    },
  });

  const updateDraftMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { front?: string; back?: string; deckName?: string } }) =>
      api.anki.updateDraft(id, data),
    onSuccess: () => {
      refetchDrafts();
      setEditingDraft(null);
    },
  });

  // Open edit dialog for a draft
  const handleEditDraft = (draft: typeof pendingDrafts[0]) => {
    setEditingDraft(draft.id);
    setEditDraftData({
      front: draft.front,
      back: draft.back,
      deckName: draft.deckName,
    });
  };

  // Save draft edits
  const handleSaveDraft = () => {
    if (editingDraft === null) return;
    updateDraftMutation.mutate({
      id: editingDraft,
      data: editDraftData,
    });
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Simple WRAP format detection (matches is_wrap_format scoring in wrap_parser.py)
  const looksLikeWrap = (text: string): boolean => {
    let score = 0;
    if (/section\s*[ABCD]/i.test(text)) score += 2;
    if (/^[ABCD]\s*[:\)\-]/im.test(text)) score += 2;
    if (/front\s*:/i.test(text) && /back\s*:/i.test(text)) score += 2;
    if (/\bWRAP\b/i.test(text)) score += 1;
    if (/```json/i.test(text)) score += 1;
    return score >= 2;
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    const message = chatInput;
    setChatInput("");
    setWrapSummary(null);
    setChatMessages(prev => [...prev, { role: "user", content: message }]);
    setIsProcessing(true);

    try {
      // If it looks like WRAP, use direct ingestion instead of LLM
      if (looksLikeWrap(message)) {
        const result = await api.brain.ingest(message, "pasted_wrap.md");
        if (result.sessionSaved) {
          const cardsMsg = result.cardsCreated ? ` | Cards: ${result.cardsCreated}` : "";
          setChatMessages(prev => [...prev, {
            role: "assistant",
            content: `✓ Session saved (ID: ${result.sessionId})${cardsMsg}\n${result.message}`
          }]);
          queryClient.invalidateQueries({ queryKey: ["sessions"] });
          if (result.cardsCreated && result.cardsCreated > 0) {
            queryClient.invalidateQueries({ queryKey: ["anki"] });
          }
        } else {
          const errorMsg = result.errors?.join(", ") || result.message;
          setChatMessages(prev => [...prev, {
            role: "assistant",
            content: `⚠ ${errorMsg}`
          }]);
        }
      } else {
        // Regular chat - go through LLM
        const result = await api.brain.chat(message, syncToObsidian, brainChatMode);
        setChatMessages(prev => [...prev, { role: "assistant", content: result.response }]);
        if (result.wrapProcessed) {
          setWrapSummary({
            cardsCreated: result.cardsCreated || 0,
            issuesLogged: result.issuesLogged || 0,
            obsidianSynced: Boolean(result.obsidianSynced),
            obsidianPath: result.obsidianPath,
            sessionId: result.sessionId ?? null,
            wrapSessionId: result.wrapSessionId ?? null,
          });
        }
        // Refresh data if cards were created
        if (result.cardsCreated && result.cardsCreated > 0) {
          queryClient.invalidateQueries({ queryKey: ["anki"] });
        }
      }
    } catch (error) {
      setChatMessages(prev => [...prev, { role: "assistant", content: "Error processing request. Please try again." }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePasteWrap = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        setChatInput(text);
      }
    } catch {
      setChatMessages(prev => [...prev, { role: "assistant", content: "Clipboard access failed. Paste manually." }]);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const content = e.target?.result as string;
        setChatMessages(prev => [...prev, 
          { role: "user", content: `[Uploaded: ${file.name}]\n${content.slice(0, 500)}${content.length > 500 ? '...' : ''}` }
        ]);
        setIsProcessing(true);
        try {
          const result = await api.brain.ingest(content, file.name);
          if (result.sessionSaved) {
            setChatMessages(prev => [...prev, {
              role: "assistant",
              content: `✓ Session saved (ID: ${result.sessionId})\n${result.message}`
            }]);
          } else {
            // Surface errors from validation or parsing
            const errorMsg = result.errors?.join(", ") || result.message;
            setChatMessages(prev => [...prev, {
              role: "assistant",
              content: `⚠ ${errorMsg}`
            }]);
          }
        } catch (error) {
          setChatMessages(prev => [...prev, { role: "assistant", content: "Error processing file. Please try again." }]);
        } finally {
          setIsProcessing(false);
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-arcade text-xl text-primary flex items-center gap-2">
            <BrainIcon className="w-6 h-6" />
            BRAIN ANALYTICS
          </h1>
          <div className="flex items-center gap-4 font-terminal text-sm">
            <span className="text-muted-foreground">SESSIONS: <span className="text-primary" data-testid="text-total-sessions">{metrics?.totalSessions || 0}</span></span>
            <span className="text-muted-foreground">MINUTES: <span className="text-primary" data-testid="text-total-minutes">{metrics?.totalMinutes || 0}</span></span>
            <span className="text-muted-foreground">CARDS: <span className="text-primary" data-testid="text-total-cards">{metrics?.totalCards || 0}</span></span>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="evidence" className="w-full">
              <TabsList className="bg-black/40 border border-secondary rounded-none w-full justify-start">
                <TabsTrigger value="evidence" className="rounded-none font-arcade text-xs data-[state=active]:bg-primary data-[state=active]:text-black">
                  SESSION EVIDENCE
                </TabsTrigger>
                <TabsTrigger value="metrics" className="rounded-none font-arcade text-xs data-[state=active]:bg-primary data-[state=active]:text-black">
                  DERIVED METRICS
                </TabsTrigger>
                <TabsTrigger value="issues" className="rounded-none font-arcade text-xs data-[state=active]:bg-primary data-[state=active]:text-black">
                  ISSUES LOG
                </TabsTrigger>
                <TabsTrigger value="ingestion" className="rounded-none font-arcade text-xs data-[state=active]:bg-primary data-[state=active]:text-black">
                  INGESTION
                </TabsTrigger>
              </TabsList>

              <TabsContent value="evidence" className="mt-4">
                <Card className="bg-black/40 border-2 border-secondary rounded-none">
                  <CardHeader className="border-b border-secondary p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="font-arcade text-sm flex items-center gap-2">
                          <Database className="w-4 h-4" />
                          SESSION EVIDENCE TABLE
                        </CardTitle>
                        <p className="font-terminal text-xs text-muted-foreground mt-1">
                          Raw WRAP data. All metrics derive from these fields.
                        </p>
                      </div>
                      {selectedSessions.size > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="font-terminal text-xs text-muted-foreground">
                            {selectedSessions.size} selected
                          </span>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="font-terminal text-xs rounded-none"
                            onClick={handleDeleteSelected}
                            disabled={deleteSessionsMutation.isPending}
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            {deleteSessionsMutation.isPending ? "Deleting..." : "Delete"}
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {sessionsLoading ? (
                      <div className="p-8 text-center font-terminal text-muted-foreground">LOADING...</div>
                    ) : sessions.length === 0 ? (
                      <div className="p-8 text-center font-terminal text-muted-foreground">NO SESSIONS YET</div>
                    ) : (
                      <ScrollArea className="h-[400px]">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-secondary hover:bg-transparent">
                              <TableHead className="w-10">
                                <Checkbox
                                  checked={selectedSessions.size === sessions.length && sessions.length > 0}
                                  onCheckedChange={toggleAllSessions}
                                  className="border-primary data-[state=checked]:bg-primary"
                                />
                              </TableHead>
                              <TableHead className="font-arcade text-xs text-primary">DATE</TableHead>
                              <TableHead className="font-arcade text-xs text-primary">COURSE</TableHead>
                              <TableHead className="font-arcade text-xs text-primary">MODE</TableHead>
                              <TableHead className="font-arcade text-xs text-primary">MIN</TableHead>
                              <TableHead className="font-arcade text-xs text-primary">CARDS</TableHead>
                              <TableHead className="font-arcade text-xs text-primary">CONFUSIONS</TableHead>
                              <TableHead className="font-arcade text-xs text-primary w-10">ACTIONS</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sessions.map((session) => (
                              <TableRow key={session.id} className="border-secondary hover:bg-primary/10 font-terminal text-sm" data-testid={`row-session-${session.id}`}>
                                <TableCell>
                                  <Checkbox
                                    checked={selectedSessions.has(session.id)}
                                    onCheckedChange={() => toggleSessionSelection(session.id)}
                                    className="border-secondary data-[state=checked]:bg-primary"
                                  />
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {safeFormatDate(session.date)}
                                </TableCell>
                                <TableCell className="font-bold">{session.topic || '-'}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="rounded-none border-secondary font-normal text-xs">{session.mode}</Badge>
                                </TableCell>
                                <TableCell>{session.minutes || 0}</TableCell>
                                <TableCell>{session.cards || 0}</TableCell>
                                <TableCell className="max-w-[150px] truncate text-xs text-muted-foreground">
                                  {parseStringArray(session.confusions).join(", ") || "-"}
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-1">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-6 w-6 rounded-none hover:bg-primary/20"
                                      onClick={() => setEditingSession(session.id)}
                                      title="Edit session"
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-6 w-6 rounded-none hover:bg-destructive/20 text-destructive"
                                      onClick={() => handleDeleteSingle(session.id)}
                                      title="Delete session"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="metrics" className="mt-4 space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <Card className="bg-black/40 border-2 border-secondary rounded-none">
                    <CardHeader className="border-b border-secondary p-3">
                      <CardTitle className="font-arcade text-xs flex items-center gap-2">
                        <BarChart3 className="w-3 h-3" />
                        SESSIONS PER COURSE
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 max-h-[200px] overflow-y-auto">
                      {metricsLoading ? (
                        <div className="text-center font-terminal text-xs text-muted-foreground">LOADING...</div>
                      ) : (metrics?.sessionsPerCourse || []).length === 0 ? (
                        <div className="text-center font-terminal text-xs text-muted-foreground py-4">NO DATA</div>
                      ) : (
                        <div className="space-y-2">
                          {metrics?.sessionsPerCourse.map((item, i) => (
                            <div key={i} className="flex items-center justify-between font-terminal text-xs">
                              <span className="truncate max-w-[120px]">{item.course}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-primary">{item.count} sess</span>
                                <span className="text-muted-foreground">{item.minutes} min</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="bg-black/40 border-2 border-secondary rounded-none">
                    <CardHeader className="border-b border-secondary p-3">
                      <CardTitle className="font-arcade text-xs flex items-center gap-2">
                        <Layers className="w-3 h-3" />
                        MODE DISTRIBUTION
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 max-h-[200px] overflow-y-auto">
                      {metricsLoading ? (
                        <div className="text-center font-terminal text-xs text-muted-foreground">LOADING...</div>
                      ) : (metrics?.modeDistribution || []).length === 0 ? (
                        <div className="text-center font-terminal text-xs text-muted-foreground py-4">NO DATA</div>
                      ) : (
                        <div className="space-y-2">
                          {metrics?.modeDistribution.map((item, i) => (
                            <div key={i} className="flex items-center justify-between font-terminal text-xs">
                              <Badge variant="outline" className="rounded-none border-secondary">{item.mode}</Badge>
                              <div className="flex items-center gap-2">
                                <span className="text-primary">{item.count} sess</span>
                                <span className="text-muted-foreground">{item.minutes} min</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="bg-black/40 border-2 border-secondary rounded-none">
                    <CardHeader className="border-b border-secondary p-3">
                      <CardTitle className="font-arcade text-xs flex items-center gap-2 text-orange-400">
                        <AlertTriangle className="w-3 h-3" />
                        REPEATED CONFUSIONS
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 max-h-[200px] overflow-y-auto">
                      {(metrics?.recentConfusions || []).length === 0 ? (
                        <div className="text-center font-terminal text-xs text-muted-foreground py-4">NO CONFUSIONS LOGGED</div>
                      ) : (
                        <div className="space-y-1">
                          {metrics?.recentConfusions.map((item, i) => (
                            <div key={i} className="flex items-center justify-between font-terminal text-xs">
                              <span className="truncate max-w-[150px] text-orange-300">{item.text}</span>
                              <span className="text-muted-foreground">x{item.count}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="bg-black/40 border-2 border-secondary rounded-none">
                    <CardHeader className="border-b border-secondary p-3">
                      <CardTitle className="font-arcade text-xs flex items-center gap-2">
                        <BookOpen className="w-3 h-3" />
                        CONCEPT FREQUENCY
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 max-h-[200px] overflow-y-auto">
                      {(metrics?.conceptFrequency || []).length === 0 ? (
                        <div className="text-center font-terminal text-xs text-muted-foreground py-4">NO CONCEPTS LOGGED</div>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {metrics?.conceptFrequency.slice(0, 15).map((item, i) => (
                            <Badge key={i} variant="outline" className="rounded-none border-secondary font-terminal text-xs">
                              {item.concept} ({item.count})
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="issues" className="mt-4">
                <Card className="bg-black/40 border-2 border-secondary rounded-none">
                  <CardHeader className="border-b border-secondary p-4">
                    <CardTitle className="font-arcade text-sm flex items-center gap-2 text-red-400">
                      <AlertTriangle className="w-4 h-4" />
                      ISSUES AND FAILURES LOG
                    </CardTitle>
                    <p className="font-terminal text-xs text-muted-foreground mt-1">
                      Aggregated session issues: interruptions, source-lock failures, workflow problems
                    </p>
                  </CardHeader>
                  <CardContent className="p-4">
                    {(metrics?.issuesLog || []).length === 0 ? (
                      <div className="text-center font-terminal text-muted-foreground py-8">NO ISSUES LOGGED</div>
                    ) : (
                      <div className="space-y-2">
                        {metrics?.issuesLog.map((item, i) => (
                          <div key={i} className="flex items-center justify-between p-2 border border-red-500/30 bg-red-500/5 font-terminal text-sm">
                            <span className="text-red-300">{item.issue}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground text-xs">{item.course}</span>
                              <Badge variant="outline" className="rounded-none border-red-500/50 text-red-400">x{item.count}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="ingestion" className="mt-4">
                <IngestionTab />
              </TabsContent>
            </Tabs>

            {/* Obsidian Vault Browser */}
            <Card className="bg-black/40 border-2 border-secondary rounded-none">
              <CardHeader className="border-b border-secondary/50 p-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-arcade text-sm flex items-center gap-2">
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
                {/* Quick access course buttons */}
                <div className="flex items-center gap-1 mt-2 flex-wrap">
                  {courseFolders.map((course) => (
                    <Button
                      key={course.path}
                      size="sm"
                      variant={obsidianCurrentFolder === course.path ? "default" : "outline"}
                      className="h-6 px-2 rounded-none font-terminal text-xs"
                      onClick={() => navigateToFolder(course.path)}
                    >
                      {course.name}
                    </Button>
                  ))}
                </div>
                {obsidianCurrentFolder && (
                  <div className="flex items-center gap-1 mt-2 font-terminal text-xs text-muted-foreground">
                    <button
                      onClick={() => navigateToFolder("")}
                      className="hover:text-primary"
                    >
                      vault
                    </button>
                    {obsidianCurrentFolder.split('/').map((part, i, arr) => (
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
                  <div className="grid md:grid-cols-2 h-[300px]">
                    {/* File list */}
                    <div className="border-r border-secondary/30">
                      <ScrollArea className="h-[300px]">
                        <div className="p-2 space-y-1">
                          {obsidianCurrentFolder && (
                            <button
                              onClick={() => {
                                const parts = obsidianCurrentFolder.split('/');
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
                            // Handle both string and object formats
                            const filePath = typeof file === 'string' ? file : file.path;
                            const isFolder = filePath.endsWith('/');
                            const name = filePath.replace(/\/$/, '').split('/').pop() || filePath;
                            return (
                              <button
                                key={filePath}
                                onClick={() => {
                                  if (isFolder) {
                                    const cleanName = name.replace(/\/$/, '');
                                    navigateToFolder(obsidianCurrentFolder ? `${obsidianCurrentFolder}/${cleanName}` : cleanName);
                                  } else {
                                    const fullPath = obsidianCurrentFolder ? `${obsidianCurrentFolder}/${name}` : name;
                                    loadObsidianFile(fullPath);
                                  }
                                }}
                                className={`w-full flex items-center gap-2 p-2 hover:bg-secondary/20 font-terminal text-xs ${
                                  obsidianCurrentFile?.endsWith(name) ? 'bg-primary/20 text-primary' : ''
                                }`}
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
                    {/* Editor */}
                    <div className="flex flex-col h-[300px]">
                      {obsidianCurrentFile ? (
                        <>
                          <div className="flex items-center justify-between p-2 border-b border-secondary/30">
                            <span className="font-terminal text-xs text-primary truncate">
                              {obsidianCurrentFile.split('/').pop()}
                              {obsidianHasChanges && <span className="text-yellow-500 ml-1">*</span>}
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={saveObsidianFile}
                              disabled={!obsidianHasChanges || obsidianIsSaving}
                              className="h-6 px-2"
                            >
                              <Save className="w-3 h-3 mr-1" />
                              {obsidianIsSaving ? 'Saving...' : 'Save'}
                            </Button>
                          </div>
                          <textarea
                            value={obsidianFileContent}
                            onChange={(e) => {
                              setObsidianFileContent(e.target.value);
                              setObsidianHasChanges(true);
                            }}
                            className="flex-1 w-full p-3 bg-black/60 font-terminal text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                            placeholder="File content..."
                          />
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

            <div className="grid md:grid-cols-2 gap-4">
              <Card className="bg-black/40 border-2 border-secondary/50 rounded-none">
                <CardHeader className="border-b border-secondary/50 p-3">
                  <CardTitle className="font-arcade text-xs flex items-center gap-2 text-muted-foreground">
                    <Layers className="w-3 h-3" />
                    ANKI INTEGRATION
                    {ankiStatus?.connected ? (
                      <Check className="w-3 h-3 text-green-500 ml-auto" />
                    ) : (
                      <X className="w-3 h-3 text-red-500 ml-auto" />
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {ankiLoading ? (
                    <p className="font-terminal text-xs text-muted-foreground">Checking Anki...</p>
                  ) : ankiStatus?.connected ? (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="font-terminal text-xs text-muted-foreground">Status:</span>
                        <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500">
                          Connected
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-terminal text-xs text-muted-foreground">Cards Created:</span>
                        <span className="font-arcade text-xs text-primary">{metrics?.totalCards || 0}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-terminal text-xs text-muted-foreground">Due Today:</span>
                        <span className="font-arcade text-xs text-secondary">{ankiDue?.dueCount || 0}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-terminal text-xs text-muted-foreground">Reviewed Today:</span>
                        <span className="font-arcade text-xs text-muted-foreground">{ankiStatus.reviewedToday || 0}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-terminal text-xs text-muted-foreground">Decks:</span>
                        <span className="font-arcade text-xs text-muted-foreground">{ankiStatus.decks?.length || 0}</span>
                      </div>
                      <div className="pt-2 flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 font-terminal text-xs"
                          onClick={() => refetchAnki()}
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Refresh
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 font-terminal text-xs bg-secondary hover:bg-secondary/80"
                          onClick={() => syncAnkiMutation.mutate()}
                          disabled={syncAnkiMutation.isPending}
                        >
                          {syncAnkiMutation.isPending ? "Syncing..." : "Sync Cards"}
                        </Button>
                      </div>
                      {/* Pending Drafts */}
                      {pendingDrafts.length > 0 && (
                        <div className="pt-3 border-t border-secondary/30">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-arcade text-[10px] text-yellow-400">PENDING CARDS ({pendingDrafts.length})</span>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-5 px-2 text-[10px] font-terminal"
                                onClick={() => {
                                  if (selectedDrafts.size === pendingDrafts.length) {
                                    setSelectedDrafts(new Set());
                                  } else {
                                    setSelectedDrafts(new Set(pendingDrafts.map(d => d.id)));
                                  }
                                }}
                              >
                                {selectedDrafts.size === pendingDrafts.length ? "None" : "All"}
                              </Button>
                            </div>
                          </div>
                          {selectedDrafts.size > 0 && (
                            <div className="flex gap-1 mb-2">
                              <Button
                                size="sm"
                                className="h-6 px-2 text-[10px] font-terminal bg-green-600 hover:bg-green-700"
                                onClick={() => {
                                  selectedDrafts.forEach(id => approveDraftMutation.mutate(id));
                                  setSelectedDrafts(new Set());
                                }}
                              >
                                <Check className="w-3 h-3 mr-1" />
                                Approve ({selectedDrafts.size})
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-6 px-2 text-[10px] font-terminal"
                                onClick={() => {
                                  selectedDrafts.forEach(id => deleteDraftMutation.mutate(id));
                                  setSelectedDrafts(new Set());
                                }}
                              >
                                <Trash2 className="w-3 h-3 mr-1" />
                                Delete ({selectedDrafts.size})
                              </Button>
                            </div>
                          )}
                          <ScrollArea className="h-[200px]">
                            <div className="space-y-2">
                              {pendingDrafts.map((draft) => (
                                <div key={draft.id} className={`p-2 bg-black/40 border text-xs ${selectedDrafts.has(draft.id) ? 'border-primary' : 'border-secondary/30'}`}>
                                  <div className="flex items-start gap-2">
                                    <Checkbox
                                      checked={selectedDrafts.has(draft.id)}
                                      onCheckedChange={(checked) => {
                                        const newSet = new Set(selectedDrafts);
                                        if (checked) {
                                          newSet.add(draft.id);
                                        } else {
                                          newSet.delete(draft.id);
                                        }
                                        setSelectedDrafts(newSet);
                                      }}
                                      className="mt-1 border-secondary data-[state=checked]:bg-primary"
                                    />
                                    <div className="flex-1 min-w-0 overflow-hidden">
                                      <div className="font-terminal text-primary truncate">{draft.front}</div>
                                      <div className="font-terminal text-muted-foreground mt-1 truncate">{draft.back}</div>
                                      <div className="flex items-center gap-2 mt-1">
                                        <Badge variant="outline" className="text-[9px] border-blue-500/50 text-blue-400 shrink-0">
                                          {draft.deckName}
                                        </Badge>
                                        <Button
                                          size="icon"
                                          variant="outline"
                                          className="h-5 w-5 shrink-0 border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/20"
                                          onClick={() => handleEditDraft(draft)}
                                          title="Edit card"
                                        >
                                          <Pencil className="w-3 h-3" />
                                        </Button>
                                        <Button
                                          size="icon"
                                          variant="outline"
                                          className="h-5 w-5 shrink-0 border-green-500/50 text-green-400 hover:bg-green-500/20"
                                          onClick={() => approveDraftMutation.mutate(draft.id)}
                                          title="Approve card"
                                        >
                                          <Check className="w-3 h-3" />
                                        </Button>
                                        <Button
                                          size="icon"
                                          variant="outline"
                                          className="h-5 w-5 shrink-0 border-red-500/50 text-red-400 hover:bg-red-500/20"
                                          onClick={() => deleteDraftMutation.mutate(draft.id)}
                                          title="Delete card"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center space-y-2">
                      <p className="font-terminal text-xs text-red-400">
                        {ankiStatus?.error || "Anki not connected"}
                      </p>
                      <p className="font-terminal text-xs text-muted-foreground">
                        Open Anki with AnkiConnect plugin
                      </p>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="font-terminal text-xs"
                        onClick={() => refetchAnki()}
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Retry
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="space-y-4">
            <Card className="bg-black/40 border-2 border-primary rounded-none h-[600px] flex flex-col">
              <CardHeader className="border-b border-primary/50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="font-arcade text-sm flex items-center gap-2">
                      <MessageCircle className="w-4 h-4" />
                      LLM CHAT
                    </CardTitle>
                    <p className="font-terminal text-xs text-muted-foreground mt-1">
                      Ask questions about your study data
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Obsidian Status */}
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${obsidianStatus?.connected ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className="font-terminal text-xs text-muted-foreground">
                        {obsidianStatus?.connected ? 'Obsidian' : 'Obsidian Offline'}
                      </span>
                    </div>
                    {/* Obsidian Sync Toggle */}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={syncToObsidian}
                        onChange={(e) => setSyncToObsidian(e.target.checked)}
                        disabled={!obsidianStatus?.connected}
                        className="w-4 h-4 accent-primary"
                      />
                      <span className="font-terminal text-xs">Sync Notes</span>
                    </label>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-3">
                    {chatMessages.length === 0 ? (
                      <div className="text-center font-terminal text-xs text-muted-foreground py-8">
                        Start a conversation or upload files.<br />
                        Ask about your study patterns, concepts, or get summaries.
                      </div>
                    ) : (
                      chatMessages.map((msg, i) => (
                        <div key={i} className={`p-3 font-terminal text-sm ${
                          msg.role === "user" 
                            ? "bg-primary/10 border-l-2 border-primary ml-4" 
                            : "bg-secondary/10 border-l-2 border-secondary mr-4"
                        }`}>
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      ))
                    )}
                    {isProcessing && (
                      <div className="p-3 font-terminal text-sm text-muted-foreground animate-pulse bg-secondary/10 border-l-2 border-secondary mr-4">
                        Thinking...
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                </ScrollArea>
                {wrapSummary && (
                  <div className="border-t border-secondary/50 p-3 bg-black/40">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">WRAP</Badge>
                        <span className="font-terminal text-xs text-muted-foreground">
                          Session {wrapSummary.wrapSessionId || wrapSummary.sessionId || "logged"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          Cards: {wrapSummary.cardsCreated}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          Issues: {wrapSummary.issuesLogged}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          Notes: {wrapSummary.obsidianSynced ? "Merged" : "Pending"}
                        </Badge>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="font-terminal text-xs"
                        onClick={() => queryClient.invalidateQueries({ queryKey: ["anki"] })}
                      >
                        Refresh Anki Drafts
                      </Button>
                      {wrapSummary.obsidianPath && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="font-terminal text-xs"
                          onClick={() => navigator.clipboard.writeText(wrapSummary.obsidianPath || "")}
                        >
                          Copy Obsidian Path
                        </Button>
                      )}
                    </div>
                    {wrapSummary.obsidianPath && (
                      <div className="mt-2 font-terminal text-[11px] text-muted-foreground">
                        Obsidian: {wrapSummary.obsidianPath}
                      </div>
                    )}
                  </div>
                )}
                <div className="border-t border-primary/50 p-3">
                  {/* Mode Selector */}
                  <div className="flex gap-2 mb-2">
                    <span className="font-terminal text-xs text-muted-foreground self-center">MODE:</span>
                    {(["all", "obsidian", "anki", "metrics"] as const).map((mode) => (
                      <Button
                        key={mode}
                        variant={brainChatMode === mode ? "default" : "outline"}
                        size="sm"
                        className={`rounded-none font-arcade text-[10px] h-7 px-2 ${
                          brainChatMode === mode ? "bg-primary text-black" : "border-secondary"
                        }`}
                        onClick={() => setBrainChatMode(mode)}
                      >
                        {mode.toUpperCase()}
                      </Button>
                    ))}
                  </div>
                  <div className="flex gap-2 items-center">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept=".txt,.json,.md,.csv"
                      className="hidden"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-none h-10 w-10 shrink-0"
                      onClick={() => fileInputRef.current?.click()}
                      data-testid="button-upload-file"
                      title="Attach file"
                    >
                      <Paperclip className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-none h-10 w-10 shrink-0"
                      onClick={handlePasteWrap}
                      title="Paste WRAP"
                    >
                      <FileText className="w-4 h-4" />
                    </Button>
                    <Textarea
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Type a message or paste WRAP..."
                      className="rounded-none border-secondary bg-black font-terminal text-sm min-h-[40px] max-h-[200px] resize-none overflow-y-auto"
                      rows={Math.min(8, Math.max(1, chatInput.split('\n').length))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      data-testid="input-chat"
                    />
                    <Button
                      size="icon"
                      className="rounded-none bg-primary h-10 w-10 shrink-0"
                      onClick={handleSendMessage}
                      disabled={!chatInput.trim() || isProcessing}
                      data-testid="button-send-chat"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Edit Session Dialog */}
      <Dialog open={editingSession !== null} onOpenChange={() => setEditingSession(null)}>
        <DialogContent className="bg-black border-2 border-primary rounded-none max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-arcade text-primary flex items-center gap-2">
              <Pencil className="w-5 h-5" />
              EDIT SESSION #{editingSession}
            </DialogTitle>
            <DialogDescription className="font-terminal text-muted-foreground">
              Update WRAP methodology fields for this study session
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 font-terminal">
            {/* Mode Select */}
            <div>
              <label className="text-sm text-muted-foreground">Mode</label>
              <Select
                value={editFormData.mode}
                onValueChange={(value) => setEditFormData(prev => ({ ...prev, mode: value }))}
              >
                <SelectTrigger className="rounded-none border-secondary">
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent className="rounded-none border-secondary bg-black">
                  <SelectItem value="Core">Core</SelectItem>
                  <SelectItem value="Sprint">Sprint</SelectItem>
                  <SelectItem value="Drill">Drill</SelectItem>
                  <SelectItem value="study">Study</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Minutes and Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground">Minutes</label>
                <Input
                  type="number"
                  value={editFormData.minutes}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, minutes: e.target.value }))}
                  className="rounded-none border-secondary"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Cards</label>
                <Input
                  type="number"
                  value={editFormData.cards}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, cards: e.target.value }))}
                  className="rounded-none border-secondary"
                />
              </div>
            </div>

            {/* Confusions */}
            <div>
              <label className="text-sm text-muted-foreground">Confusions (comma-separated)</label>
              <Textarea
                value={editFormData.confusions}
                onChange={(e) => setEditFormData(prev => ({ ...prev, confusions: e.target.value }))}
                placeholder="e.g., muscle insertion points, nerve pathways"
                className="rounded-none border-secondary min-h-[60px]"
              />
            </div>

            {/* Weak Anchors */}
            <div>
              <label className="text-sm text-muted-foreground">Weak Anchors (comma-separated)</label>
              <Textarea
                value={editFormData.weakAnchors}
                onChange={(e) => setEditFormData(prev => ({ ...prev, weakAnchors: e.target.value }))}
                placeholder="e.g., brachial plexus diagram, ROM measurements"
                className="rounded-none border-secondary min-h-[60px]"
              />
            </div>

            {/* Concepts */}
            <div>
              <label className="text-sm text-muted-foreground">Concepts (comma-separated)</label>
              <Textarea
                value={editFormData.concepts}
                onChange={(e) => setEditFormData(prev => ({ ...prev, concepts: e.target.value }))}
                placeholder="e.g., upper extremity anatomy, peripheral nerves"
                className="rounded-none border-secondary min-h-[60px]"
              />
            </div>

            {/* Issues */}
            <div>
              <label className="text-sm text-muted-foreground">Issues (comma-separated)</label>
              <Textarea
                value={editFormData.issues}
                onChange={(e) => setEditFormData(prev => ({ ...prev, issues: e.target.value }))}
                placeholder="e.g., interrupted by phone, lost focus after 30 min"
                className="rounded-none border-secondary min-h-[60px]"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="text-sm text-muted-foreground">Notes</label>
              <Textarea
                value={editFormData.notes}
                onChange={(e) => setEditFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Free-form observations about the session"
                className="rounded-none border-secondary min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setEditingSession(null)}
              className="font-terminal rounded-none border-secondary hover:bg-secondary/20"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              className="font-terminal rounded-none bg-primary hover:bg-primary/80"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-black border-2 border-destructive rounded-none">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-arcade text-destructive flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              CONFIRM DELETE
            </AlertDialogTitle>
            <AlertDialogDescription className="font-terminal text-muted-foreground">
              Are you sure you want to delete {sessionsToDelete.length} session{sessionsToDelete.length !== 1 ? 's' : ''}?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="font-terminal rounded-none border-secondary hover:bg-secondary/20">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="font-terminal rounded-none bg-destructive hover:bg-destructive/80 text-destructive-foreground"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Card Draft Dialog */}
      <Dialog open={editingDraft !== null} onOpenChange={() => setEditingDraft(null)}>
        <DialogContent className="bg-black border-2 border-primary rounded-none max-w-lg" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
          <DialogHeader>
            <DialogTitle className="font-arcade text-primary flex items-center gap-2">
              <Pencil className="w-5 h-5" />
              EDIT CARD
            </DialogTitle>
            <DialogDescription className="font-terminal text-muted-foreground">
              Edit card content and select target deck
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 font-terminal">
            {/* Front */}
            <div>
              <label className="text-sm text-muted-foreground">Front (Question)</label>
              <Textarea
                value={editDraftData.front}
                onChange={(e) => setEditDraftData(prev => ({ ...prev, front: e.target.value }))}
                placeholder="Card front..."
                className="rounded-none border-secondary min-h-[80px]"
              />
            </div>

            {/* Back */}
            <div>
              <label className="text-sm text-muted-foreground">Back (Answer)</label>
              <Textarea
                value={editDraftData.back}
                onChange={(e) => setEditDraftData(prev => ({ ...prev, back: e.target.value }))}
                placeholder="Card back..."
                className="rounded-none border-secondary min-h-[80px]"
              />
            </div>

            {/* Deck Selector */}
            <div>
              <label className="text-sm text-muted-foreground">Target Deck</label>
              <Select
                value={editDraftData.deckName}
                onValueChange={(value) => setEditDraftData(prev => ({ ...prev, deckName: value }))}
              >
                <SelectTrigger className="rounded-none border-secondary">
                  <SelectValue placeholder="Select deck" />
                </SelectTrigger>
                <SelectContent className="rounded-none border-secondary bg-black max-h-[200px]">
                  {/* Course-specific decks */}
                  <SelectItem value="PT::EBP">PT::EBP (Evidence Based Practice)</SelectItem>
                  <SelectItem value="PT::ExPhys">PT::ExPhys (Exercise Physiology)</SelectItem>
                  <SelectItem value="PT::MS1">PT::MS1 (Movement Science 1)</SelectItem>
                  <SelectItem value="PT::Neuro">PT::Neuro (Neuroscience)</SelectItem>
                  <SelectItem value="PT::TI">PT::TI (Therapeutic Intervention)</SelectItem>
                  <SelectItem value="PT::General">PT::General</SelectItem>
                  {/* Dynamic decks from Anki */}
                  {ankiStatus?.decks?.filter(d => !d.startsWith("PT::")).map((deck) => (
                    <SelectItem key={deck} value={deck}>
                      {deck}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground mt-1">
                Current: <span className="text-blue-400">{editDraftData.deckName}</span>
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setEditingDraft(null)}
              className="font-terminal rounded-none border-secondary hover:bg-secondary/20"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSaveDraft}
              disabled={updateDraftMutation.isPending}
              className="font-terminal rounded-none bg-primary hover:bg-primary/80"
            >
              <Save className="w-4 h-4 mr-2" />
              {updateDraftMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
