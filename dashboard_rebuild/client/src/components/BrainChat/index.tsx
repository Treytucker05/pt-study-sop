import { useState, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { BrainChatPayload } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

import { ModeToggle } from "./ModeToggle";
import { MessageList } from "./MessageList";
import { PendingImages } from "./PendingImages";
import { ChatInput } from "./ChatInput";
import { PreviewDialog } from "./PreviewDialog";
import { usePreview } from "./usePreview";
import type { ChatMessage, Mode, IngestTarget, ApiContent } from "./types";
import { buildApiContent } from "./types";

export function BrainChat() {
  // Core state
  const [mode, setMode] = useState<Mode>("chat");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [ingestTarget, setIngestTarget] = useState<IngestTarget>("anki");
  const [promptCopied, setPromptCopied] = useState(false);

  // Refs
  const scrollRef = useRef<HTMLDivElement>(null);

  // External hooks
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const preview = usePreview();

  // Image handling
  const addImage = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPendingImages((prev) => [...prev, reader.result as string]);
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) addImage(file);
        }
      }
    },
    [addImage]
  );

  const handleImageSelect = useCallback(
    (files: FileList) => {
      for (const file of Array.from(files)) {
        if (file.type.startsWith("image/")) addImage(file);
      }
    },
    [addImage]
  );

  const removeImage = useCallback((index: number) => {
    setPendingImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Chat sending
  const sendChat = useCallback(
    async (text: string, images: string[]) => {
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      const apiMessages = messages
        .map((m) => ({
          role: m.role,
          content: m.images?.length
            ? buildApiContent(m.content, m.images)
            : m.content,
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
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: `Error: ${parsed.error}`,
                };
                return updated;
              });
              return;
            }
            if (parsed.content) {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                updated[updated.length - 1] = {
                  ...last,
                  content: last.content + parsed.content,
                };
                return updated;
              });
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    },
    [messages]
  );

  // Ingest sending
  const sendIngest = useCallback(
    async (
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
        const errorMsg = err instanceof Error ? err.message : String(err);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Error: ${errorMsg}` },
        ]);
        toast({
          title: "Ingest failed",
          description: errorMsg,
          variant: "destructive",
        });
      }
    },
    [ingestTarget, queryClient, toast]
  );

  // Main send handler
  const send = useCallback(async () => {
    const text = input.trim();
    if (!text && pendingImages.length === 0) return;

    const userMsg: ChatMessage = {
      role: "user",
      content: text,
      images: [...pendingImages],
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setPendingImages([]);
    setLoading(true);

    try {
      if (mode === "chat") {
        await sendChat(text, userMsg.images ?? []);
      } else {
        if (ingestTarget === "obsidian" || ingestTarget === "both") {
          const ok = await preview.startPreview(text);
          if (!ok) {
            setMessages((prev) => [
              ...prev,
              { role: "assistant", content: "Error: Unable to prepare preview." },
            ]);
          }
        } else {
          await sendIngest(text);
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && !last.content) {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: `Error: ${errorMsg}`,
          };
          return updated;
        }
        return [...prev, { role: "assistant", content: `Error: ${errorMsg}` }];
      });
    } finally {
      setLoading(false);
    }
  }, [input, pendingImages, mode, ingestTarget, sendChat, sendIngest, preview]);

  // Preview confirmation
  const handleConfirmPreview = useCallback(async () => {
    if (!preview.organized) return;

    const destinationPath = preview.getSelectedDestinationPath();
    if (!destinationPath) {
      preview.setOpen(false);
      toast({
        title: "Error",
        description: "Select a destination path.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await sendIngest(preview.rawNotes, {
        destinationPath,
        organizedMarkdown: preview.organized.markdown,
        organizedTitle: preview.organized.title,
        confirmWrite: true,
      });
      preview.reset();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({
        title: "Save failed",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [preview, sendIngest, toast]);

  return (
    <div className="flex flex-col h-full">
      <ModeToggle
        mode={mode}
        setMode={setMode}
        ingestTarget={ingestTarget}
        setIngestTarget={setIngestTarget}
        promptCopied={promptCopied}
        setPromptCopied={setPromptCopied}
      />

      <MessageList
        messages={messages}
        loading={loading}
        mode={mode}
        scrollRef={scrollRef}
      />

      <PendingImages images={pendingImages} onRemove={removeImage} />

      <ChatInput
        input={input}
        setInput={setInput}
        onSend={send}
        onImageSelect={handleImageSelect}
        onPaste={handlePaste}
        loading={loading}
        mode={mode}
      />

      <PreviewDialog
        open={preview.open}
        onOpenChange={(open) => {
          if (!open) preview.reset();
          else preview.setOpen(true);
        }}
        loading={preview.loading}
        error={preview.error}
        rawNotes={preview.rawNotes}
        organized={preview.organized}
        destination={preview.destination}
        selectedDestinationId={preview.selectedDestinationId}
        setSelectedDestinationId={preview.setSelectedDestinationId}
        customDestination={preview.customDestination}
        setCustomDestination={preview.setCustomDestination}
        checklistState={preview.checklistState}
        onToggleChecklist={preview.toggleChecklist}
        diffLines={preview.diffLines}
        onConfirm={handleConfirmPreview}
        onCancel={preview.reset}
      />
    </div>
  );
}
