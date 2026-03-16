import { useReducer, useRef, useCallback, useMemo, useEffect, type ChangeEvent, type DragEvent, type RefObject } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Material, TutorVideoEnrichmentStatus } from "@/lib/api";
import {
  TEXT_BODY,
  TEXT_MUTED,
  TEXT_BADGE,
  ICON_SM,
} from "@/lib/theme";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, Upload, Trash2, ArrowRightLeft, Sparkles } from "lucide-react";
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

type MaterialSelectorState = {
  uploading: boolean;
  dragOver: boolean;
  deleting: boolean;
  moving: boolean;
  processingVideos: boolean;
  enrichingVideos: boolean;
  videoJobsByMaterial: Record<number, MaterialVideoJobState>;
  videoPollingPaused: boolean;
};

type MaterialSelectorPatch =
  | Partial<MaterialSelectorState>
  | ((state: MaterialSelectorState) => Partial<MaterialSelectorState>);

function createMaterialSelectorState(): MaterialSelectorState {
  return {
    uploading: false,
    dragOver: false,
    deleting: false,
    moving: false,
    processingVideos: false,
    enrichingVideos: false,
    videoJobsByMaterial: {},
    videoPollingPaused: false,
  };
}

function materialSelectorReducer(
  state: MaterialSelectorState,
  patch: MaterialSelectorPatch,
): MaterialSelectorState {
  const nextPatch = typeof patch === "function" ? patch(state) : patch;
  return { ...state, ...nextPatch };
}

