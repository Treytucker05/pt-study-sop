import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Editor } from "tldraw";
import type { StudioWorkspaceObject } from "@/lib/studioWorkspaceObjects";
import {
  buildStudioCanvasShape,
  getStudioCanvasShapeId,
} from "@/lib/studioCanvasShapes";
import { Tldraw } from "tldraw";
import "tldraw/tldraw.css";

const TLDRAW_VENDOR_CTA_RE = /get a license for production|made with tldraw/i;

function stripVendorCtas(root: ParentNode) {
  root.querySelectorAll("a, button").forEach((element) => {
    const href = element.getAttribute("href") || "";
    const text = element.textContent || "";
    if (
      href.includes("tldraw.dev") ||
      href.includes("pricing") ||
      TLDRAW_VENDOR_CTA_RE.test(text)
    ) {
      element.remove();
    }
  });
}

export interface StudioTldrawWorkspaceProps {
  courseName: string | null;
  canvasObjects: StudioWorkspaceObject[];
  currentRunObjects: StudioWorkspaceObject[];
  selectedMaterialCount: number;
  promotedPrimeObjectIds?: string[];
  onPromoteExcerptToPrime?: (
    workspaceObject: Extract<StudioWorkspaceObject, { kind: "excerpt" }>,
  ) => void;
  onPromoteTextNoteToPrime?: (
    workspaceObject: Extract<StudioWorkspaceObject, { kind: "text_note" }>,
  ) => void;
}

