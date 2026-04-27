import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  BookOpen,
  Brain,
  ChevronDown,
  Crosshair,
  FileText,
  Layers,
  LayoutGrid,
  Maximize2,
  MessageSquare,
  NotebookPen,
  Package,
  Settings2,
  Sparkles,
  StickyNote,
  Target,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  TransformComponent,
  TransformWrapper,
  type ReactZoomPanPinchRef,
} from "react-zoom-pan-pinch";

import {
  WorkspacePanel,
  WORKSPACE_PANEL_SIZE_PRESETS,
  type WorkspacePanelSizePresetKey,
} from "@/components/ui/WorkspacePanel";
import { Button } from "@/components/ui/button";
import type { StudioPanelLayoutItem } from "@/lib/studioPanelLayout";
import { cn } from "@/lib/utils";

export type StudioShellPreset =
  | "priming"
  | "study"
  | "polish"
  | "full_studio"
  | "minimal";

type StudioPanelDefinition = {
  panel: string;
  title: string;
  testId: string;
  icon: typeof FileText;
  allowMultiple?: boolean;
  defaultPosition: { x: number; y: number };
  defaultSize: { width: number; height: number };
  minWidth?: number;
  minHeight?: number;
  content: ReactNode;
};

type PanelLayoutChangeSource = "local" | "restore";

const PANEL_ALIASES: Record<string, string> = {
  priming: "priming_chat",
  tutor: "tutor_chat",
  polish: "polish_chat",
  source_shelf: "source_shelf",
  document_dock: "document_dock",
  workspace: "workspace",
  run_config: "run_config",
  memory: "memory",
  prime_packet: "prime_packet",
  polish_packet: "polish_packet",
};

type PipelineStage =
  | "load"
  | "read"
  | "prime"
  | "tutor"
  | "polish"
  | "export"
  | "workbench"
  | "settings";

const PIPELINE_STAGES: { key: PipelineStage; label: string }[] = [
  { key: "load", label: "LOAD" },
  { key: "read", label: "READ" },
  { key: "prime", label: "PRIME" },
  { key: "tutor", label: "TUTOR" },
  { key: "polish", label: "POLISH" },
  { key: "export", label: "EXPORT" },
];

const SIDE_CLUSTERS: { key: PipelineStage; label: string }[] = [
  { key: "workbench", label: "WORKBENCH" },
  { key: "settings", label: "SETTINGS" },
];

const PANEL_STAGE_MAP: Record<string, PipelineStage> = {
  source_shelf: "load",
  document_dock: "read",
  priming_chat: "prime",
  prime_packet: "prime",
  tutor_chat: "tutor",
  polish_packet: "tutor",
  polish_chat: "polish",
  obsidian: "export",
  anki: "export",
  workspace: "workbench",
  notes: "workbench",
  run_config: "settings",
  memory: "settings",
};

const LAYOUT_PRESETS: { key: StudioShellPreset; label: string; hint: string }[] =
  [
    { key: "priming", label: "Prime", hint: "Sources + Workspace + Prime Packet" },
    { key: "study", label: "Study", hint: "Live tutoring set" },
    { key: "polish", label: "Polish", hint: "Polish + outputs" },
    { key: "full_studio", label: "Full Studio", hint: "Every panel" },
    { key: "minimal", label: "Minimal", hint: "Bare canvas" },
  ];

const PRESET_PANEL_KEYS: Record<StudioShellPreset, string[]> = {
  priming: [
    "source_shelf",
    "document_dock",
    "priming_chat",
    "prime_packet",
    "run_config",
  ],
  study: [
    "document_dock",
    "workspace",
    "tutor_chat",
    "memory",
  ],
  polish: ["polish_chat", "polish_packet", "workspace"],
  full_studio: [
    "source_shelf",
    "document_dock",
    "workspace",
    "priming_chat",
    "tutor_chat",
    "polish_chat",
    "prime_packet",
    "polish_packet",
    "run_config",
    "memory",
    "notes",
  ],
  minimal: ["tutor_chat"],
};

const CANVAS_WIDTH = 4400;
const CANVAS_HEIGHT = 3200;
const CANVAS_MIN_SCALE = 0.45;
const CANVAS_MAX_SCALE = 1.8;
const CANVAS_SCALE_STEP = 0.01;
const PANEL_MAXIMIZED_SIZE = { width: 1200, height: 900 };
const TILE_START_X = 56;
const TILE_START_Y = 56;
const TILE_GAP_X = 32;
const TILE_GAP_Y = 32;
const TILE_LAYOUT_MAX_WIDTH = 2600;
const VIEWPORT_PADDING_X = 64;
const VIEWPORT_PADDING_TOP = 56;
const VIEWPORT_PADDING_BOTTOM = 96;
const MIN_VIEWPORT_FOCUS_SCALE = 0.6;
const MAX_VIEWPORT_FOCUS_SCALE = 1;
const PRESET_LAYOUT_DEFAULTS: Record<
  string,
  {
    defaultPosition: { x: number; y: number };
    defaultSize: { width: number; height: number };
  }
> = {
  source_shelf: {
    defaultPosition: { x: 72, y: 120 },
    defaultSize: { width: 360, height: 640 },
  },
  document_dock: {
    defaultPosition: { x: 472, y: 120 },
    defaultSize: { width: 840, height: 760 },
  },
  workspace: {
    defaultPosition: { x: 1360, y: 120 },
    defaultSize: { width: 940, height: 760 },
  },
  priming_chat: {
    defaultPosition: { x: 2360, y: 120 },
    defaultSize: { width: 560, height: 760 },
  },
  tutor_chat: {
    defaultPosition: { x: 2360, y: 920 },
    defaultSize: { width: 680, height: 940 },
  },
  polish_chat: {
    defaultPosition: { x: 2360, y: 120 },
    defaultSize: { width: 560, height: 760 },
  },
  prime_packet: {
    defaultPosition: { x: 72, y: 820 },
    defaultSize: { width: 420, height: 520 },
  },
  polish_packet: {
    defaultPosition: { x: 532, y: 820 },
    defaultSize: { width: 420, height: 520 },
  },
  run_config: {
    defaultPosition: { x: 992, y: 920 },
    defaultSize: { width: 420, height: 520 },
  },
  memory: {
    defaultPosition: { x: 1452, y: 1380 },
    defaultSize: { width: 420, height: 420 },
  },
  notes: {
    defaultPosition: { x: 1912, y: 1380 },
    defaultSize: { width: 460, height: 420 },
  },
};

function normalizePanelKey(panel: string): string {
  return PANEL_ALIASES[panel] ?? panel;
}

function buildPanelId(
  definition: StudioPanelDefinition,
  instanceNumber = 1,
): string {
  if (definition.allowMultiple) {
    return `panel-${definition.panel}-${instanceNumber}`;
  }
  return `panel-${definition.panel}`;
}

function buildPanelLayoutItem(
  definition: StudioPanelDefinition,
  instanceNumber = 1,
): Omit<StudioPanelLayoutItem, "position"> {
  return {
    id: buildPanelId(definition, instanceNumber),
    panel: definition.panel,
    size: definition.defaultSize,
    zIndex: instanceNumber,
    collapsed: false,
  };
}

function tilePanelLayout(
  items: Omit<StudioPanelLayoutItem, "position">[],
): StudioPanelLayoutItem[] {
  let cursorX = TILE_START_X;
  let cursorY = TILE_START_Y;
  let rowHeight = 0;

  return items.map((item, index) => {
    const rowLimit = TILE_START_X + TILE_LAYOUT_MAX_WIDTH;
    const wouldOverflowRow =
      cursorX !== TILE_START_X && cursorX + item.size.width > rowLimit;

    if (wouldOverflowRow) {
      cursorX = TILE_START_X;
      cursorY += rowHeight + TILE_GAP_Y;
      rowHeight = 0;
    }

    const position = { x: cursorX, y: cursorY };
    cursorX += item.size.width + TILE_GAP_X;
    rowHeight = Math.max(rowHeight, item.size.height);

    return {
      ...item,
      position,
      zIndex: item.zIndex || index + 1,
    };
  });
}

function makePlaceholder(
  title: string,
  description: string,
): ReactNode {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 rounded-[0.9rem] border border-dashed border-[rgba(255,104,132,0.24)] bg-black/20 p-4 text-center">
      <div className="font-mono text-sm uppercase tracking-[0.18em] text-[#ffd6de]">
        {title}
      </div>
      <p className="max-w-sm font-mono text-xs leading-6 text-[#ffc8d3]/72">
        {description}
      </p>
    </div>
  );
}

