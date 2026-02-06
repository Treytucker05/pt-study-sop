import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ObsidianRenderer } from "@/components/ObsidianRenderer";
import { Send, Image, ChevronDown, ChevronUp, X, Loader2, Layers, BrainCircuit, MessageSquare, BookOpen, FileText, CheckCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { BrainOrganizePreviewResponse, BrainChatPayload } from "@/lib/api";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  images?: string[];
  meta?: { cardsCreated?: number; sessionSaved?: boolean; sessionId?: number | null };
}

type ApiContent = string | Array<{ type: string; text?: string; image_url?: { url: string } }>;

function buildApiContent(text: string, images: string[]): ApiContent {
  if (images.length === 0) return text;
  const parts: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];
  for (const img of images) {
    parts.push({ type: "image_url", image_url: { url: img } });
  }
  if (text.trim()) parts.push({ type: "text", text });
  return parts;
}

type Mode = "chat" | "ingest";

const CHATGPT_ANKI_PROMPT = `Generate Anki flashcards from the following study material. Output ONLY a numbered list in this exact format:

1. Front: [question]
Back: [answer]
Tags: [comma-separated tags like: Module1, Obj2, TopicName]

Rules:
- Front = the question only (no module/objective prefixes)
- Back = concise answer
- Tags = include Module#, Obj#, and topic keywords
- One card per concept
- No extra text before or after the list

Study material:
[PASTE YOUR NOTES HERE]`;

type ChecklistState = Record<string, boolean>;

const buildDiffLines = (rawNotes: string, organizedNotes: string) => {
  const raw = rawNotes.split("\n");
  const organized = organizedNotes.split("\n");
  const diff: string[] = [];
  let i = 0;
  let j = 0;

  while (i < raw.length || j < organized.length) {
    const rawLine = raw[i];
    const orgLine = organized[j];
    if (i < raw.length && j < organized.length && rawLine === orgLine) {
      diff.push(` ${rawLine}`);
      i += 1;
      j += 1;
      continue;
    }
    if (i < raw.length) {
      diff.push(`-${rawLine}`);
      i += 1;
    }
    if (j < organized.length) {
      diff.push(`+${orgLine}`);
      j += 1;
    }
  }

  return diff;
};

