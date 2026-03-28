import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MaterialViewer } from "@/components/MaterialViewer";
import { api } from "@/lib/api";
import type { Material, MaterialContent } from "@/lib/api";
import type { StudioDocumentTab } from "@/lib/studioPanelLayout";
import {
  createStudioExcerptWorkspaceObject,
  type StudioWorkspaceObject,
} from "@/lib/studioWorkspaceObjects";

export interface StudioDocumentDockProps {
  materials: Material[];
  selectedMaterialIds: number[];
  selectedPaths: string[];
  viewerState: Record<string, unknown> | null;
  documentTabs?: StudioDocumentTab[];
  activeDocumentTabId?: string | null;
  onSelectDocumentTab?: (tabId: string) => void;
  onClipExcerpt?: (workspaceObject: StudioWorkspaceObject) => void;
}

function formatFileType(value: string | null | undefined): string {
  const normalized = String(value || "").trim();
  return normalized ? normalized.toUpperCase() : "FILE";
}

export function StudioDocumentDock({
  materials,
  selectedMaterialIds,
  selectedPaths,
  viewerState,
  documentTabs = [],
  activeDocumentTabId = null,
  onSelectDocumentTab,
  onClipExcerpt,
}: StudioDocumentDockProps) {
  const activeTab = useMemo(
    () => documentTabs.find((tab) => tab.id === activeDocumentTabId) || null,
    [activeDocumentTabId, documentTabs],
  );
  const selectedMaterials =
    selectedMaterialIds.length > 0
      ? materials.filter((material) => selectedMaterialIds.includes(material.id))
      : [];
  const materialById = useMemo(
    () =>
      new Map(
        materials.map((material) => [material.id, material] as const),
      ),
    [materials],
  );

  const viewerMaterialId =
    typeof viewerState?.material_id === "number" ? viewerState.material_id : null;
  const activeTabMaterialId =
    activeTab?.kind === "material" && typeof activeTab.sourceId === "number"
      ? activeTab.sourceId
      : null;
  const activeMaterial =
    (activeTabMaterialId !== null ? materialById.get(activeTabMaterialId) : null) ||
    (viewerMaterialId !== null ? materialById.get(viewerMaterialId) : null) ||
    selectedMaterials[0] ||
    null;
  const activeVaultPath =
    activeTab?.kind === "vault" && typeof activeTab.sourcePath === "string"
      ? activeTab.sourcePath
      : typeof viewerState?.source_kind === "string" &&
          viewerState.source_kind === "vault" &&
          typeof viewerState?.source_path === "string"
        ? viewerState.source_path
        : null;
  const activeVaultPreviewable =
    typeof activeVaultPath === "string" &&
    activeVaultPath.trim().toLowerCase().endsWith(".md");
  const activeDocumentTitle =
    activeTab?.title ||
    (activeVaultPath
      ? (typeof viewerState?.source_title === "string"
          ? viewerState.source_title
          : activeVaultPath.split(/[\\/]/).pop()) || activeVaultPath
      : null) ||
    activeMaterial?.title ||
    (typeof viewerState?.source_title === "string" ? viewerState.source_title : null) ||
    "No document selected";
  const activeDocumentPath =
    activeTab?.sourcePath ||
    activeVaultPath ||
    activeMaterial?.source_path ||
    (typeof viewerState?.source_path === "string"
      ? viewerState.source_path
      : "Select a file from the current run to open it here.");
  const activeFileType =
    typeof viewerState?.file_type === "string"
      ? viewerState.file_type
      : activeMaterial?.file_type || (activeVaultPath ? "VAULT" : activeTab?.kind);
  const { data: activeMaterialContent, isLoading: activeMaterialLoading } =
    useQuery<MaterialContent>({
      queryKey: ["studio-document-dock", "material-content", activeMaterial?.id],
      queryFn: () => api.tutor.getMaterialContent(activeMaterial!.id),
      enabled: activeMaterial !== null,
      staleTime: 60 * 1000,
    });
  const { data: activeVaultFile, isLoading: activeVaultLoading } = useQuery({
    queryKey: ["studio-document-dock", "vault-file", activeVaultPath],
    queryFn: () => api.obsidian.getFile(activeVaultPath!),
    enabled: activeVaultPreviewable,
    staleTime: 60 * 1000,
  });
  const activeVaultText =
    activeVaultFile && "success" in activeVaultFile && activeVaultFile.success
      ? String(activeVaultFile.content || "")
      : "";
  const initialExcerptText = useMemo(
    () =>
      typeof viewerState?.selection_text === "string"
        ? viewerState.selection_text
        : "",
    [viewerState],
  );
  const selectionLabel =
    typeof viewerState?.selection_label === "string"
      ? viewerState.selection_label
      : null;
  const [excerptLabel, setExcerptLabel] = useState<string | null>(selectionLabel);
  const [excerptText, setExcerptText] = useState(initialExcerptText);

  useEffect(() => {
    setExcerptText(initialExcerptText);
    setExcerptLabel(selectionLabel);
  }, [activeDocumentTabId, initialExcerptText, selectionLabel]);

  const canClipExcerpt =
    excerptText.trim().length > 0 && Boolean(activeMaterial || activeVaultPath);

  const handleClipExcerpt = () => {
    if (!excerptText.trim() || (!activeMaterial && !activeVaultPath)) return;

    onClipExcerpt?.(
      createStudioExcerptWorkspaceObject({
        materialId: activeMaterial?.id ?? null,
        sourcePath: activeMaterial?.source_path || activeVaultPath || null,
        fileType:
          activeMaterial?.file_type ||
          (activeVaultPath?.split(".").pop()?.toLowerCase() ?? "vault"),
        sourceTitle: activeMaterial?.title || activeDocumentTitle,
        excerptText,
        selectionLabel: excerptLabel,
      }),
    );
  };

  return (
    <div className="space-y-4 font-mono text-sm text-foreground/78">
      <div className="rounded-[0.85rem] border border-primary/15 bg-black/15 p-3">
        {documentTabs.length > 0 ? (
          <div className="mb-3 flex flex-wrap gap-2">
            {documentTabs.map((tab) => {
              const isActive = tab.id === activeDocumentTabId;
              return (
                <Button
                  key={tab.id}
                  type="button"
                  variant="outline"
                  onClick={() => onSelectDocumentTab?.(tab.id)}
                  aria-pressed={isActive}
                  className={
                    isActive
                      ? "h-8 rounded-full border-primary/30 bg-primary/16 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-primary"
                      : "h-8 rounded-full border-primary/14 bg-black/20 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-foreground/72"
                  }
                >
                  {tab.title}
                </Button>
              );
            })}
          </div>
        ) : null}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-primary/72">
              Active document
            </div>
            <div className="mt-1 text-sm text-foreground">
              {activeDocumentTitle}
            </div>
            <div className="mt-1 break-all text-sm text-foreground/72">
              {activeDocumentPath}
            </div>
          </div>
          <Badge
            variant="outline"
            className="rounded-full border-primary/20 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-primary/84"
          >
            {formatFileType(activeFileType)}
          </Badge>
        </div>
      </div>

      <div className="rounded-[0.85rem] border border-primary/15 bg-black/15 p-3">
        <div className="text-[10px] uppercase tracking-[0.18em] text-primary/72">
          Current run
        </div>
        <div className="mt-1 text-sm text-foreground">
          {selectedMaterials.length} selected source files
        </div>
        <div className="mt-1 text-sm text-foreground/72">
          {selectedPaths.length} linked vault path{selectedPaths.length === 1 ? "" : "s"}
        </div>
      </div>

      <div className="rounded-[0.85rem] border border-primary/15 bg-black/15 p-3">
        <div className="text-[10px] uppercase tracking-[0.18em] text-primary/72">
          Source viewer
        </div>
        <div className="mt-1 text-sm text-foreground/72">
          Open a source here, then clip the passage you want to move into the workspace.
        </div>
        <div className="mt-3 min-h-[220px] overflow-hidden rounded-[0.85rem] border border-primary/12 bg-black/20">
          {activeMaterial ? (
            activeMaterialLoading ? (
              <div className="flex min-h-[220px] items-center justify-center font-mono text-sm text-foreground/60">
                Loading document...
              </div>
            ) : (
              <MaterialViewer
                source={{
                  id: activeMaterial.id,
                  title: activeMaterialContent?.title || activeMaterial.title,
                  fileName: activeMaterial.source_path,
                  fileType:
                    activeMaterialContent?.file_type || activeMaterial.file_type,
                  url: api.tutor.getMaterialFileUrl(activeMaterial.id),
                  textContent: activeMaterialContent?.content || null,
                }}
                className="min-h-[220px] border-0"
                onTextSelectionChange={({ text, label }) => {
                  setExcerptText(text);
                  setExcerptLabel(label);
                }}
              />
            )
          ) : activeVaultPath ? (
            activeVaultPreviewable ? (
              activeVaultLoading ? (
                <div className="flex min-h-[220px] items-center justify-center font-mono text-sm text-foreground/60">
                  Loading vault note...
                </div>
              ) : (
                <div className="h-full min-h-[220px] overflow-y-auto whitespace-pre-wrap p-4 font-mono text-sm leading-6 text-foreground/78">
                  {activeVaultText || "This vault note is empty."}
                </div>
              )
            ) : (
              <div className="flex min-h-[220px] items-center justify-center px-4 text-center font-mono text-sm text-foreground/60">
                Vault folders and non-markdown links can stay in the run as source references even
                when there is no inline preview.
              </div>
            )
          ) : (
            <div className="flex min-h-[220px] items-center justify-center font-mono text-sm text-foreground/60">
              No active document selected.
            </div>
          )}
        </div>
      </div>

      <div className="rounded-[0.85rem] border border-primary/15 bg-black/15 p-3">
        <div className="text-[10px] uppercase tracking-[0.18em] text-primary/72">
          Selected passage
        </div>
        <div className="mt-1 text-sm text-foreground/72">
          Clip the active document into the workspace as a provenance-linked excerpt.
        </div>
        <Textarea
          aria-label="Selected passage"
          value={excerptText}
          onChange={(event) => setExcerptText(event.target.value)}
          rows={5}
          className="mt-3 min-h-[120px] rounded-[0.85rem] border-primary/18 bg-black/20 font-mono text-sm text-foreground"
          placeholder="Paste or refine the excerpt you want to clip into the workspace."
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="text-xs text-foreground/60">
            {excerptLabel || activeMaterial?.title || "No active document selected"}
          </div>
          <Button
            type="button"
            onClick={handleClipExcerpt}
            disabled={!canClipExcerpt}
            className="rounded-[0.7rem] border border-primary/20 bg-primary/16 px-3 py-2 font-mono text-xs uppercase tracking-[0.12em] text-primary hover:bg-primary/24 disabled:opacity-50"
          >
            Clip excerpt to workspace
          </Button>
        </div>
      </div>

      {selectedPaths.length > 0 ? (
        <div className="space-y-2 rounded-[0.85rem] border border-primary/10 bg-black/10 p-3 text-foreground/72">
          {selectedPaths.slice(0, 3).map((path) => (
            <div key={path} className="break-all">
              {path}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