function createPresetLayout(
  preset: StudioShellPreset,
  definitions: StudioPanelDefinition[],
): StudioPanelLayoutItem[] {
  const orderedDefinitions = PRESET_PANEL_KEYS[preset]
    .map((panelKey) =>
      definitions.find((definition) => definition.panel === panelKey),
    )
    .filter((definition): definition is StudioPanelDefinition =>
      Boolean(definition),
    );

  return tilePanelLayout(
    orderedDefinitions.map((definition, index) => ({
      ...buildPanelLayoutItem(definition),
      zIndex: index + 1,
    })),
  );
}

export function buildStudioShellPresetLayout(
  preset: StudioShellPreset,
): StudioPanelLayoutItem[] {
  const seeds = PRESET_PANEL_KEYS[preset]
    .map((panelKey, index) => {
      const defaults = PRESET_LAYOUT_DEFAULTS[panelKey];
      if (!defaults) return null;
      return {
        id: `panel-${panelKey}`,
        panel: panelKey,
        size: defaults.defaultSize,
        zIndex: index + 1,
        collapsed: false,
      } satisfies Omit<StudioPanelLayoutItem, "position">;
    })
    .filter(
      (item): item is Omit<StudioPanelLayoutItem, "position"> => Boolean(item),
    );

  return tilePanelLayout(seeds);
}

type StudioShellViewportFocus = {
  scale: number;
  positionX: number;
  positionY: number;
};

function getLayoutBounds(layout: StudioPanelLayoutItem[]) {
  const minX = Math.min(...layout.map((item) => item.position.x));
  const minY = Math.min(...layout.map((item) => item.position.y));
  const maxX = Math.max(
    ...layout.map((item) => item.position.x + item.size.width),
  );
  const maxY = Math.max(
    ...layout.map((item) => item.position.y + item.size.height),
  );

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(maxX - minX, 1),
    height: Math.max(maxY - minY, 1),
  };
}

export function buildStudioShellViewportFocus(
  layout: StudioPanelLayoutItem[],
  viewportWidth: number,
  viewportHeight: number,
): StudioShellViewportFocus {
  if (layout.length === 0 || viewportWidth <= 0 || viewportHeight <= 0) {
    return {
      scale: 1,
      positionX: 0,
      positionY: 0,
    };
  }

  const bounds = getLayoutBounds(layout);
  const availableWidth = Math.max(viewportWidth - VIEWPORT_PADDING_X * 2, 320);
  const availableHeight = Math.max(
    viewportHeight - VIEWPORT_PADDING_TOP - VIEWPORT_PADDING_BOTTOM,
    320,
  );
  const fitScale = Math.min(
    availableWidth / bounds.width,
    availableHeight / bounds.height,
    MAX_VIEWPORT_FOCUS_SCALE,
  );
  const scale = Math.max(MIN_VIEWPORT_FOCUS_SCALE, fitScale);

  return {
    scale,
    positionX: (viewportWidth - bounds.width * scale) / 2 - bounds.minX * scale,
    positionY: VIEWPORT_PADDING_TOP - bounds.minY * scale,
  };
}

function buildStudioShellViewportCenter(
  layout: StudioPanelLayoutItem[],
  viewportWidth: number,
  viewportHeight: number,
  scale: number,
): StudioShellViewportFocus {
  if (layout.length === 0 || viewportWidth <= 0 || viewportHeight <= 0) {
    return {
      scale: Number.isFinite(scale) && scale > 0 ? scale : 1,
      positionX: 0,
      positionY: 0,
    };
  }

  const bounds = getLayoutBounds(layout);
  const resolvedScale = Number.isFinite(scale) && scale > 0 ? scale : 1;

  return {
    scale: resolvedScale,
    positionX:
      (viewportWidth - bounds.width * resolvedScale) / 2 -
      bounds.minX * resolvedScale,
    positionY: VIEWPORT_PADDING_TOP - bounds.minY * resolvedScale,
  };
}

function spawnPanelLayout(
  current: StudioPanelLayoutItem[],
  definition: StudioPanelDefinition,
): StudioPanelLayoutItem[] {
  const normalizedCurrent = current.map((item) => ({
    ...item,
    panel: normalizePanelKey(item.panel),
  }));

  if (!definition.allowMultiple) {
    const existing = normalizedCurrent.find(
      (item) => item.panel === definition.panel,
    );
    if (existing) {
      return normalizedCurrent.map((item) =>
        item.id === existing.id ? { ...item, collapsed: false } : item,
      );
    }
  }

  const nextZIndex =
    normalizedCurrent.reduce(
      (highest, item) => Math.max(highest, item.zIndex || 0),
      0,
    ) + 1;
  const instanceNumber =
    normalizedCurrent.filter((item) => item.panel === definition.panel).length + 1;
  const nextItem = {
    ...buildPanelLayoutItem(definition, instanceNumber),
    zIndex: nextZIndex,
  };
  const tiledLayout = tilePanelLayout(
    [...normalizedCurrent, nextItem].map((item, index) => ({
      id: item.id,
      panel: item.panel,
      size: item.size,
      collapsed: item.collapsed,
      zIndex: item.zIndex || index + 1,
    })),
  );
  const tiledNextItem = tiledLayout[tiledLayout.length - 1];

  return [
    ...normalizedCurrent,
    {
      ...nextItem,
      position: tiledNextItem.position,
    },
  ];
}

function getGroupMembers(
  layout: StudioPanelLayoutItem[],
  groupId: string | null | undefined,
): string[] {
  if (!groupId) return [];
  return layout
    .filter((item) => item.groupId === groupId)
    .map((item) => item.id);
}

function resolvePanelSelection(
  layout: StudioPanelLayoutItem[],
  currentSelection: string[],
  panelId: string,
  additive: boolean,
): string[] {
  const panel = layout.find((item) => item.id === panelId);
  if (!panel) return currentSelection;

  const targetIds = panel.groupId
    ? getGroupMembers(layout, panel.groupId)
    : [panelId];

  if (!additive) {
    return targetIds;
  }

  const next = new Set(currentSelection);
  const allSelected = targetIds.every((id) => next.has(id));

  targetIds.forEach((id) => {
    if (allSelected) {
      next.delete(id);
    } else {
      next.add(id);
    }
  });

  return Array.from(next);
}

function resolveDragTargetIds(
  layout: StudioPanelLayoutItem[],
  anchorId: string,
  selectedPanelIds: string[],
): string[] {
  if (selectedPanelIds.includes(anchorId) && selectedPanelIds.length > 1) {
    return selectedPanelIds;
  }

  const anchor = layout.find((item) => item.id === anchorId);
  if (!anchor) return [anchorId];

  if (anchor.groupId) {
    return getGroupMembers(layout, anchor.groupId);
  }

  return [anchorId];
}

function applyGroupIdToPanels(
  layout: StudioPanelLayoutItem[],
  panelIds: string[],
  groupId: string | null,
): StudioPanelLayoutItem[] {
  const targetIds = new Set(panelIds);
  return layout.map((item) =>
    targetIds.has(item.id)
      ? {
          ...item,
          groupId,
        }
      : item,
  );
}

export function applyStudioShellPanelPositionUpdate(
  layout: StudioPanelLayoutItem[],
  anchorId: string,
  nextPosition: { x: number; y: number },
  selectedPanelIds: string[],
): StudioPanelLayoutItem[] {
  const anchor = layout.find((item) => item.id === anchorId);
  if (!anchor) return layout;

  const deltaX = nextPosition.x - anchor.position.x;
  const deltaY = nextPosition.y - anchor.position.y;
  const targetIds = new Set(
    resolveDragTargetIds(layout, anchorId, selectedPanelIds),
  );

  return layout.map((item) =>
    targetIds.has(item.id)
      ? {
          ...item,
          position: {
            x: item.position.x + deltaX,
            y: item.position.y + deltaY,
          },
        }
      : item,
  );
}

// Gap kept between panels when the collision resolver has to nudge a panel
// out of the way. Matches the tile-layout grid spacing so shoved panels look
// intentionally placed rather than jittered.
const PANEL_COLLISION_GAP = 16;

type Rect = { x: number; y: number; width: number; height: number };

function rectFromLayoutItem(item: StudioPanelLayoutItem): Rect {
  return {
    x: item.position.x,
    y: item.position.y,
    width: item.size.width,
    height: item.size.height,
  };
}

