import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Send, Image, ChevronDown, ChevronUp, X, Loader2, Layers, BrainCircuit, MessageSquare, BookOpen } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

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

export function BrainChat() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("chat");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [ingestTarget, setIngestTarget] = useState<"anki" | "obsidian" | "both">("anki");
  const [promptCopied, setPromptCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

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

  const sendIngest = async (text: string) => {
    try {
      const backendMode = ingestTarget === "both" ? "all" : ingestTarget;
      const sync = ingestTarget === "obsidian" || ingestTarget === "both";
      const res = await api.brain.chat(text, sync, backendMode);
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
        await sendIngest(text);
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
  );
}
