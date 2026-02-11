import { useState, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  TEXT_SECTION_LABEL,
  TEXT_BODY,
  TEXT_MUTED,
  BTN_OUTLINE,
  ICON_SM,
} from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, FileText, X } from "lucide-react";
import { toast } from "sonner";

const ACCEPTED = ".pdf,.md,.docx,.pptx,.txt";

interface MaterialUploaderProps {
  courseId?: number;
  onUploadComplete?: () => void;
}

export function MaterialUploader({ courseId, onUploadComplete }: MaterialUploaderProps) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [queue, setQueue] = useState<File[]>([]);

  const handleFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files).filter((f) => {
      const ext = f.name.split(".").pop()?.toLowerCase();
      return ["pdf", "md", "docx", "pptx", "txt"].includes(ext || "");
    });
    if (arr.length === 0) {
      toast.error("No supported files selected");
      return;
    }
    setQueue((prev) => [...prev, ...arr]);
  }, []);

  const removeFromQueue = (idx: number) => {
    setQueue((prev) => prev.filter((_, i) => i !== idx));
  };

  const uploadAll = useCallback(async () => {
    if (queue.length === 0) return;
    setUploading(true);
    let successes = 0;
    let failures = 0;

    for (const file of queue) {
      try {
        await api.tutor.uploadMaterial(file, { course_id: courseId });
        successes++;
      } catch (err) {
        failures++;
        toast.error(`Failed: ${file.name}`);
      }
    }

    setQueue([]);
    setUploading(false);

    if (successes > 0) {
      toast.success(`${successes} file${successes > 1 ? "s" : ""} uploaded`);
      queryClient.invalidateQueries({ queryKey: ["tutor-materials"] });
      queryClient.invalidateQueries({ queryKey: ["tutor-content-sources"] });
      onUploadComplete?.();
    }
  }, [queue, courseId, queryClient, onUploadComplete]);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  return (
    <div className="space-y-2">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed px-3 py-4 text-center cursor-pointer transition-colors ${
          dragOver
            ? "border-primary bg-primary/10"
            : "border-muted-foreground/20 hover:border-primary/40"
        }`}
      >
        <Upload className={`${ICON_SM} mx-auto mb-1 text-muted-foreground`} />
        <div className={TEXT_MUTED}>Drop files or click to browse</div>
        <div className={`${TEXT_MUTED} opacity-60`}>PDF, DOCX, PPTX, MD, TXT</div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept={ACCEPTED}
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {/* Queue */}
      {queue.length > 0 && (
        <div className="space-y-1">
          {queue.map((file, idx) => (
            <div
              key={`${file.name}-${idx}`}
              className={`flex items-center gap-1.5 px-2 py-0.5 bg-black/40 border border-muted-foreground/10 ${TEXT_BODY}`}
            >
              <FileText className={`${ICON_SM} text-primary shrink-0`} />
              <span className="truncate flex-1">{file.name}</span>
              <span className={`${TEXT_MUTED} shrink-0`}>
                {(file.size / 1024).toFixed(0)}KB
              </span>
              <button
                onClick={() => removeFromQueue(idx)}
                className="text-muted-foreground hover:text-red-400"
              >
                <X className={ICON_SM} />
              </button>
            </div>
          ))}
          <Button
            onClick={uploadAll}
            disabled={uploading}
            variant="outline"
            className={`w-full ${BTN_OUTLINE}`}
          >
            {uploading ? (
              <Loader2 className={`${ICON_SM} animate-spin mr-1`} />
            ) : (
              <Upload className={`${ICON_SM} mr-1`} />
            )}
            UPLOAD {queue.length} FILE{queue.length > 1 ? "S" : ""}
          </Button>
        </div>
      )}
    </div>
  );
}
