import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Send, Image } from "lucide-react";
import type { Mode } from "./types";

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  onSend: () => void;
  onImageSelect: (files: FileList) => void;
  onPaste: (e: React.ClipboardEvent) => void;
  loading: boolean;
  mode: Mode;
}

export function ChatInput({
  input,
  setInput,
  onSend,
  onImageSelect,
  onPaste,
  loading,
  mode,
}: ChatInputProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    onImageSelect(files);
    e.target.value = "";
  };

  return (
    <div className="flex items-end gap-2 px-4 py-2 border-t border-primary/30 shrink-0">
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
          aria-label="Attach image"
        >
          <Image className="w-4 h-4 text-primary" />
        </Button>
      )}

      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={onPaste}
        placeholder={
          mode === "chat"
            ? "Ask anything... (Ctrl+V to paste images)"
            : "Paste study notes to ingest..."
        }
        rows={mode === "ingest" ? 3 : 1}
        className="flex-1 bg-black/60 border-2 border-muted-foreground/20 rounded-none px-3 py-1.5 text-sm font-terminal resize-none focus:outline-none focus:ring-1 focus:ring-ring"
      />

      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 shrink-0"
        onClick={onSend}
        disabled={loading}
        aria-label="Send message"
      >
        <Send className="w-4 h-4 text-primary" />
      </Button>
    </div>
  );
}