export function BrainChat() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("chat");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [ingestTarget, setIngestTarget] = useState<"anki" | "obsidian" | "both">("anki");
  const [promptCopied, setPromptCopied] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [rawPreviewNotes, setRawPreviewNotes] = useState("");
  const [organizedPreview, setOrganizedPreview] = useState<BrainOrganizePreviewResponse["organized"] | null>(null);
  const [destinationPreview, setDestinationPreview] = useState<BrainOrganizePreviewResponse["destination"] | null>(null);
  const [selectedDestinationId, setSelectedDestinationId] = useState("");
  const [customDestination, setCustomDestination] = useState("");
  const [checklistState, setChecklistState] = useState<ChecklistState>({});
  const [diffLines, setDiffLines] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const resetPreviewState = () => {
    setPreviewOpen(false);
    setPreviewLoading(false);
    setPreviewError(null);
    setRawPreviewNotes("");
    setOrganizedPreview(null);
    setDestinationPreview(null);
    setSelectedDestinationId("");
    setCustomDestination("");
    setChecklistState({});
    setDiffLines([]);
  };

  const handlePreviewClose = (openState: boolean) => {
    if (!openState) {
      resetPreviewState();
    } else {
      setPreviewOpen(true);
    }
  };

  const startPreview = async (notes: string) => {
    setPreviewLoading(true);
    setPreviewError(null);
    setRawPreviewNotes(notes);
    try {
      const response = await api.brain.organizePreview(notes);
      if (!response.success || !response.organized || !response.destination) {
        throw new Error(response.error || "Unable to organize notes.");
      }
      setOrganizedPreview(response.organized);
      setDestinationPreview(response.destination);
      setSelectedDestinationId("recommended");
      const checklistEntries = response.organized.checklist ?? [];
      const initialChecklist: ChecklistState = {};
      checklistEntries.forEach((item) => {
        initialChecklist[item] = false;
      });
      setChecklistState(initialChecklist);
      setDiffLines(buildDiffLines(notes, response.organized.markdown || ""));
      setPreviewOpen(true);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setPreviewError(msg);
      return false;
    } finally {
      setPreviewLoading(false);
    }
  };

  const toggleChecklist = (item: string) => {
    setChecklistState((prev) => ({
      ...prev,
      [item]: !prev[item],
    }));
  };

  const allChecklistChecked = Object.values(checklistState).length === 0
    ? true
    : Object.values(checklistState).every(Boolean);

  const getSelectedDestinationPath = () => {
    if (!destinationPreview) return "";
    if (selectedDestinationId === "custom") {
      return customDestination.trim();
    }
    const match = destinationPreview.options.find((opt) => opt.id === selectedDestinationId);
    return match?.path || "";
  };

  const handleConfirmPreview = async () => {
    if (!organizedPreview) return;
    const destinationPath = getSelectedDestinationPath();
    if (!destinationPath) {
      setPreviewError("Select a destination path.");
      return;
    }
    setPreviewError(null);
    setPreviewLoading(true);
    setLoading(true);
    try {
      await sendIngest(rawPreviewNotes, {
        destinationPath,
        organizedMarkdown: organizedPreview.markdown,
        organizedTitle: organizedPreview.title,
        confirmWrite: true,
      });
      resetPreviewState();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setPreviewError(msg);
    } finally {
      setPreviewLoading(false);
      setLoading(false);
    }
  };

  const renderDiffLine = (line: string, index: number) => {
    const isAddition = line.startsWith("+");
    const isRemoval = line.startsWith("-");
    const isContext = !isAddition && !isRemoval;

    return (
      <div
        key={index}
        className={`font-terminal text-[11px] px-2 ${
          isAddition
            ? "bg-green-900/30 text-green-400"
            : isRemoval
            ? "bg-red-900/30 text-red-400"
            : "text-muted-foreground"
        }`}
      >
        {line}
      </div>
    );
  };

  const addImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPendingImages((prev) => [...prev, reader.result as string]);
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) addImage(file);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      if (file.type.startsWith("image/")) addImage(file);
    }
    e.target.value = "";
  };

  const sendChat = async (text: string, images: string[]) => {
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    const apiMessages = messages
      .map((m) => ({
        role: m.role,
        content: m.images?.length ? buildApiContent(m.content, m.images) : m.content,
      }))
      .concat([{ role: "user", content: buildApiContent(text, images) }]);

    const response = await fetch("/api/brain/quick-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: apiMessages }),
    });

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    if (!reader) throw new Error("No response body");

    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6);
        if (data === "[DONE]") break;
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: "assistant", content: `Error: ${parsed.error}` };
              return updated;
            });
            return;
          }
          if (parsed.content) {
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              updated[updated.length - 1] = { ...last, content: last.content + parsed.content };
              return updated;
            });
          }
        } catch { /* skip malformed */ }
      }
    }
  };

  const sendIngest = async (
    text: string,
    opts?: {
      destinationPath?: string;
      organizedMarkdown?: string;
      organizedTitle?: string;
      confirmWrite?: boolean;
    }
  ) => {
    try {
      const backendMode = ingestTarget === "both" ? "all" : ingestTarget;
      const sync = ingestTarget === "obsidian" || ingestTarget === "both";
      const payload: BrainChatPayload = {
        message: text,
        syncToObsidian: sync,
        mode: backendMode,
        destinationPath: opts?.destinationPath,
        organizedMarkdown: opts?.organizedMarkdown,
        organizedTitle: opts?.organizedTitle,
        confirmWrite: opts?.confirmWrite,
      };
      const res = await api.brain.chat(payload);
      let summary = res.response;
      const meta: ChatMessage["meta"] = {
        cardsCreated: res.cardsCreated,
        sessionSaved: res.sessionSaved,
        sessionId: res.sessionId,
      };
      const parts: string[] = [];
      if (res.sessionSaved) parts.push(`Session saved (ID: ${res.sessionId})`);
      if (res.cardsCreated) parts.push(`${res.cardsCreated} Anki cards created`);
      if (res.obsidianSynced) parts.push("Synced to Obsidian");
      if (res.obsidianError) parts.push(`Obsidian error: ${res.obsidianError}`);
      if (parts.length > 0) summary = `${parts.join(" | ")}\n\n${summary}`;
      setMessages((prev) => [...prev, { role: "assistant", content: summary, meta }]);

      // Invalidate queries so Brain page cards refresh
      queryClient.invalidateQueries({ queryKey: ["anki", "drafts"] });
      queryClient.invalidateQueries({ queryKey: ["brain", "metrics"] });
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    } catch (err) {
      setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${err}` }]);
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text && pendingImages.length === 0) return;

    const userMsg: ChatMessage = { role: "user", content: text, images: [...pendingImages] };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setPendingImages([]);
    setLoading(true);

    try {
      if (mode === "chat") {
        await sendChat(text, userMsg.images ?? []);
      } else {
        if (ingestTarget === "obsidian" || ingestTarget === "both") {
          const ok = await startPreview(text);
          if (!ok) {
            setMessages((prev) => [...prev, { role: "assistant", content: "Error: Unable to prepare preview." }]);
          }
        } else {
          await sendIngest(text);
        }
      }
    } catch (err) {
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && !last.content) {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: `Error: ${err}` };
          return updated;
        }
        return [...prev, { role: "assistant", content: `Error: ${err}` }];
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-between bg-black/40 border-2 border-primary rounded-none px-4 py-2 mb-4 text-sm text-primary hover:bg-primary/10 transition-colors"
      >
        <span className="font-arcade text-xs tracking-widest uppercase flex items-center gap-2">
          <div className="w-2 h-2 bg-primary inline-block"></div>
          BRAIN CHAT
        </span>
        <ChevronDown className="w-4 h-4" />
      </button>
    );
  }

  return (
    <>
      <Dialog open={previewOpen} onOpenChange={handlePreviewClose}>
        <DialogContent className="max-w-6xl w-full h-[85vh] bg-black border-2 border-primary rounded-none p-4 overflow-hidden">
          <DialogHeader className="space-y-1">
            <DialogTitle className="font-arcade text-sm text-primary flex items-center gap-2">
              <FileText className="w-4 h-4" />
              ORGANIZE + REVIEW
            </DialogTitle>
            <DialogDescription className="font-terminal text-[11px] text-muted-foreground">
              Review the organized notes, compare to raw, then choose where to save.
            </DialogDescription>
          </DialogHeader>

          {previewError && (
            <div className="border border-red-500/50 bg-red-900/20 text-red-200 font-terminal text-xs p-2 rounded-none">
              {previewError}
            </div>
          )}

          <div className="grid grid-cols-3 gap-4 h-[70vh]">
            <div className="col-span-2 flex flex-col gap-3">
              <Tabs defaultValue="preview" className="w-full">
                <TabsList className="grid grid-cols-3 rounded-none">
                  <TabsTrigger value="preview" className="rounded-none text-xs">Preview</TabsTrigger>
                  <TabsTrigger value="raw" className="rounded-none text-xs">Raw</TabsTrigger>
                  <TabsTrigger value="diff" className="rounded-none text-xs">Diff</TabsTrigger>
                </TabsList>
                <TabsContent value="preview" className="mt-2">
                  <ScrollArea className="h-[56vh] border border-secondary/40 rounded-none bg-black/40 p-3">
                    <div className="space-y-2">
                      <div className="font-arcade text-xs text-primary">
                        {organizedPreview?.title || "Untitled"}
                      </div>
                      <ObsidianRenderer content={organizedPreview?.markdown || ""} />
                    </div>
                  </ScrollArea>
                </TabsContent>
                <TabsContent value="raw" className="mt-2">
                  <ScrollArea className="h-[56vh] border border-secondary/40 rounded-none bg-black/40 p-3">
                    <pre className="whitespace-pre-wrap font-terminal text-[11px] text-foreground">
                      {rawPreviewNotes}
                    </pre>
                  </ScrollArea>
                </TabsContent>
                <TabsContent value="diff" className="mt-2">
                  <ScrollArea className="h-[56vh] border border-secondary/40 rounded-none bg-black/40 p-0">
                    <div className="p-2">
                      {diffLines.length === 0 ? (
                        <div className="text-muted-foreground font-terminal text-xs">
                          No diff available.
                        </div>
                      ) : (
                        diffLines.map((line, idx) => renderDiffLine(line, idx))
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </div>

            <div className="col-span-1 flex flex-col gap-3">
              <div className="border border-secondary/50 bg-black/40 p-3 rounded-none">
                <div className="font-arcade text-[10px] text-primary mb-2">DESTINATION</div>
                <RadioGroup value={selectedDestinationId} onValueChange={setSelectedDestinationId} className="space-y-2">
                  {(destinationPreview?.options || []).map((opt) => (
                    <label key={opt.id} className="flex items-start gap-2 cursor-pointer">
                      <RadioGroupItem value={opt.id} className="mt-1" />
                      <div className="space-y-1">
                        <div className="font-terminal text-[11px] text-foreground flex items-center gap-1">
                          {opt.label}
                          {opt.exists && <Badge variant="outline" className="text-[9px]">existing</Badge>}
                        </div>
                        <div className="font-terminal text-[10px] text-muted-foreground break-all">
                          {opt.path || "Custom path"}
                        </div>
                      </div>
                    </label>
                  ))}
                </RadioGroup>
                {selectedDestinationId === "custom" && (
                  <div className="mt-2 space-y-1">
                    <div className="font-terminal text-[10px] text-muted-foreground">Custom path</div>
                    <Input
                      value={customDestination}
                      onChange={(e) => setCustomDestination(e.target.value)}
                      placeholder="School/Theraputic Intervention/Module 01 - Title.md"
                      className="bg-black border-secondary/60 rounded-none text-xs font-terminal"
                    />
                  </div>
                )}
              </div>

              <div className="border border-secondary/50 bg-black/40 p-3 rounded-none">
                <div className="font-arcade text-[10px] text-primary mb-2">REVIEW CHECKLIST</div>
                <div className="space-y-2">
                  {(organizedPreview?.checklist || []).map((item) => (
                    <label key={item} className="flex items-start gap-2 cursor-pointer">
                      <Checkbox checked={Boolean(checklistState[item])} onCheckedChange={() => toggleChecklist(item)} />
                      <span className="font-terminal text-[11px] text-foreground">{item}</span>
                    </label>
                  ))}
                </div>
              </div>

              {(organizedPreview?.suggested_links || []).length > 0 && (
                <div className="border border-secondary/50 bg-black/40 p-3 rounded-none">
                  <div className="font-arcade text-[10px] text-primary mb-2">SUGGESTED LINKS</div>
                  <div className="space-y-1">
                    {organizedPreview?.suggested_links.map((link) => (
                      <div key={link} className="font-terminal text-[11px] text-muted-foreground">
                        [[{link}]]
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 rounded-none font-terminal text-xs"
                  onClick={() => resetPreviewState()}
                  disabled={previewLoading}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-primary hover:bg-primary/80 rounded-none font-terminal text-xs"
                  onClick={handleConfirmPreview}
                  disabled={!allChecklistChecked || previewLoading || !getSelectedDestinationPath()}
                >
                  <CheckCircle className="w-3 h-3 mr-1" />
                  {previewLoading ? "Saving..." : "Confirm & Save"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="bg-black/40 border-2 border-primary rounded-none mb-4">
      <CardHeader className="py-2 px-4 flex flex-row items-center justify-between">
        <CardTitle className="text-xs">BRAIN CHAT</CardTitle>
        <div className="flex items-center gap-1">
          {/* Mode toggle */}
          <div className="flex bg-secondary/40 border border-secondary/60 rounded overflow-hidden mr-2">
            <button
              onClick={() => setMode("chat")}
              className={`flex items-center gap-1 px-2 py-0.5 text-[10px] transition-colors ${mode === "chat" ? "bg-primary/30 text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <MessageSquare className="w-3 h-3" /> CHAT
            </button>
            <button
              onClick={() => setMode("ingest")}
              className={`flex items-center gap-1 px-2 py-0.5 text-[10px] transition-colors ${mode === "ingest" ? "bg-primary/30 text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <BrainCircuit className="w-3 h-3" /> INGEST
            </button>
          </div>
          {mode === "ingest" && (
            <button
              type="button"
              className="bg-primary hover:bg-primary/80 px-2 py-0.5 rounded-none text-[10px] font-terminal"
              onClick={() => {
                navigator.clipboard.writeText(CHATGPT_ANKI_PROMPT);
                setPromptCopied(true);
                setTimeout(() => setPromptCopied(false), 2000);
              }}
            >
              {promptCopied ? "Copied!" : "Copy Prompt for ChatGPT"}
            </button>
          )}
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setOpen(false)}>
            <ChevronUp className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Mode description + Obsidian toggle */}
        <div className="px-4 py-1 border-b border-border flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground">
            {mode === "chat"
              ? "General chat with Gemini Flash — ask anything, paste screenshots"
              : "Study ingestion — paste notes to create Anki cards & save sessions"}
          </p>
          {mode === "ingest" && (
            <div className="flex bg-secondary/40 border border-secondary/60 rounded overflow-hidden">
              {(["anki", "obsidian", "both"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setIngestTarget(t)}
                  className={`flex items-center gap-1 px-2 py-0.5 text-[10px] transition-colors ${ingestTarget === t ? "bg-primary/30 text-primary" : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  {t === "anki" && <><Layers className="w-3 h-3" /> ANKI</>}
                  {t === "obsidian" && <><BookOpen className="w-3 h-3" /> OBSIDIAN</>}
                  {t === "both" && <>BOTH</>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="h-80 overflow-y-auto px-4 py-2 space-y-3">
          {messages.length === 0 && (
            <p className="text-muted-foreground text-xs text-center py-8">
              {mode === "chat"
                ? "Ask anything. Paste screenshots with Ctrl+V."
                : "Paste your study notes to ingest into Brain."}
            </p>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded px-3 py-2 text-base whitespace-pre-wrap ${m.role === "user"
                    ? "bg-primary/20 text-foreground border border-primary/30"
                    : "bg-secondary/40 text-foreground border border-secondary/60"
                  }`}
              >
                {m.images?.map((img, j) => (
                  <img key={j} src={img} alt="attached" className="max-h-32 rounded mb-1" />
                ))}
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-secondary/40 border border-secondary/60 rounded px-3 py-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              </div>
            </div>
          )}
        </div>

        {/* Pending images */}
        {pendingImages.length > 0 && (
          <div className="px-4 py-1 flex gap-2 flex-wrap">
            {pendingImages.map((img, i) => (
              <div key={i} className="relative">
                <img src={img} alt="pending" className="h-12 rounded border border-primary/30" />
                <button
                  onClick={() => setPendingImages((prev) => prev.filter((_, j) => j !== i))}
                  className="absolute -top-1 -right-1 bg-destructive rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="flex items-end gap-2 px-4 py-2 border-t border-border">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
          {mode === "chat" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 shrink-0"
              onClick={() => fileRef.current?.click()}
            >
              <Image className="w-4 h-4 text-primary" />
            </Button>
          )}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={mode === "chat" ? "Ask anything... (Ctrl+V to paste images)" : "Paste study notes to ingest..."}
            rows={mode === "ingest" ? 3 : 1}
            className="flex-1 bg-transparent border border-input rounded px-3 py-1.5 text-base resize-none focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 shrink-0"
            onClick={send}
            disabled={loading}
          >
            <Send className="w-4 h-4 text-primary" />
          </Button>
        </div>
      </CardContent>
    </Card>
    </>
  );
}
