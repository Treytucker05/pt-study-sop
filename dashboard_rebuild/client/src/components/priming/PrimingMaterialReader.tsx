import { type ReactElement, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { api } from "@/api";
import type { Material, MaterialContent } from "@/api.types";
import { CONTROL_COPY } from "@/components/shell/controlStyles";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  buildMaterialViewerPopoutHtml,
  STUDIO_MATERIAL_VIEWER_POPOUT_CHANNEL,
  type MaterialViewerPopoutSnapshot,
} from "@/lib/materialViewerPopout";
import { createBroadcastChannelTransport, createStateSnapshot } from "@/lib/popoutSync";
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
  const popoutRef = useRef<Window | null>(null);
  const popoutChannelRef = useRef<ReturnType<typeof createBroadcastChannelTransport> | null>(null);

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

  const snapshot = useMemo<MaterialViewerPopoutSnapshot>(
    () => ({
      title: activeMaterial?.title || "Material Viewer",
      url: activeId !== null ? api.tutor.getMaterialFileUrl(activeId) : null,
      fileType: activeMaterial?.file_type || null,
      textContent: !isPdf ? content?.content || null : null,
    }),
    [activeId, activeMaterial?.file_type, activeMaterial?.title, content?.content, isPdf],
  );

  const openReaderPopout = () => {
    if (activeId === null) return;
    if (popoutRef.current && !popoutRef.current.closed) {
      popoutRef.current.focus();
      return;
    }

    const transport = createBroadcastChannelTransport(STUDIO_MATERIAL_VIEWER_POPOUT_CHANNEL);
    popoutChannelRef.current = transport;
    const html = buildMaterialViewerPopoutHtml({
      channelName: STUDIO_MATERIAL_VIEWER_POPOUT_CHANNEL,
      initialSnapshot: snapshot,
      liveSyncAvailable: transport.available,
    });
    const popup = window.open("", "_blank", "width=1100,height=900,menubar=no,toolbar=no");
    if (!popup) {
      transport.close();
      popoutChannelRef.current = null;
      return;
    }

    popup.document.write(html);
    popup.document.close();
    popoutRef.current = popup;

    const checkClosed = window.setInterval(() => {
      if (!popup.closed) return;
      window.clearInterval(checkClosed);
      popoutRef.current = null;
      transport.close();
      popoutChannelRef.current = null;
    }, 1000);
  };

  useEffect(() => {
    const transport = popoutChannelRef.current;
    if (!transport?.available || !popoutRef.current || popoutRef.current.closed) return;
    transport.postMessage(createStateSnapshot(snapshot, Date.now(), true));
  }, [snapshot]);

  useEffect(() => {
    return () => {
      popoutChannelRef.current?.close();
      popoutChannelRef.current = null;
    };
  }, []);

  return (
    <div className="flex h-full flex-col">
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

        {activeId !== null ? (
          <div className="flex h-full flex-col">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-primary/15 bg-black/55 px-4 py-3">
              <div className="min-w-0">
                <div className="font-arcade text-ui-2xs text-primary">ACTIVE SOURCE</div>
                <div className="mt-2 break-words font-terminal text-base text-foreground">
                  {activeMaterial?.title || "Untitled material"}
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-none font-arcade text-ui-2xs"
                onClick={openReaderPopout}
              >
                <ExternalLink className="mr-2 h-3.5 w-3.5" />
                POPOUT READER
              </Button>
            </div>
            <div className="min-h-0 flex-1">
              {isPdf ? (
                <iframe
                  src={api.tutor.getMaterialFileUrl(activeId)}
                  title="PDF viewer"
                  className="h-full w-full border-0"
                />
              ) : null}

              {!isPdf && contentLoading ? (
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
              ) : null}

              {!isPdf && !contentLoading && content ? (
                <ScrollArea className="h-full">
                  <pre className="p-5 font-terminal text-base leading-7 whitespace-pre-wrap text-foreground/95">
                    {content.content}
                  </pre>
                </ScrollArea>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
