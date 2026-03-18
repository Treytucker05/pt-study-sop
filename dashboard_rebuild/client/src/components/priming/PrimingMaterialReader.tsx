import { type ReactElement, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { api } from "@/api";
import type { Material, MaterialContent } from "@/api.types";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PrimingMaterialReaderProps {
  courseId: number | undefined;
  selectedMaterials: number[];
  onExtractMaterial?: (materialId: number) => void;
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
  onExtractMaterial,
}: PrimingMaterialReaderProps): ReactElement {
  const [activeId, setActiveId] = useState<number | null>(null);

  const { data: allMaterials = [] } = useQuery<Material[]>({
    queryKey: ["tutor-materials", courseId],
    queryFn: () => api.tutor.getMaterials(courseId ? { course_id: courseId } : undefined),
  });

  const materials = selectedMaterials.length > 0
    ? allMaterials.filter((m) => selectedMaterials.includes(m.id))
    : allMaterials;

  const activeMaterial = materials.find((m) => m.id === activeId) ?? null;
  const isPdf = activeMaterial?.file_type?.toLowerCase() === "pdf";

  const { data: content, isLoading: contentLoading } = useQuery<MaterialContent>({
    queryKey: ["material-content", activeId],
    queryFn: () => api.tutor.getMaterialContent(activeId!),
    enabled: activeId !== null && !isPdf,
  });

  return (
    <div className="flex h-full flex-col">
      {/* Tab strip */}
      <div className="flex gap-1 overflow-x-auto border-b border-primary/20 bg-black/60 px-2 py-1.5">
        {materials.length === 0 && (
          <span className="px-2 py-1 font-terminal text-xs text-muted-foreground">
            No materials available
          </span>
        )}
        {materials.map((m) => {
          const isActive = m.id === activeId;
          const ft = (m.file_type ?? "").toLowerCase();
          const badgeColor = FILE_TYPE_COLORS[ft] ?? "bg-gray-800/60 text-gray-300";
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setActiveId(m.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-sm border px-2 py-1 font-terminal text-xs transition-colors ${
                isActive
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-transparent text-muted-foreground hover:text-primary/70"
              }`}
            >
              <span>{truncate(m.title, 20)}</span>
              <span className={`rounded px-1 py-0.5 text-[10px] font-bold ${badgeColor}`}>
                {typeBadge(m.file_type)}
              </span>
              {onExtractMaterial && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    onExtractMaterial(m.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.stopPropagation();
                      onExtractMaterial(m.id);
                    }
                  }}
                  className="ml-0.5 rounded p-0.5 hover:bg-primary/20"
                  title="Extract material"
                >
                  <Sparkles className="h-3 w-3" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content viewer */}
      <div className="min-h-0 flex-1 bg-black/40">
        {activeId === null && (
          <div className="flex h-full items-center justify-center">
            <span className="font-terminal text-sm text-muted-foreground">
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
            <span className="font-terminal text-sm text-muted-foreground animate-pulse">
              Loading content...
            </span>
          </div>
        )}

        {activeId !== null && !isPdf && !contentLoading && content && (
          <ScrollArea className="h-full">
            <pre className="p-4 font-terminal text-sm whitespace-pre-wrap text-foreground/90">
              {content.content}
            </pre>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
