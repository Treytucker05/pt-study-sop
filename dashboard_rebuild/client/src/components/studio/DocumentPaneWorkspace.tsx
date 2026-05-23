import { useMemo, type ReactNode } from "react";
import { Columns2, Rows2, X } from "lucide-react";
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from "react-resizable-panels";

import { Button } from "@/components/ui/button";
import { DocumentPaneContent } from "@/components/studio/DocumentPaneContent";
import type { Material } from "@/lib/api";
import {
  collectDocumentPaneLeaves,
  type DocumentPaneNode,
  type DocumentPaneSplitDirection,
  SPLIT_SIDE_BY_SIDE,
  SPLIT_STACKED,
} from "@/lib/documentPaneLayout";
import { basenameFromPath } from "@/lib/pathDisplay";
import type { StudioDocumentTab } from "@/lib/studioPanelLayout";
import { cn } from "@/lib/utils";

interface DocumentPaneWorkspaceProps {
  layout: DocumentPaneNode;
  activePaneId: string;
  documentTabs: StudioDocumentTab[];
  materials: Material[];
  paneZoomLevels: Record<string, number>;
  onFocusPane: (paneId: string) => void;
  onSplitPane: (paneId: string, direction: DocumentPaneSplitDirection) => void;
  onClosePane: (paneId: string) => void;
  onPaneZoomChange: (paneId: string, zoom: number) => void;
  onTextSelectionChange?: ((selection: {
    text: string;
    label: string | null;
  }) => void) | null;
  canSplitFurther: boolean;
}

function resolveTabTitle(tab: StudioDocumentTab | null | undefined): string {
  if (!tab) return "Empty pane";
  if (tab.sourcePath) {
    return basenameFromPath(tab.sourcePath) || tab.title;
  }
  return tab.title || "Untitled";
}

function DocumentPaneLeafView({
  leafId,
  tab,
  isActive,
  canSplitFurther,
  zoom,
  materials,
  onFocusPane,
  onSplitPane,
  onClosePane,
  onPaneZoomChange,
  onTextSelectionChange,
  showClosePane,
}: {
  leafId: string;
  tab: StudioDocumentTab | null;
  isActive: boolean;
  canSplitFurther: boolean;
  zoom: number;
  materials: DocumentPaneWorkspaceProps["materials"];
  onFocusPane: (paneId: string) => void;
  onSplitPane: (paneId: string, direction: DocumentPaneSplitDirection) => void;
  onClosePane: (paneId: string) => void;
  onPaneZoomChange: (paneId: string, zoom: number) => void;
  onTextSelectionChange?: DocumentPaneWorkspaceProps["onTextSelectionChange"];
  showClosePane: boolean;
}) {
  return (
    <div
      data-testid={`document-pane-${leafId}`}
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden bg-black/20",
        isActive
          ? "ring-1 ring-inset ring-primary/45"
          : "ring-1 ring-inset ring-transparent",
      )}
      onMouseDown={() => onFocusPane(leafId)}
    >
      <div className="flex shrink-0 items-center gap-1 border-b border-primary/12 bg-black/30 px-2 py-1">
        <span
          className="min-w-0 flex-1 truncate font-mono text-[10px] uppercase tracking-[0.14em] text-foreground/85"
          title={resolveTabTitle(tab)}
        >
          {resolveTabTitle(tab)}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          title="Split side by side"
          aria-label="Split side by side"
          disabled={!canSplitFurther}
          onClick={() => onSplitPane(leafId, SPLIT_SIDE_BY_SIDE)}
          className="h-6 w-6 rounded-none text-foreground/70 hover:bg-primary/10 hover:text-primary"
        >
          <Columns2 className="h-3 w-3" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          title="Split top and bottom"
          aria-label="Split top and bottom"
          disabled={!canSplitFurther}
          onClick={() => onSplitPane(leafId, SPLIT_STACKED)}
          className="h-6 w-6 rounded-none text-foreground/70 hover:bg-primary/10 hover:text-primary"
        >
          <Rows2 className="h-3 w-3" />
        </Button>
        {showClosePane ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            title="Close pane"
            aria-label="Close pane"
            onClick={() => onClosePane(leafId)}
            className="h-6 w-6 rounded-none text-foreground/70 hover:bg-primary/10 hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </Button>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <DocumentPaneContent
          tab={tab}
          materials={materials}
          zoom={zoom}
          onZoomChange={(nextZoom) => onPaneZoomChange(leafId, nextZoom)}
          onTextSelectionChange={isActive ? onTextSelectionChange : null}
        />
      </div>
    </div>
  );
}