function MaterialUploadZone({
  fileInputRef,
  uploading,
  dragOver,
  onOpen,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileSelect,
}: {
  fileInputRef: RefObject<HTMLInputElement | null>;
  uploading: boolean;
  dragOver: boolean;
  onOpen: () => void;
  onDragOver: (e: DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: DragEvent) => void;
  onFileSelect: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
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
}

type MaterialUploadZoneProps = {
  fileInputRef: RefObject<HTMLInputElement | null>;
  uploading: boolean;
  dragOver: boolean;
  onOpen: () => void;
  onDragOver: (e: DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: DragEvent) => void;
  onFileSelect: (e: ChangeEvent<HTMLInputElement>) => void;
};

function MaterialSelectorLoadingState({
  uploadZoneProps,
}: {
  uploadZoneProps: MaterialUploadZoneProps;
}) {
  return (
    <div className="space-y-2">
      <MaterialUploadZone {...uploadZoneProps} />
      <div className="flex items-center justify-center py-3">
        <Loader2 className={`${ICON_SM} animate-spin text-muted-foreground`} />
      </div>
    </div>
  );
}

function MaterialSelectorEmptyState({
  uploadZoneProps,
}: {
  uploadZoneProps: MaterialUploadZoneProps;
}) {
  return (
    <div className="space-y-2">
      <MaterialUploadZone {...uploadZoneProps} />
      <div className={`${TEXT_MUTED} text-center py-2`}>
        No materials uploaded yet
      </div>
    </div>
  );
}

function MaterialSelectionToolbar({
  courseMaterialsCount,
  selectedCount,
  selectedVideoIds,
  enrichableVideoIds,
  moving,
  deleting,
  processingVideos,
  enrichingVideos,
  courses,
  courseId,
  onToggleAll,
  onProcessVideos,
  onEnrichVideos,
  onMoveSelected,
  onDeleteSelected,
}: {
  courseMaterialsCount: number;
  selectedCount: number;
  selectedVideoIds: number[];
  enrichableVideoIds: number[];
  moving: boolean;
  deleting: boolean;
  processingVideos: boolean;
  enrichingVideos: boolean;
  courses: Course[];
  courseId?: number;
  onToggleAll: () => void;
  onProcessVideos: () => void;
  onEnrichVideos: () => void;
  onMoveSelected: (targetCourseId: number) => void;
  onDeleteSelected: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5 px-1 py-0.5 mt-1 border-b border-muted-foreground/10 pb-1">
      <label className={`flex items-center gap-1.5 flex-1 ${TEXT_BODY} text-muted-foreground hover:text-foreground cursor-pointer`}>
        <Checkbox
          checked={courseMaterialsCount > 0 && selectedCount === courseMaterialsCount}
          onCheckedChange={onToggleAll}
          className="w-3 h-3 shadow-none"
        />
        <span>Select all</span>
        <Badge variant="outline" className={`ml-auto ${TEXT_BADGE} h-4 px-1`}>
          {selectedCount}/{courseMaterialsCount}
        </Badge>
      </label>
      {selectedCount > 0 && (
        <div className="flex items-center gap-1">
          {selectedVideoIds.length > 0 && (
            <button
              type="button"
              onClick={onProcessVideos}
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
          {enrichableVideoIds.length > 0 && (
            <button
              type="button"
              onClick={onEnrichVideos}
              disabled={enrichingVideos}
              className={`flex items-center gap-1 px-1.5 py-0.5 font-terminal text-xs text-purple-300 hover:text-purple-200 hover:bg-purple-500/10 border border-purple-500/30 transition-colors ${
                enrichingVideos ? "opacity-50 cursor-wait" : ""
              }`}
            >
              {enrichingVideos ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Sparkles className="w-3 h-3" />
              )}
              Enrich ({enrichableVideoIds.length})
            </button>
          )}
          <div className="relative flex items-center">
            {moving && <Loader2 className="w-3 h-3 animate-spin text-primary absolute -left-4" />}
            <select
              disabled={moving || courses.length === 0}
              value=""
              onChange={(e) => {
                const value = Number(e.target.value);
                if (value) onMoveSelected(value);
              }}
              className="appearance-none bg-black/40 border border-primary/30 text-primary font-terminal text-xs px-1.5 py-0.5 pr-5 cursor-pointer hover:border-primary/50 focus:outline-none focus:border-primary disabled:opacity-50 disabled:cursor-wait"
            >
              <option value="" disabled>
                Move ({selectedCount})
              </option>
              {courses
                .filter((course) => course.id !== courseId)
                .map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.code || course.name}
                  </option>
                ))}
            </select>
            <ArrowRightLeft className="w-3 h-3 text-primary/50 absolute right-1 pointer-events-none" />
          </div>
          <button
            type="button"
            onClick={onDeleteSelected}
            disabled={deleting}
            className={`flex items-center gap-1 px-1.5 py-0.5 font-terminal text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/30 transition-colors ${
              deleting ? "opacity-50 cursor-wait" : ""
            }`}
          >
            {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
            Del
          </button>
        </div>
      )}
    </div>
  );
}

function VideoEnrichmentBanner({
  selectedVideoIds,
  videoEnrichmentStatus,
}: {
  selectedVideoIds: number[];
  videoEnrichmentStatus?: TutorVideoEnrichmentStatus;
}) {
  if (selectedVideoIds.length === 0 || !videoEnrichmentStatus) {
    return null;
  }

  return (
    <div className="px-1 py-1 border-b border-muted-foreground/10">
      <div className="flex flex-wrap items-center gap-2 font-terminal text-xs">
        <Badge
          variant="outline"
          className={`${TEXT_BADGE} h-4 px-1 ${
            videoEnrichmentStatus.mode === "off"
              ? "border-muted-foreground/40 text-muted-foreground"
              : videoEnrichmentStatus.allowed
                ? "border-green-500/60 text-green-400"
                : "border-yellow-500/60 text-yellow-300"
          }`}
        >
          Enrich {videoEnrichmentStatus.mode.toUpperCase()}
        </Badge>
        <span className={TEXT_MUTED}>
          Monthly ${videoEnrichmentStatus.budget.monthly_spend.toFixed(2)} / $
          {videoEnrichmentStatus.budget.monthly_cap.toFixed(2)}
        </span>
        {typeof videoEnrichmentStatus.budget.video_spend === "number" && (
          <span className={TEXT_MUTED}>
            Video ${videoEnrichmentStatus.budget.video_spend.toFixed(2)} / $
            {videoEnrichmentStatus.budget.per_video_cap.toFixed(2)}
          </span>
        )}
        {!videoEnrichmentStatus.api_key_configured && (
          <span className="text-red-300">Gemini key missing</span>
        )}
        {videoEnrichmentStatus.key_sources_configured &&
          videoEnrichmentStatus.key_sources_configured.length > 0 && (
            <span className={TEXT_MUTED}>
              Keys: {videoEnrichmentStatus.key_sources_configured.join(" -> ")}
            </span>
          )}
        {!videoEnrichmentStatus.allowed && videoEnrichmentStatus.reason && (
          <span className="text-yellow-200">{videoEnrichmentStatus.reason}</span>
        )}
        {videoEnrichmentStatus.local_only_fallback && (
          <span className={TEXT_MUTED}>Fallback: local-only</span>
        )}
      </div>
    </div>
  );
}

