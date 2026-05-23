import { useQuery } from "@tanstack/react-query";

import { MaterialViewer } from "@/components/MaterialViewer";
import {
  MaterialViewerZoomControls,
  MaterialViewerZoomSurface,
} from "@/components/MaterialViewerZoomSurface";
import { api } from "@/lib/api";
import type { Material, MaterialContent } from "@/lib/api";
import {
  clampMaterialViewerZoom,
  MATERIAL_VIEWER_ZOOM_DEFAULT,
} from "@/lib/materialViewerZoom";
import type { StudioDocumentTab } from "@/lib/studioPanelLayout";

interface DocumentPaneContentProps {
  tab: StudioDocumentTab | null;
  materials: Material[];
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onTextSelectionChange?: ((selection: {
    text: string;
    label: string | null;
  }) => void) | null;
}

export function DocumentPaneContent({
  tab,
  materials,
  zoom,
  onZoomChange,
  onTextSelectionChange = null,
}: DocumentPaneContentProps) {
  const material =
    tab?.kind === "material" && typeof tab.sourceId === "number"
      ? materials.find((candidate) => candidate.id === tab.sourceId) ?? null
      : null;
  const vaultPath =
    tab?.kind === "vault" && typeof tab.sourcePath === "string"
      ? tab.sourcePath
      : null;
  const vaultPreviewable =
    typeof vaultPath === "string" && vaultPath.trim().toLowerCase().endsWith(".md");

  const { data: materialContent, isLoading: materialLoading } =
    useQuery<MaterialContent>({
      queryKey: ["studio-document-pane", "material-content", material?.id],
      queryFn: () => api.tutor.getMaterialContent(material!.id),
      enabled: material !== null,
      staleTime: 60 * 1000,
    });

  const { data: vaultFile, isLoading: vaultLoading } = useQuery({
    queryKey: ["studio-document-pane", "vault-file", vaultPath],
    queryFn: () => api.obsidian.getFile(vaultPath!),
    enabled: vaultPreviewable,
    staleTime: 60 * 1000,
  });

  const zoomScale = clampMaterialViewerZoom(zoom);
  const vaultText =
    vaultFile && "success" in vaultFile && vaultFile.success
      ? String(vaultFile.content || "")
      : "";

  if (!tab) {
    return (
      <div
        data-testid="document-pane-empty"
        className="flex h-full min-h-[120px] items-center justify-center px-4 text-center font-mono text-xs text-foreground/55"
      >
        Open a source from the shelf or drag a tab here. Use split controls to
        add another pane.
      </div>
    );
  }

  if (material) {
    if (materialLoading) {
      return (
        <div className="flex h-full min-h-[120px] items-center justify-center font-mono text-xs text-foreground/60">
          Loading document...
        </div>
      );
    }

    return (
      <MaterialViewer
        source={{
          id: material.id,
          title: materialContent?.title || material.title,
          fileName: material.source_path,
          fileType: materialContent?.file_type || material.file_type,
          url: api.tutor.getMaterialFileUrl(material.id),
          textContent: materialContent?.content || null,
        }}
        className="h-full min-h-0 border-0"
        zoom={zoomScale}
        onZoomChange={onZoomChange}
        onTextSelectionChange={onTextSelectionChange}
      />
    );
  }

  if (vaultPath) {
    if (!vaultPreviewable) {
      return (
        <div className="flex h-full min-h-[120px] items-center justify-center px-4 text-center font-mono text-xs text-foreground/60">
          Vault folders and non-markdown links stay as references without inline
          preview.
        </div>
      );
    }

    if (vaultLoading) {
      return (
        <div className="flex h-full min-h-[120px] items-center justify-center font-mono text-xs text-foreground/60">
          Loading vault note...
        </div>
      );
    }

    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="flex shrink-0 justify-end border-b border-primary/12 bg-black/25 px-2 py-1">
          <MaterialViewerZoomControls
            zoom={zoomScale}
            onZoomChange={onZoomChange}
          />
        </div>
        <MaterialViewerZoomSurface zoom={zoomScale} className="h-full flex-1">
          <div className="whitespace-pre-wrap p-4 font-mono text-sm leading-6 text-foreground/78">
            {vaultText || "This vault note is empty."}
          </div>
        </MaterialViewerZoomSurface>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[120px] items-center justify-center font-mono text-xs text-foreground/60">
      Unsupported document type.
    </div>
  );
}

export function getDefaultPaneZoom(): number {
  return MATERIAL_VIEWER_ZOOM_DEFAULT;
}
