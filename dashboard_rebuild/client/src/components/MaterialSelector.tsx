import { useState, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Material } from "@/lib/api";
import {
  TEXT_BODY,
  TEXT_MUTED,
  TEXT_BADGE,
  ICON_SM,
} from "@/lib/theme";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, Upload } from "lucide-react";
import { toast } from "sonner";

const ACCEPTED_EXTENSIONS = ".pdf,.docx,.pptx,.md,.txt";

const FILE_TYPE_ICONS: Record<string, string> = {
  pdf: "PDF",
  docx: "DOC",
  pptx: "PPT",
  md: "MD",
  txt: "TXT",
};

function getMaterialTypeLabel(fileType: string | null | undefined): string {
  const normalizedRaw = (fileType || "").toLowerCase().trim();
  const normalized = ["", "null", "none"].includes(normalizedRaw) ? "" : normalizedRaw;
  return FILE_TYPE_ICONS[normalized] || (normalized ? normalized.toUpperCase() : "FILE");
}

interface MaterialSelectorProps {
  courseId?: number;
  selectedMaterials: number[];
  setSelectedMaterials: (ids: number[]) => void;
}

export function MaterialSelector({
  courseId,
  selectedMaterials,
  setSelectedMaterials,
}: MaterialSelectorProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const { data: materials = [], isLoading } = useQuery<Material[]>({
    queryKey: ["tutor-materials", courseId],
    queryFn: () => api.tutor.getMaterials(courseId ? { course_id: courseId } : undefined),
  });

  const handleUpload = useCallback(async (file: File) => {
    setUploading(true);
    try {
      await api.tutor.uploadMaterial(file, { course_id: courseId });
      toast.success(`Uploaded: ${file.name}`);
      queryClient.invalidateQueries({ queryKey: ["tutor-materials", courseId] });
    } catch (err) {
      toast.error(`Upload failed: ${err instanceof Error ? err.message : "Unknown"}`);
    } finally {
      setUploading(false);
    }
  }, [courseId, queryClient]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }, [handleUpload]);

  const onFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = "";
  }, [handleUpload]);

  const toggle = (id: number) => {
    setSelectedMaterials(
      selectedMaterials.includes(id)
        ? selectedMaterials.filter((m) => m !== id)
        : [...selectedMaterials, id]
    );
  };

  const toggleAll = () => {
    if (selectedMaterials.length === materials.length) {
      setSelectedMaterials([]);
    } else {
      setSelectedMaterials(materials.map((m) => m.id));
    }
  };

  // Upload dropzone
  const uploadZone = (
    <button
      type="button"
      onClick={() => fileInputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      disabled={uploading}
      className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 border-2 border-dashed transition-colors font-terminal text-xs ${
        dragOver
          ? "border-primary bg-primary/10 text-primary"
          : "border-primary/30 bg-black/20 text-muted-foreground hover:border-primary/50 hover:text-foreground"
      } ${uploading ? "opacity-50 cursor-wait" : "cursor-pointer"}`}
    >
      {uploading ? (
        <Loader2 className={`${ICON_SM} animate-spin`} />
      ) : (
        <Upload className={ICON_SM} />
      )}
      <span>{uploading ? "Uploading..." : "Drop file or click to upload"}</span>
      <span className="text-muted-foreground/50">PDF, DOCX, PPTX, MD, TXT</span>
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        onChange={onFileSelect}
        className="hidden"
      />
    </button>
  );

  if (isLoading) {
    return (
      <div className="space-y-2">
        {uploadZone}
        <div className="flex items-center justify-center py-3">
          <Loader2 className={`${ICON_SM} animate-spin text-muted-foreground`} />
        </div>
      </div>
    );
  }

  if (materials.length === 0) {
    return (
      <div className="space-y-2">
        {uploadZone}
        <div className={`${TEXT_MUTED} text-center py-2`}>
          No materials uploaded yet
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Upload zone */}
      {uploadZone}

      {/* Select all */}
      <label className={`flex items-center gap-1.5 px-1 py-0.5 mt-1 ${TEXT_BODY} text-muted-foreground hover:text-foreground cursor-pointer border-b border-muted-foreground/10 pb-1`}>
        <Checkbox
          checked={materials.length > 0 && selectedMaterials.length === materials.length}
          onCheckedChange={toggleAll}
          className="w-3 h-3"
        />
        <span>Select all</span>
        <Badge variant="outline" className={`ml-auto ${TEXT_BADGE} h-4 px-1`}>
          {selectedMaterials.length}/{materials.length}
        </Badge>
      </label>

      {/* Material list */}
      {materials.map((mat) => (
        <label
          key={mat.id}
          className={`flex items-center gap-1.5 px-1 py-0.5 ${TEXT_BODY} text-muted-foreground hover:text-foreground cursor-pointer`}
        >
          <Checkbox
            checked={selectedMaterials.includes(mat.id)}
            onCheckedChange={() => toggle(mat.id)}
            className="w-3 h-3"
          />
          <FileText className={`${ICON_SM} text-primary/60 shrink-0`} />
          <span className="truncate flex-1">{(mat.title || `Material ${mat.id}`).trim() || `Material ${mat.id}`}</span>
          <Badge variant="outline" className={`${TEXT_BADGE} h-4 px-1 shrink-0`}>
            {getMaterialTypeLabel(mat.file_type)}
          </Badge>
        </label>
      ))}
    </div>
  );
}
