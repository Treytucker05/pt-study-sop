import { useState, useRef, useCallback, useMemo, useEffect } from "react";
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
import { Loader2, FileText, Upload, Trash2, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";
import type { Course } from "@shared/schema";

const ACCEPTED_EXTENSIONS = ".pdf,.docx,.pptx,.md,.txt,.mp4";

const FILE_TYPE_ICONS: Record<string, string> = {
  pdf: "PDF",
  docx: "DOC",
  pptx: "PPT",
  md: "MD",
  txt: "TXT",
  mp4: "MP4",
};

function getMaterialTypeLabel(fileType: string | null | undefined): string {
  const normalizedRaw = (fileType || "").toLowerCase().trim();
  const normalized = ["", "null", "none"].includes(normalizedRaw) ? "" : normalizedRaw;
  return FILE_TYPE_ICONS[normalized] || (normalized ? normalized.toUpperCase() : "FILE");
}

function getFileNameFromPath(path: string | null | undefined): string {
  if (!path) return "";
  // Handle both Windows and Unix paths
  const normalized = path.replace(/\\/g, "/");
  const lastSlash = normalized.lastIndexOf("/");
  return lastSlash >= 0 ? normalized.slice(lastSlash + 1) : normalized;
}

interface MaterialSelectorProps {
  courseId?: number;
  selectedMaterials: number[];
  setSelectedMaterials: (ids: number[]) => void;
}

interface MaterialVideoJobState {
  jobId: string;
  status: "pending" | "running" | "completed" | "failed";
  phase?: string;
  lastError?: string | null;
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

  const [deleting, setDeleting] = useState(false);
  const [moving, setMoving] = useState(false);
  const [processingVideos, setProcessingVideos] = useState(false);
  const [videoJobsByMaterial, setVideoJobsByMaterial] = useState<Record<number, MaterialVideoJobState>>({});

  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ["courses-active"],
    queryFn: () => api.courses.getActive(),
  });

  const { data: materials = [], isLoading } = useQuery<Material[]>({
    queryKey: ["tutor-materials", courseId],
    queryFn: () => api.tutor.getMaterials(courseId ? { course_id: courseId } : undefined),
  });

  // Server returns filtered materials when courseId is provided
  const courseMaterials = useMemo(() => materials, [materials]);
  const otherMaterials = useMemo(() => [], [materials]);
  const [showOther, setShowOther] = useState(false);

  // Checksums that appear on more than one material
  const dupeChecksums = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of materials) {
      const cs = m.checksum;
      if (cs) counts.set(cs, (counts.get(cs) || 0) + 1);
    }
    const dupes = new Set<string>();
    for (const [cs, count] of counts) {
      if (count > 1) dupes.add(cs);
    }
    return dupes;
  }, [materials]);

  const selectedVideoIds = useMemo(() => {
    const selected = new Set(selectedMaterials);
    return courseMaterials
      .filter((m) => selected.has(m.id) && (m.file_type || "").toLowerCase() === "mp4")
      .map((m) => m.id);
  }, [courseMaterials, selectedMaterials]);

  const handleUpload = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    setUploading(true);
    let successes = 0;
    let failures = 0;

    for (const file of files) {
      try {
        const result = await api.tutor.uploadMaterial(file, { course_id: courseId });
        successes++;
        if (result.duplicate_of) {
          toast.warning(`File matches existing: ${result.duplicate_of.title}`);
        }
      } catch (err) {
        failures++;
        toast.error(`Failed: ${file.name}`);
      }
    }

    setUploading(false);
    if (successes > 0) {
      toast.success(`${successes} file${successes > 1 ? "s" : ""} uploaded`);
      queryClient.invalidateQueries({ queryKey: ["tutor-materials"] });
    }
  }, [courseId, queryClient]);

  const handleDeleteSelected = useCallback(async () => {
    if (selectedMaterials.length === 0) return;
    const count = selectedMaterials.length;
    if (!window.confirm(`Delete ${count} selected material${count > 1 ? "s" : ""}?`)) return;

    setDeleting(true);
    let deleted = 0;
    for (const id of selectedMaterials) {
      try {
        await api.tutor.deleteMaterial(id);
        deleted++;
      } catch {
        toast.error(`Failed to delete material ${id}`);
      }
    }
    setDeleting(false);

    if (deleted > 0) {
      toast.success(`${deleted} material${deleted > 1 ? "s" : ""} deleted`);
      setSelectedMaterials([]);
      queryClient.invalidateQueries({ queryKey: ["tutor-materials"] });
    }
  }, [selectedMaterials, setSelectedMaterials, courseId, queryClient]);

  const handleMoveSelected = useCallback(async (targetCourseId: number) => {
    if (selectedMaterials.length === 0) return;
    const targetCourse = courses.find((c) => c.id === targetCourseId);
    const label = targetCourse?.code || targetCourse?.name || `Course ${targetCourseId}`;

    setMoving(true);
    let moved = 0;
    for (const id of selectedMaterials) {
      try {
        await api.tutor.updateMaterial(id, { course_id: targetCourseId });
        moved++;
      } catch {
        toast.error(`Failed to move material ${id}`);
      }
    }
    setMoving(false);

    if (moved > 0) {
      toast.success(`${moved} material${moved > 1 ? "s" : ""} moved to ${label}`);
      setSelectedMaterials([]);
      queryClient.invalidateQueries({ queryKey: ["tutor-materials"] });
    }
  }, [selectedMaterials, setSelectedMaterials, courses, queryClient]);

  const handleProcessSelectedVideos = useCallback(async () => {
    if (selectedVideoIds.length === 0) {
      toast.error("Select at least one MP4 material first");
      return;
    }

    setProcessingVideos(true);
    let started = 0;
    for (const materialId of selectedVideoIds) {
      try {
        const start = await api.tutor.processVideoMaterial(materialId, {
          model_size: "base",
          keyframe_interval_sec: 20,
        });
        setVideoJobsByMaterial((prev) => ({
          ...prev,
          [materialId]: {
            jobId: start.job_id,
            status: "pending",
            phase: "pending",
            lastError: null,
          },
        }));
        started++;
      } catch (err) {
        toast.error(`Failed to start video processing for material ${materialId}`);
      }
    }

    setProcessingVideos(false);
    if (started > 0) {
      toast.success(`Started video processing for ${started} item${started > 1 ? "s" : ""}`);
    }
  }, [selectedVideoIds]);

  useEffect(() => {
    const activeEntries = Object.entries(videoJobsByMaterial).filter(
      ([, job]) => job.status === "pending" || job.status === "running",
    );
    if (activeEntries.length === 0) return;

    let cancelled = false;
    let polling = false;
    const poll = async () => {
      if (polling || cancelled) return;
      polling = true;
      try {
        const updates = await Promise.all(
          activeEntries.map(async ([materialId, job]) => {
            const latest = await api.tutor.getVideoProcessStatus(job.jobId);
            return {
              materialId: Number(materialId),
              status: latest.status,
              phase: latest.phase,
              lastError: latest.last_error ?? null,
            };
          }),
        );

        if (cancelled) return;

        setVideoJobsByMaterial((prev) => {
          const next = { ...prev };
          for (const update of updates) {
            const existing = next[update.materialId];
            if (!existing) continue;
            const previousStatus = existing.status;
            next[update.materialId] = {
              ...existing,
              status: update.status,
              phase: update.phase,
              lastError: update.lastError,
            };

            if (
              previousStatus !== "completed" &&
              previousStatus !== "failed" &&
              update.status === "completed"
            ) {
              toast.success(`Video processing complete (material ${update.materialId})`);
              queryClient.invalidateQueries({ queryKey: ["tutor-materials"] });
            }
            if (
              previousStatus !== "completed" &&
              previousStatus !== "failed" &&
              update.status === "failed"
            ) {
              toast.error(
                update.lastError
                  ? `Video processing failed (${update.materialId}): ${update.lastError}`
                  : `Video processing failed (${update.materialId})`,
              );
            }
          }
          return next;
        });
      } catch {
        // ignore transient polling errors
      } finally {
        polling = false;
      }
    };

    void poll();
    const id = window.setInterval(poll, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [videoJobsByMaterial, queryClient]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) handleUpload(files);
  }, [handleUpload]);

  const onFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) handleUpload(files);
    e.target.value = "";
  }, [handleUpload]);

  const toggle = (id: number) => {
    const isSelecting = !selectedMaterials.includes(id);
    setSelectedMaterials(
      isSelecting
        ? [...selectedMaterials, id]
        : selectedMaterials.filter((m) => m !== id)
    );
    if (isSelecting) {
      toast.success("Material selected");
    } else {
      toast.success("Material removed");
    }
  };

  const toggleAll = () => {
    const target = courseId ? courseMaterials : materials;
    if (selectedMaterials.length === target.length) {
      setSelectedMaterials([]);
      toast.success("Cleared all materials");
    } else {
      setSelectedMaterials(target.map((m) => m.id));
      toast.success("Selected all materials");
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
      className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 border-2 border-dashed transition-colors font-terminal text-xs ${dragOver
          ? "border-primary bg-primary/10 text-primary"
          : "border-primary/30 bg-black/20 text-muted-foreground hover:border-primary/50 hover:text-foreground"
        } ${uploading ? "opacity-50 cursor-wait" : "cursor-pointer"}`}
    >
      {uploading ? (
        <Loader2 className={`${ICON_SM} animate-spin`} />
      ) : (
        <Upload className={ICON_SM} />
      )}
      <span>{uploading ? "Uploading..." : "Drop files or click to upload"}</span>
      <span className="text-muted-foreground/50">PDF, DOCX, PPTX, MD, TXT, MP4</span>
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        multiple
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

  if (courseMaterials.length === 0 && otherMaterials.length === 0) {
    return (
      <div className="space-y-2">
        {uploadZone}
        <div className={`${TEXT_MUTED} text-center py-2`}>
          No materials uploaded yet
        </div>
      </div>
    );
  }

  const renderRow = (mat: Material) => (
    <label
      key={mat.id}
      className={`flex items-center gap-2 px-2 py-1.5 ${TEXT_BODY} text-muted-foreground hover:text-foreground cursor-pointer w-full`}
    >
      <Checkbox
        checked={selectedMaterials.includes(mat.id)}
        onCheckedChange={() => toggle(mat.id)}
        className="w-3 h-3 shrink-0 shadow-none"
      />
      <FileText className={`${ICON_SM} text-primary/60 shrink-0`} />
      <span
        className="truncate min-w-0 flex-1 max-w-[200px]"
        title={getFileNameFromPath(mat.title) || `Material ${mat.id}`}
      >
        {getFileNameFromPath(mat.title) || `Material ${mat.id}`}
      </span>
      {mat.checksum && dupeChecksums.has(mat.checksum) && (
        <Badge variant="outline" className={`${TEXT_BADGE} h-4 px-1 shrink-0 border-yellow-500/50 text-yellow-400`}>
          DUPE
        </Badge>
      )}
      <Badge variant="outline" className={`${TEXT_BADGE} h-4 px-1 shrink-0`}>
        {getMaterialTypeLabel(mat.file_type)}
      </Badge>
      {(mat.file_type || "").toLowerCase() === "mp4" && videoJobsByMaterial[mat.id] && (
        <Badge
          variant="outline"
          className={`${TEXT_BADGE} h-4 px-1 shrink-0 ${
            videoJobsByMaterial[mat.id].status === "completed"
              ? "border-green-500/60 text-green-400"
              : videoJobsByMaterial[mat.id].status === "failed"
                ? "border-red-500/60 text-red-400"
                : "border-blue-500/60 text-blue-300"
          }`}
        >
          {videoJobsByMaterial[mat.id].status.toUpperCase()}
        </Badge>
      )}
    </label>
  );

  return (
    <div className="space-y-1 w-full overflow-hidden">
      {/* Upload zone */}
      {uploadZone}

      {/* Select all + delete */}
      <div className="flex items-center gap-1.5 px-1 py-0.5 mt-1 border-b border-muted-foreground/10 pb-1">
        <label className={`flex items-center gap-1.5 flex-1 ${TEXT_BODY} text-muted-foreground hover:text-foreground cursor-pointer`}>
          <Checkbox
            checked={courseMaterials.length > 0 && selectedMaterials.length === courseMaterials.length}
            onCheckedChange={toggleAll}
            className="w-3 h-3 shadow-none"
          />
          <span>Select all</span>
          <Badge variant="outline" className={`ml-auto ${TEXT_BADGE} h-4 px-1`}>
            {selectedMaterials.length}/{courseMaterials.length}
          </Badge>
        </label>
        {selectedMaterials.length > 0 && (
          <div className="flex items-center gap-1">
            {selectedVideoIds.length > 0 && (
              <button
                type="button"
                onClick={handleProcessSelectedVideos}
                disabled={processingVideos}
                className={`flex items-center gap-1 px-1.5 py-0.5 font-terminal text-xs text-blue-300 hover:text-blue-200 hover:bg-blue-500/10 border border-blue-500/30 transition-colors ${
                  processingVideos ? "opacity-50 cursor-wait" : ""
                }`}
              >
                {processingVideos ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Upload className="w-3 h-3" />
                )}
                Process MP4 ({selectedVideoIds.length})
              </button>
            )}
            {/* Move to course */}
            <div className="relative flex items-center">
              {moving && <Loader2 className="w-3 h-3 animate-spin text-primary absolute -left-4" />}
              <select
                disabled={moving || courses.length === 0}
                value=""
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (val) handleMoveSelected(val);
                }}
                className="appearance-none bg-black/40 border border-primary/30 text-primary font-terminal text-xs px-1.5 py-0.5 pr-5 cursor-pointer hover:border-primary/50 focus:outline-none focus:border-primary disabled:opacity-50 disabled:cursor-wait"
              >
                <option value="" disabled>
                  Move ({selectedMaterials.length})
                </option>
                {courses
                  .filter((c) => c.id !== courseId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code || c.name}
                    </option>
                  ))}
              </select>
              <ArrowRightLeft className="w-3 h-3 text-primary/50 absolute right-1 pointer-events-none" />
            </div>
            {/* Delete */}
            <button
              type="button"
              onClick={handleDeleteSelected}
              disabled={deleting}
              className={`flex items-center gap-1 px-1.5 py-0.5 font-terminal text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/30 transition-colors ${deleting ? "opacity-50 cursor-wait" : ""
                }`}
            >
              {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
              Del
            </button>
          </div>
        )}
      </div>

      {/* Course-matched materials */}
      {courseMaterials.length > 0 ? (
        courseMaterials.map(renderRow)
      ) : courseId ? (
        <div className={`${TEXT_MUTED} text-center py-2 text-xs`}>
          No materials linked to this course yet
        </div>
      ) : null}

      {/* Other materials (collapsed by default) */}
      {otherMaterials.length > 0 && (
        <details open={showOther} onToggle={(e) => setShowOther((e.target as HTMLDetailsElement).open)}>
          <summary className={`${TEXT_BODY} px-1 py-0.5 text-muted-foreground hover:text-foreground cursor-pointer border-t border-muted-foreground/10 mt-1 pt-1`}>
            <span className="font-terminal text-xs">
              Other materials ({otherMaterials.length})
            </span>
          </summary>
          <div className="mt-0.5">
            {otherMaterials.map(renderRow)}
          </div>
        </details>
      )}
    </div>
  );
}
