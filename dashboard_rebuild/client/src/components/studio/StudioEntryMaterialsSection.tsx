import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { ChevronDown, ChevronRight, Upload } from "lucide-react";
import { toast } from "sonner";

import type { Material } from "@/lib/api";
import { Progress } from "@/components/ui/progress";
import {
  STUDIO_ENTRY_UPLOAD_ACCEPT,
  groupEntryCourseMaterials,
  partitionStudioEntryUploadFiles,
} from "@/lib/studioEntryMaterials";

export interface StudioEntryUploadProgress {
  completed: number;
  total: number;
  currentName: string;
}

export interface StudioEntryMaterialsSectionProps {
  materials: Material[];
  materialFilter: string;
  onMaterialFilterChange: (value: string) => void;
  selectedMaterialIds: number[];
  onToggleMaterial: (materialId: number) => void;
  onToggleAll: () => void;
  allSelected: boolean;
  formatMaterialLabel: (material: Material) => string;
  formatMaterialBadge: (fileType: string | null | undefined) => string;
  uploading: boolean;
  uploadProgress: StudioEntryUploadProgress | null;
  onUploadFiles: (files: File[]) => void | Promise<void>;
}

export function StudioEntryMaterialsSection({
  materials,
  materialFilter,
  onMaterialFilterChange,
  selectedMaterialIds,
  onToggleMaterial,
  onToggleAll,
  allSelected,
  formatMaterialLabel,
  formatMaterialBadge,
  uploading,
  uploadProgress,
  onUploadFiles,
}: StudioEntryMaterialsSectionProps) {
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);
  const [dragActive, setDragActive] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(
    {},
  );

  const filteredMaterials = useMemo(() => {
    const query = materialFilter.trim().toLowerCase();
    if (!query) return materials;
    return materials.filter((material) => {
      const label = formatMaterialLabel(material).toLowerCase();
      return (
        label.includes(query) ||
        (material.source_path || "").toLowerCase().includes(query) ||
        (material.title || "").toLowerCase().includes(query)
      );
    });
  }, [formatMaterialLabel, materialFilter, materials]);

  const materialGroups = useMemo(
    () => groupEntryCourseMaterials(filteredMaterials, formatMaterialLabel),
    [filteredMaterials, formatMaterialLabel],
  );

  const toggleGroupCollapsed = useCallback((groupKey: string) => {
    setCollapsedGroups((previous) => ({
      ...previous,
      [groupKey]: !(previous[groupKey] ?? false),
    }));
  }, []);

  const collapseAllGroups = useCallback(() => {
    setCollapsedGroups((previous) => {
      const next = { ...previous };
      for (const group of materialGroups) {
        next[group.key] = true;
      }
      return next;
    });
  }, [materialGroups]);

  const expandAllGroups = useCallback(() => {
    setCollapsedGroups((previous) => {
      const next = { ...previous };
      for (const group of materialGroups) {
        next[group.key] = false;
      }
      return next;
    });
  }, [materialGroups]);

  const uploadPercent =
    uploadProgress && uploadProgress.total > 0
      ? Math.round((uploadProgress.completed / uploadProgress.total) * 100)
      : uploading
        ? 8
        : 0;

  const ingestFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList);
      if (files.length === 0) return;
      const { accepted, rejected } = partitionStudioEntryUploadFiles(files);
      if (rejected.length > 0) {
        const names = rejected.map((file) => file.name).join(", ");
        toast.error(
          `Unsupported file type${rejected.length === 1 ? "" : "s"}: ${names}. Use PDF, DOCX, PPTX, MD, TXT, or MP4.`,
        );
      }
      if (accepted.length > 0) {
        await onUploadFiles(accepted);
      }
    },
    [onUploadFiles],
  );

  const handleDragEnter = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current += 1;
    if (event.dataTransfer.types.includes("Files")) {
      setDragActive(true);
    }
  }, []);

  const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setDragActive(false);
    }
  }, []);

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = uploading ? "none" : "copy";
  }, [uploading]);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      dragDepthRef.current = 0;
      setDragActive(false);
      if (uploading) return;
      void ingestFiles(event.dataTransfer.files);
    },
    [ingestFiles, uploading],
  );

  const handleFileInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (!event.target.files) return;
      void ingestFiles(event.target.files).finally(() => {
        event.target.value = "";
      });
    },
    [ingestFiles],
  );

  return (
    <div
      className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(15rem,18rem)]"
      data-testid="studio-entry-materials-section"
    >
      <div className="flex min-h-0 flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ds-fg-pink-2)]">
            Session Materials
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {materialGroups.length > 0 ? (
              <div
                className="flex flex-wrap items-center gap-3"
                data-testid="studio-entry-materials-group-controls"
              >
                <button
                  type="button"
                  data-testid="studio-entry-collapse-all-groups"
                  onClick={collapseAllGroups}
                  className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#ffc8d3]/72 transition hover:text-white"
                >
                  Collapse All
                </button>
                <button
                  type="button"
                  data-testid="studio-entry-expand-all-groups"
                  onClick={expandAllGroups}
                  className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#ffc8d3]/72 transition hover:text-white"
                >
                  Expand All
                </button>
              </div>
            ) : null}
            <div
              className={`flex items-center ${
                materialGroups.length > 0
                  ? "border-l border-[var(--ds-accent-a22)] pl-4"
                  : ""
              }`}
              data-testid="studio-entry-materials-selection-controls"
            >
              <button
                type="button"
                onClick={onToggleAll}
                className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ds-fg-pink-1)] transition hover:text-white"
              >
                {allSelected ? "Deselect All" : "Select All"}
              </button>
            </div>
          </div>
        </div>
        <input
          type="text"
          value={materialFilter}
          onChange={(event) => onMaterialFilterChange(event.target.value)}
          placeholder={`Filter ${materials.length} materials…`}
          aria-label="Filter session materials"
          className="w-full rounded-[var(--ds-r-080)] border border-[var(--ds-accent-a18)] bg-black/40 px-3 py-2 font-mono text-sm text-white outline-none placeholder:text-[#ffc8d3]/45 focus:border-[var(--ds-accent-a36)]"
        />
        <div
          data-testid="studio-entry-materials-list"
          className="min-h-[12rem] max-h-[min(52vh,28rem)] overflow-y-auto rounded-[var(--ds-r-090)] border border-[var(--ds-accent-a18)] bg-black/30 p-2"
        >
          {materialGroups.length > 0 ? (
            <div className="space-y-4">
              {materialGroups.map((group) => {
                const isCollapsed = collapsedGroups[group.key] ?? false;
                return (
                  <section
                    key={group.key}
                    data-testid={`studio-entry-material-group-${group.key}`}
                    data-expanded={isCollapsed ? "false" : "true"}
                    className="space-y-1"
                  >
                    <button
                      type="button"
                      onClick={() => toggleGroupCollapsed(group.key)}
                      aria-expanded={!isCollapsed}
                      aria-controls={`studio-entry-material-group-panel-${group.key}`}
                      className="sticky top-0 z-[1] flex w-full items-center justify-between gap-2 border-b border-[var(--ds-accent-a12)] bg-black/80 px-2 py-1.5 text-left backdrop-blur-sm transition hover:bg-black/90"
                    >
                      <span className="flex min-w-0 items-center gap-1.5">
                        {isCollapsed ? (
                          <ChevronRight
                            className="h-3.5 w-3.5 shrink-0 text-[#ffc8d3]/55"
                            aria-hidden="true"
                          />
                        ) : (
                          <ChevronDown
                            className="h-3.5 w-3.5 shrink-0 text-[#ffc8d3]/55"
                            aria-hidden="true"
                          />
                        )}
                        <span
                          className={`truncate font-mono text-[10px] uppercase tracking-[0.2em] ${
                            group.kind === "textbook"
                              ? "text-[var(--ds-fg-pink-1)]"
                              : "text-[var(--ds-fg-pink-2)]"
                          }`}
                        >
                          {group.label}
                        </span>
                      </span>
                      <span className="shrink-0 font-mono text-[10px] text-[#ffc8d3]/55">
                        {group.materials.length}
                      </span>
                    </button>
                    {!isCollapsed ? (
                      <div
                        id={`studio-entry-material-group-panel-${group.key}`}
                        className="space-y-1 pt-1"
                      >
                        {group.materials.map((material) => {
                          const checked = selectedMaterialIds.includes(
                            material.id,
                          );
                          const label = formatMaterialLabel(material);
                          return (
                            <label
                              key={material.id}
                              title={label}
                              data-testid={`studio-entry-material-row-${material.id}`}
                              className="flex cursor-pointer items-start gap-3 rounded-[var(--ds-r-080)] border border-transparent px-2 py-2 transition hover:border-[var(--ds-accent-a18)] hover:bg-black/20"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => onToggleMaterial(material.id)}
                                className="mt-0.5 h-4 w-4 shrink-0 rounded border-[rgba(255,118,144,0.28)] bg-black/40 text-primary"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="break-words font-mono text-sm leading-snug text-white">
                                  {label}
                                </div>
                              </div>
                              <span className="shrink-0 rounded-full border border-[var(--ds-accent-a22)] bg-black/30 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ds-fg-pink-1)]">
                                {formatMaterialBadge(material.file_type)}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    ) : null}
                  </section>
                );
              })}
            </div>
          ) : (
            <div className="px-2 py-6 font-mono text-xs leading-6 text-[#ffc8d3]/68">
              {materials.length > 0
                ? `No materials match “${materialFilter.trim()}”.`
                : "No materials available for this course yet."}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div
          role="button"
          tabIndex={0}
          data-testid="studio-entry-upload-dropzone"
          data-drag-active={dragActive ? "true" : "false"}
          aria-disabled={uploading}
          onClick={() => {
            if (!uploading) uploadInputRef.current?.click();
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              if (!uploading) uploadInputRef.current?.click();
            }
          }}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={`flex min-h-[10rem] cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-4 text-center font-mono transition disabled:cursor-wait disabled:opacity-70 ${
            dragActive
              ? "border-primary bg-primary/10"
              : "border-[rgba(255,118,144,0.25)] bg-black/20 hover:border-[rgba(255,118,144,0.45)] hover:bg-primary/5"
          }`}
        >
          <Upload
            className="h-5 w-5 text-[var(--ds-fg-pink-2)]"
            aria-hidden="true"
          />
          <div className="mt-2 text-[11px] uppercase tracking-[0.18em] text-white">
            {uploading ? "Uploading…" : "Drop files or click to upload"}
          </div>
          <div className="mt-1 text-[11px] leading-5 text-[#ffc8d3]/68">
            Library + Current Run
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[#ffc8d3]/55">
            PDF · DOCX · PPTX · TXT · MD · MP4
          </div>
        </div>
        <input
          ref={uploadInputRef}
          data-testid="studio-entry-upload-input"
          aria-label="Upload to Library and Current Run"
          type="file"
          accept={STUDIO_ENTRY_UPLOAD_ACCEPT}
          multiple
          className="hidden"
          onChange={handleFileInputChange}
        />
        {uploading ? (
          <div
            data-testid="studio-entry-upload-status"
            className="space-y-2 rounded-[var(--ds-r-080)] border border-[var(--ds-accent-a18)] bg-black/35 p-3"
          >
            <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ds-fg-pink-2)]">
              Uploading to Library and Current Run
            </div>
            {uploadProgress ? (
              <div className="font-mono text-xs text-[#ffe3ea]/88">
                {uploadProgress.completed} of {uploadProgress.total}
                {uploadProgress.currentName
                  ? ` · ${uploadProgress.currentName}`
                  : ""}
              </div>
            ) : null}
            <Progress value={uploadPercent} aria-label="Upload progress" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
