import { createShapeId, toRichText } from "@tldraw/tlschema";

import type { StudioWorkspaceObject } from "@/lib/studioWorkspaceObjects";

const STUDIO_CANVAS_SHAPE_PREFIX = "studio-canvas";

function normalizeObjectId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "-");
}

export function getStudioCanvasShapeId(objectId: string) {
  return createShapeId(`${STUDIO_CANVAS_SHAPE_PREFIX}-${normalizeObjectId(objectId)}`);
}

export function buildStudioCanvasShape(
  workspaceObject: StudioWorkspaceObject,
  index: number,
) {
  const column = index % 2;
  const row = Math.floor(index / 2);

  return {
    id: getStudioCanvasShapeId(workspaceObject.id),
    type: "text" as const,
    // Origin clears the fixed left workspace overlay.
    x: 460 + column * 360,
    y: 96 + row * 240,
    props: {
      richText: toRichText(
        workspaceObject.kind === "vault_path"
          ? workspaceObject.title
          : workspaceObject.kind === "excerpt"
            ? `${workspaceObject.title}\n${workspaceObject.provenance.sourceTitle}\n${workspaceObject.detail}`
            : `${workspaceObject.title}\n${workspaceObject.detail}`,
      ),
      font: "mono" as const,
      size: "s" as const,
      color: "white" as const,
      textAlign: "start" as const,
      w: 320,
      autoSize: false as const,
    },
  };
}