function rectsOverlap(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

// Nudge every non-anchor panel that overlaps an anchor panel out of the way
// along whichever axis has the smaller overlap (so it moves the least), then
// iterate until no overlaps remain. The anchor panels (the one the user just
// dragged/resized, plus any group/selection companions) never move — only
// the panels in their way do. Iteration cap prevents pathological thrashing
// when a push into one panel cascades into another.
export function resolveStudioShellPanelCollisions(
  layout: StudioPanelLayoutItem[],
  anchorIds: string[],
): StudioPanelLayoutItem[] {
  if (layout.length < 2 || anchorIds.length === 0) return layout;

  const anchors = new Set(anchorIds);
  let touchedCount = 0;
  const working = layout.map((item) => {
    if (anchors.has(item.id)) return item;
    return { ...item, position: { ...item.position } };
  });

  const maxIterations = Math.max(8, working.length * 3);
  let changed = true;
  let iterations = 0;

  while (changed && iterations < maxIterations) {
    changed = false;
    iterations += 1;
    for (let i = 0; i < working.length; i += 1) {
      const item = working[i];
      if (anchors.has(item.id)) continue;
      let itemRect = rectFromLayoutItem(item);
      for (let j = 0; j < working.length; j += 1) {
        if (j === i) continue;
        const other = working[j];
        const otherRect = rectFromLayoutItem(other);
        if (!rectsOverlap(itemRect, otherRect)) continue;

        const overlapX =
          Math.min(itemRect.x + itemRect.width, otherRect.x + otherRect.width) -
          Math.max(itemRect.x, otherRect.x);
        const overlapY =
          Math.min(itemRect.y + itemRect.height, otherRect.y + otherRect.height) -
          Math.max(itemRect.y, otherRect.y);

        if (overlapX <= 0 || overlapY <= 0) continue;

        if (overlapX < overlapY) {
          const itemCenterX = itemRect.x + itemRect.width / 2;
          const otherCenterX = otherRect.x + otherRect.width / 2;
          const pushRight = itemCenterX >= otherCenterX;
          item.position.x = pushRight
            ? otherRect.x + otherRect.width + PANEL_COLLISION_GAP
            : otherRect.x - itemRect.width - PANEL_COLLISION_GAP;
        } else {
          const itemCenterY = itemRect.y + itemRect.height / 2;
          const otherCenterY = otherRect.y + otherRect.height / 2;
          const pushDown = itemCenterY >= otherCenterY;
          item.position.y = pushDown
            ? otherRect.y + otherRect.height + PANEL_COLLISION_GAP
            : otherRect.y - itemRect.height - PANEL_COLLISION_GAP;
        }

        if (item.position.x < 0) item.position.x = PANEL_COLLISION_GAP;
        if (item.position.y < 0) item.position.y = PANEL_COLLISION_GAP;

        itemRect = rectFromLayoutItem(item);
        changed = true;
        touchedCount += 1;
      }
    }
  }

  if (touchedCount === 0) return layout;
  return working;
}

export interface StudioShellProps {
  entryCard?: ReactNode;
  defaultPreset?: StudioShellPreset;
  autoSeedDefaultPreset?: boolean;
  externalLayoutFocusRequestKey?: number | null;
  workspace?: ReactNode;
  sourceShelf?: ReactNode;
  documentDock?: ReactNode;
  primingPanel?: ReactNode;
  tutorPanel?: ReactNode;
  polishPanel?: ReactNode;
  runConfig?: ReactNode;
  memory?: ReactNode;
  primePacket?: ReactNode;
  polishPacket?: ReactNode;
  notesPanel?: ReactNode;
  obsidianPanel?: ReactNode;
  ankiPanel?: ReactNode;
  panelLayout: StudioPanelLayoutItem[];
  setPanelLayout: (
    next:
      | StudioPanelLayoutItem[]
      | ((current: StudioPanelLayoutItem[]) => StudioPanelLayoutItem[]),
  ) => void;
  onClearCanvas?: () => void;
  clearCanvasDisabled?: boolean;
}

export function StudioShell({
  entryCard,
  defaultPreset = "minimal",
  autoSeedDefaultPreset = true,
  externalLayoutFocusRequestKey = null,
  workspace,
  sourceShelf,
  documentDock,
  primingPanel,
  tutorPanel,
  polishPanel,
  runConfig,
  memory,
  primePacket,
  polishPacket,
  notesPanel,
  obsidianPanel,
  ankiPanel,
  panelLayout,
  setPanelLayout,
  onClearCanvas,
  clearCanvasDisabled = false,
}: StudioShellProps) {
  const [canvasScale, setCanvasScale] = useState(1);
  const [isCanvasDragging, setIsCanvasDragging] = useState(false);
  const [selectedPanelIds, setSelectedPanelIds] = useState<string[]>([]);
  const [panelTransformResetToken, setPanelTransformResetToken] = useState(0);
  const [panelPositionResetTokens, setPanelPositionResetTokens] = useState<
    Record<string, number>
  >({});
  const selectedPanelIdsRef = useRef<string[]>([]);
  const pendingPanelLayoutChangeSourceRef =
    useRef<PanelLayoutChangeSource | null>(null);
  const previousPanelLayoutFingerprintRef = useRef<Record<string, string>>({});
  const transformRef = useRef<ReactZoomPanPinchRef | null>(null);
  const canvasTransformRef = useRef({
    scale: 1,
    positionX: 0,
    positionY: 0,
  });
  const canvasDragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    positionX: number;
    positionY: number;
  } | null>(null);
  const canvasViewportRef = useRef<HTMLDivElement | null>(null);
  const groupSequenceRef = useRef(1);
  const [shouldFocusLayout, setShouldFocusLayout] = useState(false);
  const [windowsMenuOpen, setWindowsMenuOpen] = useState(false);
  const windowsMenuRef = useRef<HTMLDivElement | null>(null);
  const [layoutMenuOpen, setLayoutMenuOpen] = useState(false);
  const layoutMenuRef = useRef<HTMLDivElement | null>(null);
  const lastExternalLayoutFocusRequestKeyRef = useRef<number | null>(null);

  const clampCanvasScale = useCallback((scale: number) => {
    if (!Number.isFinite(scale)) return canvasTransformRef.current.scale;
    return Math.min(CANVAS_MAX_SCALE, Math.max(CANVAS_MIN_SCALE, scale));
  }, []);

  useEffect(() => {
    selectedPanelIdsRef.current = selectedPanelIds;
  }, [selectedPanelIds]);

  const panelDefinitions = useMemo<StudioPanelDefinition[]>(
    () => [
      {
        panel: "source_shelf",
        title: "Source Shelf",
        testId: "studio-source-shelf",
        icon: BookOpen,
        defaultPosition: { x: 72, y: 120 },
        defaultSize: { width: 360, height: 640 },
        minWidth: 320,
        minHeight: 300,
        content:
          sourceShelf ??
          makePlaceholder(
            "Source Shelf",
            "Browse Current Run, Library, and Vault sources from the floating workspace.",
          ),
      },
      {
        panel: "document_dock",
        title: "Document Dock",
        testId: "studio-document-dock",
        icon: FileText,
        defaultPosition: { x: 424, y: 120 },
        defaultSize: { width: 840, height: 760 },
        minWidth: 560,
        minHeight: 360,
        content:
          documentDock ??
          makePlaceholder(
            "Document Dock",
            "Open documents as tabs, read them, and clip source-linked workspace objects.",
          ),
      },
      {
        // Sketch, Concept Map, Vault Graph merged into unified Workspace — HUD-255
        panel: "workspace",
        title: "Workspace",
        testId: "studio-workspace-panel",
        icon: StickyNote,
        defaultPosition: { x: 1090, y: 120 },
        defaultSize: { width: 940, height: 760 },
        minWidth: 700,
        minHeight: 420,
        content:
          workspace ??
          makePlaceholder(
            "Workspace",
            "Arrange study objects, excerpts, and repair notes inside the shared board.",
          ),
      },
      {
        panel: "priming_chat",
        title: "Priming",
        testId: "studio-priming-panel",
        icon: Sparkles,
        defaultPosition: { x: 1840, y: 120 },
        defaultSize: { width: 560, height: 760 },
        minWidth: 420,
        minHeight: 360,
        content:
          primingPanel ??
          makePlaceholder(
            "Priming",
            "Priming chat becomes available here with method and chain selection in-panel.",
          ),
      },
      {
        panel: "tutor_chat",
        title: "Tutor",
        testId: "studio-tutor-panel",
        icon: MessageSquare,
        defaultPosition: { x: 1840, y: 720 },
        defaultSize: { width: 680, height: 940 },
        minWidth: 520,
        minHeight: 420,
        content:
          tutorPanel ??
          makePlaceholder(
            "Tutor",
            "Tutor chat lives here and can start or resume a live session from inside the panel.",
          ),
      },
      {
        panel: "polish_chat",
        title: "Polish",
        testId: "studio-polish-panel",
        icon: Sparkles,
        defaultPosition: { x: 2340, y: 120 },
        defaultSize: { width: 560, height: 760 },
        minWidth: 420,
        minHeight: 360,
        content:
          polishPanel ??
          makePlaceholder(
            "Polish",
            "Review captured notes, summaries, and packaging work inside the floating Polish panel.",
          ),
      },
      {
        panel: "prime_packet",
        title: "Prime Packet",
        testId: "studio-prime-packet",
        icon: Package,
        defaultPosition: { x: 72, y: 720 },
        defaultSize: { width: 420, height: 520 },
        minWidth: 360,
        minHeight: 280,
        content:
          primePacket ??
          makePlaceholder(
            "Prime Packet",
            "Promoted excerpts and repair notes live here as tutor context inputs.",
          ),
      },
      {
        panel: "polish_packet",
        title: "Polish Packet",
        testId: "studio-polish-packet",
        icon: Package,
        defaultPosition: { x: 472, y: 720 },
        defaultSize: { width: 420, height: 520 },
        minWidth: 360,
        minHeight: 280,
        content:
          polishPacket ??
          makePlaceholder(
            "Polish Packet",
            "Tutor replies, notes, summaries, cards, and assets are staged here.",
          ),
      },
      {
        panel: "run_config",
        title: "Run Config",
        testId: "studio-run-config",
        icon: Settings2,
        defaultPosition: { x: 872, y: 720 },
        defaultSize: { width: 420, height: 520 },
        minWidth: 360,
        minHeight: 280,
        content:
          runConfig ??
          makePlaceholder(
            "Run Config",
            "Configure run defaults, rules, and panel-level study behavior here.",
          ),
      },
      {
        panel: "memory",
        title: "Memory",
        testId: "studio-memory",
        icon: Brain,
        defaultPosition: { x: 1952, y: 720 },
        defaultSize: { width: 420, height: 420 },
        minWidth: 340,
        minHeight: 260,
        content:
          memory ??
          makePlaceholder(
            "Memory",
            "Memory capsules, compaction state, and resume controls live here.",
          ),
      },
      {
        panel: "notes",
        title: "Notes",
        testId: "studio-notes-panel",
        icon: NotebookPen,
        allowMultiple: true,
        defaultPosition: { x: 2312, y: 720 },
        defaultSize: { width: 460, height: 420 },
        minWidth: 320,
        minHeight: 260,
        content:
          notesPanel ??
          makePlaceholder(
            "Notes",
            "Use freeform notes for side writing, scratch work, or quick captures.",
          ),
      },
      // Method Runner merged into Priming + Tutor chat — see panel review HUD-254
      {
        panel: "obsidian",
        title: "Obsidian",
        testId: "studio-obsidian-panel",
        icon: BookOpen,
        defaultPosition: { x: 1872, y: 1180 },
        defaultSize: { width: 420, height: 420 },
        minWidth: 320,
        minHeight: 260,
        content:
          obsidianPanel ??
          makePlaceholder(
            "Obsidian",
            "Open note read/write flows here without leaving the Studio canvas.",
          ),
      },
      {
        panel: "anki",
        title: "Anki",
        testId: "studio-anki-panel",
        icon: Brain,
        defaultPosition: { x: 2332, y: 1180 },
        defaultSize: { width: 360, height: 360 },
        minWidth: 300,
        minHeight: 220,
        content:
          ankiPanel ??
          makePlaceholder(
            "Anki",
            "Review due cards and draft card outputs alongside the study workspace.",
          ),
      },
    ],
    [
      documentDock,
      memory,
      notesPanel,
      obsidianPanel,
      ankiPanel,
      polishPacket,
      polishPanel,
      primePacket,
      primingPanel,
      runConfig,
      sourceShelf,
      tutorPanel,
      workspace,
    ],
  );

  const panelsByKey = useMemo(
    () =>
      new Map(
        panelDefinitions.map((definition) => [definition.panel, definition]),
      ),
    [panelDefinitions],
  );

  const resolvedLayout = useMemo(
    () =>
      panelLayout
        .map((item) => ({
          ...item,
          panel: normalizePanelKey(item.panel),
        }))
        .filter((item) => panelsByKey.has(item.panel)),
    [panelLayout, panelsByKey],
  );

  const queuePanelLayoutChange = useCallback(
    (
      next:
        | StudioPanelLayoutItem[]
        | ((current: StudioPanelLayoutItem[]) => StudioPanelLayoutItem[]),
      source: PanelLayoutChangeSource = "local",
    ) => {
      pendingPanelLayoutChangeSourceRef.current = source;
      setPanelLayout(next);
    },
    [setPanelLayout],
  );

  useEffect(() => {
    const nextFingerprints = Object.fromEntries(
      resolvedLayout.map((item) => [
        item.id,
        [
          item.position.x,
          item.position.y,
          item.size.width,
          item.size.height,
          item.collapsed ? 1 : 0,
        ].join(":"),
      ]),
    );
    const previousFingerprints = previousPanelLayoutFingerprintRef.current;
    const changeSource = pendingPanelLayoutChangeSourceRef.current;
    pendingPanelLayoutChangeSourceRef.current = null;

    const externallyResetIds =
      changeSource === "local"
        ? []
        : resolvedLayout
            .filter((item) => previousFingerprints[item.id] !== undefined)
            .filter((item) => previousFingerprints[item.id] !== nextFingerprints[item.id])
            .map((item) => item.id);

    setPanelPositionResetTokens((current) => {
      const nextTokens: Record<string, number> = {};

      for (const item of resolvedLayout) {
        nextTokens[item.id] = current[item.id] ?? 0;
      }
      for (const id of externallyResetIds) {
        nextTokens[id] = (nextTokens[id] ?? 0) + 1;
      }

      const sameKeys =
        Object.keys(current).length === Object.keys(nextTokens).length &&
        Object.keys(nextTokens).every((key) => current[key] === nextTokens[key]);

      return sameKeys ? current : nextTokens;
    });

    previousPanelLayoutFingerprintRef.current = nextFingerprints;
  }, [resolvedLayout]);

  useEffect(() => {
    if (resolvedLayout.length > 0 || entryCard || !autoSeedDefaultPreset) return;
    setPanelLayout((current) =>
      current.length > 0 ? current : createPresetLayout(defaultPreset, panelDefinitions),
    );
  }, [
    autoSeedDefaultPreset,
    defaultPreset,
    entryCard,
    panelDefinitions,
    resolvedLayout.length,
    setPanelLayout,
  ]);

  useEffect(() => {
    const validIds = new Set(resolvedLayout.map((item) => item.id));
    setSelectedPanelIds((current) =>
      current.filter((panelId) => validIds.has(panelId)),
    );
  }, [resolvedLayout]);

  useEffect(() => {
    const highestGroupSequence = resolvedLayout.reduce((highest, item) => {
      if (!item.groupId?.startsWith("group-")) return highest;
      const parsed = Number.parseInt(item.groupId.slice("group-".length), 10);
      if (!Number.isFinite(parsed)) return highest;
      return Math.max(highest, parsed);
    }, 0);

    groupSequenceRef.current = highestGroupSequence + 1;
  }, [resolvedLayout]);

  const selectedPanels = useMemo(
    () => resolvedLayout.filter((item) => selectedPanelIds.includes(item.id)),
    [resolvedLayout, selectedPanelIds],
  );
  const canGroupSelection = selectedPanelIds.length >= 2;
  const canUngroupSelection = selectedPanels.some((item) => item.groupId);

  const nextGroupId = useCallback(() => {
    const nextId = `group-${groupSequenceRef.current}`;
    groupSequenceRef.current += 1;
    return nextId;
  }, []);

  const applyCanvasScale = useCallback(
    (nextScale: number) => {
      const resolvedScale = clampCanvasScale(nextScale);
      const nextTransform = {
        scale: resolvedScale,
        positionX: canvasTransformRef.current.positionX,
        positionY: canvasTransformRef.current.positionY,
      };

      transformRef.current?.setTransform(
        nextTransform.positionX,
        nextTransform.positionY,
        nextTransform.scale,
        120,
      );
      canvasTransformRef.current = nextTransform;
      setCanvasScale(nextTransform.scale);
    },
    [clampCanvasScale],
  );

  const applyPanelSize = useCallback(
    (panelId: string, size: { width: number; height: number }) => {
      queuePanelLayoutChange((current) =>
        resolveStudioShellPanelCollisions(
          current.map((item) =>
            item.id === panelId
              ? {
                  ...item,
                  size,
                }
              : item,
          ),
          [panelId],
        ),
      );
    },
    [queuePanelLayoutChange],
  );

  const applyPanelFrame = useCallback(
    (
      panelId: string,
      nextFrame: Partial<
        Pick<StudioPanelLayoutItem, "position" | "size">
      >,
      source: PanelLayoutChangeSource = "local",
    ) => {
      queuePanelLayoutChange(
        (current) =>
          current.map((item) =>
            item.id === panelId
              ? {
                  ...item,
                  ...nextFrame,
                }
              : item,
          ),
        source,
      );
    },
    [queuePanelLayoutChange],
  );

  const handlePanelPresetSize = useCallback(
    (panelId: string, preset: WorkspacePanelSizePresetKey) => {
      const presetSize = WORKSPACE_PANEL_SIZE_PRESETS[preset];
      applyPanelSize(panelId, {
        width: presetSize.width,
        height: presetSize.height,
      });
    },
    [applyPanelSize],
  );

  const applyViewportFocus = useCallback((focus: StudioShellViewportFocus) => {
    if (!transformRef.current) return;

    transformRef.current.setTransform(
      focus.positionX,
      focus.positionY,
      focus.scale,
      180,
    );
    canvasTransformRef.current = {
      scale: focus.scale,
      positionX: focus.positionX,
      positionY: focus.positionY,
    };
    setCanvasScale(focus.scale);
    setPanelTransformResetToken((current) => current + 1);
    if (typeof canvasViewportRef.current?.scrollIntoView === "function") {
      canvasViewportRef.current.scrollIntoView({
        block: "start",
        inline: "nearest",
        behavior: "smooth",
      });
    }
  }, []);

  const centerViewportOnPanel = useCallback(
    (
      panelId: string,
      sizeOverride?: { width: number; height: number },
    ) => {
      if (!transformRef.current || !canvasViewportRef.current) {
        return;
      }

      const layoutItem = resolvedLayout.find((item) => item.id === panelId);
      if (!layoutItem) {
        return;
      }

      const activeElement = document.activeElement;
      if (
        activeElement instanceof HTMLElement &&
        canvasViewportRef.current.contains(activeElement)
      ) {
        activeElement.blur();
      }

      const rect = canvasViewportRef.current.getBoundingClientRect();
      const focus = buildStudioShellViewportCenter(
        [
          {
            ...layoutItem,
            size: sizeOverride ?? layoutItem.size,
          },
        ],
        rect.width,
        rect.height,
        canvasTransformRef.current.scale,
      );
      applyViewportFocus(focus);
    },
    [applyViewportFocus, resolvedLayout],
  );

  const maximizePanel = useCallback(
    (panelId: string) => {
      applyPanelFrame(
        panelId,
        {
          size: PANEL_MAXIMIZED_SIZE,
        },
      );
      centerViewportOnPanel(panelId, PANEL_MAXIMIZED_SIZE);
    },
    [applyPanelFrame, centerViewportOnPanel],
  );

  // Click-to-front: raise the target panel above every other open panel by
  // bumping its zIndex to (current max + 1). No-ops when the panel is already
  // on top so we don't keep re-rendering on every title-bar click/drag.
  const bringPanelToFront = useCallback(
    (panelId: string) => {
      queuePanelLayoutChange((current) => {
        if (current.length === 0) return current;
        let maxZIndex = 0;
        let targetZIndex = 0;
        for (const item of current) {
          const z = item.zIndex || 0;
          if (z > maxZIndex) maxZIndex = z;
          if (item.id === panelId) targetZIndex = z;
        }
        if (targetZIndex === maxZIndex && maxZIndex > 0) return current;
        return current.map((item) =>
          item.id === panelId ? { ...item, zIndex: maxZIndex + 1 } : item,
        );
      });
    },
    [queuePanelLayoutChange],
  );

  const focusOpenPanels = useCallback(() => {
    if (!transformRef.current || !canvasViewportRef.current || resolvedLayout.length === 0) {
      return;
    }

    const activeElement = document.activeElement;
    if (
      activeElement instanceof HTMLElement &&
      canvasViewportRef.current.contains(activeElement)
    ) {
      activeElement.blur();
    }

    const rect = canvasViewportRef.current.getBoundingClientRect();
    const focus = buildStudioShellViewportFocus(
      resolvedLayout,
      rect.width,
      rect.height,
    );
    applyViewportFocus(focus);
  }, [applyViewportFocus, resolvedLayout]);

  // Fit-to-View is the alias the UI calls on the "Fit" control. It always
  // computes a scale that keeps every open panel inside the viewport, which is
  // what the old "Center Windows" button was supposed to do; the previous
  // at-current-scale math pushed wide preset layouts off-screen.
  const fitOpenPanels = focusOpenPanels;

  // Center Windows: pan the viewport to the centroid of all open panels at the
  // current zoom (no rescale). Distinct from Fit to View — this is the
  // "my windows drifted off; bring them back" action without changing zoom.
  const centerOpenPanels = useCallback(() => {
    if (
      !transformRef.current ||
      !canvasViewportRef.current ||
      resolvedLayout.length === 0
    ) {
      return;
    }

    const activeElement = document.activeElement;
    if (
      activeElement instanceof HTMLElement &&
      canvasViewportRef.current.contains(activeElement)
    ) {
      activeElement.blur();
    }

    const rect = canvasViewportRef.current.getBoundingClientRect();
    const focus = buildStudioShellViewportCenter(
      resolvedLayout,
      rect.width,
      rect.height,
      canvasTransformRef.current.scale,
    );
    applyViewportFocus(focus);
  }, [applyViewportFocus, resolvedLayout]);

  const zoomTo100 = useCallback(() => {
    applyCanvasScale(1);
  }, [applyCanvasScale]);

  // Canvas keyboard shortcuts (Figma-style). Only active when the canvas has
  // panels and the user isn't typing in an input/textarea/contenteditable. We
  // scope the listener to document so the canvas doesn't need focus for
  // shortcuts to fire, but we respect text-entry contexts to avoid hijacking
  // the user's keystrokes.
  useEffect(() => {
    if (resolvedLayout.length === 0) return;

    const handler = (event: KeyboardEvent) => {
      if (!event.shiftKey) return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;

      const target = event.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          tag === "SELECT" ||
          target.isContentEditable
        ) {
          return;
        }
      }

      switch (event.key) {
        case "!": // Shift + 1
        case "1":
          event.preventDefault();
          fitOpenPanels();
          return;
        case ")": // Shift + 0
        case "0":
          event.preventDefault();
          zoomTo100();
          return;
        case "+":
        case "=":
          event.preventDefault();
          applyCanvasScale(
            canvasTransformRef.current.scale + CANVAS_SCALE_STEP * 10,
          );
          return;
        case "_":
        case "-":
          event.preventDefault();
          applyCanvasScale(
            canvasTransformRef.current.scale - CANVAS_SCALE_STEP * 10,
          );
          return;
        default:
          return;
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [
    applyCanvasScale,
    fitOpenPanels,
    resolvedLayout.length,
    zoomTo100,
  ]);

  // Close the Windows menu when the user clicks outside it or presses Escape.
  useEffect(() => {
    if (!windowsMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const menu = windowsMenuRef.current;
      if (!menu) return;
      if (event.target instanceof Node && menu.contains(event.target)) return;
      setWindowsMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setWindowsMenuOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [windowsMenuOpen]);

  // Close the Layout menu when the user clicks outside it or presses Escape.
  useEffect(() => {
    if (!layoutMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const menu = layoutMenuRef.current;
      if (!menu) return;
      if (event.target instanceof Node && menu.contains(event.target)) return;
      setLayoutMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLayoutMenuOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [layoutMenuOpen]);

  // Native (non-passive) wheel listener so Ctrl + wheel reliably zooms the
  // canvas even in browsers that register React synthetic wheel events as
  // passive. react-zoom-pan-pinch's `activationKeys` path has historically
  // missed Ctrl presses when the listener is passive, which showed up as
  // "Ctrl + wheel doesn't zoom anymore". Handling it ourselves with
  // { passive: false } lets preventDefault block page scroll before the
  // library sees the event, and gives us a single source of truth for the
  // canvas scale via applyCanvasScale.
  useEffect(() => {
    const canvas = canvasViewportRef.current;
    if (!canvas) return;

    const handleWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const direction = event.deltaY > 0 ? -1 : 1;
      const magnitude =
        Math.min(Math.abs(event.deltaY), 120) / 120; // normalize trackpad/mouse
      applyCanvasScale(
        canvasTransformRef.current.scale +
          direction * magnitude * CANVAS_SCALE_STEP * 10,
      );
    };

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      canvas.removeEventListener("wheel", handleWheel);
    };
  }, [applyCanvasScale]);

  useEffect(() => {
    if (!shouldFocusLayout) return;

    const frame = requestAnimationFrame(() => {
      focusOpenPanels();
      setShouldFocusLayout(false);
    });

    return () => cancelAnimationFrame(frame);
  }, [focusOpenPanels, shouldFocusLayout]);

  useEffect(() => {
    if (
      typeof externalLayoutFocusRequestKey !== "number" ||
      externalLayoutFocusRequestKey ===
        lastExternalLayoutFocusRequestKeyRef.current ||
      resolvedLayout.length === 0
    ) {
      return;
    }

    lastExternalLayoutFocusRequestKeyRef.current =
      externalLayoutFocusRequestKey;

    const timeoutId = window.setTimeout(() => {
      focusOpenPanels();
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [
    externalLayoutFocusRequestKey,
    focusOpenPanels,
    resolvedLayout.length,
  ]);

  const entryStateOverlay =
    resolvedLayout.length === 0 &&
    entryCard &&
    typeof document !== "undefined"
      ? createPortal(
          <div
            data-testid="studio-entry-overlay"
            className="pointer-events-auto fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 px-4 pb-4"
            style={{ paddingTop: "max(3rem, 12vh)" }}
            onWheel={(event) => {
              event.stopPropagation();
            }}
            onPointerDown={(event) => {
              event.stopPropagation();
            }}
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <div
              data-testid="studio-entry-state"
              data-canvas-drag-disabled="true"
              className="studio-canvas-drag-disabled max-h-[90vh] w-[min(34rem,calc(100vw-4rem))] overflow-y-auto rounded-2xl border border-primary/20 bg-black/90 p-8 shadow-2xl"
              onWheel={(event) => {
                event.stopPropagation();
              }}
              onPointerDown={(event) => {
                event.stopPropagation();
              }}
              onClick={(event) => {
                event.stopPropagation();
              }}
            >
              {entryCard}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <TransformWrapper
      initialScale={1}
      minScale={CANVAS_MIN_SCALE}
      maxScale={CANVAS_MAX_SCALE}
      // limitToBounds defaults to true which clamps positionX >= 0, making
      // the canvas pan-able one direction only ("scrolls right but not
      // left"). Disable so our custom pointer drag can freely reveal either
      // side of the canvas workspace.
      limitToBounds={false}
      centerOnInit={false}
      centerZoomedOut={false}
      onInit={(ref) => {
        transformRef.current = ref;
      }}
      wheel={{ step: 0.08, activationKeys: ["Control"] }}
      doubleClick={{ disabled: true }}
      panning={{
        disabled: true,
        excluded: ["workspace-panel-root", "studio-canvas-drag-disabled"],
      }}
      onTransformed={(_ref, state) => {
        setCanvasScale(clampCanvasScale(state.scale));
        canvasTransformRef.current = {
          scale: clampCanvasScale(state.scale),
          positionX: state.positionX,
          positionY: state.positionY,
        };
      }}
    >
      {() => (
        <>
          <div
            data-testid="studio-shell"
            className="flex h-full min-h-0 flex-col gap-3"
          >
            <div
              data-testid="studio-toolbar"
              className="flex flex-col gap-3 rounded-[1rem] border border-[rgba(255,118,144,0.16)] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(0,0,0,0.14)_100%)] px-3 py-3 shadow-[0_14px_28px_rgba(0,0,0,0.2)]"
            >
            <div
              data-testid="studio-toolbar-pipeline"
              className="flex flex-wrap items-stretch gap-0"
            >
              {PIPELINE_STAGES.map((stage, stageIndex) => {
                const stagePanels = panelDefinitions.filter(
                  (definition) =>
                    PANEL_STAGE_MAP[definition.panel] === stage.key,
                );
                if (stagePanels.length === 0) return null;
                return (
                  <Fragment key={stage.key}>
                    {stageIndex > 0 ? (
                      <div
                        aria-hidden="true"
                        className="flex shrink-0 items-end pb-2 pr-1.5 pl-0.5 font-mono text-[12px] text-[rgba(255,118,144,0.32)]"
                      >
                        →
                      </div>
                    ) : null}
                    <div
                      data-testid={`studio-toolbar-zone-${stage.key}`}
                      className={cn(
                        "flex flex-col gap-1.5 px-2.5 py-1",
                        stageIndex > 0 &&
                          "border-l border-dashed border-[rgba(255,118,144,0.12)] pl-3",
                      )}
                    >
                      <span className="font-mono text-[9px] uppercase tracking-[0.24em] text-[rgba(255,201,213,0.44)]">
                        {stage.label}
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        {stagePanels.map((definition) => {
                          const panelAlreadyOpen = resolvedLayout.some(
                            (item) => item.panel === definition.panel,
                          );
                          return (
                            <Button
                              key={definition.panel}
                              type="button"
                              variant="outline"
                              size="sm"
                              aria-label={`Open ${definition.title} panel`}
                              onClick={() => {
                                queuePanelLayoutChange((current) =>
                                  spawnPanelLayout(current, definition),
                                );
                                if (resolvedLayout.length === 0) {
                                  setShouldFocusLayout(true);
                                }
                              }}
                              className={cn(
                                "rounded-full border-[rgba(255,120,146,0.18)] bg-black/25 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[#ffd6de]",
                                panelAlreadyOpen &&
                                  !definition.allowMultiple &&
                                  "border-[rgba(255,124,150,0.36)] bg-[rgba(255,78,108,0.14)] text-white",
                              )}
                            >
                              <definition.icon className="mr-1.5 h-3.5 w-3.5" />
                              {definition.title}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  </Fragment>
                );
              })}

              {SIDE_CLUSTERS.map((cluster, clusterIndex) => {
                const clusterPanels = panelDefinitions.filter(
                  (definition) =>
                    PANEL_STAGE_MAP[definition.panel] === cluster.key,
                );
                if (clusterPanels.length === 0) return null;
                return (
                  <div
                    key={cluster.key}
                    data-testid={`studio-toolbar-zone-${cluster.key}`}
                    className={cn(
                      "flex flex-col gap-1.5 border-l border-dashed border-[rgba(255,118,144,0.16)] pl-3 px-2.5 py-1",
                      clusterIndex === 0 && "ml-auto",
                    )}
                  >
                    <span className="font-mono text-[9px] uppercase tracking-[0.24em] text-[rgba(255,201,213,0.44)]">
                      {cluster.label}
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      {clusterPanels.map((definition) => {
                        const panelAlreadyOpen = resolvedLayout.some(
                          (item) => item.panel === definition.panel,
                        );
                        return (
                          <Button
                            key={definition.panel}
                            type="button"
                            variant="outline"
                            size="sm"
                            aria-label={`Open ${definition.title} panel`}
                            onClick={() => {
                              queuePanelLayoutChange((current) =>
                                spawnPanelLayout(current, definition),
                              );
                              if (resolvedLayout.length === 0) {
                                setShouldFocusLayout(true);
                              }
                            }}
                            className={cn(
                              "rounded-full border-[rgba(255,120,146,0.18)] bg-black/25 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[#ffd6de]",
                              panelAlreadyOpen &&
                                !definition.allowMultiple &&
                                "border-[rgba(255,124,150,0.36)] bg-[rgba(255,78,108,0.14)] text-white",
                            )}
                          >
                            <definition.icon className="mr-1.5 h-3.5 w-3.5" />
                            {definition.title}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div
              data-testid="studio-toolbar-controls"
              className="flex flex-wrap items-end gap-0 border-t border-dashed border-[rgba(255,118,144,0.10)] pt-3"
            >
              <div className="flex flex-col gap-1.5 px-2.5 py-1">
                <span className="font-mono text-[9px] uppercase tracking-[0.24em] text-[rgba(255,201,213,0.44)]">
                  START
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative" ref={layoutMenuRef}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label="Choose layout preset"
                      aria-haspopup="menu"
                      aria-expanded={layoutMenuOpen}
                      title="Apply a saved layout preset"
                      onClick={() => setLayoutMenuOpen((open) => !open)}
                      className="rounded-full border border-[rgba(255,118,144,0.16)] bg-black/25 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[#ffd6de] hover:text-white"
                    >
                      <LayoutGrid className="mr-1.5 h-3.5 w-3.5" />
                      Layout
                      <ChevronDown className="ml-1 h-3 w-3" />
                    </Button>
                    {layoutMenuOpen ? (
                      <div
                        role="menu"
                        aria-label="Layout presets"
                        className="absolute left-0 top-[calc(100%+0.5rem)] z-40 w-72 overflow-hidden rounded-xl border border-[rgba(255,118,144,0.22)] bg-black/90 p-1 shadow-[0_18px_36px_rgba(0,0,0,0.45)] backdrop-blur-sm"
                      >
                        {LAYOUT_PRESETS.map(({ key: preset, label, hint }) => (
                          <button
                            key={preset}
                            type="button"
                            role="menuitem"
                            aria-label={`Apply ${label} preset`}
                            onClick={() => {
                              queuePanelLayoutChange(
                                createPresetLayout(preset, panelDefinitions),
                                "restore",
                              );
                              setShouldFocusLayout(true);
                              setLayoutMenuOpen(false);
                            }}
                            className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left font-mono text-[11px] text-[#ffd6de] hover:bg-[rgba(255,84,116,0.14)] hover:text-white"
                          >
                            <span className="uppercase tracking-[0.16em]">
                              {label}
                            </span>
                            <span className="truncate text-[9px] uppercase tracking-[0.12em] text-[rgba(255,201,213,0.4)]">
                              {hint}
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 border-l border-dashed border-[rgba(255,118,144,0.16)] px-3 py-1">
                <span className="font-mono text-[9px] uppercase tracking-[0.24em] text-[rgba(255,201,213,0.44)]">
                  SELECT
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {selectedPanelIds.length > 0 ? (
                    <span className="rounded-full border border-[rgba(255,118,144,0.12)] bg-black/20 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[#ffc9d5]">
                      {selectedPanelIds.length} Selected
                    </span>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label="Group selected windows"
                    disabled={!canGroupSelection}
                    onClick={() => {
                      const groupId = nextGroupId();
                      queuePanelLayoutChange((current) =>
                        applyGroupIdToPanels(current, selectedPanelIds, groupId),
                      );
                    }}
                    className="rounded-full border border-[rgba(255,118,144,0.16)] bg-black/25 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[#ffd6de] hover:text-white disabled:opacity-40"
                  >
                    Group
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label="Ungroup selected windows"
                    disabled={!canUngroupSelection}
                    onClick={() => {
                      queuePanelLayoutChange((current) =>
                        applyGroupIdToPanels(current, selectedPanelIds, null),
                      );
                    }}
                    className="rounded-full border border-[rgba(255,118,144,0.16)] bg-black/25 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[#ffd6de] hover:text-white disabled:opacity-40"
                  >
                    Ungroup
                  </Button>
                </div>
              </div>

              <div className="ml-auto flex flex-col gap-1.5 border-l border-dashed border-[rgba(255,118,144,0.16)] px-3 py-1">
                <span className="font-mono text-[9px] uppercase tracking-[0.24em] text-[rgba(255,201,213,0.44)]">
                  ARRANGE
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative" ref={windowsMenuRef}>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="List open windows"
                  aria-haspopup="menu"
                  aria-expanded={windowsMenuOpen}
                  title="Raise or close any open window"
                  disabled={resolvedLayout.length === 0}
                  onClick={() => setWindowsMenuOpen((open) => !open)}
                  className="rounded-full border border-[rgba(255,118,144,0.16)] bg-black/25 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[#ffd6de] hover:text-white disabled:opacity-40"
                >
                  <Layers className="mr-1.5 h-3.5 w-3.5" />
                  Windows ({resolvedLayout.length})
                </Button>
                {windowsMenuOpen && resolvedLayout.length > 0 ? (
                  <div
                    role="menu"
                    aria-label="Open windows"
                    className="absolute right-0 top-[calc(100%+0.5rem)] z-40 w-64 overflow-hidden rounded-xl border border-[rgba(255,118,144,0.22)] bg-black/90 p-1 shadow-[0_18px_36px_rgba(0,0,0,0.45)] backdrop-blur-sm"
                  >
                    {[...resolvedLayout]
                      .sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0))
                      .map((item) => {
                        const definition = panelsByKey.get(item.panel);
                        if (!definition) return null;
                        const Icon = definition.icon;
                        const isTopmost =
                          (item.zIndex || 0) ===
                          Math.max(
                            ...resolvedLayout.map((entry) => entry.zIndex || 0),
                          );
                        return (
                          <div
                            key={item.id}
                            role="menuitem"
                            className={cn(
                              "flex items-center gap-2 rounded-lg px-2 py-1.5 font-mono text-[11px] text-[#ffd6de] hover:bg-[rgba(255,84,116,0.14)]",
                              isTopmost && "bg-[rgba(255,84,116,0.10)]",
                            )}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                bringPanelToFront(item.id);
                                centerViewportOnPanel(item.id);
                                setWindowsMenuOpen(false);
                              }}
                              className="flex min-w-0 flex-1 items-center gap-2 text-left hover:text-white"
                              title={`Raise and center ${definition.title}`}
                            >
                              <Icon className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">
                                {definition.title}
                              </span>
                              {isTopmost ? (
                                <span className="ml-auto shrink-0 rounded-full border border-[rgba(255,118,144,0.3)] bg-[rgba(255,84,116,0.16)] px-1.5 py-px text-[9px] uppercase tracking-[0.16em] text-white/80">
                                  Top
                                </span>
                              ) : null}
                            </button>
                            <button
                              type="button"
                              aria-label={`Close ${definition.title}`}
                              title={`Close ${definition.title}`}
                              onClick={() => {
                                queuePanelLayoutChange((current) =>
                                  current.filter((entry) => entry.id !== item.id),
                                );
                              }}
                              className="rounded-md p-1 text-[#ffc9d5]/70 hover:bg-[rgba(255,84,116,0.2)] hover:text-white"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        );
                      })}
                  </div>
                ) : null}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Tidy up panels"
                title="Re-tile all open panels side by side"
                disabled={resolvedLayout.length === 0}
                onClick={() => {
                  queuePanelLayoutChange((current) =>
                    tilePanelLayout(
                      current.map((item, index) => {
                        // Reset to per-panel default size so a previously
                        // Fit-expanded or manually resized panel doesn't
                        // leave large gaps in the re-tiled grid.
                        const normalizedKey = normalizePanelKey(item.panel);
                        const defaults =
                          PRESET_LAYOUT_DEFAULTS[normalizedKey];
                        return {
                          id: item.id,
                          panel: item.panel,
                          size: defaults?.defaultSize ?? item.size,
                          collapsed: item.collapsed,
                          zIndex: item.zIndex || index + 1,
                          groupId: item.groupId,
                        };
                      }),
                    ),
                  );
                  setShouldFocusLayout(true);
                }}
                className="rounded-full border border-[rgba(255,118,144,0.16)] bg-black/25 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[#ffd6de] hover:text-white disabled:opacity-40"
              >
                <LayoutGrid className="mr-1.5 h-3.5 w-3.5" />
                Tidy Up
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Center open panels in viewport"
                title="Pan viewport to the center of open panels (no zoom change)"
                disabled={resolvedLayout.length === 0}
                onClick={() => {
                  centerOpenPanels();
                }}
                className="rounded-full border border-[rgba(255,118,144,0.16)] bg-black/25 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[#ffd6de] hover:text-white disabled:opacity-40"
              >
                <Crosshair className="mr-1.5 h-3.5 w-3.5" />
                Center
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Clear canvas"
                disabled={clearCanvasDisabled}
                onClick={() => {
                  if (onClearCanvas) {
                    onClearCanvas();
                    return;
                  }
                  queuePanelLayoutChange([]);
                }}
                className="rounded-full border border-[rgba(255,118,144,0.16)] bg-black/25 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[#ffd6de] hover:text-white disabled:opacity-40"
              >
                Clear Canvas
              </Button>
                </div>
              </div>
            </div>
          </div>

          <div
            data-testid="studio-canvas"
            ref={canvasViewportRef}
            className={cn(
              "relative flex-1 scroll-mt-4 select-none overflow-hidden rounded-[1rem] border border-[rgba(255,118,144,0.16)]",
              isCanvasDragging ? "cursor-grabbing" : "cursor-grab",
              "bg-[radial-gradient(circle_at_top,rgba(255,70,104,0.10),transparent_20%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(0,0,0,0.24))]",
            )}
            onPointerDown={(event) => {
              const target = event.target as HTMLElement | null;
              const composedPath =
                typeof event.nativeEvent.composedPath === "function"
                  ? event.nativeEvent.composedPath()
                  : [];
              const pointerStartedInsidePanel =
                Boolean(target?.closest(".workspace-panel-root")) ||
                composedPath.some(
                  (node) =>
                    node instanceof HTMLElement &&
                    node.classList.contains("workspace-panel-root"),
                );
              if (pointerStartedInsidePanel) return;
              if (target?.closest(".workspace-panel-root")) return;
              if (target?.closest('[data-canvas-drag-disabled="true"]')) return;

              selectedPanelIdsRef.current = [];
              setSelectedPanelIds([]);
              canvasDragRef.current = {
                pointerId: event.pointerId,
                startX: event.clientX,
                startY: event.clientY,
                positionX: canvasTransformRef.current.positionX,
                positionY: canvasTransformRef.current.positionY,
              };
              setIsCanvasDragging(true);
              try {
                event.currentTarget.setPointerCapture?.(event.pointerId);
              } catch {
                // Synthetic pointer events in tests/browser tooling may not have an active pointer capture target.
              }
              event.preventDefault();
            }}
            onPointerMove={(event) => {
              const dragState = canvasDragRef.current;
              if (!dragState || dragState.pointerId !== event.pointerId) return;

              const deltaX = event.clientX - dragState.startX;
              const deltaY = event.clientY - dragState.startY;
              const nextPositionX = dragState.positionX + deltaX;
              const nextPositionY = dragState.positionY + deltaY;

              transformRef.current?.setTransform(
                nextPositionX,
                nextPositionY,
                canvasTransformRef.current.scale,
                0,
              );
              canvasTransformRef.current = {
                ...canvasTransformRef.current,
                positionX: nextPositionX,
                positionY: nextPositionY,
              };
              event.preventDefault();
            }}
            onPointerUp={(event) => {
              if (canvasDragRef.current?.pointerId !== event.pointerId) return;
              canvasDragRef.current = null;
              setIsCanvasDragging(false);
              try {
                event.currentTarget.releasePointerCapture?.(event.pointerId);
              } catch {
                // Ignore environments without active pointer capture.
              }
            }}
            onPointerCancel={(event) => {
              if (canvasDragRef.current?.pointerId !== event.pointerId) return;
              canvasDragRef.current = null;
              setIsCanvasDragging(false);
              try {
                event.currentTarget.releasePointerCapture?.(event.pointerId);
              } catch {
                // Ignore environments without active pointer capture.
              }
            }}
          >
            <TransformComponent
              wrapperStyle={{ width: "100%", height: "100%" }}
              contentStyle={{
                width: `${CANVAS_WIDTH}px`,
                height: `${CANVAS_HEIGHT}px`,
                position: "relative",
              }}
            >
              {resolvedLayout.map((layoutItem) => {
                const definition = panelsByKey.get(layoutItem.panel);
                if (!definition) return null;

                return (
                  <WorkspacePanel
                    key={layoutItem.id}
                    id={layoutItem.id}
                    title={definition.title}
                    dataTestId={definition.testId}
                    position={layoutItem.position}
                    positionResetToken={
                      `${panelPositionResetTokens[layoutItem.id] ?? 0}:${panelTransformResetToken}`
                    }
                    size={layoutItem.size}
                    defaultPosition={definition.defaultPosition}
                    defaultSize={definition.defaultSize}
                    minWidth={definition.minWidth}
                    minHeight={definition.minHeight}
                    collapsed={layoutItem.collapsed}
                    scale={canvasScale}
                    selected={selectedPanelIds.includes(layoutItem.id)}
                    grouped={Boolean(layoutItem.groupId)}
                    defaultCollapsed
                    style={{ zIndex: layoutItem.zIndex }}
                    className="bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02)_12%,rgba(0,0,0,0.18)_100%),linear-gradient(135deg,rgba(124,14,38,0.18),rgba(18,5,10,0.86)_58%,rgba(0,0,0,0.96)_100%)] shadow-[0_14px_32px_rgba(0,0,0,0.28),0_0_0_1px_rgba(255,86,118,0.12)]"
                    onTitlePointerDown={(event) => {
                      event.stopPropagation();
                      bringPanelToFront(layoutItem.id);
                      const additiveSelection =
                        event.shiftKey || event.metaKey || event.ctrlKey;
                      const nextSelection = resolvePanelSelection(
                        resolvedLayout,
                        selectedPanelIdsRef.current,
                        layoutItem.id,
                        additiveSelection,
                      );
                      selectedPanelIdsRef.current = nextSelection;
                      queueMicrotask(() => {
                        setSelectedPanelIds(nextSelection);
                      });
                    }}
                    onClose={() => {
                      queuePanelLayoutChange((current) =>
                        current.filter((item) => item.id !== layoutItem.id),
                      );
                    }}
                    onCollapsedChange={(collapsed) => {
                      queuePanelLayoutChange((current) =>
                        current.map((item) =>
                          item.id === layoutItem.id ? { ...item, collapsed } : item,
                        ),
                      );
                    }}
                    onMaximize={() => {
                      maximizePanel(layoutItem.id);
                    }}
                    onCenter={() => {
                      centerViewportOnPanel(layoutItem.id);
                    }}
                    onSizePresetSelect={(preset) => {
                      handlePanelPresetSize(layoutItem.id, preset);
                    }}
                    onPositionChange={(position) => {
                      queuePanelLayoutChange((current) => {
                        const moved = applyStudioShellPanelPositionUpdate(
                          current,
                          layoutItem.id,
                          position,
                          selectedPanelIdsRef.current,
                        );
                        const anchorIds = resolveDragTargetIds(
                          current,
                          layoutItem.id,
                          selectedPanelIdsRef.current,
                        );
                        return resolveStudioShellPanelCollisions(
                          moved,
                          anchorIds,
                        );
                      });
                    }}
                    onSizeChange={(size) => {
                      queuePanelLayoutChange((current) => {
                        const resized = current.map((item) =>
                          item.id === layoutItem.id ? { ...item, size } : item,
                        );
                        return resolveStudioShellPanelCollisions(resized, [
                          layoutItem.id,
                        ]);
                      });
                    }}
                  >
                    <div
                      data-panel-layout-id={layoutItem.id}
                      data-panel-kind={layoutItem.panel}
                      data-panel-position={`${layoutItem.position.x},${layoutItem.position.y}`}
                      data-panel-size={`${layoutItem.size.width},${layoutItem.size.height}`}
                      className="h-full min-h-0 min-w-0"
                    >
                      {definition.content}
                    </div>
                  </WorkspacePanel>
                );
              })}
            </TransformComponent>
            {resolvedLayout.length > 0 ? (
              <div
                data-testid="studio-canvas-nav"
                data-canvas-drag-disabled="true"
                className="pointer-events-auto absolute bottom-4 right-4 z-30 flex items-center gap-1.5 rounded-full border border-[rgba(255,118,144,0.22)] bg-black/55 px-2 py-1.5 shadow-[0_14px_28px_rgba(0,0,0,0.35)] backdrop-blur-sm"
                onPointerDown={(event) => event.stopPropagation()}
                onWheel={(event) => event.stopPropagation()}
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Zoom out"
                  title="Zoom out (Shift + -)"
                  onClick={() =>
                    applyCanvasScale(
                      canvasTransformRef.current.scale - CANVAS_SCALE_STEP * 10,
                    )
                  }
                  className="h-7 w-7 rounded-full border border-[rgba(255,118,144,0.14)] bg-[rgba(255,84,116,0.08)] text-[#ffd6de] hover:text-white"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </Button>
                <label className="sr-only" htmlFor="studio-canvas-zoom">
                  Canvas zoom
                </label>
                <input
                  id="studio-canvas-zoom"
                  aria-label="Canvas zoom"
                  type="range"
                  min={CANVAS_MIN_SCALE}
                  max={CANVAS_MAX_SCALE}
                  step={CANVAS_SCALE_STEP}
                  value={canvasScale}
                  onChange={(event) => {
                    applyCanvasScale(Number(event.currentTarget.value));
                  }}
                  className="h-1.5 w-28 cursor-pointer appearance-none rounded-full bg-[rgba(255,84,116,0.18)] accent-[rgb(255,108,138)] md:w-36"
                />
                <span
                  aria-live="polite"
                  className="min-w-[3.25rem] text-right font-mono text-[10px] uppercase tracking-[0.18em] text-[#ffd6de]"
                >
                  {Math.round(canvasScale * 100)}%
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Zoom in"
                  title="Zoom in (Shift + +)"
                  onClick={() =>
                    applyCanvasScale(
                      canvasTransformRef.current.scale + CANVAS_SCALE_STEP * 10,
                    )
                  }
                  className="h-7 w-7 rounded-full border border-[rgba(255,118,144,0.14)] bg-[rgba(255,84,116,0.08)] text-[#ffd6de] hover:text-white"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
                <div className="mx-1 h-5 w-px bg-[rgba(255,118,144,0.24)]" aria-hidden="true" />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Fit to View"
                  title="Fit all panels to view (Shift + 1)"
                  onClick={() => fitOpenPanels()}
                  className="h-7 w-7 rounded-full border border-[rgba(255,118,144,0.14)] bg-[rgba(255,84,116,0.08)] text-[#ffd6de] hover:text-white"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="Zoom to 100%"
                  title="Zoom to 100% (Shift + 0)"
                  onClick={() => zoomTo100()}
                  className="h-7 rounded-full border border-[rgba(255,118,144,0.14)] bg-[rgba(255,84,116,0.08)] px-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[#ffd6de] hover:text-white"
                >
                  <Target className="mr-1 h-3.5 w-3.5" />
                  100%
                </Button>
              </div>
            ) : null}
          </div>
          </div>
          {entryStateOverlay}
        </>
      )}
    </TransformWrapper>
  );
}
