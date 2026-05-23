import { useEffect, useMemo, useState, type ClipboardEvent } from "react";
import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DocumentPaneWorkspace } from "@/components/studio/DocumentPaneWorkspace";
import type { Material } from "@/lib/api";
import {
  assignTabToDocumentPane,
  clearTabFromDocumentPanes,
  closeDocumentPaneLeaf,
  collectDocumentPaneLeaves,
  createDocumentPaneLayout,
  findDocumentPaneLeaf,
  MAX_DOCUMENT_PANE_LEAVES,
  splitDocumentPane,
  type DocumentPaneSplitDirection,
} from "@/lib/documentPaneLayout";
import { clampMaterialViewerZoom } from "@/lib/materialViewerZoom";
import { basenameFromPath } from "@/lib/pathDisplay";
import type { StudioDocumentTab } from "@/lib/studioPanelLayout";
import { cn } from "@/lib/utils";
import {
  createStudioExcerptWorkspaceObject,
  createStudioImageWorkspaceObject,
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
  onCloseDocumentTab?: (tabId: string) => void;
  onClipExcerpt?: (workspaceObject: StudioWorkspaceObject) => void;
}

interface ClipboardImageClip {
  url: string;
  mimeType: string | null;
}

function formatFileType(value: string | null | undefined): string {
  const normalized = String(value || "").trim();
  return normalized ? normalized.toUpperCase() : "FILE";
}

async function readBlobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Clipboard image reader returned a non-string result."));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Clipboard image read failed."));
    reader.readAsDataURL(blob);
  });
}

async function readClipboardImage(
  clipboardData: DataTransfer | null,
): Promise<ClipboardImageClip | null> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.read) {
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const clipboardItem of clipboardItems) {
        const imageType = clipboardItem.types.find((type) => type.startsWith("image/"));
        if (!imageType) continue;
        const blob = await clipboardItem.getType(imageType);
        return {
          url: await readBlobAsDataUrl(blob),
          mimeType: imageType,
        };
      }
    } catch {
      // Fall back to the paste event payload below when browser clipboard permissions block reads.
    }
  }

  const clipboardItems = Array.from(clipboardData?.items ?? []);
  for (const item of clipboardItems) {
    if (!item.type.startsWith("image/")) continue;
    const blob = item.getAsFile();
    if (!blob) continue;
    return {
      url: await readBlobAsDataUrl(blob),
      mimeType: blob.type || item.type || null,
    };
  }

  return null;
}