function MaterialRow({
  material,
  selected,
  isDuplicate,
  videoJob,
  onToggle,
}: {
  material: Material;
  selected: boolean;
  isDuplicate: boolean;
  videoJob?: MaterialVideoJobState;
  onToggle: (id: number) => void;
}) {
  return (
    <label
      key={material.id}
      className={`flex items-center gap-2 px-2 py-1.5 ${TEXT_BODY} text-muted-foreground hover:text-foreground cursor-pointer w-full`}
    >
      <Checkbox
        checked={selected}
        onCheckedChange={() => onToggle(material.id)}
        className="w-3 h-3 shrink-0 shadow-none"
      />
      <FileText className={`${ICON_SM} text-primary/60 shrink-0`} />
      <span
        className="truncate min-w-0 flex-1 max-w-[200px]"
        title={getFileNameFromPath(material.title) || `Material ${material.id}`}
      >
        {getFileNameFromPath(material.title) || `Material ${material.id}`}
      </span>
      {isDuplicate && (
        <Badge variant="outline" className={`${TEXT_BADGE} h-4 px-1 shrink-0 border-yellow-500/50 text-yellow-400`}>
          DUPE
        </Badge>
      )}
      <Badge variant="outline" className={`${TEXT_BADGE} h-4 px-1 shrink-0`}>
        {getMaterialTypeLabel(material.file_type)}
      </Badge>
      {(material.file_type || "").toLowerCase() === "mp4" && videoJob && (
        <Badge
          variant="outline"
          className={`${TEXT_BADGE} h-4 px-1 shrink-0 ${
            videoJob.status === "completed"
              ? "border-green-500/60 text-green-400"
              : videoJob.status === "failed"
                ? "border-red-500/60 text-red-400"
                : "border-blue-500/60 text-blue-300"
          }`}
        >
          {videoJob.status.toUpperCase()}
        </Badge>
      )}
    </label>
  );
}

