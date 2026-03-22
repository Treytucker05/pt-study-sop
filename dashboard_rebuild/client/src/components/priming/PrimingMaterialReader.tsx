import { type ReactElement, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api";
import type { Material, MaterialContent } from "@/api.types";
import { CONTROL_COPY } from "@/components/shell/controlStyles";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface PrimingMaterialReaderProps {
  courseId: number | undefined;
  selectedMaterials: number[];
}

const FILE_TYPE_COLORS: Record<string, string> = {
  pdf: "bg-red-800/60 text-red-300",
  ppt: "bg-orange-800/60 text-orange-300",
  pptx: "bg-orange-800/60 text-orange-300",
  txt: "bg-green-800/60 text-green-300",
  mp4: "bg-blue-800/60 text-blue-300",
};

function typeBadge(fileType: string | null): string {
  return (fileType ?? "").toUpperCase() || "FILE";
}

function truncate(text: string | null, max: number): string {
  if (!text) return "Untitled";
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

export function PrimingMaterialReader({
  courseId,
  selectedMaterials,
}: PrimingMaterialReaderProps): ReactElement {
  const [activeId, setActiveId] = useState<number | null>(null);

  const { data: allMaterials = [] } = useQuery<Material[]>({
    queryKey: ["tutor-materials", courseId],
    queryFn: () =>
      api.tutor.getMaterials(courseId ? { course_id: courseId } : undefined),
  });

  const materials =
    selectedMaterials.length > 0
      ? allMaterials.filter((m) => selectedMaterials.includes(m.id))
      : [];

  useEffect(() => {
    if (materials.length === 0) {
      setActiveId(null);
      return;
    }
    if (!materials.some((material) => material.id === activeId)) {
      setActiveId(materials[0]?.id ?? null);
    }
  }, [activeId, materials]);

  const activeMaterial = materials.find((m) => m.id === activeId) ?? null;
  const isPdf = activeMaterial?.file_type?.toLowerCase() === "pdf";

  const { data: content, isLoading: contentLoading } =
    useQuery<MaterialContent>({
      queryKey: ["material-content", activeId],
      queryFn: () => api.tutor.getMaterialContent(activeId!),
      enabled: activeId !== null && !isPdf,
    });

  return (
    <div className="flex h-full flex-col">
      {/* Tab strip */}
      <div className="flex gap-2 overflow-x-auto border-b border-primary/20 bg-black/60 px-3 py-2">
        {materials.length === 0 && (
          <span
            className={cn(
              CONTROL_COPY,
              "px-1 text-sm leading-6 text-foreground/68",
            )}
          >
            Select materials in the setup rail to review them here
          </span>
        )}
        {materials.map((m) => {
          const isActive = m.id === activeId;
          const ft = (m.file_type ?? "").toLowerCase();
          const badgeColor =
            FILE_TYPE_COLORS[ft] ?? "bg-gray-800/60 text-gray-300";
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setActiveId(m.id)}
              className={`flex shrink-0 items-center gap-2 rounded-[0.95rem] border px-3 py-2 font-mono text-sm leading-5 transition-colors ${
                isActive
                  ? "border-primary/50 bg-primary/10 text-foreground shadow-[0_0_14px_rgba(255,86,120,0.12)]"
                  : "border-transparent text-foreground/68 hover:border-primary/20 hover:text-foreground/86"
              }`}
            >
              <span>{truncate(m.title, 20)}</span>
              <span
                className={`rounded-full px-2 py-1 font-mono text-xs font-semibold tracking-[0.12em] ${badgeColor}`}
              >
                {typeBadge(m.file_type)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content viewer */}
      <div className="min-h-0 flex-1 bg-black/40">
        {activeId === null && (
          <div className="flex h-full items-center justify-center">
            <span
              className={cn(
                CONTROL_COPY,
                "text-sm leading-6 text-foreground/68",
              )}
            >
              Select a material above to view its content
            </span>
          </div>
        )}

        {activeId !== null && isPdf && (
          <iframe
            src={api.tutor.getMaterialFileUrl(activeId)}
            title="PDF viewer"
            className="h-full w-full border-0"
          />
        )}

        {activeId !== null && !isPdf && contentLoading && (
          <div className="flex h-full items-center justify-center">
            <span
              className={cn(
                CONTROL_COPY,
                "animate-pulse text-sm leading-6 text-foreground/68",
              )}
            >
              Loading content...
            </span>
          </div>
        )}

        {activeId !== null && !isPdf && !contentLoading && content && (
          <ScrollArea className="h-full">
            <pre className="p-4 font-mono text-sm leading-6 whitespace-pre-wrap text-foreground/90 md:text-base md:leading-7">
              {content.content}
            </pre>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
