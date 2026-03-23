import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export interface NotesPanelProps {
  initialContent?: string;
  onContentChange?: (content: string) => void;
  onSendToPacket?: (item: { type: "note"; title: string; content: string }) => void;
}

const BTN_CLASSES =
  "px-3 py-1.5 rounded-sm border border-primary/30 bg-background/80 font-terminal text-xs tracking-wider text-primary/80 uppercase hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed";

export function NotesPanel({
  initialContent = "",
  onContentChange,
  onSendToPacket,
}: NotesPanelProps): React.JSX.Element {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState(initialContent);

  const handleContentChange = (value: string): void => {
    setContent(value);
    onContentChange?.(value);
  };

  const handleSendToPacket = (): void => {
    onSendToPacket?.({ type: "note", title, content });
  };

  const canSend = title.trim().length > 0 || content.trim().length > 0;

  return (
    <div className="flex flex-col gap-3 h-full">
      <h2 className="font-terminal text-sm tracking-wider text-primary/80 uppercase">
        NOTES
      </h2>

      <Input
        placeholder="Note title..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        aria-label="Note title"
      />

      <Textarea
        className="flex-1 resize-none"
        placeholder="Type your notes here..."
        value={content}
        onChange={(e) => handleContentChange(e.target.value)}
        aria-label="Note content"
      />

      {onSendToPacket && (
        <button
          type="button"
          className={BTN_CLASSES}
          disabled={!canSend}
          onClick={handleSendToPacket}
        >
          Send to Packet
        </button>
      )}
    </div>
  );
}