function MaterialSelectorContent({
  courseId,
  courseMaterials,
  courses,
  deleting,
  dragOver,
  dupeChecksums,
  enrichableVideoIds,
  enrichingVideos,
  fileInputRef,
  moving,
  onDeleteSelected,
  onDragLeave,
  onDragOver,
  onDrop,
  onEnrichVideos,
  onFileSelect,
  onMoveSelected,
  onOpenUpload,
  onProcessVideos,
  onToggle,
  onToggleAll,
  processingVideos,
  selectedMaterials,
  selectedVideoIds,
  uploading,
  videoEnrichmentStatus,
  videoJobsByMaterial,
}: {
  courseId?: number;
  courseMaterials: Material[];
  courses: Course[];
  deleting: boolean;
  dragOver: boolean;
  dupeChecksums: Set<string>;
  enrichableVideoIds: number[];
  enrichingVideos: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  moving: boolean;
  onDeleteSelected: () => void;
  onDragLeave: () => void;
  onDragOver: (e: DragEvent) => void;
  onDrop: (e: DragEvent) => void;
  onEnrichVideos: () => void;
  onFileSelect: (e: ChangeEvent<HTMLInputElement>) => void;
  onMoveSelected: (targetCourseId: number) => void;
  onOpenUpload: () => void;
  onProcessVideos: () => void;
  onToggle: (id: number) => void;
  onToggleAll: () => void;
  processingVideos: boolean;
  selectedMaterials: number[];
  selectedVideoIds: number[];
  uploading: boolean;
  videoEnrichmentStatus?: TutorVideoEnrichmentStatus;
  videoJobsByMaterial: Record<number, MaterialVideoJobState>;
}) {
  return (
    <div className="space-y-1 w-full overflow-hidden">
      <MaterialUploadZone
        fileInputRef={fileInputRef}
        uploading={uploading}
        dragOver={dragOver}
        onOpen={onOpenUpload}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onFileSelect={onFileSelect}
      />

      <MaterialSelectionToolbar
        courseMaterialsCount={courseMaterials.length}
        selectedCount={selectedMaterials.length}
        selectedVideoIds={selectedVideoIds}
        enrichableVideoIds={enrichableVideoIds}
        moving={moving}
        deleting={deleting}
        processingVideos={processingVideos}
        enrichingVideos={enrichingVideos}
        courses={courses}
        courseId={courseId}
        onToggleAll={onToggleAll}
        onProcessVideos={onProcessVideos}
        onEnrichVideos={onEnrichVideos}
        onMoveSelected={onMoveSelected}
        onDeleteSelected={onDeleteSelected}
      />

      <VideoEnrichmentBanner
        selectedVideoIds={selectedVideoIds}
        videoEnrichmentStatus={videoEnrichmentStatus}
      />

      {courseMaterials.length > 0 ? (
        courseMaterials.map((material) => (
          <MaterialRow
            key={material.id}
            material={material}
            selected={selectedMaterials.includes(material.id)}
            isDuplicate={!!material.checksum && dupeChecksums.has(material.checksum)}
            videoJob={videoJobsByMaterial[material.id]}
            onToggle={onToggle}
          />
        ))
      ) : courseId ? (
        <div className={`${TEXT_MUTED} text-center py-2 text-xs`}>
          No materials linked to this course yet
        </div>
      ) : null}
    </div>
  );
}