export function StudioDocumentDock({
  materials,
  selectedMaterialIds,
  selectedPaths,
  viewerState,
  documentTabs = [],
  activeDocumentTabId = null,
  onSelectDocumentTab,
  onCloseDocumentTab,
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

  const hasDocumentTabs = documentTabs.length > 0;
  const viewerMaterialId =
    typeof viewerState?.material_id === "number" ? viewerState.material_id : null;
  const activeTabMaterialId =
    activeTab?.kind === "material" && typeof activeTab.sourceId === "number"
      ? activeTab.sourceId
      : null;
  const activeMaterial = useMemo(() => {
    if (hasDocumentTabs) {
      if (activeTabMaterialId === null) return null;
      return materialById.get(activeTabMaterialId) ?? null;
    }

    if (activeTabMaterialId !== null) {
      return materialById.get(activeTabMaterialId) ?? null;
    }
    if (viewerMaterialId !== null) {
      return materialById.get(viewerMaterialId) ?? null;
    }
    return selectedMaterials[0] ?? null;
  }, [
    activeTabMaterialId,
    hasDocumentTabs,
    materialById,
    selectedMaterials,
    viewerMaterialId,
  ]);
  const activeVaultPath = useMemo(() => {
    if (activeTab?.kind === "vault" && typeof activeTab.sourcePath === "string") {
      return activeTab.sourcePath;
    }
    if (hasDocumentTabs) {
      return null;
    }
    if (
      typeof viewerState?.source_kind === "string" &&
      viewerState.source_kind === "vault" &&
      typeof viewerState?.source_path === "string"
    ) {
      return viewerState.source_path;
    }
    return null;
  }, [activeTab, hasDocumentTabs, viewerState]);
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
  const viewerFallbackTab = useMemo((): StudioDocumentTab | null => {
    if (hasDocumentTabs) return null;
    if (activeMaterial) {
      return {
        id: `doc-material-${activeMaterial.id}`,
        kind: "material",
        title: activeMaterial.title,
        sourceId: activeMaterial.id,
        sourcePath: activeMaterial.source_path ?? null,
      };
    }
    if (activeVaultPath) {
      return {
        id: `doc-vault-${activeVaultPath}`,
        kind: "vault",
        title: activeDocumentTitle,
        sourcePath: activeVaultPath,
      };
    }
    return null;
  }, [
    activeDocumentTitle,
    activeMaterial,
    activeVaultPath,
    hasDocumentTabs,
  ]);
  const workspaceDocumentTabs = useMemo(() => {
    if (documentTabs.length > 0) return documentTabs;
    return viewerFallbackTab ? [viewerFallbackTab] : [];
  }, [documentTabs, viewerFallbackTab]);
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
  const [clipImage, setClipImage] = useState<ClipboardImageClip | null>(null);
  const [clipStatus, setClipStatus] = useState<string | null>(null);
  const [paneLayout, setPaneLayout] = useState(() =>
    createDocumentPaneLayout(activeDocumentTabId),
  );
  const [activePaneId, setActivePaneId] = useState(
    () => collectDocumentPaneLeaves(paneLayout)[0]?.id ?? "pane-1",
  );
  const [paneZoomLevels, setPaneZoomLevels] = useState<Record<string, number>>({});
  const paneLeafCount = collectDocumentPaneLeaves(paneLayout).length;
  const canSplitFurther = paneLeafCount < MAX_DOCUMENT_PANE_LEAVES;

  const handleFocusPane = (paneId: string) => {
    setActivePaneId(paneId);
    const leaf = findDocumentPaneLeaf(paneLayout, paneId);
    if (leaf?.tabId && leaf.tabId !== activeDocumentTabId) {
      onSelectDocumentTab?.(leaf.tabId);
    }
  };

  const handleSelectDocumentTab = (tabId: string) => {
    setPaneLayout((current) => assignTabToDocumentPane(current, activePaneId, tabId));
    onSelectDocumentTab?.(tabId);
  };

  const handleCloseDocumentTab = (tabId: string) => {
    setPaneLayout((current) => clearTabFromDocumentPanes(current, tabId));
    onCloseDocumentTab?.(tabId);
  };

  const handleSplitPane = (
    paneId: string,
    direction: DocumentPaneSplitDirection,
  ) => {
    setPaneLayout((current) => {
      const next = splitDocumentPane(current, paneId, direction);
      return next ?? current;
    });
  };

  const handleClosePane = (paneId: string) => {
    const nextLayout = closeDocumentPaneLeaf(paneLayout, paneId);
    const leaves = collectDocumentPaneLeaves(nextLayout);
    const nextActivePaneId = leaves.some((leaf) => leaf.id === activePaneId)
      ? activePaneId
      : leaves[0]?.id ?? activePaneId;

    setPaneLayout(nextLayout);
    setActivePaneId(nextActivePaneId);

    const focusedLeaf = findDocumentPaneLeaf(nextLayout, nextActivePaneId);
    if (focusedLeaf?.tabId && focusedLeaf.tabId !== activeDocumentTabId) {
      onSelectDocumentTab?.(focusedLeaf.tabId);
    }
  };

  const handlePaneZoomChange = (paneId: string, zoom: number) => {
    setPaneZoomLevels((current) => ({
      ...current,
      [paneId]: clampMaterialViewerZoom(zoom),
    }));
  };

  useEffect(() => {
    const tabIdForPane = activeDocumentTabId ?? viewerFallbackTab?.id ?? null;
    if (!tabIdForPane) return;
    setPaneLayout((current) => {
      const activeLeaf = findDocumentPaneLeaf(current, activePaneId);
      if (activeLeaf?.tabId === tabIdForPane) {
        return current;
      }
      return assignTabToDocumentPane(current, activePaneId, tabIdForPane);
    });
  }, [activeDocumentTabId, activePaneId, viewerFallbackTab?.id]);

  useEffect(() => {
    setExcerptText(initialExcerptText);
    setExcerptLabel(selectionLabel);
    setClipImage(null);
    setClipStatus(null);
  }, [activeDocumentTabId, initialExcerptText, selectionLabel]);

  const canClipExcerpt =
    (excerptText.trim().length > 0 || clipImage !== null) &&
    Boolean(activeMaterial || activeVaultPath);

  const handleClipExcerpt = () => {
    if ((!excerptText.trim() && !clipImage) || (!activeMaterial && !activeVaultPath)) return;

    if (clipImage) {
      onClipExcerpt?.(
        createStudioImageWorkspaceObject({
          sourceTitle: activeMaterial?.title || activeDocumentTitle,
          detail: excerptLabel?.trim()
            ? `${excerptLabel} • Pasted from clipboard`
            : "Pasted from clipboard",
          assetUrl: clipImage.url,
          mimeType: clipImage.mimeType,
        }),
      );
      setClipStatus("Image clip added to workspace.");
      return;
    }

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
    setClipStatus(null);
  };

  const handlePaste = async (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const hasClipboardImage = Array.from(event.clipboardData?.items ?? []).some((item) =>
      item.type.startsWith("image/"),
    );
    if (!hasClipboardImage) {
      return;
    }

    event.preventDefault();
    const pastedImage = await readClipboardImage(event.clipboardData ?? null);
    if (!pastedImage) {
      setClipStatus("Clipboard image could not be read.");
      return;
    }

    setExcerptText("");
    setExcerptLabel("Clipboard image");
    setClipImage(pastedImage);
    setClipStatus("Clipboard image ready to clip.");
  };

  return (
    <div className="space-y-4 font-mono text-sm text-foreground/78">
      <div className="rounded-[var(--ds-r-085)] border border-primary/15 bg-black/15 p-3">
        {documentTabs.length > 0 ? (
          <div
            data-testid="document-dock-tabs"
            className="mb-3 flex max-w-full gap-2 overflow-x-auto pb-1"
          >
            {documentTabs.map((tab) => {
              const isActive = tab.id === activeDocumentTabId;
              return (
                <div
                  key={tab.id}
                  className={cn(
                    "flex shrink-0 items-stretch overflow-hidden rounded-full border",
                    isActive
                      ? "border-primary/30 bg-primary/16"
                      : "border-primary/14 bg-black/20",
                  )}
                >
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleSelectDocumentTab(tab.id)}
                    aria-pressed={isActive}
                    title={tab.title}
                    className={cn(
                      "h-8 max-w-[220px] rounded-none border-0 bg-transparent px-3 font-mono text-[10px] uppercase tracking-[0.18em] shadow-none hover:bg-transparent",
                      isActive ? "text-primary" : "text-foreground/72",
                    )}
                  >
                    <span className="truncate">{tab.title}</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    aria-label={`Close ${tab.title}`}
                    title={`Close ${tab.title}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleCloseDocumentTab(tab.id);
                    }}
                    className="h-8 w-8 shrink-0 rounded-none border-0 border-l border-primary/14 bg-transparent px-0 text-foreground/60 shadow-none hover:bg-black/25 hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        ) : null}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.18em] text-primary/72">
              Active document
            </div>
            <div className="mt-1 truncate text-sm text-foreground" title={activeDocumentTitle}>
              {activeDocumentTitle}
            </div>
            <div
              className="mt-1 truncate text-xs text-foreground/60"
              title={activeDocumentPath}
            >
              {basenameFromPath(activeDocumentPath) || activeDocumentPath}
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

      <div className="rounded-[var(--ds-r-085)] border border-primary/15 bg-black/15 p-3">
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

      <div className="rounded-[var(--ds-r-085)] border border-primary/15 bg-black/15 p-3">
        <div className="text-[10px] uppercase tracking-[0.18em] text-primary/72">
          Source viewer
        </div>
        <div className="mt-1 text-sm text-foreground/72">
          Open sources from the shelf to add tabs. Split panes side-by-side or stacked, drag
          dividers to resize, and each pane keeps its own zoom.
        </div>
        <div className="mt-3">
          <DocumentPaneWorkspace
            layout={paneLayout}
            activePaneId={activePaneId}
            documentTabs={workspaceDocumentTabs}
            materials={materials}
            paneZoomLevels={paneZoomLevels}
            canSplitFurther={canSplitFurther}
            onFocusPane={handleFocusPane}
            onSplitPane={handleSplitPane}
            onClosePane={handleClosePane}
            onPaneZoomChange={handlePaneZoomChange}
            onTextSelectionChange={({ text, label }) => {
              setExcerptText(text);
              setExcerptLabel(label);
            }}
          />
        </div>
      </div>

      <div className="rounded-[var(--ds-r-085)] border border-primary/15 bg-black/15 p-3">
        <div className="text-[10px] uppercase tracking-[0.18em] text-primary/72">
          Selected passage
        </div>
        <div className="mt-1 text-sm text-foreground/72">
          Clip the active document into the workspace as a provenance-linked excerpt.
        </div>
        <div className="mt-1 text-xs text-foreground/60">
          Paste an image with Ctrl+V.
        </div>
        {clipImage ? (
          <div className="mt-3 rounded-[var(--ds-r-085)] border border-primary/16 bg-black/25 p-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-primary/72">
              Pasted image preview
            </div>
            <img
              src={clipImage.url}
              alt={`Pasted clipboard clip for ${activeDocumentTitle}`}
              data-testid="document-dock-clip-image-preview"
              className="mt-3 max-h-48 w-full rounded-[var(--ds-r-075)] border border-primary/12 object-contain"
            />
            <div className="mt-3 flex items-center justify-between gap-3 text-xs text-foreground/62">
              <span>{clipStatus || "Clipboard image ready to clip."}</span>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setClipImage(null);
                  setClipStatus(null);
                }}
                className="h-8 rounded-full border-primary/20 bg-black/20 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-foreground/72"
              >
                Remove image
              </Button>
            </div>
          </div>
        ) : null}
        <Textarea
          aria-label="Selected passage"
          value={excerptText}
          onChange={(event) => {
            setExcerptText(event.target.value);
            if (clipImage) {
              setClipImage(null);
              setClipStatus(null);
            }
          }}
          onPaste={handlePaste}
          rows={5}
          className="mt-3 min-h-[120px] rounded-[var(--ds-r-085)] border-primary/18 bg-black/20 font-mono text-sm text-foreground"
          placeholder="Paste or refine the excerpt you want to clip into the workspace."
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="text-xs text-foreground/60">
            {clipImage
              ? excerptLabel || "Clipboard image"
              : excerptLabel || activeMaterial?.title || "No active document selected"}
          </div>
          <Button
            type="button"
            onClick={handleClipExcerpt}
            disabled={!canClipExcerpt}
            className="rounded-[var(--ds-r-070)] border border-primary/20 bg-primary/16 px-3 py-2 font-mono text-xs uppercase tracking-[0.12em] text-primary hover:bg-primary/24 disabled:opacity-50"
          >
            Clip excerpt to workspace
          </Button>
        </div>
      </div>

      {selectedPaths.length > 0 ? (
        <div className="space-y-2 rounded-[var(--ds-r-085)] border border-primary/10 bg-black/10 p-3 text-foreground/72">
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