function renderPaneNode(
  node: DocumentPaneNode,
  props: DocumentPaneWorkspaceProps,
  tabById: Map<string, StudioDocumentTab>,
  order: number,
): ReactNode {
  if (node.type === "leaf") {
    const tab = node.tabId ? tabById.get(node.tabId) ?? null : null;
    const leafCount = collectDocumentPaneLeaves(props.layout).length;

    return (
      <Panel
        id={node.id}
        order={order}
        minSize={12}
        defaultSize={100 / Math.max(leafCount, 1)}
        className="min-h-0 min-w-0"
      >
        <DocumentPaneLeafView
          leafId={node.id}
          tab={tab}
          isActive={props.activePaneId === node.id}
          canSplitFurther={props.canSplitFurther}
          zoom={props.paneZoomLevels[node.id] ?? 1}
          materials={props.materials}
          onFocusPane={props.onFocusPane}
          onSplitPane={props.onSplitPane}
          onClosePane={props.onClosePane}
          onPaneZoomChange={props.onPaneZoomChange}
          onTextSelectionChange={props.onTextSelectionChange}
          showClosePane={leafCount > 1}
        />
      </Panel>
    );
  }

  const direction = node.direction === "horizontal" ? "horizontal" : "vertical";

  return (
    <PanelGroup
      direction={direction}
      className="h-full min-h-0"
      autoSaveId={`document-pane-split-${node.id}`}
    >
      {renderPaneNode(node.children[0], props, tabById, order * 2)}
      <PanelResizeHandle
        className={cn(
          "document-pane-resize-handle shrink-0 bg-primary/10 transition-colors hover:bg-primary/35 data-[resize-handle-active]:bg-primary/55",
          direction === "horizontal" ? "w-1.5" : "h-1.5 w-full",
        )}
      />
      {renderPaneNode(node.children[1], props, tabById, order * 2 + 1)}
    </PanelGroup>
  );
}

export function DocumentPaneWorkspace(props: DocumentPaneWorkspaceProps) {
  const tabById = useMemo(
    () => new Map(props.documentTabs.map((tab) => [tab.id, tab] as const)),
    [props.documentTabs],
  );

  const shellClassName =
    "h-full min-h-[220px] overflow-hidden rounded-[var(--ds-r-085)] border border-primary/12";

  if (props.layout.type === "leaf") {
    const tab = props.layout.tabId
      ? tabById.get(props.layout.tabId) ?? null
      : null;

    return (
      <div data-testid="document-pane-workspace" className={shellClassName}>
        <DocumentPaneLeafView
          leafId={props.layout.id}
          tab={tab}
          isActive
          canSplitFurther={props.canSplitFurther}
          zoom={props.paneZoomLevels[props.layout.id] ?? 1}
          materials={props.materials}
          onFocusPane={props.onFocusPane}
          onSplitPane={props.onSplitPane}
          onClosePane={props.onClosePane}
          onPaneZoomChange={props.onPaneZoomChange}
          onTextSelectionChange={props.onTextSelectionChange}
          showClosePane={false}
        />
      </div>
    );
  }

  return (
    <div data-testid="document-pane-workspace" className={shellClassName}>
      {renderPaneNode(props.layout, props, tabById, 1)}
    </div>
  );
}