export function StudioTldrawWorkspace({
  courseName,
  canvasObjects,
  currentRunObjects,
  selectedMaterialCount,
  promotedPrimeObjectIds = [],
  onPromoteExcerptToPrime,
  onPromoteTextNoteToPrime,
}: StudioTldrawWorkspaceProps) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const syncedObjectIdsRef = useRef<string[]>([]);
  const workspaceRootRef = useRef<HTMLDivElement | null>(null);
  const excerptObjects = canvasObjects.filter(
    (
      workspaceObject,
    ): workspaceObject is Extract<StudioWorkspaceObject, { kind: "excerpt" }> =>
      workspaceObject.kind === "excerpt",
  );
  const textNoteObjects = canvasObjects.filter(
    (
      workspaceObject,
    ): workspaceObject is Extract<StudioWorkspaceObject, { kind: "text_note" }> =>
      workspaceObject.kind === "text_note",
  );
  const imageObjects = canvasObjects.filter(
    (
      workspaceObject,
    ): workspaceObject is Extract<StudioWorkspaceObject, { kind: "image" }> =>
      workspaceObject.kind === "image",
  );

  useEffect(() => {
    if (!editor) return;

    const nextObjectIds = canvasObjects.map((workspaceObject) => workspaceObject.id);
    const previousObjectIds = syncedObjectIdsRef.current;
    const previousObjectIdSet = new Set(previousObjectIds);
    const nextObjectIdSet = new Set(nextObjectIds);

    const shapesToCreate = canvasObjects
      .filter((workspaceObject) => !previousObjectIdSet.has(workspaceObject.id))
      .map((workspaceObject, index) => buildStudioCanvasShape(workspaceObject, index));

    if (shapesToCreate.length > 0) {
      editor.createShapes(shapesToCreate);
    }

    const shapesToUpdate = canvasObjects
      .filter((workspaceObject) => previousObjectIdSet.has(workspaceObject.id))
      .map((workspaceObject, index) => buildStudioCanvasShape(workspaceObject, index));

    if (shapesToUpdate.length > 0) {
      editor.updateShapes(shapesToUpdate);
    }

    const shapesToDelete = previousObjectIds
      .filter((objectId) => !nextObjectIdSet.has(objectId))
      .map((objectId) => getStudioCanvasShapeId(objectId));

    if (shapesToDelete.length > 0) {
      editor.deleteShapes(shapesToDelete);
    }

    syncedObjectIdsRef.current = nextObjectIds;
  }, [canvasObjects, editor]);

  useEffect(() => {
    const root = workspaceRootRef.current;
    if (!root) return;

    stripVendorCtas(root);

    const observer = new MutationObserver(() => {
      stripVendorCtas(root);
    });

    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={workspaceRootRef}
      data-testid="studio-tldraw-workspace"
      className="flex h-full min-h-0 flex-col rounded-[0.85rem] border border-primary/15 bg-black/20"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-primary/12 px-4 py-3 font-mono text-sm text-foreground/78">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-primary/72">
            Workspace
          </div>
          <div className="mt-1 text-sm text-foreground">
            {courseName || "No course selected"}
          </div>
        </div>
        <Badge
          variant="outline"
          className="rounded-full border-primary/20 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-primary/84"
        >
          {selectedMaterialCount} source{selectedMaterialCount === 1 ? "" : "s"}
        </Badge>
      </div>
      <div className="relative min-h-0 flex-1">
        <div className="pointer-events-none absolute left-4 top-4 z-10 w-full max-w-sm space-y-2">
          <div className="rounded-[0.85rem] border border-primary/18 bg-black/65 px-3 py-2 font-mono text-sm text-foreground/78 shadow-[0_16px_36px_rgba(0,0,0,0.32)] backdrop-blur">
            <div className="text-[10px] uppercase tracking-[0.18em] text-primary/72">
              Current Run Ready
            </div>
            <div className="mt-1 text-sm text-foreground">
              {currentRunObjects.length} current-run source object
              {currentRunObjects.length === 1 ? "" : "s"} ready
            </div>
          </div>

          <div className="rounded-[0.85rem] border border-primary/18 bg-black/65 px-3 py-2 font-mono text-sm text-foreground/78 shadow-[0_16px_36px_rgba(0,0,0,0.32)] backdrop-blur">
            <div className="text-[10px] uppercase tracking-[0.18em] text-primary/72">
              Canvas Objects
            </div>
            <div className="mt-1 text-sm text-foreground">
              {canvasObjects.length} active canvas object
              {canvasObjects.length === 1 ? "" : "s"}
            </div>
          </div>

          {excerptObjects.length > 0 ? (
            <div className="pointer-events-auto rounded-[0.85rem] border border-primary/18 bg-black/65 px-3 py-3 font-mono text-sm text-foreground/78 shadow-[0_16px_36px_rgba(0,0,0,0.32)] backdrop-blur">
              <div className="text-[10px] uppercase tracking-[0.18em] text-primary/72">
                Workspace Excerpts
              </div>
              <div className="mt-2 space-y-2">
                {excerptObjects.map((workspaceObject) => {
                  const isPromoted = promotedPrimeObjectIds.includes(
                    workspaceObject.id,
                  );
                  const sourceLabel =
                    workspaceObject.provenance.sourceTitle || workspaceObject.title;

                  return (
                    <div
                      key={workspaceObject.id}
                      className="rounded-[0.75rem] border border-primary/12 bg-black/30 p-2.5"
                    >
                      <div className="text-sm text-foreground">{sourceLabel}</div>
                      <div className="mt-1 text-xs leading-5 text-foreground/62">
                        {workspaceObject.detail}
                      </div>
                      <div className="mt-2">
                        <Button
                          type="button"
                          variant="outline"
                          disabled={isPromoted}
                          onClick={() => onPromoteExcerptToPrime?.(workspaceObject)}
                          aria-label={
                            isPromoted
                              ? `Excerpt: ${sourceLabel} already in Prime Packet`
                              : `Promote excerpt: ${sourceLabel} to Prime Packet`
                          }
                          className="h-8 rounded-full border-primary/20 bg-black/20 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-primary/84 hover:bg-black/30 disabled:cursor-default disabled:opacity-100 disabled:text-foreground/60"
                        >
                          {isPromoted ? "In Prime Packet" : "Promote to Prime Packet"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {textNoteObjects.length > 0 ? (
            <div className="pointer-events-auto rounded-[0.85rem] border border-primary/18 bg-black/65 px-3 py-3 font-mono text-sm text-foreground/78 shadow-[0_16px_36px_rgba(0,0,0,0.32)] backdrop-blur">
              <div className="text-[10px] uppercase tracking-[0.18em] text-primary/72">
                Workspace Notes
              </div>
              <div className="mt-2 space-y-2">
                {textNoteObjects.map((workspaceObject) => {
                  const isPromoted = promotedPrimeObjectIds.includes(
                    workspaceObject.id,
                  );

                  return (
                    <div
                      key={workspaceObject.id}
                      className="rounded-[0.75rem] border border-primary/12 bg-black/30 p-2.5"
                    >
                      <div className="text-sm text-foreground">
                        {workspaceObject.title}
                      </div>
                      <div className="mt-1 text-xs leading-5 text-foreground/62">
                        {workspaceObject.detail}
                      </div>
                      <div className="mt-2">
                        <Button
                          type="button"
                          variant="outline"
                          disabled={isPromoted}
                          onClick={() => onPromoteTextNoteToPrime?.(workspaceObject)}
                          aria-label={
                            isPromoted
                              ? `Note: ${workspaceObject.title} already in Prime Packet`
                              : `Promote note: ${workspaceObject.title} to Prime Packet`
                          }
                          className="h-8 rounded-full border-primary/20 bg-black/20 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-primary/84 hover:bg-black/30 disabled:cursor-default disabled:opacity-100 disabled:text-foreground/60"
                        >
                          {isPromoted ? "In Prime Packet" : "Promote to Prime Packet"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {imageObjects.length > 0 ? (
            <div className="pointer-events-auto rounded-[0.85rem] border border-primary/18 bg-black/65 px-3 py-3 font-mono text-sm text-foreground/78 shadow-[0_16px_36px_rgba(0,0,0,0.32)] backdrop-blur">
              <div className="text-[10px] uppercase tracking-[0.18em] text-primary/72">
                Workspace Images
              </div>
              <div className="mt-2 space-y-2">
                {imageObjects.map((workspaceObject) => (
                  <div
                    key={workspaceObject.id}
                    className="rounded-[0.75rem] border border-primary/12 bg-black/30 p-2.5"
                  >
                    <div className="text-sm text-foreground">{workspaceObject.title}</div>
                    <div className="mt-1 text-xs leading-5 text-foreground/62">
                      {workspaceObject.detail}
                    </div>
                    <img
                      src={workspaceObject.asset.url}
                      alt={workspaceObject.title}
                      className="mt-3 max-h-32 w-full rounded-[0.75rem] border border-primary/12 object-contain"
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        <div className="h-full min-h-0 w-full">
          <Tldraw
            autoFocus={false}
            hideUi
            onMount={(mountedEditor) => setEditor(mountedEditor)}
          />
        </div>
      </div>
    </div>
  );
}