type MaterialSelectorController = {
  courses: Course[];
  courseMaterials: Material[];
  deleting: boolean;
  dragOver: boolean;
  dupeChecksums: Set<string>;
  enrichableVideoIds: number[];
  enrichingVideos: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  isLoading: boolean;
  moving: boolean;
  onDeleteSelected: () => Promise<void>;
  onEnrichVideos: () => Promise<void>;
  onMoveSelected: (targetCourseId: number) => Promise<void>;
  onOpenUpload: () => void;
  onProcessVideos: () => Promise<void>;
  onToggle: (id: number) => void;
  onToggleAll: () => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDragOver: (event: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (event: React.DragEvent) => void;
  processingVideos: boolean;
  selectedVideoIds: number[];
  uploading: boolean;
  uploadZoneProps: MaterialUploadZoneProps;
  videoEnrichmentStatus: TutorVideoEnrichmentStatus | undefined;
  videoJobsByMaterial: Record<number, MaterialVideoJobState>;
};

function useMaterialSelectorController({
  courseId,
  selectedMaterials,
  setSelectedMaterials,
}: MaterialSelectorProps): MaterialSelectorController {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectorState, patchSelectorState] = useReducer(
    materialSelectorReducer,
    undefined,
    createMaterialSelectorState,
  );
  const {
    uploading,
    dragOver,
    deleting,
    moving,
    processingVideos,
    enrichingVideos,
    videoJobsByMaterial,
    videoPollingPaused,
  } = selectorState;
  const consecutiveVideoPollErrorsRef = useRef(0);

  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ["courses-active"],
    queryFn: () => api.courses.getActive(),
  });

  const { data: materials = [], isLoading } = useQuery<Material[]>({
    queryKey: ["tutor-materials", courseId],
    queryFn: () => api.tutor.getMaterials(courseId ? { course_id: courseId } : undefined),
  });

  const courseMaterials = materials;

  const dupeChecksums = useMemo(() => {
    const counts = new Map<string, number>();
    for (const material of materials) {
      const checksum = material.checksum;
      if (checksum) counts.set(checksum, (counts.get(checksum) || 0) + 1);
    }
    const dupes = new Set<string>();
    for (const [checksum, count] of counts) {
      if (count > 1) dupes.add(checksum);
    }
    return dupes;
  }, [materials]);

  const selectedVideoIds = useMemo(() => {
    const selected = new Set(selectedMaterials);
    return courseMaterials
      .filter((material) => selected.has(material.id) && (material.file_type || "").toLowerCase() === "mp4")
      .map((material) => material.id);
  }, [courseMaterials, selectedMaterials]);

  const enrichableVideoIds = useMemo(() => {
    return selectedVideoIds.filter((id) => videoJobsByMaterial[id]?.status === "completed");
  }, [selectedVideoIds, videoJobsByMaterial]);

  const enrichmentStatusMaterialId = useMemo(
    () => (selectedVideoIds.length > 0 ? selectedVideoIds[0] : undefined),
    [selectedVideoIds],
  );

  const { data: videoEnrichmentStatus } = useQuery<TutorVideoEnrichmentStatus>({
    queryKey: ["tutor-video-enrichment-status", enrichmentStatusMaterialId],
    queryFn: () => api.tutor.getVideoEnrichmentStatus(enrichmentStatusMaterialId),
    enabled: selectedVideoIds.length > 0,
    refetchInterval: 15000,
  });

  const handleUpload = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    patchSelectorState({ uploading: true });
    let successes = 0;

    for (const file of files) {
      try {
        const result = await api.tutor.uploadMaterial(file, { course_id: courseId });
        successes++;
        if (result.duplicate_of) {
          toast.warning(`File matches existing: ${result.duplicate_of.title}`);
        }
      } catch {
        toast.error(`Failed: ${file.name}`);
      }
    }

    patchSelectorState({ uploading: false });
    if (successes > 0) {
      toast.success(`${successes} file${successes > 1 ? "s" : ""} uploaded`);
      queryClient.invalidateQueries({ queryKey: ["tutor-materials"] });
    }
  }, [courseId, queryClient]);

  const onFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length > 0) handleUpload(files);
    event.target.value = "";
  }, [handleUpload]);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    patchSelectorState({ dragOver: false });
    const files = Array.from(event.dataTransfer.files);
    if (files.length > 0) handleUpload(files);
  }, [handleUpload]);

  const handleDeleteSelected = useCallback(async () => {
    if (selectedMaterials.length === 0) return;
    const count = selectedMaterials.length;
    if (!window.confirm(`Delete ${count} selected material${count > 1 ? "s" : ""}?`)) return;

    patchSelectorState({ deleting: true });
    let deleted = 0;
    for (const id of selectedMaterials) {
      try {
        await api.tutor.deleteMaterial(id);
        deleted++;
      } catch {
        toast.error(`Failed to delete material ${id}`);
      }
    }
    patchSelectorState({ deleting: false });

    if (deleted > 0) {
      toast.success(`${deleted} material${deleted > 1 ? "s" : ""} deleted`);
      setSelectedMaterials([]);
      queryClient.invalidateQueries({ queryKey: ["tutor-materials"] });
    }
  }, [queryClient, selectedMaterials, setSelectedMaterials]);

  const handleMoveSelected = useCallback(async (targetCourseId: number) => {
    if (selectedMaterials.length === 0) return;
    const targetCourse = courses.find((course) => course.id === targetCourseId);
    const label = targetCourse?.code || targetCourse?.name || `Course ${targetCourseId}`;

    patchSelectorState({ moving: true });
    let moved = 0;
    for (const id of selectedMaterials) {
      try {
        await api.tutor.updateMaterial(id, { course_id: targetCourseId });
        moved++;
      } catch {
        toast.error(`Failed to move material ${id}`);
      }
    }
    patchSelectorState({ moving: false });

    if (moved > 0) {
      toast.success(`${moved} material${moved > 1 ? "s" : ""} moved to ${label}`);
      setSelectedMaterials([]);
      queryClient.invalidateQueries({ queryKey: ["tutor-materials"] });
    }
  }, [courses, queryClient, selectedMaterials, setSelectedMaterials]);

  const handleProcessSelectedVideos = useCallback(async () => {
    if (selectedVideoIds.length === 0) {
      toast.error("Select at least one MP4 material first");
      return;
    }

    patchSelectorState({ processingVideos: true, videoPollingPaused: false });
    consecutiveVideoPollErrorsRef.current = 0;
    let started = 0;
    for (const materialId of selectedVideoIds) {
      try {
        const start = await api.tutor.processVideoMaterial(materialId, {
          model_size: "base",
          keyframe_interval_sec: 20,
        });
        patchSelectorState((prev) => ({
          videoJobsByMaterial: {
            ...prev.videoJobsByMaterial,
            [materialId]: {
              jobId: start.job_id,
              status: "pending",
              phase: "pending",
              lastError: null,
            },
          },
        }));
        started++;
      } catch {
        toast.error(`Failed to start video processing for material ${materialId}`);
      }
    }

    patchSelectorState({ processingVideos: false });
    if (started > 0) {
      toast.success(`Started video processing for ${started} item${started > 1 ? "s" : ""}`);
    }
  }, [selectedVideoIds]);

  const handleEnrichSelectedVideos = useCallback(async () => {
    if (enrichableVideoIds.length === 0) {
      toast.error("No processed MP4s selected for enrichment");
      return;
    }

    patchSelectorState({ enrichingVideos: true });
    let enriched = 0;
    for (const materialId of enrichableVideoIds) {
      try {
        const result = await api.tutor.enrichVideoMaterial(materialId);
        if (result.ok) {
          enriched++;
        } else {
          toast.error(`Enrichment failed for material ${materialId}: ${result.error || "unknown"}`);
        }
      } catch {
        toast.error(`Enrichment request failed for material ${materialId}`);
      }
    }

    patchSelectorState({ enrichingVideos: false });
    if (enriched > 0) {
      toast.success(`Enriched ${enriched} video${enriched > 1 ? "s" : ""}`);
      queryClient.invalidateQueries({ queryKey: ["tutor-materials"] });
    }
  }, [enrichableVideoIds, queryClient]);

  useEffect(() => {
    if (videoPollingPaused) return;

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
        consecutiveVideoPollErrorsRef.current = 0;

        patchSelectorState((prev) => {
          const next = { ...prev.videoJobsByMaterial };
          for (const update of updates) {
            const existing = prev.videoJobsByMaterial[update.materialId];
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
          return { videoJobsByMaterial: next };
        });
      } catch {
        consecutiveVideoPollErrorsRef.current += 1;
        if (consecutiveVideoPollErrorsRef.current >= 5) {
          patchSelectorState({ videoPollingPaused: true });
          toast.error("Video status polling paused (network/socket conflict). Restart Dashboard and refresh this page.");
        }
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
  }, [queryClient, videoJobsByMaterial, videoPollingPaused]);

  const onToggle = useCallback((id: number) => {
    const isSelecting = !selectedMaterials.includes(id);
    setSelectedMaterials(
      isSelecting
        ? [...selectedMaterials, id]
        : selectedMaterials.filter((materialId) => materialId !== id),
    );
    toast.success(isSelecting ? "Material selected" : "Material removed");
  }, [selectedMaterials, setSelectedMaterials]);

  const onToggleAll = useCallback(() => {
    const target = courseId ? courseMaterials : materials;
    if (selectedMaterials.length === target.length) {
      setSelectedMaterials([]);
      toast.success("Cleared all materials");
      return;
    }
    setSelectedMaterials(target.map((material) => material.id));
    toast.success("Selected all materials");
  }, [courseId, courseMaterials, materials, selectedMaterials.length, setSelectedMaterials]);

  const uploadZoneProps: MaterialUploadZoneProps = {
    fileInputRef,
    uploading,
    dragOver,
    onOpen: () => fileInputRef.current?.click(),
    onDragOver: (event) => {
      event.preventDefault();
      patchSelectorState({ dragOver: true });
    },
    onDragLeave: () => patchSelectorState({ dragOver: false }),
    onDrop,
    onFileSelect,
  };

  return {
    courses,
    courseMaterials,
    deleting,
    dragOver,
    dupeChecksums,
    enrichableVideoIds,
    enrichingVideos,
    fileInputRef,
    isLoading,
    moving,
    onDeleteSelected: handleDeleteSelected,
    onDragLeave: uploadZoneProps.onDragLeave,
    onDragOver: uploadZoneProps.onDragOver,
    onDrop,
    onEnrichVideos: handleEnrichSelectedVideos,
    onFileSelect,
    onMoveSelected: handleMoveSelected,
    onOpenUpload: uploadZoneProps.onOpen,
    onProcessVideos: handleProcessSelectedVideos,
    onToggle,
    onToggleAll,
    processingVideos,
    selectedVideoIds,
    uploading,
    uploadZoneProps,
    videoEnrichmentStatus,
    videoJobsByMaterial,
  };
}

