import { type ReactElement, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { api } from "@/api";
import type { Material, MaterialContent } from "@/api.types";
import { WorkspacePanel } from "@/components/ui/WorkspacePanel";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export interface MaterialViewerPanelProps {
  courseId: number | null;
  selectedMaterialIds: number[];
  onSendToPacket?: (item: {
    type: string;
    title: string;
    content: string;
  }) => void;
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

export function MaterialViewerPanel({
  courseId,
  selectedMaterialIds,
  onSendToPacket,
}: MaterialViewerPanelProps): ReactElement {
  const [activeId, setActiveId] = useState<number | null>(null);

  const { data: allMaterials = [] } = useQuery<Material[]>({
    queryKey: ["tutor-materials", courseId],
    queryFn: () =>
      api.tutor.getMaterials(
        courseId ? { course_id: courseId } : undefined,
      ),
    enabled: courseId !== null,
  });

  // Filter to only selected materials
  const materials =
    selectedMaterialIds.length > 0
      ? allMaterials.filter((m) => selectedMaterialIds.includes(m.id))
      : [];

  // Keep activeId in sync with available materials
  useEffect(() => {
    if (materials.length === 0) {
      setActiveId(null);
      return;
    }
    if (!materials.some((m) => m.id === activeId)) {
      setActiveId(materials[0]?.id ?? null);
    }
  }, [activeId, materials]);

  const activeMaterial = materials.find((m) => m.id === activeId) ?? null;
  const isPdf = activeMaterial?.file_type?.toLowerCase() === "pdf";

  const { data: content } = useQuery<MaterialContent>({
    queryKey: ["material-content", activeId],
    queryFn: () => api.tutor.getMaterialContent(activeId!),
    enabled: activeId !== null && !isPdf,
  });

  const handleSendToPacket = (): void => {
    if (!activeMaterial || !onSendToPacket) return;
    onSendToPacket({
      type: "material",
      title: activeMaterial.title || "Untitled",
      content: isPdf
        ? `[PDF: ${activeMaterial.title}]`
        : content?.content || "",
    });
  };

  return (
    <WorkspacePanel id="material-viewer" title="MATERIALS">
      <div className="flex h-full flex-col gap-3">
        {/* Material list */}
        {materials.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <span className="font-mono text-sm text-foreground/50">
              No materials selected
            </span>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
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
                    className={cn(
                      "flex items-center gap-2 rounded-sm border px-3 py-1.5 font-mono text-sm transition-colors",
                      isActive
                        ? "border-primary/50 bg-primary/10 text-foreground"
                        : "border-primary/10 text-foreground/60 hover:border-primary/30 hover:text-foreground/80",
                    )}
                  >
                    <span>{m.title || "Untitled"}</span>
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 font-mono text-xs font-semibold tracking-wider",
                        badgeColor,
                      )}
                    >
                      {typeBadge(m.file_type)}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Viewer area */}
            {activeMaterial && (
              <div className="flex min-h-0 flex-1 flex-col rounded-sm border border-primary/15 bg-black/40">
                {/* Header with title + send button */}
                <div className="flex items-center justify-between border-b border-primary/15 px-3 py-2">
                  <div>
                    <div className="font-arcade text-ui-2xs text-primary">
                      VIEWING
                    </div>
                    <div className="mt-1 font-terminal text-sm text-foreground">
                      {activeMaterial.title || "Untitled"}
                    </div>
                  </div>
                  {onSendToPacket && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-none font-arcade text-ui-2xs"
                      onClick={handleSendToPacket}
                    >
                      <Send className="mr-1.5 h-3 w-3" />
                      SEND TO PACKET
                    </Button>
                  )}
                </div>

                {/* Content */}
                <div className="min-h-0 flex-1">
                  {isPdf ? (
                    <iframe
                      src={api.tutor.getMaterialFileUrl(activeId!)}
                      title="PDF viewer"
                      className="h-full w-full border-0"
                    />
                  ) : content?.content ? (
                    <ScrollArea className="h-full">
                      <pre className="whitespace-pre-wrap p-4 font-terminal text-sm leading-6 text-foreground/90">
                        {content.content}
                      </pre>
                    </ScrollArea>
                  ) : (
                    <div className="flex h-32 items-center justify-center">
                      <span className="animate-pulse font-mono text-sm text-foreground/50">
                        Loading content...
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </WorkspacePanel>
  );
}