export function MaterialSelector({
  courseId,
  selectedMaterials,
  setSelectedMaterials,
}: MaterialSelectorProps) {
  const {
    courses,
    courseMaterials,
    deleting,
    dragOver,
    dupeChecksums,
    enrichableVideoIds,
    enrichingVideos,
    fileInputRef,
    isLoading,
    moving,
    onDeleteSelected,
    onDragLeave,
    onDragOver,
    onDrop,
    onEnrichVideos,
    onFileSelect,
    onMoveSelected,
    onOpenUpload,
    onProcessVideos,
    onToggle,
    onToggleAll,
    processingVideos,
    selectedVideoIds,
    uploading,
    uploadZoneProps,
    videoEnrichmentStatus,
    videoJobsByMaterial,
  } = useMaterialSelectorController({
    courseId,
    selectedMaterials,
    setSelectedMaterials,
  });

  if (isLoading) {
    return <MaterialSelectorLoadingState uploadZoneProps={uploadZoneProps} />;
  }

  if (courseMaterials.length === 0) {
    return <MaterialSelectorEmptyState uploadZoneProps={uploadZoneProps} />;
  }

  return (
    <MaterialSelectorContent
      courseId={courseId}
      courseMaterials={courseMaterials}
      courses={courses}
      deleting={deleting}
      dragOver={dragOver}
      dupeChecksums={dupeChecksums}
      enrichableVideoIds={enrichableVideoIds}
      enrichingVideos={enrichingVideos}
      fileInputRef={fileInputRef}
      moving={moving}
      onDeleteSelected={onDeleteSelected}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onEnrichVideos={onEnrichVideos}
      onFileSelect={onFileSelect}
      onMoveSelected={onMoveSelected}
      onOpenUpload={onOpenUpload}
      onProcessVideos={onProcessVideos}
      onToggle={onToggle}
      onToggleAll={onToggleAll}
      processingVideos={processingVideos}
      selectedMaterials={selectedMaterials}
      selectedVideoIds={selectedVideoIds}
      uploading={uploading}
      videoEnrichmentStatus={videoEnrichmentStatus}
      videoJobsByMaterial={videoJobsByMaterial}
    />
  );
}
